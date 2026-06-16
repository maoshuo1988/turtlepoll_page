/**
 * 文件说明：use Coin Requests，封装对应业务域的接口请求和缓存更新逻辑。
 */
/// MARK: 金币 / 预测下注
/// 基础路径: /api/coin

import { axiosCustom } from "@/api/httpClient";
import { API_Coin_Bet, API_Coin_Leaderboard, API_Coin_Me, API_Coin_Settle } from "@/api/coinApi";
import { getAuthToken } from "@/utils/authStorage";
import { assertSuccess, getAuthorizationHeaders } from "@/utils/requestUtils";
import {  useMutation, useQuery, useQueryClient } from "react-query";
import type {
  CoinLeaderboardItem,
  CoinLeaderboardParams,
  CoinLeaderboardResult,
  CoinSettlePayload,
  CoinSettleResult,
  PlaceBetPayload,
  PlaceBetResult,
  UserCoin,
} from "./coinTypes";
import { toPlaceBetApiOption } from "./coinTypes";

// 我的金币账户缓存 key
export const COIN_ME_QUERY_KEY = ["requestCoinMe"] as const;
export const COIN_LEADERBOARD_QUERY_KEY = ["requestCoinLeaderboard"] as const;

function toNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function normalizeCoinLeaderboardItem(raw: Record<string, unknown>): CoinLeaderboardItem {
  const userId = toNumber(raw.userId ?? raw.user_id);
  const id = String(raw.id ?? raw.userId ?? raw.user_id ?? '').trim() || (userId ? String(userId) : '');
  const nickname = String(raw.nickname ?? raw.nick_name ?? "").trim();

  return {
    rank: toNumber(raw.rank),
    userId,
    id,
    nickname: nickname || `用户 ${id || userId || "?"}`,
    avatar: String(raw.avatar ?? raw.smallAvatar ?? raw.small_avatar ?? "").trim(),
    balance: toNumber(raw.balance),
    winRate: toNumber(raw.winRate ?? raw.win_rate),
    currentWinStreak: toNumber(raw.currentWinStreak ?? raw.current_win_streak),
    predictionCount: toNumber(
      raw.predictionCount ??
        raw.prediction_count ??
        raw.predictedCount ??
        raw.predicted_count ??
        raw.betCount ??
        raw.bet_count,
    ),
  };
}

function normalizeCoinLeaderboardResult(raw: Record<string, unknown>): CoinLeaderboardResult {
  const itemsSource = Array.isArray(raw.items) ? raw.items : [];
  const myRankRaw = raw.myRank ?? raw.my_rank;
  const myRank =
    myRankRaw === null || myRankRaw === undefined || myRankRaw === ""
      ? null
      : toNumber(myRankRaw, NaN);
  const normalizedMyRank = myRank !== null && Number.isFinite(myRank) && myRank > 0 ? myRank : null;

  return {
    items: itemsSource.map((item) => normalizeCoinLeaderboardItem((item ?? {}) as Record<string, unknown>)),
    myRank: normalizedMyRank,
    myBalance: toNumber(raw.myBalance ?? raw.my_balance),
    myWinRate: toNumber(raw.myWinRate ?? raw.my_win_rate),
    myCurrentWinStreak: toNumber(raw.myCurrentWinStreak ?? raw.my_current_win_streak),
    total: toNumber(raw.total ?? raw.count, itemsSource.length),
  };
}

// 统一写入金币账户缓存，所有使用 useRequestCoinMe 的地方都会同步刷新
function syncCoinLeaderboardMyBalanceCache(
  queryClient: ReturnType<typeof useQueryClient>,
  nextBalance: number,
) {
  if (!Number.isFinite(nextBalance)) return;

  queryClient.setQueriesData<CoinLeaderboardResult | undefined>(COIN_LEADERBOARD_QUERY_KEY, (current) => {
    if (!current) return current;
    return {
      ...current,
      myBalance: nextBalance,
    };
  });
}

function decreaseCoinLeaderboardMyBalanceCache(queryClient: ReturnType<typeof useQueryClient>, cost: number) {
  if (!Number.isFinite(cost) || cost <= 0) return;

  queryClient.setQueriesData<CoinLeaderboardResult | undefined>(COIN_LEADERBOARD_QUERY_KEY, (current) => {
    if (!current) return current;
    return {
      ...current,
      myBalance: Math.max(0, current.myBalance - cost),
    };
  });
}

export function updateCoinMeCache(queryClient: ReturnType<typeof useQueryClient>, userCoin: UserCoin) {
  queryClient.setQueryData(COIN_ME_QUERY_KEY, userCoin);
  if (typeof userCoin.balance === 'number') {
    syncCoinLeaderboardMyBalanceCache(queryClient, userCoin.balance);
  }
}

export function updateCoinMeBalanceCache(queryClient: ReturnType<typeof useQueryClient>, balance: number) {
  if (!Number.isFinite(balance)) return;

  queryClient.setQueryData<UserCoin | undefined>(COIN_ME_QUERY_KEY, (current) => {
    if (!current) return current;
    return {
      ...current,
      balance,
    };
  });
  syncCoinLeaderboardMyBalanceCache(queryClient, balance);
}

export function decreaseCoinMeBalanceCache(queryClient: ReturnType<typeof useQueryClient>, cost: number) {
  if (!Number.isFinite(cost) || cost <= 0) return;

  queryClient.setQueryData<UserCoin | undefined>(COIN_ME_QUERY_KEY, (current) => {
    if (!current) return current;
    return {
      ...current,
      balance: Math.max(0, current.balance - cost),
    };
  });
  decreaseCoinLeaderboardMyBalanceCache(queryClient, cost);
}

//查询我的金币账户
export function useRequestCoinMe() {
  const token = getAuthToken();

  return useQuery<UserCoin>({
    queryKey: COIN_ME_QUERY_KEY,
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Coin_Me,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
    enabled: Boolean(token),
  });
}

// 账户余额排行榜
export function useRequestCoinLeaderboard(params: CoinLeaderboardParams = {}) {
  const token = getAuthToken();
  const limit = Math.max(1, Math.min(100, params.limit ?? 20));

  return useQuery<CoinLeaderboardResult>({
    queryKey: [...COIN_LEADERBOARD_QUERY_KEY, limit],
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Coin_Leaderboard,
        params: { limit },
        headers: getAuthorizationHeaders(),
      });
      return normalizeCoinLeaderboardResult((assertSuccess(res) ?? {}) as Record<string, unknown>);
    },
    enabled: Boolean(token),
  });
}

//预测下注
export function useRequestCoinBet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestCoinBet"],
    mutationFn: async (payload: PlaceBetPayload) => {
      const data = new URLSearchParams();
      data.append("marketId", String(payload.marketId));
      data.append("option", toPlaceBetApiOption(payload.option));
      data.append("amount", String(payload.amount));

      const res = await axiosCustom({
        method: "post",
        cmd: API_Coin_Bet,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
      });
      return assertSuccess(res) as PlaceBetResult;
    },
    onSuccess: (result) => {
      updateCoinMeCache(queryClient, result.userCoin);
      void Promise.all([
        queryClient.invalidateQueries(["requestFootballMarkets"]),
        queryClient.invalidateQueries(["requestFootballMarketsByTag"]),
        queryClient.invalidateQueries(["requestFootballPredictContextHot"]),
      ]);
    },
  });
}

//预测结算
export function useRequestCoinSettle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestCoinSettle"],
    mutationFn: async (payload: CoinSettlePayload) => {
      const data = new URLSearchParams();
      data.append("marketId", String(payload.marketId));

      const res = await axiosCustom({
        method: "post",
        cmd: API_Coin_Settle,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
      });
      return assertSuccess(res) as CoinSettleResult;
    },
    onSuccess: (result) => {
      const latestUserCoin = result.list[result.list.length - 1]?.userCoin;
      if (latestUserCoin) {
        updateCoinMeCache(queryClient, latestUserCoin);
      }
      void Promise.all([
        queryClient.invalidateQueries(["requestFootballMarkets"]),
        queryClient.invalidateQueries(["requestFootballMarketsByTag"]),
        queryClient.invalidateQueries(["requestFootballPredictContextHot"]),
      ]);
    },
  });
}
