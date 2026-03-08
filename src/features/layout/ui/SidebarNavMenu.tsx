import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { mockRankUsers } from '../../../data/mock_data';

type ViewType = 'predictions' | 'forum' | 'battle' | 'pet' | 'lab' | 'shop';

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
  rankOpen: boolean;
  onNavClick: (item: SidebarNavItem) => void;
}

export const SidebarNavMenu: React.FC<SidebarNavMenuProps> = ({
  navItems,
  activeView,
  rankOpen,
  onNavClick,
}) => {
  const topRankers = mockRankUsers.slice(0, 7);
  const rankColors: Record<number, string> = {
    0: 'text-amber-500',
    1: 'text-slate-400',
    2: 'text-amber-700 dark:text-amber-600',
  };
  const navItemBase =
    'w-full flex items-center gap-3 min-h-[46px] px-3.5 py-2.5 rounded-xl text-[16px] font-semibold cursor-pointer transition-all border text-left relative before:content-[\'\'] before:absolute before:left-2 before:top-1/2 before:w-[3px] before:h-0 before:-translate-y-1/2 before:rounded-full before:bg-gradient-to-b before:from-cyan-400 before:to-emerald-400 before:opacity-0 before:transition-all';
  const navItemDisabled = 'opacity-55 text-slate-300 dark:text-rdark-text2/50 cursor-default';
  const navItemIdle =
    'border-transparent bg-transparent text-slate-600 dark:text-rdark-text hover:border-sky-300/50 hover:bg-[linear-gradient(100deg,rgba(60,142,255,0.14),rgba(16,29,61,0.12))] hover:before:h-[22px] hover:before:opacity-85';
  const navItemActive =
    'border-cyan-300/60 bg-[linear-gradient(100deg,rgba(0,215,255,0.24),rgba(13,53,96,0.26))] text-emerald-700 dark:text-emerald-400 shadow-[inset_0_0_0_1px_rgba(0,215,255,0.24),0_0_20px_rgba(0,215,255,0.18)] before:h-6 before:opacity-100';
  const navItemFeatured =
    'border-emerald-400/40 bg-[linear-gradient(100deg,rgba(6,214,160,0.18),rgba(20,149,210,0.16))] hover:border-emerald-300/70 hover:bg-[linear-gradient(100deg,rgba(6,214,160,0.28),rgba(20,149,210,0.24))]';

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden !p-2 border border-slate-200 dark:border-rdark-border/70 rounded-xl bg-white dark:bg-[#101319] shadow-[0_4px_14px_rgba(15,23,42,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
      <div className="legacy-sidebar-nav grid gap-2">
        {navItems.map((item) => {
          const isActive = item.view ? activeView === item.view : item.key === 'rank' && rankOpen;
          const isFeatured = item.key === 'lab';

          return (
            <React.Fragment key={item.key}>
              <button
                onClick={() => onNavClick(item)}
                className={`sidebar-nav-item ${navItemBase} ${!item.enabled ? navItemDisabled : isActive ? navItemActive : `${navItemIdle} ${isFeatured ? navItemFeatured : ''}`}`}
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
                {item.key === 'rank' && item.enabled && (
                  <ChevronDown size={18} className={`text-slate-400 dark:text-rdark-text2 transition-transform ${rankOpen ? '' : '-rotate-90'}`} />
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
                  <div className="mx-2 mb-1 mt-0.5 rounded-lg bg-slate-50/80 dark:bg-rdark-input/50 py-1">
                    {topRankers.map((u, i) => (
                      <div key={u.rank} className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white dark:hover:bg-rdark-hover transition-colors cursor-pointer">
                        <span className={`text-[11px] font-extrabold w-4 text-center shrink-0 ${rankColors[i] ?? 'text-slate-400 dark:text-rdark-text2'}`}>
                          {u.rank}
                        </span>
                        <span className="text-sm shrink-0">{u.avatar}</span>
                        <span className="flex-1 min-w-0 text-[11px] text-slate-600 dark:text-rdark-text truncate">{u.name}</span>
                        <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">{u.coins.toLocaleString()}</span>
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
