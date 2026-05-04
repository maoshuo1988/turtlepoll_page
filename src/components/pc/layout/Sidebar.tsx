/**
 * 文件说明：Sidebar，PC 左侧栏相关展示组件。
 */
import React, { useState, useEffect } from 'react';
import { PetChat } from '../../shared/pet/ui/PetChat';
import type { PetInfo } from '@/data/mock_data';
import { mockRankUsers } from '@/data/mock_data';
import { SidebarDesktopHotPanel } from './SidebarDesktopHotPanel';
import { SidebarDesktopNavPanel } from './SidebarDesktopNavPanel';
import { SidebarDesktopProfilePanel } from './SidebarDesktopProfilePanel';
import { NAV_ITEMS, SidebarMainPanels, type ViewType } from './SidebarMainPanels';
import { useSidebarHotTags, useSidebarHotTopics, type SidebarHotTag, type SidebarHotTopic } from '@/components/shared/layout';
import type { PredictionCardItem } from '../../shared/predictions/ui/predictionCard';

interface SidebarProps {
  balance: number;
  winStreak: number;
  winRate: number;
  totalPredictions: number;
  activePredictions: number;
  pet: PetInfo;
  newsByMarketId: Map<number, PredictionCardItem>;
  petDialogue: string | null;
  idleDialogues: string[];
  activeView: ViewType;
  onViewChange: (view: ViewType, topic?: SidebarHotTopic, tag?: SidebarHotTag | null) => void;
}

const card = 'rounded-xl bg-[#0f1013] dark:bg-rdark-card border border-white/8 dark:border-rdark-border shadow-[0_12px_28px_rgba(0,0,0,0.24)] dark:shadow-none';

export const Sidebar: React.FC<SidebarProps> = ({
  winStreak,
  winRate,
  totalPredictions,
  activePredictions,
  pet,
  newsByMarketId,
  petDialogue,
  idleDialogues,
  activeView,
  onViewChange,
}) => {
  const [currentDialogue, setCurrentDialogue] = useState(idleDialogues[0]);
  const [dialogueKey, setDialogueKey] = useState(0);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [rankOpen, setRankOpen] = useState(false);
  const hotTopics = useSidebarHotTopics(newsByMarketId);
  const hotTags = useSidebarHotTags();

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

  const handleTagClick = (tag: SidebarHotTag) => {
    const nextTag = selectedTag === tag.tag ? null : tag;
    setSelectedTag(nextTag?.tag ?? null);
    onViewChange('predictions', undefined, nextTag);
  };

  const handlePanelViewChange = (view: ViewType, topic?: SidebarHotTopic, tag?: SidebarHotTag) => {
    if (topic) {
      setSelectedTag(null);
      onViewChange(view, topic, null);
      return;
    }

    if (tag) {
      handleTagClick(tag);
      return;
    }

    onViewChange(view);
  };

  const handleNavClick = (item: (typeof NAV_ITEMS)[number]) => {
    if (!item.enabled) return;
    if (item.key === 'predictions') {
      setSelectedTag(null);
    }
    if (item.key === 'rank') {
      setRankOpen((prev) => !prev);
    }
    if (item.view) onViewChange(item.view);
  };

  const topRankers = mockRankUsers.slice(0, 7);
  const rankColors: Record<number, string> = {
    0: 'text-amber-500',
    1: 'text-slate-400',
    2: 'text-amber-700 dark:text-amber-600',
  };

  const fmtHeat = (n: number) =>
    n >= 10000 ? `${(n / 10000).toFixed(1)}w` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  if (activeView === 'pet') {
    return (
      <div className="legacy-sidebar flex h-auto flex-col lg:h-full lg:min-h-0">
        <div className={`${card} flex-1 overflow-hidden`}>
          <PetChat pet={pet} onClose={() => onViewChange('predictions')} fullScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="legacy-sidebar flex h-auto flex-col lg:h-full lg:min-h-0">
      <div className="lg:hidden">
        <SidebarMainPanels
          winStreak={winStreak}
          winRate={winRate}
          totalPredictions={totalPredictions}
          activePredictions={activePredictions}
          pet={pet}
          newsByMarketId={newsByMarketId}
          chatOpen={chatOpen}
          currentDialogue={currentDialogue}
          dialogueKey={dialogueKey}
          selectedTag={selectedTag}
          activeView={activeView}
          onOpenChat={() => setChatOpen(true)}
          onCloseChat={() => setChatOpen(false)}
          onViewPet={() => onViewChange('pet')}
          onOpenProfile={() => onViewChange('profile')}
          onOpenActivePredictions={() => onViewChange('activePredictions')}
          onViewChange={handlePanelViewChange}
          onNavClick={handleNavClick}
        />
      </div>

      <div className="hidden lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto">
        <div className="flex flex-col gap-3.5 lg:overflow-x-hidden">
          <div className="overflow-hidden">
            <SidebarDesktopProfilePanel
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
          </div>

          <SidebarDesktopHotPanel
            hotTopics={hotTopics ?? []}
            hotTags={hotTags}
            selectedTag={selectedTag}
            onOpenTopic={(topic) => onViewChange('predictions', topic, null)}
            onTagClick={handleTagClick}
            fmtHeat={fmtHeat}
          />

          <SidebarDesktopNavPanel
            activeView={activeView}
            rankOpen={rankOpen}
            topRankers={topRankers}
            rankColors={rankColors}
            onNavClick={handleNavClick}
          />
        </div>
      </div>
    </div>
  );
};

export type { ViewType } from './SidebarMainPanels';
