/**
 * 文件说明：request Utils 工具方法，封装跨模块复用的基础能力。
 */
import { clearInfo, getAuthToken, markAuthRequired } from "./authStorage";

export const getAuthorizationHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export function isUnauthorizedCode(code: unknown) {
  return String(code ?? "").trim() === "401";
}

export function isUnauthorizedError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const code = (error as Error & { code?: unknown }).code;
  const message = String(error.message ?? "");
  return isUnauthorizedCode(code) || message.includes("NotLogin") || message.includes("401");
}

function handleUnauthorized() {
  clearInfo();
  markAuthRequired();
}

export const assertSuccess = <T>(res: {
  success?: boolean;
  msg?: unknown;
  code?: unknown;
  data: T;
}) => {
  if (res.success !== true) {
    const error = new Error(String(res.msg ?? res.code ?? "Request failed")) as Error & {
      code?: unknown;
    };
    error.code = res.code;
    if (isUnauthorizedCode(res.code) || String(res.msg ?? "").includes("NotLogin")) {
      handleUnauthorized();
    }
    throw error;
  }
  return res.data;
};
