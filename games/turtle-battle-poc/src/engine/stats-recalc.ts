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
      // 修(2026-05-30 二审): 原注释说"在 calcCritMult 经 _extraCritDmg 处理", 但 _extraCritDmg 只由
      //   特定 skill (如猎人 execCritDmg) 直接 set, **buff 类 critDmgUp 永不被读** → q_critdmg "+25%爆伤" 死 buff。
      //   归并入 critDmgAdd → 写 _buffCritDmg → calcCritMult 真消费。
      case 'critDmgUp':   critDmgAdd += b.value / 100; break;
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
  // 重击锤 e_hammer: ATK += 4% maxHp × 件数 (flat, 跟 atkUp 同档 — 装备永久加成)。
  //   修(2026-05-30 用户报"重击锤没正确施加攻击力"): 原只在 equipment onTurnBegin 设 atk=base+bonus,
  //   紧接着 startActorTurn 的 processTurnBeginPassives→recalcStats 把 atk 重置回 base+buffs(无 hammer 项) 抹掉了,
  //   且 onTurnBegin 那种写法还会覆盖 atkUp/atkDown。收口到 recalc 链: 任何 recalc 都带上, 与 buff 正确叠加。
  const hammerCount = (f as Fighter & { _equipHammer?: number })._equipHammer ?? 0;
  if (hammerCount > 0) f.atk += Math.round(f.maxHp * 0.04 * hammerCount);
  f.atk = Math.max(0, f.atk);
  f.def = Math.max(0, f.def);
  f.mr  = Math.max(0, f.mr);
  f.crit = Math.max(0, (f._baseCrit as number ?? f.crit) + critAdd);
  // E3/27: armorPen buff 现在实际加到 fighter.armorPen (跟 atk/def 同款 base+buffs 模式)
  // 之前只存到 _buffArmorPen 没消费 → ninjaBackstab +5 穿甲毫无作用 (实测无效)
  const baseAp = (f as Fighter & { _baseArmorPen?: number })._baseArmorPen ?? f.armorPen ?? 0;
  f.armorPen = baseAp + armorPenAdd;
  (f as Fighter & { _buffArmorPen?: number })._buffArmorPen = armorPenAdd;
  // P1(20260528): 把永久/装备类生命偷取 _lifestealPct(百分点) 折进通用 lifestealPct(小数)。
  //   原本 _lifestealPct 只有海星(e_star)消费 → 命运之轮♣/猎杀/王冠/FPGA/b_vamp/嗜血药剂全是死的。
  //   收口到这唯一来源后, passive-triggers 通用 on-hit 吸血即可统一消费 (e_star onHit 去重)。
  (f as Fighter & { lifestealPct?: number }).lifestealPct =
    ((f as Fighter & { _baseLifesteal?: number })._baseLifesteal ?? 0) + lifestealAdd
    + ((f as Fighter & { _lifestealPct?: number })._lifestealPct ?? 0) / 100;
  // P154: chiWaveActive 爆伤加成存 _buffCritDmg, calcCritMult 读 (与 _extraCritDmg 相加)
  (f as Fighter & { _buffCritDmg?: number })._buffCritDmg = critDmgAdd;
  f._statsDirty = false;
}

/** 把当前 fighter.crit / armorPen 数值 snapshot 为 base, 之后 recalcStats 走 base */
export function snapshotBaseStats(f: Fighter): void {
  (f as Fighter & { _baseCrit?: number })._baseCrit = f.crit;
  // P1(20260528): _baseLifesteal 排除 _lifestealPct 折入部分 (recalc 每次会再加一遍), 防双计。
  (f as Fighter & { _baseLifesteal?: number })._baseLifesteal =
    ((f as Fighter & { lifestealPct?: number }).lifestealPct ?? 0)
    - ((f as Fighter & { _lifestealPct?: number })._lifestealPct ?? 0) / 100;
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
