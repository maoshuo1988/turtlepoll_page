/** 文件说明：暗盘撕裂带对抗条，圆角轨道 + 蓝红填色与 PK 动效（仅 event-battle 使用）。 */
import { buildEventBattleEnergyBarBubbles, type EventBattleEnergyBubble } from './eventBattleEnergyBarBubbles';

type PkParticle = {
  id: string;
  style: React.CSSProperties & Record<`--${string}`, string>;
};

interface EventBattleEnergyBarProps {
  leftPct: number;
  rightPct: number;
  leftEnergyDuration: number;
  rightEnergyDuration: number;
  leftBubbles: EventBattleEnergyBubble[];
  rightBubbles: EventBattleEnergyBubble[];
  pkParticles: PkParticle[];
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

export { buildEventBattleEnergyBarBubbles };
