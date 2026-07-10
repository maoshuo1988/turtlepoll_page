/** 文件说明：移动端一级 Tab 页与二级页路由判断（顶栏/底栏显隐共用）。 */
const MOBILE_TABBAR_PATHS = ['/', '/messages', '/mine', '/profile'] as const;

export function isMobileTabBarRoute(pathname: string): boolean {
  return (MOBILE_TABBAR_PATHS as readonly string[]).includes(pathname);
}

/** 移动端全局顶栏：一级 Tab 与二级页均展示（底栏仍仅 Tab 页显示）。 */
export function shouldShowMobileHeader(_pathname: string): boolean {
  return true;
}
