import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Users, MessageSquare } from 'lucide-react';
import type { PlaceBetResult } from '@/hook/coinType';
import { usePredictionCardItems, type PredictionCardItem } from './predictionCard';
import { PredictionBetModal } from './PredictionBetModal';

interface NewsFeedProps {
  selectedTag: string | null;
  onBetSuccess?: (item: PredictionCardItem, option: 'A' | 'B', result: PlaceBetResult) => void;
  onRequireAuth?: () => void;
  onEnterBattle?: (newsId: string) => void;
}


const NewsCard: React.FC<{ item: PredictionCardItem; index: number; onBetSuccess?: NewsFeedProps['onBetSuccess']; onRequireAuth?: NewsFeedProps['onRequireAuth']; onEnterBattle?: NewsFeedProps['onEnterBattle'] }> = ({
  item,
  index,
  onBetSuccess,
  onRequireAuth,
  onEnterBattle,
}) => {
  const [betModalOption, setBetModalOption] = useState<'A' | 'B' | null>(null);
  const totalVotes = item.votes.A + item.votes.B;
  const pctANum = totalVotes > 0 ? Math.round((item.votes.A / totalVotes) * 100) : 50;
  const pctBNum = 100 - pctANum;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08, duration: 0.3 }}
        className="legacy-news-card legacy-pred-card group overflow-hidden rounded-[18px] border border-[#243149] bg-[#0b1220] shadow-[0_16px_36px_rgba(3,8,19,0.38)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(3,8,19,0.48)]"
      >
        <div className="legacy-pred-card-media relative h-[180px] overflow-hidden">
          <img
            src={item.image}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/5 to-black/0" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09111e] via-[#09111e]/58 to-transparent" />

          <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[11px] text-white/65">
              <Users size={12} />
              {totalVotes.toLocaleString()} 参与
            </div>
          </div>

          <div className="absolute inset-x-3 bottom-3">
            <h3 className="mb-1 line-clamp-2 text-[22px] font-black leading-[1.02] tracking-[-0.03em] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
              {item.title}
            </h3>
            <p className="line-clamp-1 text-[13px] leading-[1.25] text-white/72 drop-shadow-[0_1px_4px_rgba(0,0,0,0.38)]">
              {item.summary}
            </p>
          </div>
        </div>

        <div className="legacy-pred-card-body border-t border-white/6 bg-[#0a101b] px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold">
            <div className="flex items-center gap-1 text-[#43ddc1]">
              <ShieldCheck size={12} />
              路边社事实核查已通过
            </div>
            <div className="text-white/44">{item.optionB} {pctBNum}%</div>
          </div>

          <div className="mb-2.5">
            <div className="mb-1 flex items-center justify-between text-[12px] font-bold leading-none">
              <span className="text-[#57efd2]">{item.optionA} {pctANum}%</span>
              <span className="text-white/74">{item.optionB} {pctBNum}%</span>
            </div>
            <div className="relative h-[4px] overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[#1dbfd0] via-[#27d8cf] to-[#38f0d1]"
                style={{ width: `${pctANum}%` }}
              />
            </div>
          </div>

          <div className="legacy-pred-card-actions grid grid-cols-2 gap-2">
            <button
              onClick={() => setBetModalOption('A')}
              className="legacy-pred-card-btn legacy-pred-card-btn-a flex h-[34px] items-center justify-center rounded-full border border-[#0fe2d2]/12 bg-[#102536] px-3 text-center text-[16px] font-black leading-none tracking-[-0.03em] text-[#40ead0] transition-colors hover:bg-[#123045]"
            >
              <span>{item.optionA}</span>
              <span className="ml-1.5 text-white/82">{`${item.oddsA.toFixed(1)}x`}</span>
            </button>
            <button
              onClick={() => setBetModalOption('B')}
              className="legacy-pred-card-btn legacy-pred-card-btn-b flex h-[34px] items-center justify-center rounded-full border border-white/8 bg-white/6 px-3 text-center text-[16px] font-black leading-none tracking-[-0.03em] text-white/82 transition-colors hover:bg-white/10"
            >
              <span>{item.optionB}</span>
              <span className="ml-1.5 text-white/56">{`${item.oddsB.toFixed(1)}x`}</span>
            </button>
          </div>

          <div className="legacy-pred-card-foot mt-2 flex items-center justify-end">
            {onEnterBattle && (
              <button
                onClick={() => onEnterBattle(item.id)}
                className="legacy-pred-card-enter flex h-[24px] items-center justify-center gap-1 rounded-full px-1 text-[11px] font-medium text-white/44 transition-colors hover:text-white/66"
              >
                <MessageSquare size={11} className="text-white/38" />
                评论战场
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <PredictionBetModal
        open={Boolean(betModalOption)}
        item={item}
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
  return (
    <div className="legacy-news-feed legacy-pred-feed">
      <h2 className="legacy-pred-feed-title !mb-4 flex items-center gap-2 text-base font-bold text-slate-700 dark:text-rdark-text">
        <span className="legacy-pred-feed-title-bar h-5 w-1 rounded-full bg-gradient-to-b from-blue-500 to-cyan-400" />
        {selectedTag ? `${selectedTag} 相关预测` : '最新爆料'}
      </h2>
      <div className="legacy-pred-feed-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {displayItems.map((item, i) => (
          <NewsCard key={item.id} item={item} index={i} onBetSuccess={onBetSuccess} onRequireAuth={onRequireAuth} onEnterBattle={onEnterBattle} />
        ))}
      </div>
    </div>
  );
};
