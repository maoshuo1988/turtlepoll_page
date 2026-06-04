// ══════════════════════════════════════════════════════════
// BossPickScene — v0.9.3.B 指定 Boss 模式: 玩家从 28 龟里挑 1 个做 Boss
// 流程: MainMenu(指定 Boss) → TeamSelect(mode='boss-pick') → BossPick → Battle
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import { ALL_PETS } from '../data/pets';
import type { Rarity } from '../types';

const RARITY_COLOR: Record<Rarity, number> = {
  C: 0x06d6a0, B: 0x4cc9f0, A: 0x3a9abf, S: 0xc77dff, SS: 0xffd93d, SSS: 0xff6b6b,
};

interface BossPickInit {
  leftTeam: string[];                       // 玩家阵容 (用于排除自己选的)
  leftSlots?: string[];                     // v0.9.5.A45: 站位信息透传给 BattleScene
  loadouts?: Record<string, number[]>;
}

export class BossPickScene extends Phaser.Scene {
  private leftTeam: string[] = [];
  private leftSlots: string[] = [];
  private loadouts: Record<string, number[]> = {};
  private gridContainer!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScrollY = 0;

  constructor() { super('BossPickScene'); }

  init(data: BossPickInit) {
    this.leftTeam = data.leftTeam ?? [];
    this.leftSlots = data.leftSlots ?? [];
    this.loadouts = data.loadouts ?? {};
  }

  create() {
    const { width, height } = this.scale.gameSize;
    // v0.9.5.A20: 沿用主菜单 tile bg 无缝衔接
    document.documentElement.classList.add('menu-bg-active');
    // Phase D: 不再 remove — html.menu-bg-active 全程挂着, drift 动画不重启 (JS body::before 同款)

    // 标题
    this.add.text(width / 2, 50, '指定 Boss', {
      fontSize: '42px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      stroke: '#1a1a2e', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(10);
    this.add.text(width / 2, 92, '选 1 只龟成为 Boss (3.5×HP / 1.2×ATK / 1.4×DEF·MR)', {
      fontSize: '14px', color: '#fff3a0', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5).setDepth(10);

    // 返回
    this.makeIconButton(40, 40, '←', () => this.scene.start('TeamSelectScene', { mode: 'boss-pick' }));

    // Grid 区域
    const gridX = 60, gridY = 130, gridW = width - 120, gridH = height - 180;
    this.add.rectangle(gridX + gridW / 2, gridY + gridH / 2, gridW, gridH, 0x000000, 0.4)
      .setStrokeStyle(2, 0x58d3ff, 0.5).setDepth(2);
    this.gridContainer = this.add.container(gridX, gridY).setDepth(3);
    const maskShape = this.make.graphics({ x: 0, y: 0 });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(gridX, gridY, gridW, gridH);
    this.gridContainer.setMask(maskShape.createGeometryMask());

    // 28 龟卡片 (排除玩家选的)
    const candidates = ALL_PETS.filter(p => !this.leftTeam.includes(p.id));
    const cols = 7;
    const cell = 140;
    const padX = (gridW - cols * cell) / 2;
    candidates.forEach((pet, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padX + col * cell + cell / 2;
      const y = 20 + row * cell + cell / 2;
      const card = this.add.container(x, y);

      const bg2 = this.add.rectangle(0, 0, cell - 12, cell - 12, 0x1a2740, 0.9)
        .setStrokeStyle(2, RARITY_COLOR[pet.rarity])
        .setInteractive({ useHandCursor: true });
      card.add(bg2);
      card.add(this.add.image(0, -10, `pet-${pet.id}`).setDisplaySize(72, 72));
      card.add(this.add.text(0, 38, pet.name, {
        fontSize: '13px', color: '#fff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
      }).setOrigin(0.5));
      // 稀有度角标
      card.add(this.add.text(48, -50, pet.rarity, {
        fontSize: '11px', color: '#fff', fontFamily: 'monospace', fontStyle: 'bold',
        backgroundColor: `#${RARITY_COLOR[pet.rarity].toString(16).padStart(6, '0')}`,
        padding: { x: 4, y: 1 },
      }).setOrigin(1, 0));

      bg2.on('pointerover', () => { bg2.setStrokeStyle(4, 0xff6b6b); this.tweens.add({ targets: card, scale: 1.06, duration: 100 }); });
      bg2.on('pointerout',  () => { bg2.setStrokeStyle(2, RARITY_COLOR[pet.rarity]); this.tweens.add({ targets: card, scale: 1, duration: 100 }); });
      bg2.on('pointerdown', () => this.pickBoss(pet.id));

      this.gridContainer.add(card);
    });

    const rows = Math.ceil(candidates.length / cols);
    const contentH = rows * cell + 40;
    this.maxScrollY = Math.max(0, contentH - gridH);

    this.input.on('wheel', (_p: unknown, _go: unknown, _dx: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, this.maxScrollY);
      this.gridContainer.y = gridY - this.scrollY;
    });
  }

  private pickBoss(bossId: string) {
    // P27: 直接 start, 不 fadeOut 黑屏
    this.scene.start('BattleScene', {
      leftTeam: this.leftTeam,
      leftSlots: this.leftSlots,
      mode: 'boss-pick',
      bossId,
      loadouts: this.loadouts,
    });
  }

  private makeIconButton(x: number, y: number, icon: string, onClick: () => void) {
    const bg = this.add.circle(x, y, 18, 0x000000, 0.55).setStrokeStyle(2, 0x58d3ff)
      .setInteractive({ useHandCursor: true }).setDepth(10);
    const text = this.add.text(x, y, icon, {
      fontSize: '18px', color: '#fff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(11);
    bg.on('pointerover', () => bg.setStrokeStyle(2, 0xffd93d));
    bg.on('pointerout',  () => bg.setStrokeStyle(2, 0x58d3ff));
    bg.on('pointerdown', () => {
      this.tweens.add({ targets: [bg, text], scale: 0.85, duration: 60, yoyo: true });
      this.time.delayedCall(80, onClick);
    });
  }
}
