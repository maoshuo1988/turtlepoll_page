import React, { useMemo, useState } from 'react';
import type { PredictionCardItem } from '../../shared/predictions/ui/predictionCard';
import { useSidebarHotTags, useSidebarHotTopics, type SidebarHotTag, type SidebarHotTopic } from '@/components/shared/layout';

interface SidebarHotTopicsPanelProps {
  selectedTag: string | null;
  newsByMarketId: Map<number, PredictionCardItem>;
  onViewChange: (view: 'predictions' | 'forum' | 'jump' | 'battle' | 'pet' | 'lab' | 'shop' | 'rank' | 'profile' | 'inventory', topic?: SidebarHotTopic, tag?: SidebarHotTag) => void;
  onTabChange?: (tab: 'hot' | 'mine') => void;
}

function fmtHeat(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}w` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export const SidebarHotTopicsPanel: React.FC<SidebarHotTopicsPanelProps> = ({
  selectedTag,
  newsByMarketId,
  onViewChange,
  onTabChange,
}) => {
  const [tab, setTab] = useState<'mine' | 'hot'>('hot');
  const hotTopics = useSidebarHotTopics(newsByMarketId);
  const hotTags = useSidebarHotTags();
  const rankedTopics = useMemo(() => [...(hotTopics ?? [])].sort((a, b) => b.heat - a.heat), [hotTopics]);

  const heatBadge = (rank: number) => {
    if (rank <= 2) return { label: '热', cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/30' };
    if (rank <= 5) return { label: '新', cls: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-400/30' };
    return { label: '荐', cls: 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-white/8 dark:text-zinc-300 dark:border-white/10' };
  };

  return (
    <div className="h-[300px] rounded-xl border border-white/8 bg-[#0f1013] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.24)] dark:border-rdark-border dark:bg-rdark-card dark:shadow-none lg:h-[282px] lg:rounded-none lg:border-0 lg:border-b lg:border-white/8 lg:bg-transparent ">
      <div className=" flex items-center justify-between">
        <div>
          <div className="text-[14px] font-bold text-white dark:text-rdark-text">热点追踪</div>
          <div className=" text-[11px] text-zinc-500 dark:text-rdark-text2">跟进广场里正在发酵的话题</div>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-[#17181b] p-1 dark:bg-rdark-input">
          <button
            onClick={() => {
              setTab('hot');
              onTabChange?.('hot');
            }}
            className={`h-7 rounded-full  text-[11px] font-semibold transition-colors ${
              tab === 'hot'
                ? 'bg-[#101114] text-white shadow-sm dark:bg-rdark-card dark:text-rdark-text'
                : 'text-zinc-500 hover:text-zinc-200 dark:text-rdark-text2 dark:hover:text-rdark-text'
            }`}
          >
            最新
          </button>
          <button
            onClick={() => {
              setTab('mine');
              onTabChange?.('mine');
            }}
            className={`h-7 rounded-full  text-[11px] font-semibold transition-colors ${
              tab === 'mine'
                ? 'bg-[#101114] text-white shadow-sm dark:bg-rdark-card dark:text-rdark-text'
                : 'text-zinc-500 hover:text-zinc-200 dark:text-rdark-text2 dark:hover:text-rdark-text'
            }`}
          >
            话题
          </button>
        </div>
      </div>

      <div className=" hidden h-px bg-white/6 dark:bg-rdark-border lg:block" />

      <div className=" grid grid-cols-2 gap-1 rounded-lg border border-white/8 bg-[#151619] p-1 dark:bg-[#0c0e12] dark:border-slate-700/60 lg:hidden">
        <button
          onClick={() => {
            setTab('hot');
            onTabChange?.('hot');
          }}
          className={`h-7 rounded-md text-[12px] font-semibold transition-colors ${
            tab === 'hot'
              ? 'bg-[#0f1013] text-white shadow-sm dark:bg-slate-700/70 dark:text-white dark:shadow-none'
              : 'text-zinc-500 hover:text-zinc-300 dark:text-slate-400 dark:hover:text-slate-200'
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
              ? 'bg-[#0f1013] text-white shadow-sm dark:bg-slate-700/70 dark:text-white dark:shadow-none'
              : 'text-zinc-500 hover:text-zinc-300 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
           热门话题
        </button>
      </div>

      <div className="min-h-0 h-[calc(300px-96px)] overflow-y-auto overflow-x-hidden pr-1 lg:h-[calc(282px-70px)]">
      {tab === 'hot' ? (
        <div className="space-y-0.5">
          {rankedTopics.map((topic, i) => {
            const rank = i + 1;
            const badge = heatBadge(rank);
            return (
              <div
                key={topic.rank}
                className="group flex items-center gap-3 rounded-xl border border-transparent  transition-colors hover:border-white/8 hover:bg-[#15161a] dark:hover:border-rdark-border dark:hover:bg-rdark-input/70 lg:hover:border-transparent lg:hover:bg-transparent"
                onClick={() => onViewChange('predictions', topic)}
              >
                <span className={`w-5 text-center text-[16px] font-extrabold leading-none ${rank <= 3 ? 'text-orange-400' : 'text-slate-400 dark:text-rdark-text2'}`}>
                  {rank}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-zinc-200 transition-colors group-hover:text-white dark:text-slate-100 dark:group-hover:text-white">
                  {topic.title}
                </span>
                <span className="shrink-0 text-[11px] text-zinc-500 dark:text-rdark-text2">{fmtHeat(topic.heat)}</span>
                <span className={`hidden shrink-0 h-4 items-center rounded border  text-[9px] font-bold lg:inline-flex ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="grid gap-2">
            {hotTags.map((t) => (
              <button
                key={t.tag}
                onClick={() => onViewChange('predictions', undefined, t)}
                className={`w-full rounded-xl border  text-left text-[13px] font-medium truncate transition-all
                  ${selectedTag === t.tag
                    ? 'border-slate-300 bg-slate-100 text-slate-900 dark:border-rdark-border dark:bg-rdark-input dark:text-rdark-text'
                    : 'border-white/8 text-zinc-300 hover:border-white/12 hover:bg-[#15161a] hover:text-white dark:border-slate-600/70 dark:text-slate-300 dark:hover:border-rdark-border dark:hover:bg-rdark-input/70 dark:hover:text-slate-100'}
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
