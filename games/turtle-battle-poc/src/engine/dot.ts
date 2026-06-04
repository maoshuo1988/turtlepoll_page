// ══════════════════════════════════════════════════════════
// dot.ts — 灼烧/中毒/流血 层数模型施加 (1:1 JS combat.js:376-396 applyDotStacks)
// 层数模型: b.value = 层数, 无"持续 N 回合"概念 —— 用 duration:999 占位,
//   实际寿命由 tickDoTs 每 tick 衰减(burn 1/3, poison/bleed 1/4)归 0 后移除。
//   多次施加 → 累加层数到已有同类 buff。
// (之前 PoC 各处直接 push duration:3/4/5 → 被 tickBuffsDuration 提前截断, DoT 偏短)
// ══════════════════════════════════════════════════════════
import type { Fighter } from '../types';

const DOT_SENTINEL_DURATION = 999;

/** 累加 type(burn/poison/bleed) 层数到 target。burn 检免疫。 */
export function applyDotStacks(
  target: Fighter,
  type: 'burn' | 'poison' | 'bleed',
  stacks: number,
): void {
  if (!target || !target.alive || !(stacks > 0)) return;
  if (type === 'burn') {
    const t = target as Fighter & { _burnImmune?: boolean };
    const passiveImmune = !!(target.passive && (target.passive as { burnImmune?: boolean }).burnImmune);
    if (passiveImmune || t._burnImmune) return;
  }
  const existing = target.buffs.find(b => b.type === type);
  if (existing) {
    existing.value += stacks;
    existing.duration = DOT_SENTINEL_DURATION;
  } else {
    target.buffs.push({ type, value: stacks, duration: DOT_SENTINEL_DURATION });
  }
}

/** 灼烧默认层数 = max(1, round(attacker.atk × 0.67)) (JS combat.js:412) */
export function defaultBurnStacks(attacker: Fighter): number {
  return Math.max(1, Math.round(attacker.atk * 0.67));
}
