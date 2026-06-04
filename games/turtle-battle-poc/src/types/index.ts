// ══════════════════════════════════════════════════════════
// Core game types — 严格匹配 /games/turtle-battle/js/ 旧版 schema
// 不重新设计 shape, 只做 TS 化。
// ══════════════════════════════════════════════════════════

// ── 稀有度 (旧版字面量, C-SSS) ───────────────────────────
export type Rarity = 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

// 装备类别
// P120 新增 'initial' — 仅第一回合 3 选 1 modal 显示, 不进随机掉落池/商店
export type EquipCategory = 'unique' | 'normal' | 'special' | 'chest' | 'consumable' | 'initial';

// 伤害类型
export type DamageType = 'physical' | 'magic' | 'true';

// 飘字颜色类 — 1:1 对应 JS battle.css .floating-num.* 系列
// 颜色 + 字号 都跟 JS 完全一致 (见 visual_dispatcher.ts FLOAT_STYLE)
export type FloatCls =
  // ── 伤害类 (走 pop+hold+arc 动画) ──
  | 'direct-dmg'    // #ff4444 22px 物理 (普通)
  | 'phys-dmg'      // alias of direct-dmg (Phaser 内部惯用名)
  | 'magic-dmg'     // #4dabf7 22px 法术 (普通)
  | 'true-dmg'      // #ffffff 22px 真实 (普通)
  | 'pierce-dmg'    // #ffffff 20px 穿透
  | 'shield-dmg'    // #aaa    16px 护盾吸收
  | 'crit-dmg'      // #ff4444 26px 物理暴击 (保持类型色, 不是金)
  | 'crit-magic'    // #4dabf7 26px 法术暴击
  | 'crit-true'     // #ffffff 26px 真实暴击
  | 'crit-pierce'   // #ffffff 24px 穿透暴击
  // ── label 类 (上飘 1500ms, 不走 pop+arc) ──
  | 'heal-num'      // #06d6a0 24px "+30HP"
  | 'shield-num'    // #fff    22px "+20护盾"
  | 'crit-label'    // #ffd700 14px font-weight:900 "涅槃重生!"
  | 'passive-num'   // #7dffb3 16px "+5ATK" / "+9🪙"
  | 'debuff-label'  // #ff9f43 14px "🔥灼烧+☠️削减"
  | 'dot-dmg'       // #4dabf7 18px 灼烧 DoT tick (魔法伤害色, 走伤害弹跳 dot 行)
  | 'dot-poison'    // #4dabf7 18px 中毒 DoT tick (魔法伤害色)
  | 'dot-bleed'     // #ff4444 18px 流血 DoT tick (物理伤害色)
  | 'dot-curse'     // #ffffff 18px 诅咒 DoT tick (真实伤害色)
  | 'counter-dmg'   // #ffd93d 20px 反伤
  | 'death-explode' // #ff2222 24px 死亡爆炸
  | 'bubble-num'    // #4cc9f0 18px 泡泡存储
  | 'bubble-burst'  // #ff9f43 22px 泡泡破裂
  | 'dodge-num'     // #a0e8ff 16px italic "闪避!"
  // ── Phaser 内部惯用名 (映射到 JS 等价 cls) ──
  | 'heal'          // alias of heal-num
  | 'shield-gain'   // alias of shield-num
  | 'crit'          // alias of crit-dmg (default crit)
  | 'miss'          // alias of dodge-num
  ;

// ── Sprite 帧定义 ────────────────────────────────────────
export interface SpriteFrame {
  frames: number;
  frameW: number;
  frameH: number;
  duration?: number;     // 一轮 idle 总毫秒数
  src?: string;          // (extraSprites 用)
  fps?: number;
  loop?: boolean;
  airborneMs?: number;   // knockup 等动画的悬空时长
  [k: string]: unknown;
}

// ── 技能 ─────────────────────────────────────────────────
// 旧版 schema 完整保留, 不重命名字段。
export interface SkillDef {
  name: string;
  type: string;             // 派发 key, 对应 SKILL_HANDLERS[type]
  hits?: number;            // 被动技能可缺省
  power?: number;           // legacy, 已弃用
  pierce?: number;          // legacy
  cd?: number;              // 被动技能可缺省
  atkScale?: number;        // 主伤害公式: atkScale × ATK
  totalScale?: number;      // 多段命中合计倍率 (shell 系列用)
  dmgType?: DamageType;
  passiveSkill?: boolean;   // true = 不占技能槽, 始终生效
  brief?: string;           // codex 简介
  detail?: string;          // 完整描述, 含 {N:expr}/{M:expr}/{H:expr} 模板
  targets?: 'enemies' | 'allies' | 'self';
  splashAdjacent?: number;
  isolatedBonus?: number;
  // 自由其他字段 (各技能特有)
  [k: string]: unknown;
}

// ── 被动 ─────────────────────────────────────────────────
export interface PassiveDef {
  type: string;             // 各 passive type 字面量, ui-anim PASSIVE_ICONS 注册过
  name?: string;
  desc?: string;
  // 通用参数
  awakenTurn?: number;
  atkPct?: number; defPct?: number; mrPct?: number; hpPct?: number;
  lifestealPct?: number; reflectPct?: number;
  critGain?: number; overflowMult?: number;
  energyStore?: boolean; energyReleaseTurn?: number;
  // 各 passive 自由扩展
  [k: string]: unknown;
}

// ── 龟 ───────────────────────────────────────────────────
export interface PetDef {
  id: string;
  name: string;
  emoji?: string;
  rarity: Rarity;
  // 基础属性 (flat, 不嵌套)
  hp: number;
  atk: number;
  def: number;
  mr?: number;
  crit?: number;            // 0–1
  // 资产
  img?: string;             // 静态图 (回退用), Phaser 端要去掉 "../../" 前缀
  sprite?: SpriteFrame;     // idle 动画 sheet 元数据
  attackAnim?: SpriteFrame;
  hurtAnim?: SpriteFrame;
  deathAnim?: SpriteFrame;
  knockupAnim?: SpriteFrame;
  runAnim?: SpriteFrame;
  extraSprites?: SpriteFrame[];
  // 战斗
  passive?: PassiveDef | null;
  skillPool: SkillDef[];    // 5 个候选
  defaultSkills?: number[]; // 默认勾选的 index, 一般 [0,1,2]
  skills?: SkillDef[];      // legacy, 已被 skillPool 替代
  // codex / metadata
  tags?: string[];
  [k: string]: unknown;
}

// ── 装备 ─────────────────────────────────────────────────
// 旧版 equipment 是闭包 (apply(f) 直接改 fighter), 不是纯数据。
// 这里保留 apply 字段, 由 src/data/equipment.ts 提供实现。
export interface EquipmentDef {
  id: string;
  name: string;
  icon?: string;
  category: EquipCategory;
  unique?: boolean;         // 默认 true, 第二次拿触发 refund heal
  desc?: string;
  apply: (f: Fighter) => void;
  [k: string]: unknown;
}

// ── Buff / 状态 ──────────────────────────────────────────
export interface Buff {
  type: string;             // 'dodge' | 'shield' | 'burn' | 'curse' | 'poison' | 'bleed' | 'chilled' …
  value: number;
  duration: number;         // 回合数, -1 永久
  source?: string;
  stack?: number;
  [k: string]: unknown;
}

// ── Fighter (运行时实例) ─────────────────────────────────
// 跟旧版 createFighter 输出对齐, 50+ 字段, 用 [k]: unknown 兜底自由扩展。
export interface Fighter {
  // 身份
  id: string;
  name: string;
  emoji?: string;
  rarity: Rarity;
  side: 'left' | 'right';
  img?: string;
  sprite: SpriteFrame | null;
  _level: number;           // 1-10
  _equippedIdxs: number[];

  // 战斗数值
  maxHp: number;
  hp: number;
  shield: number;
  baseAtk: number; baseDef: number; baseMr: number;
  atk: number; def: number; mr: number;
  crit: number;
  armorPen: number; armorPenPct: number;
  magicPen: number; magicPenPct: number;

  // 被动 / 技能
  passive: PassiveDef | null;
  passiveUsedThisTurn: boolean;
  skills: Array<SkillDef & { cdLeft: number }>;
  _passiveSkills: SkillDef[];

  // 状态
  alive: boolean;
  buffs: Buff[];
  tags: string[];
  _position: 'front' | 'back';
  _slotKey?: string;            // v0.9.5.A46: 'front-0'..'back-2' for adjacency
  _statsDirty: boolean;

  // 装备
  equipment: EquipmentDef[];

  // pet-specific accumulators (旧版 50+ 字段都走这里)
  [k: string]: unknown;
}

// ── 战斗结果 ─────────────────────────────────────────────
export interface DamageResult {
  hpLoss: number;
  shieldAbs: number;
  finalDmg: number;
  isCrit?: boolean;
  isDodge?: boolean;
}

// ── Bus 事件类型 ─────────────────────────────────────────
export interface BusEvents {
  'damage:dealt': {
    source: Fighter | null;
    target: Fighter;
    amount: number;
    type: DamageType;
    isPierce: boolean;
    hpLoss: number;
    shieldAbs: number;
    isReflect?: boolean;
  };
  'damage:visual': {
    target: Fighter;
    amount: number;
    via?: string;             // VISUAL_REGISTRY key
    atkSide?: 'left' | 'right';
    dx?: number; dy?: number;
    customText?: string;
    floatCls?: FloatCls;
    suppressHpBar?: boolean;
    suppressSfx?: boolean;
  };
  'heal:visual': {
    target: Fighter;
    amount: number;
    via?: string;
    suppressSfx?: boolean;
  };
  'fighter:died': { fighter: Fighter; killer: Fighter | null };
  'fighter:revived': { fighter: Fighter };
  'battle:state-change': { from: string; to: string; ts: number; context?: unknown };
  // P17: battle-stats 更新通知 — dmg-stats-panel 订阅实时刷新 (JS stats_tracker.js:33)
  'stats:updated': { kind: 'damage' | 'heal' | 'shield' | 'kill' };
}
