/**
 * 文件说明：coin Types，定义对应业务域的接口数据类型。
 */
export type AdminCoinMintPayload = {
  userId: number;
  amount: number;
  remark?: string;
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
  option: "A" | "B";
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
