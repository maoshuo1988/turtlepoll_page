import React from 'react';
import { MessageSquare, Swords, Trophy, Settings, HelpCircle, TrendingUp, Gift, Backpack, Users, Newspaper, BookOpen, FlaskConical } from 'lucide-react';
import type { HotTag, HotTopic, PetInfo } from '../../../data/mock_data';
import { SidebarProfileCard } from './SidebarProfileCard';
import { SidebarHotTopicsPanel } from './SidebarHotTopicsPanel';
import { SidebarNavMenu, type SidebarNavItem } from './SidebarNavMenu';

export type ViewType = 'predictions' | 'forum' | 'battle' | 'pet' | 'lab' | 'shop';

export const NAV_ITEMS: SidebarNavItem[] = [
  { key: 'predictions', label: '预测市场', icon: <TrendingUp size={22} />, view: 'predictions', enabled: true },
  { key: 'forum', label: '社区广场', icon: <MessageSquare size={22} />, view: 'forum', enabled: true },
  { key: 'battle', label: '开战广场', icon: <Swords size={22} />, view: 'battle', enabled: true },
  { key: 'lab', label: '龟龟跳海', icon: <FlaskConical size={22} />, view: 'lab', enabled: true },
  { key: 'rank', label: '排行榜', icon: <Trophy size={22} />, enabled: true },
  { key: 'shop', label: '抽奖&商店', icon: <Gift size={22} />, view: 'shop', enabled: true },
  { key: 'inventory', label: '背包&资产', icon: <Backpack size={22} />, enabled: false },
  { key: 'club', label: '俱乐部&工会', icon: <Users size={22} />, enabled: false },
  { key: 'news', label: '新闻源', icon: <Newspaper size={22} />, enabled: false },
  { key: 'tutorial', label: '新手教程&规则', icon: <BookOpen size={22} />, enabled: false },
  { key: 'settings', label: '系统&设置', icon: <Settings size={22} />, enabled: false },
  { key: 'help', label: '帮助&反馈', icon: <HelpCircle size={22} />, enabled: false },
];

interface SidebarMainPanelsProps {
  balance: number;
  winStreak: number;
  winRate: number;
  totalPredictions: number;
  activePredictions: number;
  pet: PetInfo;
  chatOpen: boolean;
  currentDialogue: string;
  dialogueKey: number;
  selectedTag: string | null;
  activeView: ViewType;
  rankOpen: boolean;
  onOpenChat: () => void;
  onCloseChat: () => void;
  onViewPet: () => void;
  onTopicClick?: (topic: HotTopic) => void;
  onFallbackTopicClick: () => void;
  onTagClick: (tag: HotTag) => void;
  onNavClick: (item: SidebarNavItem) => void;
}

export const SidebarMainPanels: React.FC<SidebarMainPanelsProps> = ({
  balance,
  winStreak,
  winRate,
  totalPredictions,
  activePredictions,
  pet,
  chatOpen,
  currentDialogue,
  dialogueKey,
  selectedTag,
  activeView,
  rankOpen,
  onOpenChat,
  onCloseChat,
  onViewPet,
  onTopicClick,
  onFallbackTopicClick,
  onTagClick,
  onNavClick,
}) => {
  return (
    <>
      <div className="overflow-hidden shrink-0 flex flex-col gap-3.5 py-1">
        <SidebarProfileCard
          balance={balance}
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
        />

        <SidebarHotTopicsPanel
          selectedTag={selectedTag}
          onTopicClick={onTopicClick}
          onFallbackTopicClick={onFallbackTopicClick}
          onTagClick={onTagClick}
        />
      </div>

      <SidebarNavMenu navItems={NAV_ITEMS} activeView={activeView} rankOpen={rankOpen} onNavClick={onNavClick} />
    </>
  );
};
