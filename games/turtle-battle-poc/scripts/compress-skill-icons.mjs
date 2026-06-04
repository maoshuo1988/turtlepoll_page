// ══════════════════════════════════════════════════════════
// compress-skill-icons.mjs — 技能图标降采样压缩 (就地)
//   技能图标 (assets/skills/*.png) 由 AI 生成时常为 1024px / ~1.4MB,
//   但面板里最大只显示 ~60px (技能大卡 ssc-icon 60 / tile / 配对 30)。
//   1024px 是显示尺寸的十几倍 → 巨量浪费仓库 + 加载带宽。
//   用 jimp 高质量降采样到 TARGET px (保长宽比, 仅缩小不放大), **就地覆盖源文件**,
//   入库后 sync-public 再复制到 public/。技能图走 DOM <img>, 不经 Phaser 纹理,
//   故无需 _sm 变体, 直接缩源图即可。
//   显示 ≤60px, 256px 仍是 4x retina 冗余, 视觉无损。
//   重跑安全: 已 ≤TARGET 的文件自动跳过 (不会反复劣化)。
//   用法: node scripts/compress-skill-icons.mjs [目标px, 默认256]
// ══════════════════════════════════════════════════════════
import { Jimp } from 'jimp';
import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', '..', 'games', 'turtle-battle', 'assets', 'skills');
const TARGET = Number(process.argv[2]) || 256;

const files = readdirSync(SKILLS_DIR)
  .filter(f => f.toLowerCase().endsWith('.png') && statSync(join(SKILLS_DIR, f)).isFile());

let shrunk = 0, skipped = 0, errs = 0;
let beforeBytes = 0, afterBytes = 0;
const samples = [];

for (const f of files) {
  const path = join(SKILLS_DIR, f);
  const sz0 = statSync(path).size;
  try {
    const img = await Jimp.read(path);
    const w0 = img.bitmap.width, h0 = img.bitmap.height;
    if (Math.max(w0, h0) <= TARGET) { skipped++; beforeBytes += sz0; afterBytes += sz0; continue; }
    img.scaleToFit({ w: TARGET, h: TARGET });   // 保长宽比, 仅缩小
    await img.write(path);                       // 就地覆盖
    const sz1 = statSync(path).size;
    beforeBytes += sz0; afterBytes += sz1; shrunk++;
    if (samples.length < 8) samples.push(`${f}: ${w0}x${h0} ${(sz0/1024).toFixed(0)}KB → ${img.bitmap.width}x${img.bitmap.height} ${(sz1/1024).toFixed(0)}KB`);
  } catch (e) {
    errs++; beforeBytes += sz0; afterBytes += sz0; console.warn(`  ! ${f}: ${e.message}`);
  }
}

const mb = b => (b / 1024 / 1024).toFixed(1);
console.log(`\n技能图压缩 (目标 ${TARGET}px): 缩小 ${shrunk} / 跳过 ${skipped} / 错误 ${errs}`);
console.log(`总体积: ${mb(beforeBytes)}MB → ${mb(afterBytes)}MB (省 ${((1 - afterBytes / beforeBytes) * 100).toFixed(0)}%)`);
console.log('样例:'); samples.forEach(s => console.log('  ' + s));
console.log('\n下一步: node scripts/sync-public.mjs  (复制到 public/)');
