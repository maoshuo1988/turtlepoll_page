/**
 * 文件说明：mobile Header 组件，负责手机浏览器顶栏（与 PC 分离的紧凑布局）。
 */
import React, { useState } from 'react';
import { Gamepad2, Menu, X } from 'lucide-react';
import { MobileNavDrawer } from './MobileNavDrawer';
import { MOBILE_HEADER_INNER_HEIGHT_PX } from './mobileHeaderMetrics';
import { SettlementEntryButton } from '@/components/common/settlement/SettlementEntryButton';

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

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  darkMode,
  onOpenGames,
  onOpenPet,
  onOpenShop,
  onOpenAuth,
  onOpenProfile,
  onSignOut,
  onOpenSettlements,
  pendingSettlementCount = 0,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

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
            {onOpenSettlements ? (
              <SettlementEntryButton
                pendingCount={pendingSettlementCount}
                onClick={onOpenSettlements}
                className="h-9 px-3 text-[12px] lg:hidden"
              />
            ) : null}
            <button
              type="button"
              onClick={onOpenGames}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-[#141518] text-violet-400 dark:border-rdark-border dark:bg-rdark-card dark:text-violet-300"
              aria-label="游戏"
            >
              <Gamepad2 size={17} strokeWidth={2} />
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
