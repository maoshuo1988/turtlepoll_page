/**
 * 文件说明：predict-tag 维表与列表接口类型及归一化。
 */

export type PredictTagListParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  slugs?: string;
  sort?: string;
  includeCounts?: boolean;
};

export type PredictTagItem = {
  id: number;
  slug: string;
  name: string;
  cnName: string;
  marketCount: number;
  lastSeenAt?: number;
  createTime?: number;
  updateTime?: number;
};

export type PredictTagListResult = {
  list: PredictTagItem[];
  count: number;
  page: number;
  pageSize: number;
};

function readString(raw: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function readNumber(raw: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return fallback;
}

function readOptionalNumber(raw: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function normalizePredictTagItem(raw: unknown): PredictTagItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const slug = readString(row, ['slug', 'Slug']);
  if (!slug) return null;

  const name = readString(row, ['name', 'Name']) || slug;
  const cnName = readString(row, ['cnName', 'cn_name', 'CnName']) || name;

  return {
    id: readNumber(row, ['id', 'Id'], 0),
    slug,
    name,
    cnName,
    marketCount: readNumber(row, ['marketCount', 'market_count', 'MarketCount'], 0),
    lastSeenAt: readOptionalNumber(row, ['lastSeenAt', 'last_seen_at']),
    createTime: readOptionalNumber(row, ['createTime', 'create_time']),
    updateTime: readOptionalNumber(row, ['updateTime', 'update_time']),
  };
}

export function normalizePredictTagList(raw: unknown): PredictTagListResult {
  const root = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const listRaw = Array.isArray(root.list)
    ? root.list
    : Array.isArray((root.data as Record<string, unknown> | undefined)?.list)
      ? ((root.data as Record<string, unknown>).list as unknown[])
      : [];

  const list = listRaw
    .map(normalizePredictTagItem)
    .filter((item): item is PredictTagItem => Boolean(item));

  return {
    list,
    count: readNumber(root, ['count', 'total', 'Count'], list.length),
    page: readNumber(root, ['page', 'Page'], 1),
    pageSize: readNumber(root, ['pageSize', 'page_size', 'PageSize'], 20),
  };
}

/** 展示用文案：优先中文名 */
export function getPredictTagLabel(item: Pick<PredictTagItem, 'cnName' | 'name' | 'slug'>): string {
  return item.cnName?.trim() || item.name?.trim() || item.slug;
}

/** URL / 接口 query 用 slug，去掉 # */
export function normalizeTagQuery(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/^#/, '');
  return normalized || null;
}

export function isSamePredictTagSlug(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = normalizeTagQuery(a);
  const right = normalizeTagQuery(b);
  if (!left || !right) return false;
  return left === right;
}

/** 从若干原始字符串收集去重后的 slug 候选 */
export function collectPredictTagCandidates(...raw: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const value of raw) {
    const slug = normalizeTagQuery(value);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    candidates.push(slug);
  }
  return candidates;
}

/** 将原始 tag 对齐到 predict-tag 维表 slug（匹配 slug / name / cnName） */
export function resolvePredictTagSlug(
  raw: string | null | undefined,
  tags: PredictTagItem[],
): string | null {
  const slug = normalizeTagQuery(raw);
  if (!slug) return null;

  const exact = tags.find((item) => isSamePredictTagSlug(item.slug, slug));
  if (exact) return normalizeTagQuery(exact.slug);

  const byLabel = tags.find(
    (item) =>
      normalizeTagQuery(item.name) === slug ||
      normalizeTagQuery(item.cnName) === slug ||
      getPredictTagLabel(item) === slug,
  );
  if (byLabel) return normalizeTagQuery(byLabel.slug);

  return slug;
}

/** 按候选顺序解析，优先返回维表中存在的 slug */
export function resolvePredictTagSlugFromCandidates(
  candidates: string[],
  tags: PredictTagItem[],
): string | null {
  for (const candidate of candidates) {
    const resolved = resolvePredictTagSlug(candidate, tags);
    if (!resolved) continue;
    if (tags.some((item) => isSamePredictTagSlug(item.slug, resolved))) {
      return resolved;
    }
  }
  return resolvePredictTagSlug(candidates[0], tags);
}

/** 从 PredictContext.tags 解析分类 slug */
export function resolvePredictTagSlugFromContextTags(
  tagsCsv: string | null | undefined,
  tags: PredictTagItem[],
): string | null {
  const fromCsv = (tagsCsv ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return resolvePredictTagSlugFromCandidates(collectPredictTagCandidates(...fromCsv), tags);
}
