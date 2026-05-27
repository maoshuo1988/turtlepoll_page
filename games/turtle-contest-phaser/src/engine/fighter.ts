// ══════════════════════════════════════════════════════════
// fighter.ts — createFighter factory (旧版 fighter.js TS 化)
// ══════════════════════════════════════════════════════════
import type { Fighter, PetDef, EquipmentDef, Rarity } from '../types';
import { PET_BY_ID, RARITY_MULT } from '../data/pets';

/**
 * 等级缩放: lv1 = 1.0, lv10 = 1.45 (旧版 fighter.js 同公式)
 */
function getLevelMult(level: number): number {
  return 1 + (level - 1) * 0.05;
}

/**
 * 创建 Fighter 实例 (运行时状态)
 * 旧版 createFighter(petId, side, equippedIdxs, levelOverride) 简化版:
 * - 不再读 LocalStorage 等级 (默认 lv1, 调用方可以传 level 覆盖)
 * - 暂不挂载装备 (装备由 attachEquipment 单独处理)
 * - 技能从 skillPool 按 equippedIdxs 选 (默认 defaultSkills 或 [0,1,2])
 */
export function createFighter(
  petId: string,
  side: 'left' | 'right',
  opts?: {
    equippedIdxs?: number[];
    level?: number;
    equipment?: EquipmentDef[];
  },
): Fighter {
  const pet = PET_BY_ID[petId];
  if (!pet) throw new Error(`unknown pet id: ${petId}`);

  const lv = opts?.level ?? 1;
  const lvMult = getLevelMult(lv);
  const rarityMult = RARITY_MULT[pet.rarity as Rarity] ?? 1;
  const m = lvMult * rarityMult;

  // P111/P126: 全员耐久度 +100 HP — 已 baked 进 pets.ts 各 hp 基础值,
  //   这里恢复原 JS 1:1 公式. (P126 用户指示"修改基础生命值"而非运行时叠加)
  const maxHp = Math.round(pet.hp * m);
  const atk = Math.round(pet.atk * m);
  const def = Math.round(pet.def * m);
  const mr = Math.round((pet.mr ?? pet.def) * m);

  const equippedIdxs = opts?.equippedIdxs ?? pet.defaultSkills ?? [0, 1, 2];
  const skills = equippedIdxs
    .map(i => pet.skillPool?.[i])
    .filter((s): s is NonNullable<typeof s> => !!s && !s.passiveSkill)
    .map(s => ({ ...s, cdLeft: 0 }));
  // P137 CRITICAL 1:1 JS fighter.js:131-146: _passiveSkills 只含"已装备 index"上的被动,
  //   不是 pool 里所有被动! 之前 PoC 取全 pool → 所有被动技能 (crystalBall/crystalImmortal/
  //   shellEnhanceAwaken/cyberEnhancedDrone/...) 永远生效, 不管玩家是否装备 → 严重错形.
  const pool = pet.skillPool ?? [];
  const _passiveSkills = equippedIdxs
    .filter(i => i < pool.length)
    .map(i => pool[i])
    .filter((s): s is NonNullable<typeof s> => !!s && !!s.passiveSkill)
    .map(s => ({ ...s }));

  const f: Fighter = {
    id: pet.id,
    name: pet.name,
    emoji: pet.emoji,
    rarity: pet.rarity,
    side,
    img: pet.img,
    sprite: pet.sprite ?? null,
    _level: lv,
    _equippedIdxs: equippedIdxs,

    maxHp, hp: maxHp,
    shield: 0,
    baseAtk: atk, baseDef: def, baseMr: mr,
    atk, def, mr,
    crit: pet.crit ?? 0.08,
    armorPen: 0, armorPenPct: 0,
    magicPen: 0, magicPenPct: 0,

    passive: pet.passive ? { ...pet.passive } : null,
    passiveUsedThisTurn: false,
    skills,
    _passiveSkills,

    alive: true,
    buffs: [],
    tags: [...(pet.tags ?? [])],
    _position: 'front',
    _statsDirty: true,

    equipment: [],
  };

  // 装备
  if (opts?.equipment?.length) {
    for (const eq of opts.equipment) attachEquipment(f, eq);
  }

  return f;
}

/**
 * 挂装备: 调用 apply(f), 装备入 fighter.equipment 数组
 */
export function attachEquipment(f: Fighter, eq: EquipmentDef): void {
  f.equipment.push(eq);
  try {
    eq.apply(f);
  } catch (e) {
    // 旧版 apply 里有调用外部 helper (recalcStats / applyHeal), PoC 阶段 stub 为 noop
    // 出错说明该装备有运行时依赖, 暂时静默跳过
    console.warn(`[attachEquipment] ${eq.id} apply 失败 (PoC stub):`, e);
  }
}

/**
 * 拷贝 init 快照 (UI 显示 stat-up/down 用)
 */
export function snapshotInitStats(f: Fighter): void {
  f._initAtk = f.atk;
  f._initDef = f.def;
  f._initMr = f.mr;
  f._initCrit = f.crit;
  f._initArmorPen = f.armorPen;
  f._initLifesteal = (f._lifestealPct as number) ?? 0;
  f._initMagicPen = f.magicPen;
}
