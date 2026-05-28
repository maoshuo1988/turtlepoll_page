/**
 * 文件说明：Standalone Page Shell，布局组件层，承接 Header、Footer、Sidebar 和页面内容区域。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { useQueryClient } from 'react-query';
import { useLocation, useNavigate } from '@umijs/renderer-react';
import { AppPageLayout, type SidebarHotTag, type SidebarHotTopic, type ViewType } from './AppPageLayout';
import { AuthModal } from '@/components/common/auth/AuthModal';
import { GuideTourModal } from '@/components/common/layout/GuideTourModal';
import { getPetDisplayAvatar, getPetMoodLabel } from '@/components/common/pet/petDisplay';
import { getPetIdleDialogues } from '@/components/common/pet/petDialogue';
import { mapMarketToPredictionCard, type PredictionCardItem } from '@/components/common/predictions/predictionCards';
import { useAppSession } from '@/hooks/useAppSession';
import { battleQueryKeys } from '@/hooks/useBattleRequests';
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
import { AUTH_REQUIRED_EVENT, clearAuthRequiredFlag, clearInfo, getAuthToken, hasAuthRequiredFlag, requireAuthOrOpen } from '@/utils/authStorage';

const THEME_KEY = 'theme';

export type ThemeMode = 'light' | 'dark';

/** StandalonePageShell 向子页面注入的布局上下文（函数式 children）。 */
export type HomeShellRenderProps = {
  darkMode: boolean;
  onToggleTheme: () => void;
  aiPushMessages: AiPushMessage[];
};

// 连接业务数据和纯展示 layout 的页面壳参数。
type StandalonePageShellProps = {
  children: React.ReactNode | ((context: HomeShellRenderProps) => React.ReactNode);
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
  turtleContest: '/turtle-contest',
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
  contentClassName = 'min-h-full w-full px-0 pt-0 pb-0',
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
  const [guideTourOpen, setGuideTourOpen] = useState(false);
  const signOutMutation = useRequestSignout();
  const darkMode = theme === 'dark';
  const { coinMe } = useAppSession();
  const isAuthenticated = Boolean(getAuthToken());
  const isEventBattleRoute = location.pathname === '/event-battle';
  // 左侧栏宠物卡片需要同时读取装备、拥有、体力和心情状态。
  const petEquipQuery = useRequestPetEquip();
  const petOwnedQuery = useRequestPetOwned();
  const petStaminaQuery = useRequestPetStamina();
  const petStatusQuery = useRequestPetStatus();
  const footballMarkets = useRequestFootballMarkets({ page: 1, limit: 20 });
  const aiUnreadPushesQuery = useRequestAiUnreadPushes(20, isAuthenticated && !isEventBattleRoute);
  const aiPushesReadMutation = useRequestAiPushesRead();
  const aiPresenceMutation = useRequestAiPresence();
  const displayedAiPushIdsRef = useRef<Set<string>>(new Set());
  const aiPushesReadAsyncRef = useRef(aiPushesReadMutation.mutateAsync);
  const aiPresenceMutateRef = useRef(aiPresenceMutation.mutate);
  const aiPetDialogueTimerRef = useRef<number | null>(null);
  const [sidebarBalance, setSidebarBalance] = useState(0);
  const [sidebarPetStamina, setSidebarPetStamina] = useState(0);
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
    enabled: isAuthenticated && !isEventBattleRoute,
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

  // 钱包和体力接口有数据后同步到侧边栏展示。
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

  const sidebarPet = useMemo(() => {
    const equippedOwnedPet = findEquippedOwnedPet(petOwnedQuery.data);
    const petKey = petEquipQuery.data?.petKey ?? equippedOwnedPet?.petKey;
    const petName = petEquipQuery.data?.petName ?? equippedOwnedPet?.petName ?? '';

    return {
      name: petName,
      status: getPetMoodLabel(petStatusQuery.data?.moodState) ?? '',
      level: petEquipQuery.data?.level ?? equippedOwnedPet?.level ?? 0,
      stamina: sidebarPetStamina,
      maxStamina: petStaminaQuery.data?.cap ?? 0,
      avatar: getPetDisplayAvatar(petKey, petName),
      petKey,
      petId: petEquipQuery.data?.petId,
      icon: petEquipQuery.data?.icon,
      image: petEquipQuery.data?.image,
      rarityKey: petEquipQuery.data?.rarity ?? equippedOwnedPet?.rarity,
    };
  }, [
    petEquipQuery.data?.icon,
    petEquipQuery.data?.image,
    petEquipQuery.data?.level,
    petEquipQuery.data?.petKey,
    petEquipQuery.data?.petName,
    petEquipQuery.data?.petId,
    petEquipQuery.data?.rarity,
    petOwnedQuery.data,
    petStatusQuery.data?.moodState,
    petStaminaQuery.data?.cap,
    sidebarPetStamina,
  ]);

  const sidebarNews = useMemo<PredictionCardItem[]>(() => {
    const list = footballMarkets.data?.list ?? [];
    if (!Array.isArray(list) || list.length === 0) {
      return [];
    }

    return list.map(mapMarketToPredictionCard);
  }, [footballMarkets.data]);

  const sidebarNewsByMarketId = useMemo(
    () => new Map(sidebarNews.filter((item) => typeof item.marketId === 'number').map((item) => [item.marketId as number, item])),
    [sidebarNews],
  );
  const sidebarIdleDialogues = useMemo(() => getPetIdleDialogues(petStatusQuery.data), [petStatusQuery.data]);

  // 侧边栏导航统一从这里跳转，避免 Sidebar 内部直接依赖路由实现。
  const handleSidebarViewChange = useCallback((view: ViewType, topic?: SidebarHotTopic, tag?: SidebarHotTag | null) => {
    const navigateInApp = (path: string, state?: unknown) => {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (currentPath !== path) {
        navigate(path, state === undefined ? undefined : { state });
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
    if (view === 'turtleContest') {
      navigateInApp('/turtle-contest');
      return;
    }
    if (view === 'predictions') {
      if (topic?.context?.marketId) {
        const params = new URLSearchParams();
        params.set('market', String(topic.context.marketId));
        if (topic.tag) {
          params.set('tag', topic.tag.replace(/^#/, ''));
        }
        navigateInApp(`/?${params.toString()}`, { sidebarTopic: topic });
        return;
      }
      if (tag?.tag) {
        const params = new URLSearchParams();
        params.set('tag', tag.tag.replace(/^#/, ''));
        navigateInApp(`/?${params.toString()}`);
        return;
      }
    }

    navigateInApp(ROUTE_PATHS[view] ?? '/');
  }, [navigate]);

  const handleOpenGuideTour = useCallback(() => {
    setGuideTourOpen(true);
  }, []);

  const handleRequireAuthNavigation = useCallback((path: string) => {
    if (!requireAuthOrOpen(() => onAuthModalOpenChange(true))) return;

    navigate(path);
  }, [navigate, onAuthModalOpenChange]);

  // showSidebar=false 的页面不需要传 sidebarProps，普通业务页都会进入这里。
  const sidebarProps = activeView
      ? {
        balance: sidebarBalance,
        pet: sidebarPet,
        newsByMarketId: sidebarNewsByMarketId,
        petDialogue: aiPetDialogue,
        aiPushMessages,
        idleDialogues: sidebarIdleDialogues,
        activeView,
        onOpenAuth: () => onAuthModalOpenChange(true),
        onViewChange: handleSidebarViewChange,
      }
    : undefined;

  // 退出登录后清掉和当前用户强相关的缓存，防止下个用户看到旧数据。
  const clearSessionCaches = useCallback(() => {
    queryClient.removeQueries(['requestUserCurrent']);
    queryClient.removeQueries(['requestBadgeBadges']);
    queryClient.removeQueries(['requestUserMsgRecent']);
    queryClient.removeQueries(['requestFootballMarkets']);
    queryClient.removeQueries(battleQueryKeys.all);
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
    clearAuthRequiredFlag();
    onAuthSuccess?.();
    onAuthModalOpenChange(false);
  }, [onAuthModalOpenChange, onAuthSuccess]);

  useEffect(() => {
    const handleAuthRequired = () => {
      clearSessionCaches();
      onAuthModalOpenChange(true);
    };

    if (hasAuthRequiredFlag()) {
      handleAuthRequired();
    }

    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
    return () => {
      window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
    };
  }, [clearSessionCaches, onAuthModalOpenChange]);

  const resolvedContentClassName =
    activeView === 'profile'
      ? `${contentClassName} lg:h-full lg:min-h-full lg:bg-[#080808]`
      : activeView === 'pet'
        ? `${contentClassName} px-3 pb-4 pt-[10px] lg:px-4`
        : contentClassName;

  return (
    <AppPageLayout
      contentClassName={resolvedContentClassName}
      mainClassName={activeView === 'profile' ? 'app-main-profile' : ''}
      darkMode={darkMode}
      onToggleTheme={handleToggleTheme}
      onOpenAuth={() => onAuthModalOpenChange(true)}
      onOpenGames={() => {
        navigate('/games');
      }}
      onSignOut={handleSignOut}
      onOpenProfile={() => {
        handleRequireAuthNavigation('/profile');
      }}
      onOpenHelp={handleOpenGuideTour}
      onOpenRank={() => {
        navigate('/rank');
      }}
      onOpenSettings={() => {
        if (!requireAuthOrOpen(() => onAuthModalOpenChange(true))) return;

        navigate({ pathname: '/profile', hash: 'settings' });
      }}
      showSidebar={showSidebar && Boolean(sidebarProps)}
      sidebarProps={sidebarProps}
    >
      {typeof children === 'function' ? children({ darkMode, onToggleTheme: handleToggleTheme, aiPushMessages }) : children}

      <AuthModal
        open={authModalOpen}
        onClose={() => onAuthModalOpenChange(false)}
        onSignOut={handleSignOut}
        onAuthSuccess={handleAuthSuccess}
      />

      <GuideTourModal open={guideTourOpen} onClose={() => setGuideTourOpen(false)} />
    </AppPageLayout>
  );
}
