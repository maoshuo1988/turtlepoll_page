/**
 * 文件说明：需要登录的路由访问拦截。
 */
import type { ReactNode } from 'react';
import { LoginRequiredPage } from '@/components/common/state/PageState';
import { useHomeLayoutContext } from '@/layouts/context';
import { getAuthToken, markAuthRequired } from '@/utils/authStorage';

interface RequireAuthProps {
  children: ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const { onOpenAuth } = useHomeLayoutContext();
  const isAuthenticated = Boolean(getAuthToken());

  if (!isAuthenticated) {
    markAuthRequired();
    return (
      <LoginRequiredPage
        description="登录后即可查看和管理你的专属内容。"
        actionLabel="去登录"
        onAction={onOpenAuth}
      />
    );
  }

  return <>{children}</>;
}
