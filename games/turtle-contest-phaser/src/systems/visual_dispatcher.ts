// ══════════════════════════════════════════════════════════
// visual_dispatcher.ts — bus 事件 → Phaser 飘字/HP 条更新
// (旧版 visual_dispatcher.js 的 Phaser 版本)
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import type { Fighter, FloatCls } from '../types';
import { bus } from './bus';
import { playDmgSfx, playHealSfx, playShieldGainSfx } from './sfx';

// VISUAL_REGISTRY — via tag → 视觉配置 (跟旧版同 schema)
export interface VisualCfg {
  emoji?: string;
  cls?: FloatCls;
  dx?: number;
  dy?: number;
}

export const VISUAL_REGISTRY: Record<string, VisualCfg> = {
  // 装备类 (旧版 entries)
  'equip:revolver':       { emoji: '🔫', cls: 'phys-dmg' },
  'equip:dumbbell-throw': { emoji: '🏋', cls: 'phys-dmg' },
  'equip:wave-magic':     { emoji: '🌊', cls: 'magic-dmg' },
  'equip:wave-shield':    { emoji: '🌊', cls: 'shield-gain' },
  'equip:dart-throw':     { emoji: '🎯', cls: 'phys-dmg' },
  'equip:candle-burn':    { emoji: '🔥', cls: 'dot-dmg' },
  // 技能类 (新加, Phase B 演示用)
  'skill:fireball':       { emoji: '🔥', cls: 'magic-dmg' },
  'skill:chain-lightning':{ emoji: '⚡', cls: 'magic-dmg' },
  'skill:heal-aura':      { emoji: '✨', cls: 'heal' },
  'skill:lifesteal':      { emoji: '🩸', cls: 'heal' },
  'skill:thorns':         { emoji: '🌵', cls: 'true-dmg' },
  // fallback
  '_default':             { emoji: '',   cls: 'phys-dmg' },
};

// floatCls → 颜色 + 字号 (旧版 CSS 规则在 Phaser 里转代码)
// FLOAT_STYLE — 1:1 跟 JS battle.css `.floating-num.*` (颜色 + size 完全对齐)
// 注: spawnFloatingText 内的 size-by-amount 公式会覆盖这里的 size — 这里 size
//     是 fallback (text 里没数字时用)。
const FLOAT_STYLE: Record<FloatCls, { color: string; size: string; stroke: string }> = {
  // ── 伤害类 (JS battle.css 22-26px) ──
  'direct-dmg':   { color: '#ff4444', size: '22px', stroke: '#000' },
  'phys-dmg':     { color: '#ff4444', size: '22px', stroke: '#000' },   // alias
  'magic-dmg':    { color: '#4dabf7', size: '22px', stroke: '#000' },
  'true-dmg':     { color: '#ffffff', size: '22px', stroke: '#000' },
  'pierce-dmg':   { color: '#ffffff', size: '20px', stroke: '#000' },
  'shield-dmg':   { color: '#aaaaaa', size: '16px', stroke: '#000' },
  'crit-dmg':     { color: '#ff4444', size: '26px', stroke: '#000' },   // 跟 direct 同色, 大字号 = crit
  'crit-magic':   { color: '#4dabf7', size: '26px', stroke: '#000' },
  'crit-true':    { color: '#ffffff', size: '26px', stroke: '#000' },
  'crit-pierce':  { color: '#ffffff', size: '24px', stroke: '#000' },
  'crit':         { color: '#ff4444', size: '26px', stroke: '#000' },   // default crit = crit-dmg
  // ── label 类 ──
  'heal-num':     { color: '#06d6a0', size: '24px', stroke: '#000' },
  'shield-num':   { color: '#ffffff', size: '22px', stroke: '#000' },
  'crit-label':   { color: '#ffd700', size: '14px', stroke: '#000' },   // font-weight:900
  'passive-num':  { color: '#7dffb3', size: '16px', stroke: '#000' },
  'debuff-label': { color: '#ff9f43', size: '14px', stroke: '#000' },
  'dot-dmg':      { color: '#ff6600', size: '18px', stroke: '#000' },
  'counter-dmg':  { color: '#ffd93d', size: '20px', stroke: '#000' },
  'death-explode':{ color: '#ff2222', size: '24px', stroke: '#000' },
  'bubble-num':   { color: '#4cc9f0', size: '18px', stroke: '#000' },
  'bubble-burst': { color: '#ff9f43', size: '22px', stroke: '#000' },
  'dodge-num':    { color: '#a0e8ff', size: '16px', stroke: '#000' },
  // ── alias ──
  'heal':         { color: '#06d6a0', size: '24px', stroke: '#000' },   // = heal-num
  'shield-gain':  { color: '#ffffff', size: '22px', stroke: '#000' },   // = shield-num
  'miss':         { color: '#a0e8ff', size: '16px', stroke: '#000' },   // = dodge-num
};

// 视图查找接口: 调用方提供, 翻译 Fighter → 屏幕坐标
export interface ViewLookup {
  scene: Phaser.Scene;
  getView(f: Fighter): { x: number; y: number; setHpDisplay?: (hp: number, maxHp: number) => void } | null;
}

let activeLookup: ViewLookup | null = null;
let activeUnsubs: Array<() => void> = [];

/** BattleScene create() 调; shutdown() 调 unbind */
export function bindVisualDispatcher(lookup: ViewLookup): void {
  unbindVisualDispatcher();
  activeLookup = lookup;

  activeUnsubs.push(bus.on('damage:visual', (e) => {
    const v = activeLookup?.getView(e.target);
    if (!v) return;
    const cfg = VISUAL_REGISTRY[e.via ?? ''] ?? VISUAL_REGISTRY._default;
    const cls = e.floatCls ?? cfg.cls ?? 'phys-dmg';
    const emoji = e.customText ?? cfg.emoji ?? '';
    const text = `-${e.amount}${emoji}`;
    spawnFloatingText(activeLookup!.scene, v.x + (e.dx ?? cfg.dx ?? 0), v.y - 40 + (e.dy ?? cfg.dy ?? 0), text, cls,
      { amount: e.amount, atkSide: e.atkSide });
    if (!e.suppressHpBar && v.setHpDisplay) v.setHpDisplay(e.target.hp, e.target.maxHp);
    // v0.9.5.A86: SFX per dmg type (JS engine.js:765-773)
    if (!e.suppressSfx) {
      const type = cls === 'magic-dmg' ? 'magic'
        : cls === 'true-dmg' ? 'true'
        : 'physical';
      playDmgSfx(activeLookup!.scene, { type, isCrit: cls === 'crit', volume: 0.4 });
    }
  }));

  activeUnsubs.push(bus.on('heal:visual', (e) => {
    const v = activeLookup?.getView(e.target);
    if (!v) return;
    const cfg = VISUAL_REGISTRY[e.via ?? ''] ?? VISUAL_REGISTRY._default;
    const emoji = cfg.emoji ?? '';
    spawnFloatingText(activeLookup!.scene, v.x, v.y - 40, `+${e.amount}${emoji}`, 'heal');
    if (v.setHpDisplay) v.setHpDisplay(e.target.hp, e.target.maxHp);
    if (!e.suppressSfx) playHealSfx(activeLookup!.scene, 0.4);
  }));
}

export function unbindVisualDispatcher(): void {
  for (const off of activeUnsubs) off();
  activeUnsubs = [];
  activeLookup = null;
}

// v0.9.5.A83: 同段飘字按 type 分行 (JS combat.js:218-238 同款)
// 同一 target 同一帧多飘字: TRUE 上 → MAGIC → PHY → shield/bubble → dot 下
// 用 (x,y) 桶 + 60ms 窗口堆叠
// JS canonical 顺序 (top→bottom): pierce/true > magic > physical > shield/bubble > dot
// 越大 yOffset 越往上 — Phaser ROW_HEIGHT = 22, row 0 在 sprite 上方最高
const FLOAT_ROW_BY_CLS: Record<FloatCls, number> = {
  // 用户规则: 白(真实/穿透)最上, 蓝(魔法)中, 红(物理)最下。行号越大越靠上 (startY = y - 行号×行高)。
  'phys-dmg':     0, 'direct-dmg':   0, 'crit-dmg':     0, 'crit':         0,   // 红 → 最下
  'magic-dmg':    1, 'crit-magic':   1,                                         // 蓝 → 中
  'true-dmg':     2, 'crit-true':    2, 'pierce-dmg':   2, 'crit-pierce':  2,    // 白 → 最上
  'crit-label':   2,
  'shield-dmg':   3, 'shield-num':   3, 'shield-gain':  3,
  'bubble-num':   3, 'bubble-burst': 3,
  'heal':         3, 'heal-num':     3,
  'passive-num':  3,
  'death-explode': 3, 'counter-dmg': 3,
  'debuff-label': 4,
  'dot-dmg':      4,
  'dodge-num':    4, 'miss':         4,
};
// 行距 = 两种伤害(如 主伤红 row0 + 审判蓝 row1)的中心间距。数字 hold 态约 18-24px 高 (字号×0.7 + 8向描边),
// 14 太挤 → 用户报"两种伤害数字重叠"。22 是"贴近又不叠"的下限 (典型数字留 ~3-5px 缝); 暴击数字更大可能微叠, 罕见可接受。
const ROW_HEIGHT = 22;
const STACK_WINDOW_MS = 100;
const floatStacks = new Map<string, { count: number; expiresAt: number }>();

function pickRowOffset(bucket: string, cls: FloatCls): number {
  const now = performance.now();
  const entry = floatStacks.get(bucket);
  const rowBase = FLOAT_ROW_BY_CLS[cls] ?? 2;
  if (!entry || entry.expiresAt < now) {
    floatStacks.set(bucket, { count: 1, expiresAt: now + STACK_WINDOW_MS });
    return rowBase * ROW_HEIGHT;
  }
  entry.count++;
  entry.expiresAt = now + STACK_WINDOW_MS;
  // 同 type 飘字也错开 (count-1 行)
  return (rowBase + entry.count - 1) * ROW_HEIGHT;
}

/**
 * 飘字工具 — 对齐 JS engine.js:757-871 spawnFloatingNum 节奏
 *   阶段:
 *     0-50ms:   pop 放大到 popSize (1.6-2.5×, 按 amount 缩放)
 *     50-150ms: shrink 到 holdScale (crit 1.0 / 普通 0.7)
 *     hold:     普通 0ms (立即起飞); crit 250ms 锁定 (KO 感)
 *     flight:   650ms 抛物线 (gravity 200, x 随机向 attacker 远方向)
 *     fade:     飞行最后 350ms 渐隐
 *   字号: 跟随 amount (20→35px, crit ×1.2)
 *   总时长: ~800ms (普通) / 1050ms (crit)
 */
// E3/31: _floatStacks 16px label 堆叠 — JS engine.js:759-762 1:1
// 每 spawn +1, 600ms+delayMs 后 -1. autoOffset = stackCount × 16 (只用于 label 路径)
// key: x/y 桶 (跟 row-offset 共用 — Phaser 无 elId, fighter object 可能复用)
const _floatStacks = new Map<string, number>();

// E3/31: cls→SFX 表 — JS engine.js:765-773 1:1
// 用 Phaser sfx.ts 的 playDmgSfx (type/isCrit) 路由
function fireSfxForCls(scene: Phaser.Scene, cls: FloatCls): void {
  switch (cls) {
    case 'direct-dmg':
    case 'phys-dmg':
      playDmgSfx(scene, { type: 'physical', volume: 0.4 }); break;
    case 'magic-dmg':
      playDmgSfx(scene, { type: 'magic', volume: 0.4 }); break;
    case 'true-dmg':
    case 'pierce-dmg':
      playDmgSfx(scene, { type: 'true', volume: 0.4 }); break;
    case 'crit-dmg':
    case 'crit-magic':
    case 'crit-true':
    case 'crit-pierce':
    case 'crit':
      playDmgSfx(scene, { type: 'physical', isCrit: true, volume: 0.5 }); break;
    case 'shield-dmg':
      playDmgSfx(scene, { type: 'physical', shieldHit: true, volume: 0.4 }); break;
    case 'shield-num':
    case 'shield-gain':
      playShieldGainSfx(scene, 0.4); break;
    case 'heal-num':
    case 'heal':
      playHealSfx(scene, 0.4); break;
    case 'dodge-num':
    case 'miss':
      playDmgSfx(scene, { dodged: true, volume: 0.4 }); break;
    default: break;
  }
}

export function spawnFloatingText(
  scene: Phaser.Scene,
  x: number, y: number,
  text: string,
  cls: FloatCls,
  opts: { amount?: number; atkSide?: 'left' | 'right'; delayMs?: number; yOffset?: number } = {},
): void {
  void FLOAT_STYLE;  // 颜色/字号都走 CSS 类
  // 用户: 伤害跳字统一无符号。历史上主攻击/无人机/部分装备伤害带前导 '-' (如 -44🛸),
  //   法术/炸弹却不带 → 不一致。这里对 HP 伤害类 (xxx-dmg, 不含 shield-dmg 破盾; 及暴击 crit*)
  //   统一去掉前导负号, 一处生效覆盖所有调用点。
  if (text.startsWith('-') && ((cls.endsWith('-dmg') && cls !== 'shield-dmg') || cls.startsWith('crit'))) {
    text = text.slice(1);
  }
  const delayMs = opts.delayMs ?? 0;
  const explicitYOffset = opts.yOffset ?? 0;

  // E3/31: autoOffset 跟 JS engine.js:759-762 同款 — 桶内 spawn 次数 ×16
  const bucket = `${Math.round(x / 40)}|${Math.round(y / 40)}`;
  const stackCount = _floatStacks.get(bucket) ?? 0;
  const autoOffset = stackCount * 16;
  _floatStacks.set(bucket, stackCount + 1);
  setTimeout(() => {
    const cur = _floatStacks.get(bucket) ?? 0;
    if (cur > 0) _floatStacks.set(bucket, cur - 1);
  }, delayMs + 600);

  // P25: pickRowOffset 是 poc 自创 auto-stack-by-cls 表 (JS 没有). JS 让 caller 显式传 yOffset.
  //   现在 row offset 只用于 fallback (caller 没传 yOffset 时给 cls 一个默认排序),
  //   有显式 yOffset 时跳过. 避免: ghostTouch 主物理 yOffset=0 被 row 自动加 44 错位.
  const rowDy = (opts.yOffset !== undefined) ? 0 : pickRowOffset(bucket, cls);
  const startY = y - rowDy;

  // ── 字号 按 amount 缩放 (JS engine.js:793-802) ──
  let amount = opts.amount ?? 0;
  if (!amount && typeof text === 'string') {
    const m = text.match(/\d+/);
    if (m) amount = parseInt(m[0], 10);
  }
  let baseSizePx: number;
  if (amount < 20) baseSizePx = 20;
  else if (amount < 60) baseSizePx = 20 + ((amount - 20) / 40) * 4;
  else if (amount < 400) baseSizePx = 24 + ((amount - 60) / 340) * 11;
  else baseSizePx = 35;
  const isCrit = cls.startsWith('crit');
  if (isCrit) baseSizePx *= 1.2;

  // E3/31: delayMs setTimeout 包整个 spawn (JS engine.js:776 同款)
  scene.time.delayedCall(delayMs, () => {
    // SFX + visual 一起 fire (JS:777)
    fireSfxForCls(scene, cls);

    // E3/29: DOM overlay — JS battle.css .floating-num 同款 (font-weight:900 + 8 向描边)
    const el = document.createElement('div');
    el.className = `floating-num ${cls}`;
    // E3/31: innerHTML 支持 (JS engine.js:786 — 含 <img> 等 HTML 走 innerHTML)
    if (typeof text === 'string' && text.includes('<')) el.innerHTML = text;
    else el.textContent = text;
    el.style.fontSize = `${baseSizePx.toFixed(2)}px`;
    const t = scene.add.dom(x, startY, el).setOrigin(0.5).setDepth(50).setScale(0);
    runFloatAnim(scene, t, x, startY, cls, isCrit, amount, opts, explicitYOffset, autoOffset);
  });
}

// E3/31: 抽出动画 helper (原本 inline, 现在 delayedCall 调用)
function runFloatAnim(
  scene: Phaser.Scene,
  t: Phaser.GameObjects.DOMElement,
  x: number, startY: number,
  cls: FloatCls,
  isCrit: boolean,
  amount: number,
  opts: { atkSide?: 'left' | 'right' },
  explicitYOffset: number,
  autoOffset: number,
): void {

  // ── isDmg 检测 — 1:1 JS engine.js:807 ──
  // JS: (cls.includes('dmg') || cls.includes('pierce') || cls.includes('crit-magic') || cls.includes('crit-true')) && cls !== 'shield-dmg'
  // 排除 shield-dmg / dot-dmg / counter-dmg / death-explode (这些走 label fade up)
  const isDmg = (
    (cls.includes('dmg') || cls.includes('pierce') || cls === 'crit-magic' || cls === 'crit-true' || cls === 'crit')
    && cls !== 'shield-dmg'
    && cls !== 'dot-dmg'
    && cls !== 'counter-dmg'
    && cls !== 'death-explode'
  );
  if (!isDmg) {
    // 治疗 / 护盾 / 状态: 简单上飞 1500ms (JS engine.js:872-905)
    // E3/31: y0 = -(15 + yOffset + autoOffset) — JS:874 同款公式
    const labelStartY = startY - 15 - explicitYOffset - autoOffset;
    t.setPosition(x, labelStartY);
    scene.tweens.add({ targets: t, scale: 1.2, duration: 100 });
    scene.tweens.add({
      targets: t,
      y: labelStartY - 50,
      alpha: 0,
      duration: 1500,
      delay: 100,
      ease: 'sine.out',
      onComplete: () => t.destroy(),
    });
    return;
  }

  // ── DAMAGE: pop → hold → parabolic flight ──
  // E3/31: y0 = -(yOffset || 0) — JS engine.js:818 同款 (autoOffset 不参与 damage 路径)
  const dmgStartY = startY - explicitYOffset;
  // 跳跃方向 (远离 attacker)
  const dir = opts.atkSide === 'right' ? -1 : 1;
  const jumpX = dir * (12 + Math.random() * 14);
  const jumpY = isCrit ? -(10 + Math.random() * 8) : -(22 + Math.random() * 10);
  const gravity = 200;

  // size 因子: amount 越大 popSize 越大 (JS:843)
  const popSize = amount < 20 ? 1.6 : amount < 60 ? 1.8 : amount < 150 ? 2.2 : 2.5;
  const holdScale = isCrit ? 1.0 : 0.7;
  const holdEnd = isCrit ? 400 : 150;  // crit 锁 250ms 多, 普通立即起飞
  const flightDur = 650;
  const totalDur = holdEnd + flightDur;

  const startTime = performance.now();
  const fadeStart = holdEnd + 300;

  // 用 manual updater (Phaser scene event), 因为 tween 不容易做 pop+hold+arc 链
  const update = () => {
    const elapsed = performance.now() - startTime;
    if (elapsed >= totalDur || !t.active) {
      t.destroy();
      scene.events.off(Phaser.Scenes.Events.UPDATE, update);
      return;
    }
    // Scale: 0-50ms pop, 50-150ms shrink, then hold
    let sc: number;
    if (elapsed < 50) sc = (elapsed / 50) * popSize;
    else if (elapsed < 150) sc = popSize - (popSize - holdScale) * ((elapsed - 50) / 100);
    else sc = holdScale;
    // Position: held till holdEnd, then parabolic
    const flightElapsed = Math.max(0, elapsed - holdEnd);
    const ft = flightElapsed / 1000;
    const px = jumpX * ft * 2;
    const py = jumpY * ft * 2 + 0.5 * gravity * ft * ft;
    t.setScale(sc);
    t.setPosition(x + px, dmgStartY + py);
    // Fade: last 350ms
    const op = elapsed < fadeStart ? 1 : Math.max(0, 1 - (elapsed - fadeStart) / (totalDur - fadeStart));
    t.setAlpha(op);
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
}
