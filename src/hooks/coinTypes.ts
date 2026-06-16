/**
 * 文件说明：coin Types，定义对应业务域的接口数据类型。
 */
export type AdminCoinMintPayload = {
  userId: number;
  amount: number;
  remark?: string;
};

export type PlaceBetApiOption = "A" | "B" | "DRAW";

/** UI 侧用 C 表示平局，提交接口时需映射为 DRAW */
export type PlaceBetUiOption = "A" | "B" | "C";

export function toPlaceBetApiOption(option: PlaceBetUiOption | PlaceBetApiOption): PlaceBetApiOption {
  if (option === "C") return "DRAW";
  return option;
}

export type PlaceBetPayload = {
  marketId: number;
  option: PlaceBetUiOption | PlaceBetApiOption;
  amount: number;
};

export type PlaceBetResult = {
  bet: PredictBet;
  market: PredictMarket;
  userCoin: UserCoin;
  lockedOdds: number;
};

export type CoinSettlePayload = {
  marketId: number;
};

export type SettleMyBetResult = {
  bet: PredictBet;
  payout: number;
  userCoin: UserCoin;
};

export type CoinSettleResult = {
  list: SettleMyBetResult[];
  count: number;
};

export type PredictBet = {
  id: number;
  userId: number;
  marketId: number;
  option: PlaceBetApiOption | "C";
  amount: number;
  odds: number;
  effA?: number;
  effB?: number;
  status?: string;
  settleResult?: "WIN" | "LOSE";
  payout?: number;
  settleTime?: number;
  createTime?: number;
};

export type PredictMarket = {
  id: number;
  status?: string;
  baseA?: number;
  baseB?: number;
  poolA?: number;
  poolB?: number;
};

export type UserCoin = {
  id?: number;
  userId: number;
  balance: number;
  createTime?: number;
  updateTime?: number;
};

export type CoinLeaderboardItem = {
  rank: number;
  /** coin 域 userId，用于榜单匹配 */
  userId: number;
  /** 用户体系 ID，与 /api/user/current、帖子 user.id 一致，头像 seed 只用这个 */
  id: string;
  nickname: string;
  avatar: string;
  balance: number;
  winRate: number;
  currentWinStreak: number;
  predictionCount: number;
};

export type CoinLeaderboardResult = {
  items: CoinLeaderboardItem[];
  myRank: number | null;
  myBalance: number;
  myWinRate: number;
  myCurrentWinStreak: number;
  total: number;
};

export type CoinLeaderboardParams = {
  limit?: number;
};
