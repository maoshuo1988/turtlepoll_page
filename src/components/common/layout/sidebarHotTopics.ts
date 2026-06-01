/**
 * 文件说明：sidebar Hot Topics，共享布局辅助组件和侧栏数据。
 */
import { useMemo } from 'react';
import type { PredictContext } from '@/hooks/predictionTypes';
import type { PredictTagItem } from '@/hooks/predictTagTypes';
import { getPredictTagLabel } from '@/hooks/predictTagTypes';
import { useRequestFootballPredictContextHot } from '@/hooks/usePredictionRequests';
import { useRequestPredictTagList } from '@/hooks/usePredictTagRequests';
import type { PredictionCardItem } from '../predictions/predictionCards';

export type SidebarHotTopic = {
  rank: number;
  title: string;
  heat: number;
  tag: string;
  relatedNewsId?: string;
  context: PredictContext;
};

/** 侧栏/分类共用：slug 用于筛选，label 用于展示 */
export type SidebarHotTag = PredictTagItem & {
  label: string;
};

function mapHotContextToTopic(context: PredictContext, newsByMarketId: Map<number, PredictionCardItem>, rank: number): SidebarHotTopic {
  const relatedNews = newsByMarketId.get(context.marketId);
  const firstTag = context.tags?.split(',').map((item) => item.trim()).find(Boolean);

  return {
    rank,
    title: context.eventName,
    heat: context.heat ?? 0,
    tag: firstTag || '热点',
    relatedNewsId: relatedNews?.id,
    context,
  };
}

export function useSidebarHotTopics(newsByMarketId: Map<number, PredictionCardItem>) {
  const footballHotContexts = useRequestFootballPredictContextHot({ limit: 10 });

  return useMemo<SidebarHotTopic[]>(() => {
    const list = footballHotContexts.data?.list ?? [];
    if (!Array.isArray(list) || list.length === 0) {
      return [];
    }
    return list.map((item, index) => mapHotContextToTopic(item, newsByMarketId, index + 1));
  }, [footballHotContexts.data, newsByMarketId]);
}

const PREDICT_TAG_LIST_PARAMS = {
  page: 1,
  pageSize: 100,
  includeCounts: true as const,
  sort: 'marketCount',
};

/** 分类列表：GET /api/predict-tag/list（侧栏与暗盘顶栏共用） */
export function usePredictTagCategories() {
  const predictTagListQuery = useRequestPredictTagList(PREDICT_TAG_LIST_PARAMS);

  const categories = useMemo<SidebarHotTag[]>(() => {
    const list = predictTagListQuery.data?.list ?? [];
    return list.map((item) => ({
      ...item,
      label: getPredictTagLabel(item),
    }));
  }, [predictTagListQuery.data?.list]);

  return {
    categories,
    isLoading: predictTagListQuery.isLoading,
    isError: predictTagListQuery.isError,
  };
}

export function useSidebarHotTags(): SidebarHotTag[] {
  return usePredictTagCategories().categories;
}
