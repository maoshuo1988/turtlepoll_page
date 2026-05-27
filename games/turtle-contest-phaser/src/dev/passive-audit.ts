// ══════════════════════════════════════════════════════════
// passive-audit.ts — DEV-only 内在被动 on-hit / 受击 触发验证台
// ══════════════════════════════════════════════════════════
// 对每只龟: 作为 attacker 打 dummy (触发 attacker 端被动), 再作为 target 被 dummy 打
// (触发 target 端被动). 抓状态变化 (电击层/结晶/怒气/泡泡/护盾/反伤 HP) + 崩溃.
import type Phaser from 'phaser';
import type { Fighter } from '../types';
import { createFighter } from '../engine/fighter';
import { triggerOnHitEffects } from '../engine/passive-triggers';
import { ALL_PETS } from '../data/pets';

/** P143 验证: 宝箱龟在真实 BattleScene.views 里造成伤害 → 财宝按伤害量累积 (走 bundled hook).
 *  必须用 bundled triggerOnHitEffects (本模块 import, 与 BattleScene 同实例) + chest 进 views. */
export function testChestTreasure(scene: Phaser.Scene): unknown {
  const bs = scene as unknown as { views: Array<{ fighter: Fighter }> };
  const lv = bs.views.find(x => x.fighter.side === 'left' && x.fighter.alive);
  const enemy = bs.views.find(x => x.fighter.side === 'right' && x.fighter.alive);
  if (!lv || !enemy) return { error: 'no views' };
  const chest = createFighter('chest', 'left') as Fighter & { _chestTreasure?: number; _chestTier?: number; _chestEquips?: unknown[] };
  chest._chestTreasure = 0; chest._chestTier = 0; chest._chestEquips = [];
  const origFighter = lv.fighter;
  lv.fighter = chest;   // chest 进 views, hook 能找到
  const before = chest._chestTreasure ?? 0;
  triggerOnHitEffects(chest, enemy.fighter, 100, {});
  triggerOnHitEffects(chest, enemy.fighter, 50, {});
  const after = chest._chestTreasure ?? 0;
  lv.fighter = origFighter;   // 还原
  return { before, after, expected: 150, tier: chest._chestTier, equipsDrawn: (chest._chestEquips ?? []).length };
}

interface PassiveResult {
  pet: string;
  passive: string;
  asAttacker: string;   // 攻击 dummy 后的可观察变化
  asTarget: string;     // 被 dummy 打后的可观察变化
  error?: string;
}

// 抓 fighter 上常见的被动累积字段 (变化的列出来)
const TRACK_FIELDS = [
  '_shockStacks', '_crystallize', '_bambooStacks', '_lavaRage', '_lavaRageReady',
  '_auraEnergy', 'bubbleStore', 'shield', 'hp', '_inkStacks', '_twoHeadResStacks',
  '_hunterKills', '_goldCoins', '_diamondCollideCount',
] as const;

function snapshot(f: Fighter): Record<string, number> {
  const out: Record<string, number> = {};
  const fa = f as Fighter & Record<string, unknown>;
  for (const k of TRACK_FIELDS) {
    const v = fa[k];
    if (typeof v === 'number') out[k] = v;
    else if (typeof v === 'boolean') out[k] = v ? 1 : 0;
  }
  out._buffCount = f.buffs?.length ?? 0;
  return out;
}

function diff(before: Record<string, number>, after: Record<string, number>): string {
  const parts: string[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    const d = (after[k] ?? 0) - (before[k] ?? 0);
    if (d !== 0) parts.push(`${k}${d > 0 ? '+' : ''}${d}`);
  }
  return parts.join(' ') || '(无变化)';
}

export function runPassiveAudit(): PassiveResult[] {
  const results: PassiveResult[] = [];
  for (const pet of ALL_PETS) {
    if (!pet.passive) continue;
    let asAttacker = '', asTarget = '', error: string | undefined;

    // ── attacker 端: pet 打一个无被动 dummy ──
    try {
      const atk = createFighter(pet.id, 'left') as Fighter;
      const dummy = createFighter('two_head', 'right') as Fighter;  // two_head 无强 on-hit, 干净靶
      dummy.passive = null;
      dummy.maxHp = 100000; dummy.hp = 100000; dummy.shield = 0; dummy.def = 0; dummy.mr = 0; dummy.buffs = [];
      const b = snapshot(atk), bt = snapshot(dummy);
      triggerOnHitEffects(atk, dummy, 100, {});
      asAttacker = `self:[${diff(b, snapshot(atk))}] tgt:[${diff(bt, snapshot(dummy))}]`;
    } catch (e) { error = `attacker: ${e instanceof Error ? e.message : String(e)}`; }

    // ── target 端: 无被动 dummy 打 pet ──
    try {
      const atk = createFighter('two_head', 'left') as Fighter;
      atk.passive = null;
      const tgt = createFighter(pet.id, 'right') as Fighter;
      tgt.hp = Math.round(tgt.maxHp * 0.4);  // 40% HP, 触发 lowHP 型被动
      const b = snapshot(tgt), ba = snapshot(atk);
      triggerOnHitEffects(atk, tgt, 100, {});
      asTarget = `self:[${diff(b, snapshot(tgt))}] atk:[${diff(ba, snapshot(atk))}]`;
    } catch (e) { error = (error ? error + ' | ' : '') + `target: ${e instanceof Error ? e.message : String(e)}`; }

    results.push({ pet: pet.id, passive: String(pet.passive.type), asAttacker, asTarget, error });
  }
  return results;
}
