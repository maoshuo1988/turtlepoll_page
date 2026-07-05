/**
 * 文件说明：预拉取 Spine atlas / skeleton，减少首帧等待（不创建 WebGL）。
 */
import { Assets } from 'pixi.js';
import '@esotericsoftware/spine-pixi-v8';
import { prefetchSkeletonJson } from '@/components/common/spine/spineSkeletonLoad';

const registeredAtlasKeys = new Set<string>();

function hashAssetKey(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function registerAtlasAsset(atlasUrl: string) {
  const alias = `prefetch-spine-atlas-${hashAssetKey(atlasUrl)}`;
  if (registeredAtlasKeys.has(alias)) return alias;

  registeredAtlasKeys.add(alias);
  Assets.add({
    alias,
    src: atlasUrl,
    parser: 'spineTextureAtlasLoader',
  });
  return alias;
}

export type SpineAssetRef = {
  skeletonUrl: string;
  atlasUrl: string;
};

/** 后台预加载一组 Spine 资源（atlas + json），可重复调用。 */
export function prefetchSpineAssets(assets: SpineAssetRef[]) {
  const unique = new Map<string, SpineAssetRef>();
  for (const item of assets) {
    unique.set(`${item.skeletonUrl}::${item.atlasUrl}`, item);
  }

  for (const item of unique.values()) {
    prefetchSkeletonJson(item.skeletonUrl);
    const alias = registerAtlasAsset(item.atlasUrl);
    void Assets.load(alias).catch(() => undefined);
  }
}
