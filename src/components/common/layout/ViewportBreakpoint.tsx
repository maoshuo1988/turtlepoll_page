/** 文件说明：768 断点显隐容器，对应 Tian webView / mobileView。 */
import type { ReactNode } from 'react';
import styles from '@/styles/viewport-breakpoint.module.scss';

type ViewportBreakpointProps = {
  children: ReactNode;
  className?: string;
};

export function ViewportDesktopOnly({ children, className }: ViewportBreakpointProps) {
  return <div className={[styles.webOnly, className].filter(Boolean).join(' ')}>{children}</div>;
}

export function ViewportMobileOnly({ children, className }: ViewportBreakpointProps) {
  return <div className={[styles.mobileOnly, className].filter(Boolean).join(' ')}>{children}</div>;
}
