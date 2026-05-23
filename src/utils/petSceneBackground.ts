/**
 * 文件说明：宠物场景昼夜判断，18:00–次日 07:00 使用夜晚背景。
 */
import { useEffect, useState } from 'react';

export const isNightPetSceneHour = (hour: number) => hour >= 18 || hour < 7;

export function usePetSceneIsNight() {
  const readIsNight = () => isNightPetSceneHour(new Date().getHours());

  const [isNight, setIsNight] = useState(readIsNight);

  useEffect(() => {
    const sync = () => setIsNight(readIsNight());
    sync();
    const timerId = window.setInterval(sync, 60_000);
    return () => window.clearInterval(timerId);
  }, []);

  return isNight;
}

const MOBILE_MAX_WIDTH = 1023;

export function useIsMobileViewport() {
  const readIsMobile = () =>
    typeof window !== 'undefined'
      ? window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches
      : false;

  const [isMobile, setIsMobile] = useState(readIsMobile);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);
    const sync = () => setIsMobile(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener('change', sync);
    return () => mediaQuery.removeEventListener('change', sync);
  }, []);

  return isMobile;
}
