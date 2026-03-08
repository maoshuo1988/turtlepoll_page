import React, { useState, useEffect } from 'react';
import { PetChat } from '../../pet/ui/PetChat';
import type { PetInfo, NewsItem, HotTopic, HotTag } from '../../../data/mock_data';
import { mockHotTags } from '../../../data/mock_data';
import { NAV_ITEMS, SidebarMainPanels, type ViewType } from './SidebarMainPanels';

interface SidebarProps {
  balance: number;
  winStreak: number;
  winRate: number;
  totalPredictions: number;
  activePredictions: number;
  pet: PetInfo;
  petDialogue: string | null;
  idleDialogues: string[];
  onCategoryChange: (key: NewsItem['type'] | 'all') => void;
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  onTopicClick?: (topic: HotTopic) => void;
  onTagClick?: (tag: HotTag) => void;
}

const card = 'rounded-xl bg-white dark:bg-rdark-card border border-slate-200 dark:border-rdark-border shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-none';

export const Sidebar: React.FC<SidebarProps> = ({
  balance,
  winStreak,
  winRate,
  totalPredictions,
  activePredictions,
  pet,
  petDialogue,
  idleDialogues,
  onCategoryChange,
  activeView,
  onViewChange,
  onTopicClick,
  onTagClick,
}) => {
  const [currentDialogue, setCurrentDialogue] = useState(idleDialogues[0]);
  const [dialogueKey, setDialogueKey] = useState(0);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (petDialogue) {
      setCurrentDialogue(petDialogue);
      setDialogueKey((k) => k + 1);
      return;
    }
    const iv = setInterval(() => {
      const idx = Math.floor(Math.random() * idleDialogues.length);
      setCurrentDialogue(idleDialogues[idx]);
      setDialogueKey((k) => k + 1);
    }, 5000);
    return () => clearInterval(iv);
  }, [petDialogue, idleDialogues]);

  const handleTagClick = (tag: (typeof mockHotTags)[number]) => {
    setSelectedTag(selectedTag === tag.tag ? null : tag.tag);
    if (tag.category) onCategoryChange(tag.category);
    onTagClick?.(tag);
    onViewChange('predictions');
  };

  const handleNavClick = (item: (typeof NAV_ITEMS)[number]) => {
    if (!item.enabled) return;
    if (item.key === 'predictions') {
      setSelectedTag(null);
      onCategoryChange('all');
    }
    if (item.view) onViewChange(item.view);
  };

  if (activeView === 'pet') {
    return (
      <div className="legacy-sidebar flex flex-col h-[calc(100vh-80px)]">
        <div className={`${card} flex-1 overflow-hidden`}>
          <PetChat pet={pet} onClose={() => onViewChange('predictions')} fullScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="legacy-sidebar flex flex-col h-[calc(100vh-80px)]">
      <SidebarMainPanels
        balance={balance}
        winStreak={winStreak}
        winRate={winRate}
        totalPredictions={totalPredictions}
        activePredictions={activePredictions}
        pet={pet}
        chatOpen={chatOpen}
        currentDialogue={currentDialogue}
        dialogueKey={dialogueKey}
        selectedTag={selectedTag}
        activeView={activeView}
        onOpenChat={() => setChatOpen(true)}
        onCloseChat={() => setChatOpen(false)}
        onViewPet={() => onViewChange('pet')}
        onTopicClick={onTopicClick}
        onFallbackTopicClick={() => onViewChange('predictions')}
        onTagClick={handleTagClick}
        onNavClick={handleNavClick}
      />
    </div>
  );
};

export type { ViewType } from './SidebarMainPanels';
