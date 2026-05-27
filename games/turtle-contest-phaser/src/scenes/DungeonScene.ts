// ══════════════════════════════════════════════════════════
// DungeonScene — 深海闯关 5 关递进
// v0.9.5.E1: 对齐 JS dungeon.js:6-12 — 三轴倍率 (HP / ATK / DEF) 分离
//           + 死龟标记 / 累积奖励显示 / 下一关难度预览
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import type { Rarity } from '../types';
import { ALL_PETS } from '../data/pets';
import type { TeamBonus } from './RewardPickScene';

const LS_DUNGEON_BEST = 'turtle-poc-dungeon-best-v1';
const LS_LAST_TEAM = 'turtle-poc-team-v1';

const RARITY_COLOR_STR: Record<Rarity, string> = {
  C: '#06d6a0', B: '#4cc9f0', A: '#3a9abf', S: '#c77dff', SS: '#ffd93d', SSS: '#ff6b6b',
};

// E1: DUNGEON_STAGES — 完整对齐 JS dungeon.js:6-12
// 三轴分离: HP / ATK / DEF (老版本只有单一 mult 偏离原版数值平衡)
interface StageCfg {
  hpMult: number;
  atkMult: number;
  defMult: number;
  label: string;
  boss?: boolean;
  /** 候选敌方 pool */
  pool: string[];
}
// P26: 每关不再硬编 4-5 只 pool — JS dungeon.js:155 用 ALL_PETS.filter(!teamIds),
// 任何非阵容龟都可作为本关敌人. pool 字段保留但内容置空 (BattleScene 会用 ALL_PETS).
const DUNGEON_STAGES: StageCfg[] = [
  { hpMult: 0.85, atkMult: 0.85, defMult: 0.85, label: '第 1 关', pool: [] },
  { hpMult: 1.00, atkMult: 1.00, defMult: 1.00, label: '第 2 关', pool: [] },
  { hpMult: 1.10, atkMult: 1.10, defMult: 1.10, label: '第 3 关', pool: [] },
  { hpMult: 1.20, atkMult: 1.20, defMult: 1.20, label: '第 4 关', pool: [] },
  { hpMult: 3.00, atkMult: 1.25, defMult: 1.40, label: '第 5 关 · BOSS', boss: true, pool: [] },
];
const TOTAL_STAGES = DUNGEON_STAGES.length;

interface DungeonInit {
  stage?: number;                  // 1-5
  playerTeam?: string[];           // 6 龟 id
  playerHpSnapshot?: Array<{ id: string; hp: number; maxHp: number; shield: number; alive?: boolean; position?: 'front' | 'back'; equipIds?: string[]; growth?: Record<string, number> }>;
  bonuses?: TeamBonus[];
  /** E2: 装备席跨关持久化 (JS bench.js dungeonState.equipBenchIds) */
  benchInventoryIds?: string[];
  /** P19: 玩家站位 + 技能 loadout (从 TeamSelect 透传, 跨关持久) */
  playerSlots?: string[];
  loadouts?: Record<string, number[]>;
  /** C3: 深海币跨关携带 */
  coins?: number;
}

export class DungeonScene extends Phaser.Scene {
  private stage = 1;
  private playerTeam: string[] = [];
  private playerHpSnapshot: DungeonInit['playerHpSnapshot'];
  private bonuses: DungeonInit['bonuses'] = [];
  private benchInventoryIds: string[] = [];
  private carryCoins = 0;   // C3: 深海币跨关携带
  private playerSlots: string[] = [];
  private loadouts: Record<string, number[]> = {};
  // P19: 站位/loadout 仅 TeamSelect (第1关) 传入; 后续关 RewardPick→DungeonScene 不带 → 用 session 缓存复用
  private static _cachedSlots: string[] = [];
  private static _cachedLoadouts: Record<string, number[]> = {};

  constructor() { super('DungeonScene'); }

  init(data: DungeonInit) {
    this.stage = data.stage ?? 1;
    this.playerTeam = data.playerTeam ?? this.loadDefaultTeam();
    this.playerHpSnapshot = data.playerHpSnapshot;
    this.bonuses = data.bonuses ?? [];
    this.benchInventoryIds = data.benchInventoryIds ?? [];
    this.carryCoins = data.coins ?? 0;   // C3: 深海币跨关携带
    // 站位/loadout: 传入则用并缓存 (新一局开始), 否则复用缓存 (同一局后续关)
    if (data.playerSlots && data.playerSlots.length) DungeonScene._cachedSlots = data.playerSlots;
    if (data.loadouts && Object.keys(data.loadouts).length) DungeonScene._cachedLoadouts = data.loadouts;
    this.playerSlots = data.playerSlots ?? DungeonScene._cachedSlots;
    this.loadouts = data.loadouts ?? DungeonScene._cachedLoadouts;
  }

  private loadDefaultTeam(): string[] {
    try {
      const raw = localStorage.getItem(LS_LAST_TEAM);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr.filter((x): x is string => typeof x === 'string');
      }
    } catch { /* ignore */ }
    return [];
  }

  create() {
    const { width, height } = this.scale.gameSize;

    document.documentElement.classList.add('menu-bg-active');
    // Phase D: 不再 remove — html.menu-bg-active 全程挂着, drift 动画不重启 (JS body::before 同款)

    this.add.text(width / 2, 50, `深海闯关`, {
      fontSize: '40px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      stroke: '#1a1a2e', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10);

    this.makeIconButton(40, 40, '←', () => this.scene.start('MainMenuScene'));

    this.renderProgressBar(width / 2, 110);

    if (this.playerTeam.length < 3) {
      this.add.text(width / 2, height / 2, '请先在 "组队" 选 3 只龟', {
        fontSize: '18px', color: '#ff5050', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
      }).setOrigin(0.5).setDepth(10);
      this.makeButton(width / 2, height / 2 + 60, '去组队', () => this.scene.start('TeamSelectScene', { mode: 'dungeon' }));
      return;
    }

    const cfg = DUNGEON_STAGES[this.stage - 1];
    if (!cfg) {
      this.add.text(width / 2, height / 2, '关卡越界', {
        fontSize: '20px', color: '#ff5050', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
      }).setOrigin(0.5).setDepth(10);
      this.makeButton(width / 2, height / 2 + 60, '返回菜单', () => this.scene.start('MainMenuScene'));
      return;
    }
    const enemyTeam = this.pickStageEnemies(cfg);

    // 关卡标题
    this.add.text(width / 2, 160, cfg.boss ? `${cfg.label}` : cfg.label, {
      fontSize: '24px', color: cfg.boss ? '#ff6b6b' : '#fff',
      fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    // 难度参数 (HP/ATK/DEF 三段) — JS dungeon.js:6-12
    this.renderDifficultyChips(width / 2, 200, cfg);

    // 阵容预览
    this.renderTeamPreview(width / 2 - 240, 290, this.playerTeam, '我方', true);
    this.renderTeamPreview(width / 2 + 240, 290, enemyTeam, cfg.boss ? '✦ BOSS ✦' : '敌方', false);

    // 累积奖励 (E1: 显示 bonuses 数量)
    if (this.bonuses && this.bonuses.length > 0) {
      this.renderBonusesSummary(width / 2, 400);
    }
    // E2: 装备席 chip
    if (this.benchInventoryIds.length > 0) {
      this.add.text(width / 2, 440, `🎒 装备席 ${this.benchInventoryIds.length}/10 (战利品跨关携带)`, {
        fontSize: '12px', color: '#c77dff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
      }).setOrigin(0.5).setDepth(10);
    }

    // 状态提示 — P219 1:1 JS: 存活龟回满血, 阵亡龟 70% 复活
    const hpKeep = '✓ 存活回满血';
    const deadCount = this.playerHpSnapshot
      ? this.playerHpSnapshot.filter(s => s.alive === false || s.hp === 0).length
      : 0;
    const reviveTag = deadCount > 0 ? ` · ${deadCount} 只 70% HP 复活` : '';
    this.add.text(width / 2, height - 200, `${hpKeep}${reviveTag}`, {
      fontSize: '14px', color: '#aaa', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5).setDepth(10);

    // 开始按钮
    this.makeButton(width / 2, height - 130, cfg.boss ? '挑战 BOSS' : '开始本关', () => {
      // P27: 直接 start, 不 fadeOut 黑屏
      this.scene.start('BattleScene', {
        leftTeam: this.playerTeam,
        leftSlots: this.playerSlots.length ? this.playerSlots : undefined,
        loadouts: this.loadouts,
        rightTeam: enemyTeam,
        mode: 'dungeon',
        dungeonStage: this.stage,
        enemyHpMult: cfg.hpMult,
        enemyAtkMult: cfg.atkMult,
        enemyDefMult: cfg.defMult,
        playerHpSnapshot: this.playerHpSnapshot,
        bonuses: this.bonuses,
        benchInventoryIds: this.benchInventoryIds,
        coins: this.carryCoins,   // C3: 深海币跨关携带
      });
    });
  }

  /** 渲染三轴难度芯片 (HP / ATK / DEF) */
  private renderDifficultyChips(cx: number, cy: number, cfg: StageCfg) {
    const fmt = (v: number) => v >= 1 ? `×${v.toFixed(v % 1 === 0 ? 0 : 2)}` : `×${v.toFixed(2)}`;
    const cells: Array<{ label: string; value: string; color: string }> = [
      { label: 'HP',  value: fmt(cfg.hpMult),  color: cfg.hpMult >= 2 ? '#ff6b6b' : cfg.hpMult >= 1.1 ? '#ffd93d' : '#aaa' },
      { label: 'ATK', value: fmt(cfg.atkMult), color: cfg.atkMult >= 1.2 ? '#ff6b6b' : cfg.atkMult >= 1.1 ? '#ffd93d' : '#aaa' },
      { label: 'DEF', value: fmt(cfg.defMult), color: cfg.defMult >= 1.3 ? '#ff6b6b' : cfg.defMult >= 1.1 ? '#ffd93d' : '#aaa' },
    ];
    const cellW = 110, gap = 8;
    const totalW = cellW * cells.length + gap * (cells.length - 1);
    const startX = cx - totalW / 2 + cellW / 2;
    cells.forEach((c, i) => {
      const x = startX + i * (cellW + gap);
      this.add.rectangle(x, cy, cellW, 32, 0x000000, 0.5).setStrokeStyle(1, 0x58d3ff, 0.5).setDepth(2);
      this.add.text(x - 36, cy, c.label, {
        fontSize: '12px', color: '#aaa', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(3);
      this.add.text(x + 18, cy, c.value, {
        fontSize: '16px', color: c.color, fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(3);
    });
  }

  /** E1: 累积奖励缩略显示 */
  private renderBonusesSummary(cx: number, cy: number) {
    if (!this.bonuses || this.bonuses.length === 0) return;
    const counts = new Map<string, number>();
    for (const b of this.bonuses) {
      const key = b.kind;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const emojiMap: Record<TeamBonus['kind'], string> = {
      atk: '⚔️', hp: '💗', crit: '💥', lifesteal: '🩸', shield: '🛡️', equip: '🎁', heal: '✨',
    };
    const labelMap: Record<TeamBonus['kind'], string> = {
      atk: '攻', hp: '血', crit: '暴', lifesteal: '吸', shield: '盾', equip: '装', heal: '愈',
    };
    const entries = Array.from(counts.entries());
    const chipW = 64, gap = 6;
    const totalW = chipW * entries.length + gap * (entries.length - 1);
    const startX = cx - totalW / 2 + chipW / 2;
    this.add.text(cx, cy - 22, '已获得加成', {
      fontSize: '12px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5).setDepth(10);
    entries.forEach(([kind, n], i) => {
      const x = startX + i * (chipW + gap);
      this.add.rectangle(x, cy, chipW, 28, 0x1a2740, 0.85).setStrokeStyle(1, 0xc77dff).setDepth(10);
      this.add.text(x, cy, `${emojiMap[kind as TeamBonus['kind']]}${labelMap[kind as TeamBonus['kind']]}×${n}`, {
        fontSize: '12px', color: '#fff', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(11);
    });
  }

  private pickStageEnemies(cfg: StageCfg): string[] {
    // P26: pool 空 → 走 ALL_PETS 排除阵容 (JS dungeon.js:155 1:1).
    // 非空 → 用 cfg.pool (保留向后兼容).
    const teamIds = new Set(this.playerTeam);
    const pool = cfg.pool.length > 0
      ? cfg.pool
      : ALL_PETS.map(p => p.id).filter(id => !teamIds.has(id));
    const out: string[] = [];
    const enemyCount = cfg.boss ? 1 : 3;
    const shuffled = [...pool];
    Phaser.Utils.Array.Shuffle(shuffled);
    for (let i = 0; i < enemyCount; i++) out.push(shuffled[i % shuffled.length]);
    return out;
  }

  private renderProgressBar(x: number, y: number) {
    const w = 600, h = 40;
    let best = 0;
    try { best = parseInt(localStorage.getItem(LS_DUNGEON_BEST) ?? '0') || 0; } catch { /* ignore */ }

    this.add.rectangle(x, y, w, h, 0x000000, 0.6).setStrokeStyle(2, 0x58d3ff, 0.6).setDepth(2);
    const segW = w / TOTAL_STAGES;
    for (let i = 0; i < TOTAL_STAGES; i++) {
      const sx = x - w / 2 + i * segW + segW / 2;
      const stage = i + 1;
      const beaten = stage < this.stage;
      const current = stage === this.stage;
      const everBeat = stage <= best;
      const isBossSeg = DUNGEON_STAGES[i]?.boss;
      const color = beaten ? 0x4ade80 : current ? 0xffd93d : everBeat ? 0xc77dff : isBossSeg ? 0x8b1a1a : 0x444444;
      this.add.rectangle(sx, y, segW - 4, h - 8, color, 0.7).setDepth(3);
      this.add.text(sx, y, isBossSeg ? `${stage}★` : `${stage}`, {
        fontSize: '18px', color: current ? '#1a1a2e' : '#fff',
        fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(4);
    }
    this.add.text(x, y + 28, best > 0 ? `历史最佳: 第 ${best} 关` : '尚未通关', {
      fontSize: '11px', color: '#aaa', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5).setDepth(3);
  }

  private renderTeamPreview(centerX: number, centerY: number, team: string[], label: string, isPlayer: boolean) {
    this.add.text(centerX, centerY - 70, label, {
      fontSize: '16px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    const cell = 64;
    const count = team.length;
    for (let i = 0; i < count; i++) {
      const id = team[i];
      const x = centerX + (i - (count - 1) / 2) * (cell + 8);
      const y = centerY;
      const pet = ALL_PETS.find(p => p.id === id);
      const rarity = pet?.rarity as Rarity | undefined;
      const ringColor = rarity ? parseInt(RARITY_COLOR_STR[rarity].slice(1), 16) : 0x666666;

      // E1: 死龟标记
      const snap = isPlayer && this.playerHpSnapshot
        ? this.playerHpSnapshot.find(s => s.id === id) : undefined;
      const isDead = snap && (snap.alive === false || snap.hp === 0);
      const isHurt = snap && !isDead && snap.hp < snap.maxHp;

      this.add.rectangle(x, y, cell, cell, isDead ? 0x331111 : 0x1a2740, 0.85)
        .setStrokeStyle(2, isDead ? 0x888888 : ringColor).setDepth(11);
      const img = this.add.image(x, y, `pet-${id}`).setDisplaySize(40, 40).setDepth(12);
      if (isDead) img.setTint(0x555555).setAlpha(0.5);

      // HP 条 (受伤时)
      if (snap && !isDead) {
        const ratio = Math.max(0, snap.hp / snap.maxHp);
        const barW = cell - 12;
        this.add.rectangle(x, y + cell / 2 - 4, barW, 4, 0x000000, 0.8).setDepth(13);
        this.add.rectangle(x - barW / 2, y + cell / 2 - 4, barW * ratio, 4,
          isHurt ? 0xff6b6b : 0x4ade80, 1).setOrigin(0, 0.5).setDepth(14);
      }
      // 死亡 × 标记
      if (isDead) {
        this.add.text(x, y, '✕', {
          fontSize: '32px', color: '#ff5050', fontFamily: 'monospace', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(15);
        this.add.text(x, y + cell / 2 + 8, '70%复活', {
          fontSize: '10px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
        }).setOrigin(0.5).setDepth(15);
      }
    }
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

  private makeButton(x: number, y: number, label: string, onClick: () => void) {
    const container = this.add.container(x, y).setDepth(20);
    const bg = this.add.image(0, 0, 'btn-frame').setDisplaySize(240, 56)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(0, -2, label, {
      fontSize: '20px', color: '#3a1f00', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
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
  }
}
