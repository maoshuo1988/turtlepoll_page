/**
 * 文件说明：各部署环境 API 基址，供 Umi 代理与前端运行时配置统一引用。
 */
export const API_TARGETS = {
  development: 'https://52.220.192.18',
  test: 'https://52.220.26.101',
  production: 'https://52.74.160.160',
} as const;

export type ApiDeployEnv = keyof typeof API_TARGETS;

/** 根据 UMI_ENV / NODE_ENV 解析当前应使用的 API 基址 */
export function resolveApiTarget(
  customApiOrigin = process.env.UMI_APP_SERVER_API,
  umiEnv = process.env.UMI_ENV,
  nodeEnv = process.env.NODE_ENV,
): string {
  // if (customApiOrigin?.trim()) return customApiOrigin.trim();
  // if (umiEnv === 'test') return API_TARGETS.test;
  // if (umiEnv === 'prod' || umiEnv === 'production') return API_TARGETS.production;
  // if (umiEnv === 'dev' || umiEnv === 'development') return API_TARGETS.development;
  // if (nodeEnv === 'production') return API_TARGETS.production;
  // return API_TARGETS.development;
  return ''
}
