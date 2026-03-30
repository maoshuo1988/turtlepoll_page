import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { PetChat } from '../pet/ui/PetChat';
import type { PetInfo } from '@/data/mock_data';

interface FloatingPetChatProps {
  open: boolean;
  pet: PetInfo;
  stamina: number;
  onToggle: () => void;
  onClose: () => void;
  onStaminaChange: (value: number) => void;
}

export const FloatingPetChat: React.FC<FloatingPetChatProps> = ({
  open,
  pet,
  stamina,
  onToggle,
  onClose,
  onStaminaChange,
}) => {
  return (
    <div className="fixed bottom-20 right-3 md:bottom-6 md:right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute bottom-14 md:bottom-16 right-0 w-[min(92vw,320px)] rounded-2xl bg-white dark:bg-rdark-card border border-slate-200 dark:border-rdark-border shadow-2xl overflow-hidden"
          >
            <PetChat pet={pet} onClose={onClose} stamina={stamina} onStaminaChange={onStaminaChange} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={onToggle}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-emerald-500 dark:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 dark:shadow-emerald-900/40 border-0 cursor-pointer flex items-center justify-center transition-colors hover:bg-emerald-600 dark:hover:bg-emerald-500"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </motion.button>
    </div>
  );
};
