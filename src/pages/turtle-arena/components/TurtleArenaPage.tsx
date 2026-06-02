/**
 * 文件说明：龟战 Arena 独立 Game UI。
 *
 * 风格对齐概念图：干净 esports 大厅、深绿翠色系、stadium 三栏布局。
 * 不挂在主站 home layout 下，整页换皮：顶部 header（赛季 + 在线 + 货币 + 返回主站）
 * + 左侧 8 子模块导航 + 主内容区。
 */
import { useState } from 'react';
import { useNavigate } from '@umijs/renderer-react';
import {
  ArrowLeft,
  Backpack,
  Bell,
  Coins,
  Hammer,
  Megaphone,
  Shield,
  Sparkles,
  Store,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { ARENA_SEASON } from '../data/arenaMockData';
import { BattleLobbySection } from './sections/BattleLobbySection';
import { MyTeamSection } from './sections/MyTeamSection';
import { SkillTreeSection } from './sections/SkillTreeSection';
import { EquipmentSection } from './sections/EquipmentSection';
import { RankedSection } from './sections/RankedSection';
import { GuildSection } from './sections/GuildSection';
import { BlackMarketSection } from './sections/BlackMarketSection';
import { TasksSection } from './sections/TasksSection';
import './arena.css';

type ArenaSectionKey =
  | 'lobby'
  | 'team'
  | 'skill'
  | 'equipment'
  | 'ranked'
  | 'guild'
  | 'market'
  | 'tasks';

interface ArenaMenuItem {
  key: ArenaSectionKey;
  label: string;
  icon: React.ReactNode;
}

const MENU: ArenaMenuItem[] = [
  { key: 'lobby',     label: '对战大厅', icon: <Swords size={18} /> },
  { key: 'team',      label: '我的龟队', icon: <Users size={18} /> },
  { key: 'skill',     label: '技能树',   icon: <Sparkles size={18} /> },
  { key: 'equipment', label: '装备背包', icon: <Backpack size={18} /> },
  { key: 'ranked',    label: '排行榜',   icon: <Trophy size={18} /> },
  { key: 'guild',     label: '联盟公会', icon: <Megaphone size={18} /> },
  { key: 'market',    label: '黑市商店', icon: <Store size={18} /> },
  { key: 'tasks',     label: '任务成就', icon: <Hammer size={18} /> },
];

export function TurtleArenaPage() {
  const [active, setActive] = useState<ArenaSectionKey>('lobby');
  const navigate = useNavigate();

  const points = ARENA_SEASON.myPoints;
  const pointsToNext = ARENA_SEASON.pointsToNext;
  const rankProgress = Math.min(100, Math.round((points / pointsToNext) * 100));

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,#0c2a22_0%,#040810_55%,#02030a_100%)] text-white antialiased">
      {/* 全局氛围层：网格底 + 漂浮光团 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 arena-grid-bg opacity-40" />
      <span aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60%] -translate-x-1/2 rounded-full bg-emerald-500/16 blur-3xl arena-drift" />
      <span aria-hidden className="pointer-events-none absolute top-1/3 -left-32 h-72 w-72 rounded-full bg-cyan-500/12 blur-3xl arena-drift" style={{ animationDelay: '-6s' }} />
      <span aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-72 w-80 rounded-full bg-amber-500/10 blur-3xl arena-drift" style={{ animationDelay: '-12s' }} />

      {/* ===== HEADER ===== */}
      <header className="relative shrink-0 overflow-hidden border-b border-emerald-400/22 bg-[linear-gradient(180deg,#07221c_0%,#040810_100%)] shadow-[0_4px_28px_rgba(16,185,129,0.16)]">
        <span aria-hidden className="pointer-events-none absolute -top-12 left-1/2 h-32 w-[50%] -translate-x-1/2 rounded-full bg-emerald-400/18 blur-3xl" />

        <div className="relative flex h-[68px] items-center gap-3 px-4 md:gap-4 md:px-7">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/14 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/75 transition-colors hover:border-emerald-400/40 hover:bg-white/12"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">返回主站</span>
          </button>

          <div className="ml-1 flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-emerald-300/45 bg-[radial-gradient(circle_at_30%_30%,#10b98155,#06b6d422)] text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]">
              <Shield size={20} strokeWidth={2.4} />
            </span>
            <div className="leading-tight">
              <div className="flex items-baseline gap-2">
                <span className="arena-text-glow text-[20px] font-black tracking-tight text-emerald-100 md:text-[22px]">龟战</span>
                <span className="hidden text-[13px] font-bold tracking-[0.28em] text-emerald-300/90 sm:inline">ARENA</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-emerald-200/70">
                <span className="grid h-1.5 w-1.5 place-items-center rounded-full bg-emerald-400 arena-blink shadow-[0_0_6px_rgba(16,185,129,0.75)]" />
                <span className="hidden sm:inline">{ARENA_SEASON.name} · {ARENA_SEASON.range}</span>
                <span className="sm:hidden">{ARENA_SEASON.name}</span>
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 md:gap-2.5">
            <Chip icon={<Coins size={13} className="text-amber-300" />} label="12,840" tone="amber" />
            <Chip icon={<Sparkles size={13} className="text-violet-300" />} label="3,260" tone="violet" />
            <Chip icon={<Users size={13} className="text-emerald-300" />} label={ARENA_SEASON.onlinePlayers.toLocaleString()} tone="emerald" />
            <button
              type="button"
              className="hidden h-9 w-9 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.05] text-white/70 transition-colors hover:border-emerald-400/40 hover:bg-white/10 sm:grid"
              aria-label="系统公告"
            >
              <Bell size={14} />
            </button>
            <div className="relative">
              <span aria-hidden className="absolute inset-0 rounded-full bg-emerald-500/40 blur-md arena-pulse" />
              <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-emerald-400/55 bg-gradient-to-br from-emerald-500/45 to-emerald-700/45 text-[12px] font-black text-emerald-50 shadow-[0_0_18px_rgba(16,185,129,0.42)]">
                G
                <span aria-hidden className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-[#02030a] bg-emerald-400 arena-blink" />
              </span>
            </div>
          </div>
        </div>

        {/* 底部翠绿渐变线 */}
        <div className="relative h-px bg-gradient-to-r from-transparent via-emerald-400/55 to-transparent" />
      </header>

      {/* ===== BODY ===== */}
      <div className="relative flex min-h-0 flex-1">
        {/* ===== SIDEBAR ===== */}
        <aside className="relative hidden w-[232px] shrink-0 flex-col border-r border-white/8 bg-[#040810]/82 px-3 py-4 md:flex lg:w-[252px]">
          <div className="mb-3 px-2">
            <div className="text-[13px] font-bold text-white/92">游戏大厅</div>
            <div className="text-[10px] text-white/45">选择子模块进入</div>
          </div>

          <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
            {MENU.map((item) => {
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActive(item.key)}
                  className={`group relative flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${
                    isActive
                      ? 'border-emerald-400/40 bg-[linear-gradient(135deg,rgba(16,185,129,0.20),rgba(6,182,212,0.08)_60%,transparent)] text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_22px_rgba(16,185,129,0.22)]'
                      : 'border-transparent bg-transparent text-zinc-300 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  {isActive ? (
                    <span aria-hidden className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
                  ) : null}
                  <span className={`shrink-0 ${isActive ? 'text-emerald-300' : 'text-zinc-500 group-hover:text-zinc-200'}`}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {isActive ? (
                    <span className="grid h-1.5 w-1.5 place-items-center rounded-full bg-emerald-400 arena-pulse shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* 段位卡 - 干净 emerald + amber 兼用 */}
          <div className="relative mt-3 rounded-2xl border border-amber-400/26 bg-[linear-gradient(135deg,#23170a_0%,#180e04_60%,#080610_100%)] p-3 shadow-[0_12px_24px_rgba(0,0,0,0.32)] arena-breathe">
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-400/45 bg-amber-500/18 text-[20px] shadow-[0_0_18px_rgba(251,191,36,0.45)]">
                🥇
              </span>
              <div className="leading-tight">
                <div className="text-[10px] text-amber-200/65">赛季段位</div>
                <div className="text-[15px] font-black tracking-tight text-amber-100" style={{ textShadow: '0 0 10px rgba(251,191,36,0.55)' }}>
                  {ARENA_SEASON.myRank}
                </div>
              </div>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/45">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                style={{ width: `${rankProgress}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-amber-200/60">
              <span className="tabular-nums">{points.toLocaleString()} / {pointsToNext.toLocaleString()}</span>
              <span>全球 #{ARENA_SEASON.globalRank.toLocaleString()}</span>
            </div>
          </div>
        </aside>

        {/* ===== CONTENT WRAPPER ===== */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          {/* 移动端横向导航 */}
          <nav className="flex shrink-0 gap-2 overflow-x-auto border-b border-emerald-400/15 bg-[#040810]/92 px-3 py-2 backdrop-blur md:hidden">
            {MENU.map((item) => {
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActive(item.key)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                    isActive
                      ? 'border-emerald-400/45 bg-emerald-500/14 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.28)]'
                      : 'border-white/10 bg-white/[0.03] text-white/65'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* MAIN（仅这里滚动） */}
          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
            {active === 'lobby' ? <BattleLobbySection /> : null}
            {active === 'team' ? <MyTeamSection /> : null}
            {active === 'skill' ? <SkillTreeSection /> : null}
            {active === 'equipment' ? <EquipmentSection /> : null}
            {active === 'ranked' ? <RankedSection /> : null}
            {active === 'guild' ? <GuildSection /> : null}
            {active === 'market' ? <BlackMarketSection /> : null}
            {active === 'tasks' ? <TasksSection /> : null}
          </main>
        </div>
      </div>
    </div>
  );
}

function Chip({ icon, label, tone }: { icon: React.ReactNode; label: string; tone: 'amber' | 'violet' | 'emerald' }) {
  const cls =
    tone === 'amber'
      ? 'border-amber-400/35 bg-amber-500/10 text-amber-100 shadow-[0_0_14px_rgba(251,191,36,0.22)]'
      : tone === 'violet'
        ? 'border-violet-400/35 bg-violet-500/10 text-violet-100 shadow-[0_0_14px_rgba(167,139,250,0.22)]'
        : 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100 shadow-[0_0_14px_rgba(16,185,129,0.24)]';
  return (
    <div className={`hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold backdrop-blur-sm sm:inline-flex ${cls}`}>
      {icon}
      <span className="tabular-nums">{label}</span>
    </div>
  );
}
