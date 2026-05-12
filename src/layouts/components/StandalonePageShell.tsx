/**
 * 文件说明：Standalone Page Shell，布局组件层，承接 Header、Footer、Sidebar 和页面内容区域。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { useQueryClient } from 'react-query';
import { useLocation, useNavigate } from '@umijs/renderer-react';
import { AppPageLayout, type SidebarHotTag, type SidebarHotTopic, type ViewType } from './AppPageLayout';
import { AuthModal } from '@/components/shared/auth';
import { getPetMoodLabel } from '@/components/shared/pet/ui/petDisplay';
import { mapMarketToPredictionCard, type PredictionCardItem } from '@/components/shared/predictions/ui/predictionCards';
import { heroNews, mockNews, mockPetSkins, mockUser, petDialogues } from '@/data/mockData';
import { useAppSession } from '@/hooks/useAppSession';
import { COIN_ME_QUERY_KEY } from '@/hooks/useCoinRequests';
import {
  PET_EQUIP_QUERY_KEY,
  PET_OWNED_QUERY_KEY,
  PET_STATUS_QUERY_KEY,
  PET_STAMINA_QUERY_KEY,
  findEquippedOwnedPet,
  useRequestPetEquip,
  useRequestPetOwned,
  useRequestPetStamina,
  useRequestPetStatus,
} from '@/hooks/usePetRequests';
import { useRequestFootballMarkets } from '@/hooks/usePredictionRequests';
import { useRequestSignout } from '@/hooks/useAuthRequests';
import {
  AI_STAMINA_QUERY_KEY,
  AI_UNREAD_PUSHES_QUERY_KEY,
  useAiPushStream,
  useRequestAiPresence,
  useRequestAiPushesRead,
  useRequestAiUnreadPushes,
} from '@/hooks/useAiRequests';
import type { AiPushMessage } from '@/hooks/aiTypes';
import { clearInfo, getAuthToken } from '@/utils/authStorage';

const THEME_KEY = 'theme';

export type ThemeMode = 'light' | 'dark';

// 连接业务数据和纯展示 layout 的页面壳参数。
type StandalonePageShellProps = {
  children: React.ReactNode | ((context: { darkMode: boolean; onToggleTheme: () => void }) => React.ReactNode);
  contentClassName?: string;
  activeView?: ViewType;
  showSidebar?: boolean;
  authModalOpen: boolean;
  onAuthModalOpenChange: (open: boolean) => void;
  onAuthSuccess?: () => void;
  onAfterSignOut?: () => void;
};

// 左侧栏点击后跳转到实际路由的表。
// 游戏类入口有独立处理逻辑，所以这里只放常规页面。
const ROUTE_PATHS: Partial<Record<ViewType, string>> = {
  worldCup: '/world-cup',
  predictions: '/',
  rivalry: '/rivalry',
  forum: '/forum',
  games: '/games',
  battlePlaza: '/battle-plaza',
  rank: '/rank',
  shop: '/shop',
  pet: '/pet',
  profile: '/profile',
  activePredictions: '/active-predictions',
};

// 初始主题优先读取本地存储，避免刷新后闪回默认主题。
function getInitialTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

// 将主题同步到 html 节点，Tailwind 的 dark variant 和浏览器表单色系都会跟着变化。
function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const isDark = mode === 'dark';
  root.classList.toggle('dark', isDark);
  root.setAttribute('data-theme', mode);
  root.style.colorScheme = mode;
}

/**
 * 业务页面壳。
 *
 * 这个组件负责把接口数据、登录态、宠物状态、主题状态组装成 AppPageLayout 需要的 props。
 * AppPageLayout 只做布局展示，这里才处理业务侧效果和缓存清理。
 */
export function StandalonePageShell({
  children,
  contentClassName = 'min-h-full w-full px-0 pb-12 pt-3',
  activeView,
  showSidebar = true,
  authModalOpen,
  onAuthModalOpenChange,
  onAuthSuccess,
  onAfterSignOut,
}: StandalonePageShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [aiPetDialogue, setAiPetDialogue] = useState<string | null>(null);
  const [aiPushMessages, setAiPushMessages] = useState<AiPushMessage[]>([]);
  const signOutMutation = useRequestSignout();
  const darkMode = theme === 'dark';
  const { coinMe } = useAppSession();
  const isAuthenticated = Boolean(getAuthToken());
  // 左侧栏宠物卡片需要同时读取装备、拥有、体力和心情状态。
  const petEquipQuery = useRequestPetEquip();
  const petOwnedQuery = useRequestPetOwned();
  const petStaminaQuery = useRequestPetStamina();
  const petStatusQuery = useRequestPetStatus();
  const footballMarkets = useRequestFootballMarkets({ page: 1, limit: 20 });
  const aiUnreadPushesQuery = useRequestAiUnreadPushes(20, isAuthenticated);
  const aiPushesReadMutation = useRequestAiPushesRead();
  const aiPresenceMutation = useRequestAiPresence();
  const displayedAiPushIdsRef = useRef<Set<string>>(new Set());
  const aiPushesReadAsyncRef = useRef(aiPushesReadMutation.mutateAsync);
  const aiPresenceMutateRef = useRef(aiPresenceMutation.mutate);
  const aiPetDialogueTimerRef = useRef<number | null>(null);
  const [sidebarBalance, setSidebarBalance] = useState(mockUser.balance);
  const [sidebarPetStamina, setSidebarPetStamina] = useState(mockUser.petInfo.stamina);
  const handleToggleTheme = useCallback(() => {
    setTheme((value) => (value === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    aiPushesReadAsyncRef.current = aiPushesReadMutation.mutateAsync;
  }, [aiPushesReadMutation.mutateAsync]);

  useEffect(() => {
    aiPresenceMutateRef.current = aiPresenceMutation.mutate;
  }, [aiPresenceMutation.mutate]);

  const currentAiPresencePage = useMemo(() => {
    if (activeView === 'predictions') return 'predict_market';
    if (activeView === 'activePredictions') return 'predict_market';
    if (activeView === 'rivalry') return 'pk';
    if (activeView === 'battlePlaza') return 'battle_plaza';
    if (activeView === 'pet') return 'pet_chat';
    return activeView ?? (location.pathname.replace(/^\//, '') || 'predict_market');
  }, [activeView, location.pathname]);

  const appendAiPushMessages = useCallback((pushes: AiPushMessage[]) => {
    if (!pushes.length) return;

    const nextPushes = pushes.filter((push) => {
      const id = String(push.id);
      if (displayedAiPushIdsRef.current.has(id)) return false;
      displayedAiPushIdsRef.current.add(id);
      return true;
    });
    if (!nextPushes.length) return;

    setAiPushMessages((prev) => [...prev, ...nextPushes].slice(-20));
    setAiPetDialogue(nextPushes[nextPushes.length - 1]?.content ?? null);

    if (aiPetDialogueTimerRef.current) {
      window.clearTimeout(aiPetDialogueTimerRef.current);
    }
    aiPetDialogueTimerRef.current = window.setTimeout(() => {
      setAiPetDialogue(null);
      aiPetDialogueTimerRef.current = null;
    }, 12000);

    void aiPushesReadAsyncRef.current({
      ids: nextPushes.map((push) => push.id),
    });
  }, []);

  useEffect(() => {
    appendAiPushMessages(aiUnreadPushesQuery.data?.results ?? []);
  }, [appendAiPushMessages, aiUnreadPushesQuery.data?.results]);

  useAiPushStream({
    enabled: isAuthenticated,
    onPush: useCallback((message) => {
      appendAiPushMessages([message]);
    }, [appendAiPushMessages]),
  });

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const reportPresence = (active: boolean) => {
      aiPresenceMutateRef.current({
        page: currentAiPresencePage,
        active,
      });
    };

    reportPresence(!document.hidden);

    const handleVisibilityChange = () => {
      reportPresence(!document.hidden);
    };

    const interval = window.setInterval(() => {
      reportPresence(!document.hidden);
    }, 60 * 1000);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      reportPresence(false);
    };
  }, [currentAiPresencePage, isAuthenticated]);

  useEffect(() => () => {
    if (aiPetDialogueTimerRef.current) {
      window.clearTimeout(aiPetDialogueTimerRef.current);
    }
  }, []);

  // 钱包和体力接口有数据后，替换 mock 默认值，避免接口慢时页面空白。
  useEffect(() => {
    if (typeof coinMe.data?.balance === 'number') {
      setSidebarBalance(coinMe.data.balance);
    }
  }, [coinMe.data?.balance]);

  useEffect(() => {
    if (typeof petStaminaQuery.data?.current === 'number') {
      setSidebarPetStamina(petStaminaQuery.data.current);
    }
  }, [petStaminaQuery.data?.current]);

  // 左侧栏宠物展示数据的统一出口。
  // 后端没有返回的字段继续使用 mock 兜底，保证布局稳定。
  const sidebarPet = useMemo(() => {
    const equippedSkin = mockPetSkins.find((skin) => skin.equipped && skin.owned);
    const equippedOwnedPet = findEquippedOwnedPet(petOwnedQuery.data);

    return {
      ...mockUser.petInfo,
      name: petEquipQuery.data?.petName ?? mockUser.petInfo.name,
      status: getPetMoodLabel(petStatusQuery.data?.moodState) ?? mockUser.petInfo.status,
      level: petEquipQuery.data?.level ?? equippedOwnedPet?.level ?? mockUser.petInfo.level,
      stamina: sidebarPetStamina,
      maxStamina: petStaminaQuery.data?.cap ?? mockUser.petInfo.maxStamina,
      avatar: equippedSkin?.avatar ?? mockUser.petInfo.avatar,
    };
  }, [
    petEquipQuery.data?.level,
    petEquipQuery.data?.petName,
    petOwnedQuery.data,
    petStatusQuery.data?.moodState,
    petStaminaQuery.data?.cap,
    sidebarPetStamina,
  ]);

  // 侧边栏热榜需要预测市场数据；接口为空时用本地 mock 保持内容密度。
  const sidebarNews = useMemo<PredictionCardItem[]>(() => {
    const list = footballMarkets.data?.list ?? [];
    if (!Array.isArray(list) || list.length === 0) {
      return [heroNews, ...mockNews] as PredictionCardItem[];
    }

    return list.map(mapMarketToPredictionCard);
  }, [footballMarkets.data]);

  const sidebarNewsByMarketId = useMemo(
    () => new Map(sidebarNews.filter((item) => typeof item.marketId === 'number').map((item) => [item.marketId as number, item])),
    [sidebarNews],
  );

  // 侧边栏导航统一从这里跳转，避免 Sidebar 内部直接依赖路由实现。
  const handleSidebarViewChange = useCallback((view: ViewType, _topic?: SidebarHotTopic, _tag?: SidebarHotTag | null) => {
    const navigateInApp = (path: string) => {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (currentPath !== path) {
        navigate(path);
      }
    };

    if (view === 'jump') {
      navigateInApp('/jump');
      return;
    }
    if (view === 'lab') {
      window.location.href = '/games/turtle-jump/index.html';
      return;
    }
    if (view === 'battle') {
      window.location.href = '/games/turtle-battle/index.html';
      return;
    }

    navigateInApp(ROUTE_PATHS[view] ?? '/');
  }, [navigate]);

  // showSidebar=false 的页面不需要传 sidebarProps，普通业务页都会进入这里。
  const sidebarProps = activeView
    ? {
        balance: sidebarBalance,
        winStreak: mockUser.winStreak,
        winRate: 0.68,
        totalPredictions: 42,
        activePredictions: sidebarNews.filter((item) => item.status === 'open').length,
        pet: sidebarPet,
        newsByMarketId: sidebarNewsByMarketId,
        petDialogue: aiPetDialogue,
        aiPushMessages,
        idleDialogues: petDialogues.idle,
        activeView,
        onViewChange: handleSidebarViewChange,
      }
    : undefined;

  // 退出登录后清掉和当前用户强相关的缓存，防止下个用户看到旧数据。
  const clearSessionCaches = useCallback(() => {
    queryClient.removeQueries(['requestUserCurrent']);
    queryClient.removeQueries(['requestBadgeBadges']);
    queryClient.removeQueries(['requestUserMsgRecent']);
    queryClient.removeQueries(['requestFootballMarkets']);
    queryClient.removeQueries(COIN_ME_QUERY_KEY);
    queryClient.removeQueries(PET_EQUIP_QUERY_KEY);
    queryClient.removeQueries(PET_OWNED_QUERY_KEY);
    queryClient.removeQueries(PET_STAMINA_QUERY_KEY);
    queryClient.removeQueries(PET_STATUS_QUERY_KEY);
    queryClient.removeQueries(AI_STAMINA_QUERY_KEY);
    queryClient.removeQueries(AI_UNREAD_PUSHES_QUERY_KEY);
    setAiPetDialogue(null);
    setAiPushMessages([]);
    displayedAiPushIdsRef.current.clear();
  }, [queryClient]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOutMutation.mutateAsync();
    } finally {
      clearInfo();
      clearSessionCaches();
      onAuthModalOpenChange(false);
      onAfterSignOut?.();
    }
  }, [clearSessionCaches, onAfterSignOut, onAuthModalOpenChange, signOutMutation]);

  const handleAuthSuccess = useCallback(() => {
    onAuthSuccess?.();
    onAuthModalOpenChange(false);
  }, [onAuthModalOpenChange, onAuthSuccess]);

  return (
    <AppPageLayout
      contentClassName={contentClassName}
      darkMode={darkMode}
      onToggleTheme={handleToggleTheme}
      onOpenAuth={() => onAuthModalOpenChange(true)}
      onOpenGames={() => {
        navigate('/games');
      }}
      showSidebar={showSidebar && Boolean(sidebarProps)}
      sidebarProps={sidebarProps}
    >
      {typeof children === 'function' ? children({ darkMode, onToggleTheme: handleToggleTheme }) : children}

      <AuthModal
        open={authModalOpen}
        onClose={() => onAuthModalOpenChange(false)}
        onSignOut={handleSignOut}
        onAuthSuccess={handleAuthSuccess}
      />
    </AppPageLayout>
  );
}
