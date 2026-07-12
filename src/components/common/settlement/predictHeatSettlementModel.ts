/**
 * 文件说明：暗盘结算页热度数据映射（对接 /api/predict/heat、/heat/me、/heat/rank）。
 */
import type {
  PredictCommentRewardLog,
  PredictHeatMeResponse,
  PredictHeatRankItem,
  PredictHeatResponse,
} from '@/hooks/predictionTypes';
import type { SettlementCampSide, SettlementLeaderboardRow } from '@/hooks/settlementTypes';

export type PredictHeatSideValues = {
  A: number;
  B: number;
  DRAW: number;
};

export function resolveHeatByOption(heat?: PredictHeatResponse | null): PredictHeatSideValues {
  const options = heat?.options ?? [];
  const findHeat = (option: string) =>
    options.find((item) => String(item.option ?? '').toUpperCase() === option)?.hTotal ?? 0;
  return {
    A: findHeat('A'),
    B: findHeat('B'),
    DRAW: findHeat('DRAW'),
  };
}

export function resolveWinningSideFromLeader(leaderOption?: string): SettlementCampSide {
  const normalized = String(leaderOption ?? '').trim().toUpperCase();
  if (normalized === 'A') return 'A';
  if (normalized === 'B') return 'B';
  if (normalized === 'DRAW' || normalized === 'C') return 'draw';
  return 'unknown';
}

export function resolveCampSideFromOption(option?: string): SettlementCampSide {
  return resolveWinningSideFromLeader(option);
}

export function resolveHeatPct(left: number, right: number) {
  const total = Math.max(1, left + right);
  return Math.round((left / total) * 100);
}

export function hasHeatParticipation(heatMe?: PredictHeatMeResponse | null) {
  if (!heatMe) return false;
  return (
    (heatMe.myHeat ?? 0) > 0 ||
    (heatMe.myCommentCount ?? 0) > 0 ||
    (heatMe.myActionCount ?? 0) > 0 ||
    Boolean(heatMe.myOption)
  );
}

export function mapHeatRankToLeaderboardRows(
  list: PredictHeatRankItem[] | undefined,
  heatMe?: PredictHeatMeResponse | null,
  currentUserName = '我',
): SettlementLeaderboardRow[] {
  const rows = (list ?? []).slice(0, 8).map((item, index) => ({
    rank: item.rank ?? index + 1,
    name: item.nickname || `用户 ${item.userId ?? index + 1}`,
    side: resolveCampSideFromOption(item.option),
    score: Math.round(item.totalHeat ?? 0),
    isMe: heatMe?.userId != null && item.userId != null && Number(item.userId) === Number(heatMe.userId),
  }));

  if (heatMe && !rows.some((row) => row.isMe)) {
    const mySide = resolveCampSideFromOption(heatMe.myOption);
    rows.push({
      rank: heatMe.myRank ?? rows.length + 1,
      name: currentUserName,
      side: mySide,
      score: Math.round(heatMe.myHeat ?? 0),
      isMe: true,
    });
  }

  return rows.length
    ? rows
    : [
        {
          rank: 0,
          name: '我 (未参与)',
          side: 'unknown' as SettlementCampSide,
          score: 0,
          isMe: true,
        },
      ];
}

export function resolveTearRewardAmount(rewardLog?: PredictCommentRewardLog | null) {
  if (typeof rewardLog?.perUserReward === 'number') return Math.max(0, rewardLog.perUserReward);
  return 0;
}

export function formatTearRemainLabel(remainSeconds?: number) {
  if (remainSeconds == null || remainSeconds <= 0) return '即将截止';
  if (remainSeconds < 3600) return `${Math.ceil(remainSeconds / 60)} 分钟内领取`;
  if (remainSeconds < 86400) return `${Math.ceil(remainSeconds / 3600)} 小时内领取`;
  return `${Math.ceil(remainSeconds / 86400)} 天内领取`;
}

export function formatWinnerOptionLabel(
  winnerOption?: string,
  optionA = '蓝方',
  optionB = '红方',
  drawText = '平局',
) {
  const side = resolveWinningSideFromLeader(winnerOption);
  if (side === 'A') return optionA;
  if (side === 'B') return optionB;
  if (side === 'draw') return drawText;
  return winnerOption || '—';
}
