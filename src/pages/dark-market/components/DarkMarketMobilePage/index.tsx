/**
 * 文件说明：暗盘移动端列表卡片（设计稿样式，数据由页面入口注入）。
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { IconFont } from '@/components/common/iconfont/IconFont';
import { PredictionBetModal } from '@/pages/home/components/PredictionBetModal';
import {
  normalizePredictionCardItem,
  type PredictionBetOption,
  type PredictionCardItem,
} from '@/pages/home/components/predictionCards';
import type { PlaceBetResult } from '@/hooks/coinTypes';
import { resolveAssetUrl } from '@/utils/assetUrl';
import styles from './index.module.scss';

export interface DarkMarketMobilePageProps {
  items: PredictionCardItem[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  onEnterBattle: (item: PredictionCardItem) => void;
  onRequireAuth?: () => void;
  onBetSuccess?: (item: PredictionCardItem, option: PredictionBetOption, result: PlaceBetResult) => void;
}

function resolveHeat(card: PredictionCardItem) {
  return card.votes.A + card.votes.B + (card.votes.C ?? 0);
}

function resolveHighOdds(card: PredictionCardItem) {
  return Math.max(card.oddsA, card.oddsB, card.oddsDraw ?? 0, 0);
}

function resolveStatusLabel(card: PredictionCardItem) {
  if (card.hasBet) return '已下注';
  if (card.status === 'closed') return '封盘中';
  if (card.status === 'settled') return '已结算';
  return '未下注';
}

function TeamFlag({
  image,
  color,
  label,
}: {
  image?: string;
  color?: string;
  label: string;
}) {
  const resolvedImage = image?.trim() ? resolveAssetUrl(image) : '';
  const [broken, setBroken] = useState(false);
  const fallbackStyle: CSSProperties = { backgroundColor: color || '#1a2030' };

  useEffect(() => {
    setBroken(false);
  }, [resolvedImage]);

  if (resolvedImage && !broken) {
    return (
      <img
        src={resolvedImage}
        alt=""
        className={styles.flag}
        draggable={false}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span className={styles.flagFallback} style={fallbackStyle} aria-hidden>
      {label.slice(0, 1)}
    </span>
  );
}

function DarkMarketMobileCard({
  item,
  onEnterBattle,
  onOpenBet,
}: {
  item: PredictionCardItem;
  onEnterBattle: (item: PredictionCardItem) => void;
  onOpenBet: (item: PredictionCardItem, option: PredictionBetOption) => void;
}) {
  const card = normalizePredictionCardItem(item);
  const showDrawBet = card.supportsDrawBet !== false && (card.oddsDraw ?? 0) > 0;
  const totalVotes = card.votes.A + card.votes.B + card.votes.C;
  const pctA = totalVotes > 0 ? Math.round((card.votes.A / totalVotes) * 100) : showDrawBet ? 34 : 50;
  const pctC = showDrawBet ? (totalVotes > 0 ? Math.round((card.votes.C / totalVotes) * 100) : 33) : 0;
  const pctB = showDrawBet ? Math.max(0, 100 - pctA - pctC) : Math.max(0, 100 - pctA);
  const canOpenBet = card.status === 'open';
  const heat = resolveHeat(card);
  const highOdds = resolveHighOdds(card);

  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.matchTitle}>
          <div className={styles.teamGroup}>
            <TeamFlag image={card.sideABgImage} color={card.sideABgColor} label={card.optionA} />
            <span className={styles.teamName}>{card.optionA}</span>
          </div>
          <span className={styles.teamVs}>vs</span>
          <div className={styles.teamGroup}>
            <TeamFlag image={card.sideBBgImage} color={card.sideBBgColor} label={card.optionB} />
            <span className={styles.teamName}>{card.optionB}</span>
          </div>
        </div>
        {canOpenBet ? (
          <button type="button" className={styles.openBadge} onClick={() => onOpenBet(card, 'A')}>
            开放下注
            <IconFont name="icon_arrowright" className={styles.openBadgeIcon} />
          </button>
        ) : null}
      </div>

      <div className={styles.statPanel}>
        <div className={styles.statGrid}>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>热度</div>
            <div className={`${styles.statValue} ${styles.statHeat}`}>{heat}</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>高赔</div>
            <div className={`${styles.statValue} ${styles.statOdds}`}>{highOdds.toFixed(1)}x</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>状态</div>
            <div className={`${styles.statValue} ${styles.statStatus}`}>{resolveStatusLabel(card)}</div>
          </div>
        </div>
      </div>

      <div
        className={`${styles.probLabels} ${showDrawBet ? styles.probLabelsThree : styles.probLabelsTwo}`}
      >
        <span className={styles.probA}>
          {card.optionA} 胜 {pctA}%
        </span>
        {showDrawBet ? (
          <span className={styles.probC}>
            {card.optionDraw} {pctC}%
          </span>
        ) : null}
        <span className={styles.probB}>
          {card.optionB} 胜 {pctB}%
        </span>
      </div>

      <div className={styles.probTrack}>
        <div className={styles.probSegA} style={{ width: `${pctA}%` }} />
        {showDrawBet ? <div className={styles.probSegC} style={{ width: `${pctC}%` }} /> : null}
        <div className={styles.probSegB} style={{ width: `${showDrawBet ? pctB : 100 - pctA}%` }} />
      </div>

      <div className={`${styles.betRow} ${showDrawBet ? styles.betRowThree : styles.betRowTwo}`}>
        <button
          type="button"
          className={`${styles.betBtn} ${styles.betBtnA}`}
          disabled={!canOpenBet}
          onClick={() => onOpenBet(card, 'A')}
        >
          <span className={styles.betOptionA}>{card.optionA}胜</span>
          <span className={styles.betOdds}>{card.oddsA.toFixed(1)}x</span>
        </button>
        {showDrawBet ? (
          <button
            type="button"
            className={`${styles.betBtn} ${styles.betBtnC}`}
            disabled={!canOpenBet}
            onClick={() => onOpenBet(card, 'C')}
          >
            <span className={styles.betOptionC}>{card.optionDraw}</span>
            <span className={styles.betOdds}>{(card.oddsDraw ?? 0).toFixed(1)}x</span>
          </button>
        ) : null}
        <button
          type="button"
          className={`${styles.betBtn} ${styles.betBtnB}`}
          disabled={!canOpenBet}
          onClick={() => onOpenBet(card, 'B')}
        >
          <span className={styles.betOptionB}>{card.optionB}胜</span>
          <span className={styles.betOdds}>{card.oddsB.toFixed(1)}x</span>
        </button>
      </div>

      <div className={styles.cardFoot}>
        <button type="button" className={styles.tearLink} onClick={() => onEnterBattle(card)}>
          <IconFont name="xiaoxi" className={styles.tearIcon} />
          撕裂带
        </button>
      </div>
    </article>
  );
}

export function DarkMarketMobilePage({
  items,
  isLoading = false,
  isLoadingMore = false,
  onEnterBattle,
  onRequireAuth,
  onBetSuccess,
}: DarkMarketMobilePageProps) {
  const [betItem, setBetItem] = useState<PredictionCardItem | null>(null);
  const [betOption, setBetOption] = useState<PredictionBetOption | null>(null);

  const sortedItems = useMemo(
    () => items.map((item) => normalizePredictionCardItem(item)),
    [items],
  );

  const handleOpenBet = (item: PredictionCardItem, option: PredictionBetOption) => {
    if (item.status !== 'open') return;
    setBetItem(item);
    setBetOption(option);
  };

  if (isLoading) {
    return <div className={styles.loadingCard}>加载暗盘数据中...</div>;
  }

  if (!sortedItems.length) {
    return <div className={styles.emptyCard}>暂无暗盘数据</div>;
  }

  return (
    <>
      <div className={styles.root}>
        {sortedItems.map((item) => (
          <DarkMarketMobileCard
            key={item.id}
            item={item}
            onEnterBattle={onEnterBattle}
            onOpenBet={handleOpenBet}
          />
        ))}
        {isLoadingMore ? <div className={styles.loadingMore}>加载更多...</div> : null}
      </div>

      <PredictionBetModal
        open={Boolean(betItem && betOption)}
        item={betItem}
        option={betOption}
        onClose={() => {
          setBetItem(null);
          setBetOption(null);
        }}
        onRequireAuth={onRequireAuth}
        onSuccess={(item, option, result) => {
          onBetSuccess?.(item, option, result);
          setBetItem(null);
          setBetOption(null);
        }}
      />
    </>
  );
}
