/** 文件说明：论坛页面展示组件，负责把预测映射数据传入论坛视图。 */
import { ArrowLeft } from 'lucide-react';
import { Forum } from '../Forum';
import type { PredictionCardItem } from '../predictionCards';
import styles from './index.module.scss';

interface ForumPageViewProps {
  newsByMarketId: Map<number, PredictionCardItem>;
  onOpenLinkedPrediction: (item: PredictionCardItem) => void;
  onBack: () => void;
  /** 移动端底栏「发布」：每次递增时聚焦发帖区 */
  composerFocusSignal?: number;
}

export function ForumPageView({
  newsByMarketId,
  onOpenLinkedPrediction,
  onBack,
  composerFocusSignal,
}: ForumPageViewProps) {
  return (
    <section className={`view-forum w-full min-h-full ${styles.root}`}>
      <header className={`lg:hidden ${styles.pageHead}`}>
        <button type="button" className={styles.backBtn} onClick={onBack} aria-label="返回">
          <ArrowLeft size={18} />
        </button>
        <div className={styles.titleWrap}>
          <h1 className={styles.title}>线报</h1>
          <p className={styles.subtitle}>社区广场与热点讨论</p>
        </div>
      </header>

      <div className={`${styles.content} lg:px-0`}>
        <Forum
          newsByMarketId={newsByMarketId}
          onOpenLinkedPrediction={onOpenLinkedPrediction}
          showComposer
          composerFocusSignal={composerFocusSignal}
          mobileBottomSheetComposer={false}
        />
      </div>
    </section>
  );
}
