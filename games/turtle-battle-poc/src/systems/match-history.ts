// ══════════════════════════════════════════════════════════
// match-history.ts — 对局历史持久化 (战绩页"最近对局"用)
// ══════════════════════════════════════════════════════════
// 每场战斗结算时 recordMatch 一条 (结果 + 上阵阵容 + 模式 + 回合 + 时间)。
// 总览胜负/胜率仍走 progress (turtle-poc-progress-v1) 的 battles/wins (losses = battles - wins);
// 这里只存"最近 N 场"的明细列表, 封顶 50 (战绩页展示最近 20)。
const LS_MATCHES = 'turtle-poc-matches-v1';
const CAP = 50;

export interface MatchRecord {
  result: 'win' | 'lose';
  lineup: string[];   // 上阵龟 id
  mode: string;       // pve | dungeon | custom | boss | boss-pick | test
  turn: number;
  ts: number;         // Date.now()
}

export function loadMatches(): MatchRecord[] {
  try {
    const raw = localStorage.getItem(LS_MATCHES);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr as MatchRecord[];
    }
  } catch { /* ignore */ }
  return [];
}

export function recordMatch(rec: MatchRecord): void {
  try {
    const all = loadMatches();
    all.unshift(rec);            // 最新在前
    if (all.length > CAP) all.length = CAP;
    localStorage.setItem(LS_MATCHES, JSON.stringify(all));
  } catch { /* ignore */ }
}
