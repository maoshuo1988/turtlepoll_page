/**
 * 文件说明：Spine 初始化排队，仅限制列表预览；舞台法师不走此队列。
 */
export type SpineInitPriority = 'stage' | 'preview';

const MAX_PREVIEW_INITS = 2;

let previewActiveInits = 0;

export type SpineInitWaitToken = {
  cancelled: boolean;
};

type WaitEntry = {
  resolve: () => void;
  token: SpineInitWaitToken;
};

const previewWaitQueue: WaitEntry[] = [];

function drainPreviewWaitQueue() {
  while (previewActiveInits < MAX_PREVIEW_INITS && previewWaitQueue.length > 0) {
    const next = previewWaitQueue.shift();
    if (!next || next.token.cancelled) continue;
    previewActiveInits += 1;
    next.resolve();
    return;
  }
}

/** stage 直接通过；preview 排队。卸载时须 cancelSpineInitWait。 */
export function acquireSpineInitSlot(
  token: SpineInitWaitToken,
  priority: SpineInitPriority = 'preview',
): Promise<void> {
  if (priority === 'stage' || token.cancelled) return Promise.resolve();

  if (previewActiveInits < MAX_PREVIEW_INITS) {
    previewActiveInits += 1;
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    previewWaitQueue.push({ resolve, token });
  });
}

export function releaseSpineInitSlot(priority: SpineInitPriority = 'preview') {
  if (priority === 'stage') return;
  previewActiveInits = Math.max(0, previewActiveInits - 1);
  drainPreviewWaitQueue();
}

export function cancelSpineInitWait(token: SpineInitWaitToken) {
  token.cancelled = true;
  for (let i = previewWaitQueue.length - 1; i >= 0; i -= 1) {
    if (previewWaitQueue[i]?.token === token) {
      previewWaitQueue.splice(i, 1);
    }
  }
}

export async function withSpineInitSlot(
  token: SpineInitWaitToken,
  priority: SpineInitPriority,
  task: () => Promise<void>,
) {
  await acquireSpineInitSlot(token, priority);
  if (token.cancelled) {
    releaseSpineInitSlot(priority);
    return;
  }

  try {
    await task();
  } finally {
    releaseSpineInitSlot(priority);
  }
}
