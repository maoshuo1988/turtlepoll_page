/**
 * 文件说明：use Message Notify Requests，封装主站消息通知接口请求与缓存。
 */
import { axiosCustom } from '@/api/httpClient';
import {
  API_MessageNotify_ById,
  API_MessageNotify_List,
  API_MessageNotify_Read,
  API_MessageNotify_UnreadCount,
} from '@/api/messageNotifyApi';
import { getAuthToken } from '@/utils/authStorage';
import { assertSuccess, getAuthorizationHeaders } from '@/utils/requestUtils';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from 'react-query';
import type {
  MessageNotifyListParams,
  MessageNotifyListResult,
  MessageNotifyRecord,
  MessageNotifyUnreadCountResult,
} from './messageNotifyTypes';
import {
  normalizeMessageNotifyListResult,
  normalizeMessageNotifyReadResult,
  normalizeMessageNotifyRecord,
  normalizeMessageNotifyUnreadCount,
} from './messageNotifyTypes';

export const MESSAGE_NOTIFY_LIST_QUERY_KEY = 'requestMessageNotifyList';
export const MESSAGE_NOTIFY_UNREAD_COUNT_QUERY_KEY = 'requestMessageNotifyUnreadCount';

async function invalidateMessageNotifyQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries([MESSAGE_NOTIFY_LIST_QUERY_KEY]),
    queryClient.invalidateQueries([MESSAGE_NOTIFY_UNREAD_COUNT_QUERY_KEY]),
    queryClient.invalidateQueries(['requestMessageNotifyDetail']),
  ]);
}

export function useRequestMessageNotifyUnreadCount(enabled = true) {
  const token = getAuthToken();
  return useQuery<MessageNotifyUnreadCountResult>({
    queryKey: [MESSAGE_NOTIFY_UNREAD_COUNT_QUERY_KEY],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_MessageNotify_UnreadCount,
        headers: getAuthorizationHeaders(),
      });
      return normalizeMessageNotifyUnreadCount(assertSuccess(res) as Record<string, unknown>);
    },
    enabled: enabled && Boolean(token),
  });
}

export function useInfiniteRequestMessageNotifyList(
  params: Omit<MessageNotifyListParams, 'cursor'>,
  enabled = true,
) {
  const token = getAuthToken();
  return useInfiniteQuery<MessageNotifyListResult>({
    queryKey: [MESSAGE_NOTIFY_LIST_QUERY_KEY, params],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_MessageNotify_List,
        params: {
          ...params,
          cursor: pageParam,
          limit: params.limit ?? 20,
        },
        headers: getAuthorizationHeaders(),
      });
      return normalizeMessageNotifyListResult(assertSuccess(res) as Record<string, unknown>);
    },
    getNextPageParam: (lastPage) => (lastPage?.hasMore ? lastPage.cursor : undefined),
    enabled: enabled && Boolean(token),
  });
}

export function useRequestMessageNotifyDetail(id?: number | string) {
  const token = getAuthToken();
  return useQuery<MessageNotifyRecord>({
    queryKey: ['requestMessageNotifyDetail', id],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: `${API_MessageNotify_ById}/${id}`,
        headers: getAuthorizationHeaders(),
      });
      return normalizeMessageNotifyRecord(assertSuccess(res) as Record<string, unknown>);
    },
    enabled: Boolean(token) && Boolean(id),
  });
}

export function useMutateMessageNotifyRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['mutateMessageNotifyRead'],
    mutationFn: async (id: number | string) => {
      const res = await axiosCustom({
        method: 'post',
        cmd: API_MessageNotify_Read,
        data: { id },
        headers: getAuthorizationHeaders(),
      });
      return normalizeMessageNotifyReadResult(assertSuccess(res) as Record<string, unknown>);
    },
    onSuccess: async () => {
      await invalidateMessageNotifyQueries(queryClient);
    },
  });
}

/** 无批量已读接口时：拉取未读列表并逐条标记（最多 limit 条）。 */
export function useMutateMessageNotifyReadAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['mutateMessageNotifyReadAll'],
    mutationFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_MessageNotify_List,
        params: { status: 0, cursor: 0, limit: 100 },
        headers: getAuthorizationHeaders(),
      });
      const list = normalizeMessageNotifyListResult(assertSuccess(res) as Record<string, unknown>);
      const unreadIds = list.results.map((item) => item.id).filter(Boolean);
      if (!unreadIds.length) return { updatedCount: 0 };

      const results = await Promise.allSettled(
        unreadIds.map(async (id) => {
          const readRes = await axiosCustom({
            method: 'post',
            cmd: API_MessageNotify_Read,
            data: { id },
            headers: getAuthorizationHeaders(),
          });
          return normalizeMessageNotifyReadResult(assertSuccess(readRes) as Record<string, unknown>);
        }),
      );
      const updatedCount = results.filter(
        (item) => item.status === 'fulfilled' && item.value.updated,
      ).length;
      return { updatedCount };
    },
    onSuccess: async () => {
      await invalidateMessageNotifyQueries(queryClient);
    },
  });
}
