// ══════════════════════════════════════════════════════════
// DetailPanel — 战斗内 fighter 详情卡 DOM overlay 版
// 取代 BattleScene.showFighterDetail 的 Phaser-canvas 模糊版。
// 内容源自 JS ui.js:782-990 (showFighterDetail) — 名字+头像(稀有度色) /
//   HP 条(阵营色) / 8 项带 icon 属性 / 状态 buff 标签 / 被动(icon+名+brief+实时状态) /
//   装备被动 / 技能 / 装备格 6 槽。
// ── 改进点 (相对 JS) ──
//   1) buildHtml 拆成 buildHeader / buildHpAndStats / buildEquipSlots /
//      buildStatusHtml / buildPassiveHtml / buildSkills 私有方法, 易读。
//   2) 面板 **固定 920×600** (overflow:hidden), 任何龟 (空内容的小龟 / 内容爆满的宝箱龟)
//      都同尺寸; 内部 flex 列布局, 各区填满固定高度; brief 夹高 (max-height+clip),
//      展开的 detail 用内部滚动盒 (overflow:auto), 不撑大外框。
//   3) 装备格: 固定 6 槽 grid (2×3), 始终渲染 (空槽虚线), 取代旧 header inline icons。
//   4) 详细 ▾ / 简略 ▴ toggle: 每个主动技能卡 + 被动盒, 事件在 wireEvents() 里绑 (innerHTML 后)。
//   5) chestTreasure: brief 进度 + detail 三池 (基础/进阶/传说), 拥有项紫色高亮 (JS ui.js:877-916)。
//   6) 星能/怒气/泡泡/结晶/墨迹/储能/护甲/电击: 数字下加细进度条 (有 max 时)。
// 模式参照 ActionPanel.ts: installCss() 一次, root div append 到 body,
//   show()/hide()/isVisible()/destroy(), scene shutdown 清理, position:fixed, z-index 190。
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import type { Fighter, SkillDef, Buff } from '../types';
import { renderSkillTemplate, type SkillCtx } from '../systems/skill-text';
import { DEF_CONSTANT, PET_BY_ID } from '../data/pets';
import { EQUIP_BY_ID } from '../data/equipment';

// 稀有度 → 颜色 (JS pets.js:883 RARITY_COLORS 1:1)
const RARITY_COLORS: Record<string, string> = {
  C: '#06d6a0', B: '#4cc9f0', A: '#3a9abf', S: '#c77dff', SS: '#ffd93d', SSS: '#ff6b6b',
};

// passive type → icon (JS ui-anim.js:1-5 PASSIVE_ICONS 1:1; '.png' 走 <img>, 其余 emoji)
const PASSIVE_ICONS: Record<string, string> = {
  turnScaleAtk: '⚔️', turnScaleHp: '💗', bonusDmgAbove60: '🎯',
  lowHpCrit: '💢', deathExplode: '💥', deathHook: '🪝', shieldOnHit: 'status/shield-icon.png',
  healOnKill: '💚', counterAttack: '⚡', lavaRage: 'passive/lava-heart-icon.png',
  undeadRage: 'passive/undead-rage-icon.png', crystalResonance: 'passive/crystal-resonance-icon.png',
  bubbleStore: 'passive/bubble-store-icon.png', stoneWall: 'passive/stone-wall-icon.png',
  hunterKill: 'passive/hunter-kill-icon.png', ninjaInstinct: 'passive/ninja-instinct-icon.png',
  phoenixRebirth: 'passive/phoenix-rebirth-icon.png', lightningStorm: 'passive/lightning-storm-icon.png',
  fortuneGold: 'passive/fortune-gold-icon.png', twoHeadVitality: 'passive/two-head-icon.png',
  twoHeadDual: 'passive/two-head-icon.png', gamblerMultiHit: 'passive/gambler-multi-icon.png',
  summonAlly: 'passive/summon-ally-icon.png', cyberDrone: 'passive/cyber-drone-icon.png',
  judgement: 'passive/judgement-icon.png', frostAura: 'passive/frost-aura-icon.png',
  basicTurtle: 'passive/unyielding-icon.png', auraAwaken: 'passive/aura-awaken-icon.png',
  starEnergy: 'passive/star-energy-icon.png', inkMark: 'passive/ink-mark-icon.png',
  rainbowPrism: 'passive/rainbow-prism-icon.png', ghostCurse: 'passive/ghost-curse-icon.png',
  bambooCharge: 'passive/bamboo-charge-icon.png', diamondStructure: 'passive/diamond-structure-icon.png',
  gamblerBlood: 'passive/gambler-blood-icon.png', pirateBarrage: 'passive/pirate-plunder-icon.png',
  mechBody: 'passive/mech-form-icon.png', candySteal: 'passive/candy-steal-icon.png',
  chestTreasure: 'passive/chest-treasure-icon.png',
};

const EQUIP_SLOTS = 10;  // 固定 10 槽 (装备上限 10/10; 始终渲染, 保证 grid 恒定尺寸)
const EQUIP_COLS = 10;   // P214: 10 槽一横排

let cssInstalled = false;
function installCss() {
  if (cssInstalled) return;
  cssInstalled = true;
  const st = document.createElement('style');
  st.textContent = `
    /* veil z-index 必须高于所有战斗 DOM (出招面板 180 / 换龟 200 / 顶栏 40) →
       开详情时四周全被遮罩盖住, "面板周围不要有东西". */
    #poc-detail-veil {
      position: fixed; inset: 0; z-index: 9998;
      background: rgba(0,0,0,.9);
      backdrop-filter: blur(7px);
      opacity: 0; pointer-events: none;
      transition: opacity .2s;
      display: none;
    }
    #poc-detail-veil.show { opacity: 1; pointer-events: auto; display: block; }

    /* ── 面板: 设计基准 920×600 (内容多寡都同尺寸); overflow:hidden 永不滚 ──
       响应式: JS 在 show() 里按 fitScale=min(innerW/1280, innerH/720) 设
       transform: translate(-50%,-50%) scale(fitScale) — 跟 canvas Scale.FIT 同口径,
       任何分辨率下面板与画布等比缩放 (不再用 max-width/height vw/vh 夹钳). */
    #poc-detail-panel {
      position: fixed; left: 50%; top: 50%;
      transform: translate(-50%, -50%);
      z-index: 9999;
      width: 920px; height: 540px;
      overflow: hidden;                     /* CRITICAL: panel 本身永不滚动 */
      box-sizing: border-box;
      /* 游戏窗口质感 (P202 纯 CSS 升级): 顶部金色微光晕 + 深蓝渐变底 */
      background:
        radial-gradient(130% 80% at 50% -12%, rgba(255,217,61,.07), transparent 62%),
        linear-gradient(180deg, rgba(26,34,54,.985), rgba(11,15,27,.985));
      backdrop-filter: blur(6px);
      /* 金属金边框: 暗金底 border + 多层 inset box-shadow 叠出"亮金→暗金→黑槽"立体斜面;
         最外层按稀有度发光 (--fdp-glow, show() 里按 rarity 设). */
      border: 2px solid #5c4a1c;
      border-radius: 14px;
      box-shadow:
        inset 0 0 0 2px #ffe9a8,
        inset 0 0 0 4px #c79a36,
        inset 0 0 0 6px rgba(0,0,0,.55),
        inset 0 3px 18px rgba(0,0,0,.5),
        0 0 0 1px #241b0c,
        0 14px 48px rgba(0,0,0,.7),
        0 0 26px color-mix(in srgb, var(--fdp-glow, #ffd93d) 28%, transparent);
      padding: 15px 19px;
      font-family: 'm6x11', 'pixel-zh', 'Microsoft YaHei', system-ui;
      color: #e6edf3;
      opacity: 0; pointer-events: none;
      transition: opacity .18s ease, transform .22s cubic-bezier(.2,.85,.3,1.25);
      display: none;
      /* 列布局: header(自适应) → body(flex:1 填满) → 装备(自适应) → 技能(夹高) → hint */
      flex-direction: column;
    }
    #poc-detail-panel.show {
      opacity: 1; pointer-events: auto;
      display: flex;
    }
    /* 四角金铆钉 (纯 CSS): 一个 pseudo 用 4 个 radial-gradient 画 4 颗小金钉; 不挡点击 */
    #poc-detail-panel::after {
      content: ''; position: absolute; inset: 8px;
      pointer-events: none; z-index: 3; border-radius: 9px;
      background:
        radial-gradient(circle at 5px 5px,                         #ffe9a8 0 1.6px, #7d6320 2.1px 3px, transparent 3.6px),
        radial-gradient(circle at calc(100% - 5px) 5px,            #ffe9a8 0 1.6px, #7d6320 2.1px 3px, transparent 3.6px),
        radial-gradient(circle at 5px calc(100% - 5px),            #ffe9a8 0 1.6px, #7d6320 2.1px 3px, transparent 3.6px),
        radial-gradient(circle at calc(100% - 5px) calc(100% - 5px), #ffe9a8 0 1.6px, #7d6320 2.1px 3px, transparent 3.6px);
    }
    /* 名字/标签用像素美术字体 (跟游戏一致) */
    #poc-detail-panel .fdp-pixel { font-family: 'm6x11', 'pixel-zh', 'Microsoft YaHei', system-ui; }
    /* 长描述/技能正文回退到易读无衬线 (像素字渲染长中文段落不清晰) — 标题/标签/属性仍用像素字 */
    #poc-detail-panel .fdp-passive-brief,
    #poc-detail-panel .fdp-detail-box,
    #poc-detail-panel .fdp-passive-state,
    #poc-detail-panel .fdp-skill-brief,
    #poc-detail-panel .fdp-buff-tag,
    #poc-detail-panel .fdp-sub {
      font-family: 'Segoe UI', 'pixel-zh', 'Microsoft YaHei', system-ui, -apple-system, sans-serif;
    }

    /* ── 顶部 header ── */
    #poc-detail-panel .fdp-head {
      display: flex; align-items: center; gap: 12px;
      padding-bottom: 10px; margin-bottom: 10px;
      /* 渐变金色横幅下划线 (中间亮两端淡), 比朴素 1px 灰线更有"标题栏"感 */
      border-style: solid; border-width: 0 0 2px;
      border-image: linear-gradient(90deg, transparent, rgba(255,217,61,.7), transparent) 1;
      flex: 0 0 auto;
    }
    /* P210: 名字块 (左) + HP 条块 (顶上偏右) */
    #poc-detail-panel .fdp-head-id { min-width: 0; flex: 0 1 auto; }
    #poc-detail-panel .fdp-head-hp {
      flex: 0 0 auto; width: 520px; max-width: 54%; margin-left: auto;   /* P218: 收窄给右侧大号稀有度字让位 */
    }
    #poc-detail-panel .fdp-head-hp .fdp-hp-bar { margin-bottom: 0; }
    /* P19: C(稀有度) + 羁绊图标 一组, 放名字右边 / 血条左边 */
    #poc-detail-panel .fdp-head-badges {
      flex: 0 0 auto; display: flex; flex-direction: row; align-items: center;
      gap: 8px; margin: 0 14px;
    }
    /* P218: 大号稀有度字 (无框, 稀有度色) */
    #poc-detail-panel .fdp-head-rarity {
      flex: 0 0 auto; font-size: 28px; font-weight: 900; line-height: 1;
      font-family: 'Segoe UI', 'pixel-zh', 'Microsoft YaHei', system-ui, -apple-system, sans-serif;
      text-shadow: 0 1px 4px rgba(0,0,0,.7);
    }
    #poc-detail-panel .fdp-avatar {
      width: 52px; height: 52px; border-radius: 50%;
      object-fit: cover; flex: 0 0 auto;
      background: rgba(0,0,0,.3);
      /* 头像稀有度光环 (--fdp-glow): 黑描边 + 稀有色环 + 外发光 */
      box-shadow: 0 0 0 2px rgba(0,0,0,.6),
                  0 0 0 4px var(--fdp-glow, #ffd93d),
                  0 0 12px color-mix(in srgb, var(--fdp-glow, #ffd93d) 55%, transparent);
    }
    #poc-detail-panel .fdp-name {
      font-size: 22px; font-weight: 700; line-height: 1.1;
      font-family: 'm6x11', 'pixel-zh', 'Microsoft YaHei', system-ui;
    }
    /* 等级 — 放在名字前面; P218 与名字同号 (不再小一号), 仅颜色不同 */
    /* P219: 数字用矢量字 (m6x11 像素字在面板非整数缩放下发糊) */
    #poc-detail-panel .fdp-name .fdp-lv {
      font-weight: 700; color: #fff3a0; margin-right: 10px;
      font-family: 'Segoe UI', 'pixel-zh', 'Microsoft YaHei', system-ui, -apple-system, sans-serif;
    }
    #poc-detail-panel .fdp-meta {
      display: flex; align-items: center; gap: 7px; margin-top: 4px;
      font-size: 12px; font-family: 'm6x11', 'pixel-zh', 'Microsoft YaHei', system-ui;
    }
    /* P217: 稀有度做成小号描边 chip (颜色=稀有度色, 不再大块黑底), tag 同档小字 */
    #poc-detail-panel .fdp-badge {
      font-size: 11px; font-weight: 700; padding: 0 6px; border-radius: 4px;
      border: 1px solid currentColor; background: rgba(0,0,0,.25); line-height: 1.7;
    }
    #poc-detail-panel .fdp-tags { display: inline-flex; align-items: center; gap: 5px; }
    /* P218: 羁绊 tag 图标 (物理/守护… 一图一 tag), 按高缩放保持比例。v0.9.9 #5: 再×2 → 60px */
    #poc-detail-panel .fdp-tag-icon { height: 60px; width: auto; image-rendering: pixelated; vertical-align: middle; }

    /* ── 主体 2 列 — 自然高 (不撑满), 让所有区块顶部对齐, 留白统一收到底部 (hint margin-top:auto) ── */
    /* v0.9.9 #5: 属性区 / 状态区 = 1:3 (属性占左 1/4, 状态占右 3/4) — 用户要求 */
    #poc-detail-panel .fdp-cols {
      display: grid; grid-template-columns: 1fr 3fr; gap: 14px;
      align-items: start;
      flex: 0 1 auto; min-height: 0; overflow: visible;   /* P19 A9: 放开, 让属性 hover 小框不被裁 */
    }
    /* P19 A9: 属性列 overflow visible (hover tooltip 逃出裁切); 右列(状态/技能变长) 仍 hidden 防溢出面板 */
    #poc-detail-panel .fdp-col-left { min-width: 0; min-height: 0; overflow: visible; }
    #poc-detail-panel .fdp-col-right { min-width: 0; min-height: 0; overflow: hidden; }
    /* RPG 风格区块标题: 左侧 3px 金色竖条 (像 RPG header), 而非朴素 <h> */
    #poc-detail-panel .fdp-col-label {
      font-size: 13px; font-weight: 700; color: #ffd93d;
      margin: 0 0 6px; font-family: 'm6x11', 'pixel-zh', 'Microsoft YaHei', system-ui;
      padding-left: 8px; position: relative; letter-spacing: .5px;
      text-shadow: 0 1px 2px rgba(0,0,0,.6);
    }
    #poc-detail-panel .fdp-col-label::before {
      content: ''; position: absolute; left: 0; top: 1px; bottom: 1px;
      width: 3px; border-radius: 2px;
      background: linear-gradient(180deg, #ffe27a, #ffb01f);
    }

    /* HP 条 */
    #poc-detail-panel .fdp-hp-line {
      font-size: 13px; font-weight: 700; margin-bottom: 4px;
      display: flex; align-items: center; gap: 4px;
      font-family: 'Segoe UI', 'pixel-zh', 'Microsoft YaHei', system-ui, -apple-system, sans-serif;
    }
    #poc-detail-panel .fdp-hp-line img { width: 16px; height: 16px; image-rendering: pixelated; vertical-align: middle; flex: 0 0 auto; }
    #poc-detail-panel .fdp-hp-bar {
      position: relative; height: 16px; border-radius: 8px;
      background: rgba(0,0,0,.55); border: 1px solid #333;
      overflow: hidden; margin-bottom: 10px;
    }
    #poc-detail-panel .fdp-hp-fill { position: absolute; left: 0; top: 0; height: 100%; }
    #poc-detail-panel .fdp-shield-fill {
      position: absolute; top: 0; height: 100%;
      background: rgba(255,255,255,.55);
    }
    #poc-detail-panel .shield-val { color: rgba(255,255,255,.9); margin-left: 6px; }

    /* 8 项属性 — 2 子列×4 行 (单列会太高撞到装备区)。配合 fdp-stat-v 去右推, 数值紧贴图标。 */
    #poc-detail-panel .fdp-stats {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px 10px;
    }
    #poc-detail-panel .fdp-stat {
      display: flex; align-items: center; gap: 7px;
      font-size: 14px; line-height: 1.5; color: #e6edf3;
      font-family: 'Segoe UI', 'pixel-zh', 'Microsoft YaHei', system-ui, -apple-system, sans-serif;
      position: relative; cursor: default;
    }
    /* P19: hover 出小框 (data-tip), 鼠标离开消失 — 纯 CSS, 无 JS */
    #poc-detail-panel .fdp-stat:hover::after {
      content: attr(data-tip); position: absolute; left: 50%; bottom: 100%;
      transform: translateX(-50%); margin-bottom: 6px; white-space: nowrap;
      background: rgba(10,14,24,.97); color: #e6edf3; border: 1px solid #ffd86b;
      border-radius: 6px; padding: 4px 9px; font-size: 12px; font-weight: 700;
      box-shadow: 0 2px 10px rgba(0,0,0,.5); z-index: 50; pointer-events: none;
    }
    #poc-detail-panel .fdp-stat:hover::before {
      content: ''; position: absolute; left: 50%; bottom: 100%;
      transform: translateX(-50%); margin-bottom: 1px;
      border: 5px solid transparent; border-top-color: #ffd86b; z-index: 50; pointer-events: none;
    }
    /* 固定 22px 图标框 (object-fit:contain 保比例不拉伸) → 单列时数值左贴图标、彼此紧邻又纵向对齐 */
    #poc-detail-panel .fdp-stat .stat-icon {
      height: 18px; width: 22px; object-fit: contain; image-rendering: pixelated; flex: 0 0 auto;
    }
    #poc-detail-panel .fdp-stat .fdp-sub { color: #888; font-size: 11px; margin-left: 2px; }
    /* v0.9.9 #5: 数值紧跟图标 (去掉 margin-left:auto 的右推 → 修「图标和数字距离太远」) */
    #poc-detail-panel .fdp-stat-v { flex: 0 0 auto; font-weight: 700; margin-left: 4px; white-space: nowrap; }
    #poc-detail-panel .fdp-up   { color: #06d6a0; }
    #poc-detail-panel .fdp-down { color: #ff6b6b; }

    /* 状态 buff 标签 — 固定 max-height + wrap + clip (溢出 buff 剪裁, 不撑高) */
    #poc-detail-panel .fdp-buffs {
      display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px;
      max-height: 84px; overflow: hidden;
    }
    #poc-detail-panel .fdp-buff-tag {
      font-size: 11px; padding: 2px 6px; border-radius: 4px;
      border: 1px solid; line-height: 1.4;
      display: inline-flex; align-items: center; gap: 3px;
    }
    #poc-detail-panel .fdp-buff-tag img { width: 13px; height: 13px; vertical-align: middle; }
    #poc-detail-panel .fdp-none { color: #666; font-size: 11px; }

    /* 被动 — 整列内部可滚 (右列填满, 被动盒占剩余高度) */
    #poc-detail-panel .fdp-passive {
      background: rgba(199,125,255,.08);
      border: 2px solid rgba(199,125,255,.38);
      border-radius: 8px; padding: 8px 10px;
      box-shadow: inset 0 0 8px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06);
    }
    #poc-detail-panel .fdp-passive-title {
      font-size: 13px; font-weight: 700; color: #c77dff; margin-bottom: 4px;
      display: flex; align-items: center; gap: 5px;
    }
    #poc-detail-panel .fdp-passive-title img { width: 16px; height: 16px; }
    /* brief 夹高 (clip) — 防止长被动撑大面板; 详细文本走 .fdp-detail-box */
    #poc-detail-panel .fdp-passive-brief { font-size: 11px; color: #ccc; line-height: 1.55; max-height: 90px; overflow: hidden; }
    /* 展开的 detail 盒: 内部滚动 ONLY, 不撑大外框 */
    #poc-detail-panel .fdp-detail-box {
      font-size: 11px; color: #ccc; line-height: 1.55;
      max-height: 180px; overflow: auto; margin-top: 4px;
      padding-right: 4px;
    }
    #poc-detail-panel .fdp-detail-box img { vertical-align: middle; }
    #poc-detail-panel .fdp-passive-state {
      font-size: 11px; color: #bbb; line-height: 1.6; margin-top: 5px;
      padding-top: 5px; border-top: 1px dashed rgba(255,255,255,.12);
    }
    #poc-detail-panel .fdp-passive-state img { width: 13px; height: 13px; vertical-align: middle; }
    /* 实时状态进度条 (星能/怒气/结晶… cur/max) */
    #poc-detail-panel .fdp-meter {
      position: relative; height: 5px; border-radius: 3px; margin: 2px 0 4px;
      background: rgba(0,0,0,.5); border: 1px solid rgba(255,255,255,.12); overflow: hidden;
    }
    #poc-detail-panel .fdp-meter-fill { position: absolute; left: 0; top: 0; height: 100%; background: linear-gradient(90deg,#ffd93d,#ff9f43); }

    /* 详细 toggle (技能 + 被动通用) — P202 做成立体小金按钮 */
    #poc-detail-panel .fdp-toggle {
      display: inline-block; font-size: 11px; color: #ffe9a8;
      cursor: pointer; margin-top: 5px;
      padding: 2px 10px; border-radius: 6px;
      background: linear-gradient(180deg, rgba(255,217,61,.18), rgba(255,217,61,.05));
      border: 1px solid rgba(255,217,61,.4);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.18), 0 1px 2px rgba(0,0,0,.4);
    }
    #poc-detail-panel .fdp-toggle:hover {
      background: linear-gradient(180deg, rgba(255,217,61,.32), rgba(255,217,61,.12));
      color: #fff;
    }

    /* ── 装备格 + 状态 同行 (P200: 状态下放到装备右边) ──
       左 = 装备 grid (定宽 5 列), 右 = 状态标签 (flex 填满剩余宽); 上方一条全宽分隔线. */
    #poc-detail-panel .fdp-equip-status {
      display: flex; gap: 18px; align-items: flex-start;
      flex: 0 0 auto; margin-top: 10px; padding-top: 10px;
      border-top: 1px solid rgba(255,255,255,.1);
    }
    #poc-detail-panel .fdp-equip-col { flex: 0 0 auto; }
    #poc-detail-panel .fdp-status-col { flex: 1 1 0; min-width: 0; }
    /* ── 装备格: 固定 10 槽 grid (5 列 × 2 行); 仓库格质感 (beveled/inset) ── */
    #poc-detail-panel .fdp-equip-wrap {
      flex: 0 0 auto; margin-top: 10px; padding-top: 10px;   /* P211: 独占整宽, 自带分隔线 */
      border-top: 1px solid rgba(255,255,255,.1);
    }
    #poc-detail-panel .fdp-equip-grid {
      display: grid; grid-template-columns: repeat(${EQUIP_COLS}, 62px);   /* P211: 槽放大 48→62 */
      gap: 10px; margin-top: 8px;
    }
    #poc-detail-panel .fdp-slot {
      width: 62px; height: 62px; border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      position: relative; transition: background .15s, box-shadow .15s;
    }
    #poc-detail-panel .fdp-slot.filled {
      background: rgba(255,215,0,.16); border: 2px solid rgba(255,215,0,.55);
      box-shadow: inset 0 0 6px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.12);
      cursor: pointer;
    }
    #poc-detail-panel .fdp-slot.filled:hover {
      background: rgba(255,215,0,.3);
      box-shadow: inset 0 0 6px rgba(0,0,0,.4), 0 0 8px rgba(255,215,0,.35);
    }
    #poc-detail-panel .fdp-slot.empty {
      background: rgba(0,0,0,.28); border: 2px dashed rgba(255,255,255,.14);
      box-shadow: inset 0 0 6px rgba(0,0,0,.5);
    }
    #poc-detail-panel .fdp-slot img { width: 50px; height: 50px; image-rendering: pixelated; }
    #poc-detail-panel .fdp-slot .fdp-eq-emoji { font-size: 40px; line-height: 1; }

    /* 技能区 (整宽底部, 夹高: brief clip) */
    #poc-detail-panel .fdp-skills-wrap {
      flex: 0 0 auto; margin-top: 10px; padding-top: 10px;
      border-top: 1px solid rgba(255,255,255,.1);
      max-height: 162px; overflow: hidden;   /* P214: 技能区压缩 (图标 64) */
    }
    #poc-detail-panel .fdp-skills { display: flex; gap: 8px; flex-wrap: wrap; }
    #poc-detail-panel .fdp-skill {
      flex: 1 1 0; min-width: 140px;
      background: rgba(88,211,255,.06);
      border: 2px solid rgba(88,211,255,.32);
      border-radius: 8px; padding: 7px 10px;
      box-shadow: inset 0 0 8px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06);
    }
    #poc-detail-panel .fdp-skill-passive {
      background: rgba(255,255,255,.04);
      border-color: rgba(255,255,255,.2);
    }
    #poc-detail-panel .fdp-skill-header {
      font-size: 13px; font-weight: 700; margin-bottom: 3px;
      display: flex; align-items: center; gap: 6px;
      font-family: 'm6x11', 'pixel-zh', 'Microsoft YaHei', system-ui;
    }
    /* 技能图标 (P205): 名字左侧的小图, 仓库格质感; 也是后续 hold-to-reveal 的悬浮目标 */
    /* P211: 框只框图标 (金边 socket), tile 本身不再有框 (见 .fdp-skill-compact 覆盖) */
    #poc-detail-panel .fdp-skill-icon {
      width: 64px; height: 64px; flex: 0 0 auto;          /* P214: 压缩技能区 88→64 */
      image-rendering: pixelated; object-fit: cover;
      border-radius: 10px; background: rgba(0,0,0,.3);
      border: 2px solid rgba(255,217,61,.55);
      box-shadow: inset 0 0 7px rgba(0,0,0,.55), 0 2px 4px rgba(0,0,0,.45);
      cursor: pointer; transition: transform .12s, box-shadow .15s, border-color .15s;
    }
    #poc-detail-panel .fdp-skill-icon:hover {
      transform: scale(1.06); border-color: #ffe9a8;
      box-shadow: inset 0 0 8px rgba(0,0,0,.4), 0 0 13px rgba(255,217,61,.6);
    }
    /* 被动 tile 的 emoji 图标 (无 .png 时) — 同款金框, emoji 居中 */
    #poc-detail-panel .fdp-skill-icon-emoji {
      display: flex; align-items: center; justify-content: center; font-size: 38px; line-height: 1;
    }
    #poc-detail-panel .fdp-passive-tag { color: #c77dff; font-weight: 700; font-size: 11px; }
    /* P213: 强化原始被动的技能 — 被动图标 + 右上角 "+" 角标 */
    #poc-detail-panel .fdp-skill-iconwrap { position: relative; display: inline-flex; flex: 0 0 auto; }
    #poc-detail-panel .fdp-skill-plus {
      position: absolute; top: -5px; right: -5px;
      min-width: 22px; height: 22px; padding: 0 3px; box-sizing: border-box;
      border-radius: 11px; background: #06d6a0; color: #05382a;
      font-weight: 900; font-size: 17px; line-height: 19px;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid #0c1018; box-shadow: 0 1px 3px rgba(0,0,0,.55);
      pointer-events: none;
    }
    /* P208 技能卡: 大图标垂直居中 tile (图标 + 名 + CD); P211 去掉 tile 自身的框/底, 只框图标 */
    #poc-detail-panel .fdp-skill-compact {
      flex: 1 1 0; min-width: 0;
      /* P214: 顶对齐 → 图标高度一致 (不再按含文字的整体居中); 压缩内边距 */
      display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
      gap: 5px; padding: 4px 6px; text-align: center;
      background: none; border: none; box-shadow: none;
    }
    #poc-detail-panel .fdp-skill-compact .fdp-skill-name {
      font-size: 15px; font-weight: 700; max-width: 100%;
      font-family: 'm6x11', 'pixel-zh', 'Microsoft YaHei', system-ui;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    #poc-detail-panel .fdp-skill-compact .fdp-cd { margin: 0; }
    /* brief 夹高 (clip); 展开 detail 走 .fdp-detail-box (内部滚动) */
    #poc-detail-panel .fdp-skill-brief { font-size: 11px; color: #bbb; line-height: 1.5; max-height: 60px; overflow: hidden; }
    #poc-detail-panel .fdp-cd { font-size: 10px; color: #ff6b6b; font-weight: 700; margin-left: auto; }
    #poc-detail-panel .spc-passive-tag {
      font-size: 9px; background: rgba(255,255,255,.15); color: #ddd;
      padding: 0 4px; border-radius: 3px; font-weight: 400;
    }
    #poc-detail-panel .fdp-close-hint {
      flex: 0 0 auto; text-align: center; font-size: 10px; color: #666;
      margin-top: auto; padding-top: 8px;   /* 把所有留白收到底部, 内容顶部对齐 */
    }

    /* val-* 上色 span (跟 ActionPanel 同款, 给 renderSkillTemplate 输出用) */
    #poc-detail-panel .val-normal { color:#ff6b6b; font-weight:700 }
    #poc-detail-panel .val-magic  { color:#4dabf7; font-weight:700 }
    #poc-detail-panel .val-true,
    #poc-detail-panel .val-pierce { color:#fff; font-weight:700 }
    #poc-detail-panel .val-shield { color:rgba(255,255,255,.9); font-weight:700 }
    #poc-detail-panel .val-heal,
    #poc-detail-panel .val-lifesteal { color:#06d6a0; font-weight:700 }
    #poc-detail-panel .val-buff   { color:#7dffb3; font-weight:700 }
    #poc-detail-panel .val-atk    { color:#ff9f43; font-weight:700 }
    #poc-detail-panel .val-def    { color:#ffd93d; font-weight:700 }
    #poc-detail-panel .val-mr     { color:#4dabf7; font-weight:700 }
    #poc-detail-panel .val-extra  { color:#ffcc00; font-weight:700 }
    #poc-detail-panel .val-burn   { color:#ff6600; font-weight:700 }
    #poc-detail-panel .val-dot    { color:#9b59b6; font-weight:700 }
    #poc-detail-panel .val-crit   { color:#ff4757; font-weight:700 }
    #poc-detail-panel .val-crit-dmg { color:#ff6348; font-weight:700 }
    #poc-detail-panel .val-stun   { color:#ffee00; font-weight:700 }
    #poc-detail-panel .val-heal-reduce { color:#ff88aa; font-weight:700 }
    #poc-detail-panel .val-reflect { color:#e67e22; font-weight:700 }

    /* ── 装备格点击弹窗 (port JS .equip-detail-popup, ui.js:729-780) ──
       左图右文独立 modal, z-index 高于详情面板; 由 JS 按同一 fitScale 缩放 (inline transform). */
    #poc-equip-popup {
      position: fixed; left: 50%; top: 50%;
      transform: translate(-50%, -50%);
      z-index: 10000;
      width: 420px; box-sizing: border-box;
      background: linear-gradient(180deg, rgba(22,30,48,.98), rgba(13,18,32,.98));
      border: 3px solid #ffd766;
      border-radius: 10px;
      padding: 14px 16px;
      box-shadow: inset 0 0 0 2px rgba(0,0,0,.6), 0 12px 40px rgba(0,0,0,.6), 0 0 20px rgba(255,215,0,.25);
      backdrop-filter: blur(8px);
      font-family: 'm6x11', 'pixel-zh', 'Microsoft YaHei', system-ui;
      line-height: 1.6; color: #e6edf3;
      opacity: 0; pointer-events: none; display: none;
      transition: opacity .15s;
    }
    #poc-equip-popup.show { opacity: 1; pointer-events: auto; display: block; }
    #poc-equip-popup .edp-row { display: flex; gap: 14px; align-items: flex-start; }
    #poc-equip-popup .edp-icon {
      flex: 0 0 auto; width: 80px; height: 80px;
      background: rgba(255,215,0,.15);
      border: 2px solid rgba(255,215,0,.4); border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: inset 0 0 8px rgba(0,0,0,.5);
    }
    #poc-equip-popup .edp-icon img { width: 72px; height: 72px; image-rendering: pixelated; display: block; }
    #poc-equip-popup .edp-icon .edp-icon-emoji { font-size: 60px; line-height: 1; }
    #poc-equip-popup .edp-info { flex: 1; min-width: 0; }
    #poc-equip-popup .edp-title {
      font-weight: 700; color: #ffd766; font-size: 17px; margin-bottom: 8px;
      text-shadow: 0 1px 2px rgba(0,0,0,.6);
    }
    #poc-equip-popup .edp-body {
      color: #ddd; font-size: 13px; line-height: 1.6;
      font-family: 'Segoe UI', 'pixel-zh', 'Microsoft YaHei', system-ui, -apple-system, sans-serif;
    }

    /* ── P206 技能图 hold-to-reveal: 跟随鼠标的进度圈 (Steam 同款) + 单技能大卡 ── */
    #poc-skill-ring {
      position: fixed; z-index: 10002; pointer-events: none;
      width: 36px; height: 36px; transform: translate(-50%, -50%);
      opacity: 0; transition: opacity .12s; filter: drop-shadow(0 1px 3px rgba(0,0,0,.6));
    }
    #poc-skill-ring.show { opacity: 1; }
    #poc-skill-ring svg { display: block; transform: rotate(-90deg); }
    #poc-skill-ring .ring-bg { fill: rgba(0,0,0,.4); stroke: rgba(0,0,0,.5); stroke-width: 4; }
    #poc-skill-ring .ring-fg { fill: none; stroke: #ffd93d; stroke-width: 4; stroke-linecap: round; }

    #poc-skill-card {
      position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%);
      z-index: 10001; width: 470px; box-sizing: border-box;
      background: radial-gradient(130% 80% at 50% -12%, rgba(255,217,61,.07), transparent 62%),
                  linear-gradient(180deg, rgba(26,34,54,.99), rgba(11,15,27,.99));
      border: 2px solid #5c4a1c; border-radius: 14px;
      box-shadow: inset 0 0 0 2px #ffe9a8, inset 0 0 0 4px #c79a36, inset 0 0 0 6px rgba(0,0,0,.55),
                  0 16px 50px rgba(0,0,0,.7), 0 0 26px rgba(255,217,61,.3);
      padding: 18px 20px; color: #e6edf3;
      font-family: 'm6x11', 'pixel-zh', 'Microsoft YaHei', system-ui;
      opacity: 0; pointer-events: none; display: none;
      transition: opacity .15s, transform .22s cubic-bezier(.2,.85,.3,1.25);
    }
    #poc-skill-card.show { opacity: 1; pointer-events: auto; display: block; }
    #poc-skill-card .ssc-head {
      display: flex; align-items: center; gap: 13px;
      padding-bottom: 11px; margin-bottom: 11px;
      border-style: solid; border-width: 0 0 2px;
      border-image: linear-gradient(90deg, transparent, rgba(255,217,61,.7), transparent) 1;
    }
    #poc-skill-card .ssc-icon {
      width: 60px; height: 60px; flex: 0 0 auto; image-rendering: pixelated;
      border-radius: 9px; object-fit: cover; background: rgba(0,0,0,.35);
      border: 1px solid rgba(255,217,61,.55);
      box-shadow: inset 0 0 7px rgba(0,0,0,.5), 0 0 10px rgba(255,217,61,.25);
    }
    #poc-skill-card .ssc-name { font-size: 20px; font-weight: 700; color: #ffe9a8; line-height: 1.15; }
    #poc-skill-card .ssc-meta { font-size: 12px; color: #9aa0a8; margin-top: 4px; display: flex; gap: 10px; flex-wrap: wrap; }
    #poc-skill-card .ssc-cd { color: #ff8a8a; font-weight: 700; }
    #poc-skill-card .ssc-tag { color: #58d3ff; }
    #poc-skill-card .ssc-body {
      font-size: 13.5px; line-height: 1.75; color: #e2e8f0;
      font-family: 'Segoe UI', 'pixel-zh', 'Microsoft YaHei', system-ui, -apple-system, sans-serif;
      max-height: 50vh; overflow: auto;
    }
    /* P217 被动大卡的实时状态块 (护甲已叠加/星能/怒气… 含 .fdp-meter 条) */
    #poc-skill-card .ssc-pstate { font-size: 12.5px; color: #bbb; line-height: 1.7; margin-top: 10px; padding-top: 9px; border-top: 1px dashed rgba(255,255,255,.14); }
    #poc-skill-card .ssc-pstate img { width: 15px; height: 15px; vertical-align: middle; }
    #poc-skill-card .ssc-hint { text-align: center; font-size: 10px; color: #6b7280; margin-top: 13px; letter-spacing: .5px; }
    /* P207 大卡 详细/简略 toggle (立体小金按钮) */
    #poc-skill-card .ssc-toggle {
      display: inline-block; margin-top: 10px; font-size: 12px; color: #ffe9a8;
      cursor: pointer; padding: 3px 12px; border-radius: 6px;
      background: linear-gradient(180deg, rgba(255,217,61,.18), rgba(255,217,61,.05));
      border: 1px solid rgba(255,217,61,.4);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.18), 0 1px 2px rgba(0,0,0,.4);
    }
    #poc-skill-card .ssc-toggle:hover { background: linear-gradient(180deg, rgba(255,217,61,.32), rgba(255,217,61,.12)); color: #fff; }
    /* 双形态龟 (双头/火山) 详细视图: 当前技能详细下方追加另一形态配对技能 (图标 + 详细) */
    #poc-skill-card .ssc-paired {
      margin-top: 12px; padding-top: 11px; border-top: 1px dashed rgba(255,255,255,.16);
    }
    #poc-skill-card .ssc-paired-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    #poc-skill-card .ssc-paired-icon {
      width: 30px; height: 30px; flex: 0 0 auto; border-radius: 6px; object-fit: cover;
      background: rgba(0,0,0,.35); border: 1px solid rgba(255,255,255,.25);
    }
    #poc-skill-card .ssc-paired-label {
      font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 5px;
      background: rgba(255,255,255,.08); border: 1px solid currentColor;
    }
    #poc-skill-card .ssc-paired-name { font-size: 15px; font-weight: 700; color: #ffe9a8; }
    #poc-skill-card .ssc-paired-body { font-size: 13px; line-height: 1.7; color: #cdd3da; }
    /* 大卡内复用 skill-text 的 val-* 配色 (镜像 #poc-detail-panel 的口径) */
    #poc-skill-card .val-normal{color:#ff6b6b;font-weight:700}
    #poc-skill-card .val-magic,#poc-skill-card .val-mr{color:#4dabf7;font-weight:700}
    #poc-skill-card .val-true,#poc-skill-card .val-pierce{color:#fff;font-weight:700}
    #poc-skill-card .val-shield{color:rgba(255,255,255,.9);font-weight:700}
    #poc-skill-card .val-heal,#poc-skill-card .val-lifesteal{color:#06d6a0;font-weight:700}
    #poc-skill-card .val-buff{color:#7dffb3;font-weight:700}
    #poc-skill-card .val-atk{color:#ff9f43;font-weight:700}
    #poc-skill-card .val-def{color:#ffd93d;font-weight:700}
    #poc-skill-card .val-extra{color:#ffcc00;font-weight:700}
    #poc-skill-card .val-burn{color:#ff6600;font-weight:700}
    #poc-skill-card .val-dot{color:#9b59b6;font-weight:700}
    #poc-skill-card .val-crit{color:#ff4757;font-weight:700}
    #poc-skill-card .val-crit-dmg{color:#ff6348;font-weight:700}
    #poc-skill-card .val-stun{color:#ffee00;font-weight:700}
    #poc-skill-card .val-heal-reduce{color:#ff88aa;font-weight:700}
    #poc-skill-card .val-reflect{color:#e67e22;font-weight:700}
    /* P211 被动大卡复用 buildPassiveHtml — 把 .fdp-passive* / .fdp-meter / .fdp-toggle 也给 #poc-skill-card */
    #poc-skill-card .fdp-passive { background: rgba(199,125,255,.08); border: 2px solid rgba(199,125,255,.38); border-radius: 8px; padding: 11px 13px; box-shadow: inset 0 0 8px rgba(0,0,0,.4); }
    #poc-skill-card .fdp-passive-title { font-size: 16px; font-weight: 700; color: #c77dff; margin-bottom: 7px; display: flex; align-items: center; gap: 7px; }
    #poc-skill-card .fdp-passive-title img { width: 20px; height: 20px; }
    #poc-skill-card .fdp-passive-brief { font-size: 13.5px; color: #ddd; line-height: 1.65; font-family: 'Segoe UI','pixel-zh', 'Microsoft YaHei',system-ui,sans-serif; }
    #poc-skill-card .fdp-detail-box { font-size: 13.5px; color: #ddd; line-height: 1.65; max-height: 42vh; overflow: auto; margin-top: 5px; font-family: 'Segoe UI','pixel-zh', 'Microsoft YaHei',system-ui,sans-serif; }
    #poc-skill-card .fdp-detail-box img { vertical-align: middle; }
    #poc-skill-card .fdp-passive-state { font-size: 12.5px; color: #bbb; line-height: 1.6; margin-top: 7px; padding-top: 7px; border-top: 1px dashed rgba(255,255,255,.14); }
    #poc-skill-card .fdp-passive-state img { width: 15px; height: 15px; vertical-align: middle; }
    #poc-skill-card .fdp-meter { position: relative; height: 6px; border-radius: 3px; margin: 3px 0 5px; background: rgba(0,0,0,.5); border: 1px solid rgba(255,255,255,.12); overflow: hidden; }
    #poc-skill-card .fdp-meter-fill { position: absolute; left: 0; top: 0; height: 100%; background: linear-gradient(90deg,#ffd93d,#ff9f43); }
    #poc-skill-card .fdp-toggle { display: inline-block; font-size: 12px; color: #ffe9a8; cursor: pointer; margin-top: 9px; padding: 3px 12px; border-radius: 6px; background: linear-gradient(180deg, rgba(255,217,61,.18), rgba(255,217,61,.05)); border: 1px solid rgba(255,217,61,.4); }
    #poc-skill-card .fdp-toggle:hover { background: linear-gradient(180deg, rgba(255,217,61,.32), rgba(255,217,61,.12)); color: #fff; }
  `;
  document.head.appendChild(st);
}

// 头像 HTML (JS ui-anim.js:72-81 buildPetAvatarHTML — 但 poc 路径无 assets/ 前缀)
function avatarHtml(f: Fighter): string {
  const fAny = f as Fighter & { emoji?: string };
  const isCompanion = f.id.startsWith('pirateShip_')
    || ['crystal-ball', 'candy-bomb', 'conch-worm', 'mech'].includes(f.id);
  if (isCompanion) {
    return `<span class="fdp-avatar" style="display:inline-flex;align-items:center;justify-content:center;font-size:34px">${fAny.emoji || '?'}</span>`;
  }
  return `<img class="fdp-avatar" src="avatars/${f.id}.png" onerror="this.style.visibility='hidden'">`;
}

// passive icon → html (poc 路径无 assets/ 前缀)
function passiveIconHtml(type: string): string {
  const raw = PASSIVE_ICONS[type] || '⭐';
  return raw.endsWith('.png') ? `<img src="${raw}">` : raw;
}

// HTML attribute 转义 (name/desc 进 title=)
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 细进度条 (cur/max%); max<=0 时不渲染
function meterHtml(cur: number, max: number, color?: string): string {
  if (!(max > 0)) return '';
  const pct = Math.max(0, Math.min(100, cur / max * 100));
  const fillStyle = color ? `width:${pct}%;background:${color}` : `width:${pct}%`;
  return `<div class="fdp-meter"><div class="fdp-meter-fill" style="${fillStyle}"></div></div>`;
}

export class DetailPanel {
  private scene: Phaser.Scene;
  private root: HTMLDivElement | null = null;
  private veil: HTMLDivElement | null = null;
  /** 装备格点击弹窗 (port JS .equip-detail-popup) */
  private popup: HTMLDivElement | null = null;
  /** 当前正在展示的 fighter — BattleScene 用它做 toggle 判断 */
  currentFighter: Fighter | null = null;
  /** 技能区当前 tile 对应的 skill 列表 (f.skills + skillPool 里强化被动技能), openSkillCard 按 idx 取 */
  private _displayedSkills: Array<SkillDef & { icon?: string; cdLeft?: number; enhancesPassive?: boolean }> = [];
  private visible = false;
  private onClose: (() => void) | null = null;
  /** window resize → 重算 fitScale (面板/弹窗按 canvas Scale.FIT 同口径缩放) */
  private resizeHandler: () => void;
  /** popup 打开时的 capture-phase document 点击监听 (点外部/点其他龟 → 关) */
  private popupOutsideHandler: ((ev: MouseEvent) => void) | null = null;
  /** P206 技能图 hold-to-reveal: 跟随鼠标的进度圈 + 单技能大卡 */
  private skillRing: HTMLDivElement | null = null;
  private skillCard: HTMLDivElement | null = null;
  private ringTimer: number | null = null;          // 悬浮蓄力计时器 (满 → openSkillCard)
  private ringMoveHandler: ((ev: MouseEvent) => void) | null = null;  // 进度圈跟随鼠标
  private skillCardOutsideHandler: ((ev: MouseEvent) => void) | null = null;
  private static readonly RING_C = 94.248;           // 2π×15 (svg r=15)
  private static readonly HOLD_MS = 700;             // 悬浮蓄满时长

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    installCss();

    const veil = document.createElement('div');
    veil.id = 'poc-detail-veil';
    veil.addEventListener('pointerdown', () => {
      this.hide();
      this.onClose?.();
    });
    document.body.appendChild(veil);
    this.veil = veil;

    const root = document.createElement('div');
    root.id = 'poc-detail-panel';
    document.body.appendChild(root);
    this.root = root;

    // 装备格点击弹窗 (跟 veil/root 一样常驻 body, destroy 清理)
    const popup = document.createElement('div');
    popup.id = 'poc-equip-popup';
    document.body.appendChild(popup);
    this.popup = popup;

    // P206 鼠标进度圈 (SVG, dashoffset 蓄力) + 单技能大卡
    const ring = document.createElement('div');
    ring.id = 'poc-skill-ring';
    ring.innerHTML = `<svg width="36" height="36" viewBox="0 0 36 36">
      <circle class="ring-bg" cx="18" cy="18" r="15"></circle>
      <circle class="ring-fg" cx="18" cy="18" r="15"
        stroke-dasharray="${DetailPanel.RING_C}" stroke-dashoffset="${DetailPanel.RING_C}"></circle>
    </svg>`;
    document.body.appendChild(ring);
    this.skillRing = ring;

    const card = document.createElement('div');
    card.id = 'poc-skill-card';
    document.body.appendChild(card);
    this.skillCard = card;

    // P209 修点击穿透到 Phaser: DOM overlay 上的 pointer 事件若冒泡到 window, Phaser
    //   InputManager 会照样 hit-test canvas 精灵 (无视 DOM 层级) → 点面板/大卡会触发其后
    //   龟精灵 pointerdown → showFighterDetail → 重开/关面板 (用户报"点简略面板就关了").
    //   故在各 overlay 根拦下 pointer/mouse/touch 的 down/up, 不让其冒泡到 Phaser.
    const blockLeak = (el: HTMLElement) => {
      (['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend'] as const)
        .forEach(type => el.addEventListener(type, (e) => e.stopPropagation()));
    };
    blockLeak(veil); blockLeak(root); blockLeak(popup); blockLeak(card);

    // resize → 重算缩放 (仅在可见时生效, 隐藏时 no-op)
    this.resizeHandler = () => { if (this.visible) this.applyScale(); };
    window.addEventListener('resize', this.resizeHandler);

    scene.events.once('shutdown', () => this.destroy());
  }

  /** fitScale = min(innerW/1280, innerH/720) — 跟 canvas Phaser.Scale.FIT (1280×720) 同口径。
   *  面板设计基准 920×600 不变, 仅整体 scale(fitScale); 与居中 translate 合成内联 transform。 */
  private applyScale() {
    const fit = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    const t = `translate(-50%, -50%) scale(${fit})`;
    if (this.root) this.root.style.transform = t;
    if (this.popup) this.popup.style.transform = t;
    if (this.skillCard) this.skillCard.style.transform = t;
  }

  /** 显示 fighter 详情。isAlly 决定 HP 条颜色 (绿/紫)。onClose 在背景点击关闭时回调。 */
  show(f: Fighter, isAlly: boolean, onClose?: () => void) {
    if (!this.root || !this.veil) return;
    this.currentFighter = f;
    this.onClose = onClose ?? null;
    this.root.innerHTML = this.buildHtml(f, isAlly);
    this.wireEvents();           // innerHTML 后绑 .fdp-toggle 点击 + 装备格点击
    this.closeEquipPopup();      // 切龟时先关上一只的装备弹窗
    this.cancelSkillRing();
    this.closeSkillCard();       // 切龟时关上一只的技能大卡
    // P202 稀有度光晕色 (CSS var → 边框外发光 + 头像光环)
    this.root.style.setProperty('--fdp-glow', RARITY_COLORS[f.rarity] ?? '#ffd93d');
    this.veil.classList.add('show');
    this.root.classList.add('show');
    this.visible = true;
    // P202 入场弹出: 先 0.9×, 下一帧到全尺寸 → transform transition (轻微 overshoot) 形成 pop
    const fit = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    this.root.style.transform = `translate(-50%, -50%) scale(${fit * 0.9})`;
    requestAnimationFrame(() => { if (this.visible) this.applyScale(); });
  }

  /** 组装整卡 HTML — 各区拆成独立私有方法 (易读)。 */
  private buildHtml(f: Fighter, isAlly: boolean): string {
    let html = this.buildHeader(f, isAlly);
    // P211: 被动移到技能区 (tile) → 右列腾出给"状态"上移; 左列属性 / 右列状态
    html += `<div class="fdp-cols">`;
    html += `<div class="fdp-col-left">${this.buildStats(f)}</div>`;
    html += `<div class="fdp-col-right">${this.buildStatusHtml(f)}</div>`;
    html += `</div>`;            // end .fdp-cols
    html += this.buildEquipSlots(f);   // P211: 装备独占整宽 (状态上移, 空间多很多)
    html += this.buildSkills(f);       // 技能区: 被动 tile + 技能 tiles
    html += `<div class="fdp-close-hint">点击空白处关闭</div>`;
    return html;
  }

  /** 顶部 header: 头像 + 名字(Lv同号)/阵营/羁绊tag图 + HP条 + 大号稀有度字(右, 无框)。 */
  private buildHeader(f: Fighter, isAlly: boolean): string {
    const rarityColor = RARITY_COLORS[f.rarity] ?? '#fff';
    // P218: 羁绊 tag 用图标 (assets/tags/<tag>标签.png), 缺失则隐藏
    void isAlly;
    const tagImg = (tag: string) =>
      `<img class="fdp-tag-icon" src="tags/${tag}标签.png" alt="${tag}" title="${tag}" onerror="this.style.display='none'">`;
    // P19: 羁绊 tag 固定顺序 — 类型(物理/法术)在前, 其余按主列表; 防"物理守护"/"守护物理"不一致
    const TAG_ORDER = ['物理', '法术', '守护', '刺杀', '运气', '元素', '召唤', '再生', '换形', '财富'];
    const ord = (t: string) => { const i = TAG_ORDER.indexOf(t); return i < 0 ? 99 : i; };
    const sortedTags = [...(f.tags ?? [])].sort((a, b) => ord(a) - ord(b));
    const tagsHtml = sortedTags.map(tagImg).join('');
    // C2: 中立生物 (巨蟹/宝箱怪/海葵母) 不属于阵容体系 — 不显示稀有度 + 羁绊 tag, 只留等级。
    const isNeutral = !!(f as Fighter & { _isNeutral?: boolean })._isNeutral;
    const nameColor = isNeutral ? '#cfe3ff' : rarityColor;
    // P19: C(稀有度) + 羁绊图标 移到名字右边 / 血条左边 (fdp-head-badges); 去掉"敌方"文字
    return `<div class="fdp-head">
      ${avatarHtml(f)}
      <div class="fdp-head-id">
        <div class="fdp-name" style="color:${nameColor}"><span class="fdp-lv">Lv ${f._level}</span>${f.name}</div>
      </div>
      <div class="fdp-head-badges">
        ${isNeutral ? '<span class="fdp-head-rarity" style="color:#7ec8ff;font-size:14px">中立</span>'
          : `<span class="fdp-head-rarity" style="color:${rarityColor}">${f.rarity}</span>
        ${tagsHtml ? `<span class="fdp-tags">${tagsHtml}</span>` : ''}`}
      </div>
      <div class="fdp-head-hp">${this.buildHpBar(f, isAlly)}</div>
    </div>`;
  }

  /** HP 条 (阵营色) — P210 移到 header 右侧。 */
  private buildHpBar(f: Fighter, isAlly: boolean): string {
    const fx = f as Fighter & { _initHp?: number };
    const ic = (name: string) => `<img src="stats/${name}" class="stat-icon">`;
    const sc = (cur: number, init: number | undefined) =>
      init == null ? '' : cur > init ? 'fdp-up' : cur < init ? 'fdp-down' : '';
    const hpPct = Math.max(0, f.hp / f.maxHp * 100);
    const hpColor = isAlly
      ? 'linear-gradient(180deg,#3deb9e 40%,#089e6b 60%)'
      : 'linear-gradient(180deg,#c084fc 40%,#7c3aed 60%)';
    // P218 修护盾在满血时不显示: 盾段叠在血条右侧 (满血则压在血条右端上方, 不再宽度为0消失)
    const shieldW = f.shield > 0 ? Math.min(100, f.shield / f.maxHp * 100) : 0;
    const shieldLeft = Math.max(0, Math.min(hpPct, 100 - shieldW));
    // C4: 海葵母寄生护盾 — 紫粉色专属盾值, 面板可见 (与战斗内 HUD 紫盾条同口径)
    const anem = ((f as Fighter & { _anemoneShield?: number })._anemoneShield) ?? 0;
    return `<div class="fdp-hp-line">${ic('hp-icon.png')}<span class="${sc(f.maxHp, fx._initHp)}">HP ${Math.ceil(f.hp)}/${f.maxHp}</span>${f.shield > 0 ? `<span class="shield-val">${ic('shield-icon.png')}${Math.ceil(f.shield)}</span>` : ''}${anem > 0 ? `<span class="shield-val" style="color:#d96bff">🪼${Math.ceil(anem)}</span>` : ''}</div>
      <div class="fdp-hp-bar">
        <div class="fdp-hp-fill" style="width:${hpPct}%;background:${hpColor}"></div>
        ${f.shield > 0 ? `<div class="fdp-shield-fill" style="width:${shieldW}%;left:${shieldLeft}%"></div>` : ''}
        ${anem > 0 ? `<div class="fdp-shield-fill" style="width:${Math.min(100, anem / f.maxHp * 100)}%;left:0;background:#d96bff;opacity:.8"></div>` : ''}
      </div>`;
  }

  /** 8 项带 icon 属性 (JS ui.js:807-823 1:1)。P210: HP 移出后这块可以放大。 */
  private buildStats(f: Fighter): string {
    const fx = f as Fighter & {
      _initAtk?: number; _initDef?: number; _initMr?: number;
      _initCrit?: number; _initLifesteal?: number; _initArmorPen?: number; _initMagicPen?: number;
      _lifestealPct?: number; _extraCritDmg?: number; _extraCritDmgPerm?: number;
      _buffCritDmg?: number; lifestealPct?: number;
    };
    const ic = (name: string) => `<img src="stats/${name}" class="stat-icon">`;
    const sc = (cur: number, init: number | undefined) =>
      init == null ? '' : cur > init ? 'fdp-up' : cur < init ? 'fdp-down' : '';

    const defPct = Math.round(f.def / (f.def + DEF_CONSTANT) * 100);
    const mrV = f.mr || f.def;
    const mrPct = Math.round(mrV / (mrV + DEF_CONSTANT) * 100);
    const critPct = Math.min(100, Math.round((f.crit || 0) * 100));
    const overflowCrit = Math.max(0, (f.crit || 0) - 1.0);
    const overflowMult = ((f.passive as { overflowMult?: number } | null)?.overflowMult) || 1.5;
    // P219: 含 _buffCritDmg (龟派气波等 buff 爆伤, 与 damage.ts calcCritMult 读的同一字段),
    //   之前公式漏了它 → 龟派气波 +20% 爆伤在面板不显示。
    const critDmgPct = Math.round(
      (1.5 + (fx._extraCritDmg ?? 0) + (fx._extraCritDmgPerm ?? 0) + (fx._buffCritDmg ?? 0) + overflowCrit * overflowMult) * 100,
    );
    // P219: 生命偷取 = 装备/永久 (_lifestealPct, 百分点) + buff (lifestealPct, 小数, recalcStats 写入).
    //   之前只读 _lifestealPct → 龟派气波 +10% 生命偷取在面板不显示。两字段单位不同, buff 项 ×100 转百分点。
    const lifesteal = (fx._lifestealPct ?? 0) + Math.round((fx.lifestealPct ?? 0) * 100);

    // P19: 常规只显示 icon+数字; hover 出小框 (data-tip 全称=值)。护甲/魔抗 hover 额外显减免%。
    const row = (cls: string, icon: string, tip: string, val: string) =>
      `<div class="fdp-stat ${cls}" data-tip="${tip}">${ic(icon)}<span class="fdp-stat-v">${val}</span></div>`;
    return `<div class="fdp-stats">
        ${row(sc(f.atk, fx._initAtk), 'atk-icon.png', `攻击力 = ${f.atk}`, `${f.atk}`)}
        ${row(sc(lifesteal, fx._initLifesteal ?? 0), 'lifesteal-icon.png', `生命偷取 = ${lifesteal}%`, `${lifesteal}%`)}
        ${row(sc(f.def, fx._initDef), 'def-icon.png', `护甲 ${f.def} · 减免 ${defPct}%`, `${f.def}`)}
        ${row(sc(mrV, fx._initMr), 'mr-icon.png', `魔抗 ${mrV} · 减免 ${mrPct}%`, `${mrV}`)}
        ${row(sc(critPct, fx._initCrit != null ? Math.round(fx._initCrit * 100) : undefined), 'crit-icon.png', `暴击几率 = ${critPct}%`, `${critPct}%`)}
        ${row(sc(critDmgPct, 150), 'crit-dmg-icon.png', `暴击伤害倍率 = ${critDmgPct}%`, `${critDmgPct}%`)}
        ${row(sc(f.armorPen, fx._initArmorPen), 'armor-pen-icon.png', `护甲穿透 = ${f.armorPen || 0}`, `${f.armorPen || 0}`)}
        ${row(sc(f.magicPen, fx._initMagicPen), 'magic-pen-icon.png', `魔抗穿透 = ${f.magicPen || 0}`, `${f.magicPen || 0}`)}
      </div>`;
  }

  /** 装备格: 固定 10 槽 grid (始终渲染, 空槽虚线) — 取代旧 header inline icons。
   *  填充槽带 data-eq-* (id/name/icon), 点击 → wireEvents 里 openEquipPopup (左图右文)。 */
  private buildEquipSlots(f: Fighter): string {
    const fx = f as Fighter & {
      _equips?: Array<{ id?: string; name?: string; icon?: string; desc?: string }>;
    };
    const equips = fx._equips
      ?? (f.equipment ?? []).map(e => ({ id: e.id, name: e.name, icon: e.icon, desc: e.desc }));
    let cells = '';
    for (let i = 0; i < EQUIP_SLOTS; i++) {
      const e = equips[i];
      if (e && (e.icon || e.name)) {
        const title = esc(e.name ?? '');
        const inner = e.icon && e.icon.endsWith('.png')
          ? `<img src="${e.icon}">`
          : `<span class="fdp-eq-emoji">${e.icon ?? ''}</span>`;
        cells += `<div class="fdp-slot filled" title="${title}"`
          + ` data-eq-id="${esc(e.id ?? '')}" data-eq-name="${title}" data-eq-icon="${esc(e.icon ?? '')}">${inner}</div>`;
      } else {
        cells += `<div class="fdp-slot empty"></div>`;
      }
    }
    const cap = equips.filter(e => e && (e.icon || e.name)).length;
    return `<div class="fdp-equip-wrap">
      <div class="fdp-col-label">装备 ${cap}/${EQUIP_SLOTS}</div>
      <div class="fdp-equip-grid">${cells}</div>
    </div>`;
  }

  /** 状态 buff 标签 (JS ui.js:826-866 1:1, 中文标签 + status icon) */
  private buildStatusHtml(f: Fighter): string {
    const fAny = f as Fighter & {
      _inkStacks?: number; _shockStacks?: number; _goldLightning?: number;
    };
    const tag = (color: string, text: string) =>
      `<span class="fdp-buff-tag" style="border-color:${color};color:${color}">${text}</span>`;
    const sIc = (name: string) => `<img src="status/${name}">`;

    const parts: string[] = [];
    const buffs = (f.buffs ?? []) as Array<Buff & { turns?: number; hpPerTurn?: number }>;
    // B2/B3: duration 999/-1 是"永久/层数模型"哨兵, 不能直接当回合数显示 (用户报 "999回合")。
    //   → 永久状态写"永久", 限时状态写"剩 N 回合"; 灼烧/中毒/流血走层数模型, 不显示回合。
    const fmtDur = (t: number): string => (t == null || t >= 999 || t < 0) ? '永久' : `剩 ${t} 回合`;
    buffs.forEach(b => {
      const v = b.value;
      const t = b.turns ?? b.duration;
      switch (b.type) {
        // 灼烧/中毒/流血: 层数模型 (每层每回合按值结算后衰减), 显示层数而非回合
        case 'burn': parts.push(tag('#ff6600', `${sIc('burn-icon.png')}灼烧 ${v} 层`)); break;
        case 'poison': parts.push(tag('#6b8e23', `${sIc('poison-icon.png')}中毒 ${v} 层`)); break;
        case 'bleed': parts.push(tag('#cc3333', `${sIc('bleed-icon.png')}流血 ${v} 层`)); break;
        case 'dot': parts.push(tag('#9b59b6', `${sIc('curse-debuff-icon.png')}诅咒 ${fmtDur(t)}`)); break;
        case 'atkUp': parts.push(tag('#06d6a0', `⬆攻+${v} ${fmtDur(t)}`)); break;
        case 'atkDown': parts.push(tag('#ff6b6b', `⬇攻-${v}% ${fmtDur(t)}`)); break;
        case 'defUp': parts.push(tag('#06d6a0', `⬆护+${v} ${fmtDur(t)}`)); break;
        case 'defDown': parts.push(tag('#ff6b6b', `⬇护-${v}% ${fmtDur(t)}`)); break;
        case 'mrUp': parts.push(tag('#4dabf7', `⬆魔抗+${v} ${fmtDur(t)}`)); break;
        case 'mrDown': parts.push(tag('#ff6b6b', `⬇魔抗-${v}% ${fmtDur(t)}`)); break;
        case 'dodge': parts.push(tag('#aaa', `${sIc('dodge-new-icon.png')}闪避 ${v}% ${fmtDur(t)}`)); break;
        case 'shield': parts.push(tag('#7ec8ff', `${sIc('shield-icon.png')}临时护盾 +${v} ${fmtDur(t)}`)); break;
        case 'stun': parts.push(tag('#ffee00', `${sIc('stun-icon.png')}眩晕 ${fmtDur(t)}`)); break;
        case 'healReduce': parts.push(tag('#6b8e23', `${sIc('heal-reduce-icon.png')}治疗削减 ${v}% ${fmtDur(t)}`)); break;
        case 'hot': parts.push(tag('#06d6a0', `持续回复 ${b.hpPerTurn}/回 ${fmtDur(t)}`)); break;
        case 'fear': parts.push(tag('#9b59b6', `${sIc('fear-icon.png')}恐惧 ${fmtDur(t)}`)); break;
        case 'chilled': parts.push(tag('#87ceeb', `${sIc('chilled-icon.png')}冰寒 ATK-20% ${fmtDur(t)}`)); break;
        case 'hidingShield': parts.push(tag('#fff', `${sIc('shield-icon.png')}缩头护盾 ${fmtDur(t)}`)); break;
        case 'bubbleBind': parts.push(tag('#4cc9f0', `<img src="passive/bubble-store-icon.png">泡泡束缚 ${fmtDur(t)}`)); break;
        case 'trap': parts.push(tag('#ff9f43', `<img src="passive/ninja-instinct-icon.png">陷阱`)); break;
        case 'diceFateCrit': parts.push(tag('#ff4757', `<img src="passive/gambler-blood-icon.png">暴击+${v}% ${fmtDur(t)}`)); break;
        case 'gamblerPierceConvert': parts.push(tag('#ffd93d', `<img src="passive/gambler-blood-icon.png">穿透转换 ${fmtDur(t)}`)); break;
        default: break;
      }
    });
    // 非 buff 状态层 (JS ui.js:855-857 / 862-864)
    if ((fAny._inkStacks ?? 0) > 0) parts.push(tag('#b8b8ff', `<img src="passive/ink-mark-icon.png">墨迹 ${fAny._inkStacks}层 (受伤+${(fAny._inkStacks ?? 0) * 5}%)`));
    if ((fAny._shockStacks ?? 0) > 0) parts.push(tag('#ffd700', `<img src="passive/lightning-storm-icon.png">电击 ${fAny._shockStacks}层`));
    if ((fAny._goldLightning ?? 0) > 0) parts.push(tag('#ffd700', `⚡金闪电 ${fAny._goldLightning}/5`));

    if (!parts.length) {
      return `<div class="fdp-col-label">状态</div><div class="fdp-none">无</div>`;
    }
    return `<div class="fdp-col-label">状态</div><div class="fdp-buffs">${parts.join('')}</div>`;
  }

  /** 被动 (JS ui.js:868-955) — icon + 名 + brief + 详细 toggle + 实时状态(带进度条)。 */
  private buildPassiveParts(f: Fighter): { brief: string; detail: string; state: string } {
    const p = f.passive;
    if (!p) return { brief: '', detail: '', state: '' };
    const fAny = f as Fighter & {
      _goldCoins?: number; _starEnergy?: number; _storedEnergy?: number; bubbleStore?: number;
      _chestTreasure?: number; _drones?: unknown[]; _lavaRage?: number; _lavaTransformed?: boolean;
      _stoneDefGained?: number; baseDef?: number; _initDef?: number; _bambooGainedHp?: number;
      _hunterKills?: number; _hunterStolenAtk?: number; _hunterStolenDef?: number;
      _hunterStolenMr?: number; _hunterStolenHp?: number; _inkStacks?: number; _inkCapOverride?: number;
      _shockStacks?: number; _crystallize?: number; _twoHeadForm?: string;
    };
    const pAny = p as Record<string, unknown>;

    // ── brief / detail 文本 ──
    // chestTreasure 走专用 (JS ui.js:877-916): brief=进度, detail=三池。
    let briefHtml: string;
    let detailHtml = '';
    if (p.type === 'chestTreasure') {
      const built = this.buildChestPassive(f, pAny);
      briefHtml = built.brief;
      detailHtml = built.detail;
    } else {
      // descMelee/descVolcano 变体 (JS ui.js:919-920)
      let descText = p.desc ?? '';
      if (fAny._twoHeadForm === 'melee' && pAny.descMelee) descText = pAny.descMelee as string;
      if (fAny._lavaTransformed && pAny.descVolcano) descText = pAny.descVolcano as string;
      const briefSrc = (p.brief as string) || descText;
      briefHtml = this.renderBrief(f, pAny, briefSrc);
      // detail = 完整 desc (仅当与 brief 不同才出 toggle)
      const detailSrc = this.renderBrief(f, pAny, descText);
      if (detailSrc && detailSrc !== briefHtml) detailHtml = detailSrc;
    }

    // ── 实时状态行 (JS ui.js:932-952) + 进度条 ──
    const st: string[] = [];
    const valA = (s: string | number) => `<span class="val-atk">${s}</span>`;
    switch (p.type) {
      case 'fortuneGold': st.push(`🪙 金币：${valA(fAny._goldCoins ?? 0)}`); break;
      case 'starEnergy': {
        const maxE = Math.round(f.maxHp * (pAny.maxChargePct as number) / 100);
        st.push(`⭐ 星能：${valA(fAny._starEnergy ?? 0)} / ${maxE}${meterHtml(fAny._starEnergy ?? 0, maxE)}`); break;
      }
      case 'bubbleStore': {
        // 无清晰上限 → 用 maxHp 作满刻度 (跟 scene-dom HUD 条同口径)
        const store = Math.round(fAny.bubbleStore ?? 0);
        st.push(`🫧 泡泡储存：${valA(store)}${meterHtml(store, f.maxHp, 'linear-gradient(90deg,#4cc9f0,#4dabf7)')}`); break;
      }
      case 'cyberDrone': {
        const cur = fAny._drones ? fAny._drones.length : 0;
        const max = pAny.maxDrones as number;
        st.push(`<img src="passive/cyber-drone-icon.png"> 浮游炮：${valA(cur)} / ${max}${meterHtml(cur, max)}`); break;
      }
      case 'lavaRage': {
        const cur = fAny._lavaRage ?? 0;
        const max = pAny.rageMax as number;
        st.push(`🌋 怒气：${valA(cur)} / ${max}${fAny._lavaTransformed ? ' (已变身)' : ''}${meterHtml(cur, max, 'linear-gradient(90deg,#ff6b6b,#ff2222)')}`); break;
      }
      // P218: stoneWall"护甲已叠加" / bambooCharge"已增加HP" 在 desc 已写, 不再在状态行重复 (用户反馈)
      case 'stoneWall': break;
      case 'bambooCharge': break;
      case 'hunterKill': st.push(`🎯 击杀数：${valA(fAny._hunterKills ?? 0)}　窃取攻+${fAny._hunterStolenAtk ?? 0} 防+${fAny._hunterStolenDef ?? 0} 抗+${fAny._hunterStolenMr ?? 0} 血+${fAny._hunterStolenHp ?? 0}`); break;
      case 'inkMark': {
        const inkCap = fAny._inkCapOverride ?? (pAny.maxStacks as number);
        const cur = fAny._inkStacks ?? 0;
        st.push(`<img src="passive/ink-mark-icon.png"> 墨迹层数：${valA(cur)} / ${inkCap}${meterHtml(cur, inkCap, 'linear-gradient(90deg,#b8b8ff,#7c7cff)')}`); break;
      }
      case 'lightningStorm': {
        const cur = fAny._shockStacks ?? 0;
        const max = pAny.stackMax as number;
        st.push(`⚡ 全局电击层：${valA(cur)} / ${max}${meterHtml(cur, max)}`); break;
      }
      case 'gamblerBlood': {
        const oc = Math.max(0, (f.crit || 0) - 1.0);
        const txt = oc > 0
          ? Math.round(oc * 100) + '%→+' + Math.round(oc * (pAny.overflowMult as number) * 100) + '%爆伤'
          : '无';
        st.push(`<img src="passive/gambler-blood-icon.png"> 暴击溢出：${valA(txt)}`); break;
      }
      case 'crystalResonance': {
        const cur = fAny._crystallize ?? 0;
        const max = pAny.crystallizeMax as number;
        st.push(`💎 结晶层数：${valA(cur)} / ${max}${meterHtml(cur, max, 'linear-gradient(90deg,#4cc9f0,#c77dff)')}`); break;
      }
      case 'auraAwaken': {
        // JS getAuraEnergyCap → maxHp × energyMaxStorePct (energyMaxStorePct 为分数 0.5)
        if (pAny.energyStore) {
          const cap = Math.round(f.maxHp * ((pAny.energyMaxStorePct as number) ?? 0.5));
          const cur = Math.round(fAny._storedEnergy ?? 0);
          st.push(`⚡ 储能：${valA(cur)} / ${cap}${meterHtml(cur, cap)}`);
        }
        break;
      }
      case 'undeadRage': {
        const bonus = Math.round(Math.min(pAny.atkMaxBonus as number, (1 - f.hp / f.maxHp) * 100 * (pAny.atkPerLostPct as number)));
        st.push(`💀 攻击加成：${valA('+' + bonus + '%')}　生命偷取：${valA(pAny.lifestealBase + '%')}`); break;
      }
      default: break;
    }

    // P217: 返回各部分, 由 openPassiveCard 用 ssc-* 大卡格式渲染 (跟技能大卡一致)
    return { brief: briefHtml, detail: detailHtml, state: st.length ? st.join('<br>') : '' };
  }

  /** 宝箱龟 chestTreasure (JS ui.js:877-916): brief=财宝进度, detail=三池(拥有项紫色高亮)。 */
  private buildChestPassive(f: Fighter, pAny: Record<string, unknown>): { brief: string; detail: string } {
    const fAny = f as Fighter & {
      _chestTreasure?: number; _chestTier?: number;
      _chestEquips?: Array<{ id?: string; name?: string; icon?: string; desc?: string }>;
    };
    const treasure = fAny._chestTreasure ?? 0;
    const tier = fAny._chestTier ?? 0;
    const th = (pAny.thresholds as number[]) ?? [];
    const lvMult = 1 + ((f._level || 1) - 1) * 0.03;
    const scaledTh = (i: number) => Math.round((th[i] ?? 0) * lvMult);
    const nextThresh = tier < th.length ? scaledTh(tier) : null;
    const poolNames = ['基础池', '基础池', '进阶池', '进阶池', '传说池'];

    let brief = `造成伤害充能财宝进度，达到阈值获得装备。<br>当前：<span class="val-atk">${treasure}</span>`;
    if (nextThresh) brief += ` / ${nextThresh}（下一件：${poolNames[tier] ?? '装备'}装备）`;
    else brief += '（已满）';

    const owned = (fAny._chestEquips ?? []).map(e => e.id);
    const renderPool = (label: string, pool: Array<{ id?: string; name?: string; icon?: string; desc?: string }>) => {
      let h = `<div style="margin-top:6px"><b>${label}</b></div>`;
      for (const eq of pool) {
        const isOwned = owned.includes(eq.id);
        const eIcon = eq.icon && eq.icon.endsWith('.png')
          ? `<img src="${eq.icon}" style="width:14px;height:14px;${isOwned ? '' : 'opacity:.5'}">`
          : (eq.icon || '');
        h += `<div style="color:${isOwned ? '#c77dff' : '#888'};font-size:11px">${eIcon} ${eq.name ?? ''}：${eq.desc ?? ''}</div>`;
      }
      return h;
    };
    const pools = (pAny.pools as Array<Array<{ id?: string; name?: string; icon?: string; desc?: string }>>) ?? [[], [], []];
    // thDisplay: 缩放后阈值, 已通过阶段标 val-atk
    const thDisplay = th.map((_, i) => {
      const v = scaledTh(i);
      return i < tier ? `<span class="val-atk">${v}</span>` : `${v}`;
    }).join(' / ');
    let detail = `造成伤害充能财宝进度，根据进度 ${thDisplay} 获得装备。<br>当前：<span class="val-atk">${treasure}</span>`;
    if (nextThresh) detail += ` / ${nextThresh}（下一件：${poolNames[tier] ?? '装备'}装备）`;
    else detail += '（已满）';
    detail += renderPool('基础池（第1-2件）：', pools[0] ?? []);
    detail += renderPool('进阶池（第3-4件）：', pools[1] ?? []);
    detail += renderPool('传说池（第5件）：', pools[2] ?? []);
    return { brief, detail };
  }

  /** 装备被动 + 主动技能 (JS ui.js:957-985)。主动技能加 详细 toggle (detail !== brief 时)。 */
  private buildSkills(f: Fighter): string {
    const passiveSkills = f._passiveSkills ?? [];
    const activeSkills = (f.skills ?? []) as Array<SkillDef & { cdLeft?: number; icon?: string; enhancesPassive?: boolean }>;
    const p = f.passive;
    // P19: 强化技能 (enhancesPassive, 如竹叶龟强化生长) 只在真正装备时 (在 _passiveSkills 里) 显示为 tile,
    //   不再从 pool 无条件捞 (用户要求: 未携带时不应出现在面板)。
    const extraEnhancers = (passiveSkills as Array<SkillDef & { icon?: string; enhancesPassive?: boolean }>)
      .filter(ps => ps.enhancesPassive && !activeSkills.some(a => a.name === ps.name));
    const displayed: Array<SkillDef & { icon?: string; cdLeft?: number; enhancesPassive?: boolean }> =
      [...activeSkills, ...extraEnhancers];
    this._displayedSkills = displayed;
    if (!passiveSkills.length && !displayed.length && !p) return '';

    let html = `<div class="fdp-skills-wrap">`;
    // 装备被动 (来自装备) — 单独一区 (如有)
    // P19: 强化被动技能 (如竹叶龟强化生长, enhancesPassive) 不进"装备被动"区 — 它在下面"技能"区作 enhancer tile 显示
    const equipPassives = passiveSkills.filter(s => !(s as { enhancesPassive?: boolean }).enhancesPassive);
    if (equipPassives.length) {
      html += `<div class="fdp-col-label">装备被动</div><div class="fdp-skills">`;
      equipPassives.forEach(s => {
        const brief = this.renderBrief(f, s, s.brief ?? '');
        // 被动技能图标 (如 寒冰龟 极寒 用 frostAura 被动图 + iconPlus → 右上角 +)
        const sx = s as { icon?: string; iconPlus?: boolean };
        let ic = '';
        if (sx.icon) {
          const img = `<img class="fdp-skill-icon" src="${sx.icon}" onerror="this.style.display='none'">`;
          ic = sx.iconPlus ? `<span class="fdp-skill-iconwrap">${img}<span class="fdp-skill-plus">+</span></span> ` : img + ' ';
        }
        html += `<div class="fdp-skill fdp-skill-passive">
          <div class="fdp-skill-header">${ic}${s.name} <span class="spc-passive-tag">被动</span></div>
          <div class="fdp-skill-brief">${brief}</div>
        </div>`;
      });
      html += `</div>`;
    }
    // P212: 龟被动 tile + 主动技能 tiles 合在同一 "技能" 区 (不再分两行)
    const tiles: string[] = [];
    if (p) {
      const praw = PASSIVE_ICONS[p.type] || '⭐';
      const piconHtml = praw.endsWith('.png')
        ? `<img class="fdp-skill-icon" data-passive-tile="1" src="${praw}" onerror="this.style.display='none'">`
        : `<span class="fdp-skill-icon fdp-skill-icon-emoji" data-passive-tile="1">${praw}</span>`;
      tiles.push(`<div class="fdp-skill fdp-skill-compact">${piconHtml}<span class="fdp-skill-name">${p.name || '被动'}</span><span class="fdp-passive-tag">被动</span></div>`);
    }
    // P207 精简: 技能 tile 只放 放大图标 + 名 + CD; 完整 详细/简略 在悬浮大卡
    displayed.forEach((s, i) => {
      const cdText = s.cd
        ? `<span class="fdp-cd">CD${s.cd}${(s.cdLeft ?? 0) > 0 ? ' (剩' + s.cdLeft + ')' : ''}</span>`
        : '';
      const sx = s as { icon?: string; enhancesPassive?: boolean; iconPlus?: boolean };
      // P213: 强化原始被动的技能 (如 竹叶龟 强化生长) → 复用被动图标 + 右上角 "+" 角标
      //   iconPlus: 显式要求"图标 + 右上角加号" (如 寒冰龟 极寒 用 frostAura 被动图 + +)
      const usePassive = !!sx.enhancesPassive && !!p;
      const iconSrc = sx.icon || (usePassive ? PASSIVE_ICONS[p!.type] : undefined);
      const showPlus = usePassive || !!sx.iconPlus;
      let iconHtml = '';
      if (iconSrc) {
        const img = `<img class="fdp-skill-icon" data-skill-idx="${i}" src="${iconSrc}" onerror="this.style.display='none'">`;
        iconHtml = showPlus
          ? `<span class="fdp-skill-iconwrap">${img}<span class="fdp-skill-plus">+</span></span>`
          : img;
      }
      tiles.push(`<div class="fdp-skill fdp-skill-compact">${iconHtml}<span class="fdp-skill-name">${s.name}</span>${cdText}</div>`);
    });
    if (tiles.length) {
      html += `<div class="fdp-col-label"${passiveSkills.length ? ' style="margin-top:8px"' : ''}>技能</div><div class="fdp-skills">${tiles.join('')}</div>`;
    }
    // P214: 宝箱龟专属装备 (chestTreasure 充能获得, 最多 5 件) — 技能区一行 X/5 槽
    if (p && p.type === 'chestTreasure') {
      const ce = (f as Fighter & { _chestEquips?: Array<{ id?: string; name?: string; icon?: string }> })._chestEquips ?? [];
      let cells = '';
      for (let i = 0; i < 5; i++) {
        const e = ce[i];
        if (e && (e.icon || e.name)) {
          const inner = e.icon && e.icon.endsWith('.png') ? `<img src="${e.icon}">` : `<span class="fdp-eq-emoji">${e.icon ?? ''}</span>`;
          cells += `<div class="fdp-slot filled" title="${esc(e.name ?? '')}">${inner}</div>`;
        } else {
          cells += `<div class="fdp-slot empty"></div>`;
        }
      }
      html += `<div class="fdp-col-label" style="margin-top:8px">专属装备 ${ce.length}/5</div>`;
      html += `<div class="fdp-equip-grid" style="grid-template-columns:repeat(5,62px)">${cells}</div>`;
    }
    html += `</div>`;
    return html;
  }

  /**
   * innerHTML 之后绑定所有 .fdp-toggle 点击 (参照 ActionPanel.toggleDetail)。
   * 切换同一卡内 .fdp-skill-brief|.fdp-passive-brief (显) ↔ .fdp-detail-box (隐),
   * 并翻转 详细 ▾ / 简略 ▴ 文案。detail 在 .fdp-detail-box 内部滚动, 面板尺寸不变。
   */
  private wireEvents() {
    if (!this.root) return;
    this.wireToggles(this.root);
    // 装备格点击 → 左图右文弹窗 (port JS showEquipCellDetail)
    this.root.querySelectorAll<HTMLElement>('.fdp-slot.filled').forEach(slot => {
      slot.addEventListener('click', (e) => {
        e.stopPropagation();              // 不冒泡到 veil (否则会关整个面板)
        this.openEquipPopup(slot);
      });
    });
    // P206 技能图标: 悬浮蓄力 (鼠标进度圈, 满 0.7s 自动开) + 点击秒开 → 单技能大卡
    this.root.querySelectorAll<HTMLElement>('.fdp-skill-icon[data-skill-idx]').forEach(icon => {
      const idx = parseInt(icon.dataset.skillIdx ?? '-1', 10);
      if (idx < 0) return;
      icon.addEventListener('mouseenter', (e) => this.startSkillRing(() => this.openSkillCard(idx), e as MouseEvent));
      icon.addEventListener('mouseleave', () => this.cancelSkillRing());
      icon.addEventListener('click', (e) => { e.stopPropagation(); this.cancelSkillRing(); this.openSkillCard(idx); });
    });
    // P211 被动 tile: 同 技能 — 悬浮蓄力 / 点击 → 被动大卡
    this.root.querySelectorAll<HTMLElement>('.fdp-skill-icon[data-passive-tile]').forEach(icon => {
      icon.addEventListener('mouseenter', (e) => this.startSkillRing(() => this.openPassiveCard(), e as MouseEvent));
      icon.addEventListener('mouseleave', () => this.cancelSkillRing());
      icon.addEventListener('click', (e) => { e.stopPropagation(); this.cancelSkillRing(); this.openPassiveCard(); });
    });
  }

  /** 绑定 root 内所有 .fdp-toggle (详细/简略 切换) — 面板被动盒 + 被动大卡通用。 */
  private wireToggles(root: HTMLElement) {
    root.querySelectorAll<HTMLElement>('.fdp-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = toggle.parentElement;
        if (!card) return;
        const brief = (card.querySelector('.fdp-skill-brief') || card.querySelector('.fdp-passive-brief')) as HTMLElement | null;
        const detail = card.querySelector('.fdp-detail-box') as HTMLElement | null;
        if (!brief || !detail) return;
        const showing = detail.style.display !== 'none';
        brief.style.display = showing ? '' : 'none';
        detail.style.display = showing ? 'none' : '';
        toggle.textContent = showing ? '详细 ▾' : '简略 ▴';
      });
    });
  }

  /** 悬浮 (技能/被动) 图标 → 鼠标旁进度圈蓄力 (SVG dashoffset), 满 HOLD_MS 自动触发 onFull。 */
  private startSkillRing(onFull: () => void, ev?: MouseEvent) {
    if (!this.skillRing) return;
    if (this.skillCard?.classList.contains('show')) return;   // 大卡开着时不蓄力
    this.cancelSkillRing();
    const fg = this.skillRing.querySelector('.ring-fg') as SVGCircleElement | null;
    if (fg) {
      fg.style.transition = 'none';
      fg.style.strokeDashoffset = String(DetailPanel.RING_C);
      void this.skillRing.offsetWidth;                        // 强制 reflow 再起动画
      fg.style.transition = `stroke-dashoffset ${DetailPanel.HOLD_MS}ms linear`;
      fg.style.strokeDashoffset = '0';
    }
    if (ev) { this.skillRing.style.left = (ev.clientX + 15) + 'px'; this.skillRing.style.top = (ev.clientY + 15) + 'px'; }
    this.skillRing.classList.add('show');
    const onMove = (e: MouseEvent) => {
      if (this.skillRing) { this.skillRing.style.left = (e.clientX + 15) + 'px'; this.skillRing.style.top = (e.clientY + 15) + 'px'; }
    };
    this.ringMoveHandler = onMove;
    document.addEventListener('mousemove', onMove);
    this.ringTimer = window.setTimeout(() => { this.cancelSkillRing(); onFull(); }, DetailPanel.HOLD_MS);
  }

  /** 取消蓄力 (移开 / 点击 / 打开后): 停计时 + 撤鼠标监听 + 进度圈归零隐藏。 */
  private cancelSkillRing() {
    if (this.ringTimer != null) { clearTimeout(this.ringTimer); this.ringTimer = null; }
    if (this.ringMoveHandler) { document.removeEventListener('mousemove', this.ringMoveHandler); this.ringMoveHandler = null; }
    if (this.skillRing) {
      this.skillRing.classList.remove('show');
      const fg = this.skillRing.querySelector('.ring-fg') as SVGCircleElement | null;
      if (fg) { fg.style.transition = 'none'; fg.style.strokeDashoffset = String(DetailPanel.RING_C); }
    }
  }

  /** 单技能大卡: 大图标 + 名/冷却/段数 + 完整 detail (renderBrief 上色)。点外部关。 */
  /**
   * 双形态龟 (双头/火山) — 取当前技能在「另一形态」同 index 的配对技能。
   *  - 双头龟 (meleeSkills): 远程↔近战 手动切换。近战形态会把远程套暂存到 _rangedSkills。
   *  - 火山龟 (volcanoSkills): 普通形态怒气满→变身火山。仅普通形态做配对 (变身后 f.skills 被裁切, index 不对齐, 跳过)。
   *  通用技能 (_isCommon, 如融合) 不配对 (与 JS main.js:1247 / 选龟面板一致)。
   */
  private pairedFormSkill(f: Fighter, cur: SkillDef & { _isCommon?: boolean; passiveSkill?: boolean }):
    { skill: SkillDef & { icon?: string }; label: string; color: string } | null {
    if (cur._isCommon || cur.passiveSkill) return null;
    type FormSkill = SkillDef & { icon?: string; passiveSkill?: boolean };
    const petDef = (PET_BY_ID as Record<string, {
      skillPool?: FormSkill[]; meleeSkills?: FormSkill[]; volcanoSkills?: FormSkill[];
    }>)[f.id];
    if (!petDef) return null;
    const fx = f as Fighter & { _rangedSkills?: unknown[] };
    let srcArr: FormSkill[] | undefined, otherArr: FormSkill[] | undefined, label = '', color = '';
    // 双头龟: 近战形态 (_rangedSkills 已暂存) ↔ 远程形态; 形态数组按 index 一一对应
    if (Array.isArray(petDef.meleeSkills) && petDef.meleeSkills.length) {
      const inMelee = !!fx._rangedSkills;
      srcArr = inMelee ? petDef.meleeSkills : petDef.skillPool;
      otherArr = inMelee ? petDef.skillPool : petDef.meleeSkills;
      label = inMelee ? '远程形态' : '近战形态'; color = '#7ec8ff';
    } else if (Array.isArray(petDef.volcanoSkills) && petDef.volcanoSkills.length && f.name !== '火山龟') {
      // 火山龟: 仅普通形态做配对 (变身后 f.skills 被裁切, 不对齐, 跳过)
      srcArr = petDef.skillPool; otherArr = petDef.volcanoSkills;
      label = '火山形态'; color = '#ff8a3d';
    }
    if (!srcArr || !otherArr) return null;
    // f.skills 经 equippedIdxs/passiveSkill 过滤, tile idx ≠ 形态数组 idx;
    //   按 type+name 在源形态数组里定位原始 index, 再取另一形态同 index
    const origIdx = srcArr.findIndex(x => x.type === cur.type && x.name === cur.name);
    if (origIdx < 0) return null;
    const other = otherArr[origIdx];
    if (!other || other.passiveSkill || other.name === cur.name) return null;
    return { skill: other, label, color };
  }

  private openSkillCard(idx: number) {
    const f = this.currentFighter;
    if (!f || !this.skillCard) return;
    const s = this._displayedSkills[idx];
    if (!s) return;
    this.cancelSkillRing();
    // 强化被动技能 (无自有 icon) → 用被动图标
    const cardIcon = s.icon || (s.enhancesPassive && f.passive ? PASSIVE_ICONS[f.passive.type] : undefined);
    const iconHtml = cardIcon ? `<img class="ssc-icon" src="${cardIcon}" onerror="this.style.visibility='hidden'">` : '';
    const briefHtml = this.renderBrief(f, s, (s.brief as string) || (s.detail as string) || '');
    const detailHtml = this.renderBrief(f, s, (s.detail as string) || (s.brief as string) || '');
    // 双形态龟: 详细视图末尾追加另一形态配对技能 (图标 + 详细描述)
    const paired = this.pairedFormSkill(f, s);
    let pairedHtml = '';
    if (paired) {
      const pi = paired.skill.icon
        ? `<img class="ssc-paired-icon" src="${paired.skill.icon}" onerror="this.style.display='none'">` : '';
      const pBody = this.renderBrief(f, paired.skill, (paired.skill.detail as string) || (paired.skill.brief as string) || '');
      pairedHtml = `<div class="ssc-paired">
        <div class="ssc-paired-head">${pi}<span class="ssc-paired-label" style="color:${paired.color}">${paired.label}</span><span class="ssc-paired-name">${paired.skill.name}</span></div>
        <div class="ssc-paired-body">${pBody}</div>
      </div>`;
    }
    const detailInner = (detailHtml || briefHtml) + pairedHtml;
    // 有配对形态时总是给「详细」入口 (即便本技能简略=详细), 让玩家能展开看另一形态
    const hasToggle = (!!briefHtml && !!detailHtml && briefHtml !== detailHtml) || !!pairedHtml;
    // P214: 去掉 "N 段" meta; 只留冷却
    const meta = s.cd ? `<span class="ssc-cd">冷却 ${s.cd} 回合${(s.cdLeft ?? 0) > 0 ? ` (剩${s.cdLeft})` : ''}</span>` : '';
    this.skillCard.innerHTML = `
      <div class="ssc-head">
        ${iconHtml}
        <div style="min-width:0">
          <div class="ssc-name">${s.name}</div>
          ${meta ? `<div class="ssc-meta">${meta}</div>` : ''}
        </div>
      </div>
      <div class="ssc-body">
        <div class="ssc-brief">${briefHtml}</div>
        ${hasToggle ? `<div class="ssc-detail" style="display:none">${detailInner}</div>` : ''}
      </div>
      ${hasToggle ? `<span class="ssc-toggle">详细 ▾</span>` : ''}
      <div class="ssc-hint">点击空白处关闭</div>`;
    this.skillCard.classList.add('show');
    // P214 默认显示简略; 点 "详细 ▾" 切到详细, "简略 ▴" 切回
    const toggle = this.skillCard.querySelector('.ssc-toggle') as HTMLElement | null;
    if (toggle) {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const det = this.skillCard?.querySelector('.ssc-detail') as HTMLElement | null;
        const br = this.skillCard?.querySelector('.ssc-brief') as HTMLElement | null;
        if (!det || !br) return;
        const showingBrief = br.style.display !== 'none';
        br.style.display = showingBrief ? 'none' : '';
        det.style.display = showingBrief ? '' : 'none';
        toggle.textContent = showingBrief ? '简略 ▴' : '详细 ▾';
      });
    }
    this.presentCard();
  }

  /** 被动大卡 (P211): 复用 buildPassiveHtml (标题/简略/详细 toggle/实时状态)。 */
  private openPassiveCard() {
    const f = this.currentFighter;
    const p = f?.passive;
    if (!f || !p || !this.skillCard) return;
    this.cancelSkillRing();
    // P217: 被动大卡用跟技能大卡一样的 ssc-* 格式 (大图标 head + 简略默认 + 详细 toggle + 实时状态)
    const { brief, detail, state } = this.buildPassiveParts(f);
    const hasToggle = !!brief && !!detail && brief !== detail;
    const iconRaw = PASSIVE_ICONS[p.type] || '⭐';
    const iconHtml = iconRaw.endsWith('.png')
      ? `<img class="ssc-icon" src="${iconRaw}" onerror="this.style.visibility='hidden'">`
      : `<span class="ssc-icon" style="display:flex;align-items:center;justify-content:center;font-size:40px">${iconRaw}</span>`;
    this.skillCard.innerHTML = `
      <div class="ssc-head">
        ${iconHtml}
        <div style="min-width:0">
          <div class="ssc-name">${p.name || '被动'}</div>
          <div class="ssc-meta"><span class="ssc-tag" style="color:#c77dff">被动</span></div>
        </div>
      </div>
      <div class="ssc-body">
        <div class="ssc-brief">${brief}</div>
        ${hasToggle ? `<div class="ssc-detail" style="display:none">${detail}</div>` : ''}
        ${state ? `<div class="ssc-pstate">${state}</div>` : ''}
      </div>
      ${hasToggle ? `<span class="ssc-toggle">详细 ▾</span>` : ''}
      <div class="ssc-hint">点击空白处关闭</div>`;
    this.skillCard.classList.add('show');
    const toggle = this.skillCard.querySelector('.ssc-toggle') as HTMLElement | null;
    if (toggle) {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const det = this.skillCard?.querySelector('.ssc-detail') as HTMLElement | null;
        const br = this.skillCard?.querySelector('.ssc-brief') as HTMLElement | null;
        if (!det || !br) return;
        const showingBrief = br.style.display !== 'none';
        br.style.display = showingBrief ? 'none' : '';
        det.style.display = showingBrief ? '' : 'none';
        toggle.textContent = showingBrief ? '简略 ▴' : '详细 ▾';
      });
    }
    this.presentCard();
  }

  /** 大卡通用: 入场缩放 + capture-phase 点外部关 (点其他技能/被动图标不关, 由其 click 切换)。 */
  private presentCard() {
    if (!this.skillCard) return;
    const fit = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    this.skillCard.style.transform = `translate(-50%, -50%) scale(${fit * 0.9})`;
    requestAnimationFrame(() => { if (this.skillCard?.classList.contains('show')) this.applyScale(); });
    if (this.skillCardOutsideHandler) document.removeEventListener('click', this.skillCardOutsideHandler, true);
    const onOutside = (ev: MouseEvent) => {
      const t = ev.target as HTMLElement | null;
      if (this.skillCard && !this.skillCard.contains(t) && !t?.closest('.fdp-skill-icon')) this.closeSkillCard();
    };
    this.skillCardOutsideHandler = onOutside;
    setTimeout(() => { if (this.skillCardOutsideHandler === onOutside) document.addEventListener('click', onOutside, true); }, 50);
  }

  /** 关闭单技能大卡 + 注销外部点击监听。 */
  private closeSkillCard() {
    if (this.skillCard) this.skillCard.classList.remove('show');
    if (this.skillCardOutsideHandler) { document.removeEventListener('click', this.skillCardOutsideHandler, true); this.skillCardOutsideHandler = null; }
  }

  /** 打开装备弹窗 (port JS ui.js:729-780)。左=大图(72px), 右=名+desc;
   *  desc 优先 slot.dataset, 缺失则 EQUIP_BY_ID[id].desc 兜底; \n → <br>。 */
  private openEquipPopup(slot: HTMLElement) {
    if (!this.popup) return;
    const id = slot.dataset.eqId || '';
    const name = slot.dataset.eqName || '装备';
    const iconRaw = slot.dataset.eqIcon || '';
    // desc: slot 上没存 (buildEquipSlots 只放 id/name/icon) → 查全量 EQUIP_BY_ID
    const def = id ? EQUIP_BY_ID[id] : undefined;
    const desc = (def?.desc ?? '').replace(/\n/g, '<br>');

    const iconHtml = iconRaw.endsWith('.png')
      ? `<img src="${iconRaw}" alt="">`
      : `<span class="edp-icon-emoji">${iconRaw}</span>`;

    this.popup.innerHTML = `
      <div class="edp-row">
        <div class="edp-icon">${iconHtml}</div>
        <div class="edp-info">
          <div class="edp-title">${name}</div>
          <div class="edp-body">${desc}</div>
        </div>
      </div>`;
    this.popup.classList.add('show');
    this.applyScale();   // 弹窗用同一 fitScale (居中)

    // 点外部 / 点其他龟关闭 (capture phase, 跟 JS 一致)。点另一 .fdp-slot 不关 →
    //   该 slot 的 click 会重新 openEquipPopup, 实现"切换到那件装备"。
    if (this.popupOutsideHandler) document.removeEventListener('click', this.popupOutsideHandler, true);
    const onOutside = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (this.popup && !this.popup.contains(target) && !target?.closest('.fdp-slot')) {
        this.closeEquipPopup();
      }
    };
    this.popupOutsideHandler = onOutside;
    setTimeout(() => {
      if (this.popupOutsideHandler === onOutside) document.addEventListener('click', onOutside, true);
    }, 50);
  }

  /** 关闭装备弹窗 + 注销外部点击监听。 */
  private closeEquipPopup() {
    if (this.popup) this.popup.classList.remove('show');
    if (this.popupOutsideHandler) {
      document.removeEventListener('click', this.popupOutsideHandler, true);
      this.popupOutsideHandler = null;
    }
  }

  /** renderSkillTemplate 包装: 构建 ctx (跟 ActionPanel 同款) + 换行 → <br> */
  private renderBrief(f: Fighter, s: Record<string, unknown>, tpl: string): string {
    if (!tpl) return '';
    const ctx: SkillCtx = {
      atk: f.atk, def: f.def, mr: f.mr ?? f.def,
      maxHp: f.maxHp, crit: f.crit ?? 0.25,
      hits: (s.hits as number) ?? 1,
      // 传 fighter 动态字段给 skill-text (chest/drone/hunter 等占位符需要)
      ...(f as unknown as Record<string, number>),
      lv: (f as Fighter & { _level?: number })._level ?? 1,   // {LV} 模板 (放 spread 后, 用 _level)
    };
    return renderSkillTemplate(tpl, ctx, s).replace(/\n/g, '<br>');
  }

  hide() {
    if (!this.root || !this.veil) return;
    this.closeEquipPopup();      // 面板关 → 装备弹窗也关
    this.cancelSkillRing();
    this.closeSkillCard();       // 面板关 → 技能大卡也关
    this.root.classList.remove('show');
    this.veil.classList.remove('show');
    this.visible = false;
    this.currentFighter = null;
  }

  isVisible(): boolean { return this.visible; }

  destroy() {
    this.closeEquipPopup();
    this.cancelSkillRing();
    this.closeSkillCard();
    window.removeEventListener('resize', this.resizeHandler);
    if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
    if (this.veil?.parentNode) this.veil.parentNode.removeChild(this.veil);
    if (this.popup?.parentNode) this.popup.parentNode.removeChild(this.popup);
    if (this.skillRing?.parentNode) this.skillRing.parentNode.removeChild(this.skillRing);
    if (this.skillCard?.parentNode) this.skillCard.parentNode.removeChild(this.skillCard);
    this.root = null;
    this.veil = null;
    this.popup = null;
    this.skillRing = null;
    this.skillCard = null;
    this.visible = false;
    this.currentFighter = null;
  }
}
