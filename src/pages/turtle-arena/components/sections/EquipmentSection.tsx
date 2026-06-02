/**
 * 文件说明：龟战 Arena - 装备背包 Section，展示已穿戴/未穿戴装备列表与属性加成。
 */
import { Backpack, Shield, Sparkles, Sword } from 'lucide-react';
import { mockArenaEquipment } from '../../data/arenaMockData';

const SLOT_ICON: Record<string, React.ReactNode> = {
  武器: <Sword size={14} />,
  护甲: <Shield size={14} />,
  饰品: <Sparkles size={14} />,
  坐骑: <Backpack size={14} />,
};

const RARITY_TONE: Record<string, string> = {
  N: 'text-zinc-300 border-zinc-500/40 bg-zinc-500/10',
  R: 'text-sky-300 border-sky-500/40 bg-sky-500/12',
  SR: 'text-violet-300 border-violet-500/40 bg-violet-500/14',
  SSR: 'text-amber-300 border-amber-500/45 bg-amber-500/16',
  UR: 'text-rose-300 border-rose-500/45 bg-rose-500/16',
};

export function EquipmentSection() {
  const equipped = mockArenaEquipment.filter((e) => e.equipped);
  const bag = mockArenaEquipment.filter((e) => !e.equipped);

  const totalSlots = 24;
  const usedSlots = mockArenaEquipment.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-black tracking-tight text-white md:text-[22px]">装备背包</h2>
          <p className="text-[12px] text-white/55">背包容量 {usedSlots} / {totalSlots} · 长按可拆解为荣誉点</p>
        </div>
        <button type="button" className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/12">
          一键整理
        </button>
      </div>

      {/* 已穿戴 */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-6 rounded-full bg-emerald-400/60" />
          <span className="text-[12px] font-bold text-emerald-200">已穿戴 · {equipped.length} 件</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {equipped.map((item) => (
            <div key={item.id} className="rounded-2xl border border-emerald-400/22 bg-emerald-500/6 p-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-12 w-12 place-items-center rounded-xl border border-white/14 bg-black/40 text-[22px]">{item.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-black ${RARITY_TONE[item.rarity]}`}>{item.rarity}</span>
                    <span className="truncate text-[13px] font-bold text-white">{item.name}</span>
                  </div>
                  <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-white/55">
                    {SLOT_ICON[item.slot]} {item.slot}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[11px] leading-snug text-emerald-200/85">{item.bonus}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 背包未穿戴 */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-6 rounded-full bg-white/30" />
          <span className="text-[12px] font-bold text-white/70">背包未穿戴 · {bag.length} 件</span>
        </div>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6 lg:grid-cols-8">
          {bag.map((item) => (
            <div key={item.id} className="aspect-square rounded-xl border border-white/10 bg-[#0c1118] p-2 transition-colors hover:border-white/22">
              <div className="grid h-full place-items-center text-[26px]">{item.icon}</div>
              <div className={`mt-0 truncate text-[9px] font-black uppercase tracking-wider ${RARITY_TONE[item.rarity].split(' ')[0]}`}>{item.rarity}</div>
            </div>
          ))}
          {/* 空格子占位 */}
          {Array.from({ length: Math.max(0, totalSlots - usedSlots) }).slice(0, 12).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square rounded-xl border border-dashed border-white/8 bg-white/[0.02]" />
          ))}
        </div>
      </div>
    </div>
  );
}
