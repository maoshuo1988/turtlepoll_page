/**
 * 文件说明：use Pk Requests，封装对应业务域的接口请求和缓存更新逻辑。
 */
import { axiosCustom } from '@/api/httpClient';
import {
  API_PK_Bet,
  API_PK_Comment_Create,
  API_PK_Comment_Replies,
  API_PK_Comment_Reply,
  API_PK_Comments,
  API_PK_Downvote,
  API_PK_Heat,
  API_PK_Heat_Me,
  API_PK_Heat_Rank,
  API_PK_History,
  API_PK_Like,
  API_PK_My_Bets,
  API_PK_Odds_Current,
  API_PK_RecordOption,
  API_PK_Seasons,
  API_PK_Settle,
  API_PK_Topic,
  API_PK_Topics,
} from '@/api/pkApi';
import { assertSuccess, getAuthorizationHeaders } from '@/utils/requestUtils';
import { getAuthToken } from '@/utils/authStorage';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { COIN_ME_QUERY_KEY } from './useCoinRequests';
import type { CursorResult } from './topicTypes';
import type {
  PKBetPayload,
  PKBetResponse,
  PKCommentResponse,
  PKCreateCommentPayload,
  PKDownvotePayload,
  PKHeatMeResponse,
  PKHeatRankResponse,
  PKHeatResponse,
  PKHistoryResponse,
  PKMyBetsResponse,
  PKMyBetStatusFilter,
  PKLikePayload,
  PKLikeResponse,
  PKOddsResponse,
  PKRecordOptionPayload,
  PKReplyCommentPayload,
  PKRound,
  PKSeason,
  PKSeasonListResponse,
  PKSettlePayload,
  PKSettleResponse,
  PKTopicDetailResponse,
  PKTopicListResponse,
} from './pkTypes';
import { normalizePKCommentItem, normalizePKMyBetRecord, unwrapPKCommentPayload, unwrapPKReplyPayload } from './pkNormalize';

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== '';

const buildForm = (payload: Record<string, unknown>) => {
  const data = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    if (!hasValue(value)) return;
    if (Array.isArray(value)) {
      data.append(key, JSON.stringify(value));
      return;
    }
    data.append(key, String(value));
  });
  return data;
};

const normalizeCursorResult = <T>(raw: unknown, mapItem?: (item: unknown) => T): CursorResult<T> => {
  const data = raw as {
    results?: unknown[];
    data?: unknown[];
    list?: unknown[];
    comments?: unknown[];
    records?: unknown[];
    cursor?: number | string;
    hasMore?: boolean;
  };

  const source = data.results ?? data.data ?? data.list ?? data.comments ?? data.records ?? [];
  const results = mapItem ? source.map(mapItem) : (source as T[]);

  return {
    results,
    cursor: data.cursor ?? 0,
    hasMore: Boolean(data.hasMore),
  };
};

export async function fetchPKTopic(params: { topicId?: number | string; slug?: string }) {
  const res = await axiosCustom({
    method: 'get',
    cmd: API_PK_Topic,
    params,
    headers: getAuthorizationHeaders(),
  });
  return assertSuccess(res) as PKTopicDetailResponse;
}

export function useRequestPKTopics(params: { page?: number; pageSize?: number } = {}) {
  return useQuery<PKTopicListResponse>({
    queryKey: ['requestPKTopics', params],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_PK_Topics,
        params: {
          page: params.page ?? 1,
          pageSize: params.pageSize ?? 20,
        },
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
  });
}

export function useRequestPKTopic(params: { topicId?: number | string; slug?: string; enabled?: boolean }) {
  const { enabled = true, ...queryParams } = params;

  return useQuery<PKTopicDetailResponse>({
    queryKey: ['requestPKTopic', queryParams],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_PK_Topic,
        params: queryParams,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
    enabled: enabled && (hasValue(params.topicId) || hasValue(params.slug)),
  });
}

export function useRequestPKHeat(params: { topicId?: number | string; enabled?: boolean }) {
  const { enabled = true, topicId } = params;

  return useQuery<PKHeatResponse>({
    queryKey: ['requestPKHeat', topicId],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_PK_Heat,
        params: { topicId },
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res);
    },
    enabled: enabled && hasValue(topicId),
    refetchInterval: 15 * 1000,
  });
}

export function useRequestPKComments(params: {
  topicId?: number | string;
  side: 'A' | 'B';
  cursor?: number | string;
  sort?: 'time' | 'heat';
  enabled?: boolean;
}) {
  const { enabled = true, ...queryParams } = params;

  return useQuery<CursorResult<PKCommentResponse>>({
    queryKey: ['requestPKComments', queryParams],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_PK_Comments,
        params: {
          ...queryParams,
          sort: queryParams.sort ?? 'time',
        },
        headers: getAuthorizationHeaders(),
      });
      return normalizeCursorResult<PKCommentResponse>(assertSuccess(res), normalizePKCommentItem);
    },
    enabled: enabled && hasValue(params.topicId) && hasValue(params.side),
  });
}

export function useRequestPKBet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['requestPKBet'],
    mutationFn: async (payload: PKBetPayload) => {
      const res = await axiosCustom({
        method: 'post',
        cmd: API_PK_Bet,
        data: payload,
        headers: {
          ...getAuthorizationHeaders(),
          'Content-Type': 'application/json;charset=UTF-8',
        },
      });
      return assertSuccess(res) as PKBetResponse;
    },
    onSuccess: (result) => {
      if (result.userCoin) {
        queryClient.setQueryData(COIN_ME_QUERY_KEY, result.userCoin);
      }
      void Promise.all([
        queryClient.invalidateQueries(['requestPKTopic']),
        queryClient.invalidateQueries(['requestPKHeat']),
        queryClient.invalidateQueries(['requestPKTopics']),
        queryClient.invalidateQueries(['requestPKOddsCurrent']),
        queryClient.invalidateQueries(['requestPKMyBets']),
      ]);
    },
  });
}

export function useRequestPKCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['requestPKCreateComment'],
    mutationFn: async (payload: PKCreateCommentPayload) => {
      const res = await axiosCustom({
        method: 'post',
        cmd: API_PK_Comment_Create,
        data: buildForm(payload),
        headers: {
          ...getAuthorizationHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
      });
      return unwrapPKCommentPayload(assertSuccess(res));
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries(['requestPKComments']),
        queryClient.invalidateQueries(['requestPKHeat']),
        queryClient.invalidateQueries(['requestPKTopic']),
        queryClient.invalidateQueries(['requestPKHeatMe']),
      ]);
    },
  });
}

export function useRequestPKReplyComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['requestPKReplyComment'],
    mutationFn: async (payload: PKReplyCommentPayload) => {
      const res = await axiosCustom({
        method: 'post',
        cmd: API_PK_Comment_Reply,
        data: buildForm(payload),
        headers: {
          ...getAuthorizationHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
      });
      return unwrapPKReplyPayload(assertSuccess(res));
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries(['requestPKComments']),
        queryClient.invalidateQueries(['requestPKCommentReplies']),
        queryClient.invalidateQueries(['requestPKHeat']),
        queryClient.invalidateQueries(['requestPKTopic']),
        queryClient.invalidateQueries(['requestPKHeatMe']),
      ]);
    },
  });
}

export function useRequestPKDownvote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['requestPKDownvote'],
    mutationFn: async (payload: PKDownvotePayload) => {
      const res = await axiosCustom({
        method: 'post',
        cmd: API_PK_Downvote,
        data: payload,
        headers: {
          ...getAuthorizationHeaders(),
          'Content-Type': 'application/json;charset=UTF-8',
        },
      });
      return assertSuccess(res);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries(['requestPKComments']),
        queryClient.invalidateQueries(['requestPKHeat']),
      ]);
    },
  });
}

export function useRequestPKHistory(params: { topicId?: number | string; page?: number; pageSize?: number; enabled?: boolean }) {
  const { enabled = true, ...queryParams } = params;

  return useQuery<PKHistoryResponse>({
    queryKey: ['requestPKHistory', queryParams],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_PK_History,
        params: {
          page: queryParams.page ?? 1,
          pageSize: queryParams.pageSize ?? 20,
          topicId: queryParams.topicId,
        },
        headers: getAuthorizationHeaders(),
      });
      const raw = assertSuccess(res) as {
        list?: PKRound[];
        data?: PKRound[];
        results?: PKRound[];
        records?: PKRound[];
        rounds?: PKRound[];
        count?: number;
        total?: number;
      };
      const list = raw.list ?? raw.data ?? raw.results ?? raw.records ?? raw.rounds ?? [];
      return {
        list,
        count: raw.count ?? raw.total ?? list.length,
      };
    },
    enabled: enabled && hasValue(params.topicId),
  });
}

export function useRequestPKSeasons(params: { topicId?: number | string; page?: number; pageSize?: number; enabled?: boolean }) {
  const { enabled = true, ...queryParams } = params;

  return useQuery<PKSeasonListResponse>({
    queryKey: ['requestPKSeasons', queryParams],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_PK_Seasons,
        params: {
          page: queryParams.page ?? 1,
          pageSize: queryParams.pageSize ?? 20,
          topicId: queryParams.topicId,
        },
        headers: getAuthorizationHeaders(),
      });
      const raw = assertSuccess(res) as {
        list?: PKSeason[];
        data?: PKSeason[];
        results?: PKSeason[];
        records?: PKSeason[];
        seasons?: PKSeason[];
        count?: number;
        total?: number;
      };
      const list = raw.list ?? raw.data ?? raw.results ?? raw.records ?? raw.seasons ?? [];
      return {
        list,
        count: raw.count ?? raw.total ?? list.length,
      };
    },
    enabled: enabled && hasValue(params.topicId),
  });
}

export function useRequestPKMyBets(params: {
  page?: number;
  pageSize?: number;
  status?: PKMyBetStatusFilter;
  enabled?: boolean;
} = {}) {
  const token = getAuthToken();
  const { enabled = true, ...queryParams } = params;

  return useQuery<PKMyBetsResponse>({
    queryKey: ['requestPKMyBets', queryParams, Boolean(token)],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_PK_My_Bets,
        params: {
          page: queryParams.page ?? 1,
          pageSize: queryParams.pageSize ?? 20,
          ...(queryParams.status ? { status: queryParams.status } : {}),
        },
        headers: getAuthorizationHeaders(),
      });
      const raw = assertSuccess(res) as {
        list?: unknown[];
        data?: unknown[];
        results?: unknown[];
        count?: number;
        total?: number;
        page?: number;
        pageSize?: number;
        status?: PKMyBetStatusFilter;
      };
      const source = raw.list ?? raw.data ?? raw.results ?? [];
      const list = source.map((item) => normalizePKMyBetRecord(item));
      return {
        list,
        count: raw.count ?? raw.total ?? list.length,
        page: raw.page ?? queryParams.page ?? 1,
        pageSize: raw.pageSize ?? queryParams.pageSize ?? 20,
        status: raw.status ?? queryParams.status,
      };
    },
    enabled: Boolean(token && enabled),
  });
}

export function useRequestPKCommentReplies(params: {
  commentId?: number | string;
  cursor?: number | string;
  pageSize?: number;
  enabled?: boolean;
}) {
  const { enabled = true, ...queryParams } = params;

  return useQuery<CursorResult<PKCommentResponse>>({
    queryKey: ['requestPKCommentReplies', queryParams],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_PK_Comment_Replies,
        params: {
          ...queryParams,
          pageSize: queryParams.pageSize ?? 20,
        },
        headers: getAuthorizationHeaders(),
      });
      return normalizeCursorResult<PKCommentResponse>(assertSuccess(res), normalizePKCommentItem);
    },
    enabled: enabled && hasValue(params.commentId),
  });
}

export function useRequestPKLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['requestPKLike'],
    mutationFn: async (payload: PKLikePayload) => {
      const res = await axiosCustom({
        method: 'post',
        cmd: API_PK_Like,
        data: payload,
        headers: {
          ...getAuthorizationHeaders(),
          'Content-Type': 'application/json;charset=UTF-8',
        },
      });
      return assertSuccess(res) as PKLikeResponse;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries(['requestPKComments']),
        queryClient.invalidateQueries(['requestPKHeat']),
        queryClient.invalidateQueries(['requestPKTopic']),
        queryClient.invalidateQueries(['requestPKHeatMe']),
      ]);
    },
  });
}

export function useRequestPKHeatRank(params: {
  topicId?: number | string;
  roundId?: number | string;
  scope?: 'ALL' | 'MY_SIDE';
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}) {
  const { enabled = true, ...queryParams } = params;

  return useQuery<PKHeatRankResponse>({
    queryKey: ['requestPKHeatRank', queryParams],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_PK_Heat_Rank,
        params: {
          scope: queryParams.scope ?? 'ALL',
          page: queryParams.page ?? 1,
          pageSize: queryParams.pageSize ?? 20,
          topicId: queryParams.topicId,
          roundId: queryParams.roundId,
        },
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res) as PKHeatRankResponse;
    },
    enabled: enabled && (hasValue(params.topicId) || hasValue(params.roundId)),
    refetchInterval: 20 * 1000,
  });
}

export function useRequestPKHeatMe(params: {
  topicId?: number | string;
  roundId?: number | string;
  enabled?: boolean;
}) {
  const { enabled = true, ...queryParams } = params;

  return useQuery<PKHeatMeResponse>({
    queryKey: ['requestPKHeatMe', queryParams],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_PK_Heat_Me,
        params: queryParams,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res) as PKHeatMeResponse;
    },
    enabled: enabled && (hasValue(params.topicId) || hasValue(params.roundId)),
    refetchInterval: 20 * 1000,
  });
}

export function useRequestPKOddsCurrent(params: {
  topicId?: number | string;
  roundId?: number | string;
  enabled?: boolean;
}) {
  const { enabled = true, ...queryParams } = params;

  return useQuery<PKOddsResponse>({
    queryKey: ['requestPKOddsCurrent', queryParams],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_PK_Odds_Current,
        params: queryParams,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess(res) as PKOddsResponse;
    },
    enabled: enabled && (hasValue(params.topicId) || hasValue(params.roundId)),
    refetchInterval: 15 * 1000,
  });
}

export function useRequestPKRecordOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['requestPKRecordOption'],
    mutationFn: async (payload: PKRecordOptionPayload) => {
      const res = await axiosCustom({
        method: 'post',
        cmd: API_PK_RecordOption,
        data: payload,
        headers: {
          ...getAuthorizationHeaders(),
          'Content-Type': 'application/json;charset=UTF-8',
        },
      });
      return assertSuccess(res);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(['requestPKHeatMe']);
    },
  });
}

export function useRequestPKSettle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['requestPKSettle'],
    mutationFn: async (payload: PKSettlePayload) => {
      const res = await axiosCustom({
        method: 'post',
        cmd: API_PK_Settle,
        data: payload,
        headers: {
          ...getAuthorizationHeaders(),
          'Content-Type': 'application/json;charset=UTF-8',
        },
      });
      return assertSuccess(res) as PKSettleResponse;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries(['requestPKTopics']),
        queryClient.invalidateQueries(['requestPKTopic']),
        queryClient.invalidateQueries(['requestPKHeat']),
        queryClient.invalidateQueries(['requestPKHistory']),
        queryClient.invalidateQueries(['requestPKMyBets']),
        queryClient.invalidateQueries(COIN_ME_QUERY_KEY),
      ]);
    },
  });
}
