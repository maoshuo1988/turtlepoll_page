/**
 * 文件说明：进入视口后再挂载 Spine；可选离开视口后卸载以释放 WebGL。
 */
import { useCallback, useEffect, useState } from 'react';

function isElementVisibleInViewport(node: HTMLElement, rootMarginPx: number) {
  const rect = node.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return (
    rect.bottom > -rootMarginPx &&
    rect.top < vh + rootMarginPx &&
    rect.right > -rootMarginPx &&
    rect.left < vw + rootMarginPx
  );
}

interface UseLazyMountWhenVisibleOptions {
  enabled?: boolean;
  rootMargin?: string;
  /** 离开视口后卸载（释放 WebGL），黑市列表预览用 */
  releaseWhenHidden?: boolean;
}

export function useLazyMountWhenVisible({
  enabled = true,
  rootMargin = '80px',
  releaseWhenHidden = false,
}: UseLazyMountWhenVisibleOptions = {}) {
  const [hostNode, setHostNode] = useState<HTMLElement | null>(null);
  const [shouldMount, setShouldMount] = useState(!enabled);

  const hostRef = useCallback((node: HTMLElement | null) => {
    setHostNode(node);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setShouldMount(true);
      return undefined;
    }

    if (!hostNode) return undefined;

    const margin = Number.parseInt(rootMargin, 10) || 80;

    const applyVisibility = (visible: boolean) => {
      if (visible) {
        setShouldMount(true);
        return;
      }
      if (releaseWhenHidden) {
        setShouldMount(false);
      }
    };

    const recheckVisibility = () => {
      applyVisibility(isElementVisibleInViewport(hostNode, margin));
    };

    recheckVisibility();

    if (typeof IntersectionObserver === 'undefined') {
      setShouldMount(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        applyVisibility(entries[0]?.isIntersecting ?? false);
      },
      { root: null, rootMargin },
    );

    observer.observe(hostNode);
    window.addEventListener('scroll', recheckVisibility, true);
    window.addEventListener('resize', recheckVisibility);

    const fallbackTimer = window.setTimeout(recheckVisibility, 400);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener('scroll', recheckVisibility, true);
      window.removeEventListener('resize', recheckVisibility);
      observer.disconnect();
    };
  }, [enabled, hostNode, releaseWhenHidden, rootMargin]);

  return { hostRef, shouldMount };
}
