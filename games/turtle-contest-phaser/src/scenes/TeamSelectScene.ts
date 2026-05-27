// ══════════════════════════════════════════════════════════
// TeamSelectScene — 选龟组队: 左侧 28 龟网格, 右侧 3v3 编队槽
// 点龟入空槽; 点槽清空; localStorage 记忆上次阵容
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import type { PetDef, Rarity } from '../types';
import { ALL_PETS } from '../data/pets';
import { PASSIVE_ICONS } from '../data/passive-icons';
import { BATTLE_RULES, type BattleRule } from '../data/rules';
import { calcActiveSynergies, SYNERGY_TAGS } from '../data/synergies';
import type { Fighter } from '../types';
import { addDomText, addDomImage } from '../systems/dom-text';

const RARITY_COLOR: Record<Rarity, number> = {
  C: 0x06d6a0, B: 0x4cc9f0, A: 0x3a9abf, S: 0xc77dff, SS: 0xffd93d, SSS: 0xff6b6b,
};
const RARITY_COLOR_STR: Record<Rarity, string> = {
  C: '#06d6a0', B: '#4cc9f0', A: '#3a9abf', S: '#c77dff', SS: '#ffd93d', SSS: '#ff6b6b',
};

const LS_KEY = 'turtle-poc-team-v4';  // v0.9.5.A45 改 3v3 (JS 对齐): 6 槽位但只需 3 龟
const LS_LOADOUT = 'turtle-poc-loadout-v1';  // P2.1 每只龟的 3/5 技能选择 (Record<petId, number[]>)
const SLOT_COUNT = 6;   // 6 个槽位 (3 前排 + 3 后排), 玩家放 3 只龟到任意 3 格
const FRONT_SLOTS = 3;   // 前 3 个 idx 是 front, 后 3 个是 back
const REQUIRED_PETS = 3; // v0.9.5.A45: JS 对齐 — 必须 3 只龟 (不是 6)
const SLOT_KEYS = ['front-0', 'front-1', 'front-2', 'back-0', 'back-1', 'back-2'] as const;
export type SlotKey = typeof SLOT_KEYS[number];

// E3/34: MODE_GUIDES 跟 JS main.js:184-233 1:1 (6 模式, 各自 icon + title + tips[])
const MODE_GUIDES: Record<string, { icon: string; title: string; tips: string[] }> = {
  pve: {
    icon: '🌿', title: '普通对战',
    tips: [
      '请选择3只乌龟组成队伍，对战敌方野生乌龟队伍',
      '前排乌龟优先作为被选择目标，只有过了前排才可以选择后排作为目标',
      '先手方首回合只能行动2只龟以平衡先手优势',
    ],
  },
  boss: {
    icon: '👑', title: 'Boss挑战',
    tips: ['选择3只龟挑战1只超强Boss', 'Boss每回合行动3次'],
  },
  'boss-pick': {
    icon: '🎯', title: '指定Boss',
    tips: ['先选3只我方上场龟，下一步可指定任一只龟作为Boss', 'Boss每回合行动3次，自定义Boss技能'],
  },
  test: {
    icon: '🎯', title: '测试模式',
    tips: ['右上角可切换地图与战场背景', '对面是6个2000HP假人，不还手；用于测试技能、装备与召唤'],
  },
  dungeon: {
    icon: '🏰', title: '深海闯关',
    tips: ['选择3只龟，自由摆放前排 / 后排（无替补）', '5层连续闯关：每关通关三选一增益；存活龟下关回满血，阵亡龟以70%血复活'],
  },
  // E3/35 (Wave 1): 删 'custom' (自创不在 JS) — 野生对局 走 'pve' 跟 JS 1:1
  // E3/35: 加 pvp-online (JS main.js:226-232 1:1)
  'pvp-online': {
    icon: '🌐', title: '在线对战',
    tips: ['与真人玩家实时对战，每回合限时3分钟'],
  },
};

// E3/34: 读宠物等级 (JS fighter.js:7 getPetLevel 1:1)
//   localStorage petState.levels[petId] || 1
function getPetLevel(petId: string): number {
  try {
    const ps = JSON.parse(localStorage.getItem('petState') || '{}');
    return (ps.levels && ps.levels[petId]) || 1;
  } catch { return 1; }
}

// E3/34: rarity 排序顺序 (JS main.js:263 RARITY_ORDER 1:1)
const RARITY_ORDER: Rarity[] = ['SSS', 'SS', 'S', 'A', 'B', 'C'];

// JS ui-anim.js:85-141 buildPetImgHTML 1:1
// 三档:
//   1) pet.sprite + pet.img → spritesheet 横扫帧动画 (e.g. 石头龟v1.png 是 sheet)
//   2) pet.img 无 sprite     → 静态 <img src=pet.img> (e.g. 寒冰龟.png 是单帧)
//   3) 都没                  → emoji fallback
// 旧 bug: 第 2 档我误用 /avatars/<id>.png — JS 没有那个路径, 应直接用 pet.img.
const _spriteKFInstalled = new Set<string>();
function buildPetImgHTML(pet: PetDef, size: number): string {
  if (pet.sprite && pet.img) {
    const s = pet.sprite;
    const sc = size / s.frameH;
    const fw = Math.round(s.frameW * sc);
    const tw = Math.round(s.frameW * s.frames * sc);
    const lastFw = (s.frames - 1) * fw;
    const kfName = `pocSprKF_${pet.id}_${size}_v${lastFw}`;
    if (!_spriteKFInstalled.has(kfName)) {
      const st = document.createElement('style');
      st.textContent = `@keyframes ${kfName}{from{background-position:0 0}to{background-position:-${lastFw}px 0}}`;
      document.head.appendChild(st);
      _spriteKFInstalled.add(kfName);
    }
    const duration = s.duration ?? 800;
    // JS ui-anim.js:130-135 1:1 — wrap position:relative + inner spritesheet
    // 关键: steps(N, jump-none) 不是 steps(N) (默认 jump-end), JS 用 jump-none
    // 让 N 帧均匀分布在 [0, lastFw], 否则末尾会 "跳一帧" 看着像两只龟叠.
    return `<div class="sprite-wrap" style="width:${fw}px;height:${size}px;position:relative">
      <div class="sprite-inner" style="width:${fw}px;height:${size}px;
        background-image:url('${pet.img}');background-size:${tw}px ${size}px;background-repeat:no-repeat;
        animation:${kfName} ${duration}ms steps(${s.frames}, jump-none) infinite"></div>
    </div>`;
  }
  if (pet.img) {
    // JS ui-anim.js:137-139 1:1 — 整张 img object-fit:contain
    return `<img src="${pet.img}" alt="${pet.name}" loading="lazy" style="width:${size}px;height:${size}px;object-fit:contain">`;
  }
  // JS ui-anim.js:140 1:1 — emoji fallback
  const emojiSize = Math.round(size * 0.75);
  return `<span style="font-size:${emojiSize}px;line-height:1">${pet.emoji ?? '🐢'}</span>`;
}

// E3/36 Wave 2 (g): 特殊占位 mark — JS main.js:584/602/627 1:1
// 缩头乌龟 hiding → SUMMON_MARK / 水晶龟 crystal + crystalBall 强化 → CRYSTAL_BALL_MARK
// 糖果龟 candy + candyBombPassive → CANDY_BOMB_MARK
export const SUMMON_MARK = '_summon';
export const CRYSTAL_BALL_MARK = '_crystal-ball';
export const CANDY_BOMB_MARK = '_candy-bomb';
function isSpecialSlotMark(id: string | null): id is string {
  return id === SUMMON_MARK || id === CRYSTAL_BALL_MARK || id === CANDY_BOMB_MARK;
}

// E3/36 Wave 2 (b): 上次阵容 持久化 (JS main.js:1027-1038 1:1)
interface LastLineup { ids: string[]; slotMap: Record<string, string>; savedAt: number }
function readLastLineup(): LastLineup | null {
  try { return JSON.parse(localStorage.getItem('lastLineup') || 'null'); } catch { return null; }
}
function writeLastLineup(team: Array<string | null>) {
  try {
    const slotMap: Record<string, string> = {};
    const ids: string[] = [];
    for (let i = 0; i < team.length; i++) {
      const id = team[i];
      if (id) { slotMap[SLOT_KEYS[i]] = id; ids.push(id); }
    }
    if (ids.length !== 3) return;  // 只持久化完整阵容 (JS:1035)
    localStorage.setItem('lastLineup', JSON.stringify({ ids, slotMap, savedAt: Date.now() }));
  } catch { /* ignore */ }
}
// E3/34: filter / sort state — JS main.js:264 _petFilter 同款
interface PetFilter { rarity: Rarity | 'all'; sort: 'rarity' | 'level' | 'name'; }

/** 读全队 loadout, 找不到给 [] 让调用方回退 defaultSkills */
function readLoadouts(): Record<string, number[]> {
  try {
    const raw = localStorage.getItem(LS_LOADOUT);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return (obj && typeof obj === 'object') ? obj : {};
  } catch { return {}; }
}
function writeLoadout(petId: string, idxs: number[]) {
  const all = readLoadouts();
  all[petId] = idxs;
  try { localStorage.setItem(LS_LOADOUT, JSON.stringify(all)); } catch { /* ignore */ }
}
export function getLoadout(petId: string): number[] | null {
  const all = readLoadouts();
  return Array.isArray(all[petId]) ? all[petId] : null;
}

// ─── Phase B: PDP helpers — JS fighter.js + ui-skill-text.js 1:1 移植 ────────

// JS fighter.js:24 1:1 — lv1=1.0, lv5=1.20, lv10=1.45
function getLevelBonus(petId: string): number {
  const lv = getPetLevel(petId);
  return 1 + (lv - 1) * 0.05;
}

// JS fighter.js:30 1:1 — 0/1/2 永远开放, 3 需 Lv4, 4 需 Lv7
function getAvailableSkillIndices(petId: string): number[] {
  const lv = getPetLevel(petId);
  const pet = ALL_PETS.find(p => p.id === petId);
  const pool = pet?.skillPool ?? [];
  const idxs: number[] = [];
  for (let i = 0; i < pool.length; i++) {
    if (i <= 2) idxs.push(i);
    else if (i === 3 && lv >= 4) idxs.push(i);
    else if (i === 4 && lv >= 7) idxs.push(i);
  }
  return idxs;
}

// JS ui-skill-text.js:140-159 1:1 evalSkillExpr — safe expr evaluator
// 替换变量名 → 数值, 只允许 [0-9+\-*/(). ] 字符跑 Function constructor
function evalSkillExpr(expr: string, vars: Record<string, number>): number | string {
  try {
    const safe = expr.replace(/[A-Za-z_][A-Za-z0-9_]*/g, name =>
      Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : name
    );
    if (/^[\d\s+\-*/().~]+$/.test(safe)) {
      const result = Function('"use strict"; return (' + safe + ')')();
      return typeof result === 'number' ? Math.round(result) : result;
    }
    return safe;
  } catch { return expr; }
}

// JS ui-skill-text.js:13 1:1 — color tag → CSS class
const SKILL_COLOR_MAP: Record<string, string> = {
  N: 'val-normal', P: 'val-pierce', S: 'val-shield', H: 'val-heal',
  B: 'val-buff', D: 'val-def', M: 'val-magic', T: 'val-true',
};

// JS ui-skill-text.js:15-138 1:1 — 模板 → HTML, 替换 {N:expr}/{ATK} 等占位
// + 自动给"物理伤害/魔法伤害/护甲"等关键词加颜色 span
// fakeFighter 走 fighter shape (atk/def/mr/maxHp/buffs/passive…), passive 取 pet.passive
function renderSkillTemplate(
  template: string | undefined,
  f: { atk: number; def: number; mr: number; maxHp: number; crit?: number; passive?: unknown; _goldCoins?: number; _drones?: unknown[]; _bambooGainedHp?: number; _stoneDefGained?: number; _hunterKills?: number; _hunterStolenAtk?: number; _hunterStolenDef?: number; _hunterStolenHp?: number; _hunterStolenMr?: number; _lifestealPct?: number; _lavaTransformTurns?: number },
  s: Record<string, unknown>,
): string {
  if (!template) return '';
  // JS ui-skill-text.js:20-21 chest dynamic placeholders — PoC 暂用 fallback 显示
  if (template === '_chestSmashBrief_') return '宝箱龟 chestSmash (PoC 暂未渲染细节)';
  if (template === '_chestSmashDetail_') return '宝箱龟 chestSmash (PoC 暂未渲染细节)';
  const passive = (f.passive ?? null) as null | Record<string, unknown>;
  const getNum = (obj: Record<string, unknown> | null, key: string): number => {
    if (!obj) return 0;
    const v = obj[key];
    return typeof v === 'number' ? v : 0;
  };
  // JS ui-skill-text.js:23-72 vars 表 1:1
  const vars: Record<string, number> = {
    ATK: f.atk, DEF: f.def, MR: f.mr || f.def, HP: f.maxHp,
    hits: (s.hits as number) || 1,
    power: (s.power as number) || 0, pierce: (s.pierce as number) || 0, cd: (s.cd as number) || 0,
    atkScale: (s.atkScale as number) || 0, defScale: (s.defScale as number) || 0, dmgScale: (s.dmgScale as number) || 0,
    hpPct: (s.hpPct as number) || 0, mrScale: (s.mrScale as number) || 0, arrowScale: (s.arrowScale as number) || 0,
    shieldScale: (s.shieldScale as number) || 0, trapScale: (s.trapScale as number) || 0,
    burstScale: (s.burstScale as number) || 0, counterScale: (s.counterScale as number) || 0,
    shieldHpPct: (s.shieldHpPct as number) || 0, shieldDuration: (s.shieldDuration as number) || 0,
    shieldHealPct: (s.shieldHealPct as number) || 0, shieldBreak: (s.shieldBreak as number) || 0,
    burnAtkScale: (s.burnAtkScale as number) || 0, burnHpPct: (s.burnHpPct as number) || 0, burnTurns: (s.burnTurns as number) || 0,
    execThresh: (s.execThresh as number) || 0, execCrit: (s.execCrit as number) || 0, execCritDmg: (s.execCritDmg as number) || 0,
    fearTurns: (s.fearTurns as number) || 0, fearReduction: (s.fearReduction as number) || 0,
    splashPct: (s.splashPct as number) || 0, duration: (s.duration as number) || 0,
    atkUpPct: (s.atkUpPct as number) || 0, atkUpTurns: (s.atkUpTurns as number) || 0,
    bindPct: (s.bindPct as number) || 0, dodgePct: (s.dodgePct as number) || 0, dodgeTurns: (s.dodgeTurns as number) || 0,
    minScale: (s.minScale as number) || 0, maxScale: (s.maxScale as number) || 0,
    healPct: (s.healPct as number) || 0, heal: (s.heal as number) || 0, shield: (s.shield as number) || 0,
    perCoinPierce: (s.perCoinAtkPierce as number) || 0, perCoinNormal: (s.perCoinAtkNormal as number) || 0,
    goldCoins: f._goldCoins || 0,
    droneCount: (f._drones?.length ?? getNum(passive, 'droneCount')),
    crit: f.crit || 0.25,
    bambooGainedHp: f._bambooGainedHp || 0,
    stoneDefGained: f._stoneDefGained || 0,
    lavaTransformTurns: f._lavaTransformTurns || 0,
    hunterKills: f._hunterKills || 0,
    hunterStolenAtk: f._hunterStolenAtk || 0,
    hunterStolenDef: f._hunterStolenDef || 0,
    hunterStolenHp: f._hunterStolenHp || 0,
    hunterStolenMr: f._hunterStolenMr || 0,
    lifesteal: f._lifestealPct || 0,
    armorBreakPct: (s.armorBreak as { pct?: number })?.pct || 0,
    armorBreakTurns: (s.armorBreak as { turns?: number })?.turns || 0,
    atkDownPct: (s.atkDown as { pct?: number })?.pct || 0,
    atkDownTurns: (s.atkDown as { turns?: number })?.turns || 0,
    defDownPct: (s.defDown as { pct?: number })?.pct || 0,
    defDownTurns: (s.defDown as { turns?: number })?.turns || 0,
    defUpVal: (s.defUp as { val?: number })?.val || 0,
    defUpTurns: (s.defUp as { turns?: number })?.turns || 0,
    defUpPctVal: (s.defUpPct as { pct?: number })?.pct || 0,
    defUpPctTurns: (s.defUpPct as { turns?: number })?.turns || 0,
    selfDefUpPct: (s.selfDefUpPct as { pct?: number })?.pct || 0,
    selfDefUpTurns: (s.selfDefUpPct as { turns?: number })?.turns || 0,
    hotPerTurn: (s.hot as { hpPerTurn?: number })?.hpPerTurn || 0,
    hotTurns: (s.hot as { turns?: number })?.turns || 0,
    shieldFlat: (s.shieldFlat as number) || 0, shieldHpPctVal: (s.shieldHpPct as number) || 0,
    totalScale: (s.totalScale as number) || 0, shieldTurns: (s.shieldTurns as number) || 0,
    defBoostTurns: (s.defBoostTurns as number) || 0, stunAfter: (s.stunAfter as number) || 0,
    transferPct: (s.transferPct as number) || 0,
  };
  // JS ui-skill-text.js:93-106 — 替换 {X:expr} / {expr} / {VAR}
  let result = template.replace(/\{([NPHSBDMT]):([^}]+)\}|\{([^}]+)\}/g,
    (_match, color: string | undefined, expr: string | undefined, plainExpr: string | undefined) => {
      const e = (expr || plainExpr) as string;
      const val = evalSkillExpr(e, vars);
      if (color && SKILL_COLOR_MAP[color]) {
        return `<span class="${SKILL_COLOR_MAP[color]}">${val}</span>`;
      }
      return String(val);
    });
  // JS ui-skill-text.js:107-137 — auto-color 关键词 (顺序不可乱, 长串先于短串)
  result = result.replace(/物理伤害/g, '<span class="val-normal">物理伤害</span>');
  result = result.replace(/魔法伤害/g, '<span class="val-magic">魔法伤害</span>');
  result = result.replace(/真实伤害/g, '<span class="val-true">真实伤害</span>');
  result = result.replace(/(?<!">)真实(?!伤害|<)/g, '<span class="val-true">真实</span>');
  result = result.replace(/(?<!">)物理(?!伤害|<)/g, '<span class="val-normal">物理</span>');
  result = result.replace(/(?<!">)魔法(?!伤害|<)/g, '<span class="val-magic">魔法</span>');
  result = result.replace(/防御力加成/g, '<span class="val-def">防御力加成</span>');
  result = result.replace(/(?<!">)攻击力(?!<)/g, '<span class="val-normal">攻击力</span>');
  result = result.replace(/(?<!">)护甲(?!<)/g, '<span class="val-def">护甲</span>');
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
  result = result.replace(/(?<!">)流血(?!<)/g, '<span style="color:#cc3333;font-weight:700">流血</span>');
  result = result.replace(/(?<!">)冰寒(?!<)/g, '<span style="color:#87ceeb;font-weight:700">冰寒</span>');
  result = result.replace(/(?<!">)反伤(?!<)/g, '<span class="val-reflect">反伤</span>');
  result = result.replace(/(?<!">)暴击率(?!<)/g, '<span class="val-crit">暴击率</span>');
  result = result.replace(/(?<!">)暴击伤害(?!<)/g, '<span class="val-crit-dmg">暴击伤害</span>');
  result = result.replace(/(?<!">)额外伤害(?!<)/g, '<span class="val-extra">额外伤害</span>');
  return result;
}

interface SceneInitData {
  mode?: 'pve' | 'dungeon' | 'custom' | 'boss' | 'boss-pick' | 'test';
  rule?: string;
}

export class TeamSelectScene extends Phaser.Scene {
  private team: (string | null)[] = new Array(SLOT_COUNT).fill(null);
  private slotViews: Array<{
    frame: Phaser.GameObjects.Rectangle;
    portrait?: Phaser.GameObjects.Image;
    nameText?: Phaser.GameObjects.Text;
    editBtn?: Phaser.GameObjects.Container;
    placeholderPlus?: Phaser.GameObjects.Text;
    placeholderLabel?: Phaser.GameObjects.Text;
    passiveIcon?: Phaser.GameObjects.GameObject;
  }> = [];
  private pickerOpen = false;
  private synergyPanel!: Phaser.GameObjects.DOMElement;
  private startBtn!: Phaser.GameObjects.Container;
  private lastLineupBtn?: Phaser.GameObjects.Container;
  private mode: 'pve' | 'dungeon' | 'custom' | 'boss' | 'boss-pick' | 'test' = 'dungeon';
  private rule: string | null = null;
  // E3/34: filter + sort state (JS main.js:264 _petFilter 同款, sticky 跨 render)
  private petFilter: PetFilter = { rarity: 'all', sort: 'rarity' };
  // E3/34: pet grid 重建 references (filter/sort 切换时全清重画)
  private petGridContainer?: Phaser.GameObjects.Container;
  private petGridX = 0; private petGridY = 0; private petGridW = 0; private petGridH = 0;
  private filterPillObjs: Array<{ chip: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; key: Rarity | 'all' }> = [];
  // E3/34: drag&drop state
  private dragId: string | null = null;
  private dragGhost?: Phaser.GameObjects.Container;
  // E3/38 Wave 3.8: 当前 active slot (JS main.js:708 _fgActiveSlot 1:1)
  private activeSlotIdx: number = -1;
  // E3/46: DOM overlay root (new)
  private domRoot: HTMLElement | null = null;

  constructor() { super('TeamSelectScene'); }

  init(data: SceneInitData) {
    this.mode = data.mode ?? 'dungeon';
    this.rule = data.rule ?? null;
  }

  create() {
    // E3/46 重写: 完全 DOM overlay (JS games/turtle-battle/index.html:301-358 1:1)
    // 之前 Phaser 几何渲染版本完全跟 JS 不像; 现在用纯 DOM 复制 JS HTML+CSS 结构
    // 数据状态仍在 TS class, 视觉走 DOM querySelector 更新

    // v0.9.9: 强制 FIT — 防 BattleScene 的 ENVELOP 残留把选龟界面整体放大裁切 (用户报)
    if (this.scale.scaleMode !== Phaser.Scale.FIT) {
      this.scale.scaleMode = Phaser.Scale.FIT;
      this.scale.refresh();
    }

    // v0.9.5.A20: 沿用主菜单 tile bg 无缝衔接
    document.documentElement.classList.add('menu-bg-active');

    // 建 DOM root
    const root = document.createElement('div');
    root.id = 'poc-team-select-root';
    document.body.appendChild(root);
    this.domRoot = root;

    // Mode guide
    const info = MODE_GUIDES[this.mode];
    const guideHTML = info ? `<div class="mode-guide">
      <div class="guide-header">${info.icon} ${info.title}</div>
      <ul class="guide-tips">${info.tips.map(t => `<li>${t}</li>`).join('')}</ul>
    </div>` : '';

    // E3/46 (JS index.html:301-358 1:1): 整屏 HTML 结构
    root.innerHTML = `
      <h2 class="screen-title">选择你的队伍</h2>
      ${guideHTML}
      <div class="select-top">
        <div class="formation-grid" id="poc-fg-grid">
          <div class="fg-row">
            <div class="fg-label">前排</div>
            ${[0,1,2].map(i => `<div class="fg-slot" data-slot-idx="${i}"><span class="fg-empty">空</span></div>`).join('')}
          </div>
          <div class="fg-row">
            <div class="fg-label">后排</div>
            ${[3,4,5].map(i => `<div class="fg-slot" data-slot-idx="${i}"><span class="fg-empty">空</span></div>`).join('')}
          </div>
        </div>
        <div class="select-actions">
          <button class="select-btn" id="poc-btn-back">返回</button>
          <button class="select-btn" id="poc-btn-last-lineup" style="display:none">↺ 上次阵容</button>
          <button class="select-cta" id="poc-btn-confirm" disabled><span class="select-cta-label" id="poc-cta-label">请选择 3 只龟</span></button>
        </div>
        <div class="synergy-preview" id="poc-synergy-preview" style="display:none">
          <div class="synergy-preview-title">激活羁绊</div>
          <div id="poc-synergy-list"></div>
        </div>
      </div>
      <div class="pg-filter-bar">
        <div class="pg-filter-pills" id="poc-pills">
          ${(['all','C','B','A','S','SS','SSS'] as const).map(r =>
            `<button class="pg-pill ${r==='all'?'active':''}" data-rarity="${r}">${r==='all'?'全部':r}</button>`).join('')}
        </div>
        <div>
          <select class="pg-sort" id="poc-sort">
            <option value="rarity">稀有度↓</option>
            <option value="level">等级↓</option>
            <option value="name">名称</option>
          </select>
        </div>
      </div>
      <div class="pet-grid" id="poc-pet-grid"></div>
    `;

    // 事件 wire
    this.wireDomEvents();
    // 恢复上次阵容 + 初次渲染
    this.loadTeam();
    this.refreshDom();

    // shutdown 清理 — Phase D: 不 remove menu-bg-active, html 永远挂着, drift 动画不重启
    this.events.once('shutdown', () => {
      if (this.domRoot && this.domRoot.parentNode) this.domRoot.parentNode.removeChild(this.domRoot);
      this.domRoot = null;
      // Phase B: PDP overlay 也清掉 (避免 scene 切换后留滞)
      const pdp = document.getElementById('poc-pdp-overlay');
      if (pdp && pdp.parentNode) pdp.parentNode.removeChild(pdp);
    });
  }

  // ─── E3/46: DOM 事件 wire (JS index.html:301-358 + main.js 各 handler 1:1) ───
  private wireDomEvents() {
    if (!this.domRoot) return;
    // 返回 (JS goBackFromSelect)
    this.domRoot.querySelector('#poc-btn-back')?.addEventListener('click',
      () => this.scene.start('MainMenuScene'));
    // 上次阵容 (JS restoreLastLineup)
    this.domRoot.querySelector('#poc-btn-last-lineup')?.addEventListener('click',
      () => this.restoreLastLineup());
    // 确认 (JS confirmTeam — 触发 startBattle)
    this.domRoot.querySelector('#poc-btn-confirm')?.addEventListener('click',
      () => this.startBattle());
    // pills (JS setPetFilter 'rarity')
    this.domRoot.querySelectorAll('.pg-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const r = (pill as HTMLElement).dataset.rarity as Rarity | 'all';
        this.petFilter.rarity = r;
        this.refreshDom();
      });
    });
    // sort (JS setPetFilter 'sort')
    this.domRoot.querySelector('#poc-sort')?.addEventListener('change', (e) => {
      this.petFilter.sort = (e.target as HTMLSelectElement).value as 'rarity' | 'level' | 'name';
      this.refreshDom();
    });
    // slot click (JS fgSlotClick) — empty: activate / filled non-mark: remove
    this.domRoot.querySelectorAll('.fg-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        const idx = parseInt((slot as HTMLElement).dataset.slotIdx || '-1', 10);
        if (idx < 0) return;
        this.onSlotClick(idx);
      });
      // slot drop (HTML5 dnd, JS fgDrop)
      slot.addEventListener('dragover', (e) => {
        (e as DragEvent).preventDefault();
        slot.classList.add('drag-over');
      });
      slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
      slot.addEventListener('drop', (e) => {
        (e as DragEvent).preventDefault();
        slot.classList.remove('drag-over');
        const idx = parseInt((slot as HTMLElement).dataset.slotIdx || '-1', 10);
        if (idx < 0) return;
        const dragId = (e as DragEvent).dataTransfer?.getData('text/plain');
        if (dragId) this.onDropPet(dragId, idx);
      });
    });
  }

  /** E3/46: 全 DOM refresh — JS renderFgSlots + renderPetGrid + updateConfirmBtn + renderSynergyPreview 合并 */
  private refreshDom() {
    if (!this.domRoot) return;
    this.refreshFgSlots();
    this.refreshPetGridDom();
    this.refreshConfirmBtn();
    this.refreshSynergyPreviewDom();
  }

  /** JS renderFgSlots — DOM 版 */
  private refreshFgSlots() {
    if (!this.domRoot) return;
    const grid = this.domRoot.querySelector('#poc-fg-grid');
    if (!grid) return;
    grid.classList.toggle('is-full', this.team.filter(t => t != null && !isSpecialSlotMark(t)).length === REQUIRED_PETS);
    this.domRoot.querySelectorAll('.fg-slot').forEach(slot => {
      const idx = parseInt((slot as HTMLElement).dataset.slotIdx || '-1', 10);
      if (idx < 0) return;
      const id = this.team[idx];
      const isActive = this.activeSlotIdx === idx;
      const isSelected = this.selectedSlotIdx === idx;  // tap-to-swap 选中态
      slot.classList.toggle('fg-active', isActive);
      slot.classList.toggle('fg-selected', isSelected);  // JS scene.css:424 .fg-selected (金色边)
      slot.classList.toggle('filled', id != null);
      slot.classList.toggle('fg-summon-slot', isSpecialSlotMark(id));
      // 内容
      if (id === SUMMON_MARK) {
        // JS main.js:936 1:1: <div class="fg-turtle fg-summon"> + .fg-summon-icon 文字 "?"
        slot.innerHTML = `<div class="fg-turtle fg-summon"><div class="fg-summon-icon">?</div><span class="fg-name" style="color:#ffc850">随从</span></div>`;
      } else if (id === CRYSTAL_BALL_MARK) {
        // JS main.js:948 1:1: 用 crystal-ball.png 32×32 不是 emoji
        slot.innerHTML = `<div class="fg-turtle fg-summon"><img src="pets/crystal-ball.png" style="width:32px;height:32px;image-rendering:pixelated"><span class="fg-name" style="color:#9b6bff">水晶球</span></div>`;
      } else if (id === CANDY_BOMB_MARK) {
        // JS main.js:960 1:1: emoji 🍬💣 font-size:22px
        slot.innerHTML = `<div class="fg-turtle fg-summon"><div class="fg-summon-icon" style="font-size:22px">🍬💣</div><span class="fg-name" style="color:#ff6bd8">糖果炸弹</span></div>`;
      } else if (id) {
        const pet = ALL_PETS.find(p => p.id === id);
        if (pet) {
          // 用 avatar PNG 路径 (pet.id 对应 avatars/<id>.png)
          slot.innerHTML = `<div class="fg-turtle">
            <img src="avatars/${pet.id}.png" alt="">
            <span class="fg-name" style="color:${RARITY_COLOR_STR[pet.rarity as Rarity]}">${pet.name}</span>
          </div>`;
        }
      } else {
        slot.innerHTML = '<span class="fg-empty">空</span>';
      }
    });
  }

  /** JS renderPetGrid — DOM 版 */
  private refreshPetGridDom() {
    if (!this.domRoot) return;
    const gridEl = this.domRoot.querySelector('#poc-pet-grid');
    if (!gridEl) return;
    // owned filter (JS main.js:279-283)
    let pets = ALL_PETS.slice();
    let owned: string[] | null = null;
    try {
      const ps = JSON.parse(localStorage.getItem('petState') || 'null');
      if (ps?.pets) owned = ps.pets.filter((p: { owned?: boolean }) => p.owned).map((p: { id: string }) => p.id);
    } catch { /* ignore */ }
    if (owned) pets = pets.filter(p => owned!.includes(p.id));
    // rarity filter
    if (this.petFilter.rarity !== 'all') {
      pets = pets.filter(p => p.rarity === this.petFilter.rarity);
    }
    // sort
    if (this.petFilter.sort === 'rarity') {
      pets = pets.sort((a, b) => RARITY_ORDER.indexOf(a.rarity as Rarity) - RARITY_ORDER.indexOf(b.rarity as Rarity));
    } else if (this.petFilter.sort === 'level') {
      pets = pets.sort((a, b) => getPetLevel(b.id) - getPetLevel(a.id));
    } else if (this.petFilter.sort === 'name') {
      pets = pets.sort((a, b) => a.id.localeCompare(b.id));
    }
    // refresh active pill
    this.domRoot.querySelectorAll('.pg-pill').forEach(p => {
      p.classList.toggle('active', (p as HTMLElement).dataset.rarity === this.petFilter.rarity);
    });
    // render cards
    // E3/47: 用 spritesheet 显 idle 动画 (JS buildPetImgHTML 1:1), 没 sprite 的 fallback avatar
    gridEl.innerHTML = pets.map(pet => {
      const isSelected = this.team.includes(pet.id);
      const rColor = RARITY_COLOR_STR[pet.rarity as Rarity];
      const lv = getPetLevel(pet.id);
      const passiveHTML = pet.passive ? (() => {
        const piPath = PASSIVE_ICONS[pet.passive!.type as string];
        if (piPath?.endsWith('.png')) {
          return `<span class="pet-passive-icon" data-pet-id="${pet.id}" title="点击查看技能与属性"><img class="stat-icon" src="${piPath}" alt=""></span>`;
        }
        return '';
      })() : '';
      // JS main.js:318 desktop size = 144, mobile (p.sprite ? 80 : 60)
      return `<div class="pet-card ${isSelected ? 'selected' : ''}" data-pet-id="${pet.id}" draggable="true">
        <span class="pet-rarity-badge" style="background:${rColor}">${pet.rarity}</span>
        <div class="pet-avatar">
          ${buildPetImgHTML(pet, 144)}
          ${passiveHTML}
        </div>
        <div class="pet-name">${pet.name}</div>
        <div class="pet-lv">Lv.${lv}</div>
      </div>`;
    }).join('');
    // wire card events (each render)
    gridEl.querySelectorAll<HTMLElement>('.pet-card').forEach(card => {
      const petId = card.dataset.petId!;
      card.addEventListener('click', () => this.onPickPet(petId));
      card.addEventListener('dragstart', (e) => {
        (e as DragEvent).dataTransfer?.setData('text/plain', petId);
        (e as DragEvent).dataTransfer!.effectAllowed = 'move';
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      // passive icon click → skill picker (Phase B: DOM overlay 版 picker z-index 2000 高于 root, 不必 hide root)
      const piIcon = card.querySelector('.pet-passive-icon');
      if (piIcon) {
        piIcon.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openSkillPicker(petId);
        });
      }
    });
  }

  /** JS updateConfirmBtn — DOM 版 */
  private refreshConfirmBtn() {
    if (!this.domRoot) return;
    const placed = this.team.filter(t => t != null && !isSpecialSlotMark(t)).length;
    const btn = this.domRoot.querySelector('#poc-btn-confirm') as HTMLButtonElement | null;
    if (btn) {
      const ready = placed === REQUIRED_PETS;
      btn.disabled = !ready;
      // JS main.js:1001-1003 1:1 — placed=0:"请选择 3 只龟", 1-2:"还需选 N 只", 3:"开战！"
      const label = btn.querySelector('#poc-cta-label') as HTMLElement | null;
      let text: string;
      if (placed === 0) text = '请选择 3 只龟';
      else if (placed < REQUIRED_PETS) text = `还需选 ${REQUIRED_PETS - placed} 只`;
      else text = '开战！';
      if (label) label.textContent = text; else btn.textContent = text;
    }
    // 上次阵容 btn (JS:1009-1014)
    const lastBtn = this.domRoot.querySelector('#poc-btn-last-lineup') as HTMLButtonElement | null;
    if (lastBtn) {
      const empty = placed === 0;
      const last = readLastLineup();
      const canRestore = empty && last && Array.isArray(last.ids) && last.ids.length === 3;
      lastBtn.style.display = canRestore ? '' : 'none';
    }
  }

  /** JS renderSynergyPreview — DOM 版 */
  private refreshSynergyPreviewDom() {
    if (!this.domRoot) return;
    const panel = this.domRoot.querySelector('#poc-synergy-preview') as HTMLElement | null;
    const list = this.domRoot.querySelector('#poc-synergy-list') as HTMLElement | null;
    if (!panel || !list) return;
    const picked = this.team.filter((id): id is string => id != null && !isSpecialSlotMark(id));
    if (picked.length < 2) { panel.style.display = 'none'; return; }
    panel.style.display = 'block';
    const fakeTeam = picked.map(id => {
      const pet = ALL_PETS.find(p => p.id === id);
      return { tags: pet?.tags ?? [] } as unknown as Fighter;
    });
    const synergies = calcActiveSynergies(fakeTeam);
    if (synergies.length === 0) {
      list.innerHTML = '<div class="synergy-preview-empty">当前阵容暂无激活羁绊</div>';
      return;
    }
    synergies.sort((a, b) => b.tier - a.tier);
    list.innerHTML = synergies.map(s => {
      const cfg = SYNERGY_TAGS[s.tag];
      if (!cfg) return '';
      const tierCfg = s.tier === 3 ? cfg.tier3 : cfg.tier2;
      return `<div class="synergy-preview-item t${s.tier}">
        <span class="synergy-preview-tag">${cfg.emoji || ''} ${cfg.name} ×${s.tier}</span>
        <span class="synergy-preview-desc">${tierCfg?.desc || ''}</span>
      </div>`;
    }).join('');
  }

  /** E3/34: drop pet 到 slot — JS main.js:809-852 fgDrop 1:1 (含 swap 逻辑)
   *  E3/36 Wave 2 (g): 加 mark slot 拒绝替换 + mark 自身只能拖到空 (JS:818-834)
   */
  private onDropPet(petId: string, slotIdx: number) {
    if (this.pickerOpen) return;
    const oldIdx = this.team.indexOf(petId);
    const existing = this.team[slotIdx];
    if (existing === petId) return;
    // E3/36 (g): 拒绝把龟拖到 mark 占位上 (JS:818-822) — Phase C toast
    if (isSpecialSlotMark(existing) && !isSpecialSlotMark(petId)) {
      const lbl = existing === SUMMON_MARK ? '随从位' : existing === CRYSTAL_BALL_MARK ? '水晶球位' : '糖果炸弹位';
      this.showToast(`${lbl} 不能被替换`);
      return;
    }
    // E3/36 (g): 拖动 mark 自己: 只能放空格 (JS:824-834) — Phase C toast
    if (isSpecialSlotMark(petId)) {
      if (existing !== null) {
        const lbl = petId === SUMMON_MARK ? '随从位' : petId === CRYSTAL_BALL_MARK ? '水晶球位' : '糖果炸弹位';
        this.showToast(`${lbl} 只能拖到空格`);
        return;
      }
      if (oldIdx >= 0) this.team[oldIdx] = null;
      this.team[slotIdx] = petId;
      this.saveTeam();
      this.refreshUI();
      return;
    }
    // Swap: 把现有 turtle 放到 dragged turtle 的旧 slot
    if (existing && oldIdx >= 0) {
      this.team[oldIdx] = existing;
    } else if (oldIdx >= 0) {
      this.team[oldIdx] = null;
    }
    // cap 3 (不算 marks) (JS:843-846) — Phase C toast
    if (oldIdx < 0 && !existing) {
      const placed = this.team.filter(t => t != null && !isSpecialSlotMark(t)).length;
      if (placed >= REQUIRED_PETS) {
        this.showToast('已选 3 只, 先移除再放置');
        return;
      }
    }
    this.team[slotIdx] = petId;
    this.syncSpecialSlots();   // E3/36 (g)
    this.saveTeam();
    this.refreshUI();
    if (!getLoadout(petId)) this.openSkillPicker(petId);
  }

  // ─── 28 龟网格 (E3/34: 应用 filter+sort, 跟 JS main.js:276-323 renderPetGrid 1:1) ───
  private renderPetGrid(x: number, y: number, w: number, h: number) {
    // 缓存 dims 给 refresh 用
    this.petGridX = x; this.petGridY = y; this.petGridW = w; this.petGridH = h;
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0.35)
      .setStrokeStyle(2, 0x58d3ff, 0.4).setDepth(2);
    this.refreshPetGrid();
  }

  /** E3/34: filter/sort 变 → 全清重画 grid */
  private refreshPetGrid() {
    if (this.petGridContainer) {
      this.petGridContainer.destroy();
      this.petGridContainer = undefined;
    }
    const { petGridX: x, petGridY: y, petGridW: w, petGridH: h } = this;
    const cols = 7;
    const cell = 110;
    const padX = (w - cols * cell) / 2;

    const container = this.add.container(x, y).setDepth(3);
    const mask = this.make.graphics({ x: 0, y: 0 });
    mask.fillStyle(0xffffff).fillRect(x, y, w, h);
    container.setMask(mask.createGeometryMask());
    this.petGridContainer = container;

    // E3/34: apply filter + sort (JS main.js:285-295 1:1)
    // E3/36 Wave 2 (d): owned 过滤 (JS main.js:279-283 1:1) — 只显示玩家拥有的
    let pets = ALL_PETS.slice();
    let owned: string[] | null = null;
    try {
      const ps = JSON.parse(localStorage.getItem('petState') || 'null');
      if (ps?.pets) owned = ps.pets.filter((p: { owned?: boolean }) => p.owned).map((p: { id: string }) => p.id);
    } catch { /* ignore */ }
    if (owned) pets = pets.filter(p => owned!.includes(p.id));
    if (this.petFilter.rarity !== 'all') {
      pets = pets.filter(p => p.rarity === this.petFilter.rarity);
    }
    if (this.petFilter.sort === 'rarity') {
      pets = pets.sort((a, b) =>
        RARITY_ORDER.indexOf(a.rarity as Rarity) - RARITY_ORDER.indexOf(b.rarity as Rarity));
    } else if (this.petFilter.sort === 'level') {
      pets = pets.sort((a, b) => getPetLevel(b.id) - getPetLevel(a.id));
    } else if (this.petFilter.sort === 'name') {
      pets = pets.sort((a, b) => a.id.localeCompare(b.id));
    }

    pets.forEach((pet, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = padX + col * cell + cell / 2;
      const cy = 20 + row * cell + cell / 2;
      container.add(this.makePetCard(pet, cx, cy));
    });

    const rows = Math.ceil(pets.length / cols);
    const contentH = rows * cell + 40;
    const maxScroll = Math.max(0, contentH - h);

    // 滚轮
    this.input.off('wheel');
    this.input.on('wheel', (_p: unknown, _go: unknown, _dx: number, dy: number) => {
      if (!this.petGridContainer) return;
      const cur = y - this.petGridContainer.y;
      const next = Phaser.Math.Clamp(cur + dy * 0.5, 0, maxScroll);
      this.petGridContainer.y = y - next;
    });
  }

  // ─── E3/34: mode guide top strip ───
  // E3/38 Wave 3.6: 块状 + ul 结构 (JS main.js:248 guide-header + guide-tips + base.css:774-777 1:1)
  //   .mode-guide bg rgba(255,255,255,.03) + border rgba(255,255,255,.06) + max-width 600px
  //   .guide-header 15px bold + .guide-tips ul padding-left:20px
  private renderModeGuide(screenW: number, y: number) {
    const info = MODE_GUIDES[this.mode];
    if (!info) return;
    const html = `
      <div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:4px">${info.icon} ${info.title}</div>
      <ul style="margin:0;padding-left:20px;color:#bcd;font-size:13px;line-height:1.6">
        ${info.tips.map(t => `<li>${t}</li>`).join('')}
      </ul>
    `;
    const dom = this.add.dom(screenW / 2, y, 'div',
      `background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);
       border-radius:10px;padding:10px 16px;max-width:600px;
       font-family:m6x11,pixel-zh, Microsoft YaHei,system-ui;pointer-events:none`,
      '').setOrigin(0.5, 0).setDepth(8);
    (dom.node as HTMLElement).innerHTML = html;
  }

  // ─── E3/34: filter bar — rarity pills + sort (JS main.js:265-272 setPetFilter 1:1) ───
  private renderFilterBar(x: number, y: number, w: number) {
    // E3/38 Wave 3.2: pill 顺序跟 JS index.html:340-348 1:1 (全部 → C → B → A → S → SS → SSS)
    const pills: Array<{ key: Rarity | 'all'; label: string }> = [
      { key: 'all', label: '全部' },
      { key: 'C', label: 'C' }, { key: 'B', label: 'B' }, { key: 'A', label: 'A' },
      { key: 'S', label: 'S' }, { key: 'SS', label: 'SS' }, { key: 'SSS', label: 'SSS' },
    ];
    let cx = x + 6;
    for (const p of pills) {
      const w2 = p.key === 'all' ? 52 : 38;
      const isActive = this.petFilter.rarity === p.key;
      const color = isActive ? 0xffd93d : (p.key === 'all' ? 0x888888 : RARITY_COLOR[p.key as Rarity]);
      // E3/40 Wave 3.13: 高 26→20px 跟 JS .pg-pill CSS 一致 (paddings + font-size:12px)
      const chip = this.add.rectangle(cx + w2 / 2, y, w2, 20, isActive ? 0x3a2f0a : 0x12202a, 0.92)
        .setStrokeStyle(1, color, isActive ? 1 : 0.7)
        .setInteractive({ useHandCursor: true }).setDepth(4);
      const label = this.add.text(cx + w2 / 2, y, p.label, {
        fontSize: '11px', color: isActive ? '#ffd93d' : '#fff',
        fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(5);
      chip.on('pointerdown', () => {
        this.petFilter.rarity = p.key;
        this.refreshFilterPills();
        this.refreshPetGrid();
      });
      this.filterPillObjs.push({ chip, label, key: p.key });
      cx += w2 + 6;
    }

    // sort dropdown — 用 HTML select (JS main.js _petFilter.sort)
    const sortDom = this.add.dom(x + w - 130, y, 'select',
      'background:#12202a;color:#fff;border:2px solid #58d3ff;padding:3px 8px;font-size:12px;font-family:m6x11,pixel-zh, Microsoft YaHei,system-ui;border-radius:4px;cursor:pointer',
      '').setOrigin(0, 0.5).setDepth(4);
    const sel = sortDom.node as HTMLSelectElement;
    // E3/38 Wave 3.3: option 文本跟 JS index.html:351-353 1:1
    sel.innerHTML = `
      <option value="rarity">稀有度↓</option>
      <option value="level">等级↓</option>
      <option value="name">名称</option>
    `;
    sel.value = this.petFilter.sort;
    sel.onchange = () => {
      this.petFilter.sort = sel.value as 'rarity' | 'level' | 'name';
      this.refreshPetGrid();
    };
  }

  /** filter pills 重画 active 态 */
  private refreshFilterPills() {
    for (const p of this.filterPillObjs) {
      const isActive = this.petFilter.rarity === p.key;
      const color = isActive ? 0xffd93d : (p.key === 'all' ? 0x888888 : RARITY_COLOR[p.key as Rarity]);
      p.chip.setFillStyle(isActive ? 0x3a2f0a : 0x12202a, 0.92);
      p.chip.setStrokeStyle(2, color, isActive ? 1 : 0.7);
      p.label.setColor(isActive ? '#ffd93d' : '#fff');
    }
  }

  // E3/34: pet card 增强 — 加 Lv 徽章 + passive icon (clickable) + drag&drop
  // E3/36 Wave 2 (a): selected 态视觉 — JS base.css:732 .pet-card.selected 金边 + 金背景 + 发光
  // E3/40 Wave 3.14: padding + sprite 加大跟 JS base.css:730 (.pet-card padding:14px 10px + sprite:144px desktop) 接近
  // JS main.js:297-322 buildPetCard 1:1 (passive 点击 → showSkillPickModal)
  private makePetCard(pet: PetDef, x: number, y: number): Phaser.GameObjects.Container {
    const card = this.add.container(x, y);
    const cell = 100;   // 96 → 100 让出 padding
    const rarityColor = RARITY_COLOR[pet.rarity as Rarity];
    const isSelected = this.team.includes(pet.id);

    // E3/36 (a): selected 时金边 + 金背景 (rgba(255,216,107,.1) ≈ 0x3a2f0a)
    const bg = this.add.rectangle(0, 0, cell, cell,
      isSelected ? 0x3a2f0a : 0x1a2740, isSelected ? 0.95 : 0.9)
      .setStrokeStyle(isSelected ? 3 : 2, isSelected ? 0xffd86b : rarityColor)
      .setInteractive({ useHandCursor: true, draggable: true });
    card.add(bg);
    if (isSelected) {
      const glow = this.add.rectangle(0, 0, cell + 8, cell + 8, 0xffd86b, 0.18);
      card.addAt(glow, 0);
    }

    // E3/40 Wave 3.15: sprite 54→68 px (JS desktop 144, mobile 60-80) 取中间
    const portrait = this.add.image(0, -10, `pet-${pet.id}`).setDisplaySize(68, 68);
    card.add(portrait);

    card.add(this.add.text(0, 32, pet.name, {
      fontSize: '11px', color: '#fff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5));

    // E3/38 Wave 3.4: rarity badge 位置 左上 (JS base.css:741 .pet-rarity-badge top:8px left:8px)
    card.add(this.add.text(-cell / 2 + 4, -cell / 2 + 4, pet.rarity, {
      fontSize: '10px', color: '#fff',
      fontFamily: 'monospace', fontStyle: 'bold',
      backgroundColor: RARITY_COLOR_STR[pet.rarity as Rarity], padding: { x: 4, y: 1 },
    }).setOrigin(0, 0));

    // E3/40 Wave 3.16: Lv.X 卡底部居中 (JS main.js:320 `<div class="pet-lv">Lv.${lv}</div>` CSS-driven)
    const lv = getPetLevel(pet.id);
    card.add(this.add.text(0, cell / 2 - 4, `Lv.${lv}`, {
      fontSize: '10px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5, 1));

    // E3/40 Wave 3.17: passive icon 右上 (JS base.css:765 .pet-passive-icon top:-8 right:-8 + 42×42 + inner img 32×32)
    if (pet.passive) {
      const piPath = PASSIVE_ICONS[pet.passive.type as string];
      if (piPath?.endsWith('.png')) {
        // Position: 右上 (相对卡片) — JS top:-8 right:-8 是相对 .pet-avatar, 我用相对 cell 中心
        const piIco = addDomImage(this, cell / 2 - 4, -cell / 2 + 4, piPath, 32, 32);
        const el = piIco.node as HTMLElement;
        el.style.cursor = 'pointer';
        el.style.pointerEvents = 'auto';
        el.title = '点击查看技能与属性';
        // JS: 圆框 + 阴影 + 黑底 (base.css:765-766)
        el.style.background = 'var(--bg, #1a2740)';
        el.style.borderRadius = '50%';
        el.style.padding = '3px';
        el.style.boxShadow = '0 0 6px rgba(0,0,0,.5)';
        el.onclick = (e: MouseEvent) => {
          e.stopPropagation();
          this.openSkillPicker(pet.id);
        };
        card.add(piIco);
      }
    }

    // ── 交互 ──
    // E3/40 Wave 3.18: hover translateY(-2px) (JS base.css:731 .pet-card:hover transform)
    bg.on('pointerover', () => {
      bg.setStrokeStyle(3, 0xffd93d);
      this.tweens.add({ targets: card, y: y - 2, duration: 140, ease: 'sine.out' });
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(isSelected ? 3 : 2, isSelected ? 0xffd86b : rarityColor);
      this.tweens.add({ targets: card, y, duration: 140, ease: 'sine.out' });
    });

    // E3/34: drag&drop — JS main.js:315 draggable + fgDragStart/fgDragEnd/fgDrop 1:1
    // Phaser scene-wide drag events 在 create() 注册一次, 此处单独处理 startDrag mark
    bg.on('dragstart', () => {
      this.dragId = pet.id;
      this.showDragGhost(pet);
    });
    bg.on('drag', (_p: Phaser.Input.Pointer, dx: number, dy: number) => {
      if (this.dragGhost) this.dragGhost.setPosition(dx, dy);
    });
    bg.on('dragend', () => this.hideDragGhost());

    // click (无拖拽时) → 同原本 onPickPet
    bg.on('pointerup', (p: Phaser.Input.Pointer) => {
      // Phaser drag 完会 fire pointerup, 用 isDragging 区分
      const dist = Phaser.Math.Distance.Between(p.downX, p.downY, p.upX, p.upY);
      if (dist > 8) return;  // 拖了不算点击
      this.onPickPet(pet.id);
    });

    return card;
  }

  /** E3/34: drag ghost 跟随指针 (替代 JS HTML5 dnd ghost) */
  private showDragGhost(pet: PetDef) {
    this.hideDragGhost();
    const g = this.add.container(0, 0).setDepth(500).setAlpha(0.75);
    const bg = this.add.rectangle(0, 0, 76, 76, 0x1a2740, 0.95)
      .setStrokeStyle(2, RARITY_COLOR[pet.rarity as Rarity]);
    const portrait = this.add.image(0, -6, `pet-${pet.id}`).setDisplaySize(48, 48);
    const name = this.add.text(0, 26, pet.name, {
      fontSize: '11px', color: '#fff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5);
    g.add(bg); g.add(portrait); g.add(name);
    this.dragGhost = g;
  }
  private hideDragGhost() {
    if (this.dragGhost) {
      this.dragGhost.destroy();
      this.dragGhost = undefined;
    }
  }

  // ─── 6 槽编队 (v0.9.5.C: 2 行 × 3 列, 前排上行 / 后排下行, 照 JS 版 index.html L305) ───
  private renderTeamSlots(screenW: number, y: number) {
    const slotW = 120, slotH = 120;
    const cols = 3;
    const colGap = 30;
    const rowGap = 12;
    const totalW = cols * slotW + (cols - 1) * colGap;
    const startX = (screenW - totalW) / 2 + slotW / 2;

    this.add.text(screenW / 2, y - 22, '编队 3 龟 (任选 3 格, 上前排 / 下后排)', {
      fontSize: '13px', color: '#58d3ff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5, 0.5).setDepth(3);

    for (let i = 0; i < SLOT_COUNT; i++) {
      const isFront = i < FRONT_SLOTS;
      const col = i % cols;
      const row = isFront ? 0 : 1;
      const sx = startX + col * (slotW + colGap);
      const sy = y + row * (slotH + rowGap) + slotH / 2;

      // 行 label (左侧, 仅每行第 1 个槽显示)
      if (col === 0) {
        this.add.text(startX - slotW / 2 - 12, sy, isFront ? '前排' : '后排', {
          fontSize: '12px', color: isFront ? '#ffd93d' : '#58d3ff',
          fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
        }).setOrigin(1, 0.5).setDepth(3);
      }

      const frame = this.add.rectangle(sx, sy, slotW, slotH, 0x000000, 0.6)
        .setStrokeStyle(2, isFront ? 0xffd93d : 0x58d3ff, 0.5)
        .setInteractive({ useHandCursor: true, dropZone: true })
        .setDepth(3);
      // E3/34: 让 Phaser 知道这是 dropZone (drop 事件接收)
      frame.input!.dropZone = true;
      (frame as Phaser.GameObjects.Rectangle & { _slotIdx: number })._slotIdx = i;

      // E3/38 Wave 3.5: 空槽显示 "空" 字 (JS index.html:308-316 `<span class="fg-empty">空</span>` 1:1)
      const placeholderPlus = this.add.text(sx, sy, '空', {
        fontSize: '20px', color: isFront ? '#ffd86b' : '#58d3ff',
        fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0.5).setDepth(3);
      const placeholderLabel = this.add.text(sx, sy + 36, '', {
        fontSize: '11px', color: '#888', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
      }).setOrigin(0.5).setAlpha(0).setDepth(3);  // 隐藏 — JS 没此 label

      frame.on('pointerover', () => frame.setStrokeStyle(3, 0xffd93d));
      frame.on('pointerout', () => {
        if (this.activeSlotIdx === i) return;   // active 态保持金边
        const filled = this.team[i] != null;
        const pet = filled ? ALL_PETS.find(p => p.id === this.team[i]) : null;
        const baseStrokeColor = isFront ? 0xffd93d : 0x58d3ff;
        frame.setStrokeStyle(2, pet ? RARITY_COLOR[pet.rarity as Rarity] : baseStrokeColor, filled ? 0.9 : 0.5);
      });
      // E3/38 Wave 3.8: slot 点击 — 空 activate / 满 remove (JS fgSlotClick 1:1, desktop 路径)
      frame.on('pointerup', (p: Phaser.Input.Pointer) => {
        const dist = Phaser.Math.Distance.Between(p.downX, p.downY, p.upX, p.upY);
        if (dist > 8) return;  // 拖了不算点击
        this.onSlotClick(i);
      });
      // E3/38 Wave 3.9: filled slot 可拖 (JS main.js:976-981 turtle slot draggable=true)
      frame.on('dragstart', () => {
        const id = this.team[i];
        if (!id) return;
        this.dragId = id;
        const pet = !isSpecialSlotMark(id) ? ALL_PETS.find(pp => pp.id === id) : null;
        if (pet) this.showDragGhost(pet);
      });
      frame.on('drag', (_p: Phaser.Input.Pointer, dx: number, dy: number) => {
        if (this.dragGhost) this.dragGhost.setPosition(dx, dy);
      });
      frame.on('dragend', () => this.hideDragGhost());

      this.slotViews.push({ frame, placeholderPlus, placeholderLabel });
    }
  }

  // ─── 玩家操作 ───
  private onPickPet(petId: string) {
    if (this.pickerOpen) return;
    if (this.team.includes(petId)) return;
    // E3/36 (g): cap 检查不算 marks
    const placed = this.team.filter(t => t != null && !isSpecialSlotMark(t)).length;
    // Phase C: JS main.js:693 1:1 — 满 3 弹 toast 不静默 fail
    if (placed >= REQUIRED_PETS) {
      this.showToast(`已选 ${REQUIRED_PETS} 只, 点击龟或格子可移除`);
      return;
    }
    // E3/38 Wave 3.8: 优先填 active slot (JS 设 _fgActiveSlot 后下一个 pet click 入此槽)
    let emptyIdx = -1;
    if (this.activeSlotIdx >= 0 && this.team[this.activeSlotIdx] == null) {
      emptyIdx = this.activeSlotIdx;
      this.activeSlotIdx = -1;
    } else {
      emptyIdx = this.team.findIndex(t => t == null);
    }
    if (emptyIdx < 0) return;
    this.team[emptyIdx] = petId;
    this.syncSpecialSlots();   // E3/36 (g)
    this.saveTeam();
    this.refreshUI();
    // P2.1: 若该龟没存过 loadout, 弹出技能选择 modal (首次选必选, 否则可点 ✎ 按钮再编辑)
    if (!getLoadout(petId)) {
      this.openSkillPicker(petId);
    }
  }

  // selectedSlotIdx 跟 JS main.js:707 _fgSelectedSlot 1:1 — tap-to-swap 状态
  private selectedSlotIdx: number = -1;

  /** JS main.js:709-787 fgSlotClick 1:1 — tap-to-swap (满 slot 间互换 / 满↔空 移动 / 空 activate) */
  private onSlotClick(i: number) {
    if (this.pickerOpen) return;
    const id = this.team[i];
    const isMark = id != null && isSpecialSlotMark(id);

    // === 满 slot 路径 (JS:711-758) ===
    if (id != null) {
      // mark slot 第一次点选中 (JS:716 — JS 区分 mobile, 这里统一行为)
      if (this.selectedSlotIdx === -1) {
        // 第一次 tap: 选中 (JS:715-718)
        this.selectedSlotIdx = i;
        this.activeSlotIdx = -1;
        this.refreshUI();
        return;
      }
      if (this.selectedSlotIdx === i) {
        // 二次 tap 同 slot: 取消选中 + 移除 (JS:720-730). mark 不移除.
        this.selectedSlotIdx = -1;
        if (!isMark) {
          this.team[i] = null;
          this.syncSpecialSlots();
          this.saveTeam();
        }
        this.refreshUI();
        return;
      }
      // 二次 tap 不同 slot (满): SWAP (JS:731-757)
      const otherIdx = this.selectedSlotIdx;
      const otherIsMark = isSpecialSlotMark(this.team[otherIdx]);
      // mark 介入特殊处理 (JS:734-748): mark 只能"移动"到空格, 不能 swap
      if (isMark || otherIsMark) {
        const markFrom = otherIsMark ? otherIdx : i;
        const target = otherIsMark ? i : otherIdx;
        const markValue = this.team[markFrom];
        if (this.team[target] != null) {
          const lbl = markValue === SUMMON_MARK ? '随从位'
            : markValue === CRYSTAL_BALL_MARK ? '水晶球位' : '糖果炸弹位';
          this.showToast(`${lbl} 不能被替换`);
          this.selectedSlotIdx = -1;
          this.refreshUI();
          return;
        }
        this.team[target] = markValue;
        this.team[markFrom] = null;
        this.selectedSlotIdx = -1;
        this.saveTeam();
        this.refreshUI();
        return;
      }
      // 普通 swap (JS:749-755)
      const tmp = this.team[otherIdx];
      this.team[otherIdx] = this.team[i];
      this.team[i] = tmp;
      this.selectedSlotIdx = -1;
      this.saveTeam();
      this.refreshUI();
      return;
    }

    // === 空 slot 路径 ===
    // (a) 有 selectedSlotIdx + 当前空: 把已选龟移到这 (JS:760-768)
    if (this.selectedSlotIdx >= 0 && this.team[this.selectedSlotIdx] != null) {
      this.team[i] = this.team[this.selectedSlotIdx];
      this.team[this.selectedSlotIdx] = null;
      this.selectedSlotIdx = -1;
      this.syncSpecialSlots();
      this.saveTeam();
      this.refreshUI();
      return;
    }
    // (b) 空 slot toggle active — 下次点龟卡片入此槽 (JS:785)
    this.selectedSlotIdx = -1;
    this.activeSlotIdx = (this.activeSlotIdx === i) ? -1 : i;
    this.refreshUI();
  }

  private onClearSlot(i: number) {
    if (this.team[i] == null) return;
    // E3/36 (g): mark slot 点击清不掉 (只能通过移除主人移除)
    if (isSpecialSlotMark(this.team[i])) return;
    this.team[i] = null;
    this.syncSpecialSlots();   // E3/36 (g): 清主龟 → mark 也自动去
    this.saveTeam();
    this.refreshUI();
  }

  // ─── 渲染同步 ───
  private refreshUI() {
    // E3/46: DOM overlay 是 primary 渲染, Phaser 版 deprecated but still called by helpers
    if (this.domRoot) {
      this.refreshDom();
      return;
    }
    // E3/36 Wave 2 (a): team 变化时刷 pet grid 让 selected 态视觉同步
    if (this.petGridContainer) this.refreshPetGrid();
    for (let i = 0; i < SLOT_COUNT; i++) {
      const v = this.slotViews[i];
      if (v.portrait) { v.portrait.destroy(); v.portrait = undefined; }
      if (v.nameText) { v.nameText.destroy(); v.nameText = undefined; }
      if (v.editBtn) { v.editBtn.destroy(); v.editBtn = undefined; }
      if (v.passiveIcon) { v.passiveIcon.destroy(); v.passiveIcon = undefined; }

      const id = this.team[i];
      // E3/36 (g): mark slot 单独渲染 (JS renderFgSlots:933-969 1:1)
      if (id && isSpecialSlotMark(id)) {
        if (v.placeholderPlus) v.placeholderPlus.setVisible(false);
        if (v.placeholderLabel) v.placeholderLabel.setVisible(false);
        const isFront = i < FRONT_SLOTS;
        const baseColor = isFront ? 0xffd93d : 0x58d3ff;
        v.frame.setStrokeStyle(2, baseColor, 0.6);
        // 中央 emoji + 标签
        const meta = id === SUMMON_MARK ? { icon: '?', label: '随从', color: '#ffc850' }
          : id === CRYSTAL_BALL_MARK ? { icon: '🔮', label: '水晶球', color: '#9b6bff' }
          : { icon: '🍬💣', label: '糖果炸弹', color: '#ff6bd8' };
        v.portrait = this.add.image(v.frame.x, v.frame.y - 12, 'btn-frame')
          .setVisible(false) as Phaser.GameObjects.Image;  // 占位 (清理用)
        const ico = this.add.text(v.frame.x, v.frame.y - 12, meta.icon, {
          fontSize: '36px', color: meta.color, fontFamily: 'monospace', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(4);
        v.nameText = this.add.text(v.frame.x, v.frame.y + 32, meta.label, {
          fontSize: '12px', color: meta.color, fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(4);
        // emoji ico 跟着 nameText 一起清: 借用 editBtn 字段当 cleanup ref
        v.editBtn = ico as unknown as Phaser.GameObjects.Container;
        continue;
      }
      if (id) {
        const pet = ALL_PETS.find(p => p.id === id);
        if (pet) {
          // 隐藏 placeholder
          if (v.placeholderPlus) v.placeholderPlus.setVisible(false);
          if (v.placeholderLabel) v.placeholderLabel.setVisible(false);
          // v0.9.5.C: 6 槽 120×120, portrait/name/edit 适配新尺寸
          v.portrait = this.add.image(v.frame.x, v.frame.y - 12, `pet-${pet.id}`).setDisplaySize(62, 62).setDepth(4);
          v.nameText = this.add.text(v.frame.x, v.frame.y + 32, pet.name, {
            fontSize: '12px', color: '#fff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
          }).setOrigin(0.5).setDepth(4);
          // 稀有度角标 (左上)
          this.add.text(v.frame.x - 52, v.frame.y - 52, pet.rarity, {
            fontSize: '10px', color: RARITY_COLOR_STR[pet.rarity as Rarity], fontFamily: 'monospace', fontStyle: 'bold',
            backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 3, y: 1 },
          }).setOrigin(0, 0).setDepth(4);
          v.frame.setStrokeStyle(3, RARITY_COLOR[pet.rarity as Rarity], 0.9);
          // E3/40 Wave 3.20 (C3.6): 删 ✎ 编辑按钮 — JS 没此 button, 编辑技能走 pet 卡 passive icon click
          // v0.9.5.A40: passive icon 左下 (mini 18×18)
          if (pet.passive) {
            const piPath = PASSIVE_ICONS[pet.passive.type as string];
            if (piPath?.endsWith('.png')) {
              v.passiveIcon = addDomImage(this, v.frame.x - 48, v.frame.y + 42, `${piPath}`, 18, 18).setDepth(5);
            } else if (piPath) {
              v.passiveIcon = addDomText(this, v.frame.x - 48, v.frame.y + 42, piPath, { fontSize: 16, pointerThrough: true }).setDepth(5);
            }
          }
        }
      } else {
        // 空槽: 前排 = 黄, 后排 = 蓝 (v0.9.5.C 区分) + 重显 placeholder
        const isFront = i < FRONT_SLOTS;
        // E3/38 Wave 3.8: active slot 加金边 (JS .fg-slot.fg-active CSS 同款)
        const isActive = this.activeSlotIdx === i;
        v.frame.setStrokeStyle(isActive ? 3 : 2,
          isActive ? 0xffd86b : (isFront ? 0xffd93d : 0x58d3ff),
          isActive ? 1 : 0.5);
        if (v.placeholderPlus) v.placeholderPlus.setVisible(true);
        if (v.placeholderLabel) v.placeholderLabel.setVisible(true);
      }
    }

    // E3/36 Wave 2 (c): synergy preview 面板 (JS renderSynergyPreview 1:1)
    // E3/36 (g): mark 不算 picked (不参与羁绊/开始按钮 cap)
    const picked = this.team.filter((id): id is string => id != null && !isSpecialSlotMark(id));
    this.renderSynergyPreview(picked);

    // 开始按钮启用状态 — v0.9.5.A45: 3 只即可 (不再 6 只)
    const ready = picked.length === REQUIRED_PETS;
    (this.startBtn.list[0] as Phaser.GameObjects.Rectangle).setAlpha(ready ? 1 : 0.4);
    (this.startBtn.list[1] as Phaser.GameObjects.Text).setAlpha(ready ? 1 : 0.4);
    (this.startBtn as unknown as { _ready: boolean })._ready = ready;
    // E3/38 Wave 3.7: 文本动态 (JS index.html:329 selectCtaLabel 同款)
    (this.startBtn.list[1] as Phaser.GameObjects.Text).setText(
      ready ? '开始战斗' : `请选择 ${REQUIRED_PETS - picked.length} 只龟`);

    // E3/36 Wave 2 (b): 上次阵容 按钮可见性 — JS:1012 empty=placed==0 + last exists + ids.length==3
    if (this.lastLineupBtn) {
      const empty = picked.length === 0;
      const last = readLastLineup();
      const canRestore = empty && last && Array.isArray(last.ids) && last.ids.length === 3;
      this.lastLineupBtn.setVisible(!!canRestore);
    }
  }

  // ─── 持久化 ───
  private saveTeam() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(this.team)); } catch { /* ignore */ }
  }
  private loadTeam() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length === SLOT_COUNT) {
        for (let i = 0; i < SLOT_COUNT; i++) {
          const id = arr[i];
          this.team[i] = (typeof id === 'string' && ALL_PETS.some(p => p.id === id)) ? id : null;
        }
      }
    } catch { /* ignore */ }
  }

  // ─── E3/36 Wave 2 (b): 上次阵容 按钮 (JS main.js:1009-1014 + restoreLastLineup:1039 1:1) ───
  private makeLastLineupButton(x: number, y: number): Phaser.GameObjects.Container {
    const w = 140, h = 44;
    const c = this.add.container(x, y).setDepth(10).setVisible(false);
    const bg = this.add.rectangle(0, 0, w, h, 0x12202a, 0.92)
      .setStrokeStyle(2, 0x58d3ff, 0.8)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, '↺ 上次阵容', {
      fontSize: '14px', color: '#58d3ff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
    }).setOrigin(0.5);
    c.add(bg); c.add(text);
    bg.on('pointerover', () => bg.setStrokeStyle(3, 0xffd93d));
    bg.on('pointerout', () => bg.setStrokeStyle(2, 0x58d3ff, 0.8));
    bg.on('pointerdown', () => {
      this.tweens.add({ targets: c, scale: 0.94, duration: 60, yoyo: true });
      this.time.delayedCall(80, () => this.restoreLastLineup());
    });
    return c;
  }

  /** E3/36 Wave 2 (c): synergy preview 面板 — JS synergies.js:276-309 renderSynergyPreview 1:1 */
  private renderSynergyPreview(selectedIds: string[]) {
    if (!this.synergyPanel) return;
    const panelEl = this.synergyPanel.node as HTMLElement;
    if (selectedIds.length < 2) {
      panelEl.style.display = 'none';
      return;
    }
    panelEl.style.display = 'block';
    const list = panelEl.querySelector('#synergyPreviewList') as HTMLElement;
    if (!list) return;
    // Build fake team with tags
    const fakeTeam = selectedIds.map(id => {
      const pet = ALL_PETS.find(p => p.id === id);
      return { tags: pet?.tags ?? [] } as unknown as Fighter;
    });
    const synergies = calcActiveSynergies(fakeTeam);
    if (synergies.length === 0) {
      list.innerHTML = '<div style="font-size:11px;color:#888;font-style:italic">当前阵容暂无激活羁绊</div>';
      return;
    }
    synergies.sort((a, b) => b.tier - a.tier);
    list.innerHTML = synergies.map(s => {
      const cfg = SYNERGY_TAGS[s.tag];
      if (!cfg) return '';
      const tierCfg = s.tier === 3 ? cfg.tier3 : cfg.tier2;
      const tierColor = s.tier === 3 ? '#ffd93d' : '#aaa';
      return `<div style="display:flex;gap:8px;align-items:baseline;margin-bottom:3px;font-size:11px">
        <span style="color:${tierColor};font-weight:bold">${cfg.emoji || ''} ${cfg.name} ×${s.tier}</span>
        <span style="color:#bcd">${tierCfg?.desc || ''}</span>
      </div>`;
    }).join('');
  }

  /** E3/36 Wave 2 (g): 同步特殊占位 (summon/crystal-ball/candy-bomb) — JS syncSpecialSlots 1:1 */
  private syncSpecialSlots() {
    this.syncMarkSlot('hiding', SUMMON_MARK, false);   // 缩头乌龟 在阵 → 加 summon
    this.syncMarkSlot('crystal', CRYSTAL_BALL_MARK, true, 'crystalBall');
    this.syncMarkSlot('candy', CANDY_BOMB_MARK, true, 'candyBombPassive');
  }

  /** 通用 mark slot 同步 (JS syncSummonSlot/Crystal/Candy 抽公共) */
  private syncMarkSlot(petId: string, mark: string, requirePassive: boolean, passiveType?: string) {
    const hasPet = this.team.includes(petId);
    // crystal/candy 需检 loadout 是否含特定 passive
    let shouldHave = hasPet;
    if (hasPet && requirePassive && passiveType) {
      const pet = ALL_PETS.find(p => p.id === petId);
      const loadout = getLoadout(petId) || pet?.defaultSkills || [0, 1, 2];
      shouldHave = !!loadout.some(i => pet?.skillPool?.[i]?.type === passiveType);
    }
    const idx = this.team.indexOf(mark);
    if (shouldHave && idx < 0) {
      // 优先 back-2/1/0 → front-2/1/0 (JS:619 同款 order)
      const order = [5, 4, 3, 2, 1, 0];
      const empty = order.find(i => this.team[i] === null);
      if (empty !== undefined) this.team[empty] = mark;
    } else if (!shouldHave && idx >= 0) {
      this.team[idx] = null;
    }
  }

  /** 恢复上次阵容 — JS main.js:1039-1062 restoreLastLineup 1:1 */
  private restoreLastLineup() {
    const last = readLastLineup();
    if (!last?.slotMap) return;
    const validIds = new Set(ALL_PETS.map(p => p.id));
    this.team = new Array(SLOT_COUNT).fill(null);
    for (const [slotKey, petId] of Object.entries(last.slotMap)) {
      const idx = SLOT_KEYS.indexOf(slotKey as typeof SLOT_KEYS[number]);
      if (idx < 0 || !validIds.has(petId)) continue;
      this.team[idx] = petId;
    }
    this.saveTeam();
    this.refreshUI();
  }

  // ─── 开始战斗按钮 ───
  private makeStartButton(x: number, y: number): Phaser.GameObjects.Container {
    const w = 240, h = 56;
    const container = this.add.container(x, y).setDepth(10);
    const bg = this.add.image(0, 0, 'btn-frame').setDisplaySize(w, h)
      .setInteractive({ useHandCursor: true });
    // E3/38 Wave 3.7: 文本动态 — JS index.html:329 `<span id="selectCtaLabel">请选择 3 只龟</span>` 1:1
    const text = this.add.text(0, -2, '请选择 3 只龟', {
      fontSize: '20px', color: '#3a1f00', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      stroke: '#ffe4a0', strokeThickness: 2,
    }).setOrigin(0.5);
    container.add(bg);
    container.add(text);

    bg.on('pointerover', () => {
      if (!(container as unknown as { _ready: boolean })._ready) return;
      this.tweens.add({ targets: container, scale: 1.05, duration: 100, ease: 'back.out' });
    });
    bg.on('pointerout', () => {
      this.tweens.add({ targets: container, scale: 1, duration: 100, ease: 'back.out' });
      bg.setTexture('btn-frame');
    });
    bg.on('pointerdown', () => {
      if (!(container as unknown as { _ready: boolean })._ready) {
        this.cameras.main.shake(60, 0.003);
        return;
      }
      bg.setTexture('btn-frame-pressed');
      this.tweens.add({ targets: container, scale: 0.96, duration: 60, yoyo: true });
      this.time.delayedCall(100, () => this.startBattle());
    });

    return container;
  }

  private startBattle() {
    // E3/36 Wave 2 (b): 写 lastLineup 让下次进入可恢复 (JS main.js:1451 _writeLastLineup 1:1)
    writeLastLineup(this.team);
    // Phase C: 1:1 ports JS _buildTeamFromSlots (main.js:1394-1411) —
    //   filter 掉特殊 mark, 把 mark 的 slotKey 单独存为 saved metadata 传给 BattleScene
    // 旧 bug: marks (e.g. '_summon') 也 push 进 leftTeam, BattleScene 找不到对应 PetDef 静默 fail
    const summonSlot = SLOT_KEYS[this.team.indexOf(SUMMON_MARK)] ?? null;
    const crystalBallSlot = SLOT_KEYS[this.team.indexOf(CRYSTAL_BALL_MARK)] ?? null;
    const candyBombSlot = SLOT_KEYS[this.team.indexOf(CANDY_BOMB_MARK)] ?? null;
    const leftTeam: string[] = [];
    const leftSlots: string[] = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
      const id = this.team[i];
      if (id && !isSpecialSlotMark(id)) {
        leftTeam.push(id);
        leftSlots.push(SLOT_KEYS[i]);
      }
    }
    // P2.1: 把 loadout 一起传过去, BattleScene 在 createFighter 时按 id 查 idxs
    const loadouts: Record<string, number[]> = {};
    for (const id of leftTeam) {
      const l = getLoadout(id);
      if (l) loadouts[id] = l;
    }
    // Phase C: savedSlots — JS main.js:1406-1408 1:1, BattleScene 用作 spawnSummonAlly 偏好 slot
    const savedSlots = {
      summon: summonSlot ?? undefined,
      crystalBall: crystalBallSlot ?? undefined,
      candyBomb: candyBombSlot ?? undefined,
    };
    // E3/35 (Wave 1): 野生对局 confirmTeam 后弹 rule pick modal (JS main.js:1490-1493 1:1)
    // P27: 全部 直接 start, 不 fadeOut 黑屏
    if (this.mode === 'pve') {
      this.showRulePickModal((picked) => {
        this.rule = picked.name;
        this.scene.start('BattleScene', { leftTeam, leftSlots, mode: this.mode, rule: this.rule, loadouts, savedSlots });
      });
      return;
    }
    if (this.mode === 'boss-pick') {
      this.scene.start('BossPickScene', { leftTeam, leftSlots, loadouts });
      return;
    }
    // P219 修深海进度链断裂: 深海闯关回 DungeonScene 关卡 hub (第 1 关), 由它带 dungeonStage +
    //   每关难度参数启动战斗 (与 RewardPick→DungeonScene 后续关同一路径)。之前这里直接 start
    //   BattleScene 不传 dungeonStage → 默认 0 → BattleEndScene isDungeon(stage>0) 判 false →
    //   第 1 关胜利后走通用"再战/主菜单"而非"选奖励→下一关", 且首回合 3 选 1 装备 (stage===1) 也被跳过。
    if (this.mode === 'dungeon') {
      this.scene.start('DungeonScene', { stage: 1, playerTeam: leftTeam, playerSlots: leftSlots, loadouts });
      return;
    }
    this.scene.start('BattleScene', { leftTeam, leftSlots, mode: this.mode, rule: this.rule, loadouts, savedSlots });
  }

  // Phase C: 简易 toast (JS main.js showToast / ui.js:* 1:1 替代)
  // 用 DOM 注入 + 自动 fade-out, 同时只显示 1 条 (新 toast 替换旧)
  private showToast(msg: string) {
    let toast = document.getElementById('poc-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'poc-toast';
      toast.style.cssText = `
        position: fixed; left: 50%; bottom: 80px; transform: translateX(-50%);
        background: rgba(0,0,0,.85); color: #ffd86b;
        padding: 10px 20px; border-radius: 8px;
        border: 1px solid rgba(255,216,107,.5);
        font-family: 'pixel-zh', 'Microsoft YaHei', system-ui;
        font-size: 14px; font-weight: 700;
        z-index: 3000; pointer-events: none;
        opacity: 0; transition: opacity .2s;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    // 强制 reflow + fade in
    void toast.offsetWidth;
    toast.style.opacity = '1';
    // clear pending hide
    const t = toast as HTMLElement & { _hideTimer?: number };
    if (t._hideTimer) clearTimeout(t._hideTimer);
    t._hideTimer = window.setTimeout(() => { if (toast) toast.style.opacity = '0'; }, 1800);
  }

  /** E3/35 (Wave 1): rule pick DOM modal overlay — JS battle-setup.js:34-68 showRulePickModal 1:1
   *   - 半透明 veil + .rule-pick-box 居中
   *   - 7 卡 (fire/thunder/shield/rage/equip/rain/normal)
   *   - 🎲 随机一个 按钮底部
   *   - 点卡 / 点随机 → callback(rule) + 关 modal
   */
  private showRulePickModal(onPick: (rule: BattleRule) => void) {
    // 直接 DOM 注入 (跟 JS overlay 1:1)
    const overlay = document.createElement('div');
    overlay.id = 'rulePickOverlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:1000;
      background:rgba(0,0,0,0.7);
      display:flex;align-items:center;justify-content:center;
      opacity:0;transition:opacity .25s ease;
      font-family:m6x11,pixel-zh, Microsoft YaHei,system-ui;
    `;
    const box = document.createElement('div');
    box.style.cssText = `
      background:#0a0e18;border:3px solid #ffd93d;border-radius:14px;
      padding:24px 28px;max-width:920px;width:90%;
      box-shadow:0 0 32px rgba(255,217,107,.3);
    `;
    const title = document.createElement('h3');
    title.textContent = '🎯 选择本局规则';
    title.style.cssText = 'color:#ffd93d;font-size:22px;text-align:center;margin:0 0 18px;letter-spacing:2px';
    box.appendChild(title);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(4, 1fr);gap:14px;margin-bottom:18px';
    for (const r of BATTLE_RULES) {
      const card = document.createElement('div');
      const colorHex = '#' + r.color.toString(16).padStart(6, '0');
      card.style.cssText = `
        background:#12202a;border:2px solid ${colorHex};border-radius:10px;
        padding:14px 12px;text-align:center;cursor:pointer;
        transition:transform .15s ease, border-color .15s;
      `;
      card.innerHTML = `
        <div style="height:56px;margin-bottom:6px;display:flex;align-items:center;justify-content:center">
          <img src="${r.icon}" alt="${r.name}" style="max-width:56px;max-height:56px;object-fit:contain"
               onerror="this.outerHTML='<span style=&quot;font-size:32px&quot;>${r.emoji}</span>'">
        </div>
        <div style="color:${colorHex};font-size:15px;font-weight:bold;margin-bottom:6px">${r.name}</div>
        <div style="color:#bcd;font-size:11px;line-height:1.5">${r.desc}</div>
      `;
      card.onmouseover = () => { card.style.transform = 'scale(1.04)'; card.style.borderColor = '#ffd93d'; };
      card.onmouseout = () => { card.style.transform = 'scale(1)'; card.style.borderColor = colorHex; };
      card.onclick = () => finish(r);
      grid.appendChild(card);
    }
    box.appendChild(grid);

    // 🎲 随机一个 (JS battle-setup.js:67 rulePickRandomBtn 1:1)
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'text-align:center';
    const randBtn = document.createElement('button');
    randBtn.textContent = '🎲 随机一个';
    randBtn.style.cssText = `
      background:#2a1a40;color:#ffd93d;border:2px solid #ffd93d;border-radius:8px;
      padding:8px 28px;font-size:16px;font-weight:bold;cursor:pointer;
      font-family:m6x11,pixel-zh, Microsoft YaHei,system-ui;letter-spacing:2px;
    `;
    randBtn.onclick = () => finish(BATTLE_RULES[Math.floor(Math.random() * BATTLE_RULES.length)]);
    btnRow.appendChild(randBtn);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    // fade-in
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });

    const finish = (rule: BattleRule) => {
      overlay.style.opacity = '0';
      setTimeout(() => { overlay.remove(); }, 250);
      onPick(rule);
    };
  }

  // ─── P2.1: 技能编辑按钮 + 5 选 3 modal ───
  private makeEditButton(x: number, y: number, petId: string): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(5);
    const bg = this.add.circle(0, 0, 14, 0x1a2740, 0.95).setStrokeStyle(2, 0xffd93d)
      .setInteractive({ useHandCursor: true });
    const ico = this.add.text(0, -1, '✎', {
      fontSize: '14px', color: '#ffd93d', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    c.add(bg); c.add(ico);
    bg.on('pointerover', () => bg.setStrokeStyle(3, 0xfff3a0));
    bg.on('pointerout', () => bg.setStrokeStyle(2, 0xffd93d));
    bg.on('pointerdown', () => {
      this.tweens.add({ targets: c, scale: 0.85, duration: 60, yoyo: true });
      this.time.delayedCall(80, () => this.openSkillPicker(petId));
    });
    return c;
  }

  // Phase B: PDP — DOM overlay 版 (JS main.js:1109-1360 showSkillPickModal 功能 1:1, 视觉自排版)
  //   JS 原用 menu/pdp-*.png 羊皮纸 9-slice 浅色风格, 与 Phaser TeamSelect 黑底冲突.
  //   功能 1:1 移植: 大 sprite + Lv + rarity + name → 4 stat (含 getLevelBonus) → 6 行
  //     (passive + 5 skills, 含等级锁/基础锁/被动 tag/conflictsWith/✓+🔒/full 5 状态) →
  //     desc 区点击 brief/detail toggle → 返回 / 确认 (X/3)
  //   _pdpClickRow / _pdpToggleDesc / _skillPickToggle / _skillPickConfirm / _skillPickBack
  //     用闭包不挂 window (JS 挂 window 是 inline onclick 必要, 我们用 addEventListener)
  private openSkillPicker(petId: string) {
    if (this.pickerOpen) return;
    const pet = ALL_PETS.find(p => p.id === petId);
    if (!pet || !pet.skillPool) return;
    this.pickerOpen = true;

    // JS main.js:1124-1126 — saved → fallback defaultSkills → 兜底 [0,1,2]
    // skill 0 (基础) 永远 included (JS:1126)
    const unlockedIdxs = new Set(getAvailableSkillIndices(petId));
    const saved = getLoadout(petId) ?? pet.defaultSkills ?? [0, 1, 2];
    let selected = saved.filter(i => unlockedIdxs.has(i)).slice(0, 3);
    if (!selected.includes(0)) selected = [0, ...selected.slice(0, 2)];
    // activeRow + descMode state — JS main.js:1128-1130
    let activeRow: { kind: 'passive' } | { kind: 'skill'; idx: number } | null = null;
    let descMode: 'brief' | 'detail' = 'brief';

    // 等级 + getLevelBonus (JS main.js:1143-1148 1:1)
    const lv = getPetLevel(petId);
    const bonus = getLevelBonus(petId);
    // P126: +100 耐久度已 baked 进 pets.ts hp, 这里不再额外 +100
    const hp = Math.round(pet.hp * bonus);
    const atk = Math.round(pet.atk * bonus);
    const def = Math.round(pet.def * bonus);
    const mr = Math.round((pet.mr ?? pet.def) * bonus);
    // fakeFighter (JS main.js:1149) — 给 renderSkillTemplate 用
    const fakeF = { atk, def, mr, maxHp: hp, crit: pet.crit ?? 0.25, passive: pet.passive };

    // ── 建 DOM overlay ──
    let overlay = document.getElementById('poc-pdp-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'poc-pdp-overlay';
      document.body.appendChild(overlay);
    }
    overlay.classList.add('show');

    // 渲染函数 — 每次 state 变就全 rerender (跟 JS render() 1:1 行为)
    const render = () => {
      // JS main.js:1166-1178 build rows (passive + 5 skills, 不足 pad empty)
      type Row = { kind: 'passive' | 'skill' | 'empty'; idx?: number; name?: string };
      const rows: Row[] = [];
      if (pet.passive) rows.push({ kind: 'passive', name: pet.passive.name ?? '被动' });
      for (let i = 0; i < pet.skillPool.length && rows.length < 6; i++) {
        rows.push({ kind: 'skill', idx: i, name: pet.skillPool[i].name });
      }
      while (rows.length < 6) rows.push({ kind: 'empty' });

      // 各行 HTML — JS main.js:1180-1222 renderRow 1:1 (passive 行 + skill 行 5 状态)
      const rowsHtml = rows.map(row => {
        if (row.kind === 'empty') return `<div class="poc-pdp-row" style="visibility:hidden"></div>`;
        const isActive = activeRow != null && activeRow.kind === row.kind
          && (row.kind === 'passive' || (activeRow.kind === 'skill' && activeRow.idx === row.idx));
        const classes = ['poc-pdp-row'];
        if (isActive) classes.push('is-active');
        let rightDecor = '';
        let iconHtml = '<span class="poc-pdp-emoji">🎯</span>';
        if (row.kind === 'passive') {
          classes.push('is-passive');
          rightDecor = `<span class="poc-pdp-row-tag poc-pdp-tag-passive">被动</span>`;
          const piRaw = pet.passive ? (PASSIVE_ICONS[pet.passive.type] || '⭐') : '⭐';
          if (typeof piRaw === 'string' && piRaw.endsWith('.png')) {
            iconHtml = `<img src="${piRaw}" alt="">`;
          } else {
            iconHtml = `<span class="poc-pdp-emoji">${piRaw}</span>`;
          }
        } else {
          const i = row.idx!;
          const s = pet.skillPool[i] as PetDef['skillPool'][number] & { passiveSkill?: boolean; conflictsWith?: number };
          const isFixed = i === 0;
          const isLevelLocked = !unlockedIdxs.has(i);
          const isPassiveSkill = !!s.passiveSkill;
          const isSel = selected.includes(i);
          if (isLevelLocked) classes.push('is-locked');
          if (isSel) classes.push('is-selected');
          // 被动技能 tag 永远显示
          const passiveTag = isPassiveSkill
            ? `<span class="poc-pdp-row-tag poc-pdp-tag-passive">被动</span>` : '';
          // JS main.js:1204-1213 5 状态
          if (isLevelLocked) {
            const lvReq = i === 3 ? 'Lv.4' : 'Lv.7';
            rightDecor = `<span class="poc-pdp-row-tag poc-pdp-tag-lock">${lvReq}</span><span class="poc-pdp-equip-btn poc-pdp-equip-locked" data-action="locked" title="等级锁">🔒</span>`;
          } else if (isFixed) {
            rightDecor = `<span class="poc-pdp-row-tag poc-pdp-tag-fixed">基础</span><span class="poc-pdp-equip-btn poc-pdp-equip-fixed" data-action="fixed">✓</span>`;
          } else if (isSel) {
            rightDecor = `${passiveTag}<span class="poc-pdp-equip-btn poc-pdp-equip-on" data-action="toggle" data-idx="${i}" title="点击取消">✓</span>`;
          } else {
            const canEquip = selected.length < 3;
            const cls = canEquip ? 'poc-pdp-equip-add' : 'poc-pdp-equip-full';
            const action = canEquip ? `data-action="toggle" data-idx="${i}"` : '';
            const title = canEquip ? '点击装配' : '已满 3 槽';
            rightDecor = `${passiveTag}<span class="poc-pdp-equip-btn ${cls}" ${action} title="${title}">+</span>`;
          }
        }
        const ds = row.kind === 'passive' ? `data-row="passive"` : `data-row="skill" data-idx="${row.idx}"`;
        return `<div class="${classes.join(' ')}" ${ds}>
          <span class="poc-pdp-row-icon">${iconHtml}</span>
          <span class="poc-pdp-row-name">${row.name}</span>
          ${rightDecor}
        </div>`;
      }).join('');

      // Desc 区 — JS main.js:1224-1266 1:1
      let descTitle = '', descBody = '', descToggleBtn = '';
      if (activeRow != null) {
        if (activeRow.kind === 'passive' && pet.passive) {
          descTitle = `<b>${pet.passive.name ?? '被动'}</b> <span class="poc-pdp-row-tag poc-pdp-tag-passive">被动</span>`;
          const briefRaw = String(pet.passive.brief ?? '');
          const detailRaw = String(pet.passive.desc ?? pet.passive.brief ?? '');
          const briefHtml = renderSkillTemplate(briefRaw, fakeF, pet.passive as unknown as Record<string, unknown>);
          const detailHtml = renderSkillTemplate(detailRaw, fakeF, pet.passive as unknown as Record<string, unknown>).replace(/\n/g, '<br>');
          descBody = (descMode === 'detail' && detailHtml) ? detailHtml : briefHtml;
          if (detailHtml && detailHtml !== briefHtml) {
            descToggleBtn = `<button class="poc-pdp-desc-toggle" data-action="desc-toggle">${descMode === 'detail' ? '简略 ↑' : '详细 ↓'}</button>`;
          }
        } else if (activeRow.kind === 'skill') {
          const i = activeRow.idx;
          const s = pet.skillPool[i] as PetDef['skillPool'][number] & { passiveSkill?: boolean; _isCommon?: boolean };
          const cdText = s.cd ? `<span class="poc-pdp-skill-cd">CD${s.cd}</span>` : '';
          descTitle = `<b>${s.name}</b> ${cdText}`;
          const briefHtml = renderSkillTemplate(s.brief ?? '', fakeF, s as unknown as Record<string, unknown>);
          const detailRaw = s.detail ?? s.brief ?? '';
          const detailHtml = renderSkillTemplate(detailRaw, fakeF, s as unknown as Record<string, unknown>).replace(/\n/g, '<br>');
          // JS main.js:1247-1258 1:1 — 双形态 paired skill 描述
          //   two_head: 远程 skillPool[i] + 近战 meleeSkills[i] 一一对应
          //   lava:     普通 skillPool[i] + 火山 volcanoSkills[i] 一一对应
          //   cyber:    类似 (cyber 没 meleeSkills 但 PoC 可能有 _isCommon flag)
          let pairedHtml = '';
          const petWithMelee = pet as PetDef & { meleeSkills?: PetDef['skillPool']; volcanoSkills?: PetDef['skillPool'] };
          const hasMelee = Array.isArray(petWithMelee.meleeSkills) && petWithMelee.meleeSkills.length > 0;
          const hasVolcano = Array.isArray(petWithMelee.volcanoSkills) && petWithMelee.volcanoSkills.length > 0;
          if (hasMelee && i < (petWithMelee.meleeSkills?.length ?? 0) && !s._isCommon) {
            const ms = petWithMelee.meleeSkills![i];
            const mBrief = renderSkillTemplate(ms.brief ?? '', fakeF, ms as unknown as Record<string, unknown>);
            pairedHtml += `<div class="poc-pdp-skill-paired"><span class="poc-pdp-paired-label">近战：</span><b>${ms.name}</b> — ${mBrief}</div>`;
          }
          if (hasVolcano && i < (petWithMelee.volcanoSkills?.length ?? 0) && !s.passiveSkill) {
            const vs = petWithMelee.volcanoSkills![i] as PetDef['skillPool'][number] & { passiveSkill?: boolean };
            if (vs && !vs.passiveSkill) {
              const vBrief = renderSkillTemplate(vs.brief ?? '', fakeF, vs as unknown as Record<string, unknown>);
              pairedHtml += `<div class="poc-pdp-skill-paired"><span class="poc-pdp-paired-label" style="color:#ff6600">火山：</span><b>${vs.name}</b> — ${vBrief}</div>`;
            }
          }
          descBody = ((descMode === 'detail' && detailHtml) ? detailHtml : briefHtml) + pairedHtml;
          if (detailHtml && detailHtml !== briefHtml) {
            descToggleBtn = `<button class="poc-pdp-desc-toggle" data-action="desc-toggle">${descMode === 'detail' ? '简略 ↑' : '详细 ↓'}</button>`;
          }
        }
      } else {
        descBody = `<span class="poc-pdp-desc-hint">点击上方任意一行查看技能/被动详情</span>`;
      }

      const rColor = RARITY_COLOR_STR[pet.rarity as Rarity];
      overlay!.innerHTML = `
        <div class="poc-pdp-box">
          <div class="poc-pdp-top">
            <div class="poc-pdp-left">
              <div class="poc-pdp-char-frame">${buildPetImgHTML(pet, 180)}</div>
              <div class="poc-pdp-name-banner">
                <span class="poc-pdp-banner-text" style="color:${rColor}">${pet.name}</span>
                <span class="poc-pdp-rarity-badge" style="background:${rColor}">${pet.rarity}</span>
                <span class="poc-pdp-lv">Lv.${lv}</span>
              </div>
            </div>
            <div class="poc-pdp-right">
              <div class="poc-pdp-stats">
                <span class="poc-pdp-stat-cell" data-stat="hp"><img class="poc-pdp-stat-icon" src="stats/hp-icon.png" alt=""><span class="poc-pdp-stat-label">生命</span><span class="poc-pdp-stat-value">${hp}</span></span>
                <span class="poc-pdp-stat-cell" data-stat="atk"><img class="poc-pdp-stat-icon" src="stats/atk-icon.png" alt=""><span class="poc-pdp-stat-label">攻击</span><span class="poc-pdp-stat-value">${atk}</span></span>
                <span class="poc-pdp-stat-cell" data-stat="def"><img class="poc-pdp-stat-icon" src="stats/def-icon.png" alt=""><span class="poc-pdp-stat-label">护甲</span><span class="poc-pdp-stat-value">${def}</span></span>
                <span class="poc-pdp-stat-cell" data-stat="mr"><img class="poc-pdp-stat-icon" src="stats/mr-icon.png" alt=""><span class="poc-pdp-stat-label">魔抗</span><span class="poc-pdp-stat-value">${mr}</span></span>
              </div>
              <div class="poc-pdp-rows">${rowsHtml}</div>
            </div>
          </div>
          <div class="poc-pdp-desc ${activeRow != null ? 'has-content' : ''}" data-action="${activeRow != null && descToggleBtn ? 'desc-toggle' : ''}">
            ${activeRow != null ? `<div class="poc-pdp-desc-head">${descTitle}${descToggleBtn}</div>` : ''}
            <div class="poc-pdp-desc-body">${descBody}</div>
          </div>
          <div class="poc-pdp-footer">
            <button class="poc-pdp-btn poc-pdp-btn-cancel" data-action="cancel">返回</button>
            <button class="poc-pdp-btn poc-pdp-btn-confirm" data-action="confirm" ${selected.length === 3 ? '' : 'disabled'}>确认 (${selected.length}/3)</button>
          </div>
        </div>
      `;

      // Wire row clicks (JS main.js:1308-1319 _pdpClickRow 1:1)
      overlay!.querySelectorAll<HTMLElement>('.poc-pdp-row').forEach(rowEl => {
        const kind = rowEl.dataset.row;
        if (!kind) return;
        rowEl.addEventListener('click', (e) => {
          // 如果点的是装备 btn 自己, stop (单独 handler 处理)
          if ((e.target as HTMLElement).closest('.poc-pdp-equip-btn')) return;
          if (kind === 'passive') {
            const same = activeRow?.kind === 'passive';
            activeRow = same ? null : { kind: 'passive' };
          } else {
            const idx = parseInt(rowEl.dataset.idx || '-1', 10);
            const same = activeRow?.kind === 'skill' && activeRow.idx === idx;
            activeRow = same ? null : { kind: 'skill', idx };
          }
          descMode = 'brief';
          render();
        });
      });
      // Wire equip btn (JS main.js:1327-1340 _skillPickToggle 1:1)
      overlay!.querySelectorAll<HTMLElement>('.poc-pdp-equip-btn[data-action="toggle"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.idx || '-1', 10);
          if (idx < 0) return;
          if (idx === 0) return;  // skill 0 fixed
          if (!unlockedIdxs.has(idx)) return;
          const s = pet.skillPool[idx] as PetDef['skillPool'][number] & { conflictsWith?: number };
          if (selected.includes(idx)) {
            selected = selected.filter(x => x !== idx);
          } else if (selected.length < 3) {
            // conflictsWith 互斥 (JS main.js:1334-1336)
            if (s.conflictsWith !== undefined && selected.includes(s.conflictsWith)) {
              selected = selected.filter(x => x !== s.conflictsWith);
            }
            selected.push(idx);
          }
          render();
        });
      });
      // Desc toggle (head btn + frame click — JS main.js:1293/1321-1325)
      const descEl = overlay!.querySelector<HTMLElement>('.poc-pdp-desc');
      const descToggle = overlay!.querySelector<HTMLElement>('[data-action="desc-toggle"]');
      const onDescToggle = (e: Event) => {
        e.stopPropagation();
        if (activeRow == null) return;
        descMode = descMode === 'brief' ? 'detail' : 'brief';
        render();
      };
      if (descToggle) descToggle.addEventListener('click', onDescToggle);
      if (descEl && activeRow != null) descEl.addEventListener('click', onDescToggle);
      // Footer (JS main.js:1342-1357 _skillPickConfirm / _skillPickBack)
      overlay!.querySelector<HTMLElement>('[data-action="cancel"]')?.addEventListener('click', () => {
        this.closeSkillPicker();
      });
      overlay!.querySelector<HTMLElement>('[data-action="confirm"]')?.addEventListener('click', () => {
        if (selected.length !== 3) return;
        const final = [...selected].sort((a, b) => a - b);
        writeLoadout(petId, final);
        this.closeSkillPicker();
      });
    };
    render();
  }

  // Legacy Phaser-native picker stub (deprecated, replaced by DOM overlay above) ──
  // Old layout uses Phaser geometry — kept until all callers updated to DOM version
  private _openSkillPickerLegacyUNUSED(petId: string) {
    if (this.pickerOpen) return;
    const pet = ALL_PETS.find(p => p.id === petId);
    if (!pet || !pet.skillPool) return;
    const activeIdxs: number[] = [];
    pet.skillPool.forEach((s, i) => { if (!s.passiveSkill) activeIdxs.push(i); });

    this.pickerOpen = true;
    const { width, height } = this.scale.gameSize;
    const layer = this.add.container(0, 0).setDepth(300);
    const veil = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
      .setInteractive();
    layer.add(veil);

    const panelW = Math.min(960, width - 40), panelH = Math.min(620, height - 40);
    const panelX = width / 2, panelY = height / 2;
    const panel = this.add.rectangle(panelX, panelY, panelW, panelH, 0x1a2740, 0.98)
      .setStrokeStyle(3, 0xffd93d);
    layer.add(panel);

    // ── 左列: 大 sprite + Lv badge + name banner ──
    const leftColX = panelX - panelW / 2 + 110;
    const leftColY = panelY - panelH / 2 + 40;
    // Sprite frame (180×180 大头像)
    const frame = this.add.rectangle(leftColX, leftColY + 110, 200, 200, 0x000000, 0.4)
      .setStrokeStyle(2, 0xffd93d, 0.6);
    layer.add(frame);
    if (this.textures.exists(`pet-${pet.id}`)) {
      const spr = this.add.image(leftColX, leftColY + 110, `pet-${pet.id}`);
      const sw = spr.width || 180, sh = spr.height || 180;
      const scale = Math.min(180 / sw, 180 / sh);
      spr.setDisplaySize(sw * scale, sh * scale);
      layer.add(spr);
    }
    // Name banner (under sprite)
    const banner = this.add.rectangle(leftColX, leftColY + 230, 210, 40, 0x0a0e18, 0.92)
      .setStrokeStyle(2, RARITY_COLOR[pet.rarity], 0.8);
    layer.add(banner);
    layer.add(this.add.text(leftColX, leftColY + 224, pet.name, {
      fontSize: '17px', color: RARITY_COLOR_STR[pet.rarity], fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
    }).setOrigin(0.5));
    layer.add(this.add.text(leftColX - 80, leftColY + 244, pet.rarity, {
      fontSize: '12px', color: '#fff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      backgroundColor: RARITY_COLOR_STR[pet.rarity], padding: { x: 6, y: 2 },
    }).setOrigin(0, 0.5));
    layer.add(this.add.text(leftColX + 60, leftColY + 244, 'Lv.1', {
      fontSize: '12px', color: '#aaa', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5));

    // ── 右上: 4 属性 grid (HP/ATK/DEF/MR) ──
    const statsX = panelX - panelW / 2 + 240;
    const statsY = leftColY - 20;
    const lv = 1;
    const bonus = 1; // 等级 mult
    // P126: +100 耐久度已 baked 进 pets.ts hp
    const hp = Math.round(pet.hp * bonus);
    const atk = Math.round(pet.atk * bonus);
    const def = Math.round(pet.def * bonus);
    const mr = Math.round((pet.mr ?? pet.def) * bonus);
    const statBox = (x: number, y: number, label: string, value: number, color: string) => {
      const w = 130, h = 50;
      const bg = this.add.rectangle(x, y, w, h, 0x0a0e18, 0.92).setStrokeStyle(2, 0x58d3ff, 0.5);
      layer.add(bg);
      layer.add(this.add.text(x - w / 2 + 10, y - 10, label, {
        fontSize: '11px', color: '#888', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
      }).setOrigin(0, 0.5));
      layer.add(this.add.text(x - w / 2 + 10, y + 10, String(value), {
        fontSize: '18px', color, fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      }).setOrigin(0, 0.5));
    };
    statBox(statsX + 70, statsY, '生命', hp, '#06d6a0');
    statBox(statsX + 220, statsY, '攻击', atk, '#ff8c42');
    statBox(statsX + 70, statsY + 60, '护甲', def, '#ffd93d');
    statBox(statsX + 220, statsY + 60, '魔抗', mr, '#4dabf7');
    void lv;

    // ── 右下: 6 行 (1 passive + 5 skills) ──
    const rowsX = panelX - panelW / 2 + 240;
    const rowsY = leftColY + 130;
    const rowW = panelW - 280, rowH = 36;
    const stored = getLoadout(petId);
    const initialIdxs = (stored && stored.length > 0)
      ? stored.filter(i => activeIdxs.includes(i)).slice(0, 3)
      : (pet.defaultSkills ?? [0, 1, 2]).filter(i => activeIdxs.includes(i)).slice(0, 3);
    const selected = new Set<number>(initialIdxs);
    // Active row state
    let activeRow: { kind: 'passive' } | { kind: 'skill'; idx: number } | null = null;
    let descMode: 'brief' | 'detail' = 'brief';

    type RowInfo = { kind: 'passive' | 'skill' | 'empty'; idx?: number; name: string; iconHtml?: string; sk?: PetDef['skillPool'][number] };
    const rows: RowInfo[] = [];
    if (pet.passive) {
      rows.push({ kind: 'passive', name: pet.passive.name ?? '被动', iconHtml: PASSIVE_ICONS[pet.passive.type] ?? '⭐' });
    }
    for (let i = 0; i < pet.skillPool.length && rows.length < 6; i++) {
      const s = pet.skillPool[i];
      rows.push({ kind: 'skill', idx: i, name: s.name, sk: s });
    }
    while (rows.length < 6) rows.push({ kind: 'empty', name: '' });

    const rowRefs: Array<{ row: RowInfo; bg: Phaser.GameObjects.Rectangle; rightEl: Phaser.GameObjects.Text }> = [];
    rows.forEach((row, ri) => {
      const ry = rowsY + ri * (rowH + 4);
      const bg = this.add.rectangle(rowsX + rowW / 2, ry, rowW, rowH, 0x0a0e18, 0.85)
        .setStrokeStyle(2, 0x58d3ff, 0.4);
      layer.add(bg);

      // 行内容: icon + name + right decor
      let icon = '⭐';
      if (row.kind === 'passive' && row.iconHtml) {
        // PASSIVE_ICONS 是 PNG 路径 e.g. "passive/fortune-gold-icon.png" — 简化用 emoji 占位
        icon = '⭐';
      } else if (row.kind === 'skill') {
        icon = '🎯';
      }
      if (row.kind !== 'empty') {
        layer.add(this.add.text(rowsX + 12, ry, icon, {
          fontSize: '18px', fontFamily: 'monospace',
        }).setOrigin(0, 0.5));
        layer.add(this.add.text(rowsX + 40, ry, row.name, {
          fontSize: '14px', color: row.kind === 'passive' ? '#c77dff' : '#ffd93d',
          fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
        }).setOrigin(0, 0.5));
      }

      // Right decor (✓ for selected, + for unselected, 基础 for fixed, 被动 tag for passive)
      let rightLabel = '';
      let rightColor = '#888';
      if (row.kind === 'passive') {
        rightLabel = '被动';
        rightColor = '#c77dff';
      } else if (row.kind === 'skill') {
        const i = row.idx!;
        const isFixed = i === 0;
        const isSel = selected.has(i);
        if (isFixed) { rightLabel = '基础 ✓'; rightColor = '#06d6a0'; }
        else if (isSel) { rightLabel = '✓'; rightColor = '#06d6a0'; }
        else { rightLabel = '+'; rightColor = selected.size < 3 ? '#fff' : '#666'; }
      }
      const rightEl = this.add.text(rowsX + rowW - 24, ry, rightLabel, {
        fontSize: '13px', color: rightColor,
        fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      }).setOrigin(0.5);
      layer.add(rightEl);

      if (row.kind === 'empty') return;
      rowRefs.push({ row, bg, rightEl });

      // Click handler
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number) => {
        const isRightClick = false; // Phaser 不区分, 我们让 click 走 select 逻辑 + 双击切换 desc
        if (row.kind === 'passive') {
          activeRow = { kind: 'passive' };
          descMode = 'brief';
          refreshUI();
          return;
        }
        const i = row.idx!;
        // Click 卡片 = toggle desc; right-side ✓/+ 区 = toggle select
        // 简化: 点 left 80% (name 区) → desc; 点 right 20% (✓/+) → select
        // 这里 bg 是整行, 用 pointer x 判断
        const px = _p.x ?? 0;
        const xInRow = px - (rowsX);
        if (xInRow > rowW - 50) {
          // ✓/+ 区: toggle select (不能取消 fixed slot 0)
          if (i === 0) return;
          if (selected.has(i)) {
            selected.delete(i);
          } else if (selected.size < 3) {
            // Check conflictsWith
            const s = pet.skillPool[i] as PetDef['skillPool'][number] & { conflictsWith?: number };
            if (s.conflictsWith !== undefined && selected.has(s.conflictsWith)) {
              selected.delete(s.conflictsWith);
            }
            selected.add(i);
          }
        } else {
          // Name 区: 切 desc focus
          if (activeRow && activeRow.kind === 'skill' && activeRow.idx === i) {
            // 再次点击 = 切 brief/detail
            descMode = descMode === 'brief' ? 'detail' : 'brief';
          } else {
            activeRow = { kind: 'skill', idx: i };
            descMode = 'brief';
          }
        }
        void isRightClick;
        refreshUI();
      });
    });

    // ── 底部 desc frame ── P127: 放大 80→200 高让 shellTurtle 气场等长 desc 完整可见
    const descY = panelY + panelH / 2 - 130;
    const descBg = this.add.rectangle(panelX, descY, panelW - 60, 200, 0x000000, 0.6)
      .setStrokeStyle(2, 0xffd93d, 0.3);
    layer.add(descBg);
    const descTitle = this.add.text(panelX - panelW / 2 + 50, descY - 22, '', {
      fontSize: '14px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    layer.add(descTitle);
    const descBody = this.add.text(panelX - panelW / 2 + 50, descY + 4, '', {
      fontSize: '12px', color: '#ccc', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
      wordWrap: { width: panelW - 100, useAdvancedWrap: true }, lineSpacing: 2,
    }).setOrigin(0, 0);
    layer.add(descBody);
    const descToggle = this.add.text(panelX + panelW / 2 - 80, descY - 24, '简略 ▾', {
      fontSize: '11px', color: '#58d3ff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
      backgroundColor: '#1a2740', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setVisible(false).setInteractive({ useHandCursor: true });
    descToggle.on('pointerdown', () => {
      descMode = descMode === 'brief' ? 'detail' : 'brief';
      refreshUI();
    });
    layer.add(descToggle);

    // ── 底部 buttons ──
    const btnY = panelY + panelH / 2 - 40;
    const countText = this.add.text(panelX - 220, btnY, `已选 0/3`, {
      fontSize: '14px', color: '#aaa', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5);
    layer.add(countText);

    const mkBtn = (x: number, label: string, color: number, onClick: () => void) => {
      const c = this.add.container(x, btnY);
      const b = this.add.rectangle(0, 0, 110, 36, color, 0.9).setStrokeStyle(2, 0xffffff, 0.6)
        .setInteractive({ useHandCursor: true });
      const t = this.add.text(0, -1, label, {
        fontSize: '14px', color: '#fff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      }).setOrigin(0.5);
      c.add(b); c.add(t);
      layer.add(c);
      b.on('pointerdown', () => {
        this.tweens.add({ targets: c, scale: 0.95, duration: 60, yoyo: true });
        this.time.delayedCall(60, onClick);
      });
      return { b, t };
    };
    mkBtn(panelX - 100, '默认', 0x4a5e7a, () => {
      selected.clear();
      const def = (pet.defaultSkills ?? [0, 1, 2]).filter(i => activeIdxs.includes(i)).slice(0, 3);
      for (const i of def) selected.add(i);
      refreshUI();
    });
    const okOb = mkBtn(panelX + 50, '确认', 0x06d6a0, () => {
      if (selected.size !== 3) {
        this.cameras.main.shake(60, 0.003);
        return;
      }
      writeLoadout(petId, [...selected]);
      this.closeSkillPicker(layer);
    });
    mkBtn(panelX + 180, '取消', 0x6b2d2d, () => this.closeSkillPicker(layer));

    // ── refresh UI ──
    const refreshUI = () => {
      // Row right-decor refresh
      for (const r of rowRefs) {
        if (r.row.kind === 'passive') {
          r.rightEl.setText('被动'); r.rightEl.setColor('#c77dff');
          r.bg.setStrokeStyle(2, activeRow?.kind === 'passive' ? 0xffd93d : 0x58d3ff, activeRow?.kind === 'passive' ? 1 : 0.4);
        } else if (r.row.kind === 'skill') {
          const i = r.row.idx!;
          const isFixed = i === 0;
          const isSel = selected.has(i);
          if (isFixed) { r.rightEl.setText('基础 ✓'); r.rightEl.setColor('#06d6a0'); }
          else if (isSel) { r.rightEl.setText('✓'); r.rightEl.setColor('#06d6a0'); }
          else { r.rightEl.setText('+'); r.rightEl.setColor(selected.size < 3 ? '#fff' : '#666'); }
          const isActive = activeRow?.kind === 'skill' && activeRow.idx === i;
          r.bg.setStrokeStyle(2, isActive ? 0xffd93d : (isSel ? 0x06d6a0 : 0x58d3ff), isActive ? 1 : (isSel ? 0.7 : 0.4));
        }
      }
      // Desc frame
      if (activeRow?.kind === 'passive' && pet.passive) {
        descTitle.setText(pet.passive.name ?? '被动');
        const brief = (pet.passive.brief ?? pet.passive.desc ?? '—').toString().replace(/<[^>]+>/g, '');
        const detail = (pet.passive.desc ?? brief).toString().replace(/<[^>]+>/g, '');
        const body = (descMode === 'detail' && detail !== brief) ? detail : brief;
        descBody.setText(body);  // P127: 删 slice(0,300) — shellTurtle 气场 desc 460+ 字符被砍, wordWrap 自然 wrap
        descToggle.setVisible(detail !== brief);
        descToggle.setText(descMode === 'detail' ? '简略 ▴' : '详细 ▾');
      } else if (activeRow?.kind === 'skill') {
        const i = activeRow.idx!;
        const sk = pet.skillPool[i];
        const cdText = sk.cd ? ` · CD${sk.cd}` : '';
        descTitle.setText(`${sk.name}${cdText}`);
        const brief = (sk.brief ?? '—').toString().replace(/<[^>]+>/g, '');
        const detail = (sk.detail ?? sk.brief ?? brief).toString().replace(/<[^>]+>/g, '');
        const body = (descMode === 'detail' && detail !== brief) ? detail : brief;
        descBody.setText(body);  // P127: 删 slice(0,300) — shellTurtle 气场 desc 460+ 字符被砍, wordWrap 自然 wrap
        descToggle.setVisible(detail !== brief);
        descToggle.setText(descMode === 'detail' ? '简略 ▴' : '详细 ▾');
      } else {
        descTitle.setText('');
        descBody.setText('点击任意行查看技能/被动详情');
        descToggle.setVisible(false);
      }
      // Count + OK button
      countText.setText(`已选 ${selected.size}/3`);
      okOb.b.setAlpha(selected.size === 3 ? 1 : 0.4);
      okOb.t.setAlpha(selected.size === 3 ? 1 : 0.4);
    };
    refreshUI();
  }

  // Phase B: 新版 closeSkillPicker — DOM overlay 版, 不再传 Phaser layer
  // JS main.js:1345/1355 1:1 — overlay.style.display='none' + 后续 callback
  private closeSkillPicker(legacyLayer?: Phaser.GameObjects.Container) {
    // 旧 Phaser-native 调用兼容 (其他地方 closeSkillPicker(layer) 调过)
    if (legacyLayer) {
      this.tweens.add({
        targets: legacyLayer, alpha: 0, duration: 180,
        onComplete: () => {
          legacyLayer.destroy();
          this.pickerOpen = false;
          this.syncSpecialSlots();
          this.refreshUI();
        },
      });
      return;
    }
    // 新版 DOM overlay
    const overlay = document.getElementById('poc-pdp-overlay');
    if (overlay) overlay.classList.remove('show');
    this.pickerOpen = false;
    // JS main.js:305 callback 1:1 — syncSpecialSlots + renderPetGrid + renderFgSlots + updateConfirmBtn
    this.syncSpecialSlots();
    this.refreshUI();
  }

  private makeIconButton(x: number, y: number, icon: string, onClick: () => void) {
    const bg = this.add.circle(x, y, 18, 0x000000, 0.55).setStrokeStyle(2, 0x58d3ff)
      .setInteractive({ useHandCursor: true }).setDepth(10);
    const text = this.add.text(x, y, icon, {
      fontSize: '18px', color: '#fff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(11);
    bg.on('pointerover', () => bg.setStrokeStyle(2, 0xffd93d));
    bg.on('pointerout', () => bg.setStrokeStyle(2, 0x58d3ff));
    bg.on('pointerdown', () => {
      this.tweens.add({ targets: [bg, text], scale: 0.85, duration: 60, yoyo: true });
      this.time.delayedCall(80, onClick);
    });
  }
}
