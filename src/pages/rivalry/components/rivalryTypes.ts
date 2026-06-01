/**
 * 文件说明：开撕台页面的展示类型定义。
 */
export type RivalryNewsItem = {
  id: string;
  marketId: number;
  title: string;
  summary: string;
  image: string;
  /** 话题封面（仅 topic.cover 有值时存在，Hero 区优先使用） */
  coverImage?: string;
  listImage?: string;
  sideABgImage?: string;
  sideBBgImage?: string;
  sideABgColor?: string;
  sideBBgColor?: string;
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
