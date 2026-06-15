/** 文件说明：全局顶部操作 Toast，展示一行简短反馈文案。 */

const DEFAULT_DURATION_MS = 2800;

export type OperationToastTone = "error" | "success" | "info";

export type OperationToastPayload = {
  message: string;
  tone: OperationToastTone;
};

type ToastListener = (payload: OperationToastPayload | null) => void;

const listeners = new Set<ToastListener>();
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function notify(payload: OperationToastPayload | null) {
  listeners.forEach((listener) => listener(payload));
}

/** 展示顶部 Toast（一行文字，无标题/图标/按钮） */
export function showOperationToast(
  message: string,
  options?: { tone?: OperationToastTone; durationMs?: number },
) {
  const text = message.trim();
  if (!text) return;

  const durationMs = options?.durationMs ?? DEFAULT_DURATION_MS;
  notify({ message: text, tone: options?.tone ?? "error" });

  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    notify(null);
    hideTimer = null;
  }, durationMs);
}

/** 展示操作失败提示 */
export function showOperationErrorToast(message: string, durationMs = DEFAULT_DURATION_MS) {
  showOperationToast(message, { tone: "error", durationMs });
}

export function subscribeOperationToast(listener: ToastListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 兼容旧订阅签名，仅传递 message */
export function subscribeOperationErrorToast(listener: (message: string | null) => void) {
  return subscribeOperationToast((payload) => {
    listener(payload?.message ?? null);
  });
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
