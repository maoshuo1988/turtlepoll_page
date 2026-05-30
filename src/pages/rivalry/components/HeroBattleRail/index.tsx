/** 文件说明：开撕台 Hero 对抗条，火/冰双轨 + 两侧向中心汇聚粒子。 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import styles from './index.module.scss';

interface HeroBattleRailProps {
  pctA: number;
  pctB: number;
}

type ConvergeParticle = {
  id: number;
  side: 'A' | 'B';
  startLeftPct: number;
  startAnchorX: string;
  endAnchorX: string;
  y: number;
  size: number;
  delay: number;
  duration: number;
};

type CenterSpark = {
  id: number;
  y: number;
  size: number;
  jitterX: number;
  delay: number;
  duration: number;
};

/** 下边缘：外缘 40px 满高 → 过渡段平滑收窄 → 内段到中心高度不变。 */
const TAPER_BOTTOM_PCT = 70;
const EDGE_TRANSITION_PX = 40;
const SIDE_TRANSITION_END_RATIO = 0.5;

function getTaperY(): number {
  return TAPER_BOTTOM_PCT / 100;
}

function fmt(value: number): string {
  const fixed = value.toFixed(4);
  return fixed.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
}

function getOuterFlatLocal(sideWidthPx: number): number {
  if (sideWidthPx <= 0) return 0;
  return Math.min(SIDE_TRANSITION_END_RATIO, EDGE_TRANSITION_PX / sideWidthPx);
}

/** 过渡曲线：外缘满高区 → 该侧一半，冰侧直接使用，火侧镜像同逻辑。 */
function buildSideTransitionCurve(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): string {
  const span = endX - startX;
  const bend = Math.min(0.26, Math.abs(span) * 0.68);
  const sign = span >= 0 ? 1 : -1;
  const c1x = startX + sign * bend * 0.34;
  const c1y = startY - bend * 0.14;
  const c2x = endX - sign * bend;
  const c2y = endY;
  return `C ${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(endX)} ${fmt(endY)}`;
}

/** 火侧：与冰侧镜像——沿左缘下到底，再外缘满高 → 一半 → 中心。 */
function buildSideAClipPathD(sideWidthPx: number): string {
  const t = getTaperY();
  const transitionEnd = SIDE_TRANSITION_END_RATIO;
  const outerLocal = getOuterFlatLocal(sideWidthPx);
  if (outerLocal >= transitionEnd) {
    return `M 0 0 L 0 1 ${buildSideTransitionCurve(0, 1, 1, t)} L 1 ${fmt(t)} L 1 0 Z`;
  }
  return [
    'M 0 0',
    'L 0 1',
    `L ${fmt(outerLocal)} 1`,
    buildSideTransitionCurve(outerLocal, 1, transitionEnd, t),
    `L 1 ${fmt(t)}`,
    'L 1 0',
    'Z',
  ].join(' ');
}

/** 冰侧：沿右缘下到底，外缘满高 → 一半 → 中心。 */
function buildSideBClipPathD(sideWidthPx: number): string {
  const t = getTaperY();
  const outerLocal = 1 - getOuterFlatLocal(sideWidthPx);
  if (outerLocal <= SIDE_TRANSITION_END_RATIO) {
    return `M 0 0 L 1 0 L 1 1 ${buildSideTransitionCurve(1, 1, 0, t)} L 0 ${fmt(t)} Z`;
  }
  return [
    'M 0 0',
    'L 1 0',
    'L 1 1',
    `L ${fmt(outerLocal)} 1`,
    buildSideTransitionCurve(outerLocal, 1, SIDE_TRANSITION_END_RATIO, t),
    `L 0 ${fmt(t)}`,
    'Z',
  ].join(' ');
}

/** 整轨：左右对称过渡，中间下缘水平。 */
function buildRailClipPathD(trackWidthPx: number, splitRatio: number, pctBRatio: number): string {
  const t = getTaperY();
  const outerLeft = trackWidthPx > 0 ? EDGE_TRANSITION_PX / trackWidthPx : 0;
  const outerRight = trackWidthPx > 0 ? 1 - EDGE_TRANSITION_PX / trackWidthPx : 1;
  const halfLeft = splitRatio * SIDE_TRANSITION_END_RATIO;
  const halfRight = splitRatio + pctBRatio * SIDE_TRANSITION_END_RATIO;

  if (outerLeft >= halfLeft || outerRight <= halfRight) {
    const mid = splitRatio;
    return `M 0 0 L 1 0 L 1 1 ${buildSideTransitionCurve(1, 1, mid, t)} ${buildSideTransitionCurve(mid, t, 0, 1)} Z`;
  }

  return [
    'M 0 0',
    'L 1 0',
    'L 1 1',
    `L ${fmt(outerRight)} 1`,
    buildSideTransitionCurve(outerRight, 1, halfRight, t),
    `L ${fmt(halfLeft)} ${fmt(t)}`,
    buildSideTransitionCurve(outerLeft, 1, halfLeft, t),
    'L 0 1',
    'Z',
  ].join(' ');
}

function clipPathUrl(id: string): string {
  return `url(#${id})`;
}

/** 两侧贴外缘生成：random 次方越小，越贴近 0% / 100%。 */
function buildConvergeParticles(): ConvergeParticle[] {
  const items: ConvergeParticle[] = [];
  const particlesPerSide = 38;
  const edgeExponent = 0.12;
  const maxEdgeSpreadPct = 3.2;

  for (let i = 0; i < particlesPerSide; i += 1) {
    const edgeBias = Math.pow(Math.random(), edgeExponent);
    items.push({
      id: i,
      side: 'A',
      startLeftPct: edgeBias * maxEdgeSpreadPct,
      startAnchorX: '0%',
      endAnchorX: '-50%',
      y: (Math.random() - 0.5) * 24,
      size: 1.5 + Math.random() * 1.6,
      delay: Math.random() * 4.5,
      duration: 3.8 + Math.random() * 2.2,
    });
  }

  for (let i = 0; i < particlesPerSide; i += 1) {
    const edgeBias = Math.pow(Math.random(), edgeExponent);
    items.push({
      id: i + particlesPerSide,
      side: 'B',
      startLeftPct: 100 - edgeBias * maxEdgeSpreadPct,
      startAnchorX: '-100%',
      endAnchorX: '-50%',
      y: (Math.random() - 0.5) * 24,
      size: 1.5 + Math.random() * 1.6,
      delay: Math.random() * 4.5,
      duration: 3.8 + Math.random() * 2.2,
    });
  }

  return items;
}

function buildCenterSparks(): CenterSpark[] {
  const items: CenterSpark[] = [];
  for (let i = 0; i < 10; i += 1) {
    items.push({
      id: i,
      y: (Math.random() - 0.5) * 16,
      size: 1.8 + Math.random() * 1.6,
      jitterX: (Math.random() - 0.5) * 10,
      delay: Math.random() * 3,
      duration: 2.4 + Math.random() * 1.6,
    });
  }
  return items;
}

export function HeroBattleRail({ pctA, pctB }: HeroBattleRailProps) {
  const clipId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidthPx, setTrackWidthPx] = useState(0);
  const splitPct = Math.min(96, Math.max(4, pctA));
  const railClipId = `${clipId}-rail`;
  const sideAClipId = `${clipId}-side-a`;
  const sideBClipId = `${clipId}-side-b`;
  const sideAWidthPx = trackWidthPx * (splitPct / 100);
  const sideBWidthPx = trackWidthPx * (pctB / 100);

  useEffect(() => {
    const trackEl = trackRef.current;
    if (!trackEl) return undefined;

    const updateWidth = () => {
      setTrackWidthPx(trackEl.getBoundingClientRect().width);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(trackEl);
    return () => observer.disconnect();
  }, []);

  const railClipD = useMemo(
    () => buildRailClipPathD(trackWidthPx, splitPct / 100, pctB / 100),
    [trackWidthPx, splitPct, pctB],
  );
  const sideAClipD = useMemo(() => buildSideAClipPathD(sideAWidthPx), [sideAWidthPx]);
  const sideBClipD = useMemo(() => buildSideBClipPathD(sideBWidthPx), [sideBWidthPx]);
  const convergeParticles = useMemo(() => buildConvergeParticles(), []);
  const centerSparks = useMemo(() => buildCenterSparks(), []);

  return (
    <div className={styles.railWrap} aria-hidden>
      <svg className={styles.clipDefs} aria-hidden focusable="false">
        <defs>
          <clipPath id={railClipId} clipPathUnits="objectBoundingBox">
            <path d={railClipD} />
          </clipPath>
          <clipPath id={sideAClipId} clipPathUnits="objectBoundingBox">
            <path d={sideAClipD} />
          </clipPath>
          <clipPath id={sideBClipId} clipPathUnits="objectBoundingBox">
            <path d={sideBClipD} />
          </clipPath>
        </defs>
      </svg>
      <div className={`${styles.railGlow} ${styles.railGlowFire}`} />
      <div className={`${styles.railGlow} ${styles.railGlowIce}`} />
      <motion.div
        className={styles.railGlowCenter}
        initial={false}
        animate={{ left: `${splitPct}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
      />

      <div className={styles.railShell}>
        <div ref={trackRef} className={styles.railTrack}>
          <motion.div
            className={`${styles.side} ${styles.sideA}`}
            style={{ clipPath: clipPathUrl(sideAClipId) }}
            initial={false}
            animate={{ width: `${splitPct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 22 }}
          >
            <div className={`${styles.sideInnerGlow} ${styles.sideAInnerGlow}`} />
          </motion.div>

          <motion.div
            className={`${styles.side} ${styles.sideB}`}
            style={{ clipPath: clipPathUrl(sideBClipId) }}
            initial={false}
            animate={{ width: `${pctB}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 22 }}
          >
            <div className={`${styles.sideInnerGlow} ${styles.sideBInnerGlow}`} />
          </motion.div>

          <div className={`${styles.pct} ${styles.pctA}`}>{pctA}%</div>
          <div className={`${styles.pct} ${styles.pctB}`}>{pctB}%</div>

          <div className={styles.particleLayer} style={{ clipPath: clipPathUrl(railClipId) }}>
            {convergeParticles.map((particle) => {
              const isFire = particle.side === 'A';
              const sideColor = isFire ? '#ff7828' : '#28c8ff';

              return (
                <motion.span
                  key={`converge-${particle.id}`}
                  className={isFire ? styles.convergeParticleFire : styles.convergeParticleIce}
                  style={{
                    width: particle.size,
                    height: particle.size,
                    backgroundColor: sideColor,
                  }}
                  initial={{
                    left: `${particle.startLeftPct}%`,
                    x: particle.startAnchorX,
                    y: particle.y,
                    opacity: 1,
                    scale: 1,
                  }}
                  animate={{
                    left: `${splitPct}%`,
                    x: particle.endAnchorX,
                    y: [particle.y, particle.y + (isFire ? 1 : -1), particle.y],
                    scale: [1, 1.08, 0.92],
                    opacity: 1,
                  }}
                  transition={{
                    duration: particle.duration,
                    delay: particle.delay,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              );
            })}

          </div>
        </div>
      </div>

      <div className={styles.clashLayer}>
        <motion.div
          className={styles.clash}
          initial={false}
          animate={{ left: `${splitPct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        >
          <div className={styles.clashBloomFire} />
          <div className={styles.clashBloomIce} />
          <div className={styles.clashBloomMid} />
          <div className={styles.clashHalo} />
          <div className={styles.clashFlare} />
          <div className={`${styles.clashRing} ${styles.clashRingDelay}`} />
          <div className={styles.clashRing} />

          <div className={`${styles.smoke} ${styles.smokeFire}`} />
          <div className={`${styles.smoke} ${styles.smokeIce}`} />
          <div className={`${styles.smoke} ${styles.smokeFire} ${styles.smokeFireBottom}`} />
          <div className={`${styles.smoke} ${styles.smokeIce} ${styles.smokeIceBottom}`} />

          {centerSparks.map((spark) => (
            <motion.span
              key={`center-${spark.id}`}
              className={styles.centerSpark}
              style={{
                width: spark.size,
                height: spark.size,
              }}
              initial={{
                left: '50%',
                x: '-50%',
                y: spark.y,
                opacity: 1,
                scale: 1,
              }}
              animate={{
                left: '50%',
                x: [`calc(-50% + ${spark.jitterX * 0.3}px)`, `calc(-50% + ${spark.jitterX}px)`, `calc(-50% + ${spark.jitterX * 0.3}px)`],
                y: [spark.y, spark.y - 2, spark.y + 2, spark.y],
                scale: [1, 1.15, 1],
                opacity: 1,
              }}
              transition={{
                duration: spark.duration,
                delay: spark.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
