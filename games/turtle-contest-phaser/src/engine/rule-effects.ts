// ══════════════════════════════════════════════════════════
// rule-effects.ts — 7 战斗规则实装 (v0.9.5.A79 重写, JS turn.js + battle-setup.js 对齐)
// ══════════════════════════════════════════════════════════
// Rule names 对齐 data/rules.ts (JS battle-setup.js:7 BATTLE_RULES 同款 — 7 项, 无 '深海之日'):
//   烈焰之日 / 雷暴之日 / 铁壁之日 / 狂暴之日 / 装备之日 / 下雨天 / 正常对局
import type { Fighter, EquipmentDef } from '../types';
import { EQUIP_POOL } from '../data/equipment';
import { attachEquipment } from './fighter';
import { applyRawDamage, calcEffMr, calcDmgMult } from './damage';
import type { DamageType } from '../types';

/** 全局当前规则 (供 skill-handlers 等读取) */
export let currentRule: string | null = null;
export function setCurrentRule(rule: string | null) { currentRule = rule; }

/** 规则修正器 — 给 skill-handlers / equipment 使用
 *  P157: 删 reflectBonus(铁壁+15反伤) / hitStunChance(雷暴5%眩晕) — 均自创, JS battle-setup.js
 *  BATTLE_RULES 里 铁壁之日只 ×1.3 护盾, 雷暴之日只 +20% crit (JS combat.js 的 stun 是 ❄️冰冻,
 *  reflect 是 StoneWall 被动, 都不属规则). */
export const ruleModifiers = {
  /** 魔法伤害倍率 — JS BATTLE_RULES 不修改 magic dmg (烈焰只附带 burn DoT, 雷暴只 +20% crit) */
  magicMult(): number { return 1; },
  /** 灼烧 buff 值倍率 (烈焰 ×1.5) */
  burnMult(): number { return currentRule === '烈焰之日' ? 1.5 : 1; },
  /** 护盾值倍率 (铁壁 ×1.3) */
  shieldMult(): number { return currentRule === '铁壁之日' ? 1.3 : 1; },
  /** 全体暴击 +20% (雷暴) */
  globalCritBonus(): number { return currentRule === '雷暴之日' ? 0.20 : 0; },
};

/** 战斗开始时应用一次性规则 */
export function applyRuleStart(rule: string | null, leftTeam: Fighter[], rightTeam: Fighter[]) {
  setCurrentRule(rule);
  if (!rule || rule === '正常对局') return;

  if (rule === '狂暴之日') {
    for (const f of [...leftTeam, ...rightTeam]) {
      f.baseAtk = Math.round(f.baseAtk * 1.2);
      f.atk = f.baseAtk;
      f.baseDef = Math.round(f.baseDef * 0.85);
      f.def = f.baseDef;
      f.baseMr = Math.round((f.baseMr ?? f.def) * 0.85);
      f.mr = f.baseMr;
    }
  }
  if (rule === '装备之日') {
    // JS: 每 3 回合双方各选 1 件 — 这里先给开局每队 1 件起步
    const eligible: EquipmentDef[] = EQUIP_POOL.filter(e => e.category !== 'consumable' && e.category !== 'chest');
    for (const team of [leftTeam, rightTeam]) {
      const target = team.find(f => f.alive);
      const eq = eligible[Math.floor(Math.random() * eligible.length)];
      if (target && eq) attachEquipment(target, eq);
    }
  }
  if (rule === '雷暴之日') {
    // 全体 +20% 暴击
    const bonus = ruleModifiers.globalCritBonus();
    for (const f of [...leftTeam, ...rightTeam]) f.crit = (f.crit || 0) + bonus;
  }
}

/** 每回合开始执行 (JS turn.js:48-70 对齐)
 *  下雨天: 5×N 魔法 + 永久 -N 甲/抗 (N=回合数)
 */
export function applyRulePerTurn(rule: string | null, allFighters: Fighter[], turnNum: number = 1) {
  if (!rule) return;
  if (rule === '下雨天') {
    const n = turnNum;
    const dmg = 5 * n;
    for (const f of allFighters) {
      if (!f.alive) continue;
      // 永久 -N 甲/抗
      f.baseDef = Math.max(0, f.baseDef - n);
      f.baseMr = Math.max(0, (f.baseMr ?? f.baseDef) - n);
      f.def = f.baseDef; f.mr = f.baseMr;
      // 5×N 魔法 (mr 减免)
      const eff = calcEffMr({ ...f, magicPen: 0, magicPenPct: 0 } as Fighter, f);
      const finalDmg = Math.max(1, Math.round(dmg * calcDmgMult(eff)));
      const r = applyRawDamage(f, finalDmg, 'magic' as DamageType, false);
      (f as Fighter & { _rainDmg?: number })._rainDmg = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
    }
  }
}
