/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from '@umijs/renderer-react';
import { useRequestPKBet, useRequestPKSettle } from '@/hooks/usePkRequests';
import { useHomeLayoutContext } from '@/layouts/context';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { RivalryNewsItem } from './components/rivalryTypes';
import { RivalryPageView } from './components/RivalryPageView';

function createRequestId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function RivalryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [userVotes, setUserVotes] = useState<Record<string, 'A' | 'B'>>({});
  const [betError, setBetError] = useState<string | null>(null);
  const [pendingBetId, setPendingBetId] = useState<string | null>(null);
  const [pendingSettleId, setPendingSettleId] = useState<string | null>(null);
  const pkBetMutation = useRequestPKBet();
  const pkSettleMutation = useRequestPKSettle();
  const { onOpenAuth } = useHomeLayoutContext();
  const requireAuth = useRequireAuth(onOpenAuth);

  const handleRivalryBet = useCallback(async (newsId: string, option: 'A' | 'B', _odds: number, amount?: number) => {
    setBetError(null);

    if (!requireAuth()) return;

    const topicId = Number(newsId);
    if (!Number.isFinite(topicId) || topicId <= 0) {
      setBetError('无效的话题 ID');
      return;
    }

    try {
      setPendingBetId(newsId);
      await pkBetMutation.mutateAsync({
        topicId,
        side: option,
        requestId: createRequestId(`pk-bet-${newsId}`),
        amount,
      });
      setUserVotes((prev) => ({ ...prev, [newsId]: option }));
    } catch (error) {
      const message = error instanceof Error ? error.message : '下注失败，请稍后再试';
      if (message.includes('NotLogin')) {
        onOpenAuth();
        return;
      }
      setBetError(message);
    } finally {
      setPendingBetId(null);
    }
  }, [onOpenAuth, pkBetMutation, requireAuth]);

  const handleEnterBattle = useCallback((item: RivalryNewsItem) => {
    navigate(`/rivalry-battle?topic=${item.id}`, {
      state: {
        openBattleNews: item,
        returnTo: `${location.pathname}${location.search || ''}`,
      },
    });
  }, [location.pathname, location.search, navigate]);

  const handlePkSettle = useCallback(async (topicId: string) => {
    if (!requireAuth()) return;

    const numericTopicId = Number(topicId);
    if (!Number.isFinite(numericTopicId) || numericTopicId <= 0) return;

    try {
      setPendingSettleId(topicId);
      await pkSettleMutation.mutateAsync({
        topicId: numericTopicId,
        requestId: createRequestId(`pk-settle-${topicId}`),
        snapshotType: 'SETTLE',
        freezeSource: 'ON_DEMAND',
      });
      navigate(`/settlement/pk/${numericTopicId}?action=view`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '结算失败，请稍后再试';
      if (message.includes('NotLogin')) {
        onOpenAuth();
        return;
      }
      setBetError(message);
    } finally {
      setPendingSettleId(null);
    }
  }, [navigate, onOpenAuth, pkSettleMutation, requireAuth]);

  return (
    <div className="pt-[10px]">
      <RivalryPageView
        userVotes={userVotes}
        betError={betError}
        pendingBetId={pendingBetId}
        pendingSettleId={pendingSettleId}
        onBack={() => navigate('/')}
        onBet={handleRivalryBet}
        onSettle={handlePkSettle}
        onEnterBattle={handleEnterBattle}
      />
    </div>
  );
}
