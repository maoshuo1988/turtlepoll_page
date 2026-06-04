// ══════════════════════════════════════════════════════════
// BattleTopRow — DOM overlay 版, 1:1 复刻 JS index.html:364-371 +
// battle.css:27-35 .turn-banner-row / .turn-banner / .btn-help
// ══════════════════════════════════════════════════════════
// JS HTML (index.html:364-371):
//   <div class="turn-banner-row">
//     <button class="btn-help btn-battle-back" onclick="confirmSurrender()" title="退出">&#x2190;</button>
//     <div class="turn-banner" id="turnBanner">第 1 回合</div>
//     <button class="btn-help btn-help-icon" onclick="toggleHelp()" title="术语说明"><img src="assets/ui/help-button.png" alt="?"></button>
//     <button class="btn-help" onclick="toggleBattleLog()" title="战斗日志">📜</button>
//     <button class="btn-help btn-dmg-toggle" onclick="toggleDmgStats()" title="伤害统计">📊</button>
//     <button class="btn-help" onclick="showDebugPanel()" title="..." style="background:#7c3aed;color:#fff">🛠</button>
//   </div>
//
// JS CSS (battle.css:27-35, base.css:86,90):
//   --accent:#58a6ff   --bg2:#161b22
//   .turn-banner-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}
//   .turn-banner{flex:1;text-align:center;font-size:16px;font-weight:700;color:var(--accent);padding:8px;background:var(--bg2);border-radius:8px}
//   .btn-help{width:32px;height:32px;border-radius:50%;border:2px solid rgba(255,255,255,.15);background:var(--bg2);color:var(--accent);font-size:16px;font-weight:900;cursor:pointer;transition:.2s;flex-shrink:0;padding:0;display:flex;align-items:center;justify-content:center}
//   .btn-help-icon{background:transparent;border:none}
//   .btn-help-icon img{width:100%;height:100%;object-fit:contain}
//   .btn-help:hover{border-color:var(--accent);background:rgba(88,166,255,.1)}
//   .btn-battle-back{display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1}
//
// PHASER DIVERGENCE:
//   - 容器 position:fixed top:8px (JS 是 #screenBattle flow 内子元素; Phaser 用 canvas
//     全屏渲染, DOM overlay 必须脱离文档流). max-width 跟 #screenBattle 1400px 对齐.
//   - help-button.png 路径 JS 为 "assets/ui/help-button.png", Phaser 静态资源
//     在 public/ui/help-button.png 下, 浏览器侧 "/ui/help-button.png" 即同图.
import Phaser from 'phaser';
import { DEV_VISIBLE } from '../dev/devflag';

let cssInstalled = false;
function installCss() {
  if (cssInstalled) return;
  cssInstalled = true;
  const st = document.createElement('style');
  st.textContent = `
    /* P23 桌面布局 1:1 (JS battle.css:2520-2570):
       - .turn-banner-row 改 position:absolute; top:12px; height:0; display:block; (容器透明)
       - 每个按钮单独 absolute 定位:
         ← left:16, turn-banner 中心药丸, ? right:176, 📜 right:136, 📊 right:96, 🛠 right:56
       - turn-banner 改成小药丸 (min-width:140; padding:6×18; radius:999; bg rgba(10,14,24,.55); blur(6); 14px)
       之前 poc 用 flex row 占满 (JS 移动端布局), 不是桌面布局. */
    #poc-battle-top-row {
      position: fixed; top: 12px; left: 0; right: 0;
      z-index: 100;
      height: 0;
      display: block;
      pointer-events: none;
      font-family: 'pixel-zh', 'Microsoft YaHei', system-ui, sans-serif;
    }
    #poc-battle-top-row > * { pointer-events: auto; }
    #poc-battle-top-row .turn-banner {
      position: absolute; top: -2px; left: 50%; transform: translateX(-50%);
      min-width: 150px;
      padding: 8px 30px;
      border-radius: 14px;
      background: linear-gradient(180deg, rgba(26,36,62,.96), rgba(12,18,34,.96));
      backdrop-filter: blur(6px);
      border: 2px solid #ffd86b;
      box-shadow: 0 0 16px rgba(255,216,107,.3), inset 0 1px 0 rgba(255,255,255,.18), 0 3px 8px rgba(0,0,0,.55);
      font-size: 22px; font-weight: 900;
      color: #ffe9a8;
      text-shadow: 0 0 9px rgba(255,216,107,.55), 0 2px 3px rgba(0,0,0,.7);
      letter-spacing: 2px;
      text-align: center;
      font-family: 'm6x11', 'pixel-zh', 'Microsoft YaHei', system-ui, sans-serif;
    }
    /* v0.9.9 #7: chrome 按钮随 --poc-ui-scale 放大 (修高分屏按钮过小); 单位含按钮宽+间距,
       两组(本组 + GlobalToolbar 音乐/全屏)共用同一单位对齐。base 52px → 1080p≈78px。 */
    :root {
      --poc-chrome-btn:  calc(52px * var(--poc-ui-scale, 1));
      --poc-chrome-gap:  calc(10px * var(--poc-ui-scale, 1));
      --poc-chrome-unit: calc(52px * var(--poc-ui-scale, 1) + 10px * var(--poc-ui-scale, 1));
    }
    /* 左上: 暂停(返回) + 调试 (调试移到暂停右边, 用户 #7) */
    #poc-battle-top-row .btn-battle-back {
      position: absolute; top: 0; left: 16px;
    }
    /* v0.9.9 阶段0: 调试键是开发工具 → 缩小挪到左下角 + 半透明, 玩家无感, dev 仍可点 */
    #poc-battle-top-row button[data-act="debug"] {
      position: fixed; top: auto; bottom: 8px; left: 8px;
      width: 26px; height: 26px; font-size: 13px;
      opacity: .28; transition: opacity .15s; box-shadow: none;
    }
    #poc-battle-top-row button[data-act="debug"]:hover { opacity: .85; }
    /* 右上: 术语 / 日志 / 统计 (统计最靠内, 再往右是 GlobalToolbar 的 音乐/全屏);
       右起序: 全屏(8) 音乐(8+unit) | 统计(8+2u) 日志(8+3u) 术语(8+4u) */
    /* 全部用 data-act 定位 (避免共享的 .btn-help-icon 类互相覆盖导致重叠) */
    #poc-battle-top-row button[data-act="dmg"]  { position: absolute; top: 0; right: calc(8px + 2 * var(--poc-chrome-unit)); }
    #poc-battle-top-row button[data-act="log"]  { position: absolute; top: 0; right: calc(8px + 3 * var(--poc-chrome-unit)); }
    #poc-battle-top-row button[data-act="help"] { position: absolute; top: 0; right: calc(8px + 4 * var(--poc-chrome-unit)); }

    /* 回合条 timeline — 轨道节点风格: 渐变轨道 + 圆节点 (普通/事件/商店), 当前节点放大发光 */
    #poc-battle-top-row .poc-turn-timeline {
      position: absolute; top: 50px; left: 50%; transform: translateX(-50%);
      display: flex; align-items: flex-start; gap: 28px; pointer-events: none;
      z-index: 175; padding-top: 16px;
    }
    /* 贯穿轨道 (节点圆心高度 ~ padding-top16 + dot半径20 = 36) */
    #poc-battle-top-row .poc-turn-timeline::before {
      content: ''; position: absolute; top: 35px; left: 12px; right: 12px; height: 5px;
      background: linear-gradient(90deg, rgba(255,216,107,0), rgba(255,216,107,.45) 16%, rgba(255,216,107,.45) 84%, rgba(255,216,107,0));
      border-radius: 3px; z-index: -1;
    }
    #poc-battle-top-row .poc-turn-timeline .ttl-node {
      display: flex; flex-direction: column; align-items: center; gap: 5px; width: 58px;
      position: relative; transition: opacity .25s ease, transform .25s ease;
    }
    #poc-battle-top-row .poc-turn-timeline .ttl-dot {
      width: 40px; height: 40px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 900; color: #0a0e18;
      background: radial-gradient(circle at 38% 32%, #b8c4d4, #7a8698);
      border: 2px solid rgba(255,255,255,.45);
      box-shadow: 0 2px 7px rgba(0,0,0,.55), inset 0 0 6px rgba(255,255,255,.25);
      font-family: 'm6x11', 'pixel-zh', 'Microsoft YaHei', system-ui, sans-serif;
    }
    #poc-battle-top-row .poc-turn-timeline .ttl-node.ttl-event .ttl-dot {
      background: linear-gradient(135deg,#ffe27a,#ffb01f); border-color: #ffe066;
    }
    #poc-battle-top-row .poc-turn-timeline .ttl-node.ttl-shop .ttl-dot {
      background: linear-gradient(135deg,#7ec8ff,#3a9abf); border-color: #aee0ff;
    }
    #poc-battle-top-row .poc-turn-timeline .ttl-node.ttl-equip .ttl-dot {
      background: linear-gradient(135deg,#9be37a,#3f9a3a); border-color: #c6f2a8;
    }
    #poc-battle-top-row .poc-turn-timeline .ttl-label {
      font-size: 13px; color: #d6dde6; white-space: nowrap; min-height: 16px; font-weight: 700;
      text-shadow: 0 1px 2px rgba(0,0,0,.8); display: flex; align-items: center; gap: 3px;
    }
    #poc-battle-top-row .poc-turn-timeline .ttl-node.ttl-past   { opacity: .4;  transform: scale(.8); }
    #poc-battle-top-row .poc-turn-timeline .ttl-node.ttl-future { opacity: .72; transform: scale(.88); }
    #poc-battle-top-row .poc-turn-timeline .ttl-node.ttl-current { transform: scale(1.16); }
    #poc-battle-top-row .poc-turn-timeline .ttl-node.ttl-current .ttl-dot {
      width: 52px; height: 52px; font-size: 23px; border-color: #ffd86b;
      animation: ttlPulse 1.2s ease-in-out infinite;
    }
    #poc-battle-top-row .poc-turn-timeline .ttl-pin {
      position: absolute; top: -15px; color: #ffd86b; font-size: 13px; line-height: 1;
      text-shadow: 0 0 5px rgba(255,216,107,.9);
    }
    /* 当前回合的 我方/敌方 阵营 pill */
    #poc-battle-top-row .poc-turn-timeline .ttl-side {
      font-weight: 800; font-size: 12px; padding: 2px 9px; border-radius: 10px;
      white-space: nowrap; border: 1px solid;
    }
    #poc-battle-top-row .poc-turn-timeline .ttl-side-ally  { color: #06d6a0; background: rgba(6,214,160,.16);  border-color: rgba(6,214,160,.55); }
    #poc-battle-top-row .poc-turn-timeline .ttl-side-enemy { color: #ff6b6b; background: rgba(255,107,107,.16); border-color: rgba(255,107,107,.55); }
    #poc-battle-top-row .poc-turn-timeline .ttl-typetag { font-size: 11px; color: #ffe9a8; }
    @keyframes ttlPulse {
      0%,100% { box-shadow: 0 0 5px rgba(255,216,107,.5); }
      50%     { box-shadow: 0 0 16px rgba(255,216,107,.95), 0 0 7px rgba(255,255,255,.6); }
    }
    #poc-battle-top-row .btn-help {
      width: var(--poc-chrome-btn); height: var(--poc-chrome-btn);
      border-radius: 12px;
      border: 2px solid rgba(255,255,255,.22);
      background: linear-gradient(180deg, #1e2636, #11161f);
      color: #9fd0ff;
      font-size: 20px; font-weight: 900;
      cursor: pointer;
      transition: .18s;
      flex-shrink: 0;
      padding: 0;
      display: flex; align-items: center; justify-content: center;
      font-family: inherit;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.12), 0 3px 7px rgba(0,0,0,.5);
    }
    #poc-battle-top-row .btn-help:hover {
      border-color: #ffd86b;
      box-shadow: 0 0 12px rgba(255,216,107,.4), inset 0 1px 0 rgba(255,255,255,.16);
      transform: translateY(-1px);
    }
    /* 自带金属边框的贴图按钮 (返回/术语/日志/统计) — 去掉 CSS 边框/底/阴影避免双框, 图满铺 */
    #poc-battle-top-row .btn-help-icon {
      background: transparent; border: none; box-shadow: none;
    }
    #poc-battle-top-row .btn-help-icon img {
      width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated;
      transition: transform .15s, filter .15s;
    }
    #poc-battle-top-row .btn-help-icon:hover {
      border-color: transparent; background: transparent; transform: none;
      box-shadow: none;
    }
    #poc-battle-top-row .btn-help-icon:hover img {
      transform: scale(1.1); filter: brightness(1.15) drop-shadow(0 0 5px rgba(255,216,107,.6));
    }
    #poc-battle-top-row .btn-battle-back {
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; line-height: 1;
    }
    /* #7 整局规则徽章 — 返回键右侧的小药丸, 显示本局规则 (emoji + 名), hover 出描述 tooltip */
    #poc-battle-top-row .poc-rule-badge {
      position: absolute; top: 2px;
      left: calc(16px + var(--poc-chrome-btn) + 12px);
      display: none; align-items: center; gap: 6px;
      max-width: 220px;
      padding: 7px 14px; border-radius: 12px;
      background: linear-gradient(180deg, rgba(26,36,62,.95), rgba(12,18,34,.95));
      border: 2px solid #ffd86b;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.14), 0 3px 8px rgba(0,0,0,.5);
      cursor: help; pointer-events: auto;
      font-family: 'm6x11', 'pixel-zh', 'Microsoft YaHei', system-ui, sans-serif;
    }
    #poc-battle-top-row .poc-rule-badge.show { display: flex; }
    #poc-battle-top-row .poc-rule-badge .prb-emoji { font-size: 18px; line-height: 1; }
    #poc-battle-top-row .poc-rule-badge .prb-name {
      font-size: 15px; font-weight: 900; letter-spacing: 1px;
      white-space: nowrap; text-shadow: 0 1px 2px rgba(0,0,0,.7);
    }
    #poc-battle-top-row .poc-rule-badge .prb-tip {
      position: absolute; top: calc(100% + 6px); left: 0;
      min-width: 200px; max-width: 280px;
      padding: 8px 12px; border-radius: 8px;
      background: rgba(8,12,20,.96); border: 1px solid rgba(255,216,107,.5);
      color: #d6dde6; font-size: 12px; line-height: 1.5; font-weight: 700;
      box-shadow: 0 4px 14px rgba(0,0,0,.6);
      opacity: 0; transform: translateY(-4px); transition: opacity .15s, transform .15s;
      pointer-events: none; white-space: normal; z-index: 200;
    }
    #poc-battle-top-row .poc-rule-badge:hover .prb-tip { opacity: 1; transform: translateY(0); }
    /* 出手倒计时 — 条形进度条 (在 timeline 下方居中), 绿→黄→红收缩, ≤10s 红闪 */
    #poc-battle-top-row .poc-turn-timer-bar {
      position: absolute; top: 146px; left: 50%; transform: translateX(-50%);
      width: 280px; height: 13px; border-radius: 7px;
      background: rgba(8,12,20,.85); border: 2px solid rgba(255,255,255,.22);
      box-shadow: inset 0 1px 3px rgba(0,0,0,.6), 0 2px 5px rgba(0,0,0,.4);
      overflow: hidden; display: none; z-index: 175;
    }
    #poc-battle-top-row .poc-turn-timer-bar.show { display: block; }
    #poc-battle-top-row .ttb-fill {
      height: 100%; width: 100%; border-radius: 5px;
      background: linear-gradient(90deg, #2bd66f, #7ee06a);
      transition: width 1s linear, background .4s ease;
    }
    #poc-battle-top-row .ttb-text {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 800; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.9);
      font-family: 'm6x11','pixel-zh', 'Microsoft YaHei',system-ui,sans-serif; letter-spacing: 1px;
    }
    #poc-battle-top-row .poc-turn-timer-bar.urgent { animation: timerPulse .55s ease-in-out infinite; }
    @keyframes timerPulse { 0%,100%{ box-shadow: inset 0 1px 3px rgba(0,0,0,.6), 0 0 6px rgba(255,80,80,.5); } 50%{ box-shadow: inset 0 1px 3px rgba(0,0,0,.6), 0 0 16px rgba(255,80,80,.95); } }
  `;
  document.head.appendChild(st);
}

export interface TimelineNode {
  round: number;   // 关联回合 (equip 用 0)
  type: 'normal' | 'event' | 'shop' | 'equip';
}

export interface BattleTopRowHandlers {
  onBack: () => void;          // ← confirmSurrender
  onHelp: () => void;          // ? toggleHelp
  onLog: () => void;           // 📜 toggleBattleLog
  onDmgStats: () => void;      // 📊 toggleDmgStats
  onDebug: () => void;         // 🛠 showDebugPanel
}

export class BattleTopRow {
  private root: HTMLDivElement | null = null;
  private bannerEl: HTMLDivElement | null = null;

  constructor(scene: Phaser.Scene, handlers: BattleTopRowHandlers) {
    installCss();
    const root = document.createElement('div');
    root.id = 'poc-battle-top-row';
    // JS index.html:364-371 1:1 — innerHTML 顺序: back / banner / help / log / dmg-stats / debug
    // DEV gate (2026-05-30): 🛠 调试按钮仅 ?dev=1 显示, 玩家默认看不到。
    const debugBtn = DEV_VISIBLE
      ? `<button class="btn-help" data-act="debug" title="调试面板 (按 D 键也可)" style="background:#7c3aed;color:#fff">🛠</button>`
      : '';
    root.innerHTML = `
      <button class="btn-help btn-help-icon btn-battle-back" data-act="back" title="退出"><img src="ui/btn-back.png" alt="退出"></button>
      <div class="poc-rule-badge" id="poc-rule-badge"><span class="prb-emoji"></span><span class="prb-name"></span><div class="prb-tip"></div></div>
      <div class="turn-banner" id="poc-turn-banner">第 1 回合</div>
      <div class="poc-turn-timeline" id="poc-turn-timeline"></div>
      <div class="poc-turn-timer-bar" id="poc-turn-timer-bar"><div class="ttb-fill" id="poc-turn-timer-fill"></div><span class="ttb-text" id="poc-turn-timer-text"></span></div>
      <button class="btn-help btn-help-icon" data-act="help" title="术语说明"><img src="ui/btn-help.png" alt="?"></button>
      <button class="btn-help btn-help-icon" data-act="log" title="战斗日志"><img src="ui/btn-log.png" alt="日志"></button>
      <button class="btn-help btn-help-icon btn-dmg-toggle" data-act="dmg" title="战斗统计"><img src="ui/btn-stats.png" alt="统计"></button>
      ${debugBtn}
    `;
    document.body.appendChild(root);
    this.root = root;
    this.bannerEl = root.querySelector<HTMLDivElement>('#poc-turn-banner');

    const wire = (act: string, fn: () => void) => {
      const el = root.querySelector<HTMLButtonElement>(`button[data-act="${act}"]`);
      el?.addEventListener('click', fn);
    };
    wire('back', handlers.onBack);
    wire('help', handlers.onHelp);
    wire('log', handlers.onLog);
    wire('dmg', handlers.onDmgStats);
    wire('debug', handlers.onDebug);

    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());
  }

  setTurnText(text: string) {
    if (this.bannerEl) this.bannerEl.textContent = text;
  }

  /** #7 整局规则徽章 — 传 null / 正常对局 时隐藏; 否则显示 emoji + 名 + hover 描述, 边框用规则色 */
  setRule(rule: { name: string; emoji: string; desc: string; color: number } | null): void {
    const badge = this.root?.querySelector<HTMLDivElement>('#poc-rule-badge');
    if (!badge) return;
    if (!rule || rule.name === '正常对局') { badge.classList.remove('show'); return; }
    const colorHex = '#' + rule.color.toString(16).padStart(6, '0');
    const emojiEl = badge.querySelector<HTMLSpanElement>('.prb-emoji');
    const nameEl = badge.querySelector<HTMLSpanElement>('.prb-name');
    const tipEl = badge.querySelector<HTMLDivElement>('.prb-tip');
    if (emojiEl) emojiEl.textContent = rule.emoji;
    if (nameEl) { nameEl.textContent = rule.name; nameEl.style.color = colorHex; }
    if (tipEl) tipEl.innerHTML = `<b style="color:${colorHex}">${rule.emoji} ${rule.name}</b><br>${rule.desc}`;
    badge.style.borderColor = colorHex;
    badge.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,.14), 0 0 12px ${colorHex}55, 0 3px 8px rgba(0,0,0,.5)`;
    badge.classList.add('show');
  }

  /** 出手倒计时条: secs=null 隐藏; 否则按 secs/max 收缩 + 绿→黄→红渐变, ≤10s 红闪 */
  setTurnTimer(secs: number | null, max = 40): void {
    const bar = this.root?.querySelector<HTMLDivElement>('#poc-turn-timer-bar');
    const fill = this.root?.querySelector<HTMLDivElement>('#poc-turn-timer-fill');
    const txt = this.root?.querySelector<HTMLSpanElement>('#poc-turn-timer-text');
    if (!bar || !fill) return;
    if (secs == null) { bar.classList.remove('show', 'urgent'); return; }
    const ratio = Math.max(0, Math.min(1, secs / max));
    fill.style.width = `${ratio * 100}%`;
    fill.style.background = secs <= 10
      ? 'linear-gradient(90deg,#ff3b3b,#ff7a5a)'
      : secs <= 20
        ? 'linear-gradient(90deg,#ffb01f,#ffe27a)'
        : 'linear-gradient(90deg,#2bd66f,#7ee06a)';
    if (txt) txt.textContent = `⏱ ${secs}s`;
    bar.classList.add('show');
    bar.classList.toggle('urgent', secs <= 10);
  }

  /** 轨道节点 timeline — 5-window (当前 ±2 回合) 滑动. 每节点 {round, type}.
   *  type: normal(灰)/event(琥珀 ✦事件)/shop(蓝 🛒商店); 当前节点放大+发光脉冲+▼。
   */
  setTurnTimeline(nodes: TimelineNode[], currentIdx: number, activeSide: 'left' | 'right' = 'left'): void {
    const tl = this.root?.querySelector<HTMLDivElement>('#poc-turn-timeline');
    if (!tl) return;
    tl.innerHTML = '';
    for (let offset = -2; offset <= 2; offset++) {
      const i = currentIdx + offset;
      const div = document.createElement('div');
      div.className = 'ttl-node';
      if (i < 0 || i >= nodes.length) { div.style.opacity = '0'; tl.appendChild(div); continue; }   // 占位保等宽
      const n = nodes[i];
      const pos = offset === 0 ? 'ttl-current' : offset < 0 ? 'ttl-past' : 'ttl-future';
      div.classList.add(pos, `ttl-${n.type}`);
      const pin = offset === 0 ? '<span class="ttl-pin">▼</span>' : '';
      // dot 内容: 回合显数字, 其余显图标 (初始装备🎁/事件✦/商店🛒) — 各步独立一格 (用户 #4)
      const dot = n.type === 'equip' ? '🎁' : n.type === 'event' ? '✦' : n.type === 'shop' ? '🛒' : String(n.round);
      let label: string;
      if (n.type === 'equip')      label = '初始装备';
      else if (n.type === 'event') label = '事件';
      else if (n.type === 'shop')  label = '商店';
      else if (offset === 0) {
        // 当前回合: 我方/敌方回合 (阵营色)
        const sideCls = activeSide === 'left' ? 'ttl-side-ally' : 'ttl-side-enemy';
        const sideTxt = activeSide === 'left' ? '🐢 我方回合' : '👹 敌方回合';
        label = `<span class="ttl-side ${sideCls}">${sideTxt}</span>`;
      } else {
        label = `第${n.round}回合`;
      }
      div.innerHTML = `${pin}<span class="ttl-dot">${dot}</span><span class="ttl-label">${label}</span>`;
      tl.appendChild(div);
    }
  }

  destroy() {
    if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
    this.root = null;
    this.bannerEl = null;
  }
}
