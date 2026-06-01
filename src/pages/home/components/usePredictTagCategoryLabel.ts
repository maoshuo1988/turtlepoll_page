/** 文件说明：根据 URL 中的 tag slug 解析分类展示名。 */
import { useMemo } from 'react';
import { usePredictTagCategories } from '@/components/common/layout/sidebarHotTopics';
import { isSamePredictTagSlug, normalizeTagQuery } from '@/hooks/predictTagTypes';

export function usePredictTagCategoryLabel(selectedTag: string | null) {
  const { categories } = usePredictTagCategories();

  return useMemo(() => {
    const slug = normalizeTagQuery(selectedTag);
    if (!slug) return null;
    const item = categories.find((row) => isSamePredictTagSlug(row.slug, slug));
    return item?.label ?? slug;
  }, [categories, selectedTag]);
}
