import React, { useMemo, useState } from 'react';
import type { ViewType } from '@/components/layout';
import type { PredictionCardItem } from '@/components/shared/predictions/ui/predictionCard';
import { useSidebarHotTags, useSidebarHotTopics, type SidebarHotTag, type SidebarHotTopic } from '@/components/shared/layout';

interface MobileHotTopicsPanelProps {
  selectedTag: string | null;
  newsByMarketId: Map<number, PredictionCardItem>;
  onViewChange: (view: ViewType, topic?: SidebarHotTopic, tag?: SidebarHotTag | null) => void;
}

function formatHeat(value: number): string {
  return value >= 10000 ? `${(value / 10000).toFixed(1)}w` : value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
}

export const MobileHotTopicsPanel: React.FC<MobileHotTopicsPanelProps> = ({
  selectedTag,
  newsByMarketId,
  onViewChange,
}) => {
  const [tab, setTab] = useState<'hot' | 'tags'>('hot');
  const hotTopics = useSidebarHotTopics(newsByMarketId);
  const hotTags = useSidebarHotTags();
  const rankedTopics = useMemo(() => [...(hotTopics ?? [])].sort((a, b) => b.heat - a.heat), [hotTopics]);

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/8 bg-[#0f1013] p-3 shadow-[0_18px_44px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[14px] font-bold text-white">热点追踪</div>
          <div className="mt-0.5 text-[11px] text-zinc-500">手机端独立维护，不影响侧边栏</div>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-[#17181b] p-1">
          <button
            type="button"
            onClick={() => setTab('hot')}
            className={`h-7 rounded-full px-3 text-[11px] font-semibold transition-colors ${
              tab === 'hot' ? 'bg-[#101114] text-white' : 'text-zinc-500'
            }`}
          >
            最新
          </button>
          <button
            type="button"
            onClick={() => setTab('tags')}
            className={`h-7 rounded-full px-3 text-[11px] font-semibold transition-colors ${
              tab === 'tags' ? 'bg-[#101114] text-white' : 'text-zinc-500'
            }`}
          >
            标签
          </button>
        </div>
      </div>

      {tab === 'hot' ? (
        <div className="mt-3 space-y-2">
          {rankedTopics.map((topic, index) => (
            <button
              key={`${topic.rank}-${topic.title}`}
              type="button"
              onClick={() => onViewChange('predictions', topic)}
              className="flex w-full items-center gap-3 rounded-[20px] border border-white/8 bg-[#15161a] px-3 py-3 text-left transition-colors hover:border-white/14 hover:bg-[#181a1e]"
            >
              <span className={`w-5 text-center text-[16px] font-extrabold leading-none ${index < 3 ? 'text-orange-400' : 'text-zinc-500'}`}>
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-white">{topic.title}</div>
                <div className="mt-1 truncate text-[11px] text-zinc-500">{topic.tag}</div>
              </div>
              <div className="text-[11px] font-medium text-zinc-400">{formatHeat(topic.heat)}</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {hotTags.map((tag) => (
            <button
              key={tag.tag}
              type="button"
              onClick={() => onViewChange('predictions', undefined, tag)}
              className={`rounded-[18px] border px-3 py-3 text-left text-[12px] font-semibold transition-colors ${
                selectedTag === tag.tag
                  ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-white/8 bg-[#15161a] text-zinc-300 hover:border-white/14 hover:bg-[#181a1e]'
              }`}
            >
              <div className="truncate">{tag.tag}</div>
              <div className="mt-1 text-[10px] font-medium text-zinc-500">{formatHeat(tag.heat)}</div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
