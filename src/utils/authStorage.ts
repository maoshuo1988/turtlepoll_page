import { AUTH_TOKEN_STORAGE_KEY, DAILY_SETTLE_STORAGE_KEY, USER_INFO_STORAGE_KEY } from "@/constant";
import type { DailySettleSummary } from "@/hook/types";

///token 相关
export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? '';
}

export function saveAuthToken(token: string) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  }
}

// userinfo 相关
export function getStoredUserInfo() {
  const raw = localStorage.getItem(USER_INFO_STORAGE_KEY);

  try {
    return JSON.parse(raw ?? "");
  } catch {
    return {};
  }
}

export function saveUserInfo(data: unknown) {
  if (data) {
    localStorage.setItem(USER_INFO_STORAGE_KEY, JSON.stringify(data));
  }
}

export function getStoredDailySettle(): DailySettleSummary | null {
  const raw = localStorage.getItem(DAILY_SETTLE_STORAGE_KEY);

  try {
    return raw ? (JSON.parse(raw) as DailySettleSummary) : null;
  } catch {
    return null;
  }
}

export function saveDailySettle(data?: DailySettleSummary | null) {
  if (data) {
    localStorage.setItem(DAILY_SETTLE_STORAGE_KEY, JSON.stringify(data));
  }
}

export function clearInfo() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_INFO_STORAGE_KEY);
  localStorage.removeItem(DAILY_SETTLE_STORAGE_KEY);
}
