import React, { useMemo, useState } from 'react';
import type { HotTag, HotTopic } from '../../../data/mock_data';
import { mockHotTags, mockHotTopics } from '../../../data/mock_data';

interface SidebarHotTopicsPanelProps {
  selectedTag: string | null;
  onTopicClick?: (topic: HotTopic) => void;
  onFallbackTopicClick: () => void;
  onTagClick: (tag: HotTag) => void;
  onTabChange?: (tab: 'hot' | 'mine') => void;
}

function fmtHeat(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}w` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export const SidebarHotTopicsPanel: React.FC<SidebarHotTopicsPanelProps> = ({
  selectedTag,
  onTopicClick,
  onFallbackTopicClick,
  onTagClick,
  onTabChange,
}) => {
  const [tab, setTab] = useState<'mine' | 'hot'>('hot');
  const rankedTopics = useMemo(() => [...mockHotTopics].sort((a, b) => b.heat - a.heat), []);

  const heatBadge = (rank: number) => {
    if (rank <= 2) return { label: '热', cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/30' };
    if (rank <= 5) return { label: '新', cls: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-400/30' };
    return { label: '荐', cls: 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-400/30' };
  };

  return (
    <div className="xl:!mb-4 !p-2.5 md:!p-3 h-[300px] md:h-[328px] rounded-xl bg-white dark:bg-[#101319] border border-slate-200 dark:border-slate-700/70 shadow-[0_4px_14px_rgba(15,23,42,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
      <div className="mb-2 rounded-lg bg-slate-100 dark:bg-[#0c0e12] border border-slate-200 dark:border-slate-700/60 p-1 grid grid-cols-2 gap-1">
        <button
          onClick={() => {
            setTab('hot');
            onTabChange?.('hot');
          }}
          className={`h-7 rounded-md text-[12px] font-semibold transition-colors ${
            tab === 'hot'
              ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700/70 dark:text-white dark:shadow-none'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
         最新热点
        </button>
        <button
          onClick={() => {
            setTab('mine');
            onTabChange?.('mine');
          }}
          className={`h-7 rounded-md text-[12px] font-semibold transition-colors ${
            tab === 'mine'
              ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700/70 dark:text-white dark:shadow-none'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
           热门话题
        </button>
      </div>

      <div className="min-h-0 h-[calc(300px-52px)] md:h-[calc(300px-56px)] overflow-y-auto overflow-x-hidden pr-1">
      {tab === 'hot' ? (
        <div className="space-y-0.5">
          {rankedTopics.map((topic, i) => {
            const rank = i + 1;
            const badge = heatBadge(rank);
            return (
              <div
                key={topic.rank}
                className="group flex items-center gap-3 !px-1.5 !py-1 rounded-md cursor-pointer border border-transparent hover:border-sky-300/50 hover:bg-[linear-gradient(100deg,rgba(60,142,255,0.14),rgba(16,29,61,0.12))] transition-colors"
                onClick={() => (onTopicClick ? onTopicClick(topic) : onFallbackTopicClick())}
              >
                <span className={`w-4 text-center text-[16px] font-extrabold leading-none ${rank <= 3 ? 'text-orange-400' : 'text-amber-500'}`}>
                  {rank}
                </span>
                <span className="flex-1 min-w-0 truncate text-[14px] md:text-[16px] text-slate-700 group-hover:text-slate-900 dark:text-slate-100 dark:group-hover:text-white">
                  {topic.title}
                </span>
                <span className="text-[12px] text-slate-500 dark:text-slate-400 shrink-0">{fmtHeat(topic.heat)}</span>
                <span className={`shrink-0 px-1.5 h-4 inline-flex items-center rounded text-[9px] font-bold border ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="!m-2 gap-1.5">
            {mockHotTags.map((t) => (
              <button
                key={t.tag}
                onClick={() => onTagClick(t)}
                className={`w-full !my-1 !p-2 rounded-md text-[13px] md:text-[16px] font-medium cursor-pointer transition-all border text-left truncate 
                  ${selectedTag === t.tag
                    ? 'bg-[linear-gradient(100deg,rgba(60,142,255,0.14),rgba(16,29,61,0.12))] text-slate-900 border-sky-300/50 font-semibold dark:text-slate-100'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-sky-300/50 hover:bg-[linear-gradient(100deg,rgba(60,142,255,0.14),rgba(16,29,61,0.12))] hover:text-slate-900 dark:bg-slate-800/35 dark:text-slate-300 dark:border-slate-600/70 dark:hover:text-slate-100'}
                    ` }
              >
                {t.tag}
              </button>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
