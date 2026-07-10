/**
 * 文件说明：mobile Header，保留左上 logo 与右上菜单；右侧展示龟币余额。
 */
import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { getAuthToken } from '@/utils/authStorage';
import { useAppSession } from '@/hooks/useAppSession';
import { IconFont } from '@/components/common/iconfont/IconFont';
import { MobileNavDrawer } from './MobileNavDrawer';
import { MOBILE_HEADER_INNER_HEIGHT_PX } from './mobileHeaderMetrics';

export interface MobileHeaderProps {
  darkMode: boolean;
  onOpenGames: () => void;
  onOpenPet: () => void;
  onOpenShop: () => void;
  onOpenAuth: () => void;
  onOpenProfile?: () => void;
  onSignOut?: () => void | Promise<void>;
  onOpenSettlements?: () => void;
  pendingSettlementCount?: number;
}

function formatCoinBalance(balance: number) {
  if (!Number.isFinite(balance)) return '0';
  if (balance >= 10000) {
    const wan = balance / 10000;
    return `${wan >= 100 ? wan.toFixed(0) : wan.toFixed(1).replace(/\.0$/, '')}万`;
  }
  return String(Math.floor(balance));
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  darkMode,
  onOpenPet,
  onOpenShop,
  onOpenAuth,
  onOpenProfile,
  onSignOut,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isAuthenticated = Boolean(getAuthToken());
  const { coin } = useAppSession();
  const balance = typeof coin?.balance === 'number' ? coin.balance : 0;

  return (
    <>
      <header
        className={`fixed left-0 right-0 top-0 z-50 backdrop-blur-xl lg:hidden ${
          darkMode ? 'border-b border-white/8 bg-[#090909]/94' : 'border-b border-slate-200 bg-white/94'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-between gap-2 px-3" style={{ height: MOBILE_HEADER_INNER_HEIGHT_PX }}>
          <div className="flex min-w-0 shrink items-center gap-1.5">
            <img src="/logo.png" alt="" className="h-7 w-7 shrink-0 rounded-lg object-contain" />
            <img src="/logo-text.png" alt="龟投" className="h-7 max-h-7 w-auto object-contain dark:opacity-95" />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) {
                  onOpenAuth();
                  return;
                }
                onOpenShop();
              }}
              className="inline-flex h-9 max-w-[120px] touch-manipulation items-center gap-1.5 rounded-full border border-emerald-400/45 bg-[#0a100e] px-2.5 text-white shadow-[0_0_14px_rgba(0,255,163,0.16)]"
              aria-label={isAuthenticated ? `龟币 ${formatCoinBalance(balance)}` : '登录查看龟币'}
            >
              <IconFont
                name="qianbi"
                className="shrink-0 leading-none text-emerald-400"
                style={{ fontSize: 28 }}
              />
              <span className="truncate text-[13px] font-black tabular-nums tracking-tight">
                {isAuthenticated ? formatCoinBalance(balance) : '--'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-[#1a1b1f] text-white dark:border-rdark-border dark:bg-rdark-input dark:text-rdark-text"
              aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
            </button>
          </div>
        </div>
      </header>
      <div
        className="lg:hidden shrink-0"
        aria-hidden
        style={{ height: `calc(${MOBILE_HEADER_INNER_HEIGHT_PX}px + env(safe-area-inset-top, 0px))` }}
      />

      <MobileNavDrawer
        open={menuOpen}
        darkMode={darkMode}
        onClose={() => setMenuOpen(false)}
        onOpenPet={onOpenPet}
        onOpenShop={onOpenShop}
        onOpenProfile={onOpenProfile ?? (() => {})}
        onOpenAuth={onOpenAuth}
        onSignOut={onSignOut}
      />
    </>
  );
};
