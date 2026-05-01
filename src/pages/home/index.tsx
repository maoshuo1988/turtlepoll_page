import AppShell from '@/app/AppShell';

export default function HomePage() {
  // 根路径首页，对应左侧“暗盘”。
  return <AppShell routeView="predictions" />;
}
