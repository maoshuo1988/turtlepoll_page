/**
 * 文件说明：Sidebar Main Panels，PC 左侧栏相关展示组件。
 */
import React from 'react';
import { Flag, MessageSquare, Swords, Settings, HelpCircle, TrendingUp, Gift, Backpack, Users, Newspaper, Gamepad2, Flame, Turtle } from 'lucide-react';
import type { AiPushMessage } from '@/hooks/aiTypes';
import type { PetInfo } from '@/data/mockData';
import { SidebarProfileCard } from './SidebarProfileCard';
import { SidebarHotTopicsPanel } from './SidebarHotTopicsPanel';
import { SidebarNavMenu, type SidebarNavItem } from './SidebarNavMenu';
import type { SidebarHotTag, SidebarHotTopic } from '@/components/common/layout/sidebarHotTopics';
import type { PredictionCardItem } from '@/components/common/predictions/predictionCards';

export type ViewType = 'worldCup' | 'predictions' | 'rivalry' | 'forum' | 'games' | 'jump' | 'lab' | 'battle' | 'battlePlaza' | 'pet' | 'shop' | 'rank' | 'profile' | 'inventory' | 'activePredictions';

export const NAV_ITEMS: SidebarNavItem[] = [
  { key: 'world-cup', label: '世界杯', icon: <Flag size={22} />, view: 'worldCup', enabled: true },
  { key: 'predictions', label: '暗盘', icon: <TrendingUp size={22} />, view: 'predictions', enabled: true },
  { key: 'rivalry', label: '开撕台', icon: <Flame size={22} />, view: 'rivalry', enabled: true },
  { key: 'forum', label: '线报', icon: <MessageSquare size={22} />, view: 'forum', enabled: true },
  { key: 'games', label: '游戏管理', icon: <Gamepad2 size={22} />, view: 'games', enabled: true },
  { key: 'battle-plaza', label: '地下钱庄', icon: <Swords size={22} />, view: 'battlePlaza', enabled: true },
  { key: 'shop', label: '黑市', icon: <Gift size={22} />, view: 'shop', enabled: false },
  { key: 'pet', label: '宠物空间', icon: <Turtle size={22} />, view: 'pet', enabled: false },
  { key: 'inventory', label: '背包&资产', icon: <Backpack size={22} />, enabled: false },
  { key: 'club', label: '俱乐部&工会', icon: <Users size={22} />, enabled: false },
  { key: 'news', label: '新闻源', icon: <Newspaper size={22} />, enabled: false },
  { key: 'settings', label: '系统&设置', icon: <Settings size={22} />, enabled: false },
  { key: 'help', label: '帮助&反馈', icon: <HelpCircle size={22} />, enabled: false },
];

interface SidebarMainPanelsProps {
  pet: PetInfo;
  aiPushMessages?: AiPushMessage[];
  newsByMarketId: Map<number, PredictionCardItem>;
  chatOpen: boolean;
  currentDialogue: string;
  dialogueKey: number;
  selectedTag: string | null;
  activeView: ViewType;
  onOpenChat: () => void;
  onCloseChat: () => void;
  onOpenProfile: () => void;
  onOpenActivePredictions: () => void;
  onOpenShop: () => void;
  onOpenPetSpace: () => void;
  onViewChange: (view: ViewType, topic?: SidebarHotTopic, tag?: SidebarHotTag) => void;
  onNavClick: (item: SidebarNavItem) => void;
}

export const SidebarMainPanels: React.FC<SidebarMainPanelsProps> = ({
  pet,
  aiPushMessages = [],
  newsByMarketId,
  chatOpen,
  currentDialogue,
  dialogueKey,
  selectedTag,
  activeView,
  onOpenChat,
  onCloseChat,
  onOpenProfile,
  onOpenActivePredictions,
  onOpenShop,
  onOpenPetSpace,
  onViewChange,
  onNavClick,
}) => {
  return (
    <>
      <div className="lg:hidden -mx-1 px-1 h-[300px] overflow-hidden">
        <div className="flex h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory gap-3 scroll-smooth pb-0 overscroll-x-contain [touch-action:pan-x] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="snap-start shrink-0 w-full min-w-full h-full overflow-y-auto overscroll-y-contain">
            <SidebarProfileCard
              pet={pet}
              aiPushMessages={aiPushMessages}
              chatOpen={chatOpen}
              currentDialogue={currentDialogue}
              dialogueKey={dialogueKey}
              onOpenChat={onOpenChat}
              onCloseChat={onCloseChat}
              onOpenProfile={onOpenProfile}
              onOpenActivePredictions={onOpenActivePredictions}
              onOpenShop={onOpenShop}
              onOpenPetSpace={onOpenPetSpace}
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

      <div className="hidden lg:flex min-h-0 flex-1 flex-col overflow-y-auto py-1 pr-1">
        <div className="flex min-h-full flex-col gap-4">
          <SidebarProfileCard
            pet={pet}
            aiPushMessages={aiPushMessages}
            chatOpen={chatOpen}
            currentDialogue={currentDialogue}
            dialogueKey={dialogueKey}
            onOpenChat={onOpenChat}
            onCloseChat={onCloseChat}
            onOpenProfile={onOpenProfile}
            onOpenActivePredictions={onOpenActivePredictions}
            onOpenShop={onOpenShop}
            onOpenPetSpace={onOpenPetSpace}
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
