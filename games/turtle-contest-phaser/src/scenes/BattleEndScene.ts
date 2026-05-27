// ══════════════════════════════════════════════════════════
// BattleEndScene — 战斗结算: 胜负 + 玩家阵容伤害统计 + 龟币奖励
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import type { Rarity } from '../types';
import { tracker } from '../systems/achievement-tracker';
import { recordMatch } from '../systems/match-history';

interface PlayerStatRow {
  id: string;
  name: string;
  rarity: Rarity;
  alive: boolean;
  hp: number;
  maxHp: number;
  dmgDealt: number;
  dmgTaken: number;
  healDone: number;
  crits: number;
  kills: number;
}

interface BattleEndInit {
  result: 'win' | 'lose';
  playerStats: PlayerStatRow[];
  turn: number;
  leftTeam: string[];
  leftSlots?: string[];   // v0.9.5.A45
  mode: 'pve' | 'dungeon' | 'custom' | 'boss' | 'boss-pick' | 'test';
  rule?: string | null;
  dungeonStage?: number;
  playerHpSnapshot?: Array<{ id: string; hp: number; maxHp: number; shield: number; alive?: boolean; position?: 'front' | 'back'; equipIds?: string[]; growth?: Record<string, number> }>;
  benchInventoryIds?: string[];  // E2: 装备席跨关持久化
  coins?: number;                // C3: 深海币跨关携带
}

const LS_DUNGEON_BEST = 'turtle-poc-dungeon-best-v1';
const TOTAL_STAGES = 5;

const RARITY_COLOR_STR: Record<Rarity, string> = {
  C: '#06d6a0', B: '#4cc9f0', A: '#3a9abf', S: '#c77dff', SS: '#ffd93d', SSS: '#ff6b6b',
};

const LS_PROGRESS = 'turtle-poc-progress-v1';

interface Progress {
  coins: number;
  battles: number;
  wins: number;
  best: { turn: number; dmg: number };
}

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(LS_PROGRESS);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { coins: 0, battles: 0, wins: 0, best: { turn: Infinity, dmg: 0 } };
}
function saveProgress(p: Progress) {
  try { localStorage.setItem(LS_PROGRESS, JSON.stringify(p)); } catch { /* ignore */ }
}

export class BattleEndScene extends Phaser.Scene {
  private battleData!: BattleEndInit;

  constructor() { super('BattleEndScene'); }

  init(data: BattleEndInit) { this.battleData = data; }

  create() {
    const { width, height } = this.scale.gameSize;
    const isWin = this.battleData.result === 'win';

    // 修闪屏: 本场景画不透明 menu-bg 图, 但 game 全局 transparent → 切场那帧 bg 图未画时
    //   会透出身后绿 tile (战斗→结算"闪一下")。相机填不透明深海底, 杜绝透出。(同 BattleScene)
    this.cameras.main.setBackgroundColor('#0a1726');

    // P27: 删 fadeIn 黑屏 (用户报全场景过场黑屏一闪)

    // 背景 (半透明覆盖菜单 bg)
    const bg = this.add.image(width / 2, height / 2, 'menu-bg');
    bg.setScale(Math.max(width / bg.width, height / bg.height)).setDepth(0);
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setDepth(1);

    // 大字标题
    const title = this.add.text(width / 2, 90, isWin ? '胜利' : '失败', {
      fontSize: '88px',
      color: isWin ? '#ffd93d' : '#ff5050',
      fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 10,
      shadow: { offsetX: 0, offsetY: 0, color: isWin ? '#ffd93d' : '#ff5050', blur: 24, fill: true },
    }).setOrigin(0.5).setDepth(10).setScale(0.3).setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 500, ease: 'back.out' });

    // SFX
    this.sound.play(isWin ? 'sfx-crit' : 'sfx-defeat', { volume: 0.5 });

    // 副标题: 回合数 + 规则
    this.add.text(width / 2, 160, `${this.battleData.turn} 回合${this.battleData.rule ? ' · ' + this.battleData.rule : ''}`, {
      fontSize: '16px', color: '#aaa', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5).setDepth(10);

    // 伤害统计表格
    this.renderStatsTable(width / 2, 200, width - 200);

    // 计算龟币奖励
    const totalDmg = this.battleData.playerStats.reduce((s, p) => s + p.dmgDealt, 0);
    const coinReward = isWin ? 50 + Math.round(totalDmg / 100) : 10;

    // 深海闯关: 一整轮 = 一场对局。只有"通关末关"才算赢, 中途某关胜只是推进 (不计场次/胜负/战绩);
    //   任意一关阵亡 = 这轮结束并计为负。其它模式 = 单场即终局。(用户: 深海只有打通才算赢)
    const isDungeon = this.battleData.mode === 'dungeon' && (this.battleData.dungeonStage ?? 0) > 0;
    const stage = this.battleData.dungeonStage ?? 0;
    const isLast = stage === TOTAL_STAGES;
    const runEnded = !isDungeon || !isWin || isLast;   // 非深海每场即终局; 深海: 失败 或 通关末关
    const runWon = isWin && (!isDungeon || isLast);    // 深海仅末关胜才算赢

    // 更新存档
    const progress = loadProgress();
    progress.coins += coinReward;
    if (runEnded) {
      progress.battles++;
      if (runWon) progress.wins++;
      // 战绩: 记一条对局历史 (结果 + 上阵阵容 + 模式 + 回合 + 时间) — 战绩页"最近对局"用
      recordMatch({
        result: runWon ? 'win' : 'lose',
        lineup: this.battleData.leftTeam ?? [],
        mode: this.battleData.mode,
        turn: this.battleData.turn,
        ts: Date.now(),
      });
    }
    if (isWin && this.battleData.turn < progress.best.turn) progress.best.turn = this.battleData.turn;
    if (totalDmg > progress.best.dmg) progress.best.dmg = totalDmg;
    saveProgress(progress);

    // 奖励显示
    const rewardY = height - 180;
    this.add.text(width / 2, rewardY, `🪙 +${coinReward} 龟币`, {
      fontSize: '28px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10);
    this.add.text(width / 2, rewardY + 32, `当前: ${progress.coins} 龟币 · 累计 ${progress.battles} 场 · ${progress.wins} 胜`, {
      fontSize: '12px', color: '#888', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5).setDepth(10);

    // Dungeon 通关存档 (isDungeon/stage/isLast 已在上方计算)
    if (isDungeon && isWin) {
      try {
        const best = parseInt(localStorage.getItem(LS_DUNGEON_BEST) ?? '0') || 0;
        if (stage > best) localStorage.setItem(LS_DUNGEON_BEST, String(stage));
      } catch { /* ignore */ }
      tracker.setBestDungeon(stage);
    }

    // 成就 tracker 挂钩
    const totalCrits = this.battleData.playerStats.reduce((s, p) => s + p.crits, 0);
    const totalKills = this.battleData.playerStats.reduce((s, p) => s + p.kills, 0);
    const allAlive = this.battleData.playerStats.every(p => p.alive);
    const newAch = tracker.onBattleEnd(
      this.battleData.result,
      this.battleData.leftTeam,
      this.battleData.rule ?? null,
      totalDmg, totalCrits, totalKills, allAlive,
    );
    tracker.onCoinsEarned(coinReward);
    if (newAch.length > 0) this.showAchievementToasts(newAch);

    // 按钮: dungeon win → 下一关 / 通关; 普通模式 → 再战
    this.time.delayedCall(600, () => {
      if (isDungeon && isWin && !isLast) {
        // 选奖励 → 下一关
        this.makeButton(width / 2 - 130, height - 90, `选奖励 → 第 ${stage + 1} 关`, () => {
          // P27: 直接 start, 不 fadeOut 黑屏
          this.scene.start('RewardPickScene', {
            nextStage: stage + 1,
            playerTeam: this.battleData.leftTeam,
            playerHpSnapshot: this.battleData.playerHpSnapshot ?? [],
            benchInventoryIds: this.battleData.benchInventoryIds,
            coins: this.battleData.coins,   // C3: 深海币结余带去奖励页→下一关
          });
        });
        this.makeButton(width / 2 + 130, height - 90, '主菜单', () => this.toMenu());
      } else if (isDungeon && isWin && isLast) {
        // 通关 BOSS
        this.makeButton(width / 2, height - 90, '🏆 通关! 返回菜单', () => this.toMenu());
      } else {
        this.makeButton(width / 2 - 130, height - 90, '再战', () => {
          // P27: 直接 start, 不 fadeOut 黑屏
          this.scene.start('BattleScene', {
            leftTeam: this.battleData.leftTeam,
            leftSlots: this.battleData.leftSlots,
            mode: this.battleData.mode, rule: this.battleData.rule ?? null,
          });
        });
        this.makeButton(width / 2 + 130, height - 90, '主菜单', () => this.toMenu());
      }
    });
  }

  private showAchievementToasts(ids: string[]) {
    const { width } = this.scale.gameSize;
    ids.forEach((id, i) => {
      this.time.delayedCall(800 + i * 1100, () => {
        const t = this.add.container(width - 20, 100 + i * 50).setDepth(50);
        const bg = this.add.rectangle(0, 0, 280, 36, 0x000000, 0.9).setStrokeStyle(2, 0xffd93d).setOrigin(1, 0.5);
        const txt = this.add.text(-10, 0, `🏆 解锁: ${id}`, {
          fontSize: '13px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
        }).setOrigin(1, 0.5);
        t.add(bg); t.add(txt);
        t.setAlpha(0).x = width + 100;
        this.tweens.add({ targets: t, alpha: 1, x: width - 20, duration: 350, ease: 'back.out' });
        this.time.delayedCall(2500, () => this.tweens.add({ targets: t, alpha: 0, duration: 300, onComplete: () => t.destroy() }));
      });
    });
  }

  private toMenu() {
    // P27: 直接 start, 不 fadeOut 黑屏
    this.scene.start('MainMenuScene');
  }

  private renderStatsTable(centerX: number, topY: number, _w: number) {
    // 表头
    const cols = [
      { label: '龟', x: -360, w: 100 },
      { label: '出伤', x: -240, w: 80 },
      { label: '受伤', x: -150, w: 80 },
      { label: '治疗', x: -60, w: 80 },
      { label: '暴击', x: 40, w: 60 },
      { label: '击杀', x: 110, w: 60 },
      { label: '剩余', x: 220, w: 130 },
    ];

    const headY = topY + 40;
    for (const c of cols) {
      this.add.text(centerX + c.x, headY, c.label, {
        fontSize: '13px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(10);
    }

    // 分隔
    this.add.rectangle(centerX, headY + 16, 780, 1, 0xffd93d, 0.5).setDepth(10);

    // 行
    const rowH = 28;
    this.battleData.playerStats.forEach((row, i) => {
      const y = headY + 28 + i * rowH;
      const color = row.alive ? '#fff' : '#888';
      const aliveSuffix = row.alive ? '' : ' (阵亡)';

      this.add.text(centerX + cols[0].x, y, `${row.name}${aliveSuffix}`, {
        fontSize: '13px', color, fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
      }).setOrigin(0.5).setDepth(10);

      // 稀有度小角标
      this.add.text(centerX + cols[0].x - 38, y, row.rarity, {
        fontSize: '10px', color: RARITY_COLOR_STR[row.rarity], fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(10);

      this.add.text(centerX + cols[1].x, y, String(row.dmgDealt), { fontSize: '13px', color, fontFamily: 'monospace' }).setOrigin(0.5).setDepth(10);
      this.add.text(centerX + cols[2].x, y, String(row.dmgTaken), { fontSize: '13px', color, fontFamily: 'monospace' }).setOrigin(0.5).setDepth(10);
      this.add.text(centerX + cols[3].x, y, String(row.healDone), { fontSize: '13px', color, fontFamily: 'monospace' }).setOrigin(0.5).setDepth(10);
      this.add.text(centerX + cols[4].x, y, String(row.crits), { fontSize: '13px', color, fontFamily: 'monospace' }).setOrigin(0.5).setDepth(10);
      this.add.text(centerX + cols[5].x, y, String(row.kills), { fontSize: '13px', color, fontFamily: 'monospace' }).setOrigin(0.5).setDepth(10);
      this.add.text(centerX + cols[6].x, y, `${row.hp}/${row.maxHp}`, { fontSize: '13px', color, fontFamily: 'monospace' }).setOrigin(0.5).setDepth(10);
    });
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void) {
    const container = this.add.container(x, y).setDepth(20);
    const bg = this.add.image(0, 0, 'btn-frame').setDisplaySize(220, 50)
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
