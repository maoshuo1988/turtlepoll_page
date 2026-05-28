/**
 * 文件说明：基于用户 ID 生成 DiceBear 确定性头像。
 * seed 必须是用户体系 ID（/api/user/current 的 id、帖子 user.id），不要用 nickname/username。
 */
import { createAvatar } from '@dicebear/core';
import { pixelArt } from '@dicebear/collection';

const avatarCache = new Map<string, string>();

function normalizeUserId(userId?: string | number | null) {
  if (userId === undefined || userId === null || String(userId).trim() === '') {
    return '';
  }

  return String(userId);
}

export function createUserAvatarUrl(userId?: string | number | null, size = 96) {
  const seed = normalizeUserId(userId);

  if (!seed) return '';

  const cacheKey = `${seed}:${size}`;
  const cached = avatarCache.get(cacheKey);
  if (cached) return cached;

  const dataUri = createAvatar(pixelArt, {
    seed,
    size,
  }).toDataUri();

  avatarCache.set(cacheKey, dataUri);
  return dataUri;
}
