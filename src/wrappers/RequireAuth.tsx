/**
 * 文件说明：需要登录的路由访问拦截（Umi wrapper，通过 Outlet 渲染子页面）。
 */
import { useEffect, useRef, useState } from 'react';
import { Outlet } from '@umijs/renderer-react';
import { LoginRequiredPage } from '@/components/common/state/PageState';
import { useHomeLayoutContext } from '@/layouts/context';
import { AUTH_SESSION_CHANGED_EVENT, getAuthToken, markAuthRequired } from '@/utils/authStorage';

export default function RequireAuth() {
  const { onOpenAuth } = useHomeLayoutContext();
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getAuthToken()));
  const hasPromptedAuthRef = useRef(false);

  useEffect(() => {
    const syncAuthStatus = () => {
      setIsAuthenticated(Boolean(getAuthToken()));
    };

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncAuthStatus);
    window.addEventListener('storage', syncAuthStatus);
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncAuthStatus);
      window.removeEventListener('storage', syncAuthStatus);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      hasPromptedAuthRef.current = false;
      return;
    }

    markAuthRequired();
    if (!hasPromptedAuthRef.current) {
      hasPromptedAuthRef.current = true;
      onOpenAuth();
    }
  }, [isAuthenticated, onOpenAuth]);

  if (!isAuthenticated) {
    return (
      <LoginRequiredPage
        description="登录后即可查看和管理你的专属内容。"
        actionLabel="去登录"
        onAction={onOpenAuth}
      />
    );
  }

  return <Outlet />;
}
