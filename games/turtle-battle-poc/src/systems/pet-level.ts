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

/** 按 owner 等级返回某 pet 可用技能 idx 数组 (JS fighter.js:30 getAvailableSkillIndices 1:1)。
 *  idx 0/1/2 始终解锁; idx 3 需 lv≥4; idx 4 需 lv≥7。 */
export function getAvailableSkillIndices(skillPoolLen: number, lv: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < skillPoolLen; i++) {
    if (i <= 2) out.push(i);
    else if (i === 3 && lv >= 4) out.push(i);
    else if (i === 4 && lv >= 7) out.push(i);
  }
  return out;
}

/** AI 抽 3 技能(随等级随机, 1 基础 + 2 解锁池) — JS fighter.js:314 aiPickSkills 1:1。
 *  pool: pet.skillPool entries (含 passiveSkill flag + type); lv: 主人等级。
 *  规则:
 *   - 必含 idx 0 (基础技能)
 *   - 再挑 1 个 active 伤害技 (非 isAlly, 非 heal/shield)
 *   - 凑满 3: 30% 概率挑 passive (最多 1 个被动), 否则挑 active
 *   - 互斥对: fortuneGainCoins ↔ fortuneBuyEquip (都金币向, 同抽 AI 无输出)
 *   - 返回排序后的 idx 数组; 池≤3 返 null (用 defaultSkills)
 *  pets.ts skillPool 与 JS 字段命名差异: `isAlly` 用 `isAlly`(已 ported), `type`/`passiveSkill` 同名。
 */
export function aiPickSkills(
  pool: Array<{ type?: string; passiveSkill?: boolean; isAlly?: boolean }>,
  lv: number,
): number[] | null {
  if (!pool || pool.length <= 3) return null;
  const unlocked = getAvailableSkillIndices(pool.length, lv);
  const indices: number[] = [0];   // 必含基础技
  const available = unlocked.filter(i => i !== 0);
  const actives = available.filter(i => !pool[i].passiveSkill);
  const passives = available.filter(i => pool[i].passiveSkill);
  // 1 active 伤害技
  const dmgIdxs = actives.filter(i => !pool[i].isAlly && pool[i].type !== 'heal' && pool[i].type !== 'shield');
  if (dmgIdxs.length) indices.push(dmgIdxs[Math.floor(Math.random() * dmgIdxs.length)]);
  // 凑满 3 (互斥对处理)
  const EXCLUSIVE_PAIRS: string[][] = [['fortuneGainCoins', 'fortuneBuyEquip']];
  const mutexBlocked = (idx: number): boolean => {
    for (const pair of EXCLUSIVE_PAIRS) {
      if (pair.includes(pool[idx].type ?? '') && indices.some(i => i !== idx && pair.includes(pool[i].type ?? ''))) return true;
    }
    return false;
  };
  while (indices.length < 3) {
    const usePassive = passives.length && Math.random() < 0.3 && !indices.some(i => pool[i].passiveSkill);
    const pickFrom = (usePassive ? passives : actives).filter(i => !indices.includes(i) && !mutexBlocked(i));
    const src = pickFrom.length ? pickFrom : available.filter(i => !indices.includes(i) && !mutexBlocked(i));
    if (!src.length) break;
    indices.push(src[Math.floor(Math.random() * src.length)]);
  }
  return indices.sort((a, b) => a - b);
}
