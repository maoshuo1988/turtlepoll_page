import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Moon, Sun, Bell, MessageCircle, X } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import type { ViewType } from './components/Sidebar';
import { HeroPrediction } from './components/HeroPrediction';
import { NewsFeed } from './components/NewsFeed';
import { Forum } from './components/Forum';
import { BattleView } from './components/BattleView';
import { PetChat } from './components/PetChat';
import { PetPage } from './components/PetPage';
import { EventBattle } from './components/EventBattle';
import { Lab } from './components/Lab';
import { Shop } from './components/Shop';
import { TopicDetail } from './components/TopicDetail';
import type { NewsItem, ForumPost, Battle, BattleSide, PetSkin, HotTopic } from './data/mock_data';
import {
  mockUser,
  mockNews,
  heroNews,
  petDialogues,
  mockForumPosts,
  mockBattles,
  mockPetSkins,
} from './data/mock_data';

// Bet cost per action
const BET_COST = 100;

function App() {
  const [balance, setBalance] = useState(mockUser.balance);
  const [petDialogue, setPetDialogue] = useState<string | null>(null);
  const [betFlash, setBetFlash] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<NewsItem['type'] | 'all'>('all');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [activeView, setActiveView] = useState<ViewType>('predictions');
  const [forumPosts, setForumPosts] = useState<ForumPost[]>(mockForumPosts);
  const [battles, setBattles] = useState<Battle[]>(mockBattles);
  const [floatingChatOpen, setFloatingChatOpen] = useState(false);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, 'A' | 'B'>>({});
  const [petStamina, setPetStamina] = useState(mockUser.petInfo.stamina);
  const [skins, setSkins] = useState<PetSkin[]>(mockPetSkins);
  const [selectedTopic, setSelectedTopic] = useState<HotTopic | null>(null);
  const isEventBattleActive = activeView === 'predictions' && !!selectedNewsId;

  // Derive current pet avatar from equipped skin
  const equippedSkin = skins.find((s) => s.equipped && s.owned);
  const currentPet = { ...mockUser.petInfo, stamina: petStamina, avatar: equippedSkin?.avatar ?? mockUser.petInfo.avatar };

  const handleEquipSkin = useCallback((skinId: string) => {
    setSkins((prev) =>
      prev.map((s) => ({
        ...s,
        equipped: s.id === skinId,
      })),
    );
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

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
      setBetFlash(newsId);

      setTimeout(() => setPetDialogue(null), 3000);
      setTimeout(() => setBetFlash(null), 600);
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
    <div className="min-h-screen bg-slate-50 dark:bg-rdark transition-colors">
      {/* Top nav — minimal */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-rdark-card/95 backdrop-blur-xl border-b border-slate-100 dark:border-rdark-border">
        <div className="flex items-center gap-4 px-8 py-2.5">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0 cursor-pointer group">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="shrink-0">
              {/* Shell */}
              <ellipse cx="16" cy="15" rx="11" ry="10" className="fill-emerald-500 dark:fill-emerald-400" />
              {/* Shell pattern — hexagonal lines */}
              <path d="M16 5 L16 25 M7 10 L25 10 M7 20 L25 20 M9 7 L23 23 M23 7 L9 23"
                stroke="white" strokeWidth="0.8" strokeOpacity="0.3" strokeLinecap="round" />
              {/* Head */}
              <circle cx="25" cy="12" r="3.5" className="fill-emerald-600 dark:fill-emerald-500" />
              {/* Eye */}
              <circle cx="26.2" cy="11.2" r="1" fill="white" />
              <circle cx="26.5" cy="11" r="0.5" className="fill-slate-800 dark:fill-rdark" />
              {/* Front legs */}
              <ellipse cx="23" cy="22" rx="2.2" ry="1.5" transform="rotate(-25 23 22)" className="fill-emerald-600 dark:fill-emerald-500" />
              <ellipse cx="9" cy="22" rx="2.2" ry="1.5" transform="rotate(25 9 22)" className="fill-emerald-600 dark:fill-emerald-500" />
              {/* Tail */}
              <path d="M5.5 16 Q3 16 3.5 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-emerald-600 dark:text-emerald-500" />
            </svg>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
                龟投
              </span>
              <div className="text-[9px] text-slate-400 dark:text-rdark-text2 -mt-0.5 tracking-wide">
                新闻 · 预测 · 宠物
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-xl">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-rdark-input rounded-full px-4 py-2 border border-slate-200 dark:border-rdark-border hover:border-slate-300 dark:hover:border-rdark-text2 transition-colors">
              <Search size={16} className="text-slate-400 dark:text-rdark-text2 shrink-0" />
              <input
                type="text"
                placeholder="搜索热点事件..."
                className="bg-transparent border-0 outline-none text-sm text-slate-700 dark:text-rdark-text placeholder:text-slate-400 dark:placeholder:text-rdark-text2 w-full"
              />
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setDarkMode((d) => !d)}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-rdark-hover transition-colors text-slate-400 dark:text-rdark-text2 border-0 bg-transparent cursor-pointer"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-rdark-hover transition-colors text-slate-400 dark:text-rdark-text2 border-0 bg-transparent cursor-pointer relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <main
        className={`flex min-h-[calc(100vh-56px)] ${
          isEventBattleActive ? 'gap-0 px-0 py-0' : 'gap-6 p-6 px-8'
        }`}
      >
        {/* Left sidebar */}
        <aside className="w-[260px] shrink-0 hidden xl:block sticky top-[57px] self-start">
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
            onViewChange={setActiveView}
            onTopicClick={(topic) => {
              setSelectedTopic(topic);
              setSelectedNewsId(null);
              setActiveView('predictions');
            }}
          />
        </aside>

        {/* Divider between sidebar and content */}
        <div className="hidden xl:block w-px shrink-0 bg-slate-200 dark:bg-rdark-border" />

        {/* Center content */}
        <div className={`flex-1 min-w-0 ${isEventBattleActive ? 'h-[calc(100vh-56px)]' : 'space-y-6'}`}>
          {activeView === 'predictions' ? (
            selectedNewsId ? (
              <EventBattle
                news={[heroNews, ...mockNews].find((n) => n.id === selectedNewsId) ?? heroNews}
                onBack={() => setSelectedNewsId(null)}
                userSide={selectedNewsId ? userVotes[selectedNewsId] ?? null : null}
                onBet={handleBet}
              />
            ) : selectedTopic ? (
              <TopicDetail
                topic={selectedTopic}
                relatedNews={
                  selectedTopic.relatedNewsId
                    ? [heroNews, ...mockNews].find((n) => n.id === selectedTopic.relatedNewsId) ?? null
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
            ) : (
              <>
                <AnimatePresence>
                  {betFlash === heroNews.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-cyan-400/5 pointer-events-none z-40"
                    />
                  )}
                </AnimatePresence>
                <HeroPrediction news={heroNews} onBet={handleBet} onEnterBattle={setSelectedNewsId} />
                <NewsFeed items={filteredNews} onBet={handleBet} onEnterBattle={setSelectedNewsId} />
              </>
            )
          ) : activeView === 'forum' ? (
            <Forum
              posts={forumPosts}
              onNewPost={handleNewPost}
              onLikePost={handleLikePost}
              onLikeComment={handleLikeComment}
              onAddComment={handleAddComment}
            />
          ) : activeView === 'pet' ? (
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
          ) : activeView === 'lab' ? (
            <Lab onBack={() => setActiveView('predictions')} />
          ) : activeView === 'shop' ? (
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
          ) : (
            <BattleView
              battles={battles}
              userBalance={balance}
              onCreateBattle={handleCreateBattle}
              onAcceptBattle={handleAcceptBattle}
              onResolveBattle={handleResolveBattle}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      {!isEventBattleActive && (
        <footer className="px-8 py-8 text-center text-xs text-slate-300 dark:text-rdark-text2">
          龟投 · 一切未经证实的消息都值得一赌 · 仅供娱乐
        </footer>
      )}

      {/* ━━━ 浮动宠物聊天入口 ━━━ */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {floatingChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="absolute bottom-16 right-0 w-[320px] rounded-2xl bg-white dark:bg-rdark-card border border-slate-200 dark:border-rdark-border shadow-2xl overflow-hidden"
            >
              <PetChat
                pet={currentPet}
                onClose={() => setFloatingChatOpen(false)}
                stamina={petStamina}
                onStaminaChange={setPetStamina}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setFloatingChatOpen((v) => !v)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 rounded-full bg-emerald-500 dark:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 dark:shadow-emerald-900/40 border-0 cursor-pointer flex items-center justify-center transition-colors hover:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          {floatingChatOpen ? <X size={22} /> : <MessageCircle size={22} />}
        </motion.button>
      </div>
    </div>
  );
}

export default App;
