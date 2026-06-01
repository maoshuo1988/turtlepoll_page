/**
 * 文件说明：Hero Prediction，预测市场和撕裂带页面组件。
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, MessageSquare } from 'lucide-react';
import type { PlaceBetResult } from '@/hooks/coinTypes';
import {
  normalizePredictionCardItem,
  usePredictionCardItems,
  type PredictionBetOption,
  type PredictionCardItem,
} from './predictionCards';
import { PredictionBetModal } from './PredictionBetModal';
import { PredictionCardCover } from './PredictionCardCover';
import { usePredictTagCategoryLabel } from './usePredictTagCategoryLabel';

interface HeroPredictionProps {
  news?: PredictionCardItem | null;
  selectedTag: string | null;
  onBetSuccess?: (item: PredictionCardItem, option: PredictionBetOption, result: PlaceBetResult) => void;
  onRequireAuth?: () => void;
  onEnterBattle?: (item: PredictionCardItem) => void;
}

function calcVotePercents(votes: PredictionCardItem['votes']) {
  const totalVotes = votes.A + votes.B + votes.C;
  if (totalVotes <= 0) {
    return { pctA: 34, pctC: 33, pctB: 33 };
  }
  const pctA = Math.round((votes.A / totalVotes) * 100);
  const pctC = Math.round((votes.C / totalVotes) * 100);
  const pctB = Math.max(0, 100 - pctA - pctC);
  return { pctA, pctC, pctB };
}

export const HeroPrediction: React.FC<HeroPredictionProps> = ({ news: newsOverride, selectedTag, onBetSuccess, onRequireAuth, onEnterBattle }) => {
  const { heroItem } = usePredictionCardItems(selectedTag);
  const categoryLabel = usePredictTagCategoryLabel(selectedTag);
  const rawNews = newsOverride ?? heroItem;
  const [betModalOption, setBetModalOption] = useState<PredictionBetOption | null>(null);

  if (!rawNews) return null;

  const news = normalizePredictionCardItem(rawNews);
  const showDrawBet = news.supportsDrawBet !== false;

  const { pctA, pctC, pctB } = calcVotePercents(news.votes);

  return (
    <>
    <div className="!my-1 legacy-hero-card legacy-pred-hero relative min-h-[420px] md:min-h-[500px] lg:min-h-[480px] rounded-[24px] md:rounded-xl border border-slate-700/70 bg-[#0a111f] dark:border-slate-700/60">
      <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
        <PredictionCardCover
          item={news}
          className="absolute inset-0"
          imageClassName="h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#091121]/95 via-[#0b1426]/82 to-[#0f1a2a]/35" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_88%,rgba(45,212,191,0.2),transparent_42%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_76%,rgba(249,115,22,0.15),transparent_26%)]" />
      </div>

      <div className="relative z-10 flex h-full flex-col !px-4 sm:!px-4 lg:!px-6 !py-4 sm:!py-4">
        <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#ffb45f]/18 bg-[#ffb45f]/8 px-2.5 py-1 text-[30px] sm:text-[34px] lg:text-[38px] font-black leading-none text-[#eab268]">
          <Flame size={15} className="text-[#ff9f43] sm:w-[18px] sm:h-[18px] lg:w-5 lg:h-5" />
          <span className="text-[15px] sm:text-[20px] lg:text-[24px] tracking-[-0.03em]">
            {categoryLabel ? `${categoryLabel} 热门预测` : '热门预测'}
          </span>
        </div>

        <h2 className="!mt-3.5 max-w-[760px] text-[21px] sm:text-[30px] lg:text-[36px] font-black leading-[1.12] lg:leading-[1.06] tracking-[-0.03em] text-white">
          {news.title}
        </h2>
        <p className="!mt-2.5 max-w-[760px] line-clamp-3 md:line-clamp-none pr-2 text-[13px] sm:text-[14px] lg:text-[16px] leading-[1.45] text-[#d6deea]/82">
          {news.summary}
        </p>

        <div className="mt-auto !pt-4">
          <div className="!p-3.5 sm:!p-3 lg:!p-4 max-w-[760px] rounded-[20px] border border-white/16 bg-[#071127]/28 shadow-[0_12px_34px_rgba(3,10,24,0.45)] backdrop-blur-md dark:bg-[#071127]/20">
            <div className="px-0.5">
            <div className={`!mb-2.5 grid gap-2 text-[14px] sm:text-[17px] lg:text-[20px] font-black leading-none tracking-[-0.03em] ${showDrawBet ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <span className="text-[#d9fff7] truncate">
                {news.optionA} <span className="text-[#40e7c7]">{pctA}%</span>
              </span>
              {showDrawBet ? (
                <span className="text-center text-[#f5e6b8] truncate">
                  {news.optionDraw} <span className="text-[#eab308]">{pctC}%</span>
                </span>
              ) : null}
              <span className="text-right text-[#ffb9c6] truncate">
                {news.optionB} <span className="text-[#d8e3f3]">{pctB}%</span>
              </span>
            </div>
            <div className="relative !mb-3.5 flex h-[7px] overflow-hidden rounded-full bg-[#2a3650]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pctA}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-[#2de4c3] to-[#31d6bd]"
              />
              {showDrawBet ? (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pctC}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.05 }}
                  className="h-full bg-gradient-to-r from-[#eab308] to-[#f59e0b]"
                />
              ) : null}
              <div
                className="h-full bg-gradient-to-l from-[#ff4f75] to-[#ff3d63]"
                style={{ width: `${showDrawBet ? pctB : 100 - pctA}%` }}
              />
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-2.5 ${showDrawBet ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setBetModalOption('A')}
              className="flex items-center justify-between sm:flex-col sm:justify-center h-[56px] sm:h-[72px] lg:h-[84px] rounded-[16px] border border-[#48ddc2]/58 bg-gradient-to-b from-[#2fdbbc]/42 to-[#1a7d75]/28 px-4 sm:px-3 py-2 text-left sm:text-center shadow-[0_0_20px_rgba(45,207,178,0.28),inset_0_0_0_1px_rgba(86,255,222,0.24)] transition-colors hover:from-[#39e8c8]/48 hover:to-[#1d8e84]/34"
            >
              <div className="text-[16px] sm:text-[18px] lg:text-[22px] font-black leading-none tracking-[-0.02em] text-[#dcfff8] truncate">{news.optionA}</div>
              <div className="!ml-3 sm:!ml-0 sm:!mt-1.5 text-[18px] sm:text-[20px] lg:text-[24px] font-black leading-none tracking-[-0.03em] text-[#2de4c3]">{`${news.oddsA.toFixed(1)}x`}</div>
            </motion.button>
            {showDrawBet ? (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setBetModalOption('C')}
                className="flex items-center justify-between sm:flex-col sm:justify-center h-[56px] sm:h-[72px] lg:h-[84px] rounded-[16px] border border-[#eab308]/45 bg-gradient-to-b from-[#ca8a04]/38 to-[#854d0e]/28 px-4 sm:px-3 py-2 text-left sm:text-center shadow-[0_0_18px_rgba(234,179,8,0.18),inset_0_0_0_1px_rgba(250,204,21,0.18)] transition-colors hover:from-[#eab308]/44 hover:to-[#92400e]/34"
              >
                <div className="text-[16px] sm:text-[18px] lg:text-[22px] font-black leading-none tracking-[-0.02em] text-[#fff6d6] truncate">{news.optionDraw}</div>
                <div className="!ml-3 sm:!ml-0 sm:!mt-1.5 text-[18px] sm:text-[20px] lg:text-[24px] font-black leading-none tracking-[-0.03em] text-[#facc15]">{`${news.oddsDraw.toFixed(1)}x`}</div>
              </motion.button>
            ) : null}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setBetModalOption('B')}
              className="flex items-center justify-between sm:flex-col sm:justify-center h-[56px] sm:h-[72px] lg:h-[84px] rounded-[16px] border border-[#a8b8d9]/28 bg-gradient-to-b from-[#A2343B]/42 to-[#894F4F]/28 px-4 sm:px-3 py-2 text-left sm:text-center shadow-[inset_0_0_0_1px_rgba(170,189,220,0.18)] transition-colors hover:from-[#34436a]/62 hover:to-[#273958]/55"
            >
              <div className="text-[16px] sm:text-[18px] lg:text-[22px] font-black leading-none tracking-[-0.02em] text-[#eef2fb] truncate">{news.optionB}</div>
              <div className="!ml-3 sm:!ml-0 sm:!mt-1.5 text-[18px] sm:text-[20px] lg:text-[24px] font-black leading-none tracking-[-0.02em] text-[#ff4f75]">{`${news.oddsB.toFixed(1)}x`}</div>
            </motion.button>
          </div>

          {onEnterBattle ? (
            <div className="relative !mt-3 sm:!mt-4">
              <button
                type="button"
                onClick={() => onEnterBattle(news)}
                className="flex h-[36px] sm:h-[38px] w-full items-center justify-center gap-2 rounded-full border border-[#4f6489]/45 bg-[#10273d]/20 text-[12px] sm:text-[13px] font-bold text-[#ffd7de] transition-colors hover:bg-[#163252]"
              >
                <MessageSquare size={14} className="text-[#5df3d7]" />
                进入撕裂带
              </button>
            </div>
          ) : null}
          </div>
        </div>
      </div>
    </div>
    <PredictionBetModal
      open={Boolean(betModalOption)}
      item={news}
      option={betModalOption}
      onClose={() => setBetModalOption(null)}
      onSuccess={onBetSuccess}
      onRequireAuth={onRequireAuth}
    />
    </>
  );
};
