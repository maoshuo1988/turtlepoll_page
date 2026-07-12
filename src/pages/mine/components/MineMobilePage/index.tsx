/**
 * 文件说明：移动端「我的」Tab 页（待结算与快捷入口，不含暗盘列表）。
 */
import { useCallback, useMemo } from 'react';
import { useNavigate } from '@umijs/renderer-react';
import { getAuthToken } from '@/utils/authStorage';
import { useSettlementRecords } from '@/hooks/usePendingSettlements';
import type { SettlementRecordItem } from '@/hooks/settlementTypes';
import { useHomeLayoutContext } from '@/layouts/context';
import { useSettlementLayout } from '@/layouts/context/SettlementLayoutContext';
import { settlementRecordToPath } from '@/pages/settlement/settlementNavigation';
import { IconFont } from '@/components/common/iconfont/IconFont';
import { HomeMobileSettlementEventCard } from '@/pages/home/components/HomeMobileSettlementEventCard';
import { listSettlementCards } from '@/pages/home/components/homeMobileSettlementModel';
import styles from './index.module.scss';

const MAX_SETTLEMENT_CARDS = 5;

const QUICK_LINKS = [
  { key: 'profile', label: '账号中心', sub: '资料与资产', path: '/profile' },
  { key: 'rank', label: '排行榜', sub: '战绩与热度', path: '/rank' },
  { key: 'pet', label: '宠物中心', sub: '养成与能力', path: '/pet' },
  { key: 'shop', label: '黑市', sub: '道具与补给', path: '/shop' },
] as const;

export function MineMobilePage() {
  const navigate = useNavigate();
  const { onOpenAuth } = useHomeLayoutContext();
  const { openSettlementDrawer } = useSettlementLayout();
  const isAuthenticated = Boolean(getAuthToken());
  const settlement = useSettlementRecords();

  const pendingItems = useMemo(
    () => listSettlementCards(settlement, 'upcoming').slice(0, MAX_SETTLEMENT_CARDS),
    [settlement],
  );
  const pendingCount = settlement.pendingCount;

  const handleSettlementAction = useCallback(
    (record: SettlementRecordItem) => {
      if (!isAuthenticated) {
        onOpenAuth();
        return;
      }
      if (record.id.startsWith('open-') && record.marketId) {
        navigate(`/event-battle?market=${record.marketId}`);
        return;
      }
      navigate(settlementRecordToPath(record, record.status === 'pending' ? 'settle' : 'view'));
    },
    [isAuthenticated, navigate, onOpenAuth],
  );

  return (
    <div className={styles.root}>
      <div>
        <h1 className={styles.pageTitle}>我的</h1>
        <p className={styles.pageSub}>待结算事件与个人快捷入口</p>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>
            待结算事件
            {pendingCount > 0 ? (
              <span className={styles.badge} style={{ marginLeft: 8 }}>
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            ) : null}
          </h2>
          <button
            type="button"
            className={styles.panelAction}
            onClick={() => {
              if (!isAuthenticated) {
                onOpenAuth();
                return;
              }
              openSettlementDrawer();
            }}
          >
            全部 <IconFont name="icon_arrowright" />
          </button>
        </div>

        {!isAuthenticated ? (
          <div className={styles.emptyCard}>
            登录后查看你的待结算事件
            <button type="button" className={styles.loginBtn} onClick={onOpenAuth}>
              去登录
            </button>
          </div>
        ) : settlement.isLoading ? (
          <div className={styles.emptyCard}>加载中...</div>
        ) : pendingItems.length ? (
          <div className={styles.cardList}>
            {pendingItems.map((item) => (
              <HomeMobileSettlementEventCard
                key={item.record.id}
                item={item}
                onAction={handleSettlementAction}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyCard}>暂无待结算事件</div>
        )}
      </section>

      <section className={styles.quickGrid}>
        {QUICK_LINKS.map((link) => (
          <button
            key={link.key}
            type="button"
            className={styles.quickItem}
            onClick={() => navigate(link.path)}
          >
            <span className={styles.quickLabel}>{link.label}</span>
            <span className={styles.quickSub}>{link.sub}</span>
          </button>
        ))}
      </section>
    </div>
  );
}
