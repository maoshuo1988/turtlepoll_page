import { describe, it, expect } from 'vitest';
import { rollShopItems, BASE_PRICE, SLOT_DIST, BUFF_POOL, planAiShop } from './shop-quick';

const constRng = (v: number) => () => v;

describe('rollShopItems', () => {
  it('恒返回 6 格, F 为重置骰子', () => {
    const slots = rollShopItems(0);
    expect(slots).toHaveLength(6);
    expect(slots[5].slot).toBe('F');
    expect(slots[5].isReroll).toBe(true);
    expect(slots[5].rarity).toBe('reroll');
  });

  it('A~E 稀有度都在四档内, 且各有 name/desc/price', () => {
    const slots = rollShopItems(1);
    for (const s of slots.slice(0, 5)) {
      expect(['buff', 'consumable', 'normal', 'unique']).toContain(s.rarity);
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.price).toBeGreaterThan(0);
      // 装备格带 equipId, 增益格带 buff
      if (s.rarity === 'buff') expect(s.buff).toBeTruthy();
      else expect(s.equipId).toBeTruthy();
    }
  });

  it('价格随 shopIndex ×1.25 递增 (固定 rng 消除抖动)', () => {
    // rng=0.5 → jitter = 0.9 + 0.5*0.2 = 1.0; pickRarity(r=50) 对 A 格 → consumable(基准24)
    const s0 = rollShopItems(0, constRng(0.5))[0];
    const s1 = rollShopItems(1, constRng(0.5))[0];
    const s2 = rollShopItems(2, constRng(0.5))[0];
    expect(s0.price).toBe(Math.round(BASE_PRICE[s0.rarity as 'consumable'] * 1.0));
    expect(s1.price).toBe(Math.round(s0.price * 1.25));
    expect(s2.price).toBe(Math.round(s0.price * 1.25 * 1.25));
  });

  it('SLOT_DIST 每格分布之和 = 100', () => {
    for (const slot of Object.keys(SLOT_DIST)) {
      const d = SLOT_DIST[slot];
      expect(d.buff + d.consumable + d.normal + d.unique).toBe(100);
    }
  });

  it('E 格独特占比最高 (40), A 格增益最高 (40)', () => {
    expect(SLOT_DIST.E.unique).toBe(40);
    expect(SLOT_DIST.A.buff).toBe(40);
  });
});

describe('planAiShop (AI 购买决策, 纯函数)', () => {
  it('0 币: 不买', () => {
    const p = planAiShop(0, 0, () => 0.5);
    expect(p.buys).toHaveLength(0);
    expect(p.spent).toBe(0);
    expect(p.coinsLeft).toBe(0);
  });

  it('花费 = 余额差, 不超额 (花费<=初始)', () => {
    const p = planAiShop(100, 0, () => 0.5);
    expect(p.spent).toBe(100 - p.coinsLeft);
    expect(p.spent).toBeLessThanOrEqual(100);
    expect(p.coinsLeft).toBeGreaterThanOrEqual(0);
  });

  it('海量币也不会无限买/死循环 (重投上限) — 终止且余额非负', () => {
    const p = planAiShop(100000, 2, () => 0.3);
    expect(p.coinsLeft).toBeGreaterThanOrEqual(0);
    // 6 格 + 最多 3 次重投 → 买入数有上限 (<= 4 轮 ×5 可买格)
    expect(p.buys.length).toBeLessThanOrEqual(20);
  });

  it('买入格都是可负担的非重投格', () => {
    const p = planAiShop(80, 0, () => 0.4);
    for (const b of p.buys) expect(b.isReroll).toBeFalsy();
  });
});

describe('BASE_PRICE / BUFF_POOL', () => {
  it('基准价: 普通32/消耗24/增益16/独特41', () => {
    expect(BASE_PRICE).toEqual({ buff: 16, consumable: 24, normal: 32, unique: 41 });
  });
  it('增益池 12 件, 都有 name+kind', () => {
    expect(BUFF_POOL).toHaveLength(12);
    for (const b of BUFF_POOL) {
      expect(b.name.length).toBeGreaterThan(0);
      expect(['team-buff', 'single-buff']).toContain(b.kind);
    }
  });
});
