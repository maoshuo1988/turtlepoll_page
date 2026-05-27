// ══════════════════════════════════════════════════════════
// slot-helpers.ts — 站位/邻接 helper (JS engine.js:707-738 移植)
//
// Slot grid (per side): rows front/back × cols 0/1/2, key = `${row}-${col}`.
// Col index 沿屏幕垂直 (col 0 上, col 2 下).
// "Adjacent" 邻接 = 3×2 网格的四向邻居:
//   · 同 row, col ± 1  (上 / 下)
//   · 对 row, 同 col   (前 / 后)
// ══════════════════════════════════════════════════════════
import type { Fighter } from '../types';

/** 给一个 slot key, 返回最多 3 个邻接 slot keys */
export function adjacentSlots(slotKey: string | undefined): string[] {
  if (!slotKey) return [];
  const [row, colStr] = slotKey.split('-');
  const col = parseInt(colStr, 10);
  const other = row === 'front' ? 'back' : 'front';
  const out: string[] = [];
  if (col > 0) out.push(`${row}-${col - 1}`);
  if (col < 2) out.push(`${row}-${col + 1}`);
  out.push(`${other}-${col}`);
  return out;
}

/** 同队中 target 的邻接 alive fighters (不含 target 自己) */
export function adjacentFighters(allFighters: Fighter[], target: Fighter): Fighter[] {
  if (!target || !target._slotKey) return [];
  const keys = adjacentSlots(target._slotKey);
  return allFighters.filter(f =>
    f.alive && f !== target && f.side === target.side && f._slotKey != null && keys.includes(f._slotKey)
  );
}

/** 给一个 front 排 fighter, 返回它身后的 back 同 col fighter (没有返回 null) */
export function fighterBehind(allFighters: Fighter[], f: Fighter): Fighter | null {
  if (!f || !f._slotKey) return null;
  const [row, col] = f._slotKey.split('-');
  if (row !== 'front') return null;
  return allFighters.find(t => t.alive && t.side === f.side && t._slotKey === `back-${col}`) ?? null;
}

/** 给一个 back 排 fighter, 返回它前方的 front 同 col fighter */
export function fighterInFront(allFighters: Fighter[], f: Fighter): Fighter | null {
  if (!f || !f._slotKey) return null;
  const [row, col] = f._slotKey.split('-');
  if (row !== 'back') return null;
  return allFighters.find(t => t.alive && t.side === f.side && t._slotKey === `front-${col}`) ?? null;
}

/** back 排 fighter: 它前面 (same col) 的 front 槽是否空 (无 alive friendly) */
export function frontSlotEmpty(allFighters: Fighter[], f: Fighter): boolean {
  if (!f || !f._slotKey) return false;
  const [row, col] = f._slotKey.split('-');
  if (row !== 'back') return false;  // 只有 back 排关心前方
  return !allFighters.some(t => t.alive && t.side === f.side && t._slotKey === `front-${col}`);
}

/** 同行 (front 或 back) 的所有 alive friendly fighters */
export function sameRowFighters(allFighters: Fighter[], f: Fighter): Fighter[] {
  if (!f || !f._slotKey) return [];
  const row = f._slotKey.split('-')[0];
  return allFighters.filter(t => t.alive && t.side === f.side && t._slotKey?.startsWith(`${row}-`));
}

/** 同列 (col 0/1/2) 的所有 alive friendly fighters (含 target 自身) — JS _slotKey.split('-')[1] 同款 */
export function sameColumnFighters(allFighters: Fighter[], f: Fighter): Fighter[] {
  if (!f || !f._slotKey) return [];
  const col = f._slotKey.split('-')[1];
  if (col == null) return [];
  return allFighters.filter(t => t.alive && t.side === f.side && t._slotKey?.endsWith(`-${col}`));
}

/** 敌方"可见目标": 默认前排 alive 都算 front 守门. 若敌方前排无 alive, 所有 back 暴露
 *  返回排序后的目标列表 (front 优先, 同排按 slot 0/1/2)
 */
export function visibleEnemyTargets(allFighters: Fighter[], attacker: Fighter): Fighter[] {
  // _untargetable (训龟大师等): 不可被选为目标
  const enemies = allFighters.filter(f => f.alive && f.side !== attacker.side
    && !(f as Fighter & { _untargetable?: boolean })._untargetable);
  const frontAlive = enemies.filter(e => e._slotKey?.startsWith('front-'));
  if (frontAlive.length > 0) {
    return frontAlive.sort((a, b) => (a._slotKey || '').localeCompare(b._slotKey || ''));
  }
  return enemies.sort((a, b) => (a._slotKey || '').localeCompare(b._slotKey || ''));
}
