/**
 * 文件说明：项目全局配置，集中维护服务地址和本地存储键名。
 */
const SERVER_ORIGIN = "https://52.220.192.18";
export const SERVER_API = process.env.NODE_ENV === "development" ? "" : SERVER_ORIGIN;
export const SERVER_ASSET_ORIGIN = SERVER_ORIGIN;

export const AUTH_TOKEN_STORAGE_KEY = 'turtle_auth_token';
export const USER_INFO_STORAGE_KEY = 'turtle_user_info';
export const DAILY_SETTLE_STORAGE_KEY = 'turtle_daily_settle';
