import { useState, useCallback, useEffect } from 'react';
import { Sidebar } from '../components/layout';
import type { ViewType } from '../components/layout';
import { EventBattle, PredictionsView } from '../components/predictions';
import { Forum } from '../components/forum';
import { Shop } from '../components/shop';
import { TopicDetail } from '../components/topic';
import { BattleSquarePixel } from '../components/battle';
import { TurtleDivePixel } from '../components/lab';
import { RankPage } from '../components/rank';
import { FloatingPetChat } from '../components/layout/ui/FloatingPetChat';
import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';
import { GuideTourModal } from './GuideTourModal';
import type { NewsItem, ForumPost, Battle, BattleSide, PetSkin, HotTopic } from '../data/mock_data';
import {
  mockUser,
  mockNews,
  heroNews,
  petDialogues,
  mockForumPosts,
  mockBattles,
  mockPetSkins,
} from '../data/mock_data';

// Bet cost per action
const BET_COST = 100;
const THEME_KEY = 'theme';
type ThemeMode = 'light' | 'dark';

function getInitialTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const isDark = mode === 'dark';
  root.classList.toggle('dark', isDark);
  root.setAttribute('data-theme', mode);
  root.style.colorScheme = mode;
}

function App() {
  const [balance, setBalance] = useState(mockUser.balance);
  const [petDialogue, setPetDialogue] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<NewsItem['type'] | 'all'>('all');
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [activeView, setActiveView] = useState<ViewType>('predictions');
  const [forumPosts, setForumPosts] = useState<ForumPost[]>(mockForumPosts);
  const [battles, setBattles] = useState<Battle[]>(mockBattles);
  const [floatingChatOpen, setFloatingChatOpen] = useState(false);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<string, 'A' | 'B'>>({});
  const [petStamina, setPetStamina] = useState(mockUser.petInfo.stamina);
  const [skins, setSkins] = useState<PetSkin[]>(mockPetSkins);
  const [selectedTopic, setSelectedTopic] = useState<HotTopic | null>(null);
  const isEventBattleActive = activeView === 'predictions' && !!selectedNewsId;
  const usePredStyleLayout = true;
  const darkMode = theme === 'dark';

  // Derive current pet avatar from equipped skin
  const equippedSkin = skins.find((s) => s.equipped && s.owned);
  const currentPet = { ...mockUser.petInfo, stamina: petStamina, avatar: equippedSkin?.avatar ?? mockUser.petInfo.avatar };

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

  const filteredNews = activeCategory === 'all'
    ? mockNews
    : mockNews.filter((n) => n.type === activeCategory);

  const handleBet = useCallback(
    (newsId: string, option: 'A' | 'B', _odds: number) => {
      if (balance < BET_COST) return;

      setBalance((b) => b - BET_COST);
      setUserVotes((prev) => ({ ...prev, [newsId]: option }));

      const msg = petDialogues.bet[Math.floor(Math.random() * petDialogues.bet.length)];
      setPetDialogue(msg);
      setTimeout(() => setPetDialogue(null), 3000);
    },
    [balance]
  );

  const handleNewPost = useCallback((content: string, tag: ForumPost['tag'], images: string[]) => {
    const newPost: ForumPost = {
      id: `fp-${Date.now()}`,
      author: { name: '你', handle: '@me_fox', avatar: '🦊' },
      tag,
      content,
      images: images.length > 0 ? images : undefined,
      time: '刚刚',
      likes: 0,
      comments: [],
    };
    setForumPosts((prev) => [newPost, ...prev]);
  }, []);

  const handleLikePost = useCallback((postId: string) => {
    setForumPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p))
    );
  }, []);

  const handleLikeComment = useCallback((postId: string, commentId: string) => {
    setForumPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comments: p.comments.map((c) => (c.id === commentId ? { ...c, likes: c.likes + 1 } : c)) }
          : p
      )
    );
  }, []);

  const handleAddComment = useCallback((postId: string, content: string) => {
    setForumPosts((prev) =>
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

  const handleViewChange = useCallback((view: ViewType) => {
    setActiveView(view);
    if (view === 'predictions') {
      // Directly entering predictions should reset topic-scoped mode and show all.
      setSelectedTopic(null);
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

  void battles;
  void handleCreateBattle;
  void handleAcceptBattle;
  void handleResolveBattle;

  return (
    <div className={`legacy-fusion-app fixed-sidebar-style h-screen overflow-hidden bg-slate-50 dark:bg-rdark transition-colors ${usePredStyleLayout ? 'home-main-style' : ''}`}>
      <AppHeader
        darkMode={darkMode}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onOpenGuide={() => setGuideOpen(true)}
      />

      {/* Main layout */}
      <main className="app-main !px-4 flex h-[calc(100vh-68px)] overflow-hidden gap-4 px-5 py-6">
        {/* Left sidebar */}
        <aside className="app-sidebar hidden xl:block shrink-0 self-start sticky top-14 h-[calc(100vh-72px)] overflow-y-auto overscroll-contain w-[420px] min-w-[420px] max-w-[420px]">
          <Sidebar
            balance={balance}
            winStreak={mockUser.winStreak}
            winRate={0.68}
            totalPredictions={42}
            activePredictions={5}
            pet={currentPet}
            petDialogue={petDialogue}
            idleDialogues={petDialogues.idle}
            onCategoryChange={setActiveCategory}
            activeView={activeView}
            onViewChange={handleViewChange}
            onTopicClick={(topic) => {
              setSelectedTopic(topic);
              setSelectedNewsId(null);
              setActiveView('predictions');
            }}
            onTagClick={() => {
              setSelectedTopic(null);
              setSelectedNewsId(null);
              setActiveView('predictions');
            }}
          />
        </aside>

        {/* Divider between sidebar and content */}
        <div className="hidden xl:block w-px shrink-0 bg-slate-200 dark:bg-rdark-border opacity-60" />

        {/* Center content */}
        {/* <div>{activeView}---{selectedNewsId}---{JSON.stringify(selectedTopic)}</div> */}
        <div className="app-content flex-1 min-w-0 h-full overflow-y-auto overscroll-contain pr-1 space-y-6">
          {activeView === 'predictions' ? (
            selectedNewsId ? (
              <section className="view-shell view-rhythm view-event-battle w-full max-w-none mx-0 grid gap-4">
                <EventBattle
                  news={[heroNews, ...mockNews].find((n) => n.id === selectedNewsId) ?? heroNews}
                  onBack={() => setSelectedNewsId(null)}
                  userSide={selectedNewsId ? userVotes[selectedNewsId] ?? null : null}
                  onBet={handleBet}
                />
              </section>
            ) : selectedTopic ? (
              <section className="view-shell view-rhythm view-topic w-full max-w-none mx-0 grid gap-4">
                <TopicDetail
                  topic={selectedTopic}
                  relatedNews={
                    selectedTopic.relatedNewsId
                      ? [heroNews, ...mockNews].find((n) => n.id === selectedTopic.relatedNewsId) ?? heroNews
                      : null
                  }
                  relatedPosts={
                    selectedTopic.relatedNewsId
                      ? forumPosts.filter((p) => p.relatedNewsId === selectedTopic.relatedNewsId)
                      : []
                  }
                  onBack={() => setSelectedTopic(null)}
                  onBet={handleBet}
                  onEnterBattle={setSelectedNewsId}
                  onLikePost={handleLikePost}
                  onLikeComment={handleLikeComment}
                  onAddComment={handleAddComment}
                />
              </section>
            ) : (
              <PredictionsView heroNews={heroNews} items={filteredNews} onBet={handleBet} onEnterBattle={setSelectedNewsId} />
            )
          ) : activeView === 'forum' ? (
            <section className="view-shell view-rhythm view-forum w-full max-w-none mx-0 grid gap-4">
              <Forum
                posts={forumPosts}
                onNewPost={handleNewPost}
                onLikePost={handleLikePost}
                onLikeComment={handleLikeComment}
                onAddComment={handleAddComment}
              />
            </section>
          )
          //  : activeView === 'pet' ? (
          //   <section className="view-shell view-rhythm view-pet w-full max-w-none mx-0 grid gap-4">
          //     <PetPage
          //       pet={currentPet}
          //       balance={balance}
          //       winRate={0.68}
          //       winStreak={mockUser.winStreak}
          //       totalPredictions={42}
          //       onBack={() => setActiveView('predictions')}
          //       skins={skins}
          //       onEquipSkin={handleEquipSkin}
          //     />
          //   </section>
          // ) 
          : activeView === 'rank' ? (
            <RankPage />
          ) : activeView === 'lab' ? (
            <section className="view-shell view-rhythm view-lab w-full max-w-none mx-0 grid gap-4">
              <TurtleDivePixel onBack={() => setActiveView('predictions')} />
            </section>
          ) : activeView === 'shop' ? (
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
          ) : (
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
    </div>
  );
}

export default App;
