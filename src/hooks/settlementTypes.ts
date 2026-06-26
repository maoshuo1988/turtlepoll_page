/**
 * 文件说明：待结算抽屉相关类型定义。
 */

export type SettlementSourceTab = 'dark' | 'arena' | 'pk';

export type SettlementCampSide = 'A' | 'B' | 'draw' | 'unknown';

export type SettlementRecordStatus = 'pending' | 'settled';

export type SettlementRecordItem = {
  id: string;
  status: SettlementRecordStatus;
  sourceTab: SettlementSourceTab;
  title: string;
  subtitle: string;
  campSide: SettlementCampSide;
  marketId?: number;
  battleId?: number;
  topicId?: number;
  roundId?: number | string;
};

/** @deprecated 使用 SettlementRecordItem */
export type PendingSettlementItem = SettlementRecordItem;

export type SettlementActionResult = {
  payout: number;
  outcome: 'win' | 'lose' | 'neutral';
  message: string;
  principal?: number;
  odds?: number;
  betOptionLabel?: string;
  settleResult?: string;
};

export type SettlementLeaderboardRow = {
  rank: number;
  name: string;
  score: number;
  side: SettlementCampSide;
  isMe?: boolean;
};

export type SettlementDetailViewModel = {
  record: SettlementRecordItem;
  eyebrow: string;
  headline: string;
  headlineAccent: 'pink' | 'white';
  description: string;
  showHeatDuel: boolean;
  heatLeftValue: number;
  heatRightValue: number;
  heatLeftPct: number;
  heatBadge: string;
  heatBadgeTone: 'pink' | 'grey' | 'gold';
  heatFootnote: string;
  showHeatReward: boolean;
  heatRewardAmount: number;
  heatRewardNote: string;
  heatRewardProgressPct: number;
  heatRewardEmpty: boolean;
  heatRewardEmptyText: string;
  showBetPanel: boolean;
  betPanelTitle: string;
  betOptionLabel: string;
  betPrincipal: number;
  betOdds: number;
  betHit: boolean;
  betPayout: number;
  betFootnote: string;
  showLeaderboard: boolean;
  leaderboardRows: SettlementLeaderboardRow[];
  leaderboardSideLocked: boolean;
  userCampSide: SettlementCampSide;
};
