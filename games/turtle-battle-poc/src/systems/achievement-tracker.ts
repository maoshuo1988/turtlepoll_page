// ══════════════════════════════════════════════════════════
// achievement-tracker.ts — 解锁追踪 + 累计存档 + 检查解锁
// ══════════════════════════════════════════════════════════
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from '../data/achievements';

const LS_UNLOCKED = 'turtle-poc-ach-unlocked-v1';
const LS_STATS = 'turtle-poc-ach-stats-v1';

export interface AchStats {
  battles: number;
  wins: number;
  crits: number;
  totalDmg: number;
  totalEquipsBought: number;
  totalCoinsEarned: number;
  petsUsed: Record<string, true>;
  rulesSeen: Record<string, true>;
  bestDungeon: number;
  // 临时 (单场内的) — 不持久, 每场重置
}

function loadStats(): AchStats {
  try {
    const raw = localStorage.getItem(LS_STATS);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    battles: 0, wins: 0, crits: 0, totalDmg: 0,
    totalEquipsBought: 0, totalCoinsEarned: 0,
    petsUsed: {}, rulesSeen: {}, bestDungeon: 0,
  };
}
function saveStats(s: AchStats) {
  try { localStorage.setItem(LS_STATS, JSON.stringify(s)); } catch { /* ignore */ }
}

function loadUnlocked(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_UNLOCKED);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}
function saveUnlocked(s: Set<string>) {
  try { localStorage.setItem(LS_UNLOCKED, JSON.stringify([...s])); } catch { /* ignore */ }
}

// 全局单例 (轻量, 不走 Phaser 生命周期)
class AchievementTracker {
  private stats = loadStats();
  private unlocked = loadUnlocked();

  getStats(): Readonly<AchStats> { return this.stats; }
  getUnlocked(): ReadonlySet<string> { return this.unlocked; }

  /** 直接解锁 (id 已检查), 触发奖励. 已解锁的不重复. */
  unlock(id: string): boolean {
    if (this.unlocked.has(id)) return false;
    if (!ACHIEVEMENT_BY_ID[id]) return false;
    this.unlocked.add(id);
    saveUnlocked(this.unlocked);
    return true;
  }

  /** 累计某项数值并检查阈值类成就 */
  track(field: keyof AchStats, value: number | string, opts?: { battleResult?: 'win' | 'lose'; ruleName?: string | null; petId?: string }) {
    let triggered: string[] = [];
    if (typeof value === 'number') {
      const cur = (this.stats[field] as number) || 0;
      (this.stats[field] as unknown as number) = cur + value;
    }
    void opts;
    saveStats(this.stats);
    triggered = this.checkAll();
    return triggered;
  }

  /** 注册玩家使用过的龟 */
  markPetUsed(id: string) {
    this.stats.petsUsed[id] = true;
    saveStats(this.stats);
  }

  /** 注册玩家见过的规则 */
  markRuleSeen(rule: string) {
    this.stats.rulesSeen[rule] = true;
    saveStats(this.stats);
  }

  /** 记最佳通关层数 */
  setBestDungeon(stage: number) {
    if (stage > this.stats.bestDungeon) {
      this.stats.bestDungeon = stage;
      saveStats(this.stats);
    }
  }

  /** 检查所有阈值类成就 (累积统计驱动), 返回本次新解锁的 id 列表 */
  checkAll(): string[] {
    const newly: string[] = [];
    const s = this.stats;
    const tryUnlock = (id: string, cond: boolean) => { if (cond && this.unlock(id)) newly.push(id); };
    // 战斗类
    tryUnlock('first_win', s.wins >= 1);
    tryUnlock('win_10', s.wins >= 10);
    tryUnlock('win_50', s.wins >= 50);
    tryUnlock('win_100', s.wins >= 100);
    tryUnlock('battle_3', s.battles >= 3);
    tryUnlock('battle_25', s.battles >= 25);
    tryUnlock('crit_100', s.crits >= 100);
    // 收集
    tryUnlock('equip_5', s.totalEquipsBought >= 5);
    tryUnlock('equip_25', s.totalEquipsBought >= 25);
    tryUnlock('try_5_pets', Object.keys(s.petsUsed).length >= 5);
    tryUnlock('try_15_pets', Object.keys(s.petsUsed).length >= 15);
    tryUnlock('try_28_pets', Object.keys(s.petsUsed).length >= 28);
    tryUnlock('coins_500', s.totalCoinsEarned >= 500);
    tryUnlock('coins_5000', s.totalCoinsEarned >= 5000);
    tryUnlock('all_rules', Object.keys(s.rulesSeen).length >= 7);
    // 进度
    tryUnlock('dungeon_1', s.bestDungeon >= 1);
    tryUnlock('dungeon_2', s.bestDungeon >= 2);
    tryUnlock('dungeon_3', s.bestDungeon >= 3);
    tryUnlock('dungeon_4', s.bestDungeon >= 4);
    tryUnlock('dungeon_5', s.bestDungeon >= 5);
    return newly;
  }

  /** 直接挂钩: 战斗胜利结算 */
  onBattleEnd(result: 'win' | 'lose', petsUsed: string[], rule: string | null, perBattleDmg: number, perBattleCrits: number, perBattleKills: number, allAlive: boolean): string[] {
    this.stats.battles++;
    if (result === 'win') this.stats.wins++;
    this.stats.crits += perBattleCrits;
    this.stats.totalDmg += perBattleDmg;
    for (const p of petsUsed) this.stats.petsUsed[p] = true;
    if (rule) this.stats.rulesSeen[rule] = true;
    saveStats(this.stats);

    const newly: string[] = [];
    const tryUnlock = (id: string, cond: boolean) => { if (cond && this.unlock(id)) newly.push(id); };
    tryUnlock('dmg_5k_battle', perBattleDmg >= 5000);
    tryUnlock('dmg_10k_battle', perBattleDmg >= 10000);
    tryUnlock('kills_5_battle', perBattleKills >= 5);
    if (result === 'win' && allAlive) tryUnlock('no_loss_battle', true);
    if (result === 'win' && allAlive) tryUnlock('six_alive', true);
    if (rule) tryUnlock('custom_battle', true);
    newly.push(...this.checkAll());
    return [...new Set(newly)];
  }

  onEquipBought(): string[] {
    this.stats.totalEquipsBought++;
    saveStats(this.stats);
    const newly: string[] = [];
    if (this.unlock('first_equip')) newly.push('first_equip');
    if (this.unlock('shop_buy')) newly.push('shop_buy');
    newly.push(...this.checkAll());
    return [...new Set(newly)];
  }

  onCoinsEarned(amount: number): string[] {
    this.stats.totalCoinsEarned += amount;
    saveStats(this.stats);
    return this.checkAll();
  }

  onCodexOpen(): boolean { return this.unlock('codex_open'); }
  onTutorialDone(): boolean { return this.unlock('tutorial_done'); }
}

export const tracker = new AchievementTracker();

// 重置 (设置-重置存档 调用)
export function resetAchievements() {
  try {
    localStorage.removeItem(LS_UNLOCKED);
    localStorage.removeItem(LS_STATS);
  } catch { /* ignore */ }
}

export { ACHIEVEMENTS, ACHIEVEMENT_BY_ID };
