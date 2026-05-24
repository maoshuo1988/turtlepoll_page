/**
 * 文件说明：tag Types，定义标签分页接口的数据类型。
 */

export type TagListParams = {
  page?: number;
  limit?: number;
  keyword?: string;
};

export type TagItem = {
  id: number;
  name: string;
};

export type TagListResponse = {
  results: TagItem[];
  page: number;
  limit: number;
  total: number;
};
