import React from 'react';
import { Search, Moon, Sun, Bell } from 'lucide-react';

interface AppHeaderProps {
  darkMode: boolean;
  onToggleTheme: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ darkMode, onToggleTheme }) => {
  return (
    <header className="app-header sticky top-0 z-50 bg-white/80 dark:bg-rdark-card/95 backdrop-blur-xl border-b border-slate-100 dark:border-rdark-border">
      <div className="flex items-center gap-5 px-8 py-2.5">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0 cursor-pointer group">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="shrink-0">
            {/* Shell */}
            <ellipse cx="16" cy="15" rx="11" ry="10" className="fill-emerald-500 dark:fill-emerald-400" />
            {/* Shell pattern — hexagonal lines */}
            <path
              d="M16 5 L16 25 M7 10 L25 10 M7 20 L25 20 M9 7 L23 23 M23 7 L9 23"
              stroke="white"
              strokeWidth="0.8"
              strokeOpacity="0.3"
              strokeLinecap="round"
            />
            {/* Head */}
            <circle cx="25" cy="12" r="3.5" className="fill-emerald-600 dark:fill-emerald-500" />
            {/* Eye */}
            <circle cx="26.2" cy="11.2" r="1" fill="white" />
            <circle cx="26.5" cy="11" r="0.5" className="fill-slate-800 dark:fill-rdark" />
            {/* Front legs */}
            <ellipse cx="23" cy="22" rx="2.2" ry="1.5" transform="rotate(-25 23 22)" className="fill-emerald-600 dark:fill-emerald-500" />
            <ellipse cx="9" cy="22" rx="2.2" ry="1.5" transform="rotate(25 9 22)" className="fill-emerald-600 dark:fill-emerald-500" />
            {/* Tail */}
            <path d="M5.5 16 Q3 16 3.5 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-emerald-600 dark:text-emerald-500" />
          </svg>
          <div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
              龟投
            </span>
            <div className="text-[9px] text-slate-400 dark:text-rdark-text2 -mt-0.5 tracking-wide">新闻 · 预测 · 宠物</div>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-xl">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-rdark-input rounded-full px-4 py-2 border border-slate-200 dark:border-rdark-border hover:border-slate-300 dark:hover:border-rdark-text2 transition-colors">
            <Search size={16} className="text-slate-400 dark:text-rdark-text2 shrink-0" />
            <input
              type="text"
              placeholder="搜索热点事件..."
              className="bg-transparent border-0 outline-none text-sm text-slate-700 dark:text-rdark-text placeholder:text-slate-400 dark:placeholder:text-rdark-text2 w-full"
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-rdark-hover transition-colors text-slate-400 dark:text-rdark-text2 border-0 bg-transparent cursor-pointer"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-rdark-hover transition-colors text-slate-400 dark:text-rdark-text2 border-0 bg-transparent cursor-pointer relative">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
};

