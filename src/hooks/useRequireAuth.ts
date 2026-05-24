/**
 * 文件说明：封装登录态校验，未登录时统一打开登录弹框。
 */
import { useCallback } from 'react';
import { useHomeLayoutContext } from '@/layouts/context';
import { requireAuthOrOpen } from '@/utils/authStorage';

export function useRequireAuth(openAuthOverride?: () => void) {
  const { onOpenAuth } = useHomeLayoutContext();
  const openAuth = openAuthOverride ?? onOpenAuth;

  return useCallback(() => requireAuthOrOpen(openAuth), [openAuth]);
}
