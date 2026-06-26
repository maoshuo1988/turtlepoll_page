/** 文件说明：撕裂带对抗条，固定收窄外形 + 原蓝红填色与动效。 */
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { buildFixedRailClipPathD, clipPathUrl } from '../eventBattleEnergyTaper';

type EnergyBubble = {
  id: string;
  side: 'A' | 'B';
  style: React.CSSProperties & Record<`--${string}`, string>;
};

type PkParticle = {
  id: string;
  style: React.CSSProperties & Record<`--${string}`, string>;
};

interface EventBattleEnergyBarProps {
  leftPct: number;
  rightPct: number;
  leftEnergyDuration: number;
  rightEnergyDuration: number;
  leftBubbles: EnergyBubble[];
  rightBubbles: EnergyBubble[];
  pkParticles: PkParticle[];
}

const pseudoRandom = (seed: number) => {
  const value = Math.sin(seed * 9301 + 49297) * 233280;
  return value - Math.floor(value);
};

export function buildEnergyBarBubbles(
  side: 'A' | 'B',
  pct: number,
  duration: number,
): EnergyBubble[] {
  const count = Math.min(26, Math.max(8, Math.round(pct / 4) + 6));
  const salt = side === 'A' ? 17 : 43;

  return Array.from({ length: count }, (_, index) => {
    const top = 16 + pseudoRandom(index + salt) * 68;
    const size = 3 + pseudoRandom(index + salt + 100) * 4;
    const delay = -pseudoRandom(index + salt + 200) * duration;

    return {
      id: `${side}-energy-bubble-${index}`,
      side,
      style: {
        '--top': `${top.toFixed(1)}%`,
        '--size': `${size.toFixed(1)}px`,
        '--delay': `${delay.toFixed(2)}s`,
      },
    };
  });
}

export function EventBattleEnergyBar({
  leftPct,
  rightPct,
  leftEnergyDuration,
  rightEnergyDuration,
  leftBubbles,
  rightBubbles,
  pkParticles,
}: EventBattleEnergyBarProps) {
  const clipId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackSizePx, setTrackSizePx] = useState({ width: 0, height: 44 });
  const railClipId = `${clipId}-rail`.replace(/:/g, '');
  const railClipD = useMemo(
    () => buildFixedRailClipPathD(trackSizePx.width, trackSizePx.height),
    [trackSizePx.height, trackSizePx.width],
  );

  useLayoutEffect(() => {
    const node = trackRef.current;
    if (!node) return undefined;

    const updateWidth = () => {
      const rect = node.getBoundingClientRect();
      setTrackSizePx({ width: rect.width, height: rect.height || 44 });
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const trackStyle = {
    clipPath: clipPathUrl(railClipId),
    '--left-pct': `${leftPct}%`,
    '--left-energy-duration': `${leftEnergyDuration.toFixed(2)}s`,
    '--right-energy-duration': `${rightEnergyDuration.toFixed(2)}s`,
  } as React.CSSProperties;

  return (
    <div className="eb-energy-track-wrap">
      <svg className="eb-energy-clip-defs" aria-hidden focusable="false">
        <defs>
          <clipPath id={railClipId} clipPathUnits="objectBoundingBox">
            <path d={railClipD} />
          </clipPath>
        </defs>
      </svg>

      <div ref={trackRef} className="eb-energy-track" style={trackStyle}>
        <div className="eb-energy-blue" style={{ width: `${leftPct}%` }} />
        <div className="eb-energy-red" style={{ width: `${rightPct}%` }} />
        <div className="eb-energy-bubbles eb-energy-bubbles-blue" aria-hidden>
          {leftBubbles.map((bubble) => (
            <i key={bubble.id} style={bubble.style} />
          ))}
        </div>
        <div className="eb-energy-bubbles eb-energy-bubbles-red" aria-hidden>
          {rightBubbles.map((bubble) => (
            <i key={bubble.id} style={bubble.style} />
          ))}
        </div>
        <span className="eb-energy-pct eb-energy-pct-left">{leftPct}%</span>
        <span className="eb-energy-pct eb-energy-pct-right">{rightPct}%</span>
      </div>

      <div className="eb-pk-overlay" style={{ left: `${leftPct}%` }}>
        <div className="eb-pk-backdrop" />
        <div className="eb-pk-energy-field" />
        <div className="eb-pk-sparks" aria-hidden>
          {pkParticles.map((particle) => (
            <i key={particle.id} className="eb-pk-spark" style={particle.style} />
          ))}
        </div>
        <div className="eb-pk-core">
          <span className="eb-pk-letter eb-pk-letter-blue">P</span>
          <span className="eb-pk-letter eb-pk-letter-red">K</span>
        </div>
      </div>
    </div>
  );
}
