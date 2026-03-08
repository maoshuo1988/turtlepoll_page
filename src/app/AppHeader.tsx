import React from 'react';
import { Moon, Sun, CircleHelp, Coins } from 'lucide-react';

interface AppHeaderProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenGuide: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ darkMode, onToggleTheme, onOpenGuide }) => {
  return (
    <header className="app-header sticky top-0 z-50 border-b border-slate-200/80 dark:border-rdark-border  backdrop-blur-xl">
      <div className="flex h-[54px] items-center justify-between !px-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-white grid place-items-center shadow-[0_0_0_1px_rgba(255,255,255,0.3),0_6px_16px_rgba(16,185,129,0.35)]">
            🐢
          </div>
          <span className="text-[24px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">龟投</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onToggleTheme}
            className="h-7 min-w-[50px] !px-2 rounded-full border border-slate-300/70 dark:border-white/15 bg-white dark:bg-[#1a1f2d] text-slate-600 dark:text-slate-200 cursor-pointer inline-flex items-center justify-center"
          >
            {darkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            onClick={onOpenGuide}
            className="relative h-7 min-w-[38px] !px-2 rounded-full border border-slate-300/70 dark:border-white/15 bg-white dark:bg-[#1a1f2d] text-slate-600 dark:text-slate-200 cursor-pointer inline-flex items-center justify-center"
          >
            <CircleHelp size={14} />
          </button>
          <button className="h-7 !px-3 rounded-full border border-slate-300/70 dark:border-white/15 bg-white dark:bg-[#1a1f2d] text-slate-700 dark:text-slate-100 cursor-pointer inline-flex items-center justify-center gap-1.5 font-bold text-[14px]">
            <Coins size={13} className="text-amber-500" />
            2,480
          </button>
          <button className="h-10 w-10 rounded-full border border-slate-300/70 dark:border-white/15 bg-white dark:bg-[#1a1f2d] text-[16px] cursor-pointer grid place-items-center">
            🦊
          </button>
        </div>
      </div>
    </header>
  );
};
