/**
 * 文件说明：撕裂带评论和战场展示类型定义。
 */
export type CommentSide = 'A' | 'B';
export type EggStatus = 'egg' | 'turtle' | 'destroyed';

export interface EventReply {
  id: string;
  author: { name: string; avatar: string };
  side: CommentSide;
  content: string;
  time: string;
  likes: number;
}

export interface EventComment {
  id: string;
  newsId: string;
  side: CommentSide;
  author: { name: string; avatar: string };
  content: string;
  time: string;
  likes: number;
  dislikes?: number;
  replies?: EventReply[];
  eggStatus: EggStatus;
  posX: number;
  posY: number;
}
