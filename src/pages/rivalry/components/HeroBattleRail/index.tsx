/** 文件说明：开撕台 Hero 对抗条，火/冰双轨 + 中心碰撞粒子动效。 */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import styles from './index.module.scss';

interface HeroBattleRailProps {
  pctA: number;
  pctB: number;
}

type BattleParticle = {
  id: number;
  side: 'A' | 'B';
  size: number;
  y: number;
  delay: number;
  duration: number;
  distance: number;
};

function buildParticles(): BattleParticle[] {
  const items: BattleParticle[] = [];
  for (let i = 0; i < 8; i += 1) {
    items.push({
      id: i,
      side: 'A',
      size: 2 + Math.random() * 3,
      y: (Math.random() - 0.5) * 24,
      delay: Math.random() * 1.4,
      duration: 0.6 + Math.random() * 0.5,
      distance: 22 + Math.random() * 34,
    });
  }
  for (let i = 0; i < 8; i += 1) {
    items.push({
      id: i + 8,
      side: 'B',
      size: 2 + Math.random() * 3,
      y: (Math.random() - 0.5) * 24,
      delay: Math.random() * 1.4,
      duration: 0.6 + Math.random() * 0.5,
      distance: 22 + Math.random() * 34,
    });
  }
  return items;
}

export function HeroBattleRail({ pctA, pctB }: HeroBattleRailProps) {
  const particles = useMemo(() => buildParticles(), []);
  const splitPct = Math.min(96, Math.max(4, pctA));

  return (
    <div className={styles.railWrap} aria-hidden>
      <div className={`${styles.railGlow} ${styles.railGlowFire}`} />
      <div className={`${styles.railGlow} ${styles.railGlowIce}`} />
      <motion.div
        className={styles.railGlowCenter}
        initial={false}
        animate={{ left: `${splitPct}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
      />

      <div className={styles.railShell}>
        <div className={styles.railTrack}>
          <motion.div
            className={`${styles.side} ${styles.sideA}`}
            initial={false}
            animate={{ width: `${splitPct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 22 }}
          >
            <div className={`${styles.sideTexture} ${styles.sideATexture}`} />
            <div className={`${styles.sideShimmer} ${styles.sideAShimmer}`} />
            <div className={`${styles.sideInnerGlow} ${styles.sideAInnerGlow}`} />
            <div className={styles.sideAEdgeGlow} />
          </motion.div>

          <motion.div
            className={`${styles.side} ${styles.sideB}`}
            initial={false}
            animate={{ width: `${pctB}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 22 }}
          >
            <div className={`${styles.sideTexture} ${styles.sideBTexture}`} />
            <div className={`${styles.sideShimmer} ${styles.sideBShimmer}`} />
            <div className={`${styles.sideInnerGlow} ${styles.sideBInnerGlow}`} />
            <div className={styles.sideBEdgeGlow} />
          </motion.div>

          <div className={`${styles.pct} ${styles.pctA}`}>{pctA}%</div>
          <div className={`${styles.pct} ${styles.pctB}`}>{pctB}%</div>
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
            <div className={styles.clashStreakH} />
            <div className={styles.clashBeam} />
            <div className={styles.clashBeamHot} />
            <div className={styles.clashCore} />
            <div className={styles.clashFlare} />
            <div className={`${styles.clashRing} ${styles.clashRingDelay}`} />
            <div className={styles.clashRing} />

            <div className={`${styles.smoke} ${styles.smokeFire}`} />
            <div className={`${styles.smoke} ${styles.smokeIce}`} />
            <div className={`${styles.smoke} ${styles.smokeFire} ${styles.smokeFireBottom}`} />
            <div className={`${styles.smoke} ${styles.smokeIce} ${styles.smokeIceBottom}`} />

            {particles.map((particle) => {
              const isFire = particle.side === 'A';
              const color = isFire ? '#ff6820' : '#18c8ff';
              const xTarget = isFire ? -particle.distance : particle.distance;

              return (
                <motion.span
                  key={particle.id}
                  className={styles.particle}
                  style={{
                    width: particle.size,
                    height: particle.size,
                    backgroundColor: color,
                    boxShadow: `0 0 ${particle.size * 2.2}px ${color}, 0 0 ${particle.size * 3.5}px rgba(255,255,255,0.75)`,
                  }}
                  initial={{ x: 0, y: particle.y, scale: 0, opacity: 0 }}
                  animate={{
                    x: [0, xTarget * 0.5, xTarget],
                    y: [particle.y, particle.y + (isFire ? 3 : -3), particle.y],
                    scale: [0, 1.2, 0.7, 0],
                    opacity: [0, 1, 0.8, 0],
                  }}
                  transition={{
                    duration: particle.duration,
                    delay: particle.delay,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
