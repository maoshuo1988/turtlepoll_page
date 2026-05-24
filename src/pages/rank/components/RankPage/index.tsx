/**
 * 文件说明：Rank Page，排行榜页面组件。
 */
import React from 'react';
import { Flame } from 'lucide-react';
import { mockRankUsers } from '@/data/mockData';
import styles from './index.module.scss';

function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}

const medalColor: Record<number, string> = {
  1: 'text-amber-500',
  2: 'text-slate-400',
  3: 'text-amber-700 dark:text-amber-500',
};

export const RankPage: React.FC = () => {
  const rankList = [...mockRankUsers].sort((a, b) => a.rank - b.rank);
  const me = rankList.find((u) => u.isMe);

  return (
    <section className="grid gap-4">
      <div className={css("page-card hidden overflow-hidden md:block")}>
        {rankList.map((u) => (
          <div
            key={`${u.rank}-${u.name}`}
            className={`flex items-center gap-3 border-b border-slate-100 px-5 py-3 last:border-b-0 dark:border-rdark-border/70 ${
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

      <div className="grid gap-3 md:hidden">
        {rankList.map((u) => (
          <article
            key={`${u.rank}-${u.name}-mobile`}
            className={css(`page-card p-4 ${u.isMe ? 'border-emerald-400/30 bg-emerald-500/10' : ''}`)}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 text-center text-[18px] font-black ${medalColor[u.rank] ?? 'text-slate-500 dark:text-rdark-text2'}`}>
                #{u.rank}
              </div>
              <div className="text-[24px]">{u.avatar}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-bold text-slate-800 dark:text-rdark-text">{u.name}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-rdark-text2">胜率 {(u.winRate * 100).toFixed(0)}%</div>
              </div>
              <div className="text-right text-[14px] font-extrabold text-emerald-600 dark:text-emerald-400">
                {u.coins.toLocaleString()} 🪙
              </div>
            </div>
            {u.streak ? (
              <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-orange-400/20 bg-orange-500/10 px-2.5 py-1 text-[12px] font-bold text-orange-400">
                <Flame size={12} /> {u.streak} 连胜
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {me && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800/60 dark:bg-emerald-900/10">
          <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            我的排名：第 {me.rank} 名 · {me.coins.toLocaleString()} 🪙
          </div>
        </div>
      )}
    </section>
  );
};
