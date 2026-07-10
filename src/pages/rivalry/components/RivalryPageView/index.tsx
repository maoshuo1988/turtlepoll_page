/** 文件说明：龟势对决页面展示组件，负责展示错误提示和对决下注视图。 */
import { ArrowLeft } from 'lucide-react';
import type { RivalryNewsItem } from '../rivalryTypes';
import { RivalryPK } from '../RivalryPK';
import styles from './index.module.scss';

interface RivalryPageViewProps {
  userVotes: Record<string, 'A' | 'B'>;
  betError: string | null;
  pendingBetId: string | null;
  pendingSettleId?: string | null;
  onBack: () => void;
  onBet: (newsId: string, option: 'A' | 'B', odds: number, amount?: number) => void;
  onSettle?: (topicId: string) => void;
  onEnterBattle: (item: RivalryNewsItem) => void;
}

export function RivalryPageView({
  userVotes,
  betError,
  pendingBetId,
  pendingSettleId,
  onBack,
  onBet,
  onSettle,
  onEnterBattle,
}: RivalryPageViewProps) {
  return (
    <section className="view-rivalry w-full max-w-none min-h-full mx-0 grid content-start gap-4 max-lg:gap-3">
      <header className={`lg:hidden ${styles.mobileHead}`}>
        <button type="button" className={styles.backBtn} onClick={onBack} aria-label="返回">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className={styles.title}>开撕台</h1>
          <p className={styles.subtitle}>观点交锋热榜</p>
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
        onSettle={onSettle}
        pendingBetId={pendingBetId}
        pendingSettleId={pendingSettleId}
        onEnterBattle={onEnterBattle}
      />
    </section>
  );
}
