/**
 * 文件说明：龟战 Arena - 黑市商店 Section，展示限定商品列表与货币入口（龟币 / 荣誉点）。
 */
import { Coins, Sparkles } from 'lucide-react';
import { mockArenaMarketItems } from '../../data/arenaMockData';

const RARITY_TONE = {
  N: 'border-zinc-500/40 bg-zinc-500/8',
  R: 'border-sky-500/40 bg-sky-500/8',
  SR: 'border-violet-500/40 bg-violet-500/8',
  SSR: 'border-amber-500/45 bg-amber-500/10',
  UR: 'border-rose-500/45 bg-rose-500/10',
};

export function BlackMarketSection() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-black tracking-tight text-white md:text-[22px]">黑市商店</h2>
          <p className="text-[12px] text-white/55">每日 04:00 刷新 · 部分商品库存有限</p>
        </div>
        <div className="flex items-center gap-3">
          <CurrencyChip icon={<Coins size={14} className="text-amber-300" />} label="龟币" value="12,840" tone="amber" />
          <CurrencyChip icon={<Sparkles size={14} className="text-violet-300" />} label="荣誉" value="3,260" tone="violet" />
        </div>
      </div>

      {/* 头部精选广告条 */}
      <div className="relative overflow-hidden rounded-3xl border border-rose-400/22 bg-[radial-gradient(circle_at_20%_30%,#3a0820,#1a060f_55%,#0a060c)] p-5">
        <span aria-hidden className="pointer-events-none absolute -top-12 right-8 h-40 w-72 rounded-full bg-rose-500/22 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-2xl border border-rose-300/40 bg-rose-500/15 text-[32px] shadow-[0_0_22px_rgba(244,63,94,0.32)]">⚽</span>
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-200">限时联动</div>
            <h3 className="mt-1 text-[18px] font-black tracking-tight text-rose-100">开撕台胜利皮肤 · 梅西之龟</h3>
            <p className="text-[11px] text-rose-200/65">梅西阵营在开撕台获胜后开放兑换 · 库存 42</p>
          </div>
          <button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/55 bg-gradient-to-r from-rose-500/35 to-orange-500/30 px-4 py-2 text-sm font-bold text-rose-50 shadow-[0_8px_18px_rgba(244,63,94,0.32)] hover:scale-[1.02]">
            4,800 荣誉 兑换
          </button>
        </div>
      </div>

      {/* 商品网格 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {mockArenaMarketItems.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl border p-4 transition-colors hover:border-white/22 ${RARITY_TONE.SR}`}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-xl border border-white/14 bg-black/40 text-[28px]">{item.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-bold text-white">{item.name}</div>
                <div className="text-[11px] leading-snug text-white/55">{item.desc}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className={`inline-flex items-center gap-1 text-[13px] font-black tabular-nums ${item.currency === '龟币' ? 'text-amber-200' : 'text-violet-200'}`}>
                {item.currency === '龟币' ? <Coins size={13} /> : <Sparkles size={13} />}
                {item.price.toLocaleString()}
                <span className="text-[10px] font-medium opacity-75">{item.currency}</span>
              </span>
              <div className="flex items-center gap-2">
                {item.stockLeft !== undefined ? (
                  <span className="text-[10px] text-white/45">库存 {item.stockLeft}</span>
                ) : null}
                <button type="button" className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold text-white/85 hover:bg-white/15">
                  购买
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CurrencyChip({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'amber' | 'violet' }) {
  const cls = tone === 'amber'
    ? 'border-amber-400/35 bg-amber-500/12 text-amber-100'
    : 'border-violet-400/35 bg-violet-500/12 text-violet-100';
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-bold ${cls}`}>
      {icon}
      <span className="opacity-70">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
