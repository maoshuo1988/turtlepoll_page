/**
 * 文件说明：World Cup 页面路由入口，展示世界杯专题预测看板。
 */
import { ArrowUpRight, CalendarDays, ChevronRight, CircleDollarSign, Flag, Goal, Shield, Sparkles, Trophy } from 'lucide-react';

const featuredMarkets = [
  {
    title: '谁会捧起大力神杯？',
    tag: '冠军归属',
    home: '巴西',
    away: '法国',
    homeOdds: '42%',
    awayOdds: '35%',
    heat: '18.6w',
  },
  {
    title: '决赛会不会进入加时？',
    tag: '决赛剧本',
    home: '90 分钟结束',
    away: '加时/点球',
    homeOdds: '61%',
    awayOdds: '39%',
    heat: '9.8w',
  },
  {
    title: '金靴会来自哪条锋线？',
    tag: '球员荣誉',
    home: '南美锋线',
    away: '欧洲锋线',
    homeOdds: '48%',
    awayOdds: '52%',
    heat: '12.4w',
  },
];

const fixtures = [
  { time: '今晚 22:00', title: '小组赛 A 组', teams: '阿根廷 vs 摩洛哥', signal: '临场热盘' },
  { time: '明天 02:00', title: '小组赛 B 组', teams: '英格兰 vs 日本', signal: '进球数分歧' },
  { time: '周日 23:00', title: '焦点淘汰赛', teams: '德国 vs 葡萄牙', signal: '胜负拉扯' },
];

const fanZones = [
  { label: '南美鼓点', value: '32%', color: 'from-emerald-300 to-yellow-300' },
  { label: '欧洲铁阵', value: '41%', color: 'from-sky-300 to-blue-500' },
  { label: '黑马看台', value: '27%', color: 'from-rose-300 to-orange-400' },
];

export default function WorldCupPage() {
  return (
    <section className="view-shell mx-0 grid w-full max-w-none gap-4 px-0 pb-8 text-white">
      <div className="relative isolate overflow-hidden rounded-[28px] border border-white/10 bg-[#071612] shadow-[0_24px_70px_rgba(0,0,0,0.36)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(250,204,21,0.28),transparent_28%),radial-gradient(circle_at_86%_22%,rgba(14,165,233,0.22),transparent_30%),linear-gradient(135deg,rgba(4,120,87,0.68),rgba(3,7,18,0.94)_55%,rgba(127,29,29,0.5))]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.55))]" />
        <div className="absolute -right-20 top-4 h-72 w-72 rounded-full border-[34px] border-white/8" />
        <div className="absolute bottom-0 left-1/2 h-[260px] w-[520px] -translate-x-1/2 rounded-t-full border border-white/12 bg-emerald-400/5" />
        <div className="relative grid gap-6 px-5 py-6 md:px-8 md:py-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-300/10 px-3 py-1.5 text-[12px] font-black text-yellow-100">
              <Trophy size={15} />
              世界杯专题盘
            </div>
            <h1 className="mt-5 max-w-[720px] text-[34px] font-black leading-tight tracking-normal md:text-[48px]">
              球场灯亮，预测开哨
            </h1>
            <p className="mt-4 max-w-[640px] text-[14px] leading-7 text-emerald-50/78 md:text-[15px]">
              从小组赛爆冷到冠军归属，把赛程、热度、资金流和球迷阵营放在同一个世界杯看板里。
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {fanZones.map((zone) => (
                <div key={zone.label} className="rounded-[18px] border border-white/10 bg-black/22 p-4 backdrop-blur">
                  <div className={`h-1.5 rounded-full bg-gradient-to-r ${zone.color}`} />
                  <div className="mt-3 text-[12px] font-bold text-white/62">{zone.label}</div>
                  <div className="mt-1 text-[28px] font-black">{zone.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[280px] overflow-hidden rounded-[24px] border border-white/12 bg-black/26 p-5 backdrop-blur-md">
            <div className="absolute inset-4 rounded-[20px] border border-white/10" />
            <div className="absolute left-1/2 top-4 h-[calc(100%-32px)] w-px bg-white/10" />
            <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12" />
            <div className="relative flex h-full min-h-[240px] flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-bold text-white/80">
                  <Goal size={14} />
                  冠军指数
                </span>
                <span className="text-[12px] font-bold text-yellow-100">LIVE</span>
              </div>
              <div className="mx-auto grid h-32 w-32 place-items-center rounded-full border border-yellow-200/30 bg-[radial-gradient(circle,#fef3c7_0%,#facc15_42%,#a16207_100%)] text-[#281400] shadow-[0_0_42px_rgba(250,204,21,0.32)]">
                <Trophy size={58} strokeWidth={2.5} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-emerald-300/14 p-3">
                  <div className="text-[11px] text-white/58">总成交</div>
                  <div className="mt-1 text-[18px] font-black">288k</div>
                </div>
                <div className="rounded-2xl bg-sky-300/14 p-3">
                  <div className="text-[11px] text-white/58">开盘数</div>
                  <div className="mt-1 text-[18px] font-black">36</div>
                </div>
                <div className="rounded-2xl bg-rose-300/14 p-3">
                  <div className="text-[11px] text-white/58">爆冷率</div>
                  <div className="mt-1 text-[18px] font-black">19%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-[22px] font-black">热门世界杯暗盘</h2>
              <p className="mt-1 text-[13px] text-zinc-500">赔率仅作前端展示，等接口接入后可替换为实时市场。</p>
            </div>
            <button className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] font-bold text-white/78 transition-colors hover:bg-white/[0.08] md:inline-flex">
              全部赛程
              <ArrowUpRight size={15} />
            </button>
          </div>

          <div className="grid gap-3">
            {featuredMarkets.map((market) => (
              <article key={market.title} className="rounded-[22px] border border-white/8 bg-[#101114] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.22)] md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-black text-emerald-200">
                      <Flag size={13} />
                      {market.tag}
                    </div>
                    <h3 className="mt-3 text-[18px] font-black text-white md:text-[20px]">{market.title}</h3>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-3 py-1.5 text-[12px] font-bold text-zinc-300">
                    <Sparkles size={14} className="text-yellow-200" />
                    热度 {market.heat}
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <button className="group rounded-[18px] border border-emerald-300/18 bg-emerald-300/8 p-4 text-left transition-colors hover:bg-emerald-300/14">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-black text-white">{market.home}</span>
                      <span className="text-[26px] font-black text-emerald-200">{market.homeOdds}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/30">
                      <div className="h-full w-[58%] rounded-full bg-gradient-to-r from-emerald-300 to-yellow-200" />
                    </div>
                  </button>
                  <button className="group rounded-[18px] border border-sky-300/18 bg-sky-300/8 p-4 text-left transition-colors hover:bg-sky-300/14">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-black text-white">{market.away}</span>
                      <span className="text-[26px] font-black text-sky-200">{market.awayOdds}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/30">
                      <div className="h-full w-[46%] rounded-full bg-gradient-to-r from-sky-300 to-rose-200" />
                    </div>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <div className="rounded-[22px] border border-white/8 bg-[#101114] p-5">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-yellow-200" />
              <h2 className="text-[18px] font-black">焦点赛程</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {fixtures.map((fixture) => (
                <button key={fixture.teams} className="flex items-center justify-between gap-3 rounded-[16px] bg-white/[0.04] p-3 text-left transition-colors hover:bg-white/[0.07]">
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold text-zinc-500">{fixture.time} · {fixture.title}</div>
                    <div className="mt-1 truncate text-[15px] font-black text-white">{fixture.teams}</div>
                    <div className="mt-1 text-[12px] text-emerald-200">{fixture.signal}</div>
                  </div>
                  <ChevronRight size={17} className="shrink-0 text-zinc-500" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-yellow-200/14 bg-[linear-gradient(160deg,rgba(113,63,18,0.44),rgba(15,16,19,0.96)_54%)] p-5">
            <div className="flex items-center gap-2">
              <CircleDollarSign size={18} className="text-yellow-200" />
              <h2 className="text-[18px] font-black">资金风向</h2>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-[16px] bg-black/22 p-4">
                <div className="flex items-center justify-between text-[13px] text-zinc-400">
                  <span>冠军盘流入</span>
                  <span className="font-black text-yellow-100">+24.8%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/40">
                  <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-yellow-200 via-emerald-300 to-sky-300" />
                </div>
              </div>
              <div className="rounded-[16px] bg-black/22 p-4">
                <div className="flex items-center gap-2 text-[13px] font-bold text-zinc-300">
                  <Shield size={15} className="text-sky-200" />
                  防守强队相关盘口热度正在上升
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
