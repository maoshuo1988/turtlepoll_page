/**
 * 文件说明：index，Umi layout 入口，负责路由嵌套和页面壳挂载。
 */
import { Suspense } from 'react';
import { Outlet } from '@umijs/renderer-react';
import { OperationToastHost } from '@/components/common/feedback/OperationToast';

/**
 * Umi 根 layout。
 *
 * 这里保持尽量薄，只负责包一层 Suspense。
 * 具体业务骨架放在 home.tsx，和参考项目的 layouts/index.tsx 职责一致。
 */
export default function Layout() {
  return (
    <Suspense fallback={<div />}>
      <Outlet />
      <OperationToastHost />
    </Suspense>
  );
}
