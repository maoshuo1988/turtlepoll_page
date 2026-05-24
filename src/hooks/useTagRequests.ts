/**
 * 文件说明：use Tag Requests，封装标签分页列表接口请求。
 */
import { axiosCustom } from '@/api/httpClient';
import { API_Tag_Tags } from '@/api/tagApi';
import { useQuery } from 'react-query';
import { assertSuccess, getAuthorizationHeaders } from '@/utils/requestUtils';
import type { TagListParams, TagListResponse } from './tagTypes';

const normalizeTagListResponse = (data: Partial<TagListResponse> | undefined): TagListResponse => ({
  results: Array.isArray(data?.results) ? data.results : [],
  page: Number(data?.page ?? 1),
  limit: Number(data?.limit ?? 20),
  total: Number(data?.total ?? 0),
});

export function useRequestTagTags(params: TagListParams = {}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const keyword = params.keyword ?? '';

  return useQuery<TagListResponse>({
    queryKey: ['requestTagTags', page, limit, keyword],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_Tag_Tags,
        params: {
          page,
          limit,
          keyword: keyword || undefined,
        },
        headers: getAuthorizationHeaders(),
      });
      return normalizeTagListResponse(assertSuccess(res));
    },
  });
}
