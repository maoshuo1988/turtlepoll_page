// ══════════════════════════════════════════════════════════
// passive-triggers.ts — 被动 on-hit / on-damage-taken / on-turn 触发器
// JS combat.js:triggerOnHitEffects 精简移植
// 调用时机: 任何 fighter 命中或受击, 调 triggerOnHitEffects()
// ══════════════════════════════════════════════════════════
import type { Fighter } from '../types';
import { applyRawDamage, calcDmgMult, calcEffArmor, calcEffMr, calcEffDef, applyInkBonus } from './damage';
import { battleStats } from '../systems/battle-stats';
import { ruleModifiers } from './rule-effects';
import { sfxTrap } from '../systems/sfx-synth';
import { applyDotStacks as applyDotLayer } from './dot';

// 雷电法杖充能 hook — BattleScene 注入 (需 scene 才能即时画连锁闪电 VFX + 更新实时层数 UI)。
//   每次携带者主动伤害命中时调一次 (attacker, 本次施法是否 AOE)。
let _staffChargeHook: ((attacker: Fighter, isAoe: boolean) => void) | null = null;
export function setStaffChargeHook(fn: ((attacker: Fighter, isAoe: boolean) => void) | null): void {
  _staffChargeHook = fn;
}

// P78: 闪电 VFX 钩子. BattleScene.create() 注册一次; 避免给所有 ctx 加字段.
//   JS combat.js:693-705 闪电龟 8-stack 引爆 → spawnLightningStrike(target.el)
let _lightningVfxHook: ((target: Fighter) => void) | null = null;
export function setLightningVfxHook(fn: ((target: Fighter) => void) | null): void {
  _lightningVfxHook = fn;
}
// K2: 结晶引爆 VFX 钩子 (BattleScene 接 spawnCrystalDetonate) — 引擎层无 scene, 靠钩子画特效
let _crystalDetonateVfxHook: ((target: Fighter) => void) | null = null;
export function setCrystalDetonateVfxHook(fn: ((target: Fighter) => void) | null): void {
  _crystalDetonateVfxHook = fn;
}
export function fireCrystalDetonateVfx(target: Fighter): void {
  _crystalDetonateVfxHook?.(target);
}

// P143 宝箱龟财宝累积 hook — BattleScene 注入 processChestTreasureGain.
//   用模块级 hook (非 ctx) 因为技能 handler 调 triggerOnHitEffects 只传 floatNum,
//   宝箱龟伤害主要来自技能, 必须所有路径都能累积财宝 (JS bus damage:dealt 全局订阅同理).
let _chestTreasureHook: ((attacker: Fighter, amount: number) => void) | null = null;
export function setChestTreasureHook(fn: ((attacker: Fighter, amount: number) => void) | null): void {
  _chestTreasureHook = fn;
}

/**
 * 应用 DoT 层 (JS combat.js applyDotStacks 对齐):
 * 同 type buff 已存在则累加 value + 取最大 duration; 否则新 push
 */
function applyDotStacks(target: Fighter, type: 'bleed' | 'burn' | 'poison' | 'curse', value: number, duration: number) {
  // F4: burn/poison/bleed 走层数模型 (累加 + duration:999 + 衰减, 不被 tickBuffsDuration 截断);
  //   curse 仍是老式真伤 DoT (按 duration turns-- 无衰减)。
  if (type === 'curse') {
    const existing = target.buffs.find(b => b.type === type);
    if (existing) {
      existing.value += value;
      existing.duration = Math.max(existing.duration, duration);
    } else {
      target.buffs.push({ type, value, duration });
    }
  } else {
    applyDotLayer(target, type, value);
  }
}

export interface OnHitContext {
  /** 视觉飘字回调.
   *  P79: 可选 cls/delayMs/yOffset, 跟 BattleApi.floatNum 一致 (JS spawnFloatingNum 1:1) */
  floatNum?: (target: Fighter, text: string, color: string, cls?: string, delayMs?: number, yOffset?: number) => void;
  /** 日志回调 */
  log?: (text: string) => void;
  /** 同阵营队友查询 (用于协同效果, e.g. 刺杀击杀 +ATK 全队) */
  getTeammates?: (side: 'left' | 'right') => Fighter[];
  /** 对面阵营查询 (用于 splash equipment — 随机另一只敌人) */
  getEnemies?: (side: 'left' | 'right') => Fighter[];
  /** crit 标记 (judgement 飘字 crit-magic 用) */
  isCrit?: boolean;
  /** crit 倍率 (judgement 加成用, JS combat.js:249) */
  critMult?: number;
  /** 当前技能 AOE flag (splash 限单体) */
  skillAoe?: boolean;
  /** P108b 孵化器进度累加 callback (BattleScene 注入, 处理升级+飘字) */
  incubatorAdd?: (target: Fighter, delta: number) => void;
  /** 实际掉血 (不含护盾吸收) — shell 储能 / lava 怒气 用 hpLoss(JS), 不传则回退 dmg */
  hpLoss?: number;
}

/** 命中后触发器: 在伤害已 applyRawDamage 之后调
 *  attacker = 攻击者, target = 被击者, dmg = 已确认的实际伤害 (hpLoss + shieldAbs)
 */
/** 目标反伤 (石头龟 stoneWall + 反伤buff + 气场反伤) — 按"目标受到的 dmg"反弹给攻击者。
 *  抽出供 主命中 + 审判额外伤害 复用 (用户: 审判也要吃反伤)。反伤经 applyRawDamage 打攻击者,
 *  不走命中链 → 不会递归。多个反伤来源叠加 (与原 3 段行为一致)。 */
function applyTargetReflect(attacker: Fighter, target: Fighter, dmg: number, ctx: OnHitContext): void {
  if (dmg <= 0) return;
  const doReflect = (raw: number) => {
    if (raw <= 0 || !attacker.alive) return;
    const final = Math.max(1, Math.round(raw * calcDmgMult(calcEffArmor(target, attacker))));
    const wasAlive = attacker.alive;
    const r = applyRawDamage(attacker, final);
    const s = r.hpLoss + r.shieldAbs;
    battleStats.recordDamage(target, attacker, s, 'phy');
    if (wasAlive && !attacker.alive) battleStats.recordKill(target, attacker);
    ctx.floatNum?.(attacker, `${s}`, '#ff4444', 'direct-dmg');   // 反伤=物理红, 无符号
  };
  // stoneWall (JS combat.js:646-659): pct = base + perDef×def + perMr×mr
  if (target.passive?.type === 'stoneWall' && attacker.alive) {
    const base = (target.passive.reflectBase as number) ?? 5;
    const perDef = (target.passive.reflectPerDef as number) ?? 1;
    const perMr = (target.passive.reflectPerMr as number) ?? 0.5;
    const pct = base + perDef * target.def + perMr * (target.mr || target.def);
    doReflect(Math.round(dmg * pct / 100));
  }
  // reflect buff (hidingReflect, JS combat.js:660-673): value = 百分比
  const rb = target.buffs.find(b => b.type === 'reflect');
  if (rb) doReflect(Math.round(dmg * (rb.value as number) / 100));
  // 气场反伤 (auraAwaken, JS combat.js:732-744): _auraReflect = 小数比例
  const ta = target as Fighter & { _auraReflect?: number };
  if ((ta._auraReflect ?? 0) > 0 && target.alive) doReflect(Math.round(dmg * (ta._auraReflect ?? 0)));
}

export function triggerOnHitEffects(
  attacker: Fighter,
  target: Fighter,
  dmg: number,
  ctx: OnHitContext = {},
): void {
  if (!target || !attacker || dmg <= 0) return;
  // 死人不触发 (但 attacker 可以已死, e.g. 联动反击)
  if (!target.alive && (target.hp ?? 0) <= 0) {
    // 目标已死, 仍然让 attacker 端的"on kill"型生效, 不让 target 端被动触发
  }

  // ── 雷电法杖: 携带者每段主动伤害 → 交给 scene hook 即时处理 (充能/实时层数UI/满100立刻连锁闪电) ──
  //   只在 triggerOnHitEffects 链路触发 = 仅主动技能/普攻 (DoT/反伤走 applyRawDamage 不经此)。
  //   连锁闪电自身用 applyRawDamage 直打, 不回流本函数 → 不自充能/不递归。
  const las = attacker as Fighter & { _lightningStaffCharge?: number; _castIsAoe?: boolean };
  if (typeof las._lightningStaffCharge === 'number' && attacker.alive && _staffChargeHook) {
    _staffChargeHook(attacker, !!las._castIsAoe);
  }

  // ── 1. shieldOnHit (target 被打时 +固定盾, 每回合一次) ──
  if (target.passive?.type === 'shieldOnHit' && !target._shieldOnHitUsedTurn) {
    const amt = (target.passive.amount as number) ?? Math.round(target.maxHp * 0.05);
    target.shield = (target.shield || 0) + amt;
    target._shieldOnHitUsedTurn = true;
    ctx.floatNum?.(target, `+${amt}🛡`, '#c0c0c0');
  }

  // ── 2. twoHeadVitality — HP 跌破 50% 一次性回护盾 ──
  if (target.passive?.type === 'twoHeadVitality' && !target._twoHeadHalfTriggered
      && target.alive && target.hp / target.maxHp < 0.5) {
    target._twoHeadHalfTriggered = true;
    const pct = (target.passive.shieldPct as number) ?? 20;
    const s = Math.round(target.maxHp * pct / 100);
    target.shield += s;
    ctx.floatNum?.(target, `+${s}🛡`, '#c77dff');
  }

  // ── 3. auraAwaken 储能 (target 是 shell, 受伤累积 _auraEnergy) ──
  //   JS passive_subscribers.js:77 用 hpLoss only (打盾不积攒储能)
  if (target.passive?.type === 'auraAwaken' && target.passive.energyStore) {
    const cur = (target._auraEnergy as number) ?? 0;
    const cap = Math.round(target.maxHp * ((target.passive.energyMaxStorePct as number) ?? 0.5));
    target._auraEnergy = Math.min(cap, cur + (ctx.hpLoss ?? dmg));
  }

  // ── 4. crystalResonance — attacker crystal turtle 叠 target crystallize 层 ──
  if (attacker.passive?.type === 'crystalResonance' && target.alive) {
    const max = (attacker.passive.crystallizeMax as number) ?? 4;
    const cur = (target._crystallize as number) ?? 0;
    const next = cur + 1;
    if (next >= max) {
      target._crystallize = 0;
      const hpPct = (attacker.passive.crystallizeHpPct as number) ?? 19;
      const detonate = Math.round(target.maxHp * hpPct / 100);
      const finalDmg = Math.max(1, Math.round(detonate * calcDmgMult(calcEffMr(attacker, target))));
      const wasAlive = target.alive;
      // P88 1:1 JS combat.js:612 — applyRawDmg('magic'), 之前默认 'phy'
      const r = applyRawDamage(target, finalDmg, 'magic');
      const s = r.hpLoss + r.shieldAbs;
      battleStats.recordDamage(attacker, target, s, 'mag');
      if (wasAlive && !target.alive) battleStats.recordKill(attacker, target);
      ctx.floatNum?.(target, `-${s}💎`, '#c77dff');   // D2: 去"引爆"文字, 留💎+数字
      _crystalDetonateVfxHook?.(target);   // K2: 紫色径向爆 + 震屏
      ctx.log?.(`💎 ${target.name} 结晶引爆! -${s}`);
      // P88 1:1 JS combat.js:615-617 — MR shred max-merge with existing (PoC 之前直接 push 会叠)
      const mrDown = (attacker.passive.crystallizeMrDown as number) ?? 20;
      const mrTurns = (attacker.passive.crystallizeMrTurns as number) ?? 3;
      const existing = target.buffs.find(b => b.type === 'mrDown');
      if (existing) {
        existing.value = Math.max(existing.value, mrDown);
        existing.duration = Math.max(existing.duration ?? 0, mrTurns + 1);
      } else {
        target.buffs.push({ type: 'mrDown', value: mrDown, duration: mrTurns + 1 });
      }
    } else {
      target._crystallize = next;
      // D2: 去掉每次命中飘的"💎N/max 结晶叠层文字"(逐击刷屏) — 层数在详情面板可见。
    }
  }

  // ── 5. 目标反伤 (石头龟 stoneWall / 反伤buff / 气场反伤) — 主命中此处结算 (见 applyTargetReflect) ──
  applyTargetReflect(attacker, target, dmg, ctx);

  // ── 5b. twoHeadResilience 受击叠 def+mr (cap 20) — JS pets.js:251-253 ──
  if ((target as Fighter & { _twoHeadResilience?: boolean })._twoHeadResilience) {
    const tr = target as Fighter & {
      _twoHeadResStacks?: number;
    };
    const stacks = tr._twoHeadResStacks ?? 0;
    if (stacks < 20) {
      tr._twoHeadResStacks = stacks + 1;
      target.baseDef += 1;
      target.def += 1;
      target.baseMr = (target.baseMr ?? target.def) + 1;
      target.mr += 1;
      ctx.floatNum?.(target, `+1甲+1抗`, '#7dffb3');
    }
  }

  // ── 6. bambooCharged 受击叠层 (target 满层时下次攻击额外) — 简化为 buff ──
  if (target.passive?.type === 'bambooCharged') {
    const cur = (target._bambooStacks as number) ?? 0;
    const max = (target.passive.maxStacks as number) ?? 5;
    target._bambooStacks = Math.min(max, cur + 1);
  }

  // ── 6b. lavaRage 怒气累积 (JS systems/passive_subscribers.js:45,60 对齐) ──
  //   attacker 端: 攻击伤害 amount × rageDmgPct% (25%) 累积怒气
  //   target 端: 受到 HP 损失 × rageTakenPct% (20%) 累积怒气 (打盾不积)
  //   触发条件: 怒气 >= rageMax (100) 时设 _lavaRageReady (turn 开始处理变身)
  // ── 6b-pre. chestTreasure 财宝累积 (JS passive_subscribers.js:28-33 1:1) ──
  //   宝箱龟造成伤害时财宝 += 伤害量 (排除反弹, triggerOnHitEffects 本不为反弹调用).
  //   累积+阈值抽装备由 BattleScene.processChestTreasureGain 处理 (模块 hook 注入).
  if (attacker.passive?.type === 'chestTreasure' && dmg > 0) {
    _chestTreasureHook?.(attacker, dmg);
  }

  if (attacker.passive?.type === 'lavaRage' && !attacker._lavaSpent && !attacker._lavaTransformed && dmg > 0) {
    const pct = (attacker.passive.rageDmgPct as number) ?? 25;
    const max = (attacker.passive.rageMax as number) ?? 100;
    const cur = (attacker._lavaRage as number) ?? 0;
    const next = Math.min(max, cur + Math.round(dmg * pct / 100));
    attacker._lavaRage = next;
    if (next >= max) attacker._lavaRageReady = true;
  }
  if (target.passive?.type === 'lavaRage' && !target._lavaSpent && !target._lavaTransformed) {
    // JS passive_subscribers.js:62 用 hpLoss only (打盾不积攒怒气), 不传则回退 dmg
    const pct = (target.passive.rageTakenPct as number) ?? 20;
    const max = (target.passive.rageMax as number) ?? 100;
    const cur = (target._lavaRage as number) ?? 0;
    const next = Math.min(max, cur + Math.round((ctx.hpLoss ?? dmg) * pct / 100));
    target._lavaRage = next;
    if (next >= max) target._lavaRageReady = true;
  }

  // ── 6c. bubbleStore 受伤累积泡泡 (JS passive_subscribers.js:90 用 hpLoss: 打盾不积攒) ──
  if (target.passive?.type === 'bubbleStore' && target.alive && dmg > 0) {
    const pct = (target.passive.pct as number) ?? 30;
    const stored = Math.round((ctx.hpLoss ?? dmg) * pct / 100);   // G8: hpLoss only
    const cap = target.maxHp;
    const before = (target.bubbleStore as number) ?? 0;
    target.bubbleStore = Math.min(cap, before + stored);
  }

  // ── 6d. twoHeadResilience 受伤累积 +1甲+1抗 (上限 20) ──
  if ((target as Fighter & { _resilienceDefGain?: number })._resilienceDefGain !== undefined
      && target.alive && dmg > 0) {
    const g = (target as Fighter & { _resilienceDefGain?: number })._resilienceDefGain!;
    if (g < 20) {
      (target as Fighter & { _resilienceDefGain?: number })._resilienceDefGain = g + 1;
      target.baseDef += 1; target.def += 1;
      const mg = (target as Fighter & { _resilienceMrGain?: number })._resilienceMrGain ?? 0;
      if (mg < 20) {
        (target as Fighter & { _resilienceMrGain?: number })._resilienceMrGain = mg + 1;
        target.baseMr = (target.baseMr ?? target.def) + 1;
        target.mr += 1;
      }
    }
  }

  // ── 6e. 协同 §2 SYNERGY effects (JS synergies.js) ──
  // _synergyPhysBleed (物理 tier3): attacker 攻击附加 1 回合流血 (8% ATK)
  if ((attacker as Fighter & { _synergyPhysBleed?: boolean })._synergyPhysBleed && target.alive && dmg > 0) {
    const bleedAmt = Math.max(1, Math.round(attacker.atk * 0.08));
    // G4: 旧 push 'dotBleed' 类型, tickDoTs 不认 → 永不结算。改 'bleed' 层数模型 (JS combat.js:558)
    applyDotStacks(target, 'bleed', bleedAmt, 999);
    ctx.floatNum?.(target, `🩸流血`, '#ff5050');
  }
  // _synergyAssassinKillBonus (刺杀 tier2+3): attacker 击杀 → 全队 +5% ATK 永久
  if ((attacker as Fighter & { _synergyAssassinKillBonus?: boolean })._synergyAssassinKillBonus
      && target.alive === false && (target.hp ?? 0) <= 0) {
    const teammates = ctx.getTeammates?.(attacker.side) ?? [];
    for (const f of teammates) {
      if (!f.alive) continue;
      f.baseAtk = Math.round(f.baseAtk * 1.05);
      f.atk = f.baseAtk;
    }
    if (teammates.length > 0) ctx.log?.(`🗡 刺杀协同: 全队 +5% ATK`);
  }
  // _synergyRegenReviveBonus 处理在 revive 路径 (BattleScene)
  // _synergyGuardAmp / _synergyElemDmgBoost / _synergyAssassinExecute 需 damage 流改造, 单独实现

  // ═══════════════════════════════════════════════════════
  // E3/9: JS combat.js:551-796 triggerOnHitEffects 漏点真移植
  // 之前 Phaser 只 6 项, JS 22 项, 这里补 14 项
  // ═══════════════════════════════════════════════════════

  // ── 6f. bubbleBind 每段 -DEF/MR (JS combat.js:583-598) ──
  const bindBuff = target.buffs.find(b => b.type === 'bubbleBind');
  if (bindBuff && target.alive && dmg > 0) {
    const perHit = (bindBuff as { perHitLoss?: number }).perHitLoss ?? 0;
    if (perHit > 0) {
      const cap = (bindBuff as { lossCap?: number }).lossCap ?? 30;
      const used = (bindBuff as { lossUsed?: number }).lossUsed ?? 0;
      const loss = Math.min(perHit, cap - used);
      if (loss > 0) {
        target.baseDef -= loss; target.def -= loss;
        target.baseMr -= loss; target.mr -= loss;
        (bindBuff as { lossUsed?: number }).lossUsed = used + loss;
        ctx.floatNum?.(target, `-${loss}`, '#ff9f43');
      }
    }
  }

  // ── 6g. trap buff 反伤 (JS combat.js:634-645) ──
  const trapB = target.buffs.find(b => b.type === 'trap');
  if (trapB && attacker.alive) {
    const trapVal = (trapB.value as number) ?? 0;
    const tDmg = Math.max(1, Math.round(trapVal * calcDmgMult(attacker.def)));
    const r = applyRawDamage(attacker, tDmg, 'physical');
    const shown = r.hpLoss + r.shieldAbs;
    battleStats.recordDamage(target, attacker, shown, 'phy');
    ctx.floatNum?.(attacker, `-${shown}`, '#ffd700');
    sfxTrap();  // E3/20: JS combat.js:642 sfxTrap()
    if (!attacker.alive) battleStats.recordKill(target, attacker);
    // 消耗 trap buff
    target.buffs = target.buffs.filter(b => b !== trapB);
  }

  // ── 6h. reflect buff / 气场反伤 已并入 applyTargetReflect (见上方 section 5) ──

  // ── 6i. lavaShield counter (JS combat.js:676-683) ──
  // 火焰盾持续期间 + 有 shield 才反击
  const t = target as Fighter & { _lavaShieldTurns?: number; _lavaShieldCounter?: number };
  if ((t._lavaShieldTurns ?? 0) > 0 && (t._lavaShieldCounter ?? 0) > 0
      && (target.shield ?? 0) > 0 && attacker.alive) {
    const cDmg = Math.round(target.atk * (t._lavaShieldCounter ?? 0));
    const r = applyRawDamage(attacker, cDmg, 'magic');
    const shown = r.hpLoss + r.shieldAbs;
    battleStats.recordDamage(target, attacker, shown, 'mag');
    ctx.floatNum?.(attacker, `-${shown}🔥`, '#ff6600');
    if (!attacker.alive) battleStats.recordKill(target, attacker);
  }

  // ── 6j. counter buff (lightningShield style, JS combat.js:685-692) ──
  // 仅在 target 有 shield 时生效
  const counterBuff = target.buffs.find(b => b.type === 'counter');
  if (counterBuff && (target.shield ?? 0) > 0 && attacker.alive && dmg > 0) {
    const cDmg = counterBuff.value as number;
    const r = applyRawDamage(attacker, cDmg, 'magic');
    const shown = r.hpLoss + r.shieldAbs;
    battleStats.recordDamage(target, attacker, shown, 'mag');
    ctx.floatNum?.(attacker, `-${shown}`, '#ffd93d');
    if (!attacker.alive) battleStats.recordKill(target, attacker);
  }

  // ── 6k. lightningStorm shock stacks (JS combat.js:693-705) ──
  // attacker 是闪电龟 → target 叠 _shockStacks, 满层引爆真伤 + 闪电劈下 VFX
  if (attacker.passive?.type === 'lightningStorm' && target.alive) {
    const targ = target as Fighter & { _shockStacks?: number };
    targ._shockStacks = (targ._shockStacks ?? 0) + 1;
    const stackMax = (attacker.passive.stackMax as number) ?? 5;
    if ((targ._shockStacks ?? 0) >= stackMax) {
      const shockScale = (attacker.passive.shockScale as number) ?? 1.0;
      // P114 涌动 buff: _lightningSurgeTurns > 0 时 真伤 ×(1 + boost%)
      const surgeA = attacker as Fighter & { _lightningSurgeTurns?: number; _lightningShockBoostPct?: number };
      const surgeBoost = ((surgeA._lightningSurgeTurns ?? 0) > 0) ? (1 + (surgeA._lightningShockBoostPct ?? 50) / 100) : 1;
      const sDmg = Math.round(attacker.atk * shockScale * surgeBoost);
      // P78: 闪电劈下 VFX (引爆前, 同 JS combat.js:698 spawnLightningStrike)
      _lightningVfxHook?.(target);
      const r = applyRawDamage(target, sDmg, 'true');
      const shown = r.hpLoss + r.shieldAbs;
      targ._shockStacks = 0;
      battleStats.recordDamage(attacker, target, shown, 'tru');
      // P79 1:1 JS combat.js:703 — cls='pierce-dmg', delayMs=300
      ctx.floatNum?.(target, `⚡${shown}`, '#ffd93d', 'pierce-dmg', 300, 0);
    }
  }

  // ── 6l. auraAwaken lifesteal (JS combat.js:721-731) ──
  // 龟壳觉醒后生命偷取 (额外, 非通用 lifestealPct)
  const a = attacker as Fighter & { _auraLifesteal?: number; _auraReflect?: number };
  if ((a._auraLifesteal ?? 0) > 0 && attacker.alive && dmg > 0) {
    const auraHeal = Math.round(dmg * (a._auraLifesteal ?? 0));
    const before = attacker.hp;
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + auraHeal);
    const actual = attacker.hp - before;
    if (actual > 0) {
      battleStats.recordHeal(attacker, attacker, actual);
      // JS combat.js:728 — 气场生命偷取飘字 plain `+N` passive-num (无 "❤气场" 文字)
      ctx.floatNum?.(attacker, `+${actual}`, '#06d6a0', 'heal-num', 350, 0);
    }
  }

  // ── 6m. 气场反伤已并入 applyTargetReflect (见 section 5) ──

  // P108b 孵化器: 造伤/承伤 ×0.1 进度. 通过 ctx.incubatorProgress callback 上推
  //   (passive-triggers 不直接访问 BattleScene, BattleScene 在 ctx 里注入).
  if (dmg > 0) {
    const inc = 0.1 * dmg;
    const ai = attacker as Fighter & { _incubatorProgress?: number };
    if (typeof ai._incubatorProgress === 'number') ctx.incubatorAdd?.(attacker, inc);
    const ti = target as Fighter & { _incubatorProgress?: number };
    if (typeof ti._incubatorProgress === 'number') ctx.incubatorAdd?.(target, inc);
  }

  // ── 6n. bladeBleed 海藻短刃 装备 (JS combat.js:745-750) ──
  // 命中后施加 atk×0.15 × bladeCount/4 层 bleed (新层数模型)
  const ae = attacker as Fighter & { _equipBladeBleed?: number };
  if ((ae._equipBladeBleed ?? 0) > 0 && target.alive && dmg > 0) {
    const stacks = Math.max(1, Math.round(attacker.atk * 0.15 * (ae._equipBladeBleed ?? 0) / 4));
    applyDotStacks(target, 'bleed', stacks, 2);
    ctx.floatNum?.(target, `🩸+${stacks}`, '#ff5050');
  }

  // ── 6o. 火珊瑚 equipBurn (JS combat.js:751-756) ──
  // 施法对目标 per-cast 仅施加 1 次 20 层灼烧 (用 _equipFireStackedThisCast flag)
  const aeb = attacker as Fighter & { _equipBurn?: boolean };
  const teb = target as Fighter & { _equipFireStackedThisCast?: boolean };
  if (aeb._equipBurn && target.alive && !teb._equipFireStackedThisCast) {
    teb._equipFireStackedThisCast = true;
    applyDotStacks(target, 'burn', 20, 3);
    // P115b 累计灰字 stat: 火珊瑚施加灼烧层数
    (attacker as Fighter & { _fireCoralStacksStat?: number })._fireCoralStacksStat =
      ((attacker as Fighter & { _fireCoralStacksStat?: number })._fireCoralStacksStat ?? 0) + 20;
    ctx.floatNum?.(target, `🔥+20`, '#ff6600');
  }

  // ── 6p. equipStun chance (JS combat.js:757-764) ──
  const aes = attacker as Fighter & { _equipStun?: number };
  if ((aes._equipStun ?? 0) > 0 && target.alive && Math.random() < (aes._equipStun ?? 0) / 100) {
    if (!target.buffs.find(b => b.type === 'stun')) {
      target.buffs.push({ type: 'stun', value: 1, duration: 1 });
      (target as Fighter & { _stunUsed?: boolean })._stunUsed = false;
      // P115b 累计灰字 stat: 冰冻水母触发眩晕次数
      (attacker as Fighter & { _jellyStunStat?: number })._jellyStunStat =
        ((attacker as Fighter & { _jellyStunStat?: number })._jellyStunStat ?? 0) + 1;
      ctx.floatNum?.(target, `❄️眩晕!`, '#fbbf24');
    }
  }

  // ── 6q. equipMultiHit chance (JS combat.js:765-774) ──
  // proc 0.5×ATK 物理 bounce
  const aem = attacker as Fighter & { _equipMultiHit?: number };
  if ((aem._equipMultiHit ?? 0) > 0 && target.alive && Math.random() < (aem._equipMultiHit ?? 0) / 100) {
    const extraDmg = Math.round(attacker.atk * 0.5);
    const finalDmg = Math.max(1, Math.round(extraDmg * calcDmgMult(calcEffDef(attacker, target, 'physical'))));
    const r = applyRawDamage(target, finalDmg, 'physical');
    const shown = r.hpLoss + r.shieldAbs;
    battleStats.recordDamage(attacker, target, shown, 'phy');
    ctx.floatNum?.(target, `-${shown}🐙`, '#ff4444');
  }

  // ── 6r. equipReflect (JS combat.js:775-787) ──
  const ter = target as Fighter & { _equipReflect?: number };
  if ((ter._equipReflect ?? 0) > 0 && target.alive && attacker.alive && dmg > 0) {
    let reflDmg = Math.round(dmg * (ter._equipReflect ?? 0) / 100);
    if (reflDmg > 0) {
      reflDmg = Math.max(1, Math.round(reflDmg * calcDmgMult(calcEffArmor(target, attacker))));
      const r = applyRawDamage(attacker, reflDmg, 'physical');
      const shown = r.hpLoss + r.shieldAbs;
      battleStats.recordDamage(target, attacker, shown, 'phy');
      ctx.floatNum?.(attacker, `${shown}`, '#ff4444', 'direct-dmg');   // 反伤=物理, 红色无符号
      if (!attacker.alive) battleStats.recordKill(target, attacker);
    }
  }

  // ── 6s. fireRuleBurn (烈焰之日, JS combat.js:788-795) ──
  // 规则 'fire' 时, 施法对每个目标 per-cast 1 次 25 层灼烧
  const tfr = target as Fighter & { _fireRuleStackedThisCast?: boolean };
  if (ruleModifiers.burnMult() > 1 && target.alive && !tfr._fireRuleStackedThisCast) {
    tfr._fireRuleStackedThisCast = true;
    applyDotStacks(target, 'burn', 25, 3);
    ctx.floatNum?.(target, `🔥规则+25`, '#ff6600');
  }

  // ── 6t. judgement passive (JS combat.js:243-261) ──
  // attacker 是审判龟 → 命中后额外 magic dmg = target.hp × hpPct
  if (attacker.passive?.type === 'judgement' && target.alive) {
    const judgePct = ((attacker.passive.hpPct as number) ?? 0) / 100;
    const judgeRaw = Math.round(target.hp * judgePct);
    if (judgeRaw > 0) {
      const effMr = calcEffMr(attacker, target);
      // 用户: 审判不吃暴击 — 恒定目标当前生命 11% (仅经魔抗减免), 不乘暴击倍率。
      const judgeReduced = Math.max(1, Math.round(judgeRaw * calcDmgMult(effMr)));
      const r = applyRawDamage(target, judgeReduced, 'magic');
      const shown = r.hpLoss + r.shieldAbs;
      battleStats.recordDamage(attacker, target, shown, 'mag');
      // 审判=魔法伤害, 始终普通蓝色 (不暴击 → 不放大, 免得看着像暴击); 无符号
      ctx.floatNum?.(target, `${shown}`, '#4dabf7', 'magic-dmg');
      // 用户: 审判也要吃目标反伤 (石头龟等) — 按审判实际造成的伤害再反一次 (与主命中同源 helper)。
      applyTargetReflect(attacker, target, shown, ctx);
      // BORK 式: 审判这下额外伤害也吸血 (与主命中通用吸血同源 attacker.lifestealPct)。
      //   直接扣血式回血, 不走 on-hit/applyHeal → 不会递归触发审判或其它 on-hit (与下方通用吸血同款手法)。
      const judgeLs = (attacker as Fighter & { lifestealPct?: number }).lifestealPct;
      if (judgeLs && judgeLs > 0 && shown > 0 && attacker.alive) {
        const before = attacker.hp;
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + Math.round(shown * judgeLs));
        const healed = attacker.hp - before;
        if (healed > 0) {
          battleStats.recordHeal(attacker, attacker, healed);
          ctx.floatNum?.(attacker, `+${healed}`, '#06d6a0', 'heal-num', 300, 0);
        }
      }
    }
  }

  // ── 6u. 潮汐涟漪 splash equipment (JS combat.js:268-280) ──
  // 单体技能 30% 伤害随机泼到另一只敌人 (skill.aoe 时不触发)
  const splashPct = ((attacker as Fighter & { _equipSplash?: number })._equipSplash) ?? 0;
  if (splashPct > 0 && !ctx.skillAoe && ctx.getEnemies) {
    const enemies = ctx.getEnemies(attacker.side).filter(e => e !== target && e.alive);
    if (enemies.length > 0) {
      const splashTarget = enemies[Math.floor(Math.random() * enemies.length)];
      const splashAmt = Math.max(1, Math.round(dmg * splashPct / 100));
      const r = applyRawDamage(splashTarget, splashAmt, 'physical');
      const shown = r.hpLoss + r.shieldAbs;
      battleStats.recordDamage(attacker, splashTarget, shown, 'phy');
      ctx.floatNum?.(splashTarget, `-${shown}`, ctx.isCrit ? '#ffdd33' : '#58d3ff');
    }
  }

  // ── 6v. Ink mark amplification (JS combat.js:1079-1097) ──
  // target 受墨标 → 额外 dmg = original × stacks × 5%
  const inkResult = applyInkBonus(attacker, target, dmg);
  if (inkResult) {
    battleStats.recordDamage(attacker, target, inkResult.bonus, inkResult.bonusType === 'true' ? 'tru' : 'mag');
    const cls = inkResult.bonusType === 'true' ? '#ffffff' : '#4cc9f0';
    ctx.floatNum?.(target, `-${inkResult.bonus}`, cls);
  }

  // ── 6w0. counterAttack passive (JS combat.js:328-338) ──
  // target 被打后 pct% 概率反击 attacker, baseAtk×0.5 物理
  if (target.alive && target.passive?.type === 'counterAttack' && attacker.alive) {
    const counterPct = (target.passive.pct as number) ?? 0;
    if (Math.random() < counterPct / 100) {
      const counterDmg = Math.round(target.baseAtk * 0.5);
      // JS 直接扣 hp (没走 applyRawDamage), 这里保留 1:1
      attacker.hp = Math.max(0, attacker.hp - counterDmg);
      battleStats.recordDamage(target, attacker, counterDmg, 'phy');
      ctx.floatNum?.(attacker, `-${counterDmg}`, '#ffaa33');
      ctx.log?.(`⚡ ${target.name} 反击! 对 ${attacker.name} 造成 ${counterDmg} 物理`);
      if (attacker.hp <= 0) {
        attacker.alive = false;
        battleStats.recordKill(target, attacker);
      }
    }
  }

  // ── 6w1. gambler 连击 tryGamblerMultiHit (JS combat.js:799-825) ──
  // attacker 是 gamblerMultiHit 龟 → 概率追打, chance *= 0.8 递减
  // 注意: skill-handlers.ts:340 之前实现是 buff 版本 (单次), 这是正确的 passive 版本 (循环)
  if (attacker.passive?.type === 'gamblerMultiHit' && target.alive && attacker.alive) {
    const baseChance = (attacker.passive.chance as number) ?? 0;
    const multiBonus = ((attacker as Fighter & { _multiBonus?: number })._multiBonus) ?? 0;
    let chance = baseChance + multiBonus;
    const dmgScale = (attacker.passive.dmgScale as number) ?? 0.5;
    let safety = 0;
    while (target.alive && attacker.alive && Math.random() * 100 < chance && safety++ < 10) {
      const extraDmg = Math.round(attacker.atk * dmgScale);
      const eFinal = Math.max(1, Math.round(extraDmg * calcDmgMult(calcEffArmor(attacker, target))));
      // crit roll (跟 JS calcCrit 一致, 简化用 calcCritMult)
      const isC = Math.random() < (attacker.crit ?? 0);
      const critM = isC ? 1.5 : 1;
      const critFinal = Math.max(1, Math.round(eFinal * critM));
      const r = applyRawDamage(target, critFinal, 'physical');
      const shown = r.hpLoss + r.shieldAbs;
      battleStats.recordDamage(attacker, target, shown, 'phy');
      ctx.floatNum?.(target, `-${shown}🎰${isC ? '!' : ''}`, isC ? '#ffd93d' : '#ff4444');
      chance *= 0.8;  // JS combat.js:823 递减
    }
  }

  // ── 6w. Hunter mark execution 飘字 (JS combat.js:1032) ──
  // applyRawDamage 已秒杀, 这里只是飘字 + log
  const exec = (target as Fighter & { _executedByMark?: boolean })._executedByMark;
  if (exec) {
    (target as Fighter & { _executedByMark?: boolean })._executedByMark = false;
    ctx.floatNum?.(target, `🎯斩杀!`, '#ffd700');
    ctx.log?.(`🎯 ${target.name} 猎杀印记触发!`);
  }

  // ── 7. 通用 lifesteal (attacker 有 lifestealPct) ──
  const lifesteal = (attacker as Fighter & { lifestealPct?: number }).lifestealPct;
  if (lifesteal && lifesteal > 0 && dmg > 0 && attacker.alive) {
    const heal = Math.round(dmg * lifesteal);
    const before = attacker.hp;
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
    const actual = attacker.hp - before;
    if (actual > 0) {
      battleStats.recordHeal(attacker, attacker, actual);
      // JS combat.js:714 — 通用生命偷取飘字 plain `+N` passive-num (无 "❤吸" 文字)
      ctx.floatNum?.(attacker, `+${actual}`, '#06d6a0', 'heal-num', 300, 0);
    }
  }
}

/** 每回合开始清理 per-turn 标记 (shieldOnHit 等) */
export function resetPerTurnFlags(f: Fighter): void {
  f._shieldOnHitUsedTurn = false;
}

/**
 * 每次施法开始清理 per-cast 标记 (JS action.js:471)
 * fire-rule burn / equipBurn 火珊瑚 都用 per-cast 模型 (每施法每目标 1 次 burn)
 * 应在 executeAttack 顶部对所有 fighter 调一次
 */
export function resetPerCastFlags(allFighters: Fighter[]): void {
  for (const f of allFighters) {
    if (!f) continue;
    (f as Fighter & { _fireRuleStackedThisCast?: boolean })._fireRuleStackedThisCast = false;
    (f as Fighter & { _equipFireStackedThisCast?: boolean })._equipFireStackedThisCast = false;
  }
}
