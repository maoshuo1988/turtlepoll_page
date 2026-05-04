/**
 * 文件说明：App Page Layout，布局组件层，承接 Header、Footer、Sidebar 和页面内容区域。
 */
import type React from 'react';
import { MobileFooter, PcFooter } from '@/components/Footer';
import { MobileHeader, PcHeader } from '@/components/Header';
import { Sidebar } from '@/components/layout';
import type { SidebarHotTag, SidebarHotTopic } from '@/components/shared/layout';
import type { ViewType } from '@/components/layout';

type HeaderProps = {
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenAuth: () => void;
  onOpenGames?: () => void;
};

type SidebarProps = React.ComponentProps<typeof Sidebar>;

// 页面布局最底层的展示参数，只负责“怎么摆”，不关心业务数据从哪里来。
type AppPageLayoutProps = HeaderProps & {
  children: React.ReactNode;
  contentClassName?: string;
  footerClassName?: string;
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
  return (
    <>
      <PcHeader
        darkMode={props.darkMode}
        onToggleTheme={props.onToggleTheme}
        onOpenAuth={props.onOpenAuth}
      />
      <MobileHeader
        darkMode={props.darkMode}
        onOpenGames={props.onOpenGames ?? (() => {
          window.location.href = '/games';
        })}
      />
    </>
  );
}

/**
 * 应用底部区域。
 *
 * PC 展示普通 footer，移动端展示底部选项卡导航。
 */
export function AppLayoutFooter() {
  return (
    <>
      <div className="hidden lg:block">
        <PcFooter />
      </div>
      <div className="lg:hidden">
        <MobileFooter />
      </div>
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
  contentClassName = 'min-h-full w-full px-0 pb-12 pt-3',
  footerClassName = 'border-t border-white/8 bg-[#080808]/96 px-3 py-3 dark:border-rdark-border dark:bg-rdark/96',
  darkMode,
  onToggleTheme,
  onOpenAuth,
  onOpenGames,
  sidebarProps,
  showSidebar = false,
  showFooter = true,
}: AppPageLayoutProps) {
  return (
    <div className="legacy-fusion-app fixed-sidebar-style flex h-screen flex-col overflow-hidden bg-[#080808] text-white transition-colors dark:bg-rdark">
      <AppLayoutHeader
        darkMode={darkMode}
        onToggleTheme={onToggleTheme}
        onOpenAuth={onOpenAuth}
        onOpenGames={onOpenGames}
      />

      {showSidebar && sidebarProps ? (
        <main className="app-main flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row lg:gap-6">
          {/* PC 端左侧栏固定宽度，移动端导航交给 MobileFooter。 */}
          <aside className="app-sidebar hidden w-[260px] shrink-0 self-stretch overflow-hidden lg:flex lg:flex-col">
            <div className="min-h-0 flex-1 overflow-hidden">
              <AppLayoutSidebar {...sidebarProps} />
            </div>
          </aside>
          {/* 页面内容区域默认铺满右侧剩余空间，具体页面只需要管理自己的内部布局。 */}
          <div className="app-content min-w-0 flex-1 overflow-x-hidden lg:h-full lg:min-h-0 lg:overflow-y-auto">
            <div className={contentClassName}>{children}</div>
          </div>
        </main>
      ) : (
        <main className={`min-h-0 flex-1 overflow-y-auto ${contentClassName}`}>{children}</main>
      )}

      {showFooter ? (
        <div className={footerClassName}>
          <AppLayoutFooter />
        </div>
      ) : null}
    </div>
  );
}

export type { SidebarHotTag, SidebarHotTopic, ViewType };
