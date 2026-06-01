/**
 * 文件说明：News Feed，预测市场和撕裂带页面组件。
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, MessageSquare, Trophy, Clock3, Lock, Coins } from 'lucide-react';
import type { PlaceBetResult } from '@/hooks/coinTypes';
import { normalizePredictionCardItem, usePredictionCardItems, type PredictionBetOption, type PredictionCardItem } from './predictionCards';
import { PredictionBetModal } from './PredictionBetModal';
import { PredictionCardCover } from './PredictionCardCover';
import { useRequestCoinSettle } from '@/hooks/useCoinRequests';
import { usePredictTagCategoryLabel } from './usePredictTagCategoryLabel';

interface NewsFeedProps {
  selectedTag: string | null;
  onBetSuccess?: (item: PredictionCardItem, option: PredictionBetOption, result: PlaceBetResult) => void;
  onRequireAuth?: () => void;
  onEnterBattle?: (item: PredictionCardItem) => void;
}

type CardStatusMeta = {
  badgeLabel: string;
  badgeClassName: string;
  hintLabel: string;
  hintClassName: string;
  panelClassName: string;
  stripeClassName: string;
  stateLabel: string;
  stateValueClassName: string;
};

function getCardStatusMeta(item: PredictionCardItem): CardStatusMeta {
  if (item.status === 'open') {
    return item.hasBet
      ? {
          badgeLabel: '已参与',
          badgeClassName: 'border-[#8fb8a5]/22 bg-[#8fb8a5]/10 text-[#c6ddd2]',
          hintLabel: '你已参与本场预测，可继续围观赔率变化',
          hintClassName: 'text-[#c6ddd2]',
          panelClassName: 'border-[#8fb8a5]/16 bg-[#8fb8a5]/[0.05]',
          stripeClassName: 'bg-[#8fb8a5]',
          stateLabel: '已下注',
          stateValueClassName: 'text-[#c6ddd2]',
        }
      : {
          badgeLabel: '开放下注',
          badgeClassName: 'border-[#8ea8c4]/22 bg-[#8ea8c4]/10 text-[#cad7e6]',
          hintLabel: '当前市场开放，你还未下注',
          hintClassName: 'text-[#cad7e6]',
          panelClassName: 'border-[#8ea8c4]/16 bg-[#8ea8c4]/[0.05]',
          stripeClassName: 'bg-[#8ea8c4]',
          stateLabel: '未下注',
          stateValueClassName: 'text-[#cad7e6]',
        };
  }

  if (item.status === 'closed') {
    return {
      badgeLabel: '封盘中',
      badgeClassName: 'border-[#bfa57f]/22 bg-[#bfa57f]/10 text-[#dec9ad]',
      hintLabel: item.hasBet ? '你已下注，等待赛果出炉' : '已停止下注，等待最终结果',
      hintClassName: 'text-[#dec9ad]',
      panelClassName: 'border-[#bfa57f]/16 bg-[#bfa57f]/[0.05]',
      stripeClassName: 'bg-[#bfa57f]',
      stateLabel: '封闭',
      stateValueClassName: 'text-[#dec9ad]',
    };
  }

  if (item.hasBet && item.betSettleResult === 'WIN') {
    return {
      badgeLabel: '已结算',
      badgeClassName: 'border-[#8fb8a5]/22 bg-[#8fb8a5]/10 text-[#c6ddd2]',
      hintLabel: '本场已赢，收益已结算到账',
      hintClassName: 'text-[#c6ddd2]',
      panelClassName: 'border-[#8fb8a5]/16 bg-[#8fb8a5]/[0.05]',
      stripeClassName: 'bg-[#8fb8a5]',
      stateLabel: '已结算',
      stateValueClassName: 'text-[#c6ddd2]',
    };
  }

  if (item.hasBet && item.betSettleResult === 'LOSE') {
    return {
      badgeLabel: '已结算',
      badgeClassName: 'border-[#bd8f97]/22 bg-[#bd8f97]/10 text-[#e0c5ca]',
      hintLabel: '本场已结算，结果未命中',
      hintClassName: 'text-[#e0c5ca]',
      panelClassName: 'border-[#bd8f97]/16 bg-[#bd8f97]/[0.05]',
      stripeClassName: 'bg-[#bd8f97]',
      stateLabel: '已结算',
      stateValueClassName: 'text-[#e0c5ca]',
    };
  }

  if (item.hasBet) {
    return {
      badgeLabel: '待结算',
      badgeClassName: 'border-[#c4ad86]/22 bg-[#c4ad86]/10 text-[#e3d3ba]',
      hintLabel: '赛果已出，可立即结算我的下注',
      hintClassName: 'text-[#e3d3ba]',
      panelClassName: 'border-[#c4ad86]/16 bg-[#c4ad86]/[0.05]',
      stripeClassName: 'bg-[#c4ad86]',
      stateLabel: '等待结算',
      stateValueClassName: 'text-[#e3d3ba]',
    };
  }

  return {
    badgeLabel: '未参与',
    badgeClassName: 'border-white/12 bg-white/6 text-white/70',
    hintLabel: '本场预测已结束，可查看最终结果',
    hintClassName: 'text-white/64',
    panelClassName: 'border-white/10 bg-white/[0.04]',
    stripeClassName: 'bg-white/30',
    stateLabel: '未下注',
    stateValueClassName: 'text-white/72',
  };
}

function getPrimaryAction(item: PredictionCardItem) {
  if (item.status === 'open') {
    return { label: '立即下注', disabled: false };
  }
  if (item.status === 'closed') {
    return { label: '等待结果', disabled: true };
  }
  if (item.hasBet && !item.betSettleResult) {
    return { label: '立即结算', disabled: false };
  }
  if (item.hasBet && item.betSettleResult === 'WIN') {
    return { label: '已结算 · 胜', disabled: true };
  }
  if (item.hasBet && item.betSettleResult === 'LOSE') {
    return { label: '已结算 · 负', disabled: true };
  }
  return { label: '赛果已出', disabled: true };
}

const NewsCard: React.FC<{ item: PredictionCardItem; index: number; onBetSuccess?: NewsFeedProps['onBetSuccess']; onRequireAuth?: NewsFeedProps['onRequireAuth']; onEnterBattle?: NewsFeedProps['onEnterBattle'] }> = ({
  item,
  index,
  onBetSuccess,
  onRequireAuth,
  onEnterBattle,
}) => {
  const [betModalOption, setBetModalOption] = useState<PredictionBetOption | null>(null);
  const coinSettleMutation = useRequestCoinSettle();
  const card = normalizePredictionCardItem(item);
  const showDrawBet = card.supportsDrawBet !== false;
  const totalVotes = card.votes.A + card.votes.B + card.votes.C;
  const pctANum = totalVotes > 0 ? Math.round((card.votes.A / totalVotes) * 100) : (showDrawBet ? 34 : 50);
  const pctCNum = showDrawBet ? (totalVotes > 0 ? Math.round((card.votes.C / totalVotes) * 100) : 33) : 0;
  const pctBNum = showDrawBet ? Math.max(0, 100 - pctANum - pctCNum) : 100 - pctANum;
  const statusMeta = getCardStatusMeta(card);
  const primaryAction = getPrimaryAction(card);
  const canOpenBet = card.status === 'open';
  const canSettle = card.status === 'settled' && card.hasBet && !card.betSettleResult;

  const handlePrimaryAction = async () => {
    if (canOpenBet) {
      setBetModalOption('A');
      return;
    }

    if (canSettle) {
      try {
        await coinSettleMutation.mutateAsync({ marketId: card.marketId });
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08, duration: 0.3 }}
        className="legacy-news-card legacy-pred-card group overflow-hidden rounded-[22px] md:rounded-[18px] border border-[#243149] bg-[#0b1220] shadow-[0_16px_36px_rgba(3,8,19,0.38)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(3,8,19,0.48)]"
      >
        <div className="legacy-pred-card-media relative h-[168px] md:h-[180px] overflow-hidden">
          <PredictionCardCover
            item={card}
            className="absolute inset-0"
            imageClassName="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/5 to-black/0" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09111e] via-[#09111e]/58 to-transparent" />

          <div className="absolute left-3 right-3 top-3 flex items-center justify-end gap-2">
            <div className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.badgeClassName}`}>
              {card.status === 'open' ? <Coins size={11} /> : card.status === 'closed' ? <Lock size={11} /> : card.betSettleResult === 'WIN' ? <Trophy size={11} /> : <Clock3 size={11} />}
              {statusMeta.badgeLabel}
            </div>
          </div>

          <div className="absolute inset-x-3 bottom-3">
            <h3 className="mb-1 line-clamp-2 text-[18px] md:text-[22px] font-black leading-[1.08] md:leading-[1.02] tracking-[-0.03em] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
              {card.title}
            </h3>
            <p className="line-clamp-1 text-[13px] leading-[1.25] text-white/72 drop-shadow-[0_1px_4px_rgba(0,0,0,0.38)]">
              {card.summary}
            </p>
          </div>
        </div>

        <div className="legacy-pred-card-body border-t border-white/6 bg-[#0a101b] px-3.5 py-3.5 md:px-3 md:py-3">
          <div className="mb-3 flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between text-[11px] font-semibold">
            <div className="flex items-center gap-1 text-[#43ddc1]">
              <ShieldCheck size={12} />
              路边社事实核查已通过
            </div>
            <div className={statusMeta.hintClassName}>{statusMeta.hintLabel}</div>
          </div>

          <div className="mb-3.5">
            <div className={`mb-1.5 grid gap-1 text-[11px] font-bold leading-none ${showDrawBet ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <span className="truncate text-[#57efd2]">{card.optionA} {pctANum}%</span>
              {showDrawBet ? (
                <span className="truncate text-center text-[#facc15]">{card.optionDraw} {pctCNum}%</span>
              ) : null}
              <span className="truncate text-right text-white/74">{card.optionB} {pctBNum}%</span>
            </div>
            <div className="relative flex h-[4px] overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-l-full bg-gradient-to-r from-[#1dbfd0] via-[#27d8cf] to-[#38f0d1]"
                style={{ width: `${pctANum}%` }}
              />
              {showDrawBet ? (
                <div
                  className="h-full bg-gradient-to-r from-[#eab308] to-[#f59e0b]"
                  style={{ width: `${pctCNum}%` }}
                />
              ) : null}
              <div
                className="h-full rounded-r-full bg-gradient-to-l from-[#ff4f75] to-[#ff3d63]"
                style={{ width: `${showDrawBet ? pctBNum : 100 - pctANum}%` }}
              />
            </div>
          </div>

          <div className={`mb-3.5 overflow-hidden rounded-[18px] border ${statusMeta.panelClassName}`}>
            <div className={`h-[3px] w-full ${statusMeta.stripeClassName}`} />
            <div className="px-3 py-3">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-white/38">
                <span>当前状态</span>
                <span>{card.status.toUpperCase()}</span>
              </div>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div className={`text-[14px] font-black ${statusMeta.stateValueClassName}`}>{statusMeta.stateLabel}</div>
                <div className="max-w-[58%] text-right text-[12px] md:text-[13px] font-semibold leading-5 text-white/84">
                  {card.hasBet ? '你已参与本场预测' : '你还未参与本场预测'}
                </div>
              </div>
              {card.hasBet && card.betSettleResult && (
                <div className={`mt-1 text-[12px] font-bold ${card.betSettleResult === 'WIN' ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {card.betSettleResult === 'WIN' ? '结算结果：已获胜' : '结算结果：未命中'}
                </div>
              )}
              {card.hasBet && card.status === 'settled' && !card.betSettleResult && (
                <div className="mt-1 text-[12px] font-bold text-[#f1c27d]">结算结果已生成，等待你手动结算</div>
              )}
            </div>
          </div>

          <div className={`legacy-pred-card-actions grid grid-cols-1 gap-2.5 ${showDrawBet ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            <button
              onClick={() => setBetModalOption('A')}
              disabled={!canOpenBet}
              className="legacy-pred-card-btn legacy-pred-card-btn-a flex h-[40px] md:h-[34px] items-center justify-between sm:justify-center rounded-full border border-[#0fe2d2]/12 bg-[#102536] px-4 sm:px-3 text-left sm:text-center text-[14px] md:text-[15px] font-black leading-none tracking-[-0.03em] text-[#40ead0] transition-colors hover:bg-[#123045] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <span className="truncate">{card.optionA}</span>
              <span className="ml-1.5 shrink-0 text-white/82">{`${card.oddsA.toFixed(1)}x`}</span>
            </button>
            {showDrawBet ? (
              <button
                onClick={() => setBetModalOption('C')}
                disabled={!canOpenBet}
                className="legacy-pred-card-btn legacy-pred-card-btn-c flex h-[40px] md:h-[34px] items-center justify-between sm:justify-center rounded-full border border-[#eab308]/18 bg-[#2a220f] px-4 sm:px-3 text-left sm:text-center text-[14px] md:text-[15px] font-black leading-none tracking-[-0.03em] text-[#facc15] transition-colors hover:bg-[#3a2d12] disabled:cursor-not-allowed disabled:opacity-35"
              >
                <span className="truncate">{card.optionDraw}</span>
                <span className="ml-1.5 shrink-0 text-white/72">{`${card.oddsDraw.toFixed(1)}x`}</span>
              </button>
            ) : null}
            <button
              onClick={() => setBetModalOption('B')}
              disabled={!canOpenBet}
              className="legacy-pred-card-btn legacy-pred-card-btn-b flex h-[40px] md:h-[34px] items-center justify-between sm:justify-center rounded-full border border-white/8 bg-white/6 px-4 sm:px-3 text-left sm:text-center text-[14px] md:text-[15px] font-black leading-none tracking-[-0.03em] text-white/82 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <span className="truncate">{card.optionB}</span>
              <span className="ml-1.5 shrink-0 text-white/56">{`${card.oddsB.toFixed(1)}x`}</span>
            </button>
          </div>

          <div
            className={
              card.status === 'open'
                ? 'legacy-pred-card-foot mt-2.5 flex justify-end items-center gap-2.5'
                : 'legacy-pred-card-foot mt-2.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5'
            }
          >
            {card.status !== 'open' ? (
              <button
                type="button"
                onClick={() => void handlePrimaryAction()}
                disabled={primaryAction.disabled || coinSettleMutation.isLoading}
                className="flex h-[32px] md:h-[28px] min-w-0 items-center justify-center rounded-full border border-[#5d5245] bg-[#181716] px-3 text-[11px] font-semibold text-[#ecd0a7] transition hover:border-[#8a7457] hover:bg-[#211f1d] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {coinSettleMutation.isLoading ? '处理中...' : primaryAction.label}
              </button>
            ) : null}
            {onEnterBattle && (
              <button
                onClick={() => onEnterBattle(card)}
                className="legacy-pred-card-enter flex h-[28px] md:h-[24px] items-center justify-center gap-1 rounded-full px-2 text-[11px] font-medium whitespace-nowrap text-white/44 transition-colors hover:text-white/66"
              >
                <MessageSquare size={11} className="text-white/38" />
                撕裂带
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <PredictionBetModal
        open={canOpenBet && Boolean(betModalOption)}
        item={card}
        option={betModalOption}
        onClose={() => setBetModalOption(null)}
        onSuccess={onBetSuccess}
        onRequireAuth={onRequireAuth}
      />
    </>
  );
};

export const NewsFeed: React.FC<NewsFeedProps> = ({ selectedTag, onBetSuccess, onRequireAuth, onEnterBattle }) => {
  const { feedItems: displayItems } = usePredictionCardItems(selectedTag);
  const categoryLabel = usePredictTagCategoryLabel(selectedTag);
  return (
    <div className="legacy-news-feed legacy-pred-feed">
      <h2 className="legacy-pred-feed-title !mb-4 flex items-center gap-2 px-1.5 md:px-1 text-base font-bold text-slate-700 dark:text-rdark-text">
        <span className="legacy-pred-feed-title-bar h-5 w-1 rounded-full bg-gradient-to-b from-blue-500 to-cyan-400" />
        {categoryLabel ? `${categoryLabel} 相关预测` : '最新爆料'}
      </h2>
      <div className="legacy-pred-feed-grid grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {displayItems.map((item, i) => (
          <NewsCard key={item.id} item={item} index={i} onBetSuccess={onBetSuccess} onRequireAuth={onRequireAuth} onEnterBattle={onEnterBattle} />
        ))}
      </div>
    </div>
  );
};
