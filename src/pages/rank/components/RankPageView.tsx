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
    <section className="w-full max-w-none min-h-full mx-0 grid content-start gap-4 pt-[10px] max-lg:gap-3 view-rank">
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
