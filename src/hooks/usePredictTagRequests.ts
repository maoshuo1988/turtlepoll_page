/**
 * 文件说明：predict-tag 维表列表请求。
 */
import { useQuery } from 'react-query';
import { API_Predict_Tag_List } from '@/api/predictTagApi';
import { axiosCustom } from '@/api/httpClient';
import { getAuthToken } from '@/utils/authStorage';
import { assertSuccess, getAuthorizationHeaders } from '@/utils/requestUtils';
import {
  normalizePredictTagList,
  type PredictTagListParams,
  type PredictTagListResult,
} from '@/hooks/predictTagTypes';

export const PREDICT_TAG_LIST_QUERY_KEY = 'requestPredictTagList';

export function useRequestPredictTagList(params: PredictTagListParams = {}) {
  const token = getAuthToken();
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 50, 200);
  const includeCounts = params.includeCounts ?? true;
  const sort = params.sort ?? (includeCounts ? 'marketCount' : undefined);

  return useQuery<PredictTagListResult>({
    queryKey: [PREDICT_TAG_LIST_QUERY_KEY, page, pageSize, params.q, params.slugs, sort, includeCounts, Boolean(token)],
    queryFn: async () => {
      const res = await axiosCustom({
        method: 'get',
        cmd: API_Predict_Tag_List,
        params: {
          page,
          pageSize,
          ...(params.q ? { q: params.q } : {}),
          ...(params.slugs ? { slugs: params.slugs } : {}),
          ...(sort ? { sort } : {}),
          ...(includeCounts ? { includeCounts: 1 } : { includeCounts: 0 }),
        },
        headers: getAuthorizationHeaders(),
      });
      return normalizePredictTagList(assertSuccess(res));
    },
    enabled: Boolean(token),
    staleTime: 60_000,
  });
}
