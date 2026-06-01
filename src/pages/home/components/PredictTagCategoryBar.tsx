/** 文件说明：暗盘页顶部分类标签栏，数据来自 predict-tag/list。 */
import { forwardRef, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Tags } from 'lucide-react';
import { HORIZONTAL_DRAG_SCROLL_TRACK_CLASS, useHorizontalDragScroll } from '@/hooks/useHorizontalDragScroll';
import { usePredictTagCategories } from '@/components/common/layout/sidebarHotTopics';
import { isSamePredictTagSlug, normalizeTagQuery, type PredictTagItem } from '@/hooks/predictTagTypes';
import { scrollChildToHorizontalCenter } from '@/utils/scrollHorizontalCenter';

interface PredictTagCategoryBarProps {
  selectedTag: string | null;
  onTagChange: (slug: string | null) => void;
}

interface CategoryChipProps {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}

const CategoryChip = forwardRef<HTMLDivElement, CategoryChipProps>(function CategoryChip(
  { active, label, count, onClick },
  ref,
) {
  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-bold transition-colors sm:px-5 sm:py-3 sm:text-[14px] ${
        active
          ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100 shadow-[0_0_20px_-6px_rgba(52,211,153,0.55)] ring-2 ring-emerald-400/35'
          : 'border-white/12 bg-white/[0.06] text-zinc-300 hover:border-emerald-500/25 hover:bg-white/[0.09] hover:text-zinc-100'
      }`}
    >
      <span className="max-w-[9rem] truncate sm:max-w-[12rem]">{label}</span>
      {typeof count === 'number' && count > 0 ? (
        <span
          className={`min-w-[1.25rem] rounded-md px-1.5 py-0.5 text-center text-[11px] font-extrabold tabular-nums sm:text-[12px] ${
            active ? 'bg-emerald-400/25 text-emerald-50' : 'bg-black/30 text-zinc-400'
          }`}
        >
          {count}
        </span>
      ) : null}
    </div>
  );
});

export function PredictTagCategoryBar({ selectedTag, onTagChange }: PredictTagCategoryBarProps) {
  const { scrollRef, onMouseDown, shouldSuppressClick } = useHorizontalDragScroll();
  const chipRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const allChipRef = useRef<HTMLDivElement | null>(null);

  const { categories, isLoading, isError } = usePredictTagCategories();
  const activeSlug = normalizeTagQuery(selectedTag);

  const setChipRef = useCallback((key: string, node: HTMLDivElement | null) => {
    if (node) {
      chipRefs.current.set(key, node);
      return;
    }
    chipRefs.current.delete(key);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || isLoading) return;

    const scrollActiveChip = () => {
      const target = activeSlug ? chipRefs.current.get(activeSlug) : allChipRef.current;
      if (!target) return;
      scrollChildToHorizontalCenter(container, target, 'smooth');
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollActiveChip);
    });
  }, [activeSlug, categories.length, isLoading, scrollRef]);

  const handleSelect = useCallback(
    (item: PredictTagItem | null) => {
      if (shouldSuppressClick()) return;
      if (!item) {
        onTagChange(null);
        return;
      }
      const slug = normalizeTagQuery(item.slug);
      if (!slug) return;
      onTagChange(isSamePredictTagSlug(activeSlug, slug) ? null : slug);
    },
    [activeSlug, onTagChange, shouldSuppressClick],
  );

  return (
    <div
      className="relative min-w-0 overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/40 via-zinc-950/95 to-zinc-950/95 p-3 shadow-[0_8px_32px_-12px_rgba(16,185,129,0.35)] sm:p-4"
      role="region"
      aria-label="暗盘分类筛选"
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/[0.06]" />
      <div className="relative mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
            <Tags className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-extrabold tracking-tight text-zinc-100 sm:text-[16px]">话题分类</p>
            <p className="text-[11px] text-zinc-500 sm:text-[12px]">左右拖动 · 点击筛选盘口</p>
          </div>
        </div>
        {isLoading ? (
          <span className="text-[11px] font-medium text-zinc-500">加载中…</span>
        ) : isError ? (
          <span className="text-[11px] font-medium text-rose-300">分类加载失败</span>
        ) : (
          <span className="hidden items-center gap-0.5 text-[11px] text-zinc-500 sm:inline-flex">
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            拖动
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        )}
      </div>

      <div className="relative min-w-0">
        <div
          ref={scrollRef}
          onMouseDown={onMouseDown}
          className={`${HORIZONTAL_DRAG_SCROLL_TRACK_CLASS} gap-2.5 [scroll-padding-inline:2px]`}
        >
          <CategoryChip
            ref={allChipRef}
            active={!activeSlug}
            label="全部"
            onClick={() => handleSelect(null)}
          />
          {categories.map((item) => {
            const slug = normalizeTagQuery(item.slug);
            if (!slug) return null;
            return (
              <CategoryChip
                key={`${item.id}-${item.slug}`}
                ref={(node) => setChipRef(slug, node)}
                active={isSamePredictTagSlug(activeSlug, item.slug)}
                label={item.label}
                count={item.marketCount}
                onClick={() => handleSelect(item)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
