// ══════════════════════════════════════════════════════════
// ChoiceEventScene — 闯关阶段中事件 (神龛 / 神秘商人)
// 移植自 JS events.js:102-149 CHOICE_EVENTS
// 触发: 进入 stage 2 / 4 时, 50% 概率插在 RewardPickScene 与 DungeonScene 之间
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import type { TeamBonus } from './RewardPickScene';

interface ChoiceEventInit {
  nextStage: number;
  playerTeam: string[];
  playerHpSnapshot?: Array<{ id: string; hp: number; maxHp: number; shield: number; alive?: boolean; position?: 'front' | 'back'; equipIds?: string[]; growth?: Record<string, number> }>;
  bonuses?: TeamBonus[];
  benchInventoryIds?: string[];
  coins?: number;   // C3: 深海币跨关携带
}

interface ChoiceOption {
  label: string;
  desc: string;
  color: number;
  /** apply by mutating bonuses array (跟随下一关 BattleScene 应用) */
  apply(bonuses: TeamBonus[]): void;
}

interface ChoiceEvent {
  id: string;
  name: string;
  emoji: string;
  text: string;
  options: ChoiceOption[];
}

// JS events.js:102-131 shrine: 4 options
// JS events.js:132-148 merchant: 3 options
// 简化: 跨关无 DeepCoin (在战场内), 把 "纳贡 30 深海币" 换成无 cost 但效果弱的 tradeoff
const CHOICE_EVENTS: ChoiceEvent[] = [
  {
    id: 'shrine', name: '神龛', emoji: '🕯', text: '祭坛上有古老的符文…',
    options: [
      {
        label: '献祭血肉',
        desc: '全队 maxHp -20% · 全队 ATK +25% 永久',
        color: 0xff6b6b,
        apply: (bonuses) => {
          // 用 hp 负值表达 (BattleScene 接 b.kind='hp' 是直接加 maxHp; 这里 -50 全员 ≈ 20%)
          bonuses.push({ kind: 'hp', value: -50 });
          bonuses.push({ kind: 'atk', value: 0.25 });
        },
      },
      {
        label: '神圣加持',
        desc: '全队 maxHp +50 · 暴击 +10%',
        color: 0x4ade80,
        apply: (bonuses) => {
          bonuses.push({ kind: 'hp', value: 50 });
          bonuses.push({ kind: 'crit', value: 0.10 });
        },
      },
      {
        label: '虔诚之心',
        desc: '全队 永久 30 护盾 · 生命偷取 +5%',
        color: 0x58d3ff,
        apply: (bonuses) => {
          bonuses.push({ kind: 'shield', value: 30 });
          bonuses.push({ kind: 'lifesteal', value: 0.05 });
        },
      },
      {
        label: '离开 (无效果)',
        desc: '神龛黯然失色, 你转身离去',
        color: 0x666666,
        apply: () => {},
      },
    ],
  },
  {
    id: 'merchant', name: '神秘商人', emoji: '🗺', text: '戴斗笠的商人推车出现…',
    options: [
      {
        label: '稀有装备',
        desc: '获得 1 件随机唯一装备 (S/SS/SSS)',
        color: 0xc77dff,
        apply: (bonuses) => {
          // 用 EQUIP_POOL 随机抽稀有 — 实际拿装备 id 推 bonuses (跟 RewardPickScene 一致)
          // 这里只 push tag, BattleScene 接 bonuses 时按 kind='equip' 走 attachEquipment
          // 简化: 不在此 import EQUIP_POOL (循环依赖风险), 让 BattleScene 端 init 时
          //       看到 equipId='__unique_random__' 占位时随机抽稀有
          bonuses.push({ kind: 'equip', equipId: '__unique_random__' });
        },
      },
      {
        label: '赌博一把',
        desc: '50% 出唯一装备 / 50% 一无所获',
        color: 0xff6b6b,
        apply: (bonuses) => {
          if (Math.random() < 0.5) bonuses.push({ kind: 'equip', equipId: '__unique_random__' });
        },
      },
      {
        label: '离开 (无效果)',
        desc: '商人推车远去',
        color: 0x666666,
        apply: () => {},
      },
    ],
  },
];

export class ChoiceEventScene extends Phaser.Scene {
  private payload!: ChoiceEventInit;
  private event!: ChoiceEvent;

  constructor() { super('ChoiceEventScene'); }

  init(data: ChoiceEventInit) {
    this.payload = { ...data, bonuses: data.bonuses ?? [] };
    // 随机抽 shrine / merchant
    this.event = CHOICE_EVENTS[Math.floor(Math.random() * CHOICE_EVENTS.length)];
  }

  create() {
    const { width, height } = this.scale.gameSize;

    document.documentElement.classList.add('menu-bg-active');
    // Phase D: 不再 remove — html.menu-bg-active 全程挂着, drift 动画不重启 (JS body::before 同款)

    // 半透明覆盖 (menu bg 已加, 这里再压暗)
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5).setDepth(1);

    // 标题
    this.add.text(width / 2, 80, `${this.event.emoji} ${this.event.name}`, {
      fontSize: '40px', color: '#ffd93d',
      fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      stroke: '#1a1a2e', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10);

    this.add.text(width / 2, 140, this.event.text, {
      fontSize: '18px', color: '#aaa', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5).setDepth(10);

    this.add.text(width / 2, 170, `下一关: 第 ${this.payload.nextStage} 关`, {
      fontSize: '14px', color: '#888', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5).setDepth(10);

    // 选项卡
    const cardW = 280, cardH = 200, gap = 30;
    const n = this.event.options.length;
    const totalW = cardW * n + gap * (n - 1);
    const startX = (width - totalW) / 2 + cardW / 2;
    const cardY = height / 2 + 40;

    this.event.options.forEach((opt, i) => {
      const x = startX + i * (cardW + gap);
      this.makeOptionCard(x, cardY, cardW, cardH, opt);
    });
  }

  private makeOptionCard(x: number, y: number, w: number, h: number, opt: ChoiceOption) {
    const card = this.add.container(x, y).setDepth(5);
    const bg = this.add.rectangle(0, 0, w, h, 0x1a2740, 0.97)
      .setStrokeStyle(3, opt.color)
      .setInteractive({ useHandCursor: true });
    card.add(bg);

    card.add(this.add.text(0, -h / 2 + 30, opt.label, {
      fontSize: '22px', color: '#ffd93d',
      fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
    }).setOrigin(0.5));

    card.add(this.add.text(0, 0, opt.desc, {
      fontSize: '14px', color: '#fff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
      wordWrap: { width: w - 32 }, align: 'center', lineSpacing: 6,
    }).setOrigin(0.5));

    card.add(this.add.text(0, h / 2 - 22, '点击选择', {
      fontSize: '12px', color: '#aaa', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5));

    bg.on('pointerover', () => {
      bg.setStrokeStyle(4, 0xffd93d);
      this.tweens.add({ targets: card, scale: 1.04, duration: 120 });
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(3, opt.color);
      this.tweens.add({ targets: card, scale: 1, duration: 120 });
    });
    bg.on('pointerdown', () => {
      this.tweens.add({ targets: card, scale: 0.96, duration: 60, yoyo: true });
      this.time.delayedCall(120, () => {
        opt.apply(this.payload.bonuses!);
        this.toNextStage();
      });
    });
  }

  private toNextStage() {
    // P27: 直接 start, 不 fadeOut 黑屏
    this.scene.start('DungeonScene', {
      stage: this.payload.nextStage,
      playerTeam: this.payload.playerTeam,
      playerHpSnapshot: this.payload.playerHpSnapshot,
      bonuses: this.payload.bonuses,
      benchInventoryIds: this.payload.benchInventoryIds,
      coins: this.payload.coins,   // C3: 深海币跨关携带
    });
  }
}
