/** 文件说明：Event Battle 主容器，负责评论、下注、火力值和战场状态编排。 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Zap, Lock, ChevronLeft, MessageSquareText, Coins, Trophy, Clock3, ChevronDown, ChevronUp } from 'lucide-react';
import { BattleReport } from '../BattleReport';
import { useRequestUserCurrent } from '@/hooks/useAuthRequests';
import { useRequestCommentComments, useRequestCreateComment } from '@/hooks/useCommentRequests';
import { useRequestCoinMe } from '@/hooks/useCoinRequests';
import {
  ActionFxBurst,
  BattleDanmu,
  BattleHeader,
  BattleTicker,
  DynamicDivider,
  ENTITY_PREDICT_A,
  ENTITY_PREDICT_B,
  IDLE_LINES,
  IdleArenaFx,
  KoFlash,
  LC,
  RC,
  SideColumn,
  calcPower,
  card,
  css,
  getEventBattleStatusMeta,
  hasValue,
  kf,
  mapCommentToBattleComment,
  randomBattleGain,
  type BattleComment,
  type BattleFx,
  type CommentSide,
  type EventBattleProps,
  type KoFx,
  type LatestReplyEvent,
} from './EventBattleShared';

export const EventBattle: React.FC<EventBattleProps> = ({ news, onBack, userSide, onBet, bettingMarketId, equippedSkin }) => {
  const battleEntityId = useMemo(() => news.marketId ?? news.id, [news.id, news.marketId]);
  const currentUserQuery = useRequestUserCurrent();
  const coinMeQuery = useRequestCoinMe();
  const createCommentMutation = useRequestCreateComment();
  const [cursorA, setCursorA] = useState<number | string>(0);
  const [cursorB, setCursorB] = useState<number | string>(0);
  const [commentsAState, setCommentsAState] = useState<BattleComment[]>([]);
  const [commentsBState, setCommentsBState] = useState<BattleComment[]>([]);
  const commentsAQuery = useRequestCommentComments({
    entityType: ENTITY_PREDICT_A,
    entityId: battleEntityId,
    cursor: cursorA,
    enabled: hasValue(battleEntityId),
  });
  const commentsBQuery = useRequestCommentComments({
    entityType: ENTITY_PREDICT_B,
    entityId: battleEntityId,
    cursor: cursorB,
    enabled: hasValue(battleEntityId),
  });
  const [selectedSide, setSelectedSide] = useState<CommentSide>(userSide ?? 'A');
  const [inputText, setInputText] = useState('');
  const [pulse, setPulse] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string; side: CommentSide } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [stompedSet, setStompedSet] = useState<Set<string>>(new Set());
  const [poopAnims, setPoopAnims] = useState<{ id: string; commentId: string }[]>([]);
  const [battleFx, setBattleFx] = useState<BattleFx[]>([]);
  const [danmu, setDanmu] = useState<{ id: string; side: CommentSide; text: string; row: number; duration: number }[]>([]);
  const [comboA, setComboA] = useState(0);
  const [comboB, setComboB] = useState(0);
  const [koFx, setKoFx] = useState<KoFx | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  const [latestReplyEvent, setLatestReplyEvent] = useState<LatestReplyEvent | null>(null);
  const [betIntent, setBetIntent] = useState<CommentSide>(userSide ?? 'A');
  const [betAmount, setBetAmount] = useState('100');
  const [showBetPanel, setShowBetPanel] = useState(false);
  const hasBetAction = typeof onBet === 'function';
  const canComment = Boolean(currentUserQuery.data?.id);
  const statusMeta = useMemo(() => getEventBattleStatusMeta(news), [news]);
  const canPlaceBet = hasBetAction && news.status === 'open' && !news.hasBet;
  const isBetting = typeof news.marketId === 'number' && bettingMarketId === news.marketId;
  const activeBetLabel = betIntent === 'A' ? news.optionA : news.optionB;
  const activeBetOdds = betIntent === 'A' ? news.oddsA : news.oddsB;
  const balance = coinMeQuery.data?.balance ?? 0;
  const numericBetAmount = Number(betAmount);
  const estimatedPayout = Number.isFinite(numericBetAmount) && numericBetAmount > 0
    ? Math.floor(numericBetAmount * activeBetOdds)
    : 0;

  const scrollA = useRef<HTMLDivElement>(null);
  const scrollB = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const comboTimerA = useRef<number | null>(null);
  const comboTimerB = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);

  const commentsA = commentsAState;
  const commentsB = commentsBState;
  const leftPower = useMemo(() => calcPower(commentsA), [commentsA]);
  const rightPower = useMemo(() => calcPower(commentsB), [commentsB]);
  const leftSuccess = useMemo(
    () => commentsA.reduce((sum, c) => sum + c.likes + c.replyCount * 2, 0),
    [commentsA],
  );
  const rightSuccess = useMemo(
    () => commentsB.reduce((sum, c) => sum + c.likes + c.replyCount * 2, 0),
    [commentsB],
  );
  const leftFail = useMemo(
    () => commentsA.reduce((sum, c) => sum + (c.dislikes ?? 0), 0),
    [commentsA],
  );
  const rightFail = useMemo(
    () => commentsB.reduce((sum, c) => sum + (c.dislikes ?? 0), 0),
    [commentsB],
  );

  const totalPower = leftPower + rightPower;
  const splitPct = totalPower > 0 ? (leftPower / totalPower) * 100 : 50;
  const reportCommentsA = useMemo(
    () => commentsA.map((comment) => ({
      id: comment.id,
      newsId: news.id,
      side: comment.side,
      author: comment.author,
      content: comment.content,
      time: comment.time,
      likes: comment.likes,
      dislikes: comment.dislikes,
      replies: [],
      eggStatus: 'egg' as const,
      posX: 0,
      posY: 0,
    })),
    [commentsA, news.id],
  );
  const reportCommentsB = useMemo(
    () => commentsB.map((comment) => ({
      id: comment.id,
      newsId: news.id,
      side: comment.side,
      author: comment.author,
      content: comment.content,
      time: comment.time,
      likes: comment.likes,
      dislikes: comment.dislikes,
      replies: [],
      eggStatus: 'egg' as const,
      posX: 0,
      posY: 0,
    })),
    [commentsB, news.id],
  );

  useEffect(() => {
    setCursorA(0);
    setCursorB(0);
    setCommentsAState([]);
    setCommentsBState([]);
    setReplyingTo(null);
    setReplyText('');
    setBetIntent(userSide ?? 'A');
    setSelectedSide(userSide ?? 'A');
    setBetAmount('100');
  }, [battleEntityId, news.id]);

  useEffect(() => {
    if (userSide) {
      setBetIntent(userSide);
      setSelectedSide(userSide);
    }
  }, [userSide]);

  useEffect(() => {
    const mapped = (commentsAQuery.data?.results ?? []).map((item) => mapCommentToBattleComment(item, 'A'));
    if (mapped.length === 0) {
      if (cursorA === 0) setCommentsAState([]);
      return;
    }
    setCommentsAState((prev) => {
      const map = new Map<string, BattleComment>();
      (cursorA === 0 ? mapped : [...prev, ...mapped]).forEach((item) => map.set(item.id, item));
      return Array.from(map.values());
    });
  }, [commentsAQuery.data, cursorA]);

  useEffect(() => {
    const mapped = (commentsBQuery.data?.results ?? []).map((item) => mapCommentToBattleComment(item, 'B'));
    if (mapped.length === 0) {
      if (cursorB === 0) setCommentsBState([]);
      return;
    }
    setCommentsBState((prev) => {
      const map = new Map<string, BattleComment>();
      (cursorB === 0 ? mapped : [...prev, ...mapped]).forEach((item) => map.set(item.id, item));
      return Array.from(map.values());
    });
  }, [commentsBQuery.data, cursorB]);

  const firePulse = useCallback(() => {
    setPulse(true);
    setShakeKey((k) => k + 1);
    const t = setTimeout(() => setPulse(false), 500);
    return () => clearTimeout(t);
  }, []);

  const scheduleIdle = useCallback(() => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => setIsIdle(true), 4500);
  }, []);

  const markAction = useCallback(() => {
    setIsIdle(false);
    scheduleIdle();
  }, [scheduleIdle]);

  const triggerCombo = useCallback(
    (side: CommentSide) => {
      const timerRef = side === 'A' ? comboTimerA : comboTimerB;
      const setter = side === 'A' ? setComboA : setComboB;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      setter((prev) => {
        const next = Math.min(prev + 1, 12);
        if (next >= 5) {
          const color = side === 'A' ? LC : RC;
          const sideName = side === 'A' ? news.optionA : news.optionB;
          const koId = `ko-${Date.now()}-${side}`;
          setKoFx({ id: koId, color, text: `${sideName} ${next} 连击暴走` });
          window.setTimeout(() => setKoFx((f) => (f?.id === koId ? null : f)), 950);
        }
        return next;
      });
      timerRef.current = window.setTimeout(() => setter(0), 2600);
    },
    [news.optionA, news.optionB],
  );

  const pushFx = useCallback((side: CommentSide, type: BattleFx['type'], trigger = true) => {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setBattleFx((prev) => [...prev.slice(-7), { id, side, type }]);
    if (trigger) triggerCombo(side);
    setTimeout(() => {
      setBattleFx((prev) => prev.filter((f) => f.id !== id));
    }, 1000);
  }, [triggerCombo]);

  const pushDanmu = useCallback((side: CommentSide, text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const id = `danmu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = 72 + Math.random() * 24;
    setDanmu((prev) => [...prev.slice(-8), { id, side, text: clean.slice(0, 24), row: Math.floor(Math.random() * 3), duration }]);
    setTimeout(() => {
      setDanmu((prev) => prev.filter((d) => d.id !== id));
    }, duration * 1000 + 1200);
  }, []);

  useEffect(
    () => () => {
      if (comboTimerA.current) window.clearTimeout(comboTimerA.current);
      if (comboTimerB.current) window.clearTimeout(comboTimerB.current);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    scheduleIdle();
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [scheduleIdle]);

  useEffect(() => {
    if (!isIdle) return;
    const idleIv = window.setInterval(() => {
      const side: CommentSide = Math.random() > 0.5 ? 'A' : 'B';
      const line = IDLE_LINES[Math.floor(Math.random() * IDLE_LINES.length)];
      pushFx(side, Math.random() > 0.5 ? 'like' : 'reply', false);
      pushDanmu(side, `${line} · ${side === 'A' ? news.optionA : news.optionB}`);
      firePulse();
    }, 2200);
    return () => window.clearInterval(idleIv);
  }, [isIdle, news.optionA, news.optionB, pushFx, pushDanmu, firePulse]);

  const handleLike = useCallback(
    (id: string) => {
      markAction();
      const gain = randomBattleGain();
      setCommentsAState((prev) => prev.map((c) => (c.id === id ? { ...c, likes: c.likes + gain } : c)));
      setCommentsBState((prev) => prev.map((c) => (c.id === id ? { ...c, likes: c.likes + gain } : c)));
      firePulse();
    },
    [firePulse, markAction],
  );

  const handleStomp = useCallback(
    (id: string) => {
      if (stompedSet.has(id)) return;
      markAction();
      const gain = randomBattleGain();
      setStompedSet((prev) => new Set(prev).add(id));
      setCommentsAState((prev) => prev.map((c) => (c.id === id ? { ...c, dislikes: (c.dislikes ?? 0) + gain } : c)));
      setCommentsBState((prev) => prev.map((c) => (c.id === id ? { ...c, dislikes: (c.dislikes ?? 0) + gain } : c)));
      const animId = `poop-${Date.now()}`;
      setPoopAnims((prev) => [...prev, { id: animId, commentId: id }]);
      setTimeout(() => setPoopAnims((prev) => prev.filter((a) => a.id !== animId)), 1200);
      firePulse();
    },
    [firePulse, stompedSet, markAction],
  );

  const handleReply = useCallback((commentId: string, authorName: string) => {
    markAction();
    const side = commentsA.some((comment) => comment.id === commentId) ? 'A' : 'B';
    setReplyingTo({ commentId, authorName, side });
    setReplyText('');
  }, [commentsA, markAction]);

  const handleSendReply = useCallback(async () => {
    const text = replyText.trim();
    if (!text || !currentUserQuery.data?.id || !replyingTo) return;
    markAction();

    const createdReply = await createCommentMutation.mutateAsync({
      entityType: 'comment',
      entityId: replyingTo.commentId,
      content: text,
    });
    const replySide = replyingTo.side;
    setLatestReplyEvent({
      token: Date.now(),
      commentId: replyingTo.commentId,
      reply: createdReply,
      side: replySide,
    });
    if (replySide === 'A') {
      setCommentsAState((prev) =>
        prev.map((comment) =>
          comment.id === replyingTo.commentId
            ? { ...comment, replyCount: comment.replyCount + 1 }
            : comment,
        ),
      );
    } else {
      setCommentsBState((prev) =>
        prev.map((comment) =>
          comment.id === replyingTo.commentId
            ? { ...comment, replyCount: comment.replyCount + 1 }
            : comment,
        ),
      );
    }
    pushDanmu(replySide, `回复 @${replyingTo.authorName}: ${text}`);
    pushFx(replySide, 'send');
    firePulse();
    setReplyingTo(null);
    setReplyText('');
    void commentsAQuery.refetch();
    void commentsBQuery.refetch();
  }, [commentsAQuery, commentsBQuery, createCommentMutation, currentUserQuery.data?.id, firePulse, markAction, pushDanmu, pushFx, replyText, replyingTo]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !currentUserQuery.data?.id) return;
    markAction();
    const createdComment = await createCommentMutation.mutateAsync({
      entityType: selectedSide === 'A' ? ENTITY_PREDICT_A : ENTITY_PREDICT_B,
      entityId: battleEntityId,
      content: text,
    });
    const mapped = mapCommentToBattleComment(createdComment, selectedSide);
    if (selectedSide === 'A') {
      setCursorA(0);
      setCommentsAState((prev) => [mapped, ...prev.filter((item) => item.id !== mapped.id)]);
    } else {
      setCursorB(0);
      setCommentsBState((prev) => [mapped, ...prev.filter((item) => item.id !== mapped.id)]);
    }
    pushDanmu(selectedSide, text);

    void commentsAQuery.refetch();
    void commentsBQuery.refetch();
    setInputText('');
    pushFx(selectedSide, 'send');
    firePulse();
  }, [battleEntityId, commentsAQuery, commentsBQuery, createCommentMutation, currentUserQuery.data?.id, firePulse, inputText, markAction, pushDanmu, pushFx, selectedSide]);
  void handleSend;

  return (
    <div className={css("battle-shell px-2 md:px-3 py-2 min-h-[calc(100vh-56px)] overflow-x-hidden")}>
      <div className={css("battle-outer-frame relative overflow-hidden")}>
        <span className={css("battle-orb w-36 h-36 -left-10 -top-8 bg-cyan-400/20")} />
        <span className={css("battle-orb w-44 h-44 -right-14 top-16 bg-rose-500/20")} style={{ animationDelay: '0.6s' }} />
        <span className={css("battle-orb w-32 h-32 left-1/3 -bottom-12 bg-emerald-400/15")} style={{ animationDelay: '1.1s' }} />
        <div className={css("battle-header-strip")}>
          <button
            onClick={onBack}
            className={css("relative z-10 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-white/92 text-xs font-semibold border border-white/14 bg-black/15 cursor-pointer transition-colors hover:bg-black/25 hover:border-white/22")}
          >
            <ChevronLeft size={13} className={css("text-[#e6c889]")} />
            返回
          </button>
          <span className={css("relative z-10 text-white/75 text-xs font-semibold tracking-[0.2em]")}>LIVE BATTLE</span>
        </div>
        <div className={css("relative z-10 w-full min-h-[calc(100vh-56px)] flex flex-col gap-4 md:gap-5 overflow-x-hidden px-2 md:px-3 py-3")}>

          <KoFlash fx={koFx} />

          <BattleHeader
            news={news}
            leftPower={leftPower}
            rightPower={rightPower}
            leftSuccess={leftSuccess}
            leftFail={leftFail}
            rightSuccess={rightSuccess}
            rightFail={rightFail}
            splitPct={splitPct}
            commentsA={commentsA}
            commentsB={commentsB}
            comboA={comboA}
            comboB={comboB}
            shakeKey={shakeKey}
          />

          {false && <>
            <BattleTicker
              optionA={news.optionA}
              optionB={news.optionB}
              leftPower={leftPower}
              rightPower={rightPower}
            />

            <div className={css("relative -mt-3")}>
              <BattleDanmu messages={danmu} />
            </div>
          </>}

          <div className={css("grid grid-cols-1 gap-5 md:gap-6 items-start flex-1 min-h-0")}>
            <div className={css(`${card} battle-main-panel overflow-hidden relative h-full min-h-0`)}>
              <div className={css("battle-arena-grid absolute inset-0 pointer-events-none opacity-[0.07]")} />
              {/* <span className={css("battle-vs-cross-y")} /> */}
              <IdleArenaFx active={isIdle} />
              <ActionFxBurst fxList={battleFx} />
              <div className={css("border-b border-white/10 bg-black/15 px-2 py-2 md:px-3 md:py-3")}>
                <div className={css("space-y-3")}>
                  <div className={css("border border-white/10 bg-black/18 overflow-hidden")}>
                    <button
                      type="button"
                      onClick={() => setShowBetPanel((prev) => !prev)}
                      className={css("w-full flex items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-white/[0.03]")}
                    >
                      <div className={css("flex items-center gap-2")}>
                        <span className={css(`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.badgeTone}`)}>
                          {news.status === 'open' ? <Coins size={11} /> : news.status === 'closed' ? <Lock size={11} /> : news.betSettleResult === 'WIN' ? <Trophy size={11} /> : <Clock3 size={11} />}
                          {statusMeta.badgeLabel}
                        </span>
                        <div>
                          <div className={css("text-[12px] font-bold text-white")}>下注面板</div>
                          <div className={css("text-[10px] text-white/48")}>余额 {balance.toLocaleString()} · {activeBetLabel} · {activeBetOdds.toFixed(1)}x</div>
                        </div>
                      </div>
                      <div className={css("flex items-center gap-2 text-white/58")}>
                        <span className={css("text-[11px]")}>{showBetPanel ? '收起' : '展开'}</span>
                        {showBetPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </button>
                    <AnimatePresence initial={false}>
                      {showBetPanel && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: 'easeOut' }}
                        >
                          <div className={css("border-t border-white/8 px-3 py-3 space-y-3")}>
                            <p className={css(`text-[11px] leading-5 ${statusMeta.hintTone}`)}>{statusMeta.hint}</p>
                            <div className={css("grid grid-cols-2 gap-2")}>
                              <div className={css("border border-white/10 bg-white/[0.03] px-3 py-2.5")}>
                                <div className={css("text-[10px] uppercase tracking-[0.12em] text-white/35")}>我的余额</div>
                                <div className={css("mt-1.5 flex items-center gap-1.5 text-[20px] font-black text-emerald-300")}>
                                  <Coins size={14} />
                                  {balance.toLocaleString()}
                                </div>
                              </div>
                              <div className={css("border border-white/10 bg-white/[0.03] px-3 py-2.5")}>
                                <div className={css("text-[10px] uppercase tracking-[0.12em] text-white/35")}>预计派奖</div>
                                <div className={css("mt-1.5 text-[20px] font-black text-white")}>{estimatedPayout.toLocaleString()}</div>
                              </div>
                            </div>
                            <div className={css("grid grid-cols-2 gap-2")}>
                              <button
                                type="button"
                                onClick={() => setBetIntent('A')}
                                disabled={!canPlaceBet && !userSide}
                                className={css(`border px-3 py-2 text-left transition-colors ${betIntent === 'A'
                                  ? 'border-cyan-300/35 bg-cyan-400/10'
                                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
                                  } disabled:opacity-55 disabled:cursor-not-allowed`)}
                              >
                                <div className={css("text-[10px] font-semibold text-cyan-100")}>{news.optionA}</div>
                                <div className={css("mt-1 text-lg font-black text-white")}>{news.oddsA.toFixed(1)}x</div>
                                <div className={css("text-[10px] text-white/48")}>支持正向观点</div>
                              </button>
                              <button
                                type="button"
                                onClick={() => setBetIntent('B')}
                                disabled={!canPlaceBet && !userSide}
                                className={css(`border px-3 py-2 text-left transition-colors ${betIntent === 'B'
                                  ? 'border-rose-300/35 bg-rose-400/10'
                                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
                                  } disabled:opacity-55 disabled:cursor-not-allowed`)}
                              >
                                <div className={css("text-[10px] font-semibold text-rose-100")}>{news.optionB}</div>
                                <div className={css("mt-1 text-lg font-black text-white")}>{news.oddsB.toFixed(1)}x</div>
                                <div className={css("text-[10px] text-white/48")}>支持反向观点</div>
                              </button>
                            </div>
                            <div className={css("border border-white/8 bg-white/[0.03] px-3 py-2.5")}>
                              <div className={css("mb-2 flex items-center justify-between gap-2")}>
                                <span className={css("text-[10px] uppercase tracking-[0.12em] text-white/35")}>下注金额</span>
                                <span className={css("text-[10px] text-white/45")}>可用 {balance.toLocaleString()} 龟币</span>
                              </div>
                              <div className={css("flex items-center border border-white/10 bg-black/20 px-3 py-2")}>
                                <span className={css("mr-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35")}>Coins</span>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={betAmount}
                                  onChange={(e) => setBetAmount(e.target.value)}
                                  placeholder="输入下注金额"
                                  className={css("w-full bg-transparent text-[20px] font-black text-white outline-none placeholder:text-white/24")}
                                />
                              </div>
                              <div className={css("mt-2 flex flex-wrap gap-2")}>
                                {[100, 300, 500, 1000].map((amount) => (
                                  <button
                                    key={amount}
                                    type="button"
                                    onClick={() => setBetAmount(String(amount))}
                                    className={css("px-2.5 py-1 text-[10px] font-semibold border border-white/10 bg-white/[0.03] text-white/72 transition-colors hover:bg-white/[0.06]")}
                                  >
                                    {amount}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className={css("flex items-center justify-between gap-3 border border-white/8 bg-white/[0.03] px-3 py-2")}>
                              <div>
                                <div className={css("text-[10px] uppercase tracking-[0.16em] text-white/35")}>当前选择</div>
                                <div className={css("mt-1 text-[14px] font-black text-white")}>{activeBetLabel}</div>
                                <div className={css("text-[11px] text-white/52")}>赔率 {activeBetOdds.toFixed(1)}x · 金额 {Number.isFinite(numericBetAmount) && numericBetAmount > 0 ? numericBetAmount.toLocaleString() : 0}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => onBet?.(news.id, betIntent, activeBetOdds, numericBetAmount)}
                                disabled={!canPlaceBet || isBetting}
                                className={css(`inline-flex min-w-[92px] items-center justify-center gap-1 border px-3 py-2 text-[12px] font-bold transition-colors ${betIntent === 'A'
                                  ? 'border-cyan-300/26 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/16'
                                  : 'border-rose-300/26 bg-rose-400/10 text-rose-100 hover:bg-rose-400/16'
                                  } disabled:opacity-45 disabled:cursor-not-allowed`)}
                              >
                                <Zap size={12} />
                                {isBetting ? '下注中...' : news.hasBet ? '已参与' : news.status === 'open' ? '确认下注' : '不可下注'}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* <div className={css("border border-white/10 bg-black/12 px-3 py-2")}>
                    <div className={css("flex items-center justify-between gap-2")}>
                      <div className={css("flex items-center gap-2")}>
                        <MessageSquareText size={13} className={css("text-[#e6c889]")} />
                        <span className={css("text-[12px] font-bold text-white")}>撕裂带</span>
                      </div>
                      <span className={css("text-[10px] text-white/46")}>支持胜负观点，回复在列表原位展开</span>
                    </div>
                  </div> */}

                  <div ref={composerRef} className={css("border border-white/10 bg-black/16 overflow-hidden")}>
                    <div className={css("flex flex-wrap items-center gap-2 border-b border-white/8 px-3 py-2 text-[11px] text-white/70")}>
                      {canComment ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedSide('A')}
                            className={css(`inline-flex items-center gap-1 px-2.5 py-1 rounded-none font-bold transition-colors ${selectedSide === 'A' ? 'text-white' : 'text-cyan-100/72'}`)}
                            style={selectedSide === 'A'
                              ? { backgroundColor: LC, boxShadow: `0 0 14px ${LC}44` }
                              : { backgroundColor: 'rgba(0,210,255,0.08)', border: '1px solid rgba(0,210,255,0.18)' }}
                          >
                            <MessageSquareText size={11} />
                            评论胜方: {news.optionA}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedSide('B')}
                            className={css(`inline-flex items-center gap-1 px-2.5 py-1 rounded-none font-bold transition-colors ${selectedSide === 'B' ? 'text-white' : 'text-rose-100/72'}`)}
                            style={selectedSide === 'B'
                              ? { backgroundColor: RC, boxShadow: `0 0 14px ${RC}44` }
                              : { backgroundColor: 'rgba(255,0,85,0.08)', border: '1px solid rgba(255,0,85,0.18)' }}
                          >
                            <MessageSquareText size={11} />
                            评论负方: {news.optionB}
                          </button>
                        </>
                      ) : (
                        <span className={css("inline-flex items-center gap-1 px-2.5 py-1 rounded-none border border-white/15 text-white/60")}>
                          <Lock size={11} />
                          登录后可评论胜方或负方
                        </span>
                      )}
                      <span className={css("ml-auto text-white/52")}>
                        主评论发到上面选中的阵营，回复请直接在列表里操作
                      </span>
                    </div>
                    <div className={css("px-3 py-3 flex items-center gap-2")}>
                      <div className={css("flex-1 flex items-center gap-2 rounded-none px-3 py-2 border border-white/20 bg-transparent focus-within:border-emerald-300/70 transition-colors relative overflow-hidden")}>
                        <span
                          className={css("absolute inset-y-0 w-14 pointer-events-none")}
                          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', animation: `${kf('neon-sweep')} 2.4s linear infinite` }}
                        />
                        <input
                          ref={inputRef}
                          type="text"
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              void handleSend();
                            }
                          }}
                          placeholder={
                            canComment
                              ? `为${selectedSide === 'A' ? news.optionA : news.optionB}阵营加火...`
                              : '登录后可加入战场'
                          }
                          disabled={!canComment || createCommentMutation.isLoading}
                          className={css("flex-1 bg-transparent border-0 outline-none text-xs text-white placeholder:text-white/45 disabled:cursor-not-allowed disabled:opacity-45")}
                        />
                        <motion.button
                          onClick={() => void handleSend()}
                          disabled={!inputText.trim() || !canComment || createCommentMutation.isLoading}
                          whileTap={inputText.trim() && canComment ? { scale: 0.92 } : {}}
                          whileHover={inputText.trim() && canComment ? { scale: 1.06 } : {}}
                          className={css(`p-1.5 rounded-none border-0 cursor-pointer transition-colors ${inputText.trim() && canComment
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-transparent border border-white/20 text-white/45 cursor-not-allowed'
                            }`)}
                        >
                          <span className={css("inline-flex items-center gap-1")}>
                            <Send size={12} style={{ animation: inputText.trim() && canComment ? `${kf('hot-icon-spin')} 0.9s ease-in-out infinite` : undefined }} />
                            {inputText.trim() && canComment && <Sparkles size={10} />}
                          </span>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={css("xl:hidden px-2 pt-2 pb-1 space-y-3")}>
                  <div className={css("w-full border border-cyan-300/20 bg-black/10 overflow-hidden relative")}>
                    <span
                      className={css("absolute inset-0 pointer-events-none")}
                      style={{
                        background:
                          'radial-gradient(900px 520px at 16% 18%, rgba(0,210,255,0.22), transparent 55%), radial-gradient(700px 420px at 60% 80%, rgba(0,210,255,0.12), transparent 58%), linear-gradient(180deg, rgba(0,210,255,0.06), transparent 55%, rgba(0,0,0,0.25))',
                      }}
                    />
                    <div className={css("flex flex-col")}>
                      <SideColumn
                        side="A"
                        label={news.optionA}
                        power={leftPower}
                        comments={commentsA}
                        compact={false}
                        scrollRef={scrollA}
                        onLike={handleLike}
                        onStomp={handleStomp}
                        stompedSet={stompedSet}
                        poopAnims={poopAnims}
                        onReply={handleReply}
                        dotColor={LC}
                        textColor={LC}
                        pushFx={pushFx}
                        comboCount={comboA}
                        hasMore={commentsAQuery.data?.hasMore}
                        loadingMore={commentsAQuery.isFetching}
                        onLoadMore={() => setCursorA(commentsAQuery.data?.cursor ?? 0)}
                        latestReplyEvent={latestReplyEvent}
                        replyingTo={replyingTo}
                        replyDraft={replyText}
                        onReplyDraftChange={setReplyText}
                        onSubmitReply={handleSendReply}
                        onCancelReply={() => {
                          setReplyingTo(null);
                          setReplyText('');
                        }}
                        replySubmitting={createCommentMutation.isLoading}
                      />
                    </div>
                  </div>
                  <div className={css("w-full border border-rose-300/20 bg-black/10 overflow-hidden relative")}>
                    <span
                      className={css("absolute inset-0 pointer-events-none")}
                      style={{
                        background:
                          'radial-gradient(900px 520px at 84% 18%, rgba(255,0,85,0.22), transparent 55%), radial-gradient(700px 420px at 40% 80%, rgba(255,0,85,0.12), transparent 58%), linear-gradient(180deg, rgba(255,0,85,0.06), transparent 55%, rgba(0,0,0,0.25))',
                      }}
                    />
                    <div className={css("flex flex-col")}>
                      <SideColumn
                        side="B"
                        label={news.optionB}
                        power={rightPower}
                        comments={commentsB}
                        compact={false}
                        scrollRef={scrollB}
                        onLike={handleLike}
                        onStomp={handleStomp}
                        stompedSet={stompedSet}
                        poopAnims={poopAnims}
                        onReply={handleReply}
                        dotColor={RC}
                        textColor={RC}
                        pushFx={pushFx}
                        comboCount={comboB}
                        hasMore={commentsBQuery.data?.hasMore}
                        loadingMore={commentsBQuery.isFetching}
                        onLoadMore={() => setCursorB(commentsBQuery.data?.cursor ?? 0)}
                        latestReplyEvent={latestReplyEvent}
                        replyingTo={replyingTo}
                        replyDraft={replyText}
                        onReplyDraftChange={setReplyText}
                        onSubmitReply={handleSendReply}
                        onCancelReply={() => {
                          setReplyingTo(null);
                          setReplyText('');
                        }}
                        replySubmitting={createCommentMutation.isLoading}
                      />
                    </div>
                  </div>
              </div>

              <div className={css("flex flex-col xl:flex-row gap-0")}>
                <div className={css("hidden xl:flex flex-col relative flex-1 min-w-0")}>
                  <span
                    className={css("absolute inset-0 pointer-events-none")}
                    style={{
                      background:
                        'radial-gradient(900px 520px at 16% 18%, rgba(0,210,255,0.22), transparent 55%), radial-gradient(700px 420px at 60% 80%, rgba(0,210,255,0.12), transparent 58%), linear-gradient(180deg, rgba(0,210,255,0.06), transparent 55%, rgba(0,0,0,0.25))',
                    }}
                  />
                  <SideColumn
                    side="A"
                    label={news.optionA}
                    power={leftPower}
                    comments={commentsA}
                    compact={false}
                    scrollRef={scrollA}
                    onLike={handleLike}
                    onStomp={handleStomp}
                    stompedSet={stompedSet}
                    poopAnims={poopAnims}
                    onReply={handleReply}
                    dotColor={LC}
                    textColor={LC}
                    pushFx={pushFx}
                    comboCount={comboA}
                    hasMore={commentsAQuery.data?.hasMore}
                    loadingMore={commentsAQuery.isFetching}
                    onLoadMore={() => setCursorA(commentsAQuery.data?.cursor ?? 0)}
                    latestReplyEvent={latestReplyEvent}
                    replyingTo={replyingTo}
                    replyDraft={replyText}
                    onReplyDraftChange={setReplyText}
                    onSubmitReply={handleSendReply}
                    onCancelReply={() => {
                      setReplyingTo(null);
                      setReplyText('');
                    }}
                    replySubmitting={createCommentMutation.isLoading}
                  />
                </div>

                <div className={css("hidden xl:block")}>
                  <DynamicDivider
                    splitRatio={splitPct / 100}
                    pulse={pulse}
                    leftPower={leftPower}
                    rightPower={rightPower}
                  />
                </div>
                {/* <aside className={css("battle-right-stack flex flex-col gap-3 md:gap-5 xl:sticky xl:top-4 h-full min-h-0 w-full xl:w-[420px] 2xl:w-[500px] shrink-0 ml-0 xl:ml-6")}>
                  <div className={css(`${card} battle-right-panel battle-live-board p-4 space-y-3`)}>
                    <div className={css("battle-live-head flex items-center justify-between text-[11px]")}>
                      <span className={css("battle-live-title text-white/75")}>实时战况</span>
                      <span className={css("battle-live-diff text-white/50")}>优势差值 {Math.abs(leftPower - rightPower)}</span>
                    </div>
                    <div className={css("battle-live-grid grid grid-cols-2 gap-2")}>
                      <div className={css("battle-live-side battle-live-left rounded-none border border-cyan-300/30 bg-transparent p-2")}>
                        <div className={css("text-[10px] text-cyan-200/80")}>{news.optionA}</div>
                        <div className={css("text-lg font-black text-cyan-100")}>
                          <AnimatedCount value={leftPower} duration={0.55} />
                        </div>
                        <div className={css("text-[10px] text-cyan-100/80")}>
                          COMBO <AnimatedCount value={comboA} duration={0.45} />
                        </div>
                        <div className={css("battle-live-breakdown mt-2 grid grid-cols-2 gap-1.5")}>
                          <div className={css("battle-stat-card battle-stat-success rounded-none border border-emerald-300/40 bg-emerald-400/10 px-1.5 py-1")}>
                            <div className={css("text-[10px] text-emerald-200/85")}>会成功</div>
                            <motion.div
                              key={`ls-fx-ring-${leftSuccess}`}
                              initial={{ scale: 0.25, opacity: 0.9 }}
                              animate={{ scale: 1.8, opacity: 0 }}
                              transition={{ duration: 0.58, ease: 'easeOut' }}
                              className={css("absolute inset-0 pointer-events-none")}
                              style={{ border: '1px solid rgba(110,231,183,0.9)', boxShadow: '0 0 20px rgba(16,185,129,0.85)' }}
                            />
                            {[...Array(6)].map((_, i) => (
                              <motion.span
                                key={`ls-fx-ray-${leftSuccess}-${i}`}
                                initial={{ opacity: 0.95, scaleX: 0.35, scaleY: 0.35 }}
                                animate={{ opacity: 0, scaleX: 1.2, scaleY: 1.2 }}
                                transition={{ duration: 0.52, ease: 'easeOut', delay: i * 0.03 }}
                                className={css("absolute left-1/2 top-1/2 h-[2px] w-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none")}
                                style={{
                                  background: 'linear-gradient(90deg, transparent, rgba(110,231,183,0.95), transparent)',
                                  transform: `translate(-50%, -50%) rotate(${i * 30}deg)`,
                                }}
                              />
                            ))}
                            <motion.div
                              key={`ls-${leftSuccess}`}
                              initial={{ scale: 0.4, y: 18, opacity: 0, rotate: -8, filter: 'blur(2px)' }}
                              animate={{
                                scale: [0.4, 1.55, 1.08, 1],
                                y: [18, -8, 1, 0],
                                rotate: [-8, 6, -2, 0],
                                opacity: [0, 1, 1, 1],
                                filter: ['blur(2px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
                              }}
                              transition={{ duration: 0.72, ease: 'easeOut' }}
                              className={css("battle-stat-num text-[26px] text-emerald-100 tabular-nums")}
                              style={{ textShadow: '0 0 18px rgba(110,231,183,0.95), 0 0 34px rgba(52,211,153,0.75)' }}
                            >
                              {renderFlipNumber(leftSuccess, 'tabular-nums')}
                            </motion.div>
                          </div>
                          <div className={css("battle-stat-card battle-stat-fail rounded-none border border-amber-300/40 bg-amber-400/10 px-1.5 py-1")}>
                            <div className={css("text-[10px] text-amber-100/90")}>会失败</div>
                            <motion.div
                              key={`lf-fx-ring-${leftFail}`}
                              initial={{ scale: 0.25, opacity: 0.9 }}
                              animate={{ scale: 1.8, opacity: 0 }}
                              transition={{ duration: 0.58, ease: 'easeOut' }}
                              className={css("absolute inset-0 pointer-events-none")}
                              style={{ border: '1px solid rgba(252,211,77,0.9)', boxShadow: '0 0 20px rgba(245,158,11,0.85)' }}
                            />
                            {[...Array(6)].map((_, i) => (
                              <motion.span
                                key={`lf-fx-ray-${leftFail}-${i}`}
                                initial={{ opacity: 0.95, scaleX: 0.35, scaleY: 0.35 }}
                                animate={{ opacity: 0, scaleX: 1.2, scaleY: 1.2 }}
                                transition={{ duration: 0.52, ease: 'easeOut', delay: i * 0.03 }}
                                className={css("absolute left-1/2 top-1/2 h-[2px] w-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none")}
                                style={{
                                  background: 'linear-gradient(90deg, transparent, rgba(252,211,77,0.95), transparent)',
                                  transform: `translate(-50%, -50%) rotate(${i * 30}deg)`,
                                }}
                              />
                            ))}
                            <motion.div
                              key={`lf-${leftFail}`}
                              initial={{ scale: 0.4, y: 18, opacity: 0, rotate: -8, filter: 'blur(2px)' }}
                              animate={{
                                scale: [0.4, 1.55, 1.08, 1],
                                y: [18, -8, 1, 0],
                                rotate: [-8, 6, -2, 0],
                                opacity: [0, 1, 1, 1],
                                filter: ['blur(2px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
                              }}
                              transition={{ duration: 0.72, ease: 'easeOut' }}
                              className={css("battle-stat-num text-[26px] text-amber-100 tabular-nums")}
                              style={{ textShadow: '0 0 18px rgba(252,211,77,0.95), 0 0 34px rgba(245,158,11,0.75)' }}
                            >
                              {renderFlipNumber(leftFail, 'tabular-nums')}
                            </motion.div>
                          </div>
                        </div>
                      </div>
                      <div className={css("battle-live-side battle-live-right rounded-none border border-rose-300/30 bg-transparent p-2")}>
                        <div className={css("text-[10px] text-rose-200/80")}>{news.optionB}</div>
                        <div className={css("text-lg font-black text-rose-100")}>
                          <AnimatedCount value={rightPower} duration={0.55} />
                        </div>
                        <div className={css("text-[10px] text-rose-100/80")}>
                          COMBO <AnimatedCount value={comboB} duration={0.45} />
                        </div>
                        <div className={css("battle-live-breakdown mt-2 grid grid-cols-2 gap-1.5")}>
                          <div className={css("battle-stat-card battle-stat-success rounded-none border border-emerald-300/40 bg-emerald-400/10 px-1.5 py-1")}>
                            <div className={css("text-[10px] text-emerald-200/85")}>会成功</div>
                            <motion.div
                              key={`rs-fx-ring-${rightSuccess}`}
                              initial={{ scale: 0.25, opacity: 0.9 }}
                              animate={{ scale: 1.8, opacity: 0 }}
                              transition={{ duration: 0.58, ease: 'easeOut' }}
                              className={css("absolute inset-0 pointer-events-none")}
                              style={{ border: '1px solid rgba(110,231,183,0.9)', boxShadow: '0 0 20px rgba(16,185,129,0.85)' }}
                            />
                            {[...Array(6)].map((_, i) => (
                              <motion.span
                                key={`rs-fx-ray-${rightSuccess}-${i}`}
                                initial={{ opacity: 0.95, scaleX: 0.35, scaleY: 0.35 }}
                                animate={{ opacity: 0, scaleX: 1.2, scaleY: 1.2 }}
                                transition={{ duration: 0.52, ease: 'easeOut', delay: i * 0.03 }}
                                className={css("absolute left-1/2 top-1/2 h-[2px] w-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none")}
                                style={{
                                  background: 'linear-gradient(90deg, transparent, rgba(110,231,183,0.95), transparent)',
                                  transform: `translate(-50%, -50%) rotate(${i * 30}deg)`,
                                }}
                              />
                            ))}
                            <motion.div
                              key={`rs-${rightSuccess}`}
                              initial={{ scale: 0.4, y: 18, opacity: 0, rotate: -8, filter: 'blur(2px)' }}
                              animate={{
                                scale: [0.4, 1.55, 1.08, 1],
                                y: [18, -8, 1, 0],
                                rotate: [-8, 6, -2, 0],
                                opacity: [0, 1, 1, 1],
                                filter: ['blur(2px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
                              }}
                              transition={{ duration: 0.72, ease: 'easeOut' }}
                              className={css("battle-stat-num text-[26px] text-emerald-100 tabular-nums")}
                              style={{ textShadow: '0 0 18px rgba(110,231,183,0.95), 0 0 34px rgba(52,211,153,0.75)' }}
                            >
                              {renderFlipNumber(rightSuccess, 'tabular-nums')}
                            </motion.div>
                          </div>
                          <div className={css("battle-stat-card battle-stat-fail rounded-none border border-amber-300/40 bg-amber-400/10 px-1.5 py-1")}>
                            <div className={css("text-[10px] text-amber-100/90")}>会失败</div>
                            <motion.div
                              key={`rf-fx-ring-${rightFail}`}
                              initial={{ scale: 0.25, opacity: 0.9 }}
                              animate={{ scale: 1.8, opacity: 0 }}
                              transition={{ duration: 0.58, ease: 'easeOut' }}
                              className={css("absolute inset-0 pointer-events-none")}
                              style={{ border: '1px solid rgba(252,211,77,0.9)', boxShadow: '0 0 20px rgba(245,158,11,0.85)' }}
                            />
                            {[...Array(6)].map((_, i) => (
                              <motion.span
                                key={`rf-fx-ray-${rightFail}-${i}`}
                                initial={{ opacity: 0.95, scaleX: 0.35, scaleY: 0.35 }}
                                animate={{ opacity: 0, scaleX: 1.2, scaleY: 1.2 }}
                                transition={{ duration: 0.52, ease: 'easeOut', delay: i * 0.03 }}
                                className={css("absolute left-1/2 top-1/2 h-[2px] w-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none")}
                                style={{
                                  background: 'linear-gradient(90deg, transparent, rgba(252,211,77,0.95), transparent)',
                                  transform: `translate(-50%, -50%) rotate(${i * 30}deg)`,
                                }}
                              />
                            ))}
                            <motion.div
                              key={`rf-${rightFail}`}
                              initial={{ scale: 0.4, y: 18, opacity: 0, rotate: -8, filter: 'blur(2px)' }}
                              animate={{
                                scale: [0.4, 1.55, 1.08, 1],
                                y: [18, -8, 1, 0],
                                rotate: [-8, 6, -2, 0],
                                opacity: [0, 1, 1, 1],
                                filter: ['blur(2px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
                              }}
                              transition={{ duration: 0.72, ease: 'easeOut' }}
                              className={css("battle-stat-num text-[26px] text-amber-100 tabular-nums")}
                              style={{ textShadow: '0 0 18px rgba(252,211,77,0.95), 0 0 34px rgba(245,158,11,0.75)' }}
                            >
                              {renderFlipNumber(rightFail, 'tabular-nums')}
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={css(`${card} battle-right-panel px-4 py-3 relative overflow-hidden`)}>
                    <span
                      className={css("absolute inset-y-0 w-24 pointer-events-none")}
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.2), transparent)', animation: `${kf('neon-sweep')} 2.9s linear infinite` }}
                    />
                    <AnimatePresence>
                      {replyingTo && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className={css("flex items-center gap-2 mb-2 pb-2 border-b border-white/15")}
                        >
                          <span className={css("text-[10px] text-white/70")}>
                            回复 <span className={css("font-semibold text-white")}>@{replyingTo.authorName}</span>
                          </span>
                          <button
                            onClick={() => setReplyingTo(null)}
                            className={css("ml-auto p-0.5 rounded-none border-0 bg-transparent cursor-pointer text-white/60 hover:text-white transition-colors")}
                          >
                            <span className={css("text-xs leading-none")}>x</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className={css("flex items-center gap-2.5")}>
                      {userSide ? (
                        <span
                          className={css("shrink-0 px-2.5 py-1.5 rounded-none text-[11px] font-bold text-white inline-flex items-center gap-1")}
                          style={{ backgroundColor: userSide === 'A' ? LC : RC, boxShadow: `0 0 16px ${userSide === 'A' ? LC : RC}88` }}
                        >
                          <Zap size={11} /> {userSide === 'A' ? news.optionA : news.optionB}
                        </span>
                      ) : (
                        <span className={css("shrink-0 px-2.5 py-1.5 rounded-none text-[11px] font-bold bg-transparent border border-white/20 text-white/55")}>
                          未投票
                        </span>
                      )}
                      <div className={css("flex-1 flex items-center gap-2 rounded-none px-3 py-2 border border-white/20 bg-transparent focus-within:border-emerald-300/70 transition-colors relative overflow-hidden")}>
                        <span
                          className={css("absolute inset-y-0 w-14 pointer-events-none")}
                          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', animation: `${kf('neon-sweep')} 2.4s linear infinite` }}
                        />
                        <input
                          ref={inputRef}
                          type="text"
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSend();
                            }
                          }}
                          placeholder={
                            replyingTo
                              ? `回复 @${replyingTo.authorName}...`
                              : userSide
                                ? '发表火力评论...'
                                : '请先投票后发言'
                          }
                          className={css("flex-1 bg-transparent border-0 outline-none text-xs text-white placeholder:text-white/45")}
                        />
                        <motion.button
                          onClick={handleSend}
                          disabled={!inputText.trim() || !userSide}
                          whileTap={inputText.trim() && userSide ? { scale: 0.92 } : {}}
                          whileHover={inputText.trim() && userSide ? { scale: 1.06 } : {}}
                          className={css(`p-1.5 rounded-none border-0 cursor-pointer transition-colors ${inputText.trim() && userSide
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-transparent border border-white/20 text-white/45 cursor-not-allowed'
                            }`)}
                        >
                          <span className={css("inline-flex items-center gap-1")}>
                            <Send size={12} style={{ animation: inputText.trim() && userSide ? `${kf('hot-icon-spin')} 0.9s ease-in-out infinite` : undefined }} />
                            {inputText.trim() && userSide && <Sparkles size={10} />}
                          </span>
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {hasBetAction && (
                    <div className={css("grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2.5 md:gap-3")}>
                      <motion.button
                        whileHover={{ scale: 1.02, boxShadow: `0 0 28px ${LC}35, inset 0 1px 0 rgba(255,255,255,0.2)` }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onBet(news.id, 'A', news.oddsA)}
                        disabled={typeof news.marketId === 'number' && bettingMarketId === news.marketId}
                        className={css(`${card} battle-right-panel battle-odds-btn relative py-3.5 px-3 border-2 cursor-pointer overflow-hidden transition-shadow`)}
                        style={{ borderColor: LC, boxShadow: `0 0 20px ${LC}18, inset 0 1px 0 rgba(255,255,255,0.12)` }}
                      >
                        <div className={css("absolute inset-0 opacity-[0.07]")} style={{ background: `linear-gradient(135deg, ${LC}, transparent 60%)` }} />
                        <div className={css("relative text-center")}>
                          <div className={css("text-[10px] font-semibold mb-0.5")} style={{ color: LC }}>{news.optionA}</div>
                          <div className={css("text-lg font-black text-white")}>{typeof news.marketId === 'number' && bettingMarketId === news.marketId ? '下注中...' : `${news.oddsA.toFixed(1)}x`}</div>
                          <div className={css("text-[9px] text-white/55")}>{typeof news.marketId === 'number' && bettingMarketId === news.marketId ? '正在提交' : '点击下注'}</div>
                        </div>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, boxShadow: `0 0 28px ${RC}35, inset 0 1px 0 rgba(255,255,255,0.2)` }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onBet(news.id, 'B', news.oddsB)}
                        disabled={typeof news.marketId === 'number' && bettingMarketId === news.marketId}
                        className={css(`${card} battle-right-panel battle-odds-btn relative py-3.5 px-3 border-2 cursor-pointer overflow-hidden transition-shadow`)}
                        style={{ borderColor: RC, boxShadow: `0 0 20px ${RC}18, inset 0 1px 0 rgba(255,255,255,0.12)` }}
                      >
                        <div className={css("absolute inset-0 opacity-[0.07]")} style={{ background: `linear-gradient(135deg, transparent 40%, ${RC})` }} />
                        <div className={css("relative text-center")}>
                          <div className={css("text-[10px] font-semibold mb-0.5")} style={{ color: RC }}>{news.optionB}</div>
                          <div className={css("text-lg font-black text-white")}>{typeof news.marketId === 'number' && bettingMarketId === news.marketId ? '下注中...' : `${news.oddsB.toFixed(1)}x`}</div>
                          <div className={css("text-[9px] text-white/55")}>{typeof news.marketId === 'number' && bettingMarketId === news.marketId ? '正在提交' : '点击下注'}</div>
                        </div>
                      </motion.button>
                    </div>
                  )}
                </aside> */}
                <div
                  className={css("shrink-0 overflow-hidden rounded-xl")}
                  style={{
                    width: 220,
                    background: 'linear-gradient(180deg, rgba(8,8,14,0.95) 0%, rgba(12,12,20,0.92) 100%)',
                    borderLeft: '1px solid rgba(255,255,255,0.06)',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <BattleReport
                    commentsA={reportCommentsA}
                    commentsB={reportCommentsB}
                    leftPower={leftPower}
                    rightPower={rightPower}
                    splitPct={splitPct}
                    optionA={news.optionA}
                    optionB={news.optionB}
                    oddsA={news.oddsA}
                    oddsB={news.oddsB}
                    userSide={userSide}
                    equippedSkinId={equippedSkin?.id}
                  />
                </div>
                <div className={css("hidden xl:block")}>
                  <DynamicDivider
                    splitRatio={splitPct / 100}
                    pulse={pulse}
                    leftPower={leftPower}
                    rightPower={rightPower}
                  />
                </div>

                <div className={css("hidden xl:flex flex-col relative flex-1 min-w-0")}>
                  <span
                    className={css("absolute inset-0 pointer-events-none")}
                    style={{
                      background:
                        'radial-gradient(900px 520px at 84% 18%, rgba(255,0,85,0.22), transparent 55%), radial-gradient(700px 420px at 40% 80%, rgba(255,0,85,0.12), transparent 58%), linear-gradient(180deg, rgba(255,0,85,0.06), transparent 55%, rgba(0,0,0,0.25))',
                    }}
                  />
                  <SideColumn
                    side="B"
                    label={news.optionB}
                    power={rightPower}
                    comments={commentsB}
                    compact={false}
                    scrollRef={scrollB}
                    onLike={handleLike}
                    onStomp={handleStomp}
                    stompedSet={stompedSet}
                    poopAnims={poopAnims}
                    onReply={handleReply}
                    dotColor={RC}
                    textColor={RC}
                    pushFx={pushFx}
                    comboCount={comboB}
                    hasMore={commentsBQuery.data?.hasMore}
                    loadingMore={commentsBQuery.isFetching}
                    onLoadMore={() => setCursorB(commentsBQuery.data?.cursor ?? 0)}
                    latestReplyEvent={latestReplyEvent}
                    replyingTo={replyingTo}
                    replyDraft={replyText}
                    onReplyDraftChange={setReplyText}
                    onSubmitReply={handleSendReply}
                    onCancelReply={() => {
                      setReplyingTo(null);
                      setReplyText('');
                    }}
                    replySubmitting={createCommentMutation.isLoading}
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
