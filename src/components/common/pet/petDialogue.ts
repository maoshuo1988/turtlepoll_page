/**
 * 文件说明：宠物默认对话和接口对话归一化工具。
 */
import type { PetStatusAiMessage, PetStatusResponse } from '@/hooks/petTypes';
import { getPetStatusAiText } from '@/utils/petHelpers';

export const DEFAULT_PET_IDLE_DIALOGUES = [
  '今日情报已备好，主人请过目~',
  '路边社最新爆料来了！',
  '有人在评论区反驳你，要去看看吗？',
  '龟币行情看涨，是时候出手了~',
  '我嗅到了一个大新闻的味道...',
];

function normalizeDialogueText(value: unknown) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';

  const message = value as {
    text?: unknown;
    content?: unknown;
    message?: unknown;
    dialogue?: unknown;
    description?: unknown;
  };
  return String(message.text ?? message.content ?? message.message ?? message.dialogue ?? message.description ?? '').trim();
}

function normalizeDialogueList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeDialogueText).filter(Boolean);
}

export function getPetStatusDialogues(status?: PetStatusResponse | null) {
  if (!status) return [];

  const looseStatus = status as PetStatusResponse & {
    dialogues?: PetStatusAiMessage[];
    idleDialogues?: PetStatusAiMessage[];
    dialogue?: PetStatusAiMessage;
    message?: PetStatusAiMessage;
    greeting?: PetStatusAiMessage;
  };

  return [
    ...normalizeDialogueList(looseStatus.ai?.map(getPetStatusAiText)),
    ...normalizeDialogueList(looseStatus.dialogues),
    ...normalizeDialogueList(looseStatus.idleDialogues),
    normalizeDialogueText(looseStatus.dialogue),
    normalizeDialogueText(looseStatus.message),
    normalizeDialogueText(looseStatus.greeting),
  ].filter(Boolean);
}

export function getPetIdleDialogues(status?: PetStatusResponse | null) {
  const apiDialogues = getPetStatusDialogues(status);
  return apiDialogues.length > 0 ? apiDialogues : DEFAULT_PET_IDLE_DIALOGUES;
}
