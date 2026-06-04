import { describe, it, expect } from 'vitest';
import { calcDmgMult, calcEffArmor, calcEffMr, applyRawDamage } from './damage';
import type { Fighter } from '../types';

// 最小 Fighter 工厂 (只填伤害函数会读的字段; Fighter 有 [k]:unknown 兜底)
function mk(o: Partial<Fighter> = {}): Fighter {
  return {
    hp: 100, maxHp: 100, shield: 0, def: 0, mr: 0,
    baseAtk: 0, baseDef: 0, baseMr: 0, atk: 0, crit: 0,
    armorPen: 0, armorPenPct: 0, magicPen: 0, magicPenPct: 0,
    buffs: [], alive: true, side: 'left',
    ...o,
  } as unknown as Fighter;
}

describe('calcDmgMult', () => {
  it('正防御减伤 (0<mult<1), 防御越高减伤越多, 单调', () => {
    expect(calcDmgMult(0)).toBe(1);
    expect(calcDmgMult(100)).toBeGreaterThan(0);
    expect(calcDmgMult(100)).toBeLessThan(1);
    expect(calcDmgMult(200)).toBeLessThan(calcDmgMult(100)); // 越高越少
  });
  it('负防御增伤 (>1)', () => {
    expect(calcDmgMult(-100)).toBeGreaterThan(1);
  });
});

describe('calcEffArmor / calcEffMr — 穿透', () => {
  it('护甲穿透 flat + pct', () => {
    const atk = mk({ armorPen: 10, armorPenPct: 0.5 });
    const tgt = mk({ def: 100 });
    expect(calcEffArmor(atk, tgt)).toBe(100 * 0.5 - 10); // 40
  });
  it('魔法穿透', () => {
    const atk = mk({ magicPen: 5, magicPenPct: 0 });
    const tgt = mk({ mr: 30 });
    expect(calcEffMr(atk, tgt)).toBe(25);
  });
});

describe('applyRawDamage', () => {
  it('护盾先吸, 再扣血', () => {
    const t = mk({ hp: 100, shield: 30 });
    const r = applyRawDamage(t, 50, 'physical');
    expect(r.shieldAbs).toBe(30);
    expect(r.hpLoss).toBe(20);
    expect(t.hp).toBe(80);
    expect(t.shield).toBe(0);
  });

  it('_untargetable: 完全免伤 (训龟大师)', () => {
    const t = mk({ hp: 100 });
    (t as Fighter & { _untargetable?: boolean })._untargetable = true;
    const r = applyRawDamage(t, 999, 'physical');
    expect(r.hpLoss).toBe(0);
    expect(t.hp).toBe(100);
  });

  it('physImmune value=100: 物理全免, 魔法照常', () => {
    const t = mk({ hp: 100, buffs: [{ type: 'physImmune', value: 100, duration: 2 }] });
    expect(applyRawDamage(t, 80, 'physical').hpLoss).toBe(0);
    expect(t.hp).toBe(100);
    const r2 = applyRawDamage(t, 50, 'magic');
    expect(r2.hpLoss).toBe(50);
  });

  it('physImmune value=25: 物理减 25%', () => {
    const t = mk({ hp: 200, buffs: [{ type: 'physImmune', value: 25, duration: 2 }] });
    applyRawDamage(t, 100, 'physical');
    expect(t.hp).toBe(200 - 75);
  });

  it('海葵母寄生护盾先扣, 打穿记录 attackerSide', () => {
    const host = mk({ hp: 100 });
    const h = host as Fighter & { _anemoneShield?: number; _anemoneBrokenBy?: 'left' | 'right' | null };
    h._anemoneShield = 40;
    // 不足以打穿: 吸 40, 余 0 → 不伤血, 不记录
    const r1 = applyRawDamage(host, 30, 'physical', false, false, 'right');
    expect(h._anemoneShield).toBe(10);
    expect(r1.hpLoss).toBe(0);
    expect(h._anemoneBrokenBy).toBeUndefined();
    // 打穿: 记录打穿者 'right', 溢出伤血
    const r2 = applyRawDamage(host, 60, 'physical', false, false, 'right');
    expect(h._anemoneShield).toBeLessThanOrEqual(0);
    expect(h._anemoneBrokenBy).toBe('right');
    expect(r2.hpLoss).toBe(50);  // 60 - 剩余10 盾
  });

  it('true 伤不被 physImmune 拦', () => {
    const t = mk({ hp: 100, buffs: [{ type: 'physImmune', value: 100, duration: 2 }] });
    applyRawDamage(t, 40, 'true');
    expect(t.hp).toBe(60);
  });
});
