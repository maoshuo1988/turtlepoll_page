/** 文件说明：世界杯专题核心实现，体育转播 HUD 风格 —— 预测板、暗盘赛程、最新消息等。 */
import styles from './index.module.scss';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from '@umijs/renderer-react';
import {
  Activity,
  CalendarClock,
  ChevronRight,
  Coins,
  Crosshair,
  ExternalLink,
  Flame,
  Goal,
  Hash,
  MessageCircleMore,
  Newspaper,
  Radio,
  Sparkles,
  Swords,
  ThumbsUp,
  Trophy,
  Zap,
} from 'lucide-react';
import { PredictionBetModal } from '@/pages/home/components/PredictionBetModal';
import type { PredictionBetOption, PredictionCardItem } from '@/pages/home/components/predictionCards';
import { calcPredictionMarketOdds } from '@/pages/home/components/predictionCards';
import type { PlaceBetResult } from '@/hooks/coinTypes';
import { useRequestFootballMarketsByTag } from '@/hooks/usePredictionRequests';
import type { FootballMarketAggregate } from '@/hooks/predictionTypes';
import { useRequestNewsListDirect } from '@/hooks/useNewsRequests';
import type { NewsArticle } from '@/hooks/newsTypes';
import { useHomeLayoutContext } from '@/layouts/context';
import { WorldCupCardPitchTexture, WorldCupPitchBackdropLayers } from '../WorldCupPitchBackdrop';

function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}

type FixtureOdds = {
  home: number;
  draw: number;
  away: number;
};

type Fixture = {
  id: string;
  time: string;
  stage: string;
  home: string;
  homeFlag: string;
  away: string;
  awayFlag: string;
  odds: FixtureOdds;
  pool: string;
  heat: number;
  signal: string;
  signalTone: 'gold' | 'rose' | 'sky';
  predictionItem?: PredictionCardItem;
};

type FeaturedMarket = {
  title: string;
  tag: string;
  sideA: { label: string; accent: string; pct: number };
  sideB: { label: string; accent: string; pct: number };
  heat: string;
  pool: string;
  predictionItem?: PredictionCardItem;
};

type NewsCategory = 'breaking' | 'official' | 'insider' | 'rumor';

type NewsItem = {
  id: string;
  source: string;
  sourceAvatar: string;
  sourceUrl?: string;
  time: string;
  category: NewsCategory;
  categoryLabel: string;
  headline: string;
  body: string;
  likes: number;
};

const newsCategoryStyle: Record<NewsCategory, string> = {
  breaking: 'border-rose-400/45 bg-rose-400/15 text-rose-300',
  official: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300',
  insider: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  rumor: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
};

const mapHotspots: { name: string; x: number; y: number; top?: boolean }[] = [
  { name: '巴西', x: 108, y: 125, top: true },
  { name: '法国', x: 198, y: 42 },
  { name: '阿根廷', x: 105, y: 148 },
  { name: '西班牙', x: 185, y: 50 },
  { name: '英格兰', x: 188, y: 32 },
  { name: '德国', x: 208, y: 38 },
  { name: '葡萄牙', x: 180, y: 52 },
  { name: '荷兰', x: 200, y: 35 },
  { name: '比利时', x: 198, y: 40 },
  { name: '摩洛哥', x: 188, y: 72 },
];

const continentPaths = [
  'M30 30 L70 22 L110 28 L125 50 L115 72 L90 82 L60 80 L35 65 L28 50 Z',
  'M95 85 L115 82 L122 92 L110 95 Z',
  'M102 95 L122 95 L135 110 L130 138 L110 152 L95 155 L82 130 L88 105 Z',
  'M145 18 L162 18 L165 32 L148 36 Z',
  'M178 28 L220 26 L230 44 L218 60 L192 65 L178 50 Z',
  'M192 70 L240 68 L252 96 L245 130 L222 148 L200 145 L188 120 L185 90 Z',
  'M232 25 L320 22 L358 42 L365 64 L340 80 L308 85 L278 75 L248 60 L232 45 Z',
  'M270 85 L295 83 L293 110 L280 108 Z',
  'M312 95 L332 96 L332 105 L312 105 Z',
  'M320 122 L365 120 L360 145 L326 147 Z',
  'M358 50 L368 48 L365 65 L357 63 Z',
];

const signalToneMap = {
  gold: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/35',
  rose: 'text-rose-300 bg-rose-500/10 border-rose-500/35',
  sky: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/35',
} as const;

function asNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function formatCompact(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}w`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value)}`;
}

function formatFixtureTime(value?: number) {
  if (!value) return '待定';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '待定';
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  const dayLabel = isToday ? '今天' : isTomorrow ? '明天' : `${date.getMonth() + 1}/${date.getDate()}`;
  return `${dayLabel} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function calcMarketOdds(item: FootballMarketAggregate) {
  const context = item.context ?? {};
  const votesA = asNumber(context.proVoteCount);
  const votesB = asNumber(context.conVoteCount);
  const poolA = asNumber(item.market.poolA, votesA);
  const poolB = asNumber(item.market.poolB, votesB);
  const baseA = asNumber(item.market.baseA, 500);
  const baseB = asNumber(item.market.baseB, 500);
  const effectiveA = Math.max(1, baseA + poolA);
  const effectiveB = Math.max(1, baseB + poolB);
  const total = effectiveA + effectiveB;

  return {
    oddsA: Number((Math.max(1.2, Math.min(5, total / effectiveA))).toFixed(2)),
    oddsB: Number((Math.max(1.2, Math.min(5, total / effectiveB))).toFixed(2)),
    poolA,
    poolB,
    votesA,
    votesB,
  };
}

function mapFootballMarketToPredictionItem(item: FootballMarketAggregate): PredictionCardItem {
  const context = item.context ?? {};
  const { votesA, votesB, votesC, oddsA, oddsB, oddsDraw } = calcPredictionMarketOdds(item);

  return {
    id: `market-${item.market.id}`,
    marketId: item.market.id,
    title: context.eventName || item.market.title || `世界杯暗盘 #${item.market.id}`,
    summary: context.detail || item.market.title || '查看当前世界杯暗盘双方观点与资金热度。',
    image: context.imageUrl?.trim() || context.listImage?.trim() || 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&q=80',
    listImage: context.listImage?.trim() || undefined,
    sideABgImage: context.sideABgImage?.trim() || undefined,
    sideBBgImage: context.sideBBgImage?.trim() || undefined,
    sideABgColor: context.sideABgColor?.trim() || undefined,
    sideBBgColor: context.sideBBgColor?.trim() || undefined,
    votes: { A: votesA, B: votesB, C: votesC },
    optionA: context.proText || '支持',
    optionB: context.conText || '反对',
    optionDraw: context.drawText?.trim() || '平局',
    oddsA,
    oddsB,
    oddsDraw,
    status:
      item.market.status === 'OPEN'
        ? 'open'
        : item.market.status === 'SETTLED'
          ? 'settled'
          : 'closed',
    hasBet: item.hasBet ?? false,
    betSettleResult: item.betSettleResult,
    closeTime: item.market.closeTime,
  };
}

function mapFootballMarketToFeatured(item: FootballMarketAggregate): FeaturedMarket {
  const context = item.context ?? {};
  const { poolA, poolB, votesA, votesB } = calcMarketOdds(item);
  const totalVotes = Math.max(1, votesA + votesB);
  const pctA = Math.round((votesA / totalVotes) * 100);
  const tags = (context.tags || 'football').split(',').map((tag) => tag.trim()).filter(Boolean);
  const predictionItem = mapFootballMarketToPredictionItem(item);

  return {
    title: predictionItem.title,
    tag: tags[0] || 'football',
    sideA: {
      label: context.proText || '支持',
      accent: '正方热区',
      pct: pctA,
    },
    sideB: {
      label: context.conText || '反对',
      accent: '反方热区',
      pct: 100 - pctA,
    },
    heat: formatCompact(asNumber(context.heat, votesA + votesB)),
    pool: formatCompact(poolA + poolB),
    predictionItem,
  };
}

function mapFootballMarketToFixture(item: FootballMarketAggregate, index: number): Fixture {
  const context = item.context ?? {};
  const { oddsA, oddsB, poolA, poolB, votesA, votesB } = calcMarketOdds(item);
  const heat = Math.min(99, Math.max(18, Math.round(asNumber(context.heat, votesA + votesB) / 1000)));
  const title = context.eventName || item.market.title || `世界杯暗盘 #${item.market.id}`;
  const predictionItem = mapFootballMarketToPredictionItem(item);

  return {
    id: String(item.market.id),
    time: formatFixtureTime(item.market.closeTime),
    stage: (context.tags || 'football').split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 2).join(' · ') || '世界杯暗盘',
    home: context.proText || '支持',
    homeFlag: index % 2 === 0 ? '⚽' : '🏟️',
    away: context.conText || '反对',
    awayFlag: index % 2 === 0 ? '🏆' : '🥅',
    odds: {
      home: oddsA,
      draw: Number(((oddsA + oddsB) / 2).toFixed(2)),
      away: oddsB,
    },
    pool: formatCompact(poolA + poolB),
    heat,
    signal: context.detail || title,
    signalTone: index % 3 === 0 ? 'gold' : index % 3 === 1 ? 'sky' : 'rose',
    predictionItem,
  };
}

// HUD 卡片四角装饰

/** 今日赛程 / 暗盘：首屏条数、每次「加载更多」Reveal 条数（与接口 limit 对齐） */
const FIXTURE_VISIBLE_CHUNK = 20;

/** 世界杯侧栏资讯分页条数 */
const NEWS_PAGE_SIZE = 10;

/** 赛程表主体最大高度，超出后在区域内滚动，避免页面无限拉长 */
const FIXTURE_LIST_MAX_HEIGHT_CLASS = 'max-h-[min(480px,52vh)] md:max-h-[min(560px,58vh)]';

function formatNewsTime(publishedAt?: number) {
  const rawTime = Number(publishedAt ?? 0);
  if (!Number.isFinite(rawTime) || rawTime <= 0) return '刚刚';

  const timeMs = rawTime > 1_000_000_000_000 ? rawTime : rawTime * 1000;
  const diffSeconds = Math.max(0, Math.floor((Date.now() - timeMs) / 1000));
  if (diffSeconds < 60) return '刚刚';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} 分钟前`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} 小时前`;

  const date = new Date(timeMs);
  if (Number.isNaN(date.getTime())) return '刚刚';
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function resolveNewsCategory(item: NewsArticle): Pick<NewsItem, 'category' | 'categoryLabel'> {
  const haystack = [item.title, item.summary, item.category, item.channel, ...(item.tags ?? [])].join(' ').toLowerCase();

  if (haystack.includes('官方') || haystack.includes('fifa')) {
    return { category: 'official', categoryLabel: '官方公告' };
  }
  if (haystack.includes('传闻') || haystack.includes('伤') || haystack.includes('疑似')) {
    return { category: 'rumor', categoryLabel: '传闻' };
  }
  if (haystack.includes('记者') || haystack.includes('独家') || haystack.includes('内部')) {
    return { category: 'insider', categoryLabel: '内部消息' };
  }
  return { category: 'breaking', categoryLabel: '突发' };
}

function mapNewsArticleToNewsItem(item: NewsArticle): NewsItem {
  const category = resolveNewsCategory(item);
  const sourceName = item.sourceName?.trim() || (item.source === 'hupu' ? '虎扑' : item.source?.trim()) || '体育资讯';

  return {
    id: `news-${item.id}`,
    source: sourceName,
    sourceAvatar: sourceName.includes('虎扑') ? '虎' : '⚽',
    sourceUrl: item.sourceUrl?.trim() || undefined,
    time: formatNewsTime(item.publishedAt),
    ...category,
    headline: item.title,
    body: item.summary?.trim() || '打开原文查看完整报道。',
    likes: Math.max(0, Math.round(Number(item.hotScore ?? 0))),
  };
}

function CornerBrackets() {
  return (
    <>
      <span className={css("pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-emerald-400/70")} />
      <span className={css("pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t border-emerald-400/70")} />
      <span className={css("pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b border-l border-emerald-400/70")} />
      <span className={css("pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r border-emerald-400/70")} />
    </>
  );
}

export function WorldCupPage() {
  const location = useLocation();
  const [footballPage, setFootballPage] = useState(1);
  const [visibleFixtureCount, setVisibleFixtureCount] = useState(FIXTURE_VISIBLE_CHUNK);
  const [loadedFootballMarkets, setLoadedFootballMarkets] = useState<FootballMarketAggregate[]>([]);
  const [newsPage, setNewsPage] = useState(1);
  const [loadedNewsArticles, setLoadedNewsArticles] = useState<NewsArticle[]>([]);
  const [betModal, setBetModal] = useState<{ item: PredictionCardItem; option: PredictionBetOption } | null>(null);
  const [localBetSides, setLocalBetSides] = useState<Record<string, PredictionBetOption>>({});
  const { onOpenAuth } = useHomeLayoutContext();
  const navigate = useNavigate();
  const footballMarketsQuery = useRequestFootballMarketsByTag({
    tag: 'football',
    page: footballPage,
    limit: FIXTURE_VISIBLE_CHUNK,
    requireAuth: false,
  });
  const newsListQuery = useRequestNewsListDirect({
    page: newsPage,
    pageSize: NEWS_PAGE_SIZE,
    category: 'football',
    source: 'hupu',
    sort: 'publishedAt_desc',
  });
  const footballMarketsPage = footballMarketsQuery.data?.list ?? [];
  const newsArticlePage = newsListQuery.data?.list ?? [];

  useEffect(() => {
    if (!footballMarketsPage.length) return;

    setLoadedFootballMarkets((prev) => {
      const next = footballPage === 1 ? [] : [...prev];
      footballMarketsPage.forEach((item) => {
        const existingIndex = next.findIndex((current) => current.market.id === item.market.id);
        if (existingIndex >= 0) {
          next[existingIndex] = item;
          return;
        }
        next.push(item);
      });
      return next;
    });
  }, [footballMarketsPage, footballPage]);

  useEffect(() => {
    if (footballPage === 1 && footballMarketsPage.length > 0) {
      setVisibleFixtureCount(FIXTURE_VISIBLE_CHUNK);
    }
  }, [footballPage, footballMarketsPage.length]);

  useEffect(() => {
    if (!newsArticlePage.length) return;

    setLoadedNewsArticles((prev) => {
      const next = newsPage === 1 ? [] : [...prev];
      newsArticlePage.forEach((item) => {
        const existingIndex = next.findIndex((current) => current.id === item.id);
        if (existingIndex >= 0) {
          next[existingIndex] = item;
          return;
        }
        next.push(item);
      });
      return next;
    });
  }, [newsArticlePage, newsPage]);

  const footballMarkets = loadedFootballMarkets.length > 0 ? loadedFootballMarkets : footballMarketsPage;
  const footballTotal = footballMarketsQuery.data?.total ?? footballMarkets.length;
  const hasMoreFootballMarkets = footballMarkets.length > 0 && footballMarkets.length < footballTotal;
  const newsArticles = loadedNewsArticles.length > 0 ? loadedNewsArticles : newsArticlePage;
  const newsTotal = newsListQuery.data?.count ?? newsArticles.length;
  const hasMoreNews = newsArticles.length > 0 && newsArticles.length < newsTotal;
  const worldCupNewsItems = useMemo(
    () => newsArticles.map(mapNewsArticleToNewsItem),
    [newsArticles],
  );
  const featuredMarkets = useMemo(
    () => footballMarkets.slice(0, 3).map(mapFootballMarketToFeatured),
    [footballMarkets],
  );
  const todayFixtures = useMemo(
    () => footballMarkets.map(mapFootballMarketToFixture),
    [footballMarkets],
  );
  const marketTopRows = useMemo(() => footballMarkets.slice(0, 10).map((item, index) => {
    const context = item.context ?? {};
    const { poolA, poolB, votesA, votesB } = calcMarketOdds(item);
    const predictionItem = mapFootballMarketToPredictionItem(item);

    return {
      rank: index + 1,
      title: predictionItem.title,
      sideLabel: `${predictionItem.optionA} / ${predictionItem.optionB}`,
      tag: (context.tags || 'football').split(',').map((tag) => tag.trim()).filter(Boolean)[0] || 'football',
      heat: formatCompact(asNumber(context.heat, votesA + votesB)),
      pool: formatCompact(poolA + poolB),
    };
  }), [footballMarkets]);
  const visibleTodayFixtures = todayFixtures.slice(0, visibleFixtureCount);
  const canRevealLoadedFixtures = visibleFixtureCount < todayFixtures.length;
  const canViewMoreFixtures = canRevealLoadedFixtures || hasMoreFootballMarkets;

  const openPredictionBet = (item: PredictionCardItem | undefined, option: PredictionBetOption) => {
    if (!item || item.status !== 'open' || item.hasBet || localBetSides[item.id]) return;
    setBetModal({ item, option });
  };

  /** 首页撕裂带按 marketId 拉齐数据；state 直达 EventBattle，避免 Hero 仍错用默认列表 */
  const goToTearZone = useCallback((item: PredictionCardItem | undefined) => {
    if (!item?.marketId) return;
    navigate(`/event-battle?market=${item.marketId}`, {
      state: {
        openBattleNews: item,
        returnTo: `${location.pathname}${location.search || ''}`,
      },
    });
  }, [location.pathname, location.search, navigate]);

  const handleBetSuccess = (item: PredictionCardItem, option: PredictionBetOption, _result: PlaceBetResult) => {
    setLocalBetSides((prev) => ({ ...prev, [item.id]: option }));
  };

  const handleLoadMoreMarkets = () => {
    if (canRevealLoadedFixtures) {
      setVisibleFixtureCount((count) =>
        Math.min(count + FIXTURE_VISIBLE_CHUNK, todayFixtures.length),
      );
      return;
    }
    if (!hasMoreFootballMarkets || footballMarketsQuery.isLoading) return;
    setFootballPage((page) => page + 1);
  };

  const handleLoadMoreNews = () => {
    if (!hasMoreNews || newsListQuery.isLoading) return;
    setNewsPage((page) => page + 1);
  };

  return (
    <section className={css("relative w-full max-w-none min-h-full mx-0 grid content-start gap-4 max-lg:gap-3 overflow-x-hidden bg-transparent view-world-cup pb-8 pt-[10px] font-mono text-zinc-100")}>
      <div
        aria-hidden
        className={css("pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[min(260px,32vh)] bg-[radial-gradient(ellipse_130%_90%_at_50%_120%,rgba(16,185,129,0.28),rgba(52,211,153,0.08)_48%,transparent_70%)]")}
      />
      {/* Hero —— HUD 顶部直播看板 */}
      <div className={css("relative isolate overflow-hidden rounded-[20px] border border-emerald-400/30 shadow-[0_0_40px_rgba(52,255,139,0.12),0_20px_60px_rgba(0,0,0,0.55)]")}>
        {/* 基底 */}
        <div className={css("absolute inset-0 bg-[linear-gradient(140deg,#08111a,#06151b_55%,#040b0f)]")} />
        {/* 网格 */}
        <div
          className={css("absolute inset-0 opacity-[0.18]")}
          style={{
            backgroundImage:
              'linear-gradient(rgba(34,211,238,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.08) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* 高光 */}
        <div className={css("absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(52,255,139,0.18),transparent_42%),radial-gradient(circle_at_88%_18%,rgba(34,211,238,0.18),transparent_38%),radial-gradient(circle_at_60%_92%,rgba(255,46,99,0.10),transparent_45%)]")} />
        {/* 扫描线 */}
        <div
          className={css("pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-screen")}
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.7) 0 1px, transparent 1px 3px)',
          }}
        />
        <WorldCupPitchBackdropLayers />
        <CornerBrackets />

        <div className={css("relative grid gap-6 px-5 py-6 md:px-8 md:py-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-stretch")}>
          <div className={css("min-w-0 xl:flex xl:flex-col")}>
            <div className={css("inline-flex w-fit items-center gap-2 rounded-sm border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300")}>
              <span className={css("relative flex h-2 w-2")}>
                <span className={css("absolute inset-0 animate-ping rounded-full bg-rose-400/70")} />
                <span className={css("relative h-2 w-2 rounded-full bg-rose-400")} />
              </span>
              LIVE · WORLD CUP HUD
            </div>
            <h1 className={css("mt-5 max-w-[720px] font-sans font-black uppercase leading-[0.95] tracking-tight text-[40px] md:text-[60px] [text-shadow:0_0_24px_rgba(52,255,139,0.18)]")}>
              <span className={css("block text-zinc-100")}>PREDICT</span>
              <span className={css("block text-emerald-400")}>THE FINAL</span>
            </h1>
            <p className={css("mt-4 max-w-[640px] text-[13px] leading-7 text-zinc-400 md:text-[14px]")}>
              全场直播看板 · 实时赔率推送 · 资金流热区追踪。
              从小组赛到决赛,一块屏看完世界杯所有暗盘信号。
            </p>
            {/* 动态世界地图 */}
            <div
              className={css("relative mt-6 w-full overflow-hidden rounded-[10px] border border-cyan-400/25 bg-black/55 aspect-[400/110] xl:aspect-auto xl:min-h-[120px] xl:flex-1")}
            >
              {/* 角标 */}
              <div className={css("pointer-events-none absolute left-3 top-2 z-10 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300/75")}>
                // GLOBAL HEAT MAP
              </div>
              <div className={css("pointer-events-none absolute right-3 top-2 z-10 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300/90")}>
                <span className={css("relative flex h-1.5 w-1.5")}>
                  <span className={css("absolute inset-0 animate-ping rounded-full bg-emerald-400/70")} />
                  <span className={css("relative h-1.5 w-1.5 rounded-full bg-emerald-400")} />
                </span>
                LIVE
              </div>
              {/* 经纬线网格 */}
              <div
                className={css("absolute inset-0 opacity-[0.22]")}
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(34,211,238,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.18) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
              <svg
                viewBox="0 0 400 160"
                preserveAspectRatio="none"
                className={css("absolute inset-0 h-full w-full")}
              >
                <defs>
                  <pattern id="wc-map-dots" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
                    <circle cx="2.5" cy="2.5" r="0.5" fill="rgba(34,211,238,0.45)" />
                  </pattern>
                </defs>
                <g>
                  {continentPaths.map((d, i) => (
                    <path
                      key={i}
                      d={d}
                      fill="url(#wc-map-dots)"
                      stroke="rgba(52,255,139,0.45)"
                      strokeWidth={0.5}
                    />
                  ))}
                </g>
              </svg>
              {/* 国家热点 */}
              {mapHotspots.map((h) => (
                <div
                  key={h.name}
                  className={css("absolute")}
                  style={{
                    left: `${(h.x / 400) * 100}%`,
                    top: `${(h.y / 160) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <span className={css("relative flex h-2 w-2")}>
                    <span
                      className={css(`absolute inset-0 animate-ping rounded-full ${h.top ? 'bg-emerald-400/85' : 'bg-cyan-400/70'}`)}
                    />
                    <span
                      className={css(`relative h-2 w-2 rounded-full ${h.top ? 'bg-emerald-300 shadow-[0_0_10px_rgba(52,255,139,0.7)]' : 'bg-cyan-300'}`)}
                    />
                  </span>
                  {h.top && (
                    <span className={css("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-sm border border-emerald-400/40 bg-black/65 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300 backdrop-blur")}>
                      {h.name} · 夺冠热门
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* 大屏统计 */}
            <div className={css("mt-3 grid grid-cols-3 gap-1.5 sm:gap-3")}>
              <div className={css("relative flex min-w-0 items-center justify-center gap-1 overflow-hidden rounded-[10px] border border-emerald-400/25 bg-black/55 px-1.5 py-2 backdrop-blur sm:block sm:p-4")}>
                <div className={css("hidden h-[3px] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 sm:block")} />
                <div className={css("shrink-0 whitespace-nowrap text-[9.5px] font-black uppercase tracking-0 text-emerald-300/75 sm:mt-3 sm:text-[10px] sm:tracking-[0.2em]")}>
                  <span className={css("sm:hidden")}>总龟币量</span>
                  <span className={css("hidden sm:inline")}>TOTAL TURTLE COIN · 总龟币量</span>
                </div>
                <div className={css("shrink-0 whitespace-nowrap font-sans text-[15px] font-black leading-none tracking-tight text-emerald-300 [text-shadow:0_0_14px_rgba(52,255,139,0.45)] sm:mt-1 sm:text-[30px]")}>
                  2.88M
                </div>
              </div>
              <div className={css("relative flex min-w-0 items-center justify-center gap-1 overflow-hidden rounded-[10px] border border-cyan-400/25 bg-black/55 px-1.5 py-2 backdrop-blur sm:block sm:p-4")}>
                <div className={css("hidden h-[3px] rounded-full bg-gradient-to-r from-cyan-400 to-sky-400 sm:block")} />
                <div className={css("shrink-0 whitespace-nowrap text-[9.5px] font-black uppercase tracking-0 text-cyan-300/75 sm:mt-3 sm:text-[10px] sm:tracking-[0.2em]")}>
                  <span className={css("sm:hidden")}>开盘数</span>
                  <span className={css("hidden sm:inline")}>OPEN MARKETS · 开盘数</span>
                </div>
                <div className={css("shrink-0 whitespace-nowrap font-sans text-[15px] font-black leading-none tracking-tight text-cyan-300 [text-shadow:0_0_14px_rgba(34,211,238,0.4)] sm:mt-1 sm:text-[30px]")}>
                  36
                </div>
              </div>
              <div className={css("relative flex min-w-0 items-center justify-center gap-1 overflow-hidden rounded-[10px] border border-rose-400/25 bg-black/55 px-1.5 py-2 backdrop-blur sm:block sm:p-4")}>
                <div className={css("hidden h-[3px] rounded-full bg-gradient-to-r from-rose-400 to-amber-300 sm:block")} />
                <div className={css("shrink-0 whitespace-nowrap text-[9.5px] font-black uppercase tracking-0 text-rose-300/75 sm:mt-3 sm:text-[10px] sm:tracking-[0.2em]")}>
                  <span className={css("sm:hidden")}>爆冷率</span>
                  <span className={css("hidden sm:inline")}>UPSET RATE · 爆冷率</span>
                </div>
                <div className={css("shrink-0 whitespace-nowrap font-sans text-[15px] font-black leading-none tracking-tight text-rose-300 [text-shadow:0_0_14px_rgba(255,46,99,0.4)] sm:mt-1 sm:text-[30px]")}>
                  19%
                </div>
              </div>
            </div>
          </div>

          {/* 热门市场排行榜 TOP 10 */}
          <div className={css("relative overflow-hidden rounded-[14px] border border-emerald-400/30 bg-black/55 p-4 backdrop-blur-md")}>
            <WorldCupCardPitchTexture />
            <CornerBrackets />
            <header className={css("relative flex items-center justify-between")}>
              <div className={css("flex items-center gap-2")}>
                <span className={css("inline-flex items-center gap-1.5 rounded-sm border border-emerald-400/40 bg-emerald-400/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300")}>
                  <Trophy size={11} />
                  MARKET TOP 10
                </span>
              </div>
              <span className={css("inline-flex items-center gap-1 rounded-sm border border-rose-400/35 bg-rose-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-rose-300")}>
                <span className={css("relative flex h-1.5 w-1.5")}>
                  <span className={css("absolute inset-0 animate-ping rounded-full bg-rose-400/70")} />
                  <span className={css("relative h-1.5 w-1.5 rounded-full bg-rose-400")} />
                </span>
                LIVE ODDS
              </span>
            </header>
            <div className={css("relative mt-2 flex items-end justify-between")}>
              <h3 className={css("font-sans text-[15px] font-black uppercase tracking-tight text-white")}>
                热门市场 / 实时榜
              </h3>
              <span className={css("text-[9.5px] font-black uppercase tracking-[0.18em] text-cyan-300/70")}>
                // API FEED
              </span>
            </div>

            <ul className={css("relative mt-3 overflow-hidden rounded-[8px] border border-cyan-400/15 bg-black/45 divide-y divide-cyan-400/10")}>
              <li className={css("grid grid-cols-[28px_1fr_58px_58px] items-center gap-2 border-b border-emerald-400/20 bg-emerald-400/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300/70")}>
                <span>#</span>
                <span>MARKET</span>
                <span className={css("text-right")}>HEAT</span>
                <span className={css("text-right")}>POOL</span>
              </li>
              {marketTopRows.map((row) => {
                const rankTone =
                  row.rank === 1
                    ? 'text-emerald-300 [text-shadow:0_0_10px_rgba(52,255,139,0.6)]'
                    : row.rank === 2
                      ? 'text-cyan-300'
                      : row.rank === 3
                        ? 'text-amber-300'
                        : 'text-zinc-500';
                const rowBg =
                  row.rank === 1
                    ? 'bg-emerald-400/[0.07] hover:bg-emerald-400/[0.12]'
                    : row.rank === 2
                      ? 'bg-cyan-400/[0.05] hover:bg-cyan-400/[0.10]'
                      : row.rank === 3
                        ? 'bg-amber-400/[0.05] hover:bg-amber-400/[0.10]'
                        : 'hover:bg-white/[0.04]';
                return (
                  <li
                    key={row.rank}
                    className={css(`grid grid-cols-[28px_1fr_58px_58px] items-center gap-2 px-3 py-2 transition-colors ${rowBg}`)}
                  >
                    <span className={css(`font-sans text-[14px] font-black tabular-nums ${rankTone}`)}>
                      {row.rank.toString().padStart(2, '0')}
                    </span>
                    <span className={css("min-w-0")}>
                      <span className={css("block truncate font-sans text-[12px] font-black text-white")}>
                        {row.title}
                      </span>
                      <span className={css("mt-0.5 block truncate text-[9px] font-black uppercase tracking-wider text-cyan-300/55")}>
                        {row.tag} · {row.sideLabel}
                      </span>
                      {row.rank === 1 && (
                        <span className={css("rounded-sm border border-emerald-400/40 bg-emerald-400/15 px-1 py-px text-[8.5px] font-black tracking-wider text-emerald-300")}>
                          TOP
                        </span>
                      )}
                    </span>
                    <span className={css("text-right font-sans text-[12px] font-black tabular-nums text-white")}>
                      {row.heat}
                    </span>
                    <span className={css("text-right font-sans text-[12px] font-black tabular-nums text-emerald-300")}>
                      {row.pool}
                    </span>
                  </li>
                );
              })}
              {!footballMarketsQuery.isLoading && marketTopRows.length === 0 ? (
                <li className={css("px-3 py-8 text-center font-sans text-[12px] text-zinc-500")}>
                  暂无市场数据
                </li>
              ) : null}
            </ul>

            <div className={css("relative mt-2 flex items-center justify-between text-[9.5px] font-black uppercase tracking-[0.18em] text-cyan-300/65")}>
              <span className={css("inline-flex items-center gap-1")}>
                <Goal size={10} />
                数据来自世界杯市场接口
              </span>
              <button
                type="button"
                onClick={handleLoadMoreMarkets}
                disabled={!hasMoreFootballMarkets || footballMarketsQuery.isLoading}
                className={css("inline-flex items-center gap-0.5 text-emerald-300/85 transition-colors hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40")}
              >
                {footballMarketsQuery.isLoading ? '加载中' : hasMoreFootballMarkets ? '加载更多' : '已加载'}
                <ChevronRight size={11} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主 + 侧栏 */}
      <div className={css("grid gap-4 xl:grid-cols-[1fr_360px]")}>
        {/* 主栏 */}
        <div className={css("grid gap-5")}>
          {/* 预测板 */}
          <section>
            <header className={css("flex items-center justify-between px-1")}>
              <div>
                <div className={css("inline-flex items-center gap-2 text-[10.5px] font-black uppercase tracking-[0.22em] text-emerald-400")}>
                  <Sparkles size={12} />
                  // PREDICTION DECK
                </div>
                <h2 className={css("mt-1 font-sans text-[24px] font-black uppercase tracking-tight text-white")}>
                  热门预测盘
                </h2>
                <p className={css("mt-1 text-[11.5px] uppercase tracking-wider text-zinc-500")}>
                  REAL-TIME STAKE DISTRIBUTION · CLICK TO ENTER
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadMoreMarkets}
                disabled={!hasMoreFootballMarkets || footballMarketsQuery.isLoading}
                className={css("hidden items-center gap-1 rounded-sm border border-emerald-400/30 bg-emerald-400/[0.05] px-4 py-2 text-[11px] font-black uppercase tracking-wider text-emerald-300 transition-colors hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-40 md:inline-flex")}
              >
                {footballMarketsQuery.isLoading ? 'LOADING' : canViewMoreFixtures ? 'VIEW MORE' : 'ALL LOADED'}
                <ChevronRight size={13} />
              </button>
            </header>

            <div className={css("mt-3 grid gap-3")}>
              {featuredMarkets.map((market) => (
                <article
                  key={market.title}
                  className={css("relative overflow-hidden rounded-[14px] border border-emerald-400/22 bg-[linear-gradient(150deg,rgba(6,21,27,0.92),rgba(4,11,15,0.96)_60%)] p-5 shadow-[0_0_24px_rgba(52,255,139,0.08),0_18px_42px_rgba(0,0,0,0.35)]")}
                >
                  <WorldCupCardPitchTexture />
                  <CornerBrackets />
                  <div
                    className={css("absolute inset-0 opacity-[0.06] pointer-events-none")}
                    style={{
                      backgroundImage:
                        'linear-gradient(rgba(52,255,139,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(52,255,139,0.4) 1px, transparent 1px)',
                      backgroundSize: '28px 28px',
                    }}
                  />
                  <div className={css("absolute right-4 top-4 text-emerald-400/[0.06]")}>
                    <Crosshair size={56} />
                  </div>
                  <div className={css("relative flex flex-wrap items-center justify-between gap-3")}>
                    <div className={css("min-w-0")}>
                      <div className={css("inline-flex items-center gap-1.5 rounded-sm border border-cyan-400/35 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300")}>
                        <Trophy size={11} />
                        {market.tag}
                      </div>
                      <h3 className={css("mt-2.5 font-sans text-[19px] font-black leading-tight text-white md:text-[21px]")}>
                        {market.title}
                      </h3>
                    </div>
                    <div className={css("flex items-center gap-2")}>
                      <span className={css("inline-flex items-center gap-1 rounded-sm border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-[10.5px] font-black uppercase tracking-wider text-rose-300")}>
                        <Flame size={11} />
                        {market.heat}
                      </span>
                      <span className={css("inline-flex items-center gap-1 rounded-sm border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10.5px] font-black uppercase tracking-wider text-emerald-300")}>
                        <Coins size={11} />
                        {market.pool}
                      </span>
                    </div>
                  </div>

                  <div className={css("relative mt-5 grid gap-3 md:grid-cols-2")}>
                    <button
                      type="button"
                      onClick={() => openPredictionBet(market.predictionItem, 'A')}
                      disabled={!market.predictionItem || market.predictionItem.status !== 'open' || market.predictionItem.hasBet || Boolean(market.predictionItem && localBetSides[market.predictionItem.id])}
                      className={css("group relative overflow-hidden rounded-[10px] border border-emerald-400/35 bg-emerald-400/8 p-4 text-left transition-all hover:border-emerald-400/70 hover:bg-emerald-400/16 hover:shadow-[0_0_18px_rgba(52,255,139,0.3)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:shadow-none")}
                    >
                      <div className={css("flex items-center justify-between gap-3")}>
                        <div>
                          <div className={css("text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300/65")}>
                            {market.sideA.accent}
                          </div>
                          <div className={css("mt-0.5 font-sans text-[16px] font-black text-white")}>
                            {market.sideA.label}
                          </div>
                        </div>
                        <span className={css("font-sans text-[28px] font-black tracking-tight text-emerald-300 [text-shadow:0_0_14px_rgba(52,255,139,0.5)]")}>
                          {market.sideA.pct}%
                        </span>
                      </div>
                      <div className={css("mt-3 h-1.5 overflow-hidden rounded-sm bg-black/55")}>
                        <div
                          className={css("h-full rounded-sm bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_10px_rgba(52,255,139,0.6)]")}
                          style={{ width: `${market.sideA.pct}%` }}
                        />
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => openPredictionBet(market.predictionItem, 'B')}
                      disabled={!market.predictionItem || market.predictionItem.status !== 'open' || market.predictionItem.hasBet || Boolean(market.predictionItem && localBetSides[market.predictionItem.id])}
                      className={css("group relative overflow-hidden rounded-[10px] border border-rose-400/35 bg-rose-400/8 p-4 text-left transition-all hover:border-rose-400/70 hover:bg-rose-400/16 hover:shadow-[0_0_18px_rgba(255,46,99,0.3)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:shadow-none")}
                    >
                      <div className={css("flex items-center justify-between gap-3")}>
                        <div>
                          <div className={css("text-[10px] font-black uppercase tracking-[0.16em] text-rose-300/65")}>
                            {market.sideB.accent}
                          </div>
                          <div className={css("mt-0.5 font-sans text-[16px] font-black text-white")}>
                            {market.sideB.label}
                          </div>
                        </div>
                        <span className={css("font-sans text-[28px] font-black tracking-tight text-rose-300 [text-shadow:0_0_14px_rgba(255,46,99,0.5)]")}>
                          {market.sideB.pct}%
                        </span>
                      </div>
                      <div className={css("mt-3 h-1.5 overflow-hidden rounded-sm bg-black/55")}>
                        <div
                          className={css("h-full rounded-sm bg-gradient-to-r from-rose-400 to-amber-300 shadow-[0_0_10px_rgba(255,46,99,0.6)]")}
                          style={{ width: `${market.sideB.pct}%` }}
                        />
                      </div>
                    </button>
                  </div>
                  {market.predictionItem?.marketId ? (
                    <button
                      type="button"
                      onClick={() => goToTearZone(market.predictionItem)}
                      className={css("relative mt-3 flex w-full items-center justify-center gap-2 rounded-sm border border-cyan-400/30 bg-cyan-400/[0.08] py-2.5 text-[11px] font-black uppercase tracking-wider text-cyan-200 transition-colors hover:bg-cyan-400/16")}
                    >
                      <MessageCircleMore size={14} />
                      进入撕裂带
                    </button>
                  ) : null}
                </article>
              ))}
              {!footballMarketsQuery.isLoading && featuredMarkets.length === 0 ? (
                <div className={css("relative overflow-hidden rounded-[14px] border border-emerald-400/18 bg-black/45 px-5 py-8 text-center")}>
                  <WorldCupCardPitchTexture />
                  <div className={css("relative text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300/70")}>
                    NO MARKETS
                  </div>
                  <p className={css("relative mt-2 font-sans text-[12px] leading-5 text-zinc-500")}>
                    暂无世界杯预测盘数据。
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          {/* 今日赛程暗盘 */}
          <section>
            <header className={css("flex items-center justify-between px-1")}>
              <div>
                <div className={css("inline-flex items-center gap-2 text-[10.5px] font-black uppercase tracking-[0.22em] text-cyan-400")}>
                  <CalendarClock size={12} />
                  // FIXTURE SCHEDULE · TODAY
                </div>
                <h2 className={css("mt-1 font-sans text-[24px] font-black uppercase tracking-tight text-white")}>
                  今日赛程 / 暗盘
                </h2>
                <p className={css("mt-1 text-[11.5px] uppercase tracking-wider text-zinc-500")}>
                  TAP A ROW TO OPEN STAKE TERMINAL
                </p>
              </div>
              <span className={css("hidden items-center gap-1 rounded-sm border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-[10.5px] font-black uppercase tracking-wider text-cyan-300 md:inline-flex")}>
                <Radio size={11} />
                {visibleTodayFixtures.length}/{todayFixtures.length} TABLES
              </span>
            </header>

            <div className={css(`relative mt-3 flex flex-col overflow-hidden rounded-[14px] border border-cyan-400/22 bg-[linear-gradient(160deg,rgba(6,21,27,0.96),rgba(4,11,15,0.98))] shadow-[0_0_24px_rgba(34,211,238,0.08),0_18px_42px_rgba(0,0,0,0.32)] ${FIXTURE_LIST_MAX_HEIGHT_CLASS}`)}>
              <WorldCupCardPitchTexture />
              <div className={css("grid shrink-0 grid-cols-[110px_1fr_auto] items-center gap-3 border-b border-cyan-400/15 bg-black/40 px-4 py-2.5 text-[9.5px] font-black uppercase tracking-[0.22em] text-cyan-300/65")}>
                <span>TIME / STAGE</span>
                <span>MATCH · SIGNAL</span>
                <span className={css("pr-1")}>ODDS · STAKE</span>
              </div>
              <ul className={css("min-h-0 flex-1 divide-y divide-cyan-400/10 overflow-y-auto overflow-x-hidden overscroll-contain")}>
                {visibleTodayFixtures.map((fixture) => (
                  <li key={fixture.id}>
                    <div className={css("grid w-full grid-cols-[110px_1fr_auto] items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-emerald-400/[0.06]")}>
                      <div className={css("min-w-0")}>
                        <div className={css("font-sans text-[13px] font-black text-emerald-300")}>
                          {fixture.time}
                        </div>
                        <div className={css("mt-0.5 truncate text-[10px] font-black uppercase tracking-wider text-zinc-500")}>
                          {fixture.stage}
                        </div>
                      </div>
                      <div className={css("min-w-0")}>
                        <div className={css("flex items-center gap-2 font-sans text-[15px] font-black text-white")}>
                          <span className={css("text-[20px] leading-none")}>{fixture.homeFlag}</span>
                          <span className={css("truncate")}>{fixture.home}</span>
                          <span className={css("px-1 text-cyan-400/50")}>vs</span>
                          <span className={css("text-[20px] leading-none")}>{fixture.awayFlag}</span>
                          <span className={css("truncate")}>{fixture.away}</span>
                        </div>
                        <div className={css("mt-1.5 flex items-center gap-2")}>
                          <span
                            className={css(`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${signalToneMap[fixture.signalTone]}`)}
                          >
                            <Zap size={10} />
                            {fixture.signal}
                          </span>
                          <span className={css("hidden items-center gap-1 text-[10px] font-black uppercase tracking-wider text-zinc-500 sm:inline-flex")}>
                            <Coins size={10} />
                            POOL {fixture.pool}
                          </span>
                          <span className={css("hidden items-center gap-1 text-[10px] font-black uppercase tracking-wider text-zinc-500 md:inline-flex")}>
                            <Activity size={10} />
                            HEAT {fixture.heat}
                          </span>
                        </div>
                      </div>
                      <div className={css("flex items-center gap-2")}>
                        <div className={css("hidden flex-col items-end text-right font-sans text-[10.5px] tabular-nums text-zinc-400 sm:flex")}>
                          <span>主 <span className={css("text-emerald-300")}>{fixture.odds.home}</span></span>
                          <span>客 <span className={css("text-rose-300")}>{fixture.odds.away}</span></span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openPredictionBet(fixture.predictionItem, 'A')}
                          disabled={!fixture.predictionItem || fixture.predictionItem.status !== 'open' || fixture.predictionItem.hasBet || Boolean(fixture.predictionItem && localBetSides[fixture.predictionItem.id])}
                          className={css("inline-flex items-center gap-1 rounded-sm border border-emerald-400/45 bg-emerald-400/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-300 transition-all hover:bg-emerald-400/25 hover:shadow-[0_0_14px_rgba(52,255,139,0.4)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:shadow-none")}
                        >
                          <Swords size={11} />
                          主队
                        </button>
                        <button
                          type="button"
                          onClick={() => openPredictionBet(fixture.predictionItem, 'B')}
                          disabled={!fixture.predictionItem || fixture.predictionItem.status !== 'open' || fixture.predictionItem.hasBet || Boolean(fixture.predictionItem && localBetSides[fixture.predictionItem.id])}
                          className={css("inline-flex items-center gap-1 rounded-sm border border-rose-400/45 bg-rose-400/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-rose-300 transition-all hover:bg-rose-400/25 hover:shadow-[0_0_14px_rgba(255,46,99,0.34)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:shadow-none")}
                        >
                          <Swords size={11} />
                          客队
                        </button>
                        {fixture.predictionItem?.marketId ? (
                          <button
                            type="button"
                            onClick={() => goToTearZone(fixture.predictionItem)}
                            title="进入对应预测的撕裂带"
                            className={css("inline-flex items-center gap-0.5 rounded-sm border border-cyan-400/35 bg-cyan-400/10 px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-200 transition-colors hover:bg-cyan-400/18")}
                          >
                            <MessageCircleMore size={12} />
                            撕裂带
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
                {!footballMarketsQuery.isLoading && visibleTodayFixtures.length === 0 ? (
                  <li className={css("px-4 py-8 text-center font-sans text-[12px] leading-5 text-zinc-500")}>
                    暂无世界杯赛程暗盘数据。
                  </li>
                ) : null}
              </ul>
              <div className={css("shrink-0 border-t border-cyan-400/15 bg-[rgba(4,11,15,0.85)] px-4 py-3 backdrop-blur-sm")}>
                <button
                  type="button"
                  onClick={handleLoadMoreMarkets}
                  disabled={!canViewMoreFixtures || footballMarketsQuery.isLoading}
                  className={css("flex w-full items-center justify-center gap-2 rounded-sm border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300 transition-all hover:bg-cyan-400/16 hover:shadow-[0_0_12px_rgba(34,211,238,0.22)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:shadow-none")}
                >
                  {footballMarketsQuery.isLoading
                    ? 'LOADING · 加载中'
                    : canRevealLoadedFixtures
                      ? `VIEW MORE · 再看 ${Math.min(FIXTURE_VISIBLE_CHUNK, todayFixtures.length - visibleFixtureCount)} 条`
                      : hasMoreFootballMarkets
                        ? 'LOAD NEXT PAGE · 加载下一页'
                        : 'ALL LOADED · 已全部展示'}
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* 侧栏 */}
        <aside className={css("grid content-start gap-4")}>
          {/* 最新消息 */}
          <section className={css("relative overflow-hidden rounded-[14px] border border-cyan-400/25 bg-[linear-gradient(165deg,rgba(4,18,24,0.92),rgba(4,11,15,0.98)_62%)] shadow-[0_0_24px_rgba(34,211,238,0.10),0_18px_42px_rgba(0,0,0,0.4)]")}>
            <CornerBrackets />
            <header className={css("relative flex items-center justify-between border-b border-cyan-400/20 px-5 py-4")}>
              <div className={css("flex items-center gap-2")}>
                <Newspaper size={18} className={css("text-cyan-300")} />
                <div>
                  <div className={css("text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300/80")}>
                    // NEWS WIRE
                  </div>
                  <h2 className={css("font-sans text-[17px] font-black uppercase tracking-tight text-white")}>
                    最新消息
                  </h2>
                </div>
              </div>
              <span className={css("inline-flex items-center gap-1 rounded-sm border border-rose-400/35 bg-rose-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-300")}>
                <span className={css("relative flex h-1.5 w-1.5")}>
                  <span className={css("absolute inset-0 animate-ping rounded-full bg-rose-400/70")} />
                  <span className={css("relative h-1.5 w-1.5 rounded-full bg-rose-400")} />
                </span>
                LIVE
              </span>
            </header>
            {newsListQuery.isLoading && newsArticles.length === 0 ? (
              <div className={css("border-b border-cyan-400/12 px-5 py-3 text-[11px] font-black uppercase tracking-wider text-cyan-300/75")}>
                LOADING HUPU NEWS · 正在拉取虎扑足球资讯
              </div>
            ) : null}
            {newsListQuery.isError && newsArticles.length === 0 ? (
              <div className={css("border-b border-amber-400/15 px-5 py-3 text-[11px] font-black uppercase tracking-wider text-amber-300/80")}>
                NEWS API OFFLINE · 资讯接口暂时不可用
              </div>
            ) : null}
            {!newsListQuery.isLoading && !newsListQuery.isError && worldCupNewsItems.length === 0 ? (
              <div className={css("px-5 py-8 text-center")}>
                <div className={css("text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300/70")}>
                  NO NEWS
                </div>
                <p className={css("mt-2 font-sans text-[12px] leading-5 text-zinc-500")}>
                  暂无世界杯资讯，稍后再刷新。
                </p>
              </div>
            ) : null}
            <ul className={css("divide-y divide-cyan-400/12")}>
              {worldCupNewsItems.map((news) => {
                return (
                  <li key={news.id} className={css("px-5 py-4")}>
                    <div className={css("flex items-start gap-3")}>
                      <div className={css("grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-cyan-400/30 bg-black/55 text-[18px] shadow-[inset_0_0_10px_rgba(34,211,238,0.18)]")}>
                        {news.sourceAvatar}
                      </div>
                      <div className={css("min-w-0 flex-1")}>
                        <div className={css("flex flex-wrap items-center gap-1.5")}>
                          <span className={css("truncate font-sans text-[13px] font-black text-white")}>
                            {news.source}
                          </span>
                          <span
                            className={css(`rounded-sm border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${newsCategoryStyle[news.category]}`)}
                          >
                            {news.categoryLabel}
                          </span>
                        </div>
                        <div className={css("mt-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-500")}>
                          <Hash className={css("mr-0.5 inline")} size={9} />
                          {news.time}
                        </div>
                        {news.sourceUrl ? (
                          <a
                            href={news.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={css("mt-2 flex items-start gap-1.5 font-sans text-[14px] font-black leading-snug text-white transition-colors hover:text-cyan-200")}
                          >
                            <span className={css("min-w-0 flex-1")}>{news.headline}</span>
                            <ExternalLink size={12} className={css("mt-0.5 shrink-0 text-cyan-300/75")} />
                          </a>
                        ) : (
                          <h3 className={css("mt-2 font-sans text-[14px] font-black leading-snug text-white")}>
                            {news.headline}
                          </h3>
                        )}
                        <p className={css("mt-1.5 font-sans text-[12px] leading-5 text-zinc-300")}>
                          {news.body}
                        </p>
                        <div className={css("mt-2.5 flex items-center gap-3 text-[10px] font-black uppercase tracking-wider text-zinc-500")}>
                          <span className={css("inline-flex items-center gap-1")}>
                            <ThumbsUp size={11} />
                            {news.likes}
                          </span>
                          {news.sourceUrl ? (
                            <a
                              href={news.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={css("ml-auto inline-flex items-center gap-1 text-cyan-300/85 transition-colors hover:text-cyan-300")}
                            >
                              原文
                              <ChevronRight size={11} />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={handleLoadMoreNews}
              disabled={!hasMoreNews || newsListQuery.isLoading}
              className={css("w-full border-t border-cyan-400/15 px-5 py-3 text-center text-[11px] font-black uppercase tracking-wider text-cyan-300/85 transition-colors hover:bg-cyan-400/[0.06] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent")}
            >
              {newsListQuery.isLoading
                ? 'LOADING · 加载中'
                : hasMoreNews
                  ? 'VIEW MORE · 查看更多消息 →'
                  : newsArticles.length > 0
                    ? 'ALL LOADED · 已全部展示'
                    : 'NO MORE · 暂无更多消息'}
            </button>
          </section>
        </aside>
      </div>

      <PredictionBetModal
        open={Boolean(betModal)}
        item={betModal?.item ?? null}
        option={betModal?.option ?? null}
        onClose={() => setBetModal(null)}
        onSuccess={handleBetSuccess}
        onRequireAuth={onOpenAuth}
      />
    </section>
  );
}
