import { axiosCustom } from '@/api/axios';
import {
  API_PK_Bet,
  API_PK_Comment_Create,
  API_PK_Comment_Reply,
  API_PK_Comments,
  API_PK_Downvote,
  API_PK_Heat,
  API_PK_History,
  API_PK_My_Bets,
  API_PK_Seasons,
  API_PK_Topic,
  API_PK_Topics,
} from '@/api/pk_api';
import { assertSuccess, getAuthorizationHeaders } from '@/utils/requestUtils';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { COIN_ME_QUERY_KEY } from './useCoinRequest';
import type { CursorResult } from './topicType';
import type {
  PKBetPayload,
  PKBetResponse,
  PKCommentResponse,
  PKCreateCommentPayload,
  PKDownvotePayload,
  PKHeatResponse,
  PKReplyCommentPayload,
  PKRound,
  PKTopicDetailResponse,
  PKTopicListResponse,
} from './pkType';

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

const normalizeCursorResult = <T>(raw: unknown): CursorResult<T> => {
  const data = raw as {
    results?: T[];
    data?: T[];
    list?: T[];
    cursor?: number | string;
    hasMore?: boolean;
  };

  return {
    results: data.results ?? data.data ?? data.list ?? [],
    cursor: data.cursor ?? 0,
    hasMore: Boolean(data.hasMore),
  };
};

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
      return normalizeCursorResult<PKCommentResponse>(assertSuccess(res));
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
      return assertSuccess(res) as PKCommentResponse;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries(['requestPKComments']),
        queryClient.invalidateQueries(['requestPKHeat']),
        queryClient.invalidateQueries(['requestPKTopic']),
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
      return assertSuccess(res) as PKCommentResponse;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries(['requestPKComments']),
        queryClient.invalidateQueries(['requestPKHeat']),
        queryClient.invalidateQueries(['requestPKTopic']),
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

  return useQuery<{ list?: PKRound[]; count?: number }>({
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
      return assertSuccess(res);
    },
    enabled: enabled && hasValue(params.topicId),
  });
}

export function useRequestPKSeasons(params: { topicId?: number | string; page?: number; pageSize?: number; enabled?: boolean }) {
  const { enabled = true, ...queryParams } = params;

  return useQuery({
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
      return assertSuccess(res);
    },
    enabled: enabled && hasValue(params.topicId),
  });
}

export function useRequestPKMyBets(params: { page?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: ['requestPKMyBets', params],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_PK_My_Bets,
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
