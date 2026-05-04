/**
 * 文件说明：request Utils 工具方法，封装跨模块复用的基础能力。
 */
import { getAuthToken } from "./authStorage";

export const getAuthorizationHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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
    throw error;
  }
  return res.data;
};
