import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Users, MessageSquare } from 'lucide-react';
import { TYPE_LABELS, TYPE_COLORS } from '../../../data/mock_data';
import type { NewsItem } from '../../../data/mock_data';

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
  const pctANum = totalVotes > 0 ? Math.round((item.votes.A / totalVotes) * 100) : 50;
  const pctBNum = 100 - pctANum;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="legacy-news-card legacy-pred-card group overflow-hidden rounded-2xl border border-slate-300/70 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.14)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.2)] dark:border-white/10 dark:bg-[#070f1f] dark:shadow-[0_14px_30px_rgba(0,0,0,0.4)]"
    >
      <div className="legacy-pred-card-media relative h-[190px] overflow-hidden">
        <img
          src={item.image}
          alt=""
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#061124]/95 via-[#0a1830]/66 to-transparent" />
        <div className='absolute top-1 left-1 !px-4 w-full flex items-center justify-between'>
          <div className={`!px-2 !py-0.5 legacy-pred-card-tag rounded-md  text-[12px] font-semibold ${TYPE_COLORS[item.type]}`}>
            {TYPE_LABELS[item.type]}
          </div>
          <div className="legacy-pred-card-check flex items-center gap-1.5 text-[10px] text-emerald-500 font-medium">
            <ShieldCheck size={12} />
            路边社事实核查已通过
          </div>

        </div>
      </div>

      <div className="legacy-pred-card-body relative !p-4 !-mt-1 bg-gradient-to-b from-[#081428]/95 to-[#07101f] p-3 dark:from-[#081428]/95 dark:to-[#07101f]">
        <div className="legacy-pred-card-tags !mb-2 flex items-center gap-2">
          <span className="legacy-pred-card-votes flex items-center gap-1 text-[14px] text-slate-300/75">
            <Users size={14} />
            {totalVotes.toLocaleString()} 参与
          </span>
        </div>

        <h3 className="legacy-pred-card-title !mb-1 line-clamp-2 text-[24px] font-black leading-[1.05] tracking-[-0.02em] text-white">
          {item.title}
        </h3>
        <p className="legacy-pred-card-summary !mb-2 line-clamp-1 text-[14px] leading-[1.35] text-[#c7d5ea]/80">
          {item.summary}
        </p>

        <div className="legacy-pred-card-progress !mb-4">
          <div className="legacy-pred-card-progress-row !mb-2 flex items-center justify-between text-[16px] font-black leading-none tracking-[-0.02em]">
            <span className="text-[#dbfff7]">
              {item.optionA} <span className="text-[#3ce3c5]">{pctANum}%</span>
            </span>
            <span className="text-[#ffc8d2]">
              {pctBNum}% <span className="text-[#d8e3f3]">{item.optionB}</span>
            </span>
          </div>
          <div className="legacy-pred-card-progress-track relative flex h-[7px] overflow-hidden rounded-full bg-[#273651]">
            <div
              className="legacy-pred-card-progress-fill h-full rounded-full bg-gradient-to-r from-[#2de4c3] to-[#31d6bd] transition-all duration-500"
              style={{ width: `${pctANum}%` }}
            />
            <div className="absolute right-0 top-0 h-full bg-gradient-to-l from-[#ff4f75] to-[#ff3d63]" style={{ width: `${pctBNum}%` }} />
          </div>
        </div>

        <div className="legacy-pred-card-actions mb-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => onBet(item.id, 'A', item.oddsA)}
            className="legacy-pred-card-btn legacy-pred-card-btn-a h-[58px] rounded-[12px] border border-[#48ddc2]/58 bg-gradient-to-b from-[#2fdbbc]/42 to-[#1a7d75]/28 px-3 text-center text-[16px] font-black leading-none tracking-[-0.02em] text-[#dcfff8] shadow-[0_0_16px_rgba(45,207,178,0.26),inset_0_0_0_1px_rgba(86,255,222,0.2)] transition-colors hover:from-[#39e8c8]/48 hover:to-[#1d8e84]/34"
          >
            {item.optionA} <span className="text-white">{item.oddsA.toFixed(1)}x</span>
          </button>
          <button
            onClick={() => onBet(item.id, 'B', item.oddsB)}
            className="legacy-pred-card-btn legacy-pred-card-btn-b h-[58px] rounded-[12px] border border-[#a8b8d9]/28 bg-gradient-to-b from-[#2b3657]/58 to-[#212f4a]/48 px-3 text-center text-[16px] font-black leading-none tracking-[-0.02em] text-[#eef2fb] shadow-[inset_0_0_0_1px_rgba(170,189,220,0.18)] transition-colors hover:from-[#34436a]/62 hover:to-[#273958]/55"
          >
            {item.optionB} <span className="text-white">{item.oddsB.toFixed(1)}x</span>
          </button>
        </div>

        <div className="legacy-pred-card-foot !mt-4 relative grid grid-cols-1 gap-2">

          {onEnterBattle && (
            <button
              onClick={() => onEnterBattle(item.id)}
              className="legacy-pred-card-enter flex h-[36px] items-center justify-center gap-1 rounded-full border border-[#4f6489]/45 bg-[#10273d]/86 px-2 text-[12px] font-bold text-[#ffd7de] transition-colors hover:bg-[#163252]"
            >
              <MessageSquare size={12} className="text-[#5df3d7]" />
              进入评论战场
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const NewsFeed: React.FC<NewsFeedProps> = ({ items, onBet, onEnterBattle }) => {
  return (
    <div className="legacy-news-feed legacy-pred-feed">
      <h2 className="legacy-pred-feed-title !mb-4 flex items-center gap-2 text-base font-bold text-slate-700 dark:text-rdark-text">
        <span className="legacy-pred-feed-title-bar h-5 w-1 rounded-full bg-gradient-to-b from-blue-500 to-cyan-400" />
        最新爆料
      </h2>
      <div className="legacy-pred-feed-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item, i) => (
          <NewsCard key={item.id} item={item} index={i} onBet={onBet} onEnterBattle={onEnterBattle} />
        ))}
      </div>
    </div>
  );
};
