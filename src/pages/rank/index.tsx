/**
 * 文件说明：index 页面路由入口，负责排行榜取数、登录校验与页面组装。
 */
import { useNavigate } from '@umijs/renderer-react';
import { RankPageView } from './components/RankPageView';
import { useHomeLayoutContext } from '@/layouts/context';
import { useAppSession } from '@/hooks/useAppSession';
import { useRequestCoinLeaderboard } from '@/hooks/useCoinRequests';
import { getAuthToken } from '@/utils/authStorage';

export default function RankPage() {
  const navigate = useNavigate();
  const { onOpenAuth } = useHomeLayoutContext();
  const token = getAuthToken();
  const { user } = useAppSession();
  const leaderboardQuery = useRequestCoinLeaderboard({ limit: 200 });

  const currentUserId =
    user?.id !== undefined && user?.id !== null && String(user.id).trim() !== '' ? user.id : undefined;
  const currentUserName = user?.nickname || user?.username || '我';

  return (
    <RankPageView
      isLoginRequired={!token}
      isLoading={Boolean(token) && leaderboardQuery.isLoading}
      isError={Boolean(token) && leaderboardQuery.isError}
      errorMessage={leaderboardQuery.error instanceof Error ? leaderboardQuery.error.message : undefined}
      data={leaderboardQuery.data ?? null}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      onBack={() => navigate('/')}
      onOpenAuth={onOpenAuth}
      onRetry={() => {
        void leaderboardQuery.refetch();
      }}
    />
  );
}
