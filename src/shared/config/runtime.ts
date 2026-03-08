export interface RuntimeConfig {
  apiBaseUrl: string;
  apiTimeoutMs: number;
}

function readTimeout(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const runtimeConfig: RuntimeConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  apiTimeoutMs: readTimeout(import.meta.env.VITE_API_TIMEOUT_MS, 15000),
};
