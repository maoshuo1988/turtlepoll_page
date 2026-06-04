// ══════════════════════════════════════════════════════════
// RecordScene — 战绩: 总览(胜负/胜率) + 最近 20 场(结果 + 上阵阵容)
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import { addDomHTML } from '../systems/dom-text';
import { loadMatches, type MatchRecord } from '../systems/match-history';

const LS_PROGRESS = 'turtle-poc-progress-v1';

const MODE_LABEL: Record<string, string> = {
  pve: '野生', dungeon: '深海闯关', custom: '自定义',
  boss: 'Boss', 'boss-pick': '指定 Boss', test: '测试',
};

function relTime(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60_000) return '刚刚';
  if (d < 3_600_000) return `${Math.floor(d / 60_000)} 分钟前`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)} 小时前`;
  return `${Math.floor(d / 86_400_000)} 天前`;
}

export class RecordScene extends Phaser.Scene {
  constructor() { super('RecordScene'); }

  create() {
    const { width } = this.scale.gameSize;

    // 沿用主菜单 tile bg 无缝衔接 (透过透明画布显示)
    document.documentElement.classList.add('menu-bg-active');

    // 读总览 (progress: battles 计全部, wins 计胜; losses = battles - wins)
    let battles = 0, wins = 0;
    try {
      const raw = localStorage.getItem(LS_PROGRESS);
      if (raw) { const p = JSON.parse(raw); battles = p.battles ?? 0; wins = p.wins ?? 0; }
    } catch { /* ignore */ }
    const losses = Math.max(0, battles - wins);
    const winRate = battles > 0 ? Math.round((wins / battles) * 100) : 0;

    // 标题 + 返回
    this.add.text(width / 2, 50, '📊 战绩', {
      fontSize: '36px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      stroke: '#1a1a2e', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10);
    this.makeIconButton(40, 40, '←', () => this.scene.start('MainMenuScene'));

    // ── 总览卡 ──
    const stat = (label: string, val: string, col: string) =>
      `<div style="flex:1;text-align:center">
         <div style="font-size:30px;font-weight:bold;color:${col}">${val}</div>
         <div style="font-size:12px;color:#9ab;margin-top:2px">${label}</div>
       </div>`;
    const overviewHtml =
      `<div style="display:flex;gap:8px;padding:16px 20px;background:rgba(20,32,40,.82);
                   border:2px solid #2e4a5e;border-radius:12px;margin-bottom:14px">
         ${stat('总场次', String(battles), '#fff')}
         ${stat('胜', String(wins), '#06d6a0')}
         ${stat('负', String(losses), '#ff6b6b')}
         ${stat('胜率', `${winRate}%`, '#ffd93d')}
       </div>`;

    // ── 最近对局列表 (最多 20) ──
    const matches = loadMatches().slice(0, 20);
    const listHtml = matches.length === 0
      ? `<div style="text-align:center;color:#789;padding:48px 0;font-size:14px">还没有对局记录，去打一场吧！</div>`
      : matches.map(m => this.rowHtml(m)).join('');

    const panelHtml =
      `${overviewHtml}
       <div style="font-size:13px;color:#58d3ff;font-weight:bold;margin:0 2px 8px">最近对局 (${matches.length})</div>
       <div style="max-height:430px;overflow-y:auto;padding-right:4px">${listHtml}</div>`;

    const PANEL_W = 760;
    addDomHTML(this, (width - PANEL_W) / 2, 100, panelHtml, {
      width: PANEL_W, fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0, 0).setDepth(8);
  }

  private rowHtml(m: MatchRecord): string {
    const win = m.result === 'win';
    const col = win ? '#06d6a0' : '#ff5c5c';
    const avatars = (m.lineup ?? [])
      .map(id =>
        `<img src="avatars/${id}.png" alt=""
              style="width:34px;height:34px;border-radius:6px;object-fit:cover;background:#0a1422;border:1px solid #2e4a5e"
              onerror="this.style.display='none'">`)
      .join('');
    const mode = MODE_LABEL[m.mode] ?? m.mode;
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;margin-bottom:6px;
                        background:rgba(20,32,40,.7);border-left:4px solid ${col};border-radius:6px">
      <span style="width:30px;font-weight:bold;color:${col};font-size:15px">${win ? '胜' : '负'}</span>
      <span style="display:flex;gap:4px">${avatars}</span>
      <span style="flex:1"></span>
      <span style="color:#9cf;font-size:12px">${mode}</span>
      <span style="color:#778;font-size:11px;width:46px;text-align:right">${m.turn}回合</span>
      <span style="color:#667;font-size:11px;width:64px;text-align:right">${relTime(m.ts)}</span>
    </div>`;
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
