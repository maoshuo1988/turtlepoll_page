import React from 'react';
import type { RankUser, HotTopic } from '../data/mock_data';

interface RankingsProps {
  users: RankUser[];
  topics: HotTopic[];
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];
const RANK_COLORS: Record<number, string> = { 1: '#f5a623', 2: '#9ca3af', 3: '#cd7c3e' };

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
            <div
              className="w-6 text-center font-extrabold text-sm"
              style={{ color: RANK_COLORS[u.rank] || (u.isMe ? '#0d9488' : '#9ca3af') }}
            >
              {u.rank <= 3 ? RANK_MEDALS[u.rank - 1] : u.rank}
            </div>

            <div className="w-[34px] h-[34px] rounded-full shrink-0 grid place-items-center text-[17px] bg-slate-100 dark:bg-rdark-input border-2 border-black/8 dark:border-rdark-border">
              {u.avatar}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold flex items-center gap-1.5 dark:text-rdark-text">
                {u.name}
                {u.isMe && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                    style={{
                      background: 'rgba(45,212,191,0.15)',
                      color: '#0d9488',
                      border: '1px solid rgba(45,212,191,0.3)',
                    }}
                  >
                    ME
                  </span>
                )}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-rdark-text2">
                {u.streak ? (
                  <span className="font-bold" style={{ color: '#ff4757' }}>🔥 {u.streak}连胜</span>
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
              className="text-xs font-bold whitespace-nowrap"
              style={{ color: t.isHot ? '#ff4757' : '#22c55e' }}
            >
              {t.isHot ? '🔥' : '↑'} {t.change}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
