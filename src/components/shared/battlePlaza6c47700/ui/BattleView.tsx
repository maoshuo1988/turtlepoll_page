/**
 * 文件说明：Battle View，地下钱庄/战斗广场相关共享组件。
 */
import React, { useMemo, useState } from 'react';
import { Crown, Coins, Flame, MessageCircle, Heart, Clock3 } from 'lucide-react';
import type { Battle, BattleSide, BattleStatus } from '@/data/mock_data';

interface BattleViewProps {
  battles: Battle[];
  userBalance: number;
  onCreateBattle: (topic: string, optionA: string, optionB: string, side: BattleSide, wager: number) => void;
  onAcceptBattle: (battleId: string) => void;
  onResolveBattle: (battleId: string, winningSide: BattleSide) => void;
}

type TabKey = 'all' | 'mine';

const SORT_TABS: { key: BattleStatus | 'all'; label: string }[] = [
  { key: 'all', label: '🔥 激战中' },
  { key: 'waiting', label: '⚡ 最新' },
  { key: 'active', label: '🏆 进行中' },
  { key: 'resolved', label: '⏱ 已结算' },
];

const WAGER_PRESETS = [50, 100, 200, 500, 1000];

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

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(topic.trim(), optA.trim(), optB.trim(), side, wager);
    setTopic('');
    setOptA('');
    setOptB('');
    setWager(100);
    setSide('A');
    setOpen(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/15 bg-white/90 dark:bg-[#0f1728]/75 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-white/10">
        <button
          onClick={() => setOpen((v) => !v)}
          className="px-3 py-1.5 rounded-lg border border-emerald-400/50 dark:border-[#00d68f]/40 text-emerald-600 dark:text-[#00d68f] text-xs font-bold bg-transparent cursor-pointer"
        >
          ⚔️ 发起对战
        </button>
        <div className="text-xs text-slate-500 dark:text-white/65">你有什么观点想开战？点击发起一场对决</div>
      </div>

      {open && (
        <div className="p-4 space-y-3">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="请输入对战话题"
            className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-[#0b1220] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 text-sm outline-none"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <input
              value={optA}
              onChange={(e) => setOptA(e.target.value)}
              placeholder="正方观点"
              className="px-3 py-2.5 rounded-lg bg-white dark:bg-[#0b1220] border border-red-300 dark:border-[#ff6b6b]/35 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 text-sm outline-none"
            />
            <input
              value={optB}
              onChange={(e) => setOptB(e.target.value)}
              placeholder="反方观点"
              className="px-3 py-2.5 rounded-lg bg-white dark:bg-[#0b1220] border border-sky-300 dark:border-[#4cc9f0]/35 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 text-sm outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSide('A')}
              className={`px-3 py-1.5 rounded-md border text-xs font-bold cursor-pointer ${
                side === 'A' ? 'border-red-500 dark:border-[#ff6b6b] text-red-600 dark:text-[#ff6b6b]' : 'border-slate-300 dark:border-white/20 text-slate-500 dark:text-white/60'
              }`}
            >
              站队正方
            </button>
            <button
              onClick={() => setSide('B')}
              className={`px-3 py-1.5 rounded-md border text-xs font-bold cursor-pointer ${
                side === 'B' ? 'border-sky-500 dark:border-[#4cc9f0] text-sky-600 dark:text-[#4cc9f0]' : 'border-slate-300 dark:border-white/20 text-slate-500 dark:text-white/60'
              }`}
            >
              站队反方
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {WAGER_PRESETS.map((n) => (
              <button
                key={n}
                onClick={() => setWager(n)}
                className={`px-3 py-1.5 rounded-md border text-xs font-bold cursor-pointer ${
                  wager === n ? 'border-amber-500 dark:border-[#ffd93d] text-amber-600 dark:text-[#ffd93d]' : 'border-slate-300 dark:border-white/20 text-slate-500 dark:text-white/60'
                }`}
              >
                {n}
              </button>
            ))}
            <span className="ml-auto text-xs text-slate-500 dark:text-white/65">余额: {balance.toLocaleString()} 🪙</span>
          </div>

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full py-2.5 rounded-lg border-0 bg-gradient-to-r from-[#00d68f] to-[#4cc9f0] text-[#07111d] font-black cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            开战！
          </button>
        </div>
      )}
    </div>
  );
};

const BattleCard: React.FC<{
  battle: Battle;
  onAccept: (id: string) => void;
  onResolve: (id: string, side: BattleSide) => void;
}> = ({ battle, onAccept, onResolve }) => {
  const { creator, challenger, status, wager, winner } = battle;
  const isCreator = creator.name === '你';
  const isParticipant = isCreator || challenger?.name === '你';

  const leftPct = status === 'resolved' && winner
    ? winner === 'A' ? 67 : 33
    : status === 'active'
      ? 54
      : 50;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/15 bg-white/95 dark:bg-[#121a2b]/85 overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-amber-600 dark:text-[#ffd93d] font-semibold">⚔️ 开战话题</div>
          <div className="text-[10px] text-slate-400 dark:text-white/50">{battle.createdTime}</div>
        </div>
        <div className="text-sm font-bold text-slate-800 dark:text-white mt-1 leading-snug">{battle.topic}</div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
          <button
            className="text-left rounded-xl border border-red-300 dark:border-[#ff6b6b]/35 bg-red-50 dark:bg-[#ff6b6b]/10 p-3 cursor-pointer"
            onClick={() => status === 'waiting' && !isCreator && onAccept(battle.id)}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-[#ff6b6b]/20 grid place-items-center text-sm">{creator.avatar}</div>
              <div className="min-w-0">
                <div className="text-xs text-slate-700 dark:text-white/80 truncate">{creator.name}</div>
                <div className="text-[11px] text-red-500 dark:text-[#ff9a9a] font-semibold truncate">{battle.optionA}</div>
              </div>
            </div>
          </button>

          <div className="self-center px-2 py-1 rounded-full border border-slate-300 dark:border-white/25 bg-slate-100 dark:bg-white/10 text-xs font-black text-slate-700 dark:text-white">VS</div>

          <button
            className="text-left rounded-xl border border-sky-300 dark:border-[#4cc9f0]/35 bg-sky-50 dark:bg-[#4cc9f0]/10 p-3 cursor-pointer"
            onClick={() => status === 'waiting' && !isCreator && onAccept(battle.id)}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-sky-100 dark:bg-[#4cc9f0]/20 grid place-items-center text-sm">{challenger?.avatar ?? '❓'}</div>
              <div className="min-w-0">
                <div className="text-xs text-slate-700 dark:text-white/80 truncate">{challenger?.name ?? '等待接战'}</div>
                <div className="text-[11px] text-sky-600 dark:text-[#9be7ff] font-semibold truncate">{battle.optionB}</div>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-3">
          <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden relative">
            <div className="absolute left-0 top-0 h-full bg-red-500 dark:bg-[#ff6b6b]" style={{ width: `${leftPct}%` }} />
            <div className="absolute right-0 top-0 h-full bg-sky-500 dark:bg-[#4cc9f0]" style={{ width: `${100 - leftPct}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-600 dark:text-white/70">
            <span>🔴 {leftPct}%</span>
            <span>{wager} 🪙</span>
            <span>{100 - leftPct}% 🔵</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-white/65">
          <div className="inline-flex items-center gap-1"><MessageCircle size={12} /> 0 评论</div>
          <div className="inline-flex items-center gap-1"><Heart size={12} /> 0</div>
          <div className="inline-flex items-center gap-1"><Clock3 size={12} /> {status === 'active' ? '进行中' : status === 'waiting' ? '待应战' : '已结算'}</div>
        </div>

        {status === 'waiting' && !isCreator && (
          <button
            onClick={() => onAccept(battle.id)}
            className="mt-3 w-full py-2 rounded-lg border border-amber-500/45 dark:border-[#ffd93d]/45 bg-amber-100 dark:bg-[#ffd93d]/12 text-amber-700 dark:text-[#ffd93d] font-bold cursor-pointer"
          >
            接受挑战 ⚡
          </button>
        )}

        {status === 'active' && isParticipant && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => onResolve(battle.id, 'A')}
              className="py-2 rounded-lg border border-red-400/45 dark:border-[#ff6b6b]/45 bg-red-100 dark:bg-[#ff6b6b]/12 text-red-600 dark:text-[#ff9a9a] font-bold cursor-pointer"
            >
              {battle.optionA} 胜
            </button>
            <button
              onClick={() => onResolve(battle.id, 'B')}
              className="py-2 rounded-lg border border-sky-400/45 dark:border-[#4cc9f0]/45 bg-sky-100 dark:bg-[#4cc9f0]/12 text-sky-700 dark:text-[#9be7ff] font-bold cursor-pointer"
            >
              {battle.optionB} 胜
            </button>
          </div>
        )}

        {status === 'resolved' && winner && (
          <div className="mt-3 rounded-lg border border-amber-400/35 dark:border-[#ffd93d]/35 bg-amber-100 dark:bg-[#ffd93d]/10 px-3 py-2 text-amber-700 dark:text-[#ffe58a] text-xs font-bold inline-flex items-center gap-1">
            <Crown size={13} /> 胜方：{winner === 'A' ? battle.optionA : battle.optionB}
          </div>
        )}
      </div>
    </div>
  );
};

export const BattleView: React.FC<BattleViewProps> = ({
  battles,
  userBalance,
  onCreateBattle,
  onAcceptBattle,
  onResolveBattle,
}) => {
  const [tab, setTab] = useState<TabKey>('all');
  const [sort, setSort] = useState<BattleStatus | 'all'>('all');

  const filtered = useMemo(() => {
    return battles
      .filter((b) => (tab === 'mine' ? b.creator.name === '你' || b.challenger?.name === '你' : true))
      .filter((b) => (sort === 'all' ? true : b.status === sort));
  }, [battles, tab, sort]);

  return (
    <div className="min-h-screen rounded-2xl border border-slate-200 dark:border-white/12 overflow-hidden text-slate-900 dark:text-white" style={{
      background:
        'radial-gradient(1200px 500px at 10% 0%, rgba(255,107,107,0.08), transparent 55%), radial-gradient(1200px 500px at 90% 0%, rgba(76,201,240,0.08), transparent 55%), linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%)',
    }}>
      <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 bg-white/70 dark:bg-transparent">
        <div className="text-[22px] font-black">⚔️ 开战广场</div>
        <div className="mt-1 text-xs text-slate-500 dark:text-white/65 inline-flex items-center gap-2">
          <Flame size={12} className="text-red-500 dark:text-[#ff6b6b]" />
          实时战场 · 阵营 PK · 评论驱动热度
          <span className="ml-4 inline-flex items-center gap-1 text-amber-600 dark:text-[#ffd93d] font-bold"><Coins size={12} /> {userBalance.toLocaleString()}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <CreateBattleForm balance={userBalance} onSubmit={onCreateBattle} />

        <div className="flex flex-wrap gap-2">
          {SORT_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setSort(t.key)}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer ${
                sort === t.key
                  ? 'border-amber-500/50 dark:border-[#ffd93d]/50 bg-amber-100 dark:bg-[#ffd93d]/12 text-amber-700 dark:text-[#ffd93d]'
                  : 'border-slate-300 dark:border-white/20 bg-white/70 dark:bg-white/5 text-slate-500 dark:text-white/70'
              }`}
            >
              {t.label}
            </button>
          ))}

          <div className="ml-auto flex gap-1 rounded-full bg-white/80 dark:bg-white/5 border border-slate-300 dark:border-white/15 p-1">
            <button
              onClick={() => setTab('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${tab === 'all' ? 'bg-slate-200 dark:bg-white/15 text-slate-800 dark:text-white' : 'text-slate-500 dark:text-white/60'}`}
            >
              全部
            </button>
            <button
              onClick={() => setTab('mine')}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${tab === 'mine' ? 'bg-slate-200 dark:bg-white/15 text-slate-800 dark:text-white' : 'text-slate-500 dark:text-white/60'}`}
            >
              我的
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="rounded-xl border border-slate-300 dark:border-white/15 bg-white/70 dark:bg-white/5 py-14 text-center text-slate-500 dark:text-white/55 text-sm">暂无战场话题</div>
          )}

          {filtered.map((b) => (
            <BattleCard
              key={b.id}
              battle={b}
              onAccept={onAcceptBattle}
              onResolve={onResolveBattle}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
