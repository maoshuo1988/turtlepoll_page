/**
 * 文件说明：龟战 Arena - 本地模式入口共享 Section。
 * 用于把游戏本体里 Phaser 画布上的"图鉴 / 新手教程 / 成就 / 战绩"四个方块按钮，
 * 通过 iframe 暴露到龟战侧栏。
 *
 * 触发方式：游戏 bundle 已注入 `window.gameApi`（见 index-azp1lI1F.js 里
 * customGroup 行前的 patch），iframe 加载完轮询到 `gameApi[apiMethod]` 后直接调用，
 * 主菜单一秒切到对应界面。
 */
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Info, Loader2 } from 'lucide-react';

const TURTLE_BATTLE_GAME_URL = '/games/turtle-arena-game/index.html';

interface GameApi {
  openCodex?: () => void;
  openAchievements?: () => void;
  openRecord?: () => void;
  startTutorial?: () => void;
}

type ApiMethod = keyof GameApi;

interface GameFeatureSectionProps {
  /** 章节标题（侧栏标签同名） */
  title: string;
  /** 用户实际要在游戏主菜单里点的方块标签（自动失败时给用户看） */
  buttonLabel: string;
  /** 该方块在游戏主菜单"功能列"里的位置（从上到下，1 开始） */
  tileIndex: number;
  /** 顶部提示条说明（一句话） */
  description: string;
  /** 提示条主色 */
  tone: 'emerald' | 'sky' | 'amber' | 'violet';
  icon: React.ReactNode;
  /** window.gameApi 上对应的方法名 */
  apiMethod: ApiMethod;
}

const TONE_CLASSES: Record<GameFeatureSectionProps['tone'], { border: string; bg: string; text: string; chip: string }> = {
  emerald: {
    border: 'border-emerald-400/30',
    bg: 'from-emerald-500/14 via-emerald-500/8 to-transparent',
    text: 'text-emerald-100',
    chip: 'border-emerald-300/40 bg-emerald-500/22 text-emerald-100',
  },
  sky: {
    border: 'border-sky-400/30',
    bg: 'from-sky-500/14 via-sky-500/8 to-transparent',
    text: 'text-sky-100',
    chip: 'border-sky-300/40 bg-sky-500/22 text-sky-100',
  },
  amber: {
    border: 'border-amber-400/30',
    bg: 'from-amber-500/14 via-amber-500/8 to-transparent',
    text: 'text-amber-100',
    chip: 'border-amber-300/40 bg-amber-500/22 text-amber-100',
  },
  violet: {
    border: 'border-violet-400/30',
    bg: 'from-violet-500/14 via-violet-500/8 to-transparent',
    text: 'text-violet-100',
    chip: 'border-violet-300/40 bg-violet-500/22 text-violet-100',
  },
};

type AutoStage = 'loading' | 'ready' | 'timeout';

/** 轮询等待 gameApi 出现并触发指定方法 */
function autoInvokeGameApi(
  iframe: HTMLIFrameElement | null,
  method: ApiMethod,
  onStage: (s: AutoStage) => void,
) {
  if (!iframe) return () => {};
  let cancelled = false;
  let attempts = 0;
  const MAX_ATTEMPTS = 200; // ~50s（游戏加载 168MB + Phaser boot 可能慢）

  const tick = () => {
    if (cancelled) return;
    attempts += 1;
    try {
      const win = iframe.contentWindow as Window & { gameApi?: GameApi };
      const fn = win?.gameApi?.[method];
      if (typeof fn === 'function') {
        fn();
        onStage('ready');
        return;
      }
    } catch (err) {
      console.warn('[arena] gameApi invoke failed:', err);
    }
    if (attempts < MAX_ATTEMPTS) {
      window.setTimeout(tick, 250);
    } else {
      onStage('timeout');
      console.warn('[arena] gameApi never appeared for', method);
    }
  };

  const onLoad = () => window.setTimeout(tick, 250);
  iframe.addEventListener('load', onLoad);
  window.setTimeout(tick, 250);

  return () => {
    cancelled = true;
    iframe.removeEventListener('load', onLoad);
  };
}

export function GameFeatureSection({
  title,
  buttonLabel,
  tileIndex,
  description,
  tone,
  icon,
  apiMethod,
}: GameFeatureSectionProps) {
  const t = TONE_CLASSES[tone];
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [stage, setStage] = useState<AutoStage>('loading');

  useEffect(() => {
    setStage('loading');
    const cleanup = autoInvokeGameApi(iframeRef.current, apiMethod, setStage);
    return cleanup;
  }, [apiMethod]);

  const showOverlay = stage !== 'ready';

  return (
    <div className="flex flex-col gap-3">
      {/* 顶部提示条（始终显示，让用户知道当前在哪个模块） */}
      <div className={`rounded-2xl border ${t.border} bg-gradient-to-r ${t.bg} px-4 py-2.5`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`grid h-7 w-7 place-items-center rounded-full border ${t.chip}`}>{icon}</span>
          <span className={`text-[13px] font-bold ${t.text}`}>{title}</span>
          {stage === 'ready' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
              <CheckCircle2 size={10} /> 已自动进入
            </span>
          ) : stage === 'loading' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-200">
              <Loader2 size={10} className="animate-spin" /> 正在进入…
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-200">
              <Info size={10} /> 自动进入超时
            </span>
          )}
        </div>
        <p className="mt-1 pl-9 text-[11px] leading-relaxed text-white/55">
          {description}
          {stage === 'timeout' ? (
            <span className="ml-1 text-amber-200/85">
              · 请在游戏主菜单点击右侧第 <span className="font-mono font-bold">{tileIndex}</span> 个方块「{buttonLabel}」。
            </span>
          ) : null}
        </p>
      </div>

      {/* 游戏本体 iframe + 自动跳转加载 overlay */}
      <div
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#02040a] shadow-[0_18px_44px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.04)]"
        style={{ height: 'min(calc(100vh - 220px), 900px)', minHeight: 520 }}
      >
        <iframe
          ref={iframeRef}
          title={`龟龟对战 · ${title}`}
          src={TURTLE_BATTLE_GAME_URL}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; fullscreen; gamepad *"
          allowFullScreen
        />

        {/* 自动跳转 overlay：进入 ready 状态前盖住 iframe */}
        {showOverlay ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,#062018_0%,#02040a_60%,#000_100%)]">
            <span aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[60%] -translate-x-1/2 rounded-full bg-emerald-400/22 blur-3xl" />
            <span aria-hidden className="pointer-events-none absolute -bottom-24 left-1/2 h-56 w-[55%] -translate-x-1/2 rounded-full bg-cyan-500/18 blur-3xl" />

            {/* 主图标 */}
            <div className="relative grid h-28 w-28 place-items-center">
              {stage === 'loading' ? (
                <>
                  <span aria-hidden className="absolute inset-0 rounded-full border-2 border-emerald-400/12" />
                  <span aria-hidden className="absolute inset-3 rounded-full border-2 border-emerald-400/14" />
                  <Loader2 size={48} className="relative animate-spin text-emerald-200 drop-shadow-[0_0_16px_rgba(16,185,129,0.7)]" />
                </>
              ) : (
                <span className="grid h-20 w-20 place-items-center rounded-full border-2 border-rose-400/50 bg-rose-500/15 text-rose-200">
                  <Info size={32} />
                </span>
              )}
            </div>

            <h3
              className="mt-6 text-[26px] font-black tracking-tight text-emerald-50 md:text-[30px]"
              style={{ textShadow: '0 0 12px rgba(56,240,209,0.55)' }}
            >
              {stage === 'loading' ? `正在加载${title}` : `进入${title}超时`}
            </h3>
            <p className="mt-2 text-[13px] text-emerald-200/70 md:text-[14px]">
              {stage === 'loading'
                ? `游戏本体加载完成后将自动打开「${buttonLabel}」`
                : `请在游戏主菜单点击右侧第 ${tileIndex} 个方块「${buttonLabel}」`}
            </p>

            {/* 重试按钮（超时时显示） */}
            {stage === 'timeout' ? (
              <button
                type="button"
                onClick={() => {
                  setStage('loading');
                  autoInvokeGameApi(iframeRef.current, apiMethod, setStage);
                }}
                className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-amber-300/55 bg-gradient-to-r from-amber-500/30 to-orange-500/30 px-5 py-2 text-[13px] font-bold text-amber-100 shadow-[0_8px_22px_rgba(251,191,36,0.32)] transition-transform hover:scale-[1.02]"
              >
                重试自动跳转
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="text-[11px] text-white/45">
        游戏本体通过 <code className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-emerald-200">window.gameApi.{apiMethod}()</code> 接入，
        进度走 localStorage 的 <code className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-emerald-200">petState</code>，存档不会丢。
      </p>
    </div>
  );
}
