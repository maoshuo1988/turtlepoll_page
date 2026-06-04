/**
 * 文件说明：topic Types，定义对应业务域的接口数据类型。
 */
import type { PredictContext } from './predictionTypes';

export type CreateTopicPayload = {
  type: number;
  nodeId: number;
  title: string;
  content: string;
  contentType: string;
  hideContent?: string;
  tags: string[];
  imageList: Array<{ url: string }>;
  vote: null;
  captchaId: string;
  captchaCode: string;
  captchaProtocol: number;
};

export type CursorResult<T> = {
  results: T[];
  cursor: number | string;
  hasMore: boolean;
  /** 列表总数（部分接口在 cursor 分页下仍返回 total） */
  total?: number;
};

/** 个人中心 /api/topic/topics 的 business_type */
export type TopicBusinessType = 1 | 2 | 3 | 4 | 5 | 6;

export const TOPIC_BUSINESS_TYPE = {
  /** 当前用户自己的帖子 */
  ownPosts: 1,
  /** 当前用户收藏的帖子 */
  favorites: 2,
  /** 当前用户隐藏的帖子 */
  hidden: 3,
  /** 当前用户点赞过的别人的帖子 */
  liked: 4,
  /** 当前用户点踩过的别人的帖子 */
  disliked: 5,
  /** 当前用户评论过的帖子 */
  commented: 6,
} as const satisfies Record<string, TopicBusinessType>;


export type EditTopicPayload = {
  nodeId: number;
  title: string;
  content: string;
  hideContent?: string;
  tags: string[];
};



export type SimpleTopic = TopicResponse;

export type TagTopicsParams = {
  tagId: number;
  cursor?: number | string;
};

export type TopicEditDetail = {
  id: string;
  nodeId: number;
  title: string;
  content: string;
  contentType: string;
  hideContent?: string;
  tags: string[];
};

export type TopicHideContentParams = {
  topicId: number;
};

export type TopicHideContentResponse = {
  exists: boolean;
  show: boolean;
  content: string;
};

export type TopicListParams = {
  cursor?: number | string;
  nodeId?: number;
  business_type?: TopicBusinessType;
};

export type ProfileTopicListParams = {
  businessType: TopicBusinessType;
  enabled?: boolean;
};

export type TopicNodeInfoParams = {
  nodeId: number;
};

export type TopicNodeNav = {
  id: number;
  name: string;
  logo?: string;
  description?: string;
};


export type TopicNodeResponse = TopicNodeNav & {
  topicCount?: number;
  sort?: number;
};

export type TopicResponse = {
  id: string;
  type: number;
  user?: TopicUser | null;
  node?: TopicNodeNav | null;
  context?: Partial<PredictContext> | null;
  tags?: TopicTag[] | null;
  title?: string;
  summary?: string;
  content?: string;
  imageList?: TopicImage[];
  viewCount?: number;
  commentCount?: number;
  /** 点赞数 */
  likeCount?: number;
  /** 是否已点赞 */
  liked?: boolean;
  /** 点踩数（接口字段 disLikeCount，归一化后 dislikeCount 同步） */
  disLikeCount?: number;
  dislikeCount?: number;
  /** 是否已点踩（接口字段 disLiked，归一化后 disliked 同步） */
  disLiked?: boolean;
  disliked?: boolean;
  /** 收藏数 */
  favoriteCount?: number;
  /** 是否已收藏 */
  favorited?: boolean;
  createTime?: number;
  recommend?: boolean;
  sticky?: boolean;
  ipLocation?: string;
  hideContent?: string;
  contentType?: string;
};

function pickTopicNumber(raw: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function pickTopicBoolean(raw: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'boolean') return value;
    if (value === 1 || value === '1' || value === 'true') return true;
    if (value === 0 || value === '0' || value === 'false') return false;
  }
  return undefined;
}

/** 线报帖子：对齐接口 like / disLike / favorite 字段命名 */
export function normalizeTopicResponse(raw: unknown): TopicResponse {
  if (!raw || typeof raw !== 'object') {
    return { id: '', type: 0 };
  }

  const row = raw as Record<string, unknown>;
  const topic = raw as TopicResponse;

  const likeCount = pickTopicNumber(row, 'likeCount', 'like_count');
  const commentCount = pickTopicNumber(row, 'commentCount', 'comment_count');
  const disLikeCount = pickTopicNumber(row, 'disLikeCount', 'dislikeCount', 'dis_like_count');
  const favoriteCount = pickTopicNumber(row, 'favoriteCount', 'favorite_count');
  const liked = pickTopicBoolean(row, 'liked');
  const disLiked = pickTopicBoolean(row, 'disLiked', 'disliked');
  const favorited = pickTopicBoolean(row, 'favorited');

  const resolvedDislikeCount = disLikeCount ?? topic.disLikeCount ?? topic.dislikeCount ?? 0;
  const resolvedDisliked = disLiked ?? Boolean(topic.disLiked ?? topic.disliked);

  return {
    ...topic,
    likeCount: likeCount ?? topic.likeCount ?? 0,
    liked: liked ?? Boolean(topic.liked),
    commentCount: commentCount ?? topic.commentCount ?? 0,
    disLikeCount: resolvedDislikeCount,
    dislikeCount: resolvedDislikeCount,
    disLiked: resolvedDisliked,
    disliked: resolvedDisliked,
    favoriteCount: favoriteCount ?? topic.favoriteCount ?? 0,
    favorited: favorited ?? Boolean(topic.favorited),
  };
}

export function normalizeTopicCursorResult(raw: unknown): CursorResult<TopicResponse> {
  if (!raw || typeof raw !== 'object') {
    return { results: [], cursor: 0, hasMore: false };
  }

  const row = raw as Record<string, unknown>;
  const resultsRaw = Array.isArray(row.results) ? row.results : [];
  const results = resultsRaw
    .map((item) => normalizeTopicResponse(item))
    .filter((item) => Boolean(item.id));

  const cursor = row.cursor;
  const hasMore = Boolean(row.hasMore ?? row.has_more);
  const total = pickTopicNumber(row, 'total', 'count', 'totalCount', 'total_count');

  return {
    results,
    cursor: typeof cursor === 'number' || typeof cursor === 'string' ? cursor : 0,
    hasMore,
    ...(total !== undefined ? { total } : {}),
  };
}

export function normalizeTopicList(raw: unknown): TopicResponse[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => normalizeTopicResponse(item)).filter((item) => Boolean(item.id));
}

export type TopicTag = {
  id: number;
  name: string;
};

export type TopicImage = {
  url: string;
  preview?: string;
};

export type TopicUser = {
  id?: string;
  nickname?: string;
  username?: string;
  avatar?: string;
  smallAvatar?: string;
  score?: number;
};


export type UserInfo = TopicUser & {
  cover?: string;
  introduction?: string;
};


export type UserTopicsParams = {
  userId: number | string ;
  cursor?: number | string;
};






























































