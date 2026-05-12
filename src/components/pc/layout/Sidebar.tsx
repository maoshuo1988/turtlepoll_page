/**
 * 文件说明：Sidebar，PC 左侧栏相关展示组件。
 */
import React, { useState, useEffect } from 'react';
import { PetChat } from '../../shared/pet/ui/PetChat';
import type { AiPushMessage } from '@/hooks/aiTypes';
import type { PetInfo } from '@/data/mockData';
import { SidebarDesktopHotPanel } from './SidebarDesktopHotPanel';
import { SidebarDesktopNavPanel } from './SidebarDesktopNavPanel';
import { SidebarDesktopProfilePanel } from './SidebarDesktopProfilePanel';
import { NAV_ITEMS, SidebarMainPanels, type ViewType } from './SidebarMainPanels';
import { GuideTourModal, useSidebarHotTags, useSidebarHotTopics, type SidebarHotTag, type SidebarHotTopic } from '@/components/shared/layout';
import type { PredictionCardItem } from '../../shared/predictions/ui/predictionCards';

interface SidebarProps {
  balance: number;
  winStreak: number;
  winRate: number;
  totalPredictions: number;
  activePredictions: number;
  pet: PetInfo;
  newsByMarketId: Map<number, PredictionCardItem>;
  petDialogue: string | null;
  aiPushMessages?: AiPushMessage[];
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
  aiPushMessages = [],
  idleDialogues,
  activeView,
  onViewChange,
}) => {
  const [currentDialogue, setCurrentDialogue] = useState(idleDialogues[0]);
  const [dialogueKey, setDialogueKey] = useState(0);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
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
    if (item.view) onViewChange(item.view);
  };

  const fmtHeat = (n: number) =>
    n >= 10000 ? `${(n / 10000).toFixed(1)}w` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  if (activeView === 'pet') {
    return (
      <div className="legacy-sidebar flex h-auto flex-col lg:h-full lg:min-h-0">
        <div className={`${card} flex-1 overflow-hidden`}>
          <PetChat pet={pet} onClose={() => onViewChange('predictions')} fullScreen aiPushMessages={aiPushMessages} />
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
          aiPushMessages={aiPushMessages}
          newsByMarketId={newsByMarketId}
          chatOpen={chatOpen}
          currentDialogue={currentDialogue}
          dialogueKey={dialogueKey}
          selectedTag={selectedTag}
          activeView={activeView}
          onOpenChat={() => setChatOpen(true)}
          onOpenGuide={() => setGuideOpen(true)}
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
              aiPushMessages={aiPushMessages}
              chatOpen={chatOpen}
              currentDialogue={currentDialogue}
              dialogueKey={dialogueKey}
              onOpenGuide={() => setGuideOpen(true)}
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
            onNavClick={handleNavClick}
          />
        </div>
      </div>

      <GuideTourModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
};

export type { ViewType } from './SidebarMainPanels';
