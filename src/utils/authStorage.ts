import { AUTH_TOKEN_STORAGE_KEY, USER_INFO_STORAGE_KEY } from "@/constant";

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

export function clearInfo() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_INFO_STORAGE_KEY);
}
