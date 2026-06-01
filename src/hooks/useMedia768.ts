/**
 * 文件说明：768px 以下视为移动端内容区（与 Tian-Website useMedia768 一致，用于资源/结构分叉）。
 */
import { useEffect, useState } from 'react';
import { VP_MOBILE_MQ } from '@/utils/viewport';

function readMatches(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(VP_MOBILE_MQ).matches;
}

export function useMedia768(): boolean {
  const [isMobile, setIsMobile] = useState(readMatches);

  useEffect(() => {
    const mq = window.matchMedia(VP_MOBILE_MQ);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
