/**
 * 文件说明：黑市舞台 Spine 全部就绪后，才放行列表预览 init。
 */
import { useEffect, useState } from 'react';

export type ShopStageBootToken = {
  cancelled: boolean;
};

const SHOP_STAGE_LAYER_COUNT = 3;

let shopStageBootComplete = false;
let stageLayersReady = 0;

type WaitEntry = {
  resolve: () => void;
  token: ShopStageBootToken;
};

const waitQueue: WaitEntry[] = [];
const completeListeners = new Set<(complete: boolean) => void>();

function notifyCompleteListeners() {
  completeListeners.forEach((listener) => listener(shopStageBootComplete));
}

export function resetShopStageBootGate() {
  shopStageBootComplete = false;
  stageLayersReady = 0;
  notifyCompleteListeners();
}

export function markShopStageBootComplete() {
  if (shopStageBootComplete) return;
  shopStageBootComplete = true;
  notifyCompleteListeners();
  while (waitQueue.length > 0) {
    const next = waitQueue.shift();
    if (!next || next.token.cancelled) continue;
    next.resolve();
  }
}

function tryMarkShopStageBootComplete() {
  if (shopStageBootComplete) return;
  if (stageLayersReady >= SHOP_STAGE_LAYER_COUNT) {
    window.setTimeout(() => markShopStageBootComplete(), 320);
  }
}

/** 舞台单层 Spine init 成功时调用（极光 / 双法师）。 */
export function notifyShopStageLayerReady() {
  if (shopStageBootComplete) return;
  stageLayersReady += 1;
  tryMarkShopStageBootComplete();
}

export function waitForShopStageBoot(token: ShopStageBootToken): Promise<void> {
  if (shopStageBootComplete || token.cancelled) return Promise.resolve();
  return new Promise((resolve) => {
    waitQueue.push({ resolve, token });
  });
}

export function cancelShopStageBootWait(token: ShopStageBootToken) {
  token.cancelled = true;
  for (let i = waitQueue.length - 1; i >= 0; i -= 1) {
    if (waitQueue[i]?.token === token) {
      waitQueue.splice(i, 1);
    }
  }
}

export function isShopStageBootComplete() {
  return shopStageBootComplete;
}

export function useShopStageBootComplete() {
  const [complete, setComplete] = useState(isShopStageBootComplete);

  useEffect(() => {
    const listener = (next: boolean) => setComplete(next);
    completeListeners.add(listener);
    setComplete(isShopStageBootComplete());
    return () => {
      completeListeners.delete(listener);
    };
  }, []);

  return complete;
}
