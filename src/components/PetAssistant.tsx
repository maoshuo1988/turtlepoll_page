import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { PetInfo } from '../data/mock_data';

interface PetAssistantProps {
  pet: PetInfo;
  dialogue: string | null; // externally triggered dialogue (e.g. from betting)
  idleDialogues: string[];
}

export const PetAssistant: React.FC<PetAssistantProps> = ({
  pet,
  dialogue,
  idleDialogues,
}) => {
  const [currentDialogue, setCurrentDialogue] = useState(idleDialogues[0]);
  const [dialogueKey, setDialogueKey] = useState(0);

  // Cycle idle dialogues every 5s if no external dialogue
  useEffect(() => {
    if (dialogue) {
      setCurrentDialogue(dialogue);
      setDialogueKey((k) => k + 1);
      return;
    }

    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * idleDialogues.length);
      setCurrentDialogue(idleDialogues[idx]);
      setDialogueKey((k) => k + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [dialogue, idleDialogues]);

  return (
    <div className="rounded-2xl bg-white dark:bg-rdark-card p-5 shadow-sm border border-slate-100 dark:border-rdark-border flex flex-col items-center">
      {/* Chat bubble */}
      <AnimatePresence mode="wait">
        <motion.div
          key={dialogueKey}
          initial={{ opacity: 0, y: -6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-2xl rounded-bl-sm px-4 py-2.5 mb-4 max-w-full text-center"
        >
          <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">{currentDialogue}</p>
        </motion.div>
      </AnimatePresence>

      {/* Pet avatar with float */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="relative mb-3"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-100 to-teal-100 dark:from-cyan-900/30 dark:to-teal-900/30 border-2 border-cyan-200 dark:border-cyan-800 flex items-center justify-center text-4xl shadow-lg shadow-cyan-100/50 dark:shadow-none">
          {pet.avatar}
        </div>
        {/* Sparkle decoration */}
        <motion.div
          className="absolute -top-1 -right-1"
          animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles size={16} className="text-amber-400" />
        </motion.div>
      </motion.div>

      {/* Pet info */}
      <div className="text-center">
        <div className="font-semibold text-slate-700 dark:text-rdark-text text-sm">{pet.name}</div>
        <div className="text-xs text-slate-400 dark:text-rdark-text2 mt-0.5">
          Lv.{pet.level} · {pet.status}
        </div>
      </div>

      {/* Decorative bar */}
      <div className="w-full mt-3 bg-slate-100 dark:bg-rdark-border rounded-full h-1.5 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-400 to-teal-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: '78%' }}
          transition={{ duration: 1, delay: 0.3 }}
        />
      </div>
      <div className="text-[10px] text-slate-400 dark:text-rdark-text2 mt-1">经验值 780 / 1000</div>
    </div>
  );
};
