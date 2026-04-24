import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BarChart3,
  Clock,
  Crown,
  Flame,
  History,
  Lock,
  MessageSquare,
  Shield,
  Swords,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import type { PKPhase, PKRoundResult, PKTopicState, RivalryNewsItem } from './rivalryMockData';
import { mockPKStates, mockRivalryHero, mockRivalryItems } from './rivalryMockData';

interface RivalryPKProps {
  hero?: RivalryNewsItem;
  items?: RivalryNewsItem[];
  userVotes?: Record<string, 'A' | 'B'>;
  onBet?: (newsId: string, option: 'A' | 'B', odds: number) => void;
  onEnterBattle?: (newsId: string) => void;
}

function pad(value: number) {
  return String(Math.floor(value)).padStart(2, '0');
}

function Countdown({ target, label, color }: { target: number; label: string; color: string }) {
  const [left, setLeft] = useState(Math.max(0, target - Date.now()));

  useEffect(() => {
    const timer = setInterval(() => setLeft(Math.max(0, target - Date.now())), 1000);
    return () => clearInterval(timer);
  }, [target]);

  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);

  return (
    <div className="flex items-center gap-1.5 text-xs font-mono">
      <Clock size={12} className={color} />
      <span className={`font-semibold ${color}`}>{label}</span>
      <span className={`${color} font-bold`}>{pad(h)}:{pad(m)}:{pad(s)}</span>
    </div>
  );
}

function PhaseTag({ phase }: { phase: PKPhase }) {
  if (phase === 'betting') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
        <Zap size={10} />
        下注中
      </span>
    );
  }
  if (phase === 'locked') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
        <Lock size={10} />
        锁局中
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-blue-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
      <Clock size={10} />
      冷却中
    </span>
  );
}

function SeasonBar({ winsA, winsB, nameA, nameB }: { winsA: number; winsB: number; nameA: string; nameB: string }) {
  const total = winsA + winsB || 1;
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[10px]">
        <span className="font-bold text-orange-500">{nameA} {winsA}胜</span>
        <span className="font-bold text-blue-500">{nameB} {winsB}胜</span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-rdark-border">
        <div className="h-full rounded-l-full bg-gradient-to-r from-orange-400 to-red-400" style={{ width: `${(winsA / total) * 100}%` }} />
        <div className="h-full rounded-r-full bg-gradient-to-r from-blue-400 to-cyan-400" style={{ width: `${(winsB / total) * 100}%` }} />
      </div>
    </div>
  );
}

function RoundDots({ rounds, nameA }: { rounds: PKRoundResult[]; nameA: string }) {
  return (
    <div className="flex flex-wrap gap-0.5">
      {rounds.map((round) => (
        <div
          key={round.round}
          title={`第${round.round}局 ${round.winner === 'A' ? nameA : '反方'}胜`}
          className={`flex h-4 w-4 items-center justify-center rounded-sm text-[8px] font-bold ${
            round.winner === 'A' ? 'bg-orange-400 text-white' : 'bg-blue-400 text-white'
          }`}
        >
          {round.round}
        </div>
      ))}
    </div>
  );
}

function HeroPK({
  pk,
  onBet,
  onEnterBattle,
  onHistory,
  voted,
}: {
  pk: PKTopicState;
  onBet?: RivalryPKProps['onBet'];
  onEnterBattle?: (id: string) => void;
  onHistory: (id: string) => void;
  voted?: 'A' | 'B';
}) {
  const item = pk.newsItem;
  const total = item.votes.A + item.votes.B;
  const heatTotal = pk.currentHeatA + pk.currentHeatB || 1;
  const heatPctA = Math.round((pk.currentHeatA / heatTotal) * 100);
  const heatPctB = 100 - heatPctA;
  const leading = pk.currentHeatA > pk.currentHeatB ? 'A' : pk.currentHeatB > pk.currentHeatA ? 'B' : null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-0">
        <img src={item.image} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30" />
      </div>

      <div className="relative p-5 md:p-7">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-orange-500/90 px-3 py-1 text-xs font-bold text-white">
            <Flame size={14} />
            开撕台
          </span>
          <PhaseTag phase={pk.phase} />
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/80 backdrop-blur-sm">
            第{pk.currentRound}局 · 赛季{pk.season.season}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/80 backdrop-blur-sm">
            <Users size={12} />
            {total.toLocaleString()} 参战
          </span>
          {pk.lastRoundWinner && leading ? (
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${pk.lastRoundWinner === leading ? 'bg-emerald-500/80 text-white' : 'bg-red-500/80 text-white'}`}>
              {pk.lastRoundWinner === 'A' ? item.optionA : item.optionB}
              {pk.lastRoundWinner === leading ? ' 守擂中' : ' 被翻盘'}
            </span>
          ) : null}
        </div>

        <h1 className="mb-1 text-xl font-extrabold leading-tight text-white md:text-2xl">{item.title}</h1>
        <p className="mb-4 max-w-xl text-sm text-white/50">{item.summary}</p>

        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-gradient-to-r from-orange-400 to-red-500" />
              <span className="text-sm font-bold text-white">{item.optionA}</span>
              <span className="text-lg font-bold text-orange-300">{pk.currentHeatA.toFixed(1)}</span>
            </div>
            <div className="text-xs font-black tracking-[0.3em] text-white/30">VS</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-blue-300">{pk.currentHeatB.toFixed(1)}</span>
              <span className="text-sm font-bold text-white">{item.optionB}</span>
              <span className="h-3 w-3 rounded-full bg-gradient-to-r from-blue-400 to-cyan-500" />
            </div>
          </div>
          <div className="relative flex h-4 overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full bg-gradient-to-r from-orange-500 to-red-500" animate={{ width: `${heatPctA}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
            <motion.div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400" animate={{ width: `${heatPctB}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
            <motion.div
              className="absolute top-1/2 z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg"
              animate={{ left: `${heatPctA}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            >
              <span className="text-[8px] font-black text-slate-900">VS</span>
            </motion.div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-4">
          {pk.phase === 'betting' ? (
            <>
              <Countdown target={pk.lockTime} label="下注截止" color="text-amber-300" />
              <Countdown target={pk.roundEndTime} label="本局结束" color="text-white/50" />
            </>
          ) : null}
          {pk.phase === 'locked' ? <Countdown target={pk.roundEndTime} label="本局结束" color="text-amber-300" /> : null}
          {pk.phase === 'cooldown' && pk.nextRoundTime ? <Countdown target={pk.nextRoundTime} label="下一局开始" color="text-emerald-300" /> : null}
        </div>

        <div className="mb-4 rounded-xl bg-white/10 p-3 backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-white/70">赛季{pk.season.season} 战绩</span>
            <span className="text-[10px] text-white/40">{pk.season.startDate} ~ {pk.season.endDate}</span>
          </div>
          <SeasonBar winsA={pk.season.winsA} winsB={pk.season.winsB} nameA={item.optionA} nameB={item.optionB} />
          <div className="mt-2 flex gap-1">
            <RoundDots rounds={pk.roundHistory} nameA={item.optionA} />
          </div>
        </div>

        <div className="mb-3 flex gap-3">
          <button
            onClick={() => onBet?.(item.id, 'A', item.oddsA)}
            disabled={!!voted || pk.phase !== 'betting'}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-0 py-3 text-sm font-bold transition-all ${
              voted === 'A'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                : pk.phase !== 'betting'
                  ? 'cursor-not-allowed bg-white/5 text-white/30'
                  : 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-red-600'
            }`}
          >
            <Crown size={16} />
            {item.optionA}
          </button>
          <div className="flex items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
              <Swords size={18} className="text-white/80" />
            </div>
          </div>
          <button
            onClick={() => onBet?.(item.id, 'B', item.oddsB)}
            disabled={!!voted || pk.phase !== 'betting'}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-0 py-3 text-sm font-bold transition-all ${
              voted === 'B'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                : pk.phase !== 'betting'
                  ? 'cursor-not-allowed bg-white/5 text-white/30'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20 hover:from-blue-600 hover:to-cyan-600'
            }`}
          >
            <Crown size={16} />
            {item.optionB}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-white/40">
            <Trophy size={12} />
            <span>每局 3 天 · 热度高者胜 · 赛季持续累计</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onHistory(pk.id)} className="flex cursor-pointer items-center gap-1 rounded-lg border-0 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition-all hover:bg-white/20">
              <History size={12} />
              历史战绩
            </button>
            {onEnterBattle ? (
              <button onClick={() => onEnterBattle(item.id)} className="flex cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/90 transition-all hover:bg-white/20">
                <MessageSquare size={12} />
                撕裂带
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PKCard({
  pk,
  index,
  onBet,
  onEnterBattle,
  onHistory,
  voted,
}: {
  pk: PKTopicState;
  index: number;
  onBet?: RivalryPKProps['onBet'];
  onEnterBattle?: (id: string) => void;
  onHistory: (id: string) => void;
  voted?: 'A' | 'B';
}) {
  const item = pk.newsItem;
  const heatTotal = pk.currentHeatA + pk.currentHeatB || 1;
  const heatPctA = Math.round((pk.currentHeatA / heatTotal) * 100);
  const leading = pk.currentHeatA > pk.currentHeatB ? 'A' : pk.currentHeatB > pk.currentHeatA ? 'B' : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-rdark-border dark:bg-rdark-card"
    >
      <div className="relative h-32 overflow-hidden">
        <img src={item.image} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute left-2 top-2 flex items-center gap-1.5">
          <PhaseTag phase={pk.phase} />
          <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold text-white/90 backdrop-blur-sm">第{pk.currentRound}局</span>
        </div>
        {pk.lastRoundWinner && leading ? (
          <div className="absolute right-2 top-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${pk.lastRoundWinner === leading ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
              {pk.lastRoundWinner === leading ? '守擂' : '翻盘'}
            </span>
          </div>
        ) : null}
      </div>

      <div className="p-3.5">
        <h3 className="mb-2 line-clamp-2 text-sm font-bold leading-snug text-slate-800 dark:text-rdark-text">{item.title}</h3>

        <div className="mb-2">
          <div className="mb-0.5 flex justify-between text-[10px]">
            <span className="font-semibold text-orange-500">{item.optionA} 🔥{pk.currentHeatA.toFixed(0)}</span>
            <span className="font-semibold text-blue-500">🔥{pk.currentHeatB.toFixed(0)} {item.optionB}</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-rdark-border">
            <div className="h-full bg-gradient-to-r from-orange-400 to-red-400 transition-all" style={{ width: `${heatPctA}%` }} />
            <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 transition-all" style={{ width: `${100 - heatPctA}%` }} />
          </div>
        </div>

        <div className="mb-2">
          <SeasonBar winsA={pk.season.winsA} winsB={pk.season.winsB} nameA={item.optionA} nameB={item.optionB} />
        </div>

        <div className="mb-2">
          {pk.phase === 'betting' ? <Countdown target={pk.lockTime} label="下注截止" color="text-amber-500" /> : null}
          {pk.phase === 'locked' ? <Countdown target={pk.roundEndTime} label="本局结束" color="text-amber-500" /> : null}
          {pk.phase === 'cooldown' && pk.nextRoundTime ? <Countdown target={pk.nextRoundTime} label="下一局" color="text-emerald-500" /> : null}
        </div>

        <div className="mb-2 flex gap-2">
          <button
            onClick={() => onBet?.(item.id, 'A', item.oddsA)}
            disabled={!!voted || pk.phase !== 'betting'}
            className={`flex-1 rounded-xl border-0 py-2 text-xs font-bold transition-all ${
              voted === 'A'
                ? 'bg-orange-500 text-white'
                : pk.phase !== 'betting'
                  ? 'cursor-not-allowed bg-slate-50 text-slate-300 dark:bg-rdark-input'
                  : 'bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/20'
            }`}
          >
            {item.optionA}
          </button>
          <button
            onClick={() => onBet?.(item.id, 'B', item.oddsB)}
            disabled={!!voted || pk.phase !== 'betting'}
            className={`flex-1 rounded-xl border-0 py-2 text-xs font-bold transition-all ${
              voted === 'B'
                ? 'bg-blue-500 text-white'
                : pk.phase !== 'betting'
                  ? 'cursor-not-allowed bg-slate-50 text-slate-300 dark:bg-rdark-input'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20'
            }`}
          >
            {item.optionB}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <button onClick={() => onHistory(pk.id)} className="flex cursor-pointer items-center gap-1 border-0 bg-transparent text-[10px] text-slate-400 transition-colors hover:text-orange-500">
            <History size={10} />
            历史战绩
          </button>
          {onEnterBattle ? (
            <button onClick={() => onEnterBattle(item.id)} className="flex cursor-pointer items-center gap-1 border-0 bg-transparent text-[10px] font-medium text-slate-400 transition-colors hover:text-orange-500">
              <MessageSquare size={10} />
              撕裂带
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function HistoryPage({ pk, onBack }: { pk: PKTopicState; onBack: () => void }) {
  const item = pk.newsItem;
  const history = pk.history;

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 border-0 bg-transparent text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-rdark-text2">
        <ArrowLeft size={16} />
        返回开撕台
      </button>

      <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 p-5 text-white">
        <h2 className="mb-1 text-lg font-extrabold">{item.title}</h2>
        <p className="mb-3 text-xs text-white/70">全部历史战绩 · 永恒话题</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl bg-white/15 p-3 text-center">
            <div className="text-2xl font-black">{history.totalRounds}</div>
            <div className="text-[10px] text-white/60">总局数</div>
          </div>
          <div className="rounded-xl bg-white/15 p-3 text-center">
            <div className="text-2xl font-black text-orange-200">{history.totalWinsA}</div>
            <div className="text-[10px] text-white/60">{item.optionA} 胜</div>
          </div>
          <div className="rounded-xl bg-white/15 p-3 text-center">
            <div className="text-2xl font-black text-blue-200">{history.totalWinsB}</div>
            <div className="text-[10px] text-white/60">{item.optionB} 胜</div>
          </div>
          <div className="rounded-xl bg-white/15 p-3 text-center">
            <div className="text-2xl font-black">{history.currentStreak}🔥</div>
            <div className="text-[10px] text-white/60">{history.currentStreakSide === 'A' ? item.optionA : item.optionB} 连胜</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-white p-4 dark:border-rdark-border dark:bg-rdark-card">
          <div className="mb-2 flex items-center gap-2">
            <Shield size={16} className="text-orange-500" />
            <span className="text-sm font-bold text-slate-700 dark:text-rdark-text">{item.optionA}</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-500 dark:text-rdark-text2">
            <div className="flex justify-between"><span>总胜场</span><span className="font-bold text-orange-500">{history.totalWinsA}</span></div>
            <div className="flex justify-between"><span>胜率</span><span className="font-bold">{history.totalRounds > 0 ? ((history.totalWinsA / history.totalRounds) * 100).toFixed(1) : '0'}%</span></div>
            <div className="flex justify-between"><span>最高连胜</span><span className="font-bold text-orange-500">{history.longestStreakA} 🔥</span></div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 dark:border-rdark-border dark:bg-rdark-card">
          <div className="mb-2 flex items-center gap-2">
            <Shield size={16} className="text-blue-500" />
            <span className="text-sm font-bold text-slate-700 dark:text-rdark-text">{item.optionB}</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-500 dark:text-rdark-text2">
            <div className="flex justify-between"><span>总胜场</span><span className="font-bold text-blue-500">{history.totalWinsB}</span></div>
            <div className="flex justify-between"><span>胜率</span><span className="font-bold">{history.totalRounds > 0 ? ((history.totalWinsB / history.totalRounds) * 100).toFixed(1) : '0'}%</span></div>
            <div className="flex justify-between"><span>最高连胜</span><span className="font-bold text-blue-500">{history.longestStreakB} 🔥</span></div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-4 dark:border-rdark-border dark:bg-rdark-card">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-rdark-text">
          <Trophy size={16} className="text-amber-500" />
          赛季记录
        </h3>
        <div className="space-y-3">
          {history.seasons.map((season) => (
            <div key={season.season} className={`rounded-lg p-3 ${season.champion ? 'bg-slate-50 dark:bg-rdark-hover' : 'border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/10'}`}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-rdark-text">赛季 {season.season}</span>
                  <span className="text-[10px] text-slate-400">{season.startDate} ~ {season.endDate}</span>
                </div>
                {season.champion ? (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${season.champion === 'A' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                    {season.champion === 'A' ? item.optionA : item.optionB} 冠军
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">进行中</span>
                )}
              </div>
              <SeasonBar winsA={season.winsA} winsB={season.winsB} nameA={item.optionA} nameB={item.optionB} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-4 dark:border-rdark-border dark:bg-rdark-card">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-rdark-text">
          <BarChart3 size={16} className="text-slate-400" />
          当前赛季对局记录
        </h3>
        <div className="space-y-1.5">
          {pk.roundHistory.map((round) => (
            <div key={round.round} className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-rdark-hover">
              <span className="w-12 font-mono text-slate-400">第{round.round}局</span>
              <span className={`font-bold ${round.winner === 'A' ? 'text-orange-500' : 'text-blue-500'}`}>
                {round.winner === 'A' ? item.optionA : item.optionB} 胜
              </span>
              <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-rdark-border">
                <div className="h-full bg-orange-400" style={{ width: `${(round.heatA / (round.heatA + round.heatB)) * 100}%` }} />
                <div className="h-full bg-blue-400" style={{ width: `${(round.heatB / (round.heatA + round.heatB)) * 100}%` }} />
              </div>
              <span className="w-12 text-right text-orange-400">{round.heatA.toFixed(0)}</span>
              <span className="text-slate-300">vs</span>
              <span className="w-12 text-blue-400">{round.heatB.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const RivalryPK: React.FC<RivalryPKProps> = ({
  hero = mockRivalryHero,
  items = mockRivalryItems,
  userVotes = {},
  onBet,
  onEnterBattle,
}) => {
  const [historyId, setHistoryId] = useState<string | null>(null);
  const heroPK = mockPKStates.find((pk) => pk.id === hero.id);
  const allPKs = mockPKStates.filter((pk) => [hero.id, ...items.map((item) => item.id)].includes(pk.id));

  if (historyId) {
    const target = allPKs.find((pk) => pk.id === historyId);
    if (target) return <HistoryPage pk={target} onBack={() => setHistoryId(null)} />;
  }

  return (
    <section className="view-shell view-rhythm mx-0 grid w-full max-w-none gap-6">
      <div className="flex items-center gap-3">
        <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-orange-500 to-red-500" />
        <h2 className="text-base font-bold text-slate-700 dark:text-rdark-text">开撕台</h2>
        <span className="text-xs text-slate-400 dark:text-rdark-text2">身份对立 · 回合制 · 热度决胜</span>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-orange-200/50 bg-gradient-to-r from-orange-50 to-red-50 p-4 dark:border-orange-800/30 dark:from-orange-900/10 dark:to-red-900/10">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-red-500">
          <Swords size={20} className="text-white" />
        </div>
        <div>
          <h3 className="mb-1 text-sm font-bold text-orange-700 dark:text-orange-400">开撕台回合制玩法</h3>
          <p className="text-xs leading-relaxed text-orange-600/70 dark:text-orange-300/60">
            每个对立话题会持续存在，按局循环。前 2 天可下注，第 3 天锁局，按双方热度判定胜负，并持续累计赛季战绩。
          </p>
        </div>
      </div>

      {heroPK ? (
        <HeroPK pk={heroPK} onBet={onBet} onEnterBattle={onEnterBattle} onHistory={setHistoryId} voted={userVotes[hero.id]} />
      ) : null}

      {allPKs.filter((pk) => pk.id !== hero.id).length > 0 ? (
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-700 dark:text-rdark-text">
            <span className="h-5 w-1 rounded-full bg-gradient-to-b from-orange-500 to-red-500" />
            全部对决
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {allPKs.filter((pk) => pk.id !== hero.id).map((pk, index) => (
              <PKCard
                key={pk.id}
                pk={pk}
                index={index}
                onBet={onBet}
                onEnterBattle={onEnterBattle}
                onHistory={setHistoryId}
                voted={userVotes[pk.newsItem.id]}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};
