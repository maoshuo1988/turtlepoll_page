/**
 * 文件说明：Battle Plaza Experience，地下钱庄/战斗广场核心业务实现。
 */
import styles from './index.module.scss';
import React, { useEffect, useMemo, useState } from 'react';
import { useQueries, useQueryClient } from 'react-query';
import { battleQueryKeys, fetchBattleDetail, useRequestBattleBankerAddStake, useRequestBattleChallengerConfirm, useRequestBattleChallengerDispute, useRequestBattleCreate, useRequestBattleDeclare, useRequestBattleDetail, useRequestBattleJoin, useRequestBattleList, useRequestBattleStats, useRequestBattleWithdraw } from '@/hooks/useBattleRequests';
import { showOperationErrorToast } from '@/utils/operationToast';
import {
  createBattleRequestId,
  getBattleErrorMessage,
  getBattleResultLabel,
  normalizeBattleResult,
  type BattleDetailResponse,
  type BattleListItem,
} from '@/hooks/battleTypes';
import { useAppSession } from '@/hooks/useAppSession';
import { getAuthToken, getStoredUserInfo } from '@/utils/authStorage';
import { fetchCommentComments, type CommentResponse, useRequestCreateComment } from '@/hooks/useCommentRequests';
import { useRequestLikeEntity, useRequestUnlikeEntity } from '@/hooks/useTopicRequests';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { createUserAvatarUrl } from '@/utils/userAvatar';
import { Coins } from 'lucide-react';
import { BattlePlazaDuelCard } from '../BattlePlazaDuelCard';
import { BattlePlazaStakeModal } from '../BattlePlazaStakeModal';
import {
  DEFAULT_USER_AVATAR,
  formatCoinLabel,
  formatTimestampLabel,
  mapBattleToDuel,
  mapCommentToDuelComment,
  type DuelComment,
  type DuelItem,
  type PlazaTab,
} from '../battlePlazaDuelModel';

function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}

function kf(name: string) {
  return styles[name] ?? name;
}

const BATTLE_HUB_ASSETS = {
  activeGames: '/image/battle/battle-1.png',
  frozenCoins: '/image/battle/battle-2.png',
  bankers: '/image/battle/battle-3.png',
  challengers: '/image/battle/battle-4.png',
} as const;

function HubScrollIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M5.5 3.5h9A1.5 1.5 0 0 1 16 5v10a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 15V5a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path d="M7 7.5h6M7 10h6M7 12.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function HubLockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="4.5" y="8.5" width="11" height="8" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M7 8.5V6.8a3 3 0 0 1 6 0V8.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="10" cy="12.2" r="1.1" fill="currentColor" />
    </svg>
  );
}

function HubGearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M10 3.2v1.6M10 15.2v1.6M3.2 10h1.6M15.2 10h1.6M5.1 5.1l1.1 1.1M13.8 13.8l1.1 1.1M5.1 14.9l1.1-1.1M13.8 6.2l1.1-1.1"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HubFlagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4.5 4v12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path
        d="M4.5 4.5h8.2c.8 0 1.3.9.8 1.6l-1.6 2.4 1.6 2.4c.5.7 0 1.6-.8 1.6H4.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PLAZA_RULE_BASIC_ITEMS = [
  '任意用户可设议题做庄，冻结押注龟币作为奖池。',
  '挑战者加入即站庄家对立方，按容量上限先到先得。',
  '公开赌局收取 5% 入场费，私人赌局凭房间号进入。',
] as const;

const PLAZA_RULE_SETTLE_ITEMS = [
  '议题揭晓后由庄家宣布结果，系统按胜负分配奖池。',
  '庄家赢则通吃挑战者押注；庄家输则奖池按比例返还挑战者。',
  '无人挑战则自动流局，全额退还庄家冻结龟币，不计胜负。',
] as const;

const PLAZA_RULE_SETTLE_TIP =
  '庄家需考虑事件的所有可能性，例如平局结果纳入谁阵营，否则冲裁时判定庄家议题不清。';

function HubBuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 2.5 3.5 6.2v1.3h13V6.2L10 2.5Z"
        fill="currentColor"
      />
      <path
        d="M4.5 8.2h2.2v8.3H4.5V8.2Zm4.1 0h2.8v8.3H8.6V8.2Zm4.2 0H15v8.3h-2.2V8.2Z"
        fill="currentColor"
      />
      <path d="M3 17.2h14v1.3H3v-1.3Z" fill="currentColor" />
      <path d="M9.2 8.2h1.6v8.3H9.2V8.2Z" fill="currentColor" opacity=".85" />
    </svg>
  );
}

function HubSideIcon({ tone }: { tone: 'red' | 'blue' }) {
  const stroke = tone === 'red' ? '#f87171' : '#38bdf8';
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className="h-4 w-4 shrink-0">
      <circle cx="8" cy="8" r="6.5" stroke={stroke} strokeWidth="1.2" />
      <path d="M5 5.5h6M5 8h6M5 10.5h6" stroke={stroke} strokeWidth="1" strokeLinecap="round" opacity=".85" />
    </svg>
  );
}

function HubGlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.8 8h10.4M8 2.8a8.5 8.5 0 0 1 0 10.4M8 2.8a8.5 8.5 0 0 0 0 10.4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function HubDiceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="11" height="11" rx="2.2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="5.5" cy="5.5" r=".9" fill="currentColor" />
      <circle cx="10.5" cy="10.5" r=".9" fill="currentColor" />
    </svg>
  );
}

type PlazaSort =
  | '最新'
  | '进行中'
  | '待结果'
  | '已结算';

type JoinModalState = {
  duelId: number;
  title: string;
  max: number;
  visibility: 'public' | 'private';
};

type AddStakeModalState = {
  duelId: number;
  title: string;
  visibility: 'public' | 'private';
  currentWager: number;
};

const PLAZA_SORTS: PlazaSort[] = [
  '最新',
  '进行中',
  '待结果',
  '已结算',
];

const COMPOSE_WAGER_OPTIONS = [1000, 5000, 10000, 20000];
const DEFAULT_COMPOSE_WAGER = 5000;
const DEFAULT_JOIN_AMOUNT = 500;

const COMPOSE_SETTLE_PRESETS = [
  { value: '24', label: '24 小时后', hours: 24 },
  { value: '48', label: '48 小时后', hours: 48 },
  { value: '72', label: '72 小时后', hours: 72 },
  { value: '168', label: '7 天后', hours: 168 },
] as const;

const PLAZA_LIST_PARAMS = { page: 1, pageSize: 50 } as const;
const MY_BANKER_LIST_PARAMS = { page: 1, pageSize: 50, role: 'banker' as const };
const MY_CHALLENGER_LIST_PARAMS = { page: 1, pageSize: 50, role: 'challenger' as const };

function formatCoins(value: number) {
  return value.toLocaleString('zh-CN');
}

/** 与左侧栏宠物面板一致的龟币图标（lucide Coins + emerald） */
function TurtleCoinIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <Coins
      size={size}
      aria-hidden
      className={`inline-block shrink-0 text-emerald-400 dark:text-emerald-500 ${className ?? ''}`.trim()}
    />
  );
}

function CoinAmount({ amount, iconSize = 14, className }: { amount: number; iconSize?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 align-middle ${className ?? ''}`.trim()}>
      <span>{formatCoins(amount)}</span>
      <TurtleCoinIcon size={iconSize} />
    </span>
  );
}

function clampAmount(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function BattlePlazaListEmpty({ text }: { text: string }) {
  return (
    <div className={css("bp-list-empty")}>
      <div className={css("bp-list-empty-inner")}>
        <span className={css("bp-list-empty-dot")} aria-hidden />
        <p className={css("bp-list-empty-text")}>{text}</p>
      </div>
    </div>
  );
}

function PlazaRuleList({ items }: { items: readonly string[] }) {
  return (
    <ul className={css("rules-list")}>
      {items.map((item) => (
        <li key={item} className={css("rules-list-item")}>
          {item}
        </li>
      ))}
    </ul>
  );
}

export const BattlePlazaPage: React.FC = () => {
  const { user } = useAppSession();
  const authToken = getAuthToken();
  const storedUser = getStoredUserInfo() as { id?: number | string };
  const currentUserId = user?.id ?? storedUser?.id ?? null;
  // 登录提示按 token 判断，避免“已登录但 userInfo 还在加载”时误闪未登录提示。
  const isAuthenticated = Boolean(authToken);
  const requireAuth = useRequireAuth();
  const queryClient = useQueryClient();
  const plazaQuery = useRequestBattleList(PLAZA_LIST_PARAMS);
  const battleStatsQuery = useRequestBattleStats({ enabled: isAuthenticated });
  const myBankerQuery = useRequestBattleList(MY_BANKER_LIST_PARAMS, { enabled: isAuthenticated });
  const myChallengerQuery = useRequestBattleList(MY_CHALLENGER_LIST_PARAMS, { enabled: isAuthenticated });
  const createBattleMutation = useRequestBattleCreate();
  const joinBattleMutation = useRequestBattleJoin();
  const addStakeMutation = useRequestBattleBankerAddStake();
  const declareBattleMutation = useRequestBattleDeclare();
  const confirmBattleMutation = useRequestBattleChallengerConfirm();
  const disputeBattleMutation = useRequestBattleChallengerDispute();
  const withdrawBattleMutation = useRequestBattleWithdraw();
  const createCommentMutation = useRequestCreateComment();
  const likeBattleMutation = useRequestLikeEntity();
  const unlikeBattleMutation = useRequestUnlikeEntity();

  const [rulesOpen, setRulesOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PlazaTab>('plaza');
  const [activeSort, setActiveSort] = useState<PlazaSort>('最新');
  const [topic, setTopic] = useState('');
  const [bankerOpinion, setBankerOpinion] = useState('');
  const [challengerOpinion, setChallengerOpinion] = useState('');
  const [wager, setWager] = useState(DEFAULT_COMPOSE_WAGER);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [settlePreset, setSettlePreset] = useState<string>(COMPOSE_SETTLE_PRESETS[0].value);
  const [inviteInput, setInviteInput] = useState('');
  const [quickRoomCode, setQuickRoomCode] = useState('');
  const [joinAmount, setJoinAmount] = useState(DEFAULT_JOIN_AMOUNT);
  const [joinModal, setJoinModal] = useState<JoinModalState | null>(null);
  const [addStakeAmount, setAddStakeAmount] = useState(500);
  const [addStakeModal, setAddStakeModal] = useState<AddStakeModalState | null>(null);
  const [detailBattleId, setDetailBattleId] = useState<number | null>(null);
  const [commentOpen, setCommentOpen] = useState<Record<string, boolean>>({});
  const [commentDraftMap, setCommentDraftMap] = useState<Record<string, string>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const detailBattleQuery = useRequestBattleDetail(detailBattleId ?? undefined, { enabled: detailBattleId !== null });

  const myRoleBattleItems = useMemo(() => {
    const map = new Map<number, BattleListItem>();
    [...(myBankerQuery.data?.list ?? []), ...(myChallengerQuery.data?.list ?? [])].forEach((item) => {
      map.set(item.battle.id, item);
    });
    return Array.from(map.values());
  }, [myBankerQuery.data?.list, myChallengerQuery.data?.list]);
  const myBankerBattleIds = useMemo(
    () => new Set((myBankerQuery.data?.list ?? []).map((item) => item.battle.id)),
    [myBankerQuery.data?.list],
  );
  const myChallengerBattleIds = useMemo(
    () => new Set((myChallengerQuery.data?.list ?? []).map((item) => item.battle.id)),
    [myChallengerQuery.data?.list],
  );

  // 列表接口不带 settlement，只有“我的庄局 / 我的挑战”页才补详情查询。
  // 这样可以保住首页请求量，同时又能在我的页面正确计算 withdraw / confirm / dispute 按钮态。
  const myDetailQueries = useQueries(
    myRoleBattleItems.map((item) => ({
      queryKey: battleQueryKeys.detail(item.battle.id),
      queryFn: async () => fetchBattleDetail(item.battle.id),
      enabled: activeTab !== 'plaza' && activeTab !== 'private' && isAuthenticated,
    })),
  ) as Array<{ data?: BattleDetailResponse }>;

  const allBattleItems = useMemo(() => {
    const map = new Map<number, BattleListItem>();
    [...(plazaQuery.data?.list ?? []), ...myRoleBattleItems].forEach((item) => {
      map.set(item.battle.id, item);
    });
    return Array.from(map.values());
  }, [myRoleBattleItems, plazaQuery.data?.list]);

  const commentQueries = useQueries(
    allBattleItems.map((item) => {
      const isOpen = Boolean(commentOpen[String(item.battle.id)]);

      return {
        queryKey: ['requestCommentComments', { entityType: 'battle', entityId: item.battle.id }],
        queryFn: () => fetchCommentComments({
          entityType: 'battle',
          entityId: item.battle.id,
        }),
        enabled: isAuthenticated && isOpen,
      };
    }),
  ) as Array<{ data?: { results?: CommentResponse[] } }>;

  const commentMap = useMemo(() => {
    const map = new Map<number, DuelComment[]>();
    allBattleItems.forEach((item, index) => {
      const results = commentQueries[index]?.data?.results ?? [];
      map.set(item.battle.id, results.map(mapCommentToDuelComment));
    });
    return map;
  }, [allBattleItems, commentQueries]);

  const detailMap = useMemo(() => {
    const map = new Map<number, BattleDetailResponse>();
    myRoleBattleItems.forEach((item, index) => {
      const detail = myDetailQueries[index]?.data;
      if (detail) map.set(item.battle.id, detail);
    });
    return map;
  }, [myDetailQueries, myRoleBattleItems]);

  // 广场与“我的”两个 tab 共享同一套 DuelItem 映射，保证 PC/手机端展示逻辑一致。
  // 广场 Tab 下详情查询是禁用的，但若用户曾进过「我的」页，缓存里的 detail 仍会参与合并并盖住列表字段，
  // 导致点击刷新后列表已更新、卡片仍显示旧盘口/状态；广场展示一律以列表接口为准。
  const plazaDuels = useMemo(
    () =>
      (plazaQuery.data?.list ?? []).map((item) =>
        mapBattleToDuel(
          item,
          currentUserId,
          undefined,
          commentMap.get(item.battle.id) ?? [],
          myBankerBattleIds.has(item.battle.id) ? 'banker' : myChallengerBattleIds.has(item.battle.id) ? 'challenger' : undefined,
        ),
      ),
    [plazaQuery.data?.list, currentUserId, commentMap, myBankerBattleIds, myChallengerBattleIds],
  );
  const myBankerDuels = useMemo(
    () => (myBankerQuery.data?.list ?? []).map((item) => mapBattleToDuel(item, currentUserId, detailMap.get(item.battle.id), commentMap.get(item.battle.id) ?? [], 'banker')),
    [myBankerQuery.data?.list, currentUserId, detailMap, commentMap],
  );
  const myChallengerDuels = useMemo(
    () => (myChallengerQuery.data?.list ?? []).map((item) => mapBattleToDuel(item, currentUserId, detailMap.get(item.battle.id), commentMap.get(item.battle.id) ?? [], 'challenger')),
    [myChallengerQuery.data?.list, currentUserId, detailMap, commentMap],
  );

  const sortDuels = (list: DuelItem[]) => {
    const next = [...list];
    switch (activeSort) {
      case '最新':
        return next.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      case '进行中':
        return next.filter((duel) => duel.rawStatus === 'open');
      case '待结果':
        return next.filter((duel) => duel.rawStatus === 'pending');
      case '已结算':
        return next.filter((duel) => duel.rawStatus === 'settled');
      default:
        return next.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    }
  };

  const sortedPlazaDuels = useMemo(() => sortDuels(plazaDuels), [activeSort, plazaDuels]);
  const privateDuels = useMemo(() => plazaDuels.filter((duel) => duel.visibility === 'private'), [plazaDuels]);
  const sortedPrivateDuels = useMemo(() => sortDuels(privateDuels), [activeSort, privateDuels]);

  const fallbackUnsettledItems = useMemo(
    () => (plazaQuery.data?.list ?? []).filter((item) => item.battle.status !== 'settled'),
    [plazaQuery.data?.list],
  );
  const fallbackPoolTotal = useMemo(
    () => fallbackUnsettledItems.reduce((sum, item) => sum + item.battle.poolPrincipalTotal, 0),
    [fallbackUnsettledItems],
  );
  const fallbackUnsettledCount = fallbackUnsettledItems.length;
  const fallbackBankerCount = useMemo(
    () => new Set(fallbackUnsettledItems.map((item) => item.battle.bankerUserId)).size,
    [fallbackUnsettledItems],
  );
  const fallbackChallengerCount = useMemo(
    () => (plazaQuery.data?.list ?? []).filter((item) => item.battle.challengerStakeTotal > 0).length,
    [plazaQuery.data?.list],
  );
  const totalFrozen = battleStatsQuery.data?.poolTotal ?? fallbackPoolTotal;
  const totalBattleCount = battleStatsQuery.data?.unsettledCount ?? fallbackUnsettledCount;
  const totalBankerCount = battleStatsQuery.data?.bankerCount ?? fallbackBankerCount;
  const totalChallengerCount = battleStatsQuery.data?.challengerCount ?? fallbackChallengerCount;

  const battleListRefreshing =
    plazaQuery.isFetching || battleStatsQuery.isFetching || myBankerQuery.isFetching || myChallengerQuery.isFetching;

  const refetchBattleLists = () => {
    void (async () => {
      await Promise.all([
        queryClient.invalidateQueries(battleQueryKeys.lists()),
        queryClient.invalidateQueries(battleQueryKeys.details()),
        queryClient.invalidateQueries(battleQueryKeys.stats()),
      ]);
    })();
  };

  const userAvatarUrl = useMemo(
    () => createUserAvatarUrl(currentUserId, 88) || DEFAULT_USER_AVATAR,
    [currentUserId],
  );

  const joinModalMax = joinModal ? Math.max(100, joinModal.max) : 100;
  const normalizedJoinAmount = joinModal ? clampAmount(joinAmount, 100, joinModalMax) : 100;
  const normalizedAddStakeAmount = Math.max(100, Number(addStakeAmount) || 0);
  const canSubmitCreate =
    isAuthenticated &&
    !createBattleMutation.isLoading &&
    topic.trim().length > 0 &&
    bankerOpinion.trim().length > 0 &&
    challengerOpinion.trim().length > 0 &&
    Number.isFinite(wager) &&
    wager >= 100 &&
    Boolean(settlePreset) &&
    (visibility === 'public' || inviteInput.trim().length > 0);
  const canSubmitJoin =
    isAuthenticated &&
    !joinBattleMutation.isLoading &&
    Boolean(joinModal) &&
    normalizedJoinAmount >= 100 &&
    normalizedJoinAmount <= joinModalMax &&
    (joinModal?.visibility !== 'private' || inviteInput.trim().length > 0);
  const canSubmitAddStake =
    isAuthenticated &&
    !addStakeMutation.isLoading &&
    Boolean(addStakeModal) &&
    normalizedAddStakeAmount >= 100;

  const pushFeedback = (tone: 'success' | 'error' | 'info', text: string) => {
    if (tone === 'error') {
      showOperationErrorToast(text);
      return;
    }
    setFeedback({ tone, text });
  };

  const setMappedError = (error: unknown) => {
    const message = error instanceof Error ? error.message : '';
    showOperationErrorToast(getBattleErrorMessage(message));
  };

  useEffect(() => {
    if (!plazaQuery.isError || !isAuthenticated) return;
    setMappedError(plazaQuery.error);
  }, [isAuthenticated, plazaQuery.error, plazaQuery.isError]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'my-banker' || !myBankerQuery.isError) return;
    setMappedError(myBankerQuery.error);
  }, [activeTab, isAuthenticated, myBankerQuery.error, myBankerQuery.isError]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'my-challenger' || !myChallengerQuery.isError) return;
    setMappedError(myChallengerQuery.error);
  }, [activeTab, isAuthenticated, myChallengerQuery.error, myChallengerQuery.isError]);

  // 创建前先在页面层挡一轮基础校验，避免无意义请求直接打后端。
  const handleOpenCompose = () => {
    if (!requireAuth()) return;
    setComposeOpen(true);
  };

  /** 做庄表单 + 底部私人邀请码：确认开局后清空 */
  const resetComposeInputs = () => {
    setTopic('');
    setBankerOpinion('');
    setChallengerOpinion('');
    setWager(DEFAULT_COMPOSE_WAGER);
    setVisibility('public');
    setSettlePreset(COMPOSE_SETTLE_PRESETS[0].value);
    setInviteInput('');
  };

  const refetchTabData = (tab: PlazaTab) => {
    if (tab === 'plaza' || tab === 'private') {
      void queryClient.refetchQueries(battleQueryKeys.list(PLAZA_LIST_PARAMS));
      return;
    }
    if (tab === 'my-banker') {
      void queryClient.refetchQueries(battleQueryKeys.list(MY_BANKER_LIST_PARAMS));
      return;
    }
    if (tab === 'my-challenger') {
      void queryClient.refetchQueries(battleQueryKeys.list(MY_CHALLENGER_LIST_PARAMS));
    }
  };

  const handleTabChange = (tab: PlazaTab) => {
    if ((tab === 'my-banker' || tab === 'my-challenger') && !requireAuth()) return;
    setActiveTab(tab);
    refetchTabData(tab);
  };

  const handleEnterPrivateRoom = () => {
    const code = quickRoomCode.trim().toUpperCase();
    if (!code) {
      pushFeedback('error', '请输入房间号。');
      return;
    }
    setInviteInput(code);
    const duel = plazaDuels.find((item) => item.inviteCode?.toUpperCase() === code);
    if (!duel) {
      pushFeedback('error', '未找到该私人赌局，请确认房间号是否正确。');
      return;
    }
    setActiveTab('private');
    refetchTabData('private');
    if (duel.canJoin) {
      setJoinModal({
        duelId: duel.battleId,
        title: duel.topic,
        max: Math.max(0, duel.wager - duel.currentPool),
        visibility: 'private',
      });
      setJoinAmount(DEFAULT_JOIN_AMOUNT);
      return;
    }
    pushFeedback('info', '已定位到该房间，请查看列表详情。');
  };

  const handleCreate = async () => {
    if (!requireAuth()) return;
    if (!topic.trim() || !bankerOpinion.trim() || !challengerOpinion.trim()) {
      pushFeedback('error', '请先完整填写议题和双方立场。');
      return;
    }
    if (!settlePreset) {
      pushFeedback('error', '请选择结算时间。');
      return;
    }

    const settleHours = COMPOSE_SETTLE_PRESETS.find((item) => item.value === settlePreset)?.hours;
    if (!settleHours) {
      pushFeedback('error', '结算时间格式不正确。');
      return;
    }

    const settleTimestamp = Math.floor(Date.now() / 1000) + settleHours * 3600;
    if (wager < 100) {
      pushFeedback('error', '开战金额不能低于 100。');
      return;
    }
    if (visibility === 'private' && inviteInput.trim().length === 0) {
      pushFeedback('error', '私密场必须填写邀请码。');
      return;
    }
    if (settleTimestamp <= Math.floor(Date.now() / 1000)) {
      pushFeedback('error', '结算时间必须晚于当前时间。');
      return;
    }

    const createPayload = {
      title: topic.trim(),
      bankerSide: bankerOpinion.trim(),
      challengerSide: challengerOpinion.trim(),
      stakeAmount: wager,
      isPublic: visibility === 'public',
      inviteCode: visibility === 'private' ? inviteInput.trim() : '',
      settleTime: settleTimestamp,
      requestId: createBattleRequestId('battle-create'),
    };

    resetComposeInputs();

    try {
      await createBattleMutation.mutateAsync(createPayload);
      setComposeOpen(false);
      pushFeedback('success', '赌局已创建，广场列表已刷新。');
    } catch (error) {
      setMappedError(error);
    }
  };

  const handleJoinBattle = async () => {
    if (!joinModal) return;
    if (!requireAuth()) return;
    if (joinModal.visibility === 'private' && inviteInput.trim().length === 0) {
      pushFeedback('error', '私密赌局需要先填写邀请码。');
      return;
    }
    if (normalizedJoinAmount > joinModal.max) {
      pushFeedback('error', `挑战金额超过剩余额度，当前最多 ${formatCoinLabel(joinModal.max)}。`);
      return;
    }
    try {
      await joinBattleMutation.mutateAsync({
        battleId: joinModal.duelId,
        amount: normalizedJoinAmount,
        requestId: createBattleRequestId(`battle-join-${joinModal.duelId}`),
        inviteCode: joinModal.visibility === 'private' ? inviteInput.trim() : '',
      });
      setJoinModal(null);
      pushFeedback('success', '已成功加入赌局。');
    } catch (error) {
      setMappedError(error);
    }
  };

  const handleBankerAddStake = async () => {
    if (!addStakeModal) return;
    if (!requireAuth()) return;
    try {
      await addStakeMutation.mutateAsync({
        battleId: addStakeModal.duelId,
        amount: normalizedAddStakeAmount,
        requestId: createBattleRequestId(`battle-banker-add-${addStakeModal.duelId}`),
      });
      setAddStakeModal(null);
      pushFeedback('success', '庄家追加押注成功。');
    } catch (error) {
      setMappedError(error);
    }
  };

  const handleDeclareResult = async (duel: DuelItem, result: 'banker_wins' | 'banker_loses') => {
    if (!requireAuth()) return;
    try {
      const battle = await declareBattleMutation.mutateAsync({ battleId: duel.battleId, result });
      const declared = normalizeBattleResult(battle.result);
      const declaredLabel = declared ? getBattleResultLabel(declared) : '未知';
      const expectedLabel = getBattleResultLabel(result);
      pushFeedback(
        'success',
        declared === result
          ? `宣判已提交：${declaredLabel}`
          : `宣判已提交，但服务端记录为「${declaredLabel}」（你提交的是「${expectedLabel}」）`,
      );
    } catch (error) {
      setMappedError(error);
    }
  };

  const handleChallengeConfirm = async (duel: DuelItem) => {
    if (!requireAuth()) return;
    try {
      await confirmBattleMutation.mutateAsync({
        battleId: duel.battleId,
        requestId: createBattleRequestId(`battle-confirm-${duel.battleId}`),
        remark: '前端确认结果',
      });
      pushFeedback('success', '你已确认本局结果。');
    } catch (error) {
      setMappedError(error);
    }
  };

  const handleChallengeDispute = async (duel: DuelItem) => {
    if (!requireAuth()) return;
    try {
      await disputeBattleMutation.mutateAsync({
        battleId: duel.battleId,
        requestId: createBattleRequestId(`battle-dispute-${duel.battleId}`),
        remark: '前端发起异议',
      });
      pushFeedback('success', '异议已提交，等待管理员仲裁。');
    } catch (error) {
      setMappedError(error);
    }
  };

  const handleWithdraw = async (duel: DuelItem) => {
    if (!requireAuth()) return;
    try {
      await withdrawBattleMutation.mutateAsync({
        battleId: duel.battleId,
        requestId: createBattleRequestId(`battle-withdraw-${duel.battleId}`),
      });
      pushFeedback('success', '奖励已提取到你的龟币账户。');
    } catch (error) {
      setMappedError(error);
    }
  };

  const handleToggleBattleLike = async (duel: DuelItem) => {
    if (!requireAuth()) return;

    const nextLiked = !likedMap[duel.id];
    setLikedMap((prev) => ({ ...prev, [duel.id]: nextLiked }));

    try {
      if (nextLiked) {
        await likeBattleMutation.mutateAsync({ entityType: 'battle', entityId: duel.battleId });
      } else {
        await unlikeBattleMutation.mutateAsync({ entityType: 'battle', entityId: duel.battleId });
      }
    } catch (error) {
      setLikedMap((prev) => ({ ...prev, [duel.id]: !nextLiked }));
      setMappedError(error);
    }
  };

  const handleCreateBattleComment = async (duel: DuelItem) => {
    const draft = commentDraftMap[duel.id]?.trim() ?? '';
    if (!requireAuth()) return;
    if (!draft) {
      pushFeedback('error', '评论内容不能为空。');
      return;
    }

    try {
      await createCommentMutation.mutateAsync({
        entityType: 'battle',
        entityId: duel.battleId,
        content: draft,
      });
      setCommentDraftMap((prev) => ({ ...prev, [duel.id]: '' }));
      pushFeedback('success', '评论已发布。');
    } catch (error) {
      setMappedError(error);
    }
  };

  const renderList = (items: DuelItem[], emptyText = '暂无赌局', viewContext: PlazaTab = 'plaza') =>
    items.length > 0 ? (
      items.map((duel) => (
        <BattlePlazaDuelCard
          key={duel.id}
          viewContext={viewContext}
          duel={duel}
          commentsOpen={!!commentOpen[duel.id]}
          liked={!!likedMap[duel.id]}
          onToggleComments={() => {
            if (!requireAuth()) return;
            setCommentOpen((prev) => ({ ...prev, [duel.id]: !prev[duel.id] }));
          }}
          onToggleLike={() => void handleToggleBattleLike(duel)}
          onJoin={() => {
            if (!requireAuth()) return;
            setJoinAmount(DEFAULT_JOIN_AMOUNT);
            if (duel.visibility === 'private' && duel.inviteCode) {
              setInviteInput(duel.inviteCode);
            }
            setJoinModal({
              duelId: duel.battleId,
              title: duel.topic,
              max: Math.max(0, duel.wager - duel.currentPool),
              visibility: duel.visibility,
            });
          }}
          onCopyInvite={(code) => {
            void navigator.clipboard?.writeText(code);
          }}
          onAddStake={() => {
            if (!requireAuth()) return;
            setAddStakeAmount(500);
            setAddStakeModal({
              duelId: duel.battleId,
              title: duel.topic,
              visibility: duel.visibility,
              currentWager: duel.wager,
            });
          }}
          onViewDetail={() => setDetailBattleId(duel.battleId)}
          onDeclare={(result) => void handleDeclareResult(duel, result)}
          onConfirm={() => void handleChallengeConfirm(duel)}
          onDispute={() => void handleChallengeDispute(duel)}
          onWithdraw={() => void handleWithdraw(duel)}
          commentDraft={commentDraftMap[duel.id] ?? ''}
          onCommentDraftChange={(value) => setCommentDraftMap((prev) => ({ ...prev, [duel.id]: value }))}
          onSubmitComment={() => void handleCreateBattleComment(duel)}
          commentSubmitting={createCommentMutation.isLoading}
        />
      ))
    ) : (
      <BattlePlazaListEmpty text={emptyText} />
    );

  const detailBattle = detailBattleQuery.data?.battle ?? null;
  const detailSettlement = detailBattleQuery.data?.settlement?.settlement ?? null;
  const detailMyItem = detailBattleQuery.data?.settlement?.myItem ?? null;
  const detailMyAction = detailBattleQuery.data?.myAction ?? '';
  const detailStatusLabel = detailBattle
    ? detailBattle.status === 'pending'
      ? '待宣布'
      : detailBattle.status === 'settled'
        ? '已结算'
        : detailBattle.status === 'disputed'
          ? '争议中'
          : detailBattle.status === 'sealed'
            ? '已封盘'
            : '进行中'
    : '';
  const detailNormalizedResult = detailBattle?.result
    ? normalizeBattleResult(detailBattle.result)
    : undefined;
  const detailResultLabel = detailNormalizedResult
    ? getBattleResultLabel(detailNormalizedResult)
    : '待宣布';

  return (
    <>
      <div
        id="page-battle-square"
        className={css("page-battle-square legacy-battle-square relative min-h-full bg-transparent px-0 py-0 md:rounded-none")}
      >
        <div className={css("bp-wrap")}>
          {!isAuthenticated ? (
            <div
              className={css("duel-compose")}
              style={{
                borderColor: 'rgba(245,158,11,.22)',
                background: 'linear-gradient(135deg, rgba(24,24,27,.96), rgba(15,23,42,.94))',
                boxShadow: '0 18px 40px rgba(0,0,0,.28)',
                cursor: 'pointer',
              }}
              onClick={() => requireAuth()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  requireAuth();
                }
              }}
            >
              <div className={css("dc-header")}>
                <div className={css("dc-ava")}>🔐</div>
                <div className={css("dc-placeholder")} style={{ cursor: 'pointer', color: '#f8d27a' }}>
                  当前未登录。登录后可浏览赌局广场，并进行创建、挑战、评论等操作。
                </div>
              </div>
            </div>
          ) : null}

          {feedback ? (
            <div
              className={css("duel-compose")}
              style={{
                borderColor:
                  feedback.tone === 'error'
                    ? 'rgba(239,68,68,.22)'
                    : feedback.tone === 'success'
                      ? 'rgba(16,185,129,.22)'
                      : undefined,
              }}
            >
              <div className={css("dc-header")}>
                <div className={css("dc-ava")}>{feedback.tone === 'error' ? '⚠️' : feedback.tone === 'success' ? '✅' : 'ℹ️'}</div>
                <div
                  className={css("dc-placeholder")}
                  style={{
                    cursor: 'default',
                    color:
                      feedback.tone === 'error'
                        ? 'var(--red)'
                        : feedback.tone === 'success'
                          ? 'var(--green)'
                          : 'var(--ink)',
                  }}
                >
                  {feedback.text}
                </div>
                <button type="button" className={css("dc-cancel")} onClick={() => setFeedback(null)}>
                  关闭
                </button>
              </div>
            </div>
          ) : null}

          <div className={css("bp-page-head")}>
            <div className={css("bp-page-kicker")}>
              <HubBuildingIcon className={css("bp-page-kicker-ico")} />
              <span>BATTLE PLAZA</span>
            </div>
            <h1 className={css("bp-page-title")}>地下钱庄</h1>
          </div>

          <div className={css("bp-hub")}>
            <div className={css("bp-hub-metrics")}>
              <div className={css("phb-stats")}>
                <div className={css("phb-metric")}>
                  <div className={css("phb-metric-head")}>
                    <img src={BATTLE_HUB_ASSETS.activeGames} alt="" className={css("phb-metric-ico-img")} />
                    <span className={css("phb-metric-lbl")}>当前赌局</span>
                  </div>
                  <span className={css("phb-metric-val phb-metric-val--green")}>{totalBattleCount}</span>
                </div>
                <div className={css("phb-metric")}>
                  <div className={css("phb-metric-head")}>
                    <img src={BATTLE_HUB_ASSETS.frozenCoins} alt="" className={css("phb-metric-ico-img")} />
                    <span className={css("phb-metric-lbl")}>冻结龟币</span>
                  </div>
                  <span className={css("phb-metric-val phb-metric-val--gold")}>{formatCoins(totalFrozen)}</span>
                </div>
                <div className={css("phb-metric")}>
                  <div className={css("phb-metric-head")}>
                    <img src={BATTLE_HUB_ASSETS.bankers} alt="" className={css("phb-metric-ico-img")} />
                    <span className={css("phb-metric-lbl")}>庄家人数</span>
                  </div>
                  <span className={css("phb-metric-val phb-metric-val--blue")}>{totalBankerCount}</span>
                </div>
                <div className={css("phb-metric")}>
                  <div className={css("phb-metric-head")}>
                    <img src={BATTLE_HUB_ASSETS.challengers} alt="" className={css("phb-metric-ico-img")} />
                    <span className={css("phb-metric-lbl")}>挑战者人数</span>
                  </div>
                  <span className={css("phb-metric-val phb-metric-val--purple")}>{totalChallengerCount}</span>
                </div>
              </div>
            </div>

            <div className={css("bp-hub-divider")} aria-hidden />

            <div className={css("duel-compose")}>
              <div className={css("dc-header")}>
                <div className={css("dc-ava")}>
                  <img src={userAvatarUrl} alt="" className={css("dc-ava-img")} />
                </div>
                <div className={css("dc-placeholder")} onClick={handleOpenCompose}>
                  想开局收押注？设一个议题，让挑战者来撕……
                </div>
                <button type="button" className={css("dc-btn")} onClick={handleOpenCompose}>
                  我要做庄
                </button>
              </div>
            </div>

            <div className={css("bp-hub-divider")} aria-hidden />

            <div className={css(`plaza-rules ${rulesOpen ? 'open' : ''}`)}>
              <div className={css("plaza-rules-header")} onClick={() => setRulesOpen((prev) => !prev)}>
                <HubScrollIcon className={css("plaza-rules-ico")} />
                <div className={css("plaza-rules-title")}>广场规则 · 开局前必读</div>
                <div className={css(`plaza-rules-chev ${rulesOpen ? 'open' : ''}`)} aria-hidden>
                  <svg viewBox="0 0 12 12" fill="none">
                    <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              {rulesOpen ? (
                <div className={css("plaza-rules-body")}>
                  <div className={css("rules-section")}>
                    <div className={css("rules-section-head")}>
                      <HubGearIcon className={css("rules-section-ico")} />
                      <div className={css("rules-section-title")}>基本机制</div>
                    </div>
                    <PlazaRuleList items={PLAZA_RULE_BASIC_ITEMS} />
                  </div>
                  <div className={css("rules-section")}>
                    <div className={css("rules-section-head")}>
                      <HubFlagIcon className={css("rules-section-ico")} />
                      <div className={css("rules-section-title")}>结算流程</div>
                    </div>
                    <ul className={css("rules-list")}>
                      {PLAZA_RULE_SETTLE_ITEMS.map((item) => (
                        <li key={item} className={css("rules-list-item")}>
                          {item}
                        </li>
                      ))}
                      <li className={css("rules-list-item rules-list-item--tip")}>
                        <span className={css("rules-tip-label")}>温馨提示：</span>
                        {PLAZA_RULE_SETTLE_TIP}
                      </li>
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>

            <div className={css("bp-hub-divider")} aria-hidden />

            <div className={css("quick-room-entry")}>
              <div className={css("quick-room-left")}>
                <HubLockIcon className={css("quick-room-ico")} />
                <span className={css("quick-room-label")}>私人赌局快速进入</span>
              </div>
              <input
                className={css("quick-room-input")}
                value={quickRoomCode}
                onChange={(e) => setQuickRoomCode(e.target.value.toUpperCase())}
                placeholder="输入 4 位房间号 (A7K9)"
                maxLength={20}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleEnterPrivateRoom();
                  }
                }}
              />
              <button type="button" className={css("quick-room-btn")} onClick={handleEnterPrivateRoom}>
                进入房间
              </button>
            </div>
          </div>

          <div className={css("bp-toolbar")}>
            <div className={css("bp-segmented")} role="tablist" aria-label="赌局列表视图">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'plaza'}
                className={css("bp-segment")}
                onClick={() => handleTabChange('plaza')}
              >
                赌局广场
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'private'}
                className={css("bp-segment")}
                onClick={() => handleTabChange('private')}
              >
                {activeTab !== 'private' ? <HubLockIcon className={css("bp-segment-lock")} /> : null}
                私人赌局
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'my-banker'}
                className={css("bp-segment")}
                onClick={() => handleTabChange('my-banker')}
              >
                我做的庄
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'my-challenger'}
                className={css("bp-segment")}
                onClick={() => handleTabChange('my-challenger')}
              >
                我的挑战
              </button>
            </div>
            {activeTab === 'plaza' || activeTab === 'private' ? (
              <div className={css("bp-plaza-controls")}>
                <label htmlFor="bp-plaza-sort" className={css("bp-sort-label")}>
                  排序
                </label>
                <select
                  id="bp-plaza-sort"
                  className={css("bp-sort-select")}
                  value={activeSort}
                  onChange={(e) => setActiveSort(e.target.value as PlazaSort)}
                >
                  {PLAZA_SORTS.map((sort) => (
                    <option key={sort} value={sort}>
                      {sort}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={css("bp-refresh-icon-btn")}
                  aria-label={battleListRefreshing ? '刷新中' : '刷新列表'}
                  disabled={battleListRefreshing}
                  onClick={refetchBattleLists}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      animation: battleListRefreshing ? `${kf('bp-spin')} 0.9s linear infinite` : undefined,
                    }}
                  >
                    ⟳
                  </span>
                </button>
              </div>
            ) : null}
          </div>

          {activeTab === 'plaza' && (
            <>
              {plazaQuery.isLoading ? (
                <div className={css("empty-state")}>
                  <div className={css("empty-ico")}>⏳</div>
                  <div className={css("empty-title")}>开战广场加载中</div>
                  <div className={css("empty-sub")}>正在同步最新赌局数据…</div>
                </div>
              ) : plazaQuery.isError ? (
                <div className={css("empty-state")}>
                  <div className={css("empty-ico")}>⚠️</div>
                  <div className={css("empty-title")}>广场加载失败</div>
                  <div className={css("empty-sub")}>请稍后重试，或刷新页面重新拉取 battle 列表。</div>
                </div>
              ) : (
                renderList(
                  sortedPlazaDuels,
                  activeSort === '最新' ? '暂无赌局' : `当前「${activeSort}」筛选下暂无赌局`,
                  'plaza',
                )
              )}
            </>
          )}

          {activeTab === 'private' && (
            <>
              {plazaQuery.isLoading ? (
                <div className={css("empty-state")}>
                  <div className={css("empty-ico")}>⏳</div>
                  <div className={css("empty-title")}>私人赌局加载中</div>
                  <div className={css("empty-sub")}>正在同步最新私密场数据…</div>
                </div>
              ) : plazaQuery.isError ? (
                <div className={css("empty-state")}>
                  <div className={css("empty-ico")}>⚠️</div>
                  <div className={css("empty-title")}>私人赌局加载失败</div>
                  <div className={css("empty-sub")}>请稍后重试，或刷新页面重新拉取 battle 列表。</div>
                </div>
              ) : (
                renderList(
                  sortedPrivateDuels,
                  activeSort === '最新' ? '暂无私人赌局' : `当前「${activeSort}」筛选下暂无私人赌局`,
                  'private',
                )
              )}
            </>
          )}

          {activeTab === 'my-banker' && (
            <>
              <div className={css("banker-tips")}>
                <div className={css("bt-header")}>
                  <div style={{ fontSize: 22 }}>💡</div>
                  <div className={css("bt-title")}>做庄小贴士</div>
                </div>
                <div className={css("bt-list")}>
                  <div className={css("bt-tip")}><div>📌</div><div>议题要明确，避免模糊表述，否则可能被判作废。</div></div>
                  <div className={css("bt-tip")}><div>⏰</div><div>结算时间到后 24h 内必须宣布结果，超时系统自动判输。</div></div>
                  <div className={css("bt-tip")}><div>💰</div><div>公开赌局可赚取入场费，但虚报结果也会触发处罚。</div></div>
                </div>
              </div>
              <div className={css("banker-overview")}>
                <div className={css("bo-item")}><div className={css("bo-num")}>{myBankerDuels.filter((d) => d.status !== 'settled').length}</div><div className={css("bo-label")}>进行中</div></div>
                <div className={css("bo-item")}><div className={css("bo-num")}>{myBankerDuels.filter((d) => d.status === 'settled').length}</div><div className={css("bo-label")}>已结算</div></div>
                <div className={css("bo-item")}><div className={css("bo-num")}>{formatCoins(myBankerDuels.reduce((sum, duel) => sum + duel.currentPool, 0))}</div><div className={css("bo-label")}>挑战总额</div></div>
              </div>
              {myBankerQuery.isLoading ? (
                <div className={css("empty-state")}>
                  <div className={css("empty-ico")}>⏳</div>
                  <div className={css("empty-title")}>正在加载我的庄局</div>
                  <div className={css("empty-sub")}>稍等一下，我们正在拉取你的做庄记录。</div>
                </div>
              ) : !isAuthenticated ? (
                <div className={css("empty-state")}>
                  <div className={css("empty-ico")}>🔐</div>
                  <div className={css("empty-title")}>请先登录</div>
                  <div className={css("empty-sub")}>登录后可查看和管理你的做庄记录。</div>
                  <button type="button" className={css("dc-btn")} style={{ marginTop: 16 }} onClick={() => requireAuth()}>
                    去登录
                  </button>
                </div>
              ) : myBankerQuery.isError ? (
                <div className={css("empty-state")}>
                  <div className={css("empty-ico")}>⚠️</div>
                  <div className={css("empty-title")}>我的庄局加载失败</div>
                  <div className={css("empty-sub")}>当前无法同步你的 battle 数据，请稍后再试。</div>
                </div>
              ) : (
                renderList(myBankerDuels, '暂无做庄记录', 'my-banker')
              )}
            </>
          )}

          {activeTab === 'my-challenger' && (
            <>
              <div className={css("challenger-tips")}>
                <div className={css("ct-title")}>⚔️ 我的挑战</div>
                <div className={css("bt-list")}>
                  <div className={css("bt-tip")}><div>👀</div><div>关注结算时间，庄家宣布结果后你有 24h 确认窗口。</div></div>
                  <div className={css("bt-tip")}><div>⚠️</div><div>异议要有理有据，恶意异议会被扣冻结额 10% 罚金。</div></div>
                </div>
              </div>
              {myChallengerQuery.isLoading ? (
                <div className={css("empty-state")}>
                  <div className={css("empty-ico")}>⏳</div>
                  <div className={css("empty-title")}>正在加载我的挑战</div>
                  <div className={css("empty-sub")}>稍等一下，我们正在拉取你参与过的赌局。</div>
                </div>
              ) : !isAuthenticated ? (
                <div className={css("empty-state")}>
                  <div className={css("empty-ico")}>🔐</div>
                  <div className={css("empty-title")}>请先登录</div>
                  <div className={css("empty-sub")}>登录后可查看你参与过的挑战记录。</div>
                  <button type="button" className={css("dc-btn")} style={{ marginTop: 16 }} onClick={() => requireAuth()}>
                    去登录
                  </button>
                </div>
              ) : myChallengerQuery.isError ? (
                <div className={css("empty-state")}>
                  <div className={css("empty-ico")}>⚠️</div>
                  <div className={css("empty-title")}>我的挑战加载失败</div>
                  <div className={css("empty-sub")}>当前无法同步你的 challenge 记录，请稍后再试。</div>
                </div>
              ) : (
                renderList(myChallengerDuels, '暂无挑战记录', 'my-challenger')
              )}
            </>
          )}
        </div>

        {composeOpen ? (
          <div className={css("duel-overlay compose-overlay")} onClick={() => setComposeOpen(false)}>
            <div className={css("compose-modal")} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="compose-modal-title">
              <div className={css("compose-modal-head")}>
                <div className={css("compose-modal-title-row")} id="compose-modal-title">
                  <img src={userAvatarUrl} alt="" className={css("compose-modal-ava")} />
                  <span>我要做庄</span>
                </div>
                <button type="button" className={css("compose-modal-close")} aria-label="关闭" onClick={() => setComposeOpen(false)}>
                  ✕
                </button>
              </div>

              <div className={css("compose-modal-body")}>
                <div className={css("compose-field")}>
                  <label className={css("compose-label")} htmlFor="compose-topic">议题</label>
                  <input
                    id="compose-topic"
                    className={css("compose-input")}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="例如：本周比特币能否突破 70k？"
                  />
                </div>

                <div className={css("compose-field")}>
                  <div className={css("compose-label compose-label--red")}>
                    <HubSideIcon tone="red" />
                    <span>庄家立场</span>
                  </div>
                  <input
                    className={css("compose-input")}
                    value={bankerOpinion}
                    onChange={(e) => setBankerOpinion(e.target.value)}
                    placeholder="庄家立场，例如：能突破"
                  />
                </div>

                <div className={css("compose-field")}>
                  <div className={css("compose-label compose-label--blue")}>
                    <HubSideIcon tone="blue" />
                    <span>挑战者立场</span>
                  </div>
                  <input
                    className={css("compose-input")}
                    value={challengerOpinion}
                    onChange={(e) => setChallengerOpinion(e.target.value)}
                    placeholder="挑战者立场，例如：不能突破"
                  />
                </div>

                <div className={css("compose-field")}>
                  <label className={css("compose-label")} htmlFor="compose-wager">押注金额</label>
                  <div className={css("compose-wager-display")}>
                    <input
                      id="compose-wager"
                      className={css("compose-wager-input")}
                      type="number"
                      min={100}
                      value={wager}
                      onChange={(e) => setWager(Number(e.target.value || 0))}
                    />
                    <TurtleCoinIcon size={16} className={css("compose-wager-coin")} />
                  </div>
                  <div className={css("compose-wager-opts")}>
                    {COMPOSE_WAGER_OPTIONS.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        className={css(`compose-wager-opt ${wager === amount ? 'on' : ''}`)}
                        onClick={() => setWager(amount)}
                      >
                        {amount}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={css("compose-field")}>
                  <div className={css("compose-label")}>可见性</div>
                  <div className={css("compose-vis-toggle")}>
                    <button
                      type="button"
                      className={css(`compose-vis-btn ${visibility === 'public' ? 'on' : ''}`)}
                      onClick={() => setVisibility('public')}
                    >
                      <HubGlobeIcon className={css("compose-vis-ico")} />
                      公开
                    </button>
                    <button
                      type="button"
                      className={css(`compose-vis-btn compose-vis-btn--private ${visibility === 'private' ? 'on' : ''}`)}
                      onClick={() => setVisibility('private')}
                    >
                      <HubLockIcon className={css("compose-vis-ico")} />
                      私人
                    </button>
                  </div>
                </div>

                {visibility === 'private' ? (
                  <div className={css("compose-field")}>
                    <label className={css("compose-label")} htmlFor="compose-invite">邀请码</label>
                    <input
                      id="compose-invite"
                      className={css("compose-input")}
                      value={inviteInput}
                      onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
                      placeholder="私密场必须填写邀请码"
                    />
                  </div>
                ) : null}

                <div className={css("compose-field")}>
                  <label className={css("compose-label")} htmlFor="compose-settle">结算时间</label>
                  <div className={css("compose-select-wrap")}>
                    <select
                      id="compose-settle"
                      className={css("compose-select")}
                      value={settlePreset}
                      onChange={(e) => setSettlePreset(e.target.value)}
                    >
                      {COMPOSE_SETTLE_PRESETS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className={css("compose-modal-foot")}>
                <button type="button" className={css("compose-cancel")} onClick={() => setComposeOpen(false)}>
                  取消
                </button>
                <button
                  type="button"
                  className={css("compose-submit")}
                  onClick={() => void handleCreate()}
                  disabled={!canSubmitCreate}
                  style={!canSubmitCreate ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                >
                  {createBattleMutation.isLoading ? (
                    '提交中...'
                  ) : (
                    <>
                      <HubDiceIcon className={css("compose-submit-ico")} />
                      提交开局
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {detailBattleId !== null && (
          <div className={css("duel-overlay")} onClick={() => setDetailBattleId(null)}>
            <div className={css("duel-modal")} onClick={(e) => e.stopPropagation()}>
              <div className={css("dm-close")} onClick={() => setDetailBattleId(null)}>✕</div>
              <div className={css("dm-title")}>赌局详情</div>
              <div className={css("dm-sub")}>Battle #{detailBattleId}</div>

              {detailBattleQuery.isLoading ? (
                <div className={css("dm-fee-note")}>正在加载详情…</div>
              ) : detailBattleQuery.isError ? (
                <div className={css("dm-fee-note")} style={{ color: 'var(--red)' }}>
                  详情加载失败，请稍后重试。
                </div>
              ) : detailBattle ? (
                <>
                  <div className={css("dm-info-grid")}>
                    <div className={css("dm-info-item")}>
                      <div className={css("dm-info-label")}>当前状态</div>
                      <div className={css("dm-info-value")}>{detailStatusLabel}</div>
                    </div>
                    <div className={css("dm-info-item")}>
                      <div className={css("dm-info-label")}>当前结果</div>
                      <div className={css("dm-info-value")}>{detailResultLabel}</div>
                    </div>
                    <div className={css("dm-info-item")}>
                      <div className={css("dm-info-label")}>我的动作</div>
                      <div className={css("dm-info-value")}>{detailMyAction ? detailMyAction : '未操作'}</div>
                    </div>
                    <div className={css("dm-info-item")}>
                      <div className={css("dm-info-label")}>宣判方式</div>
                      <div className={css("dm-info-value")}>{detailBattle.resultBy || '待判定'}</div>
                    </div>
                  </div>

                  <div className={css("dm-fee-note")}>
                    {detailBattle.pendingDeadline ? `庄家宣判截止：${formatTimestampLabel(detailBattle.pendingDeadline)}` : '当前没有庄家宣判截止时间。'}
                    <br />
                    {detailBattle.confirmDeadline ? `挑战者确认截止：${formatTimestampLabel(detailBattle.confirmDeadline)}` : '当前没有挑战者确认截止时间。'}
                    <br />
                    {detailBattle.resultTime ? `结果生效时间：${formatTimestampLabel(detailBattle.resultTime)}` : '结果尚未生效。'}
                  </div>

                  <div className={css("dm-info-grid")}>
                    <div className={css("dm-info-item")}>
                      <div className={css("dm-info-label")}>结算记录</div>
                      <div className={css("dm-info-value")}>
                        {detailSettlement ? `${detailSettlement.result} · ${formatTimestampLabel(detailSettlement.createdAt || detailSettlement.createTime)}` : '未结算'}
                      </div>
                    </div>
                    <div className={css("dm-info-item")}>
                      <div className={css("dm-info-label")}>我的奖金</div>
                      <div className={css("dm-info-value gold")}>
                        {detailMyItem ? <CoinAmount amount={detailMyItem.payoutAmount} iconSize={15} /> : '暂无'}
                      </div>
                    </div>
                    <div className={css("dm-info-item")}>
                      <div className={css("dm-info-label")}>提取状态</div>
                      <div className={css("dm-info-value")}>{detailMyItem ? (detailMyItem.withdrawn ? '已提取' : '待提取') : '无'}</div>
                    </div>
                    <div className={css("dm-info-item")}>
                      <div className={css("dm-info-label")}>提取时间</div>
                      <div className={css("dm-info-value")}>{detailMyItem?.withdrawTime ? formatTimestampLabel(detailMyItem.withdrawTime) : '未提取'}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className={css("dm-fee-note")}>当前没有可展示的详情。</div>
              )}
            </div>
          </div>
        )}

        <BattlePlazaStakeModal
          open={Boolean(joinModal)}
          mode="join"
          remainingAmount={joinModalMax}
          visibility={joinModal?.visibility}
          amount={normalizedJoinAmount}
          minAmount={100}
          maxAmount={joinModalMax}
          feeNote={
            joinModal?.visibility === 'public'
              ? '公开赌局收取 5% 入场费'
              : '私人赌局不收取入场费'
          }
          submitting={joinBattleMutation.isLoading}
          canSubmit={canSubmitJoin}
          onClose={() => setJoinModal(null)}
          onAmountChange={setJoinAmount}
          onSubmit={() => void handleJoinBattle()}
        />

        <BattlePlazaStakeModal
          open={Boolean(addStakeModal)}
          mode="add-stake"
          visibility={addStakeModal?.visibility}
          currentWager={addStakeModal?.currentWager}
          amount={normalizedAddStakeAmount}
          minAmount={100}
          feeNote="追加押注将同步扩大挑战者容量上限"
          submitting={addStakeMutation.isLoading}
          canSubmit={canSubmitAddStake}
          onClose={() => setAddStakeModal(null)}
          onAmountChange={setAddStakeAmount}
          onSubmit={() => void handleBankerAddStake()}
        />
      </div>
    </>
  );
};
