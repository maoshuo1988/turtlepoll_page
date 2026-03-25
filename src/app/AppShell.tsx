import { useState, useCallback, useEffect, useMemo } from 'react';
import { Sidebar } from '../components/layout';
import type { ViewType } from '../components/layout';
import { EventBattle, PredictionsView } from '../components/predictions';
import { Forum } from '../components/forum';
import { Shop } from '../components/shop';
import { TopicDetail } from '../components/topic';
import { BattleSquarePixel } from '../components/battle';
import { TurtleDivePixel } from '../components/lab';
import { RankPage } from '../components/rank';
import { PetPage } from '../components/pet';
import { ProfilePage } from '../components/profile';
import { FloatingPetChat } from '../components/layout/ui/FloatingPetChat';
import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';
import { GuideTourModal } from './GuideTourModal';
import { FloatingGuideButton } from './FloatingGuideButton';
import { AuthModal } from '../components/auth';
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
import { mapMarketToPredictionCard, type PredictionCardItem } from '../components/predictions/ui/predictionCard';
import type { SidebarHotTag, SidebarHotTopic } from '../components/layout/ui/sidebarHotData';
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
  
  const [activeView, setActiveView] = useState<ViewType>('predictions');
  const [communityPosts, setCommunityPosts] = useState<MockForumEntry[]>(mockCommunityPosts);
  const [battles, setBattles] = useState<Battle[]>(mockBattles);
  const [floatingChatOpen, setFloatingChatOpen] = useState(false);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<string, 'A' | 'B'>>({});
  const [petStamina, setPetStamina] = useState(mockUser.petInfo.stamina);
  const [skins, setSkins] = useState<PetSkin[]>(mockPetSkins);
  const [selectedTopic, setSelectedTopic] = useState<SidebarHotTopic | null>(null);
  
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [bettingMarketId, setBettingMarketId] = useState<number | null>(null);
  const isEventBattleActive = activeView === 'predictions' && !!selectedNewsId;
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
    async (newsId: string, option: 'A' | 'B', _odds: number) => {
      const targetNews = allNews.find((item) => item.id === newsId);
      const marketId = targetNews?.marketId;

      if (!marketId) {
        setPetDialogue('这个预测还没绑定真实 marketId，暂时不能下注。');
        setTimeout(() => setPetDialogue(null), 3000);
        return;
      }

      if (balance < BET_COST) {
        setPetDialogue('龟币余额不足，先去赚点金币再来。');
        setTimeout(() => setPetDialogue(null), 3000);
        return;
      }

      try {
        setBettingMarketId(marketId);
        const result = await coinBetMutation.mutateAsync({
          marketId,
          option,
          amount: BET_COST,
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
    [allNews, balance, coinBetMutation]
  );

  const handleLikePost = useCallback((postId: string) => {
    setCommunityPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p))
    );
  }, []);

  const handleLikeComment = useCallback((postId: string, commentId: string) => {
    setCommunityPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comments: p.comments.map((c) => (c.id === commentId ? { ...c, likes: c.likes + 1 } : c)) }
          : p
      )
    );
  }, []);

  const handleAddComment = useCallback((postId: string, content: string) => {
    setCommunityPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
            ...p,
            comments: [
              ...p.comments,
              { id: `c-${Date.now()}`, author: { name: '你', handle: '@me_fox', avatar: '🦊' }, content, time: '刚刚', likes: 0 },
            ],
          }
          : p
      )
    );
  }, []);

  const handleViewChange = useCallback((view: ViewType, topic?: SidebarHotTopic, tag?: SidebarHotTag | null) => {
    setActiveView(view);
    if (view === 'predictions') {
      setSelectedTopic(topic ?? null);
      setSelectedTag(tag?.tag ?? null);
      setSelectedNewsId(null);
    }
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


  return (
    <div className={`legacy-fusion-app fixed-sidebar-style min-h-screen overflow-x-hidden bg-[#080808] text-white dark:bg-rdark transition-colors ${usePredStyleLayout ? 'home-main-style' : ''}`}>
      <AppHeader
        darkMode={darkMode}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Main layout */}
      <main className="app-main flex min-h-[calc(100vh-56px)] flex-col gap-4 xl:h-[calc(100vh-56px)] xl:min-h-0 xl:flex-row xl:gap-6 xl:overflow-hidden">
        <div className="xl:hidden w-full overflow-hidden">
          <Sidebar
            balance={balance}
            winStreak={mockUser.winStreak}
            winRate={0.68}
            totalPredictions={42}
            activePredictions={5}
            pet={currentPet}
            newsByMarketId={newsByMarketId}
            petDialogue={petDialogue}
            idleDialogues={petDialogues.idle}
            activeView={activeView}
            onViewChange={handleViewChange}
          />
        </div>

        <aside className="app-sidebar hidden xl:block h-full w-[260px] shrink-0 self-stretch overflow-hidden">
          <Sidebar
            balance={balance}
            winStreak={mockUser.winStreak}
            winRate={0.68}
            totalPredictions={42}
            activePredictions={5}
            pet={currentPet}
            newsByMarketId={newsByMarketId}
            petDialogue={petDialogue}
            idleDialogues={petDialogues.idle}
            activeView={activeView}
            onViewChange={handleViewChange}
          />
        </aside>

        <div className="app-content flex-1 min-w-0 overflow-visible space-y-4 overscroll-contain md:space-y-6 xl:h-full xl:min-h-0 xl:overflow-y-auto xl:pr-1">
          {/* pk战场 */}
          {activeView === 'predictions' && selectedNewsId && (<section className="view-shell view-rhythm view-event-battle w-full max-w-none mx-0 grid gap-4">
            <EventBattle
              news={allNews.find((n) => n.id === selectedNewsId) ?? heroNewsItem}
              onBack={() => setSelectedNewsId(null)}
              userSide={selectedNewsId ? userVotes[selectedNewsId] ?? null : null}
              onBet={handleBet}
              bettingMarketId={bettingMarketId}
            />
          </section>)}
          {/* 最新热点 */}
          {activeView === 'predictions' && selectedTopic && (<section className="view-shell view-rhythm view-topic w-full max-w-none mx-0 grid gap-4">
            <TopicDetail
              topic={selectedTopic}
              relatedNews={
                selectedTopic.relatedNewsId
                  ? allNews.find((n) => n.id === selectedTopic.relatedNewsId) ?? heroNewsItem
                  : null
              }
              relatedPosts={
                selectedTopic.relatedNewsId
                  ? communityPosts.filter((p) => p.relatedNewsId === selectedTopic.relatedNewsId)
                  : []
              }
              onBack={() => setSelectedTopic(null)}
              onBetSuccess={handlePredictionBetSuccess}
              onRequireAuth={() => setAuthModalOpen(true)}
              onEnterBattle={setSelectedNewsId}
              onLikePost={handleLikePost}
              onLikeComment={handleLikeComment}
              onAddComment={handleAddComment}
            />
          </section>)}
          {/* 话题 */}
          {activeView === 'predictions' && !selectedTopic && !selectedNewsId && (
            <PredictionsView
              selectedTag={selectedTag}
              onBetSuccess={handlePredictionBetSuccess}
              onRequireAuth={() => setAuthModalOpen(true)}
              onEnterBattle={setSelectedNewsId}
            />
          )}
          {/* 社区广场 */}
          {activeView === 'forum' && (
            <section className="view-shell view-rhythm view-forum w-full max-w-none mx-0 grid gap-4">
              <Forum />
            </section>
          )}
          {/* 宠物 */}
          {activeView === 'pet' && (
            <section className="view-shell view-rhythm view-pet w-full max-w-none mx-0 grid gap-4">
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
          {/* 宠物面板 */}
          {activeView === 'profile' && (
            <section className="view-shell view-rhythm view-profile w-full max-w-none mx-0 grid gap-4">
              <ProfilePage
                userId={userInfo.data?.id ?? ""}
                userName="路边社社长"
                userHandle="预测达人"
                avatar="🦊"
                posts={communityPosts}
                pet={currentPet}
                skins={skins}
                balance={balance}
                onBack={() => setActiveView('predictions')}
                onOpenForum={() => setActiveView('forum')}
              />
            </section>
          )}
          {/* 排行榜 */}
          {activeView === 'rank' && (
            <RankPage />
          )}
          {/* 龟龟跳海 */}
          {activeView === 'lab' && (
            <section className="view-shell view-rhythm view-lab w-full max-w-none mx-0 grid gap-4">
              <TurtleDivePixel onBack={() => setActiveView('predictions')} />
            </section>
          )}
          {/* 抽奖&商店 */}
          {activeView === 'shop' && (
            <section className="view-shell view-rhythm view-shop w-full max-w-none mx-0 grid gap-4">
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
          {/* 开战广场 */}
          {activeView === 'battle' && (
            <section className="view-shell view-rhythm view-battle-square w-full max-w-none mx-0 grid gap-4">
              <BattleSquarePixel
                battles={battles}
                userBalance={balance}
                onCreateBattle={handleCreateBattle}
                onAcceptBattle={handleAcceptBattle}
                onResolveBattle={handleResolveBattle}
              />
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      {!isEventBattleActive && (
        <AppFooter />
      )}

      <FloatingGuideButton onClick={() => setGuideOpen(true)} sizeClassName="w-13 h-13" />

      {/* ━━━ 浮动宠物聊天入口 ━━━ */}
      <FloatingPetChat
        open={floatingChatOpen}
        pet={currentPet}
        stamina={petStamina}
        onToggle={() => setFloatingChatOpen((v) => !v)}
        onClose={() => setFloatingChatOpen(false)}
        onStaminaChange={setPetStamina}
      />

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
