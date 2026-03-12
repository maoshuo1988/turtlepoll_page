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
    <div className="h-[300px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-rdark-border dark:bg-rdark-card dark:shadow-none xl:h-[282px] xl:rounded-none xl:border-0 xl:border-b xl:border-slate-200 xl:bg-transparent xl:px-0 xl:pb-4 xl:pt-0">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[14px] font-bold text-slate-900 dark:text-rdark-text">热点追踪</div>
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-rdark-text2">跟进广场里正在发酵的话题</div>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1 dark:bg-rdark-input">
          <button
            onClick={() => {
              setTab('hot');
              onTabChange?.('hot');
            }}
            className={`h-7 rounded-full px-3 text-[11px] font-semibold transition-colors ${
              tab === 'hot'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-rdark-card dark:text-rdark-text'
                : 'text-slate-500 hover:text-slate-800 dark:text-rdark-text2 dark:hover:text-rdark-text'
            }`}
          >
            最新
          </button>
          <button
            onClick={() => {
              setTab('mine');
              onTabChange?.('mine');
            }}
            className={`h-7 rounded-full px-3 text-[11px] font-semibold transition-colors ${
              tab === 'mine'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-rdark-card dark:text-rdark-text'
                : 'text-slate-500 hover:text-slate-800 dark:text-rdark-text2 dark:hover:text-rdark-text'
            }`}
          >
            话题
          </button>
        </div>
      </div>

      <div className="mb-3 hidden h-px bg-slate-200 dark:bg-rdark-border xl:block" />

      <div className="mb-2 rounded-lg bg-slate-100 dark:bg-[#0c0e12] border border-slate-200 dark:border-slate-700/60 p-1 grid grid-cols-2 gap-1 xl:hidden">
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

      <div className="min-h-0 h-[calc(300px-96px)] overflow-y-auto overflow-x-hidden pr-1 xl:h-[calc(282px-70px)]">
      {tab === 'hot' ? (
        <div className="space-y-0.5">
          {rankedTopics.map((topic, i) => {
            const rank = i + 1;
            const badge = heatBadge(rank);
            return (
              <div
                key={topic.rank}
                className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-slate-200 hover:bg-slate-50 dark:hover:border-rdark-border dark:hover:bg-rdark-input/70 xl:px-0 xl:py-2 xl:hover:border-transparent xl:hover:bg-transparent"
                onClick={() => (onTopicClick ? onTopicClick(topic) : onFallbackTopicClick())}
              >
                <span className={`w-5 text-center text-[16px] font-extrabold leading-none ${rank <= 3 ? 'text-orange-400' : 'text-slate-400 dark:text-rdark-text2'}`}>
                  {rank}
                </span>
                <span className="flex-1 min-w-0 truncate text-[14px] font-medium text-slate-700 group-hover:text-slate-900 dark:text-slate-100 dark:group-hover:text-white">
                  {topic.title}
                </span>
                <span className="shrink-0 text-[11px] text-slate-400 dark:text-rdark-text2">{fmtHeat(topic.heat)}</span>
                <span className={`hidden shrink-0 h-4 items-center rounded border px-1.5 text-[9px] font-bold xl:inline-flex ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="grid gap-2">
            {mockHotTags.map((t) => (
              <button
                key={t.tag}
                onClick={() => onTagClick(t)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-[13px] font-medium truncate transition-all
                  ${selectedTag === t.tag
                    ? 'border-slate-300 bg-slate-100 text-slate-900 dark:border-rdark-border dark:bg-rdark-input dark:text-rdark-text'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-600/70 dark:text-slate-300 dark:hover:border-rdark-border dark:hover:bg-rdark-input/70 dark:hover:text-slate-100'}
                `}
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
