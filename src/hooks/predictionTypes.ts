/**
 * 文件说明：prediction Types，定义对应业务域的接口数据类型。
 */
// Params
export type FootballMarketsParams = {
  page?: number;
  limit?: number;
  sourceModel?: string;
  sourceModelId?: number;
  /** 为 false 时未登录也允许请求公开列表接口 */
  requireAuth?: boolean;
};

export type FootballMarketsByTagParams = {
  tag?: string;
  page?: number;
  limit?: number;
  /** 为 false 时不发起请求（用于按条件补充拉取） */
  enabled?: boolean;
  /** 为 false 时未登录也允许请求公开列表接口 */
  requireAuth?: boolean;
};

/** GET /api/predict/my/markets 的 status 查询参数 */
export type PredictMyMarketsStatusFilter =
  | 'OPEN'
  | 'CLOSED'
  | 'CLOSE'
  | 'SETTLED'
  | '进行中'
  | '待结算'
  | '已结算'
  | 'pending'
  | 'settled'
  | string;

export type PredictMyMarketsParams = {
  page?: number;
  limit?: number;
  status?: PredictMyMarketsStatusFilter;
  enabled?: boolean;
};

export type FootballPredictContextHotParams = {
  limit?: number;
};

export type FootballPredictTagsHotParams = {
  limit?: number;
};

export type FootballBetSettleResultParams = {
  userId: number;
  marketId: number;
};


// Response
export type PredictContext = {
  id?: number;
  marketId: number;
  eventName: string;
  imageUrl?: string;
  listImage?: string;
  sideABgImage?: string;
  sideBBgImage?: string;
  sideCBgImage?: string;
  sideABgColor?: string;
  sideBBgColor?: string;
  sideCBgColor?: string;
  participantCount?: number;
  proText?: string;
  conText?: string;
  drawText?: string;
  neutralText?: string;
  tieText?: string;
  proVoteCount?: number;
  conVoteCount?: number;
  drawVoteCount?: number;
  neutralVoteCount?: number;
  heat?: number;
  detail?: string;
  tags?: string;
  createTime?: number;
  updateTime?: number;
};
export type FootballMarket = {
  id: number;
  sourceModel?: string;
  sourceModelId?: number;
  title?: string;
  /** 世界杯小组赛 `1x2` 才有平局；淘汰赛 / 二元盘为 `binary` */
  marketType?: string;
  optionCount?: number;
  status?: "OPEN" | "CLOSED" | "SETTLED" | string;
  closeTime?: number;
  result?: string;
  externalKey?: string;
  resolved?: boolean;
  resolvedOutcomeId?: string;
  resolvedOutcomeName?: string;
  resolvedAt?: number;
  createTime?: number;
  updateTime?: number;
  baseA?: number;
  baseB?: number;
  /** 兼容旧字段 */
  baseC?: number;
  /** 接口实际字段：平局底池 */
  baseDraw?: number;
  poolA?: number;
  poolB?: number;
  /** 兼容旧字段 */
  poolC?: number;
  /** 接口实际字段：平局池子 */
  poolDraw?: number;
};

export function normalizeFootballMarketType(value?: string) {
  return String(value ?? "").trim().toLowerCase();
}

/** 仅 `1x2` 市场展示/允许平局下注 */
export function marketSupportsDrawBet(market?: Pick<FootballMarket, "marketType">) {
  return normalizeFootballMarketType(market?.marketType) === "1x2";
}

export function resolveMarketDrawBase(market: Pick<FootballMarket, "baseC" | "baseDraw">) {
  if (typeof market.baseDraw === "number") return market.baseDraw;
  if (typeof market.baseC === "number") return market.baseC;
  return 500;
}

export function resolveMarketDrawPool(
  market: Pick<FootballMarket, "poolC" | "poolDraw">,
  fallbackVotes = 0,
) {
  if (typeof market.poolDraw === "number") return market.poolDraw;
  if (typeof market.poolC === "number") return market.poolC;
  return fallbackVotes;
}
export type FootballMarketAggregate = {
  market: FootballMarket;
  context: Partial<PredictContext>;
  hasBet?: boolean;
  betSettleResult?: "WIN" | "LOSE" | string;
  tearSettlement?: PredictTearSettlement;
  schedule?: PredictMarketSchedule;
  matchPhase?: string;
};

//
export type FootballMarketsResponse = {
  list: FootballMarketAggregate[];
  total: number;
};

export type PredictMyMarketsResponse = FootballMarketsResponse & {
  status?: PredictMyMarketsStatusFilter;
};

export type FootballMarketsByTagResponse = FootballMarketsResponse & {
  page: number;
  limit: number;
  tag: string;
};

//
export type FootballPredictContextHotResponse = {
  list: PredictContext[];
  limit: number;
};

export type PredictTagHotItem = {
  tag: string;
  heat: number;
};

export type FootballPredictTagsHotResponse = {
  list: PredictTagHotItem[];
  limit: number;
};

export type FootballBetSettleResultResponse = {
  userId: number;
  marketId: number;
  betSettleResult: string;
  tearSettlement?: PredictTearSettlement;
};

export type PredictTearSettlementStatus =
  | 'NONE'
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'EXPIRED'
  | 'FAILED'
  | string;

export type PredictTearSettlement = {
  canSettle?: boolean;
  status?: PredictTearSettlementStatus;
  reason?: string;
  settledAt?: number;
  deadlineAt?: number;
  remainSeconds?: number;
  rewardLogId?: number;
  winnerOption?: string;
};

export type PredictCommentRewardLog = {
  id?: number;
  marketId?: number;
  winnerOption?: string;
  marketBetTotal?: number;
  rewardPool?: number;
  winnerTotalCommentHeat?: number;
  winnerCommentUserCount?: number;
  perUserReward?: number;
  remainder?: number;
  status?: string;
  reason?: string;
  settledAt?: number;
  deadlineAt?: number;
  paidAt?: number;
};

export type PredictTearSettleResponse = {
  marketId: number;
  rewardLog?: PredictCommentRewardLog;
  tearSettlement?: PredictTearSettlement;
};

export type PredictHeatOption = {
  option?: string;
  hLike?: number;
  hComment?: number;
  hCoin?: number;
  hTotal?: number;
  snapshotType?: string;
  snapshotTime?: number;
};

export type PredictHeatResponse = {
  marketId?: number;
  marketType?: string;
  status?: string;
  options?: PredictHeatOption[];
  snapshotTime?: number;
  snapshotType?: string;
  leaderOption?: string;
  totalHeatValue?: number;
};

export type PredictHeatRankItem = {
  rank?: number;
  userId?: number;
  nickname?: string;
  avatar?: string;
  option?: string;
  totalHeat?: number;
  commentHeat?: number;
  likeHeat?: number;
  coinHeat?: number;
};

export type PredictHeatRankResponse = {
  marketId?: number;
  scope?: string;
  myOption?: string;
  list?: PredictHeatRankItem[];
  count?: number;
  page?: number;
  pageSize?: number;
};

export type PredictHeatMeResponse = {
  marketId?: number;
  userId?: number;
  myOption?: string;
  myHeat?: number;
  myRank?: number;
  commentHeat?: number;
  likeHeat?: number;
  coinHeat?: number;
  myActionCount?: number;
  myCommentCount?: number;
  receivedLikeCount?: number;
  myBetAmount?: number;
};

export type PredictOddsResponse = {
  marketId?: number;
  marketType?: string;
  status?: string;
  oddsA?: number;
  oddsB?: number;
  oddsDraw?: number;
  effA?: number;
  effB?: number;
  effDraw?: number;
  totalEffPool?: number;
};

export type PredictCommentOption = 'A' | 'B' | 'DRAW';

export type PredictMarketSchedule = {
  id?: number;
  matchPhase?: string;
  status?: string;
};

export type PredictContextUpsertPayload = {
  marketId: number;
  eventName: string;
  imageUrl?: string;
  participantCount?: number;
  proText?: string;
  proVoteCount?: number;
  conText?: string;
  conVoteCount?: number;
  heat?: number;
  detail?: string;
  tags?: string;
};
