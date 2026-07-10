/** 文件说明：暗盘页面展示组件（移动端二级页）。 */
import { ArrowLeft } from 'lucide-react';
import type { PlaceBetResult } from '@/hooks/coinTypes';
import type { PredictionBetOption, PredictionCardItem } from '@/pages/home/components/predictionCards';
import { DarkMarketMobilePage } from '../DarkMarketMobilePage';
import styles from './index.module.scss';

interface DarkMarketPageViewProps {
  items: PredictionCardItem[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  onBack: () => void;
  onEnterBattle: (item: PredictionCardItem) => void;
  onRequireAuth?: () => void;
  onBetSuccess?: (item: PredictionCardItem, option: PredictionBetOption, result: PlaceBetResult) => void;
}

export function DarkMarketPageView({
  items,
  isLoading = false,
  isLoadingMore = false,
  onBack,
  onEnterBattle,
  onRequireAuth,
  onBetSuccess,
}: DarkMarketPageViewProps) {
  return (
    <section className={`view-dark-market w-full min-h-full ${styles.root}`}>
      <header className={styles.pageHead}>
        <button type="button" className={styles.backBtn} onClick={onBack} aria-label="返回">
          <ArrowLeft size={18} />
        </button>
        <div className={styles.titleWrap}>
          <h1 className={styles.title}>暗盘</h1>
          <p className={styles.subtitle}>全部预测市场</p>
        </div>
        <span className={styles.countBadge}>{items.length} 场</span>
      </header>

      <DarkMarketMobilePage
        items={items}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        onEnterBattle={onEnterBattle}
        onRequireAuth={onRequireAuth}
        onBetSuccess={onBetSuccess}
      />
    </section>
  );
}
