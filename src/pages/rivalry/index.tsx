/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useCallback, useState } from 'react';
import { useRequestPKBet } from '@/hooks/usePkRequests';
import { useHomeLayoutContext } from '@/layouts/context';
import { getAuthToken } from '@/utils/authStorage';
import { RivalryPageView } from './components/RivalryPageView';

function createRequestId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function RivalryPage() {
  const [userVotes, setUserVotes] = useState<Record<string, 'A' | 'B'>>({});
  const [betError, setBetError] = useState<string | null>(null);
  const [pendingBetId, setPendingBetId] = useState<string | null>(null);
  const pkBetMutation = useRequestPKBet();
  const { onOpenAuth } = useHomeLayoutContext();

  const handleRivalryBet = useCallback(async (newsId: string, option: 'A' | 'B', _odds: number, amount?: number) => {
    setBetError(null);

    if (!getAuthToken()) {
      onOpenAuth();
      return;
    }

    if (newsId.startsWith('pk-')) {
      setUserVotes((prev) => ({ ...prev, [newsId]: option }));
      return;
    }

    try {
      setPendingBetId(newsId);
      await pkBetMutation.mutateAsync({
        topicId: newsId,
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
  }, [onOpenAuth, pkBetMutation]);

  return (
    <div className="pt-[10px]">
      <RivalryPageView
        userVotes={userVotes}
        betError={betError}
        pendingBetId={pendingBetId}
        onBet={handleRivalryBet}
      />
    </div>
  );
}
