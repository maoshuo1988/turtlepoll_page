// ══════════════════════════════════════════════════════════
// MainMenuScene — 用原版资产: menu-bg / menu-title PNG / btn-frame PNG
// 跟旧版主菜单视觉一致, 不再 emo 浏览器字体
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import { addDomText, addDomImage } from '../systems/dom-text';
import { EASE_MENU_IN } from '../systems/ease';
import { ALL_PETS } from '../data/pets';
import { exitToHostApp, isEmbeddedInHost } from '../utils/host-exit';

// 整页过场用: 菜单里会飞的对象 (按钮图/DOM文字/卡片容器) 都有 x/y/alpha/setVisible
type MenuObj = Phaser.GameObjects.Image | Phaser.GameObjects.DOMElement | Phaser.GameObjects.Container;
type FlyRow = { objs: MenuObj[]; homeY: number };   // 一行(错峰单位) + 它的归位 y
type ScreenKey = 'main' | 'online' | 'local' | 'custom';

export class MainMenuScene extends Phaser.Scene {
  private mainGroup!: Phaser.GameObjects.Container;
  private onlineGroup!: Phaser.GameObjects.Container;   // 在线模式 (快速匹配/房间对战)
  private localGroup!: Phaser.GameObjects.Container;     // 本地模式 (深海闯关/自定义模式)
  private customGroup!: Phaser.GameObjects.Container;    // 自定义 (野生/Boss/指定Boss/测试)
  // 整页过场: 主菜单(标题+按钮+磁贴)全部撤走 ↔ 子菜单居中; 上下错峰飞出飞入
  private activeScreen: ScreenKey = 'main';
  private transitioning = false;
  private screenRows: Record<ScreenKey, FlyRow[]> = { main: [], online: [], local: [], custom: [] };
  private screenObjs: Record<ScreenKey, MenuObj[]> = { main: [], online: [], local: [], custom: [] };

  constructor() { super('MainMenuScene'); }

  create() {
    // v0.9.9: 强制 FIT — 防 BattleScene 的 ENVELOP 残留把菜单整体放大裁切 (用户报)
    if (this.scale.scaleMode !== Phaser.Scale.FIT) {
      this.scale.scaleMode = Phaser.Scale.FIT;
      this.scale.refresh();
    }
    const { width, height } = this.scale.gameSize;

    // 1. 背景: v0.9.5.A11 — bg 挂 html (root) 走 CSS html::before, 全屏时跟随; canvas 透明
    document.documentElement.classList.add('menu-bg-active');
    // Phase D: 不再 remove — html.menu-bg-active 全程挂着, drift 动画不重启 (JS body::before 同款)

    // JS 布局尺寸 (照 base.css 变量 + index.html 结构):
    //   左栏: --menu-left-pad 4vw, --menu-buttons-width 360
    //   右栏: --menu-right-col-width 240, --menu-right-col-right 8vw, --menu-right-col-top 280
    //   标题: --menu-title-size 600, --menu-title-offset-x -120, --menu-title-offset-y -32
    const LEFT_PAD = 60;             // ~4vw on 1280
    const BTN_W = 360;
    const BTN_H = Math.round(BTN_W * 161 / 666);   // 87, menu-frame-rect aspect 666/161
    const BTN_GAP = 12;
    const LEFT_COL_CX = LEFT_PAD + BTN_W / 2;      // 240
    const RIGHT_COL_TOP_Y = 280;     // 左栏按钮起始 y (groupCy 用)
    // (右栏改为贴墙竖排, x 由 width-WALL 直接算, 不再用 RIGHT_COL_CX)

    // 2. 标题 — 序列帧动画 (DOM div + CSS steps, 见 index.html .menu-title-anim) + drop 入场
    const TITLE_BASE_Y = 130;
    const TITLE_W = 360, TITLE_H = 203;   // = .menu-title-anim 尺寸; 创建时内联 width/height 才能让 Phaser 量准、按 origin 居中
    const TITLE_SCALE = 1.1;   // 用户: 标题再大 1.1 倍
    const title = this.add.dom(LEFT_COL_CX, TITLE_BASE_Y - 180, 'div', `width:${TITLE_W}px;height:${TITLE_H}px`);
    (title.node as HTMLElement).className = 'menu-title-anim';
    // x = LEFT_COL_CX 与下方按钮组 (groupCx = LEFT_COL_CX) 同 x → 中心对齐
    title.setOrigin(0.5).setDepth(5).setAlpha(0).setScale(0.85);
    // drop 入场: 250ms delay, 550ms cubic.out 弹性下落 (无持续上下浮动 — 用户要求去掉)
    this.tweens.add({
      targets: title, y: TITLE_BASE_Y, scaleX: TITLE_SCALE, scaleY: TITLE_SCALE, alpha: 1,
      duration: 550, delay: 250, ease: EASE_MENU_IN,
    });

    // 3. 樱花粒子 (保留, 让废墟也有动静)
    this.add.particles(0, 0, '__DEFAULT', {
      x: { min: 0, max: width },
      y: 0,
      lifespan: 8000,
      speedY: { min: 20, max: 60 },
      speedX: { min: -20, max: 20 },
      scale: { start: 0.3, end: 0.05 },
      alpha: { start: 0.6, end: 0 },
      tint: [0xffd700, 0xffaa33, 0xff8800],   // 改金色光点, 配废墟夕阳
      frequency: 300,
      blendMode: 'ADD',
    }).setDepth(2);

    // BGM 首次交互启动
    this.input.once('pointerdown', () => {
      if (!this.sound.get('bgm-menu')) {
        this.sound.play('bgm-menu', { loop: true, volume: 0.4 });
      }
    });

    // 4. 主按钮组 + 子组 (照 JS index.html L183-213 折叠结构, 滑动 300ms)
    const groupCx = LEFT_COL_CX;
    const groupCy = RIGHT_COL_TOP_Y + BTN_H / 2;   // 跟右栏第一张卡顶对齐
    const btnSpacing = BTN_H + BTN_GAP;
    type Btn = { bg: Phaser.GameObjects.Image; text: Phaser.GameObjects.DOMElement };
    const mainBtns: Btn[] = [], onlineBtns: Btn[] = [], localBtns: Btn[] = [], customBtns: Btn[] = [];
    const mkBtn = (group: Phaser.GameObjects.Container, slotIdx: number, label: string, cb: () => void, disabled = false) =>
      this.makeFrameButtonInto(group, 0, slotIdx * btnSpacing, label, cb, disabled, BTN_W, BTN_H);
    // 子组居中: group.x = 屏幕中心, group.y 使按钮栈竖直居中于屏幕中线
    const centerGroup = (g: Phaser.GameObjects.Container, n: number) => {
      g.x = width / 2;
      g.y = height / 2 - (n - 1) * btnSpacing / 2;
    };

    this.mainGroup = this.add.container(groupCx, groupCy).setDepth(4);
    // 主菜单大改: 在线模式 / 本地模式 / 设置 — 点击整页过场到对应子菜单
    mainBtns.push(mkBtn(this.mainGroup, 0, '在线模式', () => this.goToScreen('online')));
    mainBtns.push(mkBtn(this.mainGroup, 1, '本地模式', () => this.goToScreen('local')));
    mainBtns.push(mkBtn(this.mainGroup, 2, '设置', () => this.openSettings()));

    // 主组按钮入场动画 (照 JS .menu-btn-slide-in-l, 错峰 550-870ms)
    //   P101 onComplete 兜底 snap final state + shutdown force-snap 防 tween 中断遗留
    //   P103 加 _slideInDone flag: 入场动画期间禁用 hover resetVisual (避免 killTweens 杀掉 slide-in)
    mainBtns.forEach((b, i) => {
      const startX = -560;
      b.bg.x = startX; (b.text as Phaser.GameObjects.DOMElement).x = startX;
      b.bg.setAlpha(0); b.text.setAlpha(0);
      (b.bg as Phaser.GameObjects.Image & { _slideInDone?: boolean })._slideInDone = false;
      this.tweens.add({
        targets: [b.bg, b.text], x: 0, alpha: 1,
        duration: 420, delay: 550 + i * 80, ease: EASE_MENU_IN,
        onComplete: () => {
          // 兜底: 保证 final state, 不受 ease overshoot 残留影响
          b.bg.x = 0; b.bg.setAlpha(1);
          (b.text as Phaser.GameObjects.DOMElement).x = 0;
          b.text.setAlpha(1);
          (b.bg as Phaser.GameObjects.Image & { _slideInDone?: boolean })._slideInDone = true;
        },
      });
    });
    // P101 scene shutdown / 重新进入时: 杀掉残留 tween + force snap all main btns 到 final state
    //   防"sleep 中切场 → 回来按钮卡在 x=-200" 这种.
    this.events.once('shutdown', () => {
      mainBtns.forEach(b => {
        try { this.tweens.killTweensOf([b.bg, b.text]); } catch { /* ignore */ }
        b.bg.x = 0; b.bg.setAlpha(1);
        (b.text as Phaser.GameObjects.DOMElement).x = 0;
        b.text.setAlpha(1);
      });
    });

    // 子菜单: 居中容器 (按钮初始隐藏, 等飞入)。点返回整页过场回上一级。
    // 在线模式: 快速匹配 / 房间对战 (暂未开放, shake) + 返回
    this.onlineGroup = this.add.container(0, 0).setDepth(4);
    onlineBtns.push(mkBtn(this.onlineGroup, 0, '快速匹配', () => this.shake(), true));
    onlineBtns.push(mkBtn(this.onlineGroup, 1, '房间对战', () => this.shake(), true));
    onlineBtns.push(mkBtn(this.onlineGroup, 2, '← 返回', () => this.goToScreen('main')));
    centerGroup(this.onlineGroup, onlineBtns.length);

    // 本地模式: 深海闯关 / 自定义模式(→自定义子组) + 返回
    this.localGroup = this.add.container(0, 0).setDepth(4);
    localBtns.push(mkBtn(this.localGroup, 0, '深海闯关', () => this.openDungeon()));
    localBtns.push(mkBtn(this.localGroup, 1, '自定义模式', () => this.goToScreen('custom')));
    localBtns.push(mkBtn(this.localGroup, 2, '← 返回', () => this.goToScreen('main')));
    centerGroup(this.localGroup, localBtns.length);

    // 自定义子组: 野生对局 / 指定Boss / 测试模式 / 快速单体调试 + 返回(回本地)
    this.customGroup = this.add.container(0, 0).setDepth(4);
    customBtns.push(mkBtn(this.customGroup, 0, '野生对局', () => this.openTeamSelect('pve')));
    customBtns.push(mkBtn(this.customGroup, 1, '指定 Boss', () => this.openTeamSelect('boss-pick')));
    customBtns.push(mkBtn(this.customGroup, 2, '测试模式', () => this.openTeamSelect('test')));
    customBtns.push(mkBtn(this.customGroup, 3, '快速单体调试', () => this.openSoloDebug()));
    customBtns.push(mkBtn(this.customGroup, 4, '← 返回', () => this.goToScreen('local')));
    centerGroup(this.customGroup, customBtns.length);

    // 5. 主菜单大改: 右侧龟币框(右上) + 2×2 方形功能磁贴 (图鉴/教程/成就/战绩)
    // 读取龟币 + 战绩
    let coinsValue = '0';
    let recordValue = '';   // 用户: 无战绩时不显示"暂无"
    try {
      const raw = localStorage.getItem('turtle-poc-progress-v1');
      if (raw) {
        const p = JSON.parse(raw);
        coinsValue = String(p.coins ?? 0);
        // 败场 = 总场次 - 胜场 (progress 只记 wins, battles 计全部 → 不需单独存 losses)
        const w = p.wins ?? 0, total = p.battles ?? 0, l = Math.max(0, total - w);
        recordValue = total > 0 ? `${w}胜 ${l}负` : '';
      }
    } catch { /* ignore */ }

    const cards: Phaser.GameObjects.Container[] = [];
    // 用户: 右侧改竖排 + 贴墙 (右边缘 flush, 留 WALL 边距) — 龟币框在顶, 下面 4 个功能磁贴竖着一列
    const WALL = 16;
    const COIN_W = 152;
    cards.push(this.makeCoinDisplay(width - WALL - COIN_W / 2, 78, coinsValue));
    const TILE = 104, TSTEP = 120, TILE_TOP_Y = 190;
    const tileX = width - WALL - TILE / 2;   // 磁贴右边缘贴墙
    cards.push(this.makeSquareTile(tileX, TILE_TOP_Y + 0 * TSTEP, TILE, '图鉴', 'codex-icon',             () => this.openCodex()));
    cards.push(this.makeSquareTile(tileX, TILE_TOP_Y + 1 * TSTEP, TILE, '教程', 'help-button',            () => this.confirmStartTutorial()));
    cards.push(this.makeSquareTile(tileX, TILE_TOP_Y + 2 * TSTEP, TILE, '成就', 'menu-icon-achievements', () => this.openAchievements()));
    cards.push(this.makeSquareTile(tileX, TILE_TOP_Y + 3 * TSTEP, TILE, '战绩', 'menu-icon-record',        () => this.openRecord(), recordValue));

    // 入场动画 (从右滑入, 错峰)
    cards.forEach((c, i) => {
      const baseX = c.x;
      c.x = baseX + 560;
      c.setAlpha(0);
      this.tweens.add({
        targets: c, x: baseX, alpha: 1,
        duration: 420, delay: 850 + i * 60, ease: EASE_MENU_IN,
        onComplete: () => { c.x = baseX; c.setAlpha(1); },
      });
    });
    this.events.once('shutdown', () => {
      cards.forEach(c => {
        try { this.tweens.killTweensOf(c); } catch { /* ignore */ }
        c.setAlpha(1);
      });
    });

    // ── 整页过场系统 (替代横向 slideToGroup) ──
    //   每个"页面"= 一串错峰行 (FlyRow): 标题/按钮/磁贴。切页 = 当前页全部飞出 → 目标页居中飞入。
    const R = (objs: MenuObj[], homeY: number): FlyRow => ({ objs, homeY });
    const btnRows = (btns: Btn[]): FlyRow[] => btns.map((b, i) => R([b.bg, b.text], i * btnSpacing));
    this.screenRows = {
      main: [
        R([title], TITLE_BASE_Y),
        ...mainBtns.map((b, i) => R([b.bg, b.text], i * btnSpacing)),   // homeY = mainGroup 内局部 y
        ...cards.map(c => R([c], c.y)),                                  // homeY = 卡片绝对 y
      ],
      online: btnRows(onlineBtns),
      local: btnRows(localBtns),
      custom: btnRows(customBtns),
    };
    (Object.keys(this.screenRows) as ScreenKey[]).forEach(k => {
      this.screenObjs[k] = this.screenRows[k].flatMap(r => r.objs);
    });
    // 初始: 只显示主菜单, 三个子菜单按钮全部隐藏 (留在各自居中位等飞入)
    (['online', 'local', 'custom'] as ScreenKey[]).forEach(s => this.screenObjs[s].forEach(o => o.setVisible(false)));
    this.activeScreen = 'main';
    this.transitioning = false;

    // 6. 顶部右上角工具栏 — 用户: 全屏/音量 已移入「设置」, 主菜单不再放工具栏按钮。

    // 6. 顶部关闭：嵌入主站时由 React 层提供「关闭游戏」，此处不再重复显示
    if (!isEmbeddedInHost()) {
      const back = this.add.text(20, 20, '关闭游戏', {
        fontSize: '14px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
        backgroundColor: 'rgba(0,0,0,0.45)', padding: { x: 8, y: 4 },
      }).setDepth(5).setInteractive({ useHandCursor: true });
      back.on('pointerover', () => back.setColor('#fff3a0'));
      back.on('pointerout', () => back.setColor('#ffd93d'));
      back.on('pointerdown', () => exitToHostApp());
    }

    // P26: 删 'Phaser 3 PoC v0.5' 水印 — 自创, JS 没有.

    // 进游戏先问全屏, 关掉后再弹新手引导 — 二者顺序化, 不重叠 (用户报两个弹窗叠一起)
    this.time.delayedCall(450, () => {
      const asked = this.maybeAskFullscreen(() => this.showTutorial(false));
      if (!asked) this.showTutorial(false);   // 没弹全屏 (已问过/已全屏/不支持) → 直接走引导
    });
  }

  /** 进入游戏时询问是否进全屏 — DOM 弹窗 (按钮点击= 用户手势, 才能触发 requestFullscreen)。
   *  每会话仅一次 (sessionStorage); 已全屏或浏览器不支持则不弹。 */
  private maybeAskFullscreen(onClose?: () => void): boolean {
    try {
      if (this.scale.isFullscreen) return false;
      if (!this.scale.fullscreen?.available) return false;
      if (sessionStorage.getItem('poc-fs-asked')) return false;
      sessionStorage.setItem('poc-fs-asked', '1');
    } catch { return false; }

    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;
      background:rgba(4,8,14,.6);opacity:0;transition:opacity .2s;
      font-family:m6x11,pixel-zh,"Microsoft YaHei",system-ui`;
    const box = document.createElement('div');
    box.style.cssText = `background:#12202a;border:2px solid #ffd93d;border-radius:14px;padding:24px 30px;
      text-align:center;box-shadow:0 0 32px rgba(255,217,107,.3);max-width:420px`;
    box.innerHTML = `<div style="color:#ffd93d;font-size:20px;font-weight:bold;margin-bottom:8px">全屏体验更佳</div>
      <div style="color:#cde;font-size:14px;line-height:1.6;margin-bottom:20px">现在进入全屏吗？<br>(随时可在「设置」里切换)</div>`;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:12px;justify-content:center';
    const no = document.createElement('button');
    no.textContent = '暂不';
    no.style.cssText = `background:#1a2330;color:#9ab;border:2px solid #3a4a5e;border-radius:8px;
      padding:8px 26px;font-size:15px;cursor:pointer;font-family:inherit`;
    const yes = document.createElement('button');
    yes.textContent = '进入全屏';
    yes.style.cssText = `background:#2a1a40;color:#ffd93d;border:2px solid #ffd93d;border-radius:8px;
      padding:8px 26px;font-size:15px;font-weight:bold;cursor:pointer;font-family:inherit`;
    let done = false;
    const close = () => {
      if (done) return; done = true;
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 220);
      onClose?.();   // 关掉全屏弹窗后再弹引导 (顺序化)
    };
    no.onclick = close;
    yes.onclick = () => { try { this.scale.startFullscreen(); } catch { /* ignore */ } close(); };
    row.append(no, yes);
    box.appendChild(row);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
    return true;
  }

  /** btn-frame.png 装饰边框按钮 — v0.9.5.A3: 接 container 参数, 用相对坐标
   *  v0.9.5.A2 真正修 hover "变得很大且回不去": btn-frame.png native=893×212,
   *  setDisplaySize(280,64) 后 bg.scaleX≈0.314. 之前 resetVisual setScale(1)
   *  把按钮跳回 native size = "变得很大". 现在缓存 baseSx/baseSy 后再 reset.
   *  hover 行为照 JS base.css L404: 无 scale, 仅 brightness +8% (用 alpha 模拟).
   */
  private makeFrameButtonInto(parent: Phaser.GameObjects.Container, x: number, y: number, label: string, onClick: () => void, disabled = false, w = 360, h = 85) {
    // 主菜单大改: 模式按钮统一用新长框 menu-frame-rect (无 pressed/disabled 变体 →
    //   按下走缩放, 禁用走灰 tint)。缺纹理回退旧 btn-frame。
    const FRAME = this.textures.exists('menu-frame-rect') ? 'menu-frame-rect' : 'btn-frame';
    const bg = this.add.image(x, y, FRAME).setDisplaySize(w, h).setAlpha(0.95)
      .setInteractive({ useHandCursor: !disabled });
    if (disabled) bg.setTint(0x888888);
    parent.add(bg);
    // 关键: setDisplaySize 后立即缓存 base scale, 后面所有 reset/press 都按这个走
    const baseSx = bg.scaleX, baseSy = bg.scaleY;
    // v0.9.5.A9: button label 走 DOM, 文字锐利接近原生 HTML; pointerThrough 让点击穿透到 bg
    const text = addDomText(this, x, y, label, {
      fontSize: 22,
      color: disabled ? '#8b7755' : '#3a1f00',
      fontWeight: 'bold',
      stroke: { color: '#ffe4a0', width: 1 },
      pointerThrough: true,
    });
    parent.add(text);

    if (disabled) return { bg, text };

    const resetVisual = () => {
      // P103: 入场 slide-in 期间不杀 tween (用户报"鼠标过去按钮卡半")
      const slideDone = (bg as Phaser.GameObjects.Image & { _slideInDone?: boolean })._slideInDone;
      // 子组按钮 / sub 组没 slideIn flag, 默认 done (跳过此检查) → 兼容
      // 过场期间 (transitioning) 不 kill — 否则会杀掉整页飞入/飞出 tween 让按钮卡半
      if (slideDone !== false && !this.transitioning) {
        this.tweens.killTweensOf([bg, text]);
      }
      bg.setScale(baseSx, baseSy);    // 关键: 回到 displaySize 对应的 base scale, 不是 1
      text.setScale(1);
      bg.setAlpha(0.95);
      bg.clearTint();
      bg.setTexture(FRAME);
    };

    // P28: 防 spam-click — 一次按下后整 scene 锁, 配合立即 reset visual.
    //   旧版用 delayedCall(60ms) onClick → 用户狂点时多份 onClick 排队 + 视觉卡 pressed.
    //   新: 同步 reset + onClick, scene 级 flag 阻止后续点击.
    // P103: hover 时 `killTweensOf(bg)` 会杀掉入场 slide-in tween → 鼠标停在按钮目标位 → 按钮"卡半"
    //   修: hover 不再 kill 所有 tween, 只设 alpha. resetVisual 内 killTweensOf 也保留 (出场恢复用).
    let consumed = false;
    bg.on('pointerover', () => {
      if (consumed || this.transitioning) return;   // 过场期间不响应 hover
      // 用户: hover 要有明显反馈 — 放大一点 + 暖金高亮 + 文字微亮 (不动入场 tween)
      bg.setScale(baseSx * 1.04, baseSy * 1.04);
      bg.setAlpha(1).setTint(0xfff0c0);
      text.setScale(1.03);
    });
    bg.on('pointerout', () => { if (!consumed && !this.transitioning) resetVisual(); });
    bg.on('pointerdown', () => {
      if (consumed || this.transitioning) return;   // 过场期间不响应点击
      consumed = true;
      // 视觉 press — 新长框无 pressed 变体, 仅缩放反馈
      bg.setScale(baseSx * 0.96, baseSy * 0.96);
      text.setScale(0.99);
      // 1 帧后 reset + onClick (scene transition 前像素已重绘 idle 态)
      this.time.delayedCall(16, () => {
        resetVisual();
        onClick();
        // P167: 重置 consumed — 否则同场景内可反复点的按钮 (自定义模式/← 返回 toggle) 点一次后
        //   consumed 永久 true → 第二次点死活没反应, 用户报"点自定义→返回后菜单卡死". 重置后 16ms
        //   窗口内仍防 spam (期间 consumed=true), onClick 跑完即重新可点. 切场景按钮重置也无害 (场景重建).
        consumed = false;
      });
    });
    bg.on('pointerup', () => { if (!consumed && !this.transitioning) resetVisual(); });
    bg.on('pointerupoutside', () => { if (!consumed && !this.transitioning) resetVisual(); });
    return { bg, text };
  }

  /** 整页过场: 当前页全部上下错峰飞出 → 目标页居中错峰飞入。
   *  用户要的"点在线模式, 标题+其他按钮+磁贴全撤走, 子菜单屏幕中心入场; 返回反之"。 */
  private goToScreen(target: ScreenKey) {
    if (this.transitioning || target === this.activeScreen) return;
    this.transitioning = true;
    const from = this.activeScreen;
    this.flyOut(this.screenRows[from], () => {
      this.screenObjs[from].forEach(o => o.setVisible(false));
      this.activeScreen = target;
      this.flyIn(this.screenRows[target], () => { this.transitioning = false; });
    });
  }

  private static readonly FLY = 160;   // 飞出/飞入竖直位移

  /** 错峰飞出: 自下而上飞走 + 淡出 (cubic.in)。完成回调在最后一行结束后触发。 */
  private flyOut(rows: FlyRow[], onDone: () => void) {
    const OUT = 230, STAG = 45;
    let last = 0;
    rows.forEach((row, i) => {
      const delay = i * STAG;
      last = Math.max(last, delay + OUT);
      row.objs.forEach(o => {
        this.tweens.killTweensOf(o);
        this.tweens.add({ targets: o, y: row.homeY - MainMenuScene.FLY, alpha: 0, duration: OUT, delay, ease: 'cubic.in' });
      });
    });
    this.time.delayedCall(last + 10, onDone);
  }

  /** 错峰飞入: 从下方飞上来归位 + 淡入 (back.out 轻微回弹)。 */
  private flyIn(rows: FlyRow[], onDone: () => void) {
    const IN = 320, STAG = 55;
    let last = 0;
    rows.forEach((row, i) => {
      const delay = i * STAG;
      last = Math.max(last, delay + IN);
      row.objs.forEach(o => {
        this.tweens.killTweensOf(o);
        o.setVisible(true);
        o.y = row.homeY + MainMenuScene.FLY;
        o.setAlpha(0);
        this.tweens.add({
          targets: o, y: row.homeY, alpha: 1, duration: IN, delay, ease: 'back.out',
          onComplete: () => { o.y = row.homeY; o.setAlpha(1); },
        });
      });
    });
    this.time.delayedCall(last + 20, onDone);
  }

  /** 设置: 打开 SettingsScene (含音量滑块 + 全屏开关) */
  private openSettings() {
    this.scene.start('SettingsScene');
  }

  /** v0.9.5.A: 顶部右上角小工具按钮 (全屏 / 音量), 圆 + emoji icon。
   *  imgKey 传入且纹理存在 → 用贴图按钮 (与战斗顶栏同款, 用户配图), 否则回退 emoji。 */
  private makeToolbarBtn(x: number, y: number, icon: string, tooltip: string, onClick: () => void, imgKey?: string) {
    const useImg = imgKey && this.textures.exists(imgKey);
    const tip = this.add.text(x, y + 32, tooltip, {
      fontSize: '11px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
      backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 4, y: 1 },
    }).setOrigin(0.5).setDepth(51).setAlpha(0);
    if (useImg) {
      // 用户: 去外框, 大小与局内 GlobalToolbar 一致 (52px, 仅图标本体, 无圆框)
      const img = this.add.image(x, y, imgKey).setDisplaySize(52, 52).setDepth(51)
        .setInteractive({ useHandCursor: true });
      const bsx = img.scaleX, bsy = img.scaleY;
      img.on('pointerover', () => { img.setScale(bsx * 1.1, bsy * 1.1); tip.setAlpha(1); });
      img.on('pointerout',  () => { img.setScale(bsx, bsy); tip.setAlpha(0); });
      img.on('pointerdown', () => onClick());
      return { bg: img, txt: img };
    }
    // emoji 回退: 保留圆框
    const bg = this.add.circle(x, y, 18, 0x0a0e18, 0.85).setStrokeStyle(2, 0xffd93d, 0.85)
      .setDepth(50).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, icon, {
      fontSize: '18px', color: '#ffd93d', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(51);
    bg.on('pointerover', () => { bg.setStrokeStyle(3, 0xfff3a0, 1); tip.setAlpha(1); });
    bg.on('pointerout',  () => { bg.setStrokeStyle(2, 0xffd93d, 0.85); tip.setAlpha(0); });
    bg.on('pointerdown', () => onClick());
    return { bg, txt };
  }

  private toggleFullscreen() {
    // v0.9.5.A11: 全屏整个 html 元素 (root), bg 跟随;
    // 否则 Phaser 默认全屏 #game div → html::before bg 留在 html 看不见
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { /* ignore */ });
    } else {
      document.documentElement.requestFullscreen().catch(() => { /* ignore */ });
    }
  }

  private toggleSoundPanel() {
    // 简化版: 切全局静音 (与 JS 版 toggleSound 行为对齐, 滑块版留 v0.9.6 做)
    this.sound.mute = !this.sound.mute;
  }

  /** 右侧信息卡 (v0.9.5.A2: icon 支持 PNG 资源 + emoji 两种)
   *  hover/press 用 stroke 亮度反馈 (Container 自然 scale=1, 无 displaySize 陷阱)
   */
  /** 横向 flex 信息卡 — 照 JS base.css L330 .menu-info-card: icon 左 + label/value 右
   *  返回 card Container 以便外部 tween 入场动画
   */
  private makeInfoCard(
    x: number, y: number, w: number, h: number, label: string,
    icon: { kind: 'image'; src: string } | { kind: 'emoji'; char: string },
    onClick: (() => void) | null, value?: string,
  ): Phaser.GameObjects.Container {
    const card = this.add.container(x, y).setDepth(4);
    const clickable = onClick != null;

    // 卡片背景: 半透明深绿 + 金色细边 (照 JS .menu-info-card)
    const bg = this.add.rectangle(0, 0, w, h, 0x142819, 0.72)
      .setStrokeStyle(1, 0xffd966, 0.35);
    if (clickable) bg.setInteractive({ useHandCursor: true });
    card.add(bg);

    // icon 左侧 16px padding + 16 半 icon = 32 中心
    const iconCenterX = -w / 2 + 16 + 16;
    if (icon.kind === 'image') {
      card.add(addDomImage(this, iconCenterX, 0, icon.src, 32, 32));
    } else {
      card.add(addDomText(this, iconCenterX, 0, icon.char, { fontSize: 28, pointerThrough: true }));
    }

    // 文字区起点: icon 右 + 10 gap
    const textX = iconCenterX + 16 + 10;
    if (value != null) {
      // label + value 上下两行 (战绩) 或 label + 大值 (龟币) — 简化都用上下
      card.add(addDomText(this, textX, -10, label, {
        fontSize: 16, color: '#ffffff', fontWeight: 'bold', letterSpacing: 1, pointerThrough: true,
      }).setOrigin(0, 0.5));
      card.add(addDomText(this, textX, 12, value, {
        fontSize: label === '龟币' ? 18 : 14,
        color: '#ffd966', fontWeight: label === '龟币' ? 'bold' : 'normal',
        pointerThrough: true,
      }).setOrigin(0, 0.5));
    } else {
      // 只有 label, 居中
      card.add(addDomText(this, textX, 0, label, {
        fontSize: 16, color: '#ffffff', fontWeight: 'bold', letterSpacing: 1, pointerThrough: true,
      }).setOrigin(0, 0.5));
    }

    if (!clickable) return card;   // 仅显示 (e.g. 龟币 / 战绩 — 局外无商店)

    // hover 行为照 JS base.css L346-353: translateX -3px + brightness 1.12 + bg 变亮
    const baseX = x;
    const resetVisual = () => {
      this.tweens.killTweensOf(card);
      card.x = baseX;
      bg.setStrokeStyle(1, 0xffd966, 0.35).setFillStyle(0x142819, 0.72);
    };

    bg.on('pointerover', () => {
      this.tweens.killTweensOf(card);
      card.x = baseX - 3;
      bg.setStrokeStyle(2, 0xfff3a0, 0.7).setFillStyle(0x1e3728, 0.85);   // 亮一点
    });
    bg.on('pointerout', () => resetVisual());
    bg.on('pointerdown', () => {
      card.x = baseX - 1;
      this.time.delayedCall(60, () => { card.x = baseX; onClick!(); });
    });
    bg.on('pointerup', () => resetVisual());
    return card;
  }

  /** 主菜单大改: 方形功能磁贴 (frame-square + 图标 + 标签 [+小值]) */
  private makeSquareTile(
    cx: number, cy: number, size: number, label: string, iconKey: string,
    onClick: (() => void) | null, subValue?: string,
  ): Phaser.GameObjects.Container {
    const card = this.add.container(cx, cy).setDepth(4);
    const bg = this.textures.exists('menu-frame-square')
      ? this.add.image(0, 0, 'menu-frame-square').setDisplaySize(size, size)
      : (this.add.rectangle(0, 0, size, size, 0x142819, 0.8).setStrokeStyle(2, 0xffd966, 0.4) as unknown as Phaser.GameObjects.Image);
    if (onClick) bg.setInteractive({ useHandCursor: true });
    card.add(bg);
    void label;   // 用户: 磁贴不要文字标签, 仅图标 (label 仅留作语义/未来 tooltip)
    if (this.textures.exists(iconKey)) {
      // 无文字 → 图标居中放大 (有小值时略上移给值让位)
      const ic = this.add.image(0, subValue ? -size * 0.10 : 0, iconKey);
      const isz = Math.round(size * (subValue ? 0.58 : 0.62));
      ic.setDisplaySize(isz, isz);
      try { ic.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
      card.add(ic);
    }
    if (subValue) {
      card.add(addDomText(this, 0, size * 0.34, subValue, {
        fontSize: 13, color: '#ffd966', fontWeight: 'bold', pointerThrough: true,
      }).setOrigin(0.5));
    }
    if (!onClick) return card;
    bg.on('pointerover', () => card.setScale(1.06));
    bg.on('pointerout', () => card.setScale(1));
    bg.on('pointerdown', () => { card.setScale(0.97); this.time.delayedCall(60, () => { card.setScale(1); onClick(); }); });
    bg.on('pointerup', () => card.setScale(1));
    return card;
  }

  /** 主菜单大改: 龟币框 (frame-coin + 数值) — 仅显示 */
  private makeCoinDisplay(cx: number, cy: number, value: string): Phaser.GameObjects.Container {
    const card = this.add.container(cx, cy).setDepth(4);
    const W = 152, H = Math.round(W * 179 / 319);   // 85, frame-coin 新图比例 319×179 (避免拉伸)
    if (this.textures.exists('menu-frame-coin')) {
      card.add(this.add.image(0, 0, 'menu-frame-coin').setDisplaySize(W, H));
    } else {
      card.add(this.add.rectangle(0, 0, W, H, 0x142819, 0.8).setStrokeStyle(2, 0xffd966, 0.4));
    }
    // 用户: 左侧龟币图(Lucide coins 线性图标, 绿色) + 右侧数字。
    //   关键修: 之前用 addDomHTML 内联 <svg> 渲染不出来 (用户反复"看不到图标")。改用 <img src=data-URI svg>
    //   (跟 index.html 主题光标同款可靠做法), 浏览器当图片解码, 必出图; 同时放大到 36px 更醒目。
    const coinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1f8f3f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.744 17.736a6 6 0 1 1-7.48-7.48"/><path d="M15 6h1v4"/><path d="m6.134 14.768.866-.5 2 3.464"/><circle cx="16" cy="8" r="6"/></svg>`;
    const coinSrc = `data:image/svg+xml,${encodeURIComponent(coinSvg)}`;
    card.add(addDomImage(this, -W * 0.26, 0, coinSrc, 36, 36, { objectFit: 'contain', pointerThrough: true }));
    // 用户: 龟币数量用深色 (浅色羊皮纸框上深字更清晰)
    card.add(addDomText(this, W * 0.02, 0, value, {
      fontSize: 22, color: '#2c4a1e', fontWeight: 'bold', pointerThrough: true,
    }).setOrigin(0, 0.5));
    return card;
  }

  private openCodex() {
    // v0.9.5.A19: 不 fadeOut, Codex 沿用同款 html::before tile bg → 无缝衔接
    const bgm = this.sound.get('bgm-menu');
    if (bgm) this.tweens.add({ targets: bgm, volume: 0.15, duration: 300 });
    this.scene.start('CodexScene');
  }

  private startBattle() {
    // P27: 直接 start, 不 fadeOut 黑屏. BGM 立即停.
    const bgm = this.sound.get('bgm-menu');
    if (bgm) bgm.stop();
    this.scene.start('BattleScene');
  }

  // v0.9.5.A20: 所有 menu→menu 不 fadeOut, 沿用同 tile bg 无缝衔接
  private openTeamSelect(mode: 'pve' | 'dungeon' | 'custom' | 'boss' | 'boss-pick' | 'test') {
    this.scene.start('TeamSelectScene', { mode });
  }

  /** 快速单体调试: DOM 浮层选 1 只龟 → 直接进 test 战斗 (单龟前排 vs 右侧 6 假人) */
  private openSoloDebug() {
    const old = document.getElementById('poc-solo-debug');
    if (old) old.remove();
    const ov = document.createElement('div');
    ov.id = 'poc-solo-debug';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.66);font-family:pixel-zh,"Microsoft YaHei",system-ui,sans-serif';
    const cells = ALL_PETS.map(p => `
      <button class="poc-solo-cell" data-id="${p.id}"
        style="display:flex;flex-direction:column;align-items:center;gap:4px;background:#1c2a47;border:1px solid #3a4d76;border-radius:10px;padding:10px 6px;cursor:pointer;color:#dfe6f0;transition:background .12s,border-color .12s">
        <span style="font-size:28px;line-height:1">${p.emoji ?? '🐢'}</span>
        <span style="font-size:13px;font-weight:600">${p.name}</span>
      </button>`).join('');
    ov.innerHTML = `
      <div style="background:#13203a;border:2px solid #6fa8ff;border-radius:14px;padding:22px 26px;width:min(720px,92vw);max-height:86vh;display:flex;flex-direction:column;box-shadow:0 10px 48px rgba(0,0,0,.6)">
        <div style="font-size:19px;font-weight:700;color:#6fa8ff;margin-bottom:4px">快速单体调试</div>
        <div style="font-size:13px;color:#9fb0cc;margin-bottom:16px">选 1 只龟 → 单龟出战 vs 右侧 6 个 2000HP 假人</div>
        <div style="flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px;padding:2px">
          ${cells}
        </div>
        <div style="margin-top:16px;text-align:right">
          <button id="poc-solo-cancel" style="background:#2a3450;color:#cdd6e4;border:1px solid #44506e;border-radius:8px;padding:9px 22px;font-size:14px;cursor:pointer">取消</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    // 关键: 浮层开着时关掉本场景 Phaser 输入, 否则点击会"穿透"浮层命中后面的菜单按钮
    //   (画布按钮走 Phaser canvas 输入, 与 DOM 浮层不在同一事件链 — 与 ShopOverlay 同款守卫)
    try { this.input.enabled = false; } catch { /* ignore */ }
    const close = () => {
      try { ov.remove(); } catch { /* ignore */ }
      try { this.input.enabled = true; } catch { /* ignore */ }
    };
    ov.querySelectorAll<HTMLButtonElement>('.poc-solo-cell').forEach(btn => {
      btn.onmouseenter = () => { btn.style.background = '#2a3d63'; btn.style.borderColor = '#6fa8ff'; };
      btn.onmouseleave = () => { btn.style.background = '#1c2a47'; btn.style.borderColor = '#3a4d76'; };
      btn.onclick = () => {
        const id = btn.dataset.id!;
        ov.remove();   // 不恢复输入: 直接切场景, 新场景自带输入
        this.scene.start('BattleScene', {
          mode: 'test',
          leftTeam: [id],
          leftSlots: ['front-1'],
          rule: 'normal',
        });
      };
    });
    ov.querySelector<HTMLButtonElement>('#poc-solo-cancel')!.onclick = () => close();
    ov.onclick = (e) => { if (e.target === ov) close(); };
    // 离开场景时清理浮层 (避免残留挡住战斗)
    this.events.once('shutdown', () => { try { ov.remove(); } catch { /* ignore */ } });
  }

  // E3/38 Wave 3.10: openRulePick 删 — RulePickScene 已弃用, 用 TeamSelectScene 内 modal overlay

  private openDungeon() {
    // P19: 经 TeamSelect(dungeon) 选龟+排站位, 再进 DungeonScene (之前直接进 DungeonScene 用默认队, 玩家无法选阵型/站位)
    this.scene.start('TeamSelectScene', { mode: 'dungeon' });
  }

  private openRecord() {
    this.scene.start('RecordScene');
  }

  private openAchievements() {
    this.scene.start('AchievementsScene');
  }


  /** P221 教程入口: 弹确认框 → 开始交互式教程战斗 */
  private confirmStartTutorial() {
    const old = document.getElementById('poc-tutorial-confirm');
    if (old) old.remove();
    const ov = document.createElement('div');
    ov.id = 'poc-tutorial-confirm';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);font-family:pixel-zh, "Microsoft YaHei",system-ui,sans-serif';
    ov.innerHTML = `
      <div style="background:#16213a;border:2px solid #ffd93d;border-radius:12px;padding:28px 36px;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,.6)">
        <div style="font-size:20px;font-weight:700;color:#ffd93d;margin-bottom:8px">新手教程</div>
        <div style="font-size:15px;color:#dfe6f0;margin-bottom:22px">是否开始龟龟对战教程？</div>
        <div style="display:flex;gap:14px;justify-content:center">
          <button id="poc-tut-start" style="background:linear-gradient(180deg,#ffe27a,#ffb01f);color:#3a1f00;font-weight:700;border:none;border-radius:8px;padding:10px 26px;font-size:15px;cursor:pointer">开始教程</button>
          <button id="poc-tut-cancel" style="background:#2a3450;color:#cdd6e4;border:1px solid #44506e;border-radius:8px;padding:10px 22px;font-size:15px;cursor:pointer">取消</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    ov.querySelector<HTMLButtonElement>('#poc-tut-start')!.onclick = () => { ov.remove(); this.startTutorialBattle(); };
    ov.querySelector<HTMLButtonElement>('#poc-tut-cancel')!.onclick = () => ov.remove();
    ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  }

  /** P221 开始教程战斗 — 固定阵容/站位/等级 (我方 Lv7 石头F1·小龟B0·竹叶B2, 敌方 Lv1 钻石F0·天使F2·忍者B1) */
  private startTutorialBattle() {
    this.scene.start('BattleScene', {
      mode: 'pve',
      tutorial: true,
      leftTeam: ['stone', 'basic', 'bamboo'],
      leftSlots: ['front-1', 'back-0', 'back-2'],
      rightTeam: ['diamond', 'angel', 'ninja'],
      rightSlots: ['front-0', 'front-2', 'back-1'],
      leftLevel: 7,
      rightLevel: 1,
    });
  }

  /** 4 步新手引导. force=true 时强制显示, 否则只在首次启动显示一次 */
  private showTutorial(force: boolean) {
    const LS_KEY = 'turtle-poc-tutorial-seen-v1';
    if (!force) {
      try {
        if (localStorage.getItem(LS_KEY)) return;
      } catch { /* ignore */ }
    }
    const { width, height } = this.scale.gameSize;
    const steps = [
      { title: '欢迎', text: '欢迎来到龟龟对战!\n这是一个 3v3 回合制策略游戏。' },
      { title: '组队', text: '点 "深海闯关" 进入选龟界面,\n从 28 只龟中挑 6 只 (3 前 + 3 后)。' },
      { title: '战斗', text: '每回合选 1 个技能 + 目标。\n每 3 回合弹商店, 用龟币买装备。' },
      { title: '协同', text: '阵容里相同标签的龟会激活协同 buff,\n比如 3 只物理龟 = 全队 ATK +8% 流血。' },
    ];

    let step = 0;
    const container = this.add.container(width / 2, height / 2).setDepth(300);

    const veil = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
      .setInteractive();
    container.add(veil);

    const panel = this.add.rectangle(0, 0, 500, 280, 0x1a2740, 0.96)
      .setStrokeStyle(3, 0xffd93d);
    container.add(panel);

    const titleText = this.add.text(0, -100, '', {
      fontSize: '28px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(titleText);

    const bodyText = this.add.text(0, -20, '', {
      fontSize: '16px', color: '#fff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5);
    container.add(bodyText);

    const stepIndicator = this.add.text(0, 60, '', {
      fontSize: '12px', color: '#aaa', fontFamily: 'monospace',
    }).setOrigin(0.5);
    container.add(stepIndicator);

    const nextBtn = this.add.image(0, 100, 'btn-frame').setDisplaySize(180, 44)
      .setInteractive({ useHandCursor: true });
    container.add(nextBtn);
    const nextText = this.add.text(0, 98, '下一步', {
      fontSize: '16px', color: '#3a1f00', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      stroke: '#ffe4a0', strokeThickness: 2,
    }).setOrigin(0.5);
    container.add(nextText);

    const renderStep = () => {
      const s = steps[step];
      titleText.setText(s.title);
      bodyText.setText(s.text);
      stepIndicator.setText(`${step + 1} / ${steps.length}`);
      nextText.setText(step === steps.length - 1 ? '开始游戏' : '下一步 →');
    };
    renderStep();

    nextBtn.on('pointerdown', () => {
      step++;
      if (step >= steps.length) {
        try { localStorage.setItem(LS_KEY, '1'); } catch { /* ignore */ }
        // 引导完成 — 触发成就
        import('../systems/achievement-tracker').then(({ tracker }) => tracker.onTutorialDone());
        this.tweens.add({ targets: container, alpha: 0, duration: 300, onComplete: () => container.destroy() });
      } else {
        this.tweens.add({ targets: panel, scale: 0.96, duration: 60, yoyo: true });
        renderStep();
      }
    });

    container.setAlpha(0);
    this.tweens.add({ targets: container, alpha: 1, duration: 300 });
  }

  private shake() {
    this.cameras.main.shake(120, 0.005);
  }
}
