// ══════════════════════════════════════════════════════════
// stats-recalc.ts — Fighter atk/def/mr/crit 基于 buffs 重算
// JS engine.js recalcStats() 精简移植
// 每回合开始 + 每次 addBuff 时调
// ══════════════════════════════════════════════════════════
import type { Fighter, Buff } from '../types';

/** 重算 fighter 的 atk/def/mr/crit 基于其 baseAtk/baseDef/baseMr 和当前 buffs
 *  1:1 JS turn.js:1008-1060 _recalcOneFighter:
 *   - atk/def/mr 重置到 base; atkDown/defDown/mrDown 是百分比乘; **atkUp/defUp/mrUp 是绝对值加(flat)**
 *   - defUp/mrUp 受 diamondStructure defBuffAmp 放大 (需 allies 上下文)
 *  @param allies 同侧友军(含自己), 用于 diamond defAmp 跨队检测; 不传则 amp=1
 */
export function recalcStats(f: Fighter, allies?: Fighter[]): void {
  // 重置到 base (JS:1009-1012)
  f.atk = f.baseAtk;
  f.def = f.baseDef;
  f.mr  = f.baseMr ?? f.baseDef;

  // diamondStructure: 放大全队 def/mr buff (JS:1013-1021)
  let defAmp = 1;
  if (allies) {
    const diamond = allies.find(t => t.alive && t.passive && t.passive.type === 'diamondStructure');
    if (diamond) {
      const isSelf = f === diamond;
      const ampPct = (isSelf && (diamond as Fighter & { _diamondEnhanced?: boolean })._diamondEnhanced)
        ? 100 : ((diamond.passive!.defBuffAmp as number) ?? 50);
      defAmp = 1 + ampPct / 100;
    }
  }

  // chilled: ATK -20% (JS:1022-1025) — value 不读, 仅检 type 存在
  if (f.buffs.some(b => b.type === 'chilled')) f.atk = Math.round(f.atk * 0.8);

  let critAdd = 0;
  let armorPenAdd = 0;
  let lifestealAdd = 0;
  let critDmgAdd = 0;   // P154: chiWaveActive 爆伤加成 → calcCritMult 读 _buffCritDmg

  for (const b of f.buffs) {
    const bx = b as Buff & { critGain?: number; critDmgGain?: number; lifestealGain?: number; armorPenDelta?: number };
    switch (b.type) {
      // 百分比减 (乘) — JS:1028-1030
      case 'atkDown':     f.atk = Math.round(f.atk * (1 - b.value / 100)); break;
      case 'defDown':
      case 'armorBreak':  f.def = Math.round(f.def * (1 - b.value / 100)); break;
      case 'mrDown':      f.mr  = Math.round(f.mr  * (1 - b.value / 100)); break;
      // 绝对值加 (flat) — JS:1031-1033; defUp/mrUp 受 defAmp
      case 'defUp':       f.def += Math.round(b.value * defAmp); break;
      case 'mrUp':        f.mr  += Math.round(b.value * defAmp); break;
      case 'atkUp':       f.atk += b.value; break;
      // 暴击加成 (小数) — diceFateCrit (JS:1035) 与 critUp 同款加
      case 'diceFateCrit':
      case 'critUp':      critAdd += b.value / 100; break;
      case 'critDmgUp':   /* 已在 calcCritMult 通过 _extraCritDmg 处理, 这里跳过 */ break;
      case 'armorPen':    armorPenAdd += b.value; break;
      case 'lifesteal':   lifestealAdd += b.value / 100; break;
      // P154 1:1 JS basic.js — 龟派气波 单 buff 含 4 项加成 (暴击/爆伤/生命偷取/穿甲)
      case 'chiWaveActive':
        critAdd += (bx.critGain ?? 0) / 100;
        critDmgAdd += (bx.critDmgGain ?? 0) / 100;
        lifestealAdd += (bx.lifestealGain ?? 0) / 100;
        armorPenAdd += (bx.armorPenDelta ?? 0);
        break;
    }
  }
  f.atk = Math.max(0, f.atk);
  f.def = Math.max(0, f.def);
  f.mr  = Math.max(0, f.mr);
  f.crit = Math.max(0, (f._baseCrit as number ?? f.crit) + critAdd);
  // E3/27: armorPen buff 现在实际加到 fighter.armorPen (跟 atk/def 同款 base+buffs 模式)
  // 之前只存到 _buffArmorPen 没消费 → ninjaBackstab +5 穿甲毫无作用 (实测无效)
  const baseAp = (f as Fighter & { _baseArmorPen?: number })._baseArmorPen ?? f.armorPen ?? 0;
  f.armorPen = baseAp + armorPenAdd;
  (f as Fighter & { _buffArmorPen?: number })._buffArmorPen = armorPenAdd;
  (f as Fighter & { lifestealPct?: number }).lifestealPct =
    ((f as Fighter & { _baseLifesteal?: number })._baseLifesteal ?? 0) + lifestealAdd;
  // P154: chiWaveActive 爆伤加成存 _buffCritDmg, calcCritMult 读 (与 _extraCritDmg 相加)
  (f as Fighter & { _buffCritDmg?: number })._buffCritDmg = critDmgAdd;
  f._statsDirty = false;
}

/** 把当前 fighter.crit / armorPen 数值 snapshot 为 base, 之后 recalcStats 走 base */
export function snapshotBaseStats(f: Fighter): void {
  (f as Fighter & { _baseCrit?: number })._baseCrit = f.crit;
  (f as Fighter & { _baseLifesteal?: number })._baseLifesteal =
    (f as Fighter & { lifestealPct?: number }).lifestealPct ?? 0;
  // E3/27: armorPen base snapshot 跟 _baseCrit 同款 — recalcStats 走 base + buffs
  (f as Fighter & { _baseArmorPen?: number })._baseArmorPen = f.armorPen ?? 0;
}

/** 给所有 fighter 重算一次 (传同侧友军给 recalcStats 用于 diamond defAmp) */
export function recalcAllStats(fighters: Fighter[]): void {
  for (const f of fighters) recalcStats(f, fighters.filter(x => x.side === f.side));
}

/** turn 结束: 减少所有 buff duration, 移除到期的 */
export function tickBuffsDuration(f: Fighter): { expired: Buff[] } {
  const expired: Buff[] = [];
  for (const b of f.buffs) {
    b.duration--;
    if (b.duration <= 0) expired.push(b);
  }
  if (expired.length) f.buffs = f.buffs.filter(b => !expired.includes(b));
  return { expired };
}
