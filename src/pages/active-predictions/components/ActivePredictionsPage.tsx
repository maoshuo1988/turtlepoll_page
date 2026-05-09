/**
 * 文件说明：Active Predictions Page，预测市场和撕裂带页面组件。
 */
import React from 'react';
import { ArrowLeft, Clock3, Flame, Swords } from 'lucide-react';
import type { PredictionCardItem } from './predictionCards';

interface ActivePredictionsPageProps {
  items: PredictionCardItem[];
  onBack: () => void;
  onEnterBattle: (newsId: string) => void;
}

const WARNING_WINDOW_MS = 10 * 60 * 1000;

function normalizeCloseTime(closeTime?: number) {
  if (typeof closeTime !== 'number' || closeTime <= 0) return null;
  return String(closeTime).length <= 10 ? closeTime * 1000 : closeTime;
}

function formatRemaining(ms: number) {
  if (ms <= 0) return '即将封盘';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor(totalSeconds / 3600);
  const displayHours = days > 0 ? Math.floor((totalSeconds % 86400) / 3600) : hours;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}天 ${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export const ActivePredictionsPage: React.FC<ActivePredictionsPageProps> = ({
  items,
  onBack,
  onEnterBattle,
}) => {
  const [now, setNow] = React.useState(() => Date.now());
  const fallbackBaseTimeRef = React.useRef(Date.now());
  const fallbackCloseTimesRef = React.useRef(new Map<string, number>());

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const closeTimes = React.useMemo(() => {
    const activeIds = new Set(items.map((item) => item.id));

    fallbackCloseTimesRef.current.forEach((_, id) => {
      if (!activeIds.has(id)) {
        fallbackCloseTimesRef.current.delete(id);
      }
    });

    return items.map((item, index) => {
      const normalized = normalizeCloseTime(item.closeTime);
      if (normalized) {
        fallbackCloseTimesRef.current.set(item.id, normalized);
        return normalized;
      }

      const existingFallback = fallbackCloseTimesRef.current.get(item.id);
      if (existingFallback) {
        return existingFallback;
      }

      const fallback = fallbackBaseTimeRef.current + (index + 1) * 20 * 60 * 1000;
      fallbackCloseTimesRef.current.set(item.id, fallback);
      return fallback;
    });
  }, [items]);

  return (
    <section className="grid w-full gap-4">
      <div className="page-card px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="page-icon-button"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold tracking-[0.16em] text-zinc-500">LIVE BATTLES</div>
            <div className="mt-1 text-sm font-semibold text-zinc-300">可进入市场会按封盘时间持续刷新</div>
          </div>
          <div className="page-primary-button min-w-[72px]">
            {items.length} 场
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[24px] border border-white/8 bg-[#0f1013] px-5 py-10 text-center text-zinc-500">
          当前没有可进入的进行中对局。
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item, index) => {
            const closeTime = closeTimes[index];
            const remainingMs = closeTime - now;
            const urgent = remainingMs > 0 && remainingMs <= WARNING_WINDOW_MS;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onEnterBattle(item.id)}
                className="group relative overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#121316_0%,#0b0c0f_100%)] px-4 py-4 text-left shadow-[0_18px_36px_rgba(0,0,0,0.22)] transition-all hover:border-white/14 hover:bg-[linear-gradient(180deg,#15171b_0%,#0d0f12_100%)]"
              >
                <div className="absolute inset-y-0 left-0 w-1 rounded-full bg-gradient-to-b from-cyan-400 via-emerald-400 to-amber-300 opacity-80" />
                <div className="flex items-start justify-between gap-4 pl-3">
                  <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-zinc-400">
                      <Flame size={12} className="text-orange-400" />
                      {item.optionA} vs {item.optionB}
                    </div>
                    <h3 className="mt-3 line-clamp-2 text-[17px] font-black leading-6 tracking-[-0.02em] text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-zinc-500">{item.summary}</p>
                  </div>

                  <div className="shrink-0 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-right">
                    <div className="text-[11px] text-zinc-500">当前赔率</div>
                    <div className="mt-1 text-[16px] font-black text-white">{Math.max(item.oddsA, item.oddsB).toFixed(1)}x</div>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3 pl-3">
                  <div
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-bold ${
                      urgent
                        ? 'border-rose-400/30 bg-rose-500/10 text-rose-300'
                        : 'border-white/10 bg-white/[0.04] text-zinc-300'
                    }`}
                  >
                    <Clock3 size={14} />
                    倒计时 {formatRemaining(remainingMs)}
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/12 px-3 py-1.5 text-[12px] font-bold text-emerald-300 transition-colors group-hover:bg-emerald-500/18">
                    <Swords size={14} />
                    进入对局
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
