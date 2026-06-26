/** 文件说明：开撕台撕裂带右侧栏（热度榜、下注面板、我的贡献）。 */
import React from 'react';
import { Flame, Lock, Shield, Trophy } from 'lucide-react';
import type { PKMyBetRecord } from '@/hooks/pkTypes';
import type { RivalryBattleTheme } from './rivalryBattleThemes';

type CommentSide = 'A' | 'B';

export type RivalryBattleRankRow = {
  id: string;
  name: string;
  avatar: string;
  rank: number | null;
  score: number;
  side: CommentSide;
};

export type RivalryBattleRightRailProps = {
  optionA: string;
  optionB: string;
  oddsA: number;
  oddsB: number;
  balance: number;
  betAmount: string;
  quickAmounts: number[];
  hasPkBet: boolean;
  myBetSide?: CommentSide;
  pkBetAmount: number;
  pkPhase?: string;
  canPlaceBet: boolean;
  isBetting: boolean;
  estimatedPayout: number;
  rankMode: 'all' | 'side';
  onRankModeChange: (mode: 'all' | 'side') => void;
  rankRows: RivalryBattleRankRow[];
  rankLoading?: boolean;
  personalStats: {
    likeCount: number;
    commentCount: number;
    betAmount: number;
    heatScore: number;
    side?: CommentSide | null;
  };
  visualTheme: RivalryBattleTheme;
  onBetAmountChange: (value: string) => void;
  onQuickAmount: (amount: number) => void;
  onOpenBet: (side: CommentSide) => void;
  onConfirmBet?: () => void;
  canPkSettle?: boolean;
  isSettling?: boolean;
  onSettle?: () => void;
  myBetRecords?: PKMyBetRecord[];
  myBetsLoading?: boolean;
  className?: string;
};

function formatVotes(value: number) {
  return Math.max(0, Math.round(value)).toLocaleString('zh-CN');
}

function formatOdds(odds: number) {
  if (!Number.isFinite(odds) || odds <= 0) return '--';
  return `${odds.toFixed(1)}x`;
}

function sideColor(theme: RivalryBattleTheme, side: CommentSide) {
  return side === 'A' ? theme.sideA.accent : theme.sideB.accent;
}

// 我的下注记录：暂时隐藏，恢复时取消注释
// function settleResultLabel(result?: string) {
//   if (result === 'win') return '已赢';
//   if (result === 'lose') return '已输';
//   if (result === 'draw') return '平局';
//   return '待结算';
// }

function sideName(optionA: string, optionB: string, side?: CommentSide | null) {
  if (side === 'A') return optionA;
  if (side === 'B') return optionB;
  return '未选边';
}

export const RivalryBattleRightRail: React.FC<RivalryBattleRightRailProps> = ({
  optionA,
  optionB,
  oddsA,
  oddsB,
  balance,
  betAmount,
  quickAmounts,
  hasPkBet,
  myBetSide,
  pkBetAmount,
  pkPhase,
  canPlaceBet,
  isBetting,
  estimatedPayout,
  rankMode,
  onRankModeChange,
  rankRows,
  rankLoading,
  personalStats,
  visualTheme,
  onBetAmountChange,
  onQuickAmount,
  onOpenBet,
  onConfirmBet,
  canPkSettle,
  isSettling,
  onSettle,
  // myBetRecords = [],
  // myBetsLoading,
  className = '',
}) => {
  const isBettingOpen = pkPhase === 'betting';
  const sideLocked = hasPkBet && (myBetSide === 'A' || myBetSide === 'B');
  const activeSide = sideLocked ? myBetSide : undefined;
  const activeOption = activeSide === 'A' ? optionA : activeSide === 'B' ? optionB : '';
  const activeOdds = activeSide === 'A' ? oddsA : activeSide === 'B' ? oddsB : 0;
  const activeColor = activeSide ? sideColor(visualTheme, activeSide) : undefined;

  return (
    <div className={`rb-right-rail ${className}`.trim()}>
      <section className="rb-right-card rb-right-rank-card">
        <div className="rb-right-card-head">
          <div className="rb-right-card-title">
            <Trophy size={16} />
            <span>热度贡献榜</span>
          </div>
          <div className="rb-right-rank-tabs" role="tablist" aria-label="切换热度榜">
            <button
              type="button"
              role="tab"
              aria-selected={rankMode === 'all'}
              className={rankMode === 'all' ? 'active' : ''}
              onClick={() => onRankModeChange('all')}
            >
              总榜
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={rankMode === 'side'}
              className={rankMode === 'side' ? 'active' : ''}
              disabled={!hasPkBet}
              onClick={() => {
                if (!hasPkBet) return;
                onRankModeChange('side');
              }}
            >
              本方榜
              {!hasPkBet ? <Lock size={12} /> : null}
            </button>
          </div>
        </div>
        {!hasPkBet ? <p className="rb-right-rank-hint">选边后解锁本方榜</p> : null}
        <div className="rb-right-rank-list">
          {rankLoading ? (
            <div className="rb-right-empty">榜单加载中...</div>
          ) : rankRows.length === 0 ? (
            <div className="rb-right-empty">暂无热度贡献数据</div>
          ) : (
            rankRows.slice(0, 8).map((item, index) => (
              <div
                key={item.id}
                className="rb-right-rank-item"
                style={{ ['--rank-side-color' as string]: sideColor(visualTheme, item.side) }}
              >
                <i>{item.rank ?? index + 1}</i>
                <img src={item.avatar} alt={item.name} />
                <b>{item.name}</b>
                <strong>
                  <Flame size={12} />
                  {formatVotes(item.score)}
                </strong>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rb-right-card rb-right-bet-card">
        <div className="rb-right-card-head">
          <div className="rb-right-card-title">
            <span>下注面板</span>
            {isBettingOpen ? (
              <span className={`rb-right-status-pill ${sideLocked ? 'is-locked' : 'is-open'}`}>
                {sideLocked ? `已下注 · ${activeOption}` : '开放下注'}
              </span>
            ) : (
              <span className="rb-right-status-pill is-paused">已暂停</span>
            )}
          </div>
          <span className="rb-right-balance">余额 {formatVotes(balance)}</span>
        </div>

        <p className="rb-right-bet-desc">{optionA} vs {optionB} · 二选一</p>

        {sideLocked && activeSide ? (
          <div className="rb-right-bet-locked">
            <div
              className="rb-right-bet-single is-readonly"
              style={{ backgroundColor: activeColor, borderColor: activeColor }}
            >
              <span>已支持 {activeOption}</span>
              <em>{formatOdds(activeOdds)}</em>
            </div>
            <p className="rb-right-bet-note">
              已投入 {formatVotes(pkBetAmount)} 龟币支持「{activeOption}」
              {estimatedPayout > 0 ? `，预计派奖 ${formatVotes(estimatedPayout)}` : ''}
              。本局仅可下注一次。
            </p>
          </div>
        ) : (
          <div className="rb-right-bet-open">
            <div className="rb-right-bet-options">
              <button
                type="button"
                className="rb-right-bet-option"
                style={{ borderColor: sideColor(visualTheme, 'A'), color: sideColor(visualTheme, 'A') }}
                disabled={!canPlaceBet || isBetting}
                onClick={() => onOpenBet('A')}
              >
                <span>{optionA}</span>
                <em>{formatOdds(oddsA)}</em>
              </button>
              <button
                type="button"
                className="rb-right-bet-option"
                style={{ borderColor: sideColor(visualTheme, 'B'), color: sideColor(visualTheme, 'B') }}
                disabled={!canPlaceBet || isBetting}
                onClick={() => onOpenBet('B')}
              >
                <span>{optionB}</span>
                <em>{formatOdds(oddsB)}</em>
              </button>
            </div>
            <div className="rb-right-quick-amounts">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={Number(betAmount) === amount ? 'active' : ''}
                  onClick={() => onQuickAmount(amount)}
                  disabled={!canPlaceBet}
                >
                  {formatVotes(amount)}
                </button>
              ))}
            </div>
            <label className="rb-right-bet-input">
              <input
                value={betAmount}
                inputMode="numeric"
                placeholder="输入下注龟币数量"
                disabled={!canPlaceBet}
                onChange={(event) => onBetAmountChange(event.target.value.replace(/[^\d]/g, ''))}
              />
              <span>龟币</span>
            </label>
            <button
              type="button"
              className="rb-right-bet-confirm"
              disabled={!canPlaceBet || isBetting}
              onClick={() => onConfirmBet?.()}
            >
              {isBetting ? '下注中...' : '确认下注'}
            </button>
          </div>
        )}
      </section>

      {canPkSettle ? (
        <section className="rb-right-card">
          <div className="rb-right-card-title">
            <Trophy size={16} />
            <span>本局结算</span>
          </div>
          <p className="rb-right-bet-note">回合已结束，可领取本局结算与派奖。</p>
          <button
            type="button"
            className="rb-right-bet-confirm"
            disabled={isSettling}
            onClick={() => onSettle?.()}
          >
            {isSettling ? '结算中...' : '领取结算'}
          </button>
        </section>
      ) : null}

      <section className="rb-right-card rb-right-me-card">
        <div className="rb-right-card-title">
          <Shield size={16} />
          <span>我的贡献</span>
          {personalStats.side ? (
            <em style={{ color: sideColor(visualTheme, personalStats.side) }}>
              {sideName(optionA, optionB, personalStats.side)}
            </em>
          ) : null}
        </div>
        <div className="rb-right-me-stats">
          <div>
            <span>收到的点赞</span>
            <strong>{formatVotes(personalStats.likeCount)}</strong>
          </div>
          <div>
            <span>评论数</span>
            <strong>{formatVotes(personalStats.commentCount)}</strong>
          </div>
          <div>
            <span>下注总额</span>
            <strong>{formatVotes(personalStats.betAmount)}</strong>
          </div>
          <div>
            <span>我贡献的热度</span>
            <strong>{formatVotes(personalStats.heatScore)}</strong>
          </div>
        </div>
      </section>

      {/* 我的下注记录：暂时隐藏，恢复时取消本段注释
      <section className="rb-right-card rb-right-bets-card">
        <div className="rb-right-card-title">
          <Trophy size={16} />
          <span>我的下注记录</span>
        </div>
        {myBetsLoading ? (
          <div className="rb-right-empty">下注记录加载中...</div>
        ) : myBetRecords.length === 0 ? (
          <div className="rb-right-empty">暂无下注记录</div>
        ) : (
          <div className="rb-right-bets-list">
            {myBetRecords.slice(0, 5).map((item) => {
              const bet = item.bet;
              const topic = item.topic;
              const round = item.round;
              const side = bet?.side === 'B' ? 'B' : bet?.side === 'A' ? 'A' : undefined;
              const sideLabel = sideName(topic?.sideAName || optionA, topic?.sideBName || optionB, side);
              return (
                <div
                  key={String(bet?.id ?? `${topic?.id}-${round?.id}`)}
                  className="rb-right-bet-record"
                  style={side ? { ['--rank-side-color' as string]: sideColor(visualTheme, side) } : undefined}
                >
                  <b>{topic?.title || '开撕话题'}</b>
                  <span>
                    第 {round?.roundNo ?? '--'} 局 · {sideLabel} · {formatVotes(bet?.amount ?? 0)} 龟币
                  </span>
                  <em>{settleResultLabel(bet?.settleResult)}{bet?.payout ? ` · 派奖 ${formatVotes(bet.payout)}` : ''}</em>
                </div>
              );
            })}
          </div>
        )}
      </section>
      */}
    </div>
  );
};
