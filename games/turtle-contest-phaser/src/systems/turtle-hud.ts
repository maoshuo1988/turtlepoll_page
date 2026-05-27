// ══════════════════════════════════════════════════════════
// turtle-hud.ts — Phaser-native per-fighter HUD (HP bar / status / equips / level)
// ══════════════════════════════════════════════════════════
// 取代 scene-turtle-dom.ts (SceneTurtleDom) 的 DOM overlay 实现。
//
// 为什么改 Phaser-native:
//   DOM overlay 活在 Phaser scene graph 之外 → 主相机 zoom/pan/shake 不影响它
//   (zoom 时血条与 sprite 脱节), 且场景切换时 DOM 元素泄漏。本类用 Container 加进
//   scene, 相机的所有 transform 自动作用 → 不需要 getBoundingClientRect / 屏幕换算 /
//   相机数学 / window resize 监听。每帧定位只是 container.setPosition(spriteX, spriteY)。
//
// 公开 API 与 SceneTurtleDom 1:1 (BattleScene 调用点几乎不变):
//   constructor(scene, { fighter, side, isAlly, spriteX, spriteY })
//   update(): void          — 从 fighter 当前状态刷新所有视觉
//   setCanvasPos(x, y): void — 重新定位 (现在只是 container.setPosition)
//   destroy(): void
//   setVisible(v): void
//
// 像素风: 粗黑边框 (2-3px) + 分段刻度 + 硬边 (无抗锯齿圆角), 与像素龟一致。
// HP 条用 Graphics 画 frame+fill, level/chip 文字用 m6x11 像素字体。
//
// 字段对照见 scene-turtle-dom.ts 顶部注释 (本类逐项复刻其行为)。
import Phaser from 'phaser';
import type { Fighter } from '../types';
import { getEquipStatLine } from './equip-stats';
import { smallIconKey } from './icon-scale';

// ── buff type → 已预加载的 status 图标 texture key (BootScene.ts:160-162) ──
//   注意 BootScene 烤的 key 形如 `status-burn` / `status-curse-debuff` / `status-heal-reduce`
const STATUS_TEX_KEY: Record<string, string> = {
  burn: 'status-burn',
  poison: 'status-poison',
  bleed: 'status-bleed',
  curse: 'status-curse-debuff',
  stun: 'status-stun',
  chilled: 'status-chilled',
  shield: 'status-shield',
  dodge: 'status-dodge',
  taunt: 'status-taunt',
  fear: 'status-fear',
  reflect: 'status-reflect',
  stealth: 'status-stealth',
  healReduce: 'status-heal-reduce',
};

// ── emoji/文字 chip (无图标的 buff) — 1:1 scene-turtle-dom.ts CHIP_LABEL ──
// P186 去自创: JS renderSceneBuffs (ui.js:325-356) + renderStatusIcons (1224-1259)
//   只渲染下列 buff 的图标/chip. critUp / armorPen / armorBreak 两条 JS 路径都不画
//   (它们是真 buff 但 JS 无视觉指示) → 移除, 与 JS 实际渲染集 1:1.
const CHIP_LABEL: Record<string, { txt: string; color: string }> = {
  atkUp:     { txt: '⚔↑', color: '#ff9f43' },   // JS ⬆ (绿)
  atkDown:   { txt: '⚔↓', color: '#888888' },   // JS ⬇
  defUp:     { txt: '🛡↑', color: '#ffd93d' },   // JS ⬆
  defDown:   { txt: '🛡↓', color: '#888888' },   // JS ⬇
  mrUp:      { txt: '🔮↑', color: '#4dabf7' },   // JS ⬆
  mrDown:    { txt: '🔮↓', color: '#888888' },   // JS ⬇
  lifesteal: { txt: '❤吸', color: '#06d6a0' },   // JS stats/lifesteal-icon.png
  physImmune:{ txt: '虚化', color: '#c77dff' },   // JS status/stealth-icon.png
  redirectAll: { txt: '🛡嘲', color: '#ef4444' }, // JS taunt-icon + 🛡 (ui.js:1244)
  chiWaveActive: { txt: '💥', color: '#78c8ff' }, // JS 💥 (ui.js:1245)
};

// ── HP 双色渐变 (用上亮/下暗两带模拟 CSS linear-gradient) ──
const HP_ALLY_LIGHT = 0x3deb9e, HP_ALLY_DARK = 0x1fb57f;   // 我方绿
const HP_ENEMY_LIGHT = 0xc084fc, HP_ENEMY_DARK = 0x9d5be8; // 敌方紫
const DELAY_DMG_LIGHT = 0xff4d4d, DELAY_DMG_DARK = 0xc81e1e; // 受击红 trail
const SHIELD_COLOR = 0xf0f0f5;   // 白盾
const AURA_COLOR = 0xffd966;     // 金色气场盾
const BUBBLE_COLOR = 0x4cc9f0;   // 青泡盾
const ANEMONE_COLOR = 0xd96bff;  // 🪼海葵母寄生护盾 (紫粉)
const LEVEL_COLOR = '#ffd93d';

// 像素字体 (m6x11) — fallback monospace
const PX_FONT = 'm6x11, monospace';

/** 0xRRGGBB 颜色线性插值 (供血条逐行平滑渐变用) */
function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return ((Math.round(ar + (br - ar) * t) << 16)
        | (Math.round(ag + (bg - ag) * t) << 8)
        |  Math.round(ab + (bb - ab) * t));
}

interface TurtleHudBindings {
  fighter: Fighter;
  side: 'left' | 'right';
  spriteX: number;
  spriteY: number;
  isAlly: boolean;
}

export class TurtleHud {
  private scene: Phaser.Scene;
  private fighter: Fighter;
  private isAlly: boolean;
  private side: 'left' | 'right';
  private isBoss: boolean;

  private container: Phaser.GameObjects.Container;
  // HP 条层 (从下到上): frame(bg+border) → ticks → delay → hp fill → shield → aura → bubble → flash
  private barG: Phaser.GameObjects.Graphics;        // 静态: 投影+frame+槽底 (barMax 变才重画)
  private fillG: Phaser.GameObjects.Graphics;       // 每帧重画: hp/shield/aura/bubble fill
  private delayG: Phaser.GameObjects.Graphics;      // delay trail (受击红 / 回血绿)
  private flashG: Phaser.GameObjects.Graphics;      // 受击 60ms 高亮
  private tickG: Phaser.GameObjects.Graphics;       // P173: 刻度层 — 必须在 fill 之上 (否则被盖住)
  private levelText: Phaser.GameObjects.Text | null = null;
  // specialty bars
  private bubbleStoreG: Phaser.GameObjects.Graphics | null = null;
  private rageG: Phaser.GameObjects.Graphics | null = null;
  private energyG: Phaser.GameObjects.Graphics | null = null;
  // chest pile / status / equips
  private chestText: Phaser.GameObjects.Text | null = null;
  private statusObjs: Phaser.GameObjects.GameObject[] = [];
  private equipObjs: Phaser.GameObjects.GameObject[] = [];

  // 动画 / 重建状态
  private _lastHp = -1;
  private _lastBarMax = -1;
  private _delayTween: Phaser.Tweens.Tween | null = null;
  private _flashEvent: Phaser.Time.TimerEvent | null = null;
  private _trailFrac = -1;   // B4: 当前红色 delay-trail 宽度 frac (-1=无), 多端连击时从此处续动不跳变
  private _shakeX = 0;            // P179 命中时血条横向抖 (叠加在 setCanvasPos 的 sprite 跟随之上)

  // ── 尺寸 (boss 加宽加高, 1:1 scene.css:10-12) ──
  private readonly BAR_W: number;       // HP 条宽 (88 normal / 160 boss)
  private readonly BAR_H: number;       // HP 条高 (10 normal / 16 boss)
  private readonly BORDER: number;      // 边框粗细 (2 normal / 3 boss) — 像素风加粗
  private readonly LIFT: number;        // 容器锚点(sprite 中心) 到 HP 条底的上移量
  private readonly SPECIAL_H = 4;       // specialty bar 高
  private readonly CHIP_BOX: number;    // status/equip chip box 边长
  private readonly hasBubbleStore: boolean;
  private readonly hasLavaRage: boolean;
  private readonly hasStarEnergy: boolean;
  private readonly hasAuraAwaken: boolean;
  private readonly hasChestPile: boolean;

  constructor(scene: Phaser.Scene, b: TurtleHudBindings) {
    this.scene = scene;
    this.fighter = b.fighter;
    this.isAlly = b.isAlly;
    this.side = b.side;
    this.isBoss = !!(b.fighter as Fighter & { _isBoss?: boolean })._isBoss;

    // boss 尺寸 (scene.css:10-12); 像素风 border 比 DOM 的 1px 粗
    this.BAR_W = this.isBoss ? 160 : 88;
    this.BAR_H = this.isBoss ? 8 : 5;   // P171: 血条扁一半 (16→8 / 10→5, 用户要求"扁1倍")
    this.BORDER = this.isBoss ? 3 : 2;
    this.CHIP_BOX = 20;
    // sprite 中心上方: 跳过 sprite 上半身 (~SPRITE_HALF) 再留 margin。
    // DISPLAY_BOX = 80 * baseScale; baseScale = 0.9*1.417*(boss?1.5:1)。half ≈ box/2。
    const baseScale = this.isBoss ? 0.9 * 1.417 * 1.5 : 0.9 * 1.417;
    const spriteHalf = Math.floor((80 * baseScale) / 2);
    this.LIFT = spriteHalf + 10;   // 条底落在 sprite 顶上方 ~10px

    const f = b.fighter;
    const passT = (f.passive as { type?: string; energyStore?: unknown } | null);
    this.hasBubbleStore = passT?.type === 'bubbleStore';
    this.hasLavaRage = passT?.type === 'lavaRage';
    this.hasStarEnergy = passT?.type === 'starEnergy';
    this.hasAuraAwaken = passT?.type === 'auraAwaken' && !!passT?.energyStore;
    this.hasChestPile = passT?.type === 'chestTreasure';

    // ── 容器: 深度在 sprite(2)/canvas-hp(3-4.5)/statusGroup(6) 之上 ──
    this.container = scene.add.container(b.spriteX, b.spriteY).setDepth(7);

    // HP 条几何 (容器局部坐标): x 居中, y 在锚点上方 LIFT 处
    this.barG = scene.add.graphics();
    this.fillG = scene.add.graphics();
    this.delayG = scene.add.graphics();
    this.flashG = scene.add.graphics();
    this.tickG = scene.add.graphics();
    // 渲染顺序 (下→上): 投影/框/槽底 → delay 轨迹 → fill → flash → 刻度(最上, 压在 fill 上).
    this.container.add([this.barG, this.delayG, this.fillG, this.flashG, this.tickG]);

    // level badge (放 HP 条左侧)
    const lv = (f as Fighter & { _level?: number })._level;
    if (lv) {
      this.levelText = scene.add.text(0, 0, String(lv), {
        fontFamily: PX_FONT, fontSize: this.isBoss ? '13px' : '10px',
        color: LEVEL_COLOR, fontStyle: 'bold',
        backgroundColor: '#2a1d12',
        padding: { left: 3, right: 3, top: 1, bottom: 1 },
      }).setOrigin(1, 0.5).setResolution(2);
      this.container.add(this.levelText);
    }

    // specialty bars (条件创建)
    if (this.hasBubbleStore) { this.bubbleStoreG = scene.add.graphics(); this.container.add(this.bubbleStoreG); }
    if (this.hasLavaRage)   { this.rageG = scene.add.graphics(); this.container.add(this.rageG); }
    if (this.hasStarEnergy || this.hasAuraAwaken) { this.energyG = scene.add.graphics(); this.container.add(this.energyG); }

    // chest pile (龟身侧, 金币数)
    if (this.hasChestPile) {
      const cx = this.side === 'left' ? -(this.BAR_W / 2 + 8) : (this.BAR_W / 2 + 8);
      this.chestText = scene.add.text(cx, -this.LIFT + this.barTopLocalY() + this.BAR_H + 14, '0', {
        fontFamily: PX_FONT, fontSize: '12px', color: LEVEL_COLOR, fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(this.side === 'left' ? 1 : 0, 0.5).setResolution(2);
      this.container.add(this.chestText);
    }

    this.update();
  }

  // ── public API (1:1 SceneTurtleDom) ──

  /** 重新定位 — Phaser-native: 只设容器世界坐标, 相机自动 transform. (P179: 叠加命中抖 _shakeX) */
  setCanvasPos(canvasX: number, canvasY: number): void {
    this.container.setPosition(canvasX + this._shakeX, canvasY);
  }

  /** 每帧 / hp 变化时调 — 完整刷新 (HP/Shield/Aura/Bubble/Ticks/Status/Equips/Level/Chest/Specialty). */
  update(): void {
    const f = this.fighter;
    const fAny = f as Fighter & {
      bubbleShieldVal?: number; _auraShieldVal?: number; _lavaShieldVal?: number; _anemoneShield?: number;
    };
    const auraVal = (fAny._auraShieldVal ?? fAny._lavaShieldVal ?? 0);
    const bsVal = fAny.bubbleShieldVal ?? 0;
    const shieldVal = f.shield ?? 0;
    const anemVal = fAny._anemoneShield ?? 0;
    const totalEff = f.hp + shieldVal + auraVal + bsVal + anemVal;
    const barMax = Math.max(f.maxHp, totalEff);
    const hpFrac = barMax > 0 ? Math.max(0, f.hp / barMax) : 0;
    const shieldFrac = barMax > 0 ? shieldVal / barMax : 0;
    const auraFrac = barMax > 0 ? auraVal / barMax : 0;
    const bsFrac = barMax > 0 ? bsVal / barMax : 0;
    const anemFrac = barMax > 0 ? anemVal / barMax : 0;

    // frame + ticks 仅在 barMax 改变时重画 (省 draw call)
    if (barMax !== this._lastBarMax) {
      this._lastBarMax = barMax;
      this.drawFrame(barMax);
    }

    // 受击 / 回血 → delay trail + flash (1:1 ui.js:506-535)
    if (this._lastHp >= 0 && f.hp !== this._lastHp) {
      const oldFrac = barMax > 0 ? Math.max(0, this._lastHp / barMax) : 0;
      if (f.hp < this._lastHp) this.playDamageTrail(oldFrac, hpFrac);
      else if (f.hp > this._lastHp) this.playHealTrail(oldFrac, hpFrac);
    } else if (this._lastHp < 0) {
      // 首次: 不触发动画
      this.delayG.clear();
    }
    this._lastHp = f.hp;

    // hp + shield + aura + bubble + anemone fill (每帧重画)
    this.drawFills(hpFrac, shieldFrac, auraFrac, bsFrac, anemFrac);

    // level badge
    if (this.levelText) {
      const lv = (f as Fighter & { _level?: number })._level;
      this.levelText.setText(String(lv ?? 1));
    }

    // specialty bars
    this.drawSpecialtyBars();

    // chest pile
    if (this.chestText) {
      const treasure = (f as Fighter & { _chestTreasure?: number })._chestTreasure ?? 0;
      this.chestText.setText(String(treasure));
    }

    // status / equips
    this.refreshStatusIcons();
    this.refreshEquipBadges();
  }

  setVisible(v: boolean): void {
    this.container.setVisible(v);
  }

  /** P182 死亡时血条随 sprite 一起淡出 (killView 调). 淡完隐藏, 避免每帧 update 重新可见. */
  fadeOut(ms: number): void {
    this.scene.tweens.add({
      targets: this.container, alpha: 0, duration: ms, ease: 'power2',
      onComplete: () => this.container.setVisible(false),
    });
  }

  destroy(): void {
    this._delayTween?.remove();
    this._delayTween = null;
    this._flashEvent?.remove();
    this._flashEvent = null;
    this.clearChildren(this.statusObjs);
    this.clearChildren(this.equipObjs);
    this.container.destroy(true);   // 销毁容器 + 所有子对象
  }

  // ── 内部: 几何 helper ──

  /** HP 条顶在容器局部坐标的 y (相对容器锚点 = sprite 中心)。条底在 -LIFT, 条顶上移 BAR_H。 */
  private barTopLocalY(): number {
    return -this.LIFT - this.BAR_H;
  }
  /** HP 条左边在局部坐标 x (居中)。 */
  private barLeftLocalX(): number {
    return -this.BAR_W / 2;
  }

  // ── 内部: 绘制 ──

  /** 像素风 frame: 粗黑边框 + 暗底 + 分段刻度 (barMax 改变才调). */
  private drawFrame(barMax: number): void {
    const g = this.barG;
    g.clear();
    const x = this.barLeftLocalX();
    const y = this.barTopLocalY();
    const w = this.BAR_W, h = this.BAR_H, bd = this.BORDER;
    // P173 投影: 向下偏 2px 半透明黑, 让条与背景分离 (质感/可读性)
    g.fillStyle(0x000000, 0.4);
    g.fillRect(x - bd, y - bd + 2, w + bd * 2, h + bd * 2);
    // 粗黑外框 (硬边方块, 无圆角)
    g.fillStyle(0x0a0606, 1);
    g.fillRect(x - bd, y - bd, w + bd * 2, h + bd * 2);
    // 暗红血槽底 (1:1 .st-hp-bar bg)
    g.fillStyle(0x281010, 0.95);
    g.fillRect(x, y, w, h);
    // P179 玻璃管: 顶 1px 内高光 + 底 1px 暗线 (配合渐变填充+投影 → 圆润玻璃管质感)
    g.fillStyle(0xffffff, 0.22);
    g.fillRect(x, y, w, 1);                 // 顶内高光
    g.fillStyle(0x000000, 0.55);
    g.fillRect(x, y + h - 1, w, 1);         // 底内暗线

    // ── 分段刻度: 画在 tickG (在 fill 之上!), 否则被 fill 盖住 → 用户报"刻度没显示".
    //   1:1 旧 DOM buildSceneTickBg: major 500HP 全高 .6 黑 / minor 100HP 上半 .35 黑, 全局统一刻度.
    const t = this.tickG;
    t.clear();
    if (barMax > 0) {
      const minorStep = 100, majorStep = 500;
      const minorPx = (minorStep / barMax) * w;
      if (minorPx >= w * 0.02) {   // 太密不画 (DOM 阈值 minorPct<2% 等价)
        t.fillStyle(0x000000, 0.35);
        for (let v = minorStep; v < barMax; v += minorStep) {
          const tx = Math.round(x + (v / barMax) * w);
          t.fillRect(tx, y, 1, Math.max(2, Math.ceil(h / 2)));   // 上半 (薄条至少 2px)
        }
        t.fillStyle(0x000000, 0.6);
        for (let v = majorStep; v < barMax; v += majorStep) {
          const tx = Math.round(x + (v / barMax) * w);
          t.fillRect(tx, y, 1, h);                               // 全高
        }
      }
    }
    // 重新定位 level badge 到条左侧 (boss 高度变 → y 跟着变)
    if (this.levelText) {
      this.levelText.setPosition(x - 3, y + h / 2);
    }
  }

  /** hp/shield/aura/bubble/anemone fill — 每帧重画。fill 上亮下暗两带模拟渐变。 */
  private drawFills(hpFrac: number, shieldFrac: number, auraFrac: number, bsFrac: number, anemFrac = 0): void {
    const g = this.fillG;
    g.clear();
    const x = this.barLeftLocalX();
    const y = this.barTopLocalY();
    const w = this.BAR_W, h = this.BAR_H;
    const topH = Math.round(h * 0.42);   // 上带 (亮) ≈ CSS gradient 38-42% 分界
    const botH = h - topH;

    const hpW = w * hpFrac;
    const [light, dark] = this.isAlly ? [HP_ALLY_LIGHT, HP_ALLY_DARK] : [HP_ENEMY_LIGHT, HP_ENEMY_DARK];
    if (hpW > 0) this.fillBand(g, x, y, hpW, topH, botH, light, dark, 1);

    // shield (白) — 接在 hp 后
    let cursor = x + hpW;
    if (shieldFrac > 0) {
      const sw = w * shieldFrac;
      this.fillBand(g, cursor, y, sw, topH, botH, SHIELD_COLOR, 0xc8c8dc, 0.55);
      cursor += sw;
    }
    // aura (金) — 接在 shield 后
    if (auraFrac > 0) {
      const aw = w * auraFrac;
      this.fillBand(g, cursor, y, aw, topH, botH, AURA_COLOR, AURA_COLOR, 0.6);
      cursor += aw;
    }
    // bubble (青) — 接在 aura 后
    if (bsFrac > 0) {
      const bw = w * bsFrac;
      this.fillBand(g, cursor, y, bw, topH, botH, BUBBLE_COLOR, BUBBLE_COLOR, 0.55);
      cursor += bw;
    }
    // 🪼海葵母寄生护盾 (紫粉) — 接在最外侧, 让玩家看到攻击在扣寄生盾而非"没造成伤害"
    if (anemFrac > 0) {
      const nw = w * anemFrac;
      this.fillBand(g, cursor, y, nw, topH, botH, ANEMONE_COLOR, ANEMONE_COLOR, 0.7);
      cursor += nw;
    }
  }

  /** P171: Steam 风光泽条 — 顶部 1px 高光 + 逐行平滑竖向渐变 (light→dark), 取代旧"上亮下暗硬两带". */
  private fillBand(
    g: Phaser.GameObjects.Graphics, x: number, y: number, w: number,
    topH: number, botH: number, light: number, dark: number, alpha: number,
  ): void {
    if (w <= 0) return;
    const h = topH + botH;
    const gloss = lerpColor(light, 0xffffff, 0.55);   // 顶部光泽 (高光线)
    for (let r = 0; r < h; r++) {
      let c: number;
      if (r === 0 && h >= 3) {
        c = gloss;                                     // 第 1px = 亮高光
      } else {
        const t = h > 2 ? (r - 1) / (h - 2) : (h > 1 ? r / (h - 1) : 0);
        c = lerpColor(light, dark, Math.max(0, Math.min(1, t)));
      }
      g.fillStyle(c, alpha);
      g.fillRect(x, y + r, w, 1);
    }
  }

  /** 受击红 delay trail: oldFrac 宽 hold 200ms → 500ms 收缩到 hpFrac + 同时 fade. + 60ms flash. */
  private playDamageTrail(oldFrac: number, hpFrac: number): void {
    const x = this.barLeftLocalX();
    const y = this.barTopLocalY();
    const w = this.BAR_W, h = this.BAR_H;
    const topH = Math.round(h * 0.42), botH = h - topH;

    // P179 命中抖: 血条横向快速来回 (叠加在 setCanvasPos), ~180ms 后归 0
    this.scene.tweens.add({
      targets: this, _shakeX: 3, duration: 30, yoyo: true, repeat: 2,
      onComplete: () => { this._shakeX = 0; },
    });

    this._delayTween?.remove();
    // B4 多端连击平滑: 若上一条红影还在收缩(_trailFrac≥0), 新红影从它**当前可见位置**续起,
    //   而非重置回 oldFrac → 否则连续受击时红条会"跳回去再缩"看着乱。取 max 保证红条只向左收。
    const startFrac = this._trailFrac >= 0 ? Math.max(this._trailFrac, oldFrac) : oldFrac;
    const state = { frac: startFrac, alpha: 1 };
    this._trailFrac = startFrac;
    const redraw = () => {
      this._trailFrac = state.frac;
      this.delayG.clear();
      const dw = w * state.frac;
      if (dw > 0 && state.alpha > 0) {
        this.delayG.fillStyle(DELAY_DMG_LIGHT, state.alpha);
        this.delayG.fillRect(x, y, dw, topH);
        this.delayG.fillStyle(DELAY_DMG_DARK, state.alpha);
        this.delayG.fillRect(x, y + topH, dw, botH);
      }
    };
    redraw();
    // P175: 红影要"看得见地收缩"才像扣血. 旧版同时 fade alpha → 还没收缩完就透明了 = 看着像直直消失.
    //   改: 全程满不透明, 只把宽度从 startFrac 平滑退到 hpFrac (向左收), 退到位时正好被 hp fill 盖住消失.
    //   (参考 JS: width 先动、opacity 后淡; 这里红影退到 fill 边缘即不可见, 无需再单独 fade.)
    this._delayTween = this.scene.tweens.add({
      targets: state, frac: hpFrac,
      delay: 200, duration: 500, ease: 'Sine.easeOut',
      onUpdate: redraw,
      onComplete: () => { this.delayG.clear(); this._trailFrac = -1; },
    });

    // hit-flash: 60ms 白色高亮覆盖 hp fill (1:1 .hp-flash brightness×2)
    this._flashEvent?.remove();
    this.flashG.clear();
    const fw = w * hpFrac;
    if (fw > 0) {
      this.flashG.fillStyle(0xffffff, 0.6);
      this.flashG.fillRect(x, y, fw, h);
    }
    this._flashEvent = this.scene.time.delayedCall(60, () => this.flashG.clear());
  }

  /** P179 回血辉光: 在"新增血段" [oldFrac, hpFrac] 上叠亮绿辉光, 由亮→淡 (像血从断口涨出来发光).
   *  画在 flashG (在 fill 之上), 否则新增段已被 hp fill 覆盖看不见. */
  private playHealTrail(oldFrac: number, hpFrac: number): void {
    const x = this.barLeftLocalX();
    const y = this.barTopLocalY();
    const w = this.BAR_W, h = this.BAR_H;
    const gx = x + w * Math.min(oldFrac, hpFrac);
    const gw = w * Math.abs(hpFrac - oldFrac);

    this._delayTween?.remove();
    this.delayG.clear();
    this._trailFrac = -1;   // B4: 回血清掉残留红 delay-trail, 避免下次受击从陈旧 frac 续起
    const state = { alpha: 0.85 };
    const redraw = () => {
      this.flashG.clear();
      if (gw > 0 && state.alpha > 0) {
        this.flashG.fillStyle(0x9dffd0, state.alpha);   // 亮绿辉光
        this.flashG.fillRect(gx, y, gw, h);
      }
    };
    redraw();
    this._delayTween = this.scene.tweens.add({
      targets: state, alpha: 0,
      delay: 60, duration: 450, ease: 'Sine.easeOut',
      onUpdate: redraw,
      onComplete: () => { this.flashG.clear(); },
    });
  }

  /** specialty bars (bubbleStore / lavaRage / starEnergy|auraAwaken energy) — 条件渲染. */
  private drawSpecialtyBars(): void {
    const f = this.fighter;
    const x = this.barLeftLocalX();
    const w = this.BAR_W, h = this.SPECIAL_H;
    // 堆在 HP 条下方 (条底 = -LIFT), 每条间距 1px
    let row = -this.LIFT + 1;
    const drawBar = (g: Phaser.GameObjects.Graphics, frac: number, bgCol: number, fl: number, fr: number) => {
      g.clear();
      g.fillStyle(bgCol, 0.15);
      g.fillRect(x, row, w, h);
      const fw = w * Math.max(0, Math.min(1, frac));
      if (fw > 0) { g.fillStyle(fl, 0.6); g.fillRect(x, row, fw, h); void fr; }
      row += h + 1;
    };
    if (this.bubbleStoreG) {
      const store = (f as Fighter & { bubbleStore?: number }).bubbleStore ?? 0;
      drawBar(this.bubbleStoreG, store / Math.max(1, f.maxHp), BUBBLE_COLOR, BUBBLE_COLOR, BUBBLE_COLOR);
    }
    if (this.rageG) {
      const rage = (f as Fighter & { _lavaRage?: number })._lavaRage ?? 0;
      const max = (f.passive as { rageMax?: number } | null)?.rageMax ?? 100;
      drawBar(this.rageG, rage / Math.max(1, max), 0xff6400, 0xff3300, 0xff6600);
    }
    if (this.energyG) {
      const en = (f as Fighter & { _starEnergy?: number; _storedEnergy?: number })._starEnergy
              ?? (f as Fighter & { _storedEnergy?: number })._storedEnergy ?? 0;
      const cap = (f.passive as { maxChargePct?: number; energyMaxStorePct?: number } | null);
      const maxE = cap?.maxChargePct
        ? Math.round(f.maxHp * cap.maxChargePct / 100)
        : Math.round(f.maxHp * (cap?.energyMaxStorePct ?? 0.5));
      drawBar(this.energyG, en / Math.max(1, maxE), 0xffa500, 0xffcc00, 0xffa500);
    }
  }

  // ── 内部: status / equips chip 行 ──

  /** 状态 buff 图标/chip — 竖排, 龟外侧 (side-left → 左外, side-right → 右外).
   *  U3: BattleScene 的 statusGroup (头顶富渲染器, 含 buff + 充能/币/无人机/结晶/花色等特殊态)
   *  已启用可见 → 这里关闭, 避免 buff 图标双渲染。HP 条/装备图标仍由 turtle-hud 渲染。 */
  private refreshStatusIcons(): void {
    this.clearChildren(this.statusObjs);
    return;   // 见上: 交给 BattleScene.statusGroup 统一渲染
    const seen: Record<string, { value: number; duration: number }> = {};
    for (const bf of this.fighter.buffs) {
      const dur = bf.duration ?? 0;
      if (dur <= 0 && dur !== -1 && dur !== 999) continue;
      if (!seen[bf.type]) seen[bf.type] = { value: 0, duration: dur };
      seen[bf.type].value += bf.value ?? 0;
      seen[bf.type].duration = Math.max(seen[bf.type].duration, dur);
    }
    const types = Object.keys(seen);
    // status 在 HP 条对面侧: side-left → 左 (right:100%), side-right → 右. 竖排居中.
    const onLeft = this.side === 'left';
    const edgeX = onLeft ? (this.barLeftLocalX() - 6) : (this.barLeftLocalX() + this.BAR_W + 6);
    this.layoutChips(types.map(t => ({ type: t, isStatus: true })), edgeX, onLeft);
  }

  /** 装备图标/chip — 竖排, 龟外侧 (与 status 相反侧). */
  private refreshEquipBadges(): void {
    this.clearChildren(this.equipObjs);
    const equips = (this.fighter.equipment ?? []) as Array<{ id?: string; icon?: string; name?: string }>;
    const onLeft = this.side !== 'left';   // equips 在 status 对面
    const edgeX = onLeft ? (this.barLeftLocalX() - 6) : (this.barLeftLocalX() + this.BAR_W + 6);
    this.layoutEquips(equips, edgeX, onLeft);
  }

  /** 通用: 把一组 chip (status) 竖排布局到 edgeX (onLeft → 右对齐外扩, 否则左对齐). */
  private layoutChips(items: Array<{ type: string; isStatus: boolean }>, edgeX: number, onLeft: boolean): void {
    const box = this.CHIP_BOX, gap = 5;
    const total = items.length;
    const startY = -this.LIFT - this.BAR_H / 2 - ((total - 1) * (box + gap)) / 2;
    items.forEach((it, i) => {
      const cy = startY + i * (box + gap);
      const obj = this.makeChip(it.type, edgeX, cy, onLeft);
      if (obj) this.statusObjs.push(...obj);
    });
  }

  /** 单 status chip: 有图标用 Image (14×14 内嵌 20×20 暗框), 否则 emoji/文字 chip. */
  private makeChip(type: string, edgeX: number, cy: number, onLeft: boolean): Phaser.GameObjects.GameObject[] | null {
    const out: Phaser.GameObjects.GameObject[] = [];
    const texKey = STATUS_TEX_KEY[type];
    const box = this.CHIP_BOX;
    // chip box 中心 x: onLeft → box 在 edgeX 左侧, 否则右侧
    const cx = onLeft ? edgeX - box / 2 : edgeX + box / 2;
    if (texKey && this.scene.textures.exists(texKey)) {
      // 暗框背景
      const bg = this.scene.add.rectangle(cx, cy, box, box, 0x080c14, 0.78)
        .setStrokeStyle(1, 0xffffff, 0.18);
      const img = this.scene.add.image(cx, cy, texKey).setDisplaySize(14, 14);
      try { img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
      this.container.add([bg, img]);
      out.push(bg, img);
      return out;
    }
    const chip = CHIP_LABEL[type];
    if (chip) {
      const t = this.scene.add.text(cx, cy, chip.txt, {
        fontFamily: PX_FONT, fontSize: '9px', color: chip.color, fontStyle: 'bold',
        backgroundColor: 'rgba(0,0,0,0.65)', padding: { left: 2, right: 2, top: 1, bottom: 1 },
      }).setOrigin(0.5).setResolution(2);
      this.container.add(t);
      out.push(t);
      return out;
    }
    return null;
  }

  /** 装备 chip 布局 (含 e_incubator 进度+等级 / e_stun_baton 层数 / e_bamboo_leaf 充能). */
  private layoutEquips(
    equips: Array<{ id?: string; icon?: string; name?: string }>, edgeX: number, onLeft: boolean,
  ): void {
    const box = this.CHIP_BOX, gap = 5;
    const valid = equips.filter(Boolean);
    const total = valid.length;
    const startY = -this.LIFT - this.BAR_H / 2 - ((total - 1) * (box + gap)) / 2;
    const fAny = this.fighter as Fighter & Record<string, unknown>;
    valid.forEach((eq, i) => {
      const cy = startY + i * (box + gap);
      const cx = onLeft ? edgeX - box / 2 : edgeX + box / 2;
      const texKey = eq.id ? `equip-${eq.id}` : '';
      const statLine = eq.id ? getEquipStatLine(eq.id, this.fighter) : '';
      const bg = this.scene.add.rectangle(cx, cy, box, box, 0x080c14, 0.78)
        .setStrokeStyle(1, 0xffffff, 0.18);
      this.container.add(bg);
      this.equipObjs.push(bg);
      if (texKey && this.scene.textures.exists(texKey)) {
        // 去糊: 大源图标降采样缓存 (NEAREST 对大源缩小反而锯齿, 改高质量降采样)
        const img = this.scene.add.image(cx, cy, smallIconKey(this.scene, texKey, 40)).setDisplaySize(14, 14);
        if (statLine) img.setData('tooltip', statLine);
        this.container.add(img);
        this.equipObjs.push(img);
      } else {
        // 无 png → emoji/文字 fallback
        const t = this.scene.add.text(cx, cy, eq.icon ?? '?', {
          fontFamily: PX_FONT, fontSize: '12px', color: '#ffffff',
        }).setOrigin(0.5).setResolution(2);
        this.container.add(t);
        this.equipObjs.push(t);
      }
      // 装备特有 sub-indicator
      this.addEquipSubIndicator(eq.id, fAny, cx, cy, box);
    });
  }

  /** 装备 sub-progress / 临时等级 / 充能 indicator (1:1 refreshEquipBadges 特例). */
  private addEquipSubIndicator(
    id: string | undefined, fAny: Fighter & Record<string, unknown>,
    cx: number, cy: number, box: number,
  ): void {
    if (id === 'e_incubator') {
      const prog = (fAny._incubatorProgress as number) ?? 0;
      const lv = (fAny._incubatorTempLevel as number) ?? 0;
      // 进度条 (icon 下方)
      const pw = 18, ph = 3, py = cy + box / 2 + 2;
      const g = this.scene.add.graphics();
      g.fillStyle(0xffffff, 0.12); g.fillRect(cx - pw / 2, py, pw, ph);
      g.fillStyle(0xffd86b, 1); g.fillRect(cx - pw / 2, py, pw * Math.min(1, prog / 100), ph);
      this.container.add(g);
      this.equipObjs.push(g);
      if (lv > 0) {
        const lvT = this.scene.add.text(cx + box / 2 - 1, cy + box / 2 - 1, `+${lv}`, {
          fontFamily: PX_FONT, fontSize: '8px', color: '#ffd86b', stroke: '#000000', strokeThickness: 2,
        }).setOrigin(1, 1).setResolution(2);
        this.container.add(lvT);
        this.equipObjs.push(lvT);
      }
    } else if (id === 'e_stun_baton') {
      const stacks = (fAny._stunBatonStacks as number) ?? 0;
      if (stacks > 0) {
        const t = this.scene.add.text(cx + box / 2 - 1, cy + box / 2 - 1, String(stacks), {
          fontFamily: PX_FONT, fontSize: '8px', color: '#ffd86b', stroke: '#000000', strokeThickness: 2,
        }).setOrigin(1, 1).setResolution(2);
        this.container.add(t);
        this.equipObjs.push(t);
      }
    } else if (id === 'e_bamboo_leaf') {
      const charge = (fAny._bambooLeafCharge as number) ?? 0;
      if (charge > 0) {
        const t = this.scene.add.text(cx + box / 2 - 1, cy + box / 2 - 1, '✓', {
          fontFamily: PX_FONT, fontSize: '8px', color: '#7dffb3', stroke: '#000000', strokeThickness: 2,
        }).setOrigin(1, 1).setResolution(2);
        this.container.add(t);
        this.equipObjs.push(t);
      }
    }
  }

  private clearChildren(arr: Phaser.GameObjects.GameObject[]): void {
    for (const o of arr) o.destroy();
    arr.length = 0;
  }
}
