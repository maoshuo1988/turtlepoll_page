/**
 * 文件说明：Sidebar Nav Menu，PC 左侧栏相关展示组件。
 */
import React from 'react';

type ViewType = 'worldCup' | 'predictions' | 'rivalry' | 'forum' | 'games' | 'jump' | 'battle' | 'battlePlaza' | 'pet' | 'lab' | 'shop' | 'rank' | 'profile' | 'inventory' | 'activePredictions';

export interface SidebarNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  view?: ViewType;
  action?: 'guide';
  enabled: boolean;
}

interface SidebarNavMenuProps {
  navItems: SidebarNavItem[];
  activeView: string;
  onNavClick: (item: SidebarNavItem) => void;
}

export const SidebarNavMenu: React.FC<SidebarNavMenuProps> = ({
  navItems,
  activeView,
  onNavClick,
}) => {
  const navItemBase =
    'w-full flex items-center gap-3 min-h-[44px] px-3 py-2 rounded-xl text-[14px] font-semibold cursor-pointer transition-all border text-left relative before:content-[\'\'] before:absolute before:left-1 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-white before:opacity-0 before:transition-opacity';
  const navItemDisabled = 'cursor-default opacity-55 text-zinc-600 dark:text-rdark-text2/50';
  const navItemIdle =
    'border-transparent bg-transparent text-zinc-300 hover:bg-[#15161a] hover:text-white dark:text-rdark-text dark:hover:bg-rdark-input dark:hover:text-rdark-text';
  const navItemActive =
    'border-white/10 bg-[#141518] text-white before:opacity-100 dark:border-rdark-border dark:bg-rdark-input dark:text-rdark-text';

  return (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden rounded-xl border border-white/8 bg-[#0f1013] p-2 shadow-[0_12px_28px_rgba(0,0,0,0.24)] dark:border-rdark-border dark:bg-rdark-card dark:shadow-none lg:rounded-2xl lg:bg-[#0f1013]/72 lg:p-2">
      <div className="mb-3 px-1 lg:mb-2 lg:px-0">
        <div className="text-[14px] font-bold text-white dark:text-rdark-text">功能导航</div>
        <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-rdark-text2">切换主要页面与系统入口</div>
      </div>

      <div className="mb-3 hidden h-px bg-white/6 dark:bg-rdark-border lg:block" />

      <div className="legacy-sidebar-nav grid gap-1.5">
        {navItems.filter((item) => item.enabled).map((item) => {
          const isActive = item.view ? activeView === item.view : false;
          return (
            <React.Fragment key={item.key}>
            <button
              onClick={() => onNavClick(item)}
              className={`sidebar-nav-item ${navItemBase} ${!item.enabled ? navItemDisabled : isActive ? navItemActive : navItemIdle}`}
            >
              <span
                className={`w-5 md:w-6 shrink-0 flex items-center justify-center ${
                  !item.enabled
                    ? 'text-zinc-600 dark:text-rdark-text2/50'
                    : isActive
                      ? 'text-white dark:text-rdark-text'
                      : 'text-zinc-500 dark:text-rdark-text2'
                }`}
              >
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
            </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
