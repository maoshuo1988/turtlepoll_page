/**
 * 文件说明：首页移动端状态筛选条（热门 / 进行中 / 未开始 / 已结算）。
 */

export type HomeMobileStatusFilter = 'hot' | 'open' | 'upcoming' | 'settled';

interface HomeMobileStatusFiltersProps {
  value: HomeMobileStatusFilter;
  onChange: (value: HomeMobileStatusFilter) => void;
}

const FILTERS: Array<{ key: HomeMobileStatusFilter; label: string }> = [
  { key: 'hot', label: '热门' },
  { key: 'open', label: '进行中' },
  { key: 'upcoming', label: '未开始' },
  { key: 'settled', label: '已结算' },
];

export function HomeMobileStatusFilters({ value, onChange }: HomeMobileStatusFiltersProps) {
  return (
    <div className="lg:hidden -mx-0.5 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {FILTERS.map((item) => {
        const active = value === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={`touch-manipulation shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors ${
              active
                ? 'border border-emerald-400/55 bg-emerald-500/10 text-emerald-300'
                : 'border border-transparent bg-[#17181c] text-zinc-300'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
