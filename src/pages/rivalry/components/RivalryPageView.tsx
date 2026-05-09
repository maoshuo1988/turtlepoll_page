/** 文件说明：龟势对决页面展示组件，负责展示错误提示和对决下注视图。 */
import { Flame } from 'lucide-react';
import { RivalryPK } from './RivalryPK';

interface RivalryPageViewProps {
  userVotes: Record<string, 'A' | 'B'>;
  betError: string | null;
  pendingBetId: string | null;
  onBet: (newsId: string, option: 'A' | 'B', odds: number, amount?: number) => void;
}

export function RivalryPageView({ userVotes, betError, pendingBetId, onBet }: RivalryPageViewProps) {
  return (
    <section className="page-frame page-frame-wide view-rivalry">
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-eyebrow">
              <Flame size={14} />
              Rivalry
            </div>
            <h1 className="page-title">开撕台</h1>
            <p className="page-description">热点议题按阵营对抗展示，下注先进入确认弹框，历史战绩和赛季记录保持可收起。</p>
          </div>
        </div>
      </header>
      {betError ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
          {betError}
        </div>
      ) : null}
      <RivalryPK
        userVotes={userVotes}
        onBet={onBet}
        pendingBetId={pendingBetId}
      />
    </section>
  );
}
