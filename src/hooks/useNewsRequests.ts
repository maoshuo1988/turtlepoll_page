/**
 * 文件说明：use News Requests，封装资讯系统的公开浏览、搜索、详情和元数据接口。
 */
import {
  API_News_Categories,
  API_News_Detail,
  API_News_List,
  API_News_Search,
  API_News_Tags,
} from '@/api/newsApi';
import { axiosCustom } from '@/api/httpClient';
import { assertSuccess } from '@/utils/requestUtils';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import type {
  NewsArticle,
  NewsArticleDetail,
  NewsCategoriesResponse,
  NewsDetailParams,
  NewsDetailResponse,
  NewsListParams,
  NewsListResponse,
  NewsTagsResponse,
} from './newsTypes';

const normalizeNewsArticle = (item: Partial<NewsArticle> | null | undefined): NewsArticle | null => {
  const id = Number(item?.id);
  const title = String(item?.title ?? '').trim();
  if (!Number.isFinite(id) || !title) return null;

  return {
    id,
    title,
    summary: String(item?.summary ?? '').trim(),
    coverUrl: String(item?.coverUrl ?? '').trim(),
    source: String(item?.source ?? '').trim(),
    sourceName: String(item?.sourceName ?? '').trim(),
    sourceUrl: String(item?.sourceUrl ?? '').trim(),
    channel: String(item?.channel ?? '').trim(),
    category: String(item?.category ?? '').trim(),
    tags: Array.isArray(item?.tags) ? item.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
    publishedAt: Number(item?.publishedAt ?? 0),
    hotScore: Number(item?.hotScore ?? 0),
  };
};

const normalizeNewsListResponse = (
  data: Partial<NewsListResponse> | undefined,
  page: number,
  pageSize: number,
): NewsListResponse => {
  const list = Array.isArray(data?.list)
    ? data.list.map((item) => normalizeNewsArticle(item)).filter((item): item is NewsArticle => Boolean(item))
    : [];

  return {
    list,
    count: Number(data?.count ?? list.length),
    page: Number(data?.page ?? page),
    pageSize: Number(data?.pageSize ?? pageSize),
  };
};

const normalizeNewsDetailResponse = (data: Partial<NewsDetailResponse> | undefined): NewsDetailResponse => {
  const article = normalizeNewsArticle(data?.news);
  if (!article) return { news: null };

  const rawNews = data?.news as Partial<NewsArticleDetail> | undefined;
  return {
    news: {
      ...article,
      sourceId: String(rawNews?.sourceId ?? '').trim(),
      slug: String(rawNews?.slug ?? '').trim(),
      content: String(rawNews?.content ?? '').trim(),
      contentImages: Array.isArray(rawNews?.contentImages)
        ? rawNews.contentImages.map((url) => String(url).trim()).filter(Boolean)
        : [],
      fetchedAt: Number(rawNews?.fetchedAt ?? 0),
    },
  };
};

const normalizeNewsCategoriesResponse = (
  data: Partial<NewsCategoriesResponse> | undefined,
): NewsCategoriesResponse => ({
  list: Array.isArray(data?.list)
    ? data.list
        .map((item) => ({
          key: String(item?.key ?? '').trim(),
          name: String(item?.name ?? '').trim(),
          sort: Number(item?.sort ?? 0),
        }))
        .filter((item) => item.key && item.name)
    : [],
});

const normalizeNewsTagsResponse = (data: Partial<NewsTagsResponse> | undefined): NewsTagsResponse => ({
  list: Array.isArray(data?.list)
    ? data.list
        .map((item) => ({
          key: String(item?.key ?? '').trim(),
          name: String(item?.name ?? '').trim(),
        }))
        .filter((item) => item.key && item.name)
    : [],
});

function buildNewsListParams(params: NewsListParams, page: number, pageSize: number) {
  return {
    page,
    pageSize,
    q: params.q?.trim() || undefined,
    category: params.category?.trim() || undefined,
    tag: params.tag?.trim() || undefined,
    source: params.source?.trim() || 'hupu',
    sort: params.sort ?? 'publishedAt_desc',
  };
}

export function useRequestNewsList(params: NewsListParams = {}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;

  return useQuery<NewsListResponse>({
    queryKey: ['requestNewsList', page, pageSize, params.q ?? '', params.category ?? '', params.tag ?? '', params.source ?? 'hupu', params.sort ?? 'publishedAt_desc'],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_News_List,
        params: buildNewsListParams(params, page, pageSize),
      });
      return normalizeNewsListResponse(assertSuccess(res), page, pageSize);
    },
    enabled: params.enabled !== false,
  });
}

export function useRequestNewsListDirect(params: NewsListParams = {}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const enabled = params.enabled !== false;
  const [data, setData] = useState<NewsListResponse>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const requestParams = useMemo(
    () => buildNewsListParams(params, page, pageSize),
    [page, pageSize, params.category, params.q, params.source, params.sort, params.tag],
  );

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    console.info('[news] request', API_News_List, requestParams);

    try {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_News_List,
        params: requestParams,
      });
      const nextData = normalizeNewsListResponse(assertSuccess(res), page, pageSize);
      setData(nextData);
      return nextData;
    } catch (nextError) {
      setError(nextError);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, requestParams]);

  useEffect(() => {
    if (!enabled) return;
    void refetch();
  }, [enabled, refetch]);

  return {
    data,
    error,
    isError: Boolean(error),
    isLoading,
    refetch,
  };
}

export function useRequestNewsSearch(params: NewsListParams = {}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;

  return useQuery<NewsListResponse>({
    queryKey: ['requestNewsSearch', page, pageSize, params.q ?? '', params.category ?? '', params.tag ?? '', params.source ?? 'hupu', params.sort ?? 'publishedAt_desc'],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_News_Search,
        params: buildNewsListParams(params, page, pageSize),
      });
      return normalizeNewsListResponse(assertSuccess(res), page, pageSize);
    },
    enabled: params.enabled !== false && Boolean(params.q?.trim()),
  });
}

export function useRequestNewsDetail(params: NewsDetailParams = {}) {
  return useQuery<NewsDetailResponse>({
    queryKey: ['requestNewsDetail', params.id ?? '', params.sourceId ?? '', params.slug ?? ''],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_News_Detail,
        params: {
          id: params.id,
          sourceId: params.sourceId?.trim() || undefined,
          slug: params.slug?.trim() || undefined,
        },
      });
      return normalizeNewsDetailResponse(assertSuccess(res));
    },
    enabled: params.enabled !== false && Boolean(params.id || params.sourceId?.trim() || params.slug?.trim()),
  });
}

export function useRequestNewsCategories() {
  return useQuery<NewsCategoriesResponse>({
    queryKey: ['requestNewsCategories'],
    queryFn: async () => {
      const res = await axiosCustom({ method: 'get', cmd: API_News_Categories });
      return normalizeNewsCategoriesResponse(assertSuccess(res));
    },
  });
}

export function useRequestNewsTags() {
  return useQuery<NewsTagsResponse>({
    queryKey: ['requestNewsTags'],
    queryFn: async () => {
      const res = await axiosCustom({ method: 'get', cmd: API_News_Tags });
      return normalizeNewsTagsResponse(assertSuccess(res));
    },
  });
}
