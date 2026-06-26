/** 文件说明：开撕台撕裂带对抗条，圆角轨道 + 双阵营填色与 PK 动效。 */
import { buildRivalryBattleEnergyBarBubbles, type RivalryBattleEnergyBubble } from './rivalryBattleEnergyBarBubbles';

type PkParticle = {
  id: string;
  style: React.CSSProperties & Record<`--${string}`, string>;
};

interface RivalryBattleEnergyBarProps {
  leftPct: number;
  rightPct: number;
  leftEnergyDuration: number;
  rightEnergyDuration: number;
  leftBubbles: RivalryBattleEnergyBubble[];
  rightBubbles: RivalryBattleEnergyBubble[];
  pkParticles: PkParticle[];
}

export function RivalryBattleEnergyBar({
  leftPct,
  rightPct,
  leftEnergyDuration,
  rightEnergyDuration,
  leftBubbles,
  rightBubbles,
  pkParticles,
}: RivalryBattleEnergyBarProps) {
  const trackStyle = {
    '--left-pct': `${leftPct}%`,
    '--left-energy-duration': `${leftEnergyDuration.toFixed(2)}s`,
    '--right-energy-duration': `${rightEnergyDuration.toFixed(2)}s`,
    '--left-charge-duration': `${(leftEnergyDuration + 0.8).toFixed(2)}s`,
    '--right-charge-duration': `${(rightEnergyDuration + 0.8).toFixed(2)}s`,
  } as React.CSSProperties;

  return (
    <div className="rb-energy-track-wrap">
      <div className="rb-energy-track" style={trackStyle}>
        <div className="rb-energy-blue" style={{ width: `${leftPct}%` }} />
        <div className="rb-energy-red" style={{ width: `${rightPct}%` }} />
        <div className="rb-energy-bubbles rb-energy-bubbles-blue" aria-hidden>
          {leftBubbles.map((bubble) => (
            <i key={bubble.id} style={bubble.style} />
          ))}
        </div>
        <div className="rb-energy-bubbles rb-energy-bubbles-red" aria-hidden>
          {rightBubbles.map((bubble) => (
            <i key={bubble.id} style={bubble.style} />
          ))}
        </div>
        <div className="rb-energy-crash" style={{ left: `${leftPct}%` }} />
      </div>

      <div className="rb-pk-overlay" style={{ left: `${leftPct}%` }}>
        <div className="rb-pk-backdrop" />
        <div className="rb-pk-energy-field" />
        <div className="rb-pk-sparks" aria-hidden>
          {pkParticles.map((particle) => (
            <i key={particle.id} className="rb-pk-spark" style={particle.style} />
          ))}
        </div>
        <div className="rb-pk-core">
          <span className="rb-pk-letter rb-pk-letter-blue">P</span>
          <span className="rb-pk-letter rb-pk-letter-red">K</span>
        </div>
      </div>
    </div>
  );
}

export { buildRivalryBattleEnergyBarBubbles };
