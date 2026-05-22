/**
 * 文件说明：use Dislike Requests，封装帖子点踩与取消点踩请求。
 */
import { useMutation, useQueryClient } from 'react-query';
import { axiosCustom } from '@/api/httpClient';
import { API_Dislike_Cancel, API_Dislike_Create } from '@/api/dislikeApi';
import { assertSuccess, getAuthorizationHeaders } from '@/utils/requestUtils';
import type { DislikeEntityPayload } from './userCenterTypes';

const USER_CENTER_DISLIKES_QUERY_KEY = 'requestUserCenterDislikes';

const invalidateDislikeQueries = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await Promise.all([
    queryClient.invalidateQueries([USER_CENTER_DISLIKES_QUERY_KEY]),
    queryClient.invalidateQueries(['requestTopicTopics']),
    queryClient.invalidateQueries(['requestTopicDetail']),
  ]);
};

export function useMutateDislikeTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['dislikeTopicCreate'],
    mutationFn: async (payload: DislikeEntityPayload) => {
      const res = await axiosCustom({
        method: 'post',
        cmd: API_Dislike_Create,
        params: payload,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess<{ success?: boolean }>(res);
    },
    onSuccess: async () => {
      await invalidateDislikeQueries(queryClient);
    },
  });
}

export function useMutateUndislikeTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['dislikeTopicCancel'],
    mutationFn: async (payload: DislikeEntityPayload) => {
      const res = await axiosCustom({
        method: 'post',
        cmd: API_Dislike_Cancel,
        params: payload,
        headers: getAuthorizationHeaders(),
      });
      return assertSuccess<{ success?: boolean }>(res);
    },
    onSuccess: async () => {
      await invalidateDislikeQueries(queryClient);
    },
  });
}

export { USER_CENTER_DISLIKES_QUERY_KEY };
