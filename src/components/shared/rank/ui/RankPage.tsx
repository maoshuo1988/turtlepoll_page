/**
 * 文件说明：Rank Page，排行榜相关共享组件。
 */
import React from 'react';
import { Trophy, Flame } from 'lucide-react';
import { mockRankUsers } from '@/data/mockData';

const medalColor: Record<number, string> = {
  1: 'text-amber-500',
  2: 'text-slate-400',
  3: 'text-amber-700 dark:text-amber-500',
};

export const RankPage: React.FC = () => {
  const rankList = [...mockRankUsers].sort((a, b) => a.rank - b.rank);
  const me = rankList.find((u) => u.isMe);

  return (
    <section className="!mt-4 view-shell view-rhythm w-full max-w-none mx-0 grid gap-4">
      <div className="!p-4 rounded-2xl border border-slate-200 dark:border-rdark-border bg-white dark:bg-rdark-card p-5 shadow-[0_6px_22px_rgba(15,23,42,0.08)] dark:shadow-none">
        <div className="flex items-center gap-2 text-slate-800 dark:text-rdark-text">
          <Trophy size={20} className="text-amber-500" />
          <h2 className="text-[20px] font-extrabold">排行榜</h2>
        </div>
        <p className="!mt-1 text-sm text-slate-500 dark:text-rdark-text2">按总龟币与胜率综合排序</p>
      </div>

      <div className="!p-4 rounded-2xl border border-slate-200 dark:border-rdark-border bg-white dark:bg-rdark-card overflow-hidden">
        {rankList.map((u) => (
          <div
            key={`${u.rank}-${u.name}`}
            className={`flex items-center gap-3 !px-5 !py-3 border-b border-slate-100 dark:border-rdark-border/70 last:border-b-0 ${
              u.isMe ? 'bg-emerald-50/60 dark:bg-emerald-900/10' : ''
            }`}
          >
            <div className={`w-8 text-center text-[16px] font-black ${medalColor[u.rank] ?? 'text-slate-500 dark:text-rdark-text2'}`}>
              #{u.rank}
            </div>
            <div className="text-[20px]">{u.avatar}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold text-slate-800 dark:text-rdark-text truncate">{u.name}</div>
              <div className="text-xs text-slate-500 dark:text-rdark-text2">胜率 {(u.winRate * 100).toFixed(0)}%</div>
            </div>
            {u.streak ? (
              <div className="hidden sm:flex items-center gap-1 text-[12px] font-bold text-orange-500">
                <Flame size={12} /> {u.streak} 连胜
              </div>
            ) : (
              <div className="hidden sm:block w-[72px]" />
            )}
            <div className="text-[14px] font-extrabold text-emerald-600 dark:text-emerald-400">{u.coins.toLocaleString()} 🪙</div>
          </div>
        ))}
      </div>

      {me && (
        <div className="!p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-900/10 p-4">
          <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            我的排名：第 {me.rank} 名 · {me.coins.toLocaleString()} 🪙
          </div>
        </div>
      )}
    </section>
  );
};
