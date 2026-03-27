import React from 'react';
import { Swords, Trophy, Zap } from 'lucide-react';
import type { ViewType } from '../components/layout';
import { SidebarHotTopicsPanel } from '../components/layout/ui/SidebarHotTopicsPanel';
import { SidebarProfileCard } from '../components/layout/ui/SidebarProfileCard';
import type { SidebarHotTag, SidebarHotTopic } from '../components/layout/ui/sidebarHotData';
import type { PredictionCardItem } from '../components/predictions/ui/predictionCard';
import type { PetInfo } from '../data/mock_data';

interface MobileHomePanelsProps {
  winStreak: number;
  winRate: number;
  totalPredictions: number;
  activePredictions: number;
  pet: PetInfo;
  newsByMarketId: Map<number, PredictionCardItem>;
  petDialogue: string | null;
  idleDialogues: string[];
  selectedTag: string | null;
  onViewChange: (view: ViewType, topic?: SidebarHotTopic, tag?: SidebarHotTag | null) => void;
}

export const MobileHomePanels: React.FC<MobileHomePanelsProps> = ({
  winStreak,
  winRate,
  totalPredictions,
  activePredictions,
  pet,
  newsByMarketId,
  petDialogue,
  idleDialogues,
  selectedTag,
  onViewChange,
}) => {
  const [currentDialogue, setCurrentDialogue] = React.useState(idleDialogues[0]);
  const [dialogueKey, setDialogueKey] = React.useState(0);
  const [chatOpen, setChatOpen] = React.useState(false);

  React.useEffect(() => {
    if (petDialogue) {
      setCurrentDialogue(petDialogue);
      setDialogueKey((value) => value + 1);
      return;
    }

    const timer = window.setInterval(() => {
      const index = Math.floor(Math.random() * idleDialogues.length);
      setCurrentDialogue(idleDialogues[index]);
      setDialogueKey((value) => value + 1);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [idleDialogues, petDialogue]);

  const shortcuts: Array<{ key: ViewType; label: string; hint: string; icon: React.ReactNode }> = [
    { key: 'battle', label: '开战广场', hint: '发起 PK', icon: <Swords size={16} /> },
    { key: 'rank', label: '排行榜', hint: '看大神', icon: <Trophy size={16} /> },
    { key: 'pet', label: '宠物空间', hint: '养成互动', icon: <Zap size={16} /> },
  ];

  return (
    <div className="space-y-3">
      <SidebarProfileCard
        winStreak={winStreak}
        winRate={winRate}
        totalPredictions={totalPredictions}
        activePredictions={activePredictions}
        pet={pet}
        chatOpen={chatOpen}
        currentDialogue={currentDialogue}
        dialogueKey={dialogueKey}
        onOpenChat={() => setChatOpen(true)}
        onCloseChat={() => setChatOpen(false)}
        onViewPet={() => onViewChange('pet')}
        onOpenProfile={() => onViewChange('profile')}
        onOpenActivePredictions={() => onViewChange('activePredictions')}
      />

      <div className="rounded-2xl border border-white/8 bg-[#0f1013] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.24)]">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[14px] font-bold text-white">快捷入口</div>
            <div className="text-[11px] text-zinc-500">保留你原来的功能，只把入口做得更直观</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {shortcuts.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onViewChange(item.key)}
              className="rounded-2xl border border-white/8 bg-[#15161a] px-3 py-3 text-left transition-colors hover:border-white/14 hover:bg-[#1a1b20]"
            >
              <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/6 text-emerald-300">
                {item.icon}
              </span>
              <div className="text-[13px] font-semibold text-white">{item.label}</div>
              <div className="mt-1 text-[11px] text-zinc-500">{item.hint}</div>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onViewChange('activePredictions')}
          className="mt-2 flex w-full items-center justify-between rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2.5 text-left"
        >
          <div>
            <div className="text-[13px] font-semibold text-white">进行中对局</div>
            <div className="mt-1 text-[11px] text-emerald-200/70">从这里直接进入当前进行中的预测战场</div>
          </div>
          <div className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[12px] font-bold text-emerald-300">
            {activePredictions}
          </div>
        </button>
      </div>

      <SidebarHotTopicsPanel
        selectedTag={selectedTag}
        newsByMarketId={newsByMarketId}
        onViewChange={onViewChange}
      />
    </div>
  );
};
