import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  MessageSquare,
  Swords,
  Trophy,
  Settings,
  MessageCircle,
  HelpCircle,
  ChevronDown,
  Coins,
  Hash,
  TrendingUp,
  Gift,
  Backpack,
  Users,
  Newspaper,
  BookOpen,
  FlaskConical,
} from 'lucide-react';
import { PetChat } from './PetChat';
import type { PetInfo, NewsItem, HotTopic } from '../data/mock_data';
import {
  mockRankUsers,
  mockHotTags,
  mockHotTopics,
} from '../data/mock_data';

export type ViewType = 'predictions' | 'forum' | 'battle' | 'pet' | 'lab' | 'shop';

interface SidebarProps {
  balance: number;
  winStreak: number;
  winRate: number;
  totalPredictions: number;
  activePredictions: number;
  pet: PetInfo;
  petDialogue: string | null;
  idleDialogues: string[];
  onCategoryChange: (key: NewsItem['type'] | 'all') => void;
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  onTopicClick?: (topic: HotTopic) => void;
}

function fmtHeat(n: number): string {
  return n >= 10000 ? (n / 10000).toFixed(1) + 'w' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
}

const card = 'rounded-xl bg-white dark:bg-rdark-card border border-slate-200 dark:border-rdark-border shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-none';

/* ── Navigation menu items ── */
const NAV_ITEMS: { key: string; label: string; icon: React.ReactNode; view?: ViewType; enabled: boolean }[] = [
  { key: 'predictions', label: '预测市场', icon: <TrendingUp size={22} />, view: 'predictions', enabled: true },
  { key: 'forum', label: '社区广场', icon: <MessageSquare size={22} />, view: 'forum', enabled: true },
  { key: 'battle', label: '对局', icon: <Swords size={22} />, view: 'battle', enabled: true },
  { key: 'lab', label: '战斗实验室', icon: <FlaskConical size={22} />, view: 'lab', enabled: true },
  { key: 'rank', label: '排行榜', icon: <Trophy size={22} />, enabled: true },
  { key: 'shop', label: '抽奖&商店', icon: <Gift size={22} />, view: 'shop' as ViewType, enabled: true },
  { key: 'inventory', label: '背包&资产', icon: <Backpack size={22} />, enabled: false },
  { key: 'club', label: '俱乐部&工会', icon: <Users size={22} />, enabled: false },
  { key: 'news', label: '新闻源', icon: <Newspaper size={22} />, enabled: false },
  { key: 'tutorial', label: '新手教程&规则', icon: <BookOpen size={22} />, enabled: false },
  { key: 'settings', label: '系统&设置', icon: <Settings size={22} />, enabled: false },
  { key: 'help', label: '帮助&反馈', icon: <HelpCircle size={22} />, enabled: false },
];

export const Sidebar: React.FC<SidebarProps> = ({
  balance,
  winStreak,
  winRate,
  totalPredictions,
  activePredictions,
  pet,
  petDialogue,
  idleDialogues,
  onCategoryChange,
  activeView,
  onViewChange,
  onTopicClick,
}) => {
  const [currentDialogue, setCurrentDialogue] = useState(idleDialogues[0]);
  const [dialogueKey, setDialogueKey] = useState(0);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [rankOpen, setRankOpen] = useState(false);

  useEffect(() => {
    if (petDialogue) {
      setCurrentDialogue(petDialogue);
      setDialogueKey((k) => k + 1);
      return;
    }
    const iv = setInterval(() => {
      const idx = Math.floor(Math.random() * idleDialogues.length);
      setCurrentDialogue(idleDialogues[idx]);
      setDialogueKey((k) => k + 1);
    }, 5000);
    return () => clearInterval(iv);
  }, [petDialogue, idleDialogues]);

  const topRankers = mockRankUsers.slice(0, 7);
  const rankColors: Record<number, string> = {
    0: 'text-amber-500',
    1: 'text-slate-400',
    2: 'text-amber-700 dark:text-amber-600',
  };

  const handleTagClick = (tag: typeof mockHotTags[0]) => {
    setSelectedTag(selectedTag === tag.tag ? null : tag.tag);
    if (tag.category) onCategoryChange(tag.category);
    onViewChange('predictions');
  };

  const handleNavClick = (item: typeof NAV_ITEMS[0]) => {
    if (!item.enabled) return;
    if (item.key === 'rank') {
      setRankOpen((v) => !v);
      return;
    }
    if (item.key === 'predictions') {
      setSelectedTag(null);
      onCategoryChange('all');
    }
    if (item.view) onViewChange(item.view);
  };

  /* ── 宠物空间模式：聊天铺满整个侧栏 ── */
  if (activeView === 'pet') {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)]">
        <div className={`${card} flex-1 overflow-hidden`}>
          <PetChat pet={pet} onClose={() => onViewChange('predictions')} fullScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="overflow-hidden shrink-0 flex flex-col gap-3.5 py-1">

        {/* ━━━ 区域1：个人中心 ━━━ */}
        <div className="overflow-hidden">
          {chatOpen ? (
            <PetChat pet={pet} onClose={() => setChatOpen(false)} />
          ) : (
            <div>
              {/* ── 上半：用户信息 & 战绩 ── */}
              <div className="px-4 pt-4 pb-3">
                {/* 用户头像 + 名字 + 签到 */}
                <div className="flex items-center gap-3 mb-3.5">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 grid place-items-center text-lg text-white font-bold shadow-sm">
                    🦊
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-slate-700 dark:text-rdark-text">路边社社长</div>
                    <div className="text-[10px] text-slate-400 dark:text-rdark-text2 mt-0.5">预测达人 · 连续签到 12 天</div>
                  </div>

                </div>

                {/* 余额居中 */}
                <div className="flex items-center justify-center gap-2 mb-3.5">
                  <Coins size={18} className="text-emerald-500 dark:text-emerald-400" />
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={balance}
                      initial={{ y: -8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 8, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className="text-[26px] font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight"
                    >
                      {balance.toLocaleString()}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-[11px] text-slate-400 dark:text-rdark-text2 self-end mb-1">龟币</span>
                </div>

                {/* 四栏数据 */}
                <div className="grid grid-cols-4 gap-1.5">
                  <div className="bg-slate-50 dark:bg-rdark-input rounded-lg py-2.5 text-center">
                    <div className="text-[15px] font-bold text-slate-700 dark:text-rdark-text leading-none mb-1">{(winRate * 100).toFixed(0)}%</div>
                    <div className="text-[9px] text-slate-400 dark:text-rdark-text2">胜率</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-rdark-input rounded-lg py-2.5 text-center">
                    <div className="text-[15px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-0.5 leading-none mb-1">
                      <Flame size={12} className="text-orange-400" />{winStreak}
                    </div>
                    <div className="text-[9px] text-slate-400 dark:text-rdark-text2">连胜</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-rdark-input rounded-lg py-2.5 text-center">
                    <div className="text-[15px] font-bold text-slate-700 dark:text-rdark-text leading-none mb-1">{totalPredictions}</div>
                    <div className="text-[9px] text-slate-400 dark:text-rdark-text2">已预测</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-rdark-input rounded-lg py-2.5 text-center">
                    <div className="text-[15px] font-bold text-blue-600 dark:text-blue-400 leading-none mb-1">{activePredictions}</div>
                    <div className="text-[9px] text-slate-400 dark:text-rdark-text2">进行中</div>
                  </div>
                </div>
              </div>

              {/* ── 下半：2D 宠物待机场景 ── */}
              <div
                className="relative h-[190px] overflow-hidden cursor-pointer group"
                onClick={() => onViewChange('pet')}
              >

                {/* 多层天空渐变 */}
                <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-50 dark:from-indigo-950 dark:via-slate-900 dark:to-emerald-950" />
                {/* 柔光层 */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(253,230,138,0.25),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_70%_20%,rgba(253,230,138,0.08),transparent_60%)]" />

                {/* 太阳/月亮 */}
                <motion.div
                  animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-3 right-6"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 dark:from-slate-300 dark:to-slate-400 shadow-[0_0_12px_rgba(251,191,36,0.4)] dark:shadow-[0_0_12px_rgba(203,213,225,0.2)]" />
                </motion.div>

                {/* 云层 — 三层不同速度和大小 */}
                <motion.div
                  animate={{ x: [-10, 40, -10] }}
                  transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                  className="absolute top-4 left-2"
                >
                  <div className="relative">
                    <div className="w-14 h-4 bg-white/60 dark:bg-white/8 rounded-full" />
                    <div className="absolute -top-1.5 left-3 w-8 h-4 bg-white/50 dark:bg-white/6 rounded-full" />
                    <div className="absolute -top-0.5 left-8 w-5 h-3 bg-white/40 dark:bg-white/5 rounded-full" />
                  </div>
                </motion.div>
                <motion.div
                  animate={{ x: [10, -25, 10] }}
                  transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
                  className="absolute top-9 right-4"
                >
                  <div className="relative">
                    <div className="w-10 h-3 bg-white/45 dark:bg-white/6 rounded-full" />
                    <div className="absolute -top-1 left-2 w-6 h-3 bg-white/35 dark:bg-white/5 rounded-full" />
                  </div>
                </motion.div>
                <motion.div
                  animate={{ x: [0, 20, 0] }}
                  transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
                  className="absolute top-14 left-1/4"
                >
                  <div className="w-8 h-2.5 bg-white/30 dark:bg-white/4 rounded-full" />
                </motion.div>

                {/* 远景山丘 */}
                <div className="absolute bottom-[52px] left-0 right-0 h-[30px]">
                  <svg viewBox="0 0 260 30" className="w-full h-full" preserveAspectRatio="none">
                    <path d="M0 30 Q30 8 65 18 Q100 5 130 14 Q165 2 195 12 Q225 6 260 16 L260 30 Z"
                      className="fill-emerald-200/60 dark:fill-emerald-900/30" />
                  </svg>
                </div>

                {/* 地面 — 多层质感 */}
                <div className="absolute bottom-0 left-0 right-0 h-[50px]">
                  {/* 泥土底层 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-600/30 via-emerald-400/40 to-emerald-200/30 dark:from-emerald-950/80 dark:via-emerald-900/50 dark:to-emerald-900/20" />
                  {/* 草皮分界线 */}
                  <svg viewBox="0 0 260 12" className="absolute -top-1 left-0 w-full h-3" preserveAspectRatio="none">
                    <path d="M0 12 Q8 4 16 8 Q24 2 32 7 Q40 3 48 8 Q56 1 64 6 Q72 3 80 8 Q88 2 96 7 Q104 4 112 8 Q120 1 128 6 Q136 3 144 8 Q152 2 160 7 Q168 4 176 8 Q184 1 192 6 Q200 3 208 8 Q216 2 224 7 Q232 4 240 8 Q248 2 260 6 L260 12 Z"
                      className="fill-emerald-300/70 dark:fill-emerald-800/50" />
                  </svg>
                  {/* 草丛组 — 左侧 */}
                  <div className="absolute bottom-[8px] left-3 flex gap-[2px] items-end">
                    <div className="w-[3px] h-[10px] bg-emerald-500/60 dark:bg-emerald-600/40 rounded-t-full -rotate-6" />
                    <div className="w-[2px] h-[13px] bg-emerald-600/50 dark:bg-emerald-500/35 rounded-t-full" />
                    <div className="w-[3px] h-[9px] bg-emerald-500/55 dark:bg-emerald-600/40 rounded-t-full rotate-6" />
                  </div>
                  <div className="absolute bottom-[8px] left-12 flex gap-[2px] items-end">
                    <div className="w-[2px] h-[8px] bg-emerald-500/50 dark:bg-emerald-600/35 rounded-t-full -rotate-3" />
                    <div className="w-[3px] h-[11px] bg-emerald-600/45 dark:bg-emerald-500/30 rounded-t-full rotate-2" />
                  </div>
                  {/* 草丛组 — 右侧 */}
                  <div className="absolute bottom-[8px] right-5 flex gap-[2px] items-end">
                    <div className="w-[3px] h-[11px] bg-emerald-500/55 dark:bg-emerald-600/40 rounded-t-full -rotate-4" />
                    <div className="w-[2px] h-[14px] bg-emerald-600/50 dark:bg-emerald-500/35 rounded-t-full rotate-2" />
                    <div className="w-[2px] h-[9px] bg-emerald-500/45 dark:bg-emerald-600/30 rounded-t-full rotate-8" />
                  </div>
                  <div className="absolute bottom-[8px] right-16 flex gap-[2px] items-end">
                    <div className="w-[2px] h-[7px] bg-emerald-600/40 dark:bg-emerald-500/25 rounded-t-full" />
                    <div className="w-[3px] h-[10px] bg-emerald-500/50 dark:bg-emerald-600/35 rounded-t-full -rotate-3" />
                  </div>
                  {/* 小花 */}
                  <div className="absolute bottom-[14px] left-[70px] text-[6px] opacity-70">🌼</div>
                  <div className="absolute bottom-[12px] right-[55px] text-[5px] opacity-60">🌸</div>
                  {/* 小石头 */}
                  <div className="absolute bottom-[6px] left-[45%] w-3 h-1.5 bg-slate-400/30 dark:bg-slate-600/30 rounded-full" />
                  <div className="absolute bottom-[5px] left-[30%] w-2 h-1 bg-slate-400/20 dark:bg-slate-600/20 rounded-full" />
                </div>

                {/* 飘落粒子（萤火虫/花瓣） */}
                <motion.div
                  animate={{ y: [0, 60, 0], x: [0, 8, -5, 0], opacity: [0, 0.7, 0.7, 0] }}
                  transition={{ duration: 6, repeat: Infinity, delay: 0 }}
                  className="absolute top-6 left-[20%] w-1 h-1 rounded-full bg-amber-300/60 dark:bg-amber-400/40"
                />
                <motion.div
                  animate={{ y: [0, 50, 0], x: [0, -6, 4, 0], opacity: [0, 0.5, 0.5, 0] }}
                  transition={{ duration: 8, repeat: Infinity, delay: 2 }}
                  className="absolute top-4 left-[65%] w-1 h-1 rounded-full bg-pink-300/50 dark:bg-pink-400/30"
                />
                <motion.div
                  animate={{ y: [0, 45, 0], x: [0, 5, -3, 0], opacity: [0, 0.6, 0.6, 0] }}
                  transition={{ duration: 7, repeat: Infinity, delay: 4 }}
                  className="absolute top-8 left-[45%] w-0.5 h-0.5 rounded-full bg-amber-200/70 dark:bg-amber-300/40"
                />

                {/* 宠物角色 — 居中 */}
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute bottom-[44px] left-1/2 -translate-x-1/2 flex flex-col items-center z-10"
                >
                  {/* 对话气泡 */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={dialogueKey}
                      initial={{ opacity: 0, y: 5, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.9 }}
                      className="relative mb-2 max-w-[180px] px-3 py-1.5 rounded-xl bg-white/90 dark:bg-rdark-card/90 shadow-lg border border-white/60 dark:border-rdark-border text-center backdrop-blur-sm"
                    >
                      <span className="text-[10px] text-slate-600 dark:text-rdark-text leading-snug block truncate">
                        {currentDialogue}
                      </span>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/90 dark:bg-rdark-card/90 rotate-45 border-r border-b border-white/60 dark:border-rdark-border" />
                    </motion.div>
                  </AnimatePresence>

                  {/* 宠物主体 */}
                  <div className="text-[48px] leading-none select-none drop-shadow-lg">
                    {pet.avatar}
                  </div>

                  {/* 名字 + 等级 */}
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 drop-shadow-sm">{pet.name}</span>
                    <span className="text-[8px] px-1.5 py-px rounded-full bg-emerald-500/80 text-white font-bold shadow-sm">
                      Lv.{pet.level}
                    </span>
                  </div>
                </motion.div>

                {/* 宠物脚下阴影 */}
                <motion.div
                  animate={{ scale: [1, 0.9, 1], opacity: [0.15, 0.1, 0.15] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute bottom-[38px] left-1/2 -translate-x-1/2 w-14 h-2.5 bg-black/15 dark:bg-black/25 rounded-full blur-[2px] z-0"
                />

                {/* 心情 & 体力 — 左上角状态面板 */}
                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5">
                  {/* 今日心情 */}
                  <div className="flex items-center gap-1.5 bg-white/70 dark:bg-rdark-card/70 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm border border-white/40 dark:border-rdark-border/50">
                    <span className="text-[11px]">😊</span>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-slate-400 dark:text-rdark-text2 leading-none">心情</span>
                      <span className="text-[9px] font-bold text-amber-500 dark:text-amber-400 leading-tight">开心</span>
                    </div>
                  </div>
                  {/* 体力值 */}
                  <div className="flex items-center gap-1.5 bg-white/70 dark:bg-rdark-card/70 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm border border-white/40 dark:border-rdark-border/50">
                    <span className="text-[11px]">⚡</span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] text-slate-400 dark:text-rdark-text2 leading-none">体力</span>
                      <div className="flex items-center gap-1">
                        <div className="w-[38px] h-[5px] bg-slate-200/80 dark:bg-rdark-border rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '78%' }}
                            transition={{ duration: 1, delay: 0.3 }}
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
                          />
                        </div>
                        <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 leading-none">78</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 聊天按钮 — 底部悬浮 */}
                <button
                  onClick={(e) => { e.stopPropagation(); setChatOpen(true); }}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 px-5 py-2 rounded-full text-[11px] font-bold cursor-pointer transition-all bg-white/80 dark:bg-rdark-card/80 text-emerald-600 dark:text-emerald-400 hover:bg-white dark:hover:bg-rdark-card border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1.5 shadow-lg backdrop-blur-md hover:scale-105 hover:shadow-xl"
                >
                  <MessageCircle size={13} /> 和龟仙人聊聊
                </button>

                {/* 进入宠物空间提示 */}
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white/80 dark:bg-rdark-card/80 backdrop-blur-sm rounded-md px-2 py-1 text-[9px] font-medium text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200/40 dark:border-emerald-800/40">
                    进入宠物空间 →
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ━━━ 区域2：最新热点排行榜（无卡片包裹） ━━━ */}
        <div className="px-4 py-3.5">
          <div className="text-[18px] font-bold text-slate-500 dark:text-rdark-text2 flex items-center gap-2 mb-3">
            <Flame size={20} className="text-orange-400" /> 最新热点
          </div>

          <div className="flex gap-3">
            {/* 左侧：热点列表 */}
            <div className="flex-1 min-w-0 space-y-0.5">
              {mockHotTopics.map((topic) => (
                <div
                  key={topic.rank}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-slate-50 dark:hover:bg-rdark-hover transition-colors group"
                  onClick={() => onTopicClick ? onTopicClick(topic) : onViewChange('predictions')}
                >
                  <span className={`text-[14px] font-extrabold w-5 text-center shrink-0 ${
                    topic.rank <= 2 ? 'text-orange-500' : topic.rank === 3 ? 'text-amber-500' : 'text-slate-400 dark:text-rdark-text2'
                  }`}>
                    {topic.rank}
                  </span>
                  <span className="flex-1 min-w-0 text-[14px] text-slate-600 dark:text-rdark-text truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {topic.title}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-rdark-text2 shrink-0">
                    {fmtHeat(topic.heat)}
                  </span>
                </div>
              ))}
            </div>

            {/* 右侧：话题标签 */}
            <div className="w-[90px] shrink-0">
              <div className="text-[11px] font-bold text-slate-400 dark:text-rdark-text2 mb-1.5 flex items-center gap-1">
                <Hash size={11} /> 话题
              </div>
              <div className="flex flex-col gap-1">
                {mockHotTags.map((t) => (
                  <button
                    key={t.tag}
                    onClick={() => handleTagClick(t)}
                    className={`w-full px-2 py-1.5 rounded-md text-[11px] font-medium cursor-pointer transition-all border text-left truncate ${
                      selectedTag === t.tag
                        ? 'bg-emerald-50 dark:bg-emerald-900/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 font-semibold'
                        : 'bg-transparent text-slate-500 dark:text-rdark-text2 border-slate-100 dark:border-rdark-border hover:bg-slate-50 dark:hover:bg-rdark-hover'
                    }`}
                  >
                    {t.tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ━━━ 区域3：导航目录（独立滚动） ━━━ */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-1 py-1">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
              const isActive = item.view ? activeView === item.view : (item.key === 'rank' && rankOpen);

              return (
                <React.Fragment key={item.key}>
                  <button
                    onClick={() => handleNavClick(item)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[18px] font-semibold cursor-pointer transition-all border-0 text-left ${
                      !item.enabled
                        ? 'text-slate-300 dark:text-rdark-text2/50 cursor-default'
                        : isActive
                          ? 'bg-emerald-50 dark:bg-emerald-900/15 text-emerald-700 dark:text-emerald-400'
                          : 'bg-transparent text-slate-600 dark:text-rdark-text hover:bg-slate-100/80 dark:hover:bg-rdark-hover'
                    }`}
                  >
                    <span className={`w-6 shrink-0 flex items-center justify-center ${
                      !item.enabled
                        ? 'text-slate-300 dark:text-rdark-text2/50'
                        : isActive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400 dark:text-rdark-text2'
                    }`}>
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {!item.enabled && (
                      <span className="text-[10px] text-slate-300 dark:text-rdark-text2/50 shrink-0">即将开放</span>
                    )}
                    {item.key === 'rank' && item.enabled && (
                      <ChevronDown size={18} className={`text-slate-400 dark:text-rdark-text2 transition-transform ${rankOpen ? '' : '-rotate-90'}`} />
                    )}
                  </button>

                  {/* 排行榜展开面板 */}
                  {item.key === 'rank' && rankOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mx-2 mb-1 mt-0.5 rounded-lg bg-slate-50/80 dark:bg-rdark-input/50 py-1">
                        {topRankers.map((u, i) => (
                          <div key={u.rank} className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white dark:hover:bg-rdark-hover transition-colors cursor-pointer">
                            <span className={`text-[11px] font-extrabold w-4 text-center shrink-0 ${rankColors[i] ?? 'text-slate-400 dark:text-rdark-text2'}`}>
                              {u.rank}
                            </span>
                            <span className="text-sm shrink-0">{u.avatar}</span>
                            <span className="flex-1 min-w-0 text-[11px] text-slate-600 dark:text-rdark-text truncate">{u.name}</span>
                            <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">{u.coins.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
    </div>
  );
};
