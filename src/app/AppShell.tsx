import { useState, useCallback, useEffect, useMemo } from 'react';
import { Sidebar } from '../components/layout';
import type { ViewType } from '../components/layout';
import { ActivePredictionsPage, EventBattle, PredictionsView } from '../components/shared/predictions';
import { Forum } from '../components/shared/forum';
import { ForumCompose } from '../components/shared/forum/ui/ForumCompose';
import type { TopicPostTag } from '../components/shared/forum/ui/TopicPostCard';
import { Shop } from '../components/shared/shop';
import { TopicDetail } from '../components/shared/topic';
import { BattleSquarePixel } from '../components/shared/battle';
import { TurtleDivePixel } from '../components/shared/lab';
import { RankPage } from '../components/shared/rank';
import { PetPage } from '../components/shared/pet';
import { ProfilePage } from '../components/shared/profile';
import { FloatingPetChat } from '../components/shared/layout';
import { AppFooter, AppHeader, FloatingGuideButton } from './pc';
import { MobileTopBar, MobilePredictionTopTabs, type MobilePredictionTopTabKey } from './mobile/home';
import { MobilePredictionMarketDetail, MobilePredictionMarketList } from './mobile/predictionMarket';
import { MobileProfileAuthPage, MobileProfileHome, MobileProfileSettingsPage } from './mobile/profile';
import { MobileFloatingActions } from './mobile/pet';
import { MobileTabBar } from './mobile/shared';
import { GuideTourModal } from './GuideTourModal';
import { AuthModal } from '../components/shared/auth';
import type { MockForumEntry, Battle, BattleSide, PetSkin } from '../data/mock_data';
import {
  mockUser,
  mockNews,
  heroNews,
  petDialogues,
  mockCommunityPosts,
  mockBattles,
  mockPetSkins,
} from '../data/mock_data';
import { clearInfo } from '@/utils/authStorage';
import type { PlaceBetResult } from '@/hook/coinType';
import { useRequestBadgeBadges, useRequestConfigConfigs, useRequestSignout, useRequestUserMsgRecent } from '@/hook/useRequest';
import { useRequestFootballMarkets } from '@/hook/usePredictRequest';
import { useRequestCreateTopic, useRequestTopicNodeNavs } from '@/hook/useTopicRequest';
import { useAppSession } from '@/hook/useAppSession';
import { mapMarketToPredictionCard, type PredictionCardItem } from '../components/shared/predictions/ui/predictionCard';
import type { SidebarHotTag, SidebarHotTopic } from '../components/shared/layout';
import { useRequestCoinBet } from '@/hook/useCoinRequest';

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

function App() {
  // 主题
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const darkMode = theme === 'dark';

  //话题
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [balance, setBalance] = useState(mockUser.balance);
  const [petDialogue, setPetDialogue] = useState<string | null>(null);
  
  const [activeView, setActiveView] = useState<ViewType>(() =>
    typeof window !== 'undefined' && window.innerWidth < 1280 ? 'forum' : 'predictions',
  );
  const [communityPosts] = useState<MockForumEntry[]>(mockCommunityPosts);
  const [battles, setBattles] = useState<Battle[]>(mockBattles);
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
  const usePredStyleLayout = true;
  // 当前登录用户 + 金币账户
  const { userInfo, coinMe } = useAppSession();

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
  const currentPet = { ...mockUser.petInfo, stamina: petStamina, avatar: equippedSkin?.avatar ?? mockUser.petInfo.avatar };

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

  const handleEquipSkin = useCallback((skinId: string) => {
    setSkins((prev) =>
      prev.map((skin) => ({
        ...skin,
        equipped: skin.id === skinId,
      })),
    );
  }, []);

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
   * 手机端预测市场专用的“进入评论战场”入口。
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

  const handleCreateBattle = useCallback(
    (topic: string, optionA: string, optionB: string, side: BattleSide, wager: number) => {
      if (balance < wager) return;
      setBalance((b) => b - wager);
      const newBattle: Battle = {
        id: `bt-${Date.now()}`,
        topic,
        optionA,
        optionB,
        creator: { name: '你', avatar: '🦊', side },
        challenger: null,
        wager,
        status: 'waiting',
        winner: null,
        createdTime: '刚刚',
      };
      setBattles((prev) => [newBattle, ...prev]);
      const msg = petDialogues.battle[Math.floor(Math.random() * petDialogues.battle.length)];
      setPetDialogue(msg);
      setTimeout(() => setPetDialogue(null), 3000);
    },
    [balance]
  );

  const handleAcceptBattle = useCallback(
    (battleId: string) => {
      const battle = battles.find((b) => b.id === battleId);
      if (!battle || battle.status !== 'waiting' || balance < battle.wager) return;
      setBalance((b) => b - battle.wager);
      setBattles((prev) =>
        prev.map((b) =>
          b.id === battleId
            ? {
              ...b,
              status: 'active' as const,
              challenger: {
                name: '你',
                avatar: '🦊',
                side: (b.creator.side === 'A' ? 'B' : 'A') as BattleSide,
              },
            }
            : b
        )
      );
      const msg = petDialogues.battle[Math.floor(Math.random() * petDialogues.battle.length)];
      setPetDialogue(msg);
      setTimeout(() => setPetDialogue(null), 3000);
    },
    [balance, battles]
  );

  const handleResolveBattle = useCallback((battleId: string, winningSide: BattleSide) => {
    setBattles((prev) =>
      prev.map((b) => {
        if (b.id !== battleId || b.status !== 'active') return b;
        const isCreator = b.creator.name === '你';
        const isChallenger = b.challenger?.name === '你';
        const userSide = isCreator ? b.creator.side : isChallenger ? b.challenger!.side : null;
        if (userSide === winningSide) {
          setBalance((bal) => bal + b.wager * 2);
        }
        return { ...b, status: 'resolved' as const, winner: winningSide };
      })
    );
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
   * handleOpenMobileLab:
   * 手机端顶部“游戏”按钮统一从这里进入小游戏。
   * 进入前记住当前 activeView，后面从游戏返回时直接回到这个页面。
   */
  const handleOpenMobileLab = useCallback(() => {
    setMobileLabReturnView(activeView);
    setActiveView('lab');
  }, [activeView]);

  const renderActiveView = () => (
    <>
      {activeView === 'predictions' && (selectedNewsId || selectedBattleItem) && (
        <section className="view-shell view-rhythm view-event-battle mx-0 grid w-full max-w-none gap-4">
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

      {activeView === 'lab' && (
        <section className="view-shell view-rhythm view-lab mx-0 grid w-full max-w-none gap-4">
          <TurtleDivePixel onBack={() => setActiveView('predictions')} />
        </section>
      )}

      {activeView === 'shop' && (
        <section className="view-shell view-rhythm view-shop mx-0 grid w-full max-w-none gap-4">
          <Shop
            balance={balance}
            onBalanceChange={(delta) => setBalance((b) => b + delta)}
            pet={currentPet}
            onStaminaChange={setPetStamina}
            skins={skins}
            onSkinUnlock={(skinId) =>
              setSkins((prev) =>
                prev.map((s) => (s.id === skinId ? { ...s, owned: true } : s)),
              )
            }
            onBack={() => setActiveView('predictions')}
          />
        </section>
      )}

      {activeView === 'battle' && (
        <section className="view-shell view-rhythm view-battle-square mx-0 grid w-full max-w-none gap-4">
          <BattleSquarePixel
            battles={battles}
            userBalance={balance}
            onCreateBattle={handleCreateBattle}
            onAcceptBattle={handleAcceptBattle}
            onResolveBattle={handleResolveBattle}
          />
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
          onAuthSuccess={() => {
            void userInfo.refetch();
            void coinMe.refetch();
            setMobileProfilePage('home');
          }}
          onSignOut={async () => {
            await signOutMutation.mutateAsync();
            clearInfo();
            void userInfo.refetch();
            void coinMe.refetch();
            setMobileProfilePage('home');
          }}
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
            void (async () => {
              await signOutMutation.mutateAsync();
              clearInfo();
              void userInfo.refetch();
              void coinMe.refetch();
              setMobileProfilePage('home');
            })();
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
    <div className={`xl:hidden ${darkMode ? 'bg-[#080808] text-white' : 'bg-[#f4f7f4] text-slate-900'}`}>
      {activeView !== 'lab' ? <MobileTopBar darkMode={darkMode} onOpenLab={handleOpenMobileLab} /> : null}
      <main className={`${activeView === 'lab' ? 'min-h-screen pb-0 pt-0' : 'min-h-[calc(100vh-58px)] pb-[104px] pt-3'} ${darkMode ? 'bg-[#080808]' : 'bg-[#f4f7f4]'}`}>
        {/*
          Mobile edge spacing rule:
          手机端主内容统一保留 12px 的左右安全边距。
          以后新增 mobile 页面时，优先走这层容器，不要再让内容直接贴屏幕边缘。
        */}
        <div className={`${activeView === 'lab' ? 'space-y-0 px-0' : 'space-y-3 px-3'}`}>
          {activeView === 'lab' ? (
            <TurtleDivePixel mobileMode onBack={() => setActiveView(mobileLabReturnView)} />
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

      {!(activeView === 'forum' && mobileHomeTab === 'prediction_market' && selectedMobilePredictionItem) && !(activeView === 'profile' && mobileProfilePage !== 'home') && activeView !== 'lab' && (
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
    <main className="app-main hidden min-h-[calc(100vh-56px)] flex-col gap-4 xl:flex xl:h-[calc(100vh-56px)] xl:min-h-0 xl:flex-row xl:gap-6 xl:overflow-hidden">
      <aside className="app-sidebar hidden h-full w-[260px] shrink-0 self-stretch overflow-hidden xl:block">
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

      <div className="app-content flex-1 min-w-0 overflow-visible space-y-4 overscroll-contain md:space-y-6 xl:h-full xl:min-h-0 xl:overflow-y-auto xl:pr-1">
        {renderActiveView()}
      </div>
    </main>
  );

  return (
    <div className={`legacy-fusion-app fixed-sidebar-style min-h-screen overflow-x-hidden bg-[#080808] text-white dark:bg-rdark transition-colors ${usePredStyleLayout ? 'home-main-style' : ''}`}>
      <AppHeader
        darkMode={darkMode}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {mobileShell}

      {desktopShell}

      {/* Footer */}
      {!isEventBattleActive && (
        <AppFooter />
      )}

      <div className="hidden xl:block">
        <FloatingGuideButton onClick={() => setGuideOpen(true)} sizeClassName="w-13 h-13" />
      </div>

      <MobileFloatingActions
        chatOpen={floatingChatOpen}
        pet={currentPet}
        stamina={petStamina}
        onOpenGuide={() => setGuideOpen(true)}
        onToggleChat={() => setFloatingChatOpen((v) => !v)}
        onCloseChat={() => setFloatingChatOpen(false)}
        onStaminaChange={setPetStamina}
      />

      {/* ━━━ 浮动宠物聊天入口 ━━━ */}
      <div className="hidden xl:block">
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
        onSignOut={async () => {
          await signOutMutation.mutateAsync()
          clearInfo()
          setAuthModalOpen(false);
        }}
      />
    </div>
  );
}

export default App;
