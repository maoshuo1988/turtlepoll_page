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
// 闪电劈下 VFX 对外封装 (技能 handler 如涌动的即时电击也要劈下特效)
export function fireLightningVfx(target: Fighter): void {
  _lightningVfxHook?.(target);
}
// 线条龟 连笔 连线 VFX 钩子 — 在两个被连敌人之间画一道墨线 (BattleScene 接)
let _lineConnectVfxHook: ((a: Fighter, b: Fighter) => void) | null = null;
export function setLineConnectVfxHook(fn: ((a: Fighter, b: Fighter) => void) | null): void {
  _lineConnectVfxHook = fn;
}
export function fireLineConnectVfx(a: Fighter, b: Fighter): void {
  _lineConnectVfxHook?.(a, b);
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

/** 叠 1 层结晶并在满层引爆 — crystalResonance 被动命中 + 水晶球魔法光线 共用同一逻辑。
 *  crystalTurtle: 提供 crystallize* 参数 (满层数/引爆%HP/魔抗削减) + 伤害归属 + effMr 计算源。
 *  水晶球与本体共享 target._crystallize 同一计数, 球的光线命中也能把层数推到满并引爆。
 *  返回 true 表示本次触发了引爆。 */
export function applyCrystallizeStack(crystalTurtle: Fighter, target: Fighter, ctx: OnHitContext = {}): boolean {
  if (!target.alive) return false;
  const p = crystalTurtle.passive;
  const max = (p?.crystallizeMax as number) ?? 4;
  const cur = (target._crystallize as number) ?? 0;
  const next = cur + 1;
  if (next < max) { target._crystallize = next; return false; }
  // 满层引爆
  target._crystallize = 0;
  const hpPct = (p?.crystallizeHpPct as number) ?? 19;
  const detonate = Math.round(target.maxHp * hpPct / 100);
  const finalDmg = Math.max(1, Math.round(detonate * calcDmgMult(calcEffMr(crystalTurtle, target))));
  const wasAlive = target.alive;
  const r = applyRawDamage(target, finalDmg, 'magic');
  const s = r.hpLoss + r.shieldAbs;
  battleStats.recordDamage(crystalTurtle, target, s, 'mag');
  if (wasAlive && !target.alive) battleStats.recordKill(crystalTurtle, target);
  // JS combat.js:605/618 "Ornn脆"风格: 引爆伤害不单独飘字, 暂存 _pendingCrystalBoom, 由触发引爆的那一击
  //   (crystalSpike/crystalBurst/水晶球射线)合并进自己的魔法数字一起跳 (用户: 引爆和触发伤害算在一起)。
  (target as Fighter & { _pendingCrystalBoom?: number })._pendingCrystalBoom =
    ((target as Fighter & { _pendingCrystalBoom?: number })._pendingCrystalBoom ?? 0) + s;
  _crystalDetonateVfxHook?.(target);   // 紫爆特效 (视觉反馈)
  ctx.log?.(`💎 ${target.name} 结晶引爆! -${s}`);
  const mrDown = (p?.crystallizeMrDown as number) ?? 20;
  const mrTurns = (p?.crystallizeMrTurns as number) ?? 3;
  const existing = target.buffs.find(b => b.type === 'mrDown');
  if (existing) {
    existing.value = Math.max(existing.value, mrDown);
    existing.duration = Math.max(existing.duration ?? 0, mrTurns + 1);
  } else {
    target.buffs.push({ type: 'mrDown', value: mrDown, duration: mrTurns + 1 });
  }
  return true;
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
    // 反伤用 counter-dmg(不在 HIT_CLASSES) → 攻击者不播受击动画/不震 (用户: 反伤不触发受伤动画)。
    ctx.floatNum?.(attacker, `${s}`, '#ffd93d', 'counter-dmg');
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
  const las = attacker as Fighter & { _lightningStaffCharges?: number[]; _castIsAoe?: boolean };
  if (Array.isArray(las._lightningStaffCharges) && las._lightningStaffCharges.length > 0 && attacker.alive && _staffChargeHook) {
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

  // ── 3. auraAwaken 储能 —— 已搬到 applyRawDamage 中心扣血点 (damage.ts) ──
  //   target-side 受伤累积, 移到中心点后 DoT/爆裂 也能积储能 (对齐 JS 总线)。此处删除避免标准命中双计。

  // ── 4. crystalResonance — attacker crystal turtle 叠 target crystallize 层 (满层引爆, 与水晶球共享) ──
  //   D2: 去掉每次命中飘的"💎N/max 结晶叠层文字"(逐击刷屏) — 层数在详情面板可见。
  if (attacker.passive?.type === 'crystalResonance' && target.alive) {
    applyCrystallizeStack(attacker, target, ctx);
  }

  // ── 5. 目标反伤 (石头龟 stoneWall / 反伤buff / 气场反伤) — 主命中此处结算 (见 applyTargetReflect) ──
  applyTargetReflect(attacker, target, dmg, ctx);

  // ── 5b. twoHeadResilience 受击叠 def+mr —— 已搬到 applyRawDamage 中心扣血点 (damage.ts) ──
  //   target-side 受击累积, 移到中心点后 DoT/爆裂/真伤 也叠甲抗 (对齐 JS bus)。原 +1甲+1抗 飘字去掉,
  //   层数走面板 _twoHeadResStacks 徽章(liveSig 刷新)。此处删除避免标准命中双计。

  // ── 5c. 磐石之躯 岩层: 每次受击 +1 层 (cap 30) — 每层 1% 减伤 (applyRawDamage) + 2% 体型 (BattleScene 视觉) ──
  //   仅装备 rockShockwave 的石头龟 (_hasRockArmor 门控)。dmg>0 才算"受到攻击" (反伤/DoT 不经此函数)。
  const rk = target as Fighter & { _hasRockArmor?: boolean; _rockLayers?: number };
  if (rk._hasRockArmor && dmg > 0) {
    const cap = 30;
    const cur = rk._rockLayers ?? 0;
    if (cur < cap) {
      rk._rockLayers = cur + 1;   // 无浮字 (用户: 不要岩层浮字; 层数走面板状态 + 体型反馈)
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
  // lavaRage 受伤端怒气(target-side) —— 已搬到 applyRawDamage 中心扣血点 (damage.ts), 让 DoT/爆裂也积怒。
  //   ↑ 上面的攻击端(attacker dmg 累积)留在此处: applyRawDamage 不知 attacker, 无法搬。

  // ── 6c. bubbleStore 受伤累积泡泡 ──
  //   已搬到 applyRawDamage 中心扣血点 (damage.ts), 与 JS passive_subscribers.js 总线一致 —
  //   这样 DoT/爆裂/反弹/真伤 等不走 on-hit 链的伤害也能累积。此处删除避免标准命中双重计数。

  // #8 M4: 删除重复的 twoHeadResilience 实现 (旧 6d 用 _resilienceDefGain) —
  //   它从不初始化故是死代码, 且若触发会与上面 5b(_twoHeadResStacks) 双叠 +1甲抗。
  //   真实叠层用 5b 的 _twoHeadResStacks; 面板 token resilienceDef/Mr 已改读该字段 (skill-text.ts)。

  // ── 6e. 协同 §2 SYNERGY effects (JS synergies.js) ──
  // _synergyPhysBleed (物理 tier3): attacker 攻击附加 1 回合流血 (8% ATK)
  if ((attacker as Fighter & { _synergyPhysBleed?: boolean })._synergyPhysBleed && target.alive && dmg > 0) {
    const bleedAmt = Math.max(1, Math.round(attacker.atk * 0.08));
    // G4: 旧 push 'dotBleed' 类型, tickDoTs 不认 → 永不结算。改 'bleed' 层数模型 (JS combat.js:558)
    applyDotStacks(target, 'bleed', bleedAmt, 999);
    // 用户: 造成流血时不跳"🩸流血"文字/图标 (流血每回合伤害数字仍照常跳)
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
        // 用户 2026-05-29: 不再在被泡泡束缚目标头上飘 "-N" (每段攻击都飘很吵);
        //   护甲/魔抗下降已在目标详情面板实时体现 (defDown 红字)。
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
  const t = target as Fighter & { _lavaShieldTurns?: number; _lavaShieldCounter?: number; _lavaShieldVal?: number };
  // 持盾才反击: 改判熔岩盾池 _lavaShieldVal>0 (盾改为特殊限时池, 不再用 target.shield)
  if ((t._lavaShieldTurns ?? 0) > 0 && (t._lavaShieldCounter ?? 0) > 0
      && (t._lavaShieldVal ?? 0) > 0 && attacker.alive) {
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
    ctx.floatNum?.(attacker, `-${shown}`, '#ffd93d', 'counter-dmg');
    if (!attacker.alive) battleStats.recordKill(target, attacker);
    // 雷盾描述: 反击同时给攻击者叠 1 层电击 (之前漏实装 → 用户"雷盾啥都没用/叠什么了")。
    //   仅闪电龟雷盾来源 (counter buff 目前只有 lightningShield 用); 层数走攻击者状态栏徽章可见。
    else if (target.passive?.type === 'lightningStorm') {
      const atk2 = attacker as Fighter & { _shockStacks?: number };
      atk2._shockStacks = (atk2._shockStacks ?? 0) + 1;
    }
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
      // P79 JS combat.js:703 — cls='pierce-dmg', delayMs=300; 用户: 真伤裸数字, 去 ⚡emoji
      ctx.floatNum?.(target, `${shown}`, '#ffffff', 'pierce-dmg', 300, 0);
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
    // 用户: 造成流血时不跳流血标签 (海藻短刃流血)
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
      // duration:2 = "眩晕1回合"约定 (turn-begin tickBuffsDuration 先 -1 到 1, 留给眩晕检查跳过该回合)。
      //   原 duration:1 会在检查前被 tick 掉到 0 移除 → 冰封水母眩晕从不生效 (与其余 6 处 stun 一致改 2)。
      target.buffs.push({ type: 'stun', value: 1, duration: 2 });
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
      // 多重追打飘字: 用 delayMs 按链次错开(150/300/450…) → 一段段跳出, 不再一堆数字叠一起 (用户)。
      //   (triggerOnHitEffects 同步, 伤害瞬时结算; 仅飘字延时呈现节奏)
      ctx.floatNum?.(target, `${shown}`, isC ? '#ffd93d' : '#ff4444', isC ? 'crit-dmg' : 'direct-dmg', safety * 150, 0);
      chance *= 0.8;  // JS combat.js:823 递减
    }
  }

  // ── 6w. Hunter mark execution 飘字 (JS combat.js:1032) ──
  // applyRawDamage 已秒杀, 这里只是飘字 + log
  const exec = (target as Fighter & { _executedByMark?: boolean })._executedByMark;
  if (exec) {
    (target as Fighter & { _executedByMark?: boolean })._executedByMark = false;
    // JS combat.js:1032 同款: 'crit-label' 金色上飘 (之前没传 cls → #ffd700 被推断成 passive-num 绿色)
    ctx.floatNum?.(target, `🎯斩杀!`, '#ffd700', 'crit-label');
    ctx.log?.(`🎯 ${target.name} 猎杀印记触发!`);
  }

  // ── 7. 通用 lifesteal (attacker 有 lifestealPct) ──
  // P1(20260528): lifestealPct 现已折入永久/装备 _lifestealPct (recalc 统一来源), 通用消费即可。
  const lifesteal = (attacker as Fighter & { lifestealPct?: number }).lifestealPct;
  if (lifesteal && lifesteal > 0 && dmg > 0 && attacker.alive) {
    const heal = Math.round(dmg * lifesteal);
    const before = attacker.hp;
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
    const actual = attacker.hp - before;
    // 海星(e_star): 溢出治疗按 _equipStarOverflow% 转护盾 (原 equipment-runtime e_star.onHit 的活, 收口到此防双吸)
    const starPct = (attacker as Fighter & { _equipStarOverflow?: number })._equipStarOverflow;
    if (starPct && heal > actual) {
      attacker.shield = (attacker.shield ?? 0) + Math.round((heal - actual) * starPct / 100);
    }
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
