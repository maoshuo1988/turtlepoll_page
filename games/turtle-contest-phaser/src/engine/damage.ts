// ══════════════════════════════════════════════════════════
// damage.ts — 旧版 pets.js / combat.js 伤害公式 TS 化
// 纯函数, 不接 DOM / Bus / 状态
// ══════════════════════════════════════════════════════════
import type { Fighter, DamageType } from '../types';
import { DEF_CONSTANT } from '../data/pets';

/** 物理: 有效护甲 = def×(1-armorPenPct) - armorPen */
export function calcEffArmor(atk: Fighter, tgt: Fighter): number {
  return tgt.def * (1 - (atk.armorPenPct || 0)) - (atk.armorPen || 0);
}

/** 魔法: 有效魔抗 */
export function calcEffMr(atk: Fighter, tgt: Fighter): number {
  return tgt.mr * (1 - (atk.magicPenPct || 0)) - (atk.magicPen || 0);
}

export function calcEffDef(atk: Fighter, tgt: Fighter, dmgType: DamageType): number {
  if (dmgType === 'magic') return calcEffMr(atk, tgt);
  if (dmgType === 'true') return 0;
  return calcEffArmor(atk, tgt);
}

/**
 * 减伤倍率: 正防御 = 减伤 (<1), 负防御 = 增伤 (>1, 上限 ~2)
 * mult = 1 - def/(def+K)  if def >= 0
 * mult = 1 + |def|/(|def|+K)  if def < 0
 */
export function calcDmgMult(effDef: number): number {
  if (effDef >= 0) return 1 - effDef / (effDef + DEF_CONSTANT);
  const absDef = Math.abs(effDef);
  return 1 + absDef / (absDef + DEF_CONSTANT);
}

/**
 * 完整伤害计算: 攻击者 + 目标 + 基础伤害 + 类型 → 最终伤害
 * 不暴击, 不应用; 用于预演 / UI 提示。
 */
export function calcDamage(atk: Fighter, tgt: Fighter, base: number, dmgType: DamageType): number {
  // P91 1:1 JS combat.js:33-34 + 168-169 — e_octo 暗袭章鱼爪
  //   攻击者带 _equipBackrowBonus + 目标在 back row → base 先 ×(1 + bonus%), 再走 armor
  //   之前 PoC 此字段被 apply() 设但 calcDamage 不读 → 死字段, 装备效果完全失效
  const aOcto = atk as Fighter & { _equipBackrowBonus?: number };
  if ((aOcto._equipBackrowBonus ?? 0) > 0 && tgt._position === 'back') {
    base = base * (1 + (aOcto._equipBackrowBonus ?? 0) / 100);
  }
  const effDef = calcEffDef(atk, tgt, dmgType);
  let final = base * calcDmgMult(effDef);
  // 协同: 刺杀 tier3 _synergyAssassinExecute — target <50%HP 时 +10% dmg
  if ((atk as Fighter & { _synergyAssassinExecute?: boolean })._synergyAssassinExecute
      && tgt.hp / tgt.maxHp < 0.5) {
    final *= 1.10;
  }
  // E3/2 (combat.js:148-151): bonusDmgAbove60 passive — target HP > 60% 时 +%dmg
  const atkPassive = atk.passive as { type?: string; pct?: number } | undefined;
  if (atkPassive?.type === 'bonusDmgAbove60' && tgt.hp / tgt.maxHp > 0.6) {
    final *= 1 + (atkPassive.pct ?? 0) / 100;
  }
  // E3/2 (combat.js:160-164): basicTurtle passive — target rarity → +% dmg map
  if (atkPassive?.type === 'basicTurtle') {
    const bonusMap = (atk.passive as { bonusMap?: Record<string, number> }).bonusMap;
    const bonusPct = bonusMap?.[tgt.rarity] ?? 0;
    if (bonusPct > 0) final *= 1 + bonusPct / 100;
  }
  // E3/2 (combat.js:172-176): fear buff — attacker 被恐惧 → 对该 source 的 phys/magic dmg -%
  if (dmgType !== 'true') {
    const fearBuff = atk.buffs.find(b => b.type === 'fear');
    if (fearBuff) final *= 1 - (fearBuff.value as number) / 100;
  }
  // E3/10 (combat.js:182-187): diamondStructure passive — flat reduction per hit
  // target 是钻石龟 + 物理/魔法 (不影响真伤)
  if (dmgType !== 'true' && tgt.passive?.type === 'diamondStructure') {
    const enhanced = (tgt as Fighter & { _diamondEnhanced?: boolean })._diamondEnhanced;
    const defPct = enhanced ? 20 : ((tgt.passive.flatReductionPct as number) ?? 20);
    const mrPct = enhanced ? 10 : 0;
    const flatReduce = Math.round(tgt.def * defPct / 100) + Math.round((tgt.mr ?? 0) * mrPct / 100);
    final = Math.max(1, final - flatReduce);
  }
  return Math.round(final);
}

/**
 * 暴击判定 (0–1 概率, 旧版 crit 字段就是这个范围)
 */
export function rollCrit(crit: number, rng: () => number = Math.random): boolean {
  return rng() < crit;
}

/**
 * 暴击伤害倍率 (P1.4 暴击溢出系统, 对齐旧版 combat.js)
 *
 * critDmg = 1.5 (基础) + extraCritDmgPerm (永久爆伤加成) + overflowCrit × overflowMult
 *
 * 其中 overflowCrit = max(0, crit - 1) — 暴击率 >100% 时多余部分转加伤
 * overflowMult 默认 1.5, 可由 passive 配置 (e.g. gambler 的 critOverflow)
 *
 * 例: crit=1.4, extraCritDmgPerm=0.2, overflowMult=1.5
 *  → critDmg = 1.5 + 0.2 + 0.4 × 1.5 = 2.3 (即暴击伤害 230%)
 */
export function calcCritMult(attacker: Fighter): number {
  const crit = attacker.crit || 0;
  // E3/27: 加 _extraCritDmg (临时爆伤, e.g. hunterShot execCritDmg) — JS combat.js:132 同款
  // JS: critMult = 1.5 + _extraCritDmg + _extraCritDmgPerm + overflowCritDmg
  const extraTemp = (attacker._extraCritDmg as number) || 0;
  const extraPerm = (attacker._extraCritDmgPerm as number) || 0;
  const buffCritDmg = (attacker as Fighter & { _buffCritDmg?: number })._buffCritDmg || 0;  // P154 chiWaveActive 爆伤
  const overflowCrit = Math.max(0, crit - 1);
  const overflowMult = (attacker.passive?.overflowMult as number) || 1.5;
  return 1.5 + extraTemp + extraPerm + buffCritDmg + overflowCrit * overflowMult;
}

/**
 * 应用伤害到目标 (改变 fighter 状态: hp / shield)
 *
 * v0.9.5.A74: physImmune / dmgReduce / undeadLock
 * v0.9.5.A78: 护盾顺序 bubble → aura → shield (JS combat.js:962-966)
 *   - 普通 dmg 走全护盾流程
 *   - pierce 跳过 shield (但 true 仍走)
 */
export function applyRawDamage(
  tgt: Fighter,
  finalDmg: number,
  dmgType: DamageType = 'physical',   // 修: 原 'phy'(非法 sentinel) 会让 physImmune(虚化)/physical dmgReduce 漏判普攻
  isPierce: boolean = false,
  /** P25 _skipLink: ink-link 转移内部调用时 true, 防循环 (JS combat.js:1042 同款) */
  _skipLink: boolean = false,
  /** 攻击方阵营 — 海葵母寄生护盾打穿归属用 (跨阵营才算"击杀"拿奖); 不传则按对面默认 */
  attackerSide?: 'left' | 'right',
): { hpLoss: number; shieldAbs: number; bubbleAbs?: number; auraAbs?: number; anemoneAbs?: number } {
  // 训龟大师等 _untargetable: 完全免伤 (登场 4 回合不会受到伤害)
  if ((tgt as Fighter & { _untargetable?: boolean })._untargetable) return { hpLoss: 0, shieldAbs: 0 };
  // P105c 小龟壳 (turtle-shell): 每次受非真伤 finalDmg -= _turtleShellBlock (默认 2)
  //   累计灰字: _turtleShellBlockedStat. 真伤不挡.
  const ts = tgt as Fighter & { _turtleShellBlock?: number; _turtleShellBlockedStat?: number };
  if (dmgType !== 'true' && (ts._turtleShellBlock ?? 0) > 0 && finalDmg > 0) {
    const blockAmt = Math.min(ts._turtleShellBlock ?? 0, finalDmg);
    finalDmg = Math.max(1, finalDmg - blockAmt);
    ts._turtleShellBlockedStat = (ts._turtleShellBlockedStat ?? 0) + blockAmt;
  }
  // v0.9.5.A93: 黑洞 (JS combat.js:872) — _isInBlackhole 标记的目标不受外部伤害
  const tt = tgt as Fighter & { _isInBlackhole?: boolean; _anemoneShield?: number };
  if (tt._isInBlackhole) return { hpLoss: 0, shieldAbs: 0 };

  // v0.9.5.A93: 海葵母寄生护盾 (JS combat.js:875-882) — 先扣 _anemoneShield
  let anemoneAbs = 0;
  if ((tt._anemoneShield ?? 0) > 0) {
    const before = tt._anemoneShield ?? 0;
    anemoneAbs = Math.min(before, finalDmg);
    tt._anemoneShield = before - anemoneAbs;
    // 记录打穿者阵营 (跨阵营才算"击杀"拿奖; processAnemoneParasite 结算时校验)
    if ((tt._anemoneShield ?? 0) <= 0) {
      (tt as Fighter & { _anemoneBrokenBy?: 'left' | 'right' | null })._anemoneBrokenBy = attackerSide ?? null;
    }
    finalDmg -= anemoneAbs;
    // C4: 把寄生护盾吸收量并进 shieldAbs 返回 → 所有 `shown=hpLoss+shieldAbs` 的飘字点
    //   都会显示打在海葵母寄生盾上的伤害数字 (此前 shown=0 被当闪避吞掉 → "啥都不显示")。
    if (finalDmg <= 0) return { hpLoss: 0, shieldAbs: anemoneAbs, anemoneAbs };
  }

  // v0.9.5.A74: physImmune 虚化 (默认 100% block; 配 physReducePct 部分减免)
  if (dmgType === 'physical') {
    const physBuff = tgt.buffs.find(b => b.type === 'physImmune');
    if (physBuff) {
      const reducePct = (physBuff.value as number) ?? 100;
      if (reducePct >= 100) return { hpLoss: 0, shieldAbs: 0 };
      finalDmg = Math.max(1, Math.round(finalDmg * (1 - reducePct / 100)));
    }
  }
  // dmgReduce buff (真伤跳过)
  if (dmgType !== 'true') {
    const drBuff = tgt.buffs.find(b => b.type === 'dmgReduce');
    if (drBuff && drBuff.value > 0) {
      finalDmg = Math.max(0, Math.round(finalDmg * (1 - drBuff.value / 100)));
    }
  }
  // crystalResonance: 水晶共鸣额外法术减伤 (JS combat.js:927-929)
  if (dmgType === 'magic' && tgt.passive?.type === 'crystalResonance') {
    const absorb = (tgt.passive.magicAbsorb as number) ?? 0;
    if (absorb > 0) finalDmg = Math.round(finalDmg * (1 - absorb / 100));
  }
  // undeadLockTurns: HP 不能 < 1 (combat.js:931)
  const lockTurns = (tgt as Fighter & { _undeadLockTurns?: number })._undeadLockTurns ?? 0;
  if (lockTurns > 0) {
    let rem = finalDmg, shAbs = 0;
    if (tgt.shield > 0) {
      shAbs = Math.min(tgt.shield, rem);
      tgt.shield -= shAbs;
      rem -= shAbs;
    }
    const before = tgt.hp;
    tgt.hp = Math.max(1, tgt.hp - rem);
    return { hpLoss: before - tgt.hp, shieldAbs: shAbs };
  }
  // v0.9.5.A78: 护盾顺序 bubble → aura → shield (JS combat.js:962-966)
  // true 伤害也走 shield (跟帮助"真伤被护盾吸收"对齐); 仅 isPierce 跳过 shield
  const goesThroughShield = dmgType === 'true' || !isPierce;
  let remaining = finalDmg;
  let bubbleAbs = 0, auraAbs = 0, shieldAbs = 0;
  const t = tgt as Fighter & { bubbleShieldVal?: number; _auraShield?: number };
  if (goesThroughShield) {
    if ((t.bubbleShieldVal ?? 0) > 0) {
      bubbleAbs = Math.min(t.bubbleShieldVal!, remaining);
      t.bubbleShieldVal! -= bubbleAbs;
      remaining -= bubbleAbs;
    }
    if ((t._auraShield ?? 0) > 0 && remaining > 0) {
      auraAbs = Math.min(t._auraShield!, remaining);
      t._auraShield! -= auraAbs;
      remaining -= auraAbs;
    }
    if (tgt.shield > 0 && remaining > 0) {
      shieldAbs = Math.min(tgt.shield, remaining);
      tgt.shield -= shieldAbs;
      remaining -= shieldAbs;
    }
  }
  const hpLoss = Math.min(tgt.hp, remaining);
  tgt.hp -= hpLoss;
  if (tgt.hp <= 0) {
    tgt.hp = 0;
    tgt.alive = false;
  }

  // E3/10 (combat.js:1021-1034): Hunter mark execution — HP 跌破 mark.value% 时秒杀
  if (tgt.alive && tgt.hp > 0) {
    const mark = tgt.buffs.find(b => b.type === 'hunterMark');
    if (mark && (tgt.hp / tgt.maxHp * 100) <= (mark.value as number)) {
      tgt.hp = 0;
      tgt.alive = false;
      // 标记一下让 caller 知道是 execute (后续可读 _executedByMark 加飘字 '🎯斩杀!')
      (tgt as Fighter & { _executedByMark?: boolean })._executedByMark = true;
    }
  }

  // P25: _inkLink 30% transfer 分流 (JS combat.js:1042-1053 1:1) —
  //   挂 _inkLink 的 target 受任何伤害后, 自动把 amount × transferPct% 分给 partner.
  //   dmgType 走 link.dmgType (默认 magic; 速写 lineRapid passive 时 'true').
  //   _skipLink=true 防递归 (transfer 内部调用自己时跳过).
  const linkRef = (tgt as Fighter & { _inkLink?: { partner: Fighter; turns: number; transferPct: number; dmgType?: 'magic' | 'true' } })._inkLink;
  const totalShown = hpLoss + shieldAbs + (bubbleAbs ?? 0) + (auraAbs ?? 0) + anemoneAbs;
  if (!_skipLink && linkRef && linkRef.partner && linkRef.partner.alive && totalShown > 0) {
    const transferAmt = Math.round(totalShown * linkRef.transferPct / 100);
    if (transferAmt > 0) {
      const linkType: 'magic' | 'true' = linkRef.dmgType ?? 'magic';
      // 走 applyRawDamage 递归, _skipLink=true 防 partner 再回弹给 target
      applyRawDamage(linkRef.partner, transferAmt, linkType, linkType === 'true', true);
    }
  }

  // C4: 寄生护盾吸收量并进 shieldAbs 一起显示 (见上方早返回注释)
  return { hpLoss, shieldAbs: shieldAbs + anemoneAbs, bubbleAbs, auraAbs, anemoneAbs };
}

/**
 * E3/10 (combat.js:1079-1097): Ink mark amplification
 *
 * 受墨标的 target 每次受伤后, 额外 dmg = original × stacks × 5%
 *   bonusType: 'magic' (默认) / 'true' (target 有 _inkRapidActive)
 *   magic 受 attacker mr 减免, true 不减
 *
 * 调用方: triggerOnHitEffects 在 applyRawDamage 之后调一次, 传 dmg(原始) +
 *         attacker + target. 返回 bonus dmg (caller 加飘字 + log)
 *
 * 防递归: 内部 applyRawDamage 调用不再触发 ink (caller 保证)
 */
export function applyInkBonus(attacker: Fighter, target: Fighter, originalAmount: number): { bonus: number; bonusType: 'magic' | 'true' } | null {
  if (!target?.alive || originalAmount <= 0) return null;
  const stacks = ((target as Fighter & { _inkStacks?: number })._inkStacks) ?? 0;
  if (stacks <= 0) return null;
  const bonusType: 'magic' | 'true' = (target as Fighter & { _inkRapidActive?: boolean })._inkRapidActive ? 'true' : 'magic';
  let bonus = Math.round(originalAmount * stacks * 0.05);
  if (bonus <= 0) return null;
  if (bonusType === 'magic') {
    const eMr = calcEffMr(attacker, target);
    bonus = Math.max(1, Math.round(bonus * calcDmgMult(eMr)));
  }
  // 应用 bonus 伤害 (true 通常 pierce, magic 走盾)
  applyRawDamage(target, bonus, bonusType, bonusType === 'true');
  return { bonus, bonusType };
}
