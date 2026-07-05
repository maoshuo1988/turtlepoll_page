/**
 * 文件说明：Spine skeleton JSON 拉取与 SkeletonData 解析缓存。
 */
import { AtlasAttachmentLoader, SkeletonJson } from '@esotericsoftware/spine-pixi-v8';
import type { SkeletonData, TextureAtlas } from '@esotericsoftware/spine-core';

const skeletonJsonCache = new Map<string, Promise<unknown>>();
const skeletonDataCache = new Map<string, Promise<SkeletonData>>();

async function fetchSkeletonJson(skeletonUrl: string) {
  const cached = skeletonJsonCache.get(skeletonUrl);
  if (cached) return cached;

  const promise = (async () => {
    const response = await fetch(skeletonUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch skeleton json: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    if (!json || !Array.isArray(json.bones)) {
      throw new Error('Invalid spine skeleton json: missing bones array');
    }
    return json;
  })();

  skeletonJsonCache.set(skeletonUrl, promise);
  return promise;
}

export function prefetchSkeletonJson(skeletonUrl: string) {
  void fetchSkeletonJson(skeletonUrl).catch(() => undefined);
}

export async function loadSkeletonDataFromAtlas(
  skeletonUrl: string,
  atlas: TextureAtlas,
): Promise<SkeletonData> {
  const cacheKey = skeletonUrl;
  const cached = skeletonDataCache.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    const json = await fetchSkeletonJson(skeletonUrl);
    const attachmentLoader = new AtlasAttachmentLoader(atlas);
    return new SkeletonJson(attachmentLoader).readSkeletonData(json);
  })();

  skeletonDataCache.set(cacheKey, promise);
  return promise;
}
