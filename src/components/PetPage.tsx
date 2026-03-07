import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Heart,
  Zap,
  Star,
  Trophy,
  Shield,
  Sparkles,
  Clock,
  Lock,
  Check,
  MessageCircle,
} from 'lucide-react';
import { PetChat } from './PetChat';
import type {
  PetInfo,
  PetSkill,
  PetMemory,
  PetRarity,
  PetSkin,
} from '../data/mock_data';
import {
  mockPetSkills,
  mockPetTasks,
  mockPetAchievements,
  mockPetSkins,
  mockPetMemories,
  RARITY_COLORS,
  RARITY_BORDER_COLORS,
  petDialogues,
} from '../data/mock_data';

type PetTab = 'status' | 'abilities' | 'tasks' | 'cosmetics' | 'memory';

const TAB_LIST: { key: PetTab; label: string; icon: React.ReactNode }[] = [
  { key: 'status', label: '状态', icon: <Heart size={14} /> },
  { key: 'abilities', label: '能力', icon: <Zap size={14} /> },
  { key: 'tasks', label: '任务', icon: <Star size={14} /> },
  { key: 'cosmetics', label: '装扮', icon: <Sparkles size={14} /> },
  { key: 'memory', label: '记忆', icon: <Clock size={14} /> },
];

const card = 'rounded-xl bg-white dark:bg-rdark-card border border-slate-200 dark:border-rdark-border shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-none';

interface PetPageProps {
  pet: PetInfo;
  balance: number;
  winRate: number;
  winStreak: number;
  totalPredictions: number;
  onBack: () => void;
  skins?: PetSkin[];
  onEquipSkin?: (skinId: string) => void;
}

/* ── Rarity badge ── */
const RarityBadge: React.FC<{ rarity: PetRarity }> = ({ rarity }) => (
  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${RARITY_COLORS[rarity]}`}>
    {rarity}
  </span>
);

/* ━━━━━━━━━━━━━━━ Status Tab ━━━━━━━━━━━━━━━ */
const StatusTab: React.FC<{ winRate: number; winStreak: number; totalPredictions: number; balance: number }> = ({
  winRate, winStreak, totalPredictions, balance,
}) => {
  const dailyTasks = mockPetTasks.filter((t) => t.category === 'daily');
  const completedDaily = dailyTasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-4">
      {/* 心情 & 体力 */}
      <div className={`${card} p-4`}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-rdark-text2 mb-3">今日状态</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-100 dark:border-amber-900/30">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">😊</span>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">开心</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-rdark-text2">今日预测顺利，心情大好！</div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900/30">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">⚡</span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">78 / 100</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200/80 dark:bg-rdark-border rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '78%' }}
                transition={{ duration: 1, delay: 0.2 }}
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
              />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-rdark-text2 mt-1">体力值</div>
          </div>
        </div>
      </div>

      {/* 战绩概览 */}
      <div className={`${card} p-4`}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-rdark-text2 mb-3">战绩概览</div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: '余额', value: balance.toLocaleString(), sub: '龟币', color: 'text-emerald-600 dark:text-emerald-400' },
            { label: '胜率', value: `${(winRate * 100).toFixed(0)}%`, sub: '', color: 'text-slate-700 dark:text-rdark-text' },
            { label: '连胜', value: String(winStreak), sub: '🔥', color: 'text-orange-500' },
            { label: '已预测', value: String(totalPredictions), sub: '次', color: 'text-blue-600 dark:text-blue-400' },
          ].map((s) => (
            <div key={s.label} className="bg-slate-50 dark:bg-rdark-input rounded-lg py-3 text-center">
              <div className={`text-[16px] font-extrabold leading-none mb-1 ${s.color}`}>{s.value}</div>
              <div className="text-[9px] text-slate-400 dark:text-rdark-text2">{s.label} {s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 每日任务速览 */}
      <div className={`${card} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-rdark-text2">每日任务</div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{completedDaily}/{dailyTasks.length} 已完成</span>
        </div>
        <div className="space-y-2">
          {dailyTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-rdark-hover transition-colors">
              <span className="text-sm shrink-0">{task.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-slate-700 dark:text-rdark-text">{task.title}</div>
                <div className="text-[9px] text-slate-400 dark:text-rdark-text2">{task.description}</div>
              </div>
              {task.completed ? (
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 grid place-items-center shrink-0">
                  <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                </span>
              ) : (
                <span className="text-[9px] text-slate-400 dark:text-rdark-text2 shrink-0">{task.progress}/{task.total}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ━━━━━━━━━━━━━━━ Abilities Tab ━━━━━━━━━━━━━━━ */
const AbilitiesTab: React.FC = () => {
  const passives = mockPetSkills.filter((s) => s.type === 'passive');
  const actives = mockPetSkills.filter((s) => s.type === 'active');

  const SkillCard: React.FC<{ skill: PetSkill }> = ({ skill }) => (
    <div className={`${card} p-3 ${!skill.unlocked ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-rdark-input grid place-items-center text-xl shrink-0">
          {skill.unlocked ? skill.icon : <Lock size={16} className="text-slate-300 dark:text-rdark-text2" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[12px] font-bold text-slate-700 dark:text-rdark-text">{skill.name}</span>
            {skill.unlocked && (
              <span className="text-[9px] px-1.5 py-px rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold">
                Lv.{skill.level}/{skill.maxLevel}
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-rdark-text2 mb-1.5">{skill.description}</div>
          {skill.unlocked && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-slate-200 dark:bg-rdark-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all"
                  style={{ width: `${(skill.level / skill.maxLevel) * 100}%` }}
                />
              </div>
              {skill.cooldown && (
                <span className="text-[8px] text-slate-400 dark:text-rdark-text2 shrink-0">CD: {skill.cooldown}</span>
              )}
            </div>
          )}
          {!skill.unlocked && (
            <div className="text-[9px] text-slate-400 dark:text-rdark-text2 flex items-center gap-1">
              <Lock size={9} /> 未解锁
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-rdark-text2 mb-2.5 flex items-center gap-1.5">
          <Shield size={11} /> 被动技能
        </div>
        <div className="space-y-2">
          {passives.map((s) => <SkillCard key={s.id} skill={s} />)}
        </div>
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-rdark-text2 mb-2.5 flex items-center gap-1.5">
          <Zap size={11} /> 主动技能
        </div>
        <div className="space-y-2">
          {actives.map((s) => <SkillCard key={s.id} skill={s} />)}
        </div>
      </div>
    </div>
  );
};

/* ━━━━━━━━━━━━━━━ Tasks Tab ━━━━━━━━━━━━━━━ */
const TasksTab: React.FC = () => {
  const [taskCategory, setTaskCategory] = useState<'daily' | 'weekly' | 'story'>('daily');
  const filtered = mockPetTasks.filter((t) => t.category === taskCategory);
  const categories = [
    { key: 'daily' as const, label: '每日' },
    { key: 'weekly' as const, label: '每周' },
    { key: 'story' as const, label: '成长' },
  ];

  return (
    <div className="space-y-4">
      {/* Task list */}
      <div className={`${card} p-4`}>
        <div className="flex items-center gap-2 mb-3">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setTaskCategory(c.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer transition-all border-0 ${
                taskCategory === c.key
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold'
                  : 'bg-transparent text-slate-500 dark:text-rdark-text2 hover:bg-slate-50 dark:hover:bg-rdark-hover'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {filtered.map((task) => (
            <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50/50 dark:bg-rdark-input/30 border border-slate-100 dark:border-rdark-border">
              <span className="text-lg shrink-0">{task.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-slate-700 dark:text-rdark-text">{task.title}</span>
                  {task.completed && <Check size={13} className="text-emerald-500" />}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-rdark-text2 mb-1">{task.description}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-rdark-border rounded-full overflow-hidden max-w-[120px]">
                    <div
                      className={`h-full rounded-full transition-all ${task.completed ? 'bg-emerald-400' : 'bg-blue-400'}`}
                      style={{ width: `${(task.progress / task.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 dark:text-rdark-text2">{task.progress}/{task.total}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400">+{task.reward}</div>
                <div className="text-[8px] text-slate-400 dark:text-rdark-text2">
                  {task.rewardType === 'coin' ? '龟币' : task.rewardType === 'xp' ? '经验' : '道具'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievement wall */}
      <div className={`${card} p-4`}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-rdark-text2 mb-3 flex items-center gap-1.5">
          <Trophy size={11} /> 成就墙
        </div>
        <div className="grid grid-cols-2 gap-2">
          {mockPetAchievements.map((a) => (
            <div
              key={a.id}
              className={`rounded-lg p-3 border ${
                a.unlocked
                  ? `${RARITY_BORDER_COLORS[a.rarity]} bg-white dark:bg-rdark-card`
                  : 'border-slate-200 dark:border-rdark-border bg-slate-50/50 dark:bg-rdark-input/30 opacity-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{a.unlocked ? a.icon : '🔒'}</span>
                <RarityBadge rarity={a.rarity} />
              </div>
              <div className="text-[11px] font-bold text-slate-700 dark:text-rdark-text mb-0.5">{a.name}</div>
              <div className="text-[9px] text-slate-400 dark:text-rdark-text2">{a.description}</div>
              {a.unlockedTime && (
                <div className="text-[8px] text-slate-300 dark:text-rdark-text2/50 mt-1">{a.unlockedTime}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ━━━━━━━━━━━━━━━ Cosmetics Tab ━━━━━━━━━━━━━━━ */
const CosmeticsTab: React.FC<{ skins: PetSkin[]; onEquip?: (skinId: string) => void }> = ({ skins, onEquip }) => {
  const allSkins = skins.length > 0 ? skins : mockPetSkins;
  const equippedSkin = allSkins.find((s) => s.equipped);
  const ownedSkins = allSkins.filter((s) => s.owned);
  const shopSkins = allSkins.filter((s) => !s.owned);

  return (
    <div className="space-y-4">
      {/* Current outfit */}
      <div className={`${card} p-4`}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-rdark-text2 mb-3">当前装扮</div>
        {equippedSkin && (
          <div className="flex items-center gap-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-lg p-4 border border-emerald-100 dark:border-emerald-900/30">
            <div className="w-16 h-16 rounded-xl bg-white dark:bg-rdark-card grid place-items-center text-4xl shadow-sm border border-emerald-100 dark:border-emerald-900/30">
              {equippedSkin.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-bold text-slate-700 dark:text-rdark-text">{equippedSkin.name}</span>
                <RarityBadge rarity={equippedSkin.rarity} />
              </div>
              <div className="text-[10px] text-slate-500 dark:text-rdark-text2 mb-1">{equippedSkin.description}</div>
              <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Check size={10} /> 装备中
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Owned skins */}
      <div className={`${card} p-4`}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-rdark-text2 mb-3">已拥有 ({ownedSkins.length})</div>
        <div className="grid grid-cols-3 gap-2">
          {ownedSkins.map((skin) => (
            <motion.div
              key={skin.id}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => !skin.equipped && onEquip?.(skin.id)}
              className={`rounded-lg p-3 border text-center cursor-pointer transition-all hover:shadow-md ${
                skin.equipped
                  ? `${RARITY_BORDER_COLORS[skin.rarity]} ring-2 ring-emerald-400/50 bg-emerald-50/50 dark:bg-emerald-950/10`
                  : `${RARITY_BORDER_COLORS[skin.rarity]} bg-white dark:bg-rdark-card hover:bg-slate-50 dark:hover:bg-rdark-hover`
              }`}
            >
              <div className="text-3xl mb-1.5">{skin.avatar}</div>
              <div className="text-[10px] font-bold text-slate-700 dark:text-rdark-text mb-0.5">{skin.name}</div>
              <RarityBadge rarity={skin.rarity} />
              {skin.equipped ? (
                <div className="text-[8px] text-emerald-500 font-bold mt-1">装备中</div>
              ) : (
                <div className="text-[8px] text-blue-500 font-bold mt-1">点击装备</div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Shop / Locked skins */}
      {shopSkins.length > 0 && (
        <div className={`${card} p-4`}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-rdark-text2 mb-3">未解锁</div>
          <div className="grid grid-cols-3 gap-2">
            {shopSkins.map((skin) => (
              <div
                key={skin.id}
                className={`rounded-lg p-3 border text-center opacity-60 ${RARITY_BORDER_COLORS[skin.rarity]} bg-slate-50/50 dark:bg-rdark-input/30`}
              >
                <div className="text-3xl mb-1.5 grayscale">{skin.avatar}</div>
                <div className="text-[10px] font-bold text-slate-700 dark:text-rdark-text mb-0.5">{skin.name}</div>
                <RarityBadge rarity={skin.rarity} />
                <div className="text-[8px] text-slate-400 dark:text-rdark-text2 mt-1">
                  {skin.price ? `${skin.price} 龟币` : skin.source}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ━━━━━━━━━━━━━━━ Memory Tab ━━━━━━━━━━━━━━━ */
const MemoryTab: React.FC = () => {
  const typeColors: Record<PetMemory['type'], string> = {
    prediction: 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/20',
    battle: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20',
    milestone: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20',
    dialogue: 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/20',
  };

  const dotColors: Record<PetMemory['type'], string> = {
    prediction: 'bg-blue-400',
    battle: 'bg-red-400',
    milestone: 'bg-amber-400',
    dialogue: 'bg-purple-400',
  };

  return (
    <div className="space-y-4">
      <div className={`${card} p-4`}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-rdark-text2 mb-4 flex items-center gap-1.5">
          <Clock size={11} /> 龟仙人的回忆录
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-1 bottom-1 w-px bg-slate-200 dark:bg-rdark-border" />

          <div className="space-y-3">
            {mockPetMemories.map((mem, i) => (
              <motion.div
                key={mem.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-3 relative"
              >
                {/* Dot */}
                <div className={`w-[15px] h-[15px] rounded-full shrink-0 z-10 grid place-items-center ${dotColors[mem.type]} ${mem.highlight ? 'ring-2 ring-offset-1 ring-amber-300 dark:ring-amber-600 dark:ring-offset-rdark-card' : ''}`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>

                {/* Content */}
                <div className={`flex-1 min-w-0 rounded-lg p-3 border ${typeColors[mem.type]}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{mem.icon}</span>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-rdark-text">{mem.title}</span>
                    {mem.highlight && <Sparkles size={10} className="text-amber-400" />}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-rdark-text2 mb-1">{mem.description}</div>
                  <div className="text-[8px] text-slate-400 dark:text-rdark-text2/60">{mem.time}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ━━━━━━━━━━━━━━━ Main PetPage ━━━━━━━━━━━━━━━ */
export const PetPage: React.FC<PetPageProps> = ({
  pet, balance, winRate, winStreak, totalPredictions, onBack, skins, onEquipSkin,
}) => {
  const [activeTab, setActiveTab] = useState<PetTab>('status');
  const [chatOpen, setChatOpen] = useState(false);
  const [currentDialogue, setCurrentDialogue] = useState(petDialogues.idle[0]);
  const [dialogueKey, setDialogueKey] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      const idx = Math.floor(Math.random() * petDialogues.idle.length);
      setCurrentDialogue(petDialogues.idle[idx]);
      setDialogueKey((k) => k + 1);
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="legacy-pet-page w-full space-y-5">

      {/* ━━━ 上半：宠物形象 & 空间 ━━━ */}
      <div className={`${card} overflow-hidden`}>
        {chatOpen ? (
          <PetChat pet={pet} onClose={() => setChatOpen(false)} />
        ) : (
          <>
            {/* 返回按钮浮层 */}
            <button
              onClick={onBack}
              className="absolute top-3 left-3 z-30 p-2 rounded-lg bg-white/70 dark:bg-rdark-card/70 backdrop-blur-sm hover:bg-white dark:hover:bg-rdark-card transition-colors border border-white/40 dark:border-rdark-border/50 shadow-sm cursor-pointer text-slate-500 dark:text-rdark-text2"
            >
              <ArrowLeft size={16} />
            </button>

            {/* 2D 全宽场景 */}
            <div className="relative h-[340px] overflow-hidden">
              {/* Sky */}
              <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-50 dark:from-indigo-950 dark:via-slate-900 dark:to-emerald-950" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(253,230,138,0.25),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_70%_20%,rgba(253,230,138,0.08),transparent_60%)]" />

              {/* Sun / Moon */}
              <motion.div
                animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-6 right-[12%]"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 dark:from-slate-300 dark:to-slate-400 shadow-[0_0_20px_rgba(251,191,36,0.4)] dark:shadow-[0_0_20px_rgba(203,213,225,0.2)]" />
              </motion.div>

              {/* Clouds — wider scene, more clouds */}
              <motion.div
                animate={{ x: [-20, 80, -20] }}
                transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
                className="absolute top-6 left-[5%]"
              >
                <div className="relative">
                  <div className="w-24 h-6 bg-white/60 dark:bg-white/8 rounded-full" />
                  <div className="absolute -top-2 left-5 w-12 h-6 bg-white/50 dark:bg-white/6 rounded-full" />
                  <div className="absolute -top-1 left-12 w-8 h-5 bg-white/40 dark:bg-white/5 rounded-full" />
                </div>
              </motion.div>
              <motion.div
                animate={{ x: [15, -40, 15] }}
                transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
                className="absolute top-14 right-[15%]"
              >
                <div className="relative">
                  <div className="w-16 h-5 bg-white/45 dark:bg-white/6 rounded-full" />
                  <div className="absolute -top-1.5 left-4 w-9 h-4 bg-white/35 dark:bg-white/5 rounded-full" />
                </div>
              </motion.div>
              <motion.div
                animate={{ x: [0, 30, 0] }}
                transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                className="absolute top-20 left-[35%]"
              >
                <div className="w-12 h-3.5 bg-white/30 dark:bg-white/4 rounded-full" />
              </motion.div>
              <motion.div
                animate={{ x: [-10, 25, -10] }}
                transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
                className="absolute top-10 left-[60%]"
              >
                <div className="relative">
                  <div className="w-14 h-4 bg-white/35 dark:bg-white/5 rounded-full" />
                  <div className="absolute -top-1 left-3 w-7 h-3.5 bg-white/25 dark:bg-white/4 rounded-full" />
                </div>
              </motion.div>

              {/* Hills — wider */}
              <div className="absolute bottom-[75px] left-0 right-0 h-[45px]">
                <svg viewBox="0 0 800 45" className="w-full h-full" preserveAspectRatio="none">
                  <path d="M0 45 Q60 12 140 28 Q220 5 320 20 Q400 2 480 18 Q560 8 640 22 Q720 5 800 15 L800 45 Z"
                    className="fill-emerald-200/60 dark:fill-emerald-900/30" />
                </svg>
              </div>

              {/* Ground */}
              <div className="absolute bottom-0 left-0 right-0 h-[70px]">
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-600/30 via-emerald-400/40 to-emerald-200/30 dark:from-emerald-950/80 dark:via-emerald-900/50 dark:to-emerald-900/20" />
                <svg viewBox="0 0 800 12" className="absolute -top-1 left-0 w-full h-3" preserveAspectRatio="none">
                  <path d="M0 12 Q10 4 20 8 Q30 2 40 7 Q50 3 60 8 Q70 1 80 6 Q90 3 100 8 Q110 2 120 7 Q130 4 140 8 Q150 1 160 6 Q170 3 180 8 Q190 2 200 7 Q210 4 220 8 Q230 1 240 6 Q250 3 260 8 Q270 2 280 7 Q290 4 300 8 Q310 1 320 6 Q330 3 340 8 Q350 2 360 7 Q370 4 380 8 Q390 1 400 6 Q410 3 420 8 Q430 2 440 7 Q450 4 460 8 Q470 1 480 6 Q490 3 500 8 Q510 2 520 7 Q530 4 540 8 Q550 1 560 6 Q570 3 580 8 Q590 2 600 7 Q610 4 620 8 Q630 1 640 6 Q650 3 660 8 Q670 2 680 7 Q690 4 700 8 Q710 1 720 6 Q730 3 740 8 Q750 2 760 7 Q770 4 780 8 Q790 2 800 6 L800 12 Z"
                    className="fill-emerald-300/70 dark:fill-emerald-800/50" />
                </svg>
                {/* Grass clusters */}
                <div className="absolute bottom-[12px] left-[5%] flex gap-[2px] items-end">
                  <div className="w-[3px] h-[14px] bg-emerald-500/60 dark:bg-emerald-600/40 rounded-t-full -rotate-6" />
                  <div className="w-[2px] h-[17px] bg-emerald-600/50 dark:bg-emerald-500/35 rounded-t-full" />
                  <div className="w-[3px] h-[12px] bg-emerald-500/55 dark:bg-emerald-600/40 rounded-t-full rotate-6" />
                </div>
                <div className="absolute bottom-[12px] left-[18%] flex gap-[2px] items-end">
                  <div className="w-[2px] h-[10px] bg-emerald-500/50 dark:bg-emerald-600/35 rounded-t-full -rotate-3" />
                  <div className="w-[3px] h-[13px] bg-emerald-600/45 dark:bg-emerald-500/30 rounded-t-full rotate-2" />
                </div>
                <div className="absolute bottom-[12px] right-[8%] flex gap-[2px] items-end">
                  <div className="w-[3px] h-[15px] bg-emerald-500/55 dark:bg-emerald-600/40 rounded-t-full -rotate-4" />
                  <div className="w-[2px] h-[18px] bg-emerald-600/50 dark:bg-emerald-500/35 rounded-t-full rotate-2" />
                  <div className="w-[2px] h-[12px] bg-emerald-500/45 dark:bg-emerald-600/30 rounded-t-full rotate-8" />
                </div>
                <div className="absolute bottom-[12px] right-[22%] flex gap-[2px] items-end">
                  <div className="w-[2px] h-[9px] bg-emerald-600/40 dark:bg-emerald-500/25 rounded-t-full" />
                  <div className="w-[3px] h-[12px] bg-emerald-500/50 dark:bg-emerald-600/35 rounded-t-full -rotate-3" />
                </div>
                {/* Flowers */}
                <div className="absolute bottom-[18px] left-[12%] text-[8px] opacity-70">🌼</div>
                <div className="absolute bottom-[16px] right-[15%] text-[7px] opacity-60">🌸</div>
                <div className="absolute bottom-[17px] left-[42%] text-[6px] opacity-50">🌻</div>
                {/* Stones */}
                <div className="absolute bottom-[8px] left-[30%] w-4 h-2 bg-slate-400/30 dark:bg-slate-600/30 rounded-full" />
                <div className="absolute bottom-[7px] right-[35%] w-3 h-1.5 bg-slate-400/20 dark:bg-slate-600/20 rounded-full" />
              </div>

              {/* Particles */}
              <motion.div
                animate={{ y: [0, 90, 0], x: [0, 12, -8, 0], opacity: [0, 0.7, 0.7, 0] }}
                transition={{ duration: 7, repeat: Infinity, delay: 0 }}
                className="absolute top-10 left-[15%] w-1.5 h-1.5 rounded-full bg-amber-300/60 dark:bg-amber-400/40"
              />
              <motion.div
                animate={{ y: [0, 70, 0], x: [0, -10, 6, 0], opacity: [0, 0.5, 0.5, 0] }}
                transition={{ duration: 9, repeat: Infinity, delay: 2 }}
                className="absolute top-8 left-[70%] w-1.5 h-1.5 rounded-full bg-pink-300/50 dark:bg-pink-400/30"
              />
              <motion.div
                animate={{ y: [0, 60, 0], x: [0, 7, -5, 0], opacity: [0, 0.6, 0.6, 0] }}
                transition={{ duration: 8, repeat: Infinity, delay: 4 }}
                className="absolute top-14 left-[40%] w-1 h-1 rounded-full bg-amber-200/70 dark:bg-amber-300/40"
              />
              <motion.div
                animate={{ y: [0, 50, 0], x: [0, -5, 8, 0], opacity: [0, 0.4, 0.4, 0] }}
                transition={{ duration: 10, repeat: Infinity, delay: 6 }}
                className="absolute top-16 left-[85%] w-1 h-1 rounded-full bg-pink-200/50 dark:bg-pink-300/25"
              />

              {/* Pet character — centered */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute bottom-[65px] left-1/2 -translate-x-1/2 flex flex-col items-center z-10"
              >
                {/* Dialogue bubble */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={dialogueKey}
                    initial={{ opacity: 0, y: 5, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.9 }}
                    className="relative mb-3 max-w-[260px] px-5 py-2.5 rounded-xl bg-white/90 dark:bg-rdark-card/90 shadow-lg border border-white/60 dark:border-rdark-border text-center backdrop-blur-sm"
                  >
                    <span className="text-[12px] text-slate-600 dark:text-rdark-text leading-snug block">
                      {currentDialogue}
                    </span>
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/90 dark:bg-rdark-card/90 rotate-45 border-r border-b border-white/60 dark:border-rdark-border" />
                  </motion.div>
                </AnimatePresence>

                {/* Pet emoji — larger */}
                <div className="text-[88px] leading-none select-none drop-shadow-lg">
                  {pet.avatar}
                </div>

                {/* Name + level */}
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300 drop-shadow-sm">{pet.name}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/80 text-white font-bold shadow-sm">
                    Lv.{pet.level}
                  </span>
                </div>
              </motion.div>

              {/* Shadow */}
              <motion.div
                animate={{ scale: [1, 0.9, 1], opacity: [0.15, 0.1, 0.15] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute bottom-[56px] left-1/2 -translate-x-1/2 w-24 h-4 bg-black/15 dark:bg-black/25 rounded-full blur-[3px] z-0"
              />

              {/* Mood & Stamina — top-left glass panels */}
              <div className="absolute top-3 left-14 z-10 flex gap-2">
                <div className="flex items-center gap-2 bg-white/70 dark:bg-rdark-card/70 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-white/40 dark:border-rdark-border/50">
                  <span className="text-[14px]">😊</span>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 dark:text-rdark-text2 leading-none">心情</span>
                    <span className="text-[11px] font-bold text-amber-500 dark:text-amber-400 leading-tight">开心</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/70 dark:bg-rdark-card/70 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-white/40 dark:border-rdark-border/50">
                  <span className="text-[14px]">⚡</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] text-slate-400 dark:text-rdark-text2 leading-none">体力</span>
                    <div className="flex items-center gap-1">
                      <div className="w-[48px] h-[6px] bg-slate-200/80 dark:bg-rdark-border rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '78%' }}
                          transition={{ duration: 1, delay: 0.3 }}
                          className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
                        />
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 leading-none">78</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pet info — top-right glass panel */}
              <div className="absolute top-3 right-3 z-10">
                <div className="bg-white/70 dark:bg-rdark-card/70 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-white/40 dark:border-rdark-border/50 flex items-center gap-3">
                  <div>
                    <div className="text-[8px] text-slate-400 dark:text-rdark-text2 leading-none mb-0.5">稀有度</div>
                    <RarityBadge rarity="SR" />
                  </div>
                  <div className="w-px h-6 bg-slate-200/60 dark:bg-rdark-border/40" />
                  <div>
                    <div className="text-[8px] text-slate-400 dark:text-rdark-text2 leading-none mb-0.5">性格</div>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-rdark-text">智慧型</span>
                  </div>
                  <div className="w-px h-6 bg-slate-200/60 dark:bg-rdark-border/40" />
                  <div>
                    <div className="text-[8px] text-slate-400 dark:text-rdark-text2 leading-none mb-0.5">天赋</div>
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">分析</span>
                  </div>
                </div>
              </div>

              {/* Chat button — bottom center */}
              <button
                onClick={() => setChatOpen(true)}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-6 py-2.5 rounded-full text-[12px] font-bold cursor-pointer transition-all bg-white/80 dark:bg-rdark-card/80 text-emerald-600 dark:text-emerald-400 hover:bg-white dark:hover:bg-rdark-card border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-2 shadow-lg backdrop-blur-md hover:scale-105 hover:shadow-xl"
              >
                <MessageCircle size={14} /> 和{pet.name}聊聊
              </button>

              {/* XP bar — bottom overlay */}
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10 w-[260px]">
                <div className="bg-white/60 dark:bg-rdark-card/60 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/30 dark:border-rdark-border/30 shadow-sm">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[8px] text-slate-500 dark:text-rdark-text2">EXP</span>
                    <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400">3,240 / 5,000</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200/60 dark:bg-rdark-border rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '64.8%' }}
                      transition={{ duration: 1.2, delay: 0.3 }}
                      className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ━━━ 下半：Tab 面板 ━━━ */}
      <div>
        {/* Tab bar */}
        <div className={`${card} p-1 mb-4 flex gap-1`}>
          {TAB_LIST.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[12px] font-medium cursor-pointer transition-all border-0 ${
                activeTab === tab.key
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold shadow-sm'
                  : 'bg-transparent text-slate-500 dark:text-rdark-text2 hover:bg-slate-50 dark:hover:bg-rdark-hover'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'status' && (
              <StatusTab winRate={winRate} winStreak={winStreak} totalPredictions={totalPredictions} balance={balance} />
            )}
            {activeTab === 'abilities' && <AbilitiesTab />}
            {activeTab === 'tasks' && <TasksTab />}
            {activeTab === 'cosmetics' && <CosmeticsTab skins={skins ?? mockPetSkins} onEquip={onEquipSkin} />}
            {activeTab === 'memory' && <MemoryTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
