// sync-public.mjs — 合并龟龟争霸（Phaser）全部资产到 games/turtle-contest-phaser/public/
//   1. public/games/turtle-battle/assets/     主站旧版战斗资产
//   2. Turtle-Project-L_Demo/assets/          扩展 pets/tags/ui/equip
//   3. Turtle-Project-L_Demo/poc-phaser/public/  poc-phaser 完整 public（menu/fonts/vfx/skills/rules 等）

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, '../public');
const SRC_TB = path.resolve(__dirname, '../../../public/games/turtle-battle/assets');
const L_DEMO_ROOT = path.resolve(__dirname, '../../../../../Turtle-Project-L_Demo');
const L_DEMO_ASSETS = path.join(L_DEMO_ROOT, 'assets');
const SRC_POCPHASER_PUBLIC = path.join(L_DEMO_ROOT, 'poc-phaser/public');

let copied = 0;
let skipped = 0;

function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const sp = path.join(src, entry.name);
    const dp = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(sp, dp);
    } else if (entry.isFile()) {
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
        fs.utimesSync(dp, ss.atime, ss.mtime);
        copied++;
      } catch (error) {
        console.warn(`[sync-public] skip ${sp}: ${error.message}`);
      }
    }
  }
}

console.log('[sync-public] 1/4 public/games/turtle-battle/assets → public/');
copyDir(SRC_TB, PUBLIC);

if (fs.existsSync(L_DEMO_ASSETS)) {
  console.log('[sync-public] 2/4 L_Demo assets/pets → public/pets/');
  copyDir(path.join(L_DEMO_ASSETS, 'pets'), path.join(PUBLIC, 'pets'));

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
      try {
        fs.copyFileSync(sp, dp);
        copied++;
      } catch {
        /* ignore */
      }
    }
  }

  console.log('[sync-public] 3/4 L_Demo assets/tags|ui|equip → public/');
  copyDir(path.join(L_DEMO_ASSETS, 'tags'), path.join(PUBLIC, 'tags'));
  copyDir(path.join(L_DEMO_ASSETS, 'ui'), path.join(PUBLIC, 'ui'));
  copyDir(path.join(L_DEMO_ASSETS, 'equip'), path.join(PUBLIC, 'equip'));
} else {
  console.warn('[sync-public] L_Demo assets not found, skip extended sync');
}

if (fs.existsSync(SRC_POCPHASER_PUBLIC)) {
  console.log('[sync-public] 4/4 poc-phaser/public overlay → public/ (menu/fonts/vfx/skills/rules...)');
  copyDir(SRC_POCPHASER_PUBLIC, PUBLIC);
} else {
  console.warn('[sync-public] poc-phaser/public not found, skip overlay');
}

console.log(`[sync-public] done: ${copied} copied, ${skipped} skipped (up-to-date)`);
