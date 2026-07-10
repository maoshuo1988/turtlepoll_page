/** 文件说明：排行榜页面展示组件，承接页面级数据并渲染 RankPage。 */
import type { CoinLeaderboardResult } from '@/hooks/coinTypes';
import { ArrowLeft } from 'lucide-react';
import { RankPage } from '../RankPage';
import styles from './index.module.scss';

interface RankPageViewProps {
  isLoginRequired: boolean;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  data: CoinLeaderboardResult | null;
  currentUserId?: string | number;
  currentUserName?: string;
  onBack: () => void;
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
  onBack,
  onOpenAuth,
  onRetry,
}: RankPageViewProps) {
  return (
    <section className={`view-rank w-full min-h-full ${styles.root}`}>
      <header className={`lg:hidden ${styles.pageHead}`}>
        <button type="button" className={styles.backBtn} onClick={onBack} aria-label="返回">
          <ArrowLeft size={18} />
        </button>
        <div className={styles.titleWrap}>
          <h1 className={styles.title}>排行榜</h1>
          <p className={styles.subtitle}>战绩与热度</p>
        </div>
      </header>

      <div className={`${styles.content} lg:px-1`}>
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
      </div>
    </section>
  );
}
