// ══════════════════════════════════════════════════════════
// events.ts — 局中事件系统
// 触发: 第 3/6/9/12 回合战斗开始时, 整场互斥 1 个
// v0.9.5.A81: 数值对齐 JS events.js:33-98 ENV_EVENTS (除中立生物外)
// ══════════════════════════════════════════════════════════
import type { Fighter } from '../types';

export interface BattleEvent {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  apply(allFighters: Fighter[]): void;
}

export const ENV_EVENTS: BattleEvent[] = [
  // JS: 所有 front 排损 8% maxHp (敌我都损), 真伤
  {
    id: 'volcano', name: '火山喷发', emoji: '🌋',
    desc: '所有前排损 8% 最大生命 (真伤)',
    apply(all) {
      for (const f of all) {
        if (!f.alive || f._position !== 'front') continue;
        const dmg = Math.max(1, Math.round(f.maxHp * 0.08));
        f.hp = Math.max(0, f.hp - dmg);
        if (f.hp === 0) f.alive = false;
      }
    },
  },
  // JS: 后续 2 回合所有单位 atkDown 15 + defUp 10
  {
    id: 'tide', name: '涨潮', emoji: '🌊',
    desc: '全员 攻击 -15 / 护甲 +10 (2 回合)',
    apply(all) {
      for (const f of all) {
        if (!f.alive) continue;
        f.buffs.push({ type: 'atkDown', value: 15, duration: 2 });
        f.buffs.push({ type: 'defUp', value: 10, duration: 2 });
        f.atk = Math.max(0, f.baseAtk - 15);
        f.def = (f.baseDef ?? 0) + 10;
      }
    },
  },
  // JS: 后续 3 回合每回合电击随机单位 40 真伤 (用 thunderstormTurns 计数, 简化为开局即扣 + 2 回合扣)
  {
    id: 'thunder', name: '雷暴', emoji: '⚡',
    desc: '后续 3 回合每回合随机单位 40 真伤',
    apply(all) {
      const alive = all.filter(f => f.alive);
      if (!alive.length) return;
      const t = alive[Math.floor(Math.random() * alive.length)];
      t.hp = Math.max(0, t.hp - 40);
      if (t.hp === 0) t.alive = false;
      // 标记后续触发 (BattleScene 在 startActorTurn round-start 处理)
      for (const f of all) {
        (f as Fighter & { _thunderstormTurns?: number })._thunderstormTurns = 2;
      }
    },
  },
  // JS: 双方各 1 个随机龟受 100 法术
  {
    id: 'meteor', name: '流星雨', emoji: '🌠',
    desc: '双方各 1 名随机龟受 100 法术',
    apply(all) {
      for (const side of ['left', 'right'] as const) {
        const alive = all.filter(f => f.alive && f.side === side);
        if (!alive.length) continue;
        const t = alive[Math.floor(Math.random() * alive.length)];
        const dmg = 100; // PoC 简化: 不走 mr 减免
        t.hp = Math.max(0, t.hp - dmg);
        if (t.hp === 0) t.alive = false;
      }
    },
  },
  // 双方各 +30 深海币 (用户 v0.9.9)
  {
    id: 'treasure-rain', name: '财宝雨', emoji: '💰',
    desc: '双方各 +30 深海币',
    apply(_all) {
      // 在 BattleScene 处理 (this.coins += 30 / aiGainCoins)
    },
  },
  // JS: 所有单位 dodge 15% 2 回合
  {
    id: 'fog', name: '浓雾', emoji: '🌫',
    desc: '全员 闪避 +15% (2 回合)',
    apply(all) {
      for (const f of all) {
        if (!f.alive) continue;
        f.buffs.push({ type: 'dodge', value: 15, duration: 2 });
      }
    },
  },
];

/** 在指定回合检查是否触发 (3/6/9/12), 返回事件或 null */
export function rollEventForTurn(turn: number, alreadyFired: Set<string>): BattleEvent | null {
  if (![3, 6, 9, 12].includes(turn)) return null;
  // 取还没触发过的
  const pool = ENV_EVENTS.filter(e => !alreadyFired.has(e.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── v0.9.5.A91: 中立生物 (JS events.js:10-31 NEUTRAL_TEMPLATES) ───
// 整场最多 spawn 1 个中立; 后续回合只抽 env event
export interface NeutralTemplate {
  id: string;
  name: string;
  emoji: string;
  hp: number;          // treasure/crab 站场实体血量 (anemone 不用)
  atk: number;
  def: number;
  mr: number;
  atkScale: number;
  /** 海葵母寄生护盾 (JS events.js:27) — 不站场, 附在己方寄主身上 */
  parasiteShield?: number;
  /** 海葵母给寄主的 +攻击 (JS events.js:27) */
  hostAtkBonus?: number;
  /** 跨阵营 KO 后给 killer side 的奖励 (JS events.js:15-30):
   *  equip:1 → dropRandomEquip(winSide); debuff:'purify' → 对面 3 回合 healReduce 10 */
  bigReward: { coins: number; equip?: number; debuff?: 'purify' };
  smallReward: { coins: number };
}

export const NEUTRAL_TEMPLATES: Record<string, NeutralTemplate> = {
  treasure: {
    id: 'treasure_golem', name: '宝箱怪', emoji: '🎁',
    hp: 300, atk: 30, def: 0, mr: 0, atkScale: 0.5,
    bigReward: { coins: 30, equip: 1 }, smallReward: { coins: 25 },
  },
  crab: {
    id: 'giant_crab', name: '巨蟹', emoji: '🦀',
    hp: 400, atk: 40, def: 0, mr: 0, atkScale: 1.0,
    bigReward: { coins: 20, equip: 1 }, smallReward: { coins: 15 },
  },
  // 海葵母: 寄生型 (JS events.js:25-30). 不站场不占 slot, 附在双方各 1 只寄主身上,
  //   给寄主 +350 寄生护盾 + 15 攻击; 护盾被对面打穿 = "击杀", 首破方拿大奖。
  //   ⇒ 双方 6 格满时也能出 (无需空位), 故 JS「满格只出海葵母」。
  anemone: {
    id: 'anemone_mother', name: '海葵母', emoji: '🪼',
    hp: 0, atk: 0, def: 0, mr: 0, atkScale: 0,
    parasiteShield: 350, hostAtkBonus: 15,
    bigReward: { coins: 15, debuff: 'purify' }, smallReward: { coins: 10 },
  },
};

/** 决定 3/6/9/12 回合是否抽中立 (BattleScene 负责实际 spawn)。
 *  bothSidesFull: 双方 6 格都满 → 强制海葵母 (JS D19: 寄生型无需空位, 满格只出它)。 */
export function rollNeutralForTurn(
  turn: number,
  neutralSpawned: boolean,
  bothSidesFull = false,
  rng: () => number = Math.random,
): { kind: 'neutral'; type: keyof typeof NEUTRAL_TEMPLATES } | null {
  if (![3, 6, 9, 12].includes(turn)) return null;
  if (neutralSpawned) return null;
  if (rng() >= 0.6) return null;  // 60% 中立, 40% env (返 null 让 BattleScene 走 rollEventForTurn)
  if (bothSidesFull) return { kind: 'neutral', type: 'anemone' };  // 满格只出寄生海葵母
  const r = rng();
  const type: keyof typeof NEUTRAL_TEMPLATES = r < 1 / 3 ? 'treasure' : r < 2 / 3 ? 'crab' : 'anemone';
  return { kind: 'neutral', type };
}
