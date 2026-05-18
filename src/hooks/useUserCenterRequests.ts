/**
 * 文件说明：use User Center Requests，封装个人中心相关列表请求。
 */
import { useInfiniteQuery } from 'react-query';
import { axiosCustom } from '@/api/httpClient';
import {
  API_User_Center_Comments,
  API_User_Center_Favorites,
  API_User_Center_Topics,
} from '@/api/userApi';
import { assertSuccess, getAuthorizationHeaders } from '@/utils/requestUtils';
import type {
  UserCenterCommentResponse,
  UserCenterFavoriteResponse,
  UserCenterListParams,
  UserCenterPageInfo,
  UserCenterPageResult,
  UserCenterTopicResponse,
} from './userCenterTypes';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

type UserCenterRawPageResult<T> = {
  results?: T[];
  data?: T[];
  list?: T[];
  page?: Partial<UserCenterPageInfo>;
};

type UserCenterRawTopic = {
  id?: number | string;
  userId?: number | string;
  user_id?: number | string;
  title?: string;
  content?: string;
  createTime?: number;
  create_time?: number;
};

type UserCenterRawComment = {
  id?: number | string;
  userId?: number | string;
  user_id?: number | string;
  content?: string;
  title?: string;
  createTime?: number;
  create_time?: number;
};

type UserCenterRawFavorite = {
  id?: number | string;
  userId?: number | string;
  user_id?: number | string;
  entityId?: number | string;
  entity_id?: number | string;
  title?: string;
  content?: string;
  createTime?: number;
  create_time?: number;
};

const normalizePageInfo = (page?: Partial<UserCenterPageInfo>): UserCenterPageInfo => ({
  page: Number(page?.page ?? DEFAULT_PAGE),
  limit: Number(page?.limit ?? DEFAULT_LIMIT),
  total: Number(page?.total ?? 0),
});

const normalizeTopic = (item: UserCenterRawTopic): UserCenterTopicResponse => ({
  id: item.id ?? '',
  userId: item.userId ?? item.user_id ?? '',
  title: item.title ?? '',
  content: item.content ?? '',
  createTime: Number(item.createTime ?? item.create_time ?? 0),
});

const normalizeComment = (item: UserCenterRawComment): UserCenterCommentResponse => ({
  id: item.id ?? '',
  userId: item.userId ?? item.user_id ?? '',
  content: item.content ?? '',
  title: item.title ?? '',
  createTime: Number(item.createTime ?? item.create_time ?? 0),
});

const normalizeFavorite = (item: UserCenterRawFavorite): UserCenterFavoriteResponse => ({
  id: item.id ?? '',
  userId: item.userId ?? item.user_id ?? '',
  entityId: item.entityId ?? item.entity_id ?? '',
  title: item.title ?? '',
  content: item.content ?? '',
  createTime: Number(item.createTime ?? item.create_time ?? 0),
});

const normalizePageResult = <TRaw, TItem>(
  raw: unknown,
  mapper: (item: TRaw) => TItem,
): UserCenterPageResult<TItem> => {
  const data = (raw ?? {}) as UserCenterRawPageResult<TRaw>;

  return {
    results: (data.results ?? data.data ?? data.list ?? []).map(mapper),
    page: normalizePageInfo(data.page),
  };
};

const createUserCenterInfiniteQuery = <TRaw, TItem>(
  queryKey: string,
  cmd: string,
  mapper: (item: TRaw) => TItem,
  params?: UserCenterListParams,
) => {
  const initialPage = params?.page ?? DEFAULT_PAGE;
  const limit = Math.min(params?.limit ?? DEFAULT_LIMIT, 200);

  return useInfiniteQuery<UserCenterPageResult<TItem>>({
    queryKey: [queryKey, initialPage, limit],
    queryFn: async ({ pageParam = initialPage }) => {
      const res = await axiosCustom({
        method: 'get',
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

export function useInfiniteRequestUserCenterTopics(params?: UserCenterListParams) {
  return createUserCenterInfiniteQuery<UserCenterRawTopic, UserCenterTopicResponse>(
    'requestUserCenterTopics',
    API_User_Center_Topics,
    normalizeTopic,
    params,
  );
}

export function useInfiniteRequestUserCenterComments(params?: UserCenterListParams) {
  return createUserCenterInfiniteQuery<UserCenterRawComment, UserCenterCommentResponse>(
    'requestUserCenterComments',
    API_User_Center_Comments,
    normalizeComment,
    params,
  );
}

export function useInfiniteRequestUserCenterFavorites(params?: UserCenterListParams) {
  return createUserCenterInfiniteQuery<UserCenterRawFavorite, UserCenterFavoriteResponse>(
    'requestUserCenterFavorites',
    API_User_Center_Favorites,
    normalizeFavorite,
    params,
  );
}
