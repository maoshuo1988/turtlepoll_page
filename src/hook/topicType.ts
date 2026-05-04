/**
 * 文件说明：topic Type，定义对应业务域的接口数据类型。
 */
import type { PredictContext } from './predictType';

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
};


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
  likeCount?: number;
  liked?: boolean;
  createTime?: number;
  recommend?: boolean;
  sticky?: boolean;
  favorited?: boolean;
  ipLocation?: string;
  hideContent?: string;
  contentType?: string;
};

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































































