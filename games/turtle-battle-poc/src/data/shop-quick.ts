// ══════════════════════════════════════════════════════════
// shop-quick.ts — 小商店 (用户 v0.9.9 经济改造规格)
//   6 格 A~F: A~E 按各自稀有度分布抽 (增益/消耗/普通/独特), F 恒为「重置骰子」。
//   价格 = 基准价 × 1.25^(第几次商店) × (0.9~1.1 动态±10%)。
//   基准价(第一次): 普通装备 32 / 消耗品 24 / 增益 16 / 独特装备 41。
//   重投费用由 ShopOverlay 维护 (首次 2, 之后每次 +1, 每次进商店重置回 2)。
// ══════════════════════════════════════════════════════════
import type { Fighter, Buff } from '../types';
import { EQUIP_POOL } from './equipment';
import { recalcStats, snapshotBaseStats } from '../engine/stats-recalc';

export type ShopRarity = 'buff' | 'consumable' | 'normal' | 'unique';

// ── 增益池 (12, 临时 buff / 单体增益) ──
export interface BuffDef {
  id: string;
  name: string;          // 含 emoji
  desc: string;
  kind: 'team-buff' | 'single-buff';
  /** 单体型增益, 需要拖给单只龟 (走 bench) */
  singleTarget?: boolean;
  /** 标记型: 拖给敌方单只 */
  wantsEnemy?: boolean;
  /** 全队增益 — 把 Buff push 给所有活着的友方 */
  teamBuff?: Pick<Buff, 'type' | 'value' | 'duration'>;
  /** 单体效果: 对 target 直接产生效果 */
  applyToTarget?: (target: Fighter) => void;
}

export const BUFF_POOL: BuffDef[] = [
  { id: 'q_blade',     name: '🗡 锋利之刃',   desc: '全队 +10% ATK / 3 回合',          kind: 'team-buff',  teamBuff: { type: 'atkUp',     value: 10, duration: 3 } },
  { id: 'q_shield',    name: '🛡 灵龟之盾',   desc: '全队 +15% DEF/MR / 3 回合',       kind: 'team-buff',  teamBuff: { type: 'defUp',     value: 15, duration: 3 } },
  { id: 'q_lifesteal', name: '🩸 嗜血药剂',   desc: '全队 +15% 生命偷取 / 3 回合',     kind: 'team-buff',  teamBuff: { type: 'lifesteal', value: 15, duration: 3 } },
  { id: 'q_swift',     name: '💨 疾风之策',   desc: '全队下回合 CD -1',                kind: 'team-buff',  teamBuff: { type: 'cdDown',    value: 1,  duration: 1 } },
  { id: 'q_hawk',      name: '👁 鹰眼',       desc: '全队 +15% 暴击 / 2 回合',         kind: 'team-buff',  teamBuff: { type: 'critUp',    value: 15, duration: 2 } },
  { id: 'q_critdmg',   name: '💥 致命一击',   desc: '全队 +25% 暴击伤害 / 2 回合',     kind: 'team-buff',  teamBuff: { type: 'critDmgUp', value: 25, duration: 2 } },
  { id: 'q_dodge',     name: '🍃 闪避之灵',   desc: '全队 +10% 闪避 / 2 回合',         kind: 'team-buff',  teamBuff: { type: 'dodge',     value: 10, duration: 2 } },
  { id: 'q_rage',      name: '🔥 怒火药水',   desc: '拖给单只龟 +25% ATK / 3 回合',    kind: 'single-buff', singleTarget: true,
    // 修(2026-05-30): atkUp buff 值是 flat(recalcStats 直接 +value), 故 +25% 要折成 baseAtk×0.25,
    //   而非裸 value:25 (那是 +25 点, 不是 +25%)。与 applyTeamBuff / c_rage 口径一致。
    applyToTarget: (t) => t.buffs.push({ type: 'atkUp', value: Math.round((t.baseAtk ?? t.atk ?? 0) * 25 / 100), duration: 3 }) },
  { id: 'q_emergency', name: '⛑ 应急护盾',   desc: '拖给单只龟 +80 护盾',             kind: 'single-buff', singleTarget: true,
    applyToTarget: (t) => { t.shield = (t.shield ?? 0) + 80; } },
  { id: 'q_firstaid',  name: '🌿 急救包',     desc: '拖给单只龟回 15% maxHp',          kind: 'single-buff', singleTarget: true,
    applyToTarget: (t) => { t.hp = Math.min(t.maxHp, t.hp + Math.round(t.maxHp * 0.15)); } },
  { id: 'q_cleanse',   name: '✨ 净化',       desc: '拖给单只龟移除所有负面 buff',     kind: 'single-buff', singleTarget: true,
    // 修(2026-05-30): 'heal-reduce' 是错拼(真实 type 是 'healReduce' → 之前净化不掉治疗削减);
    //   且漏了 atk/def/mrDown、易伤、束缚等。对齐 c_cleanse / engine.js debuff 集。
    applyToTarget: (t) => { t.buffs = t.buffs.filter(b => !['dot','curse','burn','poison','bleed','chilled','atkDown','defDown','mrDown','armorBreak','healReduce','markedDmg','bubbleBind','fear','stun'].includes(b.type)); } },
  { id: 'q_mark',      name: '🎯 必中标记',   desc: '拖给敌方单只 受伤 +20% / 2 回合', kind: 'single-buff', singleTarget: true, wantsEnemy: true,
    // 修(2026-05-30): type 'mark' 没有任何代码消费 → 改 'markedDmg' (与 c_mark 一致, applyRawDamage 已实装放大)。
    applyToTarget: (t) => t.buffs.push({ type: 'markedDmg', value: 20, duration: 2 }) },
];

// ── 基准价 (第一次小商店) ──
export const BASE_PRICE: Record<ShopRarity, number> = {
  buff: 16, consumable: 24, normal: 32, unique: 41,
};

// ── 每格稀有度分布 (各列和 = 100); F 格恒为重置骰子 ──
export const SLOT_DIST: Record<string, Record<ShopRarity, number>> = {
  A: { buff: 40, consumable: 25, normal: 20, unique: 15 },
  B: { buff: 30, consumable: 30, normal: 25, unique: 15 },
  C: { buff: 30, consumable: 25, normal: 30, unique: 15 },
  D: { buff: 25, consumable: 20, normal: 35, unique: 20 },
  E: { buff: 15, consumable: 15, normal: 30, unique: 40 },
};

const SLOT_ORDER = ['A', 'B', 'C', 'D', 'E'] as const;

export interface ShopSlot {
  slot: string;                       // 'A'..'E' | 'F'
  rarity: ShopRarity | 'reroll';
  name: string;
  desc: string;
  price: number;
  buff?: BuffDef;
  equipId?: string;
  isReroll?: boolean;
}

// 装备按类别预筛 (糖果罐 special / 初始装备不入商店)
const CONSUMABLE_IDS = EQUIP_POOL.filter(e => e.category === 'consumable').map(e => e.id);
const NORMAL_IDS = EQUIP_POOL.filter(e => e.category === 'normal').map(e => e.id);
const UNIQUE_IDS = EQUIP_POOL.filter(e => e.category === 'unique').map(e => e.id);

function pickRarity(dist: Record<ShopRarity, number>, rng: () => number): ShopRarity {
  let r = rng() * 100;
  for (const k of ['buff', 'consumable', 'normal', 'unique'] as ShopRarity[]) {
    r -= dist[k];
    if (r < 0) return k;
  }
  return 'unique';   // 浮点边界兜底: 落最后一档 (而非偏向 normal)
}

/** 价格 = 基准 × 1.25^shopIndex × (0.9~1.1) */
function priceFor(rarity: ShopRarity, shopIndex: number, rng: () => number): number {
  const scaled = BASE_PRICE[rarity] * Math.pow(1.25, Math.max(0, shopIndex));
  const jitter = 0.9 + rng() * 0.2;
  return Math.max(1, Math.round(scaled * jitter));
}

/** 装备多行 desc → 取首行 (商店格只放一句) */
function shortDesc(desc: string): string {
  return (desc || '').split('\n')[0].trim();
}

const RARITY_LABEL: Record<ShopRarity, string> = {
  buff: '增益', consumable: '消耗品', normal: '普通装备', unique: '独特装备',
};

/** 滚 6 格. shopIndex: 第几次商店 (0=第一次/turn4, 1=turn8, 2=turn12). */
export function rollShopItems(shopIndex: number, rng: () => number = Math.random): ShopSlot[] {
  const out: ShopSlot[] = [];
  for (const slot of SLOT_ORDER) {
    const rarity = pickRarity(SLOT_DIST[slot], rng);
    const price = priceFor(rarity, shopIndex, rng);
    if (rarity === 'buff') {
      const b = BUFF_POOL[Math.floor(rng() * BUFF_POOL.length)];
      out.push({ slot, rarity, name: b.name, desc: b.desc, price, buff: b });
    } else {
      const ids = rarity === 'consumable' ? CONSUMABLE_IDS : rarity === 'normal' ? NORMAL_IDS : UNIQUE_IDS;
      const id = ids[Math.floor(rng() * ids.length)];
      const eq = EQUIP_POOL.find(e => e.id === id);
      out.push({
        slot, rarity, price, equipId: id,
        name: `${eq?.name ?? id} · ${RARITY_LABEL[rarity]}`,
        desc: shortDesc(eq?.desc ?? ''),
      });
    }
  }
  // F: 重置骰子 (price = 当前重投费用, 由 ShopOverlay 覆写)
  out.push({ slot: 'F', rarity: 'reroll', name: '🎲 重置骰子', desc: '刷新本商店全部商品 (每次重投费用 +1)', price: 2, isReroll: true });
  return out;
}

/** 野生敌方 AI 购买决策 (纯函数, 无副作用, rng 可注入 → 可单测)。
 *  贪心: 反复扫货架, 买得起就买; 一轮买不动且余币够重投费(首次2/每次+1, 上限3次)则重投继续。
 *  返回按购买顺序的格子 + 花费 + 余额; 实际副作用(装备进席/施增益)由调用方按 buys 施加。 */
export function planAiShop(
  coins: number,
  shopIndex: number,
  rng: () => number = Math.random,
): { buys: ShopSlot[]; spent: number; coinsLeft: number } {
  let slots = rollShopItems(shopIndex, rng).filter(s => !s.isReroll);
  const buys: ShopSlot[] = [];
  let left = coins, spent = 0, rerolls = 0, rerollCost = 2;
  let progressed = true;
  const purchased = new Set<string>();
  while (progressed && left > 0) {
    progressed = false;
    for (const slot of slots) {
      if (purchased.has(slot.slot)) continue;
      if (left < slot.price) continue;
      left -= slot.price; spent += slot.price;
      purchased.add(slot.slot); buys.push(slot); progressed = true;
    }
    if (!progressed && rerolls < 3 && left >= rerollCost) {
      left -= rerollCost; spent += rerollCost; rerollCost += 1; rerolls++;
      slots = rollShopItems(shopIndex, rng).filter(s => !s.isReroll);
      purchased.clear(); progressed = true;
    }
  }
  return { buys, spent, coinsLeft: left };
}

/** 把 team-buff 推给所有活着的友方 (百分比按目标 base 折 flat) */
export function applyTeamBuff(team: Fighter[], buff: BuffDef) {
  if (!buff.teamBuff) return;
  const tb = buff.teamBuff;
  // 修(2026-05-30 二审): q_swift "全队下回合 CD-1" — cdDown buff 全工程无消费方 (同 markedDmg 死案),
  //   推个 cdDown buff 既无效又永不消逝。改为**立即扣 cdLeft** (cap 0), 描述本意"下回合CD-1"就实现了。
  if (tb.type === 'cdDown') {
    for (const f of team) {
      if (!f.alive) continue;
      for (const s of f.skills ?? []) {
        if ((s.cdLeft ?? 0) > 0) s.cdLeft = Math.max(0, (s.cdLeft ?? 0) - tb.value);
      }
    }
    return;
  }
  for (const f of team) {
    if (!f.alive) continue;
    let value = tb.value;
    if (tb.type === 'atkUp')      value = Math.round(f.baseAtk * tb.value / 100);
    else if (tb.type === 'defUp') value = Math.round(f.baseDef * tb.value / 100);
    else if (tb.type === 'mrUp')  value = Math.round((f.baseMr ?? f.baseDef) * tb.value / 100);
    f.buffs.push({ type: tb.type, value, duration: tb.duration });
  }
  // 修(2026-05-30 二审): team-buff push 后没 recalc → 同怒火药水类 bug, 当回合 atkUp/defUp/critUp/lifesteal
  //   不进 f.atk/def/crit/lifestealPct, 要等下回合 turn-begin recalc 才生效。立即全队 recalc。
  for (const f of team) {
    if (!f.alive) continue;
    if ((f as Fighter & { _baseCrit?: number })._baseCrit === undefined) snapshotBaseStats(f);
    recalcStats(f, team);
  }
}
