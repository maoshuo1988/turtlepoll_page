// ══════════════════════════════════════════════════════════
// main.ts — Phaser game entry
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { BattleScene } from './scenes/BattleScene';
import { CodexScene } from './scenes/CodexScene';
import { TeamSelectScene } from './scenes/TeamSelectScene';
// E3/38 Wave 3.10: RulePickScene 已弃用 (Wave 1 改 modal overlay)
import { BattleEndScene } from './scenes/BattleEndScene';
import { DungeonScene } from './scenes/DungeonScene';
import { SettingsScene } from './scenes/SettingsScene';
import { RewardPickScene } from './scenes/RewardPickScene';
import { ChoiceEventScene } from './scenes/ChoiceEventScene';
import { AchievementsScene } from './scenes/AchievementsScene';
import { BossPickScene } from './scenes/BossPickScene';
import { RecordScene } from './scenes/RecordScene';
import { applyPerfMode, startFpsAutoDetect } from './systems/perf-mode';
// DEV gate (用户 2026-05-30 "不分测试/正式版"): 仅 import 即触发模块顶层 side-effect
//   (读 ?dev=1 / ?dev=0 URL 参数写 localStorage), 让 DEV_VISIBLE 常量在场景加载时已确定。
import './dev/devflag';

// PERF-PLAN P0: 低画质模式 (关 backdrop-filter blur) — 移动端默认开, 桌面按 localStorage。
//   尽早执行: 给 <html> 加 .perf-lite + 注入全局 CSS, 在任何场景渲染前生效。
applyPerfMode();

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;

// v0.9.5.A7: DPR 上限 2→3 (用户要求最锐); Text resolution 也跟着到 3 = 9× 文字细节
// gameSize 1280×720, zoom=3 → canvas backing store 3840×2160 (~4K), FIT 下采到 viewport
// 1280×720 游戏在 1080p 显示器: backing 3840×2160, CSS 1920×1080, 2× 下采样 + LINEAR = 极锐
// 性能: 9× 像素填充, 1280×720 base 还很小, 桌面 GPU 完全够; 移动端 dpr 通常 2 自然降级
const DPR = Math.min(window.devicePixelRatio || 1, 3);

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  // 画布透明: 菜单背景走 CSS `html.menu-bg-active::before` 海 tile (设备分辨率, 锐利),
  //   透过透明画布显示在中心+黑边 → 整屏背景同一层 CSS, 处处一样清晰。
  //   (历史教训: 不透明画布 + 画布内 BackgroundScene 画 tile, 会被 1280×720 画布上采样到屏宽
  //    而发糊 — 用户报"四周清晰中间糊"。画布内不该承担静态平铺背景, 交给 CSS。)
  //   闪屏防护: 战斗/结算相机 setBackgroundColor 不透明 (盖住菜单绿 tile, 见 BattleScene);
  //   转场不再加全局 fadeIn (那层蓝淡入本身就是用户看到的"转场闪蓝", 已删)。详见 SCALING-CONTRACT.md。
  transparent: true,
  // 默认 FIT — 主菜单/选龟等场景按比例完整显示 (不裁、不过度放大)。
  // 仅 BattleScene 在 create 时切 ENVELOP「非全屏左右填满」, shutdown 时切回 FIT
  // (见 BattleScene.applyBattleScaleMode)。ENVELOP 全局会把菜单/选龟也放大裁切, 故只限战斗。
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    // v0.9.9: zoom 必须为 1。zoom=DPR 会把 canvas CSS 尺寸钉死成 gameSize×DPR, 高分屏(2K+)上
    //   小于视口 → ENVELOP 无法覆盖, 左右出现空隙且随分辨率变大 (用户报)。文字清晰度由
    //   下面的 setResolution(max(DPR,2)) 单独保证 (与 canvas zoom 无关), 像素精灵用 NEAREST 放大
    //   仍锐, 故去掉 zoom 不糊文字/精灵, 只略软背景图。
    zoom: 1,
    parent: 'game',
  },
  render: {
    // pixelArt:false + antialias:true: WebGL 纹理 LINEAR 平滑过滤 (中文/curve 锐利)
    // roundPixels:false: 标题 breathing tween (0.5→0.52 scale) 时不整数像素跳格抖动
    pixelArt: false,
    antialias: true,
    roundPixels: false,
  },
  // v0.9.5.A9 DOM overlay: 让关键 UI 文字走真实 HTML 元素叠在 canvas 上,
  // 浏览器原生字体 hinting + subpixel AA = 文字质量 = HTML 原生 (彻底解决 canvas-text 糊)
  dom: { createContainer: true },
  scene: [BootScene, MainMenuScene, TeamSelectScene, DungeonScene, BossPickScene, BattleScene, BattleEndScene, CodexScene, SettingsScene, RewardPickScene, ChoiceEventScene, AchievementsScene, RecordScene],
  // 关闭 banner (console 里那行 Phaser 广告)
  banner: false,
  fps: { target: 60, forceSetTimeOut: false },
};

const game = new Phaser.Game(config);

// PERF-PLAN P0: 运行时 FPS 自动降级 — 部署版在较弱电脑上跑不动时自动开低画质 (用户无需手动)。
startFpsAutoDetect(game);

// ── iOS 修复 Phase 0: DOM overlay 在画布之上合成 ──
//   iOS WebKit 把 WebGL <canvas> 提升为独立合成层后, 同级的 Phaser DOM 容器若未单独成层,
//   会被画布"盖住" → 用户报"手机只看得到画布, DOM 全消失"。
//   显式 z-index (画布 0 / DOM 容器 1) + will-change/translateZ 强制 DOM 容器自己成层 → 画在画布上方。
//   不动 Phaser 自己管的 transform/位置, 只补 z-index 与合成提升, 桌面无副作用。
game.events.once(Phaser.Core.Events.BOOT, () => {
  try {
    const fixDomStacking = () => {
      const cv = game.canvas;
      if (cv) { cv.style.zIndex = '0'; cv.style.position = cv.style.position || 'absolute'; }
      const dc = (game as unknown as { domContainer?: HTMLElement }).domContainer;
      if (dc) {
        dc.style.zIndex = '2';
        dc.style.willChange = 'transform';   // 提升为独立合成层, iOS 上才会画在 WebGL 之上
        // 关键: 容器现在盖在画布上 (z-index:2), 默认 pointer-events:auto 会吞掉所有点击 →
        //   画布按钮(Phaser 输入)收不到 → "点不了/卡死"。设 none 让点击穿透到画布;
        //   交互型 DOM 元素 (addDomText 非 pointerThrough / 各面板) 自身已显式 pointer-events:auto, 不受影响。
        dc.style.pointerEvents = 'none';
      }
    };
    fixDomStacking();
    // domContainer 可能在 BOOT 后才建/重建, READY 时再补一次
    game.events.once(Phaser.Core.Events.READY, fixDomStacking);
  } catch { /* ignore */ }
});

// 游戏内反馈/上报 (F11 或右下 🐛): 抓战斗状态+截图+报错 → 复制/下载交开发者
import('./systems/feedback').then(({ initFeedback }) => initFeedback(game));
// 阶段2: 全局 UI 点击音 (Web Audio 合成, 无需文件) — 一处监听覆盖所有 DOM 浮层按钮
import('./systems/sfx-synth').then(({ installUiClickSfx }) => installUiClickSfx());
// F1: JS 跟随式像素手套光标 (有动作: 可点放大/按下收/抓取握拳/禁用红化) — 仅鼠标设备
import('./systems/cursor').then(({ initCursor }) => initCursor());
// v0.9.5.A30: dev only — expose for Playwright headless test (showPetDetail 等)
if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
  // P137+: 技能验证台 — 需先有活的 BattleScene 作 api.scene.
  //   用法 (Playwright): await window.__runSkillAudit()
  (window as unknown as { __runSkillAudit: () => Promise<unknown> }).__runSkillAudit = async () => {
    const { runSkillAudit } = await import('./dev/skill-audit');
    const bs = game.scene.getScene('BattleScene');
    if (!bs || !game.scene.isActive('BattleScene')) {
      game.scene.start('BattleScene');
      await new Promise(r => setTimeout(r, 1500));
    }
    return runSkillAudit(game.scene.getScene('BattleScene'));
  };
  (window as unknown as { __runEquipAudit: () => Promise<unknown> }).__runEquipAudit = async () => {
    const { runEquipAudit } = await import('./dev/equip-audit');
    return runEquipAudit();
  };
  (window as unknown as { __battleStats: () => Promise<unknown> }).__battleStats = async () => {
    const { battleStats } = await import('./systems/battle-stats');
    return battleStats.all();
  };
  (window as unknown as { __runPassiveAudit: () => Promise<unknown> }).__runPassiveAudit = async () => {
    const { runPassiveAudit } = await import('./dev/passive-audit');
    return runPassiveAudit();
  };
  (window as unknown as { __testChestTreasure: () => Promise<unknown> }).__testChestTreasure = async () => {
    const { testChestTreasure } = await import('./dev/passive-audit');
    const bs = game.scene.getScene('BattleScene');
    if (!bs || !game.scene.isActive('BattleScene')) {
      game.scene.start('BattleScene');
      await new Promise(r => setTimeout(r, 1500));
    }
    return testChestTreasure(game.scene.getScene('BattleScene'));
  };
}

// v0.9.5.A6: 全局 Text resolution = DPR
// Phaser Text 默认按 fontSize 像素数渲染 bitmap (e.g. 16px = 16-px-tall 纹理), 缩放后糊
// 给每个 add.text 后自动 setResolution, 让内部 bitmap × res 渲染 → 接近浏览器原生中文清晰度
// P147: 下限提到 2 — Scale.FIT 模式下 canvas (1280) 常被放大到显示宽 (e.g. 1600 = 1.25×),
//   DPR=1 时 res=1 的文字被这放大糊化 (用户报"图鉴名称糊"). res 取 max(DPR,2) 保证 FIT 放大后仍锐.
const TEXT_RES = Math.max(DPR, 2);
game.events.once(Phaser.Core.Events.READY, () => {
  const origText = Phaser.GameObjects.GameObjectFactory.prototype.text;
  Phaser.GameObjects.GameObjectFactory.prototype.text = function (this: Phaser.GameObjects.GameObjectFactory, ...args: Parameters<typeof origText>) {
    const t = origText.apply(this, args);
    t.setResolution(TEXT_RES);
    return t;
  };
  // (已删) 旧的"全局深海淡入转场" fadeIn(280, 6,16,30): 它给每次转场盖一层 280ms 深蓝,
  //   用户报"转场闪的蓝 / 画面糊一下" —— 那正是这层蓝色淡入本身, 而非它要掩盖的闪屏。
  //   菜单背景是连续的 CSS 海 tile (从不消失), 战斗/结算相机不透明覆盖 → 转场本就不闪,
  //   不再需要淡入遮丑, 故移除。别再加全局 fade。详见 SCALING-CONTRACT.md。
});

// 加载页(#splash)现由 BootScene 的真实加载进度驱动并在 complete 时隐藏 (见 BootScene.preload)。
// 这里只留一道安全兜底: 万一 BootScene 没触发 complete (报错/卡死), 12s 后强制隐藏避免永久黑屏。
window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash) { splash.classList.add('hide'); setTimeout(() => splash.remove(), 600); }
  }, 12000);
});
