// ══════════════════════════════════════════════════════════
// skill-text.ts — v0.9.4.A 技能描述模板渲染器 (TS port of ui-skill-text.js)
//
// 模板语法 (来自 JS 版 pets.js):
//   {N:expr}  → 算 expr, val-normal 物理 (橙)
//   {P:expr}  → val-pierce 穿透 (白光)
//   {S:expr}  → val-shield 护盾 (浅白)
//   {H:expr}  → val-heal 治疗 (绿)
//   {B:expr}  → val-buff 增益 (浅绿)
//   {D:expr}  → val-def 防御 (黄)
//   {M:expr}  → val-magic 法术 (蓝)
//   {T:expr}  → val-true 真实 (白)
//   {expr}    → 计算但不上色 (e.g. {cd}, {ATK})
//
// 输出仍是 HTML, 由 Phaser 端的 renderRichText 解析渲染。
// ══════════════════════════════════════════════════════════

const COLOR_MAP: Record<string, string> = {
  N: 'val-normal', P: 'val-pierce', S: 'val-shield',
  H: 'val-heal',   B: 'val-buff',   D: 'val-def',
  M: 'val-magic',  T: 'val-true',
};

/** val-* CSS class → Phaser tint hex (来自 JS 版 battle.css) */
export const VAL_CSS_HEX: Record<string, string> = {
  'val-normal':       '#ff6b6b',
  'val-magic':        '#4dabf7',
  'val-true':         '#ffffff',
  'val-pierce':       '#ffffff',
  'val-shield':       '#e0e0e0',
  'val-heal':         '#06d6a0',
  'val-buff':         '#7dffb3',
  'val-def':          '#ffd93d',
  'val-extra':        '#ffcc00',
  'val-burn':         '#ff6600',
  'val-lifesteal':    '#e85d75',
  'val-dot':          '#9b59b6',
  'val-stun':         '#fbbf24',
  'val-crit':         '#ff6b6b',
  'val-crit-dmg':     '#ffaa33',
  'val-reflect':      '#94a3b8',
  'val-heal-reduce':  '#a78bfa',
  'val-atk':          '#ff6b6b',   // alias (pets.js 旧版用 val-atk)
};

export interface SkillCtx {
  atk: number; def: number; mr: number; maxHp: number;
  crit?: number;
  [k: string]: number | undefined;
}

/** 安全计算 (只允许数字 + 运算符) */
export function evalSkillExpr(expr: string, vars: Record<string, number>): number | string {
  try {
    const safe = expr.replace(/[A-Za-z_][A-Za-z0-9_]*/g, name => {
      if (Object.prototype.hasOwnProperty.call(vars, name)) return String(vars[name]);
      return name;
    });
    if (/^[\d\s+\-*/().~]+$/.test(safe)) {
      const result = Function('"use strict"; return (' + safe + ')')();
      return typeof result === 'number' ? Math.round(result) : result;
    }
    return safe;
  } catch {
    return expr;
  }
}

/** 检查 chest 龟是否带有指定 chest equip ('rock'/'star'/'thunder'/...) */
function hasChestEquip(f: SkillCtx & { _chestEquips?: Array<{ name?: string }> }, name: string): boolean {
  return Array.isArray(f._chestEquips) && f._chestEquips.some(e => e.name === name);
}

/** 把 PetDef stats + skill 拼成 vars 上下文 */
export function buildSkillVars(f: SkillCtx, s: Record<string, unknown>): Record<string, number> {
  const n = (k: string, fallback = 0) => (typeof s[k] === 'number' ? s[k] as number : fallback);
  const obj = (k: string) => (typeof s[k] === 'object' && s[k]) ? (s[k] as Record<string, number>) : {};
  // E2/7: JS ui-skill-text.js:40-72 — dynamic state vars (chest/drone/hunter/lava 等)
  const fAny = f as SkillCtx & {
    _goldCoins?: number; _drones?: unknown[]; _bambooGainedHp?: number;
    _stoneDefGained?: number; _lavaTransformTurns?: number; _initDef?: number; baseDef?: number;
    _hunterKills?: number; _hunterStolenAtk?: number; _hunterStolenDef?: number;
    _hunterStolenMr?: number; _hunterStolenHp?: number;
    _resilienceDefGain?: number; _resilienceMrGain?: number;
    _lifestealPct?: number;
    passive?: { droneCount?: number; mechHpPer?: number; mechAtkPer?: number; stackMax?: number; maxStacks?: number; pctPerStack?: number; atkPct?: number; defPct?: number; defBuffAmp?: number; capTurns?: number; maxDefInitPct?: number };
  };
  const droneN = fAny._drones?.length ?? fAny.passive?.droneCount ?? 0;
  return {
    ATK: f.atk, DEF: f.def, MR: f.mr, HP: f.maxHp,
    LV: (f as SkillCtx & { lv?: number }).lv ?? 1,   // 当前等级 (模板可写 {N:3+0.2*LV} 等随等级实时算)
    hits: n('hits', 1), power: n('power'), pierce: n('pierce'), cd: n('cd'),
    atkScale: n('atkScale'), defScale: n('defScale'), dmgScale: n('dmgScale'),
    hpPct: n('hpPct'), mrScale: n('mrScale'), arrowScale: n('arrowScale'),
    shieldScale: n('shieldScale'), trapScale: n('trapScale'),
    burstScale: n('burstScale'), counterScale: n('counterScale'),
    shieldHpPct: n('shieldHpPct'), shieldDuration: n('shieldDuration'),
    shieldHealPct: n('shieldHealPct'), shieldBreak: n('shieldBreak'),
    burnAtkScale: n('burnAtkScale'), burnHpPct: n('burnHpPct'), burnTurns: n('burnTurns'),
    execThresh: n('execThresh'), execCrit: n('execCrit'), execCritDmg: n('execCritDmg'),
    fearTurns: n('fearTurns'), fearReduction: n('fearReduction'),
    splashPct: n('splashPct'), duration: n('duration'),
    atkUpPct: n('atkUpPct'), atkUpTurns: n('atkUpTurns'),
    bindPct: n('bindPct'), dodgePct: n('dodgePct'), dodgeTurns: n('dodgeTurns'),
    minScale: n('minScale'), maxScale: n('maxScale'),
    healPct: n('healPct'), heal: n('heal'), shield: n('shield'),
    crit: f.crit ?? 0.25,
    armorBreakPct: obj('armorBreak').pct ?? 0, armorBreakTurns: obj('armorBreak').turns ?? 0,
    atkDownPct: obj('atkDown').pct ?? 0, atkDownTurns: obj('atkDown').turns ?? 0,
    defDownPct: obj('defDown').pct ?? 0, defDownTurns: obj('defDown').turns ?? 0,
    defUpVal: obj('defUp').val ?? 0, defUpTurns: obj('defUp').turns ?? 0,
    defUpPctVal: obj('defUpPct').pct ?? 0, defUpPctTurns: obj('defUpPct').turns ?? 0,
    hotPerTurn: obj('hot').hpPerTurn ?? 0, hotTurns: obj('hot').turns ?? 0,
    shieldFlat: n('shieldFlat'), shieldHpPctVal: n('shieldHpPct'),
    totalScale: n('totalScale'), shieldTurns: n('shieldTurns'),
    defBoostTurns: n('defBoostTurns'), stunAfter: n('stunAfter'),
    transferPct: n('transferPct'),
    // E2/7: dynamic state (JS ui-skill-text.js:40-72)
    goldCoins: fAny._goldCoins ?? 0,
    droneCount: droneN,
    mechHp: droneN * (fAny.passive?.mechHpPer ?? 30),
    mechAtk: droneN * (fAny.passive?.mechAtkPer ?? 5),
    bambooGainedHp: fAny._bambooGainedHp ?? 0,
    stoneDefGained: fAny._stoneDefGained ?? 0,
    // 石头龟坚壁: 开局护甲 + 上限/每回合 公式所需 (initDef × maxDefInitPct% 为上限, ÷capTurns 为每回合)
    initDef: fAny._initDef ?? fAny.baseDef ?? f.def,
    capTurns: fAny.passive?.capTurns ?? 0,
    maxDefInitPct: fAny.passive?.maxDefInitPct ?? 0,
    lavaTransformTurns: fAny._lavaTransformTurns ?? 0,
    hunterKills: fAny._hunterKills ?? 0,
    hunterStolenAtk: fAny._hunterStolenAtk ?? 0,
    hunterStolenDef: fAny._hunterStolenDef ?? 0,
    hunterStolenHp: fAny._hunterStolenHp ?? 0,
    hunterStolenMr: fAny._hunterStolenMr ?? 0,
    resilienceDef: fAny._resilienceDefGain ?? 0,
    resilienceMr: fAny._resilienceMrGain ?? 0,
    lifesteal: fAny._lifestealPct ?? 0,
    stackMax: n('stackMax') || fAny.passive?.stackMax || 0,
    maxStacks: n('maxStacks') || fAny.passive?.maxStacks || 0,
    pctPerStack: n('pctPerStack') || fAny.passive?.pctPerStack || 0,
    atkPct: n('atkPct') || fAny.passive?.atkPct || 0,
    defPct: n('defPct') || fAny.passive?.defPct || 0,
    defBuffAmp: n('defBuffAmp') || fAny.passive?.defBuffAmp || 0,
    perCoinPierce: n('perCoinAtkPierce'),
    perCoinNormal: n('perCoinAtkNormal'),
  };
}

/** _chestSmashBrief_ 占位符的动态构建 (JS ui-skill-text.js:183-189) */
function buildChestSmashBrief(f: SkillCtx, s: Record<string, unknown>): string {
  const atkScale = (s.atkScale as number) ?? 1;
  let total = Math.round(f.atk * atkScale);
  const fc = f as SkillCtx & { _chestEquips?: Array<{ name?: string }> };
  if (hasChestEquip(fc, 'rock')) total += f.def + f.mr;
  const dmgType = hasChestEquip(fc, 'star') ? '真实伤害' : '物理伤害';
  const hits = (s.hits as number) ?? 3;
  return `宝箱龟砸击敌方${hits}段, 共 (<span class="val-normal">${total}</span>) ${dmgType}`;
}

/** 主入口: 把模板字符串 (含 `{N:0.7*ATK}` 等占位符 + 关键词) 转 HTML */
export function renderSkillTemplate(template: string, f: SkillCtx, s: Record<string, unknown>): string {
  if (!template) return '';
  // E2/7: 动态占位符 (JS ui-skill-text.js:20-21) — 跟 chest equips 动态展开
  if (template === '_chestSmashBrief_') return buildChestSmashBrief(f, s);
  if (template === '_chestSmashDetail_') return buildChestSmashBrief(f, s);
  const vars = buildSkillVars(f, s);

  let result = template.replace(/\{([NPHSBDMT]):([^}]+)\}|\{([^}]+)\}/g, (_match, color, expr, plainExpr) => {
    const e = expr || plainExpr;
    const val = evalSkillExpr(e, vars);
    if (color && COLOR_MAP[color]) {
      return `<span class="${COLOR_MAP[color]}">${val}</span>`;
    }
    return String(val);
  });

  // Auto-color 关键词 (照搬 JS ui-skill-text.js:107-136)
  result = result.replace(/物理伤害/g, '<span class="val-normal">物理伤害</span>');
  result = result.replace(/魔法伤害/g, '<span class="val-magic">魔法伤害</span>');
  result = result.replace(/真实伤害/g, '<span class="val-true">真实伤害</span>');
  result = result.replace(/(?<!">)真实(?!伤害|<)/g, '<span class="val-true">真实</span>');
  result = result.replace(/(?<!">)物理(?!伤害|<)/g, '<span class="val-normal">物理</span>');
  result = result.replace(/(?<!">)魔法(?!伤害|<)/g, '<span class="val-magic">魔法</span>');
  result = result.replace(/防御力加成/g, '<span class="val-def">防御力加成</span>');
  result = result.replace(/(?<!">)攻击力(?!<)/g, '<span class="val-normal">攻击力</span>');
  result = result.replace(/(?<!">)护甲穿透(?!<)/g, '<span class="val-def">护甲穿透</span>');  // 整词上色, 防"护甲"被单独挑出
  result = result.replace(/(?<!">)护甲(?!穿透|<)/g, '<span class="val-def">护甲</span>');
  result = result.replace(/(?<!">)魔抗(?!<)/g, '<span class="val-magic">魔抗</span>');
  result = result.replace(/(?<!">)最大生命值(?!<)/g, '<span class="val-heal">最大生命值</span>');
  result = result.replace(/(?<!">)最大HP(?!<)/g, '<span class="val-heal">最大HP</span>');
  result = result.replace(/(?<!">)治疗削减(?!<)/g, '<span class="val-heal-reduce">治疗削减</span>');
  result = result.replace(/(?<!">)灼烧(?!<)/g, '<span class="val-burn">灼烧</span>');
  result = result.replace(/(?<!">)生命偷取(?!<)/g, '<span class="val-lifesteal">生命偷取</span>');
  result = result.replace(/(?<!">)生命偷取(?!<)/g, '<span class="val-lifesteal">生命偷取</span>');
  result = result.replace(/(?<!">)眩晕(?!<)/g, '<span class="val-stun">眩晕</span>');
  result = result.replace(/(?<!">)诅咒(?!<)/g, '<span class="val-dot">诅咒</span>');
  result = result.replace(/(?<!">)护盾(?!<)/g, '<span class="val-shield">护盾</span>');
  result = result.replace(/(?<!">)中毒(?!<)/g, '<span class="val-dot">中毒</span>');
  result = result.replace(/(?<!">)流血(?!<)/g, '<span class="val-lifesteal">流血</span>');
  result = result.replace(/(?<!">)冰寒(?!<)/g, '<span class="val-magic">冰寒</span>');
  result = result.replace(/(?<!">)反伤(?!<)/g, '<span class="val-reflect">反伤</span>');
  result = result.replace(/(?<!">)暴击率(?!<)/g, '<span class="val-crit">暴击率</span>');
  result = result.replace(/(?<!">)暴击伤害(?!<)/g, '<span class="val-crit-dmg">暴击伤害</span>');
  result = result.replace(/(?<!">)额外伤害(?!<)/g, '<span class="val-extra">额外伤害</span>');

  return result;
}

/** 解析 HTML segment, 给 Phaser 渲染用 */
export interface RichSegment {
  text: string;
  color?: string;   // hex, undefined = 默认色
  bold?: boolean;
  newline?: boolean;
}

/** 把 renderSkillTemplate 输出的 HTML 拆成 RichSegment[] (\n 也拆) */
export function parseRichText(html: string): RichSegment[] {
  const out: RichSegment[] = [];
  // 先把 <br> / \n 统一标记
  const norm = html.replace(/<br\s*\/?>/g, '\n');
  // 用 regex 分段: <span class="val-X">text</span> 或 <span style="color:#XXX">text</span> 或 纯文本
  const re = /<span\s+(?:class="([^"]+)"|style="color:\s*(#[0-9a-fA-F]+)[^"]*")[^>]*>([^<]*)<\/span>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm)) !== null) {
    const [, cls, inlineColor, innerText, plain] = m;
    if (cls && innerText) {
      // val-* class → hex
      const hex = VAL_CSS_HEX[cls] ?? '#ffffff';
      pushSegments(out, innerText, hex, true);
    } else if (inlineColor && innerText) {
      pushSegments(out, innerText, inlineColor, true);
    } else if (plain) {
      pushSegments(out, plain, undefined, false);
    }
  }
  return out;
}

function pushSegments(out: RichSegment[], text: string, color: string | undefined, bold: boolean) {
  // 按 \n 拆行 (newline 段单独 mark)
  const parts = text.split('\n');
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) out.push({ text: parts[i], color, bold });
    if (i < parts.length - 1) out.push({ text: '', newline: true });
  }
}
