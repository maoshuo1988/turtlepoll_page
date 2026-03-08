import { QueryClient } from 'react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
      cacheTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});

