/**
 * 文件说明：开撕台撕裂带直播页路由入口，根据 topic 参数装配 PK 撕裂带。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from '@umijs/renderer-react';
import { useHomeLayoutContext } from '@/layouts/context';
import type { RivalryBattleNewsItem } from './types';
import { RivalryBattlePage } from './components/RivalryBattlePage';

type RivalryBattleLocationState = {
  openBattleNews?: RivalryBattleNewsItem;
  returnTo?: string;
};

function normalizeRivalryBattleNews(item: RivalryBattleNewsItem): RivalryBattleNewsItem {
  return {
    ...item,
    id: String(item.id),
    marketId: Number(item.marketId || item.id),
    type: 'rivalry',
    status: item.status === 'closed' ? 'closed' : 'open',
  };
}

export default function RivalryBattleRoutePage() {
  const [selectedBattleNews, setSelectedBattleNews] = useState<RivalryBattleNewsItem | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { onOpenAuth } = useHomeLayoutContext();
  const searchParams = new URLSearchParams(location.search);
  const selectedTopic = searchParams.get('topic');
  const routeState = location.state as RivalryBattleLocationState | null;
  const routeStateBattleNews = routeState?.openBattleNews ?? null;
  const returnTo = routeState?.returnTo;

  const selectedNews = useMemo(() => {
    if (routeStateBattleNews) return normalizeRivalryBattleNews(routeStateBattleNews);
    if (!selectedTopic) return null;
    const topicId = Number(selectedTopic);
    if (!Number.isFinite(topicId) || topicId <= 0) return null;
    return normalizeRivalryBattleNews({
      id: String(topicId),
      marketId: topicId,
      title: '开撕台对局',
      summary: '',
      image: '',
      type: 'rivalry',
      votes: { A: 0, B: 0 },
      optionA: '阵营 A',
      optionB: '阵营 B',
      oddsA: 1.8,
      oddsB: 1.8,
      status: 'open',
    });
  }, [routeStateBattleNews, selectedTopic]);

  useEffect(() => {
    const raw = location.state as RivalryBattleLocationState | null;
    if (!raw?.openBattleNews) return;
    setSelectedBattleNews(normalizeRivalryBattleNews(raw.openBattleNews));
    navigate(`${location.pathname}${location.search || ''}`, {
      replace: true,
      state: raw.returnTo ? { returnTo: raw.returnTo } : undefined,
    });
  }, [location.state, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!selectedNews) return;
    setSelectedBattleNews(selectedNews);
  }, [selectedNews]);

  const handleBack = useCallback(() => {
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    navigate('/rivalry');
  }, [navigate, returnTo]);

  return (
    <RivalryBattlePage
      battleNews={selectedNews ?? selectedBattleNews}
      userSide={null}
      isLoading={false}
      onBack={handleBack}
      onRequireAuth={onOpenAuth}
    />
  );
}
