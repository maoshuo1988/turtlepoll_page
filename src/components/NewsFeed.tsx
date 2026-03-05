import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Users, MessageSquare } from 'lucide-react';
import { TYPE_LABELS, TYPE_COLORS } from '../data/mock_data';
import type { NewsItem } from '../data/mock_data';

interface NewsFeedProps {
  items: NewsItem[];
  onBet: (newsId: string, option: 'A' | 'B', odds: number) => void;
  onEnterBattle?: (newsId: string) => void;
}


const NewsCard: React.FC<{ item: NewsItem; index: number; onBet: NewsFeedProps['onBet']; onEnterBattle?: NewsFeedProps['onEnterBattle'] }> = ({
  item,
  index,
  onBet,
  onEnterBattle,
}) => {
  const totalVotes = item.votes.A + item.votes.B;
  const pctA = totalVotes > 0 ? ((item.votes.A / totalVotes) * 100).toFixed(0) : '50';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="group rounded-2xl bg-white dark:bg-rdark-card border border-slate-100 dark:border-rdark-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden"
    >
      {/* Image */}
      <div className="h-36 overflow-hidden relative">
        <img
          src={item.image}
          alt=""
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      <div className="p-4">
        {/* Tags */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${TYPE_COLORS[item.type]}`}>
            {TYPE_LABELS[item.type]}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-rdark-text2">
            <Users size={10} />
            {totalVotes.toLocaleString()} 参与
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm text-slate-800 dark:text-rdark-text leading-snug mb-2 line-clamp-2">
          {item.title}
        </h3>
        <p className="text-xs text-slate-400 dark:text-rdark-text2 leading-relaxed mb-3 line-clamp-2">
          {item.summary}
        </p>

        {/* Mini progress */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-slate-400 dark:text-rdark-text2 mb-1">
            <span>{item.optionA} {pctA}%</span>
            <span>{item.optionB} {100 - Number(pctA)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-rdark-border overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${pctA}%` }}
            />
          </div>
        </div>

        {/* Bet buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => onBet(item.id, 'A', item.oddsA)}
            className="flex-1 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold text-sm transition-colors cursor-pointer border-0"
          >
            {item.optionA} <span className="text-blue-400 dark:text-blue-300 font-medium">{item.oddsA}x</span>
          </button>
          <button
            onClick={() => onBet(item.id, 'B', item.oddsB)}
            className="flex-1 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-rdark-input dark:hover:bg-rdark-hover text-slate-600 dark:text-rdark-text font-bold text-sm transition-colors cursor-pointer border-0"
          >
            {item.optionB} <span className="text-slate-400 dark:text-rdark-text2 font-medium">{item.oddsB}x</span>
          </button>
        </div>

        {/* Fact check badge + battle entry */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-medium">
            <ShieldCheck size={12} />
            路边社事实核查已通过
          </div>
          {onEnterBattle && (
            <button
              onClick={() => onEnterBattle(item.id)}
              className="flex items-center gap-1 text-[10px] font-medium text-slate-400 dark:text-rdark-text2 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors border-0 bg-transparent cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/15"
            >
              <MessageSquare size={10} />
              评论战场
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const NewsFeed: React.FC<NewsFeedProps> = ({ items, onBet, onEnterBattle }) => {
  return (
    <div>
      <h2 className="text-base font-bold text-slate-700 dark:text-rdark-text mb-4 flex items-center gap-2">
        <span className="w-1 h-5 bg-gradient-to-b from-blue-500 to-cyan-400 rounded-full" />
        最新爆料
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((item, i) => (
          <NewsCard key={item.id} item={item} index={i} onBet={onBet} onEnterBattle={onEnterBattle} />
        ))}
      </div>
    </div>
  );
};
