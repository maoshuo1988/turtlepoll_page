const rawServerApi = import.meta.env.VITE_SERVER_API?.trim() ?? "";

// Empty string means "use the current origin", which works well with reverse proxies.
export const SERVER_API = rawServerApi.replace(/\/+$/, "");





export const AUTH_TOKEN_STORAGE_KEY = 'turtle_auth_token';
export const USER_INFO_STORAGE_KEY = 'turtle_user_info';
