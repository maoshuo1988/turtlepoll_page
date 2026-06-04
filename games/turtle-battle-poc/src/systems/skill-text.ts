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

/** 阿拉伯数字 → 中文(段/回合计数, 0-10) */
function cnNum(n: number): string {
  return ['零', '一', '两', '三', '四', '五', '六', '七', '八', '九', '十'][n] ?? String(n);
}

/** 把 PetDef stats + skill 拼成 vars 上下文 */
export function buildSkillVars(f: SkillCtx, s: Record<string, unknown>): Record<string, number> {
  const n = (k: string, fallback = 0) => (typeof s[k] === 'number' ? s[k] as number : fallback);
  const obj = (k: string) => (typeof s[k] === 'object' && s[k]) ? (s[k] as Record<string, number>) : {};
  // E2/7: JS ui-skill-text.js:40-72 — dynamic state vars (chest/drone/hunter/lava 等)
  const fAny = f as SkillCtx & {
    _goldCoins?: number; _drones?: unknown[]; _bambooGainedHp?: number;
    _stoneDefGained?: number; _rockLayers?: number; _lavaTransformTurns?: number; _initDef?: number; baseDef?: number;
    _hunterKills?: number; _hunterStolenAtk?: number; _hunterStolenDef?: number;
    _hunterStolenMr?: number; _hunterStolenHp?: number;
    _twoHeadResStacks?: number;
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
    rockLayers: fAny._rockLayers ?? 0,   // 磐石之躯 岩层层数 (实时, 岩石冲击波伤害 ×(1+0.04×rockLayers))
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
    // #8 M4: 面板 token 改读真实叠层字段 _twoHeadResStacks (每层 +1甲+1抗); 旧 _resilienceDefGain 是死字段恒0
    resilienceDef: fAny._twoHeadResStacks ?? 0,
    resilienceMr: fAny._twoHeadResStacks ?? 0,
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

/** 「宝箱砸击」动态占位符 — 随当前已开出的宝箱装备实时变化:
 *    神奇石头(rock): 伤害额外加 100%护甲 + 100%魔抗
 *    星辉(star): 物理 → 真实伤害
 *    锁链(chain) / 雷刃(thunder): detail 追加灰字说明
 *  读 _chestEquipRock/Star/Chain/Thunder (战斗 source of truth; 选龟/图鉴无 flag → 基础)。
 *  早返回, 不走自动上色, 故 span 全部自建。 */
export function buildChestSmashBrief(
  f: SkillCtx & { _chestEquipRock?: boolean; _chestEquipStar?: boolean; _chestEquipChain?: boolean; _chestEquipThunder?: boolean },
  s: Record<string, unknown>,
  withFormula: boolean,
): string {
  const hits = (s.hits as number) ?? 3;
  const atkScale = (s.atkScale as number) ?? 1.5;
  const hasRock = !!f._chestEquipRock;
  const hasStar = !!f._chestEquipStar;
  const hasChain = !!f._chestEquipChain;
  const hasThunder = !!f._chestEquipThunder;
  let base = Math.round(f.atk * atkScale);
  if (hasRock) base += f.def + (f.mr ?? f.def);
  const cls = hasStar ? 'val-true' : 'val-normal';
  const word = hasStar ? '真实伤害' : '物理伤害';
  const num = `<span class="${cls}">${base}</span>`;
  const atkSpan = '<span class="val-normal">攻击力</span>';
  const rockExp = hasRock
    ? ' + 100%<span class="val-def">护甲</span> + 100%<span class="val-magic">魔抗</span>'
    : '';
  const exp = withFormula ? `${Math.round(atkScale * 100)}%×${atkSpan}(${f.atk})${rockExp} = ` : '';
  let out = `宝箱龟抡起宝箱砸击目标${cnNum(hits)}段，共造成（${exp}${num}）<span class="${cls}">${word}</span>`;
  if (withFormula) {
    out += '。';
    const notes: string[] = [];
    if (hasChain) notes.push('锁链：每次命中额外对随机一名其他敌人造成 25% 伤害');
    if (hasThunder) notes.push(`雷刃：命中叠 1 层金闪电，满 5 层引爆（100%${atkSpan}）<span class="val-true">真实伤害</span>`);
    if (notes.length) out += `\n\n<span style="color:#8a93a0">${notes.join('；')}。</span>`;
  }
  return out;
}

/** 线条龟「画龙点睛」动态占位符 — 装备速写 (_inkCapOverride=7 / _inkTrueDmg) 时
 *  墨迹上限 5→7 且引爆伤害魔法→真实, 数值与颜色随当前 build 实时计算。
 *  无速写 (含选龟/图鉴预览, fakeFighter 无 flag) → 默认 5 层 / 魔法。
 *  早返回, 不走 renderSkillTemplate 末尾的关键词自动上色, 故 span 全部自建。 */
export function buildLineFinish(
  f: SkillCtx & { _inkCapOverride?: number; _inkTrueDmg?: boolean },
  s: Record<string, unknown>,
  withFormula: boolean,
): string {
  const baseScale = (s.baseScale as number) ?? 0.7;
  const perStackScale = (s.perStackScale as number) ?? 0.45;
  const inkCap = f._inkCapOverride ?? 5;
  const isTrue = !!f._inkTrueDmg;
  const base = Math.round(f.atk * baseScale);
  const perStack = Math.round(f.atk * perStackScale);
  const maxMagic = Math.round(f.atk * perStackScale * inkCap);
  const cls = isTrue ? 'val-true' : 'val-magic';
  const word = isTrue ? '真实伤害' : '魔法伤害';
  const N = (v: number) => `<span class="val-normal">${v}</span>`;
  const T = (v: number) => `<span class="${cls}">${v}</span>`;
  const phys = '<span class="val-normal">物理伤害</span>';
  const typeWord = `<span class="${cls}">${word}</span>`;
  const atk = `<span class="val-normal">攻击力</span>`;
  const baseExp = withFormula ? `${Math.round(baseScale * 100)}%×${atk}(${f.atk}) = ` : '';
  const perExp = withFormula ? `${Math.round(perStackScale * 100)}%×${atk}(${f.atk}) = ` : '';
  const perLead = withFormula ? '每层墨迹额外造成' : '每层额外造成';
  const killReset = '<span class="val-atk">击杀目标则此技能CD重置</span>';
  const gray = withFormula
    ? '\n\n<span style="color:#8a93a0">速写后墨迹上限提升至7层，引爆伤害转为真实伤害。</span>'
    : '';
  return `线条龟完成最后一笔，引爆目标所有墨迹：造成（${baseExp}${N(base)}）${phys}，${perLead}（${perExp}${T(perStack)}）${typeWord}。最大伤害为（${N(base)}）${phys} 和（${T(maxMagic)}）${typeWord}，引爆后清除目标所有墨迹。${killReset}${gray}`;
}

/** 主入口: 把模板字符串 (含 `{N:0.7*ATK}` 等占位符 + 关键词) 转 HTML */
export function renderSkillTemplate(template: string, f: SkillCtx, s: Record<string, unknown>): string {
  if (!template) return '';
  // E2/7: 动态占位符 (JS ui-skill-text.js:20-21) — 跟 chest equips 动态展开
  if (template === '_chestSmashBrief_') return buildChestSmashBrief(f, s, false);
  if (template === '_chestSmashDetail_') return buildChestSmashBrief(f, s, true);
  if (template === '_lineFinishBrief_') return buildLineFinish(f, s, false);
  if (template === '_lineFinishDetail_') return buildLineFinish(f, s, true);
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
