/** 文件说明：地下钱庄页面展示组件，负责承载地下钱庄业务视图。 */
import { ArrowLeft } from 'lucide-react';
import { BattlePlazaPage } from '../BattlePlazaPage';
import styles from './index.module.scss';

interface BattlePlazaPageViewProps {
  onBack: () => void;
}

export function BattlePlazaPageView({ onBack }: BattlePlazaPageViewProps) {
  return (
    <section className={`view-battle-plaza w-full min-h-full ${styles.root}`}>
      <header className={`lg:hidden ${styles.pageHead}`}>
        <button type="button" className={styles.backBtn} onClick={onBack} aria-label="返回">
          <ArrowLeft size={18} />
        </button>
        <div className={styles.titleWrap}>
          <h1 className={styles.title}>地下钱庄</h1>
          <p className={styles.subtitle}>开局做庄、挑战庄家、进入私人赌局</p>
        </div>
        {/* <span className={styles.coinBadge}>
          <img src="/image/battle/battle-2.png" alt="" className={styles.coinIcon} aria-hidden />
          {formatCoins(balance)}
        </span> */}
      </header>

      <BattlePlazaPage />
    </section>
  );
}
