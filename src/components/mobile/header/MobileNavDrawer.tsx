/**
 * 文件说明：手机端导航抽屉（仅占顶栏以下区域，顶栏与未打开时共用同一 MobileHeader）。
 */
import React, { useEffect } from 'react';
import { Gift, LogIn, LogOut, Settings, Turtle, UserRound } from 'lucide-react';
import { getAuthToken, getStoredUserInfo } from '@/utils/authStorage';
import { createUserAvatarUrl } from '@/utils/userAvatar';
import { MOBILE_HEADER_INNER_HEIGHT_PX } from './mobileHeaderMetrics';

export interface MobileNavDrawerProps {
  open: boolean;
  darkMode: boolean;
  onClose: () => void;
  onOpenPet: () => void;
  onOpenShop: () => void;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
  onSignOut?: () => void | Promise<void>;
}

const drawerTop = `calc(${MOBILE_HEADER_INNER_HEIGHT_PX}px + env(safe-area-inset-top, 0px))`;

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  open,
  darkMode,
  onClose,
  onOpenPet,
  onOpenShop,
  onOpenProfile,
  onOpenAuth,
  onSignOut,
}) => {
  const isAuthenticated = Boolean(getAuthToken());
  const storedUser = getStoredUserInfo() as {
    id?: string | number;
    nickname?: string;
    username?: string;
  };
  const avatarUrl = createUserAvatarUrl(storedUser?.id, 56);
  const fallbackInitial = (storedUser?.nickname || storedUser?.username || 'U').trim().slice(0, 1).toUpperCase();

  useEffect(() => {
    if (!open) return;

    const root = document.querySelector('[data-app-scroll-root]') as HTMLElement | null;
    const scrollY = root?.scrollTop ?? 0;

    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      bodyLeft: body.style.left,
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.width = '100%';

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.width = prev.bodyWidth;
      body.style.left = prev.bodyLeft;
      root?.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!open) return null;

  const rowBase =
    'flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors active:bg-black/10 dark:active:bg-white/[0.07]';

  const profileDivider = darkMode ? 'border-b border-white/10 dark:border-rdark-border/80' : 'border-b border-slate-200/90';

  const itemLabelClass = `text-[13px] font-semibold leading-snug ${darkMode ? 'text-white dark:text-rdark-text' : 'text-slate-900'}`;

  /** 抽屉整块底层：偏透明 + 模糊，能透出背后页面 */
  const sheetSurface = darkMode
    ? 'bg-[#060607]/5 backdrop-blur-md supports-[backdrop-filter]:bg-[#060607]/3'
    : 'bg-white/7 backdrop-blur-md supports-[backdrop-filter]:bg-white/5';

  /** 菜单卡片：实色略深，不与抽屉底层一起做透明 */
  const cardSurface = darkMode
    ? 'border-white/12 bg-[#14151a] shadow-[0_16px_48px_rgba(0,0,0,0.45)] dark:border-rdark-border'
    : 'border-slate-200 bg-slate-100 shadow-md';

  return (
    <>
      <button
        type="button"
        className="fixed inset-x-0 bottom-0 z-40 bg-black/10 lg:hidden dark:bg-black/12"
        style={{ top: drawerTop }}
        aria-label="关闭菜单"
        onClick={onClose}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-[45] flex min-h-0 flex-col overscroll-none lg:hidden ${sheetSurface}`}
        style={{
          top: drawerTop,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="导航菜单"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-3">
          <div className={`overflow-hidden rounded-[22px] border ${cardSurface}`}>
            <div className={`px-4 pb-4 pt-4 ${profileDivider}`}>
              <div className="flex items-start gap-3">
                <div
                  className={`grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border text-2xl ${
                    darkMode
                      ? 'border-white/10 bg-gradient-to-br from-[#1c1d22] to-[#0f1013] dark:border-rdark-border'
                      : 'border-slate-200 bg-slate-100'
                  }`}
                >
                  {isAuthenticated && avatarUrl ? (
                    <img src={avatarUrl} alt={storedUser?.nickname || storedUser?.username || '用户头像'} className="h-full w-full object-cover" />
                  ) : isAuthenticated ? (
                    <span aria-hidden className="text-xl font-black">
                      {fallbackInitial || 'U'}
                    </span>
                  ) : (
                    <UserRound size={24} strokeWidth={2} aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  {isAuthenticated ? (
                    <>
                      <div
                        className={`truncate text-[16px] font-bold ${darkMode ? 'text-white dark:text-rdark-text' : 'text-slate-900'}`}
                      >
                        {storedUser?.nickname || storedUser?.username || '已登录用户'}
                      </div>
                      <div className={`mt-1 truncate text-[12px] ${darkMode ? 'text-zinc-500 dark:text-rdark-text2' : 'text-slate-500'}`}>
                        欢迎回来
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`text-[16px] font-bold ${darkMode ? 'text-white dark:text-rdark-text' : 'text-slate-900'}`}>未登录</div>
                      <div className={`mt-1 text-[12px] leading-relaxed ${darkMode ? 'text-zinc-500 dark:text-rdark-text2' : 'text-slate-500'}`}>
                        点击下方按钮注册或登录
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <nav className="flex flex-col pb-1" aria-label="功能菜单">
              <button
                type="button"
                className={rowBase}
                onClick={() => {
                  onOpenPet();
                  onClose();
                }}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400">
                  <Turtle size={18} strokeWidth={2} />
                </span>
                <span className={itemLabelClass}>宠物中心</span>
              </button>
              <button
                type="button"
                className={rowBase}
                onClick={() => {
                  onOpenShop();
                  onClose();
                }}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pink-500/15 text-pink-400">
                  <Gift size={18} strokeWidth={2} />
                </span>
                <span className={itemLabelClass}>黑市</span>
              </button>
              <button
                type="button"
                className={rowBase}
                onClick={() => {
                  onOpenProfile();
                  onClose();
                }}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-500/15 text-sky-400">
                  <UserRound size={18} strokeWidth={2} />
                </span>
                <span className={itemLabelClass}>个人主页</span>
              </button>

              {isAuthenticated ? (
                <button
                  type="button"
                  className={`${rowBase} text-amber-200 dark:text-amber-300`}
                  onClick={() => {
                    void onSignOut?.();
                    onClose();
                  }}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-400">
                    <LogOut size={18} strokeWidth={2} />
                  </span>
                  <span className="text-[13px] font-semibold leading-snug">退出登录</span>
                </button>
              ) : (
                <button
                  type="button"
                  className={`${rowBase} text-emerald-200 dark:text-emerald-300`}
                  onClick={() => {
                    onOpenAuth();
                    onClose();
                  }}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    <LogIn size={18} strokeWidth={2} />
                  </span>
                  <span className="text-[13px] font-semibold leading-snug">注册 / 登录</span>
                </button>
              )}

              <div className={`${rowBase} cursor-default opacity-80`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zinc-600/25 text-zinc-400">
                  <Settings size={18} strokeWidth={2} />
                </span>
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className={itemLabelClass}>设置</span>
                  <span className={`shrink-0 text-[10px] font-medium ${darkMode ? 'text-zinc-500 dark:text-rdark-text2' : 'text-slate-500'}`}>
                    即将推出
                  </span>
                </span>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
};
