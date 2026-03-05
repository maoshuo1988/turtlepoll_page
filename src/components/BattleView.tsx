import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, ChevronDown, ChevronUp, Crown, Coins, Zap, Trophy } from 'lucide-react';
import type { Battle, BattleSide, BattleStatus } from '../data/mock_data';
import { BATTLE_STATUS_LABELS, BATTLE_STATUS_COLORS } from '../data/mock_data';

/* ── Props ── */
interface BattleViewProps {
  battles: Battle[];
  userBalance: number;
  onCreateBattle: (topic: string, optionA: string, optionB: string, side: BattleSide, wager: number) => void;
  onAcceptBattle: (battleId: string) => void;
  onResolveBattle: (battleId: string, winningSide: BattleSide) => void;
}

type TabKey = 'all' | 'mine';
const WAGER_PRESETS = [100, 200, 500, 1000];

/* ═══════════════════════════════════════════
   Create Battle Form
   ═══════════════════════════════════════════ */
const CreateBattleForm: React.FC<{
  balance: number;
  onSubmit: BattleViewProps['onCreateBattle'];
}> = ({ balance, onSubmit }) => {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [side, setSide] = useState<BattleSide>('A');
  const [wager, setWager] = useState(100);

  const canSubmit = topic.trim() && optA.trim() && optB.trim() && wager > 0 && wager <= balance;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(topic.trim(), optA.trim(), optB.trim(), side, wager);
    setTopic('');
    setOptA('');
    setOptB('');
    setSide('A');
    setWager(100);
    setOpen(false);
  };

  return (
    <div className="border-b border-slate-100 dark:border-rdark-border">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer border-0 bg-transparent hover:bg-slate-50 dark:hover:bg-rdark-hover transition-colors"
      >
        <span className="flex items-center gap-2 text-[15px] font-bold text-slate-800 dark:text-rdark-text">
          <Swords size={18} className="text-orange-500" />
          发起对局
        </span>
        {open ? (
          <ChevronUp size={18} className="text-slate-400 dark:text-rdark-text2" />
        ) : (
          <ChevronDown size={18} className="text-slate-400 dark:text-rdark-text2" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {/* Topic */}
              <div>
                <label className="block text-[12px] font-semibold text-slate-500 dark:text-rdark-text2 mb-1.5">预测话题</label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="例如：特斯拉明年股价能破500吗？"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-rdark-border bg-white dark:bg-rdark-input text-[14px] text-slate-800 dark:text-rdark-text outline-none focus:border-blue-400 dark:focus:border-blue-500 placeholder:text-slate-400 dark:placeholder:text-rdark-text2 transition-colors"
                />
              </div>

              {/* Options A / B */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-slate-500 dark:text-rdark-text2 mb-1.5">选项 A</label>
                  <input
                    value={optA}
                    onChange={(e) => setOptA(e.target.value)}
                    placeholder="例如：能"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-rdark-border bg-white dark:bg-rdark-input text-[14px] text-slate-800 dark:text-rdark-text outline-none focus:border-blue-400 dark:focus:border-blue-500 placeholder:text-slate-400 dark:placeholder:text-rdark-text2 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-slate-500 dark:text-rdark-text2 mb-1.5">选项 B</label>
                  <input
                    value={optB}
                    onChange={(e) => setOptB(e.target.value)}
                    placeholder="例如：不能"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-rdark-border bg-white dark:bg-rdark-input text-[14px] text-slate-800 dark:text-rdark-text outline-none focus:border-blue-400 dark:focus:border-blue-500 placeholder:text-slate-400 dark:placeholder:text-rdark-text2 transition-colors"
                  />
                </div>
              </div>

              {/* Pick side */}
              <div>
                <label className="block text-[12px] font-semibold text-slate-500 dark:text-rdark-text2 mb-1.5">选择你的立场</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSide('A')}
                    className={`py-3 rounded-xl text-[14px] font-bold cursor-pointer border-2 transition-all ${
                      side === 'A'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'border-slate-200 dark:border-rdark-border bg-transparent text-slate-500 dark:text-rdark-text2 hover:border-slate-300'
                    }`}
                  >
                    {optA || 'A'}
                  </button>
                  <button
                    onClick={() => setSide('B')}
                    className={`py-3 rounded-xl text-[14px] font-bold cursor-pointer border-2 transition-all ${
                      side === 'B'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        : 'border-slate-200 dark:border-rdark-border bg-transparent text-slate-500 dark:text-rdark-text2 hover:border-slate-300'
                    }`}
                  >
                    {optB || 'B'}
                  </button>
                </div>
              </div>

              {/* Wager */}
              <div>
                <label className="block text-[12px] font-semibold text-slate-500 dark:text-rdark-text2 mb-1.5">下注金额</label>
                <div className="flex gap-2 mb-2">
                  {WAGER_PRESETS.map((w) => (
                    <button
                      key={w}
                      onClick={() => setWager(w)}
                      className={`flex-1 py-2 rounded-lg text-[13px] font-semibold cursor-pointer border transition-all ${
                        wager === w
                          ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                          : 'border-slate-200 dark:border-rdark-border bg-transparent text-slate-500 dark:text-rdark-text2 hover:border-slate-300'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <input
                    type="number"
                    value={wager}
                    onChange={(e) => setWager(Math.max(0, Number(e.target.value)))}
                    className="w-32 px-3 py-2 rounded-lg border border-slate-200 dark:border-rdark-border bg-white dark:bg-rdark-input text-[14px] text-slate-800 dark:text-rdark-text outline-none focus:border-orange-400 transition-colors"
                  />
                  <span className="text-[13px] text-slate-400 dark:text-rdark-text2">
                    余额: <span className={`font-bold ${wager > balance ? 'text-red-500' : 'text-orange-500'}`}>{balance}</span> 龟币
                  </span>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full py-3 rounded-xl text-[15px] font-bold cursor-pointer border-0 transition-all bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-orange-200 dark:shadow-none"
              >
                <Swords size={16} className="inline -mt-0.5 mr-1.5" />
                发起对局 · {wager} 龟币
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ═══════════════════════════════════════════
   Battle Card
   ═══════════════════════════════════════════ */
const BattleCard: React.FC<{
  battle: Battle;
  index: number;
  onAccept: (id: string) => void;
  onResolve: (id: string, side: BattleSide) => void;
}> = ({ battle, index, onAccept, onResolve }) => {
  const { creator, challenger, status, wager, winner } = battle;
  const isCreator = creator.name === '你';
  const isChallenger = challenger?.name === '你';
  const isParticipant = isCreator || isChallenger;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className="px-5 py-4 border-b border-slate-100 dark:border-rdark-border hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
    >
      {/* Topic + status + time */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-[15px] font-bold text-slate-900 dark:text-rdark-text leading-snug flex-1 mr-3">
          {battle.topic}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${BATTLE_STATUS_COLORS[status]}`}>
            {BATTLE_STATUS_LABELS[status]}
          </span>
          <span className="text-[12px] text-slate-400 dark:text-rdark-text2">{battle.createdTime}</span>
        </div>
      </div>

      {/* VS layout */}
      <div className="flex items-center gap-3 bg-slate-50 dark:bg-rdark-input rounded-2xl p-4 mb-3">
        {/* Creator */}
        <div className="flex-1 text-center">
          <div className="w-12 h-12 rounded-full bg-white dark:bg-rdark-card grid place-items-center text-2xl mx-auto mb-1.5 shadow-sm">
            {creator.avatar}
          </div>
          <div className="text-[13px] font-bold text-slate-800 dark:text-rdark-text truncate">{creator.name}</div>
          <div className={`text-[12px] font-semibold mt-0.5 ${creator.side === 'A' ? 'text-blue-500' : 'text-red-500'}`}>
            {creator.side === 'A' ? battle.optionA : battle.optionB}
          </div>
          {status === 'resolved' && winner === creator.side && (
            <Crown size={16} className="text-amber-500 mx-auto mt-1" />
          )}
        </div>

        {/* VS */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 grid place-items-center">
            <Zap size={20} className="text-white" />
          </div>
          <div className="flex items-center gap-1 text-[12px] font-bold text-orange-500">
            <Coins size={12} />
            {wager}
          </div>
        </div>

        {/* Challenger */}
        <div className="flex-1 text-center">
          {challenger ? (
            <>
              <div className="w-12 h-12 rounded-full bg-white dark:bg-rdark-card grid place-items-center text-2xl mx-auto mb-1.5 shadow-sm">
                {challenger.avatar}
              </div>
              <div className="text-[13px] font-bold text-slate-800 dark:text-rdark-text truncate">{challenger.name}</div>
              <div className={`text-[12px] font-semibold mt-0.5 ${challenger.side === 'A' ? 'text-blue-500' : 'text-red-500'}`}>
                {challenger.side === 'A' ? battle.optionA : battle.optionB}
              </div>
              {status === 'resolved' && winner === challenger.side && (
                <Crown size={16} className="text-amber-500 mx-auto mt-1" />
              )}
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-white dark:bg-rdark-card grid place-items-center text-2xl mx-auto mb-1.5 shadow-sm border-2 border-dashed border-slate-300 dark:border-rdark-border">
                ?
              </div>
              <div className="text-[13px] font-medium text-slate-400 dark:text-rdark-text2">等待应战</div>
            </>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {status === 'waiting' && !isCreator && (
        <button
          onClick={() => onAccept(battle.id)}
          className="w-full py-2.5 rounded-xl text-[14px] font-bold cursor-pointer border-0 transition-all bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-md shadow-blue-200 dark:shadow-none"
        >
          <Swords size={14} className="inline -mt-0.5 mr-1" />
          应战！匹配 {wager} 龟币
        </button>
      )}
      {status === 'waiting' && isCreator && (
        <div className="text-center py-2 text-[13px] text-slate-400 dark:text-rdark-text2 font-medium">
          等待其他玩家应战...
        </div>
      )}
      {status === 'active' && isParticipant && (
        <div className="flex gap-2">
          <button
            onClick={() => onResolve(battle.id, 'A')}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer border-2 border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <Trophy size={13} className="inline -mt-0.5 mr-1" />
            {battle.optionA} 胜
          </button>
          <button
            onClick={() => onResolve(battle.id, 'B')}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold cursor-pointer border-2 border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <Trophy size={13} className="inline -mt-0.5 mr-1" />
            {battle.optionB} 胜
          </button>
        </div>
      )}
      {status === 'active' && !isParticipant && (
        <div className="text-center py-2 text-[13px] text-slate-400 dark:text-rdark-text2 font-medium">
          对局进行中 · 等待结果
        </div>
      )}
      {status === 'resolved' && (
        <div className="text-center py-2 text-[13px] font-bold text-amber-600 dark:text-amber-400">
          <Crown size={14} className="inline -mt-0.5 mr-1" />
          {winner === creator.side ? creator.name : challenger?.name} 获胜 · 赢得 {wager * 2} 龟币
        </div>
      )}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════
   Battle View (main export)
   ═══════════════════════════════════════════ */
const STATUS_FILTERS: { key: BattleStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'waiting', label: '等待应战' },
  { key: 'active', label: '对局中' },
  { key: 'resolved', label: '已结算' },
];

export const BattleView: React.FC<BattleViewProps> = ({
  battles,
  userBalance,
  onCreateBattle,
  onAcceptBattle,
  onResolveBattle,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [statusFilter, setStatusFilter] = useState<BattleStatus | 'all'>('all');

  const filtered = battles
    .filter((b) => {
      if (activeTab === 'mine') {
        return b.creator.name === '你' || b.challenger?.name === '你';
      }
      return true;
    })
    .filter((b) => statusFilter === 'all' || b.status === statusFilter);

  return (
    <div className="bg-white dark:bg-rdark-card border-x border-slate-100 dark:border-rdark-border min-h-screen">
      {/* ── Sticky tab header ── */}
      <div className="sticky top-[57px] z-10 bg-white/80 dark:bg-rdark-card/80 backdrop-blur-md border-b border-slate-100 dark:border-rdark-border">
        <div className="flex">
          {(['all', 'mine'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-[15px] cursor-pointer border-0 bg-transparent transition-colors relative hover:bg-black/[0.03] dark:hover:bg-white/[0.03] ${
                activeTab === tab
                  ? 'font-extrabold text-slate-900 dark:text-rdark-text'
                  : 'font-medium text-slate-500 dark:text-rdark-text2'
              }`}
            >
              {tab === 'all' ? '全部对局' : '我的对局'}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-[3px] bg-orange-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Create battle form ── */}
      <CreateBattleForm balance={userBalance} onSubmit={onCreateBattle} />

      {/* ── Status filter pills ── */}
      <div className="flex gap-2 px-5 py-3 border-b border-slate-100 dark:border-rdark-border">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`text-[12px] font-semibold px-3 py-1.5 rounded-full cursor-pointer border transition-all ${
              statusFilter === f.key
                ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                : 'border-slate-200 dark:border-rdark-border bg-transparent text-slate-500 dark:text-rdark-text2 hover:bg-slate-50 dark:hover:bg-rdark-hover'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Battle list ── */}
      <div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-slate-400 dark:text-rdark-text2">
            <Swords size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-[14px]">暂无对局</p>
          </div>
        )}
        {filtered.map((b, i) => (
          <BattleCard
            key={b.id}
            battle={b}
            index={i}
            onAccept={onAcceptBattle}
            onResolve={onResolveBattle}
          />
        ))}
      </div>
    </div>
  );
};
