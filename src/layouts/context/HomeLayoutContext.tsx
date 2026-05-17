/**
 * 文件说明：Home Layout Context，布局上下文，向页面暴露主题和登录弹窗等 layout 能力。
 */
import { createContext, useContext } from 'react';
import type React from 'react';
import type { AiPushMessage } from '@/hooks/aiTypes';

type HomeLayoutContextValue = {
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenAuth: () => void;
  /** 与 PC 侧栏宠物卡片一致的 AI 推送流，供宠物页 AI 对话去重展示 */
  aiPushMessages: AiPushMessage[];
};

// 页面需要调用 layout 能力时走这个 context。
// 例如商城下注前需要拉起登录弹窗，但不应该直接持有 AuthModal。
const HomeLayoutContext = createContext<HomeLayoutContextValue | null>(null);

/**
 * HomeLayout 的能力提供者。
 *
 * 只放跨页面都需要的 layout 行为，页面自己的业务状态不要塞进这里。
 */
export function HomeLayoutProvider({
  value,
  children,
}: {
  value: HomeLayoutContextValue;
  children: React.ReactNode;
}) {
  return (
    <HomeLayoutContext.Provider value={value}>
      {children}
    </HomeLayoutContext.Provider>
  );
}

// 页面在 layout 外被单独渲染时返回安全兜底，方便组件测试和独立预览。
export function useHomeLayoutContext() {
  const context = useContext(HomeLayoutContext);
  if (!context) {
    return {
      darkMode: true,
      onToggleTheme: () => {},
      onOpenAuth: () => {},
      aiPushMessages: [] as AiPushMessage[],
    };
  }

  return context;
}
