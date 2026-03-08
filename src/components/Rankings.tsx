import React from 'react';
import type { RankUser, HotTopic } from '../data/mock_data';

interface RankingsProps {
  users: RankUser[];
  topics: HotTopic[];
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];
const RANK_COLOR_CLASS: Record<number, string> = {
  1: 'text-amber-500',
  2: 'text-slate-400',
  3: 'text-amber-700 dark:text-amber-600',
};

export const Rankings: React.FC<RankingsProps> = ({ users, topics }) => {
  return (
    <>
      {/* Leaderboard card */}
      <div className="rounded-2xl p-[18px] bg-[#fffef9] dark:bg-rdark-card border border-black/8 dark:border-rdark-border shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
        <div className="text-[17px] font-bold flex items-center gap-1.5 mb-3.5 dark:text-rdark-text">
          🏆 龟币榜 <span className="text-[13px] font-normal text-gray-500 dark:text-rdark-text2">本周</span>
        </div>

        {users.map((u) => (
          <div
            key={u.rank}
            className="flex items-center gap-2.5 py-2 border-b border-black/8 dark:border-rdark-border last:border-b-0"
          >
            <div className="w-6 text-center font-extrabold text-sm">
              <span className={RANK_COLOR_CLASS[u.rank] || (u.isMe ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400')}>
                {u.rank <= 3 ? RANK_MEDALS[u.rank - 1] : u.rank}
              </span>
            </div>

            <div className="w-[34px] h-[34px] rounded-full shrink-0 grid place-items-center text-[17px] bg-slate-100 dark:bg-rdark-input border-2 border-black/8 dark:border-rdark-border">
              {u.avatar}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold flex items-center gap-1.5 dark:text-rdark-text">
                {u.name}
                {u.isMe && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/30">
                    ME
                  </span>
                )}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-rdark-text2">
                {u.streak ? (
                  <span className="font-bold text-rose-500">🔥 {u.streak}连胜</span>
                ) : (
                  <span>胜率 {(u.winRate * 100).toFixed(0)}%</span>
                )}
                {u.isMe && u.streak && (
                  <span className="text-gray-400 dark:text-rdark-text2"> · 胜率 {(u.winRate * 100).toFixed(0)}%</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 text-sm font-extrabold text-amber-700 dark:text-amber-400">
              🪙 {u.coins.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Trending topics card */}
      <div className="rounded-2xl p-[18px] bg-[#fffef9] dark:bg-rdark-card border border-black/8 dark:border-rdark-border shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
        <div className="text-[17px] font-bold flex items-center gap-1.5 mb-3 dark:text-rdark-text">
          📊 实时热榜
        </div>

        {topics.map((t) => (
          <div
            key={t.rank}
            className="flex items-center gap-2.5 py-2 cursor-pointer transition-opacity hover:opacity-75 border-b border-black/8 dark:border-rdark-border last:border-b-0"
          >
            <div className="text-[13px] font-extrabold text-gray-500 dark:text-rdark-text2 w-[18px]">{t.rank}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate dark:text-rdark-text">{t.title}</div>
              <div className="text-[11px] text-gray-500 dark:text-rdark-text2">{t.heat.toLocaleString()} 票</div>
            </div>
            <div
              className={`text-xs font-bold whitespace-nowrap ${t.isHot ? 'text-rose-500' : 'text-emerald-500'}`}
            >
              {t.isHot ? '🔥' : '↑'} {t.change}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
