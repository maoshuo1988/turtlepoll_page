/**
 * 文件说明：pc Header 组件，负责对应端的顶部导航展示。
 */
import React from 'react';
import { CircleHelp, Gamepad2, LogIn, LogOut, Settings, Trophy, UserRound } from 'lucide-react';
import { getAuthToken, getStoredUserInfo } from '@/utils/authStorage';

export interface PcHeaderProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenAuth: () => void;
  onSignOut?: () => void | Promise<void>;
  onOpenProfile?: () => void;
  onOpenGames?: () => void;
  onOpenHelp?: () => void;
  onOpenRank?: () => void;
  /** 已登录时头像菜单「设置」 */
  onOpenSettings?: () => void;
}

export const PcHeader: React.FC<PcHeaderProps> = ({
  onOpenAuth,
  onSignOut,
  onOpenProfile,
  onOpenGames,
  onOpenHelp,
  onOpenRank,
  onOpenSettings,
}) => {
  const isAuthenticated = Boolean(getAuthToken());
  const userInfo = getStoredUserInfo() as { avatar?: string; nickname?: string };

  const menuSurface =
    'rounded-xl border border-white/10 bg-[#121316]/98 py-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-md dark:border-rdark-border dark:bg-rdark-card/98';

  const menuItem =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.06] dark:text-rdark-text dark:hover:bg-rdark-hover';

  const pillShortcut =
    'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-[#0c0d10] px-3.5 text-[13px] font-medium text-white transition-colors hover:border-white/16 hover:bg-[#141518] dark:border-white/8 dark:bg-[#111215] dark:hover:border-white/12 dark:hover:bg-rdark-hover';

  return (
    <header className="app-header sticky left-0 right-0 top-0 z-50 hidden border-b border-white/8 bg-[#090909]/92 backdrop-blur-xl dark:border-rdark-border dark:bg-rdark-card/95 lg:block">
      <div className="flex h-[56px] items-center gap-4 px-8">
        <div className="flex min-w-0 shrink-0 cursor-pointer items-center">
          <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-xl">
            <img src="/logo.png" alt="龟投 Logo" className="h-8 w-8 rounded-xl object-contain" />
          </div>
          <div className="min-w-0">
            <img src="/logo-text.png" alt="龟投" className="block h-10 w-auto object-contain" />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {onOpenGames ? (
            <button type="button" className={pillShortcut} onClick={onOpenGames} aria-label="游戏">
              <Gamepad2 size={18} className="shrink-0 text-violet-400" strokeWidth={2} aria-hidden />
              <span>游戏</span>
            </button>
          ) : null}
          {onOpenHelp ? (
            <button type="button" className={pillShortcut} onClick={onOpenHelp} aria-label="新手引导">
              <CircleHelp size={18} className="shrink-0 text-sky-400" strokeWidth={2} aria-hidden />
              <span>帮助</span>
            </button>
          ) : null}
          {onOpenRank ? (
            <button type="button" className={pillShortcut} onClick={onOpenRank} aria-label="排行榜">
              <Trophy size={18} className="shrink-0 text-amber-400" strokeWidth={2} aria-hidden />
              <span>排行榜</span>
            </button>
          ) : null}
          <div className="group relative">
            <button
              type="button"
              title={typeof userInfo?.avatar === 'string' ? userInfo.avatar : undefined}
              onClick={() => {
                if (!isAuthenticated) onOpenAuth();
              }}
              className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-white/8 bg-[#111215] text-[16px] shadow-[0_10px_24px_rgba(0,0,0,0.2)] transition-colors hover:border-white/14 dark:border-rdark-border dark:bg-rdark-card dark:hover:border-rdark-text2"
            >
              {userInfo?.avatar && userInfo.avatar.length > 0 ? (
                <img src={userInfo.avatar} alt="" className="h-full w-full object-cover" />
              ) : isAuthenticated ? (
                <span className="grid h-full w-full place-items-center bg-gradient-to-br from-[#202227] via-[#15161a] to-[#0d0d10] font-black text-white">
                  {userInfo?.nickname ? userInfo.nickname.slice(0, 1).toUpperCase() : 'g'}
                </span>
              ) : (
                <>
                  <img src="/legacy/guike.png" alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
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

            {/* pt-2 作为悬停桥梁，避免移到菜单时下拉消失 */}
            <div
              className="invisible absolute right-0 top-full z-[70] min-w-[156px] pt-2 opacity-0 transition-[opacity,visibility] duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
              role="presentation"
            >
              <div className={menuSurface} role="menu">
                {!isAuthenticated ? (
                  <button type="button" role="menuitem" className={`${menuItem} text-emerald-600 dark:text-emerald-400`} onClick={onOpenAuth}>
                    <LogIn size={15} className="shrink-0 opacity-90" />
                    登录
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      className={menuItem}
                      onClick={() => {
                        onOpenProfile?.();
                      }}
                    >
                      <UserRound size={15} className="shrink-0 text-zinc-400 dark:text-rdark-text2" />
                      个人中心
                    </button>
                    {onOpenSettings ? (
                      <button
                        type="button"
                        role="menuitem"
                        className={menuItem}
                        onClick={() => {
                          onOpenSettings();
                        }}
                      >
                        <Settings size={15} className="shrink-0 text-zinc-400 dark:text-rdark-text2" />
                        设置
                      </button>
                    ) : null}
                    <button
                      type="button"
                      role="menuitem"
                      className={`${menuItem} text-amber-600/95 dark:text-amber-400/95`}
                      onClick={() => {
                        void onSignOut?.();
                      }}
                    >
                      <LogOut size={15} className="shrink-0 opacity-90" />
                      退出登录
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
