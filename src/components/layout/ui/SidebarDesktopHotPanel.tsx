import React from 'react';
import { Flame, Hash } from 'lucide-react';
import type { SidebarHotTag, SidebarHotTopic } from './sidebarHotData';

interface SidebarDesktopHotPanelProps {
  hotTopics: SidebarHotTopic[];
  hotTags: SidebarHotTag[];
  selectedTag: string | null;
  onOpenTopic: (topic: SidebarHotTopic) => void;
  onTagClick: (tag: SidebarHotTag) => void;
  fmtHeat: (n: number) => string;
}

// 桌面侧边栏热点面板：包含热点列表和快捷话题标签
export const SidebarDesktopHotPanel: React.FC<SidebarDesktopHotPanelProps> = ({
  hotTopics,
  hotTags,
  selectedTag,
  onOpenTopic,
  onTagClick,
  fmtHeat,
}) => {
  return (
    <div className="">
      <div className="flex items-center gap-2 text-[18px] font-bold text-slate-500 dark:text-rdark-text2">
        <Flame size={20} className="text-orange-400" /> 最新热点
      </div>

      <div className="flex gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          {hotTopics.map((topic, index) => (
            <div
              key={`${topic.rank}-${topic.title}-${index}`}
              className="group flex cursor-pointer items-center gap-2 rounded-md  transition-colors hover:bg-slate-50 dark:hover:bg-rdark-hover"
              onClick={() => onOpenTopic(topic)}
            >
              <span
                className={`w-5 shrink-0 text-center text-[14px] font-extrabold ${topic.rank <= 2 ? 'text-orange-500' : topic.rank === 3 ? 'text-amber-500' : 'text-slate-400 dark:text-rdark-text2'
                  }`}
              >
                {topic.rank}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] text-slate-600 transition-colors group-hover:text-emerald-600 dark:text-rdark-text dark:group-hover:text-emerald-400">
                {topic.title}
              </span>
              <span className="shrink-0 text-[11px] text-slate-400 dark:text-rdark-text2">{fmtHeat(topic.heat)}</span>
            </div>
          ))}
        </div>

        <div className="w-[90px] shrink-0">
          <div className=" flex items-center gap-1 text-[11px] font-bold text-slate-400 dark:text-rdark-text2">
            <Hash size={11} /> 话题
          </div>
          <div className="flex flex-col gap-1">
            {hotTags.map((tag) => (
              <button
                key={tag.tag}
                onClick={() => onTagClick(tag)}
                className={`w-full truncate rounded-md border  text-left text-[11px] font-medium transition-all ${selectedTag === tag.tag
                    ? 'border-emerald-200 bg-emerald-50 font-semibold text-emerald-600 dark:border-emerald-800 dark:bg-emerald-900/15 dark:text-emerald-400'
                    : 'border-slate-100 bg-transparent text-slate-500 hover:bg-slate-50 dark:border-rdark-border dark:text-rdark-text2 dark:hover:bg-rdark-hover'
                  }`}
              >
                {tag.tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
