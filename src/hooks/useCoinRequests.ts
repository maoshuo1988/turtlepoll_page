/**
 * 文件说明：use Coin Requests，封装对应业务域的接口请求和缓存更新逻辑。
 */
/// MARK: 金币 / 预测下注
/// 基础路径: /api/coin

import { axiosCustom } from "@/api/httpClient";
import { API_Admin_Coin_Mint, API_Coin_Bet, API_Coin_Me, API_Coin_Settle } from "@/api/coinApi";
import { getAuthToken } from "@/utils/authStorage";
import { assertSuccess, getAuthorizationHeaders } from "@/utils/requestUtils";
import {  useMutation, useQuery, useQueryClient } from "react-query";
import type {
  AdminCoinMintPayload,
  CoinSettlePayload,
  CoinSettleResult,
  PlaceBetPayload,
  PlaceBetResult,
  UserCoin,
} from "./coinTypes";

// 我的金币账户缓存 key
export const COIN_ME_QUERY_KEY = ["requestCoinMe"] as const;

// 统一写入金币账户缓存，所有使用 useRequestCoinMe 的地方都会同步刷新
function updateCoinMeCache(queryClient: ReturnType<typeof useQueryClient>, userCoin: UserCoin) {
  queryClient.setQueryData(COIN_ME_QUERY_KEY, userCoin);
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

//预测下注
export function useRequestCoinBet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestCoinBet"],
    mutationFn: async (payload: PlaceBetPayload) => {
      const data = new URLSearchParams();
      data.append("marketId", String(payload.marketId));
      data.append("option", payload.option);
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

/// MARK: 管理后台 - 金币
/// 基础路径: /api/admin/coin

//管理员铸币
export function useRequestAdminCoinMint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestAdminCoinMint"],
    mutationFn: async (payload: AdminCoinMintPayload) => {
      const data = new URLSearchParams();
      data.append("userId", String(payload.userId));
      data.append("amount", String(payload.amount));
      if (payload.remark) {
        data.append("remark", payload.remark);
      }

      const res = await axiosCustom({
        method: "post",
        cmd: API_Admin_Coin_Mint,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
      });
      return assertSuccess(res) as UserCoin;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(COIN_ME_QUERY_KEY);
    },
  });
}
