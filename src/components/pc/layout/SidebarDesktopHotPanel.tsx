/**
 * 文件说明：Sidebar Desktop Hot Panel，PC 左侧栏相关展示组件。
 */
import React, { useState } from 'react';
import { ChevronDown, Flame, Hash } from 'lucide-react';
import type { SidebarHotTag, SidebarHotTopic } from '@/components/shared/layout';

interface SidebarDesktopHotPanelProps {
  hotTopics: SidebarHotTopic[];
  hotTags: SidebarHotTag[];
  selectedTag: string | null;
  onOpenTopic: (topic: SidebarHotTopic) => void;
  onTagClick: (tag: SidebarHotTag) => void;
  fmtHeat: (n: number) => string;
}

export const SidebarDesktopHotPanel: React.FC<SidebarDesktopHotPanelProps> = ({
  hotTopics,
  hotTags,
  selectedTag,
  onOpenTopic,
  onTagClick,
  fmtHeat,
}) => {
  const [hotExpanded, setHotExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-white/8 bg-[#0f1013]/96 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.18)] dark:border-rdark-border dark:bg-rdark-card/90 dark:shadow-none">
      <button
        type="button"
        onClick={() => setHotExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-white/[0.04] dark:hover:bg-white/[0.03]"
        aria-expanded={hotExpanded}
      >
        <span className="flex min-w-0 items-center gap-2 text-[15px] font-bold text-white dark:text-rdark-text">
          <Flame size={18} className="shrink-0 text-orange-400" />
          <span className="truncate">最新热点</span>
          <span className="text-[11px] font-medium text-zinc-500 dark:text-rdark-text2">({hotTopics.length})</span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-zinc-500 transition-transform duration-200 dark:text-rdark-text2 ${hotExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: hotExpanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="space-y-0.5 pt-2">
            {hotTopics.map((topic, index) => (
              <button
                key={`${topic.rank}-${topic.title}-${index}`}
                type="button"
                className="group flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.06] dark:hover:bg-rdark-hover"
                onClick={() => onOpenTopic(topic)}
              >
                <span
                  className={`w-5 shrink-0 text-center text-[13px] font-extrabold tabular-nums ${
                    topic.rank <= 2
                      ? 'text-orange-500'
                      : topic.rank === 3
                        ? 'text-amber-500'
                        : 'text-zinc-500 dark:text-rdark-text2'
                  }`}
                >
                  {topic.rank}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-300 transition-colors group-hover:text-emerald-400 dark:text-rdark-text dark:group-hover:text-emerald-400">
                  {topic.title}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-zinc-500 dark:text-rdark-text2">{fmtHeat(topic.heat)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`border-t border-white/6 dark:border-rdark-border ${hotExpanded ? 'mt-3 pt-3' : 'mt-2 pt-2'}`}>
        <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-zinc-500 dark:text-rdark-text2">
          <Hash size={13} className="text-emerald-500/90" />
          话题
        </div>
        <div className="flex flex-wrap gap-1.5">
          {hotTags.map((tag) => (
            <button
              key={tag.tag}
              type="button"
              onClick={() => onTagClick(tag)}
              className={`max-w-full truncate rounded-full border px-2.5 py-1 text-left text-[11px] font-medium transition-all ${
                selectedTag === tag.tag
                  ? 'border-emerald-400/50 bg-emerald-500/15 font-semibold text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/15 hover:bg-white/[0.06] hover:text-zinc-200 dark:border-rdark-border dark:bg-transparent dark:text-rdark-text2 dark:hover:bg-rdark-hover dark:hover:text-rdark-text'
              }`}
            >
              {tag.tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
