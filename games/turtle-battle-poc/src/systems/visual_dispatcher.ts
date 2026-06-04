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
  'dot-dmg':      { color: '#4dabf7', size: '18px', stroke: '#000' },  // 灼烧=魔法蓝 (按伤害类型)
  'dot-poison':   { color: '#4dabf7', size: '18px', stroke: '#000' },  // 中毒=魔法蓝
  'dot-bleed':    { color: '#ff4444', size: '18px', stroke: '#000' },  // 流血=物理红
  'dot-curse':    { color: '#ffffff', size: '18px', stroke: '#000' },  // 诅咒=真伤白
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
  'dot-dmg':      4, 'dot-poison':   4, 'dot-bleed':    4, 'dot-curse':    4,
  'dodge-num':    4, 'miss':         4,
};
// 三色伤害类 (物理红 / 魔法蓝 / 真实·穿透白 + 各自暴击) — 这些走【按类型固定行】(FLOAT_ROW_BY_CLS),
//   保证 白>蓝>红 的垂直顺序稳定 (用户要求"白蓝红顺序")。其余 (dot/护盾/治疗/反伤/标签) 不在此集。
const DAMAGE_ROW_CLS = new Set<FloatCls>([
  'phys-dmg', 'direct-dmg', 'crit-dmg', 'crit',
  'magic-dmg', 'crit-magic',
  'true-dmg', 'crit-true', 'pierce-dmg', 'crit-pierce',
]);
// 行距 = 两种伤害(如 主伤红 row0 + 审判蓝 row1)的中心间距。数字 hold 态约 18-24px 高 (字号×0.7 + 8向描边),
// 14 太挤 → 用户报"两种伤害数字重叠"。22 是"贴近又不叠"的下限 (典型数字留 ~3-5px 缝); 暴击数字更大可能微叠, 罕见可接受。
const ROW_HEIGHT = 22;
const STACK_WINDOW_MS = 100;
const floatStacks = new Map<string, { count: number; expiresAt: number }>();

// 三色伤害「类型排序 + 压缩空行」(参考 LoL 跳字: 同瞬间多个数字按类型错开、不重叠也不留空):
//   call 时把本数字的类型 rank 登记进窗口集; render(delayedCall) 时再按【窗口集排序后该 rank 的索引】定位。
//   —— 延到 render 才算是关键: 同一簇里即使生成序是【降序】(如平等第3段先出白真伤、再触发蓝审判),
//      渲染时集合已含全部类型, 排序索引保证 红(rank0)→蓝(1)→白(2) 自下而上、相邻紧凑(缺某色不留空)、
//      同色同 rank 同行(靠各自上飞错开, 不叠梯子)。之前"按到达计数低于本 rank 的类型数"在降序时会算成 0 → 重叠。
const DMG_STACK_WINDOW_MS = 220;   // > 段内最大 delayMs(~160) 且 < 段间 sleep(~280): 同簇合并、跨段不混。
const damageRankWindows = new Map<string, { ranks: Set<number>; expiresAt: number }>();
function registerDamageRank(bucket: string, rank: number): void {
  const now = performance.now();
  let e = damageRankWindows.get(bucket);
  if (!e || e.expiresAt < now) { e = { ranks: new Set<number>(), expiresAt: now + DMG_STACK_WINDOW_MS }; damageRankWindows.set(bucket, e); }
  e.ranks.add(rank);
  e.expiresAt = now + DMG_STACK_WINDOW_MS;
}
function damageRowOffset(bucket: string, rank: number): number {
  const e = damageRankWindows.get(bucket);
  if (!e) return 0;
  const idx = [...e.ranks].sort((a, b) => a - b).indexOf(rank);
  return Math.max(0, idx) * ROW_HEIGHT;
}

function pickRowOffset(bucket: string): number {
  const now = performance.now();
  // 到达顺序紧凑堆叠: 同一处(bucket)同窗口内的飘字依次 0 / 22 / 44 … 各错开一个行高。
  //   既不重叠(间距 = ROW_HEIGHT 22, 数字 hold 高 ~18-24px), 又没有空行 ——
  //   旧版按 cls 固定行(红row0 / 蓝row1 / 白row2): 一次只出红+白时中间空着蓝行 → 上下差 44px,
  //   用户报"红白数字距离很远"。改紧凑堆叠后只差 22px。典型技能按"基础伤→附加真伤"顺序生成,
  //   故自然形成红/蓝在下、白真伤在上的观感。
  const entry = floatStacks.get(bucket);
  let n = 0;
  if (!entry || entry.expiresAt < now) {
    floatStacks.set(bucket, { count: 1, expiresAt: now + STACK_WINDOW_MS });
  } else {
    entry.count++;
    entry.expiresAt = now + STACK_WINDOW_MS;
    n = entry.count - 1;
  }
  return n * ROW_HEIGHT;
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
  //   含全部 DoT tick 类 (dot-poison/bleed/curse 不以 -dmg 结尾, 之前漏剥 → 中毒/流血/诅咒显示 -N 不一致)。
  if (text.startsWith('-') && ((cls.endsWith('-dmg') && cls !== 'shield-dmg') || cls.startsWith('crit') || cls.startsWith('dot-'))) {
    text = text.slice(1);
  }
  const delayMs = opts.delayMs ?? 0;
  let explicitYOffset = opts.yOffset ?? 0;

  // E3/31: autoOffset 跟 JS engine.js:759-762 同款 — 桶内 spawn 次数 ×16
  const bucket = `${Math.round(x / 40)}|${Math.round(y / 40)}`;
  const stackCount = _floatStacks.get(bucket) ?? 0;
  const autoOffset = stackCount * 16;
  _floatStacks.set(bucket, stackCount + 1);
  setTimeout(() => {
    const cur = _floatStacks.get(bucket) ?? 0;
    if (cur > 0) _floatStacks.set(bucket, cur - 1);
  }, delayMs + 600);

  // 伤害数字垂直顺序: 三色伤害(红/蓝/白)按【类型固定行】(FLOAT_ROW_BY_CLS): 红row0最下 / 蓝row1中 / 白row2最上,
  //   无论多段+sleep 的生成时序如何, 都稳定成 白>蓝>红 (用户要求"白蓝红顺序")。
  //   —— 旧版用到达顺序堆叠(pickRowOffset): 多段带 sleep>窗口 → 落到不同窗口各从 row0 起 → 顺序乱/重叠;
  //      且物理段显式传 yOffset:0 跳过堆叠 → 与审判/真伤的到达行错位。改类型固定行后一处统一。
  //   非三色伤害(治疗/护盾/dot/反伤/标签)维持原逻辑: caller 显式 yOffset 或到达堆叠。
  // 三色伤害: call 时登记类型 (render 时再算紧凑行索引, 见 registerDamageRank/damageRowOffset)。
  //   忽略 caller 的 yOffset — 物理段原传 yOffset:0 会绕过堆叠 → 与审判/真伤同落 row0 重叠 ("白蓝红没遵守"的根因)。
  const isDamageRow = DAMAGE_ROW_CLS.has(cls);
  const damageRank = isDamageRow ? (FLOAT_ROW_BY_CLS[cls] ?? 0) : -1;
  if (isDamageRow) { registerDamageRank(bucket, damageRank); explicitYOffset = 0; }
  // 非三色伤害的行偏移在 call 时定 (到达堆叠/显式 yOffset); 三色伤害的留到 render 时按窗口集算。
  const nonDmgRowDy = isDamageRow ? 0 : ((opts.yOffset !== undefined) ? 0 : pickRowOffset(bucket));

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
    // 行偏移: 三色伤害到 render 时才按窗口集算紧凑索引 (此刻同簇所有类型已登记 → 顺序正确, 见上注释)。
    const rowDy = isDamageRow ? damageRowOffset(bucket, damageRank) : nonDmgRowDy;
    const startY = y - rowDy;
    // SFX + visual 一起 fire (JS:777)
    fireSfxForCls(scene, cls);

    // E3/29: DOM overlay — JS battle.css .floating-num 同款 (font-weight:900 + 8 向描边)
    // 性能P0: 走对象池 acquireFloat (复用 DOMElement, 不每次 create). innerHTML 支持(含<img>)在内。
    const t = acquireFloat(scene, x, startY, cls, text, baseSizePx);
    runFloatAnim(scene, t, x, startY, cls, isCrit, amount, opts, explicitYOffset, autoOffset);
  });
}

// 性能P0 (PERF-PLAN B): 浮动伤害数字共享 ticker —
//   旧版每个伤害数字各 scene.events.on(UPDATE) 一个监听器, 多段/AOE 一次 20+ 个 = 20+ 个每帧回调 +
//   每帧逐个事件派发开销。改为【单一共享 ticker】遍历活跃数组, N 个监听器 → 1 个。
interface FloatAnim {
  t: Phaser.GameObjects.DOMElement;
  x: number; dmgStartY: number;
  jumpX: number; jumpY: number; gravity: number;
  popSize: number; holdScale: number; holdEnd: number;
  totalDur: number; fadeStart: number; startTime: number;
}
let _activeFloats: FloatAnim[] = [];
let _floatTickerScene: Phaser.Scene | null = null;
function ensureFloatTicker(scene: Phaser.Scene): void {
  if (_floatTickerScene === scene) return;
  _floatTickerScene = scene;
  _activeFloats = [];   // 新场景 → 重置 (旧场景残留 DOMElement 已随场景销毁)
  scene.events.on(Phaser.Scenes.Events.UPDATE, () => {
    if (!_activeFloats.length) return;
    const now = performance.now();
    for (let i = _activeFloats.length - 1; i >= 0; i--) {
      const f = _activeFloats[i];
      const elapsed = now - f.startTime;
      if (elapsed >= f.totalDur || !f.t.active) {
        releaseFloat(f.t);   // 性能P0: 回收进池, 不销毁
        _activeFloats.splice(i, 1);
        continue;
      }
      let sc: number;
      if (elapsed < 50) sc = (elapsed / 50) * f.popSize;
      else if (elapsed < 150) sc = f.popSize - (f.popSize - f.holdScale) * ((elapsed - 50) / 100);
      else sc = f.holdScale;
      const flightElapsed = Math.max(0, elapsed - f.holdEnd);
      const ft = flightElapsed / 1000;
      const px = f.jumpX * ft * 2;
      const py = f.jumpY * ft * 2 + 0.5 * f.gravity * ft * ft;
      f.t.setScale(sc);
      f.t.setPosition(f.x + px, f.dmgStartY + py);
      const op = elapsed < f.fadeStart ? 1 : Math.max(0, 1 - (elapsed - f.fadeStart) / (f.totalDur - f.fadeStart));
      f.t.setAlpha(op);
    }
  });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { _activeFloats = []; _floatTickerScene = null; });
}

// 性能P0 (PERF-PLAN B 另一半): 浮动数字 DOM 对象池 —
//   复用 DOMElement + div 节点, 不再每个数字 create/destroy (省 DOM 创建/GC churn)。
//   池随场景: 新场景重置 (旧 DOMElement 随场景销毁), shutdown 清空。
const FLOAT_POOL_MAX = 24;
let _floatPool: Phaser.GameObjects.DOMElement[] = [];
let _floatPoolScene: Phaser.Scene | null = null;
function ensureFloatPool(scene: Phaser.Scene): void {
  if (_floatPoolScene === scene) return;
  _floatPoolScene = scene;
  _floatPool = [];
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { _floatPool = []; _floatPoolScene = null; });
}
function acquireFloat(
  scene: Phaser.Scene, x: number, y: number, cls: string, text: string, fontSizePx: number,
): Phaser.GameObjects.DOMElement {
  ensureFloatPool(scene);
  const setContent = (el: HTMLDivElement) => {
    el.className = `floating-num ${cls}`;
    if (typeof text === 'string' && text.includes('<')) el.innerHTML = text;
    else el.textContent = text;
    el.style.fontSize = `${fontSizePx.toFixed(2)}px`;
  };
  let t = _floatPool.pop();
  while (t && !t.scene) t = _floatPool.pop();   // 跳过已随场景销毁的残留
  if (t && t.node) {
    setContent(t.node as HTMLDivElement);
    t.updateSize();   // 内容变了 → 重算尺寸, 保证 origin 0.5 居中正确
    t.setActive(true).setVisible(true).setOrigin(0.5).setDepth(50).setPosition(x, y).setScale(0).setAlpha(1);
    return t;
  }
  const el = document.createElement('div');
  setContent(el);
  return scene.add.dom(x, y, el).setOrigin(0.5).setDepth(50).setScale(0);
}
function releaseFloat(t: Phaser.GameObjects.DOMElement): void {
  if (t.scene && _floatPool.length < FLOAT_POOL_MAX) {
    t.setActive(false).setVisible(false).setAlpha(1).setScale(0);
    _floatPool.push(t);
  } else {
    t.destroy();
  }
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
  // 排除 shield-dmg / counter-dmg / death-explode (走 label fade up)。
  // dot-dmg(灼烧/中毒)改走伤害弹跳路径 — 用户要求"灼烧跳数字按魔法数字的规则跳"(pop+抛物, 参与行堆叠)。
  const isDmg = (
    (cls.includes('dmg') || cls.includes('pierce') || cls === 'crit-magic' || cls === 'crit-true' || cls === 'crit'
      || cls === 'dot-poison' || cls === 'dot-bleed' || cls === 'dot-curse')   // DoT tick 也走伤害弹跳 (灼烧 dot-dmg 已含 'dmg')
    && cls !== 'shield-dmg'
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
      onComplete: () => releaseFloat(t),   // 性能P0: 回收进池
    });
    return;
  }

  // ── DAMAGE: pop → hold → parabolic flight ──
  // E3/31: y0 = -(yOffset || 0) — JS engine.js:818 同款 (autoOffset 不参与 damage 路径)
  const dmgStartY = startY - explicitYOffset;
  // 跳跃方向: 按单位所在边 — 左半屏往左跳, 右半屏往右跳 (用户规则, 与 attacker 无关)。
  const dir = x < scene.scale.width / 2 ? -1 : 1;
  const jumpX = dir * (12 + Math.random() * 14);
  const jumpY = isCrit ? -(10 + Math.random() * 8) : -(22 + Math.random() * 10);
  const gravity = 200;

  // size 因子: amount 越大 popSize 越大 (JS:843)
  const popSize = amount < 20 ? 1.6 : amount < 60 ? 1.8 : amount < 150 ? 2.2 : 2.5;
  const holdScale = isCrit ? 1.0 : 0.7;
  const holdEnd = isCrit ? 400 : 150;  // crit 锁 250ms 多, 普通立即起飞
  const flightDur = 650;
  const totalDur = holdEnd + flightDur;

  const fadeStart = holdEnd + 300;

  // 性能P0: 入共享 ticker (单一 UPDATE 监听器遍历, 取代每数字一个监听器). pop+hold+抛物 数学不变。
  ensureFloatTicker(scene);
  _activeFloats.push({
    t, x, dmgStartY, jumpX, jumpY, gravity,
    popSize, holdScale, holdEnd, totalDur, fadeStart, startTime: performance.now(),
  });
}
