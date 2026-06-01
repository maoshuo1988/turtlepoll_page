/** 文件说明：主布局内容区（data-app-scroll-root）滚动控制。 */

export function scrollAppContentToTop(behavior: ScrollBehavior = 'auto'): void {
  const root = document.querySelector('[data-app-scroll-root]');
  if (!(root instanceof HTMLElement)) return;
  root.scrollTo({ top: 0, left: 0, behavior });
}
