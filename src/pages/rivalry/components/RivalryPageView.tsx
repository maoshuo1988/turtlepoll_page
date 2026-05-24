/** 文件说明：龟势对决页面展示组件，负责展示错误提示和对决下注视图。 */
import type { RivalryNewsItem } from './rivalryMockData';
import { RivalryPK } from './RivalryPK';

interface RivalryPageViewProps {
  userVotes: Record<string, 'A' | 'B'>;
  betError: string | null;
  pendingBetId: string | null;
  onBet: (newsId: string, option: 'A' | 'B', odds: number, amount?: number) => void;
  onEnterBattle: (item: RivalryNewsItem) => void;
}

export function RivalryPageView({ userVotes, betError, pendingBetId, onBet, onEnterBattle }: RivalryPageViewProps) {
  return (
    <section className="w-full max-w-none min-h-full mx-0 grid content-start gap-4 max-lg:gap-3 view-rivalry">
      {betError ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
          {betError}
        </div>
      ) : null}
      <RivalryPK
        userVotes={userVotes}
        onBet={onBet}
        pendingBetId={pendingBetId}
        onEnterBattle={onEnterBattle}
      />
    </section>
  );
}
