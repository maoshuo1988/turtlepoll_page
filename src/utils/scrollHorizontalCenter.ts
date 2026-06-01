/** 文件说明：横向滚动容器内将子元素滚到可视区域水平居中。 */

export function scrollChildToHorizontalCenter(
  container: HTMLElement,
  child: HTMLElement,
  behavior: ScrollBehavior = 'smooth',
): void {
  const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
  if (maxScroll <= 0) return;

  const containerRect = container.getBoundingClientRect();
  const childRect = child.getBoundingClientRect();
  const childCenterInContent =
    childRect.left - containerRect.left + container.scrollLeft + childRect.width / 2;
  const targetScrollLeft = childCenterInContent - container.clientWidth / 2;

  container.scrollTo({
    left: Math.max(0, Math.min(targetScrollLeft, maxScroll)),
    behavior,
  });
}
