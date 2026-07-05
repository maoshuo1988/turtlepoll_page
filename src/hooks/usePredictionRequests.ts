/**
 * 文件说明：use Prediction Requests，封装对应业务域的接口请求和缓存更新逻辑。
 */
import {
    API_Football_Bet_Settle_Result,
    API_Football_Markets,
    API_Football_My_Markets,
    API_Football_Markets_By_Tag,
    API_Football_Predict_Context_Hot,
    API_Football_Predict_Context_Update,
    API_Football_Predict_Tags_Hot,
} from "@/api/predictionApi";
import { axiosCustom } from "@/api/httpClient";
import { getAuthToken } from "@/utils/authStorage";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { assertSuccess, getAuthorizationHeaders } from "@/utils/requestUtils";
import {
    type FootballBetSettleResultParams,
    type FootballBetSettleResultResponse,
    type FootballMarketsParams,
    type FootballMarketsResponse,
    type FootballMarketsByTagParams,
    type FootballMarketsByTagResponse,
    type PredictMyMarketsParams,
    type PredictMyMarketsResponse,
    type FootballPredictContextHotParams,
    type FootballPredictContextHotResponse,
    type FootballPredictTagsHotParams,
    type FootballPredictTagsHotResponse,
    type PredictContext,
    type PredictContextUpsertPayload,
} from "@/hooks/predictionTypes";

/// MARK: 预测事件系统
/// 基础路径: /api/football

// 查询用户在某个市场的下注结算结果
export function useRequestFootballBetSettleResult(params: FootballBetSettleResultParams) {
    const token = getAuthToken();

    return useQuery<FootballBetSettleResultResponse>({
        queryKey: ["requestFootballBetSettleResult", params.userId, params.marketId],
        queryFn: async () => {
            const res = await axiosCustom({
                method: "get",
                cmd: API_Football_Bet_Settle_Result,
                params: {
                    userId: params.userId,
                    marketId: params.marketId,
                },
                headers: getAuthorizationHeaders(),
            });
            return assertSuccess(res);
        },
        enabled: Boolean(token && params.userId && params.marketId),
    });
}

// 查询预测市场（聚合 market + context）
export function useRequestFootballMarkets(params: FootballMarketsParams = {}) {
    const token = getAuthToken();
    const requireAuth = params.requireAuth ?? true;

    return useQuery<FootballMarketsResponse>({
        queryKey: ["requestFootballMarkets", params, requireAuth, Boolean(token)],
        queryFn: async () => {
            const res = await axiosCustom({
                method: "get",
                cmd: API_Football_Markets,
                params: {
                    page: params.page ?? 1,
                    limit: params.limit ?? 20,
                    sourceModel: params.sourceModel,
                    sourceModelId: params.sourceModelId,
                },
                headers: getAuthorizationHeaders(),
            });
            return assertSuccess(res);
        },
        enabled: Boolean(!requireAuth || token),
    });
}

/** 查询当前用户参与（下注）过的预测市场，结构与 GET /api/predict/markets 对齐 */
export function useRequestPredictMyMarkets(params: PredictMyMarketsParams = {}) {
    const token = getAuthToken();
    const { enabled = true, ...queryParams } = params;

    return useQuery<PredictMyMarketsResponse>({
        queryKey: ["requestPredictMyMarkets", queryParams, Boolean(token)],
        queryFn: async () => {
            const res = await axiosCustom({
                method: "get",
                cmd: API_Football_My_Markets,
                params: {
                    page: queryParams.page ?? 1,
                    limit: queryParams.limit ?? 20,
                    ...(queryParams.status ? { status: queryParams.status } : {}),
                },
                headers: getAuthorizationHeaders(),
            });
            const raw = assertSuccess(res) as PredictMyMarketsResponse & { count?: number };
            const list = Array.isArray(raw.list) ? raw.list : [];
            return {
                list,
                total: raw.total ?? raw.count ?? list.length,
                status: raw.status ?? queryParams.status,
            };
        },
        enabled: Boolean(token && enabled),
    });
}

// 按标签查询预测市场（聚合 market + context）
export function useRequestFootballMarketsByTag(params: FootballMarketsByTagParams = {}) {
    const token = getAuthToken();
    const normalizedTag = params.tag?.trim().replace(/^#/, "");
    const requireAuth = params.requireAuth ?? true;

    return useQuery<FootballMarketsByTagResponse>({
        queryKey: ["requestFootballMarketsByTag", normalizedTag, params.page ?? 1, params.limit ?? 20, requireAuth, Boolean(token)],
        queryFn: async () => {
            const res = await axiosCustom({
                method: "get",
                cmd: API_Football_Markets_By_Tag,
                params: {
                    tag: normalizedTag,
                    page: params.page ?? 1,
                    limit: params.limit ?? 20,
                },
                headers: getAuthorizationHeaders(),
            });
            return assertSuccess(res);
        },
        enabled: Boolean((!requireAuth || token) && normalizedTag) && params.enabled !== false,
    });
}

// 热度榜（heat 前 N）
export function useRequestFootballPredictContextHot(params: FootballPredictContextHotParams = {}) {
    const token = getAuthToken();

    return useQuery<FootballPredictContextHotResponse>({
        queryKey: ["requestFootballPredictContextHot", params],
        queryFn: async () => {
            const res = await axiosCustom({
                method: "get",
                cmd: API_Football_Predict_Context_Hot,
                params: {
                    limit: params.limit ?? 10,
                },
                headers: getAuthorizationHeaders(),
            });
            return assertSuccess(res);
        },
        enabled: Boolean(token),
    });
}

// 热门标签（按标签累计 heat 前 N）
export function useRequestFootballPredictTagsHot(params: FootballPredictTagsHotParams = {}) {
    const token = getAuthToken();

    return useQuery<FootballPredictTagsHotResponse>({
        queryKey: ["requestFootballPredictTagsHot", params],
        queryFn: async () => {
            const res = await axiosCustom({
                method: "get",
                cmd: API_Football_Predict_Tags_Hot,
                params: {
                    limit: params.limit ?? 10,
                },
                headers: getAuthorizationHeaders(),
            });
            return assertSuccess(res);
        },
        enabled: Boolean(token),
    });
}

// 修改/创建 PredictContext（按 marketId upsert）
export function useRequestFootballPredictContextUpdate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ["requestFootballPredictContextUpdate"],
        mutationFn: async (payload: PredictContextUpsertPayload) => {
            const data = new URLSearchParams();
            data.append("marketId", String(payload.marketId));
            data.append("eventName", payload.eventName);
            if (payload.imageUrl) data.append("imageUrl", payload.imageUrl);
            if (typeof payload.participantCount === "number") data.append("participantCount", String(payload.participantCount));
            if (payload.proText) data.append("proText", payload.proText);
            if (typeof payload.proVoteCount === "number") data.append("proVoteCount", String(payload.proVoteCount));
            if (payload.conText) data.append("conText", payload.conText);
            if (typeof payload.conVoteCount === "number") data.append("conVoteCount", String(payload.conVoteCount));
            if (typeof payload.heat === "number") data.append("heat", String(payload.heat));
            if (payload.detail) data.append("detail", payload.detail);
            if (payload.tags) data.append("tags", payload.tags);

            const res = await axiosCustom({
                method: "post",
                cmd: API_Football_Predict_Context_Update,
                data,
                headers: {
                    ...getAuthorizationHeaders(),
                    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                },
            });
            return assertSuccess(res) as PredictContext;
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries(["requestFootballMarkets"]),
                queryClient.invalidateQueries(["requestFootballMarketsByTag"]),
                queryClient.invalidateQueries(["requestPredictMyMarkets"]),
                queryClient.invalidateQueries(["requestFootballPredictContextHot"]),
                queryClient.invalidateQueries(["requestFootballPredictTagsHot"]),
            ]);
        },
    });
}
