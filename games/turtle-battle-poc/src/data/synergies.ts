// ══════════════════════════════════════════════════════════
// synergies.ts — 协同/羁绊系统 (从旧版 synergies.js 移植)
// 10 标签 × tier2/tier3 effect, 战斗开始时根据阵容 tags 应用
// ══════════════════════════════════════════════════════════
import type { Fighter } from '../types';

export type SynergyTag = '物理' | '法术' | '守护' | '元素' | '刺杀' | '运气' | '召唤' | '财富' | '换形' | '再生';

export interface SynergyTier {
  desc: string;
  apply(team: Fighter[], ctx: { enemies?: Fighter[] }): void;
}

export interface SynergyDef {
  name: string;
  emoji: string;
  tier2: SynergyTier;
  tier3: SynergyTier;
}

// P158: desc 全部对齐 JS synergies.js (旧版多处缩写, 漏写已实装效果如击杀+5%ATK / 召唤ATK+5/10;
//   财富 "龟币"→"深海币" — 羁绊每回合发的是局内币 深海币 (JS 同). 运气 apply 补 _synergyLuckGrant*
//   flag 与 JS 1:1 (JS 也只 set 不 consume → grant 在 JS/PoC 均 stub, 仅闪避实际生效).
export const SYNERGY_TAGS: Record<SynergyTag, SynergyDef> = {
  '物理': {
    name: '物理', emoji: '⚔️',
    tier2: {
      desc: '全队 ATK +4%',
      apply(team) {
        for (const f of team) {
          f.baseAtk = Math.round(f.baseAtk * 1.04);
          f.atk = f.baseAtk;
        }
      },
    },
    tier3: {
      desc: '全队 ATK +8% + 攻击附加 1 回合流血 (8% ATK)',
      apply(team) {
        for (const f of team) {
          f.baseAtk = Math.round(f.baseAtk * 1.08);
          f.atk = f.baseAtk;
          f._synergyPhysBleed = true;
        }
      },
    },
  },
  '法术': {
    name: '法术', emoji: '🔮',
    tier2: {
      desc: '全队 法穿 +2',
      apply(team) { for (const f of team) f.magicPen = (f.magicPen || 0) + 2; },
    },
    tier3: {
      desc: '全队 法穿 +5 + 登场敌方 魔抗 -4 永久',
      apply(team, ctx) {
        for (const f of team) f.magicPen = (f.magicPen || 0) + 5;
        for (const e of (ctx.enemies ?? [])) {
          e.baseMr = Math.max(0, (e.baseMr || 0) - 4);
          e.mr = e.baseMr;
        }
      },
    },
  },
  '守护': {
    name: '守护', emoji: '🛡',
    tier2: {
      desc: '全队 受到护盾/治疗 +5% + 登场 15 永久护盾',
      apply(team) { for (const f of team) { f._synergyGuardAmp = 0.05; f.shield = (f.shield || 0) + 15; } },
    },
    tier3: {
      desc: '全队 受到护盾/治疗 +10% + 登场 30 永久护盾',
      apply(team) { for (const f of team) { f._synergyGuardAmp = 0.10; f.shield = (f.shield || 0) + 30; } },
    },
  },
  '元素': {
    name: '元素', emoji: '🔥',
    tier2: {
      desc: '全队 元素伤害 +5% (灼烧/诅咒/雷击/流血/中毒)',
      apply(team) { for (const f of team) f._synergyElemDmgBoost = 0.05; },
    },
    tier3: {
      desc: '全队 元素伤害 +10% + 每回合随机灼烧 1 敌 2 回合',
      apply(team) {
        for (const f of team) f._synergyElemDmgBoost = 0.10;
        if (team.length > 0) team[0]._synergyElemBurnTick = true;
      },
    },
  },
  '刺杀': {
    name: '刺杀', emoji: '🗡',
    tier2: {
      desc: '全队 暴击 +5% + 穿甲 +2 + 击杀 +5% ATK',
      apply(team) {
        for (const f of team) {
          f.crit = (f.crit || 0) + 0.05;
          f.armorPen = (f.armorPen || 0) + 2;
          f._synergyAssassinKillBonus = true;
        }
      },
    },
    tier3: {
      desc: '全队 暴击 +10% + 穿甲 +3 + <50%HP +10%伤 + 击杀 +5% ATK',
      apply(team) {
        for (const f of team) {
          f.crit = (f.crit || 0) + 0.10;
          f.armorPen = (f.armorPen || 0) + 3;
          f._synergyAssassinKillBonus = true;
          f._synergyAssassinExecute = true;
        }
      },
    },
  },
  '运气': {
    name: '运气', emoji: '🎲',
    tier2: {
      desc: '全队 闪避 +5% + 第 1 回合 1 随机消耗品',
      apply(team) {
        for (const f of team) {
          f.buffs.push({ type: 'dodge', value: 5, duration: 999, _synergyLuck: true });
        }
        if (team[0]) team[0]._synergyLuckGrantConsumable = 1;
      },
    },
    tier3: {
      desc: '全队 闪避 +10% + 第 1 回合 1 装备 + 1 消耗品',
      apply(team) {
        for (const f of team) {
          f.buffs.push({ type: 'dodge', value: 10, duration: 999, _synergyLuck: true });
        }
        if (team[0]) {
          team[0]._synergyLuckGrantConsumable = 1;
          team[0]._synergyLuckGrantEquip = 1;
        }
      },
    },
  },
  '召唤': {
    name: '召唤', emoji: '👥',
    tier2: {
      desc: '召唤物 maxHp +10% + ATK +5',
      apply(team) { for (const f of team) { f._synergySummonHpBoost = 0.10; f._synergySummonAtkFlat = 5; } },
    },
    tier3: {
      desc: '召唤物 maxHp +15% + ATK +10',
      apply(team) { for (const f of team) { f._synergySummonHpBoost = 0.15; f._synergySummonAtkFlat = 10; } },
    },
  },
  '财富': {
    name: '财富', emoji: '💰',
    tier2: {
      desc: '每回合 +4 深海币',
      apply(team) { for (const f of team) f._synergyWealthCoinPerTurn = 4; },
    },
    tier3: {
      desc: '每回合 +4 深海币 + 商店 -25% 价',
      apply(team) { for (const f of team) { f._synergyWealthCoinPerTurn = 4; f._synergyWealthShopDiscount = 0.25; } },
    },
  },
  '换形': {
    name: '换形', emoji: '🎭',
    tier2: {
      desc: '换形后 5% maxHp 护盾',
      apply(team) { for (const f of team) f._synergyShiftShieldPct = 0.05; },
    },
    tier3: {
      desc: '换形后 10% maxHp 护盾 + 首次换形 +8% ATK 永久',
      apply(team) { for (const f of team) { f._synergyShiftShieldPct = 0.10; f._synergyShiftFirstAtkBonus = 0.08; } },
    },
  },
  '再生': {
    name: '再生', emoji: '⚱',
    tier2: {
      desc: '自身复活时 +15% HP',
      apply(team) { for (const f of team) f._synergyRegenReviveBonus = 0.15; },
    },
    tier3: {
      desc: '自身复活时 +25% HP + 复活时对随机敌 1×ATK 魔法',
      apply(team) { for (const f of team) { f._synergyRegenReviveBonus = 0.25; f._synergyRegenReviveAttack = true; } },
    },
  },
};

export interface ActiveSynergy {
  tag: SynergyTag;
  count: number;
  tier: 2 | 3;
}

/** 统计阵容 tags, 返回激活的协同列表 */
export function calcActiveSynergies(team: Fighter[]): ActiveSynergy[] {
  const counts: Record<string, number> = {};
  for (const f of team) {
    if (!f?.tags) continue;
    for (const t of f.tags) counts[t] = (counts[t] || 0) + 1;
  }
  const active: ActiveSynergy[] = [];
  for (const [tag, n] of Object.entries(counts)) {
    if (!(tag in SYNERGY_TAGS)) continue;
    if (n >= 3) active.push({ tag: tag as SynergyTag, count: n, tier: 3 });
    else if (n >= 2) active.push({ tag: tag as SynergyTag, count: n, tier: 2 });
  }
  return active;
}

/** 战斗开始时应用所有激活的协同 */
export function applyTeamSynergies(team: Fighter[], enemies: Fighter[]): ActiveSynergy[] {
  const active = calcActiveSynergies(team);
  for (const a of active) {
    const tier = a.tier === 3 ? SYNERGY_TAGS[a.tag].tier3 : SYNERGY_TAGS[a.tag].tier2;
    tier.apply(team, { enemies });
  }
  return active;
}

/** 换形羁绊结算: 在一只龟「换形」(火山变身 / 机甲变身 / 双头切换) 完成时调用。
 *  tier2/3 给 maxHp×_synergyShiftShieldPct 护盾; tier3 首次换形额外 +baseAtk×_synergyShiftFirstAtkBonus 永久。
 *  本函数只改 fighter 字段并返回增量, 由调用方负责飘字/统计 (synergies.ts 保持无 battleStats 依赖)。
 *  P???: 之前 _synergyShift* flag 只 set 从不消费 → 换形羁绊零效果, 现接通。 */
export function applyShiftSynergy(f: Fighter): { shieldAdded: number; atkAdded: number } {
  const x = f as Fighter & {
    _synergyShiftShieldPct?: number;
    _synergyShiftFirstAtkBonus?: number;
    _synergyShiftedOnce?: boolean;
  };
  let shieldAdded = 0, atkAdded = 0;
  if (x._synergyShiftShieldPct && f.alive) {
    shieldAdded = Math.round(f.maxHp * x._synergyShiftShieldPct);
    f.shield = (f.shield || 0) + shieldAdded;
  }
  if (x._synergyShiftFirstAtkBonus && !x._synergyShiftedOnce) {
    x._synergyShiftedOnce = true;
    atkAdded = Math.round(f.baseAtk * x._synergyShiftFirstAtkBonus);
    f.baseAtk += atkAdded;
    f.atk = f.baseAtk;
  }
  return { shieldAdded, atkAdded };
}
