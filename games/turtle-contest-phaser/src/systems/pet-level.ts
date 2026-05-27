// ══════════════════════════════════════════════════════════
// pet-level.ts — 宠物等级 + 等级加成 (JS fighter.js:7-26 1:1)
// localStorage petState.levels[petId] || 1; bonus = 1 + (lv-1)×0.05
// 共享给 CodexScene / TeamSelectScene / MenuDebugOverlay (之前各处重复/缺失)
// ══════════════════════════════════════════════════════════

/** 读宠物等级 (JS fighter.js:7 getPetLevel 1:1) — localStorage petState.levels[id] || 1 */
export function getPetLevel(petId: string): number {
  try {
    const ps = JSON.parse(localStorage.getItem('petState') || '{}');
    return (ps.levels && ps.levels[petId]) || 1;
  } catch { return 1; }
}

/** 设宠物等级 (JS fighter.js:14 setPetLevel 1:1), clamp 1-10 */
export function setPetLevel(petId: string, level: number): void {
  const lv = Math.max(1, Math.min(10, Math.round(level)));
  try {
    const ps = JSON.parse(localStorage.getItem('petState') || '{}');
    if (!ps.levels) ps.levels = {};
    ps.levels[petId] = lv;
    localStorage.setItem('petState', JSON.stringify(ps));
  } catch { /* ignore */ }
}

/** 等级加成 (JS fighter.js:24): lv1=1.0, lv5=1.20, lv10=1.45 (每级+5%) */
export function getLevelBonus(petId: string): number {
  return 1 + (getPetLevel(petId) - 1) * 0.05;
}

/** 技能解锁等级 (JS fighter.js:37 + codex.js:228): idx3 需 Lv4, idx4 需 Lv7, 其余 Lv1 */
export function skillUnlockLevel(skillIdx: number): number {
  if (skillIdx === 3) return 4;
  if (skillIdx === 4) return 7;
  return 1;
}
