/**
 * 文件说明：index，布局组件层，承接 Header、Footer、Sidebar 和页面内容区域。
 */
// layouts/components 的统一出口。
// 路由 layout 和页面只从这里取页面壳，减少对子文件路径的依赖。
export {
  AppLayoutFooter,
  AppLayoutHeader,
  AppLayoutSidebar,
  AppPageLayout,
} from './AppPageLayout';
export type { SidebarHotTag, SidebarHotTopic, ViewType } from './AppPageLayout';
export { StandalonePageShell } from './StandalonePageShell';
export type { HomeShellRenderProps } from './StandalonePageShell';
