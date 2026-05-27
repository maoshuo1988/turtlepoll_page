// ══════════════════════════════════════════════════════════
// RewardPickScene — 闯关胜利后奖励 (对应 JS 版 "大商店" 概念入口)
// v0.9.4.B 仅做术语对齐 (标题标"大商店"); 当前实现是 3 选 1, JS 版是
// 6 件浏览购买 (装备 22 + 永久 12 + 一次性 8 + 治疗 4 = 46 池抽 6).
// 大商店深度重做留 v0.9.5+
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import { EQUIP_POOL } from '../data/equipment';

interface PlayerSnapshot { id: string; hp: number; maxHp: number; shield: number; alive?: boolean; position?: 'front' | 'back'; equipIds?: string[]; }

interface RewardInit {
  nextStage: number;
  playerTeam: string[];
  playerHpSnapshot: PlayerSnapshot[];
  /** 累积加成 (跨关), 下一关 BattleScene 接 init 时合并到 fighter */
  bonuses?: TeamBonus[];
  /** E2: 装备席跨关持久化 (JS bench.js dungeonState.equipBenchIds) */
  benchInventoryIds?: string[];
  /** C3: 深海币跨关携带 */
  coins?: number;
}

export interface TeamBonus {
  kind: 'atk' | 'hp' | 'crit' | 'lifesteal' | 'shield' | 'equip' | 'heal';
  value?: number;
  equipId?: string;
}

type Reward = {
  kind: TeamBonus['kind'];
  title: string;
  desc: string;
  emoji: string;
  color: number;
  apply(): void;
};

export class RewardPickScene extends Phaser.Scene {
  private rewardData!: RewardInit;

  constructor() { super('RewardPickScene'); }

  init(data: RewardInit) { this.rewardData = { ...data, bonuses: data.bonuses ?? [] } as RewardInit; }

  create() {
    const { width, height } = this.scale.gameSize;

    // v0.9.5.A20: 沿用主菜单 tile bg 无缝衔接 (大商店是 menu 风格屏)
    document.documentElement.classList.add('menu-bg-active');
    // Phase D: 不再 remove — html.menu-bg-active 全程挂着, drift 动画不重启 (JS body::before 同款)
    this.add.text(width / 2, 80, '🏬 大商店 (闯关奖励)', {
      fontSize: '42px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      stroke: '#1a1a2e', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10);

    this.add.text(width / 2, 130, `下一关: 第 ${this.rewardData.nextStage} 关`, {
      fontSize: '16px', color: '#aaa', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5).setDepth(10);

    // 生成 3 个奖励候选
    const rewards = this.generateRewards();

    const cardW = 280, cardH = 360, gap = 40;
    const totalW = cardW * 3 + gap * 2;
    const startX = (width - totalW) / 2 + cardW / 2;
    const cardY = height / 2 + 40;

    rewards.forEach((r, i) => {
      const x = startX + i * (cardW + gap);
      this.makeRewardCard(x, cardY, cardW, cardH, r);
    });
  }

  private generateRewards(): Reward[] {
    // P3.2 大商店扩展: 12 种 buff + 装备 + 治疗 → 3 选 1 随机抽
    const buffOptions: Reward[] = [
      { kind: 'atk', title: '锋利之刃', desc: '全队 ATK +10%', emoji: '⚔️', color: 0xff4444, apply: () => this.pushBonus({ kind: 'atk', value: 0.10 }) },
      { kind: 'atk', title: '霸者之握', desc: '全队 ATK +15%', emoji: '🗡️', color: 0xff2222, apply: () => this.pushBonus({ kind: 'atk', value: 0.15 }) },
      { kind: 'hp', title: '坚韧之躯', desc: '全队 MaxHP +50', emoji: '💗', color: 0x4ade80, apply: () => this.pushBonus({ kind: 'hp', value: 50 }) },
      { kind: 'hp', title: '生命之力', desc: '全队 MaxHP +100', emoji: '❤️', color: 0x16a34a, apply: () => this.pushBonus({ kind: 'hp', value: 100 }) },
      { kind: 'crit', title: '致命直觉', desc: '全队 暴击 +25%', emoji: '💥', color: 0xffd93d, apply: () => this.pushBonus({ kind: 'crit', value: 0.25 }) },
      { kind: 'crit', title: '精准之眼', desc: '全队 暴击 +15%', emoji: '🎯', color: 0xeab308, apply: () => this.pushBonus({ kind: 'crit', value: 0.15 }) },
      { kind: 'lifesteal', title: '血液链接', desc: '全队 生命偷取 +20%', emoji: '🩸', color: 0xff6b6b, apply: () => this.pushBonus({ kind: 'lifesteal', value: 0.20 }) },
      { kind: 'shield', title: '深海护甲', desc: '全队 30 永久护盾', emoji: '🛡️', color: 0x58d3ff, apply: () => this.pushBonus({ kind: 'shield', value: 30 }) },
      { kind: 'shield', title: '钢铁护壁', desc: '全队 60 永久护盾', emoji: '🛡', color: 0x0ea5e9, apply: () => this.pushBonus({ kind: 'shield', value: 60 }) },
      { kind: 'atk', title: '速攻训练', desc: '全队 ATK +8% + crit +10%', emoji: '⚡', color: 0xa855f7, apply: () => { this.pushBonus({ kind: 'atk', value: 0.08 }); this.pushBonus({ kind: 'crit', value: 0.10 }); } },
      // E2/6: 大商店深度 — 从 JS shop.js SHOP_BIG_POOL 移植 3 件
      { kind: 'lifesteal', title: '生命偷取图腾', desc: '全队永久 +8% 生命偷取 (b_vamp)', emoji: '🩸', color: 0xff6b6b, apply: () => this.pushBonus({ kind: 'lifesteal', value: 0.08 }) },
      { kind: 'crit', title: '必胜信念', desc: '全队 暴击 +5% + 击杀 +5% ATK (b_killer)', emoji: '🌟', color: 0xffd93d, apply: () => { this.pushBonus({ kind: 'crit', value: 0.05 }); this.pushBonus({ kind: 'atk', value: 0.05 }); } },
      { kind: 'hp', title: '强者勋章', desc: '全队 +50 maxHp 永久 (b_strong)', emoji: '🏋', color: 0x16a34a, apply: () => this.pushBonus({ kind: 'hp', value: 50 }) },
    ];

    // 治疗
    const heal: Reward = {
      kind: 'heal', title: '潮汐治愈', desc: '满血 + 30 护盾', emoji: '✨', color: 0x06d6a0,
      apply: () => {
        for (const s of this.rewardData.playerHpSnapshot) { s.hp = s.maxHp; s.shield = (s.shield || 0) + 30; }
        this.pushBonus({ kind: 'heal' });
      },
    };

    // E2/3: "随机装备 3 选 1" — 对齐 JS dungeon.js dungeonPickEquipItem 二级选择
    const equipPick: Reward = {
      kind: 'equip', title: '深海宝藏 (装备)', desc: '3 件装备选 1, 进入装备席', emoji: '🎁', color: 0xc77dff,
      // apply 仅 push 占位; 真正 push 在 showEquipSubpicker 选完后
      apply: () => { /* deferred — 走 secondary picker */ },
    };

    // 抽 3 张: 1 buff + 1 equip-pick + 1 heal (JS dungeon.js renderDungeonChoices 风格)
    const buff = buffOptions[Math.floor(Math.random() * buffOptions.length)];
    return [buff, equipPick, heal];
  }

  /**
   * E2/3: 装备 3 选 1 子选择 modal (JS dungeon.js showDungeonEquipPicker)
   * 过滤: 排除 consumable/chest, 若全队都已有 unique 则排除
   */
  private showEquipSubpicker(onPicked: () => void) {
    const { width, height } = this.scale.gameSize;

    // 候选池 — 简化版 (Phaser 端没全队 carryState 时不做 allHave/allFull 过滤)
    const eligible = EQUIP_POOL.filter(e => e.category !== 'consumable' && e.category !== 'chest');
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    const pool = shuffled.slice(0, 3);
    if (pool.length === 0) { onPicked(); return; }

    const container = this.add.container(width / 2, height / 2).setDepth(3000);

    const veil = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setInteractive();
    container.add(veil);
    veil.on('pointerdown', () => { /* 点空白不关 — 必须选 */ });

    const panelW = 720, panelH = 320;
    container.add(this.add.rectangle(0, 0, panelW, panelH, 0x1a2740, 0.98).setStrokeStyle(3, 0xc77dff));
    container.add(this.add.text(0, -panelH / 2 + 26, '🎁 选择一件装备', {
      fontSize: '20px', color: '#ffd93d',
      fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
    }).setOrigin(0.5));
    container.add(this.add.text(0, -panelH / 2 + 52, '装备会进入装备席, 战中拖到龟身上装备', {
      fontSize: '12px', color: '#aaa', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5));

    const cellW = 200, gap = 16;
    const totalW = cellW * 3 + gap * 2;
    const startX = -totalW / 2 + cellW / 2;
    pool.forEach((eq, i) => {
      const cx = startX + i * (cellW + gap);
      const cy = 20;
      const cell = this.add.rectangle(cx, cy, cellW, 190, 0x0a0e18, 0.95).setStrokeStyle(2, 0xc77dff)
        .setInteractive({ useHandCursor: true });
      container.add(cell);
      container.add(this.add.text(cx, cy - 70, eq.icon ?? '📦', { fontSize: '40px', fontFamily: 'monospace' }).setOrigin(0.5));
      container.add(this.add.text(cx, cy - 18, eq.name, {
        fontSize: '14px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      }).setOrigin(0.5));
      container.add(this.add.text(cx, cy + 30, eq.desc ?? '', {
        fontSize: '11px', color: '#fff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
        wordWrap: { width: cellW - 16 }, align: 'center', lineSpacing: 3,
      }).setOrigin(0.5));
      cell.on('pointerover', () => cell.setStrokeStyle(3, 0xffd93d));
      cell.on('pointerout', () => cell.setStrokeStyle(2, 0xc77dff));
      cell.on('pointerdown', () => {
        this.pushBonus({ kind: 'equip', equipId: eq.id });
        container.destroy();
        onPicked();
      });
    });

    // 跳过按钮 — 转化为 ATK+6% (JS dungeonSkipEquip)
    const skip = this.add.rectangle(0, panelH / 2 - 22, 140, 28, 0x444444, 0.9)
      .setStrokeStyle(1, 0xaaaaaa).setInteractive({ useHandCursor: true });
    container.add(skip);
    container.add(this.add.text(0, panelH / 2 - 22, '跳过 (→ ATK +6%)', {
      fontSize: '12px', color: '#fff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5));
    skip.on('pointerdown', () => {
      this.pushBonus({ kind: 'atk', value: 0.06 });
      container.destroy();
      onPicked();
    });
  }

  private pushBonus(b: TeamBonus) {
    (this.rewardData.bonuses ??= []).push(b);
  }

  private makeRewardCard(x: number, y: number, w: number, h: number, r: Reward) {
    const card = this.add.container(x, y).setDepth(5);
    const bg = this.add.rectangle(0, 0, w, h, 0x1a2740, 0.95)
      .setStrokeStyle(3, r.color)
      .setInteractive({ useHandCursor: true });
    card.add(bg);

    card.add(this.add.text(0, -110, r.emoji, { fontSize: '64px', fontFamily: 'monospace' }).setOrigin(0.5));
    card.add(this.add.text(0, -30, r.title, {
      fontSize: '24px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
    }).setOrigin(0.5));
    card.add(this.add.text(0, 20, r.desc, {
      fontSize: '14px', color: '#fff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
      wordWrap: { width: w - 32 }, align: 'center', lineSpacing: 4,
    }).setOrigin(0.5));
    card.add(this.add.text(0, h / 2 - 30, '点击选择', {
      fontSize: '13px', color: '#aaa', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5));

    bg.on('pointerover', () => {
      bg.setStrokeStyle(4, 0xffd93d);
      this.tweens.add({ targets: card, scale: 1.04, duration: 120 });
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(3, r.color);
      this.tweens.add({ targets: card, scale: 1, duration: 120 });
    });
    bg.on('pointerdown', () => {
      this.tweens.add({ targets: card, scale: 0.96, duration: 60, yoyo: true });
      this.time.delayedCall(120, () => {
        // E2/3: equip 卡 → 弹二级 3-选-1 picker, 选完再 toNextStage
        if (r.kind === 'equip' && r.title.startsWith('深海宝藏 (装备)')) {
          this.showEquipSubpicker(() => this.toNextStage());
        } else {
          r.apply();
          this.toNextStage();
        }
      });
    });
  }

  private toNextStage() {
    // P27: 删 fadeOut 黑屏 — 直接 start
    // E2/2: stage 2/4 50% 概率插入 shrine/merchant 选择 (JS dungeon.js 设计)
    const insertChoice = (this.rewardData.nextStage === 2 || this.rewardData.nextStage === 4)
      && Math.random() < 0.5;
    const targetScene = insertChoice ? 'ChoiceEventScene' : 'DungeonScene';
    const payload = insertChoice
      ? {
          nextStage: this.rewardData.nextStage,
          playerTeam: this.rewardData.playerTeam,
          playerHpSnapshot: this.rewardData.playerHpSnapshot,
          bonuses: this.rewardData.bonuses,
          benchInventoryIds: this.rewardData.benchInventoryIds,
          coins: this.rewardData.coins,   // C3
        }
      : {
          stage: this.rewardData.nextStage,
          playerTeam: this.rewardData.playerTeam,
          playerHpSnapshot: this.rewardData.playerHpSnapshot,
          bonuses: this.rewardData.bonuses,
          benchInventoryIds: this.rewardData.benchInventoryIds,
          coins: this.rewardData.coins,   // C3
        };
    this.scene.start(targetScene, payload);
  }
}
