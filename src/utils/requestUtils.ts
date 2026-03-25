import { getAuthToken } from "./authStorage";

export const getAuthorizationHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const assertSuccess = (res: any) => {
  if (res.success !== true) {
    throw new Error(String(res.msg ?? ""));
  }
  return res.data;
};