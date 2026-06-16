/** 文件说明：排行榜页面展示组件，承接页面级数据并渲染 RankPage。 */
import type { CoinLeaderboardResult } from '@/hooks/coinTypes';
import { RankPage } from './RankPage';

interface RankPageViewProps {
  isLoginRequired: boolean;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  data: CoinLeaderboardResult | null;
  currentUserId?: string | number;
  currentUserName?: string;
  onOpenAuth: () => void;
  onRetry: () => void;
}

export function RankPageView({
  isLoginRequired,
  isLoading,
  isError,
  errorMessage,
  data,
  currentUserId,
  currentUserName,
  onOpenAuth,
  onRetry,
}: RankPageViewProps) {
  return (
    <section className="view-rank mx-0 flex h-full min-h-0 w-full max-w-none flex-col px-3 pt-[10px] lg:px-4">
      <RankPage
        isLoginRequired={isLoginRequired}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        data={data}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        onOpenAuth={onOpenAuth}
        onRetry={onRetry}
      />
    </section>
  );
}
