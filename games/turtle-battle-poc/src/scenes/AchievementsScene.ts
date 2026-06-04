// ══════════════════════════════════════════════════════════
// AchievementsScene — 50 项成就 4 类 tab
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import { ACHIEVEMENTS, type AchievementCategory } from '../data/achievements';
import { tracker } from '../systems/achievement-tracker';

const CAT_LABELS: Record<AchievementCategory, string> = {
  battle: '战斗', collect: '收集', progress: '进度', special: '特殊',
};

export class AchievementsScene extends Phaser.Scene {
  private currentCat: AchievementCategory = 'battle';
  private gridContainer!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScroll = 0;

  constructor() { super('AchievementsScene'); }

  create() {
    const { width, height } = this.scale.gameSize;

    // v0.9.5.A20: 沿用主菜单 tile bg 无缝衔接
    document.documentElement.classList.add('menu-bg-active');
    // Phase D: 不再 remove — html.menu-bg-active 全程挂着, drift 动画不重启 (JS body::before 同款)

    // 标题 + 解锁进度
    const unlocked = tracker.getUnlocked();
    this.add.text(width / 2, 50, `🏆 成就 ${unlocked.size}/${ACHIEVEMENTS.length}`, {
      fontSize: '36px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      stroke: '#1a1a2e', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10);

    this.makeIconButton(40, 40, '←', () => this.scene.start('MainMenuScene'));

    // Tab
    const cats: AchievementCategory[] = ['battle', 'collect', 'progress', 'special'];
    const tabY = 110;
    cats.forEach((c, i) => {
      const x = width / 2 + (i - 1.5) * 140;
      const active = this.currentCat === c;
      const tab = this.add.rectangle(x, tabY, 130, 36, active ? 0xffd93d : 0x1a2740, 0.95)
        .setStrokeStyle(2, 0xffd93d).setDepth(10)
        .setInteractive({ useHandCursor: true });
      this.add.text(x, tabY, CAT_LABELS[c], {
        fontSize: '15px', color: active ? '#1a1a2e' : '#ffd93d',
        fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(11);
      tab.on('pointerdown', () => { this.currentCat = c; this.scene.restart(); });
    });

    // Grid area with mask
    const gridX = 60, gridY = 170, gridW = width - 120, gridH = height - 200;
    this.add.rectangle(gridX + gridW / 2, gridY + gridH / 2, gridW, gridH, 0x000000, 0.4)
      .setStrokeStyle(2, 0x58d3ff, 0.4).setDepth(2);

    this.gridContainer = this.add.container(gridX, gridY).setDepth(3);
    const mask = this.make.graphics({ x: 0, y: 0 });
    mask.fillStyle(0xffffff).fillRect(gridX, gridY, gridW, gridH);
    this.gridContainer.setMask(mask.createGeometryMask());

    // 当前类成就
    const list = ACHIEVEMENTS.filter(a => a.category === this.currentCat);
    const cols = 3;
    const cardW = 360, cardH = 100;
    const gapX = 14, gapY = 14;
    list.forEach((a, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 20 + col * (cardW + gapX) + cardW / 2;
      const y = 20 + row * (cardH + gapY) + cardH / 2;
      const isUnlocked = unlocked.has(a.id);

      const card = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, cardW, cardH, 0x1a2740, isUnlocked ? 0.95 : 0.5)
        .setStrokeStyle(2, isUnlocked ? 0xffd93d : 0x666666);
      card.add(bg);

      const emoji = this.add.text(-cardW / 2 + 28, 0, a.emoji, {
        fontSize: '40px', fontFamily: 'monospace',
      }).setOrigin(0.5);
      if (!isUnlocked) emoji.setAlpha(0.3);
      card.add(emoji);

      const name = this.add.text(-cardW / 2 + 70, -22, a.name, {
        fontSize: '16px', color: isUnlocked ? '#ffd93d' : '#888',
        fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      card.add(name);

      const desc = this.add.text(-cardW / 2 + 70, 8, a.desc, {
        fontSize: '12px', color: isUnlocked ? '#fff' : '#666',
        fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
        wordWrap: { width: cardW - 100 },
      }).setOrigin(0, 0.5);
      card.add(desc);

      if (a.rewardCoins) {
        const r = this.add.text(cardW / 2 - 12, -cardH / 2 + 14, `🪙 ${a.rewardCoins}`, {
          fontSize: '11px', color: isUnlocked ? '#ffd93d' : '#666', fontFamily: 'monospace',
        }).setOrigin(1, 0.5);
        card.add(r);
      }
      if (isUnlocked) {
        card.add(this.add.text(cardW / 2 - 12, cardH / 2 - 14, '✓ 已解锁', {
          fontSize: '11px', color: '#06d6a0', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
        }).setOrigin(1, 0.5));
      }

      this.gridContainer.add(card);
    });

    const rows = Math.ceil(list.length / cols);
    const contentH = rows * (cardH + gapY) + 40;
    this.maxScroll = Math.max(0, contentH - gridH);

    this.input.on('wheel', (_p: unknown, _g: unknown, _dx: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, this.maxScroll);
      this.gridContainer.y = gridY - this.scrollY;
    });
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
}
