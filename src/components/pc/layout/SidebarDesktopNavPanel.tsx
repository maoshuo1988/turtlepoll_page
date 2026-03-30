import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { NAV_ITEMS, type ViewType } from './SidebarMainPanels';

type RankUser = {
  rank: number;
  avatar: string;
  name: string;
  coins: number;
};

interface SidebarDesktopNavPanelProps {
  activeView: ViewType;
  rankOpen: boolean;
  topRankers: RankUser[];
  rankColors: Record<number, string>;
  onNavClick: (item: (typeof NAV_ITEMS)[number]) => void;
}

// 桌面侧边栏导航面板：包含主导航和排行榜折叠区
export const SidebarDesktopNavPanel: React.FC<SidebarDesktopNavPanelProps> = ({
  activeView,
  rankOpen,
  topRankers,
  rankColors,
  onNavClick,
}) => {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      <div className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.view ? activeView === item.view : item.key === 'rank' && rankOpen;

          return (
            <React.Fragment key={item.key}>
              <button
                onClick={() => onNavClick(item)}
                className={`w-full flex items-center gap-3 rounded-xl  text-left text-[18px] font-semibold transition-all ${!item.enabled
                    ? 'cursor-default text-slate-300 dark:text-rdark-text2/50'
                    : isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/15 dark:text-emerald-400'
                      : 'bg-transparent text-slate-600 hover:bg-slate-100/80 dark:text-rdark-text dark:hover:bg-rdark-hover'
                  }`}
              >
                <span
                  className={`flex w-6 shrink-0 items-center justify-center ${!item.enabled
                      ? 'text-slate-300 dark:text-rdark-text2/50'
                      : isActive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-rdark-text2'
                    }`}
                >
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {!item.enabled && <span className="shrink-0 text-[10px] text-slate-300 dark:text-rdark-text2/50">即将开放</span>}
                {item.key === 'rank' && item.enabled && (
                  <ChevronDown size={18} className={`text-slate-400 transition-transform dark:text-rdark-text2 ${rankOpen ? '' : '-rotate-90'}`} />
                )}
              </button>

              {item.key === 'rank' && rankOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className=" rounded-lg bg-slate-50/80  dark:bg-rdark-input/50">
                    {topRankers.map((user, index) => (
                      <div key={user.rank} className="flex cursor-pointer items-center gap-2 rounded-md  transition-colors hover:bg-white dark:hover:bg-rdark-hover">
                        <span className={`w-4 shrink-0 text-center text-[11px] font-extrabold ${rankColors[index] ?? 'text-slate-400 dark:text-rdark-text2'}`}>
                          {user.rank}
                        </span>
                        <span className="shrink-0 text-sm">{user.avatar}</span>
                        <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600 dark:text-rdark-text">{user.name}</span>
                        <span className="shrink-0 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">{user.coins.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
