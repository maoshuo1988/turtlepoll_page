// ════════════════════════════════════════════════════════════════
// extract-godot-data.ts — 把 Phaser PoC 的 src/data/*.ts 数据
//   抽到 games/turtle-battle-godot/data/*.json
//
// 跑法:
//   cd games/turtle-battle-poc
//   npx tsx scripts/extract-godot-data.ts
//
// 策略:
//   - 大多数 export 已是 pure JSON, 直接 JSON.stringify
//   - equipment.ts / synergies.ts 含 apply()/onHit/onDeath 等 function 闭包,
//     用 serializable() 递归 filter 掉 function (留给 Godot GDScript 重新实现)
//   - 同时 emit 一个 _extracted-fields.json 说明每文件抽到哪些字段, 给 GDScript 端做断言
// ════════════════════════════════════════════════════════════════
import { ALL_PETS, PET_SYNERGY_TAGS, RARITY_MULT, DEF_CONSTANT } from '../src/data/pets';
import { EQUIP_POOL } from '../src/data/equipment';
import { SYNERGY_TAGS } from '../src/data/synergies';
import { ACHIEVEMENTS } from '../src/data/achievements';
import { STATUS_DEFS } from '../src/data/status';
import { BATTLE_RULES } from '../src/data/rules';
import { BUFF_POOL, BASE_PRICE, SLOT_DIST } from '../src/data/shop-quick';
import { PASSIVE_ICONS } from '../src/data/passive-icons';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../../turtle-battle-godot/data');

// 递归剥 function (apply/onHit/onDeath 等闭包) — Godot 端用 GDScript 重写这些逻辑
function serializable(obj: unknown): unknown {
  if (typeof obj === 'function') return undefined;
  if (obj instanceof Date || obj instanceof RegExp) return String(obj);
  if (Array.isArray(obj)) {
    return obj.map(serializable).filter(v => v !== undefined);
  }
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const cleaned = serializable(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }
  return obj;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

function dump(name: string, data: unknown): void {
  const out = serializable(data);
  const json = JSON.stringify(out, null, 2);
  fs.writeFileSync(path.join(OUT_DIR, `${name}.json`), json + '\n');
  const count = Array.isArray(out) ? `${out.length} entries` :
    (out && typeof out === 'object') ? `${Object.keys(out).length} keys` : '1 value';
  const sizeKB = (json.length / 1024).toFixed(1);
  console.log(`  ✓ ${name.padEnd(28)} ${count.padEnd(15)} ${sizeKB} KB`);
}

console.log('════════════════════════════════════════════════════════');
console.log('  Extracting PoC data → games/turtle-battle-godot/data/');
console.log('════════════════════════════════════════════════════════');
dump('pets', ALL_PETS);
dump('pet-synergy-tags', PET_SYNERGY_TAGS);
dump('rarity-mult', RARITY_MULT);
dump('def-constant', { value: DEF_CONSTANT });
dump('equipment', EQUIP_POOL);
dump('synergies', SYNERGY_TAGS);
dump('achievements', ACHIEVEMENTS);
dump('status', STATUS_DEFS);
dump('battle-rules', BATTLE_RULES);
dump('shop-buffs', BUFF_POOL);
dump('shop-base-prices', BASE_PRICE);
dump('shop-slot-dist', SLOT_DIST);
dump('passive-icons', PASSIVE_ICONS);

// 元信息: 哪些 source 字段被剥 function 后丢了 (给 Godot 端 porter 看)
const meta = {
  extractedAt: '2026-05-30',
  source: 'games/turtle-battle-poc/src/data/*.ts',
  notes: [
    'apply()/onHit/onDeath/onTurnBegin 等 function 闭包被 filter 掉, 留给 GDScript 重写',
    'equipment.ts 的 apply() 是装备装上时改 Fighter 数值的逻辑, 必须在 Godot 端按 EQUIP.id 查表重新实装',
    'synergies.ts 的 tier2.apply / tier3.apply 同理',
    '所有数据保留 id 字段, 是 Godot 端跟代码 hook 对齐的键',
  ],
};
fs.writeFileSync(path.join(OUT_DIR, '_meta.json'), JSON.stringify(meta, null, 2) + '\n');
console.log(`  ✓ ${'_meta.json'.padEnd(28)} extraction metadata`);

console.log('════════════════════════════════════════════════════════');
console.log(`  Done. Output: ${path.relative(process.cwd(), OUT_DIR)}/`);
console.log('════════════════════════════════════════════════════════');
