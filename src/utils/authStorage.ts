/**
 * 文件说明：auth Storage 工具方法，封装跨模块复用的基础能力。
 */
import { AUTH_TOKEN_STORAGE_KEY, DAILY_SETTLE_STORAGE_KEY, USER_INFO_STORAGE_KEY } from "@/config";
import type { DailySettleSummary } from "@/hooks/authTypes";

const AUTH_REQUIRED_STORAGE_KEY = "turtle_auth_required";
export const AUTH_REQUIRED_EVENT = "turtle:auth-required";
export const AUTH_SESSION_CHANGED_EVENT = "turtle:auth-session-changed";

function notifyAuthSessionChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
  }
}

///token 相关
export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? '';
}

export function saveAuthToken(token: string) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    notifyAuthSessionChanged();
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

export function hasAuthRequiredFlag() {
  return sessionStorage.getItem(AUTH_REQUIRED_STORAGE_KEY) === "1";
}

export function markAuthRequired() {
  const alreadyMarked = hasAuthRequiredFlag();
  sessionStorage.setItem(AUTH_REQUIRED_STORAGE_KEY, "1");

  if (!alreadyMarked && typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
  }
}

export function clearAuthRequiredFlag() {
  sessionStorage.removeItem(AUTH_REQUIRED_STORAGE_KEY);
}

export function clearInfo() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_INFO_STORAGE_KEY);
  localStorage.removeItem(DAILY_SETTLE_STORAGE_KEY);
  localStorage.removeItem("url_token");
  clearAuthRequiredFlag();
  notifyAuthSessionChanged();
}

export function handleUnauthorizedSession() {
  clearInfo();
  markAuthRequired();
}

export function requireAuthOrOpen(openAuth: () => void) {
  if (getAuthToken()) return true;

  markAuthRequired();
  openAuth();
  return false;
}
