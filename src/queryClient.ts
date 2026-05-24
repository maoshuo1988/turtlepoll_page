/**
 * 文件说明：React Query 客户端实例，统一配置接口缓存行为。
 */
import { QueryClient } from 'react-query';
import { isUnauthorizedError } from '@/utils/requestUtils';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (isUnauthorizedError(error)) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      cacheTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});
