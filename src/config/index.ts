/**
 * 文件说明：项目全局配置，集中维护服务地址和本地存储键名。
 */
import { API_TARGETS } from './apiTargets';

const API_ORIGIN = process.env.TURTLE_API_ORIGIN || API_TARGETS.production;

/** 开发态走 Umi 代理，其余环境直连对应 API 基址 */
export const SERVER_API = process.env.NODE_ENV === 'development' ? '' : API_ORIGIN;
export const SERVER_ASSET_ORIGIN = API_ORIGIN;

export const AUTH_TOKEN_STORAGE_KEY = 'turtle_auth_token';
export const USER_INFO_STORAGE_KEY = 'turtle_user_info';
export const DAILY_SETTLE_STORAGE_KEY = 'turtle_daily_settle';
