/**
 * 文件说明：龟战 Arena - 我的龟队 Section，展示出战阵容 + 全部 28 只龟图鉴。
 * 头像直接复用 /games/turtle-battle/assets/avatars/{id}.png，名字/属性/稀有度对齐龟龟对战 pets.js。
 */
import { useState } from 'react';
import { Filter, Plus, Settings2, Star } from 'lucide-react';
import {
  RARITY_TONE,
  TURTLE_TONE_BG,
  mockArenaTurtles,
  type ArenaRarity,
  type ArenaTurtle,
} from '../../data/arenaMockData';
import { TurtleDetailModal } from '../TurtleDetailModal';

const RARITY_FILTERS: Array<ArenaRarity | 'ALL'> = ['ALL', 'SSS', 'SS', 'S', 'A', 'B', 'C'];

export function MyTeamSection() {
  const [filter, setFilter] = useState<ArenaRarity | 'ALL'>('ALL');
  const [selected, setSelected] = useState<ArenaTurtle | null>(null);
  const equipped = mockArenaTurtles.filter((t) => t.equipped);
  const collection = mockArenaTurtles.filter((t) => !t.equipped);
  const visible = filter === 'ALL' ? collection : collection.filter((t) => t.rarity === filter);

  return (
    <>
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-black tracking-tight text-white md:text-[22px]">我的龟队</h2>
          <p className="text-[12px] text-white/55">
            图鉴收集 {mockArenaTurtles.length} / {mockArenaTurtles.length} · 出战 {equipped.length} / 3
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/12">
            <Settings2 size={12} />
            阵容方案
          </button>
          <button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/12 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/22">
            <Plus size={12} />
            演练场
          </button>
        </div>
      </div>

      {/* 出战阵容 */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-6 rounded-full bg-emerald-400/60" />
          <span className="text-[12px] font-bold text-emerald-200">出战阵容 · {equipped.length} / 3</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {equipped.map((t) => (
            <TurtleCard key={t.id} turtle={t} variant="hero" onClick={() => setSelected(t)} />
          ))}
        </div>
      </div>

      {/* 图鉴 · 全部龟种 */}
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="h-1.5 w-6 rounded-full bg-white/30" />
          <span className="text-[12px] font-bold text-white/70">
            图鉴 · 共 {collection.length} 只待出战
          </span>

          <div className="ml-auto inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 text-[11px]">
            <Filter size={11} className="ml-1 text-white/45" />
            {RARITY_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-2.5 py-0.5 font-bold transition-colors ${
                  filter === f ? 'bg-emerald-500/22 text-emerald-100' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {f === 'ALL' ? '全部' : f}
              </button>
            ))}
          </div>
        </div>

        {visible.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((t) => (
              <TurtleCard key={t.id} turtle={t} onClick={() => setSelected(t)} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-[12px] text-white/45">
            当前筛选下没有龟种，换一个稀有度试试
          </div>
        )}
      </div>
    </div>

    <TurtleDetailModal turtle={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function TurtleCard({
  turtle,
  variant,
  onClick,
}: {
  turtle: ArenaTurtle;
  variant?: 'hero';
  onClick?: () => void;
}) {
  const isHero = variant === 'hero';
  const rarityCls = RARITY_TONE[turtle.rarity] ?? RARITY_TONE.C;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl border border-white/10 text-left shadow-[0_10px_22px_rgba(0,0,0,0.32)] transition-transform hover:-translate-y-0.5 hover:border-white/22 hover:shadow-[0_14px_28px_rgba(0,0,0,0.42)] ${
        isHero ? 'p-4' : 'p-3'
      }`}
      style={{ background: TURTLE_TONE_BG[turtle.tone] }}
    >
      <div className="flex items-center gap-3">
        <div
          className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-white/15 bg-black/40 ${
            isHero ? 'h-20 w-20' : 'h-14 w-14'
          }`}
        >
          <img
            src={turtle.avatar}
            alt={turtle.name}
            className="h-full w-full object-contain"
            loading="lazy"
          />
          <span className="absolute bottom-0.5 right-0.5 rounded-md border border-white/15 bg-black/65 px-1 py-0.5 text-[8px] font-black text-amber-300">
            Lv.{turtle.level}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-black ${rarityCls}`}>
              {turtle.rarity}
            </span>
            <span className={`truncate font-bold text-white ${isHero ? 'text-[15px]' : 'text-[13px]'}`}>
              {turtle.name}
            </span>
          </div>
          <div className={`text-white/65 ${isHero ? 'text-[12px]' : 'text-[10px]'}`}>{turtle.title}</div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-white/55">
        <span><span className="text-rose-300">HP</span> {turtle.hp}</span>
        <span><span className="text-amber-300">ATK</span> {turtle.atk}</span>
        <span><span className="text-sky-300">DEF</span> {turtle.def}</span>
        <span><span className="text-violet-300">MR</span> {turtle.spd}</span>
      </div>

      {turtle.equipped ? (
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-emerald-300/45 bg-emerald-500/22 px-1.5 py-0.5 text-[9px] font-bold text-emerald-100">
          <Star size={9} className="fill-current" /> 出战
        </span>
      ) : null}
    </button>
  );
}
