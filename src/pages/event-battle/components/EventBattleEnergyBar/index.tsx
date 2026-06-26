/** 文件说明：撕裂带对抗条，原圆角轨道 + 蓝红填色与 PK 动效。 */
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
  const trackStyle = {
    '--left-pct': `${leftPct}%`,
    '--left-energy-duration': `${leftEnergyDuration.toFixed(2)}s`,
    '--right-energy-duration': `${rightEnergyDuration.toFixed(2)}s`,
    '--left-charge-duration': `${(leftEnergyDuration + 0.8).toFixed(2)}s`,
    '--right-charge-duration': `${(rightEnergyDuration + 0.8).toFixed(2)}s`,
  } as React.CSSProperties;

  return (
    <div className="eb-energy-track-wrap">
      <div className="eb-energy-track" style={trackStyle}>
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
        <div className="eb-energy-crash" style={{ left: `${leftPct}%` }} />
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
