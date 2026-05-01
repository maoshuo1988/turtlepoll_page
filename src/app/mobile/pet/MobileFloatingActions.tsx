import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleHelp, MessageCircle, Sparkles, X } from 'lucide-react';
import { PetChat } from '@/components/shared/pet/ui/PetChat';
import type { PetInfo } from '@/data/mock_data';

interface MobileFloatingActionsProps {
  chatOpen: boolean;
  pet: PetInfo;
  stamina: number;
  onOpenGuide: () => void;
  onToggleChat: () => void;
  onCloseChat: () => void;
  onStaminaChange: (value: number) => void;
}

const BUBBLE_SIZE = 56;
const EDGE_GAP = 12;
const TOP_GAP = 120;
const BOTTOM_GAP = 190;

function getViewport() {
  if (typeof window === 'undefined') {
    return { width: 390, height: 844 };
  }

  return { width: window.innerWidth, height: window.innerHeight };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export const MobileFloatingActions: React.FC<MobileFloatingActionsProps> = ({
  chatOpen,
  pet,
  stamina,
  onOpenGuide,
  onToggleChat,
  onCloseChat,
  onStaminaChange,
}) => {
  const viewportRef = React.useRef(getViewport());
  const [{ x, y }, setPosition] = React.useState(() => {
    const viewport = getViewport();
    return {
      x: viewport.width - BUBBLE_SIZE - EDGE_GAP,
      y: viewport.height - BOTTOM_GAP,
    };
  });
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      const viewport = getViewport();
      viewportRef.current = viewport;
      setPosition((prev) => {
        const maxX = viewport.width - BUBBLE_SIZE - EDGE_GAP;
        const maxY = viewport.height - BOTTOM_GAP;
        return {
          x: prev.x <= viewport.width / 2 ? EDGE_GAP : maxX,
          y: clamp(prev.y, TOP_GAP, maxY),
        };
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const alignRight = x > viewportRef.current.width / 2;
  const bubbleX = alignRight ? viewportRef.current.width - BUBBLE_SIZE - EDGE_GAP : EDGE_GAP;
  const handleOpenGuide = React.useCallback(() => {
    setMenuOpen(false);
    onCloseChat();
    onOpenGuide();
  }, [onCloseChat, onOpenGuide]);

  const handleToggleChat = React.useCallback(() => {
    setMenuOpen(false);
    onToggleChat();
  }, [onToggleChat]);

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragEnd={(_, info) => {
        const viewport = viewportRef.current;
        const maxY = viewport.height - BOTTOM_GAP;
        const nextY = clamp(y + info.offset.y, TOP_GAP, maxY);
        const movedCenter = x + info.offset.x + BUBBLE_SIZE / 2;
        const nextX = movedCenter < viewport.width / 2 ? EDGE_GAP : viewport.width - BUBBLE_SIZE - EDGE_GAP;

        setPosition({ x: nextX, y: nextY });
      }}
      animate={{ x: bubbleX, y }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className="fixed left-0 top-0 z-50"
    >
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 18 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className={`absolute bottom-[154px] ${alignRight ? 'right-0' : 'left-0'} w-[min(92vw,320px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl`}
          >
            <PetChat pet={pet} onClose={onCloseChat} stamina={stamina} onStaminaChange={onStaminaChange} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 22 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 22 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={`absolute bottom-[68px] ${alignRight ? 'right-0 origin-bottom-right' : 'left-0 origin-bottom-left'} w-[168px] overflow-hidden rounded-[26px] border border-white/10 bg-[#0f1013]/96 p-3 shadow-[0_22px_52px_rgba(0,0,0,0.36)] backdrop-blur-xl`}
          >
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleOpenGuide}
                className="flex w-full items-center gap-3 rounded-[18px] border border-white/10 bg-white px-3 py-3 text-left text-slate-700 transition-colors hover:bg-slate-100"
              >
                <CircleHelp size={18} />
                <span className="text-[13px] font-semibold">新手引导</span>
              </button>

              <button
                type="button"
                onClick={handleToggleChat}
                className="flex w-full items-center gap-3 rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-3 text-left text-emerald-300 transition-colors hover:bg-emerald-500/15"
              >
                <MessageCircle size={18} />
                <span className="text-[13px] font-semibold">{chatOpen ? '收起聊天' : '宠物聊天'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/6 px-3 py-2.5 text-[12px] font-semibold text-zinc-300 transition-colors hover:bg-white/10"
            >
              <X size={16} />
              关闭
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={() => setMenuOpen((prev) => !prev)}
        className="grid h-14 w-14 place-items-center rounded-full border border-emerald-300/25 bg-[radial-gradient(circle_at_30%_30%,#52f28c_0%,#16a34a_52%,#0b5c2d_100%)] text-white shadow-[0_16px_36px_rgba(22,163,74,0.42)]"
      >
        <Sparkles size={24} />
      </motion.button>
    </motion.div>
  );
};
