/** 文件说明：小游戏页面展示组件，负责承载游戏入口和对应跳转动作。 */
import { ArrowLeft } from 'lucide-react';
import { GameHubPage } from '../GameHubPage';
import styles from './index.module.scss';

interface GamesPageViewProps {
  onBack: () => void;
  onOpenJump: () => void;
  onOpenLab: () => void;
  onOpenBattle: () => void;
}

export function GamesPageView({ onBack, onOpenJump, onOpenLab, onOpenBattle }: GamesPageViewProps) {
  return (
    <section className={`view-games w-full min-h-full ${styles.root}`}>
      <header className={`lg:hidden ${styles.pageHead}`}>
        <button type="button" className={styles.backBtn} onClick={onBack} aria-label="返回">
          <ArrowLeft size={18} />
        </button>
        <div className={styles.titleWrap}>
          <h1 className={styles.title}>游戏</h1>
          <p className={styles.subtitle}>趣味玩法赚龟币</p>
        </div>
      </header>

      <GameHubPage onOpenJump={onOpenJump} onOpenLab={onOpenLab} onOpenBattle={onOpenBattle} />
    </section>
  );
}
