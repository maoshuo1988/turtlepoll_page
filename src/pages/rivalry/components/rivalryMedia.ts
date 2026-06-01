/**
 * 文件说明：开撕台图片 URL 解析与 Hero 背景模式（封面 / 对抗拼接）。
 */
import { SERVER_ASSET_ORIGIN } from '@/config';
import type { RivalryNewsItem } from './rivalryTypes';

export function resolveRivalryMediaUrl(src?: string) {
  const trimmed = src?.trim();
  if (!trimmed) return '';

  if (/^(https?:)?\/\//.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return `${SERVER_ASSET_ORIGIN}${trimmed}`;
  }

  return `${SERVER_ASSET_ORIGIN}/${trimmed}`;
}

/** 封面优先 cover，其次 listImage（接口常只下发列表图作封面）。 */
export function pickRivalryCoverRaw(item: RivalryNewsItem) {
  return item.coverImage?.trim() || item.listImage?.trim() || '';
}

export type HeroPkBackground =
  | { mode: 'cover'; coverSrc: string }
  | { mode: 'split'; sideASrc: string; sideBSrc: string };

export function resolveHeroPkBackground(
  item: RivalryNewsItem,
  fallbackSideA: string,
  fallbackSideB: string,
): HeroPkBackground {
  const coverSrc = resolveRivalryMediaUrl(pickRivalryCoverRaw(item));
  if (coverSrc) {
    return { mode: 'cover', coverSrc };
  }

  const sideARaw = item.sideABgImage?.trim();
  const sideBRaw = item.sideBBgImage?.trim();

  return {
    mode: 'split',
    sideASrc: sideARaw ? resolveRivalryMediaUrl(sideARaw) : fallbackSideA,
    sideBSrc: sideBRaw ? resolveRivalryMediaUrl(sideBRaw) : fallbackSideB,
  };
}
