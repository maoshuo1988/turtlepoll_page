/**
 * 文件说明：pc Header 组件，负责对应端的顶部导航展示。
 */
import React from 'react';
import { Bell, LogIn, Moon, Search, Sun } from 'lucide-react';
import { getAuthToken, getStoredUserInfo } from '@/utils/authStorage';

export interface PcHeaderProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenAuth: () => void;
}

export const PcHeader: React.FC<PcHeaderProps> = ({
  darkMode,
  onToggleTheme,
  onOpenAuth,
}) => {
  const isAuthenticated = getAuthToken();
  const userInfo = getStoredUserInfo();

  return (
    <header className="app-header sticky left-0 right-0 top-0 z-50 hidden border-b border-white/8 bg-[#090909]/92 backdrop-blur-xl dark:border-rdark-border dark:bg-rdark-card/95 lg:block">
      <div className="flex h-[56px] items-center gap-4 px-8">
        <div className="flex min-w-0 shrink-0 cursor-pointer items-center">
          <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-xl">
            <img src="/logo.png" alt="龟投 Logo" className="h-8 w-8 rounded-xl object-contain" />
          </div>
          <div className="min-w-0">
            <img
              src="/logo-text.png"
              alt="龟投"
              className="block h-10 w-auto object-contain"
            />
          </div>
        </div>

        <div className="max-w-xl flex-1">
          <div className="flex items-center gap-2 rounded-full border border-white/8 bg-[#121316] px-4 py-2 transition-colors hover:border-white/14 dark:border-rdark-border dark:bg-rdark-input dark:hover:border-rdark-text2">
            <Search size={16} className="shrink-0 text-zinc-500 dark:text-rdark-text2" />
            <input
              type="text"
              placeholder="搜索热点事件..."
              className="w-full border-0 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500 dark:text-rdark-text dark:placeholder:text-rdark-text2"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/8 bg-[#111215] text-zinc-400 transition-colors hover:bg-[#18191d] dark:border-rdark-border dark:bg-rdark-card dark:text-rdark-text2 dark:hover:bg-rdark-hover"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="relative grid h-9 w-9 place-items-center rounded-full border border-white/8 bg-[#111215] text-zinc-400 transition-colors hover:bg-[#18191d] dark:border-rdark-border dark:bg-rdark-card dark:text-rdark-text2 dark:hover:bg-rdark-hover">
            <Bell size={16} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          </button>
          <button
            type="button"
            title={userInfo.avatar}
            onClick={onOpenAuth}
            className="group relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-white/8 bg-[#111215] text-[16px] shadow-[0_10px_24px_rgba(0,0,0,0.2)] dark:border-rdark-border dark:bg-rdark-card"
          >
            {userInfo?.avatar?.length > 0 ? (
              <img src={userInfo.avatar} alt={userInfo.avatar} className="h-full w-full object-cover" />
            ) : isAuthenticated ? (
              <span className="grid h-full w-full place-items-center bg-gradient-to-br from-[#202227] via-[#15161a] to-[#0d0d10] font-black text-white">
                {userInfo?.nickname ? userInfo.nickname.slice(0, 1).toUpperCase() : 'g'}
              </span>
            ) : (
              <>
                <img src="/legacy/guike.png" alt="User Avatar" className="h-full w-full object-cover transition group-hover:scale-105" />
                <span className="absolute inset-0 grid place-items-center bg-slate-950/0 text-white opacity-0 transition group-hover:bg-slate-950/35 group-hover:opacity-100">
                  <LogIn size={14} />
                </span>
              </>
            )}
            <span
              className={`absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border border-white dark:border-rdark-card ${
                isAuthenticated ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-500'
              }`}
            />
          </button>
        </div>
      </div>
    </header>
  );
};

