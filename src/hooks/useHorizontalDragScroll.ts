/** 文件说明：横向列表鼠标拖动滚动，逻辑对齐黑市 Shop 奖池预览条。 */
import { useCallback, useRef } from 'react';

export const HORIZONTAL_DRAG_SCROLL_TRACK_CLASS =
  'flex min-w-0 gap-3 overflow-x-auto pb-1 select-none [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing';

type DragState = {
  active: boolean;
  startX: number;
  scrollLeft: number;
  moved: boolean;
};

export function useHorizontalDragScroll(moveThreshold = 4) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
  });

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0 || !scrollRef.current) return;

      const scrollEl = scrollRef.current;
      dragRef.current = {
        active: true,
        startX: event.clientX,
        scrollLeft: scrollEl.scrollLeft,
        moved: false,
      };

      const onMove = (moveEvent: MouseEvent) => {
        if (!dragRef.current.active) return;
        const delta = moveEvent.clientX - dragRef.current.startX;
        if (Math.abs(delta) > moveThreshold) {
          dragRef.current.moved = true;
        }
        moveEvent.preventDefault();
        scrollEl.scrollLeft = dragRef.current.scrollLeft - delta;
      };

      const onUp = () => {
        dragRef.current.active = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [moveThreshold],
  );

  const shouldSuppressClick = useCallback(() => dragRef.current.moved, []);

  return {
    scrollRef,
    scrollTrackClassName: HORIZONTAL_DRAG_SCROLL_TRACK_CLASS,
    onMouseDown: handleMouseDown,
    shouldSuppressClick,
  };
}
