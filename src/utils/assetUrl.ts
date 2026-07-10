/**
 * 文件说明：后端静态资源 URL 解析，补全相对路径为可访问的完整地址。
 */
import { SERVER_ASSET_ORIGIN } from '@/config';

export function pickFirstNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

export function resolveAssetUrl(src?: string | null): string {
  const trimmed = src?.trim();
  if (!trimmed) return '';

  if (/^(https?:)?\/\//.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
  }

  if (trimmed.startsWith('/')) {
    return `${SERVER_ASSET_ORIGIN}${trimmed}`;
  }

  return `${SERVER_ASSET_ORIGIN}/${trimmed}`;
}
