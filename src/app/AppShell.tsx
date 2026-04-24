import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { Sidebar } from '../components/layout';
import type { ViewType } from '../components/layout';
import { ActivePredictionsPage, EventBattle, PredictionsView } from '../components/shared/predictions';
import { Forum } from '../components/shared/forum';
import { ForumCompose } from '../components/shared/forum/ui/ForumCompose';
import type { TopicPostTag } from '../components/shared/forum/ui/TopicPostCard';
import { Shop } from '../components/shared/shop';
import { TopicDetail } from '../components/shared/topic';
import { BattleSquarePixel } from '../components/shared/battle';
import { BattleSquarePixel as BattlePlaza6c47700 } from '../components/shared/battlePlaza6c47700';
import { GameHubPage } from '../components/shared/game';
import { TurtleDivePixel, TurtleJumpPixel } from '../components/shared/lab';
import { RankPage } from '../components/shared/rank';
import { PetPage } from '../components/shared/pet';
import { ProfilePage } from '../components/shared/profile';
import { RivalryPK } from '../components/shared/rivalry';
import { FloatingPetChat } from '../components/shared/layout';
import { AppFooter, AppHeader, FloatingGuideButton } from './pc';
import { MobileTopBar, MobilePredictionTopTabs, type MobilePredictionTopTabKey } from './mobile/home';
import { MobilePredictionMarketDetail, MobilePredictionMarketList } from './mobile/predictionMarket';
import { MobileProfileAuthPage, MobileProfileHome, MobileProfileSettingsPage } from './mobile/profile';
import { MobileFloatingActions } from './mobile/pet';
import { MobileTabBar } from './mobile/shared';
import { GuideTourModal } from './GuideTourModal';
import { AuthModal } from '../components/shared/auth';
import type { MockForumEntry, PetSkin } from '../data/mock_data';
import {
  mockUser,
  mockNews,
  heroNews,
  petDialogues,
  mockCommunityPosts,
  mockPetSkins,
} from '../data/mock_data';
import { clearInfo } from '@/utils/authStorage';
import type { PlaceBetResult } from '@/hook/coinType';
import { useRequestBadgeBadges, useRequestConfigConfigs, useRequestSignout, useRequestUserMsgRecent } from '@/hook/useRequest';
import { useRequestFootballMarkets } from '@/hook/usePredictRequest';
import {
  PET_EQUIP_QUERY_KEY,
  PET_OWNED_QUERY_KEY,
  PET_STATUS_QUERY_KEY,
  PET_STAMINA_QUERY_KEY,
  findEquippedOwnedPet,
  useRequestPetEquip,
  useRequestPetEquipUpdate,
  useRequestPetOwned,
  useRequestPetStamina,
  useRequestPetStatus,
} from '@/hook/usePetRequest';
import { useRequestCreateTopic, useRequestTopicNodeNavs } from '@/hook/useTopicRequest';
import { useAppSession } from '@/hook/useAppSession';
import { mapMarketToPredictionCard, type PredictionCardItem } from '../components/shared/predictions/ui/predictionCard';
import type { SidebarHotTag, SidebarHotTopic } from '../components/shared/layout';
import { COIN_ME_QUERY_KEY, useRequestCoinBet } from '@/hook/useCoinRequest';
import { getPetMoodLabel } from '../components/shared/pet/ui/petDisplay';

// Bet cost per action
const BET_COST = 100;
const THEME_KEY = 'theme';
const MOBILE_PUSH_SETTING_KEY = 'mobile_push_enabled';
const MOBILE_MOTION_SETTING_KEY = 'mobile_motion_enabled';
type ThemeMode = 'light' | 'dark';
type MobileProfilePageKey = 'home' | 'auth' | 'settings';

function getInitialTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const isDark = mode === 'dark';
  root.classList.toggle('dark', isDark);
  root.setAttribute('data-theme', mode);
  root.style.colorScheme = mode;
}

function getInitialBooleanSetting(key: string, fallback: boolean) {
  const stored = localStorage.getItem(key);
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return fallback;
}

function getFullscreenGame() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('fullscreen_game');
}

function getInitialView(): ViewType {
  if (typeof window === 'undefined') return 'predictions';
  const view = new URLSearchParams(window.location.search).get('view');
  if (view === 'games') return 'games';
  if (view === 'battlePlaza6c47700') return 'battlePlaza6c47700';
  return window.innerWidth < 1024 ? 'forum' : 'predictions';
}

function openJumpStandalone() {
  if (typeof window === 'undefined') return;
  window.location.href = '/?fullscreen_game=jump';
}

function openLabStandalone() {
  if (typeof window === 'undefined') return;
  window.location.href = '/games/turtle-jump/index.html';
}

function openBattleStandalone() {
  if (typeof window === 'undefined') return;
  window.location.href = '/games/turtle-battle/index.html';
}

function App() {
  // 主题
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const darkMode = theme === 'dark';
  const fullscreenGame = getFullscreenGame();

  //话题
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [balance, setBalance] = useState(mockUser.balance);
  const [petDialogue, setPetDialogue] = useState<string | null>(null);
  
  const [activeView, setActiveView] = useState<ViewType>(() => getInitialView());
  const [communityPosts] = useState<MockForumEntry[]>(mockCommunityPosts);
  const [floatingChatOpen, setFloatingChatOpen] = useState(false);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [selectedBattleItem, setSelectedBattleItem] = useState<PredictionCardItem | null>(null);
  const [battleOriginView, setBattleOriginView] = useState<ViewType>('predictions');
  const [guideOpen, setGuideOpen] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<string, 'A' | 'B'>>({});
  const [petStamina, setPetStamina] = useState(mockUser.petInfo.stamina);
  const [skins, setSkins] = useState<PetSkin[]>(mockPetSkins);
  const [selectedTopic, setSelectedTopic] = useState<SidebarHotTopic | null>(null);
  const [selectedMobilePredictionItem, setSelectedMobilePredictionItem] = useState<PredictionCardItem | null>(null);
  const [mobilePredictionBattleReturnMode, setMobilePredictionBattleReturnMode] = useState<'list' | 'detail' | null>(null);
  const [mobilePredictionBattleReturnItem, setMobilePredictionBattleReturnItem] = useState<PredictionCardItem | null>(null);
  /**
   * Mobile home tabs:
   * 手机端“首页”顶部固定的五个分类。
   * 这里统一管理首页频道顺序，避免以后顶部分类和底部发布按钮互相干扰。
   */
  const [mobileHomeTab, setMobileHomeTab] = useState<MobilePredictionTopTabKey>('latest_feed');
  /**
   * Mobile global compose:
   * 手机端发布层从首页帖子流里彻底独立出来。
   * 后面无论停留在首页、开战、宠物还是我的页面，只有中间加号才会打开这个全局弹层。
   */
  const [mobileGlobalComposeSignal, setMobileGlobalComposeSignal] = useState(0);
  /**
   * Mobile lab return view:
   * 手机端从顶部游戏入口进入小游戏时，记录进入前所在主页面。
   * 这样返回时就能回到原来的页面，而不是写死跳回某个默认页。
   */
  const [mobileLabReturnView, setMobileLabReturnView] = useState<ViewType>('predictions');
  /**
   * Mobile profile route:
   * 手机端“我的”页内子路由。
   * 这里把首页、登录模块、设置页拆开管理，避免再把所有东西塞回一个 shared profile 页面。
   */
  const [mobileProfilePage, setMobileProfilePage] = useState<MobileProfilePageKey>('home');
  const [mobilePushEnabled, setMobilePushEnabled] = useState<boolean>(() => getInitialBooleanSetting(MOBILE_PUSH_SETTING_KEY, true));
  const [mobileMotionEnabled, setMobileMotionEnabled] = useState<boolean>(() => getInitialBooleanSetting(MOBILE_MOTION_SETTING_KEY, true));
  
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [bettingMarketId, setBettingMarketId] = useState<number | null>(null);
  const isEventBattleActive = activeView === 'predictions' && !!(selectedNewsId || selectedBattleItem);
  const shouldShowDesktopFooter = !isEventBattleActive && activeView !== 'lab' && activeView !== 'jump';
  const usePredStyleLayout = true;
  const queryClient = useQueryClient();
  // 当前登录用户 + 金币账户
  const { userInfo, coinMe } = useAppSession();
  const petEquipQuery = useRequestPetEquip();
  const petOwnedQuery = useRequestPetOwned();
  const petStaminaQuery = useRequestPetStamina();
  const petStatusQuery = useRequestPetStatus();
  const petEquipMutation = useRequestPetEquipUpdate();

  //顶部站点信息/公告
  const configInfo = useRequestConfigConfigs()
  // console.log("configInfo ---- ",configInfo)

  //顶部未读消息摘要
  const userMsgRecent = useRequestUserMsgRecent()
  // console.log("userMsgRecent ---- ",userMsgRecent)

  //获取用户勋章列表
  const userBadge = useRequestBadgeBadges()
  // console.log("userBadge ---- ",userBadge)



  // 预测下注
  const coinBetMutation = useRequestCoinBet();
  // console.log("coinBetMutation ---- ", coinBetMutation)

  // 预测市场
  const footballMarkets = useRequestFootballMarkets({ page: 1, limit: 20 });
  // console.log("footballMarkets ---- ", footballMarkets)


  //退出登录请求
  const signOutMutation = useRequestSignout();
  const createTopicMutation = useRequestCreateTopic();
  const topicNodeNavsQuery = useRequestTopicNodeNavs();

  // Derive current pet avatar from equipped skin
  const equippedSkin = skins.find((s) => s.equipped && s.owned);
  const equippedOwnedPet = useMemo(() => findEquippedOwnedPet(petOwnedQuery.data), [petOwnedQuery.data]);
  const currentPet = useMemo(() => ({
    ...mockUser.petInfo,
    name: petEquipQuery.data?.petName ?? mockUser.petInfo.name,
    status: getPetMoodLabel(petStatusQuery.data?.moodState) ?? mockUser.petInfo.status,
    level: petEquipQuery.data?.level ?? equippedOwnedPet?.level ?? mockUser.petInfo.level,
    stamina: petStamina,
    maxStamina: petStaminaQuery.data?.cap ?? mockUser.petInfo.maxStamina,
    avatar: equippedSkin?.avatar ?? mockUser.petInfo.avatar,
  }), [
    equippedOwnedPet?.level,
    equippedSkin?.avatar,
    petEquipQuery.data?.level,
    petEquipQuery.data?.petName,
    petStamina,
    petStaminaQuery.data?.cap,
    petStatusQuery.data?.moodState,
  ]);

  const liveNews = useMemo<PredictionCardItem[]>(() => {
    const list = footballMarkets.data?.list ?? [];
    if (!Array.isArray(list) || list.length === 0) {
      return [heroNews, ...mockNews] as PredictionCardItem[];
    }
    return list.map(mapMarketToPredictionCard);
  }, [footballMarkets.data]);

  const heroNewsItem = useMemo<PredictionCardItem>(() => liveNews[0] ?? (heroNews as PredictionCardItem), [liveNews]);
  const predictionItems = useMemo<PredictionCardItem[]>(() => liveNews.slice(1), [liveNews]);
  const allNews = useMemo<PredictionCardItem[]>(() => [heroNewsItem, ...predictionItems], [heroNewsItem, predictionItems]);
  const activePredictionItems = useMemo(
    () => allNews.filter((item) => item.status === 'open'),
    [allNews],
  );
  const newsByMarketId = useMemo(() => new Map(allNews.filter((item) => typeof item.marketId === 'number').map((item) => [item.marketId as number, item])), [allNews]);

  /**
   * Mobile create node:
   * 手机端全局发布层需要一个默认可发布节点。
   * “最新 / 推荐 / 关注”这些首页分类本身不是可写节点，所以这里选第一个真实节点作为落点。
   */
  const mobileCreateNodeId = useMemo(() => {
    const firstCustomNode = (topicNodeNavsQuery.data ?? []).find((nav) => nav.id > 0);
    return firstCustomNode?.id ?? 1;
  }, [topicNodeNavsQuery.data]);

  // 余额跟随 coinMe 缓存同步，下注/结算成功后会自动联动到这里
  useEffect(() => {
    if (typeof coinMe.data?.balance !== 'number') return;
    setBalance(coinMe.data.balance);
  }, [coinMe.data?.balance]);

  useEffect(() => {
    if (typeof petStaminaQuery.data?.current !== 'number') return;
    setPetStamina(petStaminaQuery.data.current);
  }, [petStaminaQuery.data?.current]);

  const handleEquipSkin = useCallback((skinId: string) => {
    setSkins((prev) =>
      prev.map((skin) => ({
        ...skin,
        equipped: skin.id === skinId,
      })),
    );
  }, []);

  const refreshSessionData = useCallback(async () => {
    await Promise.all([
      userInfo.refetch(),
      coinMe.refetch(),
      petEquipQuery.refetch(),
      petOwnedQuery.refetch(),
      petStaminaQuery.refetch(),
      petStatusQuery.refetch(),
    ]);
  }, [coinMe, petEquipQuery, petOwnedQuery, petStaminaQuery, petStatusQuery, userInfo]);

  const clearSessionCaches = useCallback(() => {
    queryClient.removeQueries(["requestUserCurrent"]);
    queryClient.removeQueries(["requestBadgeBadges"]);
    queryClient.removeQueries(["requestUserMsgRecent"]);
    queryClient.removeQueries(["requestFootballMarkets"]);
    queryClient.removeQueries(COIN_ME_QUERY_KEY);
    queryClient.removeQueries(PET_EQUIP_QUERY_KEY);
    queryClient.removeQueries(PET_OWNED_QUERY_KEY);
    queryClient.removeQueries(PET_STAMINA_QUERY_KEY);
    queryClient.removeQueries(PET_STATUS_QUERY_KEY);
    setBalance(mockUser.balance);
    setPetStamina(mockUser.petInfo.stamina);
  }, [queryClient]);

  const handleSessionSignOut = useCallback(async () => {
    try {
      await signOutMutation.mutateAsync();
    } finally {
      clearInfo();
      clearSessionCaches();
      setAuthModalOpen(false);
      setMobileProfilePage('home');
    }
  }, [clearSessionCaches, signOutMutation]);

  const handleSessionAuthSuccess = useCallback(() => {
    void refreshSessionData();
    setAuthModalOpen(false);
    setMobileProfilePage('home');
  }, [refreshSessionData]);

  const handleEquipPet = useCallback(async (petId: number | string) => {
    const result = await petEquipMutation.mutateAsync({ petId });
    setPetDialogue(`已切换为 ${result.pet.petName ?? '新龟种'}。`);
    setTimeout(() => setPetDialogue(null), 3000);
    return result;
  }, [petEquipMutation]);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(MOBILE_PUSH_SETTING_KEY, String(mobilePushEnabled));
  }, [mobilePushEnabled]);

  useEffect(() => {
    localStorage.setItem(MOBILE_MOTION_SETTING_KEY, String(mobileMotionEnabled));
  }, [mobileMotionEnabled]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark') return;
      setTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // 这些全局请求和分类状态当前已接入，但暂时还没有完整消费 UI
  void userInfo;
  void configInfo;
  void userMsgRecent;
  void userBadge;
  void predictionItems;
  void petEquipQuery;
  void petOwnedQuery;
  void petStatusQuery;

  // 预测卡片下注成功后的 UI 联动：更新本地投票态并提示用户
  const handlePredictionBetSuccess = useCallback((item: PredictionCardItem, option: 'A' | 'B', result: PlaceBetResult) => {
    setUserVotes((prev) => ({ ...prev, [item.id]: option }));
    setPetDialogue(`下注成功，已锁定 ${result.lockedOdds.toFixed(2)}x，余额 ${result.userCoin.balance.toLocaleString()}。`);
    setTimeout(() => setPetDialogue(null), 3000);
  }, []);

  const handleBet = useCallback(
    async (newsId: string, option: 'A' | 'B', _odds: number, amount?: number) => {
      const targetNews = allNews.find((item) => item.id === newsId) ?? (selectedBattleItem?.id === newsId ? selectedBattleItem : undefined);
      const marketId = targetNews?.marketId;
      const wager = Number.isFinite(amount) && typeof amount === 'number' ? Math.floor(amount) : BET_COST;

      if (!marketId) {
        setPetDialogue('这个预测还没绑定真实 marketId，暂时不能下注。');
        setTimeout(() => setPetDialogue(null), 3000);
        return;
      }

      if (!Number.isFinite(wager) || wager <= 0) {
        setPetDialogue('请输入有效的下注金额。');
        setTimeout(() => setPetDialogue(null), 3000);
        return;
      }

      if (balance < wager) {
        setPetDialogue('龟币余额不足，先去赚点金币再来。');
        setTimeout(() => setPetDialogue(null), 3000);
        return;
      }

      try {
        setBettingMarketId(marketId);
        const result = await coinBetMutation.mutateAsync({
          marketId,
          option,
          amount: wager,
        });

        setUserVotes((prev) => ({ ...prev, [newsId]: option }));
        setPetDialogue(`下注成功，已锁定 ${result.lockedOdds.toFixed(2)}x，余额 ${result.userCoin.balance.toLocaleString()}。`);
      } catch (error) {
        const message = error instanceof Error ? error.message : '下注失败，请稍后重试。';
        if (message.includes('NotLogin')) {
          setAuthModalOpen(true);
        }
        setPetDialogue(message);
      } finally {
        setBettingMarketId(null);
        setTimeout(() => setPetDialogue(null), 3000);
      }
    },
    [allNews, balance, coinBetMutation, selectedBattleItem]
  );

  const handleViewChange = useCallback((view: ViewType, topic?: SidebarHotTopic, tag?: SidebarHotTag | null) => {
    if (view === 'jump') {
      openJumpStandalone();
      return;
    }
    if (view === 'lab') {
      openLabStandalone();
      return;
    }
    if (view === 'battle') {
      openBattleStandalone();
      return;
    }
    setActiveView(view);
    setBattleOriginView(view);
    if (view !== 'profile') {
      setMobileProfilePage('home');
    }
    if (view !== 'forum') {
      setSelectedMobilePredictionItem(null);
    }
    if (view === 'predictions') {
      setSelectedTopic(topic ?? null);
      setSelectedTag(tag?.tag ?? null);
      setSelectedNewsId(null);
      setSelectedBattleItem(null);
    }
  }, []);

  const handleEnterBattle = useCallback((newsId: string) => {
    setBattleOriginView('predictions');
    setSelectedBattleItem(null);
    setSelectedNewsId(newsId);
    setActiveView('predictions');
  }, []);

  /**
   * handleOpenMobilePredictionBattle:
   * 手机端预测市场专用的“进入撕裂带”入口。
   * 这里会记住用户是从列表还是详情进来的，后面从战场返回时才能准确回到当前 mobile 页面。
   */
  const handleOpenMobilePredictionBattle = useCallback((item: PredictionCardItem, returnMode: 'list' | 'detail') => {
    setBattleOriginView('forum');
    setMobileHomeTab('prediction_market');
    setSelectedNewsId(item.id);
    setSelectedBattleItem(item);
    setMobilePredictionBattleReturnMode(returnMode);
    setMobilePredictionBattleReturnItem(item);
    setSelectedMobilePredictionItem(returnMode === 'detail' ? item : null);
    setActiveView('predictions');
  }, []);

  const handleOpenLinkedPrediction = useCallback((item: PredictionCardItem) => {
    setBattleOriginView('forum');
    setSelectedTopic(null);
    setSelectedTag(null);
    setSelectedNewsId(item.id);
    setSelectedBattleItem(item);
    setActiveView('predictions');
  }, []);

  /**
   * handleMobileCreatePost:
   * 手机端全局发布弹层的统一发帖提交入口。
   * 发布成功后，topic 相关列表会通过 mutation 自带的 invalidation 自动刷新。
   */
  const handleMobileCreatePost = useCallback(async (content: string, tag: TopicPostTag, images: string[]) => {
    await createTopicMutation.mutateAsync({
      type: 1,
      nodeId: mobileCreateNodeId,
      title: content.slice(0, 40),
      content,
      contentType: 'text',
      hideContent: '',
      tags: [tag],
      imageList: images.map((url) => ({ url })),
      vote: null,
      captchaId: '',
      captchaCode: '',
      captchaProtocol: 2,
    });
  }, [createTopicMutation, mobileCreateNodeId]);

  /**
   * handleOpenGamesHub:
   * 手机端顶部“游戏”按钮统一进入游戏管理页。
   * 具体进入哪个全屏游戏，由游戏管理页里的卡片再决定。
   */
  const handleOpenGamesHub = useCallback(() => {
    setMobileLabReturnView(activeView);
    setActiveView('games');
  }, [activeView]);

  const renderActiveView = () => (
    <>
      {activeView === 'predictions' && (selectedNewsId || selectedBattleItem) && (
        <section className="view-shell view-rhythm view-event-battle mx-0 grid h-full w-full max-w-none gap-0">
          <EventBattle
            news={selectedBattleItem ?? allNews.find((n) => n.id === selectedNewsId) ?? heroNewsItem}
            onBack={() => {
              setSelectedNewsId(null);
              setSelectedBattleItem(null);
              if (mobilePredictionBattleReturnMode) {
                setActiveView('forum');
                setMobileHomeTab('prediction_market');
                setSelectedMobilePredictionItem(
                  mobilePredictionBattleReturnMode === 'detail' ? mobilePredictionBattleReturnItem : null,
                );
                setMobilePredictionBattleReturnMode(null);
                setMobilePredictionBattleReturnItem(null);
              } else {
                setActiveView(battleOriginView === 'forum' ? 'forum' : 'predictions');
              }
              setBattleOriginView('predictions');
            }}
            userSide={selectedNewsId ? userVotes[selectedNewsId] ?? null : null}
            onBet={handleBet}
            bettingMarketId={bettingMarketId}
            equippedSkin={equippedSkin ?? null}
            onRequireAuth={() => setAuthModalOpen(true)}
          />
        </section>
      )}

      {activeView === 'predictions' && selectedTopic && (
        <section className="view-shell view-rhythm view-topic mx-0 grid w-full max-w-none gap-4">
          <TopicDetail
            topic={selectedTopic}
            onBack={() => setSelectedTopic(null)}
            onBetSuccess={handlePredictionBetSuccess}
            onRequireAuth={() => setAuthModalOpen(true)}
            onEnterBattle={handleEnterBattle}
          />
        </section>
      )}

      {activeView === 'predictions' && !selectedTopic && !selectedNewsId && !selectedBattleItem && (
        <PredictionsView
          selectedTag={selectedTag}
          onBetSuccess={handlePredictionBetSuccess}
          onRequireAuth={() => setAuthModalOpen(true)}
          onEnterBattle={handleEnterBattle}
        />
      )}

      {activeView === 'rivalry' && (
        <section className="view-shell view-rhythm view-rivalry mx-0 grid w-full max-w-none gap-4">
          <RivalryPK />
        </section>
      )}

      {activeView === 'forum' && (
        <section className="view-shell view-rhythm view-forum mx-0 grid w-full max-w-none gap-4">
          <Forum
            newsByMarketId={newsByMarketId}
            onOpenLinkedPrediction={handleOpenLinkedPrediction}
            showComposer
            mobileBottomSheetComposer={false}
          />
        </section>
      )}

      {activeView === 'pet' && (
        <section className="view-shell view-rhythm view-pet mx-0 grid w-full max-w-none gap-4">
          <PetPage
            pet={currentPet}
            balance={balance}
            winRate={0.68}
            winStreak={mockUser.winStreak}
            totalPredictions={42}
            onBack={() => setActiveView('predictions')}
            skins={skins}
            onEquipSkin={handleEquipSkin}
            equippedPet={petEquipQuery.data ?? null}
            ownedPets={petOwnedQuery.data?.list ?? []}
            petStatus={petStatusQuery.data ?? null}
            petStaminaInfo={petStaminaQuery.data ?? null}
            onEquipPet={handleEquipPet}
            equippingPetId={
              petEquipMutation.isLoading
                ? (petEquipMutation.variables?.petId ?? petEquipMutation.variables?.petKey ?? null)
                : null
            }
            onStaminaChange={setPetStamina}
          />
        </section>
      )}

      {activeView === 'profile' && (
        <section className="view-shell view-rhythm view-profile mx-0 grid w-full max-w-none gap-4">
          <ProfilePage
            userId={userInfo.data?.id ?? ''}
            userName="路边社社长"
            userHandle="预测达人"
            avatar="🦊"
            posts={communityPosts}
            pet={currentPet}
            skins={skins}
            balance={balance}
            darkMode={darkMode}
            onBack={() => setActiveView('predictions')}
            onOpenForum={() => setActiveView('forum')}
            onOpenAuth={() => setAuthModalOpen(true)}
            onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          />
        </section>
      )}

      {activeView === 'rank' && <RankPage />}

      {activeView === 'activePredictions' && (
        <ActivePredictionsPage
          items={activePredictionItems}
          onBack={() => setActiveView('predictions')}
          onEnterBattle={handleEnterBattle}
        />
      )}

      {activeView === 'games' && (
        <section className="view-shell view-rhythm view-games mx-0 grid w-full max-w-none gap-4">
          <GameHubPage
            onOpenJump={openJumpStandalone}
            onOpenLab={openLabStandalone}
            onOpenBattle={openBattleStandalone}
          />
        </section>
      )}

      {activeView === 'jump' && (
        <section className="view-shell view-rhythm view-lab mx-0 grid w-full max-w-none gap-4 lg:h-full">
          <TurtleJumpPixel
            onBack={() => setActiveView('predictions')}
          />
        </section>
      )}

      {activeView === 'lab' && (
        <section className="view-shell view-rhythm view-lab mx-0 grid w-full max-w-none gap-4 lg:h-full">
          <TurtleDivePixel
            onBack={() => setActiveView('predictions')}
            balance={balance}
            ownedPets={petOwnedQuery.data?.list ?? []}
            equippedPet={petEquipQuery.data ?? null}
          />
        </section>
      )}

      {activeView === 'shop' && (
        <section className="view-shell view-rhythm view-shop mx-0 grid w-full max-w-none gap-4">
          <Shop
            balance={balance}
            pet={currentPet}
            ownedPets={petOwnedQuery.data?.list ?? []}
            petStaminaInfo={petStaminaQuery.data ?? null}
            onBack={() => setActiveView('predictions')}
            onRequireAuth={() => setAuthModalOpen(true)}
          />
        </section>
      )}

      {activeView === 'battle' && (
        <section className="view-shell view-rhythm view-battle-square mx-0 grid w-full max-w-none gap-4">
          <BattleSquarePixel
            onBack={() => setActiveView('predictions')}
            balance={balance}
            ownedPets={petOwnedQuery.data?.list ?? []}
            equippedPet={petEquipQuery.data ?? null}
          />
        </section>
      )}

      {activeView === 'battlePlaza6c47700' && (
        <section className="view-shell view-rhythm view-battle-plaza mx-0 grid w-full max-w-none gap-4">
          <BattlePlaza6c47700 />
        </section>
      )}
    </>
  );

  /**
   * Mobile home landing:
   * 手机端首页统一从这里切分类内容。
   * - 排行榜：复用 RankPage
   * - 推荐 / 最新 / 关注：复用 Forum 帖子流，但隐藏 Forum 自己内部的顶部 tab
   * - 预测市场：走 mobile 专用列表和详情页
   *
   * 这样首页顶部分类统一收口在一个地方，中间“发布”按钮就只管发帖。
   */
  const renderMobileHomeView = () => {
    if (mobileHomeTab === 'rank_board') {
      return <RankPage />;
    }

    if (mobileHomeTab === 'prediction_market') {
      if (selectedMobilePredictionItem) {
        return (
          <MobilePredictionMarketDetail
            item={selectedMobilePredictionItem}
            onBack={() => setSelectedMobilePredictionItem(null)}
            onOpenBattle={(item) => handleOpenMobilePredictionBattle(item, 'detail')}
            onBetSuccess={handlePredictionBetSuccess}
            onRequireAuth={() => setAuthModalOpen(true)}
          />
        );
      }

      return (
        <MobilePredictionMarketList
          items={allNews}
          onOpenDetail={setSelectedMobilePredictionItem}
          onOpenBattle={(item) => handleOpenMobilePredictionBattle(item, 'list')}
          onBetSuccess={handlePredictionBetSuccess}
          onRequireAuth={() => setAuthModalOpen(true)}
        />
      );
    }

    const forumTabMap: Record<'recommend_feed' | 'latest_feed' | 'following_feed', 'recommend' | 'latest' | 'following'> = {
      recommend_feed: 'recommend',
      latest_feed: 'latest',
      following_feed: 'following',
    };

    return (
      <Forum
        newsByMarketId={newsByMarketId}
        onOpenLinkedPrediction={handleOpenLinkedPrediction}
        showComposer={false}
        forcedActiveTab={forumTabMap[mobileHomeTab as 'recommend_feed' | 'latest_feed' | 'following_feed']}
        hideTopTabs
      />
    );
  };

  /**
   * renderMobileProfileView:
   * 手机端“我的”页面专用渲染入口。
   * 以后移动端账号中心、设置、隐私、通知等二级页面都从这里继续分发，不再回头修改桌面的 ProfilePage。
   */
  const renderMobileProfileView = () => {
    if (mobileProfilePage === 'auth') {
      return (
        <MobileProfileAuthPage
          onBack={() => setMobileProfilePage('home')}
          onAuthSuccess={handleSessionAuthSuccess}
          onSignOut={handleSessionSignOut}
        />
      );
    }

    if (mobileProfilePage === 'settings') {
      return (
        <MobileProfileSettingsPage
          darkMode={darkMode}
          pushEnabled={mobilePushEnabled}
          motionEnabled={mobileMotionEnabled}
          onBack={() => setMobileProfilePage('home')}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          onTogglePush={() => setMobilePushEnabled((value) => !value)}
          onToggleMotion={() => setMobileMotionEnabled((value) => !value)}
          onOpenAuth={() => setMobileProfilePage('auth')}
          onSignOut={() => {
            void handleSessionSignOut();
          }}
        />
      );
    }

    return (
      <MobileProfileHome
        balance={balance}
        pet={currentPet}
        darkMode={darkMode}
        onOpenAuth={() => setMobileProfilePage('auth')}
        onOpenSettings={() => setMobileProfilePage('settings')}
        onOpenPet={() => handleViewChange('pet')}
        onOpenForum={() => handleViewChange('forum')}
      />
    );
  };

  const mobileShell = (
    <div className={`lg:hidden ${darkMode ? 'bg-[#080808] text-white' : 'bg-[#f4f7f4] text-slate-900'}`}>
      {activeView !== 'lab' && activeView !== 'jump' && !isEventBattleActive ? <MobileTopBar darkMode={darkMode} onOpenGames={handleOpenGamesHub} /> : null}
      <main className={`${activeView === 'lab' || activeView === 'jump' || isEventBattleActive ? 'h-screen min-h-screen overflow-hidden pb-0 pt-0' : 'min-h-[calc(100vh-58px)] pb-[104px] pt-3'} ${darkMode ? 'bg-[#080808]' : 'bg-[#f4f7f4]'}`}>
        {/*
          Mobile edge spacing rule:
          手机端主内容统一保留 12px 的左右安全边距。
          以后新增 mobile 页面时，优先走这层容器，不要再让内容直接贴屏幕边缘。
        */}
        <div className={`${activeView === 'lab' || activeView === 'jump' || isEventBattleActive ? 'h-full space-y-0 px-0' : 'space-y-3 px-3'}`}>
          {activeView === 'jump' ? (
            <TurtleJumpPixel
              mobileMode
              onBack={() => setActiveView(mobileLabReturnView)}
            />
          ) : activeView === 'lab' ? (
            <TurtleDivePixel
              mobileMode
              onBack={() => setActiveView(mobileLabReturnView)}
              balance={balance}
              ownedPets={petOwnedQuery.data?.list ?? []}
              equippedPet={petEquipQuery.data ?? null}
            />
          ) : activeView === 'profile' ? (
            renderMobileProfileView()
          ) : activeView === 'forum' && mobileHomeTab === 'prediction_market' && selectedMobilePredictionItem ? (
            renderMobileHomeView()
          ) : activeView === 'forum' ? (
            <>
              <MobilePredictionTopTabs
                activeTab={mobileHomeTab}
                onChange={setMobileHomeTab}
              />
              {renderMobileHomeView()}
            </>
          ) : (
            renderActiveView()
          )}
        </div>
      </main>

      <ForumCompose
        onPost={handleMobileCreatePost}
        posting={createTopicMutation.isLoading}
        openSignal={mobileGlobalComposeSignal}
        showEntryButton={false}
        mobileBottomSheet
      />

      {!(activeView === 'forum' && mobileHomeTab === 'prediction_market' && selectedMobilePredictionItem) && !(activeView === 'profile' && mobileProfilePage !== 'home') && activeView !== 'lab' && activeView !== 'jump' && !isEventBattleActive && (
        <MobileTabBar
          activeView={activeView}
          onChange={(view) => handleViewChange(view)}
          onCompose={() => {
            setMobileGlobalComposeSignal((value) => value + 1);
          }}
        />
      )}
    </div>
  );

  const desktopShell = (
    <main className={`app-main hidden flex-col lg:flex lg:min-h-0 lg:overflow-hidden ${isEventBattleActive ? 'min-h-screen gap-0 lg:h-screen lg:flex-col' : 'min-h-[calc(100vh-56px)] gap-4 lg:h-[calc(100vh-56px)] lg:flex-row lg:gap-6'}`}>
      {!isEventBattleActive ? (
      <aside className="app-sidebar hidden h-full w-[260px] shrink-0 self-stretch overflow-hidden lg:block">
        <Sidebar
          balance={balance}
          winStreak={mockUser.winStreak}
          winRate={0.68}
          totalPredictions={42}
          activePredictions={activePredictionItems.length}
          pet={currentPet}
          newsByMarketId={newsByMarketId}
          petDialogue={petDialogue}
          idleDialogues={petDialogues.idle}
          activeView={activeView}
          onViewChange={handleViewChange}
        />
      </aside>
      ) : null}

      <div className={`app-content relative flex min-w-0 flex-1 flex-col overflow-hidden lg:h-full lg:min-h-0 ${isEventBattleActive ? 'lg:pr-0' : 'lg:pr-1'}`}>
        <div className={`min-h-0 flex-1 overflow-x-hidden overscroll-contain ${isEventBattleActive ? 'overflow-hidden space-y-0 pb-0' : `overflow-y-auto space-y-4 ${shouldShowDesktopFooter ? 'pb-20' : 'pb-0'} md:space-y-6`}`}>
          {renderActiveView()}
        </div>
        {shouldShowDesktopFooter && (
          <div className="absolute inset-x-0 bottom-0 z-10 hidden border-t border-white/8 bg-[#080808]/96 px-3 py-3 backdrop-blur-md lg:block dark:border-rdark-border dark:bg-rdark/96">
            <AppFooter />
          </div>
        )}
      </div>
    </main>
  );

  if (fullscreenGame === 'jump') {
    return (
      <div className={`min-h-screen overflow-hidden ${darkMode ? 'bg-[#080808]' : 'bg-[#f4f7f4]'}`}>
        <main className="h-screen overflow-hidden">
          <div className="h-full">
            <TurtleJumpPixel
              mobileMode={typeof window !== 'undefined' ? window.innerWidth < 1024 : false}
              onBack={() => {
                if (typeof window === 'undefined') return;
                window.location.href = '/?view=games';
              }}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`legacy-fusion-app fixed-sidebar-style min-h-screen overflow-x-hidden bg-[#080808] text-white dark:bg-rdark transition-colors lg:h-screen lg:overflow-hidden ${usePredStyleLayout ? 'home-main-style' : ''}`}>
      {!isEventBattleActive ? (
        <AppHeader
          darkMode={darkMode}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          onOpenAuth={() => setAuthModalOpen(true)}
        />
      ) : null}

      {mobileShell}

      {desktopShell}

      {/* Footer */}
      {!isEventBattleActive && (
        <div className="lg:hidden">
          <AppFooter />
        </div>
      )}

      {!isEventBattleActive ? (
      <div className="hidden lg:block">
        <FloatingGuideButton onClick={() => setGuideOpen(true)} sizeClassName="w-13 h-13" />
      </div>
      ) : null}

      {!isEventBattleActive ? (
        <MobileFloatingActions
          chatOpen={floatingChatOpen}
          pet={currentPet}
          stamina={petStamina}
          onOpenGuide={() => setGuideOpen(true)}
          onToggleChat={() => setFloatingChatOpen((v) => !v)}
          onCloseChat={() => setFloatingChatOpen(false)}
          onStaminaChange={setPetStamina}
        />
      ) : null}

      {/* ━━━ 浮动宠物聊天入口 ━━━ */}
      <div className="hidden lg:block">
        <FloatingPetChat
          open={floatingChatOpen}
          pet={currentPet}
          stamina={petStamina}
          onToggle={() => setFloatingChatOpen((v) => !v)}
          onClose={() => setFloatingChatOpen(false)}
          onStaminaChange={setPetStamina}
        />
      </div>

      <GuideTourModal open={guideOpen} onClose={() => setGuideOpen(false)} />

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSignOut={handleSessionSignOut}
        onAuthSuccess={handleSessionAuthSuccess}
      />
    </div>
  );
}

export default App;
