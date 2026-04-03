import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueries } from 'react-query';
import { battleQueryKeys, fetchBattleDetail, useRequestBattleBankerAddStake, useRequestBattleChallengerConfirm, useRequestBattleChallengerDispute, useRequestBattleCreate, useRequestBattleDeclare, useRequestBattleDetail, useRequestBattleJoin, useRequestBattleList, useRequestBattleStats, useRequestBattleWithdraw } from '@/hook/useBattleRequest';
import { createBattleRequestId, getBattleActionPermissions, getBattleErrorMessage, type Battle, type BattleDetailResponse, type BattleListItem, type BattleMyAction } from '@/hook/battleType';
import { useAppSession } from '@/hook/useAppSession';
import { axiosCustom } from '@/api/axios';
import { assertSuccess, getAuthorizationHeaders } from '@/utils/requestUtils';
import { getAuthToken, getStoredUserInfo } from '@/utils/authStorage';
import type { CommentResponse } from '@/hook/useCommentRequest';
import { useRequestCreateComment } from '@/hook/useCommentRequest';
import { useRequestLikeEntity, useRequestUnlikeEntity } from '@/hook/useTopicRequest';
import { API_Comment_Comments } from '@/api/comment_api';

type PlazaTab = 'plaza' | 'my-banker' | 'my-challenger';
type PlazaSort =
  | '最新'
  | '大额'
  | '进行中'
  | '待结果'
  | '已结算';
type DuelStatus = 'open' | 'sealed' | 'pending' | 'settled' | 'private' | 'disputing';
type DuelCategory = 'wc' | 'hot' | 'ai' | 'ent' | 'finance' | 'tech';

interface DuelComment {
  id: string;
  avatar: string;
  name: string;
  side: 'banker' | 'challenger';
  time: string;
  text: string;
  likes: number;
}

interface DuelChallenger {
  id: string;
  avatar: string;
  name: string;
  amount: number;
  feeText: string;
  highlight?: string;
}

interface DuelItem {
  id: string;
  battleId: number;
  topic: string;
  category: DuelCategory;
  banker: {
    name: string;
    avatar: string;
    stance: string;
    isMe?: boolean;
  };
  challengerSideText: string;
  status: DuelStatus;
  wager: number;
  currentPool: number;
  challengerCount: number;
  visibility: 'public' | 'private';
  comments: DuelComment[];
  commentCount: number;
  likes: number;
  settleText: string;
  resultText?: string;
  disputeText?: string;
  inviteCode?: string;
  challengerList?: DuelChallenger[];
  footerActionLabel?: string;
  footerActionTone?: 'blue' | 'orange' | 'gold' | 'red';
  myChallengeInfo?: string;
  myChallengeState?: 'info' | 'confirm';
  myAction?: BattleMyAction;
  canJoin?: boolean;
  canBankerAddStake?: boolean;
  canDeclare?: boolean;
  canConfirm?: boolean;
  canDispute?: boolean;
  canWithdraw?: boolean;
  rawStatus?: Battle['status'];
  createdAt?: number;
}

type JoinModalState = {
  duelId: number;
  title: string;
  max: number;
  visibility: 'public' | 'private';
};

type AddStakeModalState = {
  duelId: number;
  title: string;
};

const PLAZA_SORTS: PlazaSort[] = [
  '最新',
  '大额',
  '进行中',
  '待结果',
  '已结算',
];

const WAGER_OPTIONS = [100, 500, 1000, 2000, 5000, 10000];

const CATEGORY_META: Record<DuelCategory, { label: string; className: string }> = {
  wc: { label: '⚽ 世界杯', className: 'bcat-wc' },
  hot: { label: '🔥 热点', className: 'bcat-hot' },
  ai: { label: '🤖 AI', className: 'bcat-ai' },
  ent: { label: '🎬 娱乐', className: 'bcat-ent' },
  finance: { label: '📈 财经', className: 'bcat-finance' },
  tech: { label: '💻 科技', className: 'bcat-tech' },
};

const STATUS_META: Record<DuelStatus, { label: string; className: string }> = {
  open: { label: '🟢 进行中', className: 'dbadge-open' },
  sealed: { label: '🔒 已封盘', className: 'dbadge-sealed' },
  pending: { label: '⏳ 待宣布', className: 'dbadge-pending' },
  settled: { label: '✅ 已结算', className: 'dbadge-settled' },
  private: { label: '🔒 私人', className: 'dbadge-private' },
  disputing: { label: '⚠️ 争议中', className: 'dbadge-disputing' },
};

const PAGE_STYLES = `
#page-battle-square {
  --red:#ef4444; --red-dim:rgba(239,68,68,.10); --red-glow:rgba(239,68,68,.18);
  --blue:#2563eb; --blue-dim:rgba(37,99,235,.10); --blue-glow:rgba(37,99,235,.18);
  --gold:#d97706; --gold-dim:rgba(217,119,6,.10);
  --green:#0fba81; --orange:#f97316; --purple:#8b5cf6;
  --surface:var(--legacy-panel);
  --surface2:rgba(255,255,255,.58);
  --surface3:rgba(255,255,255,.78);
  --border:var(--legacy-panel-border-soft);
  --border2:var(--legacy-panel-border);
  --ink:var(--legacy-text-1);
  --muted:var(--legacy-text-3);
  color:var(--ink);
  font-family:'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif;
}
#page-battle-square * { box-sizing:border-box; }
#page-battle-square .bp-wrap { width:100%; max-width:none; margin:0; padding:0 0 28px; display:grid; gap:16px; }
#page-battle-square .bp-back { display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:700; color:var(--muted); text-decoration:none; margin-bottom:14px; cursor:pointer; }
#page-battle-square .bp-back:hover { color:var(--ink); }
#page-battle-square .page-hero-battle {
  border-radius:24px; padding:24px 28px; margin-bottom:16px; position:relative; overflow:hidden;
  background:
    radial-gradient(circle at 20% 0%, rgba(14,165,233,.22), transparent 36%),
    radial-gradient(circle at 86% 20%, rgba(236,72,153,.16), transparent 34%),
    linear-gradient(145deg, rgba(255,255,255,.94), rgba(241,247,255,.92));
  border:1px solid var(--border2);
  box-shadow:var(--legacy-shadow);
}
#page-battle-square .page-hero-battle::before {
  content:'⚔️'; position:absolute; right:22px; top:50%; transform:translateY(-50%);
  font-size:96px; opacity:.08; pointer-events:none;
}
#page-battle-square .phb-label { font-size:12px; font-weight:800; letter-spacing:1px; text-transform:uppercase; color:#57728e; margin-bottom:6px; }
#page-battle-square .phb-title { font-family:'Syne','Arial Black',sans-serif; font-size:32px; font-weight:800; color:var(--ink); margin-bottom:6px; }
#page-battle-square .phb-title span { color:var(--red); }
#page-battle-square .phb-sub { font-size:15px; color:#5b6d83; }
#page-battle-square .phb-stats { display:flex; gap:10px; margin-top:14px; flex-wrap:wrap; }
#page-battle-square .phb-stat {
  background:rgba(255,255,255,.62); border:1px solid rgba(56,118,255,.12);
  border-radius:999px; padding:6px 12px; font-size:13px; font-weight:700; color:#23405f;
}
#page-battle-square .plaza-rules,
#page-battle-square .duel-compose,
#page-battle-square .invite-entry,
#page-battle-square .banker-tips,
#page-battle-square .challenger-tips,
#page-battle-square .duel-card,
#page-battle-square .empty-state,
#page-battle-square .bo-item {
  background:var(--surface); border:1px solid var(--border2); border-radius:20px;
  box-shadow:var(--legacy-shadow);
  backdrop-filter:blur(14px);
}
#page-battle-square .plaza-rules { overflow:hidden; margin-bottom:0; }
#page-battle-square .plaza-rules-header { padding:12px 18px; display:flex; align-items:center; gap:8px; cursor:pointer; }
#page-battle-square .plaza-rules-header:hover { background:var(--surface2); }
#page-battle-square .plaza-rules-title { font-size:15px; font-weight:700; color:var(--ink); flex:1; }
#page-battle-square .plaza-rules-chev { font-size:13px; color:var(--muted); transition:transform .2s; }
#page-battle-square .plaza-rules-chev.open { transform:rotate(90deg); }
#page-battle-square .plaza-rules-body { padding:0 18px 16px; }
#page-battle-square .rules-section { margin-top:14px; }
#page-battle-square .rules-section:first-child { margin-top:0; }
#page-battle-square .rules-title { font-size:12px; font-weight:800; color:var(--gold); letter-spacing:.8px; text-transform:uppercase; margin-bottom:8px; }
#page-battle-square .pr-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
#page-battle-square .pr-item { background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:10px 12px; }
#page-battle-square .pr-item-title { font-size:13px; font-weight:700; color:var(--gold); margin-bottom:6px; }
#page-battle-square .pr-item-text,
#page-battle-square .rules-steps { font-size:13px; color:rgba(240,237,232,.68); line-height:1.7; }
#page-battle-square .rules-steps { background:var(--surface2); border:1px solid var(--border); border-radius:12px; padding:14px; }
#page-battle-square .pr-warn { margin-top:14px; background:rgba(255,60,60,.06); border:1px solid rgba(255,60,60,.12); border-radius:10px; padding:10px 14px; }
#page-battle-square .pr-warn-title { font-size:13px; font-weight:700; color:var(--red); margin-bottom:4px; }
#page-battle-square .duel-compose { overflow:hidden; margin-bottom:0; }
#page-battle-square .dc-header {
  padding:16px 18px; display:flex; align-items:center; gap:10px; border-bottom:1px solid var(--border);
  background:
    radial-gradient(circle at 0% 0%, rgba(245,158,11,.10), transparent 26%),
    radial-gradient(circle at 100% 0%, rgba(37,99,235,.10), transparent 24%),
    linear-gradient(180deg, rgba(15,23,42,.08), rgba(255,255,255,.02));
}
#page-battle-square .dc-ava,
#page-battle-square .badd-cmt-ava { width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,var(--red),var(--orange)); display:grid; place-items:center; font-size:16px; flex-shrink:0; }
#page-battle-square .dc-placeholder { flex:1; font-size:15px; color:var(--muted); cursor:pointer; }
#page-battle-square .dc-placeholder:hover { color:var(--ink); }
#page-battle-square .dc-btn,
#page-battle-square .dc-submit,
#page-battle-square .duel-foot-join,
#page-battle-square .dm-cta { border:none; cursor:pointer; transition:.15s; font-weight:700; }
#page-battle-square .dc-btn {
  padding:8px 16px; border-radius:12px; background:linear-gradient(135deg,#f59e0b,#f97316);
  color:#fff; font-size:13px; box-shadow:0 10px 24px rgba(249,115,22,.22);
}
#page-battle-square .dc-btn:hover,
#page-battle-square .dc-submit:hover { filter:brightness(1.04); }
#page-battle-square .dc-form { padding:18px; }
#page-battle-square .dc-row { margin-bottom:12px; }
#page-battle-square .dc-label,
#page-battle-square .dm-label,
#page-battle-square .duel-ch-title,
#page-battle-square .bo-label { font-size:12px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:var(--muted); }
#page-battle-square .dc-input,
#page-battle-square .dc-textarea,
#page-battle-square .invite-entry-input,
#page-battle-square .badd-cmt-inp,
#page-battle-square .dm-stake-input {
  width:100%; background:rgba(255,255,255,.72); border:1px solid var(--border); border-radius:14px; color:var(--ink); outline:none;
}
#page-battle-square .dc-input,
#page-battle-square .invite-entry-input,
#page-battle-square .dm-stake-input { padding:11px 14px; font-size:15px; }
#page-battle-square .dc-textarea { padding:11px 14px; font-size:14px; resize:none; min-height:56px; line-height:1.6; }
#page-battle-square .dc-inline { display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; }
#page-battle-square .dc-inline .dc-row { flex:1; min-width:140px; margin-bottom:0; }
#page-battle-square .dc-stake-opts,
#page-battle-square .dc-vis-toggle,
#page-battle-square .battle-sort,
#page-battle-square .my-duel-bar,
#page-battle-square .dm-amts,
#page-battle-square .duel-foot { display:flex; gap:6px; flex-wrap:wrap; }
#page-battle-square .dc-stake-opt,
#page-battle-square .dc-vis-btn,
#page-battle-square .bst,
#page-battle-square .my-duel-tab,
#page-battle-square .dm-amt {
  padding:7px 14px; border-radius:8px; border:1.5px solid var(--border); font-size:13px; font-weight:700; color:var(--muted); cursor:pointer; transition:.15s;
}
#page-battle-square .dc-stake-opt.on,
#page-battle-square .dc-vis-btn.on,
#page-battle-square .dm-amt.on { border-color:var(--gold); background:var(--gold-dim); color:var(--gold); }
#page-battle-square .dc-footer { display:flex; align-items:center; gap:8px; margin-top:14px; flex-wrap:wrap; }
#page-battle-square .dc-cancel { padding:9px 16px; border-radius:9px; background:transparent; color:var(--muted); border:1px solid var(--border); cursor:pointer; font-size:14px; }
#page-battle-square .dc-submit { padding:10px 22px; border-radius:12px; background:linear-gradient(135deg,#ef4444,#f97316); color:#fff; margin-left:auto; box-shadow:0 12px 24px rgba(239,68,68,.18); font-size:14px; }
#page-battle-square .dc-fee-hint { font-size:12px; color:var(--muted); flex:1; min-width:220px; }
#page-battle-square .invite-entry { padding:14px 18px; display:flex; align-items:center; gap:12px; margin-bottom:0; border-color:rgba(199,125,255,.15); }
#page-battle-square .invite-entry-title { font-size:15px; font-weight:700; color:var(--ink); margin-bottom:2px; }
#page-battle-square .invite-entry-sub { font-size:12px; color:var(--muted); }
#page-battle-square .invite-entry-info { flex:1; }
#page-battle-square .invite-entry-input { width:140px; text-align:center; letter-spacing:2px; color:var(--purple); }
#page-battle-square .invite-entry-btn { padding:7px 14px; border-radius:8px; background:rgba(199,125,255,.12); color:var(--purple); border:1.5px solid rgba(199,125,255,.25); font-size:13px; font-weight:700; cursor:pointer; }
#page-battle-square .my-duel-bar { margin-bottom:0; }
#page-battle-square .my-duel-tab.on,
#page-battle-square .bst.on { background:var(--surface3); color:var(--ink); border-color:var(--border2); }
#page-battle-square .battle-sort { align-items:center; background:var(--surface); border-radius:18px; padding:8px; border:1px solid var(--border2); overflow-x:auto; margin-bottom:14px; flex-wrap:nowrap; box-shadow:var(--legacy-shadow); }
#page-battle-square .battle-sort::-webkit-scrollbar { display:none; }
#page-battle-square .bsort-sep { width:1px; height:18px; background:var(--border); flex-shrink:0; }
@keyframes bp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
#page-battle-square .banker-tips,
#page-battle-square .challenger-tips { padding:14px 18px; margin-bottom:0; }
#page-battle-square .banker-tips { background:linear-gradient(135deg,rgba(255,201,77,.06),rgba(255,123,44,.06)); border-color:rgba(255,201,77,.12); }
#page-battle-square .challenger-tips { background:linear-gradient(135deg,rgba(60,142,255,.06),rgba(0,214,143,.06)); border-color:rgba(60,142,255,.12); }
#page-battle-square .bt-header, #page-battle-square .ct-title { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
#page-battle-square .bt-title { font-size:16px; font-weight:700; color:var(--gold); }
#page-battle-square .ct-title { font-size:16px; font-weight:700; color:var(--blue); }
#page-battle-square .bt-list { display:flex; flex-direction:column; gap:6px; }
#page-battle-square .bt-tip { display:flex; gap:8px; font-size:14px; color:rgba(240,237,232,.7); line-height:1.6; }
#page-battle-square .banker-overview { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:0; }
#page-battle-square .bo-item { padding:12px; text-align:center; }
#page-battle-square .bo-num { font-family:'Space Mono',monospace; font-size:20px; font-weight:700; color:var(--gold); }
#page-battle-square .duel-card { overflow:hidden; margin-bottom:14px; transition:border-color .2s, box-shadow .2s; }
#page-battle-square .duel-card:hover { border-color:var(--legacy-panel-border); box-shadow:0 16px 36px rgba(15,23,42,.12); }
#page-battle-square .duel-status-bar { padding:10px 16px; display:flex; align-items:center; gap:8px; border-bottom:1px solid var(--border); flex-wrap:wrap; }
#page-battle-square .duel-cat,
#page-battle-square .duel-badge,
#page-battle-square .duel-banker-tag,
#page-battle-square .duel-result-tag,
#page-battle-square .bcmt-side {
  font-size:11px; font-weight:700; padding:4px 9px; border-radius:6px;
}
#page-battle-square .duel-title { font-family:'Syne','Arial Black',sans-serif; font-size:18px; font-weight:700; line-height:1.45; flex:1; color:var(--ink); }
#page-battle-square .bcat-wc { background:rgba(29,78,216,.2); color:#60a5fa; border:1px solid rgba(29,78,216,.3); }
#page-battle-square .bcat-hot { background:rgba(255,60,60,.15); color:#ff7070; border:1px solid rgba(255,60,60,.25); }
#page-battle-square .bcat-ai { background:rgba(60,142,255,.15); color:#7ab8ff; border:1px solid rgba(60,142,255,.25); }
#page-battle-square .bcat-ent { background:rgba(236,72,153,.15); color:#f472b6; border:1px solid rgba(236,72,153,.25); }
#page-battle-square .bcat-finance { background:rgba(245,158,11,.15); color:#fbbf24; border:1px solid rgba(245,158,11,.25); }
#page-battle-square .bcat-tech { background:rgba(124,58,237,.15); color:#a78bfa; border:1px solid rgba(124,58,237,.25); }
#page-battle-square .dbadge-open { background:rgba(0,214,143,.1); color:var(--green); border:1px solid rgba(0,214,143,.2); }
#page-battle-square .dbadge-sealed { background:rgba(255,123,44,.15); color:var(--orange); border:1px solid rgba(255,123,44,.25); }
#page-battle-square .dbadge-pending { background:rgba(255,201,77,.1); color:var(--gold); border:1px solid rgba(255,201,77,.2); }
#page-battle-square .dbadge-settled { background:rgba(60,142,255,.1); color:var(--blue); border:1px solid rgba(60,142,255,.2); }
#page-battle-square .dbadge-private { background:rgba(199,125,255,.1); color:var(--purple); border:1px solid rgba(199,125,255,.2); }
#page-battle-square .dbadge-disputing { background:rgba(255,60,60,.12); color:var(--red); border:1px solid rgba(255,60,60,.2); }
#page-battle-square .duel-banker-area { padding:16px; border-bottom:1px solid var(--border); }
#page-battle-square .duel-banker-row { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
#page-battle-square .duel-banker-ava,
#page-battle-square .duel-ch-ava,
#page-battle-square .bcmt-ava { display:grid; place-items:center; border-radius:50%; flex-shrink:0; }
#page-battle-square .duel-banker-ava {
  width:42px; height:42px; font-size:20px; border:2px solid rgba(255,60,60,.3); background:rgba(255,60,60,.08);
}
#page-battle-square .duel-banker-name { font-size:15px; font-weight:700; color:var(--ink); display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
#page-battle-square .duel-banker-tag { background:rgba(255,60,60,.12); color:var(--red); border:1px solid rgba(255,60,60,.2); }
#page-battle-square .duel-banker-meta { font-size:12px; color:var(--muted); margin-top:2px; }
#page-battle-square .duel-banker-stake { font-family:'Space Mono',monospace; font-size:18px; font-weight:700; color:var(--gold); text-align:right; margin-left:auto; }
#page-battle-square .duel-banker-stake small { display:block; font-size:11px; color:var(--muted); font-family:inherit; font-weight:400; margin-top:2px; }
#page-battle-square .duel-opinion-box,
#page-battle-square .duel-challenger-opinion,
#page-battle-square .duel-callout,
#page-battle-square .duel-my-challenge-box { background:var(--surface2); border-radius:12px; padding:12px 14px; }
#page-battle-square .duel-opinion-box { border:1px solid rgba(239,68,68,.14); }
#page-battle-square .duel-challenger-opinion { border:1px solid rgba(37,99,235,.14); }
#page-battle-square .duel-opinion-label { font-size:11px; font-weight:700; color:var(--red); letter-spacing:.8px; text-transform:uppercase; margin-bottom:4px; }
#page-battle-square .duel-challenger-label { font-size:11px; font-weight:700; color:var(--blue); letter-spacing:.8px; text-transform:uppercase; margin-bottom:4px; }
#page-battle-square .duel-opinion-text { font-size:15px; line-height:1.65; color:rgba(240,237,232,.8); }
#page-battle-square .duel-vs-label { text-align:center; font-family:'Syne','Arial Black',sans-serif; font-size:11px; font-weight:700; color:var(--muted); letter-spacing:1px; margin:8px 0; }
#page-battle-square .duel-invite-code { display:inline-flex; align-items:center; gap:6px; background:rgba(199,125,255,.08); border:1px solid rgba(199,125,255,.2); border-radius:8px; padding:5px 10px; font-family:'Space Mono',monospace; font-size:13px; font-weight:700; color:var(--purple); cursor:pointer; margin-top:10px; }
#page-battle-square .duel-capacity,
#page-battle-square .duel-challengers { padding:12px 16px; border-bottom:1px solid var(--border); }
#page-battle-square .duel-cap-header,
#page-battle-square .duel-cap-detail,
#page-battle-square .duel-ch-row,
#page-battle-square .bcmt-head { display:flex; align-items:center; justify-content:space-between; gap:8px; }
#page-battle-square .duel-cap-label,
#page-battle-square .duel-cap-detail,
#page-battle-square .duel-ch-fee,
#page-battle-square .bcmt-time { font-size:11px; color:var(--muted); }
#page-battle-square .duel-cap-nums,
#page-battle-square .duel-ch-amt { font-family:'Space Mono',monospace; font-size:13px; font-weight:700; color:var(--ink); }
#page-battle-square .duel-cap-bar { height:6px; border-radius:3px; background:var(--surface3); overflow:hidden; margin-top:6px; }
#page-battle-square .duel-cap-fill { height:100%; border-radius:3px; background:linear-gradient(90deg,var(--blue),var(--green)); }
#page-battle-square .duel-cap-fill.full { background:var(--orange); }
#page-battle-square .duel-ch-list { display:flex; flex-direction:column; gap:6px; margin-top:8px; }
#page-battle-square .duel-ch-row { padding:6px 10px; border-radius:10px; background:var(--surface2); border:1px solid var(--border); justify-content:flex-start; }
#page-battle-square .duel-ch-ava { width:26px; height:26px; font-size:13px; border:1.5px solid rgba(60,142,255,.25); background:rgba(60,142,255,.06); }
#page-battle-square .duel-ch-name { font-size:13px; font-weight:600; color:var(--ink); flex:1; }
#page-battle-square .duel-highlight { font-size:10px; color:var(--green); margin-left:4px; }
#page-battle-square .duel-foot { padding:10px 16px; align-items:center; }
#page-battle-square .duel-foot-btn { display:flex; align-items:center; gap:5px; padding:6px 10px; border-radius:8px; font-size:13px; font-weight:600; color:var(--muted); cursor:pointer; border:1px solid transparent; }
#page-battle-square .duel-foot-btn:hover { background:var(--surface2); color:var(--ink); border-color:var(--border); }
#page-battle-square .duel-foot-join { padding:8px 14px; border-radius:12px; font-size:13px; background:linear-gradient(135deg,rgba(37,99,235,.12),rgba(14,165,233,.12)); color:var(--blue); border:1.5px solid rgba(37,99,235,.22); }
#page-battle-square .duel-foot-join.orange { background:rgba(255,123,44,.12); color:var(--orange); border-color:rgba(255,123,44,.3); }
#page-battle-square .duel-foot-join.gold { background:rgba(255,201,77,.12); color:var(--gold); border-color:rgba(255,201,77,.3); }
#page-battle-square .duel-foot-join.red { background:rgba(255,60,60,.12); color:var(--red); border-color:rgba(255,60,60,.3); }
#page-battle-square .duel-foot-time { margin-left:auto; font-family:'Space Mono',monospace; font-size:11px; color:var(--muted); }
#page-battle-square .duel-my-challenge-box { border:1px solid rgba(60,142,255,.12); margin-top:10px; }
#page-battle-square .duel-my-challenge-box.confirm { background:rgba(255,201,77,.06); border-color:rgba(255,201,77,.12); display:flex; align-items:center; justify-content:space-between; gap:12px; }
#page-battle-square .duel-my-challenge-label { font-size:11px; font-weight:700; color:var(--blue); margin-bottom:2px; }
#page-battle-square .duel-my-challenge-box.confirm .duel-my-challenge-label { color:var(--gold); }
#page-battle-square .duel-my-challenge-text { font-size:12px; color:rgba(240,237,232,.72); line-height:1.55; }
#page-battle-square .duel-my-challenge-actions { display:flex; gap:6px; flex-shrink:0; }
#page-battle-square .duel-mini-btn { padding:5px 10px; border-radius:8px; font-size:11px; font-weight:700; cursor:pointer; border:1.5px solid rgba(255,201,77,.3); background:rgba(255,201,77,.12); color:var(--gold); }
#page-battle-square .duel-dispute-btn { padding:5px 10px; border-radius:8px; font-size:11px; font-weight:700; cursor:pointer; border:1.5px solid rgba(255,60,60,.2); background:rgba(255,60,60,.08); color:var(--red); }
#page-battle-square .duel-cmt-thread { background:var(--surface); border-top:1px solid var(--border); overflow:hidden; }
#page-battle-square .bct-inner { padding:10px 14px; display:flex; flex-direction:column; gap:8px; }
#page-battle-square .bcmt { display:flex; gap:7px; align-items:flex-start; }
#page-battle-square .bcmt-ava { width:24px; height:24px; font-size:12px; border:1px solid var(--border); margin-top:1px; }
#page-battle-square .bcmt-body { flex:1; min-width:0; }
#page-battle-square .bcmt-name { font-size:12px; font-weight:700; color:var(--ink); }
#page-battle-square .bside-r { background:rgba(255,60,60,.1); color:var(--red); border:1px solid rgba(255,60,60,.2); }
#page-battle-square .bside-b { background:rgba(60,142,255,.1); color:var(--blue); border:1px solid rgba(60,142,255,.2); }
#page-battle-square .bcmt-text { font-size:13px; line-height:1.55; color:rgba(240,237,232,.7); background:var(--surface2); border:1px solid var(--border); border-radius:4px 12px 12px 12px; padding:7px 10px; display:inline-block; max-width:88%; }
#page-battle-square .bcmt-acts { display:inline-flex; align-items:center; gap:6px; margin-left:4px; vertical-align:middle; }
#page-battle-square .bca { font-size:11px; color:var(--muted); font-weight:600; }
#page-battle-square .badd-cmt { display:flex; align-items:center; gap:6px; padding-top:6px; border-top:1px solid var(--border); }
#page-battle-square .badd-cmt-inp { flex:1; border-radius:16px; padding:6px 12px; font-size:13px; }
#page-battle-square .badd-cmt-send { background:var(--surface3); border:1px solid var(--border); border-radius:50%; width:26px; height:26px; display:grid; place-items:center; cursor:pointer; font-size:14px; color:var(--muted); }
#page-battle-square .empty-state { text-align:center; padding:40px 20px; }
#page-battle-square .empty-ico { font-size:48px; margin-bottom:12px; }
#page-battle-square .empty-title { font-size:17px; font-weight:700; color:var(--ink); margin-bottom:6px; }
#page-battle-square .empty-sub { font-size:13px; color:var(--muted); line-height:1.6; }
#page-battle-square .duel-overlay { position:fixed; inset:0; background:rgba(10,9,9,.85); backdrop-filter:blur(16px); z-index:600; display:grid; place-items:center; padding:16px; }
#page-battle-square .duel-modal {
  background:#111010; border:1px solid var(--border2); border-radius:18px; padding:24px; width:400px; max-width:92vw;
  box-shadow:0 24px 80px rgba(0,0,0,.6); position:relative;
}
#page-battle-square .dm-close { position:absolute; top:14px; right:14px; cursor:pointer; color:var(--muted); font-size:18px; }
#page-battle-square .dm-title { font-family:'Syne','Arial Black',sans-serif; font-size:19px; font-weight:800; margin-bottom:4px; color:var(--ink); }
#page-battle-square .dm-sub { font-size:13px; color:var(--muted); margin-bottom:16px; }
#page-battle-square .dm-info-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px; }
#page-battle-square .dm-info-item { background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:10px 12px; }
#page-battle-square .dm-info-label { font-size:11px; color:var(--muted); margin-bottom:4px; }
#page-battle-square .dm-info-value { font-family:'Space Mono',monospace; font-size:15px; font-weight:700; color:var(--ink); }
#page-battle-square .dm-info-value.gold { color:var(--gold); }
#page-battle-square .dm-stake-input { text-align:center; margin-bottom:6px; color:var(--gold); }
#page-battle-square .dm-fee-note { font-size:12px; color:var(--muted); text-align:center; margin-bottom:14px; padding:8px; border-radius:8px; background:var(--surface2); border:1px solid var(--border); }
#page-battle-square .dm-cta { width:100%; padding:13px; border-radius:11px; background:var(--blue); color:#fff; font-size:16px; box-shadow:0 0 20px rgba(60,142,255,.3); }
html.dark #page-battle-square {
  --red:#ff5d72; --red-dim:rgba(255,93,114,.12); --red-glow:rgba(255,93,114,.26);
  --blue:#38bdf8; --blue-dim:rgba(56,189,248,.12); --blue-glow:rgba(56,189,248,.24);
  --gold:#fbbf24; --gold-dim:rgba(251,191,36,.10);
  --green:#34d399; --orange:#fb923c; --purple:#a78bfa;
  --surface:rgba(10,17,32,.92);
  --surface2:rgba(15,26,48,.74);
  --surface3:rgba(20,33,60,.86);
  --border:rgba(96,165,250,.18);
  --border2:rgba(96,165,250,.28);
}
html.dark #page-battle-square .page-hero-battle {
  background:
    radial-gradient(circle at 20% 0%, rgba(34,211,238,.20), transparent 36%),
    radial-gradient(circle at 86% 20%, rgba(236,72,153,.14), transparent 34%),
    linear-gradient(145deg, rgba(10,17,32,.94), rgba(11,20,39,.92));
}
html.dark #page-battle-square .dc-header {
  background:
    radial-gradient(circle at 0% 0%, rgba(245,158,11,.12), transparent 28%),
    radial-gradient(circle at 100% 0%, rgba(34,197,94,.08), transparent 24%),
    linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.015));
}
html.dark #page-battle-square .phb-label { color:#8fb3d4; }
html.dark #page-battle-square .phb-sub,
html.dark #page-battle-square .phb-stat { color:#c6d8ec; }
html.dark #page-battle-square .phb-stat,
html.dark #page-battle-square .dc-input,
html.dark #page-battle-square .dc-textarea,
html.dark #page-battle-square .invite-entry-input,
html.dark #page-battle-square .badd-cmt-inp,
html.dark #page-battle-square .dm-stake-input {
  background:rgba(15,26,48,.78);
}
@media (max-width: 600px) {
  #page-battle-square .bp-wrap { padding:0 0 24px; }
  #page-battle-square .pr-grid,
  #page-battle-square .banker-overview,
  #page-battle-square .dm-info-grid { grid-template-columns:1fr; }
  #page-battle-square .dc-inline,
  #page-battle-square .invite-entry { flex-direction:column; align-items:stretch; }
  #page-battle-square .invite-entry-input { width:100%; }
  #page-battle-square .duel-banker-row { align-items:flex-start; flex-wrap:wrap; }
  #page-battle-square .duel-banker-stake { margin-left:0; width:100%; text-align:left; }
  #page-battle-square .duel-title { font-size:16px; }
  #page-battle-square .duel-my-challenge-box.confirm { display:block; }
  #page-battle-square .duel-my-challenge-actions { margin-top:10px; }
}

@media (max-width: 1279px) {
  /* Mobile battle shell:
     手机端开战页统一压成黑色系，避免继续沿用这套偏蓝的旧视觉。 */
  #page-battle-square {
    --red:#f87171; --red-dim:rgba(248,113,113,.10); --red-glow:rgba(248,113,113,.16);
    --blue:#22c55e; --blue-dim:rgba(34,197,94,.10); --blue-glow:rgba(34,197,94,.16);
    --gold:#f59e0b; --gold-dim:rgba(245,158,11,.10);
    --green:#22c55e; --orange:#fb923c; --purple:#a1a1aa;
    --surface:rgba(15,16,19,.98);
    --surface2:rgba(255,255,255,.04);
    --surface3:rgba(255,255,255,.08);
    --border:rgba(255,255,255,.08);
    --border2:rgba(255,255,255,.12);
    --ink:#f5f5f5;
    --muted:rgba(161,161,170,.82);
    background:transparent;
  }
  #page-battle-square .bp-wrap {
    gap:12px;
    padding:0 0 24px;
  }
  #page-battle-square .page-hero-battle {
    background:
      radial-gradient(circle at 18% 0%, rgba(34,197,94,.08), transparent 28%),
      radial-gradient(circle at 86% 18%, rgba(255,255,255,.03), transparent 24%),
      linear-gradient(145deg, rgba(15,16,19,.99), rgba(12,13,15,.99)) !important;
    border-color:rgba(255,255,255,.08) !important;
    box-shadow:0 18px 40px rgba(0,0,0,.28) !important;
  }
  #page-battle-square .phb-label,
  #page-battle-square .phb-sub { color:rgba(212,212,216,.82); }
  #page-battle-square .phb-stat {
    background:rgba(255,255,255,.04);
    border-color:rgba(255,255,255,.08);
    color:#e4e4e7;
  }
  #page-battle-square .page-hero-battle::before {
    opacity:.04;
  }
  #page-battle-square .phb-title span {
    color:#22c55e;
  }
  #page-battle-square .dc-header {
    background:
      radial-gradient(circle at 0% 0%, rgba(34,197,94,.10), transparent 26%),
      radial-gradient(circle at 100% 0%, rgba(245,158,11,.08), transparent 22%),
      linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02));
  }
  #page-battle-square .dc-btn {
    background:linear-gradient(135deg,#f59e0b,#ea580c);
    box-shadow:0 10px 24px rgba(234,88,12,.24);
  }
  #page-battle-square .dc-submit,
  #page-battle-square .dm-cta {
    background:linear-gradient(135deg,#34d399,#10b981);
    color:#04130c;
    box-shadow:0 10px 24px rgba(16,185,129,.24);
  }
  #page-battle-square .invite-entry,
  #page-battle-square .challenger-tips,
  #page-battle-square .duel-challenger-opinion,
  #page-battle-square .duel-my-challenge-box,
  #page-battle-square .duel-my-challenge-box.confirm,
  #page-battle-square .duel-foot-join,
  #page-battle-square .dbadge-settled,
  #page-battle-square .bside-b,
  #page-battle-square .bcat-ai,
  #page-battle-square .bcat-wc,
  #page-battle-square .duel-ch-ava {
    border-color:rgba(255,255,255,.10);
  }
  #page-battle-square .invite-entry,
  #page-battle-square .challenger-tips,
  #page-battle-square .duel-challenger-opinion,
  #page-battle-square .duel-my-challenge-box,
  #page-battle-square .duel-my-challenge-box.confirm,
  #page-battle-square .duel-foot-join,
  #page-battle-square .dbadge-settled,
  #page-battle-square .bside-b,
  #page-battle-square .bcat-ai,
  #page-battle-square .bcat-wc {
    background:rgba(255,255,255,.04);
    color:#e4e4e7;
  }
  #page-battle-square .duel-card,
  #page-battle-square .plaza-rules,
  #page-battle-square .duel-compose,
  #page-battle-square .invite-entry,
  #page-battle-square .banker-tips,
  #page-battle-square .challenger-tips,
  #page-battle-square .empty-state,
  #page-battle-square .bo-item {
    background:#111214;
    border-color:rgba(255,255,255,.08);
    box-shadow:0 18px 40px rgba(0,0,0,.28);
  }
  #page-battle-square .duel-status-bar,
  #page-battle-square .duel-banker-area,
  #page-battle-square .duel-capacity,
  #page-battle-square .duel-challengers,
  #page-battle-square .duel-cmt-thread,
  #page-battle-square .plaza-rules-header {
    background:#111214;
    border-color:rgba(255,255,255,.08);
  }
  #page-battle-square .duel-opinion-box,
  #page-battle-square .duel-challenger-opinion,
  #page-battle-square .duel-callout,
  #page-battle-square .duel-my-challenge-box,
  #page-battle-square .duel-ch-row,
  #page-battle-square .bcmt-text {
    background:rgba(255,255,255,.03);
    border-color:rgba(255,255,255,.08);
  }
  #page-battle-square .bcat-wc,
  #page-battle-square .bcat-ai,
  #page-battle-square .bcat-ent,
  #page-battle-square .bcat-tech {
    background:rgba(255,255,255,.05);
    color:#d4d4d8;
    border-color:rgba(255,255,255,.10);
  }
  #page-battle-square .dbadge-settled,
  #page-battle-square .dbadge-private {
    background:rgba(255,255,255,.05);
    color:#d4d4d8;
    border-color:rgba(255,255,255,.10);
  }
  #page-battle-square .ct-title,
  #page-battle-square .duel-challenger-label,
  #page-battle-square .duel-my-challenge-label {
    color:#e4e4e7;
  }
  #page-battle-square .dc-input,
  #page-battle-square .dc-textarea,
  #page-battle-square .invite-entry-input,
  #page-battle-square .badd-cmt-inp,
  #page-battle-square .dm-stake-input,
  #page-battle-square .pr-item,
  #page-battle-square .rules-steps,
  #page-battle-square .dm-info-item,
  #page-battle-square .dm-fee-note {
    background:rgba(255,255,255,.04);
    border-color:rgba(255,255,255,.08);
    color:#f5f5f5;
  }
  #page-battle-square .invite-entry-input,
  #page-battle-square .dc-input,
  #page-battle-square .dc-textarea,
  #page-battle-square .dm-stake-input,
  #page-battle-square .badd-cmt-inp {
    color:#f5f5f5;
  }
  #page-battle-square .invite-entry-input::placeholder,
  #page-battle-square .dc-input::placeholder,
  #page-battle-square .dc-textarea::placeholder,
  #page-battle-square .dm-stake-input::placeholder,
  #page-battle-square .badd-cmt-inp::placeholder {
    color:rgba(161,161,170,.72);
  }
  #page-battle-square .dc-stake-opt,
  #page-battle-square .dc-vis-btn,
  #page-battle-square .bst,
  #page-battle-square .my-duel-tab,
  #page-battle-square .dm-amt,
  #page-battle-square .duel-foot-btn {
    background:rgba(255,255,255,.03);
    border-color:rgba(255,255,255,.08);
    color:#a1a1aa;
  }
  #page-battle-square .dc-stake-opt.on,
  #page-battle-square .dc-vis-btn.on,
  #page-battle-square .dm-amt.on,
  #page-battle-square .my-duel-tab.on,
  #page-battle-square .bst.on {
    background:rgba(34,197,94,.12);
    border-color:rgba(34,197,94,.28);
    color:#86efac;
  }
  #page-battle-square .duel-cap-fill {
    background:linear-gradient(90deg,#3f3f46,#22c55e);
  }
  #page-battle-square .duel-ch-ava {
    background:rgba(255,255,255,.04);
  }
  #page-battle-square .duel-foot-join,
  #page-battle-square .duel-foot-join.orange,
  #page-battle-square .duel-foot-join.gold,
  #page-battle-square .duel-foot-join.red {
    background:#16181c;
    color:#f5f5f5;
    border-color:rgba(255,255,255,.10);
  }
}
`;

function formatCoins(value: number) {
  return value.toLocaleString('zh-CN');
}

function clampAmount(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

// battle 后端给的是秒级时间戳，这里统一转成页面里的短时间文案。
function formatTimestampLabel(timestamp?: number) {
  if (!timestamp) return '待定';
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return '待定';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function getDefaultBankerName(battle: Battle, currentUserId?: number | string | null) {
  return String(battle.bankerUserId) === String(currentUserId ?? '') ? '你' : `庄家 #${battle.bankerUserId}`;
}

function getDefaultBankerAvatar(battle: Battle, currentUserId?: number | string | null) {
  return String(battle.bankerUserId) === String(currentUserId ?? '') ? '🦊' : '🎲';
}

function deriveCategory(topic: string): DuelCategory {
  if (topic.includes('世界杯')) return 'wc';
  if (topic.includes('AI') || topic.includes('Claude') || topic.includes('GPT')) return 'ai';
  if (topic.includes('比特币') || topic.includes('指数') || topic.includes('股')) return 'finance';
  if (topic.includes('专辑') || topic.includes('明星') || topic.includes('电影')) return 'ent';
  if (topic.includes('苹果') || topic.includes('机器人') || topic.includes('科技')) return 'tech';
  return 'hot';
}

function getCommentAuthorName(comment?: CommentResponse | null) {
  return comment?.user?.nickname || comment?.user?.username || `用户 ${comment?.user?.id ?? ''}`.trim() || '匿名用户';
}

function getCommentAvatarSeed(comment?: CommentResponse | null) {
  const name = getCommentAuthorName(comment).trim();
  return name.slice(0, 1).toUpperCase() || '评';
}

function formatCommentTime(timestamp?: number) {
  if (!timestamp) return '刚刚';
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - timestamp);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

function mapCommentToDuelComment(comment: CommentResponse): DuelComment {
  return {
    id: String(comment.id),
    avatar: getCommentAvatarSeed(comment),
    name: getCommentAuthorName(comment),
    side: 'challenger',
    time: formatCommentTime(comment.createTime),
    text: comment.content || '这条评论暂时没有正文。',
    likes: comment.likeCount ?? 0,
  };
}

// 真实 battle 接口字段和旧页面的 DuelCard 展示结构并不一致。
// 这里集中做一次映射，后面页面 UI 只消费 DuelItem。
function mapBattleToDuel(
  item: BattleListItem,
  currentUserId?: number | string | null,
  detail?: BattleDetailResponse,
  comments: DuelComment[] = [],
  roleHint?: 'banker' | 'challenger',
): DuelItem {
  const battle = detail?.battle ? { ...item.battle, ...detail.battle } : item.battle;
  const myAction = detail?.myAction ?? item.myAction;
  const settlementItem = detail?.settlement?.myItem ?? null;
  const permissions = getBattleActionPermissions({
    battle,
    myAction,
    currentUserId,
    settlementItem,
    roleHint,
  });

  // 页面视觉状态和后端状态不是 1:1 命名，这里做一层展示态转换。
  let status: DuelStatus;
  switch (battle.status) {
    case 'open':
      status = battle.isPublic ? 'open' : 'private';
      break;
    case 'sealed':
      status = 'sealed';
      break;
    case 'pending':
      status = 'pending';
      break;
    case 'disputed':
      status = 'disputing';
      break;
    case 'settled':
    default:
      status = 'settled';
      break;
  }

  const resultText =
    battle.status === 'settled'
      ? battle.result === 'banker_wins'
        ? '结果已生效：庄家获胜'
        : battle.result === 'banker_loses'
          ? '结果已生效：挑战者获胜'
          : '结果已生效：本局作废'
      : settlementItem?.payoutAmount
        ? `你可提取 ${formatCoins(settlementItem.payoutAmount)}🪙`
        : undefined;

  const myChallengeInfo =
    !permissions.isBanker
      ? battle.status === 'sealed'
        ? '本局已封盘，不再接受新的挑战者加入。'
        : battle.status === 'pending'
          ? battle.result
            ? myAction
              ? `你已提交${myAction === 'confirm' ? '确认' : '异议'}，等待系统处理。`
              : '庄家已宣判，当前等待你确认结果或发起异议。'
            : '结算时间已到，当前等待庄家在 24h 内宣布结果。'
          : battle.status === 'settled'
            ? settlementItem
              ? settlementItem.withdrawn
                ? `你的结算奖励已提取，到账 ${formatCoins(settlementItem.payoutAmount)}🪙。`
                : `你有 ${formatCoins(settlementItem.payoutAmount)}🪙 可提取。`
              : '本局已结算。'
            : battle.status === 'disputed'
              ? '你已参与本局，当前进入争议仲裁阶段。'
              : '你已参与本局，等待后续结算流程。'
      : undefined;

  return {
    id: String(battle.id),
    battleId: battle.id,
    topic: battle.title,
    category: deriveCategory(battle.title),
    banker: {
      name: permissions.isBanker ? '你' : item.bankerNickname || getDefaultBankerName(battle, currentUserId),
      avatar: permissions.isBanker ? '🦊' : getDefaultBankerAvatar(battle, currentUserId),
      stance: battle.bankerSide,
      isMe: permissions.isBanker,
    },
    challengerSideText: battle.challengerSide,
    status,
    wager: battle.bankerStakeTotal,
    currentPool: battle.challengerStakeTotal,
    challengerCount: battle.challengerStakeTotal > 0 ? 1 : 0,
    visibility: battle.isPublic ? 'public' : 'private',
    comments,
    commentCount: Math.max(item.commentCount ?? 0, comments.length),
    likes: Math.max(0, item.likeCount ?? 0),
    settleText:
      battle.status === 'settled'
        ? `✅ ${formatTimestampLabel(battle.resultTime || detail?.settlement?.settlement?.createdAt)} 结算完毕`
        : battle.status === 'pending'
          ? battle.result
            ? `⏱ 确认截止 ${formatTimestampLabel(battle.confirmDeadline)}`
            : `⏱ 宣布截止 ${formatTimestampLabel(battle.pendingDeadline)}`
          : battle.status === 'disputed'
            ? `⚠️ 仲裁截止 ${formatTimestampLabel(battle.disputeDeadline)}`
          : battle.status === 'sealed'
              ? `🔒 已封盘 · 结算时间 ${formatTimestampLabel(battle.settleTime)}`
              : `⏱ 结算时间 ${formatTimestampLabel(battle.settleTime)}`,
    resultText,
    disputeText:
      battle.status === 'disputed'
        ? '本局存在挑战者异议，当前等待管理员裁决。'
        : undefined,
    inviteCode: battle.isPublic ? undefined : battle.inviteCode,
    challengerList: battle.challengerStakeTotal > 0
      ? [
          {
            id: `${battle.id}-challenger`,
            avatar: permissions.isBanker ? '⚔️' : '🧿',
            name: battle.challengerStakeTotal >= battle.bankerStakeTotal ? '挑战方已满额' : '已有挑战者加入',
            amount: battle.challengerStakeTotal,
            feeText: battle.isPublic ? '公开场累计挑战额' : '私密场累计挑战额',
          },
        ]
      : [],
    myChallengeInfo,
    myChallengeState: permissions.canConfirm || permissions.canDispute ? 'confirm' : myChallengeInfo ? 'info' : undefined,
    myAction,
    canJoin: permissions.canJoin,
    canBankerAddStake: permissions.canBankerAddStake,
    canDeclare: permissions.canDeclare,
    canConfirm: permissions.canConfirm,
    canDispute: permissions.canDispute,
    canWithdraw: permissions.canWithdraw,
    rawStatus: battle.status,
    createdAt: battle.createTime,
  };
}

function RuleCard({ title, text, accent }: { title: string; text: React.ReactNode; accent?: string }) {
  return (
    <div className="pr-item" style={accent ? { borderColor: accent } : undefined}>
      <div className="pr-item-title" style={accent ? { color: accent.includes('0,214,143') ? 'var(--green)' : undefined } : undefined}>
        {title}
      </div>
      <div className="pr-item-text">{text}</div>
    </div>
  );
}

function DuelCard({
  duel,
  commentsOpen,
  liked,
  onToggleComments,
  onToggleLike,
  onJoin,
  onCopyInvite,
  onAddStake,
  onViewDetail,
  onDeclare,
  onConfirm,
  onDispute,
  onWithdraw,
  commentDraft,
  onCommentDraftChange,
  onSubmitComment,
  commentSubmitting,
}: {
  duel: DuelItem;
  commentsOpen: boolean;
  liked: boolean;
  onToggleComments: () => void;
  onToggleLike: () => void;
  onJoin: () => void;
  onCopyInvite: (code: string) => void;
  onAddStake: () => void;
  onViewDetail: () => void;
  onDeclare: (result: 'banker_wins' | 'banker_loses') => void;
  onConfirm: () => void;
  onDispute: () => void;
  onWithdraw: () => void;
  commentDraft: string;
  onCommentDraftChange: (value: string) => void;
  onSubmitComment: () => void;
  commentSubmitting: boolean;
}) {
  // 庄家押注额就是挑战池上限，所以容量条直接按 challengerStakeTotal / bankerStakeTotal 算。
  const capacityPct = duel.wager > 0 ? Math.min(100, Math.round((duel.currentPool / duel.wager) * 100)) : 0;
  const category = CATEGORY_META[duel.category];
  const status = STATUS_META[duel.status];

  return (
    <div className="duel-card" style={duel.status === 'settled' ? { opacity: 0.78 } : undefined}>
      <div className="duel-status-bar">
        <div className={`duel-cat ${category.className}`}>{category.label}</div>
        <div className="duel-title">{duel.topic}</div>
        {duel.visibility === 'private' && <div className="duel-badge dbadge-private">🔒 私人</div>}
        <div className={`duel-badge ${status.className}`}>{status.label}</div>
      </div>

      <div className="duel-banker-area">
        <div className="duel-banker-row">
          <div
            className="duel-banker-ava"
            style={
              duel.visibility === 'private'
                ? { borderColor: 'rgba(199,125,255,.3)', background: 'rgba(199,125,255,.08)' }
                : undefined
            }
          >
            {duel.banker.avatar}
          </div>
          <div className="duel-banker-info">
            <div className="duel-banker-name">
              {duel.banker.name}
              <span
                className="duel-banker-tag"
                style={
                  duel.visibility === 'private'
                    ? {
                        background: 'rgba(199,125,255,.12)',
                        color: 'var(--purple)',
                        borderColor: 'rgba(199,125,255,.2)',
                      }
                    : undefined
                }
              >
                庄家{duel.visibility === 'private' ? ' · 私人' : ''}
              </span>
              {duel.resultText && (
                <span
                  className="duel-result-tag"
                  style={{
                    background: duel.resultText.includes('庄家输')
                      ? 'rgba(255,60,60,.1)'
                      : 'rgba(0,214,143,.1)',
                    color: duel.resultText.includes('庄家输') ? 'var(--red)' : 'var(--green)',
                    border: `1px solid ${duel.resultText.includes('庄家输') ? 'rgba(255,60,60,.2)' : 'rgba(0,214,143,.2)'}`,
                  }}
                >
                  {duel.resultText.includes('庄家输') ? '😞 庄家输' : '🏆 庄家赢'}
                </span>
              )}
            </div>
            <div className="duel-banker-meta">{duel.resultText ?? `${duel.visibility === 'private' ? '私人' : '公开'}赌局 · ${status.label.replace(/[^\u4e00-\u9fa5]/g, '')}`}</div>
          </div>
          <div className="duel-banker-stake">
            {formatCoins(duel.wager)}🪙<small>庄家押注</small>
          </div>
        </div>

        <div
          className="duel-opinion-box"
          style={duel.visibility === 'private' ? { borderColor: 'rgba(199,125,255,.15)' } : undefined}
        >
          <div
            className="duel-opinion-label"
            style={duel.visibility === 'private' ? { color: 'var(--purple)' } : undefined}
          >
            🔴 庄家立场
          </div>
          <div className="duel-opinion-text">{duel.banker.stance}</div>
        </div>

        {duel.challengerSideText ? (
          <>
            <div className="duel-vs-label">—— VS ——</div>
            <div className="duel-challenger-opinion">
              <div className="duel-challenger-label">🔵 挑战者立场（加入即站此方）</div>
              <div className="duel-opinion-text">{duel.challengerSideText}</div>
            </div>
          </>
        ) : null}

        {duel.inviteCode ? (
          <div style={{ textAlign: 'center' }}>
            <span className="duel-invite-code" onClick={() => onCopyInvite(duel.inviteCode ?? '')}>
              邀请码: {duel.inviteCode} 📋
            </span>
          </div>
        ) : null}

        {duel.disputeText ? (
          <div className="duel-callout" style={{ marginTop: 10, border: '1px solid rgba(255,60,60,.15)', background: 'rgba(255,60,60,.06)' }}>
            <div className="pr-warn-title" style={{ marginBottom: 4 }}>⚠️ 异议详情</div>
            <div className="pr-item-text">{duel.disputeText}</div>
          </div>
        ) : null}

        {duel.myChallengeInfo ? (
          <div className={`duel-my-challenge-box ${duel.myChallengeState === 'confirm' ? 'confirm' : ''}`}>
            <div>
              <div className="duel-my-challenge-label">你的挑战信息</div>
              <div className="duel-my-challenge-text">{duel.myChallengeInfo}</div>
            </div>
            {duel.myChallengeState === 'confirm' && (duel.canConfirm || duel.canDispute) ? (
              <div className="duel-my-challenge-actions">
                {duel.canConfirm ? <div className="duel-mini-btn" onClick={onConfirm}>✅ 同意</div> : null}
                {duel.canDispute ? <div className="duel-dispute-btn" onClick={onDispute}>⚠️ 提出异议</div> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {duel.status !== 'settled' && duel.status !== 'disputing' && (
        <div className="duel-capacity">
          <div className="duel-cap-header">
            <div className="duel-cap-label">挑战者容量</div>
            <div className="duel-cap-nums">
              {formatCoins(duel.currentPool)} / {formatCoins(duel.wager)} 🪙
              {capacityPct >= 100 ? ' (满额)' : ''}
            </div>
          </div>
          <div className="duel-cap-bar">
            <div className={`duel-cap-fill ${capacityPct >= 100 ? 'full' : ''}`} style={{ width: `${capacityPct}%` }} />
          </div>
          <div className="duel-cap-detail">
            <span>已加入 {duel.challengerCount} 人</span>
            <span>
              {duel.visibility === 'private'
                ? `剩余容量 ${formatCoins(Math.max(0, duel.wager - duel.currentPool))}🪙 · 无入场费`
                : capacityPct >= 100
                  ? '已满额封盘'
                  : `剩余容量 ${formatCoins(Math.max(0, duel.wager - duel.currentPool))}🪙`}
            </span>
          </div>
        </div>
      )}

      {duel.challengerList && duel.challengerList.length > 0 && duel.status !== 'settled' && (
        <div className="duel-challengers">
          <div className="duel-ch-title">挑战者 ({duel.challengerList.length}人)</div>
          <div className="duel-ch-list">
            {duel.challengerList.map((challenger) => (
              <div key={challenger.id} className="duel-ch-row">
                <div className="duel-ch-ava">{challenger.avatar}</div>
                <div className="duel-ch-name">
                  {challenger.name}
                  {challenger.highlight ? <span className="duel-highlight">{challenger.highlight}</span> : null}
                </div>
                <div className="duel-ch-amt">{formatCoins(challenger.amount)}🪙</div>
                <div className="duel-ch-fee">{challenger.feeText}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="duel-foot">
        <div className="duel-foot-btn" onClick={onToggleComments}>💬 <span>{duel.commentCount}</span></div>
        <div
          className="duel-foot-btn"
          onClick={onToggleLike}
          style={liked ? { color: 'var(--red)' } : undefined}
        >
          {liked ? '❤️' : '🤍'} <span>{duel.likes + (liked ? 1 : 0)}</span>
        </div>
        <div className="duel-foot-btn" onClick={onViewDetail}>📄 <span>详情</span></div>
        {duel.canWithdraw ? (
          <button className="duel-foot-join gold" onClick={onWithdraw}>
            💰 提取奖励
          </button>
        ) : null}
        {duel.canJoin ? (
          <button
            className={`duel-foot-join ${duel.footerActionTone ?? ''}`}
            onClick={onJoin}
          >
            {duel.footerActionLabel ?? '⚔️ 挑战庄家'}
          </button>
        ) : null}
        {duel.canBankerAddStake ? (
          <button className="duel-foot-join orange" onClick={onAddStake}>
            ➕ 庄家加注
          </button>
        ) : null}
        {duel.canDeclare ? (
          <>
            <button
              className="duel-foot-join"
              onClick={() => onDeclare('banker_wins')}
              style={{ background: 'rgba(255,123,44,.12)', color: 'var(--orange)', borderColor: 'rgba(255,123,44,.3)' }}
            >
              📢 宣布庄家赢
            </button>
            <button
              className="duel-foot-join"
              onClick={() => onDeclare('banker_loses')}
              style={{ background: 'rgba(255,60,60,.12)', color: 'var(--red)', borderColor: 'rgba(255,60,60,.3)' }}
            >
              📢 宣布庄家输
            </button>
          </>
        ) : null}
        <div className="duel-foot-time" style={duel.status === 'pending' || duel.status === 'disputing' ? { color: duel.status === 'pending' ? 'var(--orange)' : 'var(--red)' } : undefined}>
          {duel.settleText}
        </div>
      </div>

      {commentsOpen && (
        <div className="duel-cmt-thread">
          <div className="bct-inner">
            {duel.comments.length > 0 ? (
              duel.comments.map((comment) => (
                <div key={comment.id} className="bcmt">
                  <div className="bcmt-ava">{comment.avatar}</div>
                  <div className="bcmt-body">
                    <div className="bcmt-head">
                      <div className="bcmt-name">{comment.name}</div>
                      <div className={`bcmt-side ${comment.side === 'banker' ? 'bside-r' : 'bside-b'}`}>
                        {comment.side === 'banker' ? '庄家' : '挑战者'}
                      </div>
                      <div className="bcmt-time">{comment.time}</div>
                    </div>
                    <div className="bcmt-text">{comment.text}</div>
                    <div className="bcmt-acts"><span className="bca">❤️ {comment.likes}</span></div>
                  </div>
                </div>
              ))
            ) : null}
            <div className="badd-cmt">
              <div className="badd-cmt-ava">🦊</div>
              <input
                className="badd-cmt-inp"
                placeholder="加入讨论…"
                value={commentDraft}
                onChange={(e) => onCommentDraftChange(e.target.value)}
              />
              <button
                className="badd-cmt-send"
                type="button"
                onClick={onSubmitComment}
                disabled={commentSubmitting}
                style={commentSubmitting ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const BattleSquarePixel: React.FC = () => {
  const { user, coin } = useAppSession();
  const authToken = getAuthToken();
  const storedUser = getStoredUserInfo() as { id?: number | string };
  const currentUserId = user?.id ?? storedUser?.id ?? null;
  const userBalance = coin?.balance ?? 0;
  // 登录提示按 token 判断，避免“已登录但 userInfo 还在加载”时误闪未登录提示。
  const isAuthenticated = Boolean(authToken);
  const plazaQuery = useRequestBattleList({ page: 1, pageSize: 50 });
  const battleStatsQuery = useRequestBattleStats({ enabled: isAuthenticated });
  const myBankerQuery = useRequestBattleList({ page: 1, pageSize: 50, role: 'banker' });
  const myChallengerQuery = useRequestBattleList({ page: 1, pageSize: 50, role: 'challenger' });
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
  const [wager, setWager] = useState(1000);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [settleTime, setSettleTime] = useState('');
  const [inviteInput, setInviteInput] = useState('');
  const [joinAmount, setJoinAmount] = useState(500);
  const [joinModal, setJoinModal] = useState<JoinModalState | null>(null);
  const [addStakeAmount, setAddStakeAmount] = useState(500);
  const [addStakeModal, setAddStakeModal] = useState<AddStakeModalState | null>(null);
  const [detailBattleId, setDetailBattleId] = useState<number | null>(null);
  const [commentOpen, setCommentOpen] = useState<Record<string, boolean>>({});
  const [commentDraftMap, setCommentDraftMap] = useState<Record<string, string>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const lastPopupMessageRef = useRef<string>('');
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
      enabled: activeTab !== 'plaza',
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
        queryFn: async () => {
          const res = await axiosCustom({
            method: 'get',
            cmd: API_Comment_Comments,
            params: {
              entityType: 'battle',
              entityId: item.battle.id,
            },
            headers: getAuthorizationHeaders(),
          });
          return assertSuccess(res) as { results?: CommentResponse[] };
        },
        enabled: isOpen,
        staleTime: 10 * 1000,
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
  const plazaDuels = useMemo(
    () =>
      (plazaQuery.data?.list ?? []).map((item) =>
        mapBattleToDuel(
          item,
          currentUserId,
          detailMap.get(item.battle.id),
          commentMap.get(item.battle.id) ?? [],
          myBankerBattleIds.has(item.battle.id) ? 'banker' : myChallengerBattleIds.has(item.battle.id) ? 'challenger' : undefined,
        ),
      ),
    [plazaQuery.data?.list, currentUserId, detailMap, commentMap, myBankerBattleIds, myChallengerBattleIds],
  );
  const myBankerDuels = useMemo(
    () => (myBankerQuery.data?.list ?? []).map((item) => mapBattleToDuel(item, currentUserId, detailMap.get(item.battle.id), commentMap.get(item.battle.id) ?? [], 'banker')),
    [myBankerQuery.data?.list, currentUserId, detailMap, commentMap],
  );
  const myChallengerDuels = useMemo(
    () => (myChallengerQuery.data?.list ?? []).map((item) => mapBattleToDuel(item, currentUserId, detailMap.get(item.battle.id), commentMap.get(item.battle.id) ?? [], 'challenger')),
    [myChallengerQuery.data?.list, currentUserId, detailMap, commentMap],
  );

  const sortedPlazaDuels = useMemo(() => {
    const list = [...plazaDuels];
    switch (activeSort) {
      case '大额':
        return list.sort((a, b) => b.wager - a.wager);
      case '最新':
        return list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      case '进行中':
        return list.filter((duel) => duel.rawStatus === 'open');
      case '待结果':
        return list.filter((duel) => duel.rawStatus === 'pending');
      case '已结算':
        return list.filter((duel) => duel.rawStatus === 'settled');
      default:
        return list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    }
  }, [activeSort, plazaDuels]);

  const fallbackUnsettledItems = useMemo(
    () => (plazaQuery.data?.list ?? []).filter((item) => item.battle.status !== 'settled'),
    [plazaQuery.data?.list],
  );
  const fallbackPoolTotal = useMemo(
    () => fallbackUnsettledItems.reduce((sum, item) => sum + item.battle.poolPrincipalTotal, 0),
    [fallbackUnsettledItems],
  );
  const fallbackPendingCount = useMemo(
    () => (plazaQuery.data?.list ?? []).filter((item) => item.battle.status === 'pending').length,
    [plazaQuery.data?.list],
  );
  const fallbackUnsettledCount = fallbackUnsettledItems.length;
  const fallbackBankerCount = useMemo(
    () => new Set(fallbackUnsettledItems.map((item) => item.battle.bankerUserId)).size,
    [fallbackUnsettledItems],
  );
  const totalFrozen = battleStatsQuery.data?.poolTotal ?? fallbackPoolTotal;
  const totalPendingCount = battleStatsQuery.data?.pendingCount ?? fallbackPendingCount;
  const totalBattleCount = battleStatsQuery.data?.unsettledCount ?? fallbackUnsettledCount;
  const totalBankerCount = battleStatsQuery.data?.bankerCount ?? fallbackBankerCount;

  const joinModalMax = joinModal ? Math.max(100, Math.min(joinModal.max, userBalance)) : 100;
  const normalizedJoinAmount = joinModal ? clampAmount(joinAmount, 100, joinModalMax) : 100;
  const normalizedAddStakeAmount = clampAmount(addStakeAmount, 100, Math.max(100, userBalance));
  const canSubmitCreate =
    isAuthenticated &&
    !createBattleMutation.isLoading &&
    topic.trim().length > 0 &&
    bankerOpinion.trim().length > 0 &&
    challengerOpinion.trim().length > 0 &&
    Number.isFinite(wager) &&
    wager >= 100 &&
    wager <= userBalance &&
    Boolean(settleTime) &&
    (visibility === 'public' || inviteInput.trim().length > 0);
  const canSubmitJoin =
    isAuthenticated &&
    !joinBattleMutation.isLoading &&
    Boolean(joinModal) &&
    normalizedJoinAmount >= 100 &&
    normalizedJoinAmount <= joinModalMax &&
    normalizedJoinAmount <= userBalance &&
    (joinModal?.visibility !== 'private' || inviteInput.trim().length > 0);
  const canSubmitAddStake =
    isAuthenticated &&
    !addStakeMutation.isLoading &&
    Boolean(addStakeModal) &&
    normalizedAddStakeAmount >= 100 &&
    normalizedAddStakeAmount <= userBalance;

  const pushFeedback = (tone: 'success' | 'error' | 'info', text: string) => {
    setFeedback({ tone, text });
    if (tone === 'error' && typeof window !== 'undefined' && lastPopupMessageRef.current !== text) {
      lastPopupMessageRef.current = text;
      window.alert(text);
      window.setTimeout(() => {
        if (lastPopupMessageRef.current === text) {
          lastPopupMessageRef.current = '';
        }
      }, 0);
    }
  };

  const setMappedError = (error: unknown) => {
    const message = error instanceof Error ? error.message : '';
    pushFeedback('error', getBattleErrorMessage(message));
  };

  useEffect(() => {
    if (!plazaQuery.isError) return;
    setMappedError(plazaQuery.error);
  }, [plazaQuery.error, plazaQuery.isError]);

  useEffect(() => {
    if (activeTab !== 'my-banker' || !myBankerQuery.isError) return;
    setMappedError(myBankerQuery.error);
  }, [activeTab, myBankerQuery.error, myBankerQuery.isError]);

  useEffect(() => {
    if (activeTab !== 'my-challenger' || !myChallengerQuery.isError) return;
    setMappedError(myChallengerQuery.error);
  }, [activeTab, myChallengerQuery.error, myChallengerQuery.isError]);

  // 创建前先在页面层挡一轮基础校验，避免无意义请求直接打后端。
  const handleCreate = async () => {
    if (!isAuthenticated) {
      pushFeedback('error', '请先登录后再创建赌局。');
      return;
    }
    if (!topic.trim() || !bankerOpinion.trim() || !challengerOpinion.trim()) {
      pushFeedback('error', '请先完整填写议题和双方立场。');
      return;
    }
    if (!settleTime) {
      pushFeedback('error', '请选择结算时间。');
      return;
    }

    const settleTimestamp = Math.floor(new Date(settleTime).getTime() / 1000);
    if (!Number.isFinite(settleTimestamp) || settleTimestamp <= 0) {
      pushFeedback('error', '结算时间格式不正确。');
      return;
    }
    if (wager < 100) {
      pushFeedback('error', '开战金额不能低于 100。');
      return;
    }
    if (wager > userBalance) {
      pushFeedback('error', '当前余额不足，无法创建该赌局。');
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

    try {
      await createBattleMutation.mutateAsync({
        title: topic.trim(),
        bankerSide: bankerOpinion.trim(),
        challengerSide: challengerOpinion.trim(),
        stakeAmount: wager,
        isPublic: visibility === 'public',
        inviteCode: visibility === 'private' ? inviteInput.trim() : '',
        settleTime: settleTimestamp,
        requestId: createBattleRequestId('battle-create'),
      });
      setTopic('');
      setBankerOpinion('');
      setChallengerOpinion('');
      setSettleTime('');
      setVisibility('public');
      setComposeOpen(false);
      pushFeedback('success', '赌局已创建，广场列表已刷新。');
    } catch (error) {
      setMappedError(error);
    }
  };

  const handleJoinBattle = async () => {
    if (!joinModal) return;
    if (!isAuthenticated) {
      pushFeedback('error', '请先登录后再加入赌局。');
      return;
    }
    if (joinModal.visibility === 'private' && inviteInput.trim().length === 0) {
      pushFeedback('error', '私密赌局需要先填写邀请码。');
      return;
    }
    if (normalizedJoinAmount > userBalance) {
      pushFeedback('error', '余额不足，无法完成挑战。');
      return;
    }
    if (normalizedJoinAmount > joinModal.max) {
      pushFeedback('error', `挑战金额超过剩余额度，当前最多 ${formatCoins(joinModal.max)}🪙。`);
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
    if (!isAuthenticated) {
      pushFeedback('error', '请先登录后再追加押注。');
      return;
    }
    if (normalizedAddStakeAmount > userBalance) {
      pushFeedback('error', '余额不足，无法追加押注。');
      return;
    }
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
    if (!isAuthenticated) {
      pushFeedback('error', '请先登录后再进行宣判。');
      return;
    }
    try {
      await declareBattleMutation.mutateAsync({ battleId: duel.battleId, result });
      pushFeedback('success', '宣判结果已提交。');
    } catch (error) {
      setMappedError(error);
    }
  };

  const handleChallengeConfirm = async (duel: DuelItem) => {
    if (!isAuthenticated) {
      pushFeedback('error', '请先登录后再确认结果。');
      return;
    }
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
    if (!isAuthenticated) {
      pushFeedback('error', '请先登录后再发起异议。');
      return;
    }
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
    if (!isAuthenticated) {
      pushFeedback('error', '请先登录后再提取奖励。');
      return;
    }
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
    if (!isAuthenticated) {
      pushFeedback('error', '请先登录后再点赞。');
      return;
    }

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
    if (!isAuthenticated) {
      pushFeedback('error', '请先登录后再发表评论。');
      return;
    }
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

  const renderList = (items: DuelItem[]) =>
    items.length > 0 ? (
      items.map((duel) => (
        <DuelCard
          key={duel.id}
          duel={duel}
          commentsOpen={!!commentOpen[duel.id]}
          liked={!!likedMap[duel.id]}
          onToggleComments={() => setCommentOpen((prev) => ({ ...prev, [duel.id]: !prev[duel.id] }))}
          onToggleLike={() => void handleToggleBattleLike(duel)}
          onJoin={() => {
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
            setAddStakeModal({
              duelId: duel.battleId,
              title: duel.topic,
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
      <div className="empty-state">
        <div className="empty-ico">🐢</div>
        <div className="empty-title">这里还没有内容</div>
        <div className="empty-sub">切换其他 Tab 或先发起一场赌局。</div>
      </div>
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
  const detailResultLabel =
    detailBattle?.result === 'banker_wins'
      ? '庄家获胜'
      : detailBattle?.result === 'banker_loses'
        ? '挑战者获胜'
        : detailBattle?.result === 'void'
          ? '本局作废'
          : '待宣布';

  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div
        id="page-battle-square"
        className="legacy-battle-square relative min-h-full bg-transparent px-0 py-0 md:rounded-none md:border-x md:border-slate-200 md:bg-slate-50 dark:md:border-rdark-border dark:md:bg-rdark-card"
      >
        <div className="bp-wrap">
          {!isAuthenticated ? (
            <div
              className="duel-compose"
              style={{
                borderColor: 'rgba(245,158,11,.22)',
                background: 'linear-gradient(135deg, rgba(24,24,27,.96), rgba(15,23,42,.94))',
                boxShadow: '0 18px 40px rgba(0,0,0,.28)',
              }}
            >
              <div
                className="dc-header"
                style={{
                  background: 'linear-gradient(180deg, rgba(245,158,11,.08), rgba(255,255,255,.02))',
                  borderBottom: '1px solid rgba(245,158,11,.14)',
                }}
              >
                <div className="dc-ava">🔐</div>
                <div className="dc-placeholder" style={{ cursor: 'default', color: '#f8d27a' }}>
                  当前未登录。开战广场浏览正常，但创建、挑战、宣判、确认、异议和提取都需要先登录。
                </div>
              </div>
            </div>
          ) : null}

          <div className="page-hero-battle">
            <div className="phb-label">⚔️ 庄家赌局</div>
            <div className="phb-title">开<span>战</span>广场</div>
            <div className="phb-sub">做庄开局 · 挑战接战 · 龟币对赌</div>
            <div className="phb-stats">
              <div className="phb-stat">🔥 当前 {totalBattleCount} 场赌局</div>
              <div className="phb-stat">💰 冻结 {formatCoins(totalFrozen)} 龟币</div>
              <div className="phb-stat">👥 {totalBankerCount} 位庄家</div>
              <div className="phb-stat">⚡ {totalPendingCount} 场等待结算</div>
            </div>
          </div>

          {feedback ? (
            <div className="duel-compose" style={{ borderColor: feedback.tone === 'error' ? 'rgba(239,68,68,.22)' : feedback.tone === 'success' ? 'rgba(16,185,129,.22)' : undefined }}>
              <div className="dc-header">
                <div className="dc-ava">{feedback.tone === 'error' ? '⚠️' : feedback.tone === 'success' ? '✅' : 'ℹ️'}</div>
                <div className="dc-placeholder" style={{ cursor: 'default', color: feedback.tone === 'error' ? 'var(--red)' : feedback.tone === 'success' ? 'var(--green)' : 'var(--ink)' }}>
                  {feedback.text}
                </div>
                <button className="dc-cancel" onClick={() => setFeedback(null)}>关闭</button>
              </div>
            </div>
          ) : null}

          <div className="plaza-rules">
            <div className="plaza-rules-header" onClick={() => setRulesOpen((prev) => !prev)}>
              <div>📜</div>
              <div className="plaza-rules-title">广场规则 · 开局前必读</div>
              <div className={`plaza-rules-chev ${rulesOpen ? 'open' : ''}`}>▸</div>
            </div>
            {rulesOpen && (
              <div className="plaza-rules-body">
                <div className="rules-section">
                  <div className="rules-title">基本机制</div>
                  <div className="pr-grid">
                    <RuleCard title="🎲 做庄（1v多）" text="庄家自定议题和双方立场，押注 100 起。所有加入的人自动站对立面，形成一个庄家对多个挑战者。" />
                    <RuleCard title="⚔️ 挑战庄家" text="公开赌局收 5% 入场费给庄家，私人赌局无入场费。挑战者冻结总额不得超过庄家押注，满额自动封盘。" />
                  </div>
                </div>
                <div className="rules-section">
                  <div className="rules-title">结算流程</div>
                  <div className="rules-steps">
                    1. 到达结算时间后自动封盘。<br />
                    2. 庄家 24h 内宣布结果，超时系统自动判庄家输。<br />
                    3. 挑战者 24h 内确认，未操作视为同意。<br />
                    4. 任一人异议则进入管理员仲裁。
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="duel-compose">
            <div className="dc-header">
              <div className="dc-ava">🦊</div>
              <div className="dc-placeholder" onClick={() => setComposeOpen(true)}>想开一局？点击做庄，设定议题和押注…</div>
              <button className="dc-btn" onClick={() => setComposeOpen(true)}>🎲 我要做庄</button>
            </div>
            {composeOpen && (
              <div className="dc-form">
                <div className="dc-row">
                  <div className="dc-label">议题（事件标题）</div>
                  <input className="dc-input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="例：2026 世界杯决赛巴西夺冠" />
                </div>
                <div className="dc-row">
                  <div className="dc-label">🔴 庄家立场</div>
                  <textarea className="dc-textarea" value={bankerOpinion} onChange={(e) => setBankerOpinion(e.target.value)} placeholder="写出你的立场和理由…" />
                </div>
                <div className="dc-row">
                  <div className="dc-label">🔵 挑战者立场</div>
                  <textarea className="dc-textarea" value={challengerOpinion} onChange={(e) => setChallengerOpinion(e.target.value)} placeholder="反方立场…" />
                </div>
                <div className="dc-inline">
                  <div className="dc-row">
                    <div className="dc-label">押注金额</div>
                    <div className="dc-stake-opts">
                      {WAGER_OPTIONS.map((amount) => (
                        <div key={amount} className={`dc-stake-opt ${wager === amount ? 'on' : ''}`} onClick={() => setWager(amount)}>
                          {formatCoins(amount)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="dc-row">
                    <div className="dc-label">公开/私人</div>
                    <div className="dc-vis-toggle">
                      <div className={`dc-vis-btn ${visibility === 'public' ? 'on' : ''}`} onClick={() => setVisibility('public')}>🌐 公开</div>
                      <div className={`dc-vis-btn ${visibility === 'private' ? 'on' : ''}`} onClick={() => setVisibility('private')}>🔒 私人</div>
                    </div>
                  </div>
                </div>
                <div className="dc-row" style={{ marginTop: 12 }}>
                  <div className="dc-label">结算时间</div>
                  <input className="dc-input" type="datetime-local" value={settleTime} onChange={(e) => setSettleTime(e.target.value)} />
                </div>
                {visibility === 'private' ? (
                  <div className="dc-row">
                    <div className="dc-label">邀请码</div>
                    <input className="dc-input" value={inviteInput} onChange={(e) => setInviteInput(e.target.value.toUpperCase())} placeholder="私密场必须填写邀请码" />
                  </div>
                ) : null}
                <div className="dc-footer">
                  <div className="dc-fee-hint">
                    {visibility === 'public' ? '公开赌局：挑战者支付 5% 入场费给庄家' : '私人赌局：挑战者无入场费'}
                    {` · 当前余额 ${formatCoins(userBalance)}🪙`}
                  </div>
                  <button className="dc-cancel" onClick={() => setComposeOpen(false)}>取消</button>
                  <button
                    className="dc-submit"
                    onClick={() => void handleCreate()}
                    disabled={!canSubmitCreate}
                    style={!canSubmitCreate ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                  >
                    {createBattleMutation.isLoading ? '提交中...' : `🎲 确认开局 · 冻结 ${formatCoins(wager)}🪙`}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="invite-entry">
            <div style={{ fontSize: 28 }}>🔒</div>
            <div className="invite-entry-info">
              <div className="invite-entry-title">加入私人赌局</div>
              <div className="invite-entry-sub">在挑战私密场时，会优先使用这里填写的邀请码</div>
            </div>
            <input className="invite-entry-input" value={inviteInput} onChange={(e) => setInviteInput(e.target.value.toUpperCase())} placeholder="邀请码" maxLength={20} />
            <div className="invite-entry-btn" onClick={() => pushFeedback('info', '邀请码已保存，点击具体私密赌局时会自动带上。')}>保存</div>
          </div>

          <div className="my-duel-bar">
            <div className={`my-duel-tab ${activeTab === 'plaza' ? 'on' : ''}`} onClick={() => setActiveTab('plaza')}>🏟️ 赌局广场</div>
            <div className={`my-duel-tab ${activeTab === 'my-banker' ? 'on' : ''}`} onClick={() => setActiveTab('my-banker')}>🎲 我做的庄</div>
            <div className={`my-duel-tab ${activeTab === 'my-challenger' ? 'on' : ''}`} onClick={() => setActiveTab('my-challenger')}>⚔️ 我的挑战</div>
          </div>

          {activeTab === 'plaza' && (
            <>
              <div className="battle-sort">
                {PLAZA_SORTS.map((sort) => (
                  <div key={sort} className={`bst ${activeSort === sort ? 'on' : ''}`} onClick={() => setActiveSort(sort)}>{sort}</div>
                ))}
                <div className="bsort-sep" />
                <div
                  className="bst"
                  onClick={() => {
                    void plazaQuery.refetch();
                    if (isAuthenticated) {
                      void battleStatsQuery.refetch();
                    }
                    void myBankerQuery.refetch();
                    void myChallengerQuery.refetch();
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        animation: (plazaQuery.isFetching || battleStatsQuery.isFetching || myBankerQuery.isFetching || myChallengerQuery.isFetching) ? 'bp-spin 0.9s linear infinite' : undefined,
                        fontSize: 14,
                      }}
                    >
                      ⟳
                    </span>
                    <span>{(plazaQuery.isFetching || battleStatsQuery.isFetching || myBankerQuery.isFetching || myChallengerQuery.isFetching) ? '刷新中' : '刷新'}</span>
                  </span>
                </div>
              </div>
              {plazaQuery.isLoading ? (
                <div className="empty-state">
                  <div className="empty-ico">⏳</div>
                  <div className="empty-title">开战广场加载中</div>
                  <div className="empty-sub">正在同步最新赌局数据…</div>
                </div>
              ) : plazaQuery.isError ? (
                <div className="empty-state">
                  <div className="empty-ico">⚠️</div>
                  <div className="empty-title">广场加载失败</div>
                  <div className="empty-sub">请稍后重试，或刷新页面重新拉取 battle 列表。</div>
                </div>
              ) : (
                renderList(sortedPlazaDuels)
              )}
            </>
          )}

          {activeTab === 'my-banker' && (
            <>
              <div className="banker-tips">
                <div className="bt-header">
                  <div style={{ fontSize: 22 }}>💡</div>
                  <div className="bt-title">做庄小贴士</div>
                </div>
                <div className="bt-list">
                  <div className="bt-tip"><div>📌</div><div>议题要明确，避免模糊表述，否则可能被判作废。</div></div>
                  <div className="bt-tip"><div>⏰</div><div>结算时间到后 24h 内必须宣布结果，超时系统自动判输。</div></div>
                  <div className="bt-tip"><div>💰</div><div>公开赌局可赚取入场费，但虚报结果也会触发处罚。</div></div>
                </div>
              </div>
              <div className="banker-overview">
                <div className="bo-item"><div className="bo-num">{myBankerDuels.filter((d) => d.status !== 'settled').length}</div><div className="bo-label">进行中</div></div>
                <div className="bo-item"><div className="bo-num">{myBankerDuels.filter((d) => d.status === 'settled').length}</div><div className="bo-label">已结算</div></div>
                <div className="bo-item"><div className="bo-num">{formatCoins(myBankerDuels.reduce((sum, duel) => sum + duel.currentPool, 0))}</div><div className="bo-label">挑战总额</div></div>
              </div>
              {myBankerQuery.isLoading ? (
                <div className="empty-state">
                  <div className="empty-ico">⏳</div>
                  <div className="empty-title">正在加载我的庄局</div>
                  <div className="empty-sub">稍等一下，我们正在拉取你的做庄记录。</div>
                </div>
              ) : myBankerQuery.isError ? (
                <div className="empty-state">
                  <div className="empty-ico">⚠️</div>
                  <div className="empty-title">我的庄局加载失败</div>
                  <div className="empty-sub">当前无法同步你的 battle 数据，请稍后再试。</div>
                </div>
              ) : (
                renderList(myBankerDuels)
              )}
            </>
          )}

          {activeTab === 'my-challenger' && (
            <>
              <div className="challenger-tips">
                <div className="ct-title">⚔️ 我的挑战</div>
                <div className="bt-list">
                  <div className="bt-tip"><div>👀</div><div>关注结算时间，庄家宣布结果后你有 24h 确认窗口。</div></div>
                  <div className="bt-tip"><div>⚠️</div><div>异议要有理有据，恶意异议会被扣冻结额 10% 罚金。</div></div>
                </div>
              </div>
              {myChallengerQuery.isLoading ? (
                <div className="empty-state">
                  <div className="empty-ico">⏳</div>
                  <div className="empty-title">正在加载我的挑战</div>
                  <div className="empty-sub">稍等一下，我们正在拉取你参与过的赌局。</div>
                </div>
              ) : myChallengerQuery.isError ? (
                <div className="empty-state">
                  <div className="empty-ico">⚠️</div>
                  <div className="empty-title">我的挑战加载失败</div>
                  <div className="empty-sub">当前无法同步你的 challenge 记录，请稍后再试。</div>
                </div>
              ) : (
                renderList(myChallengerDuels)
              )}
            </>
          )}
        </div>

        {detailBattleId !== null && (
          <div className="duel-overlay" onClick={() => setDetailBattleId(null)}>
            <div className="duel-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dm-close" onClick={() => setDetailBattleId(null)}>✕</div>
              <div className="dm-title">赌局详情</div>
              <div className="dm-sub">Battle #{detailBattleId}</div>

              {detailBattleQuery.isLoading ? (
                <div className="dm-fee-note">正在加载详情…</div>
              ) : detailBattleQuery.isError ? (
                <div className="dm-fee-note" style={{ color: 'var(--red)' }}>
                  详情加载失败，请稍后重试。
                </div>
              ) : detailBattle ? (
                <>
                  <div className="dm-info-grid">
                    <div className="dm-info-item">
                      <div className="dm-info-label">当前状态</div>
                      <div className="dm-info-value">{detailStatusLabel}</div>
                    </div>
                    <div className="dm-info-item">
                      <div className="dm-info-label">当前结果</div>
                      <div className="dm-info-value">{detailResultLabel}</div>
                    </div>
                    <div className="dm-info-item">
                      <div className="dm-info-label">我的动作</div>
                      <div className="dm-info-value">{detailMyAction ? detailMyAction : '未操作'}</div>
                    </div>
                    <div className="dm-info-item">
                      <div className="dm-info-label">宣判方式</div>
                      <div className="dm-info-value">{detailBattle.resultBy || '待判定'}</div>
                    </div>
                  </div>

                  <div className="dm-fee-note">
                    {detailBattle.pendingDeadline ? `庄家宣判截止：${formatTimestampLabel(detailBattle.pendingDeadline)}` : '当前没有庄家宣判截止时间。'}
                    <br />
                    {detailBattle.confirmDeadline ? `挑战者确认截止：${formatTimestampLabel(detailBattle.confirmDeadline)}` : '当前没有挑战者确认截止时间。'}
                    <br />
                    {detailBattle.resultTime ? `结果生效时间：${formatTimestampLabel(detailBattle.resultTime)}` : '结果尚未生效。'}
                  </div>

                  <div className="dm-info-grid">
                    <div className="dm-info-item">
                      <div className="dm-info-label">结算记录</div>
                      <div className="dm-info-value">
                        {detailSettlement ? `${detailSettlement.result} · ${formatTimestampLabel(detailSettlement.createdAt || detailSettlement.createTime)}` : '未结算'}
                      </div>
                    </div>
                    <div className="dm-info-item">
                      <div className="dm-info-label">我的奖金</div>
                      <div className="dm-info-value gold">{detailMyItem ? `${formatCoins(detailMyItem.payoutAmount)} 🪙` : '暂无'}</div>
                    </div>
                    <div className="dm-info-item">
                      <div className="dm-info-label">提取状态</div>
                      <div className="dm-info-value">{detailMyItem ? (detailMyItem.withdrawn ? '已提取' : '待提取') : '无'}</div>
                    </div>
                    <div className="dm-info-item">
                      <div className="dm-info-label">提取时间</div>
                      <div className="dm-info-value">{detailMyItem?.withdrawTime ? formatTimestampLabel(detailMyItem.withdrawTime) : '未提取'}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="dm-fee-note">当前没有可展示的详情。</div>
              )}
            </div>
          </div>
        )}

        {joinModal && (
          <div className="duel-overlay" onClick={() => setJoinModal(null)}>
            <div className="duel-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dm-close" onClick={() => setJoinModal(null)}>✕</div>
              <div className="dm-title">挑战庄家</div>
              <div className="dm-sub">{joinModal.title}</div>
              <div className="dm-info-grid">
                <div className="dm-info-item">
                  <div className="dm-info-label">剩余可挑战</div>
                  <div className="dm-info-value gold">{formatCoins(joinModalMax)} 🪙</div>
                </div>
                <div className="dm-info-item">
                  <div className="dm-info-label">模式</div>
                  <div className="dm-info-value">{joinModal.visibility === 'public' ? '公开' : '私人'}</div>
                </div>
              </div>
              <div className="dm-label">押注金额</div>
              <input className="dm-stake-input" type="number" min={100} max={joinModalMax} value={joinAmount} onChange={(e) => setJoinAmount(Number(e.target.value || 0))} />
              <div className="dm-amts">
                {[100, 500, 1000, 2000].map((amount) => (
                  <div key={amount} className={`dm-amt ${normalizedJoinAmount === amount ? 'on' : ''}`} onClick={() => setJoinAmount(clampAmount(amount, 100, joinModalMax))}>
                    {amount}
                  </div>
                ))}
              </div>
              <div className="dm-fee-note">
                {joinModal.visibility === 'public' ? '公开赌局会收取 5% 入场费，剩余 95% 进入冻结池。' : '私人赌局不收取入场费，全部金额进入冻结池。'}
                {` 当前将提交 ${formatCoins(normalizedJoinAmount)}🪙。`}
              </div>
              <button
                className="dm-cta"
                onClick={() => void handleJoinBattle()}
                disabled={!canSubmitJoin}
                style={!canSubmitJoin ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
              >
                {joinBattleMutation.isLoading ? '提交中...' : `⚔️ 确认挑战 ${formatCoins(normalizedJoinAmount)} 龟币`}
              </button>
            </div>
          </div>
        )}

        {addStakeModal && (
          <div className="duel-overlay" onClick={() => setAddStakeModal(null)}>
            <div className="duel-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dm-close" onClick={() => setAddStakeModal(null)}>✕</div>
              <div className="dm-title">庄家追加押注</div>
              <div className="dm-sub">{addStakeModal.title}</div>
              <div className="dm-info-grid">
                <div className="dm-info-item">
                  <div className="dm-info-label">当前余额</div>
                  <div className="dm-info-value gold">{formatCoins(userBalance)} 🪙</div>
                </div>
                <div className="dm-info-item">
                  <div className="dm-info-label">说明</div>
                  <div className="dm-info-value">扩大可挑战额度</div>
                </div>
              </div>
              <div className="dm-label">追加金额</div>
              <input className="dm-stake-input" type="number" min={100} max={Math.max(100, userBalance)} value={addStakeAmount} onChange={(e) => setAddStakeAmount(Number(e.target.value || 0))} />
              <div className="dm-amts">
                {[100, 500, 1000, 2000].map((amount) => (
                  <div key={amount} className={`dm-amt ${normalizedAddStakeAmount === amount ? 'on' : ''}`} onClick={() => setAddStakeAmount(clampAmount(amount, 100, Math.max(100, userBalance)))}>
                    {amount}
                  </div>
                ))}
              </div>
              <div className="dm-fee-note">
                追加押注只允许庄家在 `open` 阶段操作，成功后 battle 容量会同步扩大。
                {` 当前将追加 ${formatCoins(normalizedAddStakeAmount)}🪙。`}
              </div>
              <button
                className="dm-cta"
                onClick={() => void handleBankerAddStake()}
                disabled={!canSubmitAddStake}
                style={!canSubmitAddStake ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
              >
                {addStakeMutation.isLoading ? '提交中...' : `➕ 确认加注 ${formatCoins(normalizedAddStakeAmount)} 龟币`}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
