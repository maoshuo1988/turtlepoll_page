/** 文件说明：操作失败 Toast，仅展示简短失败文案。 */

const DEFAULT_DURATION_MS = 2800;

type ToastListener = (message: string | null) => void;

const listeners = new Set<ToastListener>();
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function notify(message: string | null) {
  listeners.forEach((listener) => listener(message));
}

/** 展示操作失败提示（仅一行文字，无标题/图标/按钮） */
export function showOperationErrorToast(message: string, durationMs = DEFAULT_DURATION_MS) {
  const text = message.trim();
  if (!text) return;

  notify(text);

  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    notify(null);
    hideTimer = null;
  }, durationMs);
}

export function subscribeOperationErrorToast(listener: ToastListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 从接口/异常对象提取可展示的错误文案 */
export function resolveOperationErrorMessage(error: unknown, fallback = '操作失败，请稍后重试'): string {
  if (typeof error === 'string') {
    const text = error.trim();
    return text || fallback;
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const msg = record.msg ?? record.message;
    if (typeof msg === 'string' && msg.trim() && msg.trim() !== '[object Object]') {
      return msg.trim();
    }
  }

  if (error instanceof Error) {
    const text = error.message?.trim();
    if (text && text !== '[object Object]') return text;
  }

  return fallback;
}

/** 解析错误并弹出 Toast；mapMessage 用于业务错误码转中文 */
export function showOperationErrorFromUnknown(
  error: unknown,
  options?: {
    fallback?: string;
    mapMessage?: (raw: string) => string;
  },
) {
  const fallback = options?.fallback ?? '操作失败，请稍后重试';
  const raw = resolveOperationErrorMessage(error, fallback);
  const mapped = options?.mapMessage ? options.mapMessage(raw) : raw;
  showOperationErrorToast(mapped || fallback);
}
