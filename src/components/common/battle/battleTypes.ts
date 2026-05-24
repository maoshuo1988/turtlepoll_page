/**
 * 文件说明：战斗展示组件的通用类型定义。
 */
export type BattleSide = 'A' | 'B';
export type BattleStatus = 'waiting' | 'active' | 'resolved';

export interface BattleParticipant {
  name: string;
  avatar: string;
  side: BattleSide;
}

export interface Battle {
  id: string;
  topic: string;
  optionA: string;
  optionB: string;
  creator: BattleParticipant;
  challenger: BattleParticipant | null;
  wager: number;
  status: BattleStatus;
  winner: BattleSide | null;
  createdTime: string;
  relatedNewsId?: string;
}
