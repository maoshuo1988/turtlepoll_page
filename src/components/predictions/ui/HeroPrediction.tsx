import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, MessageSquare, Users } from 'lucide-react';
import type { PlaceBetResult } from '@/hook/coinType';
import { usePredictionCardItems, type PredictionCardItem } from './predictionCard';
import { PredictionBetModal } from './PredictionBetModal';

interface HeroPredictionProps {
  news?: PredictionCardItem | null;
  selectedTag: string | null;
  onBetSuccess?: (item: PredictionCardItem, option: 'A' | 'B', result: PlaceBetResult) => void;
  onRequireAuth?: () => void;
  onEnterBattle?: (newsId: string) => void;
}

export const HeroPrediction: React.FC<HeroPredictionProps> = ({ news: newsOverride, selectedTag, onBetSuccess, onRequireAuth, onEnterBattle }) => {
  const { heroItem } = usePredictionCardItems(selectedTag);
  const news = newsOverride ?? heroItem;
  const [betModalOption, setBetModalOption] = useState<'A' | 'B' | null>(null);

  if (!news) return null;

  const totalVotes = news.votes.A + news.votes.B;
  const pctANum = totalVotes > 0 ? Math.round((news.votes.A / totalVotes) * 100) : 50;
  const pctBNum = 100 - pctANum;

  return (
    <>
    <div className="!my-3 md:!my-4 legacy-hero-card legacy-pred-hero relative h-[520px] sm:h-[500px] lg:h-[420px] overflow-hidden rounded-xl border border-slate-700/70 bg-[#0a111f] dark:border-slate-700/60">
      <img src={news.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#091121]/95 via-[#0b1426]/82 to-[#0f1a2a]/35" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_88%,rgba(45,212,191,0.2),transparent_42%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_76%,rgba(249,115,22,0.15),transparent_26%)]" />

      <div className="relative z-10 flex h-full flex-col !px-3 sm:!px-4 lg:!px-6 !py-3 sm:!py-4">
        <div className="inline-flex w-fit items-center gap-1.5 text-[30px] sm:text-[34px] lg:text-[38px] font-black leading-none text-[#eab268]">
          <Flame size={16} className="text-[#ff9f43] sm:w-[18px] sm:h-[18px] lg:w-5 lg:h-5" />
          <span className="text-[18px] sm:text-[20px] lg:text-[24px] tracking-[-0.03em]">{selectedTag ? `${selectedTag} 热门预测` : '热门预测'}</span>
        </div>

        <h2 className="!mt-2.5 sm:!mt-3 lg:!mt-4 max-w-[760px] text-[24px] sm:text-[30px] lg:text-[36px] font-black leading-[1.08] lg:leading-[1.06] tracking-[-0.03em] text-white">
          {news.title}
        </h2>
        <p className="!mt-2 sm:!mt-2.5 lg:!mt-3 max-w-[760px] text-[13px] sm:text-[14px] lg:text-[16px] leading-[1.35] text-[#d6deea]/82">
          {news.summary}
        </p>

        <div className="!mt-2.5 sm:!mt-3 !p-2.5 sm:!p-3 lg:!p-4 max-w-[760px] rounded-[14px] border border-white/16 bg-[#071127]/20 p-2 shadow-[0_12px_34px_rgba(3,10,24,0.45)] backdrop-blur-md dark:bg-[#071127]/20">
          <div className="px-1">
            <div className="!mb-2 flex items-end justify-between text-[18px] sm:text-[20px] lg:text-[24px] font-black leading-none tracking-[-0.03em]">
              <span className="text-[#d9fff7]">
                YES <span className="text-[#40e7c7]">{pctANum}%</span>
              </span>
              <span className="text-[#ffb9c6]">
                {pctBNum}% <span className="text-[#d8e3f3]">NO</span>
              </span>
            </div>
            <div className="relative !mb-4 h-[8px] overflow-hidden rounded-full bg-[#2a3650]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pctANum}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#2de4c3] to-[#31d6bd]"
              />
              <div
                className="absolute right-0 top-0 h-full bg-gradient-to-l from-[#ff4f75] to-[#ff3d63]"
                style={{ width: `${pctBNum}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setBetModalOption('A')}
              className="flex items-center justify-center h-[64px] sm:h-[72px] lg:h-[84px] rounded-[14px] border border-[#48ddc2]/58 bg-gradient-to-b from-[#2fdbbc]/42 to-[#1a7d75]/28 px-3 sm:px-4 py-2 text-center shadow-[0_0_20px_rgba(45,207,178,0.28),inset_0_0_0_1px_rgba(86,255,222,0.24)] transition-colors hover:from-[#39e8c8]/48 hover:to-[#1d8e84]/34"
            >
              <div className="text-[18px] sm:text-[20px] lg:text-[24px] font-black leading-none tracking-[-0.02em] text-[#dcfff8]">{news.optionA}</div>
              <div className="!ml-3 sm:!ml-4 text-[18px] sm:text-[20px] lg:text-[24px] font-black leading-none tracking-[-0.03em] text-[#2de4c3]">{`${news.oddsA.toFixed(1)}x`}</div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setBetModalOption('B')}
              className="flex items-center justify-center h-[64px] sm:h-[72px] lg:h-[84px] rounded-[14px] border border-[#a8b8d9]/28 bg-gradient-to-b bg-gradient-to-b from-[#A2343B]/42 to-[#894F4F]/28 px-3 sm:px-4 py-2 text-center shadow-[inset_0_0_0_1px_rgba(170,189,220,0.18)] transition-colors hover:from-[#34436a]/62 hover:to-[#273958]/55"
            >
              <div className="text-[18px] sm:text-[20px] lg:text-[24px] font-black leading-none tracking-[-0.02em] text-[#eef2fb]">{news.optionB}</div>
              <div className="!ml-3 sm:!ml-4 text-[18px] sm:text-[20px] lg:text-[24px] font-black leading-none tracking-[-0.02em] text-[#ff4f75]">{`${news.oddsB.toFixed(1)}x`}</div>
            </motion.button>
          </div>

          <div className="relative !mt-3 sm:!mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div className="hidden sm:block pointer-events-none absolute left-1/2 top-1/2 h-6 w-px -translate-x-1/2 -translate-y-1/2 bg-[#3e4f73]" />
            <div className="flex h-[34px] sm:h-[38px] items-center justify-center gap-2 rounded-full border border-[#3ad9be]/30 bg-[#10273d]/20 text-[12px] sm:text-[13px] font-bold text-[#d2e0f3]">
              <Users size={14} className="text-[#7decd6]" />
              {totalVotes.toLocaleString()} 人参与
            </div>
            {onEnterBattle ? (
              <button
                onClick={() => onEnterBattle(news.id)}
                className="flex h-[34px] sm:h-[38px] items-center justify-center gap-2 rounded-full border border-[#4f6489]/45 bg-[#10273d]/20 text-[12px] sm:text-[13px] font-bold text-[#ffd7de] transition-colors hover:bg-[#163252]"
              >
                <MessageSquare size={14} className="text-[#5df3d7]" />
                进入评论战场
              </button>
            ) : (
              <div className="hidden md:block" />
            )}
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
