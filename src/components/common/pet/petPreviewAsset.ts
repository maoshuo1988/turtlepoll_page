/**
 * 文件说明：龟种预览资源解析，json 走骨骼动画，其余走静态图。
 */
import { getPetDisplayAvatar } from './petDisplay';

export type PetPreviewAssetKind = 'spine' | 'image';

export type PetPreviewAsset = {
  kind: PetPreviewAssetKind;
  src: string;
  atlasUrl?: string;
  fallback: string;
};

export type PetPreviewSource = {
  avatarUrl?: string | null;
  petKey?: string | null;
  petName?: string | null;
};

export type PetAvatarFields = {
  icon?: string | null;
  image?: string | null;
};

/** 接口返回的 avatar/icon/image 等为 .json 时视为 Spine 骨骼资源。 */
export function isPetSpineJsonUrl(src?: string | null): boolean {
  const trimmed = src?.trim();
  if (!trimmed) return false;

  try {
    const pathname = new URL(trimmed, 'http://local.invalid').pathname;
    return /\.json$/i.test(pathname);
  } catch {
    return /\.json(\?.*)?$/i.test(trimmed);
  }
}

/** 由 skeleton.json 推导同目录 .atlas 路径。 */
export function resolvePetSpineAtlasUrl(jsonUrl: string) {
  return jsonUrl.replace(/\.json(\?.*)?$/i, '.atlas$1');
}

export function pickPetAvatarUrl(...candidates: Array<string | null | undefined>) {
  for (const item of candidates) {
    const trimmed = item?.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

export function resolvePetPreviewAsset(source: PetPreviewSource): PetPreviewAsset | null {
  const petKey = source.petKey?.trim();
  const petName = source.petName?.trim();
  const fallback = getPetDisplayAvatar(petKey, petName);
  const avatarUrl = source.avatarUrl?.trim();

  if (avatarUrl) {
    if (isPetSpineJsonUrl(avatarUrl)) {
      return {
        kind: 'spine',
        src: avatarUrl,
        atlasUrl: resolvePetSpineAtlasUrl(avatarUrl),
        fallback,
      };
    }

    return {
      kind: 'image',
      src: avatarUrl,
      fallback,
    };
  }

  const slug = petKey || petName;
  if (!slug) return null;

  return {
    kind: 'image',
    src: `/assets/pets/${slug}.png`,
    fallback,
  };
}

export function resolvePetPreviewFromAvatarFields(
  fields: PetAvatarFields,
  petKey?: string | null,
  petName?: string | null,
): PetPreviewAsset | null {
  return resolvePetPreviewAsset({
    avatarUrl: pickPetAvatarUrl(fields.icon, fields.image),
    petKey,
    petName,
  });
}
