import { useState, useCallback, useEffect, useMemo } from 'react';
import { Sidebar } from '../components/layout';
import type { ViewType } from '../components/layout';
import { ActivePredictionsPage, EventBattle, PredictionsView } from '../components/shared/predictions';
import { Forum } from '../components/shared/forum';
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
import { useAppSession } from '@/hook/useAppSession';
import { mapMarketToPredictionCard, type PredictionCardItem } from '../components/shared/predictions/ui/predictionCard';
import type { SidebarHotTag, SidebarHotTopic } from '../components/shared/layout';
import { useRequestCoinBet } from '@/hook/useCoinRequest';

// Bet cost per action
const BET_COST = 100;
const THEME_KEY = 'theme';
type ThemeMode = 'light' | 'dark';

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
  /**
   * Mobile home tabs:
   * 手机端“首页”顶部固定的五个分类。
   * 这里统一管理首页频道顺序，避免以后顶部分类和底部发布按钮互相干扰。
   */
  const [mobileHomeTab, setMobileHomeTab] = useState<MobilePredictionTopTabKey>('latest_feed');
  /**
   * Mobile forum compose:
   * 手机端底部中间“发布”按钮只负责拉起发帖面板。
   * 这里用 signal 做一次性打开触发，让 ForumCompose 在 mobile 模式下从底部弹出。
   */
  const [mobileForumComposeSignal, setMobileForumComposeSignal] = useState(0);
  
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

  const renderActiveView = () => (
    <>
      {activeView === 'predictions' && (selectedNewsId || selectedBattleItem) && (
        <section className="view-shell view-rhythm view-event-battle mx-0 grid w-full max-w-none gap-4">
          <EventBattle
            news={selectedBattleItem ?? allNews.find((n) => n.id === selectedNewsId) ?? heroNewsItem}
            onBack={() => {
              setSelectedNewsId(null);
              setSelectedBattleItem(null);
              setActiveView(battleOriginView === 'forum' ? 'forum' : 'predictions');
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
            composerOpenSignal={mobileForumComposeSignal}
            mobileBottomSheetComposer={typeof window !== 'undefined' ? window.innerWidth < 1280 : false}
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
   * - 预测市场：复用 PredictionsView
   *
   * 这样首页顶部分类统一收口在一个地方，中间“发布”按钮就只管发帖。
   */
  const renderMobileHomeView = () => {
    if (mobileHomeTab === 'rank_board') {
      return <RankPage />;
    }

    if (mobileHomeTab === 'prediction_market') {
      return (
        <PredictionsView
          selectedTag={selectedTag}
          onBetSuccess={handlePredictionBetSuccess}
          onRequireAuth={() => setAuthModalOpen(true)}
          onEnterBattle={handleEnterBattle}
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
        showComposer
        composerOpenSignal={mobileForumComposeSignal}
        forcedActiveTab={forumTabMap[mobileHomeTab as 'recommend_feed' | 'latest_feed' | 'following_feed']}
        hideTopTabs
        mobileBottomSheetComposer
      />
    );
  };

  const mobileShell = (
    <div className="bg-[#080808] xl:hidden">
      <MobileTopBar onOpenLab={() => handleViewChange('lab')} />
      <main className="min-h-[calc(100vh-58px)] pb-[104px] pt-3">
        {/*
          Mobile edge spacing rule:
          手机端主内容统一保留 12px 的左右安全边距。
          以后新增 mobile 页面时，优先走这层容器，不要再让内容直接贴屏幕边缘。
        */}
        <div className="space-y-3 px-3">
          {activeView === 'forum' ? (
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

      <MobileTabBar
        activeView={activeView}
        onChange={(view) => handleViewChange(view)}
        onCompose={() => {
          setMobileHomeTab('recommend_feed');
          setMobileForumComposeSignal((value) => value + 1);
          handleViewChange('forum');
        }}
      />
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
