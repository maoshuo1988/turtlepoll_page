import React from 'react';

type ViewType = 'predictions' | 'forum' | 'battle' | 'pet' | 'lab' | 'shop' | 'rank';

export interface SidebarNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  view?: ViewType;
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
    'w-full flex items-center gap-3 min-h-[46px] px-3.5 py-2.5 rounded-xl text-[16px] font-semibold cursor-pointer transition-all border text-left relative before:content-[\'\'] before:absolute before:left-2 before:top-1/2 before:w-[3px] before:h-0 before:-translate-y-1/2 before:rounded-full before:bg-gradient-to-b before:from-cyan-400 before:to-emerald-400 before:opacity-0 before:transition-all';
  const navItemDisabled = 'opacity-55 text-slate-300 dark:text-rdark-text2/50 cursor-default';
  const navItemIdle =
    'border-transparent bg-transparent text-slate-600 dark:text-rdark-text hover:border-sky-300/50 hover:bg-[linear-gradient(100deg,rgba(60,142,255,0.14),rgba(16,29,61,0.12))] hover:before:h-[22px] hover:before:opacity-85';
  const navItemActive =
    'border-cyan-300/60 bg-[linear-gradient(100deg,rgba(0,215,255,0.24),rgba(13,53,96,0.26))] text-emerald-700 dark:text-emerald-400 shadow-[inset_0_0_0_1px_rgba(0,215,255,0.24),0_0_20px_rgba(0,215,255,0.18)] before:h-6 before:opacity-100';

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden !p-2 border border-slate-200 dark:border-rdark-border/70 rounded-xl bg-white dark:bg-[#101319] shadow-[0_4px_14px_rgba(15,23,42,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
      <div className="legacy-sidebar-nav grid gap-2">
        {navItems.map((item) => {
          const isActive = item.view ? activeView === item.view : false;
          return (
            <button
              key={item.key}
              onClick={() => onNavClick(item)}
              className={`sidebar-nav-item ${navItemBase} ${!item.enabled ? navItemDisabled : isActive ? navItemActive : navItemIdle}`}
            >
              <span
                className={`w-6 shrink-0 flex items-center justify-center ${
                  !item.enabled
                    ? 'text-slate-300 dark:text-rdark-text2/50'
                    : isActive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-rdark-text2'
                }`}
              >
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {!item.enabled && <span className="text-[10px] text-slate-300 dark:text-rdark-text2/50 shrink-0">即将开放</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};
