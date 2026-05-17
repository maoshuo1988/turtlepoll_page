/**
 * 文件说明：App Page Layout，布局组件层，承接 Header、Footer、Sidebar 和页面内容区域。
 */
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@umijs/renderer-react';
import { MobileFooter } from '@/components/footer';
import { MobileHeader, PcHeader } from '@/components/header';
import { Sidebar } from '@/components/layout';
import type { SidebarHotTag, SidebarHotTopic } from '@/components/shared/layout';
import type { ViewType } from '@/components/layout';

type HeaderProps = {
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenAuth: () => void;
  onOpenGames?: () => void;
  /** 已登录时顶部头像菜单「退出登录」 */
  onSignOut?: () => void | Promise<void>;
  /** 已登录时顶部头像菜单「个人中心」 */
  onOpenProfile?: () => void;
  /** PC 顶栏「帮助」 */
  onOpenHelp?: () => void;
  /** PC 顶栏「排行榜」 */
  onOpenRank?: () => void;
  /** PC 顶栏头像菜单「设置」（登录态） */
  onOpenSettings?: () => void;
};

type SidebarProps = React.ComponentProps<typeof Sidebar>;

// 页面布局最底层的展示参数，只负责“怎么摆”，不关心业务数据从哪里来。
type AppPageLayoutProps = HeaderProps & {
  children: React.ReactNode;
  contentClassName?: string;
  sidebarProps?: SidebarProps;
  showSidebar?: boolean;
  showFooter?: boolean;
};

/**
 * 应用顶部区域。
 *
 * PC 和移动端 Header 在这里统一挂载，各自通过响应式 class 控制显示。
 * 这样页面层不用关心当前设备类型。
 */
export function AppLayoutHeader(props: HeaderProps) {
  const navigate = useNavigate();
  const openGames = props.onOpenGames ?? (() => navigate('/games'));

  return (
    <>
      <PcHeader
        darkMode={props.darkMode}
        onToggleTheme={props.onToggleTheme}
        onOpenAuth={props.onOpenAuth}
        onSignOut={props.onSignOut}
        onOpenProfile={props.onOpenProfile}
        onOpenHelp={props.onOpenHelp}
        onOpenRank={props.onOpenRank}
        onOpenSettings={props.onOpenSettings}
      />
      <MobileHeader
        darkMode={props.darkMode}
        onOpenGames={openGames}
        onOpenWorldCup={() => navigate('/world-cup')}
        onOpenPet={() => navigate('/pet')}
        onOpenShop={() => navigate('/shop')}
        onOpenAuth={props.onOpenAuth}
        onOpenProfile={props.onOpenProfile}
        onSignOut={props.onSignOut}
      />
    </>
  );
}

/**
 * 应用底部区域。
 *
 * PC 展示普通 footer，移动端展示底部选项卡导航。
 */
export function AppLayoutFooter(props: { mobileTabBarVisible?: boolean }) {
  return (
    <>
      {/* <div className="hidden lg:block">
        <PcFooter />
      </div> */}
      <MobileFooter visible={props.mobileTabBarVisible ?? true} />
    </>
  );
}

// 左侧栏单独导出，方便以后需要在特殊页面复用或替换。
export function AppLayoutSidebar(props: SidebarProps) {
  return <Sidebar {...props} />;
}

/**
 * 全局页面骨架。
 *
 * 结构顺序固定为 Header -> 主内容 -> Footer。
 * 当 showSidebar 为 true 时，主内容会拆成左侧栏和右侧内容区；
 * 否则就渲染一个全宽页面，给游戏页或特殊落地页使用。
 */
export function AppPageLayout({
  children,
  contentClassName = 'min-h-full w-full px-0 pb-0 pt-0',
  darkMode,
  onToggleTheme,
  onOpenAuth,
  onOpenGames,
  onSignOut,
  onOpenProfile,
  onOpenHelp,
  onOpenRank,
  onOpenSettings,
  sidebarProps,
  showSidebar = false,
  showFooter = true,
}: AppPageLayoutProps) {
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);
  const captureScrollContainerRef = useCallback((node: HTMLElement | null) => {
    setScrollContainer(node);
  }, []);
  const [mobileTabBarVisible, setMobileTabBarVisible] = useState(true);
  const lastScrollTopRef = useRef(0);

  useEffect(() => {
    if (!scrollContainer) return;
    lastScrollTopRef.current = scrollContainer.scrollTop;
    const onScroll = () => {
      const y = scrollContainer.scrollTop;
      const dy = y - lastScrollTopRef.current;
      lastScrollTopRef.current = y;
      if (y < 36) {
        setMobileTabBarVisible(true);
        return;
      }
      if (dy > 14) setMobileTabBarVisible(false);
      else if (dy < -14) setMobileTabBarVisible(true);
    };
    scrollContainer.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', onScroll);
  }, [scrollContainer]);

  const mobileBottomPaddingClass =
    showFooter
      ? mobileTabBarVisible
        ? 'max-lg:pb-[calc(56px+env(safe-area-inset-bottom,0px)+10px)]'
        : 'max-lg:pb-[calc(12px+env(safe-area-inset-bottom,0px))]'
      : '';

  const contentInnerClassName =
    `${contentClassName} max-lg:transition-[padding-bottom] max-lg:duration-200 max-lg:ease-out ${mobileBottomPaddingClass}`.trim();

  return (
    <div className="legacy-fusion-app fixed-sidebar-style flex h-screen flex-col overflow-hidden bg-[#080808] text-white transition-colors dark:bg-rdark">
      <AppLayoutHeader
        darkMode={darkMode}
        onToggleTheme={onToggleTheme}
        onOpenAuth={onOpenAuth}
        onOpenGames={onOpenGames}
        onSignOut={onSignOut}
        onOpenProfile={onOpenProfile}
        onOpenHelp={onOpenHelp}
        onOpenRank={onOpenRank}
        onOpenSettings={onOpenSettings}
      />

      {showSidebar && sidebarProps ? (
        <main className="app-main flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {/* PC 端左侧栏固定宽度，移动端导航交给 MobileFooter。 */}
          <aside className="app-sidebar hidden w-[276px] shrink-0 self-stretch overflow-hidden lg:flex lg:flex-col">
            <div className="min-h-0 flex-1 overflow-hidden">
              <AppLayoutSidebar {...sidebarProps} />
            </div>
          </aside>
          {/* 页面内容区域默认铺满右侧剩余空间，具体页面只需要管理自己的内部布局。 */}
          <div
            ref={captureScrollContainerRef}
            data-app-scroll-root
            className="app-content min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto rounded-none border-0 bg-transparent shadow-none lg:h-full lg:overflow-y-auto"
          >
            <div className={contentInnerClassName}>{children}</div>
          </div>
        </main>
      ) : (
        <main
          ref={captureScrollContainerRef}
          data-app-scroll-root
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto lg:overflow-y-auto"
        >
          <div className={contentInnerClassName}>{children}</div>
        </main>
      )}

      {showFooter ? (
        <div className="pointer-events-none shrink-0 border-0 bg-transparent p-0 lg:hidden">
          <AppLayoutFooter mobileTabBarVisible={mobileTabBarVisible} />
        </div>
      ) : null}
    </div>
  );
}

export type { SidebarHotTag, SidebarHotTopic, ViewType };
