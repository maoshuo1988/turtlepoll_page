/**
 * 文件说明：预测事件系统 /api/predict 撕裂带、热度、评论与结算请求。
 */
import { axiosCustom } from '@/api/httpClient';
import {
  API_Predict_Comment_Create,
  API_Predict_Comment_Replies,
  API_Predict_Comment_Reply,
  API_Predict_Comments,
  API_Predict_Heat,
  API_Predict_Heat_Me,
  API_Predict_Heat_Rank,
  API_Predict_Like,
  API_Predict_Odds_Current,
  API_Predict_Tear_Settle,
  API_Predict_Unlike,
} from '@/api/predictApi';
import type { CommentResponse } from '@/hooks/useCommentRequests';
import type {
  PredictCommentOption,
  PredictHeatMeResponse,
  PredictHeatRankResponse,
  PredictHeatResponse,
  PredictOddsResponse,
  PredictTearSettleResponse,
} from '@/hooks/predictionTypes';
import type { CursorResult } from '@/hooks/topicTypes';
import { assertSuccess, getAuthorizationHeaders } from '@/utils/requestUtils';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { COIN_ME_QUERY_KEY } from './useCoinRequests';

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== '';

const buildForm = (payload: Record<string, unknown>) => {
  const data = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    if (!hasValue(value)) return;
    data.append(key, String(value));
  });
  return data;
};

const normalizeCursorResult = <T>(raw: unknown): CursorResult<T> => {
  if (Array.isArray(raw)) {
    return {
      results: raw as T[],
      cursor: 0,
      hasMore: false,
    };
  }

  const data = raw as {
    results?: T[];
    data?: T[] | { results?: T[]; list?: T[]; comments?: T[]; records?: T[]; items?: T[] };
    list?: T[];
    comments?: T[];
    records?: T[];
    items?: T[];
    cursor?: number | string;
    hasMore?: boolean;
  };

  const nested = data.data;
  const nestedList = Array.isArray(nested)
    ? nested
    : nested && typeof nested === 'object'
      ? nested.results ?? nested.list ?? nested.comments ?? nested.records ?? nested.items
      : undefined;

  return {
    results: data.results ?? nestedList ?? data.list ?? data.comments ?? data.records ?? data.items ?? [],
    cursor: data.cursor ?? 0,
    hasMore: Boolean(data.hasMore),
  };
};

const invalidatePredictMarketQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
  marketId?: number,
) => {
  await Promise.all([
    queryClient.invalidateQueries(['requestFootballMarkets']),
    queryClient.invalidateQueries(['requestFootballMarketsByTag']),
    queryClient.invalidateQueries(['requestPredictMyMarkets']),
    queryClient.invalidateQueries(['requestFootballPredictContextHot']),
    queryClient.invalidateQueries(['requestPredictComments']),
    queryClient.invalidateQueries(['requestPredictCommentReplies']),
    queryClient.invalidateQueries(['requestPredictHeat']),
    queryClient.invalidateQueries(['requestPredictHeatRank']),
    queryClient.invalidateQueries(['requestPredictHeatMe']),
    queryClient.invalidateQueries(['requestPredictOddsCurrent']),
    typeof marketId === 'number' ? queryClient.invalidateQueries(['requestFootballBetSettleResult']) : Promise.resolve(),
  ]);
};

export type PredictCommentsParams = {
  marketId: number;
  option?: PredictCommentOption;
  cursor?: number | string;
  pageSize?: number;
  enabled?: boolean;
};

export type PredictCommentRepliesParams = {
  commentId: number | string;
  cursor?: number | string;
  enabled?: boolean;
};

export type PredictCreateCommentPayload = {
  marketId: number;
  content: string;
  option: PredictCommentOption;
  requestId?: string;
};

export type PredictReplyCommentPayload = {
  commentId: number | string;
  marketId: number;
  content: string;
  option?: PredictCommentOption;
  requestId?: string;
};

export type PredictLikePayload = {
  entityType: string;
  entityId: number | string;
};

export function toPredictCommentOption(side: 'A' | 'B' | 'C'): PredictCommentOption {
  if (side === 'C') return 'DRAW';
  return side;
}

export function fromPredictCommentOption(option?: string): 'A' | 'B' | 'C' {
  const normalized = String(option ?? '').trim().toUpperCase();
  if (normalized === 'DRAW' || normalized === 'C') return 'C';
  if (normalized === 'B') return 'B';
  return 'A';
}

/** 将 heat/me、下注结果等字段归一为评论阵营 A/B。 */
export function resolveMarketBetSide(option?: string | null): 'A' | 'B' | undefined {
  const normalized = String(option ?? '').trim().toUpperCase();
  if (!normalized) return undefined;
  if (normalized === 'B' || normalized === 'CON' || normalized === 'CONTRA') return 'B';
  if (normalized === 'A' || normalized === 'PRO' || normalized === 'PROS') return 'A';
  const fromPredict = fromPredictCommentOption(normalized);
  if (fromPredict === 'A' || fromPredict === 'B') return fromPredict;
  return undefined;
}

export async function fetchPredictComments(
  params: Omit<PredictCommentsParams, 'enabled'>,
): Promise<CursorResult<CommentResponse>> {
  const res = await axiosCustom({
    method: 'get',
    cmd: API_Predict_Comments,
    params: {
      marketId: params.marketId,
      option: params.option,
      cursor: params.cursor,
      pageSize: params.pageSize ?? 20,
    },
    headers: getAuthorizationHeaders(),
  });
  return normalizeCursorResult<CommentResponse>(assertSuccess(res));
}

export function useRequestPredictComments(params: PredictCommentsParams) {
  const { enabled = true, ...queryParams } = params;

  return useQuery<CursorResult<CommentResponse>>({
    queryKey: ['requestPredictComments', queryParams],
    queryFn: () => fetchPredictComments(queryParams),
    enabled: enabled && Number.isFinite(params.marketId) && params.marketId > 0,
  });
}

export function useRequestPredictCommentReplies(params: PredictCommentRepliesParams) {
  const { enabled = true, ...queryParams } = params;

  return useQuery<CursorResult<CommentResponse>>({
    queryKey: ['requestPredictCommentReplies', queryParams],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_Predict_Comment_Replies,
        params: queryParams,
        headers: getAuthorizationHeaders(),
      });
      return normalizeCursorResult<CommentResponse>(assertSuccess(res));
    },
    enabled: enabled && hasValue(params.commentId),
  });
}

export function useRequestPredictHeat(params: { marketId?: number; enabled?: boolean } = {}) {
  const { enabled = true, marketId } = params;

  return useQuery<PredictHeatResponse>({
    queryKey: ['requestPredictHeat', marketId],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_Predict_Heat,
        params: { marketId },
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res) as PredictHeatResponse;
    },
    enabled: enabled && typeof marketId === 'number' && marketId > 0,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
  });
}

export function useRequestPredictHeatRank(params: {
  marketId?: number;
  scope?: 'ALL' | 'MY_SIDE';
  page?: number;
  pageSize?: number;
  enabled?: boolean;
} = {}) {
  const { enabled = true, marketId, scope = 'ALL', page = 1, pageSize = 20 } = params;

  return useQuery<PredictHeatRankResponse>({
    queryKey: ['requestPredictHeatRank', marketId, scope, page, pageSize],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_Predict_Heat_Rank,
        params: { marketId, scope, page, pageSize },
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res) as PredictHeatRankResponse;
    },
    enabled: enabled && typeof marketId === 'number' && marketId > 0,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
  });
}

export function useRequestPredictHeatMe(params: { marketId?: number; enabled?: boolean } = {}) {
  const { enabled = true, marketId } = params;

  return useQuery<PredictHeatMeResponse>({
    queryKey: ['requestPredictHeatMe', marketId],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_Predict_Heat_Me,
        params: { marketId },
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res) as PredictHeatMeResponse;
    },
    enabled: enabled && typeof marketId === 'number' && marketId > 0,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
  });
}

export function useRequestPredictOddsCurrent(params: { marketId?: number; enabled?: boolean } = {}) {
  const { enabled = true, marketId } = params;

  return useQuery<PredictOddsResponse>({
    queryKey: ['requestPredictOddsCurrent', marketId],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_Predict_Odds_Current,
        params: { marketId },
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res) as PredictOddsResponse;
    },
    enabled: enabled && typeof marketId === 'number' && marketId > 0,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
  });
}

export function useRequestPredictCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['requestPredictCreateComment'],
    mutationFn: async (payload: PredictCreateCommentPayload) => {
      const data = buildForm({
        entityType: 'predict_market',
        entityId: payload.marketId,
        content: payload.content.trim(),
        option: payload.option,
        requestId: payload.requestId,
      });
      const res = await axiosCustom({
        method: 'post',
        cmd: API_Predict_Comment_Create,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
      });
      return assertSuccess(res) as CommentResponse;
    },
    onSuccess: async (_, variables) => {
      await invalidatePredictMarketQueries(queryClient, variables.marketId);
    },
  });
}

export function useRequestPredictReplyComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['requestPredictReplyComment'],
    mutationFn: async (payload: PredictReplyCommentPayload) => {
      const data = buildForm({
        commentId: payload.commentId,
        marketId: payload.marketId,
        content: payload.content.trim(),
        option: payload.option,
        requestId: payload.requestId,
      });
      const res = await axiosCustom({
        method: 'post',
        cmd: API_Predict_Comment_Reply,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
      });
      return assertSuccess(res) as CommentResponse;
    },
    onSuccess: async (_, variables) => {
      await invalidatePredictMarketQueries(queryClient, variables.marketId);
    },
  });
}

export function useRequestPredictLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['requestPredictLike'],
    mutationFn: async (payload: PredictLikePayload) => {
      const data = buildForm(payload);
      const res = await axiosCustom({
        method: 'post',
        cmd: API_Predict_Like,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
      });
      return assertSuccess(res);
    },
    onSuccess: async () => {
      await invalidatePredictMarketQueries(queryClient);
    },
  });
}

export function useRequestPredictUnlike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['requestPredictUnlike'],
    mutationFn: async (payload: PredictLikePayload) => {
      const data = buildForm(payload);
      const res = await axiosCustom({
        method: 'post',
        cmd: API_Predict_Unlike,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
      });
      return assertSuccess(res);
    },
    onSuccess: async () => {
      await invalidatePredictMarketQueries(queryClient);
    },
  });
}

export function useRequestPredictTearSettle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['requestPredictTearSettle'],
    mutationFn: async (payload: { marketId: number }) => {
      const data = buildForm({ marketId: payload.marketId });
      const res = await axiosCustom({
        method: 'post',
        cmd: API_Predict_Tear_Settle,
        data,
        headers: {
          ...getAuthorizationHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
      });
      return assertSuccess(res) as PredictTearSettleResponse;
    },
    onSuccess: async (result) => {
      await invalidatePredictMarketQueries(queryClient, result.marketId);
      await queryClient.invalidateQueries(COIN_ME_QUERY_KEY);
    },
  });
}
