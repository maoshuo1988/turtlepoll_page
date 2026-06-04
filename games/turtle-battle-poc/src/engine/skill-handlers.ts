// ══════════════════════════════════════════════════════════
// skill-handlers.ts — 技能效果派发表
// 旧版 skills/*.js 30 文件的精简移植: 10+ 代表性技能 handler
// 走 SKILL_HANDLERS[skill.type], 没注册的 fallback 到 physical
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';  // P31: value import 需要 (Phaser.Textures.FilterMode.NEAREST)
import type { Fighter, SkillDef } from '../types';
import { calcDamage, applyRawDamage, rollCrit, calcCritMult, calcEffArmor, calcEffMr, calcDmgMult } from './damage';
import { adjacentFighters, fighterBehind, frontSlotEmpty, sameRowFighters, sameColumnFighters } from './slot-helpers';
import { triggerOnHitEffects, fireCrystalDetonateVfx, fireLightningVfx, fireLineConnectVfx } from './passive-triggers';
import { fireHunterArrow, makeRainbowSnake } from '../vfx/skills';

// v0.9.5.A53: 模块级 api holder 让 dealPhysical/dealMagic 能拿到 floatNum / log
// BattleScene 在 runSkillHandler 前 setSkillApi(api), 用后 setSkillApi(null)
let _skillApi: BattleApi | null = null;
export function setSkillApi(api: BattleApi | null): void { _skillApi = api; }

// 缩头「指挥」: 让随从立即额外行动一次 (JS hiding.js doHidingCommand 内 await summonAutoAction)。
//   summonAutoAction 是 BattleScene 私有方法 → 用 hook 注入, hidingCommand await 它 (正确时序)。
//   之前 hidingCommand 只 emit 'hiding-command' 而无人监听 → 指挥完全无效 (随从不额外出手)。
let _hidingCommandHook: ((summon: Fighter) => Promise<void>) | null = null;
export function setHidingCommandHook(fn: ((summon: Fighter) => Promise<void>) | null): void { _hidingCommandHook = fn; }

// P137+: audit 模式 — sleep() 瞬时返回 (跳过动画延迟), 让技能验证台秒级跑完
let _auditMode = false;
export function setAuditMode(on: boolean): void { _auditMode = on; }
function getSkillApi(): BattleApi | null { return _skillApi; }
import { ruleModifiers } from './rule-effects';
import { battleStats } from '../systems/battle-stats';
import { applyShiftSynergy } from '../data/synergies';
import { PET_BY_ID } from '../data/pets';
import { recalcStats } from './stats-recalc';
import { applyDotStacks, defaultBurnStacks } from './dot';
// E3/22: SFX synth — JS audio.js 函数 1:1
import { sfxBuff, sfxCoin, sfxBambooCharge, sfxBambooHit } from '../systems/sfx-synth';

export interface BattleApi {
  scene: Phaser.Scene;
  allFighters: Fighter[];
  /** 飘字: 在 fighter 上方显示
   *  E3/24: 第 4 参数 explicitCls 可显式指定 FloatCls
   *  E3/31: 第 5/6 参数 delayMs/yOffset — JS spawnFloatingNum(elId, text, cls, delayMs, yOffset) 1:1
   */
  floatNum(target: Fighter, text: string, color: string, explicitCls?: string, delayMs?: number, yOffset?: number): void;
  /** 找视图坐标 + sprite (供高级 skill VFX 使用) */
  viewOf(f: Fighter): { x: number; y: number; homeX: number; homeY: number; sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite } | null;
  /** 起手缩放脉冲: 任何想改 caster sprite scale 的"蓄力"动画必须走这里 (不许裸 scene.tweens.add scale)。
   *  内部用**真** view + SkillTweenMgr: 以 homeScaleX/Y 为基准做 home→home×factor→home 的 yoyo,
   *  onComplete 强制还原 home scale/rotation; restoreXY:false 不动位置 (保住走位/跳跃 hold)。
   *  修"龟派气波/能量大炮 体型突变+位置闪现"根因 (裸 tween 用当前 scale 作基准 + 绕过 mgr → watchTick 归位打架)。 */
  pulseScale?(f: Fighter, factor: number, duration: number, ease?: string): void;
  /** E3/18: 击飞动画 (JS playKnockupAnimation) — turtleShieldBash/ninjaImpact 用 */
  knockup?(target: Fighter): void;
  /** P163: 某侧阵型 6 格几何中心 (含空位) — 过肩摔把目标抛到敌方阵型正中心 */
  formationCenter?(side: 'left' | 'right'): { x: number; y: number };
  /** P191: 任意槽位中心坐标 (含空位, 从布局表算) — 气波"固定后排终点"用 (波速恒定, 与敌人死活无关 1:1 JS) */
  slotCoords?(side: 'left' | 'right', slotKey: string): { x: number; y: number };
  /** 击至前排: 改 _slotKey 后把视图 0.4s 平移到新槽位坐标 (JS bamboo.js:197-214) */
  repositionFighter?(f: Fighter): void;
  /** 受击击退 (JS sceneKnockback): 目标远离攻击者 18px + 抬 3px, 0.35s ease-out */
  hitKnockback?(target: Fighter, attackerSide: 'left' | 'right'): void;
  /** 在**真** view 上设 _inHop (viewOf 返回的是副本, 设不到真 view) — 自驱位移技能
   *  (ninjaImpact dash 等) 必须用它, 否则 SkillTweenMgr watcher 每帧把 sprite.x 拍回 home。 */
  setInHop?(f: Fighter, on: boolean): void;
  /** P26: 战斗日志 — JS addLog(html, cls) 1:1. handlers 用它发 per-skill flavor 行. */
  log?(text: string): void;
}

// v0.9.5.A63: 多段技能间隔 helper — JS shell.js sleep(500) 对齐
async function sleep(ms: number): Promise<void> {
  if (_auditMode) return;   // P137+ audit: 跳过动画延迟
  const api = _skillApi;
  if (!api) return;
  return new Promise<void>(resolve => api.scene.time.delayedCall(ms, () => resolve()));
}

// ── P189: 龟派气波"弹空"物理 (1:1 JS basic-anim.js buildJuggleKeyframes 桌面分支) ──
//  敌人被波贯穿时: 3 段 (上+后) 冲量 (t=0/220/440ms) + 重力 1500px/s² 抛物线 → 落地砸
//  (snap y=0, 旋到 -82° 躺姿) → 躺 560ms → 起身缓动归位 330ms. 共 2000ms, 采样 64 步.
//  WAAPI 用 linear 在相邻采样间插值 → PoC 同样预采样 + onUpdate 线性插值, 逐帧覆盖 sprite.
const JUGGLE_TOTAL_MS = 2000;
interface JuggleSample { x: number; y: number; rot: number }
function buildJugglePhysics(knockX: number): JuggleSample[] {
  const g = 1500;
  const hits = [
    { t: 0,   vy: -260, vx: knockX * 1.6 },
    { t: 220, vy: -310, vx: knockX * 1.3 },
    { t: 440, vy: -360, vx: knockX * 0.9 },
  ];
  const rotImpulses = [-45, 70, -95];
  const liePoseMs = 560, recoverMs = 330, slamRot = -82, steps = 64;
  const dt = JUGGLE_TOTAL_MS / steps / 1000;
  const s = { x: 0, y: 0, rot: 0, vx: 0, vy: 0, vrot: 0 };
  let hitIdx = 0;
  let slamT: number | null = null;
  let slamPose: JuggleSample | null = null;
  let recoverT: number | null = null;
  const out: JuggleSample[] = [];
  for (let i = 0; i <= steps; i++) {
    const tMs = (i / steps) * JUGGLE_TOTAL_MS;
    while (hitIdx < hits.length && tMs >= hits[hitIdx].t) {
      s.vy = hits[hitIdx].vy; s.vx = hits[hitIdx].vx; s.vrot = rotImpulses[hitIdx]; hitIdx++;
    }
    if (slamT == null) {
      s.vy += g * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vrot * dt;
      if (s.y >= 0 && hitIdx === hits.length && tMs > 500) {
        s.y = 0; s.rot = slamRot; s.vx = s.vy = s.vrot = 0; slamT = tMs;
        slamPose = { x: s.x, y: 0, rot: slamRot };
      }
    } else if (recoverT == null) {
      if (tMs >= slamT + liePoseMs) recoverT = tMs;
    } else if (slamPose) {
      const p = Math.min(1, (tMs - recoverT) / recoverMs);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;   // ease-in-out
      s.x = slamPose.x * (1 - e); s.y = slamPose.y * (1 - e); s.rot = slamPose.rot * (1 - e);
    }
    out.push({ x: s.x, y: s.y, rot: s.rot });
  }
  return out;
}
function sampleJuggle(samples: JuggleSample[], t01: number): JuggleSample {
  const n = samples.length - 1;
  const f = Math.max(0, Math.min(1, t01)) * n;
  const i = Math.floor(f), frac = f - i;
  const a = samples[i], b = samples[Math.min(n, i + 1)];
  return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac, rot: a.rot + (b.rot - a.rot) * frac };
}

/** P86 spawn ghost VFX (1:1 JS ghost.js:25/123/195 — flip-x by attacker side)
 *   通用 helper: phantom/storm/touch 三个 keys 复用
 *   sprite.x/y = target sprite center, depth=30 (JS z-index:30)
 *   attackerSide='right' → setFlipX(true) (1:1 JS .flip-x)
 *   display 128×128 phantom/touch, 96×96 storm (JS scene.css)
 */
function spawnGhostVfx(
  scene: Phaser.Scene, x: number, y: number, key: string,
  attackerSide: 'left' | 'right', displaySize: number,
): void {
  if (!scene.textures.exists(key) || !scene.anims.exists(`anim-${key.replace('vfx-', '')}`)) return;
  const vfx = scene.add.sprite(x, y, key).setDepth(30).setDisplaySize(displaySize, displaySize);
  if (attackerSide === 'right') vfx.setFlipX(true);
  try { vfx.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
  vfx.play(`anim-${key.replace('vfx-', '')}`);
  vfx.on('animationcomplete', () => vfx.destroy());
}

/** P78 spawn 天降闪电 VFX — 1:1 JS combat.js:50-57 spawnLightningStrike
 *   5 帧 × 200×200 atlas, 560ms steps, 底部锚定 target 脚下
 *   闪电龟 lightningStorm passive + 8-stack 引爆 / 宝箱龟 thunder 5-stack 引爆 用
 */
export function spawnLightningStrike(scene: Phaser.Scene, targetX: number, targetGroundY: number): void {
  if (!scene.textures.exists('vfx-common-lightning-strike')) return;
  // JS CSS: bottom anchored to target feet, sprite 200×200, 所以 sprite center at (x, groundY - 100)
  const bolt = scene.add.sprite(targetX, targetGroundY - 100, 'vfx-common-lightning-strike')
    .setDepth(35).setDisplaySize(200, 200);
  try { bolt.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
  if (scene.anims.exists('anim-common-lightning-strike')) {
    bolt.play('anim-common-lightning-strike');
  }
  bolt.on('animationcomplete', () => bolt.destroy());
  // 兜底 600ms (JS setTimeout 600 移除)
  scene.time.delayedCall(600, () => { if (bolt.active) bolt.destroy(); });
}

/** P77 physics 击飞 juggle — 1:1 JS ninja.js:65-144 buildNinjaKnockupJuggle
 *   ascent (vy=-640) → gravity fall (g=1300) → slam (y=0, rot=-82°) → 280ms lie → 220ms recover
 *   总 ~1800ms. 用 sprite x/y/rotation 走 addCounter 物理 sim.
 *   isMobile false 时 PC 数值 (PoC 默认).
 */
interface KnockupAnimMeta { airborneMs?: number; descentMs?: number; lyingMs?: number; runBackMs?: number }
function applyKnockupJuggle(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
  homeX: number, homeY: number, knockX: number,
  noRotation = false,
  setInHop?: (on: boolean) => void,   // 必须设目标真 view 的 _inHop, 否则 watcher 每帧把 sprite.x 拍回 home → 击飞位移被抵消, 目标只在原地上下颠/旋转
  knockupAnim?: KnockupAnimMeta | null,   // 目标有受击飞帧表 → 走 JS run-back 分支 (无旋转, 飞 1.4×knockX 后跑回)
): Phaser.Tweens.Tween {
  const kf: Array<{ off: number; x: number; y: number; rot: number }> = [];
  let totalMs: number;
  if (noRotation && knockupAnim) {
    // JS ninja.js:71-101 run-back 分支: 目标有 knockupAnim sprite → 抛物线升降 + 倒地停 + 跑回 home, 无旋转
    const airMs = (knockupAnim.airborneMs ?? 300) + (knockupAnim.descentMs ?? 300);
    const lyingMs = knockupAnim.lyingMs ?? 0;
    const runBackMs = knockupAnim.runBackMs ?? 400;
    totalMs = airMs + lyingMs + runBackMs;
    const peakY = -82;            // JS PC 值
    const slamX = knockX * 1.4;   // JS:78 落点更靠后
    const airSteps = 8;
    for (let i = 0; i <= airSteps; i++) {
      const t = i / airSteps;
      kf.push({ off: (t * airMs) / totalMs, x: slamX * t, y: peakY * (1 - Math.pow(2 * t - 1, 2)), rot: 0 });
    }
    if (lyingMs > 0) kf.push({ off: (airMs + lyingMs) / totalMs, x: slamX, y: 0, rot: 0 });
    kf.push({ off: 1, x: 0, y: 0, rot: 0 });   // 跑回 home
  } else {
    // JS ninja.js:102-143 物理分支: ascent vy=-640 → g=1300 → slam rot=-82° → lie 280 → recover 220
    totalMs = 1800;
    const g = 1300, liftVy = -640, liftVx = knockX, slamRot = noRotation ? 0 : -82;
    const liePoseMs = 280, recoverMs = 220, steps = 56, dt = totalMs / steps / 1000;
    const s = { x: 0, y: 0, rot: 0, vx: liftVx, vy: liftVy, vrot: noRotation ? 0 : -100 };
    let slamT: number | null = null, slamPose: { x: number; rot: number } | null = null, recoverT: number | null = null;
    for (let i = 0; i <= steps; i++) {
      const tMs = (i / steps) * totalMs;
      if (slamT == null) {
        s.vy += g * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vrot * dt;
        if (s.y >= 0 && tMs > 200) { s.y = 0; s.rot = slamRot; s.vx = 0; s.vy = 0; s.vrot = 0; slamT = tMs; slamPose = { x: s.x, rot: slamRot }; }
      } else if (recoverT == null) {
        if (tMs >= slamT + liePoseMs) recoverT = tMs;
      } else if (slamPose) {
        const p = Math.min(1, (tMs - recoverT) / recoverMs);
        const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        s.x = slamPose.x * (1 - e); s.y = 0; s.rot = slamPose.rot * (1 - e);
      }
      kf.push({ off: i / steps, x: s.x, y: s.y, rot: s.rot });
    }
  }
  kf[kf.length - 1] = { off: 1, x: 0, y: 0, rot: 0 };   // 兜底归零 (JS:142)
  // addCounter 0→1, 按 offset 在相邻 kf 间线性插值
  setInHop?.(true);   // 关键: 标记目标在被击飞, watcher 不再每帧拽回 home
  const counter = scene.tweens.addCounter({
    from: 0, to: 1, duration: totalMs, ease: 'linear',
    onUpdate: (tw) => {
      const p = tw.getValue() ?? 0;
      let i1 = 1;
      while (i1 < kf.length - 1 && kf[i1].off < p) i1++;
      const k0 = kf[i1 - 1], k1 = kf[i1];
      const span = k1.off - k0.off;
      const sub = span > 0 ? Math.max(0, Math.min(1, (p - k0.off) / span)) : 0;
      sprite.x = homeX + k0.x + (k1.x - k0.x) * sub;
      sprite.y = homeY + k0.y + (k1.y - k0.y) * sub;
      sprite.rotation = (k0.rot + (k1.rot - k0.rot) * sub) * Math.PI / 180;
    },
    onComplete: () => {
      sprite.x = homeX; sprite.y = homeY; sprite.rotation = 0;
      setInHop?.(false);
    },
  });
  (counter as Phaser.Tweens.BaseTween & { _isSkillTween?: boolean })._isSkillTween = true;
  return counter as Phaser.Tweens.Tween;
}

export interface HandlerResult {
  /** 主目标 / 受影响的目标列表, 调用方据此判断死亡 */
  touched: Fighter[];
}

export type SkillHandler = (
  api: BattleApi,
  caster: Fighter,
  primaryTarget: Fighter | null,
  skill: SkillDef & { cdLeft: number },
) => Promise<HandlerResult>;

// ── v0.9.5.A96 (P156): 龟盾 VFX 旧 graphics 版 helper (drawGoldenArc/spawnImpactBurst/
//   spawnShieldAura) 已删 — turtleShieldBash 现走 sprite 资产 (vfx-basic-shieldbash-arc/
//   -impact + circle aura), 这三个自创 helper 自 A96 起 0 调用, 且 spawnImpactBurst 含 JS
//   doTurtleShieldBash 没有的 cam.shake. 删除避免误导 (符合 1:1 / 不自创).

// ── 工具 ────────────────────────────────────────────────
function getEnemies(api: BattleApi, caster: Fighter): Fighter[] {
  // 黑洞中的敌人视为不在场 (星际黑洞: 不被 AOE/单体命中); 召唤物仍计入 (描述: 随从受 AOE)
  return api.allFighters.filter(f => f.alive && f.side !== caster.side
    && !(f as Fighter & { _isInBlackhole?: boolean })._isInBlackhole);
}
function getAllies(api: BattleApi, caster: Fighter): Fighter[] {
  return api.allFighters.filter(f => f.alive && f.side === caster.side);
}
/** v0.9.5.A47: 计算 caster 实际暴击率 (含 lowHpCrit passive 加成) */
function effectiveCrit(caster: Fighter): number {
  let crit = caster.crit;
  if (caster.passive?.type === 'lowHpCrit' && caster.hp / caster.maxHp < 0.3) {
    crit += (caster.passive.pct as number) / 100;
  }
  return crit;
}

/** v0.9.5.A47: passive 增伤倍率 (basicTurtle 稀有度加成 + frostAura 目标加成)
 *  v0.9.5.A77: 加 bonusDmgAbove60 (target HP > 60% +%) + fear 减伤 (combat.js:148-176)
 */
function passiveDmgMult(caster: Fighter, target: Fighter, dmgType: 'physical' | 'magic' | 'true' = 'physical'): number {
  void dmgType;
  let mult = 1;
  // P151 CRITICAL: basicTurtle / bonusDmgAbove60 / fear 已在 calcDamage (damage.ts:55-69) 应用,
  //   这里曾重复应用 → dealPhysical/dealMagic 路径双重计算 (basic 攻击 70×1.2×1.2=101 而非 84).
  //   现只保留 frostAura (calcDamage 没有), 其余交给 calcDamage 单次应用.
  if (caster.passive?.type === 'frostAura' && Array.isArray(caster.passive.bonusTargets)) {
    if ((caster.passive.bonusTargets as string[]).includes(target.id)) {
      mult *= 1 + ((caster.passive.bonusDmgPct as number) || 0) / 100;
    }
  }
  return mult;
}

// v0.9.5.A75: 闪避检查 (JS combat.js:82-110)
// P60: 闪避成功时, 幽灵墨鱼 _equipGhostSquid → 20 × ghostCount 永久护盾 (JS combat.js:89-97)
function rollDodge(target: Fighter, api: BattleApi | null, attacker?: Fighter): boolean {
  const dodgeBuff = target.buffs.find(b => b.type === 'dodge');
  const totalDodge = (dodgeBuff ? dodgeBuff.value : 0) + ((target as Fighter & { _extraDodge?: number })._extraDodge || 0);
  if (totalDodge > 0 && Math.random() < totalDodge / 100) {
    if (api) api.floatNum(target, 'Miss', '#a0e8ff', 'dodge-num');
    // P60 e_ghost: 闪避时按件数给 20 × ghostCount 永久护盾 (JS combat.js:89-97)
    const tt = target as Fighter & { _equipGhostSquid?: boolean };
    if (tt._equipGhostSquid && target.equipment) {
      const ghostCount = target.equipment.filter(e => e.id === 'e_ghost').length;
      if (ghostCount > 0) {
        const shieldGain = 20 * ghostCount;
        target.shield = (target.shield ?? 0) + shieldGain;
        if (api) api.floatNum(target, `+${shieldGain}`, '#c0c0c0', 'shield-num');
      }
    }
    // G3: dodgeCounter 闪避反击 (starWarp) — 每命中(dodge)结算 (JS combat.js:99-107)
    const dc = target.buffs.find(b => b.type === 'dodgeCounter');
    if (dc && attacker && attacker.alive) {
      const cDmg = (dc.value as number) ?? 0;
      const dt = ((dc as { dmgType?: 'physical' | 'magic' | 'true' }).dmgType) ?? 'magic';
      const r = applyRawDamage(attacker, cDmg, dt);
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      battleStats.recordDamage(target, attacker, shown, dt === 'physical' ? 'phy' : dt === 'true' ? 'tru' : 'mag');
      if (api) api.floatNum(attacker, `${shown}`, '#ff8c42', 'counter-dmg');
    }
    return true;
  }
  return false;
}

function dealPhysical(caster: Fighter, target: Fighter, base: number, isCrit: boolean): number {
  // v0.9.5.A75: 闪避检查 (per-hit; 含 ghostSquid 盾 + dodgeCounter 反击)
  if (rollDodge(target, getSkillApi(), caster)) return 0;
  // v0.9.5.A47: passive 加成 (basicTurtle / frostAura / bonusDmgAbove60 / fear)
  const pMult = passiveDmgMult(caster, target, 'physical');
  // P1.4 暴击溢出: >100% 暴击额外加伤
  const critMult = isCrit ? calcCritMult(caster) : 1;
  let dmg = Math.round(calcDamage(caster, target, base * pMult * critMult, 'physical'));
  // 注: diamondStructure 减伤已收口到 applyRawDamage (此处不再重复减)
  // v0.9.5.A92: gamblerPierceConvert — X% main 转 true (combat.js:178-180)
  const pcBuff = caster.buffs.find(b => b.type === 'gamblerPierceConvert');
  let convertedTrue = 0;
  if (pcBuff) {
    convertedTrue = Math.round(dmg * pcBuff.value / 100);
    dmg = Math.max(1, dmg - convertedTrue);
  }
  const wasAlive = target.alive;
  // 修(2026-05-30): 传 caster 让 applyRawDamage 读 caster._dmgBonusThisTurnPct (FPGA-10 / 放大器 +X% 增伤)
  const { hpLoss, shieldAbs } = applyRawDamage(target, dmg, 'physical', false, false, undefined, caster);
  const physShown = hpLoss + shieldAbs;
  let total = physShown;
  // 物理段记 'phy'; gamblerPierceConvert 转换的真伤段分型记 'tru' (原与物理合并记 'phy' → 真伤被错算成物理)
  battleStats.recordDamage(caster, target, physShown, 'phy');
  if (convertedTrue > 0) {
    const r2 = applyRawDamage(target, convertedTrue, 'true', false, false, undefined, caster);
    const tShown = (r2.hpLoss ?? 0) + (r2.shieldAbs ?? 0);
    if (tShown > 0) battleStats.recordDamage(caster, target, tShown, 'tru');
    total += tShown;
  }
  if (wasAlive && !target.alive) battleStats.recordKill(caster, target);
  // v0.9.5.A53: 触发被动 on-hit 链 (P221: 传 isCrit/critMult 让 judgement 等暴击层正确加成, 对齐 JS combat.js:249)
  const api = getSkillApi();
  triggerOnHitEffects(caster, target, total, { floatNum: api?.floatNum, isCrit, critMult, hpLoss });
  // P221: ink mark (其余 on-hit 层已在 triggerOnHitEffects, 不再重复)
  applyPostHitLayers(caster, target, total, isCrit, 'physical');
  if (total > 0) api?.hitKnockback?.(target, caster.side);   // JS sceneKnockback 受击击退
  return total;
}
/** v0.9.5.A59: 通用 applyRawDamage 包装 — 包 battleStats record + on-hit 链
 *  替代直接调用 applyRawDamage; 任何 skill 内部 raw 落伤都走这里, 自动触发被动链
 */
function dealRaw(
  caster: Fighter,
  target: Fighter,
  dmg: number,
  type: 'phy' | 'mag' | 'tru' = 'phy',
): number {
  const wasAlive = target.alive;
  // 修(2026-05-30): 传 caster 让 _dmgBonusThisTurnPct 生效
  const r = applyRawDamage(target, dmg, 'physical', false, false, undefined, caster);
  const total = r.hpLoss + r.shieldAbs;
  battleStats.recordDamage(caster, target, total, type);
  if (wasAlive && !target.alive) battleStats.recordKill(caster, target);
  const api = getSkillApi();
  triggerOnHitEffects(caster, target, total, api ? { floatNum: api.floatNum, hpLoss: r.hpLoss } : { hpLoss: r.hpLoss });
  if (total > 0) api?.hitKnockback?.(target, caster.side);   // U7: dealRaw 也击退 (diamondSmash/pirate 等)
  return total;
}

function dealMagic(caster: Fighter, target: Fighter, base: number): number {
  // v0.9.5.A75: 闪避检查 (per-hit; 含 ghostSquid 盾 + dodgeCounter 反击)
  if (rollDodge(target, getSkillApi(), caster)) return 0;
  // P118 1:1 JS combat.js calcCrit — 魔法技能也走 crit (PoC 之前漏, 跨 20+ skill 少 ~12-15%)
  //   每个 dealMagic 调用独立 roll crit (跟 phys 同), 暴击 critMult 乘到 base
  const isCrit = rollCrit(effectiveCrit(caster));
  const critMult = isCrit ? calcCritMult(caster) : 1;
  // v0.9.5.A77: passive 加成 + 战斗规则 + diamond flat reduce
  const pMult = passiveDmgMult(caster, target, 'magic');
  let dmg = Math.round(calcDamage(caster, target, base * pMult * critMult, 'magic') * ruleModifiers.magicMult());
  // 注: diamondStructure 减伤已收口到 applyRawDamage (此处不再重复减)
  const wasAlive = target.alive;
  // 修(2026-05-30): 传 caster 让 _dmgBonusThisTurnPct 生效
  const { hpLoss, shieldAbs } = applyRawDamage(target, dmg, 'magic', false, false, undefined, caster);
  const total = hpLoss + shieldAbs;
  battleStats.recordDamage(caster, target, total, 'mag');
  if (wasAlive && !target.alive) battleStats.recordKill(caster, target);
  const api = getSkillApi();
  triggerOnHitEffects(caster, target, total, api ? { floatNum: api.floatNum, isCrit, critMult, hpLoss } : { isCrit, critMult, hpLoss });
  // v0.9.5.A92: judgement passive + _equipSplash + gamblerMultiHit (魔法也走)
  applyPostHitLayers(caster, target, total, isCrit, 'magic');
  if (total > 0) api?.hitKnockback?.(target, caster.side);   // JS sceneKnockback 受击击退
  return total;
}

/** v0.9.5.A92 → P221 去重: 命中后追加层 — 只保留 ink mark (墨印延迟魔法)。
 *  judgement / 潮汐涟漪 splash / bubbleBind / trap 夹子 / gamblerMultiHit 这 5 项
 *  triggerOnHitEffects (passive-triggers.ts) 已实现; 本函数此前重复实现, 且各 deal 系列 / handler
 *  对同一次命中同时调 triggerOnHitEffects + applyPostHitLayers → 每次命中双倍触发
 *  (实测天使龟审判 640, JS 单次应为 418)。故移除这 5 项重复; ink mark 是 triggerOnHit
 *  没有的, 保留在此。 */
function applyPostHitLayers(
  caster: Fighter, target: Fighter, totalHit: number, isCrit: boolean,
  dmgType: 'physical' | 'magic',
): void {
  void isCrit; void dmgType;   // 现仅 ink 用 caster/target/totalHit
  const api = getSkillApi();

  // ink mark deferred dmg (combat.js:914-918) — triggerOnHitEffects 未含, 保留
  const ink = (caster as Fighter & { _inkMarkPct?: number; _inkMarkType?: 'magic' | 'true' })._inkMarkPct;
  if (ink && ink > 0 && target.alive && totalHit > 0) {
    const inkType = (caster as Fighter & { _inkMarkType?: 'magic' | 'true' })._inkMarkType ?? 'magic';
    const inkRaw = Math.round(totalHit * ink / 100);
    if (inkRaw > 0) {
      const wasA = target.alive;
      const r = applyRawDamage(target, inkRaw, inkType === 'true' ? 'true' : 'magic');
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      battleStats.recordDamage(caster, target, shown, inkType === 'true' ? 'tru' : 'mag');
      if (wasA && !target.alive) battleStats.recordKill(caster, target);
      if (api?.floatNum) api.floatNum(target, `${shown}`, inkType === 'true' ? '#ffffff' : '#4cc9f0', inkType === 'true' ? 'true-dmg' : 'magic-dmg');
    }
  }
}
// JS engine.js:1022 applyHeal 1:1 (含 healReduce / 装备 / 守护 synergy 加成)
// + 新: 传 caster 让 battleStats.healDone 也累计 (用户加: 战斗统计加治疗 + 护盾)
// P159: export 供 BattleScene 小龟帽 turn-begin 复苏复用 (desc 要求"受治疗减益/强度影响")
export function applyHeal(target: Fighter, amount: number, caster?: Fighter): number {
  if (!target.alive) return 0;
  // healReduce buff (JS:1024-1025)
  const hr = target.buffs?.find(b => b.type === 'healReduce');
  if (hr) amount = Math.round(amount * (1 - (hr.value ?? 0) / 100));
  // 装备 潮汐涟漪 (JS:1027)
  const tt = target as Fighter & { _equipRippleHealAmp?: number; _synergyGuardAmp?: number };
  if (tt._equipRippleHealAmp) amount = Math.round(amount * (1 + tt._equipRippleHealAmp / 100));
  // 守护 synergy (JS:1029)
  if (tt._synergyGuardAmp) amount = Math.round(amount * (1 + tt._synergyGuardAmp));
  // 铁壁之日规则: 受到的治疗 +30% (与护盾 ×1.3 同口径, 用户要求)
  amount = Math.round(amount * ruleModifiers.healMult());
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  const healed = target.hp - before;
  // 双向 record: caster healDone + target healTaken
  battleStats.recordHeal(caster ?? null, target, healed);
  return healed;
}
/** JS line.js:1-28 addInkStack — 叠墨迹层 + 同步 _inkLink 伙伴 (旧 PoC sketch/inkBomb 直写漏同步) */
function addInkStack(target: Fighter, count: number, attacker: Fighter): void {
  const max = ((attacker as Fighter & { _inkCapOverride?: number })._inkCapOverride) ?? 5;
  const tt = target as Fighter & {
    _inkStacks?: number; _inkRapidActive?: boolean; _inkLink?: { partner: Fighter } };
  const before = tt._inkStacks ?? 0;
  tt._inkStacks = Math.min(max, before + count);
  const gained = tt._inkStacks - before;
  if (gained <= 0) return;
  tt._inkRapidActive = !!((attacker as Fighter & { _inkTrueDmg?: boolean })._inkTrueDmg);
  // ink link: 同步层数到伙伴 (JS line.js:16-25)
  if (tt._inkLink?.partner?.alive) {
    const partner = tt._inkLink.partner as Fighter & { _inkStacks?: number; _inkRapidActive?: boolean };
    partner._inkStacks = Math.min(max, (partner._inkStacks ?? 0) + gained);
    partner._inkRapidActive = tt._inkRapidActive;
  }
}
function applyShield(target: Fighter, amount: number): void {
  if (!target.alive) return;
  // 战斗规则: 铁壁 护盾 ×1.3
  const added = Math.round(amount * ruleModifiers.shieldMult());
  target.shield = (target.shield || 0) + added;
  battleStats.recordShield(target, added);
}

/** 包装施加 burn 层数, 含规则倍率 (炎火 ×1.5)
 *  F4: 走 applyDotStacks 层数模型 (累加 + duration:999 + 免疫检查), 不再固定 duration。
 *  P37: 寒冰龟 iceBurnImmune passiveSkill (_burnImmune flag) → 不施加 (applyDotStacks 内检 + JS combat.js:379)
 */
function applyBurn(target: Fighter, value: number, _duration?: number): void {
  applyDotStacks(target, 'burn', Math.round(value * ruleModifiers.burnMult()));
}

// v0.9.5.A48: shock 层数 (lightning) / crystal 层数 / blood 层数 helpers
function getStacks(f: Fighter, type: string): number {
  const buff = f.buffs.find(b => b.type === type);
  return buff?.value ?? 0;
}
function setStacks(f: Fighter, type: string, value: number, duration: number = 99) {
  const buff = f.buffs.find(b => b.type === type);
  if (buff) buff.value = value;
  else f.buffs.push({ type, value, duration });
}
// P79: shock 层走 fighter._shockStacks (number property) — passive-triggers.ts:303
// 已经在 dealMagic→triggerOnHitEffects 自动 +1, **handler 不该再手动 +1**.
// 之前 addShockStack 用 buffs 'shock' type, 跟 passive-triggers 的 _shockStacks 是两套
// 平行系统不同步, 导致引爆永不触发. 现统一到 _shockStacks 单源.
function getShockStacks(f: Fighter): number {
  return (f as Fighter & { _shockStacks?: number })._shockStacks ?? 0;
}
function clearShockStacks(f: Fighter): void {
  (f as Fighter & { _shockStacks?: number })._shockStacks = 0;
}

// P88: addCrystalStack 删除 — passive-triggers crystallizeResonance 已自动叠层+引爆
//   原 PoC 用 'crystalMark' buff 系统跟 fighter._crystallize 不同步 (跟 shock 同款 bug)

/** P89 1:1 JS star.js fireStarPassive — 命中后 40% stored energy 真伤 (passive 加成)
 *   starWormhole / starMeteor / starGravityWarp 3 个 skill 收尾要调
 *   target 死或无 starEnergy passive 则 no-op
 */
function fireStarPassive(api: BattleApi, caster: Fighter, target: Fighter): void {
  const p = caster.passive;
  if (p?.type !== 'starEnergy' || !target.alive) return;
  const cf = caster as Fighter & { _starEnergy?: number };
  const stored = cf._starEnergy ?? 0;
  if (stored <= 0) return;
  const fireDmg = Math.round(stored * ((p.passiveFirePct as number) ?? 40) / 100);
  if (fireDmg <= 0) return;
  const wasA = target.alive;
  const r = applyRawDamage(target, fireDmg, 'true');
  const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
  battleStats.recordDamage(caster, target, shown, 'tru');
  if (wasA && !target.alive) battleStats.recordKill(caster, target);
  api.floatNum(target, `${shown}`, '#ffffff', 'true-dmg');
  triggerOnHitEffects(caster, target, fireDmg, { floatNum: api.floatNum });
  // recharge by chargeRate% of shown
  const maxE = Math.round(caster.maxHp * ((p.maxChargePct as number) ?? 25) / 100);
  cf._starEnergy = Math.min(maxE, (cf._starEnergy ?? 0) + Math.round(shown * ((p.chargeRate as number) ?? 30) / 100));
}

// ══════════════════════════════════════════════════════════
// SKILL_HANDLERS — 派发表
// ══════════════════════════════════════════════════════════
export const SKILL_HANDLERS: Record<string, SkillHandler> = {

  // ── 通用物理普攻 (fallback) — v0.9.5.A73: 支持 atkScale+defScale+mrScale 复合 (石头龟打击) ──
  // P18: 通用 physical handler 加数据驱动 aoe/hpPct/atkDown 支持
  //   - 双头普攻 (pets.js:227 aoe:true, hpPct:15) — 全体物理 + maxHp 加成
  //   - 糖果普攻 (pets.js:471 atkDown:{pct:15,turns:2}) — 命中后施 atkDown debuff
  // 之前忽略以上 3 字段, 数据里写了但完全不生效.
  physical: async (api, caster, target, skill) => {
    const hits = skill.hits ?? 1;
    const atkScale = (skill.atkScale as number) ?? 1.0;
    const defScale = (skill.defScale as number) ?? 0;
    const mrScale = (skill.mrScale as number) ?? 0;
    const hpPct = (skill.hpPct as number) ?? 0;
    const selfHpPct = (skill.selfHpPct as number) ?? 0;   // #8 H6: 自身maxHp加伤 (糖果锤 {N:HP*0.05})
    const atkDown = skill.atkDown as { pct?: number; turns?: number } | undefined;
    const isAoe = !!skill.aoe;
    // P18: AoE → 全敌列表; 单体 → [target]
    const targets = isAoe ? getEnemies(api, caster) : (target ? [target] : []);
    if (!targets.length) return { touched: [] };
    const touched: Fighter[] = [];
    for (const t of targets) {
      if (!t.alive) continue;
      let totalShown = 0;
      let lastCrit = false;
      for (let i = 0; i < hits; i++) {
        if (!t.alive) break;
        const isCrit = rollCrit(effectiveCrit(caster));
        lastCrit = isCrit;
        const base = caster.atk * atkScale
          + caster.def * defScale
          + (caster.mr ?? caster.def) * mrScale
          + t.maxHp * hpPct / 100    // P18: hpPct from target.maxHp (双头普攻)
          + caster.maxHp * selfHpPct / 100;   // #8 H6: selfHpPct from caster.maxHp (糖果锤)
        const dmg = dealPhysical(caster, t, base, isCrit);
        totalShown += dmg;
        if (hits > 1) {
          if (dmg > 0) api.floatNum(t, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');  // dmg=0 → 闪避(已飘Miss), 不再飘 0
          if (i < hits - 1) await sleep(500);
        }
      }
      // 单段时合并飘字一次, 多段时每段已飘 (闪避 totalShown=0 → 不飘)
      if (hits === 1 && totalShown > 0) {
        api.floatNum(t, `${totalShown}`, '#ff4444', lastCrit ? 'crit-dmg' : 'direct-dmg');
      }
      // P18: atkDown debuff (糖果普攻 — 命中后给 attacker debuff)
      if (atkDown && t.alive && (atkDown.pct ?? 0) > 0) {
        t.buffs.push({
          type: 'atkDown',
          value: atkDown.pct ?? 0,
          duration: (atkDown.turns ?? 2) + 1,
        });
        api.floatNum(t, `-${atkDown.pct}%攻`, '#888', 'debuff-label');
      }
      touched.push(t);
    }
    // #8 M12: selfDefUpPct — 出击后自身护甲 +pct% (缩头乌龟「攻击」: {D:DEF*0.2} 2回合); 旧版通用 physical 不读此字段
    const selfDef = skill.selfDefUpPct as { pct?: number; turns?: number } | undefined;
    if (selfDef && (selfDef.pct ?? 0) > 0 && caster.alive) {
      const gain = Math.round((caster.baseDef ?? caster.def) * (selfDef.pct ?? 0) / 100);
      if (gain > 0) {
        caster.buffs.push({ type: 'defUp', value: gain, duration: (selfDef.turns ?? 2) + 1 });
        api.floatNum(caster, `+${gain}甲`, '#7dffb3');
      }
    }
    return { touched };
  },

  // 激光长刃 (e_laser_blade 横扫): H1 修 — 之前 laserSweep 无 handler → fallback 到通用单体 physical,
  //   描述的整排横扫 + 80% 吸血全没生效。现按描述实装:
  //   对目标所在【前排/后排】整排存活敌人各 0.7×ATK 物理; 若该排仅 1 名存活则 1.4×ATK;
  //   携带者回复 = 横扫造成总伤害 × 80%。
  laserSweep: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const tRow = ((target as Fighter & { _slotKey?: string })._slotKey ?? 'front-0').startsWith('back') ? 'back' : 'front';
    const rowEnemies = api.allFighters.filter(f =>
      f.alive && f.side !== caster.side
      && ((f as Fighter & { _slotKey?: string })._slotKey ?? 'front-0').startsWith(tRow));
    const list = rowEnemies.length ? rowEnemies : [target];
    const solo = list.length === 1;
    const atkScale = solo ? ((skill.soloScale as number) ?? 1.4) : ((skill.atkScale as number) ?? 0.7);
    const healPct = (skill.lifestealPct as number) ?? 80;
    let totalDealt = 0;
    const touched: Fighter[] = [];
    for (const t of list) {
      if (!t.alive) continue;
      const isCrit = rollCrit(effectiveCrit(caster));
      const dmg = dealPhysical(caster, t, caster.atk * atkScale, isCrit);
      totalDealt += dmg;
      if (dmg > 0) api.floatNum(t, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
      touched.push(t);
    }
    if (totalDealt > 0 && healPct > 0) {
      const healed = applyHeal(caster, Math.round(totalDealt * healPct / 100), caster);
      if (healed > 0) api.floatNum(caster, `+${healed}`, '#06d6a0', 'heal');
    }
    return { touched };
  },

  // ── basic 系列 ──
  // v0.9.5.A96: 龟盾 (shieldBash) 真 port — 完整 5 段时序对齐 JS basic.js:1-125
  //   1) caster chop 旋转 + Y bob (composite: tweens.chain, 440ms)
  //   2) 等 180ms (caster 到前) + 金色弧线 → target
  //   3) 等 250ms (弧线扫过) + 冲击 burst sprite + applyRawDamage + 飘字
  //   4) target 14 段击飞 (1400ms: launch up+back / apex / 倒地 / bounce / 起身 / 走回)
  //   5) caster 护盾 aura + +shield 飘字
  turtleShieldBash: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const cv = api.viewOf(caster);
    const tv = api.viewOf(target);
    if (!cv || !tv) return { touched: [] };
    const scene = api.scene;
    const attackerLeft = caster.side === 'left';
    const dir = attackerLeft ? 1 : -1;

    // ── damage calc (含 basicTurtle + frostAura + lostHpPct, 跟 JS 对齐) ──
    let raw = Math.round(caster.atk * ((skill.atkScale as number) ?? 0.7));
    if (skill.lostHpPct) raw += Math.round((target.maxHp - target.hp) * (skill.lostHpPct as number) / 100);
    const isCrit = rollCrit(effectiveCrit(caster));
    const critMult = isCrit ? calcCritMult(caster) : 1;
    const effDef = calcEffArmor(caster, target);
    let dmg = Math.max(1, Math.round(raw * critMult * calcDmgMult(effDef)));
    // basicTurtle passive: bonusMap[rarity] %
    if (caster.passive?.type === 'basicTurtle' && (caster.passive as { bonusMap?: Record<string, number> }).bonusMap) {
      const bMap = (caster.passive as { bonusMap?: Record<string, number> }).bonusMap!;
      const bonusPct = bMap[target.rarity] ?? 0;
      if (bonusPct > 0) dmg = Math.round(dmg * (1 + bonusPct / 100));
    }
    // frostAura passive: bonusTargets includes target.id
    const fa = caster.passive as { type?: string; bonusTargets?: string[]; bonusDmgPct?: number } | null;
    if (fa?.type === 'frostAura' && fa.bonusTargets?.includes(target.id)) {
      dmg = Math.round(dmg * (1 + (fa.bonusDmgPct ?? 0) / 100));
    }

    // ── 1. caster chop 旋转 + Y bob (440ms, 4-stage tweens.chain) ──
    const homeRot = cv.sprite.rotation;
    const homeY = cv.homeY;
    scene.tweens.chain({
      targets: cv.sprite,
      tweens: [
        { y: homeY - 2, rotation: homeRot - 0.07 * dir, duration: 110, ease: 'Sine.easeOut' },   // windup
        { y: homeY + 3, rotation: homeRot + 0.10 * dir, duration: 130, ease: 'sine.in' },    // chop down
        { y: homeY + 1, rotation: homeRot + 0.05 * dir, duration: 90, ease: 'Sine.easeOut' },    // settle
        { y: homeY, rotation: homeRot, duration: 110, ease: 'sine.inOut' },                  // return
      ],
    });

    // ── 2. 等 180ms 后 golden arc (JS basic.js:46-60 + scene.css:947-962) ──
    //   sprite spawn at target body center + arcOffsetX (±50) + arcOffsetY (-20)
    //   attackerLeft → no flip; right → scaleX(-1) (arc 永远从攻击者方向 swing)
    //   life 320ms (5 帧 × 60ms 步骤)
    await sleep(180);
    const arcOffsetX = attackerLeft ? -50 : 50;
    const arcOffsetY = -20;
    if (scene.textures.exists('vfx-basic-shieldbash-arc')) {
      const arc = scene.add.sprite(tv.sprite.x + arcOffsetX, tv.sprite.y + arcOffsetY,
        'vfx-basic-shieldbash-arc').setDepth(29).setDisplaySize(208, 208);   // P19 对齐 JS desktop (160×1.3, base.css:1090)
      if (!attackerLeft) arc.setFlipX(true);
      try { arc.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
      arc.play('anim-basic-shieldbash-arc');
      arc.on('animationcomplete', () => arc.destroy());
      scene.time.delayedCall(320, () => { if (arc.active) arc.destroy(); });
    }

    // ── 3. 等 250ms 后 impact burst + 造伤 (JS basic.js:65-75 + scene.css:973-993) ──
    //   spawn at target ± 28 offset, 5 帧 × 50ms = 250ms life
    await sleep(250);
    const impOffsetX = attackerLeft ? -28 : 28;
    if (scene.textures.exists('vfx-basic-shieldbash-impact')) {
      const burst = scene.add.sprite(tv.sprite.x + impOffsetX, tv.sprite.y,
        'vfx-basic-shieldbash-impact').setDepth(30).setDisplaySize(187, 187);   // P19 对齐 JS desktop (144×1.3, base.css:1092)
      try { burst.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
      burst.play('anim-basic-shieldbash-impact');
      burst.on('animationcomplete', () => burst.destroy());
      scene.time.delayedCall(280, () => { if (burst.active) burst.destroy(); });
    }
    // 标 _inHop: 接下来有 14 段自定义击飞 chain — 让伤害飘字的受击帧 + 18px击退跳过 (否则与击飞 chain
    //   抢 sprite → 目标异常/卡顿, 同龟派气波/过肩摔)。chain onComplete 清除。
    api.setInHop?.(target, true);
    const wasAlive = target.alive;
    const r = applyRawDamage(target, dmg, 'physical');
    const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0) + (r.bubbleAbs ?? 0) + (r.auraAbs ?? 0);
    battleStats.recordDamage(caster, target, shown, 'phy');
    if (wasAlive && !target.alive) battleStats.recordKill(caster, target);
    // P71 fix: JS basic.js:78 spawnFloatingNum(tElId, text, cls, delayMs=80, yOff=0)
    //   旧错把 80 当 yOffset, 实际 JS 是 delayMs 80ms 后 spawn
    api.floatNum(target, `${shown}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg', 80, 0);
    triggerOnHitEffects(caster, target, dmg, { floatNum: api.floatNum });
    applyPostHitLayers(caster, target, shown, isCrit, 'physical');
    if (target.alive) api.knockup?.(target);

    // ── 4. target 14 段击飞 (JS basic.js:86-104, 1400ms 完整链) ──
    const knockDir = attackerLeft ? 1 : -1;
    const proneRot = (Math.PI / 2) * knockDir;
    const tHomeX = tv.homeX, tHomeY = tv.homeY;
    scene.tweens.chain({
      targets: tv.sprite,
      tweens: [
        // Phase 1: launch up and back (10% → 22% → 33% of 1400ms = 140 / 168 / 154ms)
        { x: tHomeX + 14 * knockDir, y: tHomeY - 28, rotation: 0.35 * knockDir, duration: 140, ease: 'cubic.out' },
        { x: tHomeX + 30 * knockDir, y: tHomeY - 42, rotation: 0.87 * knockDir, duration: 168, ease: 'cubic.in' },  // apex → fall
        { x: tHomeX + 42 * knockDir, y: tHomeY - 6, rotation: 1.40 * knockDir, duration: 154, ease: 'cubic.in' },
        // Phase 2: slam ground / bounce / hold prone (38% / 42% / 55%)
        { x: tHomeX + 44 * knockDir, y: tHomeY + 8, rotation: proneRot, duration: 70, ease: 'Sine.easeOut' },
        { x: tHomeX + 44 * knockDir, y: tHomeY + 2, rotation: proneRot, duration: 56, ease: 'sine.in' },
        { x: tHomeX + 44 * knockDir, y: tHomeY + 5, rotation: proneRot, duration: 182, ease: 'Sine.easeOut' },
        // Phase 3: rise (64% / 70%)
        { x: tHomeX + 44 * knockDir, y: tHomeY,     rotation: proneRot * 0.4, duration: 126, ease: 'Sine.easeOut' },
        { x: tHomeX + 44 * knockDir, y: tHomeY - 2, rotation: 0,              duration: 84, ease: 'sine.inOut' },
        // Phase 4: walk back home (80% / 88% / 95% / 100%)
        { x: tHomeX + 30 * knockDir, y: tHomeY - 3, duration: 140, ease: 'sine.inOut' },
        { x: tHomeX + 18 * knockDir, y: tHomeY,     duration: 112, ease: 'sine.inOut' },
        { x: tHomeX +  8 * knockDir, y: tHomeY - 2, duration: 98,  ease: 'sine.inOut' },
        { x: tHomeX,                 y: tHomeY,     rotation: 0, duration: 70 },
      ],
      onComplete: () => { tv.sprite.x = tHomeX; tv.sprite.y = tHomeY; tv.sprite.rotation = 0; api.setInHop?.(target, false); },
    });

    // ── 5. caster 护盾 + aura (JS basic.js:106-118 + scene.css:999-1024) ──
    //   140×140 radial-gradient ring + box-shadow, scale 0.3→1.4 over 540ms
    //   opacity 0 → 1 (25%) → 0.85 (60%) → 0 (100%)
    //   PoC: Phaser circle stroke (cyan+golden mix) + scale tween
    const shieldGain = Math.round(dmg * ((skill.shieldFromDmgPct as number) ?? 80) / 100);
    if (shieldGain > 0 && caster.alive) {
      caster.shield = (caster.shield ?? 0) + shieldGain;
      // P31: JS '+${gain}' shield-num (无 emoji)
      api.floatNum(caster, `+${shieldGain}`, '#c0c0c0', 'shield-num');
      // P183 获盾特效: 能量护罩"罩"住小龟 — 半透明青蓝穹顶 Back 弹入(过冲)+ 亮白边闪 + hold 后淡出.
      //   旧"双圈外扩"像爆/脉冲, 这个 bounce-in 更像"形成屏障/获得护盾".
      const SR = 52, scx = cv.sprite.x, scy = cv.sprite.y;
      const dome = scene.add.circle(scx, scy, SR, 0x7dc8ff, 0.16)
        .setStrokeStyle(2.5, 0x9fe6ff, 0.9).setDepth(3).setScale(0.2);
      scene.tweens.chain({
        targets: dome,
        tweens: [
          { scale: 1.12, duration: 170, ease: 'Back.easeOut' },         // 弹入过冲
          { scale: 1.0,  duration: 90,  ease: 'Sine.easeInOut' },        // 回弹定形
          { duration: 170 },                                             // hold
          { alpha: 0, scale: 1.06, duration: 230, ease: 'cubic.out' },   // 淡出
        ],
        onComplete: () => dome.destroy(),
      });
      // 出现瞬间一圈亮白边闪 (能量成形)
      const rim = scene.add.circle(scx, scy, SR, 0xffffff, 0)
        .setStrokeStyle(3, 0xffffff, 0.85).setDepth(3).setScale(0.25);
      scene.tweens.add({
        targets: rim, scale: 1.05, alpha: 0, duration: 260, ease: 'cubic.out',
        onComplete: () => rim.destroy(),
      });
    }

    // P71 fix: JS basic.js:121 await sleep(1400) — 等击飞链结束才让下个 skill 启
    await sleep(1400);
    // P71 fix: JS basic.js:123 addLog
    api.log?.(`${caster.emoji}${caster.name} <b>龟盾</b> → ${target.emoji}${target.name}：${shown}伤害${isCrit ? ' 暴击' : ''} +${shieldGain}永久护盾`);
    return { touched: [target] };
  },

  // P31 basicBarrage 1:1 JS basic.js:127-230 (含 bolt 飞行 VFX)
  //   1) 窗口 280ms (caster windup, JS:130 .basic-chiwave-charging)
  //   2) N×280ms staggered shots, 每 shot:
  //      - 选随机存活敌
  //      - 在 (target - dir×travelPx, target.y-6) spawn bolt 飞向 target
  //      - travelPx = 250, shotDuration = 220ms, damageAt = 130ms
  //      - 造伤 + hit-flash + hit-shake
  basicBarrage: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    if (enemies.length === 0) return { touched: [] };
    const total = caster.atk * ((skill.atkScale as number) ?? 3.1);
    const hits = (skill.hits as number) ?? 10;
    const perHit = total / hits;
    const shotStagger = 280;
    const damageAt = 130;
    const travelPx = 250;
    const shotDuration = 220;
    const touched = new Set<Fighter>();
    const scene = api.scene;
    const cv = api.viewOf(caster);
    const dir = caster.side === 'left' ? 1 : -1;
    await sleep(280);  // windup
    // bolt VFX 可用? (texture 在 BootScene 已 preload)
    const hasBoltTex = scene.textures.exists('vfx-basic-barrage-bolt');

    // 并行 staggered shots (Promise.all, JS basic.js:135 forEach + sleep stagger)
    const shots: Promise<void>[] = [];
    for (let i = 0; i < hits; i++) {
      const shotIdx = i;
      shots.push((async () => {
        await sleep(shotIdx * shotStagger);
        const alive = enemies.filter(e => e.alive);
        if (alive.length === 0) return;
        const t = alive[Math.floor(Math.random() * alive.length)];
        const tv = api.viewOf(t);
        if (!t.alive || !tv) return;
        // P153 bolt VFX 1:1 JS basic.js:157-186 — 7帧动画 sprite (非静态图), 104×104,
        //   从 target 前 travelPx(250) 飞行 (travelPx-40) px 落到身前, 220ms.
        if (hasBoltTex && cv) {
          const spawnX = tv.sprite.x - dir * travelPx;
          const spawnY = tv.sprite.y - 6;
          const bolt = scene.add.sprite(spawnX, spawnY, 'vfx-basic-barrage-bolt')
            .setDepth(28).setDisplaySize(160, 160);   // P19 对齐 JS desktop base.css:1048 (104×1.5)
          if (dir < 0) bolt.setFlipX(true);
          try { bolt.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
          if (scene.anims.exists('anim-basic-barrage-bolt')) bolt.play('anim-basic-barrage-bolt');
          bolt.once('animationcomplete', () => bolt.destroy());
          scene.tweens.add({
            targets: bolt,
            x: spawnX + dir * (travelPx - 40),
            duration: shotDuration, ease: 'linear',
            onComplete: () => { try { bolt.destroy(); } catch { /* ignore */ } },
          });
        }
        await sleep(damageAt);
        if (!t.alive || !tv) return;
        const isCrit = rollCrit(effectiveCrit(caster));
        const dmg = dealPhysical(caster, t, perHit, isCrit);
        api.floatNum(t, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
        // hit-flash on target sprite (JS:174 chi-hit-flash). 受击位移已由 dealPhysical→hitKnockback
        //   统一处理 (JS sceneKnockback), 不再叠自创 ±6px wobble (双反应/抢 sprite.x)。
        if (tv) {
          // tint flash 120ms
          if ('setTint' in tv.sprite) {
            (tv.sprite as Phaser.GameObjects.Sprite).setTint(0xffffff);
            scene.time.delayedCall(120, () => {
              try { (tv.sprite as Phaser.GameObjects.Sprite).clearTint(); } catch { /* ignore */ }
            });
          }
        }
        touched.add(t);
      })());
    }
    await Promise.all(shots);
    api.log?.(`${caster.emoji}${caster.name} <b>打击</b> ${hits} 段随机分布`);
    return { touched: [...touched] };
  },

  // P19 basicChiWave KOF 序列 (JS basic.js:243-537 1:1 简化版 ~2500ms):
  //   1) 自加 critUp/critDmgUp/lifesteal/armorPen 1 turn buff
  //   2) cut-in 蓝/青屏闪 500ms (cyan flash)
  //   3) camera zoom 1.2 (300ms)
  //   4) windup 550ms (charging)
  //   5) wave sprite 飞 600ms 到 target
  //   6) 3-hit aerial juggle (每 220ms) — 走 dealPhysical 走完整伤害链
  //   7) camera 恢复 + caster restore
  basicChiWave: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const cgain = (skill.critGain as number) ?? 25;
    const cdgain = (skill.critDmgGain as number) ?? 20;
    const lgain = (skill.lifestealGain as number) ?? 10;
    const apgain = (skill.armorPenGain as number) ?? 0.1;
    const apDelta = Math.round(caster.atk * apgain);
    // chiWaveActive buff (含 4 项加成 + 1 个 💥 图标). 用户定(2026-05-28): 本回合立即生效 ——
    //   这发冲击波就吃到 暴击/爆伤/吸血/穿甲, 且只持续本回合。
    //   故 duration:1 (本回合末清), 且 push 后必须立刻 recalcStats —— 否则加成要等下回合开始
    //   的统一 recalc 才写进 caster.crit/lifesteal/..., 本发冲击波吃不到 (旧 bug)。
    caster.buffs.push({
      type: 'chiWaveActive', value: 0, duration: 1,
      critGain: cgain, critDmgGain: cdgain, lifestealGain: lgain, armorPenDelta: apDelta,
    } as unknown as import('../types').Buff);
    recalcStats(caster, getAllies(api, caster));
    // JS basic.js:22-23 两行飘字
    api.floatNum(caster, `+${cgain}%暴 +${cdgain}%爆`, '#ffd93d', 'passive-num', 0, 0);
    api.floatNum(caster, `+${lgain}%生命偷取 +${apDelta}穿甲`, '#ffd93d', 'passive-num', 200, 16);

    const scene = api.scene;
    const cv = api.viewOf(caster);
    const tv = api.viewOf(target);
    const dir = caster.side === 'left' ? 1 : -1;
    const hits = (skill.hits as number) ?? 3;
    const atkScale = (skill.atkScale as number) ?? 2.3;
    const perHit = caster.atk * atkScale / hits;
    const colTargets = sameColumnFighters(api.allFighters, target).filter(t => t.alive && t.side !== caster.side);
    const touched: Fighter[] = [];
    const knockX = dir * 55;

    // 单体 3 连弹空 — 1:1 JS basic.js+basic-anim.js: 物理抛物线 juggle (见 buildJugglePhysics).
    //   tween 必须 target sprite, 否则 SkillTweenMgr.watchTick 见 getTweensOf(sprite) 为空 → 每帧
    //   强制龟归位, 飞行被打断. 故 tween 一个 no-op prop (rotation), onUpdate 用采样覆盖 x/y/rot.
    //   juggle fire-and-forget (2000ms): 3 段伤害 (0/220/440) 打完即 resolve, 镜头/施法者先回位,
    //   敌人在角落继续躺/起身 (视觉并行, 同 JS).
    const doJuggle = async (t: Fighter, tvT: NonNullable<ReturnType<typeof api.viewOf>>): Promise<void> => {
      const homeX = tvT.homeX, homeY = tvT.homeY;
      const sprite = tvT.sprite;
      const asSprite = sprite as Phaser.GameObjects.Sprite;
      // JS basic.js:450 — 弹空期间暂停精灵帧动画 (空中不再播 idle/walk 帧, 否则边飞边抖很乱), 落定恢复.
      if (asSprite.anims) asSprite.anims.pause();
      // 标 _inHop: 弹空(自定义抛投)期间, 让伤害飘字路径跳过通用受击帧+18px击退 (它们会与本 juggle
      //   抢 sprite 帧/位移 → 用户报"对面受击动画异常且卡顿")。结束(onComplete)清除。
      api.setInHop?.(t, true);
      const samples = buildJugglePhysics(knockX);
      scene.tweens.add({
        targets: sprite, rotation: 0, duration: JUGGLE_TOTAL_MS, ease: 'Linear',
        onUpdate: (tw) => {
          const p = sampleJuggle(samples, tw.progress);
          sprite.x = homeX + p.x;
          sprite.y = homeY + p.y;
          sprite.setRotation(Phaser.Math.DegToRad(p.rot));
        },
        onComplete: () => {
          sprite.x = homeX; sprite.y = homeY; sprite.setRotation(0);
          if (asSprite.anims) asSprite.anims.resume();
          api.setInHop?.(t, false);
        },
      });
      for (let i = 0; i < hits; i++) {
        if (!t.alive) break;
        const isCrit = rollCrit(effectiveCrit(caster));
        const dmg = dealPhysical(caster, t, perHit, isCrit);
        scene.cameras.main.shake(90, 0.0025);   // P19 用户改: 敌人每段受伤抖一下 (替代单次发波抖)
        if ('setTint' in sprite) {
          (sprite as Phaser.GameObjects.Sprite).setTint(0xffffff);
          scene.time.delayedCall(140, () => { try { (sprite as Phaser.GameObjects.Sprite).clearTint(); } catch { /* ignore */ } });
        }
        api.floatNum(t, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg', i * 40, i * 18);
        if (i < hits - 1) await sleep(220);
      }
      touched.push(t);
    };

    if (!cv || !tv) {
      // fallback: 无 view → 直接结算列伤害
      for (const t of colTargets) { const v = api.viewOf(t); if (v) await doJuggle(t, v); }
      return { touched };
    }

    const { width, height } = scene.scale.gameSize;
    const cam = scene.cameras.main;
    const cHomeX = cv.homeX, cHomeY = cv.homeY;
    const rowY = tv.homeY;                 // 目标所在横排 Y
    const cDepth = cv.sprite.depth;

    // 2) 青色 cut-in 500ms (JS basic-cutin)
    const cutin = scene.add.rectangle(width / 2, height / 2, width, height, 0x3c8cff, 0)
      .setDepth(70).setBlendMode(1 /* ADD */);
    scene.tweens.chain({
      targets: cutin,
      tweens: [{ alpha: 0.45, duration: 120 }, { alpha: 0.55, duration: 120 }, { alpha: 0, duration: 260 }],
      onComplete: () => cutin.destroy(),
    });
    await sleep(500);

    // 3) 走到目标排 (Y 对齐目标行, 保留 caster X) + 镜头拉近 (P170 后血条跟相机, 不 desync;
    //    血条留原地槽位 — 用户认可"走到目标排但血条放原地").
    cv.sprite.setDepth(50);
    // P216 修"放到一半被拽回": 全程在 cv.sprite 上挂连贯 tween (走到排 → 长 hold), 让
    //   SkillTweenMgr.watchTick 永远见 getTweensOf>0 而跳过复位; 且 hold tween 每帧把 y 钉在
    //   rowY, 即使别处想复位也被盖住。走回前 stop()。(同 turtleShieldBash 的"持续有 tween"姿势)
    const casterHold = scene.tweens.chain({
      targets: cv.sprite,
      tweens: [
        { y: rowY, duration: 280, ease: 'cubic.out' },
        { y: rowY, duration: 8000, ease: 'Linear' },   // 占位 hold (无位移), 走回前 stop()
      ],
    });
    // P19 对齐 JS basic.js:304-315: transform-origin 在焦点(施法者↔目标中点 X / 目标排中心 Y) 处 scale 1.2,
    //   即"原地放大" — 焦点保持在原屏幕位置, 不移到画面中心。Phaser 无 origin-zoom, 用 pan 到
    //   "保持焦点不动"所需的相机中心: panC = 屏心 + (焦点-屏心)×(1-1/zoom)。
    const _zoom = 1.2;
    const focusX = (cHomeX + tv.homeX) / 2, focusY = rowY;
    const panX = width / 2 + (focusX - width / 2) * (1 - 1 / _zoom);
    const panY = height / 2 + (focusY - height / 2) * (1 - 1 / _zoom);
    cam.zoomTo(_zoom, 400, 'Sine.easeInOut');
    cam.pan(panX, panY, 400, 'Sine.easeInOut');
    await sleep(300);

    // 4) 蓄力 windup (字幕 + 脉冲) — JS basic-chiwave-charging (CSS scale 脉冲). Sine 缓动防生硬.
    //   注: 必须传非命中类 ('passive-num'). 否则缺 explicitCls + 该蓝色未被识别 → 默认 direct-dmg(命中类),
    //   会让施法者自己播受击动画+红闪+击退 (用户报"放龟派气波小龟自己受伤"). 见 floatNum 颜色推断兜底.
    api.floatNum(caster, '⚡蓄气中...', '#58a6ff', 'passive-num');
    // 不做缩放脉冲: 攻击动画会切纹理(playAction → refitByTexture 改 homeScaleX), 缩放 tween 跨纹理
    //   切换会被归位逻辑拉到错误 scale → 体型突变(用户反复报)。蓄力提示交给字幕/特效, 不动 scale。
    await sleep(550);

    // 5) 发射: 气波从胸口横向 travel 贯穿目标列 (15帧 anim 边播边飞).
    //    P190 去自创: 删 caster "前冲 12px" 急跳 — JS basic.js 蓄力后直接发波, caster 不前冲位移
    //    (那段无缓动 linear jab 是 PoC 自加, 用户报"向前跳很生硬, 不知道加了什么").
    const startX = cHomeX + dir * 36;
    // P191 1:1 JS: 波终点锚到目标列"后排槽位"固定坐标 (含空位/已阵亡 → 波速恒定, 与死活无关).
    //   拿不到槽位 (无 _slotKey / 无 api) 时回退到存活最远目标.
    const targetCol = (target._slotKey ?? '').split('-')[1];
    let endRefX = startX;
    if (targetCol != null && targetCol !== '' && api.slotCoords) {
      endRefX = api.slotCoords(target.side, `back-${targetCol}`).x;
    } else {
      for (const t of colTargets) { const v = api.viewOf(t); if (v) endRefX = dir > 0 ? Math.max(endRefX, v.homeX) : Math.min(endRefX, v.homeX); }
    }
    const endX = endRefX + dir * 70;
    const travelMs = 1500;   // P189 1:1 JS WAVE_DURATION_MS (匀速 linear, 不是加速)
    if (scene.textures.exists('vfx-basic-chiwave')) {
      // P191: 波起于胸口高度 (rowY - 15, 1:1 JS startY = body center - 15), 不是正中心
      const wave = scene.add.sprite(startX, rowY - 15, 'vfx-basic-chiwave').setDepth(31).setDisplaySize(256, 256);  // JS scene.css:468 基础尺寸 (desktop ×1.4=358 太大, 用户实测取 256)
      if (caster.side === 'right') wave.setFlipX(true);
      try { wave.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
      if (scene.anims.exists('anim-basic-chiwave')) wave.play('anim-basic-chiwave');
      scene.tweens.add({
        targets: wave, x: endX, duration: travelMs, ease: 'Linear',
        onComplete: () => { scene.tweens.add({ targets: wave, alpha: 0, duration: 130, onComplete: () => { try { wave.destroy(); } catch { /* ignore */ } } }); },  // 末帧淡出 (替代 hold 220ms freeze)
      });
    }

    // 6) per-target: 波头(视觉前沿)扫到该目标近边时弹空 3 连 (碰撞驱动 stagger, 近的先弹).
    //    1:1 JS basic.js: delay = max(80, travelMs × 行进比例); 波匀速 → 比例即距离比例.
    const total = (endX - startX) || dir;
    await Promise.all(colTargets.map(async (t) => {
      const tvT = api.viewOf(t);
      if (!tvT) return;
      // 波中心行进到 (目标近边 - 视觉前沿 lead) 时触发, 视觉上波头刚接触目标 (JS WAVE_VISUAL_LEAD 同理)
      const triggerCenterX = tvT.homeX - dir * 120;
      const frac = Math.max(0, Math.min(1, (triggerCenterX - startX) / total));
      await sleep(Math.max(80, Math.round(frac * travelMs)));
      if (t.alive) await doJuggle(t, tvT);
    }));

    // 6.5) P201 镜头拉远晚一点: 3 段伤害结算 (~440ms) 后击飞弧线 (2000ms) 仍在空中,
    //   原来镜头立刻拉远 → 龟还在半空就拉走了. 多停留片刻, 让观众看到击飞顶点+下落再拉回.
    await sleep(560);

    // 7) caster 走回原位 + 镜头拉回 (先停 hold tween, 否则与走回 tween 抢 y)
    casterHold.stop();
    scene.tweens.add({ targets: cv.sprite, x: cHomeX, y: cHomeY, duration: 300, ease: 'cubic.inOut', onComplete: () => cv.sprite.setDepth(cDepth) });
    cam.zoomTo(1.0, 320, 'Sine.easeInOut');
    cam.pan(width / 2, height / 2, 320, 'Sine.easeInOut');
    await sleep(320);
    return { touched };
  },

  // P31 basicSlam KOF 1:1 JS basic.js:552-765 (压缩 ~210 行 → ~70 行实质保留所有阶段)
  //   Phase 1: 相机 zoom 1.22 @380ms anchored to mid-row (JS:582-590)
  //   Phase 2: caster dash 到 target 旁边 (gap 58px), 280ms (JS:596-605)
  //   Phase 3: grab moment — 双方 chi-hit-flash + sleep 120 (JS:608-613)
  //   Phase 4: throw parabola — target 飞过 caster 上方 to 远端, peakY=-115, 520ms (JS:607-673)
  //   Phase 5: slam impact + dmg main + splash, sleep 340 lying (JS:675-720)
  //   Phase 6: return hop, dash back, zoom reset, 420+340+340ms (JS:735-760)
  basicSlam: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const scene = api.scene;
    const cv = api.viewOf(caster);
    const tv = api.viewOf(target);
    if (!cv || !tv) {
      // Fallback: no views → just dmg
      const mainDmg = caster.atk * ((skill.atkScale as number) ?? 0.7)
                    + target.maxHp * ((skill.targetHpPct as number) ?? 26) / 100;
      const dmgMain = dealPhysical(caster, target, mainDmg, rollCrit(effectiveCrit(caster)));
      api.floatNum(target, `${dmgMain}`, '#ff4444', 'direct-dmg');
      return { touched: [target] };
    }
    const dir = caster.side === 'left' ? 1 : -1;
    const cam = scene.cameras.main;
    const cHomeX = cv.homeX, cHomeY = cv.homeY;
    const tHomeX = tv.homeX, tHomeY = tv.homeY;
    // P155: 无相机 zoom (DOM 血条不跟随 → desync). JS dash 与 zoom 并发, 无独立 windup → 不 sleep.
    // Phase 2: caster dash 到 target 旁 (gap 58px, JS basic.js:573/592), 280ms; JS:594 await 310
    const grabX = tHomeX - dir * 58;
    const fc = api.formationCenter?.(target.side) ?? { x: tHomeX, y: tHomeY };
    const throwLandX = fc.x, throwLandY = fc.y;
    const peakAir = -135;        // 抛起高度 (px, 屏幕向上为负)
    const throwMs = 560;
    const proneAngle = 78 * dir;
    // P163 caster: 一条连贯 chain 跑完全程 (蓄力→冲刺→抓取期 hold→冲回→落定). 全程保持挂在 cv.sprite
    //   上的 active tween → SkillTweenMgr 看门狗 getTweensOf 看得见就放过, 不会在 hold 期把 caster 拽回
    //   home. (api.viewOf 返回的是副本, _inHop 设不到真 view; 靠"持续有 tween"防, 才是 Phaser 正确姿势.)
    scene.tweens.chain({
      targets: cv.sprite,
      tweens: [
        { x: cHomeX - dir * 12, y: cHomeY + 2, duration: 130, ease: 'Sine.easeIn' },   // 蓄力后撤
        { x: grabX, y: tHomeY, duration: 230, ease: 'Quart.easeOut' },                  // 爆发冲刺
        // P168: hold 680→1030 — 抓取(120)+抛掷(560)=680 到目标落地, 再多停 350ms 看砸地, 之后才回
        //   (用户要求"目标落地后小龟再往回走", 之前 caster 在目标落地同时就走 = 太早).
        { x: grabX, y: tHomeY, duration: 1030 },                                         // 抓取+抛掷+落地后驻留
        { x: cHomeX, y: cHomeY - 3, duration: 300, ease: 'Cubic.easeInOut' },           // 落地后才冲回
        { y: cHomeY, duration: 90, ease: 'Sine.easeIn' },                                // 落定
      ],
    });
    await sleep(360);
    // Phase 3: grab moment — flash both sprites + sleep 120 (JS:597-603)
    if ('setTint' in cv.sprite) (cv.sprite as Phaser.GameObjects.Sprite).setTint(0xffffff);
    if ('setTint' in tv.sprite) (tv.sprite as Phaser.GameObjects.Sprite).setTint(0xffffff);
    scene.time.delayedCall(180, () => {
      try { (cv.sprite as Phaser.GameObjects.Sprite).clearTint(); } catch { /* ignore */ }
      try { (tv.sprite as Phaser.GameObjects.Sprite).clearTint(); } catch { /* ignore */ }
    });
    await sleep(120);
    // Phase 4-6 (P163 用户理想动画): target 一条连贯 chain — 抛向敌方 6 格正中心 + 空中转一圈 →
    //   落地摔趴 → 趴停 → 起身 → 走回原位. 全程挂在 tv.sprite 上的 active tween (看门狗 getTweensOf
    //   看得见 → 不拽回 home); 抛物线弧度在第①段 onUpdate 叠加在缓动 base-y 上.
    tv.sprite.angle = 0;
    // 标 _inHop: 抛掷(自定义抛投)期间, 让伤害飘字路径 + dealPhysical 内击退都跳过 (受击帧/18px击退会
    //   与本抛投 chain 抢 sprite → 用户报"过肩摔目标异常")。chain onComplete 清除。
    api.setInHop?.(target, true);
    scene.tweens.chain({
      targets: tv.sprite,
      tweens: [
        {
          // P164 重力抛物线: 抛体水平无受力 → x/旋转 匀速 (ease Linear); 竖直 = 线性 base +
          //   重力弧 4p(1-p) (匀加速, d²h/dp²=const=重力, 落地段越来越快). 旧三角 norm (JS 同款)
          //   是匀速升降、无加速度 → 飘/机械, 不符重力. 这是按新方针优化 JS 的点.
          x: throwLandX, y: throwLandY, angle: dir * 360,
          duration: throwMs, ease: 'Linear',
          onUpdate: (tw) => {
            const p = tw.progress;
            tv.sprite.y += peakAir * 4 * p * (1 - p);   // 重力弧: 0→峰(p=.5)→0, 落地加速砸下
          },
        },
        { angle: proneAngle, y: throwLandY + 5, duration: 120, ease: 'Quad.easeIn' },   // 落地摔趴
        { angle: proneAngle, y: throwLandY + 5, duration: 320 },                         // 趴停 (保持 tween active)
        { angle: 0, y: throwLandY, duration: 220, ease: 'Back.easeOut' },                // 起身 (角度回正+弹一下)
        { x: tHomeX, y: tHomeY, duration: 400, ease: 'Cubic.easeInOut' },                // 走回原位
      ],
      onComplete: () => { tv.sprite.x = tHomeX; tv.sprite.y = tHomeY; tv.sprite.angle = 0; api.setInHop?.(target, false); },
    });
    await sleep(throwMs);   // 等抛掷段落地 → 此刻砸地
    // Phase 5: 砸地 — main dmg + 9帧砸地特效 + shake + splash
    const isCrit = rollCrit(effectiveCrit(caster));
    const mainDmg = caster.atk * ((skill.atkScale as number) ?? 0.7)
                  + target.maxHp * ((skill.targetHpPct as number) ?? 26) / 100;
    const dmgMain = dealPhysical(caster, target, mainDmg, isCrit);
    api.floatNum(target, `${dmgMain}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
    cam.shake(260, 0.012);
    // 9帧 spritesheet anim (JS scene.css:748-762 steps(9) 720ms), 在 6 格中心落点
    if (scene.textures.exists('vfx-basic-slam-impact')) {
      const imp = scene.add.sprite(throwLandX, throwLandY, 'vfx-basic-slam-impact')
        .setDepth(35).setDisplaySize(400, 400);   // P166: 蘑菇云 ×2 (用户要求 200→400)
      try { imp.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
      if (scene.anims.exists('anim-basic-slam-impact')) imp.play('anim-basic-slam-impact');
      imp.once('animationcomplete', () => imp.destroy());
      scene.time.delayedCall(760, () => { try { imp.destroy(); } catch { /* ignore */ } });
    }
    const touched: Fighter[] = [target];
    const others = getEnemies(api, caster).filter(e => e !== target && e.alive);
    for (const o of others) {
      const splashBase = caster.atk * ((skill.splashAtkScale as number) ?? 0.2)
                       + target.maxHp * ((skill.splashHpPct as number) ?? 19) / 100;
      const d = dealPhysical(caster, o, splashBase, false);
      api.floatNum(o, `${d}`, '#ff4444', 'direct-dmg');
      touched.push(o);
    }
    void cam;  // P155: 无 zoom/pan
    // 等目标 chain 剩余 (摔趴120 + 趴停320 + 起身220 + 走回400 = 1060) 跑完; caster 返回并发其中
    await sleep(1060);
    return { touched };
  },

  // ── 通用团队护盾 (stone 岩石护甲 / bubble 等) ──
  // JS combat.js:518-529 doShield 1:1 — 护盾量基于 CASTER 的 maxHp/atk (各组件单独 round),
  // 全员获得相同的盾值, 最后 ×shieldMult (铁壁之日 ×2)。永久盾 (shieldDuration 仅用于状态图标显示)。
  shield: async (api, caster, _target, skill) => {
    const aoeAlly = skill.aoeAlly as boolean | undefined;
    const allies = aoeAlly ? getAllies(api, caster) : [caster];
    const flat = (skill.shieldFlat as number) ?? 0;
    const atkScale = (skill.shieldAtkScale as number) ?? 0;
    const hpPct = (skill.shieldHpPct as number) ?? 0;
    const healHpPct = (skill.healHpPct as number) ?? 0;   // #8 H5: 附带回血 (焦糖铠 {H:HP*0.1})
    const dur = (skill.shieldDuration as number) ?? 3;
    let base = (skill.shield as number) ?? 0;
    base += flat;
    if (hpPct) base += Math.round(caster.maxHp * hpPct / 100);
    if (atkScale) base += Math.round(caster.atk * atkScale);
    const amt = Math.round(base * ruleModifiers.shieldMult());
    const healAmt = healHpPct > 0 ? Math.round(caster.maxHp * healHpPct / 100) : 0;
    for (const a of allies) {
      applyShield(a, amt);
      a.buffs.push({ type: 'shield', value: amt, duration: dur });
      api.floatNum(a, `+${amt}`, '#c0c0c0', 'shield-num');
      if (healAmt > 0) {
        const healed = applyHeal(a, healAmt, caster);
        if (healed > 0) api.floatNum(a, `+${healed}`, '#06d6a0', 'heal');
      }
    }
    return { touched: allies };
  },

  // P16: 读 skill.shieldScale (JS common.js:13-25 1:1), 替代之前硬编码 0.3
  commonTeamShield: async (api, caster, _target, skill) => {
    const allies = getAllies(api, caster);
    const shieldScale = (skill.shieldScale as number) ?? 0.5;
    const duration = (skill.shieldDuration as number) ?? 3;
    const amt = Math.round(caster.atk * shieldScale);
    for (const a of allies) {
      applyShield(a, amt);
      // JS 用 buff 形式 (有 duration), 不是永久 shield 数值
      a.buffs.push({ type: 'shield', value: amt, duration: duration + 1 });
      api.floatNum(a, `+${amt}`, '#c0c0c0', 'shield-num');
    }
    return { touched: allies };
  },

  // P16: 改 turn-bounded atkUp buff (JS common.js:28-45 1:1), 之前永久 baseAtk multiply 不会过期
  commonAtkBuff: async (api, caster, _target, skill) => {
    const allies = getAllies(api, caster);
    const pct = (skill.atkUpPct as number) ?? (skill.atkBuffPct as number) ?? 15;
    const turns = (skill.atkUpTurns as number) ?? 3;
    for (const a of allies) {
      const atkGain = Math.round(a.baseAtk * pct / 100);
      a.buffs.push({ type: 'atkUp', value: atkGain, duration: turns + 1 });
      api.floatNum(a, `+${atkGain}攻 ${turns}t`, '#ffd93d');
    }
    return { touched: allies };
  },

  // ── 天使系列 ──
  // JS angel.js:1-18 doAngelBless 1:1 — 单友军 (isAlly:true target) 永久盾 + defUp/mrUp buff
  //   shield = round(atk × shieldScale)  (默认 1.2)
  //   defGain = round(atk × defBoostScale)  (默认 0.15)
  //   buff: defUp {value:defGain, turns:defBoostTurns}, mrUp 同
  //   shieldTurns 在 JS 也存但似乎没消费 (永久盾)
  // 旧 Phaser 版是 aoeAlly heal — 完全错!
  // P36 angelBless 1:1 JS skills/angel.js:1-18
  angelBless: async (api, caster, target, skill) => {
    if (!target) target = caster;
    const shieldScale = (skill.shieldScale as number) ?? 1.2;
    const shieldTurns = (skill.shieldTurns as number) ?? 3;
    const defBoostScale = (skill.defBoostScale as number) ?? 0.15;
    const defBoostTurns = (skill.defBoostTurns as number) ?? 4;
    const shieldAmt = Math.round(Math.round(caster.atk * shieldScale) * ruleModifiers.shieldMult());
    const defGain = Math.round(caster.atk * defBoostScale);
    applyShield(target, shieldAmt);
    target.buffs.push({ type: 'defUp', value: defGain, duration: defBoostTurns + 1 });
    target.buffs.push({ type: 'mrUp', value: defGain, duration: defBoostTurns + 1 });
    // JS:10-11 spawnFloatingNum: '+{shieldAmt}' shield-num, '+{defGain}护甲&魔抗' passive-num
    api.floatNum(target, `+${shieldAmt}`, '#c0c0c0', 'shield-num');
    api.floatNum(target, `+${defGain}护甲&魔抗`, '#ffd86b', 'passive-num');
    api.log?.(`${caster.emoji}${caster.name} <b>祝福</b> → ${target.emoji}${target.name}：+${shieldAmt}护盾(${shieldTurns}回合) + ${defGain}护甲&魔抗(${defBoostTurns}回合)`);
    await sleep(1000);   // JS:17
    return { touched: [target] };
  },

  // JS angel.js:114-168 doAngelSmite 1:1 — 自动 target 最高 _dmgDealt 敌, waveCount 道波,
  //   每道 atk×atkScale 物理, +chilled/healReduce buff, +永久偷 stealAmt 护甲魔抗
  // 旧 Phaser: 单段 magic dmg, 无 auto-target, 无 buff, 无 steal — 严重缺失
  angelSmite: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    if (enemies.length === 0) return { touched: [] };
    // auto-target: 选 _dmgDealt 最高 (JS:118-121)
    let maxD = -1;
    for (const e of enemies) {
      const d = ((e as Fighter & { _dmgDealt?: number })._dmgDealt) ?? 0;
      if (d > maxD) maxD = d;
    }
    const tied = enemies.filter(e => (((e as Fighter & { _dmgDealt?: number })._dmgDealt) ?? 0) === maxD);
    const tgt = tied[Math.floor(Math.random() * tied.length)];
    if (!tgt) return { touched: [] };
    const waveCount = (skill.waveCount as number) ?? 3;
    const atkScale = (skill.atkScale as number) ?? 1.5;
    let totalDmg = 0;
    for (let w = 0; w < waveCount; w++) {
      if (!tgt.alive) break;
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      const eDef = calcEffArmor(caster, tgt);
      const dmg = Math.max(1, Math.round(caster.atk * atkScale * critMult * calcDmgMult(eDef)));
      const wasA = tgt.alive;
      const r = applyRawDamage(tgt, dmg, 'physical');
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      totalDmg += shown;
      battleStats.recordDamage(caster, tgt, shown, 'phy');
      if (wasA && !tgt.alive) battleStats.recordKill(caster, tgt);
      // P82 1:1 JS angel.js:135 — '${shown}⚡' (有 ⚡ 后缀), delay w*80, yOff=0
      api.floatNum(tgt, `${shown}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg', w * 80, 0);
      triggerOnHitEffects(caster, tgt, dmg, { floatNum: api.floatNum });
      await sleep(160);
    }
    // chill + healReduce buff (JS:141-152)
    if (tgt.alive) {
      tgt.buffs.push({ type: 'chilled', value: 20, duration: ((skill.chillTurns as number) ?? 3) + 1 });
      const hr = tgt.buffs.find(b => b.type === 'healReduce');
      const hrTurns = ((skill.healReduceTurns as number) ?? 3) + 1;
      const hrPct = (skill.healReducePct as number) ?? 50;
      if (hr) {
        hr.value = Math.max(hr.value, hrPct);
        hr.duration = Math.max(hr.duration ?? 0, hrTurns);
      } else {
        tgt.buffs.push({ type: 'healReduce', value: hrPct, duration: hrTurns });
      }
    }
    // 永久偷护甲魔抗 (JS:153-165)
    const lvl = Math.max(1, ((caster as Fighter & { _level?: number })._level) ?? 1);
    const stealAmt = Math.round(((skill.baseStealDR as number) ?? 3) + (lvl - 1) * ((skill.perLevelStealDR as number) ?? 0.2));
    if (stealAmt > 0) {
      tgt.baseDef = Math.max(0, tgt.baseDef - stealAmt);
      tgt.baseMr = Math.max(0, (tgt.baseMr ?? tgt.baseDef) - stealAmt);
      tgt.def = tgt.baseDef;
      tgt.mr = tgt.baseMr;
      caster.baseDef += stealAmt;
      caster.baseMr = (caster.baseMr ?? caster.baseDef) + stealAmt;
      caster.def = caster.baseDef;
      caster.mr = caster.baseMr;
      // JS angel.js:155-159 spawnFloatingNum '-X护甲魔抗' debuff-num / '+X护甲魔抗' passive-num
      api.floatNum(tgt, `-${stealAmt}护甲魔抗`, '#ef4444', 'debuff-label');
      api.floatNum(caster, `+${stealAmt}护甲魔抗`, '#fbbf24', 'passive-num');
    }
    api.log?.(`${caster.emoji}${caster.name} <b>神罚</b> → ${tgt.emoji}${tgt.name}：${totalDmg} 物理 + 冰寒/治疗削减 + 永久偷 ${stealAmt} 护甲魔抗`);
    return { touched: [tgt, caster] };
  },

  // ── 幽灵系列 (ghost) — JS skills/ghost.js 完整移植 ──
  // 幽魂触碰 (basic): physical normalScale + true pierceScale, 同段独立 crit
  ghostTouch: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const normalScale = (skill.normalScale as number) ?? 0.4;
    const pierceScale = (skill.pierceScale as number) ?? 0.9;
    const isCrit = rollCrit(effectiveCrit(caster));
    const critMult = isCrit ? calcCritMult(caster) : 1;
    const pMult = passiveDmgMult(caster, target);
    // 物理段 (走 DEF)
    let nShown = 0;
    if (normalScale > 0) {
      const base = caster.atk * normalScale;
      const dmg = Math.max(1, Math.round(base * pMult * critMult * calcDmgMult(calcEffArmor(caster, target))));
      const wasAlive = target.alive;
      const r = applyRawDamage(target, dmg);
      nShown = r.hpLoss + r.shieldAbs;
      battleStats.recordDamage(caster, target, nShown, 'phy');
      if (wasAlive && !target.alive) battleStats.recordKill(caster, target);
      triggerOnHitEffects(caster, target, nShown, _skillApi ? { floatNum: _skillApi.floatNum } : {});
    }
    // 真伤段 (无视 DEF)
    let pShown = 0;
    if (pierceScale > 0 && target.alive) {
      const dmg = Math.max(1, Math.round(caster.atk * pierceScale * pMult * critMult));
      const wasAlive = target.alive;
      const r = applyRawDamage(target, dmg);
      pShown = r.hpLoss + r.shieldAbs;
      battleStats.recordDamage(caster, target, pShown, 'tru');
      if (wasAlive && !target.alive) battleStats.recordKill(caster, target);
      triggerOnHitEffects(caster, target, pShown, _skillApi ? { floatNum: _skillApi.floatNum } : {});
    }
    // P86 1:1 JS ghost.js:22-30 — spawn ghost-touch VFX at target (700ms 7-frame)
    const tv0 = api.viewOf(target);
    if (tv0) spawnGhostVfx(api.scene, tv0.sprite.x, tv0.sprite.y, 'vfx-ghost-touch', caster.side, 128);
    // P25: 显式 yOffset (JS ghost.js:32-33 1:1) — TRUE 在上 yOffset=22, 物理在下 yOffset=0
    api.floatNum(target, `${nShown}`, '#ff4444', 'direct-dmg', 0, 0);
    if (pShown > 0) api.floatNum(target, `${pShown}`, '#ffffff', 'true-dmg', 0, 22);
    applyPostHitLayers(caster, target, nShown + pShown, isCrit, 'physical');
    api.log?.(`${caster.emoji}${caster.name} <b>幽魂触碰</b> → ${target.emoji}${target.name}：${nShown}物理 + ${pShown}真实`);
    return { touched: [target] };
  },

  // 幽冥突袭: magic dmg + lifesteal 80% + dodge buff 25% 2 turns
  ghostPhantom: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    // 不预乘暴击: 交给 dealMagic 内部单次 roll (原"base 预乘 critMult + dealMagic 再 roll"=双重暴击)
    const base = caster.atk * ((skill.atkScale as number) ?? 1.5);
    // 抑制 dealMagic 内的通用 18px sceneKnockback (JS doGhostPhantom 用 applyRawDmg 不击退,
    //   再单独播完整 1400ms 击退 juggle)。否则两套位移 tween 同时拽 sprite → 抖动「诡异」(用户报)。
    (target as Fighter & { _knockUntil?: number })._knockUntil = api.scene.time.now + 1500;
    const dmg = dealMagic(caster, target, base);
    // 生命偷取
    const lifestealPct = (skill.lifestealPct as number) ?? 80;
    const heal = Math.round(dmg * lifestealPct / 100);
    if (heal > 0) {
      applyHeal(caster, heal);
      api.floatNum(caster, `+${heal}`, '#06d6a0', 'heal-num');
      // K11: 绿色扩散治疗光环 (JS ghost.js:256-262 .ghost-heal-aura, 540ms 扩散+淡出)
      const cv = api.viewOf(caster);
      if (cv) {
        const ring = api.scene.add.circle(cv.sprite.x, cv.sprite.y, 30, 0x06d6a0, 0)
          .setStrokeStyle(3, 0x4dffb0, 0.9).setDepth(3).setScale(0.4);
        api.scene.tweens.add({
          targets: ring, scale: 1.7, alpha: 0, duration: 540, ease: 'Cubic.easeOut',
          onComplete: () => ring.destroy(),
        });
      }
    }
    // 闪避 buff
    const dodgePct = (skill.dodgePct as number) ?? 25;
    const dodgeTurns = (skill.dodgeTurns as number) ?? 2;
    caster.buffs.push({ type: 'dodge', value: dodgePct, duration: dodgeTurns + 1 });
    // P86 1:1 JS ghost.js:195-217 — 命中处叠两层 VFX: 幻影(5帧500ms) + 普攻命中触碰(7帧700ms)
    //   K11: 之前只播 phantom, 漏了 JS 的二段 ghost-touch overlay (增加冲击力)。
    const ptv = api.viewOf(target);
    if (ptv) {
      spawnGhostVfx(api.scene, ptv.sprite.x, ptv.sprite.y, 'vfx-ghost-phantom', caster.side, 128);
      spawnGhostVfx(api.scene, ptv.sprite.x, ptv.sprite.y, 'vfx-ghost-touch', caster.side, 112);
    }
    api.floatNum(target, `${dmg}`, '#4dabf7', 'magic-dmg');
    // (applyPostHitLayers 已由 dealMagic 内部调用; 原此处重复 → 审判/溅射双触发, 删)
    // P83 1:1 JS ghost.js:226-247 — 完整 13-keyframe 击退 juggle (1400ms), 与龟盾 turtleShieldBash
    //   同款 keyframes (低弧 peakY-42 + 远落点 44 + 倒地 prone-82° + 自起走回)。tweens.chain 在
    //   sprite 上跑, watcher 经 getTweensOf 检测到 → 不会每帧拽回 home, 无需 _inHop。
    if (target.alive) {
      const tv = api.viewOf(target);
      if (tv) {
        const knockDir = caster.side === 'left' ? 1 : -1;
        const proneRot = -82 * Math.PI / 180 * knockDir;   // JS ghost.js:231 倒地姿态
        const homeX = tv.homeX, homeY = tv.homeY;
        api.scene.tweens.chain({
          targets: tv.sprite,
          tweens: [
            // 升空后仰 (offset 0.10 / 0.22 / 0.33)
            { x: homeX + 14 * knockDir, y: homeY - 28, rotation: 20 * Math.PI / 180 * knockDir, duration: 140, ease: 'cubic.out' },
            { x: homeX + 30 * knockDir, y: homeY - 42, rotation: 50 * Math.PI / 180 * knockDir, duration: 168, ease: 'cubic.in' },
            { x: homeX + 42 * knockDir, y: homeY - 6,  rotation: 80 * Math.PI / 180 * knockDir, duration: 154, ease: 'cubic.in' },
            // 砸地 / 弹跳 / 保持倒地 (0.38 / 0.42 / 0.55)
            { x: homeX + 44 * knockDir, y: homeY + 8, rotation: proneRot, duration: 70,  ease: 'Sine.easeOut' },
            { x: homeX + 44 * knockDir, y: homeY + 2, rotation: proneRot, duration: 56,  ease: 'sine.in' },
            { x: homeX + 44 * knockDir, y: homeY + 5, rotation: proneRot, duration: 182, ease: 'Sine.easeOut' },
            // 起身 (0.64 / 0.70)
            { x: homeX + 44 * knockDir, y: homeY,     rotation: proneRot * 0.4, duration: 126, ease: 'Sine.easeOut' },
            { x: homeX + 44 * knockDir, y: homeY - 2, rotation: 0,              duration: 84,  ease: 'sine.inOut' },
            // 走回原位 (0.80 / 0.88 / 0.95 / 1.0)
            { x: homeX + 30 * knockDir, y: homeY - 3, duration: 140, ease: 'sine.inOut' },
            { x: homeX + 18 * knockDir, y: homeY,     duration: 112, ease: 'sine.inOut' },
            { x: homeX +  8 * knockDir, y: homeY - 2, duration: 98,  ease: 'sine.inOut' },
            { x: homeX,                 y: homeY,     rotation: 0, duration: 70 },
          ],
        });
      }
    }
    api.log?.(`${caster.emoji}${caster.name} <b>幽冥突袭</b> → ${target.emoji}${target.name}：${dmg}魔法 + ${heal}回血 + ${dodgePct}%闪避${dodgeTurns}回合`);
    return { touched: [target] };
  },

  // 灵魂风暴: 已诅咒时改 2 段真伤 (不重复诅咒); 未诅咒时 2 段魔法 + 施加诅咒 3 回合
  ghostStorm: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const hasCurse = target.buffs.some(b => b.type === 'curse');
    const hits = (skill.hits as number) ?? 2;
    const atkScale = (skill.atkScale as number) ?? 1.25;
    const dotTurns = (skill.dotTurns as number) ?? 3;
    let totalDmg = 0;
    // P86 1:1 JS ghost.js:123-127 — spawn ghost-storm VFX at target (800ms 8-frame, 96×96 display)
    const stv = api.viewOf(target);
    if (stv) spawnGhostVfx(api.scene, stv.sprite.x, stv.sprite.y, 'vfx-ghost-storm', caster.side, 96);
    for (let i = 0; i < hits; i++) {
      if (!target.alive) break;
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      const base = caster.atk * atkScale * critMult;
      if (hasCurse) {
        // 真伤
        const dmg = Math.max(1, Math.round(base * passiveDmgMult(caster, target)));
        const wasAlive = target.alive;
        const r = applyRawDamage(target, dmg);
        const s = r.hpLoss + r.shieldAbs;
        totalDmg += s;
        battleStats.recordDamage(caster, target, s, 'tru');
        if (wasAlive && !target.alive) battleStats.recordKill(caster, target);
        triggerOnHitEffects(caster, target, s, _skillApi ? { floatNum: _skillApi.floatNum } : {});
        api.floatNum(target, `${s}`, '#ffffff', 'true-dmg');
      } else {
        // 传未乘暴击的 base (上面 base 已含 critMult 供真伤段用); dealMagic 自行单次 roll → 避免双重暴击
        const s = dealMagic(caster, target, caster.atk * atkScale);
        totalDmg += s;
        api.floatNum(target, `${s}`, '#4dabf7', 'magic-dmg');
      }
      if (i < hits - 1) await sleep(500);  // E3/8: JS combat.js:266 同款 500ms 间隔
    }
    if (!hasCurse) {
      // duration +1: 回合开始先扣1层再结算诅咒伤害, +1 才能跳满描述的 dotTurns 次 (与登场被动怨灵 turns+1 统一)
      target.buffs.push({ type: 'curse', value: Math.round(target.maxHp * 0.05), duration: dotTurns + 1, _src: caster });
      api.floatNum(target, `诅咒 ${dotTurns}t`, '#9b59b6');
    }
    api.log?.(`${caster.emoji}${caster.name} <b>灵魂风暴</b> → ${target.emoji}${target.name}：${totalDmg}${hasCurse ? '真实' : '魔法+诅咒'}`);
    return { touched: [target] };
  },

  // 虚化: 自施 physImmune 2 回合 + 2 段真伤
  ghostPhase: async (api, caster, target, skill) => {
    const phaseTurns = (skill.phantomTurns as number) ?? 2;
    const reducePct = (skill.physReducePct as number) ?? 90;
    caster.buffs.push({ type: 'physImmune', value: reducePct, duration: phaseTurns + 1 });
    api.floatNum(caster, `虚化-${reducePct}%物理`, '#c77dff');
    // K4: 虚化 13 帧序列盖在 caster 身上 (JS ghost.js:62 playFighterSprite phase.png)
    const cvP = api.viewOf(caster);
    const cvPs = cvP?.sprite as Phaser.GameObjects.Sprite | undefined;
    const canPhase = !!cvPs && 'play' in cvPs
      && api.scene.anims.exists('anim-phase-ghost') && api.scene.textures.exists('pet-action-ghost-phase');
    if (canPhase) { cvPs!.setTexture('pet-action-ghost-phase', 0); cvPs!.play('anim-phase-ghost'); }
    if (!target) return { touched: [caster] };
    const hits = (skill.hits as number) ?? 2;
    const atkScale = (skill.atkScale as number) ?? 0.6;
    const touched: Fighter[] = [caster];
    for (let i = 0; i < hits; i++) {
      if (!target.alive) break;
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      const dmg = Math.max(1, Math.round(caster.atk * atkScale * passiveDmgMult(caster, target) * critMult));
      const wasAlive = target.alive;
      const r = applyRawDamage(target, dmg);
      const s = r.hpLoss + r.shieldAbs;
      battleStats.recordDamage(caster, target, s, 'tru');
      if (wasAlive && !target.alive) battleStats.recordKill(caster, target);
      triggerOnHitEffects(caster, target, s, _skillApi ? { floatNum: _skillApi.floatNum } : {});
      api.floatNum(target, `${s}`, '#ffffff', 'true-dmg');
      if (i < hits - 1) await sleep(500);  // E3/8: JS combat.js:266 同款 500ms 间隔
    }
    touched.push(target);
    // K4: 还原 idle 序列
    if (canPhase && api.scene.anims.exists('anim-idle-ghost') && api.scene.textures.exists('pet-sheet-ghost')) {
      cvPs!.setTexture('pet-sheet-ghost', 0); cvPs!.play('anim-idle-ghost');
    }
    api.log?.(`${caster.emoji}${caster.name} <b>虚化</b> → ${target.emoji}${target.name}：${hits}段真实 (-${reducePct}%物理 ${phaseTurns}回合)`);
    return { touched };
  },

  // ghostEnhancedCurse: passiveSkill — 死亡时触发, 这里 handler 走完 (no-op), 由 onDeath hook 处理
  ghostEnhancedCurse: async (_api, caster, _target, _skill) => {
    return { touched: [caster] };
  },

  // 旧名兼容
  // P16: ghostBlast 已删除 — JS skills/ghost.js 不存在此 type, pets.ts 也没 ghostBlast skill row.
  // 之前 demo 代码遗留.

  // ── 忍者系列 (ninja) — JS skills/ninja.js 完整移植 ──
  // 冲击: 主目标 1.3×ATK + 身后单位 0.8×ATK
  // P73 ninjaImpact 1:1 JS ninja.js:155-374 (220 行完整动画)
  //   Phase 0: Run to target row (400ms) — caster body translateY(rowYShift)
  //   Phase 1: F1-3 windup (300ms) — caster 等待 sprite anim
  //   Phase 2: F4-8 flight (500ms) — dash forward + trail + 主/身后 hits mid-flight
  //   Phase 3-5: planting (500ms) + still (100ms) + 闪回 home + recovery (400ms)
  //   Camera shake on arrival
  ninjaImpact: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const cv = api.viewOf(caster);
    const tv = api.viewOf(target);
    if (!cv || !tv) return { touched: [] };
    const scene = api.scene;
    const dir = caster.side === 'left' ? 1 : -1;

    // Pre-compute damage (JS:175-185)
    const mainScale = (skill.atkScale as number) ?? 1.3;
    const behindScale = (skill.behindScale as number) ?? 0.8;
    const isCrit1 = rollCrit(effectiveCrit(caster));
    const behind = fighterBehind(api.allFighters, target);
    const isCrit2 = behind?.alive ? rollCrit(effectiveCrit(caster)) : false;

    // 几何: caster 到 target 后方 dashX (JS:187-225)
    const cHomeX = cv.homeX, cHomeY = cv.homeY;
    const tHomeX = tv.homeX, tHomeY = tv.homeY;
    const casterYShift = tHomeY - cHomeY;   // 行间 Y 差
    const mainHitX = tHomeX - cHomeX;        // 到 target 中心的 X 距离
    const tvBehind = behind ? api.viewOf(behind) : null;
    const behindHitX = tvBehind ? tvBehind.homeX - cHomeX : 0;
    // JS ninja.js:209-222: 冲到目标所在列的「后排槽位」(back-<col>), 不只是目标身后/后排单位处。
    //   PoC 之前用 behindHitX/mainHitX → 冲的位置不对 (用户报)。改读 slotCoords 真后排槽位。
    let farX = tvBehind ? behindHitX : mainHitX;
    const tCol = (target as Fighter & { _slotKey?: string })._slotKey?.split('-')[1];
    if (tCol) {
      const backSlot = api.slotCoords?.(target.side, `back-${tCol}`);
      if (backSlot) farX = backSlot.x - cHomeX;
    }
    const dashX = farX + dir * 60;  // 冲到后排槽位再 +60px 过身

    // J4 1:1: _inHop 必须设到**真** view (cv 是 viewOf 副本); 否则 watcher 每帧把 sprite.x 拍回 home
    //   → dash 位移被抵消, 只剩影子/残影动 (用户报"冲击人不动")。配合 SKIP_POSITIONAL_HOP 去掉并发通用 hop。
    api.setInHop?.(caster, true);
    cv.sprite.setDepth(60);

    // Phase 0: Run to target row Y (400ms, JS:247-257)
    const RUN_MS = 400;
    if (Math.abs(casterYShift) > 4) {
      scene.tweens.add({
        targets: cv.sprite, y: cHomeY + casterYShift, duration: RUN_MS, ease: 'linear',
      });
      await sleep(RUN_MS);
    }

    // JS ninja.js:262-264: 冲刺全程 (windup→flight→plant→recovery) 盖 18 帧 dash.png 序列在 caster 身上。
    //   PoC 之前只滑 idle 贴图 → 没有冲刺动作 (用户报"动画不对")。dash.png 64×64 与 idle 同尺寸, 无需 refit。
    const cvSprite = cv.sprite as Phaser.GameObjects.Sprite;
    const canDash = scene.anims.exists('anim-dash-ninja') && scene.textures.exists('pet-action-ninja-dash') && 'play' in cvSprite;
    if (canDash) {
      cvSprite.setTexture('pet-action-ninja-dash', 0);
      cvSprite.play('anim-dash-ninja');
    }

    // Phase 1: F1-3 windup (300ms idle at row, JS:289-290)
    await sleep(300);

    // P90 1:1 JS ninja.js:292-300 — dash trail VFX 跟随 caster sprite, 4 帧 200ms 无限循环
    let dashTrail: Phaser.GameObjects.Sprite | null = null;
    if (scene.textures.exists('vfx-ninja-dash-trail') && scene.anims.exists('anim-ninja-dash-trail')) {
      dashTrail = scene.add.sprite(cv.sprite.x, cv.sprite.y, 'vfx-ninja-dash-trail')
        .setDepth(34).setDisplaySize(128, 128);
      if (dir === -1) dashTrail.setFlipX(true);
      try { dashTrail.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
      dashTrail.play('anim-ninja-dash-trail');
    }
    // Phase 2: F4-8 flight 500ms (JS:292-344)
    //   Dash counter drives sprite x — addCounter (target=number, watchTick guarded via _inHop)
    const flightCounter = scene.tweens.addCounter({
      from: 0, to: 1, duration: 500, ease: 'cubic.out',
      onUpdate: (tw) => {
        const p = tw.getValue() ?? 0;
        cv.sprite.x = cHomeX + dashX * p;
        if (dashTrail) { dashTrail.x = cv.sprite.x; dashTrail.y = cv.sprite.y; }
      },
    });
    (flightCounter as Phaser.Tweens.BaseTween & { _isSkillTween?: boolean })._isSkillTween = true;

    // Mid-flight hits — fire when ninja passes its X (JS:303-341)
    const hitOnPass = async (enemy: Fighter, hitX: number, scale: number, isC: boolean) => {
      if (!enemy.alive) return 0;
      const passFraction = Math.abs(hitX) / Math.abs(dashX);
      const triggerMs = Math.max(40, Math.round(500 * passFraction));
      await sleep(triggerMs);
      if (!enemy.alive) return 0;
      // 抑制 dealPhysical 内的通用 18px sceneKnockback — 否则它与下面 applyKnockupJuggle
      //   (1800ms 击飞) 同时写 sprite.x → 抖动「诡异」(同幽冥突袭的双击退冲突, 用户报)。
      (enemy as Fighter & { _knockUntil?: number })._knockUntil = scene.time.now + 2000;
      const dmg = dealPhysical(caster, enemy, caster.atk * scale, isC);
      api.floatNum(enemy, `${dmg}`, '#ff4444', isC ? 'crit-dmg' : 'direct-dmg');
      // P77 击飞 juggle — JS:319-334: 目标有受击飞帧表(basic/ghost/ninja)→ 抑制身体旋转(帧表已画倒地)
      //   + run-back(飞 1.4×knockX 后跑回); 无帧表 → 物理 sim(身体旋转 -82°=倒地姿态)。
      const ev = api.viewOf(enemy);
      if (ev) {
        const knockX = (caster.side === 'left' ? 1 : -1) * 56;
        const hasKA = scene.anims.exists(`anim-knockup-${enemy.id}`);
        const ka = hasKA ? (PET_BY_ID as Record<string, { knockupAnim?: KnockupAnimMeta }>)[enemy.id]?.knockupAnim ?? null : null;
        applyKnockupJuggle(scene, ev.sprite, ev.homeX, ev.homeY, knockX, /*noRotation=*/hasKA, (on) => api.setInHop?.(enemy, on), ka);
        // 只对有帧表的目标 play knockup sprite; 无帧表的靠物理旋转作倒地姿态 (不再调 api.knockup fallback 抖动与物理 sim 抢 sprite)
        if (hasKA) api.knockup?.(enemy);
      }
      // chi-hit-flash on enemy (JS:335-340 .chi-hit-flash 140ms tint)
      if (ev && 'setTint' in ev.sprite) {
        (ev.sprite as Phaser.GameObjects.Sprite).setTint(0xffffff);
        scene.time.delayedCall(140, () => {
          try { (ev.sprite as Phaser.GameObjects.Sprite).clearTint(); } catch { /* ignore */ }
        });
      }
      return dmg;
    };
    const mainHitPromise = hitOnPass(target, mainHitX, mainScale, isCrit1);
    const behindHitPromise = behind?.alive ? hitOnPass(behind, behindHitX, behindScale, isCrit2) : Promise.resolve(0);
    await sleep(500);   // wait for flight
    const dmgMain = await mainHitPromise;
    const dmgBehind = await behindHitPromise;

    // Camera shake on arrival (JS:349-355)
    scene.cameras.main.shake(240, 0.008);

    // P90: dash trail VFX 销毁 (flight 结束)
    if (dashTrail) { dashTrail.destroy(); dashTrail = null; }
    // Phase 3-5: 站立 500ms + 100ms + 闪回 home + recovery 400ms (JS:357-360)
    await sleep(500);
    cv.sprite.x = cHomeX;   // teleport home
    cv.sprite.y = cHomeY;
    cv.sprite.setDepth(2);
    api.setInHop?.(caster, false);
    // 还原 idle 序列 (dash 序列播完, 回到待机)
    if (canDash && scene.anims.exists('anim-idle-ninja') && scene.textures.exists('pet-sheet-ninja')) {
      cvSprite.setTexture('pet-sheet-ninja', 0);
      cvSprite.play('anim-idle-ninja');
    }
    await sleep(400);

    const touched: Fighter[] = [target];
    if (behind?.alive) touched.push(behind);
    api.log?.(`${caster.name} <b>冲击</b> → ${target.name}: ${dmgMain}物理${behind ? ` + ${behind.name}: ${dmgBehind}` : ''}`);
    return { touched };
  },

  // 飞镖: 1.6×ATK physical; 暴击时 (40%+2%/level) 转 true 伤害
  // v0.9.5.A99: ninjaShuriken 飞镖 — JS ninja.js:1-60 (~110 行 vs 之前 37 行)
  //   1) 等 260ms (attack-hop apex)
  //   2) 生成旋转飞镖 sprite (graphics), 280ms 飞向 target, 边飞边自转
  //   3) 到达后:
  //      - 暴击: 拆 TRUE (40 + 2×lv %) + PHYS, 双飘字 (TRUE 上 y+22, PHYS 下 y+0)
  //      - 非暴击: 单纯物理 (走 armor 减免)
  //   4) hit-shake 360ms
  /**
   * E3/24: ninjaShuriken 真 1:1 移植 JS skills/ninja.js:1-59 doNinjaShuriken
   * 关键修复 (用户反馈"完全不一样"):
   *   - 旧版用 Graphics 画 4-triangle 当飞镖 → 改用 vfx-ninja-shuriken
   *     真 spritesheet (4 帧 128×128 旋转)
   *   - 旧版 isCrit 走 effectiveCrit (含 overflow / lowHpCrit) →
   *     JS 是 Math.random() < attacker.crit, 简单直接
   *   - 旧版 critMult 走 calcCritMult (含 overflow) →
   *     JS 是 1.5 + _extraCritDmg + _extraCritDmgPerm
   *   - 旧版加 💥 / 🗡 / ⚡ emoji prefix → JS 没有, 飘字纯数字
   *   - 旧版 hit-shake 用 yoyo+repeat → JS 用 CSS class 'hit-shake' 360ms
   */
  ninjaShuriken: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const cv = api.viewOf(caster);
    if (!cv) return { touched: [] };
    const scene = api.scene;
    const atkScale = (skill.atkScale as number) ?? 1.5;

    // JS 公式: baseDmg = atk × atkScale (无 critMult 在这步)
    const baseDmg = Math.round(caster.atk * atkScale);
    // JS isCrit: Math.random() < attacker.crit (简单, 不含 overflow / lowHpCrit)
    const isCrit = Math.random() < (caster.crit ?? 0);
    // JS critMult: 1.5 + _extraCritDmg + _extraCritDmgPerm (简单, 不走 calcCritMult overflow)
    const critMult = isCrit
      ? (1.5 + ((caster as Fighter & { _extraCritDmg?: number })._extraCritDmg ?? 0)
            + ((caster as Fighter & { _extraCritDmgPerm?: number })._extraCritDmgPerm ?? 0))
      : 1;

    // 等 260ms (JS attack-hop 到前 apex)
    await sleep(260);

    const tv = api.viewOf(target);
    if (!tv) return { touched: [] };

    // ── E3/24: 飞镖 sprite (真 png, 不再 Graphics) ──
    // JS fireProjectile: 'ninja-shuriken' CSS class, sprite 自带 spin keyframe
    // Phaser: spritesheet 4 帧 + anim-shuriken-spin loop
    const startX = cv.x + (caster.side === 'left' ? 30 : -30);
    const startY = cv.y;
    let shuriken: Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics;
    if (scene.textures.exists('vfx-ninja-shuriken')) {
      // E3/42 FIX: JS scene.css:553 width:60px (从 128px native 缩到 60 = scale 0.469)
      // 之前 0.4 (=51px) 偏小; JS drop-shadow 用 Phaser preFX setBlur+setColorMatrix 模拟困难,
      // 这里给 sprite 设 tint stack 或 setShadowFX 接近
      const s = scene.add.sprite(startX, startY, 'vfx-ninja-shuriken').setDepth(48).setScale(0.47);
      if (scene.anims.exists('anim-shuriken-spin')) {
        s.play('anim-shuriken-spin');
      }
      // E3/42: JS drop-shadow 0 1px 2px rgba(0,0,0,.45) — Phaser preFX shadow
      if (s.preFX) {
        s.preFX.addShadow(0, 1, 0.1, 1, 0x000000, 4, 0.45);
      }
      shuriken = s;
    } else {
      // fallback: graphics
      const g = scene.add.graphics().setDepth(48);
      g.fillStyle(0xeeeeee, 1);
      g.fillCircle(0, 0, 4);
      g.fillStyle(0x808080, 1);
      g.fillTriangle(0, -10, -3, 0, 3, 0);
      g.fillTriangle(0, 10, -3, 0, 3, 0);
      g.fillTriangle(-10, 0, 0, -3, 0, 3);
      g.fillTriangle(10, 0, 0, -3, 0, 3);
      g.setPosition(startX, startY);
      shuriken = g;
    }

    // JS durationMs=280, damageAtMs=240 → 命中在 240ms (sprite 飞 85% 路程时)
    if (_auditMode) {
      try { shuriken.destroy(); } catch { /* ignore */ }
    } else {
      await new Promise<void>(resolve => {
        scene.tweens.add({
          targets: shuriken, x: tv.x, y: tv.y,
          duration: 280, ease: 'linear',
        });
        // 240ms 后 resolve, sprite 继续飞完 280ms
        scene.time.delayedCall(240, () => {
          scene.time.delayedCall(40, () => shuriken.destroy());
          resolve();
        });
      });
    }
    if (!target.alive) return { touched: [target] };

    // ── 命中: 暴击拆 TRUE + PHYS / 非暴击单 phys (JS:19-51) ──
    let physShown = 0, trueShown = 0;
    if (isCrit) {
      // JS:21-25: 暴击拆分
      const critTotalRaw = Math.round(baseDmg * critMult);
      // JS truePct = min(100, 40 + 2×lv) (lv1=42%, lv5=50%, lv10=60%)
      const lv = ((caster as Fighter & { _level?: number })._level ?? 1);
      const truePct = Math.min(100, 40 + 2 * lv);
      const trueRaw = Math.round(critTotalRaw * truePct / 100);
      const physRaw = critTotalRaw - trueRaw;
      // JS:28-29 PHYS 走 def 减免
      if (physRaw > 0) {
        const physDmg = Math.max(1, Math.round(physRaw * calcDmgMult(calcEffArmor(caster, target))));
        const wasA = target.alive;
        const r = applyRawDamage(target, physDmg, 'physical');
        physShown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        battleStats.recordDamage(caster, target, physShown, 'phy');
        if (wasA && !target.alive) battleStats.recordKill(caster, target);
        // JS:34 spawnFloatingNum(tElId, shown, 'crit-dmg', delayMs=100, yOff=0)
        //   P74: TRUE 在上 (yOffset 22), PHYS 在下 (yOffset 0) — JS feedback_floating_numbers rule
        api.floatNum(target, `${physShown}`, '#ff4444', 'crit-dmg', 100, 0);
        triggerOnHitEffects(caster, target, physDmg, { floatNum: api.floatNum });
      }
      // JS:36-40 TRUE 不减免 (pierce=true)
      if (trueRaw > 0 && target.alive) {
        const wasA = target.alive;
        const r = applyRawDamage(target, trueRaw, 'true');
        trueShown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        battleStats.recordDamage(caster, target, trueShown, 'tru');
        if (wasA && !target.alive) battleStats.recordKill(caster, target);
        // JS:39 spawnFloatingNum(tElId, shown, 'crit-true', delayMs=100, yOff=22)
        api.floatNum(target, `${trueShown}`, '#ffffff', 'crit-true', 100, 22);
        triggerOnHitEffects(caster, target, trueRaw, { floatNum: api.floatNum });
      }
    } else {
      // JS:43-50 非暴击单 physical (走 def 减免)
      const physDmg = Math.max(1, Math.round(baseDmg * calcDmgMult(calcEffArmor(caster, target))));
      const wasA = target.alive;
      const r = applyRawDamage(target, physDmg, 'physical');
      physShown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      battleStats.recordDamage(caster, target, physShown, 'phy');
      if (wasA && !target.alive) battleStats.recordKill(caster, target);
      // JS:48 spawnFloatingNum(tElId, shown, 'direct-dmg', delayMs=100, yOff=0)
      api.floatNum(target, `${physShown}`, '#ff4444', 'direct-dmg', 100, 0);
      triggerOnHitEffects(caster, target, physDmg, { floatNum: api.floatNum });
    }

    applyPostHitLayers(caster, target, physShown + trueShown, isCrit, 'physical');

    // hit-shake: JS .scene-turtle.hit-shake → sceneKnockback (远离攻击者 18px + 抬3px, .35s ease-out)
    //   旧 PoC ±8px 来回 yoyo vibration 是自创, 与 JS 单向击退不同 → 改走统一 hitKnockback
    api.hitKnockback?.(target, caster.side);
    await sleep(360);
    await sleep(60);   // P74: JS ninja.js:58 final 60ms

    // P38 addLog: JS ninja.js:41/49 飞镖 + 暴击/真伤拆分
    if (isCrit && trueShown > 0) {
      api.log?.(`${caster.emoji}${caster.name} <b>飞镖</b> → ${target.emoji}${target.name}：暴击! ${trueShown}真实 + ${physShown}物理`);
    } else {
      api.log?.(`${caster.emoji}${caster.name} <b>飞镖</b> → ${target.emoji}${target.name}：${physShown}物理`);
    }
    return { touched: [target] };
  },

  // P75 ninjaBomb 1:1 JS ninja.js:523-700 (~200 行 完整 bomb 动画)
  //   总时长 1200ms: F1-4 throw 400ms (parabolic + 2 bounce) → F5-8 fuse 400ms → F9-12 detonate 400ms
  //   detonateAt 800ms 触发全体 damage + armorBreak
  ninjaBomb: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    if (!enemies.length) return { touched: [] };
    const cv = api.viewOf(caster);
    if (!cv) return { touched: [] };
    const scene = api.scene;
    const atkScale = (skill.atkScale as number) ?? 1.1;
    const ab = (skill.armorBreak as { pct: number; turns: number } | undefined) ?? { pct: 25, turns: 3 };

    // 几何: 攻击者中心 + 敌方队伍中心 (JS:528-547)
    const aCx = cv.sprite.x, aCy = cv.sprite.y;
    let cCx = 0, cCy = 0;
    let n = 0;
    for (const e of enemies) {
      if (!e.alive) continue;
      const ev = api.viewOf(e);
      if (!ev) continue;
      cCx += ev.sprite.x; cCy += ev.sprite.y;
      n++;
    }
    if (n > 0) { cCx /= n; cCy /= n; }

    // Bomb sprite spawn at caster (JS:568-574)
    let bomb: Phaser.GameObjects.Sprite | null = null;
    if (scene.textures.exists('vfx-ninja-bomb')) {
      bomb = scene.add.sprite(aCx, aCy, 'vfx-ninja-bomb').setDepth(50).setDisplaySize(220, 220);
      try { bomb.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
      if (scene.anims.exists('anim-ninja-bomb')) bomb.play('anim-ninja-bomb');
    }

    // 抛物线 (JS:576-619): 400ms total — Phase A throw 200ms, B bounce1 100ms, C bounce2 80ms, D settle 20ms
    //   peak: A -160, B -55, C -22
    //   PoC 简化为 1 个 addCounter 含 3 段
    const FLY_MS = 400;
    const dx = cCx - aCx, dy = cCy - aCy;
    const ARC_PEAK = -160;
    const BOUNCE1 = -55;
    const BOUNCE2 = -22;
    const flyCounter = scene.tweens.addCounter({
      from: 0, to: 1, duration: FLY_MS, ease: 'linear',
      onUpdate: (tw) => {
        if (!bomb) return;
        const p = tw.getValue() ?? 0;
        let arc: number, sub: number;
        if (p < 0.5) {        // Phase A 0-50%
          sub = p / 0.5; arc = ARC_PEAK;
        } else if (p < 0.75) { // Phase B 50-75%
          sub = (p - 0.5) / 0.25; arc = BOUNCE1;
        } else if (p < 0.95) { // Phase C 75-95%
          sub = (p - 0.75) / 0.20; arc = BOUNCE2;
        } else {              // Phase D settle
          sub = 1; arc = 0;
        }
        const x = aCx + dx * p;
        const y = aCy + dy * p + arc * 4 * sub * (1 - sub);   // parabola
        bomb.x = x; bomb.y = y;
      },
    });
    (flyCounter as Phaser.Tweens.BaseTween & { _isSkillTween?: boolean })._isSkillTween = true;

    // F5-8 fuse 400ms (bomb stays at center, sprite plays fuse frames)
    await sleep(800);

    // F9 detonate (800ms mark in JS): camera shake + AOE damage + armorBreak
    scene.cameras.main.shake(260, 0.012);
    const touched: Fighter[] = [];
    let totalDmg = 0;
    for (const e of enemies) {
      if (!e.alive) continue;
      const isCrit = rollCrit(effectiveCrit(caster));
      const dmg = dealPhysical(caster, e, caster.atk * atkScale, isCrit);
      totalDmg += dmg;
      // JS 飘字 delayMs 0, yOffset 0 — 同时 spawn 在 explosion 中心 (但 PoC 走 target 中心方便看)
      api.floatNum(e, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg', 0, 0);
      applyPostHitLayers(caster, e, dmg, isCrit, 'physical');
      e.buffs.push({ type: 'armorBreak', value: ab.pct, duration: (ab.turns ?? 3) + 1 });
      touched.push(e);
    }

    // F10-12 mushroom cloud fade out 400ms (bomb anim plays 0→1200ms)
    await sleep(400);
    if (bomb && bomb.active) bomb.destroy();

    api.log?.(`${caster.emoji}${caster.name} 炸弹 全敌: ${totalDmg}物理 + -${ab.pct}%护甲${ab.turns}回合`);
    return { touched };
  },

  // P76 ninjaBackstab 1:1 JS ninja.js:382-515 (133 行完整动画)
  //   总时长 1800ms (跟 18 帧 backstab.png 帧对齐):
  //   F1-3 (0-300ms): windup at home
  //   F4 (300ms): teleport snap to behind target
  //   F5-14 (300-1400ms): 3 段 stab at 500/800/1100ms global
  //   F15 (1400ms): snap back home
  //   F16-18 (1500-1800ms): recovery at home
  ninjaBackstab: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const cv = api.viewOf(caster);
    const tv = api.viewOf(target);
    if (!cv || !tv) return { touched: [] };
    const scene = api.scene;
    const dir = caster.side === 'left' ? 1 : -1;

    // 临时穿甲 buff (JS:387-392 attacker.armorPen += apBuff)
    const apBuff = (skill.armorPenBuff as number) ?? 5;
    const apTurns = (skill.armorPenTurns as number) ?? 1;
    caster.buffs.push({ type: 'armorPen', value: apBuff, duration: apTurns + 1 });
    recalcStats(caster, getAllies(api, caster));
    api.floatNum(caster, `+${apBuff}穿甲`, '#7dffb3', 'passive-num', 0, -20);

    // 计算 teleport 到目标后方 (JS:406-422)
    const cHomeX = cv.homeX, cHomeY = cv.homeY;
    const behindX = tv.homeX + dir * 50;   // target X + 50px 后方
    const behindY = tv.homeY;

    // J4 同款: _inHop 设到真 view (否则 teleport 到目标后方会被 watcher 每帧拍回 home → 背刺看不到位移)
    api.setInHop?.(caster, true);
    cv.sprite.setDepth(60);

    // JS ninja.js:382+ playFighterSpriteOnce backstab.png — 全程盖 18 帧背刺序列在 caster 身上
    const cvSprite = cv.sprite as Phaser.GameObjects.Sprite;
    const canBackstab = scene.anims.exists('anim-backstab-ninja') && scene.textures.exists('pet-action-ninja-backstab') && 'play' in cvSprite;
    if (canBackstab) {
      cvSprite.setTexture('pet-action-ninja-backstab', 0);
      cvSprite.play('anim-backstab-ninja');
    }

    // F1-3 windup 300ms (sprite stays at home, JS:466)
    await sleep(300);

    // F4 teleport snap to behind target (JS:459, instant move)
    cv.sprite.x = behindX;
    cv.sprite.y = behindY;

    // F5-14: 3 段 stab at offsets 200/500/800ms relative to here (= 500/800/1100ms global)
    const hits = (skill.hits as number) ?? 3;
    const atkScale = (skill.atkScale as number) ?? 0.6667;
    const hitOffsets = [200, 500, 800];   // JS:472
    let totalDmg = 0;
    const stabPromises: Promise<void>[] = [];
    for (let i = 0; i < hits; i++) {
      const idx = i;
      stabPromises.push((async () => {
        await sleep(hitOffsets[idx]);
        if (!target.alive) return;
        const isCrit = rollCrit(effectiveCrit(caster));
        const dmg = dealPhysical(caster, target, caster.atk * atkScale, isCrit);
        totalDmg += dmg;
        // JS:487 spawnFloatingNum(.., (i-1)×18, 0) — 3 个数字垂直叠加
        api.floatNum(target, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg', (idx - 1) * 18, 0);
        applyPostHitLayers(caster, target, dmg, isCrit, 'physical');
        // chi-hit-flash 140ms tint (JS:491-496)
        if ('setTint' in tv.sprite) {
          (tv.sprite as Phaser.GameObjects.Sprite).setTint(0xffffff);
          scene.time.delayedCall(140, () => {
            try { (tv.sprite as Phaser.GameObjects.Sprite).clearTint(); } catch { /* ignore */ }
          });
        }
      })());
    }
    // 等 1100ms 让 3 段 stab 全部 fire (JS:501 等剩余 1500ms = 300 + 1500)
    await sleep(1100);

    // F15 teleport home (JS:461)
    cv.sprite.x = cHomeX;
    cv.sprite.y = cHomeY;

    // F16-18 recovery 400ms
    await sleep(400);

    cv.sprite.setDepth(2);
    api.setInHop?.(caster, false);
    // 还原 idle 序列 (背刺序列播完, 回到待机)
    if (canBackstab && scene.anims.exists('anim-idle-ninja') && scene.textures.exists('pet-sheet-ninja')) {
      cvSprite.setTexture('pet-sheet-ninja', 0);
      cvSprite.play('anim-idle-ninja');
    }
    await Promise.all(stabPromises);   // safety wait

    api.log?.(`${caster.emoji}${caster.name} <b>背刺</b> → ${target.emoji}${target.name}：3段共${totalDmg}物理 (+${apBuff}穿甲)`);
    return { touched: [target] };
  },

  // ninjaFeet: passive (闪避加成等), handler no-op (由 passive 系统处理)
  ninjaFeet: async (_api, caster, _target, _skill) => {
    return { touched: [caster] };
  },


  // ── 凤凰系列 (phoenix) — JS skills/phoenix.js 完整移植 ──
  // 灼烧 (basic): magic + burn 4t (40%×ATK + 8%×maxHp 每回合)
  phoenixBurn: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const base = caster.atk * ((skill.atkScale as number) ?? 0.9);
    const dmg = dealMagic(caster, target, base);
    // P85 1:1 JS phoenix.js:43 — stacks = max(1, round(atk*0.53)); BattleScene burn tick
    //   公式 = value + maxHp×value×0.001 已自带 maxHp scaling, 之前 PoC value=atk*0.4+maxHp*0.08
    //   双倍计 maxHp → 比 JS 强 2x. duration 用 5 (turn-end -1 → 4t)
    const dot = Math.max(1, Math.round(caster.atk * 0.53));
    applyDotStacks(target, 'burn', dot);   // F4: 层数累加 + duration:999 (JS phoenix.js:43)
    api.floatNum(target, `${dmg}`, '#4dabf7', 'magic-dmg');
    api.log?.(`🔥 ${caster.emoji}${caster.name} <b>灼烧</b> → ${target.emoji}${target.name}：${dmg} 魔法伤害 + ${dot}/回合灼烧`);  // P26 JS phoenix.js:45
    await sleep(450);
    await sleep(80);
    return { touched: [target] };
  },
  // 熔岩盾 (CD3): 用户(2026-05-29) 改为【特殊限时盾】— _lavaShieldVal 独立护盾池(HUD aura 段特殊色),
  //   dur 回合到期消散; 持盾期间(_lavaShieldVal>0)受击反击 atk×counterScale (passive-triggers 6i)。
  phoenixShield: async (api, caster, _target, skill) => {
    const shieldAmt = Math.round(caster.atk * ((skill.shieldScale as number) ?? 0.75));
    const dur = (skill.duration as number) ?? 4;
    const counterScale = (skill.counterScale as number) ?? 0.14;
    const cf = caster as Fighter & { _lavaShieldVal?: number; _lavaShieldTurns?: number; _lavaShieldCounter?: number };
    cf._lavaShieldVal = (cf._lavaShieldVal ?? 0) + shieldAmt;
    cf._lavaShieldTurns = dur;
    cf._lavaShieldCounter = counterScale;
    api.floatNum(caster, `+${shieldAmt}🔥盾 ${dur}t`, '#ff8c42');
    api.log?.(`${caster.emoji}${caster.name} <b>熔岩盾</b>: +${shieldAmt}熔岩护盾 ${dur}回合, 持盾期间受击反击 ${Math.round(caster.atk * counterScale)} 魔法`);
    return { touched: [caster] };
  },
  // 烫伤 (CD5): 破护盾 50% + magic + atk/def/mr -15% 4t + burn + healReduce
  phoenixScald: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    // P85 1:1 JS phoenix.js:71-75 — 同时破 shield + bubbleShieldVal (之前 PoC 只破 shield)
    const sbPct = (skill.shieldBreak as number) ?? 50;
    if (target.shield > 0) {
      const broken = Math.round(target.shield * sbPct / 100);
      target.shield = Math.max(0, target.shield - broken);
      api.floatNum(target, `-${broken}破盾`, '#ff8c42', 'shield-dmg');
    }
    const tb = target as Fighter & { bubbleShieldVal?: number };
    if ((tb.bubbleShieldVal ?? 0) > 0) {
      const bb = Math.round((tb.bubbleShieldVal ?? 0) * sbPct / 100);
      tb.bubbleShieldVal = Math.max(0, (tb.bubbleShieldVal ?? 0) - bb);
      api.floatNum(target, `-${bb}🫧破`, '#7fdbff', 'shield-dmg');
    }
    const base = caster.atk * ((skill.atkScale as number) ?? 0.7);
    const dmg = dealMagic(caster, target, base);
    // 三 debuff
    const atkDown = skill.atkDown as { pct: number; turns: number } | undefined;
    const defDown = skill.defDown as { pct: number; turns: number } | undefined;
    const mrDown = skill.mrDown as { pct: number; turns: number } | undefined;
    if (atkDown) target.buffs.push({ type: 'atkDown', value: atkDown.pct, duration: atkDown.turns + 1 });
    if (defDown) target.buffs.push({ type: 'defDown', value: defDown.pct, duration: defDown.turns + 1 });
    if (mrDown) target.buffs.push({ type: 'mrDown', value: mrDown.pct, duration: mrDown.turns + 1 });
    // P85/F4 1:1 JS combat.js:412 applySkillDebuffs default — 层数 max(1,round(atk*0.67)) 累加 + duration:999
    if (skill.burn) applyDotStacks(target, 'burn', defaultBurnStacks(caster));
    if (skill.healReduce) target.buffs.push({ type: 'healReduce', value: 50, duration: 5 });
    api.floatNum(target, `${dmg}`, '#4dabf7', 'magic-dmg');
    api.log?.(`${caster.emoji}${caster.name} <b>烫伤</b> → ${target.emoji}${target.name}：${dmg}魔法 + 破50%护盾 + atk/def/mr -15% + 灼烧 + 治疗削减`);
    return { touched: [target] };
  },
  // 火焰净化: 清除友方所有 debuff, 每清 1 个回 10% maxHp
  phoenixPurify: async (api, caster, target, _skill) => {
    const tgt = (target && target.side === caster.side) ? target : caster;
    // #8 低#11: 描述"清除所有减益" → 补 chilled(冰寒)/stun(眩晕), 旧版漏了这两类
    const debuffTypes = ['atkDown', 'defDown', 'mrDown', 'burn', 'curse', 'healReduce', 'poison', 'bleed', 'armorBreak', 'chilled', 'stun'];
    const beforeCount = tgt.buffs.filter(b => debuffTypes.includes(b.type)).length;
    tgt.buffs = tgt.buffs.filter(b => !debuffTypes.includes(b.type));
    recalcStats(tgt);   // 立即恢复被 atkDown/chilled 等压低的属性 (旧版要等下回合 recalc)
    if (beforeCount > 0) {
      const heal = Math.round(tgt.maxHp * 0.1 * beforeCount);
      applyHeal(tgt, heal);
      api.floatNum(tgt, `+${heal} 净化×${beforeCount}`, '#06d6a0', 'heal-num');
      api.log?.(`${caster.emoji}${caster.name} <b>火焰净化</b> → ${tgt.emoji}${tgt.name}：清除 ${beforeCount} 减益 + ${heal}HP`);
    } else {
      api.log?.(`${caster.emoji}${caster.name} <b>火焰净化</b> → ${tgt.emoji}${tgt.name}：无减益可清`);
    }
    return { touched: [tgt] };
  },
  // phoenixEnhancedRebirth: passive — 由 onDeath 处理, handler no-op
  phoenixEnhancedRebirth: async (_api, caster, _target, _skill) => ({ touched: [caster] }),

  // 旧名兼容
  // P16: phoenixFlare 已删除 — JS skills/phoenix.js 不存在此 type, pets.ts 也没.
  // P16: lavaErupt 已删除 — JS 有 volcanoErupt (火山形态) 没 lavaErupt. pets.ts 也不引.

  // ── 龟壳额外技能 (shell.js 完整移植) ──
  // 复制 (CD4): 随机抽 2 个敌方技能, 60% 效果释放
  // P19 shellCopy: 黑名单 + 缩放字段全面对齐 JS shell.js:113-243
  //   黑名单加: cyberBuff / mechAttack / starShieldBreak / shellFortify
  //   缩放字段加: defScale / hpPct / selfHpPct / shield / shieldFlat / shieldHpPct / heal / hot.hpPerTurn / dot.dmg
  shellCopy: async (api, caster, _target, _skill) => {
    // 黑名单 2026-05-30 audit (Agent B):
    //   + 加 stoneTaunt (shell 用→自身上 redirectAll → 帮敌方分流伤害, 反向自坑)
    //   + 加 cyberBeam (KOF 切镜+换贴图+换位+_drones true 段=0, 视觉身份绑定 cyber)
    //   + 加 ninjaBackstab (handler 用 setTexture 把 shell 贴图换成 ninja-backstab 帧, 强身份绑定)
    //   - 删 diamondFortify / diceFate (移到 SELF, 纯自增益可由 shell 自享)
    //   - 删 bambooLeaf (3 段物理, 自我封顶, 复制无害)
    //   - 删 bambooHeal (移到 ALLY, handler 自带 getAllies, 友方治疗)
    //   - 删 gamblerDraw (2 段物理 + 自盾自疗 + 随机敌方 debuff, 完全 self-contained, 复制 OK)
    const BLACKLIST = new Set([
      'shellCopy', 'cyberDeploy', 'cyberBuff', 'hidingDefend', 'hidingCommand',
      'fortuneDice', 'fortuneAllIn',
      'ghostPhase', 'twoHeadSwitch', 'mechAttack',
      'gamblerBet', 'chestCount', 'chestSmash', 'starWormhole',
      'bubbleBurst', 'shellAbsorb', 'shellErode', 'shellFortify',
      'fortuneBuyEquip', 'fortuneGainCoins',
      'ghostPhantom', 'starShieldBreak', 'hidingBuffSummon',
      // 新加 2026-05-30:
      'stoneTaunt', 'cyberBeam', 'ninjaBackstab',
    ]);
    const enemies = getEnemies(api, caster);
    const pool: Array<{ source: Fighter; skill: SkillDef }> = [];
    for (const e of enemies) {
      for (const s of e.skills) {
        if (!BLACKLIST.has(s.type)) pool.push({ source: e, skill: s });
      }
    }
    if (!pool.length) return { touched: [caster] };
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const picked: typeof pool = [];
    for (const p of shuffled) {
      if (picked.length >= 2) break;
      if (!picked.find(x => x.skill.type === p.skill.type)) picked.push(p);
    }
    const COPY_MULT = 0.6;
    const touched = new Set<Fighter>([caster]);
    for (const { skill: orig } of picked) {
      if (!caster.alive) break;
      const copied: SkillDef & { cdLeft: number } = JSON.parse(JSON.stringify(orig));
      copied.cdLeft = 0;
      // P19: 全字段 60% 缩放 (JS shell.js:155-175 1:1)
      if (typeof copied.power === 'number') copied.power = Math.round(copied.power * COPY_MULT);
      if (typeof copied.pierce === 'number') copied.pierce = Math.round(copied.pierce * COPY_MULT);
      if (typeof copied.atkScale === 'number') copied.atkScale *= COPY_MULT;
      if (typeof copied.defScale === 'number') copied.defScale *= COPY_MULT;
      if (typeof copied.hpPct === 'number') copied.hpPct *= COPY_MULT;
      if (typeof copied.totalScale === 'number') copied.totalScale *= COPY_MULT;
      if (typeof copied.pierceScale === 'number') copied.pierceScale *= COPY_MULT;
      if (typeof copied.normalScale === 'number') copied.normalScale *= COPY_MULT;
      if (typeof copied.selfHpPct === 'number') copied.selfHpPct *= COPY_MULT;
      if (typeof copied.shield === 'number') copied.shield = Math.round(copied.shield * COPY_MULT);
      if (typeof copied.shieldFlat === 'number') copied.shieldFlat = Math.round(copied.shieldFlat * COPY_MULT);
      if (typeof copied.shieldHpPct === 'number') copied.shieldHpPct *= COPY_MULT;
      if (typeof copied.shieldAtkScale === 'number') copied.shieldAtkScale *= COPY_MULT;
      if (typeof copied.heal === 'number') copied.heal = Math.round(copied.heal * COPY_MULT);
      const hot = copied.hot as { hpPerTurn?: number } | undefined;
      if (hot && typeof hot.hpPerTurn === 'number') hot.hpPerTurn = Math.round(hot.hpPerTurn * COPY_MULT);
      const dot = copied.dot as { dmg?: number } | undefined;
      if (dot && typeof dot.dmg === 'number') dot.dmg = Math.round(dot.dmg * COPY_MULT);
      // 目标选择: AoE/self → caster; ally → 友方; 单体 → 最低 HP 敌方
      const AOE = new Set(['hunterBarrage', 'ninjaBomb', 'lightningBarrage', 'iceFrost', 'basicBarrage',
        'starMeteor', 'lavaQuake', 'volcanoErupt', 'rainbowStorm', 'pirateCannonBarrage',
        'chestStorm', 'crystalBurst', 'lavaSplash', 'soulReap', 'candyBarrage']);
      // SELF/ALLY 集 2026-05-30 audit:
      //   + SELF 加 diamondFortify / diceFate (从 BLACKLIST 移过来, 复制成 shell 的自增益)
      //   + ALLY 加 commonTeamShield / cyberSwarmShield / bambooHeal / bubbleHeal (全队/友方治疗护盾)
      const SELF = new Set(['phoenixShield', 'volcanoArmor', 'crystalBarrier', 'lightningShield',
        'diamondFortify', 'diceFate']);
      const ALLY = new Set(['heal', 'shield', 'bubbleShield', 'angelBless', 'phoenixPurify',
        'commonTeamShield', 'cyberSwarmShield', 'bambooHeal', 'bubbleHeal']);
      let copyTarget: Fighter | null = null;
      if (SELF.has(copied.type) || copied.aoe || AOE.has(copied.type)) {
        copyTarget = caster;
      } else if (ALLY.has(copied.type)) {
        const allies = getAllies(api, caster).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
        copyTarget = allies[0] ?? caster;
      } else {
        const alive = enemies.filter(e => e.alive).sort((a, b) => a.hp - b.hp);
        copyTarget = alive[0] ?? null;
      }
      if (!copyTarget) continue;
      const handler = SKILL_HANDLERS[copied.type] ?? SKILL_HANDLERS.physical;
      api.floatNum(caster, `复制:${(copied as { name?: string }).name ?? copied.type}`, '#ffd93d');
      try {
        const r = await handler(api, caster, copyTarget, copied);
        for (const t of r.touched) touched.add(t);
      } catch { /* ignore */ }
    }
    return { touched: [...touched] };
  },

  // 侵蚀 (CD2): 弯波 N 道 (3 + crit% / 20), 每道主目标 + 同列另一目标 magic
  shellErode: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const critPct = (caster.crit || 0) * 100;
    const waveCount = 3 + Math.floor(critPct / 20);
    const mainScale = (skill.mainScale as number) ?? 0.25;
    const behindScale = (skill.behindScale as number) ?? 0.10;
    // 同 col 另一目标
    const enemies = getEnemies(api, caster);
    const aimCol = target._slotKey?.split('-')[1];
    const otherInCol = aimCol
      ? enemies.find(e => e !== target && e._slotKey?.endsWith('-' + aimCol))
      : null;
    const touched: Fighter[] = [target];
    let totalMain = 0, totalBehind = 0;
    for (let i = 0; i < waveCount; i++) {
      // 每波独立飘字 (体现"数道弯波"分段; 之前累加成 1 个总数 → 看不出分段)。弹跳桶自动错位堆叠。
      if (target.alive) {
        const d = dealMagic(caster, target, caster.atk * mainScale);
        totalMain += d;
        if (d > 0) api.floatNum(target, `${d}`, '#4cc9f0', 'magic-dmg');
      }
      if (otherInCol?.alive) {
        const d2 = dealMagic(caster, otherInCol, caster.atk * behindScale);
        totalBehind += d2;
        if (!touched.includes(otherInCol)) touched.push(otherInCol);
        if (d2 > 0) api.floatNum(otherInCol, `${d2}`, '#4cc9f0', 'magic-dmg');
      }
      // P17 JS shell.js:281 — 每波间 80ms (浮字位移)
      if (i < waveCount - 1) await sleep(80);
    }
    api.log?.(`${caster.emoji}${caster.name} <b>侵蚀</b> → ${target.emoji}${target.name}：${waveCount}道 (主 ${totalMain} + 同列 ${totalBehind} 魔法, 暴击 ${Math.round(critPct)}%)`);
    // P17 JS shell.js:284 — 500ms tail
    await sleep(500);
    return { touched };
  },

  // 吸取 (CD6): 偷取目标 stealHpPct% maxHp, 转给自己 (target maxHp -, 自己 maxHp +)
  // JS shell.js:288-309 doShellAbsorb 1:1 — 偷取 target maxHp% 给 caster
  //   target.maxHp -= stealAmt
  //   target.hp = max(1, hp - stealAmt)   ← **必须扣 HP**, 旧 Phaser 漏!
  //   target.hp = min(hp, maxHp)
  //   caster.maxHp += stealAmt + caster.hp += stealAmt + caster._initHp 更新
  shellAbsorb: async (api, caster, target, skill) => {
    if (!target || !target.alive) return { touched: [] };
    const pct = (skill.stealHpPct as number) ?? 10;
    const stealAmt = Math.round(target.maxHp * pct / 100);
    target.maxHp = Math.max(1, target.maxHp - stealAmt);
    target.hp = Math.max(1, target.hp - stealAmt);  // **关键**: 主动扣 HP (JS:293)
    target.hp = Math.min(target.hp, target.maxHp);
    caster.maxHp += stealAmt;
    caster.hp += stealAmt;
    const ci = caster as Fighter & { _initHp?: number };
    if (ci._initHp != null) ci._initHp = caster.maxHp;
    battleStats.recordDamage(caster, target, stealAmt, 'tru');
    api.floatNum(target, `${stealAmt}🐚`, '#ffffff', 'true-dmg');
    api.log?.(`🐚 ${caster.emoji}${caster.name} <b>吸取</b> → ${target.emoji}${target.name}：损失 ${stealAmt}HP 和 ${stealAmt}最大生命值`);  // P26 JS shell.js:307
    await sleep(800);
    return { touched: [target, caster] };
  },

  // shellEnhanceAwaken: passiveSkill (强化觉醒第 8 回合二次觉醒) — handler no-op
  shellEnhanceAwaken: async (_api, caster, _target, _skill) => ({ touched: [caster] }),

  // ── 龟壳 shellStrike (JS shell.js:1-100 完整移植) ──
  //   hits 段交替: 偶数 = physical (calc DEF), 奇数 = true (pierce)
  //   splashAdjacent: 每段对相邻敌人 splashAdjacent% 溅射 (同伤害类型 + 独立暴击 roll)
  //   isolatedBonus: 无相邻目标时主伤害 ×1.5 补偿
  shellStrike: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const hits = (skill.hits as number) ?? 2;
    const totalScale = (skill.totalScale as number) ?? 1.2;
    const splashPct = (skill.splashAdjacent as number) ?? 0;
    const isolatedMult = (skill.isolatedBonus as number) ?? 1.5;
    const total = caster.atk * totalScale;
    const perHit = total / hits;
    const touched = new Set<Fighter>([target]);
    let totalDmg = 0;

    for (let i = 0; i < hits; i++) {
      if (!target.alive) break;
      const isNormal = i % 2 === 0;     // 偶 normal / 奇 pierce
      // 每段重新算邻接 (上一段可能死人)
      const splashTargets = splashPct > 0 ? adjacentFighters(api.allFighters, target) : [];
      const isolated = splashPct > 0 && splashTargets.length === 0;
      const raw = Math.round(perHit * (isolated ? isolatedMult : 1));
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      let mainDmg = 0;
      if (isNormal) {
        const dmg = Math.max(1, Math.round(raw * critMult * calcDmgMult(calcEffArmor(caster, target))));
        const wasAlive = target.alive;
        const r = applyRawDamage(target, dmg);
        mainDmg = r.hpLoss + r.shieldAbs;
        battleStats.recordDamage(caster, target, mainDmg, 'phy');
        if (wasAlive && !target.alive) battleStats.recordKill(caster, target);
        triggerOnHitEffects(caster, target, mainDmg, _skillApi ? { floatNum: _skillApi.floatNum } : {});
      } else {
        const dmg = Math.max(1, Math.round(raw * critMult));   // pierce ignores DEF
        const wasAlive = target.alive;
        const r = applyRawDamage(target, dmg);
        mainDmg = r.hpLoss + r.shieldAbs;
        battleStats.recordDamage(caster, target, mainDmg, 'tru');
        if (wasAlive && !target.alive) battleStats.recordKill(caster, target);
        triggerOnHitEffects(caster, target, mainDmg, _skillApi ? { floatNum: _skillApi.floatNum } : {});
      }
      totalDmg += mainDmg;
      api.floatNum(target, `${mainDmg}`, isNormal ? '#ff4444' : '#ffffff', isCrit ? (isNormal ? 'crit-dmg' : 'crit-true') : (isNormal ? 'direct-dmg' : 'true-dmg'));

      // 溅射: 每段独立 roll, 类型跟随主段
      if (splashTargets.length > 0 && !isolated) {
        const basePerSplash = Math.round(perHit * splashPct / 100);
        if (basePerSplash > 0) {
          for (const e of splashTargets) {
            if (!e.alive) continue;
            const sIsCrit = rollCrit(effectiveCrit(caster));
            const sCritMult = sIsCrit ? calcCritMult(caster) : 1;
            let spDmg = 0;
            if (isNormal) {
              const d = Math.max(1, Math.round(basePerSplash * sCritMult * calcDmgMult(calcEffArmor(caster, e))));
              const wasAlive = e.alive;
              const r = applyRawDamage(e, d);
              spDmg = r.hpLoss + r.shieldAbs;
              battleStats.recordDamage(caster, e, spDmg, 'phy');
              if (wasAlive && !e.alive) battleStats.recordKill(caster, e);
              triggerOnHitEffects(caster, e, spDmg, _skillApi ? { floatNum: _skillApi.floatNum } : {});
            } else {
              const d = Math.max(1, Math.round(basePerSplash * sCritMult));
              const wasAlive = e.alive;
              const r = applyRawDamage(e, d);
              spDmg = r.hpLoss + r.shieldAbs;
              battleStats.recordDamage(caster, e, spDmg, 'tru');
              if (wasAlive && !e.alive) battleStats.recordKill(caster, e);
              triggerOnHitEffects(caster, e, spDmg, _skillApi ? { floatNum: _skillApi.floatNum } : {});
            }
            api.floatNum(e, `${spDmg}`, isNormal ? '#ff4444' : '#ffffff', sIsCrit ? (isNormal ? 'crit-dmg' : 'crit-true') : (isNormal ? 'direct-dmg' : 'true-dmg'));
            touched.add(e);
          }
        }
      }
      // P17 JS shell.js:99,101 — 500ms 主轨 + 150ms tail (hit-shake reset)
      if (i < hits - 1) {
        await sleep(500);
        await sleep(150);
      }
    }
    api.log?.(`${caster.name} <b>攻击</b> → ${target.name}: ${totalDmg} 混合 (${hits}段 alternating phys/true${splashPct > 0 ? `, 溅射 ${splashPct}%` : ''})`);
    return { touched: [...touched] };
  },

  // ── 钻石 ──
  // JS diamond.js:58-74 doDiamondSmash 1:1 — phys = def×defScale + mr×mrScale + atk×atkScale + bleed
  //   旧 Phaser: 公式简化 (atk×1.3 + def×1.5), 缺 mr 项, 缺 bleed DoT
  diamondSmash: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const defScale = (skill.defScale as number) ?? 1.0;
    const mrScale = (skill.mrScale as number) ?? 1.0;
    const atkScale = (skill.atkScale as number) ?? 0.1;
    // JS diamond.js:61-62 — dmg = round(def·defScale)+round(mr·mrScale)+round(atk·atkScale),
    //   走 applyRawDmg(无护甲减免, 无暴击, 无闪避) → 用 dealRaw (raw + on-hit链, JS:72)
    //   (旧 PoC 走 dealPhysical → 吃护甲+暴击, 双错)
    const dmg = Math.round(caster.def * defScale)
      + Math.round((caster.mr ?? caster.def) * mrScale)
      + Math.round(caster.atk * atkScale);
    const shown = dealRaw(caster, target, dmg, 'phy');
    api.floatNum(target, `${shown}`, '#ff4444', 'direct-dmg');
    // bleed DoT (JS:66-70 applyDotStacks)
    const bleedTurns = skill.bleedTurns as number | undefined;
    if (bleedTurns && target.alive) {
      const bleedValue = (skill.bleedValue as number) ?? 12;
      const stacks = Math.max(1, Math.round(bleedValue * bleedTurns / 4));
      applyDotStacks(target, 'bleed', stacks);   // F4: 层数累加 + duration:999 (JS:66-70 applyDotStacks)
      // 用户: 造成流血时不跳"流血×N"文字/图标
    }
    api.log?.(`${caster.emoji}${caster.name} <b>钻石冲撞</b> → ${target.emoji}${target.name}：${shown}物理${bleedTurns ? ' + 流血' : ''}`);
    return { touched: [target] };
  },

  // JS diamond.js:22-55 doDiamondCollide 1:1 — phys = atk×atkScale + def×defScale + mr×mrScale + maxHp×selfHpPct
  //   + collision counter: 每命中 +1, ≥ stunAfter 时眩晕 1 回合并重置
  //   旧 Phaser: atk×1.0 + def×2, 缺 mr/maxHp 项, 缺 stun 机制
  diamondCollide: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const atkScale = (skill.atkScale as number) ?? 0;
    const defScale = (skill.defScale as number) ?? 0;
    const mrScale = (skill.mrScale as number) ?? 0;
    const selfHpPct = (skill.selfHpPct as number) ?? 0;
    const base = Math.round(caster.atk * atkScale)
      + Math.round(caster.def * defScale)
      + Math.round((caster.mr ?? caster.def) * mrScale)
      + Math.round(caster.maxHp * selfHpPct / 100);
    const isCrit = rollCrit(effectiveCrit(caster));
    const dmg = dealPhysical(caster, target, base, isCrit);
    api.floatNum(target, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
    // 碰撞累计计数存在【目标】身上 (描述: "一个目标累计被碰撞N次" → 任意来源对该目标累计;
    //   直接做成目标 debuff 状态, 不再挂施法者)。满 stunAfter 眩晕 1 回合并清零。
    const stunAfter = (skill.stunAfter as number) ?? 0;
    if (stunAfter > 0 && target.alive) {
      const tt = target as Fighter & { _diamondCollideStacks?: number; _diamondCollideMax?: number; _stunUsed?: boolean };
      tt._diamondCollideMax = stunAfter;
      tt._diamondCollideStacks = (tt._diamondCollideStacks ?? 0) + 1;
      if (tt._diamondCollideStacks >= stunAfter) {
        tt._diamondCollideStacks = 0;
        target.buffs.push({ type: 'stun', value: 1, duration: 2 });
        tt._stunUsed = false;
        api.floatNum(target, '💫眩晕!', '#fbbf24', 'crit-label');
      }
    }
    applyPostHitLayers(caster, target, dmg, isCrit, 'physical');
    api.log?.(`${caster.emoji}${caster.name} <b>碰撞</b> → ${target.emoji}${target.name}：${dmg}物理${stunAfter ? ' (累计眩晕)' : ''}`);
    return { touched: [target] };
  },

  // ── stone ──
  // 磐石之躯 (rework 2026-05-28): 岩层被动(受击+1层, passive-triggers) + 岩石冲击波主动。
  //   主动: 对【一横排敌人】(target 所在屏幕横排 = sameColumnFighters, front+back 同列)
  //     物理 = (DEF×defScale + MR×mrScale) × (1 + rockLayerDmgScale×岩层层数)
  //     眩晕: rockStunPctPerLayer% × 岩层层数 概率, stunTurns 回合
  //   岩层在 createFighter 检测到本技能时门控(_hasRockArmor); 减伤 1%/层 在 applyRawDamage。
  rockShockwave: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const defScale = (skill.defScale as number) ?? 0.5;
    const mrScale = (skill.mrScale as number) ?? 0.5;
    const layerScale = (skill.rockLayerDmgScale as number) ?? 0.04;
    const stunPctPerLayer = (skill.rockStunPctPerLayer as number) ?? 1;
    const stunTurns = (skill.stunTurns as number) ?? 1;
    const layers = (caster as Fighter & { _rockLayers?: number })._rockLayers ?? 0;
    const mult = 1 + layerScale * layers;
    // 一横排 = sameColumnFighters(target) (slot-helpers 注释: 同 col 索引 = 屏上横排), 取敌方 alive
    const rowTargets = sameColumnFighters(api.allFighters, target).filter(t => t.alive && t.side !== caster.side);
    const targets = rowTargets.length ? rowTargets : [target];
    const touched: Fighter[] = [];
    for (const t of targets) {
      if (!t.alive) continue;
      const base = Math.round((caster.def * defScale + (caster.mr ?? caster.def) * mrScale) * mult);
      const isCrit = rollCrit(effectiveCrit(caster));
      // 击飞: 先设 _inHop 让 knockup 接管视觉 — 抑制通用受击帧+18px击退, watcher 也不每帧拽回
      //   (见 debug 纪律: 自定义击飞 vs 通用击退抢 sprite)。飘字数字本身仍显示。
      api.setInHop?.(t, true);
      const dmg = dealPhysical(caster, t, base, isCrit);
      api.floatNum(t, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg', 0, 0);
      applyPostHitLayers(caster, t, dmg, isCrit, 'physical');
      if (t.alive) api.knockup?.(t);   // 冲击波击飞命中的敌人
      // 眩晕: 1%×层 概率 (层数越多越稳)
      if (t.alive && layers > 0) {
        const chance = Math.min(100, stunPctPerLayer * layers);
        if (Math.random() * 100 < chance) {
          t.buffs.push({ type: 'stun', value: 1, duration: stunTurns + 1 });
          (t as Fighter & { _stunUsed?: boolean })._stunUsed = false;
          api.floatNum(t, '💫眩晕!', '#fbbf24', 'crit-label', 200, 0);
        }
      }
      touched.push(t);
    }
    await sleep(450);   // 等击飞 (~400ms) 落地
    for (const t of touched) api.setInHop?.(t, false);   // 清 _inHop, watcher 恢复接管
    api.log?.(`${caster.emoji}${caster.name} <b>岩石冲击波</b>：${layers}层岩层 (伤害 ×${mult.toFixed(1)})`);
    return { touched };
  },
  // JS stone.js:16-34 doStoneTaunt 1:1 — selfCast redirect + 永久盾
  //   buff: { type:'redirectAll', turns: skill.redirectTurns || 3 }
  //   shield = round(atk × selfShieldAtkScale × shieldMult)  (默认 atkScale=1.0)
  //   旧 Phaser 用 def×1.5 + maxHp×10% 都不对, 无 redirectAll buff → 嘲讽无效
  // redirect 消费在 BattleScene.runSkillHandler (JS action.js:484-498 1:1)
  stoneTaunt: async (api, caster, _target, skill) => {
    const turns = (skill.redirectTurns as number) ?? 3;
    // 清旧 redirectAll, 添加新的 (JS:19-20)
    caster.buffs = caster.buffs.filter(b => b.type !== 'redirectAll');
    caster.buffs.push({ type: 'redirectAll', value: 1, duration: turns });
    // 永久盾 (JS:22-24)
    const shieldScale = (skill.selfShieldAtkScale as number | undefined) ?? 1.0;
    const shieldAmt = Math.round(Math.round(caster.atk * shieldScale) * ruleModifiers.shieldMult());
    if (shieldAmt > 0) applyShield(caster, shieldAmt);
    // P80 1:1 JS stone.js:26-28 — 3 条 float (crit-label yOff=-20, passive-num delay=200, shield-num delay=380)
    api.floatNum(caster, `嘲讽!`, '#ffd86b', 'crit-label', 0, -20);
    api.floatNum(caster, `转移${turns}回合`, '#ffd86b', 'passive-num', 200, 0);
    if (shieldAmt > 0) api.floatNum(caster, `+${shieldAmt}`, '#c0c0c0', 'shield-num', 380, 0);
    sfxBuff();
    await sleep(800);  // JS stone.js:33
    return { touched: [caster] };
  },

  // ── bamboo (JS skills/bamboo.js 1:1 移植) ──
  // E3/12: 4 个 bamboo skill 之前全错或 stub, 现按 JS doBambooLeaf/Heal/Smack/Spikes 重写

  /**
   * 一叶刃 (JS doBambooLeaf, bamboo.js:1-22):
   *   3 hits × (atk×atkScale + maxHp×selfHpPct/100), 物理
   *   每段独立 crit roll + def reduce + on-hit + 500ms sleep
   *   走 dealPhysical helper — 自动跑 dodge / passive 加成 / on-hit 链 / battleStats
   */
  bambooLeaf: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const hits = (skill.hits as number) ?? 3;
    const atkScale = (skill.atkScale as number) ?? 0.21;
    const selfHpPct = (skill.selfHpPct as number) ?? 6;
    let total = 0;
    for (let i = 0; i < hits; i++) {
      if (!target.alive) break;
      const isCrit = rollCrit(effectiveCrit(caster));
      // base = atk×atkScale + maxHp×selfHpPct% (JS:7 同公式)
      const base = caster.atk * atkScale + caster.maxHp * selfHpPct / 100;
      const dmg = dealPhysical(caster, target, base, isCrit);
      total += dmg;
      api.floatNum(target, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg', 0, 0);
      if (i < hits - 1) await sleep(400);  // P81 1:1 JS bamboo.js:18 sleep(400)
    }
    api.log?.(`${caster.emoji}${caster.name} <b>一叶刃</b> ${hits}段 → ${target.emoji}${target.name}：${total}伤害`);
    return { touched: [target] };
  },

  /**
   * 自然恢复 (JS doBambooHeal, bamboo.js:24-58):
   *   有友军: 自回 healPct% maxHp + 给每个友军 shieldPct% maxHp 护盾, shieldTurns 回合
   *   无友军: 自回 soloHealPct% maxHp
   */
  bambooHeal: async (api, caster, _target, skill) => {
    const allAllies = getAllies(api, caster);
    const allies = allAllies.filter(a => a !== caster && a.alive);  // 排除自己
    const healPct = (skill.healPct as number) ?? 10;
    const shieldPct = (skill.shieldPct as number) ?? 12;
    const soloHealPct = (skill.soloHealPct as number) ?? 15;
    if (allies.length > 0) {
      // 自回 healPct%
      const healAmt = Math.round(caster.maxHp * healPct / 100);
      const actual = applyHeal(caster, healAmt);
      if (actual > 0) api.floatNum(caster, `+${actual}`, '#06d6a0', 'heal-num', 0, 0);  // P81 1:1 JS heal-num cls
      // 用户(2026-05-28): 改永久盾, 不挂 buff → 状态栏不显示(原 hidingShield 类型还会误显示成"缩头护盾")。
      //   盾值常驻直到被打掉; 受 铁壁之日 护盾增幅 (shieldMult ×1.3)。
      for (const a of allies) {
        const shieldAmt = Math.round(Math.round(caster.maxHp * shieldPct / 100) * ruleModifiers.shieldMult());
        a.shield = (a.shield ?? 0) + shieldAmt;
        battleStats.recordShield(a, shieldAmt);
        api.floatNum(a, `+${shieldAmt}`, '#c0c0c0', 'shield-num', 0, 0);
      }
      await sleep(800);  // JS bamboo.js:57
      return { touched: [caster, ...allies] };
    } else {
      // 无友军: 自回 soloHealPct%
      const healAmt = Math.round(caster.maxHp * soloHealPct / 100);
      const actual = applyHeal(caster, healAmt);
      if (actual > 0) api.floatNum(caster, `+${actual}`, '#06d6a0', 'heal-num', 0, 0);
      await sleep(800);
      return { touched: [caster] };
    }
  },

  /**
   * 竹击 (JS doBambooSmack, bamboo.js:176-220):
   *   单段 atk×1.0 物理 + chilled 1 回合 (-20% ATK) + knockToFront
   *   走 dealPhysical (跑 dodge/passive/on-hit/stats)
   */
  bambooSmack: async (api, caster, target, skill) => {
    if (!target || !target.alive) return { touched: [] };
    const atkScale = (skill.atkScale as number) ?? 1.0;
    const chilled = skill.chilled as number | undefined;
    const knockToFront = !!skill.knockToFront;
    const isCrit = rollCrit(effectiveCrit(caster));
    const base = caster.atk * atkScale;
    const dmg = dealPhysical(caster, target, base, isCrit);
    api.floatNum(target, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg', 0, 0);
    // P81 1:1 JS bamboo.js:181 — value:1 flag (recalc 判 type 不读 value), duration=chilled+1 (turn-end -1)
    if (chilled && target.alive) {
      target.buffs.push({ type: 'chilled', value: 1, duration: chilled + 1 });
      api.floatNum(target, '❄冰寒', '#87ceeb', 'debuff-label', 200, 0);
      api.log?.(`${target.emoji}${target.name} 被冰寒 ${chilled} 回合`);
    }
    // knockToFront (用户校正 2026-05-28): 只有目标在【后排】且【它正前方(同列)的前排位为空】才击至前排;
    //   同列前排被占 → 被挡住, 留在后排。原代码"找任意空前排槽"会把目标挪到别的列, 错。
    if (knockToFront && target.alive && target._position === 'back' && frontSlotEmpty(api.allFighters, target)) {
      const col = (target as Fighter & { _slotKey?: string })._slotKey?.split('-')[1];
      target._position = 'front';
      if (col != null) (target as Fighter & { _slotKey?: string })._slotKey = `front-${col}`;
      api.floatNum(target, '击至前排!', '#7dffb3');
      api.repositionFighter?.(target);   // 视觉: sprite 0.4s 平移到同列前排槽
    }
    return { touched: [target] };
  },

  /**
   * 竹刺阵 (JS doBambooSpikes, bamboo.js:223-244):
   *   全体敌方 N 段 × (atk×atkScale + maxHp×selfHpPct/100), 物理
   *   走 dealPhysical (per-hit on-hit / passive / stats)
   */
  bambooSpikes: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    const hits = (skill.hits as number) ?? 5;
    const atkScale = (skill.atkScale as number) ?? 0.18;
    const selfHpPct = (skill.selfHpPct as number) ?? 3;
    const base = caster.atk * atkScale + caster.maxHp * selfHpPct / 100;
    for (const e of enemies) {
      if (!e.alive) continue;
      // P81 1:1 JS bamboo.js:232-237 — per-hit float 错开 h*60ms, cls='direct-dmg'
      for (let h = 0; h < hits; h++) {
        if (!e.alive) break;
        const isCrit = rollCrit(effectiveCrit(caster));
        const dmg = dealPhysical(caster, e, base, isCrit);
        api.floatNum(e, `${dmg}`, '#ff4444', 'direct-dmg', h * 60, 0);
      }
    }
    await sleep(400);  // JS bamboo.js:243
    return { touched: enemies };
  },

  // ── dice ──
  // JS dice.js:1-30 doDiceAttack 1:1 — totalBase = atk×atkScale + crit×critBonusMult, hits 段平摊
  //   每段独立 crit + overflow handling (crit>1.0 转 critDmg)
  // 旧 Phaser: 随机 0.5-2x 单段 — 完全错!
  diceAttack: async (api, caster, target, skill) => {
    if (!target || !target.alive) return { touched: [] };
    const atkScale = (skill.atkScale as number) ?? 1.0;
    const critBonusMult = (skill.critBonusMult as number) ?? 100;
    const hits = (skill.hits as number) ?? 3;
    // totalBase = atk×atkScale + round(crit × critBonusMult)
    const totalBase = Math.round(caster.atk * atkScale) + Math.round((caster.crit ?? 0) * critBonusMult);
    const perHit = Math.round(totalBase / hits);
    let total = 0;
    for (let i = 0; i < hits; i++) {
      if (!target.alive) break;
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      const effDef = calcEffArmor(caster, target);
      const dmg = Math.max(1, Math.round(perHit * critMult * calcDmgMult(effDef)));
      const wasA = target.alive;
      const r = applyRawDamage(target, dmg, 'physical');
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      total += shown;
      battleStats.recordDamage(caster, target, shown, 'phy');
      if (wasA && !target.alive) battleStats.recordKill(caster, target);
      api.floatNum(target, `${shown}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
      triggerOnHitEffects(caster, target, dmg, { floatNum: api.floatNum });
      applyPostHitLayers(caster, target, shown, isCrit, 'physical');
      if (i < hits - 1) await sleep(400);
    }
    api.log?.(`${caster.emoji}${caster.name} <b>骰子攻击</b> → ${target.emoji}${target.name}：${total}物理 (crit ${Math.round((caster.crit ?? 0) * 100)}%)`);
    return { touched: [target] };
  },
  // v0.9.5.B4: diceFate 真 port — JS dice.js:120-129 (掷骰 minCrit~maxCrit% 暴击 buff)
  diceFate: async (api, caster, _target, skill) => {
    const minCrit = (skill.minCrit as number) ?? 15;
    const maxCrit = (skill.maxCrit as number) ?? 60;
    const duration = (skill.duration as number) ?? 3;
    const critGain = minCrit + Math.floor(Math.random() * (maxCrit - minCrit + 1));
    // F3: 用 diceFateCrit buff (非 critUp), 让 gamblerBlood 重算后能重加 (JS dice.js:125 / turn.js:1050)
    caster.buffs.push({ type: 'diceFateCrit', value: critGain, duration: duration + 1 });
    // P43: JS dice.js:125 不 cap 1.0 — 让 overflowCrit 经 calcCritMult 转 critDmg
    caster.crit = (caster.crit ?? 0) + critGain / 100;
    // 头顶飘字: 掷出的暴击几率提升 (金色 buff 飘字, 同 passive 增益款)
    api.floatNum(caster, `+${critGain}% 暴击几率`, '#ffd93d', 'passive-num');
    api.log?.(`${caster.emoji}${caster.name} <b>命运骰子</b>: +${critGain}% 暴击 ${duration}回合`);
    return { touched: [caster] };
  },

  // ── hunter ──
  // v0.9.5.A77b: hunterShot 完整 — execThresh<%HP 时 +execCrit% + execCritDmg%, hits 段间隔
  // v0.9.5.A98: hunterShot 真 port — JS hunter.js:1-55 + fireProjectile (~70 行 vs 之前 27 行)
  //   1) execThresh 检查: HP < 阈值 → +execCrit% 暴击, +execCritDmg% 爆伤
  //   2) 等 240ms (caster attack-hop 到前)
  //   3) Loop hits 次:
  //      - 生成箭矢 sprite (旋转朝向 target)
  //      - tween caster → target 240ms (沿路径旋转)
  //      - 到达后 applyRawDamage + 飘字 + hit-shake
  //      - sleep 140ms 段间
  //   4) 还原 crit/extraCritDmg
  hunterShot: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const cv = api.viewOf(caster);
    if (!cv) return { touched: [] };
    const scene = api.scene;
    const execThresh = (skill.execThresh as number) ?? 30;
    const execCrit = (skill.execCrit as number) ?? 50;
    const execCritDmg = (skill.execCritDmg as number) ?? 80;
    const isExec = target.hp / target.maxHp < execThresh / 100;
    const savedCrit = caster.crit;
    if (isExec) {
      // P83 1:1 JS hunter.js:17 — crit 不 cap 1.0, 让 overflowCrit×overflowMult 经 calcCritMult 转 critDmg
      caster.crit = caster.crit + execCrit / 100;
      (caster as Fighter & { _extraCritDmg?: number })._extraCritDmg = execCritDmg / 100;
      api.floatNum(caster, `+${execCrit}%暴 +${execCritDmg}%爆`, '#ffd93d');
    }
    const hits = (skill.hits as number) ?? 3;
    const atkScale = (skill.atkScale as number) ?? 1.0;
    let totalDmg = 0, totalCrits = 0;

    // 等 240ms (caster 到前)
    await sleep(240);

    for (let i = 0; i < hits; i++) {
      if (!target.alive) break;
      const tv = api.viewOf(target);
      if (!tv) break;

      // ── K10: 飞 hunter-arrow sprite (JS spawnHunterArrow, 替代旧手画 graphics 箭) ──
      const startX = cv.x + (caster.side === 'left' ? 30 : -30);
      const startY = cv.y;
      if (!_auditMode) await fireHunterArrow(scene, startX, startY, tv.x, tv.y, 240);
      if (!target.alive) break;

      // 计算 damage + apply
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      const eDef = calcEffArmor(caster, target);
      const perHit = Math.round(caster.atk * atkScale * critMult * calcDmgMult(eDef));
      const wasAlive = target.alive;
      const r = applyRawDamage(target, Math.max(1, perHit), 'physical');
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      totalDmg += shown;
      if (isCrit) totalCrits++;
      battleStats.recordDamage(caster, target, shown, 'phy');
      if (wasAlive && !target.alive) battleStats.recordKill(caster, target);
      api.floatNum(target, `${shown}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
      triggerOnHitEffects(caster, target, perHit, { floatNum: api.floatNum });
      applyPostHitLayers(caster, target, shown, isCrit, 'physical');

      // 受击击退 (JS sceneKnockback) — 替换自创 ±6px wobble (hunterShot 走 applyRawDamage 不经 deal*)
      api.hitKnockback?.(target, caster.side);

      if (i < hits - 1) await sleep(140);
    }
    caster.crit = savedCrit;
    (caster as Fighter & { _extraCritDmg?: number })._extraCritDmg = 0;
    api.scene.events.emit('hunter-shot-log', { name: caster.name, total: totalDmg, crits: totalCrits });
    return { touched: [target] };
  },
  // v0.9.5.B7: hunterMark 真 port — JS 用 hunterMark 检 HP%threshold 处决
  // 印记: HP < markThreshPct% → 命中时直接斩杀 (applyRawDmg 里检 buff)
  // P45 hunterMark 1:1 JS skills/hunter.js:132-142
  //   doDamage(atkScale 1.6 物理) + mark buff (markExecPct%, markTurns)
  hunterMark: async (api, caster, target, skill) => {
    if (!target || !target.alive) return { touched: [] };
    // 物理段 (JS:135 doDamage — atkScale 1.6)
    const atkScale = (skill.atkScale as number) ?? 1.6;
    const isCrit = rollCrit(effectiveCrit(caster));
    const dmg = dealPhysical(caster, target, caster.atk * atkScale, isCrit);
    api.floatNum(target, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
    applyPostHitLayers(caster, target, dmg, isCrit, 'physical');
    // mark buff (JS:136-141)
    if (target.alive && skill.markTurns) {
      const markExecPct = (skill.markExecPct as number) ?? 24;
      const markTurns = (skill.markTurns as number) ?? 3;
      target.buffs = target.buffs.filter(b => b.type !== 'hunterMark');
      target.buffs.push({
        type: 'hunterMark', value: markExecPct, duration: markTurns + 1,
        sourceIdx: api.allFighters.indexOf(caster),
      } as typeof target.buffs[number] & { sourceIdx: number });
      api.floatNum(target, '🎯猎杀印记', '#ff8c42', 'debuff-label');
      api.log?.(`${target.emoji}${target.name} 被标记! HP<${markExecPct}% 时斩杀`);
    }
    api.log?.(`${caster.emoji}${caster.name} <b>猎杀印记</b> → ${target.emoji}${target.name}：${dmg}物理`);
    return { touched: [target] };
  },

  // ── lava ──
  // 熔岩弹 (basic): magic (atkScale + 8%×targetMaxHp) + burn
  lavaBolt: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    // P89 1:1 JS lava.js:1-19 — mainDmg (mr-reduced) + hpBonus (NOT mr-reduced), sum 应用一次
    //   之前 PoC 把 hpBonus 也走 dealMagic → 被 mr 减 → 高 mr 敌人少伤
    const hpPct = (skill.targetHpPct as number) ?? 8;
    const atkScale = (skill.atkScale as number) ?? 0.9;
    const isCrit = rollCrit(effectiveCrit(caster));
    const critMult = isCrit ? calcCritMult(caster) : 1;
    const effMr = calcEffMr(caster, target);
    const mainDmg = Math.max(1, Math.round(caster.atk * atkScale * critMult * calcDmgMult(effMr) * ruleModifiers.magicMult()));
    const hpBonus = Math.round(target.maxHp * hpPct / 100 * critMult);
    const total = mainDmg + hpBonus;
    const wasA = target.alive;
    const r = applyRawDamage(target, total, 'magic');
    const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
    battleStats.recordDamage(caster, target, shown, 'mag');
    if (wasA && !target.alive) battleStats.recordKill(caster, target);
    api.floatNum(target, `${shown}`, '#4dabf7', isCrit ? 'crit-magic' : 'magic-dmg');
    triggerOnHitEffects(caster, target, total, { floatNum: api.floatNum });
    applyPostHitLayers(caster, target, shown, isCrit, 'magic');
    // P89 1:1 JS combat.js:412 applySkillDebuffs — burn stacks = max(1, round(atk×0.67))
    if (skill.burn) applyBurn(target, Math.max(1, Math.round(caster.atk * 0.67)), 5);
    api.log?.(`${caster.emoji}${caster.name} <b>熔岩弹</b> → ${target.emoji}${target.name}：${shown}魔法${skill.burn ? ' + 灼烧' : ''}`);
    await sleep(500);
    return { touched: [target] };
  },
  lavaQuake: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    const base = caster.atk * ((skill.atkScale as number) ?? 0.6);
    const mrDown = skill.mrDown as { pct: number; turns: number } | undefined;
    for (const e of enemies) {
      const dmg = dealMagic(caster, e, base);
      api.floatNum(e, `${dmg}`, '#4dabf7', 'magic-dmg');
      // P89 1:1 JS lava.js:38-41 — mrDown max-merge with existing (之前 PoC 重复 push 叠多个)
      if (mrDown) {
        const existing = e.buffs.find(b => b.type === 'mrDown');
        if (existing) {
          existing.value = Math.max(existing.value, mrDown.pct);
          existing.duration = Math.max(existing.duration ?? 0, mrDown.turns + 1);
        } else {
          e.buffs.push({ type: 'mrDown', value: mrDown.pct, duration: mrDown.turns + 1 });
        }
      }
    }
    api.log?.(`${caster.name} 地裂 全敌${mrDown ? ` + -${mrDown.pct}%魔抗 ${mrDown.turns}回合` : ''}`);
    await sleep(600);
    return { touched: enemies };
  },
  lavaSurge: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const base = caster.atk * ((skill.atkScale as number) ?? 1.5);
    const dmg = dealMagic(caster, target, base);
    const shieldAmt = Math.round(caster.atk * ((skill.shieldAtkPct as number) ?? 80) / 100);
    applyShield(caster, shieldAmt);
    api.floatNum(target, `${dmg}`, '#4dabf7', 'magic-dmg');
    api.floatNum(caster, `+${shieldAmt}`, '#c0c0c0', 'shield-num');
    api.log?.(`${caster.emoji}${caster.name} <b>岩浆涌动</b> → ${target.emoji}${target.name}：${dmg}魔法 + ${shieldAmt}永久护盾`);
    await sleep(600);
    return { touched: [target, caster] };
  },
  // 熔岩喷射 (CD3): aoe 3 段 magic + burn
  // JS lava.js:73-80 doLavaSplash — **单体**(doDamage, targetMode:single) 多段 + 灼烧
  //   (旧 PoC 全敌 AoE 是自创, 远强于 JS)
  lavaSplash: async (api, caster, target, skill) => {
    // #8 H7: 熔岩喷射标 aoe:true 且描述"对全体敌方", 但旧版只循环单 target → 改真·全体。
    const isAoe = !!skill.aoe;
    const targets = isAoe ? getEnemies(api, caster) : (target && target.alive ? [target] : []);
    if (!targets.length) return { touched: [] };
    const hits = (skill.hits as number) ?? 3;
    const atkScale = (skill.atkScale as number) ?? 0.2;
    // 段外循环: 每段全体齐喷, 段间 500ms (E3/8: JS combat.js:266 同款)
    for (let i = 0; i < hits; i++) {
      for (const t of targets) {
        if (!t.alive) continue;
        const dmg = dealMagic(caster, t, caster.atk * atkScale);
        api.floatNum(t, `${dmg}`, '#4dabf7', 'magic-dmg');
      }
      if (i < hits - 1) await sleep(500);
    }
    // applySkillDebuffs({burn:true}) 默认层数 round(atk×0.67) (JS lava.js:77)
    if (skill.burn) for (const t of targets) if (t.alive) applyBurn(t, defaultBurnStacks(caster));
    api.log?.(`${caster.emoji}${caster.name} 熔岩飞溅 → ${isAoe ? '全体敌方' : (target?.name ?? '')} ${hits}段${skill.burn ? ' + 灼烧' : ''}`);
    return { touched: targets };
  },
  // lavaEnhancedRage: passive (火爆) — onTakeDmg 触发, handler no-op
  lavaEnhancedRage: async (_api, caster, _target, _skill) => ({ touched: [caster] }),

  // ── lightning — JS skills/lightning.js 完整移植 ──
  // 闪电打击 (basic): 5 段 magic + 每段叠 shock 层 + 25% 溅射次目标
  lightningStrike: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const hits = (skill.hits as number) ?? 5;
    const atkScale = (skill.atkScale as number) ?? 0.23;
    const splashPct = (skill.splashPct as number) ?? 25;
    // P79: JS lightning.js:5 — perHit = (atk * atkScale) / hits (PoC 之前没除 → 5x 伤害 bug)
    const perHit = caster.atk * atkScale / hits;
    const touched: Fighter[] = [target];
    let totalMain = 0, totalSplash = 0;
    for (let i = 0; i < hits; i++) {
      if (!target.alive) break;
      const dmg = dealMagic(caster, target, perHit);
      totalMain += dmg;
      api.floatNum(target, `${dmg}`, '#4dabf7', 'magic-dmg');
      // P79: 不手动 addShockStack — dealMagic→triggerOnHitEffects 已 +1 (JS lightning.js:21)
      // 溅射次目标 (JS lightning.js:23-34 基数=perHit, 不是 atk*atkScale)
      if (splashPct > 0) {
        const others = getEnemies(api, caster).filter(e => e !== target);
        if (others.length) {
          const sec = others[Math.floor(Math.random() * others.length)];
          const sDmg = dealMagic(caster, sec, perHit * splashPct / 100);
          totalSplash += sDmg;
          // JS spawnFloatingNum delayMs=200 for splash (lightning.js:31)
          api.floatNum(sec, `${sDmg}`, '#4dabf7', 'magic-dmg', 200, 0);
          if (!touched.includes(sec)) touched.push(sec);
        }
      }
      // P17 JS lightning.js:38-40 — 600ms 主轨 + 100ms tail
      if (i < hits - 1) {
        await sleep(600);
        await sleep(100);
      }
    }
    api.log?.(`${caster.name} <b>闪电打击</b> → ${target.name}: ${totalMain}伤害${totalSplash > 0 ? ` + 溅射${totalSplash}` : ''}`);
    return { touched };
  },
  // 雷暴 (CD6): 20 次随机 magic, 每次叠 shock 层
  lightningBarrage: async (api, caster, _target, skill) => {
    const hits = (skill.hits as number) ?? 20;
    const arrowScale = (skill.arrowScale as number) ?? 0.11;
    const touched: Fighter[] = [];
    for (let i = 0; i < hits; i++) {
      const alive = getEnemies(api, caster);
      if (!alive.length) break;
      const t = alive[Math.floor(Math.random() * alive.length)];
      const dmg = dealMagic(caster, t, caster.atk * arrowScale);
      api.floatNum(t, `${dmg}`, '#4dabf7', 'magic-dmg');
      // P79: 不手动 addShockStack — dealMagic→triggerOnHitEffects 已 +1 (JS lightning.js:64)
      if (!touched.includes(t)) touched.push(t);
      // P17 JS lightning.js:68-70 — 280ms 主 + 70ms tail (之前 500ms flat 错)
      if (i < hits - 1) {
        await sleep(280);
        await sleep(70);
      }
    }
    api.log?.(`${caster.emoji}${caster.name} <b>雷暴</b> ${hits} 次随机敌方`);
    return { touched };
  },
  // 感电 (CD4): aoe 真伤 = 每层 shock × 10% × ATK, 清空层
  lightningSurge: async (api, caster, _target, skill) => {
    const perStackScale = (skill.shockPerStackScale as number) ?? 0.1;
    const touched: Fighter[] = [];
    for (const e of getEnemies(api, caster)) {
      const stacks = getShockStacks(e);
      if (stacks <= 0) continue;
      const dmg = Math.max(1, Math.round(caster.atk * perStackScale * stacks));
      // P79: 真伤 dmgType='true' (JS lightning.js:100 'true' — PoC 之前默认 'physical')
      const wasAlive = e.alive;
      const r = applyRawDamage(e, dmg, 'true');
      const s = r.hpLoss + r.shieldAbs;
      battleStats.recordDamage(caster, e, s, 'tru');
      if (wasAlive && !e.alive) battleStats.recordKill(caster, e);
      // JS lightning.js:102 cls='direct-dmg' (奇怪但 1:1), atkSide passes for arc
      api.floatNum(e, `${s}`, '#ffffff', 'direct-dmg');
      api.log?.(`${caster.emoji}${caster.name} <b>感电</b> ${e.name}：${stacks}层 → ${s} 真实`);
      // P79: 先清层数 再 triggerOnHit (JS lightning.js:105-107) — 防 trigger 重新加层后被清
      clearShockStacks(e);
      triggerOnHitEffects(caster, e, s, _skillApi ? { floatNum: _skillApi.floatNum } : {});
      touched.push(e);
    }
    await sleep(400);  // P17 JS lightning.js:111
    return { touched };
  },
  // 雷盾 (CD3): 自施护盾 + counter 反击 magic + 叠 shock (JS lightning.js:76-90)
  lightningShield: async (api, caster, _target, skill) => {
    const shieldAmt = Math.round(caster.atk * ((skill.shieldScale as number) ?? 0.9));
    applyShield(caster, shieldAmt);
    // P79: buff type 必须是 'counter' 才能被 passive-triggers.ts:290 的 6j 触发器吃到.
    //   之前 'lightningCounter' → checker 找不到 → 反击永不发动.
    //   JS lightning.js:84 turns:3, PoC 用 duration:3 (持续 3 回合, 由 stats-recalc tickBuffsDuration 减).
    const counterDmg = Math.round(caster.atk * ((skill.counterScale as number) ?? 0.1));
    caster.buffs.push({ type: 'counter', value: counterDmg, duration: 3 });
    // JS lightning.js:81-85 spawnFloatingNum 两条 (shield-num + passive-num delay=200)
    api.floatNum(caster, `+${shieldAmt}`, '#c0c0c0', 'shield-num', 0, 0);
    api.floatNum(caster, `反击`, '#ffd700', 'passive-num', 200, 0);
    api.log?.(`${caster.emoji}${caster.name} <b>雷盾</b>: +${shieldAmt}护盾 反击${counterDmg}魔法`);
    await sleep(800);  // JS lightning.js:89
    return { touched: [caster] };
  },
  // lightningStorm: passive (每回合自动电击) — by turn hook, handler no-op
  lightningStorm: async (_api, caster, _target, _skill) => ({ touched: [caster] }),

  // P114 涌动 (用户 spec, 替换原 commonAtkBuff 在 lightning 上的位):
  //   - 接下来 surgeTurns (2) 回合 lightningStorm shock 满层引爆真伤 +shockBoostPct% (50%)
  //   - 立即电击 target, 造成 1× ATK × shockScale × 1.5 真伤 (lightningStorm passive 同款公式)
  lightningSurgeBuff: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const surgeTurns = (skill.surgeTurns as number) ?? 2;
    const shockBoostPct = (skill.shockBoostPct as number) ?? 50;
    const cf = caster as Fighter & { _lightningSurgeTurns?: number; _lightningShockBoostPct?: number };
    cf._lightningSurgeTurns = surgeTurns + 1;   // turn-begin -1 → 持续 surgeTurns 回合
    cf._lightningShockBoostPct = shockBoostPct;
    api.floatNum(caster, `⚡涌动 +${shockBoostPct}%电真伤 ${surgeTurns}t`, '#ffd86b', 'passive-num');
    // 立即电击 target (1× ATK × shockScale × (1 + shockBoost) 真伤)
    const shockScale = (caster.passive?.shockScale as number) ?? 1.0;
    const boost = 1 + shockBoostPct / 100;
    const dmg = Math.max(1, Math.round(caster.atk * shockScale * boost));
    const wasA = target.alive;
    fireLightningVfx(target);   // 用户: 涌动的即时被动电击也要闪电劈下特效 (同满层引爆)
    const r = applyRawDamage(target, dmg, 'true');
    const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
    battleStats.recordDamage(caster, target, shown, 'tru');
    if (wasA && !target.alive) battleStats.recordKill(caster, target);
    api.floatNum(target, `${shown}`, '#ffffff', 'true-dmg');   // 用户: 真伤裸数字, 去掉 ⚡emoji
    triggerOnHitEffects(caster, target, dmg, { floatNum: api.floatNum });
    api.log?.(`${caster.emoji}${caster.name} <b>涌动</b> → ${target.emoji}${target.name}：⚡${shown} 真实 (+${shockBoostPct}% buff ${surgeTurns}t)`);
    return { touched: [caster, target] };
  },

  // ── rainbow ──
  // P16: rainbowPrism 删除 active 版 — JS 中 rainbowPrism 仅 passive (pets.js 用 type:'rainbowPrism' 是 passiveType, 不是 skillType).
  // 现 stub 为 passive no-op (与其他 passive 处理一致).
  rainbowPrism: async (_a, c) => ({ touched: [c] }),
  // JS rainbow.js:1-53 doRainbowStorm 1:1 — N 段 × 全敌, 每段 magic + true 两份伤害
  //   magic: atk × atkScale (走 mr 减免)
  //   true:  atk × pierceScale (不减免)
  //   完成后 applySkillDebuffs (burn etc.)
  // 旧 Phaser: 单段 magic, 缺 hits loop, 缺 true 部分 — 错!
  rainbowStorm: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    if (enemies.length === 0) return { touched: [] };
    const hits = (skill.hits as number) ?? 4;
    const atkScale = (skill.atkScale as number) ?? 0.4;
    const pierceScale = (skill.pierceScale as number) ?? 0.2;
    const touched: Fighter[] = [];
    for (let i = 0; i < hits; i++) {
      for (const e of enemies) {
        if (!e.alive) continue;
        const isCrit = rollCrit(effectiveCrit(caster));
        const critMult = isCrit ? calcCritMult(caster) : 1;
        // magic
        const magicBase = Math.round(caster.atk * atkScale);
        const effMr = calcEffMr(caster, e);
        const magicDmg = Math.max(1, Math.round(magicBase * critMult * calcDmgMult(effMr)));
        const wasA1 = e.alive;
        const rm = applyRawDamage(e, magicDmg, 'magic');
        const mShown = (rm.hpLoss ?? 0) + (rm.shieldAbs ?? 0);
        battleStats.recordDamage(caster, e, mShown, 'mag');
        if (wasA1 && !e.alive) battleStats.recordKill(caster, e);
        api.floatNum(e, `${mShown}`, '#4dabf7', isCrit ? 'crit-magic' : 'magic-dmg');
        // true
        const trueRaw = Math.round(caster.atk * pierceScale * critMult);
        if (trueRaw > 0 && e.alive) {
          const wasA2 = e.alive;
          const rt = applyRawDamage(e, trueRaw, 'true');
          const tShown = (rt.hpLoss ?? 0) + (rt.shieldAbs ?? 0);
          battleStats.recordDamage(caster, e, tShown, 'tru');
          if (wasA2 && !e.alive) battleStats.recordKill(caster, e);
          api.floatNum(e, `${tShown}`, '#ffffff', isCrit ? 'crit-true' : 'true-dmg');
        }
        triggerOnHitEffects(caster, e, magicDmg + trueRaw, { floatNum: api.floatNum });
        if (!touched.includes(e)) touched.push(e);
      }
      if (i < hits - 1) await sleep(500);
    }
    // P44 + addLog + defDown buff (JS rainbowStorm.defDown {pct:15,turns:3})
    const defDownBuff = (skill.defDown as { pct?: number; turns?: number } | undefined);
    if (defDownBuff?.pct) {
      for (const e of touched) {
        if (!e.alive) continue;
        e.buffs.push({ type: 'defDown', value: defDownBuff.pct, duration: (defDownBuff.turns ?? 3) + 1 });
      }
    }
    api.log?.(`${caster.name} 全色风暴 全敌 ${hits} 段${defDownBuff ? ` + -${defDownBuff.pct}%护甲 ${defDownBuff.turns}回合` : ''}`);
    return { touched };
  },

  // ── crystal — JS skills/crystal.js 完整移植 ──
  // 水晶刺 (basic): 2 段 magic (atkScale + 3%×maxHp), 每段叠 1 层结晶 (满 4 引爆)
  crystalSpike: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const hits = (skill.hits as number) ?? 2;
    const atkScale = (skill.atkScale as number) ?? 0.5;
    const hpPct = (skill.targetHpPct as number) ?? 3;
    // P88 1:1 JS crystal.js:1-30 — 不在 skill 内手动 detonate.
    //   dealMagic → triggerOnHitEffects → passive-triggers crystallizeResonance 已自动
    //   叠 _crystallize + 满层 maxHp×19% magic detonate + max-merge mrDown.
    //   之前 PoC 用平行 'crystalMark' buffs + atk×2.0 true detonate 是自创 (skill 身份完全错).
    for (let i = 0; i < hits; i++) {
      if (!target.alive) break;
      const base = caster.atk * atkScale + target.maxHp * hpPct / 100;
      const dmg = dealMagic(caster, target, base);
      // 合并结晶引爆伤害进本段魔法数字 (JS crystal.js:18-22 Ornn脆风格), 而非单独跳一个
      const boom = (target as Fighter & { _pendingCrystalBoom?: number })._pendingCrystalBoom ?? 0;
      (target as Fighter & { _pendingCrystalBoom?: number })._pendingCrystalBoom = 0;
      api.floatNum(target, `${dmg + boom}`, '#4dabf7', 'magic-dmg');
      if (i < hits - 1) await sleep(500);
    }
    return { touched: [target] };
  },
  // 水晶壁垒 (CD3): 自施护盾 + 全体友方 def/mr +15% 3t
  // JS crystal.js:32-59 doCrystalBarrier 1:1 — 自盾 + 全友 defUp/mrUp **flat 值**
  //   defGain = round(ally.baseDef × defMrUpPct%) — per-ally 各算各的
  //   mrGain = round(ally.baseMr × defMrUpPct%)
  // 旧 Phaser: push value=pct (e.g. 15), buff consumer 当 flat 用 → 几乎无效!
  crystalBarrier: async (api, caster, _target, skill) => {
    const shieldAmt = Math.round(caster.atk * ((skill.shieldAtkScale as number) ?? 0.9) * ruleModifiers.shieldMult());
    applyShield(caster, shieldAmt);
    const pct = (skill.defMrUpPct as number) ?? 15;
    const turns = (skill.defMrUpTurns as number) ?? 3;
    const allies = getAllies(api, caster);
    for (const a of allies) {
      if (!a.alive) continue;
      const defGain = Math.round((a.baseDef ?? 0) * pct / 100);
      const mrGain = Math.round((a.baseMr ?? a.baseDef ?? 0) * pct / 100);
      a.buffs.push({ type: 'defUp', value: defGain, duration: turns + 1 });
      a.buffs.push({ type: 'mrUp', value: mrGain, duration: turns + 1 });
      if (defGain > 0 || mrGain > 0) api.floatNum(a, `+${defGain}/+${mrGain}`, '#ffd86b', 'passive-num');
    }
    api.floatNum(caster, `+${shieldAmt}`, '#c0c0c0', 'shield-num');   // 用户: 去 🔮emoji, 正常护盾数字
    api.log?.(`${caster.emoji}${caster.name} <b>水晶壁垒</b>: +${shieldAmt}护盾 + 全友 +${pct}%甲/抗 ${turns}回合`);
    return { touched: allies };
  },
  // 碎晶爆破 (CD5): aoe 3 段 magic + pierceScale true, 每段叠结晶
  crystalBurst: async (api, caster, _target, skill) => {
    const hits = (skill.hits as number) ?? 3;
    const atkScale = (skill.atkScale as number) ?? 0.233;
    const pierceScale = (skill.pierceScale as number) ?? 0.033;
    const enemies = getEnemies(api, caster);
    const touched: Fighter[] = [];
    for (let i = 0; i < hits; i++) {
      for (const e of enemies) {
        if (!e.alive) continue;
        const mDmg = dealMagic(caster, e, caster.atk * atkScale);
        // 合并结晶引爆伤害进魔法数字 (JS crystal.js Ornn脆风格)
        const boom = (e as Fighter & { _pendingCrystalBoom?: number })._pendingCrystalBoom ?? 0;
        (e as Fighter & { _pendingCrystalBoom?: number })._pendingCrystalBoom = 0;
        // 真伤段
        let tShown = 0;
        if (pierceScale > 0) {
          const td = Math.max(1, Math.round(caster.atk * pierceScale));
          const wasAlive = e.alive;
          const r = applyRawDamage(e, td, 'true');
          tShown = r.hpLoss + r.shieldAbs;
          battleStats.recordDamage(caster, e, tShown, 'tru');
          if (wasAlive && !e.alive) battleStats.recordKill(caster, e);
          // 不再 triggerOnHitEffects: dealMagic 已触发一次结晶叠层 (JS crystal.js:85 每敌每段仅 1 次),
          //   旧 PoC 真伤段重复触发 → 结晶双叠, 引爆快一倍
        }
        api.floatNum(e, `${mDmg + boom}`, '#4dabf7', 'magic-dmg');
        if (tShown > 0) api.floatNum(e, `${tShown}`, '#ffffff', 'true-dmg');
        if (!touched.includes(e)) touched.push(e);
        // P88 1:1: detonate 由 dealMagic→passive-triggers 自动处理 (移除 atk×2.0 true 自创)
      }
      if (i < hits - 1) await sleep(500);
    }
    api.log?.(`${caster.emoji}${caster.name} 碎晶爆破 全敌 ${hits}段 (每段叠结晶)`);
    return { touched };
  },
  // crystalBall / crystalImmortal: passiveSkill (登场召唤水晶球 / 10 回合不朽) — handler no-op
  crystalBall: async (_api, caster, _target, _skill) => ({ touched: [caster] }),
  crystalImmortal: async (_api, caster, _target, _skill) => ({ touched: [caster] }),

  // ── cyber ──
  // v0.9.5.A97: cyberBeam KOF 演出 — JS cyber.js:92-334 完整 port (~180 行 vs 之前 5 行)
  //   1) KOF cut-in fullscreen flash 500ms
  //   2) Camera zoom 1.2× anchored to row mid-point
  //   3) Caster Y-hop 抛物 → target 横排 (12 段 parabolic, 460ms)
  //   4) Windup pose 550ms
  //   5) Beam graphics 从 caster 到画面边缘, 720ms 生命
  //   6) Per-row enemy 2-hit juggle + damage (phys + true 双段, cyber drone count scaling)
  //   7) Camera 缩回 + caster hop back
  cyberBeam: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const cv = api.viewOf(caster);
    const tv = api.viewOf(target);
    if (!cv || !tv) return { touched: [] };
    const scene = api.scene;
    const cam = scene.cameras.main;
    const dir = caster.side === 'left' ? 1 : -1;

    // P16: Drone count from _drones[] array (JS cyber.js:98 1:1).
    // 之前读 _droneCount 字段, 部署后永远 0; 现统一用 _drones[].length
    const _dronesArr = (caster as Fighter & { _drones?: unknown[] })._drones;
    const droneCount = Array.isArray(_dronesArr) ? _dronesArr.length : 0;
    // P89 1:1 JS cyber.js:99-101 — _cyberEnhanced → droneTrueScaleEnhanced (0.07), 否则 droneTrueScale (0.10)
    //   之前 PoC 始终用 droneTrueScale → 机甲态下伤害比 JS 多 30%
    const isCyberEnhanced = !!(caster as Fighter & { _cyberEnhanced?: boolean })._cyberEnhanced;
    const trueScale = isCyberEnhanced
      ? ((skill.droneTrueScaleEnhanced as number) ?? 0.07)
      : ((skill.droneTrueScale as number) ?? 0.10);
    const trueScalePerSeg = trueScale / 2;
    const trueDmgPerSeg = Math.round(caster.atk * trueScalePerSeg * droneCount);
    const physScale = (skill.atkScale as number) ?? 0.5;

    // Targets: target 的同列 (同 _slotKey 的列 idx) — JS getAliveTargets filter by col
    const tSlotKey = (target as Fighter & { _slotKey?: string })._slotKey ?? '';
    const tCol = tSlotKey.split('-')[1];
    const rowEnemies = tCol
      ? api.allFighters.filter(f => f.alive && f.side !== caster.side
          && ((f as Fighter & { _slotKey?: string })._slotKey?.split('-')[1] === tCol))
      : [target];
    const enemyList = rowEnemies.length ? rowEnemies : [target];

    // ── 1) KOF cut-in: fullscreen cyan flash 500ms ──
    const { width, height } = scene.scale.gameSize;
    const cutin = scene.add.rectangle(width / 2, height / 2, width, height, 0x4cc9f0, 0.45)
      .setDepth(200);
    scene.tweens.add({
      targets: cutin, alpha: 0, duration: 500, ease: 'cubic.out',
      onComplete: () => cutin.destroy(),
    });
    // 中心金/蓝色 orb
    const orb = scene.add.circle(width / 2, height / 2, 30, 0x9af6ff, 1).setDepth(201);
    scene.tweens.add({
      targets: orb, radius: 100, alpha: 0, scale: 3,
      duration: 500, ease: 'cubic.out',
      onComplete: () => orb.destroy(),
    });
    await sleep(500);

    // ── 2) Camera zoom 1.2× anchored to row mid ──
    const midX = (cv.x + tv.x) / 2;
    const midY = tv.y;
    cam.pan(midX, midY, 400, 'Sine.easeOut');
    cam.zoomTo(1.2, 400, 'Sine.easeOut');

    // ── 3) Caster Y-hop arc to target row ──
    const yShift = tv.y - cv.y;
    const homeXC = cv.homeX, homeYC = cv.homeY;
    const apexLift = -Math.min(44, 24 + Math.abs(yShift) * 0.28);
    const hopMs = 460;
    // 抛物跳: 单 tween + onUpdate 算 y(t)=yShift·t + 4·apexLift·t·(1-t)。
    //   旧版用 8 段 linear chain 近似抛物 → 每段 57ms 分段跳, 视觉分明卡顿(用户报"跑到其他排明显卡/闪")。
    //   单 tween + Sine 缓动 = 连续平滑, 不分段。
    cv.sprite.setDepth(50);
    const hopProxy = { t: 0 };
    scene.tweens.add({
      targets: hopProxy, t: 1, duration: hopMs, ease: 'Sine.easeInOut',
      onUpdate: () => { cv.sprite.y = homeYC + yShift * hopProxy.t + apexLift * 4 * hopProxy.t * (1 - hopProxy.t); },
    });
    await sleep(480);

    // ── 4) Windup beat (sprite tint pulse to indicate charging) ──
    cv.sprite.setTint(0x9af6ff);
    // 不做缩放脉冲(同 basicChiWave): 避免缩放 tween 与纹理切换冲突致体型突变。tint 蓄力提示已足够。
    await sleep(550);
    cv.sprite.clearTint();

    // ── 5) Fire beam: rectangle stretched from caster to scene edge ──
    //   P33 fix: JS cyber.js:195 beam.top = fCy - 110 (caster Y - 110, NOT target Y)
    //   之前 PoC 用 tv.y 导致光束打在 target 同高度 (错位)
    const beamLifeMs = 720;
    const sceneW = width;
    const farEdgeX = dir === 1 ? sceneW : 0;
    const fCx = cv.sprite.x;
    const fCy = cv.sprite.y;
    // 光束竖直对齐【敌人所在行中心】(施法者已抛跳到该行, tv.y = 敌人精灵中心)。
    //   旧 fCy-110 是照搬 JS 的 top 边缘值(还是 -110), 但 PoC 这里 beamY 当中心用 → 光束飘在敌人上方 110px,
    //   用户报"光束和敌人错位"。直接取 tv.y 居中, 任意分辨率都对齐。
    const beamY = tv.y;
    const beamLen = Math.max(120, Math.abs(farEdgeX - fCx));
    const beamH = 60;
    const beamStartX = dir === 1 ? fCx : fCx - beamLen;
    // D3: 用 JS 同款 6 帧激光纹理 (cyber-beam-sweep), steps(6) 720ms 横扫; 缺纹理才退回旧矩形。
    if (scene.textures.exists('vfx-cyber-beam-sweep')) {
      const s = scene.add.sprite(fCx, beamY, 'vfx-cyber-beam-sweep').setDepth(48);
      s.setOrigin(dir === 1 ? 0 : 1, 0.5);   // 锚在施法者侧, 向敌方拉伸
      s.displayWidth = beamLen;
      s.displayHeight = 150;                   // ~JS 160px 等比
      if (dir === -1) s.setFlipX(true);        // 右侧施法者镜像 (JS .flip-x)
      if (scene.anims.exists('anim-cyber-beam-sweep')) s.play('anim-cyber-beam-sweep');
      // 入场: 宽度 0→beamLen 拉出
      const targetSX = s.scaleX;
      s.scaleX = 0;
      scene.tweens.add({ targets: s, scaleX: targetSX, duration: 120, ease: 'cubic.out' });
      scene.time.delayedCall(360, () => {
        scene.tweens.add({ targets: s, alpha: 0, duration: 360, onComplete: () => s.destroy() });
      });
    } else {
      // fallback: 旧矩形 (主光束 + 内层亮带)
      const beam = scene.add.rectangle(beamStartX + beamLen / 2, beamY, beamLen, beamH, 0x4cc9f0, 0.85).setDepth(48);
      const beamCore = scene.add.rectangle(beamStartX + beamLen / 2, beamY, beamLen, beamH * 0.4, 0xffffff, 1).setDepth(49);
      beam.setScale(0, 1).setOrigin(dir === 1 ? 0 : 1, 0.5);
      beamCore.setScale(0, 1).setOrigin(dir === 1 ? 0 : 1, 0.5);
      beam.x = fCx; beamCore.x = fCx;
      scene.tweens.add({ targets: [beam, beamCore], scaleX: 1, duration: 120, ease: 'cubic.out' });
      scene.time.delayedCall(360, () => {
        scene.tweens.add({ targets: [beam, beamCore], alpha: 0, duration: 360, onComplete: () => { beam.destroy(); beamCore.destroy(); } });
      });
    }

    // ── 6) Damage all row enemies SIMULTANEOUSLY 360ms 后 (beam peak) ──
    await sleep(360);
    cam.shake(260, 0.012);

    // 各 enemy 2-hit juggle + 双段 damage (物理 + 真伤)
    const hitTasks = enemyList.map(async (enemy) => {
      const ev = api.viewOf(enemy);
      if (!ev || !enemy.alive) return;
      const enemyHomeX = ev.homeX, enemyHomeY = ev.homeY;
      const knockX = dir * 50;

      // 2-hit juggle (2 段 knockup, 280ms 间隔; 总 ~900ms)
      scene.tweens.chain({
        targets: ev.sprite,
        tweens: [
          // 第 1 击: 抛起
          { x: enemyHomeX + knockX * 0.6, y: enemyHomeY - 40, rotation: 0.3 * dir, duration: 180, ease: 'cubic.out' },
          // 短停: 第 2 击前
          { duration: 100 },
          // 第 2 击: 再抛
          { x: enemyHomeX + knockX, y: enemyHomeY - 60, rotation: 0.6 * dir, duration: 180, ease: 'cubic.out' },
          // 顶点停顿
          { duration: 60 },
          // 落地
          { x: enemyHomeX + knockX * 1.2, y: enemyHomeY + 5, rotation: 0.9 * dir, duration: 220, ease: 'cubic.in' },
          // 起身 + 走回 home
          { x: enemyHomeX, y: enemyHomeY, rotation: 0, duration: 280, ease: 'sine.inOut' },
        ],
      });

      // 2 段伤害, 间隔 280ms 跟 juggle 第 2 击对齐
      for (let seg = 0; seg < 2; seg++) {
        const isCrit = rollCrit(effectiveCrit(caster));
        const critMult = isCrit ? calcCritMult(caster) : 1;
        const physBase = Math.round(caster.atk * physScale);
        const eDef = calcEffArmor(caster, enemy);
        const physDmg = Math.max(1, Math.round(physBase * critMult * calcDmgMult(eDef)));
        const wasAlive = enemy.alive;
        const rp = applyRawDamage(enemy, physDmg, 'physical');
        const physShown = (rp.hpLoss ?? 0) + (rp.shieldAbs ?? 0);
        battleStats.recordDamage(caster, enemy, physShown, 'phy');
        if (wasAlive && !enemy.alive) battleStats.recordKill(caster, enemy);
        api.floatNum(enemy, `${physShown}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
        // 用户: 激光大炮命中目标闪烁/动画异常 — 删此处额外 setTint(0xffffff) 白闪。
        //   它与 floatNum 命中类已触发的"受击帧+红tint"抢同一 sprite, 双 tint set/clear 在 2 段里重叠 → 闪烁。
        //   命中反馈交给 floatNum 标准受击帧即可 (与其它技能一致)。
        triggerOnHitEffects(caster, enemy, physDmg, { floatNum: api.floatNum });

        if (trueDmgPerSeg > 0 && enemy.alive) {
          const rt = applyRawDamage(enemy, trueDmgPerSeg, 'true');
          const trueShown = (rt.hpLoss ?? 0) + (rt.shieldAbs ?? 0);
          battleStats.recordDamage(caster, enemy, trueShown, 'tru');
          // P33: yOffset +24 (JS cyber.js:265) + delay 100ms — true 段与物理段错开, 不挤一坨 (用户)
          api.floatNum(enemy, `${trueShown}`, '#ffffff', 'true-dmg', 100, 24);
        }

        applyPostHitLayers(caster, enemy, physShown + trueDmgPerSeg, isCrit, 'physical');
        if (seg < 1) await sleep(280);
      }
    });

    await Promise.all(hitTasks);
    // P33 JS cyber.js:302 addLog (横排 + 炮台数 + 各目标伤害)
    const rowLabel = tCol != null ? `${['上','中','下'][parseInt(tCol)] ?? '中'}横排` : '目标横排';
    api.log?.(`${caster.emoji}${caster.name} <b>能量大炮</b> → ${rowLabel} (${droneCount}炮台, ${enemyList.length}目标)`);
    await sleep(Math.max(0, beamLifeMs - 600));

    // ── 7) Caster hops back + camera reset ──
    // 抛回 home (平滑反向抛物, 单 tween + onUpdate, 同去程)
    cv.sprite.x = homeXC;
    const hopBackProxy = { t: 0 };
    scene.tweens.add({
      targets: hopBackProxy, t: 1, duration: hopMs, ease: 'Sine.easeInOut',
      onUpdate: () => { cv.sprite.y = (homeYC + yShift) - yShift * hopBackProxy.t + apexLift * 4 * hopBackProxy.t * (1 - hopBackProxy.t); },
    });
    cam.pan(width / 2, height / 2, 460, 'Sine.easeOut');
    cam.zoomTo(1.0, 460, 'Sine.easeOut');
    await sleep(480);
    cv.sprite.setDepth(2);

    return { touched: enemyList };
  },

  // ── pirate ──
  // P16: pirateBarrage 删除 active 版 — JS pets.js 中 pirateBarrage 是 passive (海盗船 passive).
  // 真正 active 是 pirateCannonBarrage. 现 stub 为 passive no-op.
  pirateBarrage: async (_a, c) => ({ touched: [c] }),
  // v0.9.5.B7: piratePlunder 真 port — JS pirate.js:54-96 (~50 行)
  // 掠夺: 破 shieldBreakPct% 护盾 + atkScale × ATK 物理 + 偷 stealDefPct/stealMrPct (target debuff + caster buff)
  piratePlunder: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const shieldBreakPct = (skill.shieldBreakPct as number) ?? 50;
    const stealDefPct = (skill.stealDefPct as number) ?? 20;
    const stealMrPct = (skill.stealMrPct as number) ?? 20;
    const turns = (skill.stealDefTurns as number) ?? 3;
    const atkScale = (skill.atkScale as number) ?? 1.2;

    // 1) 破护盾
    if (shieldBreakPct > 0) {
      if (target.shield > 0) {
        const broken = Math.round(target.shield * shieldBreakPct / 100);
        target.shield -= broken;
        api.floatNum(target, `-${broken}破盾`, '#888', 'shield-dmg');
      }
      const tt = target as Fighter & { bubbleShieldVal?: number };
      if ((tt.bubbleShieldVal ?? 0) > 0) {
        const broken = Math.round((tt.bubbleShieldVal ?? 0) * shieldBreakPct / 100);
        tt.bubbleShieldVal = (tt.bubbleShieldVal ?? 0) - broken;
        api.floatNum(target, `-${broken}🫧破`, '#888');
      }
    }

    // 2) 主伤害
    const isCrit = rollCrit(effectiveCrit(caster));
    const critMult = isCrit ? calcCritMult(caster) : 1;
    const eDef = calcEffArmor(caster, target);
    const dmg = Math.max(1, Math.round(caster.atk * atkScale * critMult * calcDmgMult(eDef)));
    const wasA = target.alive;
    const r = applyRawDamage(target, dmg, 'physical');
    const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
    battleStats.recordDamage(caster, target, shown, 'phy');
    if (wasA && !target.alive) battleStats.recordKill(caster, target);
    api.floatNum(target, `${shown}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
    triggerOnHitEffects(caster, target, dmg, { floatNum: api.floatNum });
    applyPostHitLayers(caster, target, shown, isCrit, 'physical');

    // 3) 偷护甲/魔抗 (target debuff + caster buff)
    if (target.alive) {
      const defGain = Math.round((target.baseDef ?? 0) * stealDefPct / 100);
      const mrGain = Math.round((target.baseMr ?? target.baseDef ?? 0) * stealMrPct / 100);
      if (defGain > 0) {
        target.buffs.push({ type: 'defDown', value: stealDefPct, duration: turns });
        caster.buffs.push({ type: 'defUp', value: defGain, duration: turns });
        target.def = Math.max(0, target.def - defGain);
        caster.def = (caster.def ?? 0) + defGain;
      }
      if (mrGain > 0) {
        target.buffs.push({ type: 'mrDown', value: stealMrPct, duration: turns });
        caster.buffs.push({ type: 'mrUp', value: mrGain, duration: turns });
        target.mr = Math.max(0, target.mr - mrGain);
        caster.mr = (caster.mr ?? 0) + mrGain;
      }
      if (defGain > 0 || mrGain > 0) {
        api.floatNum(target, `-${defGain}甲 -${mrGain}抗`, '#888');
        api.floatNum(caster, `+${defGain}甲 +${mrGain}抗`, '#10b981');
      }
    }
    return { touched: [target, caster] };
  },

  // ── line ──
  // P48 lineRapid 1:1 fix — JS pets.js:528 是 passiveSkill 不是 active!
  //   旧 PoC 错实现为 6-hit 物理 skill — 完全错形.
  //   passive 作用: _inkCapOverride=7 (墨迹上限) + _inkTrueDmg=true (墨迹/连笔/引爆转真伤)
  //   实际 effect 在 fighter init (state.js:272-276) + dealDamage (skill-handlers _inkTrueDmg 检测)
  //   handler stub — 配 passiveSkill no-op
  lineRapid: async (_api, caster, _target, _skill) => ({ touched: [caster] }),
  // v0.9.5.B8: lineFinish 真 port — JS line.js:109-163 (~55 行)
  // 画龙点睛: baseScale × ATK 物理 + perStackScale × ATK × _inkStacks 二段 (rapid passive→true, 默认 magic)
  // 击杀 → reset cd; 飘字双段 (phys 下 + burst 上)
  lineFinish: async (api, caster, target, skill) => {
    if (!target || !target.alive) return { touched: [] };
    const tt = target as Fighter & { _inkStacks?: number };
    const stacks = tt._inkStacks ?? 0;
    const baseScale = (skill.baseScale as number) ?? 1.0;
    const perStackScale = (skill.perStackScale as number) ?? 0.3;
    const isCrit = rollCrit(effectiveCrit(caster));
    const critMult = isCrit ? calcCritMult(caster) : 1;
    const burstType: 'magic' | 'true' = ((caster as Fighter & { _inkTrueDmg?: boolean })._inkTrueDmg) ? 'true' : 'magic';
    // 基础物理伤
    const baseNormal = Math.round(caster.atk * baseScale);
    const eDef = calcEffArmor(caster, target);
    const normalDmg = Math.max(1, Math.round(baseNormal * critMult * calcDmgMult(eDef)));
    // perStack burst
    let burstDmg = Math.round(caster.atk * perStackScale * stacks * critMult);
    if (burstDmg > 0 && burstType === 'magic') {
      const effMr = calcEffMr(caster, target);
      burstDmg = Math.max(1, Math.round(burstDmg * calcDmgMult(effMr)));
    }
    // 用户(2026-05-29): 引爆伤害"不再额外吃"墨迹 +5%/层 被动增伤 —— 引爆本身已按层数(perStackScale×层)放大,
    //   再叠 +5%/层 是双重吃层数。故在结算伤害【之前】提前清空墨迹 → 下面 triggerOnHitEffects 的 applyInkBonus
    //   读到 0 层即跳过 (burstDmg 已用上面捕获的 stacks 算好, 不受影响)。
    tt._inkStacks = 0;
    // 用户: 去掉"墨迹×N 引爆!"提示浮字 (墨迹层数走目标状态栏徽章; 伤害数字照常跳)
    // 物理伤
    const wasA1 = target.alive;
    const rn = applyRawDamage(target, normalDmg, 'physical');
    const physShown = (rn.hpLoss ?? 0) + (rn.shieldAbs ?? 0);
    battleStats.recordDamage(caster, target, physShown, 'phy');
    if (wasA1 && !target.alive) battleStats.recordKill(caster, target);
    api.floatNum(target, `${physShown}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
    // burst 伤
    if (burstDmg > 0 && target.alive) {
      const wasA2 = target.alive;
      const rb = applyRawDamage(target, burstDmg, burstType);
      const burstShown = (rb.hpLoss ?? 0) + (rb.shieldAbs ?? 0);
      battleStats.recordDamage(caster, target, burstShown, burstType === 'true' ? 'tru' : 'mag');
      if (wasA2 && !target.alive) battleStats.recordKill(caster, target);
      api.floatNum(target, `${burstShown}`,
        burstType === 'true' ? '#ffffff' : '#4dabf7',
        isCrit ? (burstType === 'true' ? 'crit-true' : 'crit-magic') : (burstType === 'true' ? 'true-dmg' : 'magic-dmg'));
    }
    triggerOnHitEffects(caster, target, normalDmg + burstDmg, { floatNum: api.floatNum });   // 墨迹已提前清, applyInkBonus 跳过
    applyPostHitLayers(caster, target, physShown, isCrit, 'physical');
    // 击杀 → reset cd
    if (!target.alive) skill.cdLeft = 0;
    api.log?.(`${caster.emoji}${caster.name} <b>画龙点睛</b> → ${target.emoji}${target.name}：${physShown}物理 + ${burstDmg}${burstType === 'true' ? '真实' : '魔法'} (墨迹 ×${stacks} 引爆)${!target.alive ? ' 击杀! CD重置' : ''}`);
    return { touched: [target] };
  },

  // ── bubble ──
  // v0.9.5.B6: bubbleBind 真 port — JS bubble.js:14-26
  // 束缚: 每次受击扣目标 perHitLoss 甲/抗 (lv1-5: 1, lv6-10: 2), lossCap 累计
  bubbleBind: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const lv = ((caster as Fighter & { _level?: number })._level ?? 1);
    const perHitLoss = lv >= 6 ? 2 : 1;
    const duration = (skill.duration as number) ?? 3;
    const lossCap = (skill.lossCap as number) ?? 30;
    target.buffs = target.buffs.filter(b => b.type !== 'bubbleBind');
    target.buffs.push({
      type: 'bubbleBind', value: perHitLoss, duration: duration + 1,
      perHitLoss, lossCap, lossUsed: 0,
    } as typeof target.buffs[number] & { perHitLoss: number; lossCap: number; lossUsed: number });
    api.floatNum(target, `🫧束缚 -${perHitLoss}/段 (cap${lossCap})`, '#4cc9f0');
    api.log?.(`${caster.emoji}${caster.name} <b>泡泡束缚</b> → ${target.emoji}${target.name}：${duration}回合 (每段 -${perHitLoss} 甲/抗, cap ${lossCap})`);
    return { touched: [target] };
  },
  // v0.9.5.B8: bubbleBurst 真 port — JS bubble.js:54-92
  // 爆破: 消耗 bubbleStore × bubbleConsumePct, 对 target 所在前/后竖排 (≤3 只) 造成 magic+phys 双段
  bubbleBurst: async (api, caster, target, skill) => {
    if (!target || !target.alive) return { touched: [] };
    const consumePct = (skill.bubbleConsumePct as number) ?? 100;
    const magicScale = (skill.bubbleMagicScale as number) ?? 0.8;
    const physScale = (skill.atkScale as number) ?? 0.8;
    const cf = caster as Fighter & { bubbleStore?: number };
    const stored = cf.bubbleStore ?? 0;
    const consumed = Math.round(stored * consumePct / 100);
    cf.bubbleStore = stored - consumed;
    const magicDmg = Math.round(consumed * magicScale);
    const physBaseRaw = Math.round(caster.atk * physScale);
    // JS bubble.js:64 — 目标所在 前/后整排 (e._position === target._position, ≤3 只), 非同列
    const rowTargets = api.allFighters.filter(e => e.alive && e.side !== caster.side
      && e._position === target._position);
    const targets = rowTargets.length ? rowTargets : [target];
    for (const e of targets) {
      // 用户 2026-05-29: 泡泡爆破可暴击 (魔法+物理两段共用一次暴击判定, 同 画龙点睛); 偏离 JS(原版不暴击)
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      // magic 段
      if (magicDmg > 0) {
        const dealt = Math.max(1, Math.round(magicDmg * critMult));
        const wasA = e.alive;
        const r = applyRawDamage(e, dealt, 'magic');
        const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        battleStats.recordDamage(caster, e, shown, 'mag');
        if (wasA && !e.alive) battleStats.recordKill(caster, e);
        api.floatNum(e, `${shown}`, '#4dabf7', isCrit ? 'crit-magic' : 'magic-dmg');
      }
      // phys 段
      if (physBaseRaw > 0 && e.alive) {
        const eDef = calcEffArmor(caster, e);
        const physDmg = Math.max(1, Math.round(physBaseRaw * calcDmgMult(eDef) * critMult));
        const wasA = e.alive;
        const r = applyRawDamage(e, physDmg, 'physical');
        const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        battleStats.recordDamage(caster, e, shown, 'phy');
        if (wasA && !e.alive) battleStats.recordKill(caster, e);
        api.floatNum(e, `${shown}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
      }
      triggerOnHitEffects(caster, e, magicDmg + physBaseRaw, { floatNum: api.floatNum });
    }
    api.log?.(`${caster.emoji}${caster.name} 泡泡爆破 (消耗 ${consumed}泡沫): ${magicDmg}魔法 × ${targets.length} + ${physBaseRaw}物理 × ${targets.length}`);
    return { touched: targets };
  },

  // ── candy ──
  // v0.9.5.B8: candyBarrage 真 port — JS candy.js:1-47
  // 糖衣炮弹: 先 +armorPenAtkPct buff, 然后 hits 段对全体敌 atkScale + hpPct% 物理
  candyBarrage: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    if (!enemies.length) return { touched: [] };
    const hits = (skill.hits as number) ?? 4;
    const atkScale = (skill.atkScale as number) ?? 0.5;
    const hpPct = (skill.hpPct as number) ?? 0;
    const armorPenAtkPct = (skill.armorPenAtkPct as number) ?? 0;
    const armorPenTurns = (skill.armorPenTurns as number) ?? 3;
    // armor pen buff (清旧 _candyPenGain)
    if (armorPenAtkPct > 0) {
      const cf = caster as Fighter & { _candyPenGain?: number; _candyPenTurns?: number };
      if (cf._candyPenGain) caster.armorPen = Math.max(0, (caster.armorPen ?? 0) - cf._candyPenGain);
      const penGain = Math.round(caster.atk * armorPenAtkPct / 100);
      cf._candyPenGain = penGain;
      cf._candyPenTurns = armorPenTurns;
      caster.armorPen = (caster.armorPen ?? 0) + penGain;
      api.floatNum(caster, `+${penGain}穿甲 ${armorPenTurns}t`, '#ffd93d');
      await sleep(200);
    }
    // hits 段对全体
    const touched: Fighter[] = [];
    for (let i = 0; i < hits; i++) {
      for (const e of enemies) {
        if (!e.alive) continue;
        const isCrit = rollCrit(effectiveCrit(caster));
        const critMult = isCrit ? calcCritMult(caster) : 1;
        let baseDmg = Math.round(caster.atk * atkScale);
        if (hpPct > 0) baseDmg += Math.round(e.maxHp * hpPct / 100);
        const eDef = calcEffArmor(caster, e);
        const dmg = Math.max(1, Math.round(baseDmg * critMult * calcDmgMult(eDef)));
        const wasA = e.alive;
        const r = applyRawDamage(e, dmg, 'physical');
        const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        battleStats.recordDamage(caster, e, shown, 'phy');
        if (wasA && !e.alive) battleStats.recordKill(caster, e);
        api.floatNum(e, `${shown}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
        triggerOnHitEffects(caster, e, dmg, { floatNum: api.floatNum });
        applyPostHitLayers(caster, e, shown, isCrit, 'physical');
        if (!touched.includes(e)) touched.push(e);
      }
      await sleep(280);
    }
    api.log?.(`${caster.emoji}${caster.name} 糖衣炮弹 全敌 ${hits}段 (穿甲+${Math.round(caster.atk * armorPenAtkPct / 100)} ${armorPenTurns}回合)`);
    return { touched };
  },
  // candySteal: passive (turn-begin Life Drain, A87 已实装在 BattleScene.processTurnBeginPassives)
  candySteal: async (_api, caster, _target, _skill) => ({ touched: [caster] }),

  // v0.9.5.B8: iceFrost 真 port — JS ice.js:87-137
  // 冰霜: 先全敌 mrDown.pct/turns, 然后 hits (默认 10) 段对全体敌 atkScale × ATK 魔法
  iceFrost: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    if (!enemies.length) return { touched: [] };
    const hits = (skill.hits as number) ?? 10;
    const atkScale = (skill.atkScale as number) ?? 0.15;
    const mrDown = skill.mrDown as { pct: number; turns: number } | undefined;
    const perHit = Math.round(caster.atk * atkScale);
    // mrDown 先施加
    // #8 M6: 旧版 (a) duration 缺 +1 约定 → 少持续1回合; (b) push buff 后又即时 e.mr-= → 与
    //   recalcStats(turn-begin 重置base+乘mrDown) 双扣。改为统一 turns+1 + recalcStats 单次应用 (本回合即生效, 供后续段吃)。
    if (mrDown) {
      for (const e of enemies) {
        if (!e.alive) continue;
        const existing = e.buffs.find(b => b.type === 'mrDown');
        if (existing) {
          existing.value = Math.max(existing.value, mrDown.pct);
          existing.duration = Math.max(existing.duration, mrDown.turns + 1);
        } else {
          e.buffs.push({ type: 'mrDown', value: mrDown.pct, duration: mrDown.turns + 1 });
        }
        recalcStats(e);   // 从 base 重置 + 应用全部 buff(含本 mrDown) — 单次, 取代旧即时双扣
        // 显式 debuff-label: 减益标签, 不传 cls 时 #4cc9f0→magic-dmg(命中类) 会让目标多一次红闪+受击帧
        api.floatNum(e, `❄抗-${mrDown.pct}%`, '#4cc9f0', 'debuff-label');
      }
      await sleep(300);
    }
    // hits 段 对全体 (JS ice.js:109-135)
    const touched: Fighter[] = [];
    let totalDmg = 0;
    for (let i = 0; i < hits; i++) {
      for (const e of enemies) {
        if (!e.alive) continue;
        const isCrit = rollCrit(effectiveCrit(caster));
        const critMult = isCrit ? calcCritMult(caster) : 1;
        const effMr = calcEffMr(caster, e);
        // #8 M5: 加 frostAura +20% (对熔岩/凤凰); iceFrost 走 applyRawDamage 不经 dealMagic→passiveDmgMult, 旧版漏掉了
        const dmg = Math.max(1, Math.round(perHit * critMult * calcDmgMult(effMr) * ruleModifiers.magicMult() * passiveDmgMult(caster, e, 'magic')));
        const wasA = e.alive;
        const r = applyRawDamage(e, dmg, 'magic');
        const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        totalDmg += shown;
        battleStats.recordDamage(caster, e, shown, 'mag');
        if (wasA && !e.alive) battleStats.recordKill(caster, e);
        api.floatNum(e, `${shown}`, '#4dabf7', isCrit ? 'crit-magic' : 'magic-dmg');
        triggerOnHitEffects(caster, e, dmg, { floatNum: api.floatNum });
        applyPostHitLayers(caster, e, shown, isCrit, 'magic');
        if (!touched.includes(e)) touched.push(e);
      }
      await sleep(350);   // JS:130 sleep(350)
    }
    api.log?.(`${caster.emoji}${caster.name} 冰霜 ⬇️魔抗-${mrDown?.pct ?? 25}% + 全体${hits}段: ${totalDmg}魔法`);
    return { touched };
  },
  // v0.9.5.B7: iceFreeze 真 port — JS ice.js:142-159
  // 冰封: atkScale × ATK magic + 必中眩晕 1 回合
  iceFreeze: async (api, caster, target, skill) => {
    if (!target || !target.alive) return { touched: [] };
    const atkScale = (skill.atkScale as number) ?? 0.6;
    const isCrit = rollCrit(effectiveCrit(caster));
    const critMult = isCrit ? calcCritMult(caster) : 1;
    const effMr = calcEffMr(caster, target);
    // #8 M5: 加 frostAura +20% (对熔岩/凤凰); iceFreeze 走 applyRawDamage 不经 passiveDmgMult, 旧版漏掉了
    const dmg = Math.max(1, Math.round(caster.atk * atkScale * critMult * calcDmgMult(effMr) * ruleModifiers.magicMult() * passiveDmgMult(caster, target, 'magic')));
    const wasA = target.alive;
    const r = applyRawDamage(target, dmg, 'magic');
    const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
    battleStats.recordDamage(caster, target, shown, 'mag');
    if (wasA && !target.alive) battleStats.recordKill(caster, target);
    api.floatNum(target, `${shown}`, '#4dabf7', isCrit ? 'crit-magic' : 'magic-dmg');
    triggerOnHitEffects(caster, target, dmg, { floatNum: api.floatNum });
    applyPostHitLayers(caster, target, shown, isCrit, 'magic');
    // 必中 stun (JS ice.js:150-156)
    if (target.alive) {
      target.buffs.push({ type: 'stun', value: 1, duration: 2 });
      (target as Fighter & { _stunUsed?: boolean })._stunUsed = false;
      api.floatNum(target, '💫眩晕', '#fbbf24', 'debuff-label');
      api.log?.(`${target.emoji}${target.name} 被冰封眩晕!`);
    }
    api.log?.(`${caster.emoji}${caster.name} <b>冰封</b> → ${target.emoji}${target.name}：${shown} 魔法 + 眩晕 1 回合`);
    await sleep(400);   // JS:158
    return { touched: [target] };
  },
  // v0.9.5.B8: iceSpike 真 port — JS ice.js:1-85
  // 冰锥: hits (默认 6) 段 alternating phys (i%2==0) / magic (i%2==1) + frostAura passive 加伤
  iceSpike: async (api, caster, target, skill) => {
    if (!target || !target.alive) return { touched: [] };
    const hits = (skill.hits as number) ?? 6;
    const totalScale = (skill.totalScale as number) ?? 1.6;
    const perHit = caster.atk * totalScale / hits;
    let totalN = 0, totalP = 0;
    for (let i = 0; i < hits; i++) {
      if (!target.alive) break;
      // dodge 检查 (skip 此段)
      const dodgeBuff = target.buffs.find(b => b.type === 'dodge');
      if (dodgeBuff && Math.random() < (dodgeBuff.value ?? 0) / 100) {
        api.floatNum(target, '闪避!', '#888');
        await sleep(280);
        continue;
      }
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      const isPhysical = (i % 2 === 0);
      let dmg: number;
      if (isPhysical) {
        const eDef = calcEffArmor(caster, target);
        dmg = Math.max(1, Math.round(perHit * critMult * calcDmgMult(eDef)));
        // frostAura passive 加伤
        const fa = caster.passive as { type?: string; bonusTargets?: string[]; bonusDmgPct?: number } | null;
        if (fa?.type === 'frostAura' && fa.bonusTargets?.includes(target.id)) {
          dmg = Math.round(dmg * (1 + (fa.bonusDmgPct ?? 0) / 100));
        }
        const wasA = target.alive;
        const r = applyRawDamage(target, dmg, 'physical');
        const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        totalN += shown;
        battleStats.recordDamage(caster, target, shown, 'phy');
        if (wasA && !target.alive) battleStats.recordKill(caster, target);
        api.floatNum(target, `${shown}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
        applyPostHitLayers(caster, target, shown, isCrit, 'physical');
      } else {
        const effMr = calcEffMr(caster, target);
        dmg = Math.max(1, Math.round(perHit * critMult * calcDmgMult(effMr) * ruleModifiers.magicMult()));
        const fa = caster.passive as { type?: string; bonusTargets?: string[]; bonusDmgPct?: number } | null;
        if (fa?.type === 'frostAura' && fa.bonusTargets?.includes(target.id)) {
          dmg = Math.round(dmg * (1 + (fa.bonusDmgPct ?? 0) / 100));
        }
        const wasA = target.alive;
        const r = applyRawDamage(target, dmg, 'magic');
        const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        totalP += shown;
        battleStats.recordDamage(caster, target, shown, 'mag');
        if (wasA && !target.alive) battleStats.recordKill(caster, target);
        api.floatNum(target, `${shown}`, '#4dabf7', isCrit ? 'crit-magic' : 'magic-dmg');
        applyPostHitLayers(caster, target, shown, isCrit, 'magic');
      }
      triggerOnHitEffects(caster, target, dmg, { floatNum: api.floatNum });
      await sleep(180);   // 用户: 6段冰锥加速 (原 500+150=650/段 太慢) → 180/段, ~1.1s 打完仍逐段可见
    }
    // JS:77-82 addLog 冰锥 6段 → 物理X + 真实Y (PoC label '真实' 改 '魔法' 对齐 P28 type labels)
    api.log?.(`${caster.emoji}${caster.name} <b>冰锥</b> 6段 → ${target.emoji}${target.name}：${totalN}物理 + ${totalP}魔法`);
    return { touched: [target] };
  },

  // ── fortune 财神 ──
  // v0.9.5.B3: fortuneDice — JS fortune.js:11-33 (掷骰子 3-8, 加金币 + heal % + postAllIn 附加护盾)
  fortuneDice: async (api, caster, _target, skill) => {
    const roll = 3 + Math.floor(Math.random() * 6); // 3..8
    const cf = caster as Fighter & { _goldCoins?: number };
    cf._goldCoins = (cf._goldCoins ?? 0) + roll;
    api.floatNum(caster, `+${roll}💰`, '#ffd93d');
    // Heal % maxHp
    const healPct = (skill.healPct as number) ?? 8;
    const healAmt = Math.round(caster.maxHp * healPct / 100);
    const before = caster.hp;
    caster.hp = Math.min(caster.maxHp, caster.hp + healAmt);
    if (caster.hp > before) api.floatNum(caster, `+${caster.hp - before}`, '#06d6a0', 'heal-num');
    // P83 1:1 JS fortune.js:22 — 用 caster.skills.some(s => s.type==='fortuneAllIn' && s.cdLeft > 0)
    //   (fortuneAllIn cd:999, cdLeft>0 表示已用过). 旧用 _goldCoins === roll 错 — 开局 0 币 也假阳性
    const postShieldPct = (skill.postAllInShieldPct as number) ?? 0;
    let postShield = 0;
    const allInUsed = caster.skills?.some(s => s.type === 'fortuneAllIn' && ((s.cdLeft ?? 0) > 0));
    if (postShieldPct > 0 && allInUsed) {
      postShield = Math.round(caster.maxHp * postShieldPct / 100);
      caster.shield = (caster.shield ?? 0) + postShield;
      api.floatNum(caster, `+${postShield}`, '#c0c0c0', 'shield-num');
    }
    api.log?.(`${caster.emoji}${caster.name} <b>骰子</b>: 🎲${roll} +${roll}金币 +${Math.max(0,caster.hp-before)}HP${postShield ? ' +'+postShield+'护盾' : ''}`);
    return { touched: [caster] };
  },
  // JS fortune.js:3-9 doFortuneStrike 1:1 — hits 段物理, 每段 (atkScale + perCoin × coins) × ATK
  //   不消耗金币 (区别于 fortuneAllIn). pets.js fortune skill 应有 hits:2 perCoinAtkScale:0.03
  // 旧 Phaser: 单段 magic dmg, atkScale=1.8 — 完全错!
  // P42 fortuneStrike 1:1 JS fortune.js:3-9
  fortuneStrike: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const cf = caster as Fighter & { _goldCoins?: number };
    const coins = cf._goldCoins ?? 0;
    const baseScale = (skill.atkScale as number) ?? 0.5;
    const perCoin = (skill.perCoinAtkScale as number) ?? 0.03;
    const effectiveScale = baseScale + perCoin * coins;
    const hits = (skill.hits as number) ?? 2;
    let total = 0;
    for (let h = 0; h < hits; h++) {
      if (!target.alive) break;
      const isCrit = rollCrit(effectiveCrit(caster));
      const dmg = dealPhysical(caster, target, caster.atk * effectiveScale, isCrit);
      total += dmg;
      api.floatNum(target, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
      applyPostHitLayers(caster, target, dmg, isCrit, 'physical');
      if (h < hits - 1) await sleep(300);
    }
    api.log?.(`${caster.emoji}${caster.name} <b>打击两下</b> → ${target.emoji}${target.name}：${total}物理 (${coins}金币加成)`);
    return { touched: [target] };
  },

  // ── gambler 赌神 passives ──
  // P28 fix: JS gambler 这俩是 passive, 不是 active skill:
  //   - gamblerMultiHit: combat.js:799-825 tryGamblerMultiHit hook (每次 doDamage 后调用, 概率 chain 额外攻击)
  //   - gamblerBlood: pets.js:347 + turn.js:1044-1054 _recalcOneFighter (lost-HP scaling crit)
  // 之前误实现为 5-hit/30%-lost-HP-真伤 ACTIVE — 完全错形. 列表不该把它们当可施法技能.
  // 这里 stub no-op (BattleScene picker 不该把 passive 显出来; 万一被点也别造伤害).
  gamblerMultiHit: async (_api, caster, _target, _skill) => ({ touched: [caster] }),
  gamblerBlood: async (_api, caster, _target, _skill) => ({ touched: [caster] }),

  // ── chest 宝箱 ──
  // JS chest.js:1-98 doChestSmash 1:1 — hits 段 (默认 3-4), 每段 totalBase/hits 物理 dmg
  //   chest equip 变体: star→true, rock→+def+mr, thunder→stack 5 触发雷击, chain→25% splash
  //   旧 Phaser: 单段 + _chestTreasure × 0.1 (JS 没此公式!) — 完全错!
  // 注: chest equip 变体 PoC 简化保留, 主要修核心 hits + dmgType
  // P19 chestSmash: 完整 6 装备变种 (JS chest.js:1-122 1:1)
  //   star    → 真伤替代物理
  //   rock    → totalBasePower += def + mr
  //   thunder → 每段命中叠 _goldLightning, 满 5 引爆 1×ATK 真伤
  //   chain   → 每段对随机其他敌 25% 溅射 (相同 dmgType + 同样 thunder 叠层)
  //   fire    → 技能结束后给所有命中目标加 burn
  //   poison  → 技能结束后给所有命中目标加 healReduce 50%
  chestSmash: async (api, caster, target, skill) => {
    if (!target || !target.alive) return { touched: [] };
    const hits = (skill.hits as number) ?? 4;
    const atkScale = (skill.atkScale as number) ?? 0.7;
    const cf = caster as Fighter & {
      _chestEquipStar?: boolean; _chestEquipRock?: boolean;
      _chestEquipThunder?: boolean; _chestEquipChain?: boolean;
      _chestEquipFire?: boolean; _chestEquipPoison?: boolean;
      _chestHitTargets?: Fighter[];
    };
    const hasStar = !!cf._chestEquipStar;
    const hasRock = !!cf._chestEquipRock;
    const hasThunder = !!cf._chestEquipThunder;
    const hasChain = !!cf._chestEquipChain;
    const hasFire = !!cf._chestEquipFire;
    const hasPoison = !!cf._chestEquipPoison;
    const dmgType: 'physical' | 'true' = hasStar ? 'true' : 'physical';
    let totalBasePower = Math.round(caster.atk * atkScale);
    if (hasRock) totalBasePower += (caster.def ?? 0) + ((caster.mr ?? caster.def) ?? 0);
    const perHitBase = Math.round(totalBasePower / hits);
    let total = 0;
    cf._chestHitTargets = [target];

    // Helper: thunder stack + 满 5 引爆 (1×ATK 真伤) + 闪电劈下 VFX
    const applyThunder = (enemy: Fighter) => {
      if (!hasThunder || !enemy.alive) return;
      const ee = enemy as Fighter & { _goldLightning?: number };
      ee._goldLightning = (ee._goldLightning ?? 0) + 1;
      if (ee._goldLightning >= 5) {
        ee._goldLightning = 0;
        // P78: 闪电劈下 VFX (JS chest.js:60 spawnLightningStrike)
        const ev = api.viewOf(enemy);
        if (ev) {
          const groundY = ev.sprite.y + (ev.sprite.displayHeight ?? 80) / 2;
          spawnLightningStrike(api.scene, ev.sprite.x, groundY);
        }
        const thunderDmg = Math.round(caster.atk * 1.0);
        const wasT = enemy.alive;
        const r = applyRawDamage(enemy, thunderDmg, 'true');
        const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        battleStats.recordDamage(caster, enemy, shown, 'tru');
        if (wasT && !enemy.alive) battleStats.recordKill(caster, enemy);
        api.floatNum(enemy, `${shown}`, '#ffd93d', 'true-dmg');
      }
    };

    for (let i = 0; i < hits; i++) {
      if (!target.alive) break;
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      const effDef = dmgType === 'true' ? 0 : calcEffArmor(caster, target);
      const dmg = Math.max(1, Math.round(perHitBase * critMult * calcDmgMult(effDef)));
      const wasA = target.alive;
      const r = applyRawDamage(target, dmg, dmgType);
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      total += shown;
      battleStats.recordDamage(caster, target, shown, dmgType === 'true' ? 'tru' : 'phy');
      if (wasA && !target.alive) battleStats.recordKill(caster, target);
      const cls = dmgType === 'true' ? (isCrit ? 'crit-true' : 'true-dmg') : (isCrit ? 'crit-dmg' : 'direct-dmg');
      const color = dmgType === 'true' ? '#ffffff' : '#ff4444';
      api.floatNum(target, `${shown}`, color, cls);
      triggerOnHitEffects(caster, target, dmg, { floatNum: api.floatNum });
      applyThunder(target);
      // P19 chain: 25% 溅射另一随机敌 (同 dmgType + 同样 thunder 叠)
      if (hasChain) {
        const others = getEnemies(api, caster).filter(e => e !== target && e.alive);
        if (others.length) {
          const sec = others[Math.floor(Math.random() * others.length)];
          const chainDmg = Math.max(1, Math.round(dmg * 0.25));
          const wasC = sec.alive;
          const rc = applyRawDamage(sec, chainDmg, dmgType);
          const sShown = (rc.hpLoss ?? 0) + (rc.shieldAbs ?? 0);
          battleStats.recordDamage(caster, sec, sShown, dmgType === 'true' ? 'tru' : 'phy');
          if (wasC && !sec.alive) battleStats.recordKill(caster, sec);
          api.floatNum(sec, `${sShown}`, color, dmgType === 'true' ? 'true-dmg' : 'direct-dmg');  // 伤害数字统一无 emoji (用户规则)
          triggerOnHitEffects(caster, sec, chainDmg, { floatNum: api.floatNum });
          applyThunder(sec);
          if (!cf._chestHitTargets.includes(sec)) cf._chestHitTargets.push(sec);
        }
      }
      if (i < hits - 1) await sleep(400);
    }
    // P19 fire: 全命中目标 burn
    if (hasFire) {
      for (const t of cf._chestHitTargets) {
        if (!t.alive) continue;
        // F4: chest fire = applySkillDebuffs({burn:true}) 默认层数 round(atk×0.67) (JS chest.js:80) — 旧 0.4 偏弱
        applyDotStacks(t, 'burn', defaultBurnStacks(caster));
        api.floatNum(t, '🔥灼烧', '#ff8c42', 'debuff-label');
      }
    }
    // P19 poison: 全命中目标 healReduce
    if (hasPoison) {
      for (const t of cf._chestHitTargets) {
        if (!t.alive) continue;
        const existing = t.buffs.find(b => b.type === 'healReduce');
        if (existing) existing.duration = 4;
        else t.buffs.push({ type: 'healReduce', value: 50, duration: 4 });
        api.floatNum(t, '☠️治疗削减', '#ff88aa', 'debuff-label');
      }
    }
    void total;
    return { touched: cf._chestHitTargets };
  },

  // v0.9.5.B5: hidingDefend 真 port — JS hiding.js:1-13
  // 防御: +shieldHpPct% maxHp 永久护盾 + hidingShield buff (到期回 shieldHealPct% 剩余盾)
  hidingDefend: async (api, caster, _target, skill) => {
    const shieldHpPct = (skill.shieldHpPct as number) ?? 15;
    const shieldDuration = (skill.shieldDuration as number) ?? 3;
    const shieldHealPct = (skill.shieldHealPct as number) ?? 50;
    const shieldAmt = Math.round(caster.maxHp * shieldHpPct / 100);
    // 用户(2026-05-29): 改为【特殊限时盾】_hidingShieldVal (HUD aura 段特殊色), shieldDuration 回合;
    //   到期由 BattleScene round-end: 剩余盾 × shieldHealPct% 转生命 + 清盾。
    const cf = caster as Fighter & { _hidingShieldVal?: number; _hidingShieldTurns?: number; _hidingShieldHealPct?: number };
    cf._hidingShieldVal = (cf._hidingShieldVal ?? 0) + shieldAmt;
    cf._hidingShieldTurns = shieldDuration;
    cf._hidingShieldHealPct = shieldHealPct;
    api.floatNum(caster, `+${shieldAmt}🛡 ${shieldDuration}t`, '#7dd3fc', 'shield-num');
    api.log?.(`${caster.emoji}${caster.name} <b>防御</b>: +${shieldAmt}护盾 ${shieldDuration}回合 (到期剩余盾×${shieldHealPct}% 转生命)`);
    return { touched: [caster] };
  },

  // v0.9.5.B8: headlessStorm 真 port — JS headless.js:40-60
  // 暴风: 临时 +tempLifesteal%, hits 段对全体物理, 结束还原 lifesteal
  headlessStorm: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    if (!enemies.length) return { touched: [] };
    const hits = (skill.hits as number) ?? 3;
    const atkScale = (skill.atkScale as number) ?? 0.5;
    const tempLifesteal = (skill.tempLifesteal as number) ?? 22;
    // P1(20260528): 不再临时改 _lifestealPct (会与通用吸血对永久部分双计); 本技能只额外吸 tempLifesteal%。
    let totalDmg = 0;
    for (const e of enemies) {
      if (!e.alive) continue;
      for (let h = 0; h < hits; h++) {
        if (!e.alive) break;
        // P87 1:1 JS headless.js:47 — `dmg = round(atk × atkScale)` 无 crit 无 def reduce!
        //   PoC 之前 ×critMult ×calcDmgMult(eDef) → 高 def 敌人少伤 + 暴击不该有
        const dmg = Math.max(1, Math.round(caster.atk * atkScale));
        const wasA = e.alive;
        const r = applyRawDamage(e, dmg, 'physical');
        const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        totalDmg += shown;
        battleStats.recordDamage(caster, e, shown, 'phy');
        if (wasA && !e.alive) battleStats.recordKill(caster, e);
        api.floatNum(e, `${shown}`, '#ff4444', 'direct-dmg');
        // 本次额外 tempLifesteal% 吸血 (永久吸血由通用 on-hit 块在 total 上结算, 不重复)
        if (caster.alive && shown > 0) {
          const heal = Math.round(shown * tempLifesteal / 100);
          const before = caster.hp;
          caster.hp = Math.min(caster.maxHp, caster.hp + heal);
          if (caster.hp > before) api.floatNum(caster, `+${caster.hp - before}`, '#06d6a0', 'heal-num');
        }
        await sleep(95);   // 用户: 段间留间隔, 否则伤害数字一起出挤成一坨
      }
      triggerOnHitEffects(caster, e, Math.round(caster.atk * atkScale * hits), { floatNum: api.floatNum });
    }
    void totalDmg;
    return { touched: enemies };
  },

  // ── two_head 双头 ──
  // v0.9.5.B8: twoHeadDual passive marker (双头龟双攻被动, BattleScene processTurnBeginPassives A87 已处理)
  twoHeadDual: async (_api, caster, _target, _skill) => ({ touched: [caster] }),

  // v0.9.5.B8: twoHeadHammer 真 port — JS two_head.js:155-180
  // 锤击: atkScale × ATK 物理 + shieldFromDmgPct% 永久护盾
  twoHeadHammer: async (api, caster, target, skill) => {
    if (!target || !target.alive) return { touched: [] };
    const atkScale = (skill.atkScale as number) ?? 1.4;
    const shieldFromDmgPct = (skill.shieldFromDmgPct as number) ?? 50;
    const isCrit = rollCrit(effectiveCrit(caster));
    const critMult = isCrit ? calcCritMult(caster) : 1;
    const eDef = calcEffArmor(caster, target);
    const dmg = Math.max(1, Math.round(caster.atk * atkScale * critMult * calcDmgMult(eDef)));
    const wasA = target.alive;
    const r = applyRawDamage(target, dmg, 'physical');
    const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
    battleStats.recordDamage(caster, target, shown, 'phy');
    if (wasA && !target.alive) battleStats.recordKill(caster, target);
    api.floatNum(target, `${shown}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
    triggerOnHitEffects(caster, target, dmg, { floatNum: api.floatNum });
    applyPostHitLayers(caster, target, shown, isCrit, 'physical');
    // 50% 伤害值永久护盾
    if (caster.alive && shieldFromDmgPct > 0) {
      const sh = Math.round(dmg * shieldFromDmgPct / 100);
      caster.shield = (caster.shield ?? 0) + sh;
      api.floatNum(caster, `+${sh}`, '#c0c0c0', 'shield-num');
    }
    return { touched: [target, caster] };
  },

  // v0.9.5.B8: twoHeadMagicWave 真 port — JS two_head.js:1-36
  // 魔法波: hits 段交替 phys (i%2==0) / true (i%2==1, pierce)
  twoHeadMagicWave: async (api, caster, target, skill) => {
    if (!target || !target.alive) return { touched: [] };
    const hits = (skill.hits as number) ?? 4;
    const atkScale = (skill.atkScale as number) ?? 0.6;
    for (let i = 0; i < hits; i++) {
      if (!target.alive) break;
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      const baseDmg = Math.round(caster.atk * atkScale);
      const isPierceHit = (i % 2 === 1);
      let dmg: number;
      let dmgType: 'physical' | 'true';
      if (isPierceHit) {
        dmg = Math.round(baseDmg * critMult);
        dmgType = 'true';
      } else {
        const eDef = calcEffArmor(caster, target);
        dmg = Math.max(1, Math.round(baseDmg * critMult * calcDmgMult(eDef)));
        dmgType = 'physical';
      }
      const wasA = target.alive;
      const r = applyRawDamage(target, dmg, dmgType);
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      battleStats.recordDamage(caster, target, shown, dmgType === 'true' ? 'tru' : 'phy');
      if (wasA && !target.alive) battleStats.recordKill(caster, target);
      const color = dmgType === 'true' ? '#ffffff' : '#ff4444';
      const cls = isCrit ? (dmgType === 'true' ? 'crit-true' : 'crit-dmg') : (dmgType === 'true' ? 'true-dmg' : 'direct-dmg');
      api.floatNum(target, `${shown}`, color, cls);
      triggerOnHitEffects(caster, target, dmg, { floatNum: api.floatNum });
      applyPostHitLayers(caster, target, shown, isCrit, dmgType === 'true' ? 'magic' : 'physical');
      await sleep(180);
    }
    return { touched: [target] };
  },

  // v0.9.5.B8: twoHeadMindBlast 真 port — JS two_head.js:240-259
  // 精神干扰: atkScale magic + shieldBreakPct% 护盾破 + healReducePct% 治疗削减
  twoHeadMindBlast: async (api, caster, target, skill) => {
    if (!target || !target.alive) return { touched: [] };
    const atkScale = (skill.atkScale as number) ?? 1.0;
    const shieldBreakPct = (skill.shieldBreakPct as number) ?? 50;
    const healReducePct = (skill.healReducePct as number) ?? 50;
    const healReduceTurns = (skill.healReduceTurns as number) ?? 3;
    // 主伤害 magic
    const isCrit = rollCrit(effectiveCrit(caster));
    const critMult = isCrit ? calcCritMult(caster) : 1;
    const effMr = calcEffMr(caster, target);
    const dmg = Math.max(1, Math.round(caster.atk * atkScale * critMult * calcDmgMult(effMr) * ruleModifiers.magicMult()));
    const wasA = target.alive;
    const r = applyRawDamage(target, dmg, 'magic');
    const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
    battleStats.recordDamage(caster, target, shown, 'mag');
    if (wasA && !target.alive) battleStats.recordKill(caster, target);
    api.floatNum(target, `${shown}`, '#4dabf7', isCrit ? 'crit-magic' : 'magic-dmg');
    triggerOnHitEffects(caster, target, dmg, { floatNum: api.floatNum });
    applyPostHitLayers(caster, target, shown, isCrit, 'magic');
    // 护盾破
    if (target.alive && target.shield > 0) {
      const broken = Math.round(target.shield * shieldBreakPct / 100);
      target.shield -= broken;
      api.floatNum(target, `-${broken}🛡破`, '#888');
    }
    // 治疗削减
    if (target.alive) {
      target.buffs.push({ type: 'healReduce', value: healReducePct, duration: healReduceTurns + 1 });
      api.floatNum(target, `❌治疗-${healReducePct}%`, '#888');
    }
    return { touched: [target] };
  },
  // v0.9.5.A89: 二头龟 form swap — JS skills/two_head.js:50-160 完整版
  twoHeadSwitch: async (api, caster, target, skill) => {
    const switchTo = (skill.switchTo as string) ?? 'melee';
    const atk = caster.atk;
    const c = caster as Fighter & {
      _twoHeadForm?: 'melee' | 'ranged';
      _formHpGain?: number; _formDefGain?: number; _formMrGain?: number; _formAtkLoss?: number;
      _rangedSkills?: typeof caster.skills;
    };

    if (switchTo === 'melee') {
      // P83 1:1 JS two_head.js:43-49 — 从 caster.passive 读 scale (而非硬编码)
      // 旧: hardcoded 1.5/0.25/0.15/0.3/1.1 → mrGain 0.15 错 (JS:47 mrGain = defGain × 0.25)
      const p = caster.passive as { hpScale?: number; defScale?: number; atkLossScale?: number; shieldScale?: number } | null;
      const hpGain = Math.round(atk * (p?.hpScale ?? 1.5));
      const defGain = Math.round(atk * (p?.defScale ?? 0.25));
      const mrGain = defGain;  // JS:47 mrGain = defGain
      const atkLoss = Math.round(atk * (p?.atkLossScale ?? 0.3));
      const shieldGain = Math.round(atk * (p?.shieldScale ?? 1.1));
      c._formHpGain = hpGain; c._formDefGain = defGain; c._formMrGain = mrGain; c._formAtkLoss = atkLoss;
      const oldMax = caster.maxHp;
      caster.maxHp += hpGain;
      caster.hp = Math.round(caster.hp * caster.maxHp / oldMax);
      caster.baseDef += defGain; caster.def = caster.baseDef;
      caster.baseMr = (caster.baseMr ?? caster.def) + mrGain; caster.mr = caster.baseMr;
      caster.baseAtk -= atkLoss; caster.atk = caster.baseAtk;
      caster.shield = (caster.shield ?? 0) + shieldGain;
      // 切换 skill 集 — JS two_head.js:67-73 1:1: 只取「已装备 index」对应的近战技能 (配对),
      //   过滤掉被动技能, 而非整套 meleeSkills (否则近战形态会多显示未携带/被动技能)
      const petDef = (PET_BY_ID as Record<string, { meleeSkills?: SkillDef[]; defaultSkills?: number[] }>)[caster.id];
      if (petDef && Array.isArray(petDef.meleeSkills)) {
        const melee = petDef.meleeSkills;
        const eqIdxs = (caster as Fighter & { _equippedIdxs?: number[] })._equippedIdxs ?? petDef.defaultSkills ?? [0, 1, 2];
        const paired = eqIdxs
          .filter(i => i < melee.length && !(melee[i] as SkillDef & { passiveSkill?: boolean }).passiveSkill)
          .map(i => ({ ...melee[i], cdLeft: melee[i].type === 'twoHeadSwitch' ? (skill.cd ?? 4) : 0 }));
        c._rangedSkills = caster.skills;
        caster.skills = paired.length ? paired : melee.map(s => ({ ...s, cdLeft: 0 }));
        // 注: 双头坚韧(近战配对被动)的常驻由 createFighter 期处理 (B: 无视形态一直叠 + 塞进 _passiveSkills
        //   让两形态面板都显示), 故切形态这里不再动 _passiveSkills / flag。
      }
      c._twoHeadForm = 'melee';
      api.floatNum(caster, '切换近战!', '#c77dff');
      // switch-attack: 对【选定目标】1.2× ATK
      // #8 M3: 描述"对目标造成 {N:ATK*1.2}", 旧版打最低血敌人 (与远程分支打 target 不一致) → 改打选定 target, 无效时回退最低血
      const switchAtkScale = (skill.switchAtkScale as number) ?? 1.2;
      const enemies = api.allFighters.filter(f => f.alive && f.side !== caster.side);
      const t = (target && target.alive && target.side !== caster.side)
        ? target
        : (enemies.length ? enemies.reduce((a, b) => (a.hp < b.hp ? a : b)) : null);
      if (t) {
        const isC = rollCrit(caster.crit);
        const d = dealPhysical(caster, t, caster.atk * switchAtkScale, isC);
        api.floatNum(t, `${d}`, '#ff4444', 'direct-dmg');
      }
    } else {
      // Melee → Ranged: 还原属性
      if (c._formHpGain) {
        const oldMax = caster.maxHp;
        caster.maxHp -= c._formHpGain;
        caster.hp = Math.min(caster.maxHp, Math.round(caster.hp * caster.maxHp / oldMax));
        caster.baseDef -= (c._formDefGain ?? 0); caster.def = caster.baseDef;
        caster.baseMr = (caster.baseMr ?? caster.def) - (c._formMrGain ?? 0); caster.mr = caster.baseMr;
        caster.baseAtk += (c._formAtkLoss ?? 0); caster.atk = caster.baseAtk;
        c._formHpGain = 0; c._formDefGain = 0; c._formMrGain = 0; c._formAtkLoss = 0;
      }
      if (c._rangedSkills) {
        caster.skills = c._rangedSkills;
        caster.skills.forEach(s => { if (s.type === 'twoHeadSwitch') s.cdLeft = skill.cd ?? 4; });
      }
      c._twoHeadForm = 'ranged';
      api.floatNum(caster, '切换远程!', '#fbbf24');
      // switch-attack: 对当前 target 1.4× ATK + 25% defReduction
      const atkScale = (skill.atkScale as number) ?? 1.4;
      const defReducePct = (skill.defReductionPct as number) ?? 25;
      const defReduceTurns = (skill.defReductionTurns as number) ?? 4;
      if (target && target.alive) {
        const isC = rollCrit(caster.crit);
        const d = dealPhysical(caster, target, caster.atk * atkScale, isC);
        api.floatNum(target, `${d}`, '#ff4444', 'direct-dmg');
        target.buffs.push({ type: 'defDown', value: defReducePct, duration: defReduceTurns + 1 });   // +1: 与其它 debuff 一致(回合末-1)
      }
    }
    // 换形羁绊: 双头每次切换形态(近战↔远程)后护盾 (+tier3 首次换形 ATK)
    const shift = applyShiftSynergy(caster);
    if (shift.shieldAdded > 0) { battleStats.recordShield(caster, shift.shieldAdded); api.floatNum(caster, `+${shift.shieldAdded}🛡`, '#c0c0c0', 'shield-num'); }
    if (shift.atkAdded > 0) api.floatNum(caster, `换形 +${shift.atkAdded}ATK`, '#ff9d5c');
    return { touched: target ? [caster, target] : [caster] };
  },
  // v0.9.5.B7: twoHeadAbsorb 真 port — JS two_head.js:181-210
  // 吸收: atkScale × ATK + hpPct% target maxHp 物理 + healAtkPct% ATK heal + healLostPct% 已损 heal
  twoHeadAbsorb: async (api, caster, target, skill) => {
    if (!target || !target.alive) return { touched: [] };
    const atkScale = (skill.atkScale as number) ?? 0.6;
    const hpPct = (skill.hpPct as number) ?? 8;
    const healAtkPct = (skill.healAtkPct as number) ?? 40;
    const healLostPct = (skill.healLostPct as number) ?? 18;
    const isCrit = rollCrit(effectiveCrit(caster));
    const critMult = isCrit ? calcCritMult(caster) : 1;
    const baseDmg = Math.round(caster.atk * atkScale) + Math.round(target.maxHp * hpPct / 100);
    const eDef = calcEffArmor(caster, target);
    const dmg = Math.max(1, Math.round(baseDmg * critMult * calcDmgMult(eDef)));
    const wasA = target.alive;
    const r = applyRawDamage(target, dmg, 'physical');
    const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
    battleStats.recordDamage(caster, target, shown, 'phy');
    if (wasA && !target.alive) battleStats.recordKill(caster, target);
    api.floatNum(target, `${shown}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
    triggerOnHitEffects(caster, target, dmg, { floatNum: api.floatNum });
    applyPostHitLayers(caster, target, shown, isCrit, 'physical');
    // heal
    if (caster.alive) {
      const atkHeal = Math.round(caster.atk * healAtkPct / 100);
      const lostHp = caster.maxHp - caster.hp;
      const lostHeal = Math.round(lostHp * healLostPct / 100);
      const totalHeal = atkHeal + lostHeal;
      const before = caster.hp;
      caster.hp = Math.min(caster.maxHp, caster.hp + totalHeal);
      const actual = caster.hp - before;
      if (actual > 0) api.floatNum(caster, `+${actual}`, '#06d6a0', 'heal-num');
    }
    return { touched: [target, caster] };
  },

  // v0.9.5.B7: twoHeadFusion 是 passive (跟 twoHeadSwitch 互斥, 给近战形态 +HP/Def/Mr 常驻) — handler no-op
  // (BattleScene 端在 fighter 创建时应用 passive bonus)
  twoHeadFusion: async (_api, caster, _target, _skill) => ({ touched: [caster] }),

  // ── star 星龟 (5 active) ──
  // P89 fireStarPassive helper — JS star.js 命中后 40% stored energy 真伤. starWormhole/Meteor/
  //   GravityWarp 3 处用. starBeam/Blackhole 内联了 (保留).
  // (helper 在 SKILL_HANDLERS 外定义 → 见文件顶部附近)
  // v0.9.5.B8: starBeam 真 port — JS star.js:60-97
  // 星光射线: hits 段 atkScale + currentHpPct% target HP 魔法, wormhole buff bonus, 充星能, 末尾 fireStarPassive
  starBeam: async (api, caster, target, skill) => {
    if (!target || !target.alive) return { touched: [] };
    const hits = (skill.hits as number) ?? 3;
    const atkScale = (skill.atkScale as number) ?? 0.4;
    const currentHpPct = (skill.currentHpPct as number) ?? 5;
    let totalDmg = 0;
    for (let i = 0; i < hits; i++) {
      if (!target.alive) break;
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      const baseDmg = Math.round(caster.atk * atkScale) + Math.round(target.hp * currentHpPct / 100);
      const effMr = calcEffMr(caster, target);
      const dmg = Math.max(1, Math.round(baseDmg * critMult * calcDmgMult(effMr) * ruleModifiers.magicMult()));
      // (清理) 删除 wormhole buff 加成读取 — 重做后的 starWormhole 不再 push 'wormhole' buff, 此分支恒不触发
      const wasA = target.alive;
      const r = applyRawDamage(target, dmg, 'magic');
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      totalDmg += shown;
      battleStats.recordDamage(caster, target, shown, 'mag');
      if (wasA && !target.alive) battleStats.recordKill(caster, target);
      api.floatNum(target, `${shown}`, '#4dabf7', isCrit ? 'crit-magic' : 'magic-dmg');
      triggerOnHitEffects(caster, target, dmg, { floatNum: api.floatNum });
      applyPostHitLayers(caster, target, shown, isCrit, 'magic');
      // 充星能
      const p = caster.passive;
      if (p?.type === 'starEnergy') {
        const cf = caster as Fighter & { _starEnergy?: number };
        const maxE = Math.round(caster.maxHp * ((p.maxChargePct as number) ?? 25) / 100);
        const gain = Math.round(shown * ((p.chargeRate as number) ?? 30) / 100);
        cf._starEnergy = Math.min(maxE, (cf._starEnergy ?? 0) + gain);
      }
      await sleep(200);
    }
    // fireStarPassive: 40% stored energy 真伤
    const p = caster.passive;
    if (p?.type === 'starEnergy' && target.alive) {
      const cf = caster as Fighter & { _starEnergy?: number };
      const stored = cf._starEnergy ?? 0;
      if (stored > 0) {
        const fireDmg = Math.round(stored * ((p.passiveFirePct as number) ?? 40) / 100);
        if (fireDmg > 0) {
          const wasA = target.alive;
          const r = applyRawDamage(target, fireDmg, 'true');
          const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
          battleStats.recordDamage(caster, target, shown, 'tru');
          if (wasA && !target.alive) battleStats.recordKill(caster, target);
          api.floatNum(target, `${shown}`, '#ffffff', 'true-dmg');
          triggerOnHitEffects(caster, target, fireDmg, { floatNum: api.floatNum });
          const maxE = Math.round(caster.maxHp * ((p.maxChargePct as number) ?? 25) / 100);
          cf._starEnergy = Math.min(maxE, (cf._starEnergy ?? 0) + Math.round(shown * ((p.chargeRate as number) ?? 30) / 100));
        }
      }
    }
    void totalDmg;
    return { touched: [target] };
  },

  // v0.9.5.B8: starMeteor 真 port — JS star.js:128-170
  // 流星暴击: AOE atkScale magic + mrDown + 充星能 + 满能 starMeteorBurst 引爆 + fireStarPassive
  starMeteor: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    if (!enemies.length) return { touched: [] };
    const atkScale = (skill.atkScale as number) ?? 0.6;
    const mrDown = skill.mrDown as { pct: number; turns: number } | undefined;
    const baseDmg = Math.round(caster.atk * atkScale);
    for (const e of enemies) {
      if (!e.alive) continue;
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      const effMr = calcEffMr(caster, e);
      const dmg = Math.max(1, Math.round(baseDmg * critMult * calcDmgMult(effMr) * ruleModifiers.magicMult()));
      const wasA = e.alive;
      const r = applyRawDamage(e, dmg, 'magic');
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      battleStats.recordDamage(caster, e, shown, 'mag');
      if (wasA && !e.alive) battleStats.recordKill(caster, e);
      api.floatNum(e, `${shown}`, '#4dabf7', isCrit ? 'crit-magic' : 'magic-dmg');
      triggerOnHitEffects(caster, e, dmg, { floatNum: api.floatNum });
      applyPostHitLayers(caster, e, shown, isCrit, 'magic');
      // 充星能
      const p = caster.passive;
      if (p?.type === 'starEnergy') {
        const cf = caster as Fighter & { _starEnergy?: number };
        const maxE = Math.round(caster.maxHp * ((p.maxChargePct as number) ?? 25) / 100);
        cf._starEnergy = Math.min(maxE, (cf._starEnergy ?? 0) + Math.round(shown * ((p.chargeRate as number) ?? 30) / 100));
      }
      // mrDown
      if (mrDown) {
        const existing = e.buffs.find(b => b.type === 'mrDown');
        if (existing) {
          existing.value = Math.max(existing.value, mrDown.pct);
          existing.duration = Math.max(existing.duration, mrDown.turns);
        } else {
          e.buffs.push({ type: 'mrDown', value: mrDown.pct, duration: mrDown.turns });
        }
      }
    }
    // 满能 burst: 80% stored 真伤 AOE
    const p = caster.passive;
    if (p?.type === 'starEnergy') {
      const cf = caster as Fighter & { _starEnergy?: number };
      const maxE = Math.round(caster.maxHp * ((p.maxChargePct as number) ?? 25) / 100);
      if ((cf._starEnergy ?? 0) >= maxE) {
        const burstPct = (p.burstPct as number) ?? 80;
        const burstDmg = Math.round((cf._starEnergy ?? 0) * burstPct / 100);
        cf._starEnergy = 0;
        for (const e of enemies) {
          if (!e.alive) continue;
          const finalDmg = burstDmg;   // (清理) 删 wormhole buff 加成 — 不再被 push, 恒不触发
          const wasA = e.alive;
          const r = applyRawDamage(e, finalDmg, 'true');
          const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
          battleStats.recordDamage(caster, e, shown, 'tru');
          if (wasA && !e.alive) battleStats.recordKill(caster, e);
          api.floatNum(e, `${shown}`, '#ffffff', 'true-dmg');
          triggerOnHitEffects(caster, e, finalDmg, { floatNum: api.floatNum });
        }
        // 用户: 去掉 "⭐星能爆发!" 喊话浮字 (伤害数字照常跳)
        api.log?.(`${caster.emoji}${caster.name} 星能爆发! 全敌 ${burstPct}% × ${burstDmg / (burstPct / 100)} 储能真伤`);
      }
    }
    // P89 1:1 JS star.js:163-164 — fireStarPassive 收尾对 firstAlive 真伤 (之前 PoC 缺)
    const firstAlive = enemies.find(e => e.alive);
    if (firstAlive) fireStarPassive(api, caster, firstAlive);
    api.log?.(`${caster.name} 流星暴击 全敌 ${baseDmg} 魔法${mrDown ? ` + -${mrDown.pct}%魔抗` : ''}`);
    return { touched: enemies };
  },
  // v0.9.5.A100: starBlackhole 黑洞 — JS star.js:174-235 (~95 行 vs 之前 5 行)
  //   1) VFX: 黑洞旋涡 800ms (graphics 同心圆 + 旋转扇区)
  //   2) 等 300ms 旋涡生效
  //   3) 判断 isLastEnemy:
  //      a) 是最后一敌: 检 execThresh (默认 15% HP) — 触发 → 直接斩杀 true damage
  //                     否则 1.8×ATK magic 直伤
  //      b) 不是最后一敌: 1.0×ATK magic + target 踢入黑洞 (stun + _isInBlackhole)
  //   4) addStarEnergy(caster, dmg) — 充星能
  //   5) fireStarPassive — 命中后 40% stored energy 真伤 (passive 加成)
  starBlackhole: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const cv = api.viewOf(caster);
    const tv = api.viewOf(target);
    if (!cv || !tv) return { touched: [] };
    const scene = api.scene;
    const enemies = getEnemies(api, caster);
    const isLastEnemy = enemies.length <= 1;
    const atkScale = isLastEnemy
      ? ((skill.lastTargetAtkScale as number) ?? 1.8)
      : ((skill.atkScale as number) ?? 1.0);
    const execThresh = (skill.executeThreshPct as number) ?? 15;

    // ── 1. 黑洞 VFX (旋涡 graphics, 800ms 生命) ──
    const hole = scene.add.graphics().setDepth(46);
    const ring = scene.add.graphics().setDepth(46);
    let rot = 0;
    const startT = scene.time.now;
    const tick = scene.time.addEvent({
      delay: 16, loop: true, callback: () => {
        const elapsed = scene.time.now - startT;
        const p = Math.min(1, elapsed / 800);
        rot += 0.18;
        hole.clear();
        ring.clear();
        // 中心黑洞: 渐变同心圆
        const cx = tv.x, cy = tv.y;
        for (let i = 6; i >= 0; i--) {
          const r = 8 + i * 6 + p * 12;
          const a = (0.18 + (6 - i) * 0.12) * (1 - p * 0.7);
          hole.fillStyle(0x1a0033, a);
          hole.fillCircle(cx, cy, r);
        }
        // 旋转环 (4 段 紫色弧)
        ring.lineStyle(3, 0xc77dff, 0.85 * (1 - p * 0.5));
        for (let i = 0; i < 4; i++) {
          const startA = rot + (i * Math.PI / 2);
          ring.beginPath();
          ring.arc(cx, cy, 30 + p * 18, startA, startA + Math.PI / 3);
          ring.strokePath();
        }
        if (p >= 1) { tick.remove(); hole.destroy(); ring.destroy(); }
      },
    });

    await sleep(300);

    // ── 2. 应用伤害 / 处决 ──
    let actualDmg = 0;
    const isExecute = isLastEnemy && (target.hp / target.maxHp * 100) <= execThresh;
    if (isExecute) {
      // 黑洞斩杀: applyRawDamage 一次 true (target.hp + 99999), 飘 "🎯黑洞斩杀!"
      const wasA = target.alive;
      const r = applyRawDamage(target, target.hp + 99999, 'true');
      actualDmg = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      battleStats.recordDamage(caster, target, actualDmg, 'tru');
      if (wasA && !target.alive) battleStats.recordKill(caster, target);
      // 用户: 去掉 "🎯黑洞斩杀!" 喊话浮字
    } else {
      // 普通: magic damage 走 mr 减免
      const baseDmg = Math.round(caster.atk * atkScale);
      const effMr = calcEffMr(caster, target);
      const finalDmg = Math.max(1, Math.round(baseDmg * calcDmgMult(effMr) * ruleModifiers.magicMult()));
      const wasA = target.alive;
      const r = applyRawDamage(target, finalDmg, 'magic');
      actualDmg = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      battleStats.recordDamage(caster, target, actualDmg, 'mag');
      if (wasA && !target.alive) battleStats.recordKill(caster, target);
      api.floatNum(target, `${actualDmg}`, '#4dabf7', 'magic-dmg');
      triggerOnHitEffects(caster, target, finalDmg, { floatNum: api.floatNum });
      applyPostHitLayers(caster, target, actualDmg, false, 'magic');

      // 不是最后一敌 → 踢入黑洞 (stun + _isInBlackhole flag, 1 回合)
      if (!isLastEnemy && target.alive) {
        target.buffs.push({ type: 'blackhole', value: 1, duration: 2 });
        target.buffs.push({ type: 'stun', value: 1, duration: 2 });
        (target as Fighter & { _isInBlackhole?: boolean; _stunUsed?: boolean })._isInBlackhole = true;
        (target as Fighter & { _stunUsed?: boolean })._stunUsed = false;
        // 视觉: target sprite 暗色 tint (in-blackhole CSS 类近似)
        tv.sprite.setTint(0x553388);
        // 不可选中(_isInBlackhole)随 'blackhole' buff 存亡 (updateBlackholeVisuals 每帧同步), 不再 1100ms 提前清 —
        //   否则黑洞状态还在(徽章/黑椭圆/眩晕)却又能被单体选中。tint 只是视觉(已被黑椭圆盖住), 到点清掉即可。
        scene.time.delayedCall(1100, () => { tv.sprite.clearTint(); });
      }
    }

    // ── 3. addStarEnergy (passive starEnergy) ──
    const p = caster.passive;
    if (p?.type === 'starEnergy' && actualDmg > 0) {
      const maxE = Math.round(caster.maxHp * ((p.maxChargePct as number) ?? 25) / 100);
      const chargeRate = (p.chargeRate as number) ?? 30;
      const gain = Math.round(actualDmg * chargeRate / 100);
      const cur = ((caster as Fighter & { _starEnergy?: number })._starEnergy ?? 0);
      (caster as Fighter & { _starEnergy?: number })._starEnergy = Math.min(maxE, cur + gain);
    }

    // ── 4. fireStarPassive (40% stored energy 真伤, after-skill 触发) ──
    if (p?.type === 'starEnergy' && target.alive) {
      const stored = ((caster as Fighter & { _starEnergy?: number })._starEnergy ?? 0);
      if (stored > 0) {
        const firePct = (p.passiveFirePct as number) ?? 40;
        const fireDmg = Math.round(stored * firePct / 100);
        if (fireDmg > 0) {
          const wasA = target.alive;
          const r = applyRawDamage(target, fireDmg, 'true');
          const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
          battleStats.recordDamage(caster, target, shown, 'tru');
          if (wasA && !target.alive) battleStats.recordKill(caster, target);
          api.floatNum(target, `${shown}`, '#ffffff', 'true-dmg');
          triggerOnHitEffects(caster, target, fireDmg, { floatNum: api.floatNum });
          // 充能: 再 +gain
          const maxE = Math.round(caster.maxHp * ((p.maxChargePct as number) ?? 25) / 100);
          const cur = ((caster as Fighter & { _starEnergy?: number })._starEnergy ?? 0);
          const gain = Math.round(shown * ((p.chargeRate as number) ?? 30) / 100);
          (caster as Fighter & { _starEnergy?: number })._starEnergy = Math.min(maxE, cur + gain);
        }
      }
    }

    return { touched: [target] };
  },
  // v0.9.5.B7: starGravityWarp 真 port — JS star.js:238-328 (~90 行)
  // 扭曲空间: 全体敌方 atkScale × ATK magic + 星能满时换位 (F0↔B2 / F1↔B1 / F2↔B0)
  starGravityWarp: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    if (!enemies.length) return { touched: [] };
    const atkScale = (skill.atkScale as number) ?? 0.8;
    const dmgBase = Math.round(caster.atk * atkScale);
    for (const e of enemies) {
      if (!e.alive) continue;
      const effMr = calcEffMr(caster, e);
      const dmg = Math.max(1, Math.round(dmgBase * calcDmgMult(effMr) * ruleModifiers.magicMult()));
      const wasA = e.alive;
      const r = applyRawDamage(e, dmg, 'magic');
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      battleStats.recordDamage(caster, e, shown, 'mag');
      if (wasA && !e.alive) battleStats.recordKill(caster, e);
      api.floatNum(e, `${shown}`, '#4dabf7', 'magic-dmg');
      triggerOnHitEffects(caster, e, dmg, { floatNum: api.floatNum });
      applyPostHitLayers(caster, e, shown, false, 'magic');
      // addStarEnergy
      const p = caster.passive;
      if (p?.type === 'starEnergy') {
        const cf = caster as Fighter & { _starEnergy?: number };
        const maxE = Math.round(caster.maxHp * ((p.maxChargePct as number) ?? 25) / 100);
        const gain = Math.round(shown * ((p.chargeRate as number) ?? 30) / 100);
        cf._starEnergy = Math.min(maxE, (cf._starEnergy ?? 0) + gain);
      }
    }
    // 星能满 → 换位
    const p = caster.passive;
    if (p?.type === 'starEnergy') {
      const cf = caster as Fighter & { _starEnergy?: number };
      const maxE = Math.round(caster.maxHp * ((p.maxChargePct as number) ?? 25) / 100);
      if ((cf._starEnergy ?? 0) >= maxE) {
        // 换位 F0↔B2, F1↔B1, F2↔B0
        const enemyTeam = enemies;
        const swaps: Array<[string, string]> = [['front-0', 'back-2'], ['front-1', 'back-1'], ['front-2', 'back-0']];
        for (const [a, b] of swaps) {
          const fa = enemyTeam.find(t => (t as Fighter & { _slotKey?: string })._slotKey === a);
          const fb = enemyTeam.find(t => (t as Fighter & { _slotKey?: string })._slotKey === b);
          if (fa) { (fa as Fighter & { _slotKey?: string })._slotKey = b; fa._position = b.startsWith('front') ? 'front' : 'back'; }
          if (fb) { (fb as Fighter & { _slotKey?: string })._slotKey = a; fb._position = a.startsWith('front') ? 'front' : 'back'; }
        }
        cf._starEnergy = 0;
        // 用户: 去掉 "⭐扭曲!换位" 喊话浮字 (换位有 sprite 平移特效)
        // BattleScene 端需要重新 layout views — 发事件
        api.scene.events.emit('star-gravity-warp');
      }
    }
    // P89 1:1 JS star.js:322-325 — fireStarPassive 收尾对 firstAlive (之前 PoC 缺)
    const firstAliveGw = enemies.find(e => e.alive);
    if (firstAliveGw) fireStarPassive(api, caster, firstAliveGw);
    return { touched: enemies };
  },

  // 虫洞 (用户重做 2026-05-28): 自身永久 +(6+0.5×等级) 魔法穿透; 沿 target 所在横排(sameColumn:
  //   front-N+back-N) 释放虫洞移动, 4 段共 150%ATK×(1+10%回合) 魔法; 命中敌人击飞。
  starWormhole: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    // 1) 自身永久魔法穿透 +(magicPenBase + magicPenPerLevel × 等级)
    const lvl = (caster as Fighter & { _level?: number })._level ?? 1;
    const penGain = Math.round(((skill.magicPenBase as number) ?? 6) + ((skill.magicPenPerLevel as number) ?? 0.5) * lvl);
    caster.magicPen = (caster.magicPen ?? 0) + penGain;
    // 显式 passive-num: 自身增益, 不传 cls 时 #4cc9f0→magic-dmg(命中类) 会让施法者自己红闪受击 (同泡泡盾根因)
    api.floatNum(caster, `+${penGain}🔮穿`, '#4cc9f0', 'passive-num');
    // 2) target 所在横排 (sameColumn = front-N + back-N) 的存活敌人
    const rowTargets = sameColumnFighters(api.allFighters, target).filter(t => t.alive && t.side !== caster.side);
    const targets = rowTargets.length ? rowTargets : [target];
    // 3) 4 段, 共 atkScale×ATK×(1+turnDmgPct%×回合) 魔法 (随回合数变大), 每段平摊后对横排每个敌人
    const turn = (api.scene as unknown as { turn?: number }).turn ?? 1;
    const hits = (skill.hits as number) ?? 4;
    const totalBase = caster.atk * ((skill.atkScale as number) ?? 1.5) * (1 + ((skill.turnDmgPct as number) ?? 10) / 100 * turn);
    const perSeg = totalBase / hits;
    for (let h = 0; h < hits; h++) {
      for (const e of targets) {
        if (!e.alive) continue;
        const isCrit = rollCrit(effectiveCrit(caster));
        const critMult = isCrit ? calcCritMult(caster) : 1;
        const dmg = Math.max(1, Math.round(perSeg * critMult * calcDmgMult(calcEffMr(caster, e)) * ruleModifiers.magicMult()));
        const wasA = e.alive;
        const r = applyRawDamage(e, dmg, 'magic');
        const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        battleStats.recordDamage(caster, e, shown, 'mag');
        if (wasA && !e.alive) battleStats.recordKill(caster, e);
        api.floatNum(e, `${shown}`, '#4dabf7', isCrit ? 'crit-dmg' : 'magic-dmg');
        triggerOnHitEffects(caster, e, dmg, { floatNum: api.floatNum, isCrit, critMult });
      }
      if (h < hits - 1) await sleep(120);
    }
    // 4) 灰字: 命中的敌人被击飞
    for (const e of targets) if (e.alive) api.knockup?.(e);
    fireStarPassive(api, caster, target);
    return { touched: [...targets, caster] };
  },

  // v0.9.5.B8: volcanoSmash 真 port — JS volcano.js:1-27
  // 烈焰重击: 单体 atkScale + selfHpPct% maxHp 物理 + lifestealPct% 生命偷取
  volcanoSmash: async (api, caster, target, skill) => {
    if (!target || !target.alive) return { touched: [] };
    const atkScale = (skill.atkScale as number) ?? 1.4;
    const selfHpPct = (skill.selfHpPct as number) ?? 0;
    const lifestealPct = (skill.lifestealPct as number) ?? 0;
    const isCrit = rollCrit(effectiveCrit(caster));
    const critMult = isCrit ? calcCritMult(caster) : 1;
    let baseDmg = Math.round(caster.atk * atkScale);
    if (selfHpPct > 0) baseDmg += Math.round(caster.maxHp * selfHpPct / 100);
    const eDef = calcEffArmor(caster, target);
    const dmg = Math.max(1, Math.round(baseDmg * critMult * calcDmgMult(eDef)));
    const wasA = target.alive;
    const r = applyRawDamage(target, dmg, 'physical');
    const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
    battleStats.recordDamage(caster, target, shown, 'phy');
    if (wasA && !target.alive) battleStats.recordKill(caster, target);
    api.floatNum(target, `${shown}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
    triggerOnHitEffects(caster, target, dmg, { floatNum: api.floatNum });
    applyPostHitLayers(caster, target, shown, isCrit, 'physical');
    // 生命偷取
    if (lifestealPct > 0 && caster.alive) {
      const heal = Math.round(shown * lifestealPct / 100);
      const before = caster.hp;
      caster.hp = Math.min(caster.maxHp, caster.hp + heal);
      if (caster.hp > before) api.floatNum(caster, `+${caster.hp - before}`, '#06d6a0', 'heal-num');
    }
    return { touched: [target] };
  },

  // v0.9.5.B8: volcanoErupt 真 port — JS volcano.js:57-101
  // 火山爆发: hits 段 atkScale + selfHpPct% maxHp 全体 magic + 灼烧 + 总伤 15% 生命偷取
  volcanoErupt: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    if (!enemies.length) return { touched: [] };
    const hits = (skill.hits as number) ?? 5;
    const atkScale = (skill.atkScale as number) ?? 0.4;
    const selfHpPct = (skill.selfHpPct as number) ?? 0;
    let totalAll = 0;
    for (let i = 0; i < hits; i++) {
      for (const e of enemies) {
        if (!e.alive) continue;
        const isCrit = rollCrit(effectiveCrit(caster));
        const critMult = isCrit ? calcCritMult(caster) : 1;
        let magicBase = Math.round(caster.atk * atkScale);
        if (selfHpPct > 0) magicBase += Math.round(caster.maxHp * selfHpPct / 100);
        const effMr = calcEffMr(caster, e);
        const dmg = Math.max(1, Math.round(magicBase * critMult * calcDmgMult(effMr) * ruleModifiers.magicMult()));
        const wasA = e.alive;
        const r = applyRawDamage(e, dmg, 'magic');
        const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        totalAll += shown;
        battleStats.recordDamage(caster, e, shown, 'mag');
        if (wasA && !e.alive) battleStats.recordKill(caster, e);
        api.floatNum(e, `${shown}`, '#4dabf7', isCrit ? 'crit-magic' : 'magic-dmg');
        triggerOnHitEffects(caster, e, dmg, { floatNum: api.floatNum });
        applyPostHitLayers(caster, e, shown, isCrit, 'magic');
      }
      await sleep(180);
    }
    // P89/F4 1:1 JS volcano.js applySkillDebuffs default — burn 层数 round(atk×0.67) 累加 + duration:999
    for (const e of enemies) {
      if (!e.alive) continue;
      applyBurn(e, defaultBurnStacks(caster));
    }
    // 15% 生命偷取总伤
    if (caster.alive && totalAll > 0) {
      const heal = Math.round(totalAll * 0.15);
      const before = caster.hp;
      caster.hp = Math.min(caster.maxHp, caster.hp + heal);
      if (caster.hp > before) api.floatNum(caster, `+${caster.hp - before}`, '#06d6a0', 'heal-num');
    }
    return { touched: enemies };
  },
  // P89 1:1 JS _misc.js:262-288 doVolcanoStomp — AOE magic + stunChance% stun + healLostPct% self
  //   之前 PoC: 单体 physical + 100% stun + 无 heal → 完全错的 skill identity
  volcanoStomp: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    if (!enemies.length) return { touched: [] };
    const atkScale = (skill.atkScale as number) ?? 0.8;
    const stunChance = (skill.stunChance as number) ?? 40;  // JS default 40
    const healLostPct = (skill.healLostPct as number) ?? 0;
    const touched: Fighter[] = [];
    for (const e of enemies) {
      if (!e.alive) continue;
      const effMr = calcEffMr(caster, e);
      const baseRaw = Math.round(caster.atk * atkScale);
      const dmg = Math.max(1, Math.round(baseRaw * calcDmgMult(effMr) * ruleModifiers.magicMult()));
      const wasA = e.alive;
      const r = applyRawDamage(e, dmg, 'magic');
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      battleStats.recordDamage(caster, e, shown, 'mag');
      if (wasA && !e.alive) battleStats.recordKill(caster, e);
      api.floatNum(e, `${shown}`, '#4dabf7', 'magic-dmg');
      // JS:272 概率 stun (默认 40, PoC 之前 100%)
      if (Math.random() * 100 < stunChance && e.alive) {
        e.buffs.push({ type: 'stun', value: 1, duration: 2 });
        (e as Fighter & { _stunUsed?: boolean })._stunUsed = false;
        api.floatNum(e, '眩晕', '#ffd86b', 'debuff-label', 200, 0);
      }
      triggerOnHitEffects(caster, e, dmg, { floatNum: api.floatNum });
      touched.push(e);
    }
    // JS:280-285 self-heal lost HP × healLostPct%
    if (healLostPct > 0 && caster.alive) {
      const lostHp = caster.maxHp - caster.hp;
      const heal = Math.round(lostHp * healLostPct / 100);
      const before = caster.hp;
      caster.hp = Math.min(caster.maxHp, caster.hp + heal);
      if (caster.hp > before) {
        api.floatNum(caster, `+${caster.hp - before}`, '#06d6a0', 'heal-num', 0, 0);
        battleStats.recordHeal(caster, caster, caster.hp - before);
      }
    }
    await sleep(400);  // JS:287
    return { touched };
  },
  // v0.9.5.B7: volcanoArmor 真 port — JS volcano.js:29-55
  // 熔岩铠甲: shieldAtkScale × ATK 护盾 + defUp/mrUp defMrUpPct% defMrUpTurns + healLostPct% 已损 heal
  volcanoArmor: async (api, caster, _target, skill) => {
    const shieldAtkScale = (skill.shieldAtkScale as number) ?? 0.6;
    const defMrUpPct = (skill.defMrUpPct as number) ?? 30;
    const defMrUpTurns = (skill.defMrUpTurns as number) ?? 3;
    const healLostPct = (skill.healLostPct as number) ?? 0;
    // shield
    const shieldAmt = Math.round(caster.atk * shieldAtkScale);
    caster.shield = (caster.shield ?? 0) + shieldAmt;
    api.floatNum(caster, `+${shieldAmt}`, '#c0c0c0', 'shield-num');
    // defUp/mrUp
    const defGain = Math.round((caster.baseDef ?? 0) * defMrUpPct / 100);
    const mrGain = Math.round((caster.baseMr ?? caster.baseDef ?? 0) * defMrUpPct / 100);
    caster.buffs.push({ type: 'defUp', value: defGain, duration: defMrUpTurns + 1 });
    caster.buffs.push({ type: 'mrUp', value: mrGain, duration: defMrUpTurns + 1 });
    caster.def = (caster.def ?? 0) + defGain;
    caster.mr = (caster.mr ?? 0) + mrGain;
    api.floatNum(caster, `+${defGain}甲 +${mrGain}抗 ${defMrUpTurns}t`, '#10b981');
    // heal lost HP
    if (healLostPct > 0 && caster.alive) {
      const lostHp = caster.maxHp - caster.hp;
      const heal = Math.round(lostHp * healLostPct / 100);
      const before = caster.hp;
      caster.hp = Math.min(caster.maxHp, caster.hp + heal);
      if (caster.hp > before) api.floatNum(caster, `+${caster.hp - before}`, '#06d6a0', 'heal-num');
    }
    return { touched: [caster] };
  },

  // ── gambler 赌神 (5 active) ──
  // v0.9.5.B1: gamblerBet 真 port — JS gambler.js:64-112 (~50 行 vs 之前 11 行)
  // 校验 HP > 40% → 自损 40% HP → 折算为 6 段物理伤害 + 临时 +20% multiHit
  gamblerBet: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    if (caster.hp / caster.maxHp <= 0.4) {
      api.floatNum(caster, 'HP不足!', '#888');
      return { touched: [] };
    }
    const hpCostPct = (skill.hpCostPct as number) ?? 40;
    const hits = (skill.hits as number) ?? 7;   // P32: JS pets.js:405 hits=7 (NOT 6)
    const multiBonus = (skill.multiBonus as number) ?? 20;
    const hpCost = Math.round(caster.hp * hpCostPct / 100);
    // P28: JS:73 attacker.hp -= hpCost — PoC floor 1 防 cascade death (JS 可自杀)
    caster.hp = Math.max(1, caster.hp - hpCost);
    // 自损 HP 飘字: 用 dot-dmg(橙, 非命中类) → 只是自己掉血, 不触发自身"受伤动画"(红闪/震/击退)
    api.floatNum(caster, `-${hpCost}`, '#ff6600', 'dot-dmg');
    api.log?.(`${caster.emoji}${caster.name} 赌注! 消耗 ${hpCost}HP`);   // JS:77
    await sleep(400);
    (caster as Fighter & { _multiBonus?: number })._multiBonus =
      ((caster as Fighter & { _multiBonus?: number })._multiBonus ?? 0) + multiBonus;
    const dmgPer = Math.round(hpCost / hits);
    let totalDmg = 0;
    for (let i = 0; i < hits; i++) {
      if (!target.alive) { await sleep(120); continue; }   // 目标已死: 留空拍, 不出伤
      // 一段一段出伤: 每段先一个挥击脉冲(攻击节奏), 再落这一段的伤害
      api.pulseScale?.(caster, 1.12, 150);
      await sleep(160);
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      const eDef = calcEffArmor(caster, target);
      const dmg = Math.max(1, Math.round(dmgPer * critMult * calcDmgMult(eDef)));
      const wasA = target.alive;
      const r = applyRawDamage(target, dmg, 'physical');
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      totalDmg += shown;
      battleStats.recordDamage(caster, target, shown, 'phy');
      if (wasA && !target.alive) battleStats.recordKill(caster, target);
      api.floatNum(target, `${shown}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
      // 每段都触发被动 (含多重打击 tryGamblerMultiHit chain — passive-triggers.ts) ✓
      triggerOnHitEffects(caster, target, dmg, { floatNum: api.floatNum });
      applyPostHitLayers(caster, target, shown, isCrit, 'physical');
      await sleep(300);   // 段间停顿, 看清这一段
    }
    api.log?.(`→ ${target.emoji}${target.name}：${totalDmg}物理 (消耗${hpCost}HP÷${hits})`);   // JS:107
    (caster as Fighter & { _multiBonus?: number })._multiBonus =
      Math.max(0, ((caster as Fighter & { _multiBonus?: number })._multiBonus ?? 0) - multiBonus);
    await sleep(200);   // JS:111
    return { touched: [target] };
  },

  // gamblerCards (基于 JS combat.js:828-852 改进):
  //   - hits 段, 每段随机 minScale~maxScale × ATK 物理
  //   - **改进点 (2026-05-29 用户决策): 卡牌射击现在可暴击** — 赌神龟是暴击主题(基础25%+
  //     ♦命运之轮+8%/层), 唯独 cd0 基础攻击不吃暴击别扭; 每段独立 roll + calcCritMult (与万能牌/赌注一致)。
  //   - hit-shake 700ms + 200ms 间隔 + tryGamblerMultiHit chain (passive proc)
  gamblerCards: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const hits = (skill.hits as number) ?? 3;
    const minScale = (skill.minScale as number) ?? 0.3;
    const maxScale = (skill.maxScale as number) ?? 0.6;
    let total = 0;
    for (let i = 0; i < hits; i++) {
      if (!target.alive) break;
      const scale = minScale + Math.random() * (maxScale - minScale);
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      const eDef = calcEffArmor(caster, target);
      const dmg = Math.max(1, Math.round(caster.atk * scale * critMult * calcDmgMult(eDef)));
      const wasA = target.alive;
      const r = applyRawDamage(target, dmg, 'physical');
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      total += shown;
      battleStats.recordDamage(caster, target, shown, 'phy');
      if (wasA && !target.alive) battleStats.recordKill(caster, target);
      api.floatNum(target, `${shown}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
      triggerOnHitEffects(caster, target, dmg, { floatNum: api.floatNum });
      applyPostHitLayers(caster, target, shown, isCrit, 'physical');
      // JS:851-852: hit-shake 700ms + sleep 200ms 之间 (900ms per-hit cadence)
      await sleep(700 + 200);
    }
    api.log?.(`${caster.emoji}${caster.name} <b>卡牌射击</b> → ${target.emoji}${target.name}：${total}物理`);   // JS:851
    return { touched: [target] };
  },

  // v0.9.5.B1: gamblerDraw 真 port — JS gambler.js:1-62 (~70 行 vs 之前 8 行)
  // 万能牌: 2-hit 物理 + 自身 selfShieldAtkPct 护盾 + selfHealAtkPct 回血 + 随机 8 选 1 debuff
  gamblerDraw: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const atkScale = (skill.atkScale as number) ?? 0.5;
    const selfShieldAtkPct = (skill.selfShieldAtkPct as number) ?? 25;
    const selfHealAtkPct = (skill.selfHealAtkPct as number) ?? 25;
    const perHit = Math.round(caster.atk * atkScale);
    // 2-hit 物理
    for (let i = 0; i < 2; i++) {
      if (!target.alive) break;
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      const eDef = calcEffArmor(caster, target);
      const dmg = Math.max(1, Math.round(perHit * critMult * calcDmgMult(eDef)));
      const wasA = target.alive;
      const r = applyRawDamage(target, dmg, 'physical');
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      battleStats.recordDamage(caster, target, shown, 'phy');
      if (wasA && !target.alive) battleStats.recordKill(caster, target);
      api.floatNum(target, `${shown}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
      triggerOnHitEffects(caster, target, dmg, { floatNum: api.floatNum });
      applyPostHitLayers(caster, target, shown, isCrit, 'physical');
      await sleep(220);   // P28: JS gambler.js:19 sleep(220) per hit (was 180 — drift)
    }
    // P28: 永久护盾 — JS:24 spawnFloatingNum '+${amt}' (无 emoji)
    const shieldAmt = Math.round(caster.atk * selfShieldAtkPct / 100);
    caster.shield = (caster.shield ?? 0) + shieldAmt;
    api.floatNum(caster, `+${shieldAmt}`, '#c0c0c0', 'shield-num');
    // P28: 回血 — JS:31 spawnFloatingNum '+${actual}' (无 emoji)
    const healAmt = Math.round(caster.atk * selfHealAtkPct / 100);
    const before = caster.hp;
    caster.hp = Math.min(caster.maxHp, caster.hp + healAmt);
    const actualHeal = caster.hp - before;
    if (actualHeal > 0) api.floatNum(caster, `+${actualHeal}`, '#06d6a0', 'heal-num');
    // 随机 8 选 1 debuff (JS gambler.js:33-56 1:1)
    let debuffLog = '';
    if (target.alive) {
      const dotStacks = Math.max(1, Math.round(caster.atk * 0.11));
      const pool: Array<{ kind: 'buff'; buff: { type: string; value: number; duration: number }; label: string } | { kind: 'dot'; dotType: string; stacks: number; label: string }> = [
        { kind: 'buff', buff: { type: 'atkDown', value: 20, duration: 3 }, label: '⬇20%攻击' },
        { kind: 'buff', buff: { type: 'defDown', value: 20, duration: 3 }, label: '⬇20%护甲' },
        { kind: 'buff', buff: { type: 'mrDown', value: 20, duration: 3 }, label: '⬇20%魔抗' },
        { kind: 'buff', buff: { type: 'healReduce', value: 50, duration: 3 }, label: '⬇50%治疗' },
        { kind: 'dot', dotType: 'poison', stacks: dotStacks, label: '🟢中毒' },
        { kind: 'dot', dotType: 'bleed', stacks: dotStacks, label: '' },   // 用户: 流血不跳文字/图标
        { kind: 'dot', dotType: 'burn', stacks: dotStacks, label: '🔥灼烧' },
        { kind: 'buff', buff: { type: 'chilled', value: 1, duration: 2 }, label: '❄冰寒' },
      ];
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick.kind === 'dot') {
        // #8 低#2: 走层数累加模型 (applyDotStacks/applyBurn), 旧版 push 固定 duration:3 → 不叠层且绕过层模型
        if (pick.dotType === 'burn') applyBurn(target, pick.stacks);
        else applyDotStacks(target, pick.dotType as 'bleed' | 'poison', pick.stacks);
      } else {
        target.buffs.push(pick.buff);
      }
      // JS:52 spawnFloatingNum (delay 500, yOff -14, debuff-label cls)
      if (pick.label) api.floatNum(target, pick.label, '#c77dff', 'debuff-label');   // 空 label(如流血)不跳
      debuffLog = pick.label;
    }
    // JS:60 addLog
    api.log?.(`${caster.emoji}${caster.name} <b>万能牌</b> → ${target.emoji}${target.name}：2段物理 +${shieldAmt}护盾 +${actualHeal}HP${debuffLog ? ' ' + debuffLog : ''}`);
    await sleep(600);   // JS:61
    return { touched: [target, caster] };
  },

  // gamblerFateWheel: passive (turn-begin 4 花色), 已在 BattleScene.processTurnBeginPassives 处理 (A87)
  gamblerFateWheel: async (_api, caster, _target, _skill) => ({ touched: [caster] }),

  // v0.9.5.B2: chestStorm 真 port — JS chest.js:125-206 (~60 行 vs 之前 8 行)
  // 财宝风暴: hits 段全体 物理 + pierceScale 真伤 (cuts 6) + chest equip 变体 (star→真伤, thunder→闪电累积)
  chestStorm: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    if (enemies.length === 0) return { touched: [] };
    const hits = (skill.hits as number) ?? 6;
    const atkScale = (skill.atkScale as number) ?? 0.3;
    const pierceScale = (skill.pierceScale as number) ?? 0;
    // chest equip 变体 (caster._chestEquipStar/Thunder, 跟 hasChestEquip 对齐)
    const hasStar = ((caster as Fighter & { _chestEquipStar?: boolean })._chestEquipStar === true);
    const hasThunder = ((caster as Fighter & { _chestEquipThunder?: boolean })._chestEquipThunder === true);
    const physType = hasStar ? 'true' : 'physical';
    let totalAll = 0;
    for (let i = 0; i < hits; i++) {
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const isCrit = rollCrit(effectiveCrit(caster));
        const critMult = isCrit ? calcCritMult(caster) : 1;
        const physBase = Math.round(caster.atk * atkScale);
        const eDef = physType === 'true' ? 0 : calcEffArmor(caster, enemy);
        const physDmg = Math.max(1, Math.round(physBase * critMult * calcDmgMult(eDef)));
        const trueDmg = pierceScale > 0 ? Math.round(caster.atk * pierceScale * critMult) : 0;
        const wasA = enemy.alive;
        const rp = applyRawDamage(enemy, physDmg, physType === 'true' ? 'true' : 'physical');
        const physShown = (rp.hpLoss ?? 0) + (rp.shieldAbs ?? 0);
        battleStats.recordDamage(caster, enemy, physShown, physType === 'true' ? 'tru' : 'phy');
        totalAll += physShown;
        if (wasA && !enemy.alive) battleStats.recordKill(caster, enemy);
        api.floatNum(enemy, `${physShown}`, physType === 'true' ? '#ffffff' : '#ff4444', isCrit ? (physType === 'true' ? 'crit-true' : 'crit-dmg') : (physType === 'true' ? 'true-dmg' : 'direct-dmg'));
        if (trueDmg > 0 && enemy.alive) {
          const rt = applyRawDamage(enemy, trueDmg, 'true');
          const trueShown = (rt.hpLoss ?? 0) + (rt.shieldAbs ?? 0);
          battleStats.recordDamage(caster, enemy, trueShown, 'tru');
          totalAll += trueShown;
          api.floatNum(enemy, `${trueShown}`, '#ffffff', 'true-dmg');
        }
        triggerOnHitEffects(caster, enemy, physDmg + trueDmg, { floatNum: api.floatNum });
        applyPostHitLayers(caster, enemy, physShown, isCrit, physType === 'true' ? 'magic' : 'physical');
        // thunder equip: 累积 _goldLightning, 满 5 引爆 1×ATK true + 闪电劈下 VFX
        if (hasThunder && enemy.alive) {
          const ee = enemy as Fighter & { _goldLightning?: number };
          ee._goldLightning = (ee._goldLightning ?? 0) + 1;
          if (ee._goldLightning >= 5) {
            ee._goldLightning = 0;
            // P78: 闪电劈下 VFX (JS chest.js:167 spawnLightningStrike)
            const ev = api.viewOf(enemy);
            if (ev) {
              const groundY = ev.sprite.y + (ev.sprite.displayHeight ?? 80) / 2;
              spawnLightningStrike(api.scene, ev.sprite.x, groundY);
            }
            const thunderDmg = Math.round(caster.atk * 1.0);
            const rth = applyRawDamage(enemy, thunderDmg, 'true');
            const thShown = (rth.hpLoss ?? 0) + (rth.shieldAbs ?? 0);
            battleStats.recordDamage(caster, enemy, thShown, 'tru');
            api.floatNum(enemy, `${thShown}`, '#ffffff', 'true-dmg');
          }
        }
      }
      await sleep(280);
    }
    // P19 chestStorm: 增加 fire / poison 装备变种 (跟 chestSmash 一致, JS chest.js:201-220)
    const cf2 = caster as Fighter & { _chestEquipFire?: boolean; _chestEquipPoison?: boolean };
    if (cf2._chestEquipFire) {
      for (const t of enemies) {
        if (!t.alive) continue;
        // F4: chest fire = 默认层数 round(atk×0.67) (JS chest.js:189) — 旧 0.4 偏弱
        applyDotStacks(t, 'burn', defaultBurnStacks(caster));
        api.floatNum(t, '🔥灼烧', '#ff8c42', 'debuff-label');
      }
    }
    if (cf2._chestEquipPoison) {
      for (const t of enemies) {
        if (!t.alive) continue;
        const existing = t.buffs.find(b => b.type === 'healReduce');
        if (existing) existing.duration = 4;
        else t.buffs.push({ type: 'healReduce', value: 50, duration: 4 });
        api.floatNum(t, '☠️治疗削减', '#ff88aa', 'debuff-label');
      }
    }
    void totalAll;
    return { touched: enemies };
  },

  // ── hunter 猎人 ──
  // JS hunter.js:57-91 doHunterBarrage 1:1 — arrowScale × ATK 真伤 (不是 atkScale 物理!)
  //   N 段随机敌 (skill.hits 默认 10), 每段独立 crit + lowHpCrit 检查
  // 旧 Phaser: dealPhysical + atkScale 完全错!
  hunterBarrage: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    const hits = (skill.hits as number) ?? 10;
    const arrowScale = (skill.arrowScale as number) ?? 0.5;
    const baseArrow = Math.round(caster.atk * arrowScale);
    const touched: Fighter[] = [];
    const cvB = api.viewOf(caster);
    // P17 JS hunter.js:64 — 220ms windup 让 caster 拉弓动作起步
    await sleep(220);
    for (let i = 0; i < hits; i++) {
      const alive = enemies.filter(e => e.alive);
      if (!alive.length) break;
      const t = alive[Math.floor(Math.random() * alive.length)];
      // K3: 飞 hunter-arrow sprite (JS spawnHunterArrow) — fire-and-forget, 不阻塞 barrage 节奏
      if (cvB && !_auditMode) {
        const tvB = api.viewOf(t);
        if (tvB) void fireHunterArrow(api.scene, cvB.x + (caster.side === 'left' ? 30 : -30), cvB.y, tvB.x, tvB.y, 200);
      }
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      const arrowDmg = Math.max(1, Math.round(baseArrow * critMult));
      // JS:78 真伤 pierce=true
      const wasA = t.alive;
      const r = applyRawDamage(t, arrowDmg, 'true', true);
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      battleStats.recordDamage(caster, t, shown, 'tru');
      if (wasA && !t.alive) battleStats.recordKill(caster, t);
      api.floatNum(t, `${shown}`, '#ffffff', isCrit ? 'crit-true' : 'true-dmg');
      triggerOnHitEffects(caster, t, arrowDmg, { floatNum: api.floatNum });
      applyPostHitLayers(caster, t, shown, isCrit, 'physical');
      if (!touched.includes(t)) touched.push(t);
      if (i < hits - 1) await sleep(120);   // JS:87 sleep(120)
    }
    return { touched };
  },

  // JS hunter.js:116-129 doHunterPoison 1:1 — 物理 dmg + poison stacks + healReduce
  //   stacks = round(skill.dot.dmg × turns / 4)
  //   healReduce {value:50, turns: dot.turns||3}
  // 旧 Phaser: poison hardcoded {atk×0.25, 4t}, 无 healReduce — 缺失字段读取
  hunterPoison: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const isCrit = rollCrit(effectiveCrit(caster));
    const dmg = dealPhysical(caster, target, caster.atk * ((skill.atkScale as number) ?? 0.8), isCrit);
    api.floatNum(target, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
    // dot poison stacks (JS:120-123 applyDotStacks)
    const dot = skill.dot as { dmg?: number; turns?: number } | undefined;
    if (dot && target.alive) {
      const stacks = Math.max(1, Math.round((dot.dmg ?? 10) * (dot.turns ?? 3) / 4));
      applyDotStacks(target, 'poison', stacks);   // F4: 层数累加 + duration:999
      api.floatNum(target, `☠×${stacks}`, '#9b59b6', 'debuff-label');
    }
    // healReduce (JS:125-128)
    if (skill.healReduce && target.alive) {
      const hr = target.buffs.find(b => b.type === 'healReduce');
      const hrTurns = ((dot?.turns) ?? 3) + 1;
      if (hr) {
        hr.value = Math.max(hr.value, 50);
        hr.duration = Math.max(hr.duration ?? 0, hrTurns);
      } else {
        target.buffs.push({ type: 'healReduce', value: 50, duration: hrTurns });
      }
    }
    return { touched: [target] };
  },

  // ── dice 骰子 ──
  // v0.9.5.B4: diceAllIn 真 port — JS dice.js:32-71 (~50 行 vs 之前 8 行)
  // 孤注一掷: 全体敌方 atkScale × ATK, dmgType (phys/magic/true), lifestealPct% 生命偷取
  diceAllIn: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    if (enemies.length === 0) return { touched: [] };
    const atkScale = (skill.atkScale as number) ?? 0.8;
    const dmgType = (skill.dmgType as 'physical' | 'magic' | 'true') ?? 'physical';
    const lifestealPct = (skill.lifestealPct as number) ?? 10;
    let totalDmg = 0;
    const baseRaw = Math.round(caster.atk * atkScale);
    for (const e of enemies) {
      if (!e.alive) continue;
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      const effDef = dmgType === 'true' ? 0 : (dmgType === 'magic' ? calcEffMr(caster, e) : calcEffArmor(caster, e));
      const dmg = Math.max(1, Math.round(baseRaw * critMult * calcDmgMult(effDef)));
      const wasA = e.alive;
      const r = applyRawDamage(e, dmg, dmgType);
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      totalDmg += shown;
      battleStats.recordDamage(caster, e, shown, dmgType === 'magic' ? 'mag' : dmgType === 'true' ? 'tru' : 'phy');
      if (wasA && !e.alive) battleStats.recordKill(caster, e);
      const color = dmgType === 'magic' ? '#4cc9f0' : dmgType === 'true' ? '#ffffff' : '#ff4444';
      api.floatNum(e, `${shown}`, color, isCrit ? (dmgType === 'magic' ? 'crit-magic' : dmgType === 'true' ? 'crit-true' : 'crit-dmg') : (dmgType === 'magic' ? 'magic-dmg' : dmgType === 'true' ? 'true-dmg' : 'direct-dmg'));
      triggerOnHitEffects(caster, e, dmg, { floatNum: api.floatNum });
      applyPostHitLayers(caster, e, shown, isCrit, dmgType === 'magic' ? 'magic' : 'physical');
    }
    // 生命偷取
    if (lifestealPct > 0 && caster.alive && totalDmg > 0) {
      const heal = Math.round(totalDmg * lifestealPct / 100);
      const before = caster.hp;
      caster.hp = Math.min(caster.maxHp, caster.hp + heal);
      const actual = caster.hp - before;
      if (actual > 0) api.floatNum(caster, `+${actual}`, '#06d6a0', 'heal-num');
    }
    return { touched: enemies };
  },

  // v0.9.5.B4: diceFlashStrike 真 port — JS dice.js:74-118 (~50 行)
  // 闪现攻击: 掷 1d6 → 5+roll 段 (5..10), 每段衰减 perHitScale × (1 - 0.1×N), 随机敌
  diceFlashStrike: async (api, caster, _target, skill) => {
    const roll = 1 + Math.floor(Math.random() * 6);
    const baseHits = (skill.baseHits as number) ?? 4;
    const totalSegs = baseHits + roll;
    const perHitScale = (skill.perHitScale as number) ?? 0.9;
    api.floatNum(caster, `🎲${roll}点`, '#ffd93d');
    let totalDmg = 0;
    for (let i = 0; i < totalSegs; i++) {
      const enemies = getEnemies(api, caster).filter(e => e.alive
        && !((e as Fighter & { _isInBlackhole?: boolean })._isInBlackhole));
      if (!enemies.length) break;
      const target = enemies[Math.floor(Math.random() * enemies.length)];
      const segScale = Math.max(0, perHitScale * (1 - 0.1 * i));
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      const eDef = calcEffArmor(caster, target);
      const dmg = Math.max(1, Math.round(caster.atk * segScale * critMult * calcDmgMult(eDef)));
      const wasA = target.alive;
      const r = applyRawDamage(target, dmg, 'physical');
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      totalDmg += shown;
      battleStats.recordDamage(caster, target, shown, 'phy');
      if (wasA && !target.alive) battleStats.recordKill(caster, target);
      api.floatNum(target, `${shown}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
      triggerOnHitEffects(caster, target, dmg, { floatNum: api.floatNum });
      applyPostHitLayers(caster, target, shown, isCrit, 'physical');
      await sleep(120);
    }
    void totalDmg;
    return { touched: getEnemies(api, caster) };
  },

  // diceGamblerConvert: 真正的赌徒 passiveSkill — 登场 DEF+MR→armorPen, 已在 BattleScene init(1020) 处理。
  //   handler no-op (旧自创 push gamblerPierceConvert 20% phys→true 无 JS 对应, 删)
  diceGamblerConvert: async (_api, caster, _target, _skill) => ({ touched: [caster] }),

  // ── rainbow ──
  // v0.9.5.B7: rainbowGuard 真 port — JS rainbow.js:56-74
  // 单友护盾 shieldAtkScale × ATK + atkUpPct atkUpTurns
  rainbowGuard: async (api, caster, target, skill) => {
    const tgt = (target && target.side === caster.side && target.alive) ? target : caster;
    const shieldAtkScale = (skill.shieldAtkScale as number) ?? 1.0;
    const atkUpPct = (skill.atkUpPct as number) ?? 0;
    const atkUpTurns = (skill.atkUpTurns as number) ?? 3;
    // JS rainbow.js:59 — round(round(atk×scale) × getShieldMult())
    const shieldAmt = Math.round(Math.round(caster.atk * shieldAtkScale) * ruleModifiers.shieldMult());
    tgt.shield = (tgt.shield ?? 0) + shieldAmt;
    api.floatNum(tgt, `+${shieldAmt}🌈`, '#c0c0c0');
    if (atkUpPct > 0) {
      const atkGain = Math.round(tgt.baseAtk * atkUpPct / 100);
      tgt.buffs.push({ type: 'atkUp', value: atkGain, duration: atkUpTurns + 1 });
      tgt.atk = (tgt.atk ?? 0) + atkGain;
      api.floatNum(tgt, `+${atkGain}⚔ ${atkUpTurns}t`, '#ff8c42');
    }
    return { touched: [tgt] };
  },

  // 反射 (原 彩虹守护 改版, 用户 spec): 彩虹光在敌/友间来回反射, 每次 ×decay 衰减 (最低 floor)。
  //   自身先回血 → 命中未中过的敌人(魔法) → 反射治疗未治过的友军 → 再命中下个敌人 …
  //   直到某次反射没有可选目标 (无未中敌 / 无未治友) 为止。
  rainbowReflect: async (api, caster, _target, skill) => {
    const base = Math.round(caster.atk * ((skill.atkScale as number) ?? 0.5));
    const decay = (skill.reflectDecay as number) ?? 0.85;
    const floor = (skill.reflectFloor as number) ?? 0.4;
    let factor = 1.0;
    const val = () => Math.max(1, Math.round(base * Math.max(floor, factor)));
    const touched: Fighter[] = [];
    const hitEnemies = new Set<Fighter>();
    const healedAllies = new Set<Fighter>();
    // 1) 自身回复 (factor=1.0, 不衰减)
    if (caster.alive) {
      applyHeal(caster, val(), caster);
      api.floatNum(caster, `+${val()}`, '#06d6a0', 'heal-num');
      healedAllies.add(caster); touched.push(caster);
    }
    // 彗星式特效: 一道彩虹光从上一落点飞向当前目标, 到达才结算该处效果 (audit 跳过视觉)
    const posOf = (fr: Fighter) => { const v = api.viewOf(fr); return v ? { x: v.sprite.x, y: v.sprite.y } : null; };
    let prev = posOf(caster);
    const snake = !_auditMode ? makeRainbowSnake(api.scene) : null;   // 贪吃蛇式: 光头飞行+身后留彩虹折线
    let next: 'enemy' | 'ally' = 'enemy';
    let guard = 0;
    while (guard++ < 40) {
      factor *= decay;   // 每次反射前衰减一档 (val() 内部 floor 兜底)
      const cur = next === 'enemy'
        ? getEnemies(api, caster).find(x => x.alive && !hitEnemies.has(x))
        : getAllies(api, caster).find(x => x.alive && !healedAllies.has(x));
      if (!cur) break;
      const tp = posOf(cur);
      if (snake && prev && tp) await snake.hop(prev.x, prev.y, tp.x, tp.y);
      else await sleep(260);
      if (tp) prev = tp;
      if (next === 'enemy') {
        const e = cur;
        const isCrit = rollCrit(effectiveCrit(caster));
        const critMult = isCrit ? calcCritMult(caster) : 1;
        const dmg = Math.max(1, Math.round(val() * critMult * calcDmgMult(calcEffMr(caster, e))));
        const wasAlive = e.alive;
        const r = applyRawDamage(e, dmg, 'magic');
        const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        battleStats.recordDamage(caster, e, shown, 'mag');
        if (wasAlive && !e.alive) battleStats.recordKill(caster, e);
        api.floatNum(e, `${shown}`, '#4dabf7', isCrit ? 'crit-magic' : 'magic-dmg');
        triggerOnHitEffects(caster, e, dmg, { floatNum: api.floatNum });
        hitEnemies.add(e); touched.push(e);
        next = 'ally';
      } else {
        const a = cur;
        applyHeal(a, val(), caster);
        api.floatNum(a, `+${val()}`, '#06d6a0', 'heal-num');
        healedAllies.add(a); if (!touched.includes(a)) touched.push(a);
        next = 'enemy';
      }
    }
    snake?.finish();   // 收尾: 整条彩虹蛇淡出
    return { touched };
  },

  // ── line 线条龟 ──
  // v0.9.5.B8: lineSketch 真 port — JS line.js:30-58
  // 素描: hits 段物理, 每段加 1 _inkStack (max 5; attacker._inkCapOverride / _inkTrueDmg passive 影响)
  lineSketch: async (api, caster, target, skill) => {
    if (!target || !target.alive) return { touched: [] };
    const hits = (skill.hits as number) ?? 3;
    const atkScale = (skill.atkScale as number) ?? 0.4;
    let totalDmg = 0;
    for (let i = 0; i < hits; i++) {
      if (!target.alive) break;
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      const eDef = calcEffArmor(caster, target);
      const dmg = Math.max(1, Math.round(caster.atk * atkScale * critMult * calcDmgMult(eDef)));
      const wasA = target.alive;
      const r = applyRawDamage(target, dmg, 'physical');
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      totalDmg += shown;
      battleStats.recordDamage(caster, target, shown, 'phy');
      if (wasA && !target.alive) battleStats.recordKill(caster, target);
      addInkStack(target, 1, caster);   // 含 _inkLink 伙伴同步
      api.floatNum(target, `${shown}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
      triggerOnHitEffects(caster, target, dmg, { floatNum: api.floatNum });
      applyPostHitLayers(caster, target, shown, isCrit, 'physical');
      await sleep(200);
    }
    void totalDmg;
    return { touched: [target] };
  },

  // v0.9.5.B8: lineInkBomb 真 port — JS line.js:166-192
  // 墨水炸弹: hits 段 atkScale × ATK 物理 全敌, 然后每敌加 skill.inkStacks (默认 2) 层 _inkStacks
  lineInkBomb: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    if (!enemies.length) return { touched: [] };
    const hits = (skill.hits as number) ?? 3;
    const atkScale = (skill.atkScale as number) ?? 0.3;
    const baseDmg = Math.round(caster.atk * atkScale);
    for (const e of enemies) {
      if (!e.alive) continue;
      const eDef = calcEffArmor(caster, e);
      const perDmg = Math.max(1, Math.round(baseDmg * calcDmgMult(eDef)));
      for (let h = 0; h < hits; h++) {
        if (!e.alive) break;
        const wasA = e.alive;
        const r = applyRawDamage(e, perDmg, 'physical');
        const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        battleStats.recordDamage(caster, e, shown, 'phy');
        if (wasA && !e.alive) battleStats.recordKill(caster, e);
        api.floatNum(e, `${shown}`, '#ff4444', 'direct-dmg');
        addInkStack(e, 1, caster);   // 用户: 每段命中各加1层墨迹(非末尾一次性), 共 hits 层; 含 _inkLink 伙伴同步
      }
      triggerOnHitEffects(caster, e, perDmg * hits, { floatNum: api.floatNum });
      // 用户: 去掉 "+N🖌" 浮字 (墨迹层数走目标状态栏徽章)
    }
    return { touched: enemies };
  },
  // v0.9.5.B7: lineLink 真 port — JS line.js:60-107
  // 连笔: 主目标 + 第 2 目标 各 atkScale × ATK 物理 + 加 inkStack + 建立 _inkLink (transferPct% 传递伤害)
  // P25 lineLink JS line.js:60-107 1:1 (含 _inkCapOverride / _inkRapidActive / addInkStack partner-sync / sleep / log)
  lineLink: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const enemies = getEnemies(api, caster);
    const atkScale = (skill.atkScale as number) ?? 0.8;
    const duration = (skill.duration as number) ?? 3;
    const transferPct = (skill.transferPct as number) ?? 30;
    const baseDmg = Math.round(caster.atk * atkScale);
    // P25 addInkStack helper (JS line.js:1-28 1:1) — cap override + rapid sync + partner sync
    const addInkStack = (t: Fighter, count: number) => {
      const cap = ((caster as Fighter & { _inkCapOverride?: number })._inkCapOverride) ?? 5;
      const tt = t as Fighter & { _inkStacks?: number; _inkRapidActive?: boolean; _inkLink?: { partner: Fighter } };
      tt._inkStacks = Math.min(cap, (tt._inkStacks ?? 0) + count);
      tt._inkRapidActive = !!(caster as Fighter & { _inkTrueDmg?: boolean })._inkTrueDmg;
      // partner-sync: 已建立 link 则 partner 同步加 stacks (JS line.js:16-25)
      if (tt._inkLink && tt._inkLink.partner && tt._inkLink.partner.alive) {
        const partner = tt._inkLink.partner as Fighter & { _inkStacks?: number };
        partner._inkStacks = Math.min(cap, (partner._inkStacks ?? 0) + count);
      }
    };

    // 主目标 (物理走 DEF)
    const isCrit1 = rollCrit(effectiveCrit(caster));
    const critMult1 = isCrit1 ? calcCritMult(caster) : 1;
    const eDef1 = calcEffArmor(caster, target);
    const dmg1 = Math.max(1, Math.round(baseDmg * critMult1 * calcDmgMult(eDef1)));
    const wasA1 = target.alive;
    const r1 = applyRawDamage(target, dmg1, 'physical');
    const shown1 = (r1.hpLoss ?? 0) + (r1.shieldAbs ?? 0);
    battleStats.recordDamage(caster, target, shown1, 'phy');
    if (wasA1 && !target.alive) battleStats.recordKill(caster, target);
    // P25: 显式 yOffset 0 (JS line.js:79 spawnFloatingNum yOffset=0)
    api.floatNum(target, `${shown1}`, '#ff4444', isCrit1 ? 'crit-dmg' : 'direct-dmg', 0, 0);
    addInkStack(target, 1);
    triggerOnHitEffects(caster, target, dmg1, { floatNum: api.floatNum });

    const second = enemies.find(e => e.alive && e !== target);
    if (second) {
      const isCrit2 = rollCrit(effectiveCrit(caster));
      const critMult2 = isCrit2 ? calcCritMult(caster) : 1;
      const eDef2 = calcEffArmor(caster, second);
      const dmg2 = Math.max(1, Math.round(baseDmg * critMult2 * calcDmgMult(eDef2)));
      const wasA2 = second.alive;
      const r2 = applyRawDamage(second, dmg2, 'physical');
      const shown2 = (r2.hpLoss ?? 0) + (r2.shieldAbs ?? 0);
      battleStats.recordDamage(caster, second, shown2, 'phy');
      if (wasA2 && !second.alive) battleStats.recordKill(caster, second);
      api.floatNum(second, `${shown2}`, '#ff4444', isCrit2 ? 'crit-dmg' : 'direct-dmg', 0, 0);
      addInkStack(second, 1);
      triggerOnHitEffects(caster, second, dmg2, { floatNum: api.floatNum });

      const linkType: 'magic' | 'true' = (caster as Fighter & { _inkTrueDmg?: boolean })._inkTrueDmg ? 'true' : 'magic';
      (target as Fighter & { _inkLink?: { partner: Fighter; turns: number; transferPct: number; dmgType: 'magic' | 'true'; owner: Fighter } })._inkLink = {
        partner: second, turns: duration, transferPct, dmgType: linkType, owner: caster,
      };
      (second as Fighter & { _inkLink?: { partner: Fighter; turns: number; transferPct: number; dmgType: 'magic' | 'true'; owner: Fighter } })._inkLink = {
        partner: target, turns: duration, transferPct, dmgType: linkType, owner: caster,
      };
      // 用户: 画一道墨线把两个被连敌人连起来 (小特效)
      fireLineConnectVfx(target, second);
      // P25: '🔗连笔' label yOffset=-20 (JS line.js:97-98 sprite 下方)
      api.floatNum(target, '🔗连笔', '#ffd700', 'crit-label', 0, -20);
      api.floatNum(second, '🔗连笔', '#ffd700', 'crit-label', 0, -20);
      // P25 战报 (JS line.js:101)
      const typeLabel = linkType === 'true' ? '真实' : '魔法';
      api.scene.events.emit('battle-log', `🔗 ${caster.name} <b>连笔</b> → ${target.name} ⇆ ${second.name} ${duration}回合 (传递${transferPct}% ${typeLabel})`);
      // P25 末尾节奏 (JS line.js:106 await sleep(800))
      await sleep(800);
      return { touched: [target, second] };
    }
    // P25 无第二目标也加 log + sleep (JS line.js:103-106)
    api.scene.events.emit('battle-log', `🖋 ${caster.name} <b>连笔</b> → ${target.name}: ${shown1} 物理 + 墨迹 (无第二目标)`);
    await sleep(800);
    return { touched: [target] };
  },

  // ── pirate ──
  // P29 JS skills/pirate.js:1-51 doPirateCannonBarrage 1:1 (含 Phase 1 visual)
  //   Phase 1: 全敌 hit-shake + "炮击!" floatNum (debuff-label, yOff -10) + addLog + sleep 600
  //   Phase 2: hits × N (默认 6, pets.js:450) ticks × 全敌
  //     per tick per enemy: basePower = power + atkScale×ATK + hpPct%×e.maxHp
  //     crit per enemy, applyRawDmg physical, triggerOnHitEffects, sleep 300 段间
  //   Phase 3: applySkillDebuffs to alive
  pirateCannonBarrage: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    if (enemies.length === 0) return { touched: [] };
    const hits = (skill.hits as number) ?? 6;   // P29 fix: JS pets.js:450 hits=6 (NOT 10)
    const atkScale = (skill.atkScale as number) ?? 0;
    const power = (skill.power as number) ?? 0;
    const hpPct = (skill.hpPct as number) ?? 0;
    const dmgType = (skill.dmgType as 'physical' | 'magic' | 'true') ?? 'physical';
    // P29 Phase 1: 全敌 cannon-burst warning (JS pirate.js:6-18)
    for (const e of enemies) {
      if (!e.alive) continue;
      api.floatNum(e, '炮击!', '#c77dff', 'debuff-label');
    }
    api.log?.(`${caster.emoji}${caster.name} 火炮齐射 全体敌方！`);
    await sleep(600);
    const touched: Fighter[] = [];
    for (let i = 0; i < hits; i++) {
      for (const e of enemies) {
        if (!e.alive) continue;
        let basePower = power;
        if (atkScale) basePower += Math.round(caster.atk * atkScale);
        if (hpPct) basePower += Math.round(e.maxHp * hpPct / 100);
        if (basePower <= 0) continue;
        const isCrit = rollCrit(effectiveCrit(caster));
        const critMult = isCrit ? calcCritMult(caster) : 1;
        const effDef = dmgType === 'true' ? 0
          : dmgType === 'magic' ? calcEffMr(caster, e)
          : calcEffArmor(caster, e);
        const dmg = Math.max(1, Math.round(basePower * critMult * calcDmgMult(effDef)));
        const wasA = e.alive;
        const r = applyRawDamage(e, dmg, dmgType);
        const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        battleStats.recordDamage(caster, e, shown, dmgType === 'magic' ? 'mag' : dmgType === 'true' ? 'tru' : 'phy');
        if (wasA && !e.alive) battleStats.recordKill(caster, e);
        const color = dmgType === 'magic' ? '#4cc9f0' : dmgType === 'true' ? '#ffffff' : '#ff4444';
        api.floatNum(e, `${shown}`, color, isCrit ? (dmgType === 'magic' ? 'crit-magic' : dmgType === 'true' ? 'crit-true' : 'crit-dmg') : (dmgType === 'magic' ? 'magic-dmg' : dmgType === 'true' ? 'true-dmg' : 'direct-dmg'));
        triggerOnHitEffects(caster, e, dmg, { floatNum: api.floatNum });
        if (!touched.includes(e)) touched.push(e);
      }
      if (i < hits - 1) await sleep(300);  // JS:43 sleep(300) 段间
    }
    return { touched };
  },

  // JS headless.js:63-76 doHeadlessSoulStrike 1:1 — 单体 magic, base = atk×atkScale + target.hp×targetCurrentHpPct/100
  // 旧 Phaser: dealPhysical + fear buff (无 fear in JS!), 缺 target.hp scaling — 完全错!
  headlessSoulStrike: async (api, caster, target, skill) => {
    if (!target || !target.alive) return { touched: [] };
    const atkScale = (skill.atkScale as number) ?? 1.5;
    const hpPct = (skill.targetCurrentHpPct as number) ?? 25;
    // 描述为"魔法伤害" → 走魔抗减免 + 暴击 (与 dealMagic / 全部手算魔法技能一致; 原直接 raw 跳魔抗+不暴击是离群bug)
    const isCrit = rollCrit(effectiveCrit(caster));
    const critMult = isCrit ? calcCritMult(caster) : 1;
    const baseRaw = caster.atk * atkScale + target.hp * hpPct / 100;
    const totalDmg = Math.max(1, Math.round(baseRaw * critMult * calcDmgMult(calcEffMr(caster, target)) * ruleModifiers.magicMult()));
    const wasA = target.alive;
    const r = applyRawDamage(target, totalDmg, 'magic');
    const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
    battleStats.recordDamage(caster, target, shown, 'mag');
    if (wasA && !target.alive) battleStats.recordKill(caster, target);
    api.floatNum(target, `${shown}`, '#4dabf7', isCrit ? 'crit-magic' : 'magic-dmg');   // 魔法伤害: 暴击走蓝色 crit-magic (原 crit-dmg 红物理色错)
    triggerOnHitEffects(caster, target, totalDmg, { floatNum: api.floatNum, isCrit, critMult });
    return { touched: [target] };
  },
  // JS headless.js:1-37 doSoulReap 1:1 — AoE physical, base = atk×atkScale + lostHp×lostHpPct/100
  //   + dynamic lifesteal (totalDmg × lifestealPct%)
  // 旧 Phaser: magic + 简化 hardcoded 15% kill bonus — 完全错!
  soulReap: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    const atkScale = (skill.atkScale as number) ?? 1.5;
    const lostHpPct = (skill.lostHpPct as number) ?? 30;
    // P87 1:1 JS headless.js:28 — `if (skill.lifestealPct && ...)` 无 lifestealPct 字段则跳过.
    //   PoC 之前 default 30% → 每次 soulReap 偷血 30% 是自创. JS pets.js:788 没此字段.
    const lifestealPct = (skill.lifestealPct as number) ?? 0;
    // #8 M10: 描述 "+10%【目标】已损生命值", 旧版按【施法者】已损血统一加到全体 → 语义反了。
    //   改为每个敌人按它自己的已损血计算。
    const atkBase = Math.round(caster.atk * atkScale);
    let totalDmg = 0;
    for (const e of enemies) {
      if (!e.alive) continue;
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      const effDef = calcEffArmor(caster, e);
      const eLostHp = e.maxHp - e.hp;
      const baseDmg = atkBase + Math.round(eLostHp * lostHpPct / 100);
      const dmg = Math.max(1, Math.round(baseDmg * critMult * calcDmgMult(effDef)));
      const wasA = e.alive;
      const r = applyRawDamage(e, dmg, 'physical');
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      totalDmg += shown;
      battleStats.recordDamage(caster, e, shown, 'phy');
      if (wasA && !e.alive) battleStats.recordKill(caster, e);
      api.floatNum(e, `${shown}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
      triggerOnHitEffects(caster, e, dmg, { floatNum: api.floatNum });
      applyPostHitLayers(caster, e, shown, isCrit, 'physical');
    }
    // Dynamic lifesteal — P97 1:1 JS headless.js:30-33: `+${actual}` cls='passive-num' delay=200 yOff=0
    //   PoC 之前 `+${actual}🩸` 是自创 (用户报"+心号吸" 是 🩸 渲染问题)
    if (lifestealPct > 0 && caster.alive && totalDmg > 0) {
      const heal = Math.round(totalDmg * lifestealPct / 100);
      const actual = applyHeal(caster, heal);
      if (actual > 0) api.floatNum(caster, `+${actual}`, '#ffd86b', 'passive-num', 200, 0);
    }
    return { touched: enemies };
  },


  // v0.9.5.B6: bubbleHeal 真 port — JS bubble.js:30-51
  // 泡泡治愈: 单友 healAtkPct + healHpPct + 其他友军 splashPct
  bubbleHeal: async (api, caster, target, skill) => {
    if (!target || !target.alive) return { touched: [] };
    const tgt = (target.side === caster.side) ? target : caster;
    const healAtkPct = (skill.healAtkPct as number) ?? 0;
    const healHpPct = (skill.healHpPct as number) ?? 0;
    const splashPct = (skill.splashPct as number) ?? 0;
    const healAmt = Math.round(caster.atk * healAtkPct / 100) + Math.round(caster.maxHp * healHpPct / 100);
    // JS bubble.js:34/42 走 applyHeal — 受 healReduce/装备/守护 加成 (旧 PoC raw 加血绕过)
    const actual = applyHeal(tgt, healAmt, caster);
    if (actual > 0) api.floatNum(tgt, `+${actual}🫧`, '#06d6a0');
    const touched: Fighter[] = [tgt];
    // splash 治疗
    if (splashPct > 0 && healAmt > 0) {
      const splashAmt = Math.round(healAmt * splashPct / 100);
      const allies = getAllies(api, caster).filter(a => a !== tgt && a.alive);
      for (const ally of allies) {
        const aActual = applyHeal(ally, splashAmt, caster);
        if (aActual > 0) {
          api.floatNum(ally, `+${aActual}🫧`, '#06d6a0');
          touched.push(ally);
        }
      }
    }
    return { touched };
  },

  // v0.9.5.B6: bubbleShield 真 port — JS bubble.js:1-12
  // 泡泡盾: target.bubbleShieldVal = atk × atkScale, bubbleShieldTurns = duration
  // 泡泡盾跟普通 shield 不同: 它走 applyRawDamage 的 bubbleAbs 槽 (优先扣)
  bubbleShield: async (api, caster, target, skill) => {
    const tgt = (target && target.side === caster.side) ? target : caster;
    if (!tgt.alive) return { touched: [] };
    const atkScale = (skill.atkScale as number) ?? 1.0;
    const duration = (skill.duration as number) ?? 3;
    const amount = Math.round(caster.atk * atkScale);
    const tt = tgt as Fighter & { bubbleShieldVal?: number; bubbleShieldTurns?: number; bubbleShieldOwner?: Fighter; bubbleShieldBurstScale?: number };
    tt.bubbleShieldVal = amount;
    tt.bubbleShieldTurns = duration;
    tt.bubbleShieldOwner = caster;
    // #8 H3: 存自然到期爆裂倍率 (burstScale, 默认 2.0×ATK 魔法), 供 processRoundEndBuffs 读
    tt.bubbleShieldBurstScale = (skill.burstScale as number) ?? 2;
    tgt.buffs.push({ type: 'bubbleShield', value: amount, duration: duration + 1 });
    // 显式 'bubble-num' (JS bubble.js:7 同款): 不传 cls 时 #4cc9f0 会被推断成 magic-dmg(命中类)
    //   → 触发施法目标(自施法时即施法者自己)红闪+受击帧 ("放泡泡盾自己闪红"的根因)。bubble-num 非命中类。
    api.floatNum(tgt, `+${amount}🫧 ${duration}t`, '#4cc9f0', 'bubble-num');
    return { touched: [tgt] };
  },

  // v0.9.5.B5: hidingBuffSummon 真 port — JS hiding.js:232-258
  // 强化喊龟: 给随从 (_summon) +10% atk/def/mr +10% lifesteal +20% crit 2 回合
  hidingBuffSummon: async (api, caster, _target, _skill) => {
    const cf = caster as Fighter & { _summon?: Fighter };
    const summon = cf._summon;
    if (summon && summon.alive) {
      const atkGain = Math.round(summon.baseAtk * 0.10);
      const defGain = Math.round((summon.baseDef ?? 0) * 0.10);
      const mrGain = Math.round((summon.baseMr ?? summon.baseDef ?? 0) * 0.10);
      summon.buffs.push({ type: 'atkUp', value: atkGain, duration: 2 });
      summon.buffs.push({ type: 'defUp', value: defGain, duration: 2 });
      summon.buffs.push({ type: 'mrUp', value: mrGain, duration: 2 });
      summon.buffs.push({ type: 'lifesteal', value: 10, duration: 2 });
      // #8 低#7: 旧版既永久 summon.crit+=0.20 又上 critUp buff → 永久部分不回退(+潜在 recalc 复利)。
      //   描述是"+20%暴击 2回合"=临时, 故只留 critUp buff; 锚定 _baseCrit 让 recalc 稳定加 20% 不复利。
      const sb = summon as Fighter & { _baseCrit?: number };
      if (sb._baseCrit === undefined) sb._baseCrit = summon.crit ?? 0.25;
      summon.buffs.push({ type: 'critUp', value: 20, duration: 2 });
      api.floatNum(summon, '强化!', '#ffd93d');
    } else {
      api.floatNum(caster, '随从已亡', '#888');
    }
    return { touched: cf._summon ? [caster, cf._summon] : [caster] };
  },

  // v0.9.5.B5: hidingCommand 真 port — JS hiding.js:15-27
  // 指挥: 让 _summon 多打一次 (用 summonAutoAction; Phaser 简化为 emit 事件给 BattleScene)
  hidingCommand: async (api, caster, _target, _skill) => {
    const cf = caster as Fighter & { _summon?: Fighter };
    const summon = cf._summon;
    if (!summon || !summon.alive) {
      api.floatNum(caster, '随从已亡', '#888');
      return { touched: [caster] };
    }
    api.floatNum(caster, '指挥!', '#ffd93d');
    api.log?.(`${caster.emoji}${caster.name} <b>指挥</b>：命令 ${summon.emoji ?? ''}${summon.name} 额外出击！`);
    // 随从立即额外行动一次 (JS hiding.js:26 await summonAutoAction)。回合末它仍会按常规再行动一次。
    if (_hidingCommandHook) await _hidingCommandHook(summon);
    else api.scene.events.emit('hiding-command', { owner: caster, summon });  // 兜底 (理论不会走)
    return { touched: [caster, summon] };
  },

  // ── angel ──
  // 圣光 = passiveSkill (永不主动施放); 自身首次死亡 25% 重生由 BattleScene._angelRevive flag 处理 (按描述)。
  //   原"复活友军30%"主动 handler 是死代码且行为与描述不符, 已删 → no-op stub。
  angelRevive: async (_a, c) => ({ touched: [c] }),

  // v0.9.5.B7: angelEquality 真 port — JS angel.js:20-110 (~90 行)
  // 平等: 2 段物理 + A 级以上 → 追加 1 段 真伤 (extraTrueAtkScale + extraTrueLostHpPct% 已损 HP) + lifestealPct% 总伤生命偷取 + judgement 整合
  angelEquality: async (api, caster, target, skill) => {
    if (!target || !target.alive) return { touched: [] };
    const normalScale = (skill.normalScale as number) ?? 1.0;
    const extraTrueAtkScale = (skill.extraTrueAtkScale as number) ?? 0.5;
    const extraTrueLostHpPct = (skill.extraTrueLostHpPct as number) ?? 10;
    const lifestealPct = (skill.lifestealPct as number) ?? 10;
    const antiHighRarity = (skill.antiHighRarity as string[]) ?? ['A', 'S', 'SS', 'SSS'];
    const isHighRarity = antiHighRarity.includes(target.rarity);
    // 本次施法 lifestealPct% 吸血 — 每段命中即时结算 (含该段审判), 逐段绿色 +N (打的时候就吸)。
    let totalDmg = 0;
    const doLifesteal = (segDmg: number, delay: number) => {
      if (!caster.alive || segDmg <= 0 || lifestealPct <= 0) return;
      const before = caster.hp;
      caster.hp = Math.min(caster.maxHp, caster.hp + Math.round(segDmg * lifestealPct / 100));
      const actual = caster.hp - before;
      if (actual > 0) api.floatNum(caster, `+${actual}`, '#06d6a0', 'heal-num', delay, 0);
    };
    // 第 1/2 段 物理
    for (let h = 0; h < 2; h++) {
      if (!target.alive) break;
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      const eDef = calcEffArmor(caster, target);
      const dmg = Math.max(1, Math.round(caster.atk * normalScale * critMult * calcDmgMult(eDef)));
      const wasA = target.alive;
      const r = applyRawDamage(target, dmg, 'physical');
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      totalDmg += shown;
      battleStats.recordDamage(caster, target, shown, 'phy');
      if (wasA && !target.alive) battleStats.recordKill(caster, target);
      // P82 1:1 JS angel.js:58 — floatNum delay h*60, 0
      api.floatNum(target, `${shown}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg', h * 60, 0);
      const hpB = target.hp;
      triggerOnHitEffects(caster, target, dmg, { floatNum: api.floatNum });
      const jDelta = Math.max(0, hpB - target.hp);   // 该段审判等 on-hit 额外伤害
      totalDmg += jDelta;
      doLifesteal(shown + jDelta, h * 60 + 120);   // 本段(直接+审判)即时吸血
      applyPostHitLayers(caster, target, shown, isCrit, 'physical');
      await sleep(280);  // P82 1:1 JS angel.js:68 sleep(280) — PoC 之前 180 太快
    }
    // 第 3 段 (A 级以上): 真伤 + 已损 HP%
    if (target.alive && isHighRarity) {
      const lostHp = Math.max(0, target.maxHp - target.hp);
      const isCrit = rollCrit(effectiveCrit(caster));
      const critMult = isCrit ? calcCritMult(caster) : 1;
      const baseTrue = Math.round(caster.atk * extraTrueAtkScale);
      const lostBonus = Math.round(lostHp * extraTrueLostHpPct / 100);
      const dmg3 = Math.max(1, Math.round((baseTrue + lostBonus) * critMult));
      const wasA = target.alive;
      const r3 = applyRawDamage(target, dmg3, 'true');
      const shown3 = (r3.hpLoss ?? 0) + (r3.shieldAbs ?? 0);
      totalDmg += shown3;
      battleStats.recordDamage(caster, target, shown3, 'tru');
      if (wasA && !target.alive) battleStats.recordKill(caster, target);
      // 真实伤害走真实行 (row 2), 不再用显式 yOffset 22 — 否则与同帧审判(魔法 row1=22)重叠
      api.floatNum(target, `${shown3}`, '#ffffff', isCrit ? 'crit-true' : 'true-dmg', 100);
      const hpB3 = target.hp;
      triggerOnHitEffects(caster, target, dmg3, { floatNum: api.floatNum });
      const jDelta3 = Math.max(0, hpB3 - target.hp);
      totalDmg += jDelta3;
      doLifesteal(shown3 + jDelta3, 160);   // 第3段即时吸血
      await sleep(280);  // P82 1:1 JS angel.js:87 sleep(280) — 之前缺
    }
    // (吸血已逐段即时结算, 见 doLifesteal — 打的时候每段就吸, 绿色 +N)
    // JS:108 addLog 平等 → 总伤 (含 判 if any)
    api.log?.(`${caster.emoji}${caster.name} <b>平等</b> → ${target.emoji}${target.name}：2段物理${isHighRarity ? ' + 追加真实(A 级以上)' : ''} (共 ${totalDmg})`);
    return { touched: [target, caster] };
  },

  // v0.9.5.B3: fortune 系列真 port — JS fortune.js:11-140
  // fortuneGainCoins: 仅 +N 金币 (skill.coinGain)
  fortuneGainCoins: async (api, caster, _target, skill) => {
    const gain = (skill.coinGain as number) ?? 10;
    const cf = caster as Fighter & { _goldCoins?: number };
    cf._goldCoins = (cf._goldCoins ?? 0) + gain;
    api.floatNum(caster, `+${gain}💰`, '#ffd93d');
    sfxCoin();  // E3/22: JS fortune.js:89/125/138 sfxCoin()
    return { touched: [caster] };
  },

  // fortuneBuyEquip: 消耗 cost 金币 → 抽 1 件装备进 bench (BattleScene 端 simulate)
  fortuneBuyEquip: async (api, caster, _target, skill) => {
    const baseCost = (skill.coinCost as number) ?? 20;
    const cf = caster as Fighter & { _goldCoins?: number; _fortuneBuyCost?: number };
    const cost = cf._fortuneBuyCost ?? baseCost;   // 当前价 (每次购买后 +25%, 一场内累积)
    const coins = cf._goldCoins ?? 0;
    if (coins < cost) return { touched: [caster] };   // 已被 ActionPanel 门控, 静默兜底
    cf._goldCoins = coins - cost;
    cf._fortuneBuyCost = Math.round(cost * 1.25);   // 每次购买后价格 +25%
    // BattleScene 监听 'fortune-buy-equip' → 从 normal/unique 池抽 1 件进 bench (无飘字, 看装备席/日志)
    api.scene.events.emit('fortune-buy-equip', { side: caster.side });
    sfxCoin();  // E3/22: JS fortune.js coin spend
    return { touched: [caster] };
  },

  // fortuneAllIn: 消耗所有金币 → 对【目标】每枚 1 段 (perCoinAtkNormal×ATK 物理[过护甲] + perCoinAtkPierce×ATK 真伤)
  //   JS doFortuneAllIn 是单体; 用户(2026-05-29)确认梭哈对目标 (2026-05-27 M9 误改全体, 已回退)
  fortuneAllIn: async (api, caster, target, skill) => {
    const cf = caster as Fighter & { _goldCoins?: number };
    const coins = cf._goldCoins ?? 0;
    // 梭哈已被 ActionPanel/AI 在 0 金币时禁用 → 此处仅静默兜底, 不再飘"没金币!"
    if (coins <= 0) return { touched: target ? [target] : [] };
    cf._goldCoins = 0;
    api.floatNum(caster, `${coins}枚梭哈`, '#ffd93d');   // 开始就显示投入枚数 (不放结束)
    const perCoinAtkNormal = (skill.perCoinAtkNormal as number) ?? 0.15;
    const perCoinAtkPierce = (skill.perCoinAtkPierce as number) ?? 0.05;
    const normalPer = Math.round(caster.atk * perCoinAtkNormal);
    const piercePer = Math.round(caster.atk * perCoinAtkPierce);
    const perDelay = Math.max(80, Math.round(400 / Math.sqrt(coins)));
    let totalN = 0, totalP = 0;
    // 单体: 消耗全部金币, 对【目标】逐枚结算 (JS doFortuneAllIn 1:1; 2026-05-27 M9 误改成全体, 现回退)
    for (let i = 0; i < coins; i++) {
      if (!target || !target.alive) break;
      const eDef = calcEffArmor(caster, target);
      const nDmg = Math.max(1, Math.round(normalPer * calcDmgMult(eDef)));
      const wasA = target.alive;
      const rn = applyRawDamage(target, nDmg, 'physical');
      const nShown = (rn.hpLoss ?? 0) + (rn.shieldAbs ?? 0);
      totalN += nShown;
      let pShown = 0;
      if (piercePer > 0 && target.alive) {
        const rp = applyRawDamage(target, piercePer, 'true');
        pShown = (rp.hpLoss ?? 0) + (rp.shieldAbs ?? 0);
        totalP += pShown;
      }
      // 统计分型: 物理段记 'phy' / 真实段记 'tru' (原合并记 'phy' → 真伤被错算成物理)
      if (nShown > 0) battleStats.recordDamage(caster, target, nShown, 'phy');
      if (pShown > 0) battleStats.recordDamage(caster, target, pShown, 'tru');
      if (wasA && !target.alive) battleStats.recordKill(caster, target);
      api.floatNum(target, `${nShown}`, '#ff4444', 'direct-dmg');
      if (pShown > 0) api.floatNum(target, `${pShown}`, '#ffffff', 'true-dmg');
      triggerOnHitEffects(caster, target, nDmg + piercePer, { floatNum: api.floatNum });
      await sleep(perDelay);
    }
    api.log?.(`${caster.emoji}${caster.name} <b>梭哈</b> ${coins} 金币 → ${target?.emoji ?? ''}${target?.name ?? ''}：${totalN}物理 + ${totalP}真实`);
    return { touched: target ? [target] : [] };
  },

  // v0.9.5.B2: chestCount 真 port — JS chest.js:100-123
  // 清点财宝: heal + shield, treasure bonus = 1 + floor(_chestTreasure / 100) × 0.14
  chestCount: async (api, caster, _target, skill) => {
    const healHpPct = (skill.healHpPct as number) ?? (skill.healPct as number) ?? 5;
    const shieldAtkScale = (skill.shieldAtkScale as number) ?? 0.4;
    const treasure = ((caster as Fighter & { _chestTreasure?: number })._chestTreasure ?? 0);
    const treasureBonus = 1 + Math.floor(treasure / 100) * 0.14;
    // Heal (check healReduce)
    const healAmt = Math.round(caster.maxHp * healHpPct / 100 * treasureBonus);
    const healRed = caster.buffs.find(b => b.type === 'healReduce');
    const healMult = healRed ? (1 - healRed.value / 100) : 1;
    const finalHeal = Math.round(healAmt * healMult);
    const before = caster.hp;
    caster.hp = Math.min(caster.maxHp, caster.hp + finalHeal);
    const actualHeal = caster.hp - before;
    if (actualHeal > 0) api.floatNum(caster, `+${actualHeal}`, '#06d6a0', 'heal-num');
    // Shield
    const shieldAmt = Math.round(caster.atk * shieldAtkScale * treasureBonus);
    caster.shield = (caster.shield ?? 0) + shieldAmt;
    api.floatNum(caster, `+${shieldAmt}`, '#c0c0c0', 'shield-num');
    return { touched: [caster] };
  },

  // v0.9.5.B2: chestGreed — 占据已有 stub 但用 skill.atkScale, 加 lifestealPct + treasureBonus
  // P53 chestGreed / chestIntuition 形态修正 — JS pets.js:720-725 是 passiveSkill, 不是 active!
  //   chestGreed: 每件装备 +4% ATK + 7% maxHp (BattleScene 装备时累加)
  //   chestIntuition: 财宝值阈值降低 (80/130/240/360/590 → 60/120/220/350/500)
  //   handlers stub no-op (passive 走 BattleScene init / chestTreasure 阈值检查)
  chestGreed: async (_api, caster, _target, _skill) => ({ touched: [caster] }),
  chestIntuition: async (_api, caster, _target, _skill) => ({ touched: [caster] }),

  // ── cyber 机械 ──
  // P16: cyberDeploy 真 port — JS cyber.js:336-354
  // 部署 deployCount 个浮游炮 (上限 maxDrones=10), 写入 _drones[] 数组 (JS 1:1)
  // P15 前版本写 _droneCount: number, 但 cyberSwarmShield/cyberBeam/passive 读 _drones[].length
  // → 部署后盾算 0 炮台. P16 统一字段名.
  // P33 cyberDeploy 1:1 JS skills/cyber.js:336-354
  cyberDeploy: async (api, caster, _target, skill) => {
    const p = caster.passive;
    if (!p || p.type !== 'cyberDrone') {
      await sleep(500);
      return { touched: [caster] };
    }
    const cf = caster as Fighter & { _drones?: Array<{ age: number }>; _cyberEnhanced?: boolean };
    if (!cf._drones) cf._drones = [];
    const maxD = cf._cyberEnhanced ? 20 : ((p.maxDrones as number) ?? 10);   // P33 enhanced cap 20
    if (cf._drones.length >= maxD) {
      api.log?.(`${caster.emoji}${caster.name} 浮游炮已满 (${maxD}个)!`);
      await sleep(500);
      return { touched: [caster] };
    }
    const wanted = (skill.deployCount as number) ?? 1;
    const slots = maxD - cf._drones.length;
    const actual = Math.min(wanted, slots);
    for (let i = 0; i < actual; i++) cf._drones.push({ age: 0 });
    api.floatNum(caster, `+${actual}🛰`, '#4cc9f0', 'passive-num');   // JS:350 passive-num cls
    api.log?.(`${caster.emoji}${caster.name} <b>部署</b> ${actual} 个浮游炮! (${cf._drones.length}/${maxD})${actual < wanted ? ' [上限]' : ''}`);
    await sleep(800);   // JS:353
    return { touched: [caster] };
  },

  // ── 通用 generic ──
  magic: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    // E3/11: 多段 + prismBonus 支持 (JS combat.js:74-320 magic path)
    const hits = (skill.hits as number) ?? 1;
    const atkScale = (skill.atkScale as number) ?? 1.0;
    let totalDirect = 0;
    for (let i = 0; i < hits; i++) {
      if (!target.alive) break;
      const base = caster.atk * atkScale;
      const dmg = dealMagic(caster, target, base);
      totalDirect += dmg;
      api.floatNum(target, `${dmg}`, '#4dabf7', 'magic-dmg');
      if (i < hits - 1) await sleep(500);  // JS combat.js:266 同款 500ms 间隔
    }
    // E3/11: prism color bonus (JS combat.js:288-320)
    // skill.prismBonus + caster._prismColor 0/1/2 → 红/蓝/绿 后处理
    if (skill.prismBonus && caster.alive) {
      const color = (caster as Fighter & { _prismColor?: number })._prismColor;
      if (color === 0 && target.alive) {
        // 红: totalDirect × 20% 真伤
        const bonus = Math.round(totalDirect * 0.2);
        if (bonus > 0) {
          const r = applyRawDamage(target, bonus, 'true');
          const shown = r.hpLoss + r.shieldAbs;
          battleStats.recordDamage(caster, target, shown, 'tru');
          api.floatNum(target, `${shown}`, '#ffffff', 'true-dmg');
        }
      } else if (color === 1) {
        // 蓝: 自身 +20% ATK 护盾
        const shieldAmt = Math.round(caster.atk * 0.2);
        caster.shield = (caster.shield ?? 0) + shieldAmt;
        battleStats.recordShield(caster, shieldAmt);
        api.floatNum(caster, `+${shieldAmt}🔵`, '#c0c0c0');
      } else if (color === 2) {
        // 绿: 自身回 5% maxHp
        const heal = Math.round(caster.maxHp * 0.05);
        const before = caster.hp;
        caster.hp = Math.min(caster.maxHp, caster.hp + heal);
        const actual = caster.hp - before;
        if (actual > 0) {
          battleStats.recordHeal(caster, caster, actual);
          api.floatNum(caster, `+${actual}🟢`, '#06d6a0');
        }
      }
    }
    return { touched: [target] };
  },
  // P16: heal + 装备 def/mr buff 包 (JS common.js doHeal — 石头龟 磐石 用此模式).
  // 之前只回血, 忽略 skill.defUpPct/mrUpPct buff fields (stone pets.js:91 用此).
  heal: async (api, caster, target, skill) => {
    const tgt = (target && target.side === caster.side) ? target : caster;
    // 即时治疗: 仅当无 HoT 且显式给了 atkScale 时即时回。
    //   #8 M2: 磐石 (heal类型, 无 hot/atkScale) 描述只含护甲/魔抗加固、不含治疗,
    //   旧版 atkScale 默认 1.0 → 静默回 1×ATK (未描述)。改为要求显式 atkScale 才回血。
    if (!skill.hot && skill.atkScale != null) {
      const amt = Math.round(caster.atk * (skill.atkScale as number));
      applyHeal(tgt, amt, caster);
      api.floatNum(tgt, `+${amt}`, '#06d6a0', 'heal-num');
    }
    // HoT 持续回血 buff (hot.pctMaxHp 按最大HP%; 兼容旧 hot.hpPerTurn 固定值)。
    //   tickHoTsOn 每回合按 buff.value 回血 (BattleScene:7176)。
    const hot = skill.hot as { pctMaxHp?: number; hpPerTurn?: number; turns?: number } | undefined;
    if (hot && (hot.turns ?? 0) > 0) {
      const perTurn = hot.pctMaxHp != null
        ? Math.round(tgt.maxHp * hot.pctMaxHp / 100)
        : Math.round(hot.hpPerTurn ?? 0);
      if (perTurn > 0) {
        tgt.buffs.push({ type: 'hot', value: perTurn, duration: (hot.turns ?? 0) + 1 });
        api.floatNum(tgt, `+${perTurn}/回合`, '#06d6a0', 'heal-num');
      }
    }
    // defUpAtkPct (对象形式): 护甲 += atk × pct%, 持续 turns (海盗朗姆酒 — 基于攻击力的护甲增益)
    const defAtkBuff = skill.defUpAtkPct as { pct?: number; turns?: number } | undefined;
    if (defAtkBuff && typeof defAtkBuff === 'object' && (defAtkBuff.pct ?? 0) > 0) {
      const gain = Math.round(caster.atk * (defAtkBuff.pct ?? 0) / 100);
      tgt.buffs.push({ type: 'defUp', value: gain, duration: (defAtkBuff.turns ?? 3) + 1 });
      api.floatNum(tgt, `+${gain}甲`, '#7dffb3');
    }
    // P16: defUpPct buff 包 (JS pets.js stone 磐石: {pct:20, turns:3})
    // #8 M1: 磐石描述"以**自身**的防御属性为其加固" ({D:DEF*0.2} 的 DEF=石头龟自己),
    //   旧版按受益方 tgt.baseDef 算 → 高甲石头龟给低甲队友远低于描述。改按 caster.baseDef/baseMr。
    const defBuff = skill.defUpPct as { pct?: number; turns?: number } | undefined;
    if (defBuff && (defBuff.pct ?? 0) > 0) {
      const gain = Math.round((caster.baseDef ?? caster.def) * (defBuff.pct ?? 0) / 100);
      tgt.buffs.push({ type: 'defUp', value: gain, duration: (defBuff.turns ?? 3) + 1 });
      api.floatNum(tgt, `+${gain}甲`, '#7dffb3');
    }
    const mrBuff = skill.mrUpPct as { pct?: number; turns?: number } | undefined;
    if (mrBuff && (mrBuff.pct ?? 0) > 0) {
      const gain = Math.round((caster.baseMr ?? caster.mr ?? 0) * (mrBuff.pct ?? 0) / 100);
      tgt.buffs.push({ type: 'mrUp', value: gain, duration: (mrBuff.turns ?? 3) + 1 });
      api.floatNum(tgt, `+${gain}抗`, '#7dffb3');
    }
    return { touched: [tgt] };
  },

  // ── PASSIVE no-op stubs (由 P6 中的 turn/onhit/death hooks 处理) ──
  basicTurtle:       async (_a, c) => ({ touched: [c] }),
  auraAwaken:        async (_a, c) => ({ touched: [c] }),
  lavaRage:          async (_a, c) => ({ touched: [c] }),
  undeadRage:        async (_a, c) => ({ touched: [c] }),
  crystalResonance:  async (_a, c) => ({ touched: [c] }),
  frostAura:         async (_a, c) => ({ touched: [c] }),
  starEnergy:        async (_a, c) => ({ touched: [c] }),
  twoHeadResilience: async (_a, c) => ({ touched: [c] }),
  // E3/13: twoHeadFear active — JS skills/two_head.js:213-237 1:1
  // P56 twoHeadFear 1:1 (无头龟用) — JS 实际是 headless 的恐吓技能, 共用 type 名
  twoHeadFear: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const atkScale = (skill.atkScale as number) ?? 0.9;
    const fearTurns = (skill.fearTurns as number) ?? 3;
    const fearReduction = (skill.fearReduction as number) ?? 20;
    const isCrit = rollCrit(effectiveCrit(caster));
    const dmg = dealPhysical(caster, target, caster.atk * atkScale, isCrit);
    api.floatNum(target, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
    applyPostHitLayers(caster, target, dmg, isCrit, 'physical');
    if (target.alive) {
      const existing = target.buffs.find(b => b.type === 'fear');
      if (existing) {
        existing.duration = fearTurns + 1;
      } else {
        target.buffs.push({ type: 'fear', value: fearReduction, duration: fearTurns + 1 });
      }
      await sleep(200);
      api.floatNum(target, '恐惧!', '#ff9f43', 'debuff-label');
    }
    api.log?.(`${caster.emoji}${caster.name} <b>恐吓</b> → ${target.emoji}${target.name}：${dmg}物理 + 恐惧 -${fearReduction}% ${fearTurns}回合`);
    return { touched: [target] };
  },
  stoneWall:         async (_a, c) => ({ touched: [c] }),
  chestTreasure:     async (_a, c) => ({ touched: [c] }),
  fortuneGold:       async (_a, c) => ({ touched: [c] }),
  candyBombPassive:  async (_a, c) => ({ touched: [c] }),
  summonAlly:        async (_a, c) => ({ touched: [c] }),
  judgement:         async (_a, c) => ({ touched: [c] }),
  bubbleStore:       async (_a, c) => ({ touched: [c] }),
  bambooCharge:      async (_a, c) => ({ touched: [c] }),
  bambooCharged:     async (_a, c) => ({ touched: [c] }),
  diamondStructure:  async (_a, c) => ({ touched: [c] }),
  diamondEnhanced:   async (_a, c) => ({ touched: [c] }),
  // E3/13: diamondFortify active — JS skills/diamond.js:1-20 1:1
  diamondFortify: async (api, caster, _target, skill) => {
    const shieldHpPct = (skill.shieldHpPct as number) ?? 20;
    const defUpAtkPct = (skill.defUpAtkPct as number) ?? 20;
    const mrUpAtkPct = (skill.mrUpAtkPct as number) ?? 0;
    const defUpTurns = (skill.defUpTurns as number) ?? 3;
    // 自盾 maxHp × shieldHpPct%
    const shieldAmt = Math.round(caster.maxHp * shieldHpPct / 100);
    caster.shield = (caster.shield ?? 0) + shieldAmt;
    battleStats.recordShield(caster, shieldAmt);
    api.floatNum(caster, `+${shieldAmt}`, '#c0c0c0', 'shield-num');
    sfxBuff();  // E3/22: JS common.js:43 sfxBuff() — defensive/shield 类
    // defUp / mrUp buff (value = atk × pct%, duration = turns+1)
    const defGain = Math.round(caster.atk * defUpAtkPct / 100);
    const mrGain = Math.round(caster.atk * mrUpAtkPct / 100);
    caster.buffs.push({ type: 'defUp', value: defGain, duration: defUpTurns + 1 });
    if (mrGain > 0) caster.buffs.push({ type: 'mrUp', value: mrGain, duration: defUpTurns + 1 });
    await sleep(200);
    api.floatNum(caster, `+${defGain}甲${mrGain > 0 ? `+${mrGain}抗` : ''}`, '#7dffb3', 'passive-num');
    api.log?.(`${caster.name} <b>坚不可摧</b>: +${shieldAmt}护盾 +${defGain}DEF${mrGain > 0 ? `+${mrGain}MR` : ''} ${defUpTurns}回合`);
    return { touched: [caster] };
  },
  // E3/13: hunterStealth active — JS skills/hunter.js:93-113 1:1
  hunterStealth: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const dmgScale = (skill.dmgScale as number) ?? 0.9;
    const dodgePct = (skill.dodgePct as number) ?? 25;
    const dodgeTurns = (skill.dodgeTurns as number) ?? 3;
    const shieldScale = (skill.shieldScale as number) ?? 0.7;
    // 1) Deal damage (走 dealPhysical 跑被动 + on-hit + stats)
    const isCrit = rollCrit(effectiveCrit(caster));
    const dmg = dealPhysical(caster, target, caster.atk * dmgScale, isCrit);
    api.floatNum(target, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
    // 2) Gain dodge buff (caster), 已有则取最大 turns
    const existing = caster.buffs.find(b => b.type === 'dodge');
    if (existing) {
      existing.duration = Math.max(existing.duration, dodgeTurns + 1);
    } else {
      caster.buffs.push({ type: 'dodge', value: dodgePct, duration: dodgeTurns + 1 });
    }
    // 3) Gain shield (caster) = atk × shieldScale
    const shieldAmt = Math.round(caster.atk * shieldScale);
    caster.shield = (caster.shield ?? 0) + shieldAmt;
    battleStats.recordShield(caster, shieldAmt);
    sfxBuff();  // E3/22: JS hiding.js:256 sfxBuff()
    await sleep(200);
    api.floatNum(caster, `+${shieldAmt}`, '#c0c0c0', 'shield-num');
    await sleep(200);
    api.floatNum(caster, `闪避${dodgePct}%`, '#7dffb3');
    return { touched: [target, caster] };
  },
  hunterKill:        async (_a, c) => ({ touched: [c] }),
  inkMark:           async (_a, c) => ({ touched: [c] }),
  ghostCurse:        async (_a, c) => ({ touched: [c] }),
  ninjaInstinct:     async (_a, c) => ({ touched: [c] }),
  phoenixRebirth:    async (_a, c) => ({ touched: [c] }),
  rainbowEnhancedPrism: async (_a, c) => ({ touched: [c] }),
  // bubbleShield / bubbleHeal 已在上面定义为 active, 此处不重复
  cyberDrone:        async (_a, c) => ({ touched: [c] }),
  cyberEnhancedDrone:async (_a, c) => ({ touched: [c] }),
  // P33 cyberSwarmShield 1:1 JS skills/cyber.js:358-374
  cyberSwarmShield: async (api, caster, _target, skill) => {
    const cf = caster as Fighter & { _drones?: unknown[]; _cyberEnhanced?: boolean };
    const droneCount = cf._drones?.length ?? 0;
    const perDronePct = cf._cyberEnhanced
      ? ((skill.shieldPerDroneEnhanced as number) ?? 10)
      : ((skill.shieldPerDronePct as number) ?? 15);
    const baseScale = (skill.shieldAtkScale as number) ?? 0.6;
    const totalScale = baseScale + (perDronePct / 100) * droneCount;
    const shieldAmt = Math.round(caster.atk * totalScale * ruleModifiers.shieldMult());
    const allies = getAllies(api, caster);
    for (const a of allies) {
      if (!a.alive) continue;
      a.shield = (a.shield ?? 0) + shieldAmt;
      battleStats.recordShield(a, shieldAmt);
      // JS:368 shield-num cls + '+${amount}' (无 🛡 emoji)
      api.floatNum(a, `+${shieldAmt}`, '#c0c0c0', 'shield-num');
      api.log?.(`${caster.emoji}${caster.name} <b>浮游联防</b> → ${a.name}：+${shieldAmt}永久护盾 (基础60% + ${droneCount}炮台×${perDronePct}%)`);
    }
    await sleep(800);   // JS:373
    return { touched: allies };
  },
  pirateShipPassive: async (_a, c) => ({ touched: [c] }),
  iceBurnImmune:     async (_a, c) => ({ touched: [c] }),
  sweetTrap:         async (_a, c) => ({ touched: [c] }),
  hidingEnhancedSummon: async (_a, c) => ({ touched: [c] }),
  gamblerEnhancedMulti: async (_a, c) => ({ touched: [c] }),

  // ══════════════════════════════════════════════════════════
  // P16: _misc.js handlers (JS skills/_misc.js 1:1 port)
  // 之前完全缺失这 23 个 handler; registry.js 派发时 dispatchSkill 返回 false
  // → action.js if/else fallback 也找不到, 实际打不出来. 现统一补齐.
  // ══════════════════════════════════════════════════════════

  // JS _misc.js:7-26 doCandyBomb
  candyBomb: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    const hits = (skill.hits as number) ?? 3;
    const atkScale = (skill.atkScale as number) ?? 0.35;
    const touched: Fighter[] = [];
    for (const e of enemies) {
      if (!e.alive) continue;
      for (let h = 0; h < hits; h++) {
        if (!e.alive) break;
        const dmg = dealPhysical(caster, e, caster.atk * atkScale, false);
        api.floatNum(e, `${dmg}`, '#ff4444', 'direct-dmg', h * 60);
      }
      touched.push(e);
    }
    // skill.armorPen 加到 caster (永久 pen — JS:23)
    if (skill.armorPen) caster.armorPen = (caster.armorPen ?? 0) + (skill.armorPen as number);
    return { touched };
  },

  // JS _misc.js:28-30 doMechAttack — 简单调用 doDamage
  mechAttack: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const isCrit = rollCrit(effectiveCrit(caster));
    const dmg = dealPhysical(caster, target, caster.atk * ((skill.atkScale as number) ?? 1.0), isCrit);
    api.floatNum(target, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
    return { touched: [target] };
  },

  // JS _misc.js:32-42 doBambooAoeHeal — AoE 友军治疗 (healAtkPct + healHpPct)
  bambooAoeHeal: async (api, caster, _target, skill) => {
    const allies = getAllies(api, caster);
    const healAtkPct = (skill.healAtkPct as number) ?? 0;
    const healHpPct = (skill.healHpPct as number) ?? 0;
    for (const a of allies) {
      const heal = Math.round(caster.atk * healAtkPct / 100) + Math.round(a.maxHp * healHpPct / 100);
      const actual = applyHeal(a, heal, caster);
      if (actual > 0) api.floatNum(a, `+${actual}`, '#06d6a0', 'heal-num');
    }
    return { touched: allies };
  },

  // JS _misc.js:44-52 doCrystalResHeal — 单友: heal = mr × healMrScale + atk × healAtkPct
  crystalResHeal: async (api, caster, target, skill) => {
    const tgt = (target && target.side === caster.side) ? target : caster;
    const healMrScale = (skill.healMrScale as number) ?? 0;
    const healAtkPct = (skill.healAtkPct as number) ?? 0;
    const heal = Math.round((caster.mr ?? 0) * healMrScale) + Math.round(caster.atk * healAtkPct / 100);
    const actual = applyHeal(tgt, heal, caster);
    if (actual > 0) api.floatNum(tgt, `+${actual}`, '#06d6a0', 'heal-num');
    return { touched: [tgt] };
  },

  // JS _misc.js:54-67 doHeadlessRegen — 自补 lostHp × healLostPct% + lifestealUp buff
  headlessRegen: async (api, caster, _target, skill) => {
    const lost = caster.maxHp - caster.hp;
    const heal = Math.round(lost * ((skill.healLostPct as number) ?? 25) / 100);
    const actual = applyHeal(caster, heal, caster);
    if (actual > 0) api.floatNum(caster, `+${actual}`, '#06d6a0', 'heal-num');
    const lsu = skill.lifestealUp as { pct?: number; turns?: number } | undefined;
    if (lsu && (lsu.pct ?? 0) > 0) {
      caster.buffs.push({ type: 'lifesteal', value: lsu.pct ?? 0, duration: (lsu.turns ?? 3) + 1 });
      api.floatNum(caster, `+${lsu.pct}%生命偷取`, '#06d6a0');
    }
    return { touched: [caster] };
  },

  // JS _misc.js:69-78 doRainbowBarrier — AoE 友: shield = atk × shieldAtkScale
  rainbowBarrier: async (api, caster, _target, skill) => {
    const allies = getAllies(api, caster);
    const scale = (skill.shieldAtkScale as number) ?? 0.8;
    const amt = Math.round(caster.atk * scale);
    for (const a of allies) {
      applyShield(a, amt);
      api.floatNum(a, `+${amt}`, '#c0c0c0', 'shield-num');
    }
    return { touched: allies };
  },

  // JS _misc.js:81-87 doShellEnergyShield — self: shield = _storedEnergy × energyShieldScale
  shellEnergyShield: async (api, caster, _target, skill) => {
    const cf = caster as Fighter & { _storedEnergy?: number };
    const energy = cf._storedEnergy ?? 0;
    const scale = (skill.energyShieldScale as number) ?? 1.5;
    const amt = Math.round(energy * scale);
    applyShield(caster, amt);
    api.floatNum(caster, `+${amt}`, '#c0c0c0', 'shield-num');
    return { touched: [caster] };
  },

  // JS _misc.js:90-105 doPirateFlag — AoE 友 atkUp buff (基于 baseAtk × pct%)
  pirateFlag: async (api, caster, _target, skill) => {
    const aub = skill.atkUpPct as number | { pct?: number; turns?: number } | undefined;
    const pct = typeof aub === 'object' ? (aub.pct ?? 25) : (aub ?? 25);
    const turns = typeof aub === 'object' ? (aub.turns ?? 3) : 3;
    const allies = getAllies(api, caster);
    for (const a of allies) {
      const gain = Math.round(a.baseAtk * pct / 100);
      a.buffs.push({ type: 'atkUp', value: gain, duration: turns + 1 });
      api.floatNum(a, `+${gain}攻`, '#ffd93d');
      recalcStats(a, allies);
    }
    return { touched: allies };
  },

  // JS _misc.js:107-115 doGhostShadow — self: dodge buff
  ghostShadow: async (api, caster, _target, skill) => {
    const pct = (skill.dodgePct as number) ?? 80;
    const turns = (skill.dodgeTurns as number) ?? 2;
    caster.buffs.push({ type: 'dodge', value: pct, duration: turns + 1 });
    api.floatNum(caster, `闪避${pct}%`, '#a0e8ff');
    return { touched: [caster] };
  },

  // JS _misc.js:117-127 doStarWarp — self: dodge buff + 可选 dodgeCounter (闪避反击)
  starWarp: async (api, caster, _target, skill) => {
    const pct = (skill.dodgePct as number) ?? 60;
    const turns = (skill.dodgeTurns as number) ?? 2;
    caster.buffs.push({ type: 'dodge', value: pct, duration: turns + 1 });
    api.floatNum(caster, `闪避${pct}%`, '#a0e8ff');
    if (skill.counterScale) {
      const counterAmt = Math.round(caster.atk * (skill.counterScale as number));
      caster.buffs.push({
        type: 'dodgeCounter',
        value: counterAmt,
        duration: turns + 1,
        dmgType: (skill.counterDmgType as string) ?? 'magic',
      } as Fighter['buffs'][number] & { dmgType?: string });
      api.floatNum(caster, `闪避反击 ${counterAmt}`, '#c77dff');
    }
    return { touched: [caster] };
  },

  // JS _misc.js:129-139 doHidingReflect — self shield + reflect buff
  hidingReflect: async (api, caster, _target, skill) => {
    const shieldAmt = Math.round(caster.maxHp * ((skill.shieldHpPct as number) ?? 15) / 100);
    applyShield(caster, shieldAmt);
    caster.buffs.push({
      type: 'reflect',
      value: (skill.reflectPct as number) ?? 40,
      duration: ((skill.reflectTurns as number) ?? 3) + 1,
    });
    api.floatNum(caster, `+${shieldAmt} 反弹${skill.reflectPct ?? 40}%`, '#c0c0c0', 'shield-num');
    return { touched: [caster] };
  },

  // JS _misc.js:141-156 doGamblerCheat — 主伤 + 偷取目标 1 个增益 buff 给自己
  gamblerCheat: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const isCrit = rollCrit(effectiveCrit(caster));
    const dmg = dealPhysical(caster, target, caster.atk * ((skill.atkScale as number) ?? 1.0), isCrit);
    api.floatNum(target, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
    const stealableTypes = new Set(['atkUp', 'defUp', 'mrUp', 'critUp', 'shield', 'dodge', 'lifesteal']);
    const stealable = target.buffs.filter(b => stealableTypes.has(b.type));
    if (stealable.length > 0) {
      const stolen = stealable[Math.floor(Math.random() * stealable.length)];
      target.buffs = target.buffs.filter(b => b !== stolen);
      caster.buffs.push({ ...stolen });
      api.floatNum(target, `被偷取`, '#888888');
      api.floatNum(caster, `偷取成功`, '#ffd93d');
    }
    return { touched: [target, caster] };
  },

  // JS _misc.js:158-169 doGamblerAllIn — 自损 selfDmgPct% × hp + critBonus → 主伤
  gamblerAllIn: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const selfDmg = Math.round(caster.hp * ((skill.selfDmgPct as number) ?? 30) / 100);
    caster.hp = Math.max(1, caster.hp - selfDmg);
    api.floatNum(caster, `-${selfDmg}`, '#ff4444', 'direct-dmg');
    const origCrit = caster.crit;
    if (skill.critBonus) caster.crit = Math.min(1, caster.crit + (skill.critBonus as number) / 100);
    const isCrit = rollCrit(effectiveCrit(caster));
    const dmg = dealPhysical(caster, target, caster.atk * ((skill.atkScale as number) ?? 1.5), isCrit);
    api.floatNum(target, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
    caster.crit = origCrit;
    return { touched: [target, caster] };
  },

  // JS _misc.js:171-177 doHunterSnipe — execThresh 下保证暴击
  hunterSnipe: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const origCrit = caster.crit;
    if (skill.execThresh && (target.hp / target.maxHp * 100) <= (skill.execThresh as number)) {
      caster.crit = 1.0;
    }
    const isCrit = rollCrit(effectiveCrit(caster));
    const dmg = dealPhysical(caster, target, caster.atk * ((skill.atkScale as number) ?? 2.0), isCrit);
    api.floatNum(target, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
    caster.crit = origCrit;
    return { touched: [target] };
  },

  // JS _misc.js:179-199 doFortuneGoldRain — AoE 魔法 N hits + 每命中加 coinGain 金币
  fortuneGoldRain: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    const hits = (skill.hits as number) ?? 8;
    const atkScale = (skill.atkScale as number) ?? 0.12;
    const coinGain = (skill.coinGain as number) ?? 2;
    const cf = caster as Fighter & { _goldCoins?: number };
    cf._goldCoins = cf._goldCoins ?? 0;
    const touched: Fighter[] = [];
    for (const e of enemies) {
      if (!e.alive) continue;
      for (let h = 0; h < hits; h++) {
        if (!e.alive) break;
        const dmg = dealMagic(caster, e, caster.atk * atkScale);
        api.floatNum(e, `${dmg}`, '#4dabf7', 'magic-dmg', h * 60);
        cf._goldCoins += coinGain;
      }
      touched.push(e);
    }
    api.floatNum(caster, `+${coinGain * hits * enemies.length}💰`, '#ffd93d');
    sfxCoin();
    return { touched };
  },

  // JS _misc.js:201-220 doCrystalDetonate — 引爆目标 _crystallize 层 (base + perStack × stacks 魔法)
  crystalDetonate: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const tf = target as Fighter & { _crystallize?: number };
    const stacks = tf._crystallize ?? 0;
    const atkScale = (skill.atkScale as number) ?? 0.5;
    const perStackScale = (skill.perStackScale as number) ?? 0.6;
    const base = caster.atk * atkScale + caster.atk * perStackScale * stacks;
    const dmg = dealMagic(caster, target, base);
    api.floatNum(target, `${dmg}`, '#c77dff', 'magic-dmg');
    if (stacks > 0) { api.floatNum(target, `引爆${stacks}层`, '#c77dff'); fireCrystalDetonateVfx(target); }   // K2 紫爆+震屏
    if (skill.consumeStacks) tf._crystallize = 0;
    return { touched: [target] };
  },

  // JS _misc.js:222-238 doShellAuraBurst — 消耗 _storedEnergy AoE 物理
  shellAuraBurst: async (api, caster, _target, skill) => {
    const cf = caster as Fighter & { _storedEnergy?: number };
    const energy = cf._storedEnergy ?? 0;
    const atkScale = (skill.atkScale as number) ?? 0.5;
    const energyDmgScale = (skill.energyDmgScale as number) ?? 1.2;
    const base = caster.atk * atkScale + energy * energyDmgScale;
    const enemies = getEnemies(api, caster);
    const touched: Fighter[] = [];
    for (const e of enemies) {
      if (!e.alive) continue;
      const dmg = dealPhysical(caster, e, base, false);
      api.floatNum(e, `${dmg}`, '#ff4444', 'direct-dmg');
      touched.push(e);
    }
    cf._storedEnergy = 0;
    return { touched };
  },

  // JS _misc.js:240-260 doStoneQuake — AoE 魔法 (atk × atkScale + def × defScale), 可附眩晕
  stoneQuake: async (api, caster, _target, skill) => {
    const enemies = getEnemies(api, caster);
    const atkScale = (skill.atkScale as number) ?? 0.4;
    const defScale = (skill.defScale as number) ?? 0.8;
    const base = caster.atk * atkScale + caster.def * defScale;
    const touched: Fighter[] = [];
    for (const e of enemies) {
      if (!e.alive) continue;
      const dmg = dealMagic(caster, e, base);
      api.floatNum(e, `${dmg}`, '#4dabf7', 'magic-dmg');
      if (skill.stunChance && Math.random() * 100 < (skill.stunChance as number)) {
        e.buffs.push({ type: 'stun', value: 1, duration: 2 });
        api.floatNum(e, '眩晕!', '#ffee00');
      }
      touched.push(e);
    }
    return { touched };
  },

  // JS _misc.js:290-302 doHidingStrike — 单体物理 atkScale × ATK + defScale × DEF
  hidingStrike: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const atkScale = (skill.atkScale as number) ?? 2.2;
    const defScale = (skill.defScale as number) ?? 0.5;
    const isCrit = rollCrit(effectiveCrit(caster));
    const base = caster.atk * atkScale + caster.def * defScale;
    const dmg = dealPhysical(caster, target, base, isCrit);
    api.floatNum(target, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
    return { touched: [target] };
  },

  // JS _misc.js:304-319 doDiceDeathBet — 单体: 物理 atkScale × ATK + lostHp × lostHpBonusPct% 加成
  diceDeathBet: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const atkScale = (skill.atkScale as number) ?? 0.5;
    const lostHpBonusPct = (skill.lostHpBonusPct as number) ?? 200;
    const lost = caster.maxHp - caster.hp;
    const base = caster.atk * atkScale + Math.round(lost * lostHpBonusPct / 100);
    const isCrit = rollCrit(effectiveCrit(caster));
    const dmg = dealPhysical(caster, target, base, isCrit);
    api.floatNum(target, `${dmg}`, '#ff4444', isCrit ? 'crit-dmg' : 'direct-dmg');
    return { touched: [target] };
  },

  // JS _misc.js:321-337 doDiceLuckyCrit — 单体: 随机 critMult (默认 150-350) 暴击
  diceLuckyCrit: async (api, caster, target, skill) => {
    if (!target) return { touched: [] };
    const atkScale = (skill.atkScale as number) ?? 1.0;
    const range = (skill.randomCritMult as { min?: number; max?: number } | undefined) ?? { min: 150, max: 350 };
    const min = range.min ?? 150;
    const max = range.max ?? 350;
    const critMult = (min + Math.random() * (max - min)) / 100;
    const base = caster.atk * atkScale * critMult;
    const dmg = dealPhysical(caster, target, base, true);  // 强制 crit
    api.floatNum(target, `${dmg}`, '#ff4757', 'crit-dmg');
    api.floatNum(target, `暴击×${Math.round(critMult * 100)}%`, '#ff4757');
    return { touched: [target] };
  },

  // JS registry alias — rainbowHeal / fortuneBless 走同一个 fn (bambooAoeHeal)
  // 不直接复用引用让 registry 解析时找到注册的 key (poc 是 Record, JS 走 windowfn 查找)
  rainbowHeal: async (api, caster, _target, skill) => {
    return await SKILL_HANDLERS.bambooAoeHeal(api, caster, _target, skill);
  },
  fortuneBless: async (api, caster, _target, skill) => {
    return await SKILL_HANDLERS.bambooAoeHeal(api, caster, _target, skill);
  },
  // P16: cyberFirewall 跟 cyberSwarmShield 同 fn (JS registry.js:97)
  cyberFirewall: async (api, caster, _target, skill) => {
    return await SKILL_HANDLERS.cyberSwarmShield(api, caster, _target, skill);
  },
};

/** 看 type 找 handler, 没注册的返回 generic physical */
export function getSkillHandler(type: string): SkillHandler {
  return SKILL_HANDLERS[type] ?? SKILL_HANDLERS.physical;
}
