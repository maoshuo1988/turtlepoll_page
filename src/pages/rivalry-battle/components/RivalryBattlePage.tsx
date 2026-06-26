/** 文件说明：开撕台撕裂带直播页展示组件。 */
import { AlertCircle } from 'lucide-react';
import { RivalryBattle } from './RivalryBattleLiveRoom';
import type { RivalryBattleNewsItem } from '../types';

interface RivalryBattlePageProps {
  battleNews: RivalryBattleNewsItem | null;
  userSide: 'A' | 'B' | null;
  isLoading: boolean;
  onBack: () => void;
  onRequireAuth: () => void;
}

export function RivalryBattlePage({
  battleNews,
  userSide,
  isLoading,
  onBack,
  onRequireAuth,
}: RivalryBattlePageProps) {
  if (isLoading) {
    return (
      <section className="w-full max-w-none min-h-full mx-0 grid content-start gap-4 max-lg:gap-3 place-items-center">
        <div className="rounded-2xl border border-white/8 bg-white/4 px-5 py-4 text-sm font-medium text-white/72">
          撕裂带加载中...
        </div>
      </section>
    );
  }

  if (!battleNews) {
    return (
      <section className="w-full max-w-none min-h-full mx-0 grid content-start gap-4 max-lg:gap-3 place-items-center">
        <div className="flex max-w-md flex-col items-center gap-3 rounded-3xl border border-white/8 bg-[#0b1018] px-6 py-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/6 text-white/72">
            <AlertCircle size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">当前场次不存在</h1>
            <p className="mt-2 text-sm leading-6 text-white/60">请从开撕台列表重新进入这场撕裂带。</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="mt-1 inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 text-sm font-semibold text-white/84 transition-colors hover:bg-white/10"
          >
            返回列表
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="view-rivalry-battle mx-0 grid h-full min-h-0 w-full max-w-none gap-0">
      <RivalryBattle
        news={battleNews}
        onBack={onBack}
        userSide={userSide}
        onRequireAuth={onRequireAuth}
      />
    </section>
  );
}
