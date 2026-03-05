import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Users, Clock, MessageSquare } from 'lucide-react';
import type { NewsItem } from '../data/mock_data';

interface HeroPredictionProps {
  news: NewsItem;
  onBet: (newsId: string, option: 'A' | 'B', odds: number) => void;
  onEnterBattle?: (newsId: string) => void;
}

export const HeroPrediction: React.FC<HeroPredictionProps> = ({ news, onBet, onEnterBattle }) => {
  const totalVotes = news.votes.A + news.votes.B;
  const pctA = totalVotes > 0 ? ((news.votes.A / totalVotes) * 100).toFixed(0) : '50';

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-xl shadow-blue-900/20 min-h-[440px] flex">
      {/* Background image */}
      <img
        src={news.image}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/75 to-slate-900/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

      <div className="relative p-6 md:p-8 flex flex-col justify-end flex-1">
        {/* Top badges */}
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center gap-1 bg-red-500/30 text-red-300 text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
            <Zap size={11} />
            热门预测
          </span>
          <span className="flex items-center gap-1 bg-white/15 text-white/70 text-[11px] font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
            <Users size={11} />
            {totalVotes.toLocaleString()} 人参与
          </span>
          <span className="flex items-center gap-1 bg-white/15 text-white/70 text-[11px] font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
            <Clock size={11} />
            进行中
          </span>
        </div>

        {/* Title */}
        <h2 className="text-xl md:text-2xl font-bold text-white leading-snug mb-2 drop-shadow-lg">
          {news.title}
        </h2>
        <p className="text-sm text-white/60 leading-relaxed mb-6 max-w-xl drop-shadow">
          {news.summary}
        </p>

        {/* Voting progress bar */}
        <div className="mb-5 max-w-lg">
          <div className="flex justify-between text-xs text-white/50 mb-1.5">
            <span>{news.optionA} ({pctA}%)</span>
            <span>{news.optionB} ({100 - Number(pctA)}%)</span>
          </div>
          <div className="h-2 rounded-full bg-white/15 overflow-hidden flex">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 to-teal-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pctA}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Bet buttons */}
        <div className="flex gap-3 max-w-md">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onBet(news.id, 'A', news.oddsA)}
            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold text-base shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-shadow cursor-pointer border-0"
          >
            <div className="text-white/70 text-xs font-medium mb-0.5">{news.optionA}</div>
            <div className="text-lg">{news.oddsA.toFixed(1)}x</div>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onBet(news.id, 'B', news.oddsB)}
            className="flex-1 py-3.5 rounded-2xl bg-white/15 backdrop-blur-sm text-white font-bold text-base border border-white/20 hover:bg-white/25 transition-colors cursor-pointer"
          >
            <div className="text-white/50 text-xs font-medium mb-0.5">{news.optionB}</div>
            <div className="text-lg">{news.oddsB.toFixed(1)}x</div>
          </motion.button>
        </div>

        {/* Enter comment battle */}
        {onEnterBattle && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onEnterBattle(news.id)}
            className="mt-3 max-w-md flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm text-white/80 hover:text-white hover:bg-white/20 text-sm font-medium border border-white/15 transition-colors cursor-pointer"
          >
            <MessageSquare size={14} />
            进入评论战场 ⚔️
          </motion.button>
        )}
      </div>
    </div>
  );
};
