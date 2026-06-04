/**
 * 文件说明：news Types，定义资讯系统接口入参与响应数据结构。
 */

export type NewsSort = 'publishedAt_desc' | 'publishedAt_asc' | 'hotScore_desc';

export type NewsListParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  category?: string;
  tag?: string;
  source?: string;
  sort?: NewsSort;
  enabled?: boolean;
};

export type NewsDetailParams = {
  id?: number;
  sourceId?: string;
  slug?: string;
  enabled?: boolean;
};

export type NewsArticle = {
  id: number;
  title: string;
  summary?: string;
  coverUrl?: string;
  source?: string;
  sourceName?: string;
  sourceUrl?: string;
  channel?: string;
  category?: string;
  tags?: string[];
  publishedAt?: number;
  hotScore?: number;
};

export type NewsArticleDetail = NewsArticle & {
  sourceId?: string;
  slug?: string;
  content?: string;
  contentImages?: string[];
  fetchedAt?: number;
};

export type NewsListResponse = {
  list: NewsArticle[];
  count: number;
  page: number;
  pageSize: number;
};

export type NewsDetailResponse = {
  news: NewsArticleDetail | null;
};

export type NewsCategoryItem = {
  key: string;
  name: string;
  sort?: number;
};

export type NewsTagItem = {
  key: string;
  name: string;
};

export type NewsCategoriesResponse = {
  list: NewsCategoryItem[];
};

export type NewsTagsResponse = {
  list: NewsTagItem[];
};
