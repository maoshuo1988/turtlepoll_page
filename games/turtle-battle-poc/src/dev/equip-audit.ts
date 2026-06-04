// ══════════════════════════════════════════════════════════
// equip-audit.ts — DEV-only 装备 apply() + on-hit 效果验证台
// ══════════════════════════════════════════════════════════
// 验证: 每件装备 apply() 正确改属性 / on-hit 装备 (海藻短刃 bleed / 火珊瑚 burn /
//   电棍 stun) 命中后正确施加效果 + 层数.
import type { Fighter } from '../types';
import { createFighter, attachEquipment } from '../engine/fighter';
import { triggerOnHitEffects } from '../engine/passive-triggers';
import { applyRawDamage } from '../engine/damage';
import { EQUIP_POOL } from '../data/equipment';

interface EquipResult {
  id: string;
  name: string;
  category: string;
  deltas: string;        // atk/def/mr/maxHp/crit 变化
  flags: string;         // 设了哪些 _equip* 运行时字段
  error?: string;
}

const STAT_KEYS = ['atk', 'def', 'mr', 'maxHp', 'crit', 'baseAtk', 'baseDef', 'baseMr', 'armorPen', 'magicPen'] as const;

export function runEquipAudit(): { equips: EquipResult[]; bladeBleed: unknown; consumables?: unknown; dotTick?: unknown } {
  const equips: EquipResult[] = [];

  for (const eq of EQUIP_POOL) {
    const f = createFighter('basic', 'left') as Fighter & Record<string, unknown>;
    const before: Record<string, number> = {};
    for (const k of STAT_KEYS) before[k] = (f[k] as number) ?? 0;
    const flagsBefore = new Set(Object.keys(f).filter(k => k.startsWith('_equip')));
    let error: string | undefined;
    try {
      attachEquipment(f, eq);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    const deltas: string[] = [];
    for (const k of STAT_KEYS) {
      const d = ((f[k] as number) ?? 0) - before[k];
      if (d !== 0) deltas.push(`${k}${d > 0 ? '+' : ''}${d}`);
    }
    const flagsAfter = Object.keys(f).filter(k => k.startsWith('_equip') && !flagsBefore.has(k));
    equips.push({
      id: eq.id, name: eq.name ?? eq.id, category: eq.category,
      deltas: deltas.join(' ') || '(无属性变化)',
      flags: flagsAfter.join(',') || '-',
      error,
    });
  }

  // ── 海藻短刃 bladeBleed on-hit 专项 (用户举例) ──
  const atk = createFighter('basic', 'left') as Fighter & { _equipBladeBleed?: number };
  const eBlade = EQUIP_POOL.find(e => e.id === 'e_blade')!;
  attachEquipment(atk, eBlade);
  const dummy = createFighter('basic', 'right') as Fighter;
  dummy.maxHp = 100000; dummy.hp = 100000; dummy.baseDef = 0; dummy.def = 0;
  dummy.buffs = [];
  // 模拟命中 (dmg=100) → 触发 bladeBleed
  triggerOnHitEffects(atk, dummy, 100, {});
  const bleedBuff = dummy.buffs.find(b => b.type === 'bleed');
  const expectedStacks = Math.max(1, Math.round(atk.atk * 0.15 * (atk._equipBladeBleed ?? 0) / 4));
  const bladeBleed = {
    casterAtk: atk.atk,
    bladeBleedFlag: atk._equipBladeBleed,    // 应为 2 (装备给的流血回合)
    expectedStacks,                          // round(atk × 0.15 × 2 / 4)
    actualBleedValue: bleedBuff?.value ?? 0,
    bleedApplied: !!bleedBuff,
    match: bleedBuff?.value === expectedStacks,
  };

  // ── 消耗品作用于目标 (createFighter 受伤/有 CD, apply 后看 hp/shield/buff/cd 变化) ──
  const consumables = EQUIP_POOL.filter(e => e.category === 'consumable');
  const consumableResults = consumables.map(c => {
    const tgt = createFighter('lightning', c.id === 'c_bomb' ? 'right' : 'left') as Fighter;
    tgt.maxHp = 1000; tgt.hp = 500; tgt.shield = 0; tgt.buffs = [];
    // 给技能上 CD 以测 c_speed
    if (Array.isArray(tgt.skills)) tgt.skills.forEach(s => { s.cdLeft = 2; });
    const hpB = tgt.hp, shieldB = tgt.shield, buffsB = tgt.buffs.length;
    const cdB = tgt.skills?.[0]?.cdLeft ?? 0;
    let err: string | undefined;
    try { c.apply(tgt); } catch (e) { err = e instanceof Error ? e.message : String(e); }
    return {
      id: c.id, name: c.name,
      hpDelta: tgt.hp - hpB, shieldDelta: (tgt.shield ?? 0) - shieldB,
      buffsAdded: tgt.buffs.length - buffsB,
      cdDelta: (tgt.skills?.[0]?.cdLeft ?? 0) - cdB,
      effect: err ? `ERR:${err}` : '',
    };
  });

  // ── DOT tick 护盾吸收验证 (P139 修的核心): bleed 走 applyRawDamage 应过护盾 ──
  const dotTgt = createFighter('basic', 'right') as Fighter;
  dotTgt.maxHp = 1000; dotTgt.hp = 1000; dotTgt.shield = 30; dotTgt.def = 0; dotTgt.baseDef = 0;
  dotTgt.buffs = [];
  // bleed value 10 → applyRawDamage(physical) 应先吃 shield 30
  const r1 = applyRawDamage(dotTgt, 10, 'physical');
  const dotTick = {
    shieldBefore: 30, dmg: 10,
    shieldAbsorbed: r1.shieldAbs,   // 应 10 (全进护盾)
    hpLoss: r1.hpLoss,              // 应 0 (护盾够吸)
    shieldAfter: dotTgt.shield,     // 应 20
    note: 'bleed 10 vs 30盾 → 全吸收, HP 不掉 (P139 修前是直扣 HP)',
  };

  return { equips, bladeBleed, consumables: consumableResults, dotTick };
}
