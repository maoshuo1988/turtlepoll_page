/**
 * 文件说明：基于用户 ID 生成 DiceBear 确定性头像。
 */
import { createAvatar } from '@dicebear/core';
import { pixelArt } from '@dicebear/collection';

const avatarCache = new Map<string, string>();

type AvatarSeedSource = {
  id?: string | number | null;
  userId?: string | number | null;
  username?: string | null;
  nickname?: string | null;
};

export function resolveUserAvatarSeed(
  source?: AvatarSeedSource | null,
  fallback?: string | number | null,
) {
  const candidates = [source?.id, source?.userId, source?.username, source?.nickname, fallback];

  for (const item of candidates) {
    if (item !== undefined && item !== null && String(item).trim() !== '') {
      return String(item);
    }
  }

  return '';
}

export function createUserAvatarUrl(seed?: string | number | null, size = 96) {
  const normalizedSeed =
    seed !== undefined && seed !== null && String(seed).trim() !== ''
      ? String(seed)
      : '';

  if (!normalizedSeed) return '';

  const cacheKey = `${normalizedSeed}:${size}`;
  const cached = avatarCache.get(cacheKey);
  if (cached) return cached;

  const dataUri = createAvatar(pixelArt, {
    seed: normalizedSeed,
    size,
  }).toDataUri();

  avatarCache.set(cacheKey, dataUri);
  return dataUri;
}

export function resolveGeneratedUserAvatarUrl(
  source?: AvatarSeedSource | null,
  fallback?: string | number | null,
  size = 96,
) {
  return createUserAvatarUrl(resolveUserAvatarSeed(source, fallback), size);
}
