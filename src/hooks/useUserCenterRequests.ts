/**
 * 文件说明：use User Center Requests，封装个人中心相关列表请求与隐藏帖子操作。
 */
import { useInfiniteQuery, useMutation, useQueryClient } from 'react-query';
import { axiosCustom } from '@/api/httpClient';
import {
  API_User_Center_Comments,
  API_User_Center_Favorites,
  API_User_Center_Topics,
  API_User_Topic_Hide,
  API_User_Topic_Hide_List,
  API_User_Topic_Unhide,
} from '@/api/userApi';
import { assertSuccess, getAuthorizationHeaders } from '@/utils/requestUtils';
import type {
  UserCenterCommentResponse,
  UserCenterFavoriteResponse,
  UserCenterHideTopicResponse,
  UserCenterListParams,
  UserCenterPageInfo,
  UserCenterPageResult,
  UserCenterTopicResponse,
  UserTopicHidePayload,
} from './userCenterTypes';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

const USER_CENTER_TOPICS_QUERY_KEY = 'requestUserCenterTopics';
const USER_CENTER_COMMENTS_QUERY_KEY = 'requestUserCenterComments';
const USER_CENTER_FAVORITES_QUERY_KEY = 'requestUserCenterFavorites';
const USER_CENTER_HIDDEN_TOPICS_QUERY_KEY = 'requestUserCenterHiddenTopics';

type UserCenterRawPageResult<T> = {
  results?: T[];
  data?: T[];
  list?: T[];
  page?: Partial<UserCenterPageInfo> | number;
  limit?: number;
  total?: number;
};

type UserCenterRawTopic = {
  id?: number | string;
  userId?: number | string;
  user_id?: number | string;
  title?: string;
  content?: string;
  createTime?: number | string;
  create_time?: number | string;
  displayStatus?: number;
  display_status?: number;
};

type UserCenterRawComment = {
  id?: number | string;
  userId?: number | string;
  user_id?: number | string;
  content?: string;
  title?: string;
  createTime?: number | string;
  create_time?: number | string;
};

type UserCenterRawFavorite = {
  id?: number | string;
  userId?: number | string;
  user_id?: number | string;
  entityId?: number | string;
  entity_id?: number | string;
  title?: string;
  content?: string;
  createTime?: number | string;
  create_time?: number | string;
};

const normalizePageInfo = (raw: UserCenterRawPageResult<unknown>): UserCenterPageInfo => {
  const nestedPage = typeof raw.page === 'object' && raw.page !== null ? raw.page : undefined;
  const rootPage = typeof raw.page === 'number' ? raw.page : undefined;

  return {
    page: Number(nestedPage?.page ?? rootPage ?? DEFAULT_PAGE),
    limit: Number(nestedPage?.limit ?? raw.limit ?? DEFAULT_LIMIT),
    total: Number(nestedPage?.total ?? raw.total ?? 0),
  };
};

const normalizeTopic = (item: UserCenterRawTopic): UserCenterTopicResponse => ({
  id: item.id ?? '',
  userId: item.userId ?? item.user_id ?? '',
  title: item.title ?? '',
  content: item.content ?? '',
  createTime: item.createTime ?? item.create_time ?? '',
  displayStatus: Number(item.displayStatus ?? item.display_status ?? 0),
});

const normalizeComment = (item: UserCenterRawComment): UserCenterCommentResponse => ({
  id: item.id ?? '',
  userId: item.userId ?? item.user_id ?? '',
  content: item.content ?? '',
  title: item.title ?? '',
  createTime: item.createTime ?? item.create_time ?? '',
});

const normalizeFavorite = (item: UserCenterRawFavorite): UserCenterFavoriteResponse => ({
  id: item.id ?? '',
  userId: item.userId ?? item.user_id ?? '',
  entityId: item.entityId ?? item.entity_id ?? '',
  title: item.title ?? '',
  content: item.content ?? '',
  createTime: item.createTime ?? item.create_time ?? '',
});

const normalizeHiddenTopic = (item: UserCenterRawTopic): UserCenterHideTopicResponse => ({
  id: item.id ?? '',
  userId: item.userId ?? item.user_id ?? '',
  title: item.title ?? '',
  content: item.content ?? '',
  createTime: item.createTime ?? item.create_time ?? '',
  displayStatus: Number(item.displayStatus ?? item.display_status ?? 1),
});

const normalizePageResult = <TRaw, TItem>(
  raw: unknown,
  mapper: (item: TRaw) => TItem,
): UserCenterPageResult<TItem> => {
  const data = (raw ?? {}) as UserCenterRawPageResult<TRaw>;

  return {
    results: (data.results ?? data.data ?? data.list ?? []).map(mapper),
    page: normalizePageInfo(data),
  };
};

const createUserCenterInfiniteQuery = <TRaw, TItem>(
  queryKey: string,
  method: 'get' | 'post',
  cmd: string,
  mapper: (item: TRaw) => TItem,
  params?: UserCenterListParams,
) => {
  const initialPage = params?.page ?? DEFAULT_PAGE;
  const limit = Math.min(params?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  return useInfiniteQuery<UserCenterPageResult<TItem>>({
    queryKey: [queryKey, initialPage, limit],
    queryFn: async ({ pageParam = initialPage }) => {
      const res = await axiosCustom({
        method,
        cmd,
        params: { page: pageParam, limit },
        headers: getAuthorizationHeaders(),
      });

      return normalizePageResult<TRaw, TItem>(assertSuccess(res), mapper);
    },
    getNextPageParam: (lastPage) => {
      const { page, limit: pageLimit, total } = lastPage.page;
      return page * pageLimit < total ? page + 1 : undefined;
    },
    enabled: params?.enabled ?? true,
  });
};

const invalidateUserCenterQueries = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await Promise.all([
    queryClient.invalidateQueries([USER_CENTER_TOPICS_QUERY_KEY]),
    queryClient.invalidateQueries([USER_CENTER_HIDDEN_TOPICS_QUERY_KEY]),
  ]);
};

export function useInfiniteRequestUserCenterTopics(params?: UserCenterListParams) {
  return createUserCenterInfiniteQuery<UserCenterRawTopic, UserCenterTopicResponse>(
    USER_CENTER_TOPICS_QUERY_KEY,
    'get',
    API_User_Center_Topics,
    normalizeTopic,
    params,
  );
}

export function useInfiniteRequestUserCenterComments(params?: UserCenterListParams) {
  return createUserCenterInfiniteQuery<UserCenterRawComment, UserCenterCommentResponse>(
    USER_CENTER_COMMENTS_QUERY_KEY,
    'get',
    API_User_Center_Comments,
    normalizeComment,
    params,
  );
}

export function useInfiniteRequestUserCenterFavorites(params?: UserCenterListParams) {
  return createUserCenterInfiniteQuery<UserCenterRawFavorite, UserCenterFavoriteResponse>(
    USER_CENTER_FAVORITES_QUERY_KEY,
    'get',
    API_User_Center_Favorites,
    normalizeFavorite,
    params,
  );
}

export function useInfiniteRequestUserCenterHiddenTopics(params?: UserCenterListParams) {
  return createUserCenterInfiniteQuery<UserCenterRawTopic, UserCenterHideTopicResponse>(
    USER_CENTER_HIDDEN_TOPICS_QUERY_KEY,
    'post',
    API_User_Topic_Hide_List,
    normalizeHiddenTopic,
    params,
  );
}

export function useMutateUserTopicHide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['userTopicHide'],
    mutationFn: async ({ topicId }: UserTopicHidePayload) => {
      const res = await axiosCustom({
        method: 'post',
        cmd: `${API_User_Topic_Hide}/${topicId}`,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess<{ success?: boolean }>(res);
    },
    onSuccess: async () => {
      await invalidateUserCenterQueries(queryClient);
    },
  });
}

export function useMutateUserTopicUnhide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['userTopicUnhide'],
    mutationFn: async ({ topicId }: UserTopicHidePayload) => {
      const res = await axiosCustom({
        method: 'post',
        cmd: `${API_User_Topic_Unhide}/${topicId}`,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess<{ success?: boolean }>(res);
    },
    onSuccess: async () => {
      await invalidateUserCenterQueries(queryClient);
    },
  });
}
