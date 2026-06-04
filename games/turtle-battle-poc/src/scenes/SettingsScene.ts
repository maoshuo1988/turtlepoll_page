// ══════════════════════════════════════════════════════════
// SettingsScene — BGM/SFX 滑条 + 重置存档
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import { isPerfLite, setPerfLite } from '../systems/perf-mode';

const LS_SETTINGS = 'turtle-poc-settings-v1';
const LS_KEYS_TO_RESET = [
  'turtle-poc-team-v1',
  'turtle-poc-progress-v1',
  'turtle-poc-dungeon-best-v1',
  'turtle-poc-tutorial-seen-v1',
];

interface Settings { bgmVol: number; sfxVol: number; }

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { bgmVol: 0.4, sfxVol: 0.6 };
}
function saveSettings(s: Settings) {
  try { localStorage.setItem(LS_SETTINGS, JSON.stringify(s)); } catch { /* ignore */ }
}

export function getStoredVolumes(): Settings { return loadSettings(); }

export class SettingsScene extends Phaser.Scene {
  private settings = loadSettings();

  constructor() { super('SettingsScene'); }

  create() {
    const { width, height } = this.scale.gameSize;
    // v0.9.5.A20: 沿用主菜单 tile bg 无缝衔接
    document.documentElement.classList.add('menu-bg-active');
    // Phase D: 不再 remove — html.menu-bg-active 全程挂着, drift 动画不重启 (JS body::before 同款)
    this.add.text(width / 2, 80, '设置', {
      fontSize: '40px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      stroke: '#1a1a2e', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10);

    this.makeIconButton(40, 40, '←', () => this.back());

    // BGM slider
    this.renderSlider(width / 2, 220, '🎵 BGM 音量', this.settings.bgmVol, (v) => {
      this.settings.bgmVol = v;
      // 更新当前播放的 BGM
      const cur = this.sound.get('bgm-menu') ?? this.sound.get('bgm-battle');
      if (cur) (cur as Phaser.Sound.WebAudioSound).setVolume(v);
      saveSettings(this.settings);
    });

    // SFX slider (即时听 demo)
    this.renderSlider(width / 2, 330, '🔊 音效音量', this.settings.sfxVol, (v) => {
      this.settings.sfxVol = v;
      saveSettings(this.settings);
      this.sound.play('sfx-hit', { volume: v });
    });

    // 全屏开关 (用户: 把全屏键放进设置) — toggle 整个 html 元素全屏
    this.makeButton(width / 2, 410, document.fullscreenElement ? '⛶ 退出全屏' : '⛶ 全屏', () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => { /* ignore */ });
      else document.documentElement.requestFullscreen().catch(() => { /* ignore */ });
    });

    // 低画质模式 (关 backdrop-filter blur 提帧, 移动端默认开) — PERF-PLAN P0
    const perfLabel = () => (isPerfLite() ? '🪶 低画质模式: 开 (流畅)' : '🪶 低画质模式: 关 (高画质)');
    let perfText: Phaser.GameObjects.Text;
    perfText = this.makeButton(width / 2, 490, perfLabel(), () => {
      setPerfLite(!isPerfLite());
      perfText.setText(perfLabel());
    });

    // 重置存档
    this.makeButton(width / 2, 580, '⚠ 重置所有存档', () => {
      for (const k of LS_KEYS_TO_RESET) {
        try { localStorage.removeItem(k); } catch { /* ignore */ }
      }
      // 闪一下成功提示
      const ok = this.add.text(width / 2, 560, '✓ 存档已清空', {
        fontSize: '16px', color: '#06d6a0', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
      }).setOrigin(0.5).setDepth(20).setAlpha(0);
      this.tweens.add({ targets: ok, alpha: 1, duration: 200, yoyo: true, hold: 1500, onComplete: () => ok.destroy() });
    });

    this.add.text(width / 2, height - 40, '设置自动保存到 localStorage', {
      fontSize: '11px', color: '#888', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5).setDepth(5);
  }

  private renderSlider(x: number, y: number, label: string, initial: number, onChange: (v: number) => void) {
    const w = 380;
    this.add.text(x - w / 2, y - 30, label, {
      fontSize: '16px', color: '#fff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0, 0.5).setDepth(10);

    // 轨道
    const track = this.add.rectangle(x, y, w, 8, 0x444444).setDepth(10);
    const fill = this.add.rectangle(x - w / 2, y, w * initial, 8, 0xffd93d).setOrigin(0, 0.5).setDepth(11);
    const handle = this.add.circle(x - w / 2 + w * initial, y, 14, 0xffd93d).setDepth(12)
      .setInteractive({ useHandCursor: true, draggable: true });
    const valueText = this.add.text(x + w / 2 + 20, y, `${Math.round(initial * 100)}%`, {
      fontSize: '14px', color: '#ffd93d', fontFamily: 'monospace',
    }).setOrigin(0, 0.5).setDepth(10);

    this.input.setDraggable(handle);
    handle.on('drag', (_p: unknown, dragX: number) => {
      const clamped = Phaser.Math.Clamp(dragX, x - w / 2, x + w / 2);
      handle.x = clamped;
      const v = (clamped - (x - w / 2)) / w;
      fill.width = w * v;
      valueText.setText(`${Math.round(v * 100)}%`);
      onChange(v);
    });

    // 点轨道也能跳
    track.setInteractive({ useHandCursor: true });
    track.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const clamped = Phaser.Math.Clamp(p.x, x - w / 2, x + w / 2);
      handle.x = clamped;
      const v = (clamped - (x - w / 2)) / w;
      fill.width = w * v;
      valueText.setText(`${Math.round(v * 100)}%`);
      onChange(v);
    });
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Text {
    const container = this.add.container(x, y).setDepth(20);
    const bg = this.add.image(0, 0, 'btn-frame').setDisplaySize(260, 50)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(0, -2, label, {
      fontSize: '18px', color: '#3a1f00', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      stroke: '#ffe4a0', strokeThickness: 2,
    }).setOrigin(0.5);
    container.add(bg);
    container.add(text);

    bg.on('pointerover', () => this.tweens.add({ targets: container, scale: 1.05, duration: 100 }));
    bg.on('pointerout', () => {
      this.tweens.add({ targets: container, scale: 1, duration: 100 });
      bg.setTexture('btn-frame');
    });
    bg.on('pointerdown', () => {
      bg.setTexture('btn-frame-pressed');
      this.tweens.add({ targets: container, scale: 0.96, duration: 60, yoyo: true });
      this.time.delayedCall(100, onClick);
    });
    return text;
  }

  private makeIconButton(x: number, y: number, icon: string, onClick: () => void) {
    const bg = this.add.circle(x, y, 18, 0x000000, 0.55).setStrokeStyle(2, 0x58d3ff)
      .setInteractive({ useHandCursor: true }).setDepth(10);
    const text = this.add.text(x, y, icon, {
      fontSize: '18px', color: '#fff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(11);
    bg.on('pointerover', () => bg.setStrokeStyle(2, 0xffd93d));
    bg.on('pointerout', () => bg.setStrokeStyle(2, 0x58d3ff));
    bg.on('pointerdown', () => {
      this.tweens.add({ targets: [bg, text], scale: 0.85, duration: 60, yoyo: true });
      this.time.delayedCall(80, onClick);
    });
  }

  private back() {
    this.scene.start('MainMenuScene');
  }
}
