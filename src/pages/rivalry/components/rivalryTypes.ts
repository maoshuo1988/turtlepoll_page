/**
 * 文件说明：开撕台页面的展示类型定义。
 */
export type RivalryNewsItem = {
  id: string;
  title: string;
  summary: string;
  image: string;
  type: 'rivalry';
  votes: { A: number; B: number };
  optionA: string;
  optionB: string;
  oddsA: number;
  oddsB: number;
  status: 'open' | 'closed';
};

export type PKPhase = 'betting' | 'locked' | 'cooldown';

export interface PKRoundResult {
  round: number;
  heatA: number;
  heatB: number;
  winner: 'A' | 'B';
  betCountA: number;
  betCountB: number;
  commentCount: number;
  likeCount: number;
}

export interface PKSeason {
  season: number;
  startDate: string;
  endDate: string;
  totalRounds: number;
  winsA: number;
  winsB: number;
  champion: 'A' | 'B' | null;
}

export interface PKHistory {
  totalRounds: number;
  totalWinsA: number;
  totalWinsB: number;
  longestStreakA: number;
  longestStreakB: number;
  currentStreakSide: 'A' | 'B';
  currentStreak: number;
  seasons: PKSeason[];
}

export interface PKTopicState {
  id: string;
  newsItem: RivalryNewsItem;
  currentRound: number;
  phase: PKPhase;
  roundStartTime: number;
  roundEndTime: number;
  lockTime: number;
  nextRoundTime?: number;
  currentHeatA: number;
  currentHeatB: number;
  betCountA?: number;
  betCountB?: number;
  roundHistory: PKRoundResult[];
  season: PKSeason;
  history: PKHistory;
  lastRoundWinner?: 'A' | 'B';
}
