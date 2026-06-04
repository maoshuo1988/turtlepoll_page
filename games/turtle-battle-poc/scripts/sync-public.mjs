// sync-public.mjs — 合并两个资产源到 poc-phaser/public/
//   src1: ../games/turtle-battle/assets/  (旧版资产: bg/audio/avatars/passive/...)
//   src2: ../../assets/pets/              (项目根: 24 龟中文名 sprite sheet)
// 修改的话直接重跑 (幂等, mtime 一致就跳过).
//
// 为啥不直接 publicDir 指 turtle-battle/assets:
//   v0.9 要让 24 中文名 sprite sheet 也能被 Phaser 加载, 但 publicDir 只能 1 个.
//   合并到 poc-phaser/public/ 后, vite publicDir='public' 就能一锅端.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, '../public');
// 主站内构建时，资产源统一落在 public/ 下；缺失的补充资产保留在本项目 public/ 中。
const SRC_TB = path.resolve(__dirname, '../public/_legacy-assets');
const SRC_ROOT_PETS  = path.resolve(__dirname, '../../../public/assets/pets');
const SRC_ROOT_TAGS  = path.resolve(__dirname, '../../../public/assets/tags');
const SRC_ROOT_UI    = path.resolve(__dirname, '../../../public/assets/ui');
const SRC_ROOT_EQUIP = path.resolve(__dirname, '../../../public/assets/equip');

let copied = 0, skipped = 0;

function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const sp = path.join(src, entry.name);
    const dp = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(sp, dp);
    } else if (entry.isFile()) {
      // 跳过 .aseprite 源文件 (Vite serve 不需要)
      if (entry.name.endsWith('.aseprite')) continue;
      try {
        const ss = fs.statSync(sp);
        if (fs.existsSync(dp)) {
          const ds = fs.statSync(dp);
          if (ds.size === ss.size && Math.abs(ds.mtimeMs - ss.mtimeMs) < 1000) {
            skipped++;
            continue;
          }
        }
        fs.copyFileSync(sp, dp);
        // 保 mtime 让幂等检查准
        fs.utimesSync(dp, ss.atime, ss.mtime);
        copied++;
      } catch (e) {
        console.warn(`[sync-public] 跳 ${sp}: ${e.message}`);
      }
    }
  }
}

console.log('[sync-public] 1/2 turtle-battle/assets → poc-phaser/public/');
copyDir(SRC_TB, PUBLIC);

console.log('[sync-public] 2/3 项目根 /assets/pets/ → poc-phaser/public/pets/');
copyDir(SRC_ROOT_PETS, path.join(PUBLIC, 'pets'));

// v0.9.5.A66: 给中文文件名 pet 加 ASCII 别名 (Vercel Unicode 文件名兼容)
// pets.ts 已用 ASCII id 路径 (e.g. pets/phoenix.png), 此处把中文文件复制为 id.png
const CHINESE_TO_ID = {
  '石头龟v1.png': 'stone.png', '竹叶龟v1.png': 'bamboo.png', '天使龟v1.png': 'angel.png',
  '寒冰龟.png': 'ice.png', '双头龟.png': 'two_head.png', '钻石龟.png': 'diamond.png',
  '财神龟v1.png': 'fortune.png', '骰子龟v1.png': 'dice.png', '彩虹龟.png': 'rainbow.png',
  '赌神龟v1.png': 'gambler.png', '猎人龟v1.png': 'hunter.png', '海盗龟.png': 'pirate.png',
  '糖果龟v1.png': 'candy.png', '气泡龟v1.png': 'bubble.png', '线条龟v1.png': 'line.png',
  '闪电龟.png': 'lightning.png', '凤凰龟.png': 'phoenix.png', '熔岩龟.png': 'lava.png',
  '赛博龟.png': 'cyber.png', '水晶龟v1.png': 'crystal.png', '宝箱龟v1.png': 'chest.png',
  '星际龟v1.png': 'space.png', '缩头乌龟v1.png': 'hiding.png', '无头龟v1.png': 'headless.png',
  '龟壳v1.png': 'shell.png',
};
const petsDir = path.join(PUBLIC, 'pets');
for (const [cn, id] of Object.entries(CHINESE_TO_ID)) {
  const sp = path.join(petsDir, cn);
  const dp = path.join(petsDir, id);
  if (fs.existsSync(sp) && !fs.existsSync(dp)) {
    try { fs.copyFileSync(sp, dp); copied++; } catch { /* ignore */ }
  }
}

console.log('[sync-public] 3/4 项目根 /assets/tags/ → poc-phaser/public/tags/');
copyDir(SRC_ROOT_TAGS, path.join(PUBLIC, 'tags'));

// v0.9.9: 战斗 chrome 按钮 Steam 贴图 (返回/术语/日志/统计/音乐/全屏) — 项目根 /assets/ui/
//   与 turtle-battle/assets/ui (help-button 等) 合并进同一 public/ui/。
console.log('[sync-public] 4/5 项目根 /assets/ui/ → poc-phaser/public/ui/');
copyDir(SRC_ROOT_UI, path.join(PUBLIC, 'ui'));

// v0.9.9: 消耗品等 poc 追加装备图 — 项目根 /assets/equip/ 合并进 public/equip/ (与 JS 版 equip 共存)
console.log('[sync-public] 5/5 项目根 /assets/equip/ → poc-phaser/public/equip/');
copyDir(SRC_ROOT_EQUIP, path.join(PUBLIC, 'equip'));

// v1.0 (2026-05-30) 重组 public/ 根散文件到子目录 — 跟 BootScene/index.html/manifest 引用路径对齐:
//   bgm-*.mp3 → audio/, icon-*.png + apple-touch-icon.png → icons/, select-bg.png → bg/
//   sync 从源(games/turtle-battle/assets/)拷过来还是平铺, 这里 post-process 重排。
function moveIfExists(filename, subdir) {
  const src = path.join(PUBLIC, filename);
  const dstDir = path.join(PUBLIC, subdir);
  const dst = path.join(dstDir, filename);
  if (fs.existsSync(src)) {
    fs.mkdirSync(dstDir, { recursive: true });
    fs.renameSync(src, dst);
    console.log(`[sync-public] reorg: ${filename} → ${subdir}/`);
  }
}
for (const f of ['bgm-menu.mp3', 'bgm-battle.mp3', 'bgm-boss.mp3']) moveIfExists(f, 'audio');
for (const f of ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) moveIfExists(f, 'icons');
moveIfExists('select-bg.png', 'bg');

// manifest.webmanifest 源里的 icon src 是平铺(原 demo 用), poc 重组后改 icons/ 前缀。
//   原文件被 copyDir 覆盖回旧版 → 这里 post-process 改写。
const manifestPath = path.join(PUBLIC, 'manifest.webmanifest');
if (fs.existsSync(manifestPath)) {
  try {
    const mf = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (Array.isArray(mf.icons)) {
      let changed = false;
      for (const ic of mf.icons) {
        if (ic.src && !ic.src.startsWith('icons/') && !ic.src.startsWith('http')) {
          ic.src = 'icons/' + ic.src;
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(manifestPath, JSON.stringify(mf, null, 2) + '\n');
        console.log('[sync-public] reorg: manifest icons → icons/ 前缀');
      }
    }
  } catch (e) { console.warn(`[sync-public] manifest rewrite skipped: ${e.message}`); }
}

console.log(`[sync-public] done: ${copied} copied, ${skipped} skipped (up-to-date)`);
