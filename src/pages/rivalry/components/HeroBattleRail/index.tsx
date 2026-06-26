/** 文件说明：开撕台 Hero 对抗条，火/冰双轨 + 两侧向中心汇聚粒子。 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { buildFixedRailClipPathD, clipPathUrl } from '@/pages/event-battle/components/eventBattleEnergyTaper';
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
  const [trackSizePx, setTrackSizePx] = useState({ width: 0, height: 48 });
  const splitPct = Math.min(96, Math.max(4, pctA));
  const railClipId = `${clipId}-rail`.replace(/:/g, '');

  useEffect(() => {
    const trackEl = trackRef.current;
    if (!trackEl) return undefined;

    const updateWidth = () => {
      const rect = trackEl.getBoundingClientRect();
      setTrackSizePx({ width: rect.width, height: rect.height || 48 });
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(trackEl);
    return () => observer.disconnect();
  }, []);

  const railClipD = useMemo(
    () => buildFixedRailClipPathD(trackSizePx.width, trackSizePx.height),
    [trackSizePx.height, trackSizePx.width],
  );
  const convergeParticles = useMemo(() => buildConvergeParticles(), []);
  const centerSparks = useMemo(() => buildCenterSparks(), []);

  return (
    <div className={styles.railWrap} aria-hidden>
      <svg className={styles.clipDefs} aria-hidden focusable="false">
        <defs>
          <clipPath id={railClipId} clipPathUnits="objectBoundingBox">
            <path d={railClipD} />
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
        <div ref={trackRef} className={styles.railTrack} style={{ clipPath: clipPathUrl(railClipId) }}>
          <motion.div
            className={`${styles.side} ${styles.sideA}`}
            initial={false}
            animate={{ width: `${splitPct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 22 }}
          >
            <div className={`${styles.sideInnerGlow} ${styles.sideAInnerGlow}`} />
          </motion.div>

          <motion.div
            className={`${styles.side} ${styles.sideB}`}
            initial={false}
            animate={{ width: `${pctB}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 22 }}
          >
            <div className={`${styles.sideInnerGlow} ${styles.sideBInnerGlow}`} />
          </motion.div>

          <div className={`${styles.pct} ${styles.pctA}`}>{pctA}%</div>
          <div className={`${styles.pct} ${styles.pctB}`}>{pctB}%</div>

          <div className={styles.particleLayer}>
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
