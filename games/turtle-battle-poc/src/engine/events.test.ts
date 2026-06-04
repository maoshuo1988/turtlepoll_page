import { describe, it, expect } from 'vitest';
import { rollNeutralForTurn, rollEventForTurn, NEUTRAL_TEMPLATES, ENV_EVENTS } from './events';

// 固定 rng (返回常量) — 让概率门确定化
const rng = (v: number) => () => v;

describe('rollNeutralForTurn', () => {
  it('只在 3/6/9/12 回合触发', () => {
    for (const t of [1, 2, 4, 5, 7, 8, 10, 11]) {
      expect(rollNeutralForTurn(t, false, false, rng(0.1))).toBeNull();
    }
    expect(rollNeutralForTurn(3, false, false, rng(0.1))).not.toBeNull();
  });

  it('已 spawn 过 → 不再抽', () => {
    expect(rollNeutralForTurn(6, true, false, rng(0.1))).toBeNull();
  });

  it('60% 门: rng>=0.6 → null (走环境事件)', () => {
    expect(rollNeutralForTurn(3, false, false, rng(0.7))).toBeNull();
    expect(rollNeutralForTurn(3, false, false, rng(0.5))).not.toBeNull();
  });

  it('双方满格 → 强制海葵母 (寄生无需空位)', () => {
    // 无论第二个 rng 值如何, bothFull 都该出 anemone
    for (const v of [0.0, 0.2, 0.5]) {
      const r = rollNeutralForTurn(3, false, true, rng(v));
      expect(r?.type).toBe('anemone');
    }
  });

  it('非满格 → 按 1/3 分布出 treasure/crab/anemone', () => {
    // rng 第一次过门(<0.6), 第二次决定类型. 用序列 rng.
    const seq = (vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]; };
    expect(rollNeutralForTurn(3, false, false, seq([0.5, 0.1]))?.type).toBe('treasure'); // r<1/3
    expect(rollNeutralForTurn(3, false, false, seq([0.5, 0.5]))?.type).toBe('crab');     // 1/3<=r<2/3
    expect(rollNeutralForTurn(3, false, false, seq([0.5, 0.9]))?.type).toBe('anemone');  // r>=2/3
  });
});

describe('NEUTRAL_TEMPLATES', () => {
  it('海葵母是寄生型 (有 parasiteShield + hostAtkBonus, 无站场 hp)', () => {
    expect(NEUTRAL_TEMPLATES.anemone.parasiteShield).toBe(350);
    expect(NEUTRAL_TEMPLATES.anemone.hostAtkBonus).toBe(15);
    expect(NEUTRAL_TEMPLATES.anemone.hp).toBe(0);
  });
  it('宝箱怪/巨蟹是站场实体 (有 hp)', () => {
    expect(NEUTRAL_TEMPLATES.treasure.hp).toBeGreaterThan(0);
    expect(NEUTRAL_TEMPLATES.crab.hp).toBeGreaterThan(0);
  });
});

describe('rollEventForTurn', () => {
  it('只在 3/6/9/12 触发, 排除已触发的', () => {
    expect(rollEventForTurn(5, new Set())).toBeNull();
    const fired = new Set(ENV_EVENTS.map(e => e.id));
    expect(rollEventForTurn(3, fired)).toBeNull(); // 全部用尽
    expect(rollEventForTurn(3, new Set())).not.toBeNull();
  });
});
