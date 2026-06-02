/**
 * 文件说明：龟战 Arena - 排位赛 Section，展示当前段位、胜率、近期对局、赛季奖励预览。
 */
import { ChevronRight, Crown, Minus, TrendingUp } from 'lucide-react';
import { ARENA_SEASON, mockArenaSeasonRewards } from '../../data/arenaMockData';

const RECENT_GAMES = [
  { id: 'g1', mode: '排位', result: 'win', delta: '+28', opponent: '梁海龟王', time: '32m 前' },
  { id: 'g2', mode: '排位', result: 'win', delta: '+24', opponent: '熔岩之拳', time: '1h 前' },
  { id: 'g3', mode: '排位', result: 'lose', delta: '-18', opponent: '霜月行者', time: '3h 前' },
  { id: 'g4', mode: '排位', result: 'win', delta: '+30', opponent: '岩心铁壁', time: '6h 前' },
  { id: 'g5', mode: '排位', result: 'lose', delta: '-22', opponent: '深海罗刹', time: '昨日' },
];

const TIER_TONE: Record<string, string> = {
  amber: 'border-amber-400/40 bg-amber-500/12 text-amber-100',
  sky: 'border-sky-400/40 bg-sky-500/12 text-sky-100',
  violet: 'border-violet-400/40 bg-violet-500/12 text-violet-100',
  rose: 'border-rose-400/40 bg-rose-500/12 text-rose-100',
};

export function RankedSection() {
  const winCount = RECENT_GAMES.filter((g) => g.result === 'win').length;
  const winRate = Math.round((winCount / RECENT_GAMES.length) * 100);
  const progress = Math.round((ARENA_SEASON.myPoints / ARENA_SEASON.pointsToNext) * 100);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[20px] font-black tracking-tight text-white md:text-[22px]">排位赛</h2>
        <p className="text-[12px] text-white/55">每周排位上限 30 场 · 段位重置时间：每月 1 日 00:00</p>
      </div>

      {/* 当前段位 Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-[radial-gradient(circle_at_20%_30%,#3a280c,#1b1106_55%,#0a0a0d)] p-5">
        <span aria-hidden className="pointer-events-none absolute -top-12 right-10 h-44 w-44 rounded-full bg-amber-400/22 blur-3xl" />
        <div className="relative grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="flex items-center gap-4">
            <span className="grid h-20 w-20 place-items-center rounded-3xl border-2 border-amber-300/55 bg-amber-500/15 text-[52px] shadow-[0_0_28px_rgba(251,191,36,0.4)]">🥇</span>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-amber-200/70">当前段位</div>
              <div className="text-[28px] font-black tracking-tight text-amber-100 md:text-[32px]">{ARENA_SEASON.myRank}</div>
              <div className="text-[12px] text-amber-200/65">全球排名 #{ARENA_SEASON.globalRank.toLocaleString()}</div>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] text-amber-200/70">
              <span>距离下一段位</span>
              <span className="tabular-nums">{ARENA_SEASON.myPoints} / {ARENA_SEASON.pointsToNext}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-black/45">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-1 text-[10px] text-amber-200/55">还需 {ARENA_SEASON.pointsToNext - ARENA_SEASON.myPoints} 积分晋升</div>
          </div>

          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-300/55 bg-gradient-to-r from-amber-500/30 to-orange-500/30 px-5 py-2.5 text-sm font-black text-amber-50 shadow-[0_10px_22px_rgba(251,191,36,0.32)] hover:scale-[1.02]">
            <Crown size={16} />
            开始排位
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr]">
        {/* 近期对局 */}
        <div className="rounded-2xl border border-white/10 bg-[#0c1118] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-white">近期对局</h3>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
              <TrendingUp size={12} /> 近 5 局胜率 {winRate}%
            </span>
          </div>
          <div className="space-y-1.5">
            {RECENT_GAMES.map((g) => (
              <div key={g.id} className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.025] px-3 py-2">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-lg text-[10px] font-black ${
                    g.result === 'win' ? 'bg-emerald-500/22 text-emerald-200' : 'bg-rose-500/22 text-rose-200'
                  }`}
                >
                  {g.result === 'win' ? '胜' : '负'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold text-white/90">{g.mode} · vs {g.opponent}</div>
                  <div className="text-[10px] text-white/45">{g.time}</div>
                </div>
                <span className={`tabular-nums text-[13px] font-black ${g.result === 'win' ? 'text-emerald-300' : 'text-rose-300'}`}>{g.delta}</span>
              </div>
            ))}
          </div>
          <button type="button" className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-full border border-white/12 bg-white/[0.04] py-1.5 text-[11px] font-semibold text-white/70 hover:bg-white/10">
            查看全部对局
            <ChevronRight size={12} />
          </button>
        </div>

        {/* 赛季奖励预览 */}
        <div className="rounded-2xl border border-white/10 bg-[#0c1118] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-white">赛季奖励预览</h3>
            <span className="text-[11px] text-white/45">{ARENA_SEASON.range}</span>
          </div>
          <div className="space-y-2">
            {mockArenaSeasonRewards.map((r) => {
              const isCurrent = r.tier === '黄金';
              return (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${TIER_TONE[r.tone]} ${isCurrent ? 'ring-2 ring-amber-300/40' : ''}`}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/12 bg-black/35 text-[20px]">{r.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-black">{r.tier} 段位</div>
                    <div className="text-[10px] opacity-75">{r.label}</div>
                  </div>
                  {isCurrent ? (
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">当前</span>
                  ) : (
                    <Minus size={10} className="opacity-45" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
