import type { DailySettleSummary } from '@/hook/types';
import { formatBeijingDateTime, getDailySettleNetChange } from '@/utils/petHelpers';

interface AuthDailySettleCardProps {
  dailySettle?: DailySettleSummary | null;
  compact?: boolean;
}

function formatAmount(amount?: number) {
  if (typeof amount !== 'number') return '-';
  const sign = amount > 0 ? '+' : '';
  return `${sign}${amount.toLocaleString()}`;
}

export function AuthDailySettleCard({
  dailySettle,
  compact = false,
}: AuthDailySettleCardProps) {
  if (!dailySettle) return null;

  const items = dailySettle.items ?? [];
  const total = getDailySettleNetChange(items);

  return (
    <div className={`rounded-[24px] border border-emerald-500/18 bg-emerald-500/10 ${compact ? 'px-4 py-4' : 'px-5 py-4'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[13px] font-black text-white">今日结算</div>
          <div className="mt-1 text-[11px] text-emerald-100/80">{dailySettle.date}</div>
        </div>
        <div className="rounded-full bg-black/20 px-3 py-1 text-[11px] font-bold text-emerald-200">
          {dailySettle.alreadySettled ? '已结算' : '待结算'}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-emerald-100/85">
        <span className="rounded-full bg-black/20 px-2.5 py-1">登录连签 {dailySettle.streak?.loginStreak ?? 0} 天</span>
        <span className="rounded-full bg-black/20 px-2.5 py-1">宠物 Lv.{dailySettle.pet?.level ?? '-'}</span>
        <span className="rounded-full bg-black/20 px-2.5 py-1">净变动 {formatAmount(total)}</span>
      </div>

      {(typeof dailySettle.balanceBefore === 'number' || typeof dailySettle.balanceAfter === 'number') && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-[16px] bg-black/15 px-3 py-2">
            <div className="text-emerald-100/65">结算前余额</div>
            <div className="mt-1 text-[13px] font-black text-white">{typeof dailySettle.balanceBefore === 'number' ? dailySettle.balanceBefore.toLocaleString() : '-'}</div>
          </div>
          <div className="rounded-[16px] bg-black/15 px-3 py-2">
            <div className="text-emerald-100/65">结算后余额</div>
            <div className="mt-1 text-[13px] font-black text-white">{typeof dailySettle.balanceAfter === 'number' ? dailySettle.balanceAfter.toLocaleString() : '-'}</div>
          </div>
        </div>
      )}

      {items.length > 0 ? (
        <div className="mt-3 space-y-2">
          {items.slice(0, compact ? 3 : 4).map((item, index) => (
            <div key={`${item.type}-${index}`} className="flex items-center justify-between gap-3 rounded-[16px] bg-black/15 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-bold text-white">{item.desc || item.type}</div>
                <div className="mt-0.5 text-[10px] text-emerald-100/65">{item.type}</div>
              </div>
              <div className="shrink-0 text-[12px] font-black text-emerald-200">
                {formatAmount(item.amount)}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {dailySettle.pet?.petKey ? (
        <div className="mt-3 rounded-[16px] bg-black/15 px-3 py-2 text-[11px] text-emerald-100/75">
          当前结算宠物：{dailySettle.pet.petKey}
        </div>
      ) : null}

      {dailySettle.errorMsg ? (
        <div className="mt-3 rounded-[16px] border border-amber-400/18 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
          结算提示：{dailySettle.errorMsg}
          {dailySettle.errorCode ? ` (${dailySettle.errorCode})` : ''}
        </div>
      ) : null}

      {dailySettle.alreadySettled ? (
        <div className="mt-3 text-[10px] text-emerald-100/60">
          同一北京时间自然日只结算一次；重复登录会返回当日结算摘要。
        </div>
      ) : null}

      {!compact && (
        <div className="mt-2 text-[10px] text-emerald-100/55">
          展示时间：{formatBeijingDateTime(Date.now())}
        </div>
      )}
    </div>
  );
}
