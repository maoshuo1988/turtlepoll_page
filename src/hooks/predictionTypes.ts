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
  participantCount?: number;
  proText?: string;
  conText?: string;
  proVoteCount?: number;
  conVoteCount?: number;
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
  marketType?: string;
  status?: "OPEN" | "CLOSED" | "SETTLED" | string;
  closeTime?: number;
  externalKey?: string;
  createTime?: number;
  updateTime?: number;
  baseA?: number;
  baseB?: number;
  poolA?: number;
  poolB?: number;
};
export type FootballMarketAggregate = {
  market: FootballMarket;
  context: Partial<PredictContext>;
  hasBet?: boolean;
  betSettleResult?: "WIN" | "LOSE" | string;
};

//
export type FootballMarketsResponse = {
  list: FootballMarketAggregate[];
  total: number;
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
};


//
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
