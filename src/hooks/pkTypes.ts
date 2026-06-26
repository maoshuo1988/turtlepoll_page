/**
 * 文件说明：pk Types，定义对应业务域的接口数据类型。
 */
import type { CommentResponse } from './useCommentRequests';
import type { UserCoin } from './coinTypes';

export type PKSide = 'A' | 'B';
export type PKRoundPhase = 'betting' | 'locked' | 'cooldown' | 'settled';
export type PKWinner = PKSide | 'draw';

export type PKTopic = {
  id: number | string;
  slug?: string;
  title?: string;
  sideAName?: string;
  sideBName?: string;
  cover?: string;
  listImage?: string;
  sideABgImage?: string;
  sideBBgImage?: string;
  sideABgColor?: string;
  sideBBgColor?: string;
  status?: 'enabled' | 'disabled' | string;
  currentRoundId?: number | string;
  currentSeasonId?: number | string;
};

export type PKRound = {
  id: number | string;
  topicId?: number | string;
  seasonId?: number | string;
  roundNo?: number;
  phase?: PKRoundPhase | string;
  startTime?: number;
  lockTime?: number;
  endTime?: number;
  nextRoundTime?: number;
  heatA?: number;
  heatB?: number;
  poolA?: number;
  poolB?: number;
  betCountA?: number;
  betCountB?: number;
  winner?: PKWinner | string;
};

export type PKSeason = {
  id?: number | string;
  topicId?: number | string;
  seasonNo?: number;
  winsA?: number;
  winsB?: number;
  startTime?: number;
  endTime?: number;
  champion?: PKWinner | string | null;
};

export type PKBet = {
  id?: number | string;
  topicId?: number | string;
  roundId?: number | string;
  userId?: number | string;
  side?: PKSide;
  amount?: number;
  requestId?: string;
  settleResult?: 'win' | 'lose' | 'draw' | string;
  payout?: number;
};

export type PKStats = {
  totalRounds?: number;
  winsA?: number;
  winsB?: number;
  currentStreakSide?: PKSide;
  currentStreak?: number;
};

export type PKSettleDisabledReason =
  | 'NOT_LOGIN'
  | 'ROUND_NOT_ENDED'
  | 'ROUND_ALREADY_SETTLED'
  | 'ROUND_NOT_READY'
  | string;

export type PKHeatOption = {
  option?: PKSide | string;
  hLike?: number;
  hComment?: number;
  hCoin?: number;
  hTotal?: number;
  snapshotType?: 'CHECKPOINT' | 'SETTLE' | string;
  snapshotTime?: number;
};

export type PKTopicSummary = {
  topic?: PKTopic;
  round?: PKRound;
  season?: PKSeason;
  oddsA?: number;
  oddsB?: number;
  leader?: PKSide | 'draw';
  streakStatus?: string;
  countdownSeconds?: number;
  mySide?: PKSide | '';
  myBet?: PKBet | null;
  hasBet?: boolean;
  canSettle?: boolean;
  settleDisabledReason?: PKSettleDisabledReason;
};

export type PKTopicListResponse = {
  list?: PKTopicSummary[];
  count?: number;
};

export type PKTopicDetailResponse = PKTopicSummary & {
  stats?: PKStats;
  recentRounds?: PKRound[];
};

export type PKHistoryResponse = {
  list?: PKRound[];
  count?: number;
};

export type PKSeasonListResponse = {
  list?: PKSeason[];
  count?: number;
};

export type PKHeatResponse = {
  roundId?: number | string;
  phase?: PKRoundPhase | string;
  heatA?: number;
  heatB?: number;
  options?: PKHeatOption[];
  leader?: PKSide | 'draw';
  streakStatus?: string;
  countdownSeconds?: number;
};

export type PKHeatRankRow = {
  rank?: number;
  userId?: number | string;
  username?: string;
  nickname?: string;
  avatar?: string;
  option?: PKSide | string;
  totalHeat?: number;
  heat?: number;
  actionCount?: number;
  firstActionTime?: number;
};

export type PKHeatRankResponse = {
  topicId?: number | string;
  roundId?: number | string;
  phase?: PKRoundPhase | string;
  options?: PKHeatOption[];
  leaderSide?: PKSide | string;
  list?: PKHeatRankRow[];
  count?: number;
  page?: number;
  pageSize?: number;
};

export type PKHeatMeResponse = {
  topicId?: number | string;
  roundId?: number | string;
  phase?: PKRoundPhase | string;
  options?: PKHeatOption[];
  myOption?: PKSide | '';
  receivedLikeCount?: number;
  myCommentCount?: number;
  myBetAmount?: number;
  estimatedPayout?: number;
  myHeat?: number;
  myActionCount?: number;
  myRank?: number;
  mySideHeat?: Record<string, { heat?: number; count?: number }>;
  myBet?: PKBet | null;
};

export type PKOddsResponse = {
  topicId?: number | string;
  roundId?: number | string;
  phase?: PKRoundPhase | string;
  options?: PKHeatOption[];
  oddsA?: number;
  oddsB?: number;
};

export type PKLikePayload = {
  commentId: number | string;
  requestId: string;
};

export type PKLikeResponse = {
  liked?: boolean;
  optionAtAction?: PKSide | string;
  heat?: {
    round?: PKRound;
    heatA?: number;
    heatB?: number;
  };
};

export type PKRecordOptionPayload = {
  topicId?: number | string;
  roundId?: number | string;
  option: PKSide;
  actionType: string;
  requestId: string;
  entityType?: string;
  entityId?: number | string;
};

export type PKSettlePayload = {
  topicId?: number | string;
  roundId?: number | string;
  requestId?: string;
  snapshotType?: 'SETTLE' | 'CHECKPOINT';
  freezeSource?: string;
};

export type PKSettlement = {
  id?: number | string;
  roundId?: number | string;
  userId?: number | string;
  result?: 'win' | 'lose' | 'draw' | string;
  stakeAmount?: number;
  payoutAmount?: number;
  paid?: boolean;
};

export type PKSettleResponse = {
  topicId?: number | string;
  roundId?: number | string;
  snapshotType?: string;
  freezeSource?: string;
  winner?: PKWinner;
  settledAt?: number;
  options?: PKHeatOption[];
  settlement?: PKSettlement | null;
};

export type PKCommentResponse = CommentResponse & {
  side?: PKSide;
  heatScore?: number;
  downvoteCount?: number;
  downvoted?: boolean;
};

export type PKMyBetRecord = {
  bet?: PKBet;
  topic?: PKTopic;
  round?: PKRound;
};

export type PKMyBetsResponse = {
  list?: PKMyBetRecord[];
  count?: number;
  page?: number;
  pageSize?: number;
};

export type PKRecordOptionResponse = {
  recorded?: boolean;
  optionAtAction?: PKSide | string;
  actionType?: string;
  requestId?: string;
  action?: {
    id?: number | string;
    topicId?: number | string;
    roundId?: number | string;
    side?: PKSide;
    actionType?: string;
    heat?: number;
  };
};

export type PKBetPayload = {
  topicId: number | string;
  side: PKSide;
  requestId: string;
  amount?: number;
};

export type PKBetResponse = {
  bet?: PKBet;
  round?: PKRound;
  userCoin?: UserCoin;
  oddsA?: number;
  oddsB?: number;
};

export type PKCreateCommentPayload = {
  topicId: number | string;
  side: PKSide;
  content: string;
  imageList?: Array<{ url: string }>;
  quoteId?: number | string;
};

export type PKReplyCommentPayload = {
  commentId: number | string;
  content: string;
  imageList?: Array<{ url: string }>;
  quoteId?: number | string;
};

export type PKDownvotePayload = {
  commentId: number | string;
  requestId: string;
};
