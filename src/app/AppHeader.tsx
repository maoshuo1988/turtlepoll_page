

import React from 'react';
import { LogIn, Moon, Sun } from 'lucide-react';
import { getStoredAuthToken, getStoredUserInfo } from '@/utils/authStorage';

interface AppHeaderProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenAuth: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  darkMode,
  onToggleTheme,
  onOpenAuth,
}) => {
  const isAuthenticated = getStoredAuthToken()
  const userInfo = getStoredUserInfo()
  console.log("userInfo ----- ",userInfo)
  return (
    <>
      <header className="app-header fixed md:sticky top-0 left-0 right-0 z-50 border-b border-slate-200/80 dark:border-rdark-border backdrop-blur-xl">
        <div className="flex h-[54px] md:h-[56px] items-center justify-between !px-2.5 md:!px-4">
          <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
            <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-white grid place-items-center shadow-[0_0_0_1px_rgba(255,255,255,0.3),0_6px_16px_rgba(16,185,129,0.35)]">
              🐢
            </div>
            <span className="text-[19px] md:text-[24px] font-black tracking-[-0.02em] text-slate-900 dark:text-white truncate">龟投</span>
          </div>

          <div className="flex items-center gap-1.5 md:gap-4">
            <button
              onClick={onToggleTheme}
              className="h-7 min-w-[40px] md:min-w-[50px] !px-1.5 md:!px-2 rounded-full border border-slate-300/70 dark:border-white/15 bg-white dark:bg-[#1a1f2d] text-slate-600 dark:text-slate-200 cursor-pointer inline-flex items-center justify-center"
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              type="button"
              title={userInfo.avatar}
              onClick={onOpenAuth}
              className="group relative h-8 w-8 md:h-10 md:w-10 rounded-full border border-slate-300/70 dark:border-white/15 bg-white dark:bg-[#1a1f2d] text-[14px] md:text-[16px] cursor-pointer grid place-items-center overflow-hidden shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
            >
              {userInfo?.avatar?.length > 0 ? (
                <img src={userInfo.avatar} alt={userInfo.avatar} className="h-full w-full object-cover" />
              ) : isAuthenticated ? (
                <span className="grid h-full w-full place-items-center bg-gradient-to-br from-cyan-500 via-sky-500 to-emerald-500 font-black text-white">
                  {userInfo?.nickname ? userInfo?.nickname.slice(0, 1).toUpperCase() : "g"}
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
                className={`absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border border-white dark:border-[#1a1f2d] ${
                  isAuthenticated ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-500'
                }`}
              />
            </button>
          </div>
        </div>
      </header>
      <div className="h-[54px] md:hidden" />
    </>
  );
};

