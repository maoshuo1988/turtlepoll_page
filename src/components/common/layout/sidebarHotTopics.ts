/**
 * 文件说明：sidebar Hot Topics，共享布局辅助组件和侧栏数据。
 */
import { useMemo } from 'react';
import type { PredictContext, PredictTagHotItem } from '@/hooks/predictionTypes';
import { useRequestFootballPredictContextHot, useRequestFootballPredictTagsHot } from '@/hooks/usePredictionRequests';
import type { PredictionCardItem } from '../predictions/predictionCards';

export type SidebarHotTopic = {
  rank: number;
  title: string;
  heat: number;
  tag: string;
  relatedNewsId?: string;
  context: PredictContext;
};
export type SidebarHotTag = {
  tag: string;
  heat: number;
};

function formatHotTag(tag: string): string {
  const value = tag.trim();
  if (!value) return value;
  return value.startsWith('#') ? value : `#${value}`;
}

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

export function useSidebarHotTags() {
  const footballHotTags = useRequestFootballPredictTagsHot({ limit: 10 });

  return useMemo<SidebarHotTag[]>(() => {
    const list = footballHotTags.data?.list ?? [];
    if (!Array.isArray(list) || list.length === 0) {
      return [];
    }
    return list
      .filter((item): item is PredictTagHotItem => Boolean(item?.tag?.trim()))
      .map((item) => ({
        ...item,
        tag: formatHotTag(item.tag),
      }));
  }, [footballHotTags.data]);
}
