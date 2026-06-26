/** 文件说明：首页 Spine 01-10 预览横排，用于查看骨骼动画资源。 */
import { DynamicSpine } from '@/components/common/spine/DynamicSpine';
import { TURTLE_SPINE_PREVIEW_ITEMS } from '@/config/turtleSpinePreviewAssets';

const PREVIEW_SIZE = 132;

export function HomeSpinePreviewRow() {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0f1013] p-3 md:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-white md:text-[15px]">Spine 预览 01-10</h2>
          <p className="mt-1 text-xs text-zinc-500">public/spine 目录下的 10 个乌龟骨骼动画</p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.16)_transparent]">
        {TURTLE_SPINE_PREVIEW_ITEMS.map((item) => (
          <article
            key={item.id}
            className="flex w-[148px] shrink-0 flex-col items-center rounded-xl border border-white/8 bg-[#121214] p-2"
          >
            <div
              className="grid place-items-center overflow-hidden rounded-lg bg-[#080808]"
              style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
            >
              <DynamicSpine
                skeletonUrl={item.skeletonUrl}
                atlasUrl={item.atlasUrl}
                width={PREVIEW_SIZE}
                height={PREVIEW_SIZE}
                animation="animation"
                padding={8}
                offsetY={0}
                verticalAlign="bottom"
                fallback={
                  <span className="px-2 text-center text-[11px] font-semibold text-zinc-500">
                    {item.label}
                    <br />
                    加载失败
                  </span>
                }
              />
            </div>
            <div className="mt-2 text-center text-xs font-bold text-emerald-400">{item.label}</div>
            <div className="mt-0.5 max-w-full truncate px-1 text-[10px] text-zinc-600">{item.id}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
