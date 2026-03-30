import React from 'react';
import { MessageSquare, Swords, Trophy, Settings, HelpCircle, TrendingUp, Gift, Backpack, Users, Newspaper, BookOpen, FlaskConical } from 'lucide-react';
import type { PetInfo } from '@/data/mock_data';
import { SidebarProfileCard } from './SidebarProfileCard';
import { SidebarHotTopicsPanel } from './SidebarHotTopicsPanel';
import { SidebarNavMenu, type SidebarNavItem } from './SidebarNavMenu';
import type { SidebarHotTag, SidebarHotTopic } from '@/components/shared/layout';
import type { PredictionCardItem } from '../../shared/predictions/ui/predictionCard';

export type ViewType = 'predictions' | 'forum' | 'battle' | 'pet' | 'lab' | 'shop' | 'rank' | 'profile' | 'inventory' | 'activePredictions';

export const NAV_ITEMS: SidebarNavItem[] = [
  { key: 'predictions', label: '预测市场', icon: <TrendingUp size={22} />, view: 'predictions', enabled: true },
  { key: 'forum', label: '社区广场', icon: <MessageSquare size={22} />, view: 'forum', enabled: true },
  { key: 'battle', label: '开战广场', icon: <Swords size={22} />, view: 'battle', enabled: true },
  { key: 'lab', label: '龟龟跳海', icon: <FlaskConical size={22} />, view: 'lab', enabled: true },
  { key: 'rank', label: '排行榜', icon: <Trophy size={22} />, view: 'rank', enabled: true },
  { key: 'shop', label: '抽奖&商店', icon: <Gift size={22} />, view: 'shop', enabled: true },
  { key: 'inventory', label: '背包&资产', icon: <Backpack size={22} />, enabled: false },
  { key: 'club', label: '俱乐部&工会', icon: <Users size={22} />, enabled: false },
  { key: 'news', label: '新闻源', icon: <Newspaper size={22} />, enabled: false },
  { key: 'tutorial', label: '新手教程&规则', icon: <BookOpen size={22} />, enabled: false },
  { key: 'settings', label: '系统&设置', icon: <Settings size={22} />, enabled: false },
  { key: 'help', label: '帮助&反馈', icon: <HelpCircle size={22} />, enabled: false },
];

interface SidebarMainPanelsProps {
  winStreak: number;
  winRate: number;
  totalPredictions: number;
  activePredictions: number;
  pet: PetInfo;
  newsByMarketId: Map<number, PredictionCardItem>;
  chatOpen: boolean;
  currentDialogue: string;
  dialogueKey: number;
  selectedTag: string | null;
  activeView: ViewType;
  onOpenChat: () => void;
  onCloseChat: () => void;
  onViewPet: () => void;
  onOpenProfile: () => void;
  onOpenActivePredictions: () => void;
  onViewChange: (view: ViewType, topic?: SidebarHotTopic, tag?: SidebarHotTag) => void;
  onNavClick: (item: SidebarNavItem) => void;
}

export const SidebarMainPanels: React.FC<SidebarMainPanelsProps> = ({
  winStreak,
  winRate,
  totalPredictions,
  activePredictions,
  pet,
  newsByMarketId,
  chatOpen,
  currentDialogue,
  dialogueKey,
  selectedTag,
  activeView,
  onOpenChat,
  onCloseChat,
  onViewPet,
  onOpenProfile,
  onOpenActivePredictions,
  onViewChange,
  onNavClick,
}) => {
  return (
    <>
      <div className="xl:hidden -mx-1 px-1 h-[300px] overflow-hidden">
        <div className="flex h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory gap-3 scroll-smooth pb-0 overscroll-x-contain [touch-action:pan-x] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="snap-start shrink-0 w-full min-w-full h-full overflow-y-auto overscroll-y-contain">
            <SidebarProfileCard
              winStreak={winStreak}
              winRate={winRate}
              totalPredictions={totalPredictions}
              activePredictions={activePredictions}
              pet={pet}
              chatOpen={chatOpen}
              currentDialogue={currentDialogue}
              dialogueKey={dialogueKey}
              onOpenChat={onOpenChat}
              onCloseChat={onCloseChat}
              onViewPet={onViewPet}
              onOpenProfile={onOpenProfile}
              onOpenActivePredictions={onOpenActivePredictions}
            />
          </div>
          <div className="snap-start shrink-0 w-full min-w-full h-full overflow-y-auto overscroll-y-contain">
            <SidebarHotTopicsPanel
              selectedTag={selectedTag}
              newsByMarketId={newsByMarketId}
              onViewChange={onViewChange}
            />
          </div>
          <div className="snap-start shrink-0 w-full min-w-full h-full overflow-y-auto overscroll-y-contain">
            <SidebarNavMenu navItems={NAV_ITEMS} activeView={activeView} onNavClick={onNavClick} />
          </div>
        </div>
      </div>

      <div className="hidden xl:flex min-h-0 flex-1 flex-col overflow-y-auto py-1 pr-1">
        <div className="flex min-h-full flex-col gap-4">
          <SidebarProfileCard
            winStreak={winStreak}
            winRate={winRate}
            totalPredictions={totalPredictions}
            activePredictions={activePredictions}
            pet={pet}
            chatOpen={chatOpen}
            currentDialogue={currentDialogue}
            dialogueKey={dialogueKey}
            onOpenChat={onOpenChat}
            onCloseChat={onCloseChat}
            onViewPet={onViewPet}
            onOpenProfile={onOpenProfile}
            onOpenActivePredictions={onOpenActivePredictions}
          />

          <SidebarHotTopicsPanel
            selectedTag={selectedTag}
            newsByMarketId={newsByMarketId}
            onViewChange={onViewChange}
          />

          <div className="min-h-0 flex-1">
            <SidebarNavMenu navItems={NAV_ITEMS} activeView={activeView} onNavClick={onNavClick} />
          </div>
        </div>
      </div>
    </>
  );
};
