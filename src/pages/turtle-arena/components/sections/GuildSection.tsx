/**
 * 文件说明：龟战 Arena - 联盟公会 Section，展示公会信息、成员列表、公会任务入口。
 */
import { Crown, Megaphone, Shield, Sword, Users } from 'lucide-react';
import { mockArenaGuildMembers } from '../../data/arenaMockData';

const RANK_TONE: Record<string, string> = {
  会长: 'bg-amber-500/22 text-amber-200 border-amber-400/40',
  副会: 'bg-violet-500/22 text-violet-200 border-violet-400/40',
  精英: 'bg-sky-500/22 text-sky-200 border-sky-400/40',
  成员: 'bg-white/10 text-white/70 border-white/15',
};

export function GuildSection() {
  const onlineCount = mockArenaGuildMembers.filter((m) => m.online).length;
  const totalPower = mockArenaGuildMembers.reduce((sum, m) => sum + m.power, 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[20px] font-black tracking-tight text-white md:text-[22px]">联盟公会</h2>
        <p className="text-[12px] text-white/55">所属公会：龟海联盟 · 公会战每周日 20:00 开启</p>
      </div>

      {/* 公会信息 Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-400/22 bg-[radial-gradient(circle_at_25%_30%,#1c1135,#0f0a22_55%,#0a0c10)] p-5">
        <span aria-hidden className="pointer-events-none absolute -top-12 right-10 h-40 w-72 rounded-full bg-violet-500/18 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <span className="grid h-16 w-16 place-items-center rounded-2xl border border-violet-300/40 bg-violet-500/15 text-[34px] shadow-[0_0_22px_rgba(167,139,250,0.35)]">🏰</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[20px] font-black tracking-tight text-violet-100">龟海联盟</h3>
              <span className="rounded-full border border-violet-400/40 bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-200">Lv.18</span>
            </div>
            <p className="mt-1 text-[12px] text-violet-200/65">「最强公会·全服第 12」 · 招募口号：来一起守海</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center md:gap-5">
            <Stat label="成员" value={`${mockArenaGuildMembers.length} / 50`} />
            <Stat label="在线" value={`${onlineCount}`} tone="emerald" />
            <Stat label="总战力" value={(totalPower / 10000).toFixed(1) + 'w'} tone="amber" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr]">
        {/* 成员列表 */}
        <div className="rounded-2xl border border-white/10 bg-[#0c1118] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="inline-flex items-center gap-1.5 text-[14px] font-bold text-white">
              <Users size={14} />
              成员列表
            </h3>
            <span className="text-[11px] text-white/45">按战力排序</span>
          </div>
          <div className="space-y-1.5">
            {mockArenaGuildMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.025] px-3 py-2">
                <span className="relative grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-slate-500 to-slate-700 text-[11px] font-black text-white">
                  {m.name.slice(0, 1)}
                  <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-[#0c1118] ${m.online ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-white/90">{m.name}</div>
                  <div className="text-[10px] text-white/45">战力 {m.power.toLocaleString()}</div>
                </div>
                <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${RANK_TONE[m.rank]}`}>{m.rank}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 公会任务 / 公告 */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-emerald-400/22 bg-emerald-500/8 p-4">
            <div className="mb-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-200">
              <Megaphone size={13} /> 会长公告
            </div>
            <p className="text-[12px] leading-relaxed text-emerald-100/85">
              本周日 20:00 公会战，请所有精英及以上成员准时出战。本月目标：冲击全服 Top 10！
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0c1118] p-4">
            <h3 className="mb-2 text-[14px] font-bold text-white">本周公会任务</h3>
            <div className="space-y-2">
              <TaskRow icon={<Sword size={12} />} title="累计排位胜利 200 场" progress={148} total={200} />
              <TaskRow icon={<Shield size={12} />} title="公会战累计积分 5000" progress={3120} total={5000} />
              <TaskRow icon={<Crown size={12} />} title="新增 5 名精英以上成员" progress={2} total={5} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'emerald' | 'amber' }) {
  const color = tone === 'emerald' ? 'text-emerald-200' : tone === 'amber' ? 'text-amber-200' : 'text-white';
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-white/45">{label}</div>
      <div className={`text-[18px] font-black tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function TaskRow({ icon, title, progress, total }: { icon: React.ReactNode; title: string; progress: number; total: number }) {
  const pct = Math.min(100, Math.round((progress / total) * 100));
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.025] p-2.5">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1.5 text-white/80">
          <span className="text-emerald-300">{icon}</span>
          {title}
        </span>
        <span className="tabular-nums text-white/55">{progress} / {total}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/40">
        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
