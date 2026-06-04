// ══════════════════════════════════════════════════════════
// gen-small-icons.mjs — 构建期生成小图标 (去糊正解)
//   状态/被动/装备图标源 PNG 巨大(~500px), 游戏里只显示十几~几十 px。
//   用 jimp 高质量降采样到 ≤128px(保长宽比, 不放大), 输出到各目录的 _sm/ 子目录。
//   写进**源资产** (games/turtle-battle/assets/<dir>/_sm/) → 入库 + sync 复制到 public,
//   fresh checkout 也有 (public/ 是 gitignored 的派生目录)。
//   BootScene 加载 _sm 版作为纹理 → Phaser 不持有 500px 大图 (~1/15 显存 + 基础清晰)。
//   原图保留给详情面板 DOM <img>。改了源图标后重跑: yarn gen-icons (再 yarn sync)。
// ══════════════════════════════════════════════════════════
import { Jimp } from 'jimp';
import { readdirSync, mkdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// 源资产目录 (与 sync-public.mjs 同源); _sm 写这里才入库
const SRC_ASSETS = join(__dirname, '..', '..', 'games', 'turtle-battle', 'assets');
const TARGET = 128;   // 覆盖最大 Phaser 用途 (Codex 状态详情 100px); 徽章端 runtime 再降到 40。仍 ~1/15 源图显存
const DIRS = ['status', 'passive', 'equip'];   // BootScene 作 Phaser 纹理加载的三类 (stats/tags 走 DOM)

let total = 0, skipped = 0;
const samples = [];

for (const dir of DIRS) {
  const srcDir = join(SRC_ASSETS, dir);
  if (!existsSync(srcDir)) { console.log(`(跳过 不存在) ${dir}`); continue; }
  const outDir = join(srcDir, '_sm');
  mkdirSync(outDir, { recursive: true });
  const files = readdirSync(srcDir).filter(f => f.toLowerCase().endsWith('.png') && statSync(join(srcDir, f)).isFile());
  for (const f of files) {
    try {
      const img = await Jimp.read(join(srcDir, f));
      const w0 = img.bitmap.width, h0 = img.bitmap.height;
      if (Math.max(w0, h0) > TARGET) img.scaleToFit({ w: TARGET, h: TARGET });   // 保长宽比, 仅缩小
      await img.write(join(outDir, f));
      total++;
      if (samples.length < 6) samples.push(`${dir}/${f}: ${w0}x${h0} → ${img.bitmap.width}x${img.bitmap.height}`);
    } catch (e) {
      skipped++; console.warn(`  ! ${dir}/${f}: ${e.message}`);
    }
  }
  console.log(`✓ ${dir}: ${files.length} 张 → ${dir}/_sm/`);
}

console.log(`\n完成: 生成 ${total} 张小图 (跳过 ${skipped})`);
console.log('样例:'); samples.forEach(s => console.log('  ' + s));
