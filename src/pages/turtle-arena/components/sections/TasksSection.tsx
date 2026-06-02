/**
 * 文件说明：龟战 Arena - 任务成就 Section，按 日常 / 周常 / 赛季 三个 Tab 切换任务列表。
 */
import { useState } from 'react';
import { CalendarCheck, CheckCircle2, Crown, Sparkles } from 'lucide-react';
import { mockArenaTasks, type ArenaTask } from '../../data/arenaMockData';

type Tab = 'daily' | 'weekly' | 'season';

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: 'daily', label: '每日任务', icon: <CalendarCheck size={14} /> },
  { key: 'weekly', label: '每周任务', icon: <Sparkles size={14} /> },
  { key: 'season', label: '赛季任务', icon: <Crown size={14} /> },
];

export function TasksSection() {
  const [tab, setTab] = useState<Tab>('daily');
  const list = mockArenaTasks.filter((t) => t.category === tab);
  const completed = list.filter((t) => t.progress >= t.total).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[20px] font-black tracking-tight text-white md:text-[22px]">任务成就</h2>
        <p className="text-[12px] text-white/55">完成任务获得龟币 / 荣誉 / 段位券 · 每日 04:00 重置</p>
      </div>

      {/* Tab 切换 */}
      <div className="inline-flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
        {TABS.map((t) => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-bold transition-colors ${
                isActive ? 'bg-emerald-500/22 text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 进度小条 */}
      <div className="rounded-2xl border border-emerald-400/22 bg-emerald-500/8 p-3">
        <div className="flex items-center justify-between text-[11px] text-emerald-200/75">
          <span>本类型已完成</span>
          <span className="tabular-nums">{completed} / {list.length}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/40">
          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${(completed / Math.max(1, list.length)) * 100}%` }} />
        </div>
      </div>

      {/* 任务列表 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {list.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: ArenaTask }) {
  const pct = Math.min(100, Math.round((task.progress / task.total) * 100));
  const done = task.progress >= task.total;

  return (
    <div
      className={`relative rounded-2xl border p-4 transition-colors ${
        done ? 'border-emerald-400/35 bg-emerald-500/8' : 'border-white/10 bg-[#0c1118]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[14px] font-bold text-white">{task.title}</h3>
        {done ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/22 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
            <CheckCircle2 size={10} /> 可领
          </span>
        ) : null}
      </div>
      <div className="mt-1 text-[11px] text-amber-200/85">奖励 · {task.reward}</div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-white/55">
          <span>进度</span>
          <span className="tabular-nums text-white/80">{task.progress} / {task.total}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
          <div
            className={`h-full rounded-full ${done ? 'bg-emerald-400' : 'bg-amber-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!done}
        className={`mt-3 w-full rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors ${
          done
            ? 'border border-emerald-300/55 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 text-emerald-50 shadow-[0_4px_14px_rgba(16,185,129,0.22)]'
            : 'cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/40'
        }`}
      >
        {done ? '领取奖励' : '进行中…'}
      </button>
    </div>
  );
}
