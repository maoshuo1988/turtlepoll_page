import { axiosCustom } from "@/api/axios";
import {
  API_Admin_Battle_Resolve,
  API_Battle_Banker_Add_Stake,
  API_Battle_By,
  API_Battle_Challenger_Confirm,
  API_Battle_Challenger_Dispute,
  API_Battle_Create,
  API_Battle_Declare,
  API_Battle_Join,
  API_Battle_List,
  API_Battle_Withdraw,
} from "@/api/battle_api";
import { assertSuccess, getAuthorizationHeaders } from "@/utils/requestUtils";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { COIN_ME_QUERY_KEY } from "./useCoinRequest";
import type {
  AdminResolveBattlePayload,
  BankerAddStakePayload,
  Battle,
  BattleChallengeActionPayload,
  BattleDetailResponse,
  BattleListParams,
  BattleListResponse,
  BattleSettlementItem,
  BattleWithdrawPayload,
  CreateBattlePayload,
  DeclareBattlePayload,
  JoinBattlePayload,
  JoinBattleResponse,
} from "./battleType";

export const battleQueryKeys = {
  all: ["battle"] as const,
  lists: () => [...battleQueryKeys.all, "list"] as const,
  list: (params: BattleListParams = {}) => [...battleQueryKeys.lists(), params] as const,
  details: () => [...battleQueryKeys.all, "detail"] as const,
  detail: (battleId?: number) => [...battleQueryKeys.details(), battleId] as const,
};

type BattleQueryOptions = {
  enabled?: boolean;
};

export async function fetchBattleDetail(battleId?: number) {
  const res = await axiosCustom({
    method: "get",
    cmd: API_Battle_By,
    params: { battleId },
    headers: getAuthorizationHeaders(),
  });
  return assertSuccess(res) as BattleDetailResponse;
}

// battle 的 mutation 会同时影响列表、详情和金币余额，所以统一在这里失效缓存。
async function invalidateBattleQueries(queryClient: ReturnType<typeof useQueryClient>, battleId?: number) {
  const tasks: Promise<unknown>[] = [
    queryClient.invalidateQueries(battleQueryKeys.lists()),
    queryClient.invalidateQueries(COIN_ME_QUERY_KEY),
  ];

  if (typeof battleId === "number") {
    tasks.push(queryClient.invalidateQueries(battleQueryKeys.detail(battleId)));
  } else {
    tasks.push(queryClient.invalidateQueries(battleQueryKeys.details()));
  }

  await Promise.all(tasks);
}

/// MARK: 开战广场 / Battle Square
/// 基础路径: /api/battle

// 赌局列表
export function useRequestBattleList(params: BattleListParams = {}, options: BattleQueryOptions = {}) {
  return useQuery<BattleListResponse>({
    queryKey: battleQueryKeys.list(params),
    queryFn: async () => {
      const res = await axiosCustom({
        method: "get",
        cmd: API_Battle_List,
        params: {
          page: params.page ?? 1,
          pageSize: params.pageSize ?? 20,
          status: params.status,
          role: params.role,
        },
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
    staleTime: 5 * 1000,
    enabled: options.enabled ?? true,
    refetchOnWindowFocus: true,
  });
}

// 赌局详情
export function useRequestBattleDetail(battleId?: number, options: BattleQueryOptions = {}) {
  return useQuery<BattleDetailResponse>({
    queryKey: battleQueryKeys.detail(battleId),
    queryFn: async () => fetchBattleDetail(battleId),
    enabled: (options.enabled ?? true) && typeof battleId === "number",
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
  });
}

// 创建赌局
export function useRequestBattleCreate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestBattleCreate"],
    mutationFn: async (payload: CreateBattlePayload) => {
      // create/join/confirm/dispute/withdraw 这些 battle 接口的 body 格式并不完全一致，
      // 这里保持和后端文档一一对应，避免页面层再关心 Content-Type 细节。
      const res = await axiosCustom({
        method: "post",
        cmd: API_Battle_Create,
        data: payload,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/json",
        },
      });
      return assertSuccess(res) as Battle;
    },
    onSuccess: async (battle) => {
      await invalidateBattleQueries(queryClient, battle.id);
    },
  });
}

// 加入/追加下注
export function useRequestBattleJoin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestBattleJoin"],
    mutationFn: async (payload: JoinBattlePayload) => {
      const res = await axiosCustom({
        method: "post",
        cmd: API_Battle_Join,
        data: payload,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/json",
        },
      });
      return assertSuccess(res) as JoinBattleResponse;
    },
    onSuccess: async (result) => {
      await invalidateBattleQueries(queryClient, result.battle.id);
    },
  });
}

// 庄家加注
export function useRequestBattleBankerAddStake() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestBattleBankerAddStake"],
    mutationFn: async (payload: BankerAddStakePayload) => {
      const res = await axiosCustom({
        method: "post",
        cmd: API_Battle_Banker_Add_Stake,
        data: payload,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/json",
        },
      });
      return assertSuccess(res) as Battle;
    },
    onSuccess: async (battle) => {
      await invalidateBattleQueries(queryClient, battle.id);
    },
  });
}

// 庄家宣布结果
export function useRequestBattleDeclare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestBattleDeclare"],
    mutationFn: async (payload: DeclareBattlePayload) => {
      // declare 是少数仍然读表单参数的接口，这里显式转成 form-urlencoded。
      const data = new URLSearchParams();
      data.append("battleId", String(payload.battleId));
      data.append("result", payload.result);

      const res = await axiosCustom({
        method: "post",
        cmd: API_Battle_Declare,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
      });
      return assertSuccess(res) as Battle;
    },
    onSuccess: async (battle) => {
      await invalidateBattleQueries(queryClient, battle.id);
    },
  });
}

// 挑战者确认
export function useRequestBattleChallengerConfirm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestBattleChallengerConfirm"],
    mutationFn: async (payload: BattleChallengeActionPayload) => {
      const res = await axiosCustom({
        method: "post",
        cmd: API_Battle_Challenger_Confirm,
        data: payload,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/json",
        },
      });
      return assertSuccess(res) as Battle;
    },
    onSuccess: async (battle) => {
      await invalidateBattleQueries(queryClient, battle.id);
    },
  });
}

// 挑战者异议
export function useRequestBattleChallengerDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestBattleChallengerDispute"],
    mutationFn: async (payload: BattleChallengeActionPayload) => {
      const res = await axiosCustom({
        method: "post",
        cmd: API_Battle_Challenger_Dispute,
        data: payload,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/json",
        },
      });
      return assertSuccess(res) as Battle;
    },
    onSuccess: async (battle) => {
      await invalidateBattleQueries(queryClient, battle.id);
    },
  });
}

// 一次性全提
export function useRequestBattleWithdraw() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestBattleWithdraw"],
    mutationFn: async (payload: BattleWithdrawPayload) => {
      const res = await axiosCustom({
        method: "post",
        cmd: API_Battle_Withdraw,
        data: payload,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/json",
        },
      });
      return assertSuccess(res) as BattleSettlementItem;
    },
    onSuccess: async (item) => {
      await invalidateBattleQueries(queryClient, item.battleId);
    },
  });
}

/// MARK: 管理后台 - 开战广场
/// 基础路径: /api/admin/battle

// 管理员裁决
export function useRequestAdminBattleResolve() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["requestAdminBattleResolve"],
    mutationFn: async (payload: AdminResolveBattlePayload) => {
      const res = await axiosCustom({
        method: "post",
        cmd: API_Admin_Battle_Resolve,
        data: payload,
        headers: {
          ...getAuthorizationHeaders(),
          "Content-Type": "application/json",
        },
      });
      return assertSuccess(res) as Battle;
    },
    onSuccess: async (battle) => {
      await invalidateBattleQueries(queryClient, battle.id);
    },
  });
}
