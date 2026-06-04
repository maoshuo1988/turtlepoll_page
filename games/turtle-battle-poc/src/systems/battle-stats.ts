// ══════════════════════════════════════════════════════════
// battle-stats.ts — P2.8 战斗内累计统计 + v0.9.2 伤害分类
// 4 维: DMG (输出)  TAKEN (承受)  HEAL (治疗量)  SHIELD (护盾产生)
// 每维按 4 dmgType 拆分: 物理 / 法术 / 真实 / DoT
// 按 fighter.id 累加; 每场战斗 reset(); BattleEndScene 读取展示
// ══════════════════════════════════════════════════════════
import type { Fighter } from '../types';
import { bus } from './bus';

export type DmgType = 'phy' | 'mag' | 'tru' | 'dot';
export const DMG_TYPES: DmgType[] = ['phy', 'mag', 'tru', 'dot'];

/** P23 统计面板 bar 配色 1:1 (JS battle.css:629-633):
 *   物理 #ff4444 红, 法术 #4dabf7 蓝, 真实 #ffffff 白, dot #ff6600 橙 (按 .log-dot 同色).
 *   之前 poc 用 橙/紫/红/黄 是 floatCls 飘字色 — bar 应跟 JS .ds-bar-* 1:1.
 */
export const DMG_TYPE_INFO: Record<DmgType, { label: string; color: number; cssColor: string }> = {
  phy: { label: '物理', color: 0xff4444, cssColor: '#ff4444' },
  mag: { label: '法术', color: 0x4dabf7, cssColor: '#4dabf7' },
  tru: { label: '真实', color: 0xffffff, cssColor: '#ffffff' },
  dot: { label: 'DoT',  color: 0xff6600, cssColor: '#ff6600' },
};

export type DmgBreakdown = Record<DmgType, number>;
const zeroBreakdown = (): DmgBreakdown => ({ phy: 0, mag: 0, tru: 0, dot: 0 });

export interface FighterStats {
  id: string;
  name: string;
  side: 'left' | 'right';
  isNeutral?: boolean;         // 中立生物 (_isNeutral/_isMasterTrainer): side 虽为左/右, 但不算玩家战绩 → 统计面板单独排除
  dmgDealt: number;            // 输出总伤 (含护盾消耗)
  dmgDealtByType: DmgBreakdown;
  dmgTaken: number;            // 承受总伤
  dmgTakenByType: DmgBreakdown;
  healDone: number;            // 治疗别人或自己
  healTaken: number;           // 被治疗
  shieldGained: number;        // 获得护盾总量
  kills: number;               // 击杀数
}

class BattleStatsTracker {
  // 按 fighter 对象引用 keying (不是 f.id): test 模式 6 假人都 id='basic', 玩家小龟也 'basic' →
  //   若按 id 会全挤进一条, 玩家"造成"与假人"承受"写进同一行 → 显示成小龟自己承伤 (用户报)。
  //   对象引用每只龟独立, 与 JS updateDmgStats 遍历 allFighters 一致。
  private bucket: Map<Fighter, FighterStats> = new Map();

  reset() { this.bucket.clear(); }

  /** 开战时预登记全体 fighter → 统计面板初始就能列出所有龟 (值为 0), 而非空白。
   *  对齐 JS updateDmgStats 遍历 allFighters (而非只列已记录的)。 */
  registerAll(fighters: Fighter[]) {
    for (const f of fighters) this.ensure(f);
  }

  private ensure(f: Fighter): FighterStats {
    let s = this.bucket.get(f);
    if (!s) {
      const fx = f as Fighter & { _isNeutral?: boolean; _isMasterTrainer?: boolean };
      s = {
        id: f.id, name: f.name, side: f.side,
        isNeutral: !!(fx._isNeutral || fx._isMasterTrainer),
        dmgDealt: 0, dmgDealtByType: zeroBreakdown(),
        dmgTaken: 0, dmgTakenByType: zeroBreakdown(),
        healDone: 0, healTaken: 0, shieldGained: 0, kills: 0,
      };
      this.bucket.set(f, s);
    }
    return s;
  }

  /** caster 对 target 造成 amount 伤害; dmgType 默认 phy (向后兼容)
   *  P17: emit 'damage:dealt' (JS stats_tracker.js:33 同款) — stats panel 订阅实时刷新
   */
  recordDamage(caster: Fighter | null, target: Fighter, amount: number, type: DmgType = 'phy') {
    if (amount <= 0) return;
    if (caster) {
      const cs = this.ensure(caster);
      cs.dmgDealt += amount;
      cs.dmgDealtByType[type] += amount;
      // P19 1:1 JS combat.js:205 — 累计到 fighter 对象 _dmgDealt (神罚 angelSmite 自动选"造成伤害最高"敌人读它;
      //   之前从不赋值 → 全员 0 平手 → 神罚随机选目标, 非最高伤害)。
      (caster as Fighter & { _dmgDealt?: number })._dmgDealt =
        ((caster as Fighter & { _dmgDealt?: number })._dmgDealt ?? 0) + amount;
    }
    const ts = this.ensure(target);
    ts.dmgTaken += amount;
    ts.dmgTakenByType[type] += amount;
    bus.emit('stats:updated', { kind: 'damage' });
  }

  /** caster 给 target 治疗 amount (实际回的) */
  recordHeal(caster: Fighter | null, target: Fighter, amount: number) {
    if (amount <= 0) return;
    if (caster) this.ensure(caster).healDone += amount;
    this.ensure(target).healTaken += amount;
    bus.emit('stats:updated', { kind: 'heal' });
  }

  /** target 获得 amount 护盾 */
  recordShield(target: Fighter, amount: number) {
    if (amount <= 0) return;
    this.ensure(target).shieldGained += amount;
    bus.emit('stats:updated', { kind: 'shield' });
  }

  /** caster 击杀 target */
  recordKill(caster: Fighter | null, target: Fighter) {
    if (caster) this.ensure(caster).kills += 1;
    // v0.9.5.A91: 触发 'fighter:died' bus 事件 (中立 KO reward 等订阅)
    bus.emit('fighter:died', { fighter: target, killer: caster });
  }

  /** 取所有记录, 用于面板 */
  all(): FighterStats[] {
    return [...this.bucket.values()];
  }

  /** 按 side 分 */
  bySide(side: 'left' | 'right'): FighterStats[] {
    return this.all().filter(s => s.side === side);
  }
}

export const battleStats = new BattleStatsTracker();
