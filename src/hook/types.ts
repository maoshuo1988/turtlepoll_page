export type RequestResult<T> = {
  code: number;
  cmd: string;
  method: string;
  msg?: unknown;
  data: T;
};

export type UserCoin = {
  id?: number;
  userId: number;
  balance: number;
  createTime?: number;
  updateTime?: number;
};

export type UserCoinLog = {
  id: number;
  userId: number;
  bizType: string;
  bizId: number;
  amount: number;
  balanceAfter: number;
  remark?: string;
  createTime: number;
};

export type PredictMarket = {
  id: number;
  status?: string;
  baseA?: number;
  baseB?: number;
  poolA?: number;
  poolB?: number;
};

export type PredictBet = {
  id: number;
  userId: number;
  marketId: number;
  option: "A" | "B";
  amount: number;
  odds: number;
  effA?: number;
  effB?: number;
  status?: string;
  createTime?: number;
};

export type PlaceBetPayload = {
  marketId: number;
  option: "A" | "B";
  amount: number;
};

export type PlaceBetResult = {
  bet: PredictBet;
  market: PredictMarket;
  userCoin: UserCoin;
  lockedOdds: number;
};

export type AdminCoinMintPayload = {
  userId: number;
  amount: number;
  remark?: string;
};

export type FootballMarketsParams = {
  page?: number;
  limit?: number;
  sourceModel?: string;
  sourceModelId?: number;
};

export type FootballPredictContextHotParams = {
  limit?: number;
};

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
};

export type FootballMarketsResponse = {
  list: FootballMarketAggregate[];
  total: number;
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

export type FootballPredictContextHotResponse = {
  list: PredictContext[];
  limit: number;
};

export type CaptchaChallenge = {
  id: string;
  imageBase64: string;
  thumbBase64: string;
  thumbSize?: number;
};

export type CaptchaVerification = {
  captchaId: string;
  captchaCode: string;
  captchaProtocol: number;
};

export type SignInPayload = {
  username: string;
  password: string;
} & CaptchaVerification;

export type SignUpPayload = {
  email: string;
  username: string;
  nickname: string;
  password: string;
  rePassword: string;
} & CaptchaVerification;

export type CursorResult<T> = {
  results: T[];
  cursor: number | string;
  hasMore: boolean;
};

export type TopicNodeNav = {
  id: number;
  name: string;
  logo?: string;
  description?: string;
};

export type TopicNodeResponse = TopicNodeNav & {
  topicCount?: number;
  sort?: number;
};

export type TopicTag = {
  id: number;
  name: string;
};

export type TopicImage = {
  url: string;
  preview?: string;
};

export type TopicUser = {
  id?: string;
  nickname?: string;
  username?: string;
  avatar?: string;
  smallAvatar?: string;
  score?: number;
};

export type UserInfo = TopicUser & {
  cover?: string;
  introduction?: string;
};

export type TopicResponse = {
  id: string;
  type: number;
  user?: TopicUser | null;
  node?: TopicNodeNav | null;
  tags?: TopicTag[] | null;
  title?: string;
  summary?: string;
  content?: string;
  imageList?: TopicImage[];
  viewCount?: number;
  commentCount?: number;
  likeCount?: number;
  liked?: boolean;
  createTime?: number;
  recommend?: boolean;
  sticky?: boolean;
  favorited?: boolean;
  ipLocation?: string;
  hideContent?: string;
  contentType?: string;
};

export type SimpleTopic = TopicResponse;

export type TopicEditDetail = {
  id: string;
  nodeId: number;
  title: string;
  content: string;
  contentType: string;
  hideContent?: string;
  tags: string[];
};

export type TopicHideContentResponse = {
  exists: boolean;
  show: boolean;
  content: string;
};

export type CreateTopicPayload = {
  type: number;
  nodeId: number;
  title: string;
  content: string;
  contentType: string;
  hideContent?: string;
  tags: string[];
  imageList: Array<{ url: string }>;
  vote: null;
  captchaId: string;
  captchaCode: string;
  captchaProtocol: number;
};

export type EditTopicPayload = {
  nodeId: number;
  title: string;
  content: string;
  hideContent?: string;
  tags: string[];
};

export type TopicListParams = {
  cursor?: number | string;
  nodeId?: number;
};

export type UserTopicsParams = {
  userId: number;
  cursor?: number | string;
};

export type TagTopicsParams = {
  tagId: number;
  cursor?: number | string;
};

export type TopicNodeInfoParams = {
  nodeId: number;
};

export type TopicHideContentParams = {
  topicId: number;
};

export type TopicToggleFlagPayload = {
  enabled: boolean;
};
