/**
 * 文件说明：user center Types，定义个人中心接口数据类型。
 */

export type UserCenterPageInfo = {
  page: number;
  limit: number;
  total: number;
};

export type UserCenterPageResult<T> = {
  results: T[];
  page: UserCenterPageInfo;
};

export type UserCenterListParams = {
  page?: number;
  limit?: number;
  enabled?: boolean;
};

export type UserCenterTopicResponse = {
  id: number | string;
  userId: number | string;
  title: string;
  content: string;
  createTime: number | string;
  displayStatus?: number;
};

export type UserCenterCommentResponse = {
  id: number | string;
  userId: number | string;
  content: string;
  title: string;
  createTime: number | string;
};

export type UserCenterFavoriteResponse = {
  id: number | string;
  userId: number | string;
  entityId: number | string;
  title: string;
  content: string;
  createTime: number | string;
};

export type UserCenterHideTopicResponse = {
  id: number | string;
  userId: number | string;
  title: string;
  content: string;
  createTime: number | string;
  displayStatus: number;
};

export type UserTopicHidePayload = {
  topicId: number | string;
};
