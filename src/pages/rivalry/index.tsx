/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useCallback, useState } from 'react';
import { RivalryPK } from '@/components/shared/rivalry';

export default function RivalryPage() {
  const [userVotes, setUserVotes] = useState<Record<string, 'A' | 'B'>>({});

  const handleRivalryBet = useCallback((newsId: string, option: 'A' | 'B') => {
    setUserVotes((prev) => ({ ...prev, [newsId]: option }));
  }, []);

  return (
    <section className="view-shell view-rhythm view-rivalry mx-0 grid w-full max-w-none gap-4">
      <RivalryPK
        userVotes={userVotes}
        onBet={handleRivalryBet}
      />
    </section>
  );
}
