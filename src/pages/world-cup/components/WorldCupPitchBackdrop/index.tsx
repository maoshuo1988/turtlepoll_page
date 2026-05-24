/** 文件说明：世界杯页足球场草坪纹、俯视线稿、看台掠过光帘等叠加层（纯装饰，无交互）。 */
import styles from './index.module.scss';

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

export function WorldCupPitchBackdropLayers() {
  return (
    <>
      {/* 草坪竖条纹：提高对比 + 轻微纵向第二条纹（更像真草皮） */}
      <div
        aria-hidden
        className={css("wcfx-turf-stripes pointer-events-none absolute inset-0 opacity-[0.24] mix-blend-soft-light")}
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(52,211,153,0.72) 0px, rgba(52,211,153,0.72) 30px, rgba(4,55,41,0.58) 30px, rgba(4,55,41,0.58) 58px, rgba(34,197,169,0.45) 58px, rgba(34,197,169,0.45) 78px, rgba(3,32,26,0.62) 78px, rgba(3,32,26,0.62) 108px)',
          backgroundSize: '108px 100%',
          animation: `${kf('wcfx-turf-drift')} 44s linear infinite`,
        }}
      />
      <div
        aria-hidden
        className={css("wcfx-turf-stripes pointer-events-none absolute inset-0 opacity-[0.1] mix-blend-screen")}
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(52,255,139,0.14) 3px, rgba(52,255,139,0.14) 4px)',
          animation: `${kf('wcfx-turf-drift')} 80s linear reverse infinite`,
        }}
      />

      {/* 看台灯光漫反射 */}
      <div
        aria-hidden
        className={css("pointer-events-none absolute -left-[18%] -top-[30%] h-[125%] w-[72%] rounded-full bg-emerald-400/[0.18] blur-3xl")}
        style={{ animation: `${kf('wcfx-flood-soft')} 8s ease-in-out infinite` }}
      />
      <div
        aria-hidden
        className={css("pointer-events-none absolute -right-[20%] -top-[32%] h-[132%] w-[68%] rounded-full bg-cyan-400/[0.16] blur-3xl")}
        style={{ animation: `${kf('wcfx-flood-soft')} 11s ease-in-out infinite 1.4s` }}
      />

      {/* 掠过光帘（双相位，更明显） */}
      <div
        aria-hidden
        className={css("wcfx-flood-sheet pointer-events-none absolute inset-y-[-12%] -left-[42%] w-[48%] bg-gradient-to-r from-transparent via-white/[0.14] to-transparent mix-blend-screen")}
        style={{ animation: `${kf('wcfx-flood-sweep')} 17s ease-in-out infinite` }}
      />
      <div
        aria-hidden
        className={css("wcfx-flood-sheet pointer-events-none absolute inset-y-[-8%] -left-[45%] w-[38%] bg-gradient-to-r from-transparent via-emerald-200/[0.09] to-transparent mix-blend-plus-lighter")}
        style={{ animation: `${kf('wcfx-flood-sweep')} 24s ease-in-out infinite`, animationDelay: '7s' }}
      />

      {/* 中线开球圆：外环呼吸（CSS 叠加） */}
      <div
        aria-hidden
        className={css("wcfx-field-pulse pointer-events-none absolute inset-0 opacity-[0.22]")}
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(52,255,139,0) calc(42% - 1px), rgba(167,243,208,0.35) 42%, rgba(167,243,208,0) 44%)',
          animation: `${kf('wcfx-center-pulse')} 14s ease-in-out infinite`,
        }}
      />

      {/* 仰视「草屑微粒」上移 */}
      {[
        { left: '12%', dur: '19s', delay: '0s', w: 3 },
        { left: '28%', dur: '23s', delay: '4s', w: 5 },
        { left: '48%', dur: '21s', delay: '1s', w: 2 },
        { left: '64%', dur: '26s', delay: '6s', w: 4 },
        { left: '78%', dur: '18s', delay: '2s', w: 3 },
        { left: '89%', dur: '22s', delay: '9s', w: 2 },
      ].map((dot, idx) => (
        <span
          key={idx}
          aria-hidden
          className={css("wcfx-grass-bit pointer-events-none absolute bottom-[14%]")}
          style={{
            left: dot.left,
            width: dot.w,
            height: dot.w + 6,
            background: 'linear-gradient(to top, rgba(52,211,153,0.42), transparent)',
            filter: 'blur(1px)',
            borderRadius: 999,
            animation: `${kf('wcfx-grass-rise')} ${dot.dur} ease-in-out infinite`,
            animationDelay: dot.delay,
            opacity: 0.95,
          }}
        />
      ))}

      {/* 俯视足球场线稿 */}
      <svg
        aria-hidden
        viewBox="0 0 200 120"
        preserveAspectRatio="none"
        className={css("pointer-events-none absolute inset-0 h-full w-full opacity-[0.26]")}
      >
        <defs>
          <linearGradient id="wcfx-pitchGlow" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="rgba(209,250,229,0.85)" />
            <stop offset="50%" stopColor="rgba(45,212,191,0.75)" />
            <stop offset="100%" stopColor="rgba(209,250,229,0.85)" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#wcfx-pitchGlow)" strokeWidth={0.9} vectorEffect="non-scaling-stroke">
          <animate attributeName="opacity" values="0.82;1;0.82" dur="14s" repeatCount="indefinite" />
          <rect x={8} y={6} width={184} height={108} rx={0.9} ry={0.9} opacity={0.95} />
          <line x1={100} x2={100} y1={6} y2={114} opacity={0.9} strokeDasharray="3 4" strokeWidth={0.7} />
          <circle cx={100} cy={60} r={18} opacity={0.92} strokeDasharray="2 4" strokeWidth={0.8} />
          <circle cx={100} cy={60} r={1.9} fill="rgba(236,253,245,0.35)" stroke="none" />
          {/* 禁区 */}
          <rect x={8} y={36} width={28} height={48} rx={0.5} ry={0.5} opacity={0.82} strokeWidth={0.75} />
          <rect x={164} y={36} width={28} height={48} rx={0.5} ry={0.5} opacity={0.82} strokeWidth={0.75} />
          {/* 角球弧 */}
          <path d="M 8 6 A 5 5 0 0 1 13 6" opacity={0.7} strokeWidth={0.7} />
          <path d="M 187 6 A 5 5 0 0 1 192 6" opacity={0.7} strokeWidth={0.7} />
          <path d="M 8 114 A 5 5 0 0 1 13 114" opacity={0.7} strokeWidth={0.7} />
          <path d="M 187 114 A 5 5 0 0 1 192 114" opacity={0.7} strokeWidth={0.7} />
        </g>
      </svg>

      {/* 蜂巢纹理（更明显一点） */}
      <div
        aria-hidden
        className={css("pointer-events-none absolute inset-0 opacity-[0.088]")}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cpath fill='rgba(52,211,153,1)' d='M14 0l12.1 7v14L14 28 1.9 21V7z' opacity='0.85'/%3E%3Cpath fill='rgba(45,212,191,1)' d='M1.9 22l12.2 7L14 43l-12.2-7z' opacity='0.55'/%3E%3C/svg%3E")`,
          backgroundSize: '28px 49px',
        }}
      />

      {/* 悬浮足球（更明显 + 大一点） */}
      <div className={css("pointer-events-none absolute -bottom-1 right-0 h-[5.75rem] w-[5.75rem] opacity-[0.26] blur-[1px] sm:bottom-1 sm:right-2 sm:h-36 sm:w-36")}>
        <div
          className={css("wcfx-ball-orbit absolute inset-[7px] rounded-full sm:inset-3")}
          style={{
            background:
              'radial-gradient(circle at 30% 26%, rgba(255,255,255,0.48), transparent 42%), radial-gradient(circle at 70% 65%, rgba(16,185,129,0.95), transparent 46%), repeating-conic-gradient(from 34deg at 50% 50%, rgba(4,52,41,1) 0deg 52deg, rgba(237,251,246,1) 52deg 60deg)',
            animation: `${kf('wcfx-ball-float')} 16s ease-in-out infinite`,
            boxShadow:
              'inset -3px -4px 8px rgba(0,0,0,0.45), inset 2px 2px 4px rgba(255,255,255,0.12), 0 0 32px rgba(52,211,153,0.35), 0 0 64px rgba(16,185,129,0.12)',
          }}
        />
      </div>
    </>
  );
}

/** 赛程 / 大卡片区用的轻量足球纹（无底图足球，仅占位更少 DOM）。 */
export function WorldCupCardPitchTexture() {
  return (
    <div aria-hidden className={css("pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]")}>
      <div
        className={css("absolute inset-0 opacity-[0.14]")}
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.06) 1px, transparent 1px)',
          backgroundSize: '46px 28px',
        }}
      />
      <div
        className={css("absolute -right-[12%] -top-[20%] h-[65%] w-[55%] rounded-full opacity-[0.11]")}
        style={{
          background:
            'conic-gradient(from 120deg at 48% 45%, transparent 42deg, rgba(52,211,153,0.35) 42deg 70deg, transparent 70deg 130deg, rgba(45,212,191,0.25) 130deg 200deg)',
        }}
      />
    </div>
  );
}
