/**
 * 文件说明：Sidebar Desktop Nav Panel，PC 左侧栏相关展示组件。
 */
import React from 'react';
import { NAV_ITEMS, type ViewType } from './SidebarMainPanels';

interface SidebarDesktopNavPanelProps {
  activeView: ViewType;
  onNavClick: (item: (typeof NAV_ITEMS)[number]) => void;
}

// 桌面侧边栏导航面板：只负责主导航入口，排行榜作为普通页面入口展示。
export const SidebarDesktopNavPanel: React.FC<SidebarDesktopNavPanelProps> = ({
  activeView,
  onNavClick,
}) => {
  return (
    <div className="min-h-0 flex-1">
      <div className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.view ? activeView === item.view : false;

          return (
            <React.Fragment key={item.key}>
            <button
              onClick={() => onNavClick(item)}
              className={`w-full flex items-center gap-3 rounded-xl text-left text-[18px] font-semibold transition-all ${!item.enabled
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
            </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
