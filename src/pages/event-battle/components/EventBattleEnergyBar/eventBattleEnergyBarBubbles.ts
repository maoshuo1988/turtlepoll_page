/** 文件说明：暗盘撕裂带对抗条气泡生成（仅 event-battle 使用）。 */

export type EventBattleEnergyBubble = {
  id: string;
  side: 'A' | 'B';
  style: React.CSSProperties & Record<`--${string}`, string>;
};

const pseudoRandom = (seed: number) => {
  const value = Math.sin(seed * 9301 + 49297) * 233280;
  return value - Math.floor(value);
};

export function buildEventBattleEnergyBarBubbles(
  side: 'A' | 'B',
  pct: number,
  duration: number,
): EventBattleEnergyBubble[] {
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
