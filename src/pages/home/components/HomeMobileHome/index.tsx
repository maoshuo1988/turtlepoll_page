/**
 * 文件说明：首页移动端整页（按设计稿实现，仅布局壳 lg 以下展示）。
 */
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from '@umijs/renderer-react';
import { getAuthToken } from '@/utils/authStorage';
import { useSettlementRecords } from '@/hooks/usePendingSettlements';
import type { SettlementRecordItem } from '@/hooks/settlementTypes';
import { useHomeLayoutContext } from '@/layouts/context';
import { useSettlementLayout } from '@/layouts/context/SettlementLayoutContext';
import { settlementRecordToPath } from '@/pages/settlement/settlementNavigation';
import { IconFont, type IconFontName } from '@/components/common/iconfont/IconFont';
import {
  countSettlementCards,
  listSettlementCards,
  resolveSettlementSectionMeta,
} from '../homeMobileSettlementModel';
import { HomeMobileSettlementEventCard } from '../HomeMobileSettlementEventCard';
import type { HomeMobileStatusFilter } from '../HomeMobileStatusFilters';
import styles from './index.module.scss';

type FeatureCard = {
  key: string;
  title: string;
  subtitle: string;
  path: string;
  icon: IconFontName;
};

type QuickLink = {
  key: string;
  label: string;
  path: string;
  icon: IconFontName;
};

const FEATURE_CARDS: FeatureCard[] = [
  { key: 'predictions', title: '暗盘', subtitle: '甄选潜力标的', path: '/dark-market', icon: 'icon_jiaoyi_anpanjiaoyi' },
  { key: 'rivalry', title: '开撕台', subtitle: '观点交锋热榜', path: '/rivalry', icon: 'sen018' },
  { key: 'battle-plaza', title: '地下钱庄', subtitle: '组队对战领奖', path: '/battle-plaza', icon: 'honglanduikangxunlian' },
  { key: 'games', title: '游戏', subtitle: '趣味玩法赚龟币', path: '/games', icon: 'youxi' },
];

const QUICK_LINKS: QuickLink[] = [
  { key: 'rank', label: '排行榜', path: '/rank', icon: 'xingyepaixing' },
  { key: 'shop', label: '黑市', path: '/shop', icon: 'myyingyong' },
  { key: 'pet', label: '宠物中心', path: '/pet', icon: 'wugui' },
  { key: 'team', label: '线报', path: '/forum', icon: 'xiaoxi' },
];

const FILTERS: Array<{ key: HomeMobileStatusFilter; label: string }> = [
  { key: 'hot', label: '全部' },
  { key: 'upcoming', label: '待结算' },
  { key: 'settled', label: '已结算' },
];

const MAX_SETTLEMENT_CARDS = 5;

export function HomeMobileHome() {
  const navigate = useNavigate();
  const { onOpenAuth } = useHomeLayoutContext();
  const { openSettlementDrawer } = useSettlementLayout();
  const isAuthenticated = Boolean(getAuthToken());
  const settlement = useSettlementRecords();
  const [statusFilter, setStatusFilter] = useState<HomeMobileStatusFilter>('hot');
  const [keyword, setKeyword] = useState('');
  const sectionMeta = resolveSettlementSectionMeta(statusFilter);
  const filterCount = useMemo(
    () => countSettlementCards(settlement, statusFilter),
    [settlement, statusFilter],
  );

  const filteredItems = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return listSettlementCards(settlement, statusFilter).filter((item) => {
      if (!q) return true;
      const haystack = `${item.record.title} ${item.record.subtitle} ${item.card?.title ?? ''} ${item.card?.summary ?? ''}`;
      return haystack.toLowerCase().includes(q);
    });
  }, [keyword, settlement, statusFilter]);

  const visibleItems = useMemo(
    () => filteredItems.slice(0, MAX_SETTLEMENT_CARDS),
    [filteredItems],
  );

  const handleSettlementAction = useCallback(
    (record: SettlementRecordItem) => {
      if (!isAuthenticated) {
        onOpenAuth();
        return;
      }
      if ((record.id.startsWith('open-') || record.id.startsWith('tear-')) && record.marketId) {
        navigate(`/event-battle?market=${record.marketId}`);
        return;
      }
      navigate(settlementRecordToPath(record, record.status === 'pending' ? 'settle' : 'view'));
    },
    [isAuthenticated, navigate, onOpenAuth],
  );

  const renderSettlementBody = () => {
    if (!isAuthenticated) {
      return <div className={styles.emptyCard}>登录后查看你的待结算事件</div>;
    }

    if (settlement.isLoading) {
      return <div className={styles.emptyCard}>加载结算数据中...</div>;
    }

    if (!filterCount) {
      return <div className={styles.emptyCard}>{sectionMeta.emptyText}</div>;
    }

    if (!visibleItems.length) {
      return <div className={styles.emptyCard}>未找到匹配的事件</div>;
    }

    return (
      <div className={styles.eventCardList}>
        {visibleItems.map((item) => (
          <HomeMobileSettlementEventCard
            key={item.record.id}
            item={item}
            onAction={handleSettlementAction}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={styles.root}>
      <section className={styles.featureGrid}>
        {FEATURE_CARDS.map((card) => (
          <button
            key={card.key}
            type="button"
            className={styles.featureCard}
            onClick={() => navigate(card.path)}
          >
            <span className={styles.featureArchGlow} aria-hidden />
            <span className={styles.featureIcon}>
              <IconFont name={card.icon} style={{ fontSize: 30 }} />
            </span>
            <span className={styles.featureTitle}>{card.title}</span>
            <span className={styles.featureSubtitle}>{card.subtitle}</span>
          </button>
        ))}
      </section>

      <section className={styles.quickRow}>
        {QUICK_LINKS.map((link) => (
          <button
            key={link.key}
            type="button"
            className={styles.quickItem}
            onClick={() => navigate(link.path)}
          >
            <span className={styles.quickIcon}>
              <IconFont name={link.icon} />
            </span>
            <span className={styles.quickLabel}>{link.label}</span>
          </button>
        ))}
      </section>

      <form
        className={styles.searchBar}
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <IconFont name="sousuo" className={styles.searchIcon} style={{ fontSize: 20 }} />
        <input
          type="search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="搜索事件、用户、话题或标的..."
          className={styles.searchInput}
          enterKeyHint="search"
        />
      </form>

      <section className={styles.feedPanel}>
        <div className={styles.filterRow}>
          {FILTERS.map((item) => {
            const active = statusFilter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={active ? styles.filterActive : styles.filterIdle}
                onClick={() => setStatusFilter(item.key)}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className={styles.settleSection}>
          <div className={styles.settleHead}>
            <div className={styles.settleTitleWrap}>
              <h2 className={styles.settleTitle}>{sectionMeta.title}</h2>
              {filterCount > 0 ? (
                <span className={styles.settleBadge}>{filterCount > 99 ? '99+' : filterCount}</span>
              ) : null}
            </div>
            <button
              type="button"
              className={styles.settleAll}
              onClick={() => {
                if (!isAuthenticated) {
                  onOpenAuth();
                  return;
                }
                openSettlementDrawer();
              }}
            >
              全部事件 <IconFont name="icon_arrowright" className={styles.settleAllIcon} />
            </button>
          </div>

          {renderSettlementBody()}
        </div>
      </section>

      <button type="button" className={styles.promoBanner} onClick={() => navigate('/battle-plaza')}>
        <img src="/mobile/home-s2-banner.png" alt="开战广场 S2" className={styles.promoImage} />
      </button>

      <button type="button" className={styles.aiDock} onClick={() => navigate('/pet')}>
        <span className={styles.aiAvatar}>
          <IconFont name="wugui" />
        </span>
        <span className={styles.aiText}>
          <span className={styles.aiTitle}>问问龟小智</span>
          <span className={styles.aiSub}>AI 帮你分析走势</span>
        </span>
        <IconFont name="icon_arrowright" className={styles.aiArrow} />
      </button>
    </div>
  );
}
