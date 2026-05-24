/**
 * 文件说明：项目全局配置，集中维护服务地址和本地存储键名。
 */
import { API_TARGETS, resolveApiTarget } from './apiTargets';

const API_ORIGIN = resolveApiTarget() || API_TARGETS.production;

/** 优先 UMI_APP_SERVER_API，否则使用 apiTargets 对应环境 IP */
export const SERVER_API =
  process.env.UMI_APP_SERVER_API || API_ORIGIN;
export const SERVER_ASSET_ORIGIN = API_ORIGIN;

export const AUTH_TOKEN_STORAGE_KEY = 'turtle_auth_token';
export const USER_INFO_STORAGE_KEY = 'turtle_user_info';
export const DAILY_SETTLE_STORAGE_KEY = 'turtle_daily_settle';
