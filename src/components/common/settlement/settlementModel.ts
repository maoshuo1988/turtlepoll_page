/**
 * 文件说明：结算详情视图模型构建（暗盘 / 开撕台多状态）。
 */
import type { BattleDetailResponse } from '@/hooks/battleTypes';
import type { CoinSettleResult, PredictBet } from '@/hooks/coinTypes';
import type { PKSettleResponse, PKTopicDetailResponse } from '@/hooks/pkTypes';
import type { FootballMarketAggregate } from '@/hooks/predictionTypes';
import type {
  SettlementActionResult,
  SettlementCampSide,
  SettlementDetailViewModel,
  SettlementLeaderboardRow,
  SettlementRecordItem,
} from '@/hooks/settlementTypes';
import { SETTLEMENT_CAMP_COLORS } from './settlementCampColors';

function formatNumber(value: number) {
  return Math.max(0, Math.round(value)).toLocaleString('zh-CN');
}

function resolveMarketBetSide(item: FootballMarketAggregate): SettlementCampSide {
  const raw = item as FootballMarketAggregate & {
    bet?: PredictBet;
    myBet?: PredictBet;
    betOption?: string;
  };
  const option = String(raw.bet?.option ?? raw.myBet?.option ?? raw.betOption ?? '')
    .trim()
    .toUpperCase();
  if (option === 'A') return 'A';
  if (option === 'B') return 'B';
  if (option === 'DRAW' || option === 'C') return 'draw';
  return 'unknown';
}

function resolveBetFields(item: FootballMarketAggregate) {
  const raw = item as FootballMarketAggregate & {
    bet?: PredictBet;
    myBet?: PredictBet;
  };
  const bet = raw.bet ?? raw.myBet;
  return {
    side: resolveMarketBetSide(item),
    amount: bet?.amount ?? 0,
    odds: bet?.odds ?? 0,
    payout: bet?.payout ?? 0,
    settleResult: String(bet?.settleResult ?? '').toUpperCase(),
  };
}

function sideLabel(side: SettlementCampSide, optionA: string, optionB: string, drawText = '平局') {
  if (side === 'A') return optionA;
  if (side === 'B') return optionB;
  if (side === 'draw') return drawText;
  return '未选边';
}

function buildLeaderboardRows(params: {
  heatA: number;
  heatB: number;
  userSide: SettlementCampSide;
  userScore: number;
  userName: string;
  participatedHeat: boolean;
}): SettlementLeaderboardRow[] {
  const { heatA, heatB, userSide, userScore, participatedHeat } = params;
  const seeds: Array<{ name: string; side: SettlementCampSide }> = [
    { name: '深海蓝鲸', side: 'A' },
    { name: '龟王老陈', side: 'B' },
    { name: '破光杀手', side: 'A' },
    { name: '意见领袖', side: 'B' },
  ];
  const baseScores = [
    Math.round(Math.max(heatA, heatB) * 0.11),
    Math.round(Math.max(heatA, heatB) * 0.09),
    Math.round(Math.min(heatA, heatB) * 0.08),
    Math.round(Math.min(heatA, heatB) * 0.07),
  ];

  const rows: SettlementLeaderboardRow[] = seeds.slice(0, 4).map((seed, index) => ({
    rank: index + 1,
    name: seed.name,
    side: seed.side,
    score: baseScores[index] ?? 1000,
  }));

  if (participatedHeat && userSide !== 'unknown') {
    rows.push({
      rank: rows.length + 5,
      name: '我',
      side: userSide,
      score: userScore,
      isMe: true,
    });
  } else {
    rows.push({
      rank: 0,
      name: '我 (未参与)',
      side: 'unknown',
      score: 0,
      isMe: true,
    });
  }

  return rows;
}

export function buildCoinSettlementDetail(params: {
  record: SettlementRecordItem;
  market: FootballMarketAggregate;
  settleResult?: CoinSettleResult | SettlementActionResult | null;
  currentUserName?: string;
  participatedHeat?: boolean;
}): SettlementDetailViewModel {
  const { record, market, settleResult, currentUserName = '我', participatedHeat = false } = params;
  const context = market.context ?? {};
  const optionA = context.proText || '蓝方';
  const optionB = context.conText || '红方';
  const drawText = context.drawText || context.tieText || '平局';
  const heatA = context.proVoteCount ?? market.market.poolA ?? 0;
  const heatB = context.conVoteCount ?? market.market.poolB ?? 0;
  const totalHeat = Math.max(1, heatA + heatB);
  const heatLeftPct = Math.round((heatA / totalHeat) * 100);
  const winningHeatSide: SettlementCampSide = heatA >= heatB ? 'A' : 'B';
  const bet = resolveBetFields(market);
  const latestSettle =
    settleResult && 'list' in settleResult
      ? settleResult.list[settleResult.list.length - 1]
      : null;
  const betHit = Boolean(
    latestSettle?.bet?.settleResult === 'WIN' ||
      bet.settleResult === 'WIN' ||
      (settleResult && 'outcome' in settleResult && settleResult.outcome === 'win'),
  );
  const principal = latestSettle?.bet?.amount ?? bet.amount;
  const odds = latestSettle?.bet?.odds ?? bet.odds;
  const payout = latestSettle?.payout ?? bet.payout ?? (settleResult && 'payout' in settleResult ? settleResult.payout : 0);
  const userSide = bet.side;
  const userWonHeat = participatedHeat && userSide !== 'unknown' && userSide === winningHeatSide;
  const userLostHeat = participatedHeat && userSide !== 'unknown' && userSide !== winningHeatSide;
  const winningSideName = winningHeatSide === 'A' ? optionA : optionB;

  let headline = `热度对决 · ${winningHeatSide === 'A' ? '蓝方胜' : '红方胜'}`;
  let headlineAccent: 'pink' | 'white' = winningHeatSide === 'B' ? 'pink' : 'white';
  let description = `${optionA} vs ${optionB} · ${winningSideName}热度领先，瓜分热度奖励池。`;

  if (!participatedHeat) {
    headline = '本场已结算';
    headlineAccent = 'white';
    description = '你未参与热度对决，无阵营热度奖励；赛果下注照常结算。';
  } else if (userLostHeat && betHit) {
    headline = '热度对决 · 惜败';
    headlineAccent = 'white';
    description = '本方热度落后，无热度奖励；但你的赛果下注仍独立结算。';
  } else if (userLostHeat && !betHit) {
    headline = `热度对决 · ${winningHeatSide === 'B' ? '红方胜' : '蓝方胜'}`;
    headlineAccent = winningHeatSide === 'B' ? 'pink' : 'white';
    description = `${optionA} vs ${optionB} · 你押「${sideLabel(userSide, optionA, optionB, drawText)}」未命中，本金不返还。`;
  } else if (userWonHeat) {
    headline = `热度对决 · ${winningHeatSide === 'B' ? '红方胜' : '蓝方胜'}`;
    headlineAccent = winningHeatSide === 'B' ? 'pink' : 'white';
    description = `${optionA} vs ${optionB} · ${winningSideName}晋级。本场${winningHeatSide === 'B' ? '红' : '蓝'}方热度领先，瓜分热度奖励池。`;
  }

  const userScore = participatedHeat
    ? Math.max(120, Math.round((userSide === 'A' ? heatA : heatB) * 0.018))
    : 0;
  const heatRewardAmount = userWonHeat ? Math.max(0, Math.round(userScore * 1.28)) : 0;

  const betPanelTitle = record.sourceTab === 'arena'
    ? `开撕台下注${betHit ? '派奖 (命中赛果)' : '结算 (未命中)'}`
    : `暗盘下注结算${betHit ? '' : ' (未命中)'}`;

  const betOptionText = `${sideLabel(userSide, optionA, optionB, drawText)}`;

  return {
    record,
    eyebrow: '本场已结算',
    headline,
    headlineAccent,
    description,
    showHeatDuel: true,
    heatLeftValue: heatA,
    heatRightValue: heatB,
    heatLeftPct,
    heatBadge: !participatedHeat
      ? '未参与热度对决'
      : userWonHeat
        ? '赢得热度对决'
        : '输掉热度对决',
    heatBadgeTone: !participatedHeat ? 'gold' : userWonHeat ? 'pink' : 'grey',
    heatFootnote: !participatedHeat
      ? '你未参与热度对决（平局 / 未下注）'
      : userSide === 'A'
        ? '你在蓝方，本方热度' + (userWonHeat ? '领先' : '落后')
        : userSide === 'B'
          ? '你在红方，本方热度' + (userWonHeat ? '领先' : '落后')
          : '你未站队',
    showHeatReward: true,
    heatRewardAmount,
    heatRewardNote: userWonHeat ? `按你在${userSide === 'B' ? '红' : '蓝'}方的贡献占比发放` : '',
    heatRewardProgressPct: userWonHeat ? Math.min(100, Math.max(8, Math.round(userScore / 80))) : 0,
    heatRewardEmpty: !userWonHeat,
    heatRewardEmptyText: !participatedHeat
      ? '你未参与热度对决，不属于任何阵营。'
      : '本方热度落后，未瓜分奖励池。',
    showBetPanel: principal > 0 || record.status === 'pending',
    betPanelTitle: record.sourceTab === 'dark' && betHit
      ? '赛果下注派奖 (人人有 · 独立于热度奖励)'
      : betPanelTitle,
    betOptionLabel: betOptionText,
    betPrincipal: principal,
    betOdds: odds,
    betHit,
    betPayout: payout,
    betFootnote: betHit
      ? '赛果派奖按赔率独立结算，与热度对决结果无关。'
      : '赛果未命中，本金不返还；与热度结果相互独立。',
    showLeaderboard: true,
    leaderboardRows: buildLeaderboardRows({
      heatA,
      heatB,
      userSide,
      userScore,
      userName: currentUserName,
      participatedHeat,
    }),
    leaderboardSideLocked: !participatedHeat || userSide === 'unknown',
    userCampSide: userSide,
  };
}

export function buildBattleSettlementDetail(params: {
  record: SettlementRecordItem;
  detail: BattleDetailResponse;
  payout?: number;
  currentUserName?: string;
}): SettlementDetailViewModel {
  const { record, detail, payout = 0, currentUserName = '我' } = params;
  const { battle, myRole } = detail;
  const userSide: SettlementCampSide =
    myRole === 'banker' ? 'A' : myRole === 'challenger' ? 'B' : 'unknown';
  const bankerStake = battle.bankerStakeTotal ?? 0;
  const challengerStake = battle.challengerStakeTotal ?? 0;
  const totalHeat = Math.max(1, bankerStake + challengerStake);
  const heatLeftPct = Math.round((bankerStake / totalHeat) * 100);
  const winningHeatSide: SettlementCampSide = bankerStake >= challengerStake ? 'A' : 'B';
  const principal = Math.max(
    100,
    Math.round((myRole === 'banker' ? bankerStake : challengerStake) * 0.15) || 500,
  );
  const betHit = payout > 0;
  const odds = principal > 0 && payout > 0 ? Number((payout / principal).toFixed(1)) : 1.8;
  const participatedHeat = myRole !== 'none';
  const userWonHeat = participatedHeat && userSide === winningHeatSide;

  return {
    record,
    eyebrow: '本场已结算',
    headline: betHit ? '开撕台 · 命中赛果' : '开撕台 · 未命中',
    headlineAccent: betHit ? 'pink' : 'white',
    description: betHit
      ? `${battle.title} · 奖励已结算到账。`
      : `${battle.title} · 本场未获得派奖。`,
    showHeatDuel: true,
    heatLeftValue: bankerStake,
    heatRightValue: challengerStake,
    heatLeftPct,
    heatBadge: participatedHeat ? (userWonHeat ? '赢得热度对决' : '输掉热度对决') : '未参与热度对决',
    heatBadgeTone: participatedHeat ? (userWonHeat ? 'pink' : 'grey') : 'gold',
    heatFootnote: participatedHeat
      ? `你在${userSide === 'A' ? '庄家' : '挑战者'}阵营`
      : '你未参与本场对局',
    showHeatReward: participatedHeat,
    heatRewardAmount: userWonHeat ? Math.round(payout * 0.22) : 0,
    heatRewardNote: userWonHeat ? '按你在本场的贡献占比发放' : '',
    heatRewardProgressPct: userWonHeat ? 18 : 0,
    heatRewardEmpty: !userWonHeat,
    heatRewardEmptyText: '本方热度落后，未瓜分奖励池。',
    showBetPanel: true,
    betPanelTitle: `开撕台下注${betHit ? '派奖 (命中赛果)' : '结算 (未命中)'}`,
    betOptionLabel: userSide === 'A' ? battle.bankerSide : battle.challengerSide,
    betPrincipal: principal,
    betOdds: odds,
    betHit,
    betPayout: payout,
    betFootnote: betHit
      ? '开撕台派奖按对局结果独立结算。'
      : '赛果未命中，本金不返还；与热度结果相互独立。',
    showLeaderboard: true,
    leaderboardRows: buildLeaderboardRows({
      heatA: bankerStake,
      heatB: challengerStake,
      userSide,
      userScore: Math.round((userSide === 'A' ? bankerStake : challengerStake) * 0.05),
      userName: currentUserName,
      participatedHeat,
    }),
    leaderboardSideLocked: !participatedHeat,
    userCampSide: userSide,
  };
}

export function buildPkSettlementDetail(params: {
  record: SettlementRecordItem;
  topic: PKTopicDetailResponse;
  settleResult?: PKSettleResponse | SettlementActionResult | null;
  currentUserName?: string;
}): SettlementDetailViewModel {
  const { record, topic, settleResult, currentUserName = '我' } = params;
  const optionA = topic.topic?.sideAName || '蓝方';
  const optionB = topic.topic?.sideBName || '红方';
  const heatA = Number(topic.round?.heatA ?? 0);
  const heatB = Number(topic.round?.heatB ?? 0);
  const totalHeat = Math.max(1, heatA + heatB);
  const heatLeftPct = Math.round((heatA / totalHeat) * 100);
  const winner = settleResult && 'winner' in settleResult
    ? settleResult.winner
    : topic.leader === 'draw'
      ? 'draw'
      : topic.leader === 'B'
        ? 'B'
        : 'A';
  const winningHeatSide: SettlementCampSide =
    winner === 'draw' ? 'draw' : winner === 'B' ? 'B' : 'A';
  const mySideRaw = topic.mySide || topic.myBet?.side;
  const userSide: SettlementCampSide =
    mySideRaw === 'A' ? 'A' : mySideRaw === 'B' ? 'B' : 'unknown';
  const pkSettlement = settleResult && 'settlement' in settleResult ? settleResult.settlement : null;
  const principal = pkSettlement?.stakeAmount ?? topic.myBet?.amount ?? 0;
  const payout = pkSettlement?.payoutAmount ?? 0;
  const result = String(pkSettlement?.result ?? '').toLowerCase();
  const betHit = result === 'win' || payout > principal;
  const odds = principal > 0 && payout > 0 ? Number((payout / principal).toFixed(2)) : topic.myBet?.side === 'A' ? topic.oddsA ?? 1 : topic.oddsB ?? 1;
  const participatedHeat = userSide !== 'unknown';
  const userWonHeat = participatedHeat && userSide === winningHeatSide;
  const winningSideName =
    winningHeatSide === 'draw' ? '平局' : winningHeatSide === 'A' ? optionA : optionB;

  return {
    record,
    eyebrow: '开撕台 · 本局结算',
    headline: betHit ? '命中赛果 · 派奖到账' : result === 'draw' ? '平局 · 本金退回' : '未命中赛果',
    headlineAccent: betHit ? 'pink' : 'white',
    description: `${optionA} vs ${optionB} · ${winningSideName} 热度胜出，本局已结算。`,
    showHeatDuel: true,
    heatLeftValue: heatA,
    heatRightValue: heatB,
    heatLeftPct,
    heatBadge: participatedHeat ? (userWonHeat ? '赢得热度对决' : '输掉热度对决') : '未参与热度对决',
    heatBadgeTone: participatedHeat ? (userWonHeat ? 'pink' : 'grey') : 'gold',
    heatFootnote: participatedHeat
      ? `你在${userSide === 'A' ? optionA : optionB}阵营`
      : '你未参与本局热度对决',
    showHeatReward: participatedHeat,
    heatRewardAmount: userWonHeat ? Math.max(0, Math.round(payout * 0.15)) : 0,
    heatRewardNote: userWonHeat ? '按你在本局阵营的贡献占比发放' : '',
    heatRewardProgressPct: userWonHeat ? 24 : 0,
    heatRewardEmpty: !userWonHeat,
    heatRewardEmptyText: participatedHeat ? '本方热度落后，未瓜分奖励池。' : '你未参与热度对决，不属于任何阵营。',
    showBetPanel: principal > 0,
    betPanelTitle: betHit ? '开撕台下注派奖 (命中赛果)' : result === 'draw' ? '开撕台下注结算 (平局退回)' : '开撕台下注结算 (未命中)',
    betOptionLabel: userSide === 'A' ? optionA : userSide === 'B' ? optionB : '未选边',
    betPrincipal: principal,
    betOdds: odds,
    betHit,
    betPayout: payout,
    betFootnote: betHit
      ? '派奖已计入龟币余额。'
      : result === 'draw'
        ? '平局按规则原路退回本金。'
        : '赛果未命中，本金不返还。',
    showLeaderboard: true,
    leaderboardRows: buildLeaderboardRows({
      heatA,
      heatB,
      userSide,
      userScore: Math.round((userSide === 'A' ? heatA : heatB) * 0.05),
      userName: currentUserName,
      participatedHeat,
    }),
    leaderboardSideLocked: !participatedHeat,
    userCampSide: userSide,
  };
}

export function formatSettlementHeat(value: number) {
  return formatNumber(value);
}

export function campColor(side: SettlementCampSide) {
  return SETTLEMENT_CAMP_COLORS[side === 'draw' ? 'draw' : side === 'unknown' ? 'unknown' : side];
}
