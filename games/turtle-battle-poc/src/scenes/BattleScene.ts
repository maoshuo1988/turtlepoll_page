// ══════════════════════════════════════════════════════════
// BattleScene — 真 fighter + 真 stats + 真伤害公式 + 自动对战
// (PoC v0.2 Phase A: 数据接通; 技能 VFX 在 Phase B 加)
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import type { Fighter, SkillDef } from '../types';
import { createFighter, attachEquipment, snapshotInitStats } from '../engine/fighter';
import { aiPickSkills } from '../systems/pet-level';
import { battleStats, DMG_TYPE_INFO, type DmgBreakdown, type FighterStats as BattleFighterStats } from '../systems/battle-stats';
import { EQUIP_BY_ID, EQUIP_POOL } from '../data/equipment';
import { applyTeamBuff, planAiShop } from '../data/shop-quick';
import { calcDamage, applyRawDamage, rollCrit, calcCritMult, calcEffMr, calcEffArmor, calcDmgMult, setInkTransferHook } from '../engine/damage';
import { bindVisualDispatcher, unbindVisualDispatcher } from '../systems/visual_dispatcher';
// E3/43: 删 castFireball/castHealAura/castChainLightning/playLifesteal/playThorns 演示 VFX imports
import { playMeleeArcTrail, launchWaveSweep, launchMiniCrystalBeam, castCrystalBeam, spawnCrystalDetonate, castFireball, fireStraightProjectile, spawnFireSweep, type ViewLike } from '../vfx/skills';
import { ActionPanel } from './ActionPanel';
import { DetailPanel } from './DetailPanel';
import { TurtlePicker } from './TurtlePicker';
import { BattleLog } from './BattleLog';
import { DmgStatsPanel } from './DmgStatsPanel';
import { ShopOverlay } from './ShopOverlay';
import { applyTeamSynergies, applyShiftSynergy, SYNERGY_TAGS, type ActiveSynergy } from '../data/synergies';
import { fireOnHit, fireOnTurnBegin, fireOnDeath } from '../engine/equipment-runtime';
import { triggerOnHitEffects, resetPerTurnFlags, resetPerCastFlags, setLightningVfxHook, setCrystalDetonateVfxHook, setChestTreasureHook, setStaffChargeHook, applyCrystallizeStack, setLineConnectVfxHook } from '../engine/passive-triggers';
import { recalcStats, snapshotBaseStats, tickBuffsDuration } from '../engine/stats-recalc';
import { applyDotStacks, defaultBurnStacks } from '../engine/dot';
import { smallIconKey } from '../systems/icon-scale';
import { applyRuleStart, applyRulePerTurn, ruleModifiers } from '../engine/rule-effects';
import { rollEventForTurn, rollNeutralForTurn, NEUTRAL_TEMPLATES, type BattleEvent } from '../engine/events';
import { BATTLE_RULES } from '../data/rules';
import { ALL_PETS, PET_BY_ID, DEF_CONSTANT } from '../data/pets';
import { getSkillHandler, setSkillApi, spawnLightningStrike, applyHeal, setHidingCommandHook, type BattleApi } from '../engine/skill-handlers';
import { spawnFloatingText } from '../systems/visual_dispatcher';
import type { FloatCls } from '../types';
import { playDmgSfx } from '../systems/sfx';
import { bus } from '../systems/bus';
import { SkillTweenMgr } from '../systems/skill-tween-mgr';
import { TurtleHud } from '../systems/turtle-hud';
import { BattleTopRow, type TimelineNode } from './BattleTopRow';
import { HelpPanel } from './HelpPanel';
import { DebugOverlay, debugKillFighter, getEquipById } from './DebugOverlay';
import { DEV_VISIBLE } from '../dev/devflag';
import { BattleStatsRail } from './BattleStatsRail';
import { BenchRail } from './BenchRail';
import { TutorialGuide } from './TutorialGuide';
import { GlobalToolbar } from './GlobalToolbar';

interface FighterStats {
  dmgDealt: number;
  dmgTaken: number;
  healDone: number;
  crits: number;
  kills: number;
}

interface FighterView {
  fighter: Fighter;
  sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;   // 乌龟剪影阴影 (染黑+压扁)
  shadowDirX?: number;   // 影子跟精灵时的额外横偏 (0=正下方); 所有"影子跟精灵"处统一加它
  hpBar: Phaser.GameObjects.Rectangle;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBarHi: Phaser.GameObjects.Rectangle;     // 顶部高光条 (装饰)
  shieldBar: Phaser.GameObjects.Rectangle;   // 护盾叠层 (在 HP 条上方一行)
  hpDelayBar?: Phaser.GameObjects.Rectangle; // v0.9.5.D1: 受击红色延迟条
  hpText: Phaser.GameObjects.Text;
  nameText: Phaser.GameObjects.Text;
  statusGroup: Phaser.GameObjects.Container;
  homeX: number;
  homeY: number;
  // JS .scene-turtle 双层结构 1:1 模拟:
  //   JS 外层 transform:scale(var(--base-scale)) 永不变, 内层 .st-body 只 translate/rotate
  //   Phaser 单 sprite, 所以记录 home 值在每次动画后恢复. 防止 tween 改 scaleX/scaleY/rotation
  //   后没还原导致"打完一拳龟变形/歪了"的 corruption.
  homeScaleX: number;
  homeScaleY: number;
  homeRotation: number;
  stats: FighterStats;
  _lastHp?: number;  // v0.9.5.D1: 记录上次 HP 用于检测变化方向
  _inHop?: boolean;  // P24: attack hop 进行中, watcher 跳过 x 强制回 homeX
  // P84: 灼烧 overlay sprite (JS .scene-turtle.burning .st-body::before 1:1)
  //   8 帧 × 128 burn-loop.png, fighter 有 'burn' buff 时显示, 无则隐藏
  burnOverlay?: Phaser.GameObjects.Sprite;
  // Phaser-native HUD (TurtleHud, 取代旧 DOM overlay SceneTurtleDom). HP/shield/bubble/level/
  //   status/equips/chest/specialty bars 全是 Container 内的 Phaser 对象 → 主相机 zoom/pan/shake
  //   自动作用 + 场景切换自动清理 (字段名沿用 sceneTurtleDom 让调用点不变).
  sceneTurtleDom?: TurtleHud;
}

export type { FighterView, FighterStats };

// 是否走 spritesheet idle anim —— 取代旧的硬编码 3 龟集合, 现在 18 龟有 sprite{} 都自动走
const hasIdleAnim = (scene: Phaser.Scene, id: string) => scene.anims.exists(`anim-idle-${id}`);

// E3/43: 删 SIGNATURE_SKILL 演示表 (E3/42 用户报"ninja 飞镖跑出闪电链" 后已弃用)

interface BattleInit {
  leftTeam?: string[];      // v0.9.5.A45: 3 个龟 id (JS 对齐), 玩家阵容
  leftSlots?: string[];     // v0.9.5.A45: 平行数组, 每只龟的站位 'front-0' ... 'back-2'
  rightTeam?: string[];     // v0.9.5.A45: 3 个龟 id, 敌方; 不传则随机生成
  rightSlots?: string[];    // v0.9.5.A45: 敌方站位 (传入则用, 不传 autoAssign)
  mode?: 'pve' | 'dungeon' | 'custom' | 'boss' | 'boss-pick' | 'test';
  bossId?: string;            // mode='boss-pick' 时使用的 Boss 龟 id
  rule?: string | null;
  dungeonStage?: number;    // 1-5 当前关
  enemyMult?: number;       // 敌方属性倍率 (1.0 默认, BOSS 1.5) — 全局回退
  enemyHpMult?: number;     // E1: 单独 HP 倍率 (JS dungeon.js:6-12), 优先于 enemyMult
  enemyAtkMult?: number;    // E1: 单独 ATK 倍率
  enemyDefMult?: number;    // E1: 单独 DEF/MR 倍率
  playerHpSnapshot?: Array<{ id: string; hp: number; maxHp: number; shield: number; alive?: boolean; position?: 'front' | 'back'; equipIds?: string[]; growth?: Record<string, number> }>;
  coins?: number;           // C3: 深海币跨关携带结余 (dungeon)
  bonuses?: import('./RewardPickScene').TeamBonus[];  // 闯关累积奖励
  loadouts?: Record<string, number[]>;  // P2.1: petId → 选中的 skillPool index 数组
  benchInventoryIds?: string[];  // 跨关装备席持久化 (JS bench.js dungeonState.equipBenchIds 对齐)
  tutorial?: boolean;       // P221: 新手教程模式 — 固定阵容/站位/等级 + 步骤引导
  leftLevel?: number;       // P221: 我方统一等级 (教程 Lv7); 不传 = 默认 lv1
  rightLevel?: number;      // P221: 敌方统一等级 (教程 Lv1)
  // Phase C: 玩家在 TeamSelect 拖的 summon/crystal-ball/candy-bomb 占位 slot
  //   JS main.js:1406-1408 1:1 — _buildTeamFromSlots 把这些 slot 标在 owner fighter
  //   上 (f._savedSummonSlot etc.), spawnSummonAlly 用作 spawn slot 偏好
  savedSlots?: { summon?: string; crystalBall?: string; candyBomb?: string };
}

export class BattleScene extends Phaser.Scene {
  private views: FighterView[] = [];
  private topRow!: BattleTopRow;
  private helpPanel!: HelpPanel;
  private debugOverlay?: DebugOverlay;
  private turn = 1;
  private finished = false;
  private leftTeam: string[] = [];
  private leftSlots: string[] = [];   // v0.9.5.A45: 平行 slot keys
  private rightTeam: string[] = [];
  private rightSlots: string[] = [];  // v0.9.5.A45
  private _rightSlotsAuto = false;    // P192: 敌方 auto 站位 (未传 rightSlots, 非 test) → 建 fighter 后按 effectiveHp 排
  private mode: 'pve' | 'dungeon' | 'custom' | 'boss' | 'boss-pick' | 'test' = 'dungeon';
  private bossId: string | null = null;
  private bgImage?: Phaser.GameObjects.Image;       // test mode bg picker 用
  private rule: string | null = null;
  private dungeonStage = 0;
  private enemyMult = 1;
  private enemyHpMult = 1;
  private enemyAtkMult = 1;
  private enemyDefMult = 1;
  private playerHpSnapshot: BattleInit['playerHpSnapshot'];
  private bonuses: BattleInit['bonuses'] = [];
  private tutorial = false;          // P221 教程模式
  private leftLevel?: number;        // P221 我方统一等级 (教程 Lv7)
  private rightLevel?: number;       // P221 敌方统一等级 (教程 Lv1)
  private tutorialGuide?: TutorialGuide;  // P221 教程步骤引导
  private loadouts: Record<string, number[]> = {};
  private turnOrder: FighterView[] = [];   // legacy, 保留以防有引用
  private turnPtr = -1;                    // legacy
  // v0.9.5.A55: JS 对齐的回合流 — side-block ordering
  private activeSide: 'left' | 'right' = 'left';
  private actedThisSide = new Set<FighterView>();
  private sidesActedThisRound = 0;
  // 出手倒计时 (JS turn.js:1098 startTurnTimer 40s, 超时 AI 自动出招)
  private _turnTimerEvent?: Phaser.Time.TimerEvent;
  private _turnTimerCanAct: FighterView[] = [];
  private _turnTimerLeft = 0;
  private _bossActed = 0;   // I1: boss 本回合已行动次数 (JS _bossActionsThisRound, 上限 2)
  private isFirstRound = true;
  private actionPanel!: ActionPanel;
  private detailPanelDom!: DetailPanel;
  private turtlePicker!: TurtlePicker;
  // 工程基础: sprite scale/rotation corruption 双保 (helper + watcher), JS body.animate(fill:'none') 等价
  private skillTweenMgr!: SkillTweenMgr;
  private battleLog!: BattleLog;
  private shop!: ShopOverlay;
  private coins = 0;  // P23: JS deep_coin.js _store 初始 {left:0,right:0}. 之前 poc 50 是自创.
  private _carryCoins = 0;  // C3: 深海币跨关携带值 (dungeon stage>1 从上关结余带入, 非 dungeon=0)
  private _autoBattle = false;   // F3: 自动对战机器人 — 双方都走 AI 自动出招 (回归/平衡/不崩验证)
  private _autoBattleFast = false;   // F3: 加速 (缩短 AI 出手间隔)
  private enemyCoins = 0;  // 用户 v0.9.9: 野生敌方 AI 也攒币 (像玩家); 深海/Boss 永 0 (aiGainCoins 守卫)
  private lastShopTurn = 0;
  private firedEvents = new Set<string>();
  private lastRoundStartTurn = 0;  // v0.9.5.A80: 防止 applyRulePerTurn / synergy burn 每 actor 重复触发
  private _sideRoundKey: string | null = null;  // "该方回合开始"一次性被动(坚壁/棱镜等)已结算的侧回合(activeSide:turn), 防本侧回合内重复
  private neutralSpawned = false;  // v0.9.5.A91: 整场最多 1 个中立
  private neutralFirstKilledSide: 'left' | 'right' | null = null;  // 首杀方拿大奖
  private benchInventory: import('../types').EquipmentDef[] = [];   // P3.1 战利品装备席 (我方)
  private rightBench: import('../types').EquipmentDef[] = [];        // E2: 敌方装备席 (JS bench.js rightBench)
  // Phase C: 玩家在 TeamSelect 选的 mark slot — JS main.js:1406-1408
  private savedSlots: { summon?: string; crystalBall?: string; candyBomb?: string } = {};
  private benchRail!: BenchRail;
  private globalToolbar!: GlobalToolbar;
  /** E3/7: 当前攻击者 (JS currentActingFighter) — 死亡后被动 (deathExplode/deathHook/healOnKill) 用 */
  private currentAttacker: Fighter | null = null;
  private statsRail!: BattleStatsRail;

  constructor() { super('BattleScene'); }

  /** Phaser scene update loop. 每帧调 SkillTweenMgr watcher 兜底:
   *  没 skill tween 的 sprite, scale/rotation 偏离 home > epsilon 强制还原.
   *  idle bob tween 已标记 _isIdleBob, watcher 跳过它, 互不打架.
   *  开销极小 (6 个 view × 3 个数比较). */
  private _domSyncTick = 0;
  override update(): void {
    if (this.skillTweenMgr && this.views && this.views.length > 0) {
      this.skillTweenMgr.watchTick(this.views);
    }
    this.syncRockBodyScale();
    // Phase 8: SceneTurtleDom 兜底每 5 帧 (~83ms) 全量刷新 buff/equip/specialty bar
    //   HP/shield 改变会即时调 sceneTurtleDom.update (在 updateHpVisual / refreshShieldBar 里)
    //   buff/equip 改变没集中钩子, 这里 throttled 全量 sync 兜底
    this._domSyncTick = (this._domSyncTick + 1) % 5;
    if (this._domSyncTick === 0 && this.views.length > 0) {
      for (const v of this.views) v.sceneTurtleDom?.update();
    }
    // P84 1:1 JS ui.js:304-305 — burn overlay sync (任何 fighter 有 'burn' buff → 显示 burn-loop)
    if (this.views.length > 0) {
      for (const v of this.views) this.syncBurnOverlay(v);
    }
    // P184: 血条锚到"槽位 home" (非 sprite 当前位置). JS 里血条挂在外层 .scene-turtle (固定槽位),
    //   只有 .st-body 做 hop/throw/knockback 动画 → 血条不跟着飞. 之前 PoC 每帧贴 sprite.x/y →
    //   过肩摔把目标抛走时血条也跟着飞 (用户报). 改锚 homeX/homeY: 龟身随便动, 血条稳在槽位.
    if (this.views.length > 0) {
      for (const v of this.views) v.sceneTurtleDom?.setCanvasPos(v.homeX, v.homeY);
    }
    // U3: 状态指示器层跟随龟身 (锚 sprite 中心, 内部偏移分区: 战斗态头顶 / 资源态左角)
    if (this.views.length > 0) {
      for (const v of this.views) {
        if (v.statusGroup) { v.statusGroup.x = v.sprite.x; v.statusGroup.y = v.sprite.y; }
      }
    }
  }

  /** P84: burn overlay sync — 1:1 JS .scene-turtle.burning toggle */
  private syncBurnOverlay(v: FighterView): void {
    const hasBurn = v.fighter.alive && v.fighter.buffs.some(b => b.type === 'burn');
    if (hasBurn && !v.burnOverlay && this.textures.exists('vfx-burn-loop')) {
      // 首次显示 → 创建 sprite + 起 anim
      const ov = this.add.sprite(v.sprite.x, v.sprite.y, 'vfx-burn-loop')
        .setDepth(v.sprite.depth + 1)
        .setBlendMode(Phaser.BlendModes.SCREEN)  // JS scene.css:178 mix-blend-mode:screen
        .setDisplaySize(128, 128);
      try { ov.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
      if (this.anims.exists('anim-burn-loop')) ov.play('anim-burn-loop');
      v.burnOverlay = ov;
    } else if (hasBurn && v.burnOverlay) {
      // 跟随 sprite 位置 (sprite hop / knockup 时 overlay 同步移)
      v.burnOverlay.x = v.sprite.x;
      v.burnOverlay.y = v.sprite.y;
    } else if (!hasBurn && v.burnOverlay) {
      v.burnOverlay.destroy();
      v.burnOverlay = undefined;
    }
  }

  init(data: BattleInit = {}) {
    this.leftTeam = data.leftTeam ?? ['basic', 'ghost', 'ninja'];
    // v0.9.5.A45: 玩家 slot keys — 传入则用, 否则默认 (前 3 个 front-0/1/2, 多余的 back-0/1/2)
    this.leftSlots = data.leftSlots ?? this.defaultSlotKeys(this.leftTeam.length);
    this.mode = data.mode ?? 'dungeon';
    this.bossId = data.bossId ?? null;
    // 敌方阵容: v0.9.3 各模式不同生成规则 — v0.9.5.A45: 3v3 (非 BOSS)
    if (data.rightTeam) {
      this.rightTeam = data.rightTeam;
    } else if (this.mode === 'boss') {
      // 随机 Boss: 从 28 龟里非玩家选的随便抓 1 个
      this.rightTeam = [this.pickRandomEnemyTeam(this.leftTeam, 1)[0]];
    } else if (this.mode === 'boss-pick') {
      // 指定 Boss: 由 bossId 决定
      this.rightTeam = this.bossId ? [this.bossId] : [this.pickRandomEnemyTeam(this.leftTeam, 1)[0]];
    } else if (this.mode === 'test') {
      // P26: test 模式 6 dummy 占满 6 slot (JS main.js:1494-1500 1:1).
      // 之前 poc 只 3 dummy 是自创.
      this.rightTeam = ['basic', 'basic', 'basic', 'basic', 'basic', 'basic'];
      this.rightSlots = data.rightSlots ?? ['front-0','front-1','front-2','back-0','back-1','back-2'];
    } else {
      this.rightTeam = this.pickRandomEnemyTeam(this.leftTeam, 3);
    }
    // v0.9.5.A45: 敌方 slot keys — 传入则用, 否则 autoAssignPositions (JS 对齐)
    //   test 模式上面已设好 6 个固定槽位, 不能被 autoAssignSlots(3v3 用) 覆盖 → 否则 dummy 4-6 落回 front-0 挤一起
    if (this.mode !== 'test') {
      this.rightSlots = data.rightSlots ?? this.autoAssignSlots(this.rightTeam);
    }
    // P192: 未传 rightSlots 且非 test → create() 里建好 fighter 后按 effectiveHp 重排 (1:1 JS
    //   autoAssignPositions 用 fighter 的真实 maxHp + 缩头强化召唤 ×0.5, 上面按 ID 基础 hp 只是占位).
    this._rightSlotsAuto = !data.rightSlots && this.mode !== 'test';
    this.rule = data.rule ?? null;
    this.dungeonStage = data.dungeonStage ?? 0;
    this.enemyMult = data.enemyMult ?? 1;
    // E1: 优先用单独倍率, 否则 fallback 全局 enemyMult
    this.enemyHpMult = data.enemyHpMult ?? this.enemyMult;
    this.enemyAtkMult = data.enemyAtkMult ?? this.enemyMult;
    this.enemyDefMult = data.enemyDefMult ?? this.enemyMult;
    this.playerHpSnapshot = data.playerHpSnapshot;
    this.tutorial = data.tutorial ?? false;
    this.leftLevel = data.leftLevel;
    this.rightLevel = data.rightLevel;
    this.bonuses = data.bonuses ?? [];
    // Phase C: TeamSelect 传过来的 mark slot — JS main.js:1406-1408 1:1
    this.savedSlots = data.savedSlots ?? {};
    // P2.1: loadouts 优先用 init 传的, 退而从 localStorage 读 (Dungeon 等入口不显式传)
    if (data.loadouts && Object.keys(data.loadouts).length) {
      this.loadouts = data.loadouts;
    } else {
      try {
        const raw = localStorage.getItem('turtle-poc-loadout-v1');
        this.loadouts = raw ? (JSON.parse(raw) ?? {}) : {};
      } catch { this.loadouts = {}; }
    }
    // E2: 跨关装备席恢复 (JS bench.js restoreBenchFromDungeon)
    if (data.benchInventoryIds && data.benchInventoryIds.length > 0) {
      this.benchInventory = data.benchInventoryIds
        .map(id => EQUIP_BY_ID[id])
        .filter((e): e is import('../types').EquipmentDef => !!e);
    } else {
      this.benchInventory = [];
    }
    this.rightBench = [];
    // C3: 深海币跨关携带 (dungeon stage>1 带入上关结余; 其他模式归 0)
    this._carryCoins = this.mode === 'dungeon' ? (data.coins ?? 0) : 0;
  }

  /** v0.9.3.B: 把敌方 Fighter 按 mode 改造为 Boss / Dummy */
  private applyEnemyModeMods(f: import('../types').Fighter) {
    if (this.mode === 'boss' || this.mode === 'boss-pick') {
      // Boss: 3.5×HP / 1.2×ATK / 1.4×DEF / 1.4×MR (与 JS 版一致)
      f.maxHp = Math.round(f.maxHp * 3.5); f.hp = f.maxHp;
      f.baseAtk = Math.round(f.baseAtk * 1.2); f.atk = f.baseAtk;
      f.baseDef = Math.round(f.baseDef * 1.4); f.def = f.baseDef;
      f.baseMr = Math.round(f.baseMr * 1.4); f.mr = f.baseMr;
      f.name = `BOSS ${f.name}`;
      f._isBoss = true;
    } else if (this.mode === 'test') {
      // Dummy: 2000 HP, 0 ATK/DEF/MR, 无技能/被动, AI 永远 skip
      f.maxHp = 2000; f.hp = 2000;
      f.baseAtk = 0; f.atk = 0;
      f.baseDef = 0; f.def = 0;
      f.baseMr = 0; f.mr = 0;
      f.crit = 0;
      f.skills = [];
      f.passive = null;
      f.name = `木桩 ${f.id}`;
      f._isDummy = true;
    }
  }

  /** v0.9.3.B: test 模式右上角的 9 张 bg 切换 chip */
  private makeTestBgPicker(screenW: number, maps: string[]) {
    const x0 = screenW - 220;
    const y0 = 70;
    this.add.text(x0 - 10, y0 - 18, '🗺 切换地图:', {
      fontSize: '12px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setDepth(20);
    maps.forEach((k, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = x0 + col * 70;
      const y = y0 + row * 24;
      const chip = this.add.rectangle(x, y, 64, 20, 0x1a2740, 0.92)
        .setStrokeStyle(1, 0x58d3ff, 0.7).setDepth(20)
        .setInteractive({ useHandCursor: true });
      this.add.text(x, y, k.replace('bg-', ''), {
        fontSize: '10px', color: '#fff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
      }).setOrigin(0.5).setDepth(21);
      chip.on('pointerdown', () => {
        // P188: bg 现在是 Phaser 世界层可见图 → 换图后重设超采尺寸 (setTexture 会重置回原始帧尺寸).
        //   CSS var 同步更新 (供 letterbox 边).
        document.documentElement.style.setProperty('--battle-bg-img', `url('bg/${k}.png')`);
        if (this.bgImage) {
          const { width, height } = this.scale.gameSize;
          this.bgImage.setTexture(k).setDisplaySize(width, height);
        }
      });
    });
  }

  // P26: 用 ALL_PETS (JS main.js:1481-1493 wild pool 1:1) 不再硬编 22 只.
  // 之前 PETS = 22 只 → 13+ 只龟 (ghost/ninja/shell/lava/phoenix/star/...) 永远不会
  // 当野生敌方出现, 玩家漏看 1/3 数据.
  private pickRandomEnemyTeam(exclude: string[], n: number = 3): string[] {
    const pool = ALL_PETS.map(p => p.id).filter(id => !exclude.includes(id));
    Phaser.Utils.Array.Shuffle(pool);
    return pool.slice(0, n);
  }

  /** v0.9.5.A45: 默认 slot 分配 (玩家未传 slots 时的回退) — 前 N 个按 front-0/1/2/back-0/1/2 顺序 */
  private defaultSlotKeys(count: number): string[] {
    const all = ['front-0', 'front-1', 'front-2', 'back-0', 'back-1', 'back-2'];
    return all.slice(0, count);
  }

  /** v0.9.5.A45: 敌方/AI 自动站位 (JS main.js:1566 autoAssignPositions 对齐)
   *  按 maxHp 降序排队 → 50/50 随机选 1 种菱形阵: A=front-1/back-0/back-2, B=front-0/front-2/back-1
   *  Boss: 固定 front-1 中心
   */
  private autoAssignSlots(teamIds: string[]): string[] {
    if (teamIds.length === 1) return ['front-1']; // boss
    // 用 maxHp 从 pet 数据排序
    const sorted = [...teamIds].sort((a, b) => {
      const pa = ALL_PETS.find(p => p.id === a)?.hp ?? 0;
      const pb = ALL_PETS.find(p => p.id === b)?.hp ?? 0;
      return pb - pa;
    });
    const formation = Math.random() < 0.5
      ? ['front-1', 'back-0', 'back-2']      // A: 1 前中 + 2 后翼
      : ['front-0', 'front-2', 'back-1'];    // B: 2 前翼 + 1 后中
    // 把 sorted 的顺序映射回 teamIds 原顺序的 slot
    const slotByPet: Record<string, string> = {};
    sorted.forEach((id, i) => { slotByPet[id] = formation[i] ?? 'front-1'; });
    return teamIds.map(id => slotByPet[id]);
  }

  /** P192: 用"建好的 fighter"按 effectiveHp 排站位 — 1:1 JS main.js autoAssignPositions:
   *  effectiveHp = maxHp, 缩头龟带 hidingEnhancedSummon 则 ×0.5 (开局会掉 50% HP, 按生效血排).
   *  返回与 fighters 平行的 slot key 数组 (最高 effectiveHp → formation[0]). */
  private autoAssignSlotsForFighters(fighters: Fighter[]): string[] {
    if (fighters.length === 1) return ['front-1']; // boss
    const effHp = (f: Fighter): number => {
      const ps = f._passiveSkills as Array<{ type?: string }> | undefined;
      const enhanced = ps?.some(p => p.type === 'hidingEnhancedSummon');
      return enhanced ? Math.round(f.maxHp * 0.5) : f.maxHp;
    };
    const ranked = fighters.map((f, i) => ({ i, hp: effHp(f) })).sort((a, b) => b.hp - a.hp);
    const formation = Math.random() < 0.5
      ? ['front-1', 'back-0', 'back-2']      // A: 1 前中 + 2 后翼
      : ['front-0', 'front-2', 'back-1'];    // B: 2 前翼 + 1 后中
    const slots: string[] = new Array(fighters.length).fill('front-1');
    ranked.forEach((r, rank) => { slots[r.i] = formation[rank] ?? 'front-1'; });
    return slots;
  }

  /** v0.9.5.A45: slot key → 屏幕 x/y + position */
  // v0.9.5.A60: JS ui.js:21 _STD_POS — % 坐标映射 (16:9 bg coord 系统)
  //   左 side: 前排 (37%, 41/55/69%), 后排 (24%, 41/55/69%) — 略斜布局, 后排略小 X
  //   右 side: 镜像 100-x
  private static readonly POS_BY_SLOT: Record<string, { xPct: number; yPct: number }> = {
    'front-0': { xPct: 38, yPct: 41 },
    'front-1': { xPct: 37, yPct: 55 },
    'front-2': { xPct: 36, yPct: 69 },
    'back-0':  { xPct: 25, yPct: 41 },
    'back-1':  { xPct: 24, yPct: 55 },
    'back-2':  { xPct: 22, yPct: 69 },
  };
  /** P93 1:1 JS ui.js:65-82 mapCoverPos — 16:9 源图 % 坐标 → 任意比例容器 cover-cropped 像素位置.
   *  imgX/imgY: 0..100 (源图 %), containerW/H: 实际容器像素. 返回容器内绝对像素 px/py.
   *  Container 比 16:9 宽: 图按宽铺, 上下裁; 比 16:9 窄: 图按高铺, 左右裁. 站位永远绑到 visible area.
   */
  private static mapCoverPos(imgX: number, imgY: number, containerW: number, containerH: number): { px: number; py: number } {
    const imgRatio = 16 / 9;
    const cRatio = containerW / containerH;
    if (cRatio > imgRatio) {
      // Container wider — img 按宽铺, 上下裁
      const visibleH = 1 / cRatio * imgRatio;
      const offsetY = (1 - visibleH) / 2;
      const px = imgX / 100 * containerW;
      const py = (imgY / 100 - offsetY) / visibleH * containerH;
      return { px, py };
    } else {
      // Container taller — img 按高铺, 左右裁
      const visibleW = cRatio / imgRatio;
      const offsetX = (1 - visibleW) / 2;
      const px = (imgX / 100 - offsetX) / visibleW * containerW;
      const py = imgY / 100 * containerH;
      return { px, py };
    }
  }
  /** P112 用户 spec: 第 1 回合开始时, 我方 (+对手) 各选 1 件初始装备 (3 选 1).
   *  PVP/野生: 双方都选; 深海: 仅第 1 关第 1 回合, 人机不选.
   *  Modal 用 DOM overlay (跟 TeamSelectScene rulePickModal 同款架构).
   */
  private async showInitialEquipPickModal(): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      // 3 选 1 池 (初始装备: 小龟帽 / 小龟剑 / 小龟壳, 用户提供图)。仅玩家自己看到自己的选择框;
      //   敌方静默选 (见 _maybeRunInitialEquipPhase), 对战时各屏只显示自己的。
      const pool = ['e_turtle_helmet', 'e_turtle_sword', 'e_turtle_shell'];
      try { this.input.enabled = false; } catch { /* ignore */ }
      const finish = (pick: string | null) => {
        try { this.input.enabled = true; } catch { /* ignore */ }
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 220);
        resolve(pick);
      };

      // LoL 海克斯锻造器风: 深蓝底 + 青色辉光 + 金色角切边框卡
      const GOLD = '#c8aa6e', LGOLD = '#f0e6d2', TEAL = '#5ab0ff';

      const overlay = document.createElement('div');
      overlay.id = 'pocInitialEquipOverlay';
      overlay.style.cssText = `
        position:fixed;inset:0;z-index:1100;pointer-events:auto;
        background:radial-gradient(ellipse 75% 65% at center, rgba(9,52,60,.5), rgba(3,8,18,.95));
        backdrop-filter:blur(6px);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        opacity:0;transition:opacity .3s ease;
        font-family:'Segoe UI',system-ui,-apple-system,sans-serif;
      `;
      // 内容统一随分辨率缩放 (--poc-ui-scale, 同 ActionPanel/bench); 基准尺寸做大
      const content = document.createElement('div');
      content.style.cssText = `
        display:flex;flex-direction:column;align-items:center;
        transform:scale(var(--poc-ui-scale,1));transform-origin:center center;
      `;
      const head = document.createElement('div');
      head.style.cssText = 'text-align:center;margin-bottom:34px';
      head.innerHTML = `
        <div style="color:${LGOLD};font-size:36px;font-weight:600;letter-spacing:3px;text-shadow:0 0 18px rgba(80,170,255,.5)">选择你的初始装备</div>
        <div style="margin:16px auto 0;width:330px;height:1px;background:linear-gradient(90deg,transparent,${GOLD},transparent)"></div>
      `;
      content.appendChild(head);

      const grid = document.createElement('div');
      grid.style.cssText = 'display:flex;gap:40px;justify-content:center;align-items:stretch';
      pool.forEach((id, i) => {
        const eq = EQUIP_BY_ID[id]; if (!eq) return;
        // 用户提供的科技感卡框图 (271×487) 作每张卡背景, 内容内嵌进暗框区。下方描述区仅中间 65% 可用。
        const card = document.createElement('div');
        card.style.cssText = `
          width:300px;height:539px;box-sizing:border-box;cursor:pointer;
          background:url('ui/equip-select-frame.png') center/100% 100% no-repeat;
          display:flex;flex-direction:column;align-items:center;
          padding:65px 44px 48px;text-align:center;
          transition:transform .16s ease, filter .16s ease;
          transform:translateY(18px);opacity:0;
        `;
        const iconSrc = eq.icon?.endsWith('.png') ? eq.icon : '';
        card.innerHTML = `
          <div style="width:134px;height:134px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;
               background:radial-gradient(circle,rgba(80,180,255,.22),transparent 68%)">
            ${iconSrc ? `<img src="${iconSrc}" style="width:122px;height:122px;object-fit:contain;image-rendering:pixelated;filter:drop-shadow(0 2px 9px rgba(0,0,0,.7))"/>` : `<div style="font-size:72px">${eq.icon ?? '📦'}</div>`}
          </div>
          <div style="color:${LGOLD};font-size:22px;font-weight:700;letter-spacing:1px;margin-bottom:6px;text-shadow:0 0 9px rgba(80,180,255,.6)">${eq.name}</div>
          <div style="margin:0 auto 10px;width:64%;height:1px;background:linear-gradient(90deg,transparent,${TEAL},transparent)"></div>
          <div style="color:#bcd6e6;font-size:15px;line-height:1.55;text-align:left;white-space:pre-line;overflow:hidden;flex:1;width:195px;margin:0 auto">${eq.desc ?? ''}</div>
        `;
        card.onmouseover = () => { card.style.transform = 'translateY(0) scale(1.05)'; card.style.filter = 'drop-shadow(0 0 22px rgba(90,170,255,.7)) brightness(1.12)'; };
        card.onmouseout = () => { card.style.transform = 'translateY(0) scale(1)'; card.style.filter = 'none'; };
        card.onclick = () => finish(id);
        grid.appendChild(card);
        setTimeout(() => { card.style.transform = 'translateY(0)'; card.style.opacity = '1'; }, 90 + i * 95);
      });
      content.appendChild(grid);
      overlay.appendChild(content);
      document.body.appendChild(overlay);
      requestAnimationFrame(() => { overlay.style.opacity = '1'; });
    });
  }

  /** P113 用户 spec: 顶部 5-window 回合 timeline.
   *  生成 labels: [我方回合 第N回合 / 敌方回合 / 随机事件 / 我方小商店 / 敌方小商店 ...].
   *  当前 turn 居中, 显示 ±2. 简化: 每回合双方各 1 步, +event 在 3/6/9/12, shop 在 4/8/12.
   */
  private _updateTurnTimeline(): void {
    // v0.9.9 #4: 每步独立一格 — [初始装备]→[第1回合]→[第2回合]→[事件]→[第3回合]…
    //   事件(3/6/9/12) / 商店(4/8/12) 各占独立节点, 排在该回合之前; 不再把回合本身标成事件。
    const nodes: TimelineNode[] = [];
    nodes.push({ round: 0, type: 'equip' });   // 开局: 初始装备
    let curIdx = 1;
    for (let t = 1; t <= this.turn + 5; t++) {
      if (t === 3 || t === 6 || t === 9 || t === 12) nodes.push({ round: t, type: 'event' });
      if (t === 4 || t === 8 || t === 12)            nodes.push({ round: t, type: 'shop' });
      nodes.push({ round: t, type: 'normal' });
      if (t === this.turn) curIdx = nodes.length - 1;   // 当前指向该回合的 round 节点
    }
    this.topRow.setTurnTimeline(nodes, curIdx, this.activeSide);
  }

  /** P108: 孵化器进度累加 + 满 100 → 临时等级 +1 (上限 +3) + 5% 基础属性 */
  private _incubatorProgress(view: FighterView, delta: number, reason: string): void {
    const f = view.fighter as Fighter & {
      _incubatorProgress?: number;
      _incubatorTempLevel?: number;
      _baseAtk?: number; _baseDef?: number; _baseMr?: number; _baseMaxHp?: number;
    };
    if (typeof f._incubatorProgress !== 'number') return;
    f._incubatorProgress = (f._incubatorProgress ?? 0) + delta;
    while ((f._incubatorProgress ?? 0) >= 100 && (f._incubatorTempLevel ?? 0) < 3) {
      f._incubatorProgress = (f._incubatorProgress ?? 0) - 100;
      f._incubatorTempLevel = (f._incubatorTempLevel ?? 0) + 1;
      // 5% 基础属性 (基于 base 当前值, 等级叠加)
      const lv = f._incubatorTempLevel ?? 1;
      const atkBonus = Math.round((f.baseAtk ?? 0) * 0.05);
      const defBonus = Math.round((f.baseDef ?? 0) * 0.05);
      const mrBonus = Math.round((f.baseMr ?? f.baseDef ?? 0) * 0.05);
      const hpBonus = Math.round(f.maxHp * 0.05);
      f.baseAtk = (f.baseAtk ?? 0) + atkBonus; f.atk = f.baseAtk;
      f.baseDef = (f.baseDef ?? 0) + defBonus; f.def = f.baseDef;
      f.baseMr = (f.baseMr ?? f.baseDef ?? 0) + mrBonus; f.mr = f.baseMr;
      f.maxHp += hpBonus; f.hp += hpBonus;
      this.spawnFloatingPassive(view, `🥚→Lv+${lv}`, '#ffd86b');
      this.battleLog.log(`🥚 ${f.name} <b>孵化器升临时等级</b> → Lv +${lv}`);
    }
    void reason;
  }

  /** P94: 窗口 resize 时把每个 view 的 homeX/homeY + sprite + shadow + DOM overlay 重算 1:1.
   *  JS 走 CSS % 自动 reflow, PoC 用 cached canvas coord 不自动跟随. */
  private _onViewportResize(): void {
    if (!this.views || !this.views.length) return;
    const { width } = this.scale.gameSize;
    for (let i = 0; i < this.views.length; i++) {
      const v = this.views[i];
      const side = v.fighter.side;
      const slotKey = (v.fighter as Fighter & { _slotKey?: string })._slotKey || 'front-1';
      const c = this.slotToCoords(slotKey, side, width);
      // sprite + shadow center 用 P9b 同款 bottom-anchored 数学
      const isBoss = (v.fighter as Fighter & { _isBoss?: boolean })._isBoss === true;
      const POSITIONS_SCALE = 1.417;
      const baseScale = isBoss ? (0.9 * POSITIONS_SCALE * 1.5) : (0.9 * POSITIONS_SCALE);
      const DISPLAY_BOX = 80 * baseScale;
      const SPRITE_HALF = Math.floor(DISPLAY_BOX / 2);
      const newSpriteY = c.y - SPRITE_HALF;
      v.homeX = c.x;
      v.homeY = newSpriteY;
      // 若 sprite 当前不在动画里 (_inHop 等), 直接 snap
      const tweens = this.tweens.getTweensOf(v.sprite);
      if (tweens.length === 0 && !v._inHop) {
        v.sprite.x = c.x;
        v.sprite.y = newSpriteY;
      }
      // shadow 跟 sprite
      if (v.shadow) {
        v.shadow.x = c.x + (v.shadowDirX ?? 0);   // 方向已由 origin 实现, shadowDirX 现为 0
        v.shadow.y = c.y - Math.round(12 * baseScale);   // P19 上移到脚底 (跟 makeView shLift 一致)
      }
      // HUD 锚 sprite 中心 (newSpriteY), resize 后重设到新 home 中心 (per-frame sync 会再跟随动画位移)
      v.sceneTurtleDom?.setCanvasPos(c.x, newSpriteY);
    }
  }
  private slotToCoords(slotKey: string, side: 'left' | 'right', width: number): { x: number; y: number; position: 'front' | 'back' } {
    const height = this.scale.gameSize.height;
    const pos = BattleScene.POS_BY_SLOT[slotKey] ?? BattleScene.POS_BY_SLOT['front-1'];
    const xPct = side === 'left' ? pos.xPct : (100 - pos.xPct);
    // P93 1:1 JS: 用 mapCoverPos 把 16:9 % 坐标映射到任意比例容器 cover-cropped 像素位
    const mapped = BattleScene.mapCoverPos(xPct, pos.yPct, width, height);
    const x = Math.round(mapped.px);
    const y = Math.round(mapped.py);
    const position: 'front' | 'back' = slotKey.startsWith('front') ? 'front' : 'back';
    return { x, y, position };
  }

  /** 跨场战斗进度状态收口 — Phaser 复用 scene 实例 (dungeon 关卡 2+ / 再战均 scene.start),
   *  类字段初始值只在构造时跑一次。这里重置所有"每场重来"的进度计数/标志, 防上一场残留泄漏
   *  (历史 bug: 中立永不再刷 / 事件耗尽 / 首杀大奖错给 / round-start 跳过 / 首回合规则失效)。
   *  注意: 不含 benchInventory/rightBench/savedSlots/mode/dungeonStage 等"配置或可跨关携带"的状态,
   *  那些由 init(data) 按数据设定。coins/enemyCoins 是 deep_coin 每场归零 (JS), 故在此重置。 */
  private resetBattleState(): void {
    this.views = [];
    this.turn = 1;
    this.finished = false;
    this.activeSide = 'left';
    this._sideRoundKey = null;
    this.isFirstRound = true;
    this.sidesActedThisRound = 0;
    this.actedThisSide = new Set<FighterView>();
    this.turnPtr = -1;
    this._bossActed = 0;
    this.currentAttacker = null;
    this._turnTimerLeft = 0;
    this.coins = this._carryCoins;   // C3: 深海币跨关携带 (dungeon stage>1); 其余模式 _carryCoins=0
    this.enemyCoins = 0;
    this.lastShopTurn = 0;
    this.neutralSpawned = false;
    this.neutralFirstKilledSide = null;
    this.firedEvents = new Set<string>();
    this.lastRoundStartTurn = 0;
  }

  /** C3: 抓取一只龟的"被动累积成长" (跨深海关持久化用)。flat number map 便于跨 scene 透传。
   *  覆盖: 竹叶生长HP / 命运之轮4花色 / 石墙护甲 / 猎手窃取 (atk/def/mr/hp/kills)。 */
  private captureGrowth(f: Fighter): Record<string, number> {
    const x = f as Fighter & {
      _bambooGainedHp?: number; _stoneDefGained?: number;
      _hunterStolenAtk?: number; _hunterStolenDef?: number; _hunterStolenMr?: number; _hunterStolenHp?: number; _hunterKills?: number;
      _fateWheelCounts?: { spade: number; heart: number; diamond: number; club: number };
      _incubatorTempLevel?: number; _incubatorProgress?: number; _masterTempLevel?: number;
    };
    const g: Record<string, number> = {};
    if (x._bambooGainedHp) g.bambooHp = x._bambooGainedHp;
    if (x._stoneDefGained) g.stoneDef = x._stoneDefGained;
    // 临时等级跨关继承 (用户 2026-05-29: 深海继承孵化器/训龟大师临时等级 + 进度)
    if (x._incubatorTempLevel) g.incTempLv = x._incubatorTempLevel;
    if (x._incubatorProgress) g.incProg = x._incubatorProgress;
    if (x._masterTempLevel) g.masterTempLv = x._masterTempLevel;
    if (x._hunterStolenAtk) g.hAtk = x._hunterStolenAtk;
    if (x._hunterStolenDef) g.hDef = x._hunterStolenDef;
    if (x._hunterStolenMr) g.hMr = x._hunterStolenMr;
    if (x._hunterStolenHp) g.hHp = x._hunterStolenHp;
    if (x._hunterKills) g.hKills = x._hunterKills;
    if (x._fateWheelCounts) {
      const c = x._fateWheelCounts;
      if (c.spade) g.fwSpade = c.spade;
      if (c.heart) g.fwHeart = c.heart;
      if (c.diamond) g.fwDiamond = c.diamond;
      if (c.club) g.fwClub = c.club;
    }
    return g;
  }

  /** C3: 把 captureGrowth 的成长重新施加到新关重建的同一只龟上 (deltas 与各 passive 施加口径 1:1)。 */
  private restoreGrowth(f: Fighter, g: Record<string, number> | undefined): void {
    if (!g) return;
    const x = f as Fighter & {
      _bambooGainedHp?: number; _stoneDefGained?: number;
      _hunterStolenAtk?: number; _hunterStolenDef?: number; _hunterStolenMr?: number; _hunterStolenHp?: number; _hunterKills?: number;
      _fateWheelCounts?: { spade: number; heart: number; diamond: number; club: number };
      _lifestealPct?: number; _baseCrit?: number; _baseArmorPen?: number;
    };
    // 竹叶生长: maxHp += 累计
    if (g.bambooHp) { f.maxHp += g.bambooHp; x._bambooGainedHp = g.bambooHp; }
    // 石墙: def/baseDef += 累计
    if (g.stoneDef) { f.baseDef += g.stoneDef; f.def += g.stoneDef; x._stoneDefGained = g.stoneDef; }
    // 猎手窃取: atk/def/mr/maxHp += 累计
    if (g.hAtk) { f.baseAtk += g.hAtk; f.atk += g.hAtk; x._hunterStolenAtk = g.hAtk; }
    if (g.hDef) { f.baseDef += g.hDef; f.def += g.hDef; x._hunterStolenDef = g.hDef; }
    if (g.hMr) { f.baseMr = (f.baseMr ?? f.baseDef) + g.hMr; f.mr += g.hMr; x._hunterStolenMr = g.hMr; }
    if (g.hHp) { f.maxHp += g.hHp; x._hunterStolenHp = g.hHp; }
    if (g.hKills) x._hunterKills = g.hKills;
    // 命运之轮 4 花色 (与 turn.js gamblerFateWheel 施加口径 1:1)
    const fw = { spade: g.fwSpade ?? 0, heart: g.fwHeart ?? 0, diamond: g.fwDiamond ?? 0, club: g.fwClub ?? 0 };
    if (fw.spade || fw.heart || fw.diamond || fw.club) {
      x._fateWheelCounts = { ...fw };
      f.baseAtk += fw.spade * 5; f.atk += fw.spade * 5;
      f.maxHp += fw.spade * 30;
      f.baseDef += fw.heart * 2; f.def += fw.heart * 2;
      f.baseMr = (f.baseMr ?? f.baseDef) + fw.heart * 2; f.mr += fw.heart * 2;
      f.crit = (f.crit || 0) + fw.diamond * 0.08;
      if (x._baseCrit !== undefined) x._baseCrit += fw.diamond * 0.08;
      f.armorPen = (f.armorPen ?? 0) + fw.diamond * 2;
      x._baseArmorPen = (x._baseArmorPen ?? f.armorPen - fw.diamond * 2) + fw.diamond * 2;
      x._lifestealPct = (x._lifestealPct ?? 0) + fw.club * 4;
    }
    // 临时等级 (孵化器/训龟大师): 跨关重放 N 级 ×5% 基础属性 (与升级时同公式, 复利) + 还原计数/进度。
    const xt = f as Fighter & { _incubatorTempLevel?: number; _incubatorProgress?: number; _masterTempLevel?: number };
    const tempLv = (g.incTempLv ?? 0) + (g.masterTempLv ?? 0);
    for (let i = 0; i < tempLv; i++) {
      f.baseAtk = (f.baseAtk ?? 0) + Math.round((f.baseAtk ?? 0) * 0.05); f.atk = f.baseAtk;
      f.baseDef = (f.baseDef ?? 0) + Math.round((f.baseDef ?? 0) * 0.05); f.def = f.baseDef;
      f.baseMr = (f.baseMr ?? f.baseDef ?? 0) + Math.round((f.baseMr ?? f.baseDef ?? 0) * 0.05); f.mr = f.baseMr;
      f.maxHp += Math.round(f.maxHp * 0.05); f.hp += Math.round(f.maxHp * 0.05);
    }
    if (g.incTempLv) xt._incubatorTempLevel = g.incTempLv;
    if (g.masterTempLv) xt._masterTempLevel = g.masterTempLv;
    // 孵化器进度: 仅当本关仍装着孵化器 (apply 已把字段置 0) 才续上, 否则进度无处累积
    if (g.incProg != null && typeof xt._incubatorProgress === 'number') xt._incubatorProgress = g.incProg;
  }

  create() {
    this.resetBattleState();   // 跨场状态收口 (Phaser 复用 scene 实例 → 必须显式重置)
    battleStats.reset();

    // P78: 注册闪电劈下 VFX 钩子 (passive-triggers 8-stack 引爆用) — JS combat.js:702
    setLightningVfxHook((t) => {
      const v = this.views.find(x => x.fighter === t);
      if (!v || !v.fighter.alive) return;
      const groundY = v.sprite.y + (v.sprite.displayHeight ?? 80) / 2;
      spawnLightningStrike(this, v.sprite.x, groundY);
    });
    this.events.once('shutdown', () => setLightningVfxHook(null));

    // 线条龟 连笔: 在两个被连敌人之间画一道墨线 (小特效)
    setLineConnectVfxHook((a, b) => {
      const va = this.views.find(x => x.fighter === a);
      const vb = this.views.find(x => x.fighter === b);
      if (va && vb) this.drawInkLink(va, vb);
    });
    this.events.once('shutdown', () => setLineConnectVfxHook(null));
    // 连笔墨线随连笔持续 — 每帧跟随双方脚底重画 + 到期/死亡清除
    this.events.on(Phaser.Scenes.Events.UPDATE, this.updateInkLinks, this);
    this.events.once('shutdown', () => { this._inkLinkLines.forEach(l => l.gfx.destroy()); this._inkLinkLines = []; });
    // 黑洞: 被吸入的单位用黑色椭圆盖位 (持 blackhole buff 期间), 每帧跟随/到期清除
    this.events.on(Phaser.Scenes.Events.UPDATE, this.updateBlackholeVisuals, this);
    this.events.once('shutdown', () => { this._blackholeOverlays.forEach(e => e.destroy()); this._blackholeOverlays.clear(); });

    // 太空龟 扭曲空间(满星能换位): 技能改了 _slotKey 数据后发此事件; 之前无监听 → sprite 不动(换位看不见)。
    //   把每个存活视图平移到其当前 _slotKey 坐标 (被换位的两只滑动互换, 未变的原地)。
    this.events.on('star-gravity-warp', () => {
      for (const v of this.views) if (v.fighter.alive) this.repositionViewToSlot(v.fighter);
    });

    // 连笔伤害传递可见化: 给被传递的伙伴飘字 + 记战绩(归功线条龟); 之前传递只扣血看不见。
    setInkTransferHook((partner, shown, dmgType, owner) => {
      if (shown <= 0) return;
      const pv = this.views.find(x => x.fighter === partner);
      if (pv) spawnFloatingText(this, pv.sprite.x, pv.sprite.y, `${shown}`,
        dmgType === 'true' ? 'true-dmg' : 'magic-dmg', { amount: shown, atkSide: owner?.side });
      if (owner) {
        battleStats.recordDamage(owner, partner, shown, dmgType === 'true' ? 'tru' : 'mag');
        // 传递致死: 记击杀 + 清场 (传递前 partner 必活, 见 damage.ts 守卫)
        if (!partner.alive) { battleStats.recordKill(owner, partner); if (pv) this.time.delayedCall(0, () => this.killView(pv)); }
      }
    });
    this.events.once('shutdown', () => setInkTransferHook(null));

    // K2: 结晶引爆 VFX 钩子 — passive-triggers 满层引爆时画紫爆+震屏
    setCrystalDetonateVfxHook((t) => {
      const v = this.views.find(x => x.fighter === t);
      if (v) spawnCrystalDetonate(this, v.sprite.x, v.sprite.y);
    });
    this.events.once('shutdown', () => setCrystalDetonateVfxHook(null));

    // P143 宝箱龟财宝累积 hook — 按造成伤害量 (JS passive_subscribers.js:28-33).
    //   之前只在敌方死亡 +maxHp (自创), 现改 1:1 JS: 每次造成伤害累积财宝.
    setChestTreasureHook((attacker, amount) => {
      const v = this.views.find(x => x.fighter === attacker);
      if (v) this.processChestTreasureGain(v, amount);
    });
    this.events.once('shutdown', () => setChestTreasureHook(null));

    // 缩头「指挥」hook — 让随从立即额外行动一次 (JS hiding.js doHidingCommand)。之前 emit 'hiding-command'
    //   无人监听 → 指挥无效。现 await summonAutoAction (随从立即出手); 回合末它仍按常规再行动一次。
    setHidingCommandHook(async (summon) => {
      const sv = this.views.find(v => v.fighter === summon);
      if (sv) await this.summonAutoAction(sv);
    });
    this.events.once('shutdown', () => setHidingCommandHook(null));

    // 雷电法杖充能 hook — 携带者每段主动伤害命中时即时充能 (单体+25/AOE+12.5),
    //   更新实时层数 badge, 满 100 立刻发射自绘连锁闪电 (减100留溢出)。
    setStaffChargeHook((attacker, isAoe) => this.onLightningStaffHit(attacker, isAoe));
    this.events.once('shutdown', () => setStaffChargeHook(null));

    // P94 1:1 JS turn.js — 窗口 resize 时 JS battle-scene flex 自动 reflow,
    //   PoC FIT mode canvas 也 reflow 但 sprite/DOM overlay 用 cached homeX/Y 不更新.
    //   订阅 scale resize event, 对每个 view 重算 slotToCoords + 同步 sprite + DOM
    this.scale.on('resize', () => this._onViewportResize());
    this.events.once('shutdown', () => this.scale.off('resize'));

    const { width, height } = this.scale.gameSize;

    // 修闪屏: 战斗相机填不透明深海底色 (game 全局 transparent → 切 ENVELOP refresh 那帧
    //   画布还没画 bg 图时会露出身后绿色 tile = "进战斗闪一下绿")。给相机不透明底, 杜绝透出。
    //   仅 BattleScene 相机设底色, 菜单相机仍透明 (保留 tile 漂移背景)。
    this.cameras.main.setBackgroundColor('#0a1726');

    // v0.9.5.A67: 战斗中 letterbox 区域用深海径向渐变 (黑边变深海色)
    document.documentElement.classList.add('battle-active');
    this.events.once('shutdown', () => document.documentElement.classList.remove('battle-active'));

    // v0.9.9: 桌面战斗用 ENVELOP「左右填满 (牺牲上下裁切)」更沉浸; 退出切回 FIT。
    //   移动端例外: ENVELOP 会把边缘 UI(返回按钮等)裁出屏 → 用户点不到。
    //   触屏设备强制 FIT「完整显示 + 黑边」, 保证整页都在屏内、按钮都点得到。
    const isTouch = (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches)
      || (navigator.maxTouchPoints ?? 0) > 0;
    if (!isTouch) {
      this.scale.scaleMode = Phaser.Scale.ENVELOP;
      this.scale.refresh();
      this.events.once('shutdown', () => {
        this.scale.scaleMode = Phaser.Scale.FIT;
        this.scale.refresh();
      });
    }

    // P20: 背景按模式路由 (JS battle-setup.js:148-159 1:1) — 之前随机 9 选 1 是 poc 自创.
    //   pve (野生)  → bg-sakura
    //   boss       → bg-ruins
    //   pvp-online → bg-underwater
    //   dungeon    → stage-keyed (1=sakura, 2=oasis, 3=cave-alt, 4=ice, 5+=ruins)
    //   test       → 随机 (test mode 本就让用户切)
    let bgKey: string;
    if (this.mode === 'boss' || this.mode === 'boss-pick') {
      bgKey = 'bg-ruins';
    } else if (this.mode === 'dungeon') {
      const stage = this.dungeonStage;
      bgKey = stage <= 1 ? 'bg-sakura'
            : stage === 2 ? 'bg-oasis'
            : stage === 3 ? 'bg-cave-alt'
            : stage === 4 ? 'bg-ice'
            :               'bg-ruins';
    } else if (this.mode === 'test') {
      const MAPS = ['bg-sakura', 'bg-cave-alt', 'bg-firefly', 'bg-forest',
        'bg-ice', 'bg-oasis', 'bg-ruins', 'bg-shipwreck', 'bg-underwater'];
      bgKey = Phaser.Utils.Array.GetRandom(MAPS);
    } else {
      // pve / custom / pvp-online → JS 默认 sakura (pvp 走 underwater 但 poc 没此 mode)
      bgKey = 'bg-sakura';
    }
    // E3/32: 真修 letterbox — 不在 canvas 里放 bg, 整个 bg 走 body CSS (跟 JS 1:1)
    // 之前 E3/25: canvas + body 各放一份, cover 比例不一样 → canvas 边缘有 seam.
    // 现在: canvas 透明 (main.ts:34 已开), body background-size:100% 100% 拉伸 →
    //       JS #screenBattle{background-size:100% 100%} 同款, 永远没黑边没 seam.
    document.documentElement.style.setProperty('--battle-bg-img', `url('bg/${bgKey}.png')`);
    this.events.once('shutdown', () => {
      document.documentElement.style.removeProperty('--battle-bg-img');
    });
    // P188: 背景进 Phaser 世界层 (depth -100) → 随主相机 zoom/pan 一起缩放平移,
    //   实现 JS 那样的"整场景推镜"(JS battle-setup.js:161 把 bg 设在 #battleScene=缩放层上,
    //   #screenBattle 自身 bg 清成 none). 之前 PoC bg 走 CSS 在相机外 → 只缩龟不缩地图.
    //   bg 用 gameSize 100% 铺满 (保持画地面与龟站位对齐, 不裁切); 相机 setBounds 防露边.
    //   CSS --battle-bg-img 仍保留: 仅填 canvas 外的 letterbox 信箱区 (FIT 模式防黑边).
    const bg = this.add.image(width / 2, height / 2, bgKey)
      .setDisplaySize(width, height)
      .setDepth(-100);
    this.bgImage = bg;
    // 阶段1: 环境氛围粒子 (按场景主题, depth -50 在 bg 之上、龟之下) — 让战场不死板
    {
      type PCfg = Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;
      let cfg: PCfg;
      if (bgKey === 'bg-underwater' || bgKey === 'bg-shipwreck' || bgKey === 'bg-oasis') {
        // 深海: 气泡上浮
        cfg = { x: { min: 0, max: width }, y: height + 10, lifespan: 6000, speedY: { min: -50, max: -110 },
          speedX: { min: -15, max: 15 }, scale: { start: 0.5, end: 0.1 }, alpha: { start: 0.4, end: 0 },
          tint: [0x7ee0ff, 0xaef0ff, 0xffffff], frequency: 260, blendMode: 'ADD' };
      } else if (bgKey === 'bg-sakura') {
        // 樱花: 花瓣飘落
        cfg = { x: { min: 0, max: width }, y: -10, lifespan: 9000, speedY: { min: 25, max: 60 },
          speedX: { min: -30, max: 30 }, rotate: { min: 0, max: 360 }, scale: { start: 0.45, end: 0.2 },
          alpha: { start: 0.7, end: 0.1 }, tint: [0xffd6e8, 0xffb3d1, 0xffffff], frequency: 340 };
      } else if (bgKey === 'bg-ice') {
        cfg = { x: { min: 0, max: width }, y: -10, lifespan: 9000, speedY: { min: 20, max: 50 },
          speedX: { min: -20, max: 20 }, scale: { start: 0.4, end: 0.15 }, alpha: { start: 0.8, end: 0.2 },
          tint: [0xffffff, 0xcdeeff], frequency: 300 };
      } else if (bgKey === 'bg-ruins') {
        cfg = { x: { min: 0, max: width }, y: { min: 0, max: height }, lifespan: 7000, speedY: { min: -10, max: 20 },
          speedX: { min: -25, max: 25 }, scale: { start: 0.3, end: 0.05 }, alpha: { start: 0.4, end: 0 },
          tint: [0xffd700, 0xffaa55], frequency: 380, blendMode: 'ADD' };
      } else {
        cfg = { x: { min: 0, max: width }, y: { min: 0, max: height }, lifespan: 7000, speedY: { min: -12, max: -30 },
          speedX: { min: -12, max: 12 }, scale: { start: 0.35, end: 0.08 }, alpha: { start: 0.3, end: 0 },
          tint: [0xbfe6ff, 0xffffff], frequency: 420, blendMode: 'ADD' };
      }
      this.add.particles(0, 0, '__DEFAULT', cfg).setDepth(-50);
    }
    // 阶段1: 关卡过场卡 — 深海闯关进战斗时一张「第 N 关」仪式感卡片 (复用中央横幅, 非阻挡)
    if (this.mode === 'dungeon' && this.dungeonStage > 0) {
      const isBoss = this.dungeonStage >= 5;
      this.showCenterBanner(`第 ${this.dungeonStage} 关`, 1500,
        isBoss ? '#ff6b6b' : '#7ee0ff', isBoss ? '⚠ BOSS 关' : '深海闯关');
    }
    // 相机边界 = 世界 (gameSize): 拉近 (zoom>1) 后 pan 到某一排时, 镜头被 clamp 在 bg 内,
    //   绝不会移出 bg 边缘露黑/露 letterbox. zoom=1 时视野=世界, 居中不动 (与改前一致).
    this.cameras.main.setBounds(0, 0, width, height);
    // 阶段1 调色后处理 (Phaser 3.80 postFX, WebGL; 仅作用画布内容, 不影响 DOM UI 清晰度)。
    //   暗角 + 微调色(略增饱和/对比统一色调) + 轻 bloom。Canvas 模式或不支持时 try 跳过。
    //   注: bloom 是 GPU 较重项, 若低端机掉帧可移除这一行。
    try {
      const fx = this.cameras.main.postFX;
      fx.addVignette(0.5, 0.5, 0.92, 0.32);
      const cm = fx.addColorMatrix(); cm.saturate(0.12, true); cm.contrast(0.05, true);
      // 移除 bloom: 它是每帧 4-pass 全屏模糊, 高分屏/集显上是主要掉帧源 (用户报"卡卡的")。
      //   暗角 + 微调色保留 (近乎零开销), 商业色调仍在; 发光感由各技能自带 VFX 提供。
    } catch { /* 不支持 postFX (canvas 模式) → 跳过 */ }

    // v0.9.3.B: test 模式右上 bg 切换器
    if (this.mode === 'test') {
      const ALL_MAPS = ['bg-sakura', 'bg-cave-alt', 'bg-firefly', 'bg-forest',
        'bg-ice', 'bg-oasis', 'bg-ruins', 'bg-shipwreck', 'bg-underwater'];
      this.makeTestBgPicker(width, ALL_MAPS);
    }

    // P24: 删 400ms 黑屏 fadeIn — JS 无场景过场黑屏 (用户报"每次进入场景中间会黑一下屏")

    // BGM — I5: boss 关放 boss BGM (JS battle-setup.js:209-210)
    this.sound.stopByKey('bgm-menu');
    const isBossStage = this.mode === 'boss' || this.mode === 'boss-pick'
      || (this.mode === 'dungeon' && this.dungeonStage >= 5);
    const bgmKey = (isBossStage && this.sound.get('bgm-boss') === null && this.cache.audio.exists('bgm-boss'))
      ? 'bgm-boss' : 'bgm-battle';
    this.sound.stopByKey(bgmKey === 'bgm-boss' ? 'bgm-battle' : 'bgm-boss');
    if (!this.sound.get(bgmKey)) {
      // 阶段2: BGM 淡入 (volume 0 → 0.35, 900ms) 而非硬起
      const bgm = this.sound.add(bgmKey, { loop: true, volume: 0 });
      bgm.play();
      this.tweens.add({ targets: bgm, volume: 0.35, duration: 900, ease: 'Sine.easeIn' });
    }

    // 顶部按钮行 — JS index.html:364-371 + battle.css:27-35 1:1
    // 5 按钮: ← (退出/confirmSurrender) + 第 N 回合 banner + ? (toggleHelp) +
    //         📜 (toggleBattleLog) + 📊 (toggleDmgStats) + 🛠 (showDebugPanel)
    // DOM overlay (Phaser canvas 无法 1:1 还原 CSS), 见 BattleTopRow.ts
    this.helpPanel = new HelpPanel(this);
    // 音量 + 全屏 顶右 global 按钮 (JS index.html:122-124 + base.css:136-143 1:1)
    this.globalToolbar = new GlobalToolbar(this);
    this.topRow = new BattleTopRow(this, {
      onBack: () => this.confirmSurrender(),
      onHelp: () => this.helpPanel.toggle(),
      onLog: () => this.battleLog.toggle(),
      onDmgStats: () => this.toggleDmgStatsPanel(),  // P102: 走 DmgStatsPanel DOM (P100), 不再调老 Phaser showStatsPanel
      onDebug: () => this.debugOverlay?.toggle(),
    });
    // #7 整局规则: 顶栏徽章显示本局规则 (this.rule 存的是 name, 查 BATTLE_RULES 取 emoji/desc/color)
    if (this.rule) {
      const rd = BATTLE_RULES.find(r => r.name === this.rule);
      if (rd) this.topRow.setRule(rd);
    }
    // F3: 自动对战机器人 — 暴露给控制台/Playwright: window.__autoBattle(true, true) 双方AI加速跑整局
    (window as unknown as { __autoBattle?: (on?: boolean, fast?: boolean) => void }).__autoBattle =
      (on = true, fast = true) => this.setAutoBattle(on, fast);
    // P17 DebugOverlay (JS games/turtle-battle/js/debug.js 1:1)
    // DEV gate (2026-05-30): 仅 ?dev=1 启用 (省 CSS install + DOM); 按钮已在 BattleTopRow 隐藏。
    if (DEV_VISIBLE) this.debugOverlay = new DebugOverlay(this, {
      fullHealAll: () => {
        for (const v of this.views) {
          if (v.fighter.alive) {
            v.fighter.hp = v.fighter.maxHp;
            this.refreshStatusIcons(v);
          }
        }
      },
      killAllEnemies: () => {
        for (const v of this.views.filter(v => v.fighter.side === 'right' && v.fighter.alive)) {
          debugKillFighter(v.fighter);
          if (!v.fighter.alive) this.killView(v);
        }
        this.debugOverlay?.hide();
      },
      killAllAllies: () => {
        for (const v of this.views.filter(v => v.fighter.side === 'left' && v.fighter.alive)) {
          debugKillFighter(v.fighter);
          if (!v.fighter.alive) this.killView(v);
        }
        this.debugOverlay?.hide();
      },
      resetCds: () => {
        for (const v of this.views) {
          for (const s of v.fighter.skills) (s as Record<string, unknown>).cdLeft = 0;
        }
        // 重渲 ActionPanel 让 disabled 卡解锁
        const acting = this.turnOrder[this.turnPtr];
        if (acting && this.actionPanel.isVisible()) {
          this.actionPanel.show(acting.fighter, (idx) => this.onPlayerSkillPicked(acting, idx));
        }
      },
      addBattleCoins: (amount) => {
        this.coins += amount;
        // 深海币 pill: P17 用 setDeepCoin (左侧)
        this.statsRail?.setDeepCoin('left', this.coins, true);
      },
      addDeepCoin: (side, amount) => {
        // 走 statsRail setDeepCoin (JS renderDeepCoinUI 同款)
        const cur = side === 'left' ? this.coins : 0;
        if (side === 'left') {
          this.coins += amount;
          this.statsRail?.setDeepCoin('left', this.coins, true);
        } else {
          // 右侧无内部状态, 直接传值
          this.statsRail?.setDeepCoin('right', cur + amount, true);
        }
      },
      openShop: () => {
        // 走 ShopOverlay (P14) — 调试手动开店, 用当前回合算 shopIndex
        const playerFighters = this.views.filter(v => v.fighter.side === 'left' && v.fighter.alive).map(v => v.fighter);
        const shopIndex = Math.max(0, Math.floor(this.turn / 4) - 1);
        this.shop.open(this.coins, playerFighters, shopIndex, (coinsAfter) => {
          this.coins = coinsAfter;
        });
        this.debugOverlay?.hide();
      },
      giveEquip: (id, side) => {
        const eq = getEquipById(id);
        if (!eq) return;
        if (side === 'left') {
          this.benchInventory.push(eq);
          this.benchRail.render('left', this.benchInventory);
        } else {
          this.rightBench.push(eq);
          this.benchRail.render('right', this.rightBench);
        }
      },
      addConsumable: (id) => {
        const eq = getEquipById(id);
        if (!eq) return;
        this.benchInventory.push(eq);
        this.benchRail.render('left', this.benchInventory);
      },
      exportLog: () => {
        const lines: string[] = [];
        const log = document.getElementById('poc-battle-log');
        if (log) {
          log.querySelectorAll('.poc-battle-log-line').forEach(el => lines.push(el.textContent ?? ''));
        }
        const text = lines.join('\n');
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).catch(() => { /* ignore */ });
        }
      },
      getInfo: () => {
        const alive = this.views.filter(v => v.fighter.alive);
        const dead = this.views.length - alive.length;
        return `回合: ${this.turn}\n龟币: ${this.coins}\n活: ${alive.length} 死: ${dead}\n模式: ${this.mode}\n回合者: ${(this.turnOrder[this.turnPtr]?.fighter.name) ?? '-'}`;
      },
    });

    // 装备席 rail 左右 (各 10 槽) — JS index.html:467-468 + battle.css:2621-2670 1:1
    this.benchRail = new BenchRail(this, {
      onSlotClick: (side, idx, eq) => {
        // 修(2026-05-30 用户报"风格不统一" + "装备只能拖拽"): 全部走 DetailPanel.showEquipDescPopup
        //   (跟"龟身上点装备格"用同一个 DOM 弹窗, 视觉完全一致); 普通装备无 action 按钮(拖拽是唯一使用方式),
        //   糖果罐加「打碎」(粉)、口哨加「吹响」(紫)。
        const eqAct = (eq as { actionable?: string }).actionable;
        const opts: Parameters<DetailPanel['showEquipDescPopup']>[0] = {
          name: eq.name ?? '装备',
          icon: eq.icon ?? '',
          desc: eq.desc ?? '',
        };
        if (eqAct === 'blow') {
          opts.actionLabel = '吹响';
          opts.actionColor = 'purple';
          opts.onAction = () => this.blowMasterWhistle(idx, side);
        } else if (eqAct === 'break') {
          opts.actionLabel = '打碎';
          opts.actionColor = 'pink';
          opts.onAction = () => this.breakCandyJar(idx, side);
        }
        this.detailPanelDom.showEquipDescPopup(opts);
      },
      // P220 1:1 JS bench.js: 拖装备/消耗品到龟身上装备/使用
      onDragMove: (side, eq, sx, sy) => {
        const view = this.benchDragHitTest(eq, sx, sy);
        if (!view) { this.clearBenchDragRing(); return null; }
        const fit = this.validateEquipFit(view.fighter, eq);
        this.showBenchDragRing(view, fit.ok);
        return fit.ok ? 'valid' : 'invalid';
      },
      onDragDrop: (side, idx, eq, sx, sy) => {
        this.clearBenchDragRing();
        if (side !== 'left') return false;   // 只有我方装备席可玩家拖
        const view = this.benchDragHitTest(eq, sx, sy);
        if (!view) return false;
        const fit = this.validateEquipFit(view.fighter, eq);
        if (!fit.ok) { this.spawnFloatingPassive(view, fit.reason ?? '不可装备', '#ff6b6b'); return false; }
        this.applyBenchEquipToFighter(view.fighter, eq, idx, side);
        return true;
      },
    });

    // 深海币 pill + 羁绊 chip 竖排 (双方各一组, 紧贴 bench rail 外侧)
    // JS index.html:372-377 + battle.css:37-56,175-208 1:1
    this.statsRail = new BattleStatsRail(this, {
      onSynergyClick: (tag, tier) => this.showSynergyDetail(tag, tier),
    });

    // P98: 删自创的 800ms 延迟首回合 banner. JS battle-setup.js:467+turn.js:beginTurn 是
    //   await "战斗开始" (1500ms) → beginTurn → await "第 N 回合" (1100ms) → turn logic.
    //   PoC processOnSpawnAndPirate 末尾改 await 链 + 这里不再 delayedCall.
    // P113: 初始化顶部 5-window 回合 timeline
    this._updateTurnTimeline();

    // P24: 删 BattleScene 右上角自创"战斗规则 pill" — 用户报"右上角怎么有个正常对局".
    // JS 没此常驻 pill — 规则只在 pre-battle 走 showRuleBanner (5s 自动消失).
    // 后续若需 pre-battle rule banner, 走 banner-overlay 路径, 不再持续 pill.
    void this.rule;

    // v0.9.5.A45: 3v3 阵容 (JS 对齐) — 每只龟由 slotKey 决定站位 (front-0/1/2 + back-0/1/2)
    // 玩家可任意放 3 只到 6 个槽, 敌方 autoAssignSlots 自动菱形阵
    const placeTeam = (team: string[], slots: string[], side: 'left' | 'right', autoSort = false) => {
      const isSoloBoss = side === 'right' && (this.mode === 'boss' || this.mode === 'boss-pick') && team.length === 1;
      // P192: 先建好所有 fighter (拿到真实 maxHp + _passiveSkills), 再分配站位 —
      //   敌方 autoSort 时按 effectiveHp 排 (1:1 JS autoAssignPositions 在 fighter 建好后才排序).
      // 港 JS main.js:1486 _avgLevel(leftTeam) — 敌方默认等级 = 玩家队平均(round, clamp 1-10);
      //   PvE/Boss/野生对局 之前 rightLevel undefined → 敌方永远 Lv1, 玩家把龟练高就一面倒。
      //   教程等显式传 rightLevel 时仍以它为准。
      const computeAvgFromSaved = (team: string[]): number => {
        if (!team.length) return 1;
        try {
          const ps = JSON.parse(localStorage.getItem('petState') || '{}');
          const sum = team.reduce((s, id) => s + ((ps.levels?.[id]) ?? 1), 0);
          return Math.max(1, Math.min(10, Math.round(sum / team.length)));
        } catch { return 1; }
      };
      const effectiveSideLevel = side === 'left'
        ? this.leftLevel
        : (this.rightLevel ?? computeAvgFromSaved(this.leftTeam));
      // 修「对局内龟全是 Lv1」: 玩家(左)龟应使用各自存档等级 (localStorage petState.levels[id], 与
      //   TeamSelect 显示同源 getPetLevel)。教程等显式传 leftLevel 时仍以它为准。
      const resolveLevel = (id: string): number | undefined => {
        if (side !== 'left' || effectiveSideLevel != null) return effectiveSideLevel;
        try { const ps = JSON.parse(localStorage.getItem('petState') || '{}'); return (ps.levels && ps.levels[id]) || 1; }
        catch { return 1; }
      };
      const built = team.map((id) => {
        const equippedIdxs = (side === 'left' && this.loadouts[id]) ? this.loadouts[id] : undefined;
        const lvl = resolveLevel(id);
        const f = createFighter(id, side, (equippedIdxs || lvl != null) ? { equippedIdxs, level: lvl } : undefined);
        // Phase C: JS main.js:1406-1408 1:1 — 把 TeamSelect 拖的 mark slot 标在 owner
        if (side === 'left') {
          const sf = f as Fighter & { _savedSummonSlot?: string; _savedCrystalBallSlot?: string; _savedCandyBombSlot?: string };
          if (id === 'hiding' && this.savedSlots.summon) sf._savedSummonSlot = this.savedSlots.summon;
          if (id === 'crystal' && this.savedSlots.crystalBall) sf._savedCrystalBallSlot = this.savedSlots.crystalBall;
          if (id === 'candy' && this.savedSlots.candyBomb) sf._savedCandyBombSlot = this.savedSlots.candyBomb;
        }
        // v0.9.3.B: 敌方 (right side) 按模式调属性
        if (side === 'right') this.applyEnemyModeMods(f);
        return f;
      });
      const useSlots = autoSort ? this.autoAssignSlotsForFighters(built) : slots;
      if (autoSort) this.rightSlots = useSlots;   // 回写, 供 BattleEnd 透传 / 复活归位
      built.forEach((f, i) => {
        const slotKey = useSlots[i] ?? (isSoloBoss ? 'front-1' : 'front-0');
        const { x, y, position } = this.slotToCoords(slotKey, side, width);
        f._position = position;
        (f as Fighter & { _slotKey?: string })._slotKey = slotKey;
        // P69: 删自创 setDisplaySize(220, 220) — boss size 已 = SPRITE 80 × baseScale 1.913 (跟 JS 一致)
        const view = this.makeView(f, x, y);
        this.views.push(view);
      });
    };
    placeTeam(this.leftTeam, this.leftSlots, 'left');
    placeTeam(this.rightTeam, this.rightSlots, 'right', this._rightSlotsAuto);
    // 预登记全体 → 伤害统计面板开战即列出所有龟 (值 0), 不再初始空白 (对齐 JS allFighters)
    battleStats.registerAll(this.views.map(v => v.fighter));

    // P221 教程: 给我方装备席预置 1 装备 + 1 消耗品 (供拖拽教学) + 启动步骤引导
    if (this.tutorial) this.setupTutorialGuide();

    // 敌方倍率 (dungeon 第 N 关 / BOSS) — E1: 三轴分离, JS dungeon.js:161-164
    if (this.enemyHpMult !== 1 || this.enemyAtkMult !== 1 || this.enemyDefMult !== 1) {
      for (const v of this.views) {
        if (v.fighter.side !== 'right') continue;
        const f = v.fighter;
        f.maxHp = Math.round(f.maxHp * this.enemyHpMult);
        f.hp = f.maxHp;
        f.baseAtk = Math.round(f.baseAtk * this.enemyAtkMult);
        f.atk = f.baseAtk;
        f.baseDef = Math.round(f.baseDef * this.enemyDefMult);
        f.def = f.baseDef;
        f.baseMr = Math.round(f.baseMr * this.enemyDefMult);
        f.mr = f.baseMr;
        // E1: boss 标记 (stage 5)
        if (this.dungeonStage === 5) {
          (f as Fighter & { _isBoss?: boolean })._isBoss = true;
          if (!f.name.startsWith('BOSS')) f.name = 'BOSS ' + f.name;
        }
      }
    }
    // 应用跨关累积奖励 (bonuses) - 仅玩家方
    if (this.bonuses && this.bonuses.length > 0) {
      for (const v of this.views) {
        if (v.fighter.side !== 'left') continue;
        const f = v.fighter;
        for (const b of this.bonuses) {
          if (b.kind === 'atk' && b.value) {
            f.baseAtk = Math.round(f.baseAtk * (1 + b.value));
            f.atk = f.baseAtk;
          } else if (b.kind === 'hp' && b.value) {
            f.maxHp += b.value;
            f.hp += b.value;
          } else if (b.kind === 'crit' && b.value) {
            f.crit = Math.min(1, (f.crit || 0) + b.value);
          } else if (b.kind === 'lifesteal' && b.value) {
            f._lifestealPct = ((f._lifestealPct as number) || 0) + b.value * 100;
          } else if (b.kind === 'shield' && b.value) {
            f.shield = (f.shield || 0) + b.value;
          } else if (b.kind === 'equip' && b.equipId) {
            // 装备: 整队级一次, push 到装备席 (JS dungeon.js dungeonPickEquipItem 对齐)
            // 玩家战中点击装备席决定装到哪只龟 — 不再自动装到第一只
            if (v === this.views.filter(x => x.fighter.side === 'left' && x.fighter.alive)[0]) {
              // E2/2: 神秘商人 '__unique_random__' → 推 bench 随机稀有装备
              if (b.equipId === '__unique_random__') {
                this.dropMerchantUniqueToBench();
              } else {
                const eq = EQUIP_BY_ID[b.equipId];
                if (eq) this.addToBench(eq, 'left');
              }
            }
          }
        }
      }
    }

    // E3/41: 开局一次性 passive 应用 (JS battle-setup.js:218-279 + fighter.js:171 1:1)
    // ninjaInstinct: 开局 +crit / +critDmgPerm / +armorPen
    // ninjaFeet: 玩家装备时 +dodge / +crit (skill 在 _passiveSkills 时算装备)
    // 之前 Phaser 完全没应用, 忍者龟核心强度归零
    for (const v of this.views) {
      const f = v.fighter;
      // ninjaInstinct passive (开局)
      if (f.passive?.type === 'ninjaInstinct') {
        const p = f.passive as { critBonus?: number; critDmgBonus?: number; armorPen?: number };
        f.crit = Math.min(1, (f.crit ?? 0) + (p.critBonus ?? 0) / 100);
        const cf = f as Fighter & { _extraCritDmgPerm?: number };
        cf._extraCritDmgPerm = (cf._extraCritDmgPerm ?? 0) + (p.critDmgBonus ?? 0) / 100;
        f.armorPen = (f.armorPen ?? 0) + (p.armorPen ?? 0);
      }
      // ninjaFeet passiveSkill (玩家装备此 skill 时, 等价 JS fighter.js:171-174)
      // _passiveSkills 是 createFighter 收集的 passiveSkill:true 项, 检查玩家选了没
      const ps = f._passiveSkills as Array<{ type?: string }> | undefined;
      const equippedIdxs = (f as Fighter & { _equippedIdxs?: number[] })._equippedIdxs ?? [];
      const pet = PET_BY_ID[f.id];
      if (pet?.skillPool) {
        for (const i of equippedIdxs) {
          const s = pet.skillPool[i];
          if (s?.type === 'ninjaFeet') {
            const cf = f as Fighter & { _extraDodge?: number };
            cf._extraDodge = (cf._extraDodge ?? 0) + 25;
            f.crit = Math.min(1, (f.crit ?? 0) + 0.40);
          }
          // P32 gambler: gamblerEnhancedMulti — -30% maxHp + multi-hit chance 40→60
          // (JS fighter.js:229-237)
          if (s?.type === 'gamblerEnhancedMulti') {
            // 开局扣除当前生命值的 30% (不再降低最大生命值; 开局满血 → 落到 70% 当前HP, maxHp 不变)
            const hpLoss = Math.round(f.hp * 0.3);
            f.hp = Math.max(1, f.hp - hpLoss);
            if (f.passive && f.passive.type === 'gamblerMultiHit') {
              (f.passive as { chance?: number }).chance = 60;
            }
            // 用户报"强化被动没掉血/生效了吗": 之前静默扣血→玩家没感知。刷血条 + 开场飘 -N 让它可见。
            const gv = this.views.find(x => x.fighter === f);
            gv?.sceneTurtleDom?.update();
            if (gv) this.time.delayedCall(900, () => { if (f.alive) this.spawnFloatingPassive(gv, `强化多重! -${hpLoss}HP`, '#ff6600'); });
            this.battleLog?.log(`🎰 ${f.name} 强化多重打击 (开局 -${hpLoss}HP, 多重概率 60%)`);
          }
          // P32 gambler: gamblerFateWheel — mark _fateWheel for turn-begin draw
          // (JS fighter.js:239-241)
          if (s?.type === 'gamblerFateWheel') {
            (f as Fighter & { _fateWheel?: boolean })._fateWheel = true;
          }
          // P36 angel: angelRevive passiveSkill (JS fighter.js:161-162)
          //   死亡时 25% maxHp 复活一次 (state.js:184-191 1:1, _angelReviveUsed 防多次)
          if (s?.type === 'angelRevive') {
            (f as Fighter & { _angelRevive?: boolean })._angelRevive = true;
          }
          // P37 ice: iceBurnImmune passiveSkill (JS fighter.js:165-167)
          //   免疫灼烧 (applyBurn 检查此 flag 跳过)
          if (s?.type === 'iceBurnImmune') {
            (f as Fighter & { _burnImmune?: boolean })._burnImmune = true;
            // 极寒装备时, 把对熔岩/凤凰的克制加成 20%→40% (覆盖被动 frostAura.bonusDmgPct)。
            //   f.passive 是 per-fighter 浅拷贝 (fighter.ts:79), 改它不影响别的龟/共享 def。
            if (f.passive?.type === 'frostAura') {
              (f.passive as { bonusDmgPct?: number }).bonusDmgPct = 40;
            }
            this.battleLog?.log(`❄ ${f.name} 极寒: 免疫灼烧 + 克制 +40%`);
          }
          // P39 two_head: twoHeadFusion passiveSkill (JS pets.js:236-238)
          //   不可切换形态, 但常驻获得近战形态的 +HP/Def/Mr 加成 (-ATK loss 也常驻?)
          //   JS hpScale 1.5 defScale 0.25 mrScale 0.25 atkLossScale 0.3 shieldScale 1.1
          if (s?.type === 'twoHeadFusion') {
            const atkBase = f.baseAtk;
            const hpGain = Math.round(atkBase * 1.5);
            const defGain = Math.round(atkBase * 0.25);
            const mrGain = Math.round(atkBase * 0.25);
            const shieldGain = Math.round(atkBase * 1.1);
            f.maxHp += hpGain; f.hp += hpGain;
            f.baseDef += defGain; f.def = f.baseDef;
            f.baseMr = (f.baseMr ?? f.def) + mrGain; f.mr = f.baseMr;
            f.shield = (f.shield ?? 0) + shieldGain;
            (f as Fighter & { _twoHeadFusion?: boolean })._twoHeadFusion = true;
            (f as Fighter & { _initHp?: number })._initHp = f.maxHp;
            this.battleLog?.log(`🐢🐢 ${f.name} 融合 (+${hpGain}HP +${defGain}DEF +${mrGain}MR +${shieldGain}盾)`);
          }
          // P39 two_head: twoHeadResilience passiveSkill (JS pets.js:251-253)
          //   每受到一段攻击 +1 def + 1 mr (cap 20)
          //   实现: 挂 flag, passive-triggers.ts 受击时检查 + 增加
          // B(用户 2026-05-28): 双头坚韧在 meleeSkills[i] (远程配对是精神干扰等主动)。选了该 index 就【无视形态】永久叠层 →
          //   常驻设 flag(passive-triggers 受击叠) + 把它塞进 _passiveSkills, 让远程/近战两形态面板都显示该被动 tile。
          const thMelee = (pet as { meleeSkills?: (typeof s)[] }).meleeSkills?.[i];
          if (s?.type === 'twoHeadResilience' || thMelee?.type === 'twoHeadResilience') {
            (f as Fighter & { _twoHeadResilience?: boolean })._twoHeadResilience = true;
            const tps = f._passiveSkills;
            const thSkill = (s?.type === 'twoHeadResilience' ? s : thMelee);
            if (tps && thSkill && !tps.some(x => x.type === 'twoHeadResilience')) tps.push({ ...thSkill });
          }
          // P41 diamond: diamondEnhanced passiveSkill (JS pets.js:312-314)
          //   自身护甲魔抗加成 +100% (skill-handlers.ts:173 已读取此 flag 切高 flatReduce)
          if (s?.type === 'diamondEnhanced') {
            (f as Fighter & { _diamondEnhanced?: boolean })._diamondEnhanced = true;
            this.battleLog?.log(`💎 ${f.name} 强化钻石结构 (自身护甲魔抗 +100%)`);
          }
          // P43 dice: diceGamblerConvert passiveSkill (JS pets.js:360-362 + fighter.js:278-283)
          //   登场: 全部 DEF + MR → armorPen (DEF/MR 归零)
          if (s?.type === 'diceGamblerConvert') {
            const fc = f as Fighter & {
              _diceGamblerConverted?: boolean;
              _gamblerPreDef?: number; _gamblerPreMr?: number; _gamblerPreArmorPen?: number;
            };
            // 记下转换前的 护甲/魔抗/穿甲, 供 snapshot 后覆盖 init 基线 →
            //   面板把归零的护甲/魔抗显示为"削弱"(红), 增加的穿甲显示为"增益"(绿)
            fc._gamblerPreDef = f.def;
            fc._gamblerPreMr = f.mr ?? f.def;
            fc._gamblerPreArmorPen = f.armorPen ?? 0;
            const totalConvert = f.baseDef + (f.baseMr ?? f.baseDef);
            f.armorPen = (f.armorPen ?? 0) + totalConvert;
            f.baseDef = 0; f.def = 0;
            f.baseMr = 0; f.mr = 0;
            fc._diceGamblerConverted = true;
            this.battleLog?.log(`🎲 ${f.name} 真正的赌徒: 全部 ${totalConvert} 护甲/魔抗 → 穿甲`);
          }
          // P44 rainbow: rainbowEnhancedPrism passiveSkill (JS pets.js:384-386 + fighter.js:270)
          //   棱镜 7 色, 每回合抽 2 个效果 (applyRainbowPrism 已读 _enhancedPrism flag)
          if (s?.type === 'rainbowEnhancedPrism') {
            (f as Fighter & { _enhancedPrism?: boolean })._enhancedPrism = true;
            this.battleLog?.log(`🌈 ${f.name} 强化棱镜 (7色, 每回合 2 选)`);
          }
          // P51 lava: lavaEnhancedRage passiveSkill (JS pets.js:607-609)
          //   开局直接 100 怒气, 立即变身火山龟 (火山形态少 1 技能槽)
          //   processLavaRage 检查 _lavaRageReady → 触发变身
          if (s?.type === 'lavaEnhancedRage') {
            (f as Fighter & { _lavaRage?: number; _lavaRageReady?: boolean })._lavaRage = 100;
            (f as Fighter & { _lavaRageReady?: boolean })._lavaRageReady = true;
            this.battleLog?.log(`🌋 ${f.name} 强化熔岩之心 (开局 100 怒气, 立即变身)`);
          }
          // P52 crystal: crystalImmortal passiveSkill (JS pets.js:672-674 + fighter.js:243-245)
          //   存活到第 10 回合: +5000 maxHp +400 ATK (turn.js:295-313 处理 trigger)
          //   _crystalImmortal flag 标记, _crystalImmortalTriggered 防多次
          if (s?.type === 'crystalImmortal') {
            (f as Fighter & { _crystalImmortal?: boolean })._crystalImmortal = true;
          }
          // P53 chest: chestGreed passiveSkill (JS pets.js:723-725 + fighter.js:225)
          //   每携带 1 件装备 → +4% ATK + 7% maxHp 永久
          //   _chestGreed flag, 装备 attach 时累加 (装备已加好, 现一次性算 baseline)
          if (s?.type === 'chestGreed') {
            (f as Fighter & { _chestGreed?: boolean })._chestGreed = true;
            const equipCount = f.equipment?.length ?? 0;
            const atkGain = Math.round(f.baseAtk * 0.04 * equipCount);
            const hpGain = Math.round(f.maxHp * 0.07 * equipCount);
            f.baseAtk += atkGain;
            f.atk = f.baseAtk;
            f.maxHp += hpGain;
            f.hp += hpGain;
            (f as Fighter & { _initHp?: number; _initAtk?: number })._initHp = f.maxHp;
            (f as Fighter & { _initHp?: number; _initAtk?: number })._initAtk = f.baseAtk;
            if (equipCount > 0) this.battleLog?.log(`📦 ${f.name} 贪婪: ${equipCount} 件装备 → +${atkGain}ATK +${hpGain}HP`);
          }
          // P53 chest: chestIntuition passiveSkill (JS pets.js:720-722)
          //   财宝值阈值降低 80/130/240/360/590 → 60/120/220/350/500
          //   _chestIntuition flag, processChestTreasure 读取切阈值
          if (s?.type === 'chestIntuition') {
            (f as Fighter & { _chestIntuition?: boolean })._chestIntuition = true;
            this.battleLog?.log(`📦 ${f.name} 寻宝直觉 (阈值降低)`);
          }
          // P55 hiding: hidingEnhancedSummon passiveSkill (JS pets.js:770-772 + fighter.js:247-250)
          //   自身 -50% maxHp (current 同步), 随从 hpPct 40 → 110 (passive 属性改, spawnSummonAlly 读)
          if (s?.type === 'hidingEnhancedSummon') {
            (f as Fighter & { _enhancedSummon?: boolean })._enhancedSummon = true;
            // #8 低#9: 随从血量按主体【原始(减半前)】maxHp×110% 算 (用户定: 110%常规maxHp=原始的110%, 不是减半后的110%)
            (f as Fighter & { _summonHpBase?: number })._summonHpBase = f.maxHp;
            const hpLoss = Math.round(f.maxHp * 0.5);
            f.maxHp = Math.max(1, f.maxHp - hpLoss);
            f.hp = Math.min(f.hp, f.maxHp);
            (f as Fighter & { _initHp?: number })._initHp = f.maxHp;
            if (f.passive && f.passive.type === 'summonAlly') {
              (f.passive as { hpPct?: number }).hpPct = 110;
            }
            this.battleLog?.log(`🫣 ${f.name} 强化喊龟 (自身 -50% maxHp, 随从 110% maxHp)`);
          }
          // P35 bamboo: bambooCharged passiveSkill (JS pets.js:118-120 强化生长)
          //   atkPct 75→100, selfHpPct 8→13, healSelfHpPct 8→12, hpGainAtkPct 60→105
          //   fireBambooChargeIfReady 读 _bambooEnhanced flag 切高数值
          if (s?.type === 'bambooCharged') {
            (f as Fighter & { _bambooEnhanced?: boolean })._bambooEnhanced = true;
            this.battleLog?.log(`🎋 ${f.name} 强化生长 (75→100% ATK, 60→105% maxHp gain)`);
          }
          // P33 cyber: cyberEnhancedDrone passiveSkill (JS pets.js:645-647)
          //   浮游炮上限 10→20, 每回合生成 1→2, 每个伤害 25%→12% ATK,
          //   机甲变身额外 +3×count def/mr
          if (s?.type === 'cyberEnhancedDrone') {
            (f as Fighter & { _cyberEnhanced?: boolean })._cyberEnhanced = true;
            if (f.passive && f.passive.type === 'cyberDrone') {
              const p = f.passive as { maxDrones?: number; droneScale?: number; dronesPerTurn?: number };
              p.maxDrones = 20;
              p.droneScale = 0.12;
              p.dronesPerTurn = 2;
            }
            this.battleLog?.log(`🛸 ${f.name} 强化浮游炮 (上限 20, 每回合 2 个, 12% ATK)`);
          }
          // line: lineRapid (速写) passiveSkill — 墨迹上限 5→7 + 墨迹/连笔传导/引爆全部转真实
          //   JS pets.js:528 是 passiveSkill (非 active); 等价 fighter init 设 flag。
          //   addInkStack 读 _inkCapOverride (上限) / _inkTrueDmg (→ target._inkRapidActive),
          //   applyInkBonus 按 _inkRapidActive 走真伤, lineFinish/lineLink 读 _inkTrueDmg。
          if (s?.type === 'lineRapid') {
            (f as Fighter & { _inkCapOverride?: number })._inkCapOverride = 7;
            (f as Fighter & { _inkTrueDmg?: boolean })._inkTrueDmg = true;
            this.battleLog?.log(`🖌️ ${f.name} 速写 (墨迹上限 7, 墨迹/连笔/引爆转真实伤害)`);
          }
        }
      }
      void ps;
    }

    // P2.7: 在所有 stat 调整 (rule / bonus / equip / passive) 之后, snapshot 初始值给详情卡显示 stat-up/down
    for (const v of this.views) snapshotInitStats(v.fighter);
    // 真正的赌徒 (diceGamblerConvert): snapshot 在转换后跑会把 护甲/魔抗 基线记成 0、穿甲记成已转。
    //   覆盖回转换前的值 → 面板里 护甲/魔抗 显红(削弱)、护甲穿透显绿(增益)。
    for (const v of this.views) {
      const fc = v.fighter as Fighter & {
        _diceGamblerConverted?: boolean;
        _gamblerPreDef?: number; _gamblerPreMr?: number; _gamblerPreArmorPen?: number;
        _initDef?: number; _initMr?: number; _initArmorPen?: number;
      };
      if (!fc._diceGamblerConverted) continue;
      if (fc._gamblerPreDef != null) fc._initDef = fc._gamblerPreDef;
      if (fc._gamblerPreMr != null) fc._initMr = fc._gamblerPreMr;
      if (fc._gamblerPreArmorPen != null) fc._initArmorPen = fc._gamblerPreArmorPen;
    }

    // 玩家 HP 继承 (dungeon 跨关) + P1.2 死龟 70% 复活 + P1.3 position 保留
    if (this.playerHpSnapshot) {
      for (const v of this.views) {
        if (v.fighter.side !== 'left') continue;
        const snap = this.playerHpSnapshot.find(s => s.id === v.fighter.id);
        if (snap) {
          // C3 修复: 先把上关装在身上的装备重新装回 (在 HP 结算前 → maxHp 含装备加成),
          //   否则深海每关重建 fighter = 装备全丢。bench(未用的)由 benchInventoryIds 另行携带。
          if (snap.equipIds && snap.equipIds.length) {
            for (const eqId of snap.equipIds) {
              const eq = EQUIP_BY_ID[eqId];
              if (!eq) continue;
              if ((v.fighter.equipment ?? []).some(e => (e as { id?: string }).id === eqId)) continue;
              attachEquipment(v.fighter, eq);
            }
          }
          // C3: 重新施加被动累积成长 (竹叶/命运之轮/石墙/猎手), 同样在 HP 结算前 → maxHp 含成长
          this.restoreGrowth(v.fighter, (snap as { growth?: Record<string, number> }).growth);
          // P1.2: snap.alive=false 表示上关阵亡 → 进新关 70% HP 复活
          const wasDead = snap.alive === false || snap.hp === 0;
          if (wasDead) {
            v.fighter.hp = Math.round(v.fighter.maxHp * 0.7);
            v.fighter.shield = 0;
            v.fighter.alive = true;
            this.battleLog?.log(`✨ ${v.fighter.name} 跨关复活 (70% HP)`);
          } else {
            // P219 1:1 JS dungeon.js:191 — 存活龟下关回满血 (JS 每关清算 teamHp=maxHp), 非 HP 继承
            v.fighter.hp = v.fighter.maxHp;
            v.fighter.shield = 0;
            v.fighter.alive = true;
          }
          // P1.3: 跨关 position 保留
          if (snap.position) v.fighter._position = snap.position;
        }
      }
    }

    // 绑定 VFX 事件总线
    bindVisualDispatcher({
      scene: this,
      getView: (f) => {
        const v = this.views.find(v => v.fighter === f);
        if (!v) return null;
        return {
          x: v.sprite.x, y: v.sprite.y,
          setHpDisplay: (hp, maxHp) => {
            const ratio = hp / maxHp;
            this.tweens.add({ targets: v.hpBar, width: 118 * ratio, duration: 300, ease: 'power2' });
            v.hpText.setText(`${hp}/${maxHp}`);
          },
        };
      },
    });
    this.events.once('shutdown', () => unbindVisualDispatcher());
    this.events.once('destroy', () => unbindVisualDispatcher());

    // v0.9.5.A91: 中立 KO reward 订阅 + I2: 击杀金币中央钩子 (JS deep_coin onKill)
    const offDied = bus.on('fighter:died', (e) => {
      const f = e.fighter as Fighter & { _isNeutral?: boolean; _isBoss?: boolean; _candyBomb?: Fighter; _isCandyBomb?: boolean; _candyBombDetonated?: boolean };
      // K9: 糖果龟(主人)阵亡 → 糖果炸弹立即引爆 (JS: 糖果龟阵亡 → 糖果炸弹立即引爆)
      if (f._candyBomb?.alive) {
        const bombV = this.views.find(v => v.fighter === f._candyBomb);
        f._candyBomb.alive = false; f._candyBomb.hp = 0;
        this.detonateCandyBomb(f._candyBomb);
        if (bombV) this.killView(bombV);
      }
      // K9: 糖果炸弹「自身」被击杀(敌人打死/级联) → 引爆 (JS engine.js:565 / state.js:275,
      //   companion 死亡清理时 _isCandyBomb && !_candyBombDetonated → _detonateCandyBomb)。
      //   之前只处理主人死亡, 漏了直接打死炸弹的情况 → 炸弹白死不炸。
      if (f._isCandyBomb && !f._candyBombDetonated) {
        this.detonateCandyBomb(f);
      }
      if (f._isNeutral) { this.handleNeutralKilled(e.fighter, e.killer); return; }
      // I2: 玩家(left)击杀敌方 → boss +30 / 普通 +5 (覆盖技能/被动/普攻所有击杀路径,
      //   旧只 basic-attack fallback 给 +5 且无 boss 加成 → boss 被技能杀给 0 币)
      const killer = e.killer;
      if (killer && killer.side === 'left' && f.side === 'right') {
        // 用户 v0.9.9: 击杀普通敌方 +25 (Boss 仍 +30)
        this.coins += f._isBoss ? 30 : 25;
        this.refreshCoinDisplay();
      } else if (killer && killer.side === 'right' && f.side === 'left') {
        // 野生敌方 AI 击杀我方龟 → AI +25 (深海/Boss 不给, 见守卫)
        this.aiGainCoins(25, '击杀');
      }
    });
    this.events.once('shutdown', offDied);

    // 提示
    const tip = this.add.text(width / 2, height - 60, '真 fighter + 真 stats + 真伤害公式 — 自动对战', {
      fontSize: '14px', color: '#fff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
      backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: tip, alpha: 0, duration: 1000, delay: 2500, onComplete: () => tip.destroy() });

    // (已删: 永久 buff PermShop — 局外无商店, 该 buff 永远 0, 死代码已移除)

    // 战斗规则一次性应用 (暴怒 stat / 装备日发装)
    const leftFighters = this.views.filter(v => v.fighter.side === 'left').map(v => v.fighter);
    const rightFighters = this.views.filter(v => v.fighter.side === 'right').map(v => v.fighter);
    applyRuleStart(this.rule, leftFighters, rightFighters);
    // HP 同步 (规则可能改 maxHp)
    for (const v of this.views) v.fighter.hp = v.fighter.maxHp;

    // 协同 buff 应用 (左右各算各的)
    const leftSyn = applyTeamSynergies(leftFighters, rightFighters);
    const rightSyn = applyTeamSynergies(rightFighters, leftFighters);
    // 渲染协同条 (左右两条, 顶部)
    this.renderSynergyBar(leftSyn, 'left');
    this.renderSynergyBar(rightSyn, 'right');
    // HP 同步 (协同可能加了 maxHp/shield)
    for (const v of this.views) {
      v.hpText.setText(`${v.fighter.hp}/${v.fighter.maxHp}`);
    }

    // 构建轮转顺序 (左右交替: L0, R0, L1, R1, L2, R2, L3, R3, L4, R4, L5, R5)
    const lefts = this.views.filter(v => v.fighter.side === 'left');
    const rights = this.views.filter(v => v.fighter.side === 'right');
    this.turnOrder = [];
    for (let i = 0; i < Math.max(lefts.length, rights.length); i++) {
      if (lefts[i]) this.turnOrder.push(lefts[i]);
      if (rights[i]) this.turnOrder.push(rights[i]);
    }
    this.turnPtr = -1;

    // Action panel + Battle log + Shop
    this.actionPanel = new ActionPanel(this);
    this.detailPanelDom = new DetailPanel(this);
    this.turtlePicker = new TurtlePicker(this);
    this.skillTweenMgr = new SkillTweenMgr(this);
    this.battleLog = new BattleLog(this);
    // 运气羁绊: 第1回合发物品到装备席 (放 battleLog/benchRail 就绪后, addToBench 会写日志)
    this.grantLuckSynergy(leftFighters, 'left');
    this.grantLuckSynergy(rightFighters, 'right');
    // P26: skill handlers 通过 scene.events.emit('battle-log', text) 发日志 (lineLink 已用)
    this.events.on('battle-log', (text: string) => this.battleLog?.log(text));
    // 招财进宝: skill-handlers 扣币后发此事件 → 从 normal/unique 装备池随机抽 1 件进对应席。
    //   (原本 emit 后无监听 → 招财进宝白扣币不出装, 用户报"它能抽什么"才查出)
    this.events.on('fortune-buy-equip', (data: { side: 'left' | 'right' }) => {
      const pool = EQUIP_POOL.filter(e => e.category === 'normal' || e.category === 'unique');
      if (!pool.length) return;
      const eq = pool[Math.floor(Math.random() * pool.length)];
      if (eq) this.addToBench({ ...eq }, data.side);
    });
    this.shop = new ShopOverlay(this);

    // v0.9.5.A82: P0 召唤物登场 (JS battle-setup.js:258-388) — 必须在 battleLog 初始化后
    // 缩头乌龟 summonAlly / 海盗龟 pirateShip / 水晶龟 crystalBall / 糖果龟 candyBomb
    this.processBattleStartSummons(width);

    // 阴影实时调试器 (dev): 影子已定稿, 不再自动弹出; 需要再调时控制台敲 __shadowTuner() 打开。
    (window as unknown as { __shadowTuner?: () => void }).__shadowTuner = () => this.createShadowTuner();

    // v0.9.5.D2: 启动 badge auto-refresh ticker
    this.startBadgeAutoRefresh();

    // v0.9.5.D3: DMG stats panel — P23 删自创右上角 📊 重复按钮 (TopRow 已有 📊).
    this.createDmgStatsPanel();
    // (跨场状态已在 create() 顶部 resetBattleState() 收口)
    // v0.9.5.A64: 装备席 rail 初始渲染 (空 10 槽)
    this.refreshBenchUI();

    // Phase 1 cleanup: 删自创"顶部龟币"显示 (JS 战中无龟币 UI, coin-display 仅主菜单 nav)
    // Phase 2 会重做顶部按钮行: 返回/turn-banner/?/📜/📊/🛠 (JS index.html:364-371 1:1)
    this.battleLog.log('战斗开始!');
    for (const s of leftSyn) this.battleLog.log(`协同激活: ${s.tag} ×${s.tier}`);
    for (const s of rightSyn) this.battleLog.log(`敌方协同: ${s.tag} ×${s.tier}`);

    // v0.9.5.A50: 登场被动 hooks — JS engine.js 对齐
    this.triggerEnterPassives();

    // P65: 删除自创"连携"系统 — JS 用 tag-based SYNERGY_TAGS (P30+ 已 1:1 实装)
    // 旧代码 (元素之契/光暗双子等组合) 与 SYNERGY_TAGS 重复扣加 ATK, 完全 JS-self-created

    // P29: 海盗龟 pirateBarrage 开局轰击 (JS battle-setup.js:436-470 1:1)
    //   有 pirateBarrage passive 且 bombardPct>0 (即没装 pirateShipPassive 禁用):
    //   4000ms delay → 每只海盗龟: "掠夺!" float -10 → sleep 1000 → 随机敌 hit-shake
    //   → maxHp×bombardPct% true pierce → float ${dmg} → sleep 800 → remove hit-shake
    //   全部跑完 → 1500ms → "战斗开始" 横幅 + nextActor
    const pirates = this.views.filter(v => {
      const f = v.fighter;
      const p = f.passive as { type?: string; bombardPct?: number } | null;
      return f.alive && p?.type === 'pirateBarrage' && (p.bombardPct ?? 0) > 0;
    });
    if (pirates.length > 0) {
      this.time.delayedCall(4000, async () => {
        for (const pv of pirates) {
          const f = pv.fighter;
          const p = f.passive as { bombardPct?: number };
          spawnFloatingText(this, pv.sprite.x, pv.sprite.y - 10, '掠夺!', 'debuff-label');
          await new Promise<void>(r => this.time.delayedCall(1000, r));
          const enemies = this.views.filter(v => v.fighter.alive && v.fighter.side !== f.side);
          if (!enemies.length) continue;
          const tView = enemies[Math.floor(Math.random() * enemies.length)];
          const target = tView.fighter;
          const baseDmg = Math.round(f.maxHp * (p.bombardPct ?? 25) / 100);
          // hit-shake (sprite 横向抖)
          this.tweens.add({
            targets: tView.sprite, x: tView.sprite.x + (target.side === 'left' ? -8 : 8),
            duration: 60, yoyo: true, repeat: 2,
          });
          // applyRawDamage true pierce
          const wasAlive = target.alive;
          const r = applyRawDamage(target, baseDmg, 'true', true);
          const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0) + (r.bubbleAbs ?? 0) + (r.auraAbs ?? 0);
          battleStats.recordDamage(f, target, shown, 'tru');   // 计入战绩 (原开局轰击伤害不进统计)
          if (wasAlive && !target.alive) battleStats.recordKill(f, target);
          spawnFloatingText(this, tView.sprite.x, tView.sprite.y - 40, `${shown}`, 'true-dmg', { amount: shown, atkSide: f.side });
          this.tweens.add({ targets: tView.hpBar, width: 118 * (target.hp / target.maxHp), duration: 200 });
          tView.hpText.setText(`${target.hp}/${target.maxHp}`);
          this.battleLog.log(`🏴‍☠️ ${f.name} <b>掠夺</b> → ${target.emoji}${target.name} ${shown} 真实`);
          if (!target.alive) this.killView(tView);
          await new Promise<void>(r2 => this.time.delayedCall(800, r2));
        }
        // P98 1:1 JS battle-setup.js:460-463 — 1500ms 后 await "战斗开始" → beginTurn (含 "第 1 回合" banner) → nextActor
        await new Promise<void>(r => this.time.delayedCall(1500, r));
        await this._showBannerAwait('⚔️ 战斗开始', 1500, '#ffd93d', 'Battle Start');
        await this._maybeRunInitialEquipPhase();
        await this.roundBanner();   // B1: 事件/商店回合预告
        await this.runRoundStartPipeline();   // A1: 预告后立即跑事件/中立, 再弹选龟框
        this.beginSideTurn();   // A1: 战斗开始 → 我方回合横幅
      });
    } else {
      // P98 1:1 JS battle-setup.js:466-469 — 无海盗时直接 await 两个 banner 再 nextActor
      (async () => {
        await this._showBannerAwait('⚔️ 战斗开始', 1500, '#ffd93d', 'Battle Start');
        // P112 用户 spec: 第一回合 3 选 1 初始装备 (PVP/野生 双方, 深海仅第 1 关)
        await this._maybeRunInitialEquipPhase();
        await this.roundBanner();   // B1: 事件/商店回合预告
        await this.runRoundStartPipeline();   // A1: 预告后立即跑事件/中立, 再弹选龟框
        this.beginSideTurn();   // A1: 战斗开始 → 我方回合横幅
      })();
    }
  }

  /** P112 第一回合初始装备 phase. 仅符合条件时跑. */
  private async _maybeRunInitialEquipPhase(): Promise<void> {
    // 深海: 仅第 1 关 (dungeonStage===1) 才有
    if (this.mode === 'dungeon' && this.dungeonStage !== 1) return;
    // test/boss-pick 模式跳过
    if (this.mode === 'test' || this.mode === 'boss-pick') return;
    // P221 教程: 跳过通用 3 选 1 (教程用预置装备席 + 引导教拖拽, 避免双弹窗冲突)
    if (this.tutorial) return;
    // 已经选过 (重复调用兜底)
    if ((this as unknown as { _initialEquipPicked?: boolean })._initialEquipPicked) return;
    (this as unknown as { _initialEquipPicked?: boolean })._initialEquipPicked = true;

    // 我方选 (显示锻造器选择框)
    const leftPick = await this.showInitialEquipPickModal();
    if (leftPick) this._applyInitialEquip('left', leftPick);
    // 敌方静默选 — 不在我方屏幕显示敌方的选择框 (对战时各屏只显示自己的)。深海人机不拿。
    if (this.mode !== 'dungeon') {
      const pool = ['e_turtle_helmet', 'e_turtle_sword', 'e_turtle_shell'];
      const rightPick = pool[Math.floor(Math.random() * pool.length)];
      this._applyInitialEquip('right', rightPick);
      this.battleLog?.log(`🎁 敌方选择了初始装备 ${EQUIP_BY_ID[rightPick]?.name ?? ''}`);
    }
  }

  /** P19: 选中的初始装备进装备席 (不直接装上), 玩家拖到龟身上才装备 — 对齐 JS 战利品→席。 */
  private _applyInitialEquip(side: 'left' | 'right', equipId: string): void {
    const eq = EQUIP_BY_ID[equipId]; if (!eq) return;
    this.addToBench(eq, side);
  }

  /** P98 1:1 JS showTurnStartBanner: 同 showCenterBanner 但返回 Promise, 等 dur + 260ms fade out 后 resolve */
  private _showBannerAwait(text: string, dur: number, color: string, sub?: string): Promise<void> {
    return new Promise(resolve => {
      this.showCenterBanner(text, dur, color, sub);
      this.time.delayedCall(dur + 260, () => resolve());
    });
  }

  /** B2: 事件/中立入场节奏 — 全屏短暂压暗 + 琥珀闪 + 轻震, 让事件"有来袭感"不突兀 */
  private flashEventEntrance(): void {
    const { width, height } = this.scale.gameSize;
    const dim = this.add.rectangle(width / 2, height / 2, width, height, 0x1a1024).setAlpha(0).setDepth(188);
    this.tweens.add({ targets: dim, alpha: 0.42, duration: 150, yoyo: true, hold: 110, onComplete: () => dim.destroy() });
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffb01f).setAlpha(0).setDepth(189);
    this.tweens.add({ targets: flash, alpha: 0.2, duration: 120, yoyo: true, onComplete: () => flash.destroy() });
    this.cameras.main.shake(180, 0.004);
  }

  /** A1: round-start 事件/中立/规则 pipeline (一回合一次, JS turn.js:48-99 1:1)。
   *  从 startActorTurn 提出来, 在 roundBanner 预告之后、beginSideTurn(底下选龟框)之前跑,
   *  使「事件来袭」预告 → 事件实际触发 → 才弹选龟框, 时序连贯。
   *  若本回合确实触发了事件/中立, 额外 await 一段让横幅看得见再继续。 */
  private async runRoundStartPipeline(): Promise<void> {
    if (this.turn <= this.lastRoundStartTurn) return;
    this.lastRoundStartTurn = this.turn;
    const allFighters = this.views.map(v => v.fighter);
    let dramatic = false;   // 是否触发了需要"亮相停顿"的事件/中立

    // v0.9.5.A91: 中立生物 spawn (3/6/9/12 60% 概率, 整场最多 1 个)
    //   双方 6 格都满 → 强制海葵母 (寄生型不占 slot, JS D19)
    const bothFull = this.findEmptySlot('left') === null && this.findEmptySlot('right') === null;
    const neutralRoll = rollNeutralForTurn(this.turn, this.neutralSpawned, bothFull);
    if (neutralRoll) {
      this.spawnNeutralPair(neutralRoll.type as 'treasure' | 'crab' | 'anemone');
      dramatic = true;
    }
    // P4.1+P4.2 局中事件 (回合 3/6/9/12 触发) — 若已 spawn 中立或抽中立失败则走 env
    const evt = !neutralRoll ? rollEventForTurn(this.turn, this.firedEvents) : null;
    if (evt) {
      this.firedEvents.add(evt.id);
      evt.apply(allFighters);
      // 财宝雨: 双方各 +30 深海币 (用户 v0.9.9). 玩家 +30, 野生敌方 AI +30 (深海/Boss 不给)
      if (evt.id === 'treasure-rain') {
        this.coins += 30;
        this.refreshCoinDisplay();
        this.aiGainCoins(30, '财宝雨');
      }
      this.flashEventEntrance();   // B2: 入场压暗+琥珀闪+轻震, 给事件一个"来袭"节奏
      this.showCenterBanner(`${evt.emoji} ${evt.name}`, 1500, '#fff3a0');
      this.battleLog.log(`✦ 事件: ${evt.name} — ${evt.desc}`);
      // HP 条同步 + 死亡同步
      for (const v of this.views) {
        this.tweens.add({ targets: v.hpBar, width: 118 * (v.fighter.hp / v.fighter.maxHp), duration: 200 });
        v.hpText.setText(`${v.fighter.hp}/${v.fighter.maxHp}`);
        if (!v.fighter.alive && v.sprite.alpha > 0) this.killView(v);
      }
      dramatic = true;
    }

    // 雷暴持续 (JS events.js:60 _thunderstormTurns) — 后续回合随机单位 40 真伤
    this.processThunderstormTick(allFighters);

    applyRulePerTurn(this.rule, allFighters, this.turn);
    // 检查死亡 (雨夜可能致死)
    for (const v of this.views) {
      const rainDmg = (v.fighter as Fighter & { _rainDmg?: number })._rainDmg;
      if (rainDmg && rainDmg > 0) {
        this.tweens.add({ targets: v.hpBar, width: 118 * (v.fighter.hp / v.fighter.maxHp), duration: 200 });
        v.hpText.setText(`${v.fighter.hp}/${v.fighter.maxHp}`);
        (v.fighter as Fighter & { _rainDmg?: number })._rainDmg = 0;
      }
      if (!v.fighter.alive && v.sprite.alpha > 0) this.killView(v);
    }
    // 元素 ×3 羁绊: 每回合随机灼烧一名敌人 (JS turn.js:71-83)
    this.processSynergyElemBurnTick();

    // I9: 海盗船开炮 (JS turn.js:84-99) 在 spawn **之前** —— JS fire 在回合顶, spawn 在 passive 段。
    //   故 turn3 spawn 的船首发在 turn4, 不会 spawn 当回合就开火 (旧 PoC spawn 在前 → 早开一回合)。
    this.processPirateShipFire(allFighters);

    // P29: 海盗船 turn 3 召唤 (JS turn.js:347-394 1:1)
    if (this.turn === 3) {
      for (const v of this.views) {
        const f = v.fighter as Fighter & { _pirateShipEnabled?: boolean; _pirateShipSummoned?: boolean };
        if (f._pirateShipEnabled && !f._pirateShipSummoned && f.alive) {
          f._pirateShipSummoned = true;
          this.spawnPirateShip(v);
        }
      }
    }

    // v0.9.5.C2: hunter execute — HP < threshPct% 触发处决 3-phase animation (JS state.js:691-771)
    //   兜底扫描 (回合开始): 抓 DoT/上回合遗留把敌人压到阈值下的情况; 行动中实时斩在 castWithAnnounce。
    await this.processHunterExecute();

    // P100: DmgStatsPanel (DOM) 通过 bus stats:updated 自动刷新, 无需手动调.

    // 事件/中立亮相停顿 — 让横幅+入场特效看得见, 再放行 beginSideTurn 弹选龟框
    if (dramatic) await new Promise<void>(r => this.time.delayedCall(1500, r));
  }

  /** B1: 回合开始横幅 — 事件回合(3/6/9/12)/商店回合(4/8/12) 用醒目文案+色预告, 不再"突然出现事件" */
  private roundBanner(): Promise<void> {
    const t = this.turn;
    const isEvent = (t === 3 || t === 6 || t === 9 || t === 12);
    const isShop = (t % 4 === 0);
    if (isEvent) return this._showBannerAwait(`⚠ 第 ${t} 回合 · 事件来袭`, 1400, '#ffb01f', 'Event Round');
    if (isShop) return this._showBannerAwait(`🛒 第 ${t} 回合 · 商店`, 1300, '#7ec8ff', 'Shop Round');
    return this._showBannerAwait(`第 ${t} 回合`, 1100, '#ffd93d', `Round ${t}`);
  }

  private makeView(f: Fighter, x: number, y: number): FighterView {
    // P9b (JS ui.js:131-148 + scene.css:6 transform-origin:bottom center):
    //   JS .scene-turtle 是 bottom-anchored: el.style.bottom = (1 - py/ch)*100%
    //   → slotToCoords 返回的 y 是"龟脚下接地点", sprite 中心要上移 half_height.
    //   Phaser sprite origin (0.5, 0.5), 所以 sprite.y = groundY - displayH/2.
    //   之前 makeView 直接用 y = ground 当 center, 龟整个下沉 56px, 跟 JS 不对位.
    // P29/P64/P69: JS 真 sprite size — ui.js:154 `const spriteSize = 80`!
    //   JS body (.st-body) 无固定 width/height, 仅 flex 容器, 包裹 80px sprite
    //   PoC P29 用 PET_BOX = 113 → 龟比 JS 大 41% (113 vs 80)
    //   P64 加 1.417 multiplier 修了"小 30%", 但 113 base 还是错的 — P69 改 80
    //
    //   JS visual sprite size @ PC 1280: 80 × 1.275 = 102 px
    //   PoC P69 visual sprite size:     80 × 1.275 = 102 px ✓ (匹配 JS)
    //
    //   Phaser sprite 中心 = y - half(102) ≈ y - 51 (而非旧 y - 56)
    //   shadow 大小 80×24 也是 CSS px, 跟 sprite size 一致 (JS scene.css:23)
    const isBoss = (f as Fighter & { _isBoss?: boolean })._isBoss === true;
    const POSITIONS_SCALE = 1.417;
    const baseScale = isBoss ? (0.9 * POSITIONS_SCALE * 1.5) : (0.9 * POSITIONS_SCALE);
    const SPRITE_SIZE = 80;   // P69: JS ui.js:154 spriteSize=80 (NOT 113)
    const DISPLAY_BOX = SPRITE_SIZE * baseScale;  // 1.275 → 102px; 1.913 → 153px
    const SPRITE_HALF = Math.floor(DISPLAY_BOX / 2);
    const spriteY = y - SPRITE_HALF;
    // P29: shadow 1:1 JS scene.css:18-31 — BootScene 烤的 radial-gradient PNG 纹理.
    //   JS shadow 在 .st-body 内 (size 80×24 CSS), 整个 .scene-turtle scale base-scale
    //   → 实际渲染 = 80 × baseScale = 72 (normal) / 152.8 (boss)
    // 影子改用「乌龟剪影」(在下方 sprite 创建后建, 才能拿到同款纹理/缩放/朝向)。
    //   shDirX: 移动同步时影子额外横偏 (0=锚脚底正下方)。
    const shDirX = 0;
    const fitToBox = (s: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite, box: number) => {
      const w = s.width || box, h = s.height || box;
      // JS ui-anim.js:87 buildPetImgHTML: sc = size/frameH — 锁高度, 宽度按比例 (不是 min-fit)。
      //   landscape 帧 (如竹叶龟 500×400) 用 min-fit 会偏矮偏小; 锁高度才与 JS 等大。
      const scale = box / h;
      s.setDisplaySize(w * scale, h * scale);
      // P9: 像素艺术 NEAREST filter (JS image-rendering:pixelated 等价)
      try { s.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
    };
    let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
    if (hasIdleAnim(this, f.id)) {
      const s = this.add.sprite(x, spriteY, `pet-sheet-${f.id}`).setDepth(2);
      s.play(`anim-idle-${f.id}`);
      fitToBox(s, DISPLAY_BOX);  // P29: base-scale-adjusted (0.9× normal / 1.91× boss)
      sprite = s;
    } else {
      const bodyKey = this.textures.exists(`pet-body-${f.id}`) ? `pet-body-${f.id}` : `pet-${f.id}`;
      const im = this.add.image(x, spriteY, bodyKey).setDepth(2);
      fitToBox(im, DISPLAY_BOX);
      sprite = im;
    }
    // v0.9.5.A56: 朝向 — JS 资源默认面朝左 (CSS pos-left scaleX(-1) 才朝右).
    // Phaser: 左方翻转 (face right toward enemy), 右方不翻转 (face left toward player)
    // 例外: hiding/mech 资源默认面朝右 (JS CSS 反着写)
    const FACING_RIGHT_ASSETS = new Set(['hiding', 'mech']);
    const flipLeft = !FACING_RIGHT_ASSETS.has(f.id);
    if (f.side === 'left') sprite.setFlipX(flipLeft);
    else sprite.setFlipX(!flipLeft);

    // ── 影子 = 乌龟剪影 (用户要求"方龟方影"): 同纹理/动画的副本 → setTintFill 黑 (形状/帧自动跟随)
    //    → 压扁躺地 + 朝右下投, depth 1 (龟下)。变换走 applyShadowTransform (makeView 默认 + 调试器/最终值)。
    let shadow: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
    if (hasIdleAnim(this, f.id)) {
      const ss = this.add.sprite(x, spriteY, `pet-sheet-${f.id}`).setDepth(1);
      ss.play(`anim-idle-${f.id}`);
      fitToBox(ss, DISPLAY_BOX);
      shadow = ss;
    } else {
      const bodyKey = this.textures.exists(`pet-body-${f.id}`) ? `pet-body-${f.id}` : `pet-${f.id}`;
      const im = this.add.image(x, spriteY, bodyKey).setDepth(1);
      fitToBox(im, DISPLAY_BOX);
      shadow = im;
    }
    shadow.setTintFill(0x000000);   // 纯黑剪影 (整块染黑, 保留 alpha 形状)
    // 单一太阳 → 全场影子方向【统一】(不镜像)。用户调好的值 (bake):
    this.applyShadowTransform(shadow, sprite, { size: 1.1, flatten: 0.6, rot: 24, alpha: 0.55, lift: 9, offsetX: 22, flipY: true });
    const shadowFx = (shadow as unknown as { preFX?: { addBlur?: (...a: number[]) => void } }).preFX;
    if (shadowFx?.addBlur) shadowFx.addBlur(0, 2, 2, 1, 0x000000);   // 柔边

    // v0.9.5.A62: 点击龟 → 看详情 (JS ui.js:152 onclick 同款)
    //   普通点击: showFighterDetail (双方都可看)
    //   picker 模式下选龟走下方按钮条 (TurtlePicker), 龟点击保留为看详情
    sprite.setInteractive({ useHandCursor: true });
    // 点龟看详情 — 施法时也允许 (用户: 要能点别的龟查看面板再决策); 详情有 veil, 点背景即关回到施法。
    //   "透过施法面板点到后面的龟"的根因不在这里, 而是 ActionPanel 缺 blockLeak (已补) → 点面板会漏到后面龟。
    //   选目标中: 候选龟身上有 ring(depth60) 在精灵之上, topOnly 命中 ring 选目标, 不会落到这条 → 不冲突。
    sprite.on('pointerdown', () => this.showFighterDetail(f));

    // HP 条 — Phase 8: Phaser canvas HP/shield bars 全 alpha 0 (legacy 兼容: 大量代码 .width/.fillColor)
    // 真实显示走 sceneTurtleDom (DOM overlay, JS .scene-turtle .st-hp-row 1:1)
    const barW = 120, barH = 12;
    const hpBarBg = this.add.rectangle(x, y - 60, barW, barH, 0x0a0f1a, 0.95)
      .setStrokeStyle(2, 0x1f2937, 1).setDepth(3).setAlpha(0);
    const hpFill = f.side === 'left' ? 0x22c55e : 0xef4444;
    const hpDelayBar = this.add.rectangle(x - barW / 2 + 1, y - 60, barW - 2, barH - 4, 0xee5555, 0)
      .setOrigin(0, 0.5).setDepth(3.5).setAlpha(0);
    const hpBar = this.add.rectangle(x - barW / 2 + 1, y - 60, barW - 2, barH - 4, hpFill)
      .setOrigin(0, 0.5).setDepth(4).setAlpha(0);
    const hpBarHi = this.add.rectangle(x, y - 60 - (barH - 4) / 2 + 1, barW - 6, 1.5, 0xffffff, 0.45)
      .setDepth(4.5).setAlpha(0);
    const shieldBar = this.add.rectangle(x - barW / 2 + 1, y - 60 - barH + 2, 0, 3, 0x60a5fa, 0.95)
      .setOrigin(0, 0.5).setDepth(4).setVisible(false);
    // Phase 1 cleanup: hpText / nameText 改成隐藏 (alpha=0). JS ui.js:178-206 .scene-turtle 内
    // 只有 .st-hp-row (level+hp-bar) 头上, 没"HP 数字" + 没"龟名+稀有度"下方文字 (那是我自创).
    // 不删字段是因为大量代码调 view.hpText.setText() — 保留兼容. Phase 8 会引入 SceneTurtleDom
    // 时彻底替换.
    const hpText = this.add.text(x, y - 80, `${f.hp}/${f.maxHp}`, {
      fontSize: '13px', color: '#fff', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(5).setAlpha(0);  // 隐藏 (Phase 1)
    const nameText = this.add.text(x, y + 60, `${f.name} [${f.rarity}]`, {
      fontSize: '12px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(5).setAlpha(0);  // 隐藏 (Phase 1)

    // Phase 1 cleanup: 删自创静态龟 idle bob.
    // JS buildPetImgHTML 静态龟用 <img>, 完全静止. spritesheet 龟用 CSS keyframe 横扫帧, 没 y 浮.
    // (没 hasIdleAnim 判断 — 全 sprite 不再 bob)

    // 状态/状态指示器层 — U3: 启用可见 (旧 alpha-0 → bamboo充能/lava变身/币/无人机/结晶/
    //   命运花色/棱镜色 等全不显示)。每帧跟随 sprite (update 里 sync), turtle-hud 的 buff chip 关闭防双渲。
    const statusGroup = this.add.container(x, y - 92).setDepth(60);

    const view: FighterView = {
      fighter: f, sprite, shadow, shadowDirX: shDirX, hpBar, hpBarBg, hpBarHi, shieldBar, hpDelayBar, hpText, nameText, statusGroup,
      homeX: x, homeY: spriteY,    // P9b: home 跟 sprite 一致 (bottom-anchored 后的 center)
      homeScaleX: sprite.scaleX,
      homeScaleY: sprite.scaleY,
      homeRotation: sprite.rotation,
      _lastHp: f.hp,
      stats: { dmgDealt: 0, dmgTaken: 0, healDone: 0, crits: 0, kills: 0 },
    };
    // Phaser-native HUD (TurtleHud). 锚 sprite 中心 (= spriteY, NOT ground y), HP 条画在上方.
    //   每帧 update() 里 setCanvasPos(sprite.x, sprite.y) 让 HUD 跟随 hop/knockup 位移.
    view.sceneTurtleDom = new TurtleHud(this, {
      fighter: f, side: f.side, spriteX: x, spriteY: spriteY,   // sprite 中心 (bottom-anchored 后)
      isAlly: f.side === 'left',
    });
    this.refreshShieldBar(view);
    return view;
  }

  /** P18: HP visual update — 死的 Phaser-rect 路径全部删除, 只保留 DOM 同步.
   *  之前每次受击都对 alpha:0 的 hpBar/hpDelayBar 跑 tween + 改 fillColor + 改 width,
   *  完全是死代码 (display 是 SceneTurtleDom 接管). DOM 自己有 delay/flash/heal 动画 (P17).
   *  这里只更新 _lastHp 字段 + 触发 sceneTurtleDom.update().
   */
  private updateHpVisual(view: FighterView, _opts: { duration?: number } = {}) {
    view._lastHp = view.fighter.hp;
    view.sceneTurtleDom?.update();
  }

  /** 磐石之躯 体型: 岩层每层 +2% sprite (cap 30 → +60%)。把成长烤进 homeScaleX/Y
   *  (watchTick / fallback 动画 / refit 都以它为 home → 攻击/受击后仍归到放大尺寸)。
   *  影子非每帧重算, 故在此一并按各自 base 放大。仅层数变化时写一次, 不与动画 tween 抢帧。 */
  private syncRockBodyScale(): void {
    for (const v of this.views) {
      const f = v.fighter as Fighter & { _hasRockArmor?: boolean; _rockLayers?: number };
      if (!f._hasRockArmor) continue;
      const vx = v as FighterView & {
        _rockBaseSX?: number; _rockBaseSY?: number;
        _rockShadowSX?: number; _rockShadowSY?: number; _rockAppliedLayers?: number;
      };
      if (vx._rockBaseSX == null) {
        // 首帧 (层数=0) 捕获 base — homeScale 此时是 makeView 的 idle 适配值
        vx._rockBaseSX = v.homeScaleX; vx._rockBaseSY = v.homeScaleY;
        vx._rockShadowSX = v.shadow.scaleX; vx._rockShadowSY = v.shadow.scaleY;
      }
      const layers = Math.min(30, f._rockLayers ?? 0);
      if (vx._rockAppliedLayers === layers) continue;   // 只在变化时写一次
      vx._rockAppliedLayers = layers;
      const growth = 1 + 0.02 * layers;
      v.homeScaleX = vx._rockBaseSX! * growth;
      v.homeScaleY = vx._rockBaseSY! * growth;
      v.sprite.setScale(v.homeScaleX, v.homeScaleY);
      v.shadow.setScale(vx._rockShadowSX! * growth, vx._rockShadowSY! * growth);
    }
  }

  /** P18: 护盾视觉 — 死的 Phaser-rect 路径删除, 只保留 DOM 同步. */
  private refreshShieldBar(view: FighterView) {
    view.sceneTurtleDom?.update();
  }

  /** P135: 非行动实体判定 (JS engine.js:546 isCompanion + 中立怪 1:1)
   *  水晶球 / 糖果炸弹 / 海盗船 / 复活小虫 — 占 slot 但不进可选行动列表.
   *  通用兜底: skills 为空的 fighter 一律视为非行动 (避免空 skills 执行卡死). */
  private isNonActor(f: Fighter): boolean {
    const c = f as Fighter & {
      _isCrystalBall?: boolean; _isCandyBomb?: boolean; _isPirateShip?: boolean;
      _isConchWorm?: boolean; _isEventCreature?: boolean; _isMech?: boolean; _isSummon?: boolean;
    };
    // 召唤物均非玩家可控, 每回合末自动行动 (机甲/缩头随从 用户 2026-05-29; 对齐 JS COMPANION_FLAGS) → 非行动者
    if (c._isCrystalBall || c._isCandyBomb || c._isPirateShip || c._isConchWorm || c._isEventCreature || c._isMech || c._isSummon) return true;
    if (!Array.isArray(f.skills) || f.skills.length === 0) return true;
    return false;
  }

  // ─── 真回合制 ───
  // v0.9.5.A55: nextActor — JS turn.js:nextSideAction 对齐
  //   每"回合" = 双方各打一整套. 顺序: 左 alive 全打 → 右 alive 全打 → round++
  //   首回合左方 cap 2 (JS isFirstRound 规则, 给玩家预热感)
  /** 出手倒计时 — 30s, ≤10s 红, 0 → AI 自动出招 (与商店倒计时统一 30s) */
  private startTurnTimer(canAct: FighterView[]): void {
    this.clearTurnTimer();
    if (this.finished) return;
    this._turnTimerCanAct = canAct;
    this._turnTimerLeft = 30;   // 与商店倒计时统一 30s
    this.topRow.setTurnTimer(this._turnTimerLeft, 30);   // max=30 否则默认40 → 30/40 永远只到75%"没满"
    this._turnTimerEvent = this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        this._turnTimerLeft--;
        this.topRow.setTurnTimer(Math.max(0, this._turnTimerLeft), 30);
        if (this._turnTimerLeft <= 0) { this.clearTurnTimer(); this._autoActOnTimeout(); }
      },
    });
  }

  private clearTurnTimer(): void {
    if (this._turnTimerEvent) { this._turnTimerEvent.remove(); this._turnTimerEvent = undefined; }
    this.topRow?.setTurnTimer(null);
  }

  /** 超时: 收掉玩家 UI, 选一只仍可行动的玩家龟交给 AI 自动出招 (JS autoPickAction) */
  private _autoActOnTimeout(): void {
    if (this.finished) return;
    this.actionPanel.hide();
    this.turtlePicker.hide();
    this.clearTargeting();
    const actor = this._turnTimerCanAct.find(v => v.fighter.alive && !this.actedThisSide.has(v))
      ?? this._turnTimerCanAct.find(v => v.fighter.alive);
    if (!actor) { this.nextActor(); return; }
    this.actedThisSide.add(actor);
    this.battleLog.log(`⏰ ${actor.fighter.name} 超时！自动出招`);
    this.runEnemyAIImmediate(actor);
  }

  private nextActor() {
    if (this.finished) return;
    // 胜负判定排除 _untargetable (训龟大师) + _isNeutral (中立巨蟹/宝箱怪): 它们不属阵营,
    //   否则真龟全灭后仍因中立存活判该侧未败 → 卡死。
    const combatant = (v: FighterView) => v.fighter.alive
      && !(v.fighter as Fighter & { _untargetable?: boolean })._untargetable
      && !(v.fighter as Fighter & { _isNeutral?: boolean })._isNeutral;
    const leftAlive = this.views.filter(v => v.fighter.side === 'left' && combatant(v));
    const rightAlive = this.views.filter(v => v.fighter.side === 'right' && combatant(v));
    if (leftAlive.length === 0) return this.endBattle('lose');
    if (rightAlive.length === 0) return this.endBattle('win');

    // "该方回合开始"一次性被动: 给本侧所有相关龟各结算一次 (与出手/眩晕脱钩 — 用户要求)。
    //   activeSide+turn 唯一标识一个"侧回合", 故本侧回合内 nextActor 多次调用只结算一次。
    const swKey = `${this.activeSide}:${this.turn}`;
    if (this._sideRoundKey !== swKey) {
      this._sideRoundKey = swKey;
      for (const v of this.views) {
        if (v.fighter.side === this.activeSide && v.fighter.alive) this.applyRoundStartPassive(v);
      }
    }

    // P135 1:1 JS engine.js:674 getActableFighters — 排除 companion / 无技能实体
    //   水晶球 (skills:[]) / 糖果炸弹 / 海盗船 / 复活小虫 不进可选行动列表,
    //   否则被 showTurtlePicker 列为可选 → 点击执行空 skills → 卡死.
    //   (JS isCompanion 同款; PoC 召唤物 doll bear/hiding summon 有 skills 故保留可行动)
    const actableViews = this.views.filter(v =>
      v.fighter.side === this.activeSide && v.fighter.alive && !this.isNonActor(v.fighter));
    // C2: 中立生物(巨蟹/宝箱怪)在本侧 — 自动出手攻打对方阵营, 不占玩家行动名额、不进选龟框。
    //   先把未行动的中立逐个 AI 自动出招抽干, 再走真龟的正常行动预算。
    const neutralCanAct = actableViews.filter(v =>
      (v.fighter as Fighter & { _isNeutral?: boolean })._isNeutral && !this.actedThisSide.has(v));
    if (neutralCanAct.length > 0) {
      const nv = neutralCanAct[0];
      this.actedThisSide.add(nv);
      this.battleLog.log(`✦ 中立 ${nv.fighter.name} 出手`);
      this.runEnemyAIImmediate(nv);   // 自动选对方阵营目标攻击
      return;
    }
    // 真龟 (排除中立) — 用于玩家选龟/行动预算
    const sideViews = actableViews.filter(v => !(v.fighter as Fighter & { _isNeutral?: boolean })._isNeutral);
    const canAct = sideViews.filter(v => !this.actedThisSide.has(v));
    const totalAlive = sideViews.length;
    // I1: boss(恒单只) 一回合行动 **2 次** (JS _bossActionsThisRound<2, action.js:478)。
    //   旧 maxActions=min(2,totalAlive)=min(2,1)=1 → boss 只动 1 次 (输出腰斩)。含 dungeon stage5。
    const isBossSide = ((this.mode === 'boss' || this.mode === 'boss-pick')
        || (this.mode === 'dungeon' && this.dungeonStage >= 5)) && this.activeSide === 'right';
    if (isBossSide) {
      const bossView = sideViews.find(v => (v.fighter as Fighter & { _isBoss?: boolean })._isBoss) ?? sideViews[0];
      if (!bossView || this._bossActed >= 2) {
        const endedSide = this.activeSide;
        this.activeSide = this.activeSide === 'left' ? 'right' : 'left';
        this.actedThisSide = new Set();
        this._bossActed = 0;
        this.sidesActedThisRound++;
        this.processSideEnd(endedSide).then(() => { if (!this.finished) this.continueAfterSideEnd(); });
        return;
      }
      // boss 眩晕 → 整回合跳过 (恐惧 fear 不跳回合! 它只是 -20%伤害debuff, 见 damage.ts; 误把 fear 当 stun 会"当场结束")
      if (bossView.fighter.buffs.some(b => b.type === 'stun' && !bossView.fighter._stunUsed)) {
        bossView.fighter._stunUsed = true;
        bossView.fighter.buffs = bossView.fighter.buffs.filter(b => b.type !== 'stun');
        this.refreshStatusIcons(bossView);
        this._bossActed = 2;
        this.battleLog.log(`💫 ${bossView.fighter.name} 眩晕跳过`);
        this.time.delayedCall(600, () => this.nextActor());
        return;
      }
      this._bossActed++;
      this.startActorTurn(bossView);
      return;
    }
    const maxActions = (this.isFirstRound && this.activeSide === 'left')
      ? Math.min(2, totalAlive)
      : totalAlive;
    const alreadyActed = totalAlive - canAct.length;

    if (canAct.length === 0 || alreadyActed >= maxActions) {
      // E3/16: side-end 处理 (JS turn.js:829 processSideEnd)
      // DoT/HoT 在切边前 tick, "我打完 → 敌方烧" 时序对得上
      const endedSide = this.activeSide;
      // 切到对面
      this.activeSide = this.activeSide === 'left' ? 'right' : 'left';
      this.actedThisSide = new Set();
      this._bossActed = 0;
      this.sidesActedThisRound++;
      this._updateTurnTimeline();   // 切边 → 刷新 timeline 我方/敌方回合指示
      // 异步 await processSideEnd (DoT/HoT, 然后继续)
      this.processSideEnd(endedSide).then(() => {
        if (this.finished) return;
        this.continueAfterSideEnd();
      });
      return;
    }

    // P20: actor order = team-array order (JS getActableFighters 只 filter 不 sort, engine.js:674).
    // 之前 _slotKey.localeCompare sort 是 poc 自创. JS 按 leftTeam[] / rightTeam[] 原序行动.
    const sorted = canAct;

    // v0.9.5.A75: stun 跳过 (JS turn.js:1237). 恐惧 fear 不跳回合 — 它是 -20%伤害debuff(damage.ts), 照常出手;
    //   之前误把 fear 一起当 stun → 被恐惧者整回合禁手 + buff 当场清, -20%减伤几乎永不生效 (用户报"当场结束")。
    const stunned = canAct.filter(v =>
      v.fighter.buffs.some(b => b.type === 'stun' && !v.fighter._stunUsed)
    );
    if (stunned.length > 0) {
      for (const sv of stunned) {
        this.actedThisSide.add(sv);
        sv.fighter._stunUsed = true;
        sv.fighter.buffs = sv.fighter.buffs.filter(b => b.type !== 'stun');
        this.refreshStatusIcons(sv);
        const view = sv;
        const t = this.add.text(view.sprite.x, view.sprite.y - 50, '💫眩晕跳过', {
          fontSize: '18px', color: '#ffee00', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
          stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(50);
        this.tweens.add({ targets: t, y: view.sprite.y - 100, alpha: 0, duration: 700, onComplete: () => t.destroy() });
        this.battleLog.log(`💫 ${sv.fighter.name} 眩晕跳过`);
      }
      this.time.delayedCall(600, () => this.nextActor());
      return;
    }

    // v0.9.5.A60: 玩家方 + 多只可行动 → 让玩家选 (JS turn.js:1258 行为)
    // E3 修复: 加入 'test' (与 'boss-pick') — 之前漏了 test, 导致测试模式左侧由 AI 自动出招、
    //   玩家拿不到选龟框 ("测试模式不能换龟")。测试/打 Boss 都该玩家自己控左队。
    // F3: 自动对战机器人开启时, 左队也交给 AI (isPlayerTurn=false → 不弹选龟框)。
    const isPlayerTurn = !this._autoBattle && this.activeSide === 'left'
      && (this.mode === 'pve' || this.mode === 'dungeon' || this.mode === 'custom'
        || this.mode === 'boss' || this.mode === 'boss-pick' || this.mode === 'test');
    if (isPlayerTurn && canAct.length > 1) {
      this.startTurnTimer(canAct);   // 出手倒计时 (选龟+施法整段)
      this.showTurtlePicker(canAct);
      return;
    }
    const next = sorted[0];
    this.actedThisSide.add(next);
    if (isPlayerTurn) this.startTurnTimer([next]);   // 单只玩家龟也计时
    this.startActorTurn(next);
  }

  /** v0.9.5.A62: turtle picker — 下方按钮条 (JS ui-action.js:1 showTurtlePicker 同款)
   *  E3/43: 删头上 ▼ 黄三角 — JS 没此自创. JS 只显底部 picker bar 让玩家选哪只行动.
   */
  private showTurtlePicker(canAct: FighterView[]) {
    // A2 "该你了": 可行动龟脚下套绿色呼吸光环, 让玩家一眼看到哪些龟能出手
    const rings = canAct.map(v => {
      const groundY = v.sprite.y + (v.sprite.displayHeight ?? 80) / 2 - 6;
      const ring = this.add.ellipse(v.sprite.x, groundY, 74, 28)
        .setStrokeStyle(3, 0x06d6a0, 0.9).setDepth(1);
      this.tweens.add({
        targets: ring, scaleX: 1.16, scaleY: 1.16, alpha: 0.45,
        duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      return ring;
    });
    const clearRings = () => rings.forEach(r => { this.tweens.killTweensOf(r); r.destroy(); });
    // 下方按钮条
    const fighters = canAct.map(v => v.fighter);
    this.turtlePicker.show(fighters, (pickedF) => {
      clearRings();
      const picked = canAct.find(v => v.fighter === pickedF);
      if (!picked) return;
      this.actedThisSide.add(picked);
      this.startActorTurn(picked);
    });
  }

  private startActorTurn(actor: FighterView) {
    // P20: 移除 per-actor CD 递减 — JS 是 per-round 一次 (turn.js:43-45), 不是 per-actor.
    // 之前每个 actor 起手都减一次 → 一回合 N 只龟减 N 次, CD 加速 N 倍, 错!
    // 现 CD 递减移到 nextActor() 检测 round 切换时调用.

    // v0.9.1: 每回合开始刷一遍护盾叠层 (兜底 mid-turn shield 变化)
    for (const v of this.views) this.refreshShieldBar(v);

    // A1 修复: round-start 事件/中立/规则 pipeline 已移到 roundBanner 之后立即跑
    //   (见 runRoundStartPipeline) — 不再等到第一个 actor 起手才触发, 避免"底下选龟框先弹
    //   出来、过一会才跳事件"的时序错乱。这里只兜底: 若因某路径未跑则补跑一次。
    if (this.turn > this.lastRoundStartTurn) {
      void this.runRoundStartPipeline();
    }

    // 装备 onTurnBegin
    fireOnTurnBegin(actor.fighter);

    // v0.9.5.A88: P2 复杂装备效果 (龙蛋喷火 / 迷你水晶引爆 / 海螺小虫攻击 / 生命珍珠火球)
    this.processComplexEquipEffects(actor);

    // P1.6 lava 怒气累积 + 变身倒计时
    this.processLavaRage(actor);

    // P19 无头龟锁血倒计时 (1:1 JS turn.js:224-232) — 之前缺这段: _undeadLockTurns 设了 2 却永不递减,
    //   导致锁血永久 → damage.ts 钳 HP≥1 → 无头龟打不死。现每到它自己回合 -1, 归零恢复 1HP 可被正常击杀。
    {
      // 每【回合】-1 (非每【行动】): boss 一回合行动 2 次, 若按行动减则 2回合锁血当场就空 (用户报"boss当场被动结束")。
      //   用 this.turn 做回合闸: 同一回合内 boss 第二次行动不再减。
      const uf = actor.fighter as Fighter & { _undeadLockTurns?: number; _undeadLockTickRound?: number };
      if ((uf._undeadLockTurns ?? 0) > 0 && uf._undeadLockTickRound !== this.turn) {
        uf._undeadLockTickRound = this.turn;
        uf._undeadLockTurns = (uf._undeadLockTurns as number) - 1;
        if ((uf._undeadLockTurns as number) <= 0) {
          uf.hp = 1;
          this.battleLog.log(`💀 ${uf.name} 亡灵之力消散，恢复正常`);
          // 用户: 去掉"锁血结束"浮字
        }
      }
    }

    // P2.9 其他 per-turn passive hook
    this.processTurnBeginPassives(actor);

    // E3/16: DoT tick 从这里移走 (JS 是 side-end opposing team, 不是 actor turn-start)
    // 现在在 processSideEnd 调用. 这里只检查 alive 状态.
    const f = actor.fighter;
    if (!f.alive) { this.killView(actor); this.endTurn(); return; }

    // G10: 龟壳气场盾每回合衰减一次 (JS action.js:648-659) — 1st 减半, 2nd 清零;
    //   guard: 获得回合后 + 本回合未衰减过 (旧 PoC 只被伤害削, 永不主动衰减 → 过肉)
    const af = f as Fighter & { _auraShield?: number; _auraShieldGainTurn?: number; _auraShieldLastDecayTurn?: number; _auraShieldDecayCount?: number };
    if ((af._auraShield ?? 0) > 0 && f.passive?.type === 'auraAwaken'
        && (af._auraShieldGainTurn ?? 0) > 0 && this.turn > (af._auraShieldGainTurn ?? 0)
        && (af._auraShieldLastDecayTurn ?? 0) < this.turn) {
      af._auraShieldDecayCount = (af._auraShieldDecayCount ?? 0) + 1;
      af._auraShieldLastDecayTurn = this.turn;
      af._auraShield = af._auraShieldDecayCount === 1 ? Math.round((af._auraShield ?? 0) / 2) : 0;
    }

    // 检查眩晕
    const stunIdx = f.buffs.findIndex(b => b.type === 'stun' && b.duration > 0);
    if (stunIdx >= 0) {
      f.buffs[stunIdx].duration--;
      this.add.text(actor.sprite.x, actor.sprite.y - 50, '💫眩晕', {
        fontSize: '14px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
      }).setOrigin(0.5).setDepth(50);
      this.time.delayedCall(900, () => this.endTurn());
      return;
    }
    // G1: buff duration 已在 processTurnBeginPassives→tickBuffsDuration(:4279) 减过一次。
    //   旧此处再减一次 → 每回合双减, buff 寿命减半。删除 (JS 每回合只减一次)。
    // 刷新状态图标
    this.refreshStatusIcons(actor);

    // 战斗日志
    this.battleLog.log(`▶ ${f.name} 行动`);
    // E3/16: DoT log 移到 processSideEnd 内

    // 高亮当前 actor
    this.highlightActor(actor);

    if (actor.fighter.side === 'left' && !this._autoBattle) {
      // 玩家回合
      // U1: 同侧还有其它未行动的活龟 → 显示「← 换龟」可回 picker 重选 (JS ui-action.js:31-36)
      const otherCanAct = this.views.some(v =>
        v !== actor && v.fighter.side === 'left' && v.fighter.alive && !this.actedThisSide.has(v));
      this.actionPanel.show(actor.fighter, (skillIdx) => this.onPlayerSkillPicked(actor, skillIdx),
        { canBack: otherCanAct, onBack: () => this.backToPicker(actor) });
    } else {
      // 敌方 AI (或 F3 自动对战下的我方 AI)
      this.time.delayedCall(this._autoBattle && this._autoBattleFast ? 120 : 500, () => this.runEnemyAI(actor));
    }
  }

  /** F3: 自动对战机器人 — 开启后双方都走 AI 自动出招, 用于回归/平衡/不崩验证 (可加速)。
   *  通过 window.__autoBattle(on, fast) 或调试覆盖层触发; 开启时若正等玩家操作则收掉 UI 接管。 */
  setAutoBattle(on: boolean, fast = false): void {
    this._autoBattle = on;
    this._autoBattleFast = fast;
    if (on && !this.finished) {
      // 正等玩家操作 → 收掉面板/选龟框/计时, 让 AI 接管后续 actor
      this.actionPanel?.hide();
      this.turtlePicker?.hide();
      this.clearTargeting();
      this.clearTurnTimer();
      // 若当前没有正在播放的 AI 动作, 踢一下 nextActor 让自动流转起来
      this.time.delayedCall(60, () => { if (this._autoBattle && !this.finished) this.nextActor(); });
    }
  }

  /** U1: 「← 换龟」— 取消当前龟的行动标记, 清目标态, 回 picker 重选 (JS turn.js:1406 backToPicker) */
  private backToPicker(actor: FighterView) {
    this.actedThisSide.delete(actor);
    this.clearTargeting();
    this.actionPanel.hide();
    this.nextActor();
  }

  private highlightActor(actor: FighterView) {
    // P19: 删 idle Y-bob (JS 无). 仅清理非 actor sprite 残留 tween + 回 homeY.
    for (const v of this.views) {
      if (v !== actor && v.fighter.alive) {
        this.tweens.killTweensOf(v.sprite);
        v.sprite.y = v.homeY;
      }
    }
    // C1: 当前行动者高亮 — 脚下阵营色光环扩散一下, 让"现在谁在动"清晰 (我方绿/敌方红)
    const col = actor.fighter.side === 'left' ? 0x06d6a0 : 0xff6b6b;
    const groundY = actor.sprite.y + (actor.sprite.displayHeight ?? 80) / 2 - 6;
    const ring = this.add.ellipse(actor.sprite.x, groundY, 76, 28)
      .setStrokeStyle(3, col, 0.95).setDepth(1).setScale(0.55).setAlpha(0.95);
    this.tweens.add({
      targets: ring, scaleX: 1.3, scaleY: 1.3, alpha: 0,
      duration: 560, ease: 'cubic.out', onComplete: () => ring.destroy(),
    });
  }

  /** A1: 侧开始横幅 — 🐢我方回合(绿,左滑入) / 👹敌方回合(红,右滑入), 让回合交接清晰 */
  private showSideTurnBanner(side: 'left' | 'right'): void {
    const { width, height } = this.scale.gameSize;
    const ally = side === 'left';
    const col = ally ? 0x06d6a0 : 0xff6b6b;
    const y = height * 0.30;
    const c = this.add.container(ally ? -220 : width + 220, y).setDepth(190);
    const label = this.add.text(0, 0, ally ? '🐢 我方回合' : '👹 敌方回合', {
      fontSize: '30px', color: '#fff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    const bg = this.add.rectangle(0, 0, label.width + 40, label.height + 20, 0x0a0e18, 0.82)
      .setStrokeStyle(3, col, 1).setOrigin(0.5);
    c.add([bg, label]);
    const toX = ally ? width * 0.30 : width * 0.70;
    this.tweens.add({
      targets: c, x: toX, duration: 280, ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({
        targets: c, x: ally ? -260 : width + 260, alpha: 0, delay: 500, duration: 240,
        ease: 'Cubic.easeIn', onComplete: () => c.destroy(),
      }),
    });
  }

  /** A1: 侧回合开始 = 先弹侧横幅, 稍候再进入该侧第一个行动者 (替代直接 nextActor) */
  private beginSideTurn(): void {
    if (this.finished) return;
    this.showSideTurnBanner(this.activeSide);
    this.time.delayedCall(640, () => this.nextActor());
  }

  // ─── 玩家行动 (P16: JS action.js:186-232 pickSkill 1:1 port) ───
  // 之前 poc 只看 `aoe`/`aoeAlly`/`isAlly` data flag, 漏了 JS 三个硬编码白名单
  // (14 selfCast + 10 AoE auto + 7 ally), 导致 cyberDeploy 等 14 个技能错误进入选目标流程.
  // 现在 1:1 复制 JS pickSkill 逻辑.
  private onPlayerSkillPicked(actor: FighterView, skillIdx: number) {
    const skill = actor.fighter.skills[skillIdx];
    if (!skill) return;
    // 用户: 点了技能(承诺出手)立即停倒计时 — 否则计时器到点又触发 _autoActOnTimeout 再出一招 → 双重行动卡死。
    //   (选目标阶段不再有时间压力, 符合"释放技能计时器就消失")
    this.clearTurnTimer();
    if (this.tutorial) this.tutorialGuide?.notify('skill-cast');
    const t = skill.type;
    const sk = skill as Record<string, unknown>;

    // JS action.js:193 isAlly 判定: 类型白名单 + skill.isAlly flag
    const ALLY_SKILL_TYPES = new Set([
      'heal', 'shield', 'bubbleShield', 'angelBless', 'bubbleHeal',
      'crystalResHeal', 'phoenixPurify',
    ]);
    const isAlly = ALLY_SKILL_TYPES.has(t) || !!sk.isAlly;

    // JS action.js:197 Self-cast: no target selection (14 hardcoded types + selfCast flag + twoHeadSwitch→melee)
    const SELF_CAST_TYPES = new Set([
      'fortuneDice', 'fortuneBuyEquip', 'phoenixShield', 'hidingDefend',
      'hidingCommand', 'cyberDeploy', 'diamondFortify', 'diceFate',
      'chestCount', 'bambooHeal', 'volcanoArmor', 'crystalBarrier', 'shellCopy',
    ]);
    const isTwoHeadMelee = (t === 'twoHeadSwitch' && (sk.switchTo as string) === 'melee');
    if (sk.selfCast || SELF_CAST_TYPES.has(t) || isTwoHeadMelee) {
      this.actionPanel.hide();
      // P17: announce + 600ms wait + cast (JS action.js:511-512)
      this.castWithAnnounce(actor, actor, skillIdx);
      return;
    }

    // JS action.js:203 mechAttack / wormBite: auto-target lowest HP enemy
    if (t === 'mechAttack' || t === 'wormBite') {
      this.actionPanel.hide();
      const enemies = this.views.filter(v => v.fighter.side !== actor.fighter.side && v.fighter.alive);
      const tgt = enemies.sort((a, b) => a.fighter.hp - b.fighter.hp)[0];
      if (tgt) this.executeAttack(actor, tgt, skillIdx);
      else this.endTurn();
      return;
    }

    // JS action.js:209 AoE / auto-target: no target selection needed
    const AOE_AUTO_TYPES = new Set([
      'hunterBarrage', 'ninjaBomb', 'lightningBarrage', 'iceFrost',
      'basicBarrage', 'starMeteor', 'starGravityWarp', 'diceAllIn',
      'angelSmite', 'diceFlashStrike',
    ]);
    if (sk.aoe || sk.aoeAlly || AOE_AUTO_TYPES.has(t)) {
      this.actionPanel.hide();
      // P17: announce + 600ms wait + cast (JS action.js:511-512)
      this.castWithAnnounce(actor, null, skillIdx);
      return;
    }

    // U2: 选目标可取消回技能列表 (JS action.js:417 cancelTarget)
    const onCancelTarget = () => {
      this.clearTargeting();
      this.actionPanel.exitTargeting();
    };
    // JS action.js:215+ Ally target select (绿圈) — 多个友军时弹选目标 picker
    if (isAlly) {
      this.actionPanel.enterTargeting(skill, onCancelTarget);
      this.enterTargetingMode(actor, skillIdx, 'ally');
      return;
    }

    // JS action.js:215+ 单体敌方 — 弹选目标 picker (红圈)
    this.actionPanel.enterTargeting(skill, onCancelTarget);
    this.enterTargetingMode(actor, skillIdx, 'enemy');
  }

  private targetOverlays: Phaser.GameObjects.Rectangle[] = [];
  private enterTargetingMode(actor: FighterView, skillIdx: number, kind: 'enemy' | 'ally') {
    // E3/39 (CRITICAL FIX): 玩家选目标也必须前排优先 — JS action.js:221-228 1:1
    //   1. taunt buff: 有嘲讽 → 强制选 taunt 目标
    //   2. !skill.ignoreRow: 前排存活 → 只能选前排 (后排守门)
    //   3. 装备类目标过滤 (排除召唤物 / 海盗船 / 假人 / 机甲) — fortuneBuyEquip 特殊
    const skill = actor.fighter.skills[skillIdx];
    let candidates = this.views.filter(v => {
      const ff = v.fighter as Fighter & { _isInBlackhole?: boolean; _isSummon?: boolean };
      if (!ff.alive) return false;
      if (ff._isInBlackhole) return false;   // 黑洞中: 视为不在场, 不可被选中 (星际黑洞)
      if (kind === 'enemy') {
        if (ff.side === actor.fighter.side) return false;
        // 缩头随从躲在主人身后: 敌方单体技能无法选中 (AOE 仍命中, 见 getEnemies)
        if (ff._isSummon) return false;
        return true;
      }
      return ff.side === actor.fighter.side;   // 友方: 召唤物可被治疗/增益, 仅排黑洞
    });
    // 装备类 fortuneBuyEquip 不能选 _isSummon/_isPirateShip/_isDummy/_isMech
    if (skill && (skill as { type?: string }).type === 'fortuneBuyEquip') {
      candidates = candidates.filter(c => {
        const f = c.fighter as Fighter & { _isSummon?: boolean; _isPirateShip?: boolean; _isMech?: boolean; _isDummy?: boolean };
        return !f._isSummon && !f._isPirateShip && !f._isMech && !f._isDummy;
      });
    }
    // 敌方目标 + 不是 ally skill: 应用 taunt + front-row 优先 (JS:221-228)
    const ignoreRow = !!(skill as Record<string, unknown> | undefined)?.ignoreRow;
    if (kind === 'enemy' && !ignoreRow) {
      const taunters = candidates.filter(c => c.fighter.buffs.some(b => b.type === 'taunt'));
      if (taunters.length > 0) {
        candidates = taunters;
      } else {
        // 前排优先 — 前排存活则只能选前排, 全死才能后排
        const frontTargets = candidates.filter(c => c.fighter._position === 'front');
        if (frontTargets.length > 0) candidates = frontTargets;
      }
    }
    // E3/44 (JS action.js:230 1:1): 只 1 个候选 → 自动出手, 不让玩家选
    if (candidates.length === 1) {
      this.clearTargeting();
      this.actionPanel.hide();
      this.executeAttack(actor, candidates[0], skillIdx);
      return;
    }
    // E3/44 (JS action.js:234-275 showTargetSelect 1:1): 多候选 → 红/绿发光高亮 + 鼠标 crosshair
    // JS scene.css:77-80: .targetable 红 drop-shadow rgba(255,60,60) + pulse + scale 1.05
    //                      .targetable-ally 绿 drop-shadow rgba(6,214,160) + pulse + scale 1.05
    const glowColor = kind === 'ally' ? 0x06d6a0 : 0xff3c3c;  // 友绿 / 敌红
    for (const c of candidates) {
      // 矩形 ring 替代 CSS drop-shadow (Phaser graphics 实现发光)
      const ring = this.add.rectangle(c.sprite.x, c.sprite.y, 150, 150)
        .setStrokeStyle(4, glowColor, 0.95).setDepth(60)
        .setInteractive({ useHandCursor: true });
      // JS targetPulse 0.8s 闪烁 (alpha + scale 1.05 → 1.15 hover)
      this.tweens.add({ targets: ring, alpha: 0.4, duration: 400, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: c.sprite, scaleX: c.sprite.scaleX * 1.05, scaleY: c.sprite.scaleY * 1.05,
        duration: 400, yoyo: true, repeat: -1 });
      // 鼠标 hover 加亮
      ring.on('pointerover', () => ring.setStrokeStyle(5, glowColor, 1));
      ring.on('pointerout', () => ring.setStrokeStyle(4, glowColor, 0.95));
      ring.on('pointerdown', () => {
        this.clearTargeting();
        this.actionPanel.hide();
        this.executeAttack(actor, c, skillIdx);
      });
      this.targetOverlays.push(ring);
      // 记录该 sprite 的 pulse tween, clearTargeting 时清
      (ring as Phaser.GameObjects.Rectangle & { _spritePulse?: Phaser.GameObjects.Sprite }) ._spritePulse = c.sprite as unknown as Phaser.GameObjects.Sprite;
    }
  }

  private clearTargeting() {
    for (const r of this.targetOverlays) {
      // E3/44: 清 sprite pulse tween (恢复 scale)
      const pulseSprite = (r as Phaser.GameObjects.Rectangle & { _spritePulse?: Phaser.GameObjects.Sprite })._spritePulse;
      if (pulseSprite) {
        this.tweens.killTweensOf(pulseSprite);
        // restore scale to original (1)
        pulseSprite.setScale(1);
      }
      this.tweens.killTweensOf(r);
      r.destroy();
    }
    this.targetOverlays = [];
  }

  // ─── 敌方 AI (v0.9.5.A52 — JS ai.js 完整移植) ───
  // normal/hard 难度: heal 优先 (低 HP 队友) > shield 优先 (无盾队友) > ult 偏好 (高 CD) > random
  // 目标选择: AoE 不需要; 单体打 alive 最低 HP, 但优先打前排 (visibleEnemyTargets)
  private runEnemyAI(actor: FighterView) {
    if (actor.fighter._isDummy) {
      this.battleLog.log(`▶ ${actor.fighter.name} (木桩) 跳过回合`);
      this.time.delayedCall(300, () => this.endTurn());
      return;
    }
    // v0.9.5.A60: JS ai.js:1295 — AI 1.2s 延迟思考, 避免瞬间出手
    this.time.delayedCall(1200, () => this.runEnemyAIImmediate(actor));
  }

  private runEnemyAIImmediate(actor: FighterView) {
    const f = actor.fighter;
    const usable = f.skills
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => (s.cdLeft || 0) === 0);
    if (!usable.length) { this.endTurn(); return; }
    const enemies = this.views.filter(v => v.fighter.side !== f.side && v.fighter.alive);
    const allies  = this.views.filter(v => v.fighter.side === f.side && v.fighter.alive);
    if (!enemies.length) { this.endTurn(); return; }

    // 难度阈值 (normal 默认)
    const difficulty: 'easy' | 'normal' | 'hard' = 'normal';
    const hpThresh = (difficulty as string) === 'hard' ? 0.35 : 0.4;

    // P20: AI heal/shield 类型表收窄 — JS ai.js:24-29 只检 'heal'/'shield' 类型, 不含 bamboo/bubble/common 变种
    // 1) heal: 队友 HP < hpThresh (JS ai.js:24-26 1:1)
    const healIdx = usable.find(({ s }) => s.type === 'heal');
    if (healIdx && allies.some(a => a.fighter.hp / a.fighter.maxHp < hpThresh)) {
      this.executeAttack(actor, allies.sort((a, b) => a.fighter.hp/a.fighter.maxHp - b.fighter.hp/b.fighter.maxHp)[0], healIdx.i);
      return;
    }
    // 2) shield: 队友 shield 不足 (JS ai.js:28-29 1:1)
    const shieldIdx = usable.find(({ s }) => s.type === 'shield');
    if (shieldIdx && allies.some(a => (a.fighter.shield || 0) < 30)) {
      this.executeAttack(actor, allies[0], shieldIdx.i);
      return;
    }
    // 3) 输出: 偏好高 CD (ult), 65% 选 ult / 35% 随机
    const dmgSkills = usable.filter(({ s }) =>
      s.type !== 'heal' && s.type !== 'shield');
    if (!dmgSkills.length) {
      // 没输出技能, 用第一个
      const pick = usable[0];
      this.executeAttack(actor, enemies[0], pick.i);
      return;
    }
    const byCd = [...dmgSkills].sort((a, b) => (b.s.cd || 0) - (a.s.cd || 0));
    const topCd = byCd[0].s.cd || 0;
    const ultGroup = byCd.filter(x => (x.s.cd || 0) === topCd);
    const pickBest = () => ultGroup[Math.floor(Math.random() * ultGroup.length)];
    const pickRandom = () => dmgSkills[Math.floor(Math.random() * dmgSkills.length)];
    let pick = Math.random() < 0.65 ? pickBest() : pickRandom();

    // v0.9.5.A58: pet-specific AI 覆盖 (JS ai.js:56-180 移植)
    // starEnergy: 只在能量满时才用 starMeteor
    if (f.passive?.type === 'starEnergy') {
      const meteorIdx = usable.find(u => u.s.type === 'starMeteor');
      if (meteorIdx) {
        const maxE = Math.round(f.maxHp * ((f.passive.maxChargePct as number) ?? 30) / 100);
        const cur = (f._starEnergy as number) ?? 0;
        if (cur < maxE) {
          const others = usable.filter(u => u.s.type !== 'starMeteor');
          if (others.length) pick = others.sort((a, b) => (b.s.cd || 0) - (a.s.cd || 0))[0];
        } else {
          pick = meteorIdx;
        }
      }
    }
    // bubbleBurst: 需要 bubbleStore > 0
    if (pick.s.type === 'bubbleBurst' && ((f.bubbleStore as number) ?? 0) <= 0) {
      const others = usable.filter(u => u.s.type !== 'bubbleBurst');
      if (others.length) pick = others[0];
    }
    // E2/5 (ai.js:171-174): hidingCommand/hidingBuffSummon — 召唤物没活时不可用
    if ((pick.s.type === 'hidingCommand' || pick.s.type === 'hidingBuffSummon')) {
      const summon = (f as Fighter & { _summon?: Fighter })._summon;
      if (!summon || !summon.alive) {
        const others = usable.filter(u => u.s.type !== 'hidingCommand' && u.s.type !== 'hidingBuffSummon');
        if (others.length) pick = others[0];
      }
    }
    // E2/5 (ai.js:175-183): phoenixPurify — 队友无可净化 debuff 时不用
    if (pick.s.type === 'phoenixPurify') {
      const debuffTypes = ['atkDown','defDown','mrDown','healReduce','poison','bleed','burn','cursed','chilled','spdDown'];
      const hasDebuff = allies.some(a => a.fighter.alive && a.fighter.buffs.some(b => debuffTypes.includes(b.type)));
      if (!hasDebuff) {
        const others = usable.filter(u => u.s.type !== 'phoenixPurify');
        if (others.length) pick = others[0];
      }
    }
    // E2/5 (ai.js:158-167): starGravityWarp 仅在能量满时用 (otherwise swap 没意义)
    if (pick.s.type === 'starGravityWarp') {
      let energyFull = false;
      if (f.passive?.type === 'starEnergy') {
        const maxE = Math.round(f.maxHp * ((f.passive.maxChargePct as number) ?? 30) / 100);
        energyFull = ((f._starEnergy as number) ?? 0) >= maxE;
      }
      if (!energyFull) {
        const others = usable.filter(u => u.s.type !== 'starGravityWarp');
        if (others.length) pick = others[0];
      }
    }
    // fortuneGold: 简化 3 阶段 — coins 不够堆币, HP < 30% 危急梭哈, 否则正常输出
    if (f.passive?.type === 'fortuneGold') {
      const coins = (f._goldCoins as number) ?? 0;
      const hpPct = f.hp / Math.max(1, f.maxHp);
      const sAllIn = usable.find(u => u.s.type === 'fortuneAllIn');
      const sGainC = usable.find(u => u.s.type === 'fortuneGainCoins');
      const sStrike = usable.find(u => u.s.type === 'fortuneStrike');
      const sDice = usable.find(u => u.s.type === 'fortuneDice');
      if (sAllIn && (coins >= 35 || (hpPct < 0.25 && coins >= 12))) pick = sAllIn;
      else if (hpPct < 0.55 && sDice) pick = sDice;
      else if (coins < 18 && sGainC) pick = sGainC;
      else if (sStrike) pick = sStrike;
    }

    // E3/42 CRITICAL FIX: 删 AI 路径 SIGNATURE_SKILL 覆盖 — 让 AI 也走 runSkillHandler 真 skill data

    // v0.9.5.A75: 目标选择 (JS action.js:220-228 + 加 taunt 强制)
    // 1) taunt: 任何敌方带 taunt buff → 强制只能选嘲讽者
    // 2) stealth: 不能被选
    // 3) ignoreRow 技能 (ninjaBackstab): 跳过前排守门
    // 4) 默认: 前排优先, 同排最低 HP
    const ignoreRow = (pick.s as Record<string, unknown>).ignoreRow as boolean | undefined;
    let target: FighterView | undefined;
    let pool = enemies.filter(e => {
      const ff = e.fighter as Fighter & { _isInBlackhole?: boolean; _isSummon?: boolean };
      if (ff._isInBlackhole) return false;   // 黑洞中: 不可被单体选中
      if (ff._isSummon) return false;        // 缩头随从躲在身后: 单体技能无法选中
      return !ff.buffs.some(b => b.type === 'stealth');
    });
    // 全员潜行/仅剩随从 → 破例 (但黑洞仍排除, 视为不在场)
    if (pool.length === 0) pool = enemies.filter(e => !(e.fighter as Fighter & { _isInBlackhole?: boolean })._isInBlackhole);
    const taunters = pool.filter(e => e.fighter.buffs.some(b => b.type === 'taunt'));
    if (taunters.length > 0) {
      pool = taunters;
    } else if (!ignoreRow) {
      const frontAlive = pool.filter(e => e.fighter._slotKey?.startsWith('front-'));
      if (frontAlive.length > 0) pool = frontAlive;
    }
    // P20: 目标选择 = 简单最低 HP (JS action.js:204 1:1)
    //   `targets.sort((a,b) => a.hp - b.hp)[0]` — 不加权, 不 random 80/20.
    //   之前 poc weighted random (70/30, <20% 90%) + undead-lock filter 都是自创.
    if (pool.length > 0) {
      target = pool.slice().sort((a, b) => a.fighter.hp - b.fighter.hp)[0];
    }
    if (!target) return this.endTurn();
    this.executeAttack(actor, target, pick.i);
  }

  // ─── 技能执行 ───
  // E3/43: 删 executeAutoSkill — Phase B 演示函数, E3/42 移除调用方后无引用

  /** 构建 SkillHandler 用的 BattleApi (浮字 + 视图查找 + HP 同步) */
  private buildBattleApi(): BattleApi {
    return {
      scene: this,
      allFighters: this.views.map(v => v.fighter),
      floatNum: (target, text, color, explicitCls, delayMs, yOffset) => {
        // E3/8: 路由到 spawnFloatingText (JS engine.js:757 pop+hold+arc 节奏)
        // E3/24: 优先用 explicitCls (跟 JS spawnFloatingNum 第 3 参数 1:1)
        const v = this.views.find(x => x.fighter === target);
        if (!v) return;
        this.updateHpVisual(v, { duration: 200 });
        this.refreshShieldBar(v);
        this.refreshStatusIcons(v);
        // E3/24: explicitCls 优先 (skill handler 直接传 FloatCls, 跟 JS 1:1)
        let cls: FloatCls;
        if (explicitCls) {
          cls = explicitCls as FloatCls;
        } else {
          // 没 explicitCls: 按 color hex + 💥 emoji 推断 (旧 caller 兼容)
          const isCrit = text.startsWith('💥');
          if (color === '#4cc9f0' || color === '#4dabf7') cls = isCrit ? 'crit-magic' : 'magic-dmg';
          else if (color === '#ffffff') cls = isCrit ? 'crit-true' : 'true-dmg';
          else if (color === '#ffd93d' && isCrit) cls = 'crit-dmg';
          else if (color === '#06d6a0' || color === '#4ade80') cls = 'heal-num';
          else if (color === '#7dffb3') cls = 'passive-num';
          else if (color === '#c0c0c0' || color === '#fff') cls = 'shield-num';
          else if (color === '#ff9f43') cls = 'debuff-label';
          else if (color === '#a0e8ff') cls = 'dodge-num';
          else if (color === '#ff6600' || color === '#ff8c42') cls = 'dot-dmg';
          // 兜底: 只有"数字"飘字才归命中类(会触发受击动画+红闪+击退); 状态/标签类(非数字, 如
          //   蓄气中/换形/抽卡/金币不足…)→ passive-num, 否则未识别颜色的施法者状态字会误触发"自身受击"
          //   (用户报"放龟派气波小龟自己受伤"的根因; 影响多技能, 非仅小龟)。
          //   注: 不能把 💥 写进正则(surrogate pair 会让纯数字失配) → 先剥 💥 再判数字。
          else {
            const body = isCrit ? text.slice(2) : text;
            cls = /^-?\d/.test(body) ? (isCrit ? 'crit-dmg' : 'direct-dmg') : 'passive-num';
          }
        }
        // 受击 sprite 反馈 (横向震 + 红 tint) — P178: 只对"直接命中"伤害类抖, 不对反伤/DOT/治疗/护盾.
        //   用户报"反伤不应触发受伤动画": 反伤走 floatNum(attacker, 数字, '#ff8c42'=dot-dmg), 旧逻辑
        //   "只要是数字就抖" → 误让攻击者受击抖. 改成只 HIT_CLASSES (直接命中) 才抖 (DOT 同理不抖).
        const HIT_CLASSES = new Set<FloatCls>(['direct-dmg', 'crit-dmg', 'magic-dmg', 'crit-magic', 'true-dmg', 'crit-true']);
        // 闪避: dealPhysical/dealMagic 返回 0, 各 handler 仍会飘 "0" — 伤害数最小为 1, 故 "0" 必为闪避。
        //   集中拦截: 伤害类飘字若为 "0" 不显示 (Miss 已由 rollDodge 飘出, 对齐用户要求)。
        const DMG_CLASSES = new Set<FloatCls>(['direct-dmg', 'crit-dmg', 'magic-dmg', 'crit-magic', 'true-dmg', 'crit-true', 'dot-dmg']);
        if (text === '0' && DMG_CLASSES.has(cls)) return;
        if (HIT_CLASSES.has(cls)) {
          const isCritHit = cls.startsWith('crit-');
          v.sprite.setTint(isCritHit ? 0xffffff : 0xffaaaa);   // 阶段3: 暴击白闪更亮
          this.time.delayedCall(isCritHit ? 110 : 150, () => v.sprite.clearTint());
          // JS: 受击帧动画挂在中央掉血点 → 所有伤害源都播。技能伤害走 floatNum 这条路,
          //   此前漏了受击帧 (只有 showDamageVfx 普攻/魔法两条路触发) → 忍者受技能伤害看不到受击动画。
          // 自定义击飞/抛投动画进行中 (_inHop=true): 跳过通用受击帧 + 击退, 否则两者与自定义动画
          //   抢同一 sprite 的帧/位移 → 受击动画异常 + 位移卡顿 (用户报龟派气波对面受击异常卡顿)。
          //   数字飘字 + 白闪 tint + 震屏仍保留。
          if (!v._inHop) {
            this.playHurtFrames(v);
            // J3: 删自创 ±8px 来回 wobble, 统一走 JS sceneKnockback (单向 18px 击退)。
            //   deal*(dealPhysical/Magic/Raw) 已对绝大多数技能伤害先调过 hitKnockback, 此处被
            //   _knockUntil(350ms) 去重不双击; 而绕过 deal* 的直伤(applyRawDamage)也能拿到正确单向击退。
            this.playHitKnockback(v, v.fighter.side === 'left' ? 'right' : 'left');
          }
          // 阶段3 juice: 暴击 → hit-stop 微停 + 强震; 大伤害(>12% maxHp) → 轻震; 小伤害不震(免晕)
          const _amt = parseInt((text.match(/\d+/) ?? ['0'])[0], 10) || 0;
          const _pct = v.fighter.maxHp > 0 ? _amt / v.fighter.maxHp : 0;
          if (isCritHit) { this.juiceHitStop(70); this.cameras.main.shake(150, 0.009); }
          else if (_pct > 0.12) { this.cameras.main.shake(110, 0.005); }
        }
        // 数值提取 + atkSide (远离 attacker 飞)
        let amount = 0;
        const m = text.match(/\d+/);
        if (m) amount = parseInt(m[0]);
        // P20: y 锚到 sprite 中心 (= JS .st-body 中心 = 数字 pop 原点).
        // 之前 -40 是 poc 自创 "above sprite head" 偏移, 跟 JS body-center 不一致,
        // 用户报"数字乱飞". 现回归 sprite.y (= JS spawnFloatingNum body 中心 1:1).
        spawnFloatingText(this, v.sprite.x, v.sprite.y, text, cls,
          { amount, atkSide: target.side === 'left' ? 'right' : 'left',
            delayMs, yOffset });
      },
      // P26: skill handler 用 api.log(...) 写 per-skill flavor 行 (JS addLog 1:1).
      log: (text) => this.battleLog?.log(text),
      viewOf: (f) => {
        const v = this.views.find(x => x.fighter === f);
        return v ? { x: v.sprite.x, y: v.sprite.y, homeX: v.homeX, homeY: v.homeY, sprite: v.sprite } : null;
      },
      // 起手缩放脉冲 — 走真 view + SkillTweenMgr (以 home scale 为基准 yoyo, 还原 home, 不动位置)。
      //   修龟派气波/能量大炮体型突变: 旧裸 tween 用当前 scale 作基准且绕过 mgr → 与 watchTick 归位打架。
      pulseScale: (f, factor, duration, ease) => {
        const v = this.views.find(x => x.fighter === f);
        if (v) void this.skillTweenMgr.skillTween(
          v,
          { scaleX: v.homeScaleX * factor, scaleY: v.homeScaleY * factor },
          { duration, ease: ease ?? 'Sine.easeInOut', yoyo: true, restoreXY: false },
        );
      },
      // E3/18: 击飞 (JS playKnockupAnimation) — turtleShieldBash/ninjaImpact 调
      knockup: (target) => {
        const v = this.views.find(x => x.fighter === target);
        if (v) this.playAction(v, 'knockup');
        // E3/22: JS markKnockup (equip-effects.js:460-463) — 飞镖装备靠这个 flag 触发
        (target as Fighter & { _knockedUpThisTurn?: boolean })._knockedUpThisTurn = true;
      },
      // P163: 阵型 6 格几何中心 (含空位) — 过肩摔抛掷落点 (用户理想动画: 落到敌方 6 格正中心)
      formationCenter: (side) => {
        const { width } = this.scale.gameSize;
        const slots = ['front-0', 'front-1', 'front-2', 'back-0', 'back-1', 'back-2'];
        let sx = 0, sy = 0;
        for (const sk2 of slots) { const c = this.slotToCoords(sk2, side, width); sx += c.x; sy += c.y; }
        return { x: sx / slots.length, y: sy / slots.length };
      },
      // P191: 任意槽位中心坐标 (含空位) — 气波固定后排终点 (波速与敌人死活无关, 1:1 JS).
      slotCoords: (side, slotKey) => {
        const { width } = this.scale.gameSize;
        const c = this.slotToCoords(slotKey, side, width);
        return { x: c.x, y: c.y };
      },
      // 击至前排: 把 fighter 视图 0.4s 平移到其当前 _slotKey 坐标 (JS bamboo.js:197-214)
      repositionFighter: (f) => this.repositionViewToSlot(f),
      // 受击击退 (JS sceneKnockback): 目标远离攻击者 18px + 抬 3px, 0.35s ease-out
      setInHop: (f, on) => {
        const v = this.views.find(x => x.fighter === f);
        if (v) v._inHop = on;
      },
      hitKnockback: (f, attackerSide) => {
        const v = this.views.find(vv => vv.fighter === f);
        if (v) this.playHitKnockback(v, attackerSide);
      },
    };
  }

  /** 阶段3 juice: hit-stop — 命中瞬间把 tween/anim 时标拉到≈0 制造微停冲击感, 用真实计时恢复。
   *  暴击命中调用 (ms~70)。多次命中以最后一次为准。 */
  private _hitStopTimer = 0;
  private juiceHitStop(ms = 70): void {
    this.tweens.timeScale = 0.0001;
    this.anims.globalTimeScale = 0.0001;
    window.clearTimeout(this._hitStopTimer);
    this._hitStopTimer = window.setTimeout(() => {
      this.tweens.timeScale = 1;
      this.anims.globalTimeScale = 1;
    }, ms);
    // 场景关闭时兜底恢复, 防时标卡死
    this.events.once('shutdown', () => {
      window.clearTimeout(this._hitStopTimer);
      this.tweens.timeScale = 1; this.anims.globalTimeScale = 1;
    });
  }

  /** 受击击退 — 1:1 JS scene.css:259-275 sceneKnockback (.35s ease-out):
   *  目标被击向**远离攻击者**方向 18px(×baseScale) + 抬起 3px, 保持, 归位。
   *  (旧 PoC 各技能自创 ±8px 来回抖动 vibration, 与 JS 单向击退完全不同)
   *  _knockUntil 守卫: 多段技能首段触发后, 后续段在 350ms 内不重启 (JS class 已加, 动画不重播)。 */
  playHitKnockback(tv: FighterView, attackerSide: 'left' | 'right'): void {
    if (!tv || !tv.sprite) return;
    // 自定义抛投/击飞动画进行中 (_inHop): 跳过通用 18px 击退 — 否则与自定义位移抢同一 sprite.x → 卡顿/闪现。
    //   覆盖所有调用方 (dealPhysical 内 hitKnockback + 飘字命中路径), 比单点 gate 全。
    if (tv._inHop) return;
    const f = tv.fighter as Fighter & { _knockUntil?: number };
    const now = this.time.now;
    if ((f._knockUntil ?? 0) > now) return;
    f._knockUntil = now + 350;
    const isBoss = (tv.fighter as Fighter & { _isBoss?: boolean })._isBoss === true;
    const baseScale = isBoss ? (0.9 * 1.417 * 1.5) : (0.9 * 1.417);
    // 远离攻击者: 攻击者在左 → 目标右推(+); 攻击者在右 → 目标左推(-)
    const knockX = (attackerSide === 'left' ? 1 : -1) * Math.round(18 * baseScale);
    const lift = Math.round(3 * baseScale);
    const homeX = tv.homeX, homeY = tv.homeY;
    const syncFollow = () => {
      if (tv.shadow) tv.shadow.x = tv.sprite.x + (tv.shadowDirX ?? 0);   // 保持方向性偏移
      tv.sceneTurtleDom?.setCanvasPos(tv.sprite.x, tv.sprite.y);
    };
    // 15% (52ms): 推到 knockX + 抬 3px
    this.tweens.add({
      targets: tv.sprite, x: homeX + knockX, y: homeY - lift, duration: 52, ease: 'Quad.easeOut',
      onUpdate: syncFollow,
      onComplete: () => {
        // 45% (105ms 后): 落到 knockX 同高
        this.tweens.add({
          targets: tv.sprite, y: homeY, duration: 105, ease: 'Sine.easeOut', onUpdate: syncFollow,
          onComplete: () => {
            // 100% (193ms 后): 归位
            this.tweens.add({
              targets: tv.sprite, x: homeX, duration: 193, ease: 'Quad.easeOut', onUpdate: syncFollow,
              onComplete: () => { tv.sprite.x = homeX; tv.sprite.y = homeY; if (tv.shadow) tv.shadow.x = homeX + (tv.shadowDirX ?? 0); },
            });
          },
        });
      },
    });
  }

  /** 把某 fighter 的视图(sprite/shadow/hpBar/DOM)平移到其当前 _slotKey 坐标 (0.4s 缓动).
   *  竹击「击至前排」改 _slotKey 后调 — 旧 PoC 只改数据不动 sprite, 看起来"没被击至前排"。 */
  private repositionViewToSlot(f: import('../types').Fighter): void {
    const v = this.views.find(vv => vv.fighter === f);
    if (!v) return;
    const { width } = this.scale.gameSize;
    const slotKey = (f as Fighter & { _slotKey?: string })._slotKey || 'front-1';
    const c = this.slotToCoords(slotKey, f.side, width);
    const isBoss = (f as Fighter & { _isBoss?: boolean })._isBoss === true;
    const baseScale = isBoss ? (0.9 * 1.417 * 1.5) : (0.9 * 1.417);
    const spriteHalf = Math.floor((80 * baseScale) / 2);
    const newSpriteY = c.y - spriteHalf;
    v.homeX = c.x;
    v.homeY = newSpriteY;
    const shadowY = c.y - Math.round(12 * baseScale);
    this.tweens.add({
      targets: v.sprite, x: c.x, y: newSpriteY, duration: 400, ease: 'cubic.out',
      onUpdate: () => {
        if (v.shadow) v.shadow.x = v.sprite.x + (v.shadowDirX ?? 0);
        v.sceneTurtleDom?.setCanvasPos(v.sprite.x, v.sprite.y);
      },
      onComplete: () => {
        if (v.shadow) { v.shadow.x = c.x + (v.shadowDirX ?? 0); v.shadow.y = shadowY; }
        v.sceneTurtleDom?.setCanvasPos(c.x, newSpriteY);
      },
    });
  }

  private async runSkillHandler(actor: FighterView, target: FighterView | null, skillIdx: number): Promise<void> {
    const att = actor.fighter;
    const skill = att.skills[skillIdx];
    if (!skill) return;
    if (skill.cd) skill.cdLeft = skill.cd;
    // JS action.js:484-498 1:1 — Stone 嘲讽 redirect: 攻敌方单体且 skill 非 aoe/aoeAlly/selfCast/isAlly,
    //   敌方队伍里有他人挂 redirectAll buff 则切到嘲讽者. AoE / ally skill bypass.
    const sk = skill as Record<string, unknown>;
    // P18: ignoreRow 也跳过 redirectAll (忍者背刺无视嘲讽, JS action.js:489)
    if (target && target.fighter.side !== att.side && target.fighter.alive
        && !sk.aoe && !sk.aoeAlly && !sk.selfCast && !sk.isAlly && !sk.ignoreRow) {
      const tgtSide = target.fighter.side;
      const tgtFighter = target.fighter;
      const tTeam = this.views.filter(v => v.fighter.side === tgtSide);
      const tank = tTeam.find(v => v.fighter.alive && v.fighter !== tgtFighter
        && v.fighter.buffs.some(b => b.type === 'redirectAll' && (b.duration ?? 0) > 0));
      if (tank) {
        target = tank;
        this.battleLog.log(`${tank.fighter.name} 嘲讽：将攻击引向自己`);
      }
    }
    const handler = getSkillHandler(skill.type);
    // 雷电法杖等"按单体/AOE 段充能"的装备读这个 transient flag (triggerOnHitEffects 内)
    (att as Fighter & { _castIsAoe?: boolean })._castIsAoe = !!sk.aoe;
    const api = this.buildBattleApi();
    setSkillApi(api);   // v0.9.5.A53: 让 dealPhysical/dealMagic 能拿到 floatNum 触发 on-hit 视觉
    let result;
    try {
      result = await handler(api, att, target?.fighter ?? null, skill);
    } finally {
      setSkillApi(null);
    }
    // 触发装备 onHit 对每个 touched — 仅对真正命中的【敌人】触发。
    //   修 bug: 自增/自疗/部署等技能的 touched 含【自己/友军】(如 cyberDeploy → touched:[caster]),
    //   旧逻辑对它们也调 fireOnHit(att, 自己) → 触发自身 onHit/反伤装备 → "部署时打自己一下 + 震屏"。
    //   所有自施法技能都中招 (用户报"很多龟都有")。t.side !== att.side 排除自己和友军。
    for (const t of result.touched) {
      if (t.side !== att.side) fireOnHit(att, t, 1, false);
    }
    // killView for any died target
    for (const t of result.touched) {
      if (!t.alive) {
        const v = this.views.find(x => x.fighter === t);
        if (v) this.killView(v);
      }
    }
    // 累计 stats (粗略, handler 内不再统计)
    actor.stats.dmgDealt += result.touched.reduce((s, t) => s + (t.maxHp - t.hp), 0) / 10;

    // v0.9.5.A89: bambooCharge 触发 — 充能后追加 1.5× 强化攻击 (JS basic.js:120-180)
    await this.fireBambooChargeIfReady(actor, target);

    // P109/P110/P105b — 施法后新装备 trigger (用户 spec, 非 JS 移植)
    await this.fireOnCastEquips(actor, target, result.touched, skill);

    // 用户报 sprite 体型/角度放技能后崩坏: JS 用 CSS var + 双层防, Phaser 单 sprite 用
    // tween 改 scaleX/scaleY/rotation 后没还原 → 角色变形/歪. 这里在每次 skill handler
    // 完成后强制把 caster + 全 touched 的 sprite 还原 home (homeScaleX/Y/homeRotation).
    this.restoreSpriteHome(actor);
    for (const t of result.touched) {
      if (!t.alive) continue;
      const v = this.views.find(vv => vv.fighter === t);
      if (v) this.restoreSpriteHome(v);
    }
    // JS action.js:612 / state.js:517 — 每次行动(含召唤物)结束后即时检查猎杀处决。
    //   单一收口: 4 个 runSkillHandler 调用方(定向攻击×2 / 自施群体 / 召唤物自动)全覆盖,
    //   敌人被打到阈值下立刻斩, 不再等回合开始的兜底扫描 ("没及时猎杀"根因)。
    await this.processHunterExecute();
  }

  /** P109/P110/P105b 施法后触发新装备 (用户 spec).
   *  - e_stun_baton 电棍: 3 层电击, 单体→target / 非单体→随机敌, 30 魔法+stun 1t
   *  - e_bamboo_leaf 竹叶: 1 充能, 随机敌 (35+ 自 maxHp×20%) 魔法 + 回 20% maxHp + 永久 +100 maxHp
   *  - e_turtle_sword 小龟剑: 劈砍 target (群体优先前排), 30 物理 + 治疗 50% 实际伤害
   */
  /** 雷电法杖: 每段主动伤害命中 → 每件独立充能(单体+25/AOE+12.5); 任一件满100立刻发射连锁闪电(减100留溢出)。
   *  层数显示在装备框右下角 (turtle-hud addEquipSubIndicator), 命中后即时刷新。 */
  private onLightningStaffHit(attacker: Fighter, isAoe: boolean): void {
    const af = attacker as Fighter & { _lightningStaffCharges?: number[] };
    const arr = af._lightningStaffCharges;
    if (!arr || !arr.length) return;
    const inc = isAoe ? 12.5 : 25;
    for (let i = 0; i < arr.length; i++) {
      arr[i] += inc;
      while (arr[i] >= 100) { arr[i] -= 100; this.fireLightningChain(attacker); }
    }
    // 实时刷新装备框右下角层数
    this.views.find(x => x.fighter === attacker)?.sceneTurtleDom?.update();
  }

  /** 雷电法杖连锁闪电: 伤害立刻结算, 自绘闪电在目标间链式跳跃 (最多4个不同敌人, 各20魔法经魔抗减免)。
   *  伤害数字走标准跳法 (spawnFloatingText magic-dmg, 与普通魔法伤害一致)。 */
  private fireLightningChain(attacker: Fighter): void {
    const av = this.views.find(x => x.fighter === attacker);
    if (!av) return;
    let pool = this.views.filter(v => v.fighter.side !== attacker.side && v.fighter.alive);
    if (!pool.length) return;
    let px = av.sprite.x, py = av.sprite.y - 20;
    let delay = 0;
    for (let i = 0; i < 4 && pool.length; i++) {
      const tv = pool[Math.floor(Math.random() * pool.length)];
      pool = pool.filter(v => v !== tv);   // 跳到不同目标
      const t = tv.fighter;
      // 伤害立即结算 (满100当场出伤)
      const dmg = Math.max(1, Math.round(20 * calcDmgMult(calcEffMr(attacker, t))));
      const r = applyRawDamage(t, dmg, 'magic');
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      battleStats.recordDamage(attacker, t, shown, 'mag');
      const sx = px, sy = py, ex = tv.sprite.x, ey = tv.sprite.y - 20;
      // VFX 链式跳跃 (略 stagger); 伤害已即时结算, 数字走标准魔法跳法 + 血条同步刷新
      this.time.delayedCall(delay, () => {
        this.drawLightningBolt(sx, sy, ex, ey);
        spawnFloatingText(this, tv.sprite.x, tv.sprite.y - 40, `${shown}`, 'magic-dmg', { amount: shown, atkSide: attacker.side });
        tv.sceneTurtleDom?.update();
        if (!t.alive) this.killView(tv);
      });
      px = ex; py = ey;
      delay += 85;
    }
    this.battleLog.log(`⚡ ${attacker.name} <b>雷电法杖·连锁闪电</b> 触发`);
  }

  /** 自绘单段闪电: 起→终点锯齿折线 (青外发光 + 白内芯), 闪现后淡出销毁。 */
  private drawLightningBolt(x1: number, y1: number, x2: number, y2: number): void {
    const g = this.add.graphics().setDepth(47);
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;   // 垂直方向 → 锯齿偏移
    const SEG = 7;
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= SEG; i++) {
      const tt = i / SEG;
      const off = (i === 0 || i === SEG) ? 0 : (Math.random() - 0.5) * 26;
      pts.push({ x: x1 + dx * tt + nx * off, y: y1 + dy * tt + ny * off });
    }
    const stroke = (w: number, c: number, a: number) => {
      g.lineStyle(w, c, a);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.strokePath();
    };
    stroke(7, 0x4cc3ff, 0.35);   // 外发光
    stroke(3, 0xaee4ff, 0.8);    // 中层
    stroke(1.5, 0xffffff, 1);    // 内芯
    this.tweens.add({ targets: g, alpha: 0, duration: 220, delay: 70, onComplete: () => g.destroy() });
  }

  private async fireOnCastEquips(actor: FighterView, target: FighterView | null, touched: Fighter[], skill: SkillDef): Promise<void> {
    const caster = actor.fighter;
    if (!caster.alive) return;
    const isSingle = (skill.aoe !== true && skill.aoeAlly !== true && !skill.aoeEnemy);
    const enemies = this.views.filter(v => v.fighter.side !== caster.side && v.fighter.alive);
    const pickRandomEnemy = (): Fighter | null => enemies.length ? enemies[Math.floor(Math.random() * enemies.length)].fighter : null;
    const pickFrontEnemy = (): Fighter | null => {
      const front = enemies.filter(v => (v.fighter as Fighter & { _position?: string })._position === 'front');
      return (front[0]?.fighter ?? enemies[0]?.fighter) ?? null;
    };

    const cf = caster as Fighter & {
      _stunBatonStacks?: number; _bambooLeafCharge?: number; _turtleSword?: boolean;
      _turtleSwordDmgStat?: number; _turtleSwordHealStat?: number; _baseMaxHp?: number;
    };

    // 施法后装备(电棍/小龟剑)只能打【敌人】: 治疗/友方/自施法技能的 target 是友军或自己,
    //   旧逻辑直接用 target → 对自己/友军造成伤害 (用户报"治疗技能就砍自己")。
    const tgtEnemy = (target?.fighter.alive && target.fighter.side !== caster.side) ? target.fighter : null;

    // P109 电棍
    if ((cf._stunBatonStacks ?? 0) > 0) {
      const stunTarget = (isSingle && tgtEnemy) ? tgtEnemy : pickRandomEnemy();
      if (stunTarget?.alive) {
        cf._stunBatonStacks = (cf._stunBatonStacks ?? 0) - 1;
        // P160: "30 魔法伤害" 走魔抗减免 (与同批 spec 的竹叶一致, 全游戏"魔法伤害"皆经 calcDmgMult)
        const eMr = calcEffMr(caster, stunTarget);
        const stunDmg = Math.max(1, Math.round(30 * calcDmgMult(eMr)));
        const r = applyRawDamage(stunTarget, stunDmg, 'magic');
        const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        battleStats.recordDamage(caster, stunTarget, shown, 'mag');
        // 加 stun buff 1 回合 (turn-end -1 → 2 turn duration)
        if (!stunTarget.buffs.find(b => b.type === 'stun')) {
          stunTarget.buffs.push({ type: 'stun', value: 1, duration: 2 });
          (stunTarget as Fighter & { _stunUsed?: boolean })._stunUsed = false;
        }
        const tv = this.views.find(v => v.fighter === stunTarget);
        if (tv) {
          this.spawnFloatingPassive(tv, `⚡${shown}+眩晕`, '#ffd86b');
          if (!stunTarget.alive) this.killView(tv);
        }
        this.battleLog.log(`⚡ ${caster.name} <b>电棍</b> → ${stunTarget.name}：${shown}魔法 + 眩晕 (剩 ${cf._stunBatonStacks} 层)`);
      }
    }

    // 雷电法杖连锁闪电已改为即时触发 (满100当场发射) — 见 onLightningStaffHit / fireLightningChain。

    // P110 竹叶 (一次性充能, 用完不销毁装备)
    if ((cf._bambooLeafCharge ?? 0) > 0) {
      const leafTarget = pickRandomEnemy();
      if (leafTarget?.alive) {
        cf._bambooLeafCharge = 0;
        const dmg = 35 + Math.round(caster.maxHp * 0.20);
        const eDef = calcEffMr(caster, leafTarget);
        const finalDmg = Math.max(1, Math.round(dmg * calcDmgMult(eDef)));
        const r = applyRawDamage(leafTarget, finalDmg, 'magic');
        const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        battleStats.recordDamage(caster, leafTarget, shown, 'mag');
        const tv = this.views.find(v => v.fighter === leafTarget);
        if (tv) {
          this.spawnFloatingPassive(tv, `${shown}`, '#4dabf7');   // P131 删自创🌿, 法术伤害 #4dabf7 (magic-dmg cls)
          if (!leafTarget.alive) this.killView(tv);
        }
        // 回携带者 20% maxHp
        const healAmt = Math.round(caster.maxHp * 0.20);
        const before = caster.hp;
        caster.hp = Math.min(caster.maxHp, caster.hp + healAmt);
        const actualHeal = caster.hp - before;
        if (actualHeal > 0) {
          battleStats.recordHeal(caster, caster, actualHeal);
          this.spawnFloatingPassive(actor, `+${actualHeal}`, '#06d6a0');   // P131 删自创🌿, heal-num cls
        }
        // 永久 +100 maxHp
        caster.maxHp += 100;
        caster.hp += 100;
        this.spawnFloatingPassive(actor, `+100 maxHp 永久`, '#7dffb3');
        this.battleLog.log(`🌿 ${caster.name} <b>竹叶生长</b>: ${shown} 魔法 → ${leafTarget.name}, 自回 ${actualHeal}HP, 永 +100 maxHp`);
      }
    }

    // P105b 小龟剑 劈砍 (每次施法触发, 不消耗)
    if (cf._turtleSword === true) {
      const swordTarget = (isSingle && tgtEnemy) ? tgtEnemy : pickFrontEnemy();
      if (swordTarget?.alive) {
        const eDef = calcEffArmor(caster, swordTarget);
        const finalDmg = Math.max(1, Math.round(30 * calcDmgMult(eDef)));
        const r = applyRawDamage(swordTarget, finalDmg, 'physical');
        const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        battleStats.recordDamage(caster, swordTarget, shown, 'phy');
        cf._turtleSwordDmgStat = (cf._turtleSwordDmgStat ?? 0) + shown;
        // 治疗 50% 实际伤害
        const healAmt = Math.round(shown * 0.5);
        const before = caster.hp;
        caster.hp = Math.min(caster.maxHp, caster.hp + healAmt);
        const actualHeal = caster.hp - before;
        if (actualHeal > 0) {
          cf._turtleSwordHealStat = (cf._turtleSwordHealStat ?? 0) + actualHeal;
          battleStats.recordHeal(caster, caster, actualHeal);
        }
        const tv = this.views.find(v => v.fighter === swordTarget);
        if (tv) {
          this.spawnFloatingPassive(tv, `🗡${shown}`, '#ff6b6b');
          if (!swordTarget.alive) this.killView(tv);
        }
        if (actualHeal > 0) this.spawnFloatingPassive(actor, `+${actualHeal}🗡`, '#06d6a0');
      }
    }
    void touched;
  }

  /** sprite home 值还原 (防 tween 后 scale/rotation 漂走)
   *  注意: 不 killTweensOf — 那会杀掉 idle bob 永久循环 tween.
   *  skill handler await 完所有 tween 完成才返回, 此时 sprite 静止, setScale 安全.
   *  特殊情况: 若 fire-and-forget tween 还在跑, setScale 后会被 tween 继续推, 但
   *  tween 短时间内就到 onComplete 还原 — 不再持久漂走. */
  private restoreSpriteHome(view: FighterView) {
    if (!view || !view.sprite) return;
    view.sprite.setScale(view.homeScaleX, view.homeScaleY);
    view.sprite.setRotation(view.homeRotation);
    // P24: hop 进行中不强制回 home, 让 addCounter onUpdate 主导 sprite.x/y
    //   (用户报 "向前跳只有影子动 龟没动" — 之前 runSkillHandler 结束 force home, hop 中卡死).
    //   hop 自己 onComplete 会兜底 reset.
    if (!view._inHop) {
      view.sprite.x = view.homeX;
      view.sprite.y = view.homeY;
    }
  }

  /** P35 竹编充能 1:1 JS skills/bamboo.js:119-173 doBambooChargeAttack
   *   蓄力 1000ms → magic dmg = atk×atkPct/100 + maxHp×selfHpPct/100 (default 75%+8%)
   *   命中后回 healSelfHpPct% maxHp + 永久 +hpGainAtkPct% atk 的 maxHp (default 60%)
   *   强化版 (bambooCharged passiveSkill): atkPct 75→100, selfHpPct 8→13, hpGainAtkPct 60→105, healSelfHpPct 8→12
   *   旧 PoC 用 1.5×ATK 物理 — 伤害类型/公式/效果全错
   */
  private async fireBambooChargeIfReady(actor: FighterView, target: FighterView | null) {
    const f = actor.fighter as Fighter & {
      _bambooCharged?: boolean; _bambooFired?: boolean; _bambooGainedHp?: number;
      _bambooEnhanced?: boolean;
    };
    if (!f._bambooCharged || f._bambooFired) return;
    // P19 1:1 JS action.js:621-624 — 追加攻击必打敌方: 技能目标若是有效存活敌方则用它, 否则取最低 HP 敌方; 无敌方则不放。
    //   之前直接用传入 target (自施技能如自然恢复时 target=自己/空) → 追加攻击打到自己 (A6 bug)。
    const enemies = this.views.filter(v => v.fighter.side !== f.side && v.fighter.alive);
    if (!enemies.length) return;
    const skillTgtView = (target && target.fighter.alive && target.fighter.side !== f.side) ? target : null;
    const tv = skillTgtView ?? enemies.slice().sort((a, b) => a.fighter.hp - b.fighter.hp)[0];
    f._bambooFired = true;
    f._bambooCharged = false;

    const p = f.passive as {
      atkPct?: number; selfHpPct?: number; healSelfHpPct?: number; hpGainAtkPct?: number;
    } | null;
    if (!p) return;
    // 强化版数值 (JS bambooCharged passiveSkill: atkPct 75→100, selfHpPct 8→13, hpGainAtkPct 60→105, healSelfHpPct 8→12)
    const atkPct = f._bambooEnhanced ? 100 : (p.atkPct ?? 75);
    const selfHpPct = f._bambooEnhanced ? 13 : (p.selfHpPct ?? 8);
    const healSelfHpPct = f._bambooEnhanced ? 12 : (p.healSelfHpPct ?? 8);
    const hpGainAtkPct = f._bambooEnhanced ? 105 : (p.hpGainAtkPct ?? 60);

    // 蓄力 (JS:124-127)
    this.spawnFloatingPassive(actor, '🎋蓄力...', '#10b981');
    await new Promise(r => this.time.delayedCall(1000, () => r(null)));

    // magic 伤害 (JS:130-135)
    const att = actor.fighter;
    const tgt = tv.fighter;
    const rawDmg = Math.round(att.atk * atkPct / 100) + Math.round(att.maxHp * selfHpPct / 100);
    const isCrit = rollCrit(att.crit);
    const critMult = isCrit ? calcCritMult(att) : 1;
    const finalDmg = Math.round(calcDamage(att, tgt, rawDmg * critMult, 'magic'));
    const wasAlive = tgt.alive;
    const r = applyRawDamage(tgt, finalDmg, 'magic');
    const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
    battleStats.recordDamage(att, tgt, shown, 'mag');
    // JS bamboo.js:142 — 充能追加攻击也走 on-hit 链 (审判/反伤/电击/墨迹/吸血/装备onHit); PoC 之前漏调
    triggerOnHitEffects(att, tgt, shown, {
      floatNum: (t, txt, c) => { const tvv = this.views.find(v => v.fighter === t); if (tvv) this.spawnFloatingPassive(tvv, txt, c); },
      isCrit, critMult,
    });
    if (isCrit) actor.stats.crits++;
    this.showDamageVfx(tv, shown, isCrit, 'magic');
    // (删) 旧代码在【目标】头上飘"🎋充能!" → 敌人头上误显示充能 (用户报)。充能就绪改走施法者 + 面板状态栏。
    // P218 绿光球: 生命从目标飞回竹叶龟 (JS skills/bamboo.js spawnBambooOrb 同款 — 抛物线 650ms + 拖尾 + 落点爆裂)
    this.spawnBambooOrb(tv, actor);
    if (wasAlive && !tgt.alive) {
      battleStats.recordKill(att, tgt);
      this.killView(tv);
    }

    await new Promise(r2 => this.time.delayedCall(650, () => r2(null)));

    // 绿球到达 → 回血 + 永久 +maxHp (JS:153-164)
    const rawHealAmt = Math.round(att.maxHp * healSelfHpPct / 100);
    const healRedBuff = att.buffs.find(b => b.type === 'healReduce');
    const healRed = healRedBuff ? (healRedBuff.value as number) : 0;
    const healAmt = Math.round(rawHealAmt * (1 - healRed / 100));
    const hpGain = Math.round(att.atk * hpGainAtkPct / 100);
    const before = att.hp;
    att.maxHp += hpGain;
    f._bambooGainedHp = (f._bambooGainedHp ?? 0) + hpGain;
    att.hp = Math.min(att.maxHp, att.hp + healAmt + hpGain);
    const actualHeal = att.hp - before;
    if (actualHeal > 0) {
      battleStats.recordHeal(att, att, actualHeal);
      this.spawnFloatingPassive(actor, `+${actualHeal}`, '#06d6a0');   // P131 删自创❤, heal-num cls
    }
    this.spawnFloatingPassive(actor, `+${hpGain}最大HP`, '#a0e8ff');
    // HP bar refresh — P19 A10: actor.hpBar 是 alpha-0 legacy 不可见, 必须刷 DOM overlay 血条
    this.tweens.add({ targets: actor.hpBar, width: 118 * (att.hp / att.maxHp), duration: 300 });
    actor.hpText.setText(`${att.hp}/${att.maxHp}`);
    this.updateHpVisual(actor);   // 刷真实 DOM 血条/数值, 反映 maxHp 增加 (之前只刷不可见 Phaser bar → 增最大生命无变化)

    this.battleLog.log(`🎋 ${att.name} 竹编充能 → ${tgt.name}：${shown}魔法${isCrit ? ' 暴击!' : ''} +${actualHeal}HP 永久+${hpGain}最大HP`);
  }

  /** P218 竹叶龟绿光球: 生命从 fromV(目标) 抛物线飞回 toV(竹叶龟), 拖绿尾, 落点绿色爆裂。
   *  1:1 JS skills/bamboo.js spawnBambooOrb (650ms / arcH=max(60,dist*0.4) / 缓动 + 落点 burst)。 */
  private spawnBambooOrb(fromV: FighterView, toV: FighterView): void {
    if (!this.textures.exists('vfx-bamboo-charge-orb')) return;
    const sx = fromV.homeX, sy = fromV.homeY - 20;
    const ex = toV.homeX, ey = toV.homeY - 20;
    const arcH = Math.max(60, Math.hypot(ex - sx, ey - sy) * 0.4);
    const orb = this.add.sprite(sx, sy, 'vfx-bamboo-charge-orb').setDepth(80).setDisplaySize(48, 48);
    try { orb.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
    if (this.anims.exists('anim-bamboo-charge-orb')) orb.play('anim-bamboo-charge-orb');
    const prog = { e: 0 };
    let lastTrail = 0;
    this.tweens.add({
      targets: prog, e: 1, duration: 650, ease: 'Sine.easeInOut',
      onUpdate: () => {
        const e = prog.e;
        const x = sx + (ex - sx) * e;
        const y = sy + (ey - sy) * e - (-4 * arcH * e * (e - 1));   // 抛物线上拱
        orb.x = x; orb.y = y;
        if (e > 0.05 && e < 0.93 && this.time.now - lastTrail > 30) {
          const tr = this.add.circle(x, y, 5, 0x7dffb3, 0.7).setDepth(79);
          this.tweens.add({ targets: tr, alpha: 0, scale: 0.3, duration: 420, ease: 'cubic.out', onComplete: () => tr.destroy() });
          lastTrail = this.time.now;
        }
      },
      onComplete: () => {
        orb.destroy();
        if (this.textures.exists('vfx-bamboo-charge-burst')) {
          const b = this.add.sprite(ex, ey, 'vfx-bamboo-charge-burst').setDepth(81).setDisplaySize(76, 76);
          try { b.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
          if (this.anims.exists('anim-bamboo-charge-burst')) { b.play('anim-bamboo-charge-burst'); b.once('animationcomplete', () => b.destroy()); }
          else this.time.delayedCall(300, () => b.destroy());
        }
      },
    });
  }

  private executeAttack(actor: FighterView, target: FighterView, skillIdx: number) {
    this.clearTurnTimer();   // 玩家(或超时AI)已出手, 停倒计时
    const att = actor.fighter;
    const skill = att.skills[skillIdx];
    // P17: JS action.js:511-512 1:1 — showSkillAnnounce + 600ms wait BEFORE attack hop
    if (skill) this.showSkillAnnounce(actor, skill.name);
    this.time.delayedCall(600, () => this._executeAttackPostAnnounce(actor, target, skillIdx));
  }

  private _executeAttackPostAnnounce(actor: FighterView, target: FighterView, skillIdx: number) {
    const att = actor.fighter;
    let tgt = target.fighter;
    const skill = att.skills[skillIdx];

    // E3/7: 记录当前攻击者 (死亡后被动 deathExplode/deathHook/healOnKill 用)
    this.currentAttacker = att;
    // E3/9: 清 per-cast 标记 (JS action.js:471) — fire-rule/equipBurn 每施法每目标 1 次 burn
    resetPerCastFlags(this.views.map(v => v.fighter));

    // E3/1: 嘲讽重定向 (JS action.js:487-498)
    // 单体敌方技能 + target 不是嘲讽者 → 检查 target 队里其他活着的嘲讽者 → 重定向
    const isAOE = !!(skill as { aoe?: boolean; aoeAlly?: boolean })?.aoe || !!(skill as { aoeAlly?: boolean })?.aoeAlly;
    const isAlly = !!(skill as { isAlly?: boolean })?.isAlly;
    const isSelfCast = !!(skill as { selfCast?: boolean })?.selfCast;
    // P18: ignoreRow 也跳过 taunt 重定向 (JS action.js:489 同款 — 忍者背刺无视嘲讽)
    const ignoreRow = !!(skill as { ignoreRow?: boolean })?.ignoreRow;
    if (!isAOE && !isAlly && !isSelfCast && !ignoreRow && tgt.side !== att.side && tgt.alive) {
      const tankView = this.views.find(v =>
        v.fighter.side === tgt.side && v.fighter.alive && v.fighter !== tgt
        && v.fighter.buffs.some(b => b.type === 'taunt'));
      if (tankView) {
        target = tankView;
        tgt = tankView.fighter;
        this.battleLog.log(`🛡️ ${tgt.name} 嘲讽 — 攻击被引向自己`);
      }
    }

    // E3/2: 闪避判定 (JS combat.js:83-110)
    // 单体敌方单段技能才检查闪避 (AOE / 自施 / 友方目标跳过)
    // G3: 删除攻击前整体闪避预检 — JS 只在 doDamage 里 per-hit roll 闪避 (combat.js:82-110)。
    //   旧此处 +处理器内 rollDodge = 双 roll (闪避率虚高 1-(1-p)²) 且多段技能预检命中会跳过全部段。
    //   闪避/ghostSquid 盾/dodgeCounter 反击 现统一在 rollDodge per-hit 处理。

    // P20: SKIP_DEFAULT_HOP 列表 (JS action.js:520-521) — 这些技能 handler 自己驱动 caster
    // 动画 (ninjaImpact 击飞夹击 / ninjaBackstab dash teleport), 不再走默认 attack-hop.
    const SKIP_DEFAULT_HOP = new Set(['ninjaImpact', 'ninjaBackstab']);
    if (skill && SKIP_DEFAULT_HOP.has(skill.type)) {
      // 跳过 hop chain, 直接走 handler + endTurn (handler 内部有自己 sleep + 动画)
      this.runSkillHandler(actor, target, skillIdx).then(() => this.endTurn());
      return;
    }

    // v0.9.5.A73: 所有 skill type (含 physical) 都走 SKILL_HANDLERS, physical handler 支持 atk/def/mr 复合
    if (skill && skill.type) {
      // 攻击 hop — JS scene.css:277-294 @keyframes attackHopRight/Left 1:1 (1.2s ease-in-out):
      //   0%   translate(0,   0)
      //   15%  translate(±18, -6)   ← 起跳: 前+上 6px
      //   20%  translate(±25, 0)    ← 落地于前 25px (= 1200ms × 20% = 240ms)
      //   80%  translate(±25, 0)    ← 持续 hold 60% (= 720ms)
      //   95%  translate(±5,  -3)   ← 起跳回程
      //   100% translate(0,   0)    ← 归位 (= 1200ms × 100%)
      // 上一版用 60px (自创) — 用户报 "你看JS的码吗还是自创的", 改回 25px (JS 值).
      // chain 中断时 (e.g. 龟攻击中死亡 reflect) sprite 卡 forwardX, SkillTweenMgr.watchTick
      // x drift 检测兜底强制还原 homeX. _isSkillTween 标记让 watcher 识别 chain 在跑.
      const ATTACK_HOP_TOTAL_MS = 1200;
      const ATTACK_HOP_FORWARD_MS = 240;   // JS keyframe 20% × 1200 = 240ms 落地 (sprite 已就位)
      const ATTACK_DAMAGE_SYNC_MS = 400;   // P17: JS constants.js:22 — 伤害与击中帧同步 (动作 hop 已到位 + 中段)
      void ATTACK_HOP_TOTAL_MS;
      const dir = att.side === 'left' ? 1 : -1;
      const forwardX = actor.homeX + dir * 25;   // JS keyframe 20% / 80% 值
      const liftY = actor.homeY - 6;             // JS keyframe 15% y (上跳)
      const baseY = actor.homeY;
      const returnLiftY = actor.homeY - 3;       // JS keyframe 95% y (回程小跳)

      // P20: 删 playMeleeArcTrail "小球弧线" — JS basic.js 不存在此 VFX, 是 poc 自创.
      // 用户报"攻击时还有你自创的小球特效?". 确认 JS grep 无 playMeleeArcTrail, 删之.

      // P19: 单 ease-in-out + 6 keyframes 线性插值 (CSS @keyframes 1.2s ease-in-out 1:1)
      // 之前 chain 5 段每段不同 ease (sine.out/power2.in 切换) 视觉看着"扭两下".
      // CSS @keyframes 真行为: ease-in-out 作用于全局 t∈[0,1], 段内默认线性插值.
      // 用 addCounter eased counter + onUpdate manual keyframe interpolation 复现.
      const _liftY = liftY, _returnLiftY = returnLiftY, _baseY = baseY, _forwardX = forwardX;
      void _liftY; void _returnLiftY;
      const homeX = actor.homeX;
      const homeY = baseY;
      const keyframes: Array<{ t: number; x: number; y: number }> = [
        { t: 0,    x: 0,         y: 0  },           // 0%
        { t: 0.15, x: dir * 18,  y: -6 },           // 15% 起跳
        { t: 0.20, x: dir * 25,  y:  0 },           // 20% 落
        { t: 0.80, x: dir * 25,  y:  0 },           // 80% hold
        { t: 0.95, x: dir * 5,   y: -3 },           // 95% 回跳
        { t: 1.0,  x: 0,         y:  0 },           // 100% home
      ];
      // P162: 自己驱动 caster 位移的技能 (过肩摔 dash) 跳过通用位移 hop. 单 sprite 下通用 hop 会和
      //   handler 抢 sprite.x, 且 hop 1.2s onComplete 把 caster 拽回 home 打断动作 (用户报"动画完全不同").
      //   跳过后由 handler 独占 sprite 跑一条带 anticipation/settle 的连贯链 (更丝滑). 换攻击帧 (playAction)
      //   只换贴图不动位置 → 保留 (JS 攻击序列帧同款).
      // P219: basicChiWave 也自驱 caster 位移 (滑到目标横排发波) — 之前漏加, 通用 hop 前冲 25px
      //   与 handler 的 casterHold(y→rowY) 抢 sprite.x/y → caster 先melee前跳再斜滑下排 (用户报"诡异/拽回").
      const SKIP_POSITIONAL_HOP = new Set(['basicSlam', 'basicChiWave', 'ninjaImpact', 'ninjaBackstab']);
      const skipPosHop = SKIP_POSITIONAL_HOP.has(skill.type);
      if (!skipPosHop) {
        // P24: 标 _inHop 让 SkillTweenMgr.watchTick 跳过 sprite.x 强制回 home (用户报"只剩影子动")
        actor._inHop = true;
        const counter = this.tweens.addCounter({
          from: 0, to: 1, duration: ATTACK_HOP_TOTAL_MS,
          // P191: 时间轴线性 (之前 cubic.inOut 让 counter 在两端慢、中段快 → 前移25px的 hold 被快进、
          //   起跳/回程拖沓, 整体生硬). CSS @keyframes 的 ease-in-out 是"逐段"作用、时间轴本身匀速 →
          //   改: counter Linear + 每段 local 上 smoothstep, 关节处不再线性折角.
          ease: 'Linear',
          onUpdate: (tween) => {
            const p = tween.getValue() ?? 0;
            let kIdx = 0;
            for (let i = 0; i < keyframes.length - 1; i++) {
              if (p >= keyframes[i].t && p <= keyframes[i + 1].t) { kIdx = i; break; }
              if (p > keyframes[i + 1].t) kIdx = i + 1;
            }
            const a = keyframes[kIdx];
            const b = keyframes[Math.min(kIdx + 1, keyframes.length - 1)];
            const span = b.t - a.t;
            const localRaw = span > 0 ? Math.max(0, Math.min(1, (p - a.t) / span)) : 0;
            const local = localRaw * localRaw * (3 - 2 * localRaw);   // smoothstep ≈ 逐段 ease-in-out
            const dx = a.x + (b.x - a.x) * local;
            const dy = a.y + (b.y - a.y) * local;
            actor.sprite.x = homeX + dx;
            actor.sprite.y = homeY + dy;
            // P20/P29: shadow 跟随 hop (JS .st-shadow nested in .st-body → 跟 body translate)
            if (actor.shadow) actor.shadow.x = homeX + dx + (actor.shadowDirX ?? 0);   // 保持方向性偏移
          },
          onComplete: () => {
            // 兜底
            actor.sprite.x = homeX;
            actor.sprite.y = homeY;
            if (actor.shadow) actor.shadow.x = homeX + (actor.shadowDirX ?? 0);   // 保持方向性偏移
            actor._inHop = false;   // P24 清 _inHop
          },
        });
        (counter as Phaser.Tweens.BaseTween & { _isSkillTween?: boolean })._isSkillTween = true;
      }
      void _forwardX;

      // playAction attack (换攻击帧, 不动位置): 非跳 hop 在 240ms 落点后; 跳 hop 立即换帧
      this.time.delayedCall(skipPosHop ? 0 : ATTACK_HOP_FORWARD_MS, () => this.playAction(actor, 'attack'));
      // handler dispatch: 非跳 hop 在 400ms 击中帧 (JS constants.js:22); 跳 hop 提前 200ms 让 caster 尽快起势
      this.time.delayedCall(skipPosHop ? 200 : ATTACK_DAMAGE_SYNC_MS, () => {
        this.runSkillHandler(actor, target, skillIdx).then(() => this.endTurn());
      });
      return;
    }

    // 旧 fallback 路径 (前冲 + 单段攻击 + 反伤/生命偷取)
    if (skill?.cd) skill.cdLeft = skill.cd;

    // 播放 attacker 攻击动画
    this.playAction(actor, 'attack');

    const dashX = att.side === 'left' ? actor.homeX + 80 : actor.homeX - 80;
    this.tweens.add({
      targets: actor.sprite, x: dashX, duration: 180, ease: 'power2.in',
      onComplete: async () => {
        const atkScale = (skill?.atkScale as number | undefined) ?? 1.0;
        const base = Math.round(att.atk * atkScale);
        const isCrit = rollCrit(att.crit);
        // P1.4 暴击溢出系统
        const critMult = isCrit ? calcCritMult(att) : 1;
        const finalDmg = Math.round(calcDamage(att, tgt, base * critMult, 'physical'));

        const wasAlive = tgt.alive;
        const { hpLoss, shieldAbs } = applyRawDamage(tgt, finalDmg, 'physical', false, false, att.side);
        const dmgShown = hpLoss + shieldAbs;

        // 统计 (普攻 fallback = 物理伤害)
        actor.stats.dmgDealt += dmgShown;
        target.stats.dmgTaken += dmgShown;
        battleStats.recordDamage(att, tgt, dmgShown, 'phy');
        if (isCrit) actor.stats.crits++;
        if (wasAlive && !tgt.alive) {
          actor.stats.kills++;
          battleStats.recordKill(att, tgt);
          // I2: 击杀金币移到中央 fighter:died 钩子 (recordKill 触发, boss+30/普通+5, 覆盖所有击杀)。
          //   这里只留战利品掉落 (30% 掉装备进 bench)。
          if (att.side === 'left' && Math.random() < 0.3) {
            this.dropLootEquip();
          }
        }

        // v0.9.5.A51: 被动触发链 (shieldOnHit / twoHeadVitality / crystalResonance / stoneWall / 储能 / lifesteal)
        triggerOnHitEffects(att, tgt, dmgShown, {
          floatNum: (t, txt, c) => {
            const vv = this.views.find(x => x.fighter === t);
            if (!vv) return;
            const txtObj = this.add.text(vv.sprite.x, vv.sprite.y - 40, txt, {
              fontSize: '20px', color: c, fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
              stroke: '#000', strokeThickness: 3,
            }).setOrigin(0.5).setDepth(50);
            this.tweens.add({ targets: txtObj, y: vv.sprite.y - 100, alpha: 0, duration: 700, onComplete: () => txtObj.destroy() });
          },
          log: (txt) => this.battleLog.log(txt),
          // 协同同阵营查询 (E2/4: 刺杀击杀 +ATK 全队)
          getTeammates: (side) => this.views.map(v => v.fighter).filter(f => f.side === side),
          // E3/10: 对面阵营查询 (splash 装备 — 随机另一只敌人)
          getEnemies: (side) => this.views.map(v => v.fighter).filter(f => f.side !== side && f.alive),
          isCrit,
          critMult: isCrit ? 1.5 : 1,
          skillAoe: false,  // fallback 单段路径 = 单体
          // P108b 孵化器: 命中链路上推进度
          incubatorAdd: (fighter, delta) => {
            const v = this.views.find(vv => vv.fighter === fighter);
            if (v) this._incubatorProgress(v, delta, '伤害');
          },
        });
        // 装备触发 (onHit / onHitAsTarget)
        // U12: 抓 hp 变化 → 给静默的装备治疗(e_star吸血/e_pearl回血)补飘字
        const attHpBefore = att.hp, tgtHpBefore = tgt.hp;
        fireOnHit(att, tgt, dmgShown, isCrit);
        if (att.hp > attHpBefore) this.spawnFloatingPassive(actor, `+${att.hp - attHpBefore}`, '#06d6a0');
        if (tgt.hp > tgtHpBefore && target) this.spawnFloatingPassive(target, `+${tgt.hp - tgtHpBefore}`, '#06d6a0');
        // 装备如果让 attacker 死了 (反伤致死), 同步状态
        if (!att.alive) this.killView(actor);

        this.showDamageVfx(target, dmgShown, isCrit);

        // E3/42: 删 SIGNATURE_SKILL lifesteal/thorns 演示路径 — JS 没此自创
        // 真 lifesteal 走 fighter._lifestealPct (装备/技能加)
        // 真 thorns 走 e_thorns 装备 reflect (equipment-runtime.ts)

        if (!tgt.alive) this.killView(target);

        this.tweens.add({
          targets: actor.sprite, x: actor.homeX, duration: 280, ease: 'power2.out',
          onComplete: () => this.endTurn(),
        });
      },
    });
  }

  /** v0.9/P18: 战斗内 fighter 详情卡 — 委托给 DetailPanel (DOM overlay)。
   *  detailOpen 仅作 toggle 守卫 (同一只龟再点 → 关闭); 实际渲染/布局在 DetailPanel.ts。
   */
  private detailOpen = false;
  private showFighterDetail(f: Fighter) {
    // v0.9/P18: Phaser canvas 详情卡 → DOM overlay (DetailPanel). 文字清晰 + 属性带 icon +
    //   HP 条阵营色 + 状态中文标签 + 装备只在有装备时渲染。布局固定不滚动 (overflow:hidden)。
    // toggle: 已对同一只龟开着 → 关闭; 否则展示。背景点击关闭走 onClose 回调重置 detailOpen。
    if (this.detailOpen && this.detailPanelDom.currentFighter === f) {
      this.detailPanelDom.hide();
      this.detailOpen = false;
      return;
    }
    const isAlly = f.side === 'left';
    this.detailPanelDom.show(f, isAlly, () => { this.detailOpen = false; });
    this.detailOpen = true;
  }


  /** P102: 旧 Phaser canvas 统计面板 deprecated — 走 P100 DmgStatsPanel DOM. 此方法保留为 dead code. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _deprecated_showStatsPanel(initialTab: 'dmg' | 'taken' | 'heal' | 'shield' = 'dmg') {
    const { width, height } = this.scale.gameSize;
    const layer = this.add.container(0, 0).setDepth(230);
    // P28: veil 0.78 → 0.45 (跟 showFighterDetail 一致, 减弱"灰屏"感)
    const veil = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45)
      .setInteractive();
    veil.on('pointerdown', () => closeIt());
    layer.add(veil);
    const PW = 760, PH = 520;
    layer.add(this.add.rectangle(width / 2, height / 2, PW, PH, 0x1a2740, 0.97)
      .setStrokeStyle(3, 0xffd93d));
    layer.add(this.add.text(width / 2, height / 2 - PH / 2 + 32, '📊 战斗统计', {
      fontSize: '24px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
    }).setOrigin(0.5));

    let curTab = initialTab;
    const listLayer = this.add.container(0, 0);
    layer.add(listLayer);

    const renderTab = () => {
      listLayer.removeAll(true);

      const TAB_INFO = {
        dmg:    { label: '输出 DMG',  field: 'dmgDealt'    as const, breakdown: 'dmgDealtByType' as const, suffix: '' },
        taken:  { label: '承受 TAKEN', field: 'dmgTaken'    as const, breakdown: 'dmgTakenByType' as const, suffix: '' },
        heal:   { label: '治疗 HEAL',  field: 'healTaken'   as const, breakdown: null,                     suffix: '' },
        shield: { label: '护盾 SHIELD',field: 'shieldGained'as const, breakdown: null,                     suffix: '' },
      };
      const info = TAB_INFO[curTab];
      const showBreakdown = !!info.breakdown;

      const allStats = battleStats.all().slice().sort((a, b) => (b[info.field] as number) - (a[info.field] as number));
      const maxVal = Math.max(1, ...allStats.map(s => s[info.field] as number));

      // v0.9.2: legend (4 色 chip) — 仅 DMG/TAKEN tab 显示
      const headY = height / 2 - PH / 2 + 110;
      if (showBreakdown) {
        const legY = headY - 22;
        const legX0 = width / 2 - 220;
        const chipW = 60, chipGap = 8;
        (['phy', 'mag', 'tru', 'dot'] as const).forEach((t, i) => {
          const cx = legX0 + i * (chipW + chipGap);
          listLayer.add(this.add.rectangle(cx, legY, 10, 10, DMG_TYPE_INFO[t].color).setOrigin(0, 0.5));
          listLayer.add(this.add.text(cx + 14, legY, DMG_TYPE_INFO[t].label, {
            fontSize: '12px', color: DMG_TYPE_INFO[t].cssColor, fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
          }).setOrigin(0, 0.5));
        });
      }

      // 表头
      listLayer.add(this.add.text(width / 2 - 280, headY, '阵营/龟', {
        fontSize: '13px', color: '#888', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
      }).setOrigin(0, 0.5));
      listLayer.add(this.add.text(width / 2 + 280, headY, info.label, {
        fontSize: '13px', color: '#888', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
      }).setOrigin(1, 0.5));

      // 行
      const rowH = 32, maxRows = 10;
      allStats.slice(0, maxRows).forEach((s, i) => {
        const y = headY + 30 + i * rowH;
        const val = s[info.field] as number;
        const pct = val / maxVal;
        // bar
        const barW = 480;
        listLayer.add(this.add.rectangle(width / 2 - 220, y, barW, 24, 0x000000, 0.4)
          .setOrigin(0, 0.5).setStrokeStyle(1, 0x444));
        if (showBreakdown && info.breakdown) {
          // v0.9.2: 4 段 stacked bar (phy/mag/tru/dot 横向拼接, 各段宽按本龟该类型/全场最大值)
          const bd = s[info.breakdown] as DmgBreakdown;
          let segX = width / 2 - 219;
          (['phy', 'mag', 'tru', 'dot'] as const).forEach(t => {
            const segPct = bd[t] / maxVal;
            const segW = (barW - 2) * segPct;
            if (segW <= 0.5) return;
            listLayer.add(this.add.rectangle(segX, y, segW, 22, DMG_TYPE_INFO[t].color, 0.92)
              .setOrigin(0, 0.5));
            segX += segW;
          });
        } else {
          const barColor = s.side === 'left' ? 0x06d6a0 : 0xff6b6b;
          listLayer.add(this.add.rectangle(width / 2 - 219, y, (barW - 2) * pct, 22, barColor, 0.85)
            .setOrigin(0, 0.5));
        }
        // 阵营 chip + name
        listLayer.add(this.add.text(width / 2 - 280, y, s.side === 'left' ? '我' : '敌', {
          fontSize: '12px', color: s.side === 'left' ? '#06d6a0' : '#ff6b6b',
          fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
          backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 5, y: 1 },
        }).setOrigin(0, 0.5));
        listLayer.add(this.add.text(width / 2 - 215, y, s.name, {
          fontSize: '13px', color: '#fff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
        }).setOrigin(0, 0.5));
        // 数值
        listLayer.add(this.add.text(width / 2 + 280, y, `${val}${info.suffix}`, {
          fontSize: '14px', color: '#ffd93d', fontFamily: 'monospace', fontStyle: 'bold',
        }).setOrigin(1, 0.5));
        // kills (仅 DMG tab)
        if (curTab === 'dmg' && s.kills > 0) {
          listLayer.add(this.add.text(width / 2 + 215, y, `💀${s.kills}`, {
            fontSize: '12px', color: '#ff6b6b', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
          }).setOrigin(1, 0.5));
        }
      });

      if (allStats.length === 0) {
        listLayer.add(this.add.text(width / 2, height / 2, '（暂无数据）', {
          fontSize: '14px', color: '#666', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
        }).setOrigin(0.5));
      }
    };

    // 4 tab 按钮
    const tabs: Array<{ key: 'dmg' | 'taken' | 'heal' | 'shield'; label: string }> = [
      { key: 'dmg',    label: 'DMG' },
      { key: 'taken',  label: 'TAKEN' },
      { key: 'heal',   label: 'HEAL' },
      { key: 'shield', label: 'SHIELD' },
    ];
    const tabY = height / 2 - PH / 2 + 70;
    const tabW = 110, tabGap = 12;
    const tabStartX = width / 2 - ((tabW * 4 + tabGap * 3) / 2) + tabW / 2;
    const tabBgs: Array<{ bg: Phaser.GameObjects.Rectangle; t: Phaser.GameObjects.Text; key: string }> = [];
    tabs.forEach((tab, i) => {
      const x = tabStartX + i * (tabW + tabGap);
      const bg = this.add.rectangle(x, tabY, tabW, 32, 0x0a0e18, 0.9)
        .setStrokeStyle(2, 0x58d3ff, 0.7).setInteractive({ useHandCursor: true });
      const t = this.add.text(x, tabY, tab.label, {
        fontSize: '14px', color: '#aaa', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      }).setOrigin(0.5);
      bg.on('pointerdown', () => {
        curTab = tab.key;
        for (const tb of tabBgs) {
          const on = tb.key === curTab;
          tb.bg.setStrokeStyle(on ? 3 : 2, on ? 0xffd93d : 0x58d3ff, on ? 1 : 0.7);
          tb.t.setColor(on ? '#ffd93d' : '#aaa');
        }
        renderTab();
      });
      layer.add(bg); layer.add(t);
      tabBgs.push({ bg, t, key: tab.key });
    });
    // 初始高亮
    for (const tb of tabBgs) {
      const on = tb.key === curTab;
      tb.bg.setStrokeStyle(on ? 3 : 2, on ? 0xffd93d : 0x58d3ff, on ? 1 : 0.7);
      tb.t.setColor(on ? '#ffd93d' : '#aaa');
    }

    layer.add(this.add.text(width / 2, height / 2 + PH / 2 - 22, '点击空白处关闭', {
      fontSize: '11px', color: '#666', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui',
    }).setOrigin(0.5));

    layer.setAlpha(0);
    this.tweens.add({ targets: layer, alpha: 1, duration: 200 });
    renderTab();

    const closeIt = () => this.tweens.add({
      targets: layer, alpha: 0, duration: 150,
      onComplete: () => layer.destroy(),
    });
  }

  /** 播放动作动画 (attack/hurt/death/knockup), 完成后回 idle
   *  E3/4: 重新设计 fallback (没 PNG spritesheet 的 25 只龟) — 用 Phaser tween 做出
   *        cinematic 感的 squash/stretch/wind-back/spring-back, 不再 120ms 单 scale 脉冲。
   *        + 稀有度 SS/SSS 加金/银 glow flash, 让大佬看起来分量更重。
   */
  private playAction(view: FighterView, action: 'attack' | 'hurt' | 'death' | 'knockup'): Promise<void> {
    return new Promise((resolve) => {
      const id = view.fighter.id;
      const animKey = `anim-${action}-${id}`;
      const textureKey = `pet-action-${id}-${action}`;
      // 没有 spritesheet → tween fallback (重新设计版本)
      if (!this.anims.exists(animKey) || !this.textures.exists(textureKey)) {
        this.playFallbackAction(view, action).then(resolve);
        return;
      }
      // 用 PNG 动画 (basic/ghost/ninja)
      const s = view.sprite as Phaser.GameObjects.Sprite;
      if (!('play' in s)) { resolve(); return; }
      // P150: 切纹理后必须 re-fit — idle/attack/hurt sheet 帧尺寸不同 (basic idle 64×64,
      //   attack 120×120). 不 re-fit → 攻击帧用 idle scale 渲染 → 尺寸突变 (用户报).
      //   关键: setTexture 后 sp.width 不同步更新 (仍旧值), setDisplaySize 内部用 sp.width
      //   会算错 scale → 必须从纹理 frame 直接读 realWidth/Height + setScale 直设.
      const isBoss = (view.fighter as Fighter & { _isBoss?: boolean })._isBoss === true;
      const box = 80 * (isBoss ? (0.9 * 1.417 * 1.5) : (0.9 * 1.417));
      const refitByTexture = (sp: Phaser.GameObjects.Sprite, texKey: string) => {
        const frame = this.textures.exists(texKey) ? this.textures.getFrame(texKey, 0) : null;
        const fw = (frame?.realWidth as number) || box;
        const fh = (frame?.realHeight as number) || box;
        const sc = Math.min(box / fw, box / fh);
        sp.setScale(sc);   // setScale 不依赖 sp.width; flipX 是独立 flag 不受影响
        // P150 关键: 同步更新 view.homeScaleX/Y — SkillTweenMgr watcher + restoreSpriteHome
        //   每帧把 scale 强制回 homeScaleX. 不同步 → 它们用 idle scale (1.59) 覆盖攻击 scale (0.85)
        //   → 攻击帧 120×1.59=191 突变. 同步后恢复逻辑用当前纹理正确 scale.
        view.homeScaleX = sc;
        view.homeScaleY = sc;
      };
      s.setTexture(textureKey, 0);
      refitByTexture(s, textureKey);
      s.play(animKey);
      s.once('animationcomplete', () => {
        if (action !== 'death' && this.anims.exists(`anim-idle-${id}`)) {
          s.setTexture(`pet-sheet-${id}`, 0);
          refitByTexture(s, `pet-sheet-${id}`);
          s.play(`anim-idle-${id}`);
        }
        resolve();
      });
    });
  }

  /** JS playHurtAnimation 1:1 (combat.js:1055 在中央 applyRawDmg 里触发) —
   *  仅当该龟有受击帧表时播放受击序列 (无 fallback tint/dip; 通用反馈由 floatNum 自身负责)。
   *  挂在中央飘字 floatNum 命中分支, 让**所有**伤害源 (普攻/技能/DOT外的直伤) 都触发受击帧,
   *  而不只是 showDamageVfx 那两条路径 (此前忍者/basic/ghost 受技能伤害时受击帧从不播)。 */
  private playHurtFrames(view: FighterView) {
    if (view.fighter.alive === false) return;
    const id = view.fighter.id;
    if (this.anims.exists(`anim-hurt-${id}`) && this.textures.exists(`pet-action-${id}-hurt`)) {
      this.playAction(view, 'hurt');
    }
  }

  /** J5/J6: 形态变身换贴图 (lava 火山 / cyber 机甲) — JS 用 f.img 换静态形态图 (state.js:606)。
   *  保持原屏幕高度 (锁高缩放, 同 makeView fitToBox), 同步 homeScale 给 watcher; flipX 标志独立保留。 */
  private swapPetTexture(view: FighterView, textureKey: string): void {
    if (!this.textures.exists(textureKey)) return;
    const s = view.sprite;
    const targetH = s.displayHeight || 80;
    s.setTexture(textureKey);
    const frame = this.textures.getFrame(textureKey, '__BASE') ?? this.textures.getFrame(textureKey, 0);
    const fh = (frame?.realHeight as number) || (frame?.height as number) || targetH;
    const fw = (frame?.realWidth as number) || (frame?.width as number) || targetH;
    const scale = targetH / fh;
    s.setDisplaySize(fw * scale, fh * scale);
    try { s.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
    view.homeScaleX = Math.abs(s.scaleX);
    view.homeScaleY = Math.abs(s.scaleY);
  }

  /** E3/4: tween-only 动作 fallback — 给没 PNG 的 25 只龟做出 cinematic 感 */
  private playFallbackAction(view: FighterView, action: 'attack' | 'hurt' | 'death' | 'knockup'): Promise<void> {
    return new Promise((resolve) => {
      const s = view.sprite;
      // 用户报: 忍者龟一技能后骰子龟变大. 根因: 旧代码用 `s.scaleX` 当前值做 sx0 (归位目标),
      // 若前一动画 tween 没还原 (interrupt / fire-and-forget), 这次"归位"就归到错值, 后续累积变形.
      // 修: sx0/sy0 用 homeScaleX/Y (永远是 fitToBox + flipX 后的"真" home), 不读 sprite 当前值.
      // 这等价于 JS .scene-turtle 外层 scale=var(--base-scale) 永不变 — 任何动画都归回 home.
      const sx0 = view.homeScaleX;
      const sy0 = view.homeScaleY;
      // 稀有度配色 — 稀有龟攻击时屏蔽多一道 glow
      const rarity = view.fighter.rarity;
      const glowTint = rarity === 'SSS' ? 0xffd700 : rarity === 'SS' ? 0xe0e0e0 : null;

      if (action === 'attack') {
        // P191: 位移 attack-hop 由 executeAttack 独占 (每次普攻/技能跑唯一一条 hop counter).
        //   旧版这里 *又* 跑一条 hop counter → 两条 counter 抢同一 sprite.x, 在 240ms 交接处猛地
        //   回跳 (executeAttack 此刻 x≈25, fallback 从 0 重新起跳) → 用户报"普通攻击那一下生硬".
        //   无 PNG 攻击帧的龟改为只做"出招 tell": glow + 轻微 scale 脉冲, 不动 x/y, 位移让给 executeAttack.
        if (glowTint !== null) s.setTint(glowTint);
        const pulse = this.tweens.add({
          targets: s, scaleX: sx0 * 1.08, scaleY: sy0 * 1.08,
          duration: 150, yoyo: true, ease: 'Sine.easeInOut',
          onComplete: () => {
            s.setScale(sx0, sy0);
            if (glowTint !== null) s.clearTint();
            resolve();
          },
        });
        (pulse as Phaser.Tweens.BaseTween & { _isSkillTween?: boolean })._isSkillTween = true;
      } else if (action === 'hurt') {
        // 受击: 红 tint + 轻 scale dip。横向位移击退已由 playHitKnockback 统一处理 (JS sceneKnockback),
        //   不再自创 ±12/-6/+4 来回震 (双向 vibration 非 JS, 且与 knockback 抢 sprite.x)。
        s.setTint(0xff6666);
        this.tweens.chain({
          targets: s,
          tweens: [
            { scaleX: sx0 * 0.92, scaleY: sy0 * 1.05, duration: 50, ease: 'power2.in' },
            { scaleX: sx0, scaleY: sy0, duration: 100, ease: 'sine.out' },
          ],
          onComplete: () => {
            s.clearTint();
            resolve();
          },
        });
      } else if (action === 'knockup') {
        // 弹起 + 旋转 + 落回 (400ms)
        const homeY = view.sprite.y;
        this.tweens.chain({
          targets: s,
          tweens: [
            { y: homeY - 40, rotation: 0.4, duration: 180, ease: 'power2.out' },
            { y: homeY, rotation: 0, duration: 220, ease: 'bounce.out' },
          ],
          onComplete: () => resolve(),
        });
      } else {
        // death 单独 D4 处理, 这里 noop
        resolve();
      }
    });
  }

  /** E3/4: 受击瞬间的通用 impact 视效 — 白色环扩散 + 顶端闪点
   *  调用时机: 实际伤害落到 target 时 (替代单纯 camera shake)
   *  isCrit 时 ring 更大更黄
   */
  private playImpactFx(view: FighterView, isCrit: boolean = false): void {
    const { x, y } = view.sprite;
    const color = isCrit ? 0xffd700 : 0xffffff;
    const ringMax = isCrit ? 60 : 36;
    // 圆环扩散
    const ring = this.add.circle(x, y, 4, color, 0).setStrokeStyle(3, color, 0.9).setDepth(48);
    this.tweens.add({
      targets: ring, radius: ringMax, alpha: 0, duration: isCrit ? 380 : 260, ease: 'cubic.out',
      onUpdate: () => ring.setRadius(ring.radius),
      onComplete: () => ring.destroy(),
    });
    // 中心闪点
    const flash = this.add.circle(x, y, isCrit ? 14 : 8, color, 0.9).setDepth(49);
    this.tweens.add({
      targets: flash, alpha: 0, scaleX: 0.4, scaleY: 0.4, duration: isCrit ? 220 : 150, ease: 'cubic.out',
      onComplete: () => flash.destroy(),
    });
    // 4 个迸射粒子 (cross pattern)
    if (isCrit) {
      for (let i = 0; i < 4; i++) {
        const dx = (i === 0 ? 1 : i === 1 ? -1 : 0) * 28;
        const dy = (i === 2 ? -1 : i === 3 ? 1 : 0) * 28;
        const sp = this.add.circle(x, y, 4, color, 1).setDepth(49);
        this.tweens.add({
          targets: sp, x: x + dx, y: y + dy, alpha: 0, scale: 0.3, duration: 280, ease: 'cubic.out',
          onComplete: () => sp.destroy(),
        });
      }
    }
  }

  /** v0.9.5.A69: buff icons 全 — PNG for statuses + text chips for stat buffs (JS renderStatusIcons 同款) */
  /** 图标去糊: 委托共享工具 (大源图预降采样缓存). 见 systems/icon-scale.ts */
  private smallIcon(key: string): string {
    return smallIconKey(this, key, 40);
  }

  private refreshStatusIcons(view: FighterView) {
    // B1 (用户选: 状态全收进详情面板): 龟身体外只保留装备图标 (turtle-hud refreshEquipBadges),
    //   所有 buff/debuff/控制/资源叠层不再画在龟头顶 — 点龟在详情面板看全部状态。
    //   (旧的头顶状态/资源角标渲染整段已移除, 需要时见 git 历史 commit 8ccc540f 之前。)
    view.statusGroup.removeAll(true);
  }

  /** P100 1:1 JS battle.css:608-642 .dmg-stats-panel — DOM overlay (之前 Phaser canvas 自创排版).
   *  右上侧可切换面板, 显示 dmgDealt/dmgTaken 拆 phy/mag/tru stacked bars. */
  private dmgStatsDom?: DmgStatsPanel;
  private get dmgStatsVisible(): boolean { return this.dmgStatsDom?.isVisible() ?? false; }

  private toggleDmgStatsPanel() {
    this.dmgStatsDom?.toggle();
  }

  /** 套用剪影阴影变换: 大小(×身)/压扁(高比)/投射角/深浅/离脚/横偏。scale 跟随 sprite 当前缩放→自动随体型。 */
  private applyShadowTransform(
    shadow: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
    sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
    p: { size: number; flatten: number; rot: number; alpha: number; lift: number; offsetX: number; flipY?: boolean },
  ): void {
    shadow.setOrigin(0.5, 0.5);
    shadow.setFlipX(sprite.flipX);     // 形状跟龟朝向
    shadow.setFlipY(p.flipY === true); // 上下翻转 (投影感)
    shadow.setScale(Math.abs(sprite.scaleX) * p.size, Math.abs(sprite.scaleY) * p.size * p.flatten);
    shadow.setRotation(p.rot * Math.PI / 180);
    shadow.setAlpha(p.alpha);
    const feetY = sprite.y + sprite.displayHeight / 2;
    shadow.x = sprite.x + p.offsetX;
    shadow.y = feetY - p.lift;
  }

  /** 阴影实时调试器 — 拖滑块调全体龟剪影阴影, 底部输出数值供 bake 进 makeView。 */
  private createShadowTuner() {
    if (document.getElementById('poc-shadow-tuner')) return;
    const params = { size: 1.1, flatten: 0.6, rot: 24, alpha: 0.55, lift: 9, offsetX: 22 };
    type PKey = keyof typeof params;
    const rows: Array<[PKey, string, number, number, number]> = [
      ['size', '大小 ×身', 0.3, 4.0, 0.02],
      ['flatten', '压扁 (高比, 小=更扁)', 0.05, 1.5, 0.01],
      ['rot', '投射角 °(右下倾)', -180, 180, 1],
      ['alpha', '深浅 (1=最深 0.05=最淡)', 0.05, 1, 0.05],
      ['lift', '离脚高 px', -40, 150, 1],
      ['offsetX', '左右偏移 px', -150, 150, 1],
    ];
    const root = document.createElement('div');
    root.id = 'poc-shadow-tuner';
    root.style.cssText = 'position:fixed;left:12px;top:120px;z-index:400;background:rgba(8,12,20,.95);border:2px solid #ffd93d;border-radius:8px;padding:10px 12px;width:250px;font-family:monospace;font-size:11px;color:#ddd;box-shadow:0 6px 24px rgba(0,0,0,.6)';
    root.innerHTML =
      '<div style="color:#ffd93d;font-weight:bold;margin-bottom:6px">🌑 阴影调试 <span id="st-close" style="float:right;cursor:pointer;color:#888">✕</span></div>' +
      rows.map(r => { const [k, label, min, max, step] = r; return `<div style="margin:5px 0"><div>${label}: <b id="st-v-${k}">${params[k]}</b></div><input type="range" id="st-${k}" min="${min}" max="${max}" step="${step}" value="${params[k]}" style="width:100%"></div>`; }).join('') +
      '<div style="margin:6px 0;color:#888;font-size:10px">单一太阳: 全场方向统一, 不镜像 (两队同款)</div>' +
      '<div style="margin:6px 0"><label><input type="checkbox" id="st-flipY" checked> 上下翻转</label></div>' +
      '<div style="margin-top:6px"><button id="st-copy" style="width:100%;padding:5px;background:#1a4a2a;color:#9f9;border:1px solid #06d6a0;border-radius:4px;cursor:pointer;font-family:inherit">📋 复制参数</button></div>' +
      '<div style="margin-top:6px;color:#9f9;word-break:break-all;font-size:10px"><span id="st-out"></span></div>';
    document.body.appendChild(root);
    let flipY = true;
    const apply = () => {
      for (const v of this.views) {
        if (!v.shadow || !v.sprite) continue;
        this.applyShadowTransform(v.shadow, v.sprite, { ...params, flipY });   // 全场统一 (单一太阳, 不镜像)
      }
      const out = root.querySelector('#st-out');
      if (out) out.textContent = `size=${params.size} flatten=${params.flatten} rot=${params.rot} alpha=${params.alpha} lift=${params.lift} offsetX=${params.offsetX} flipY=${flipY}`;
    };
    rows.forEach(r => {
      const k = r[0];
      const el = root.querySelector('#st-' + k) as HTMLInputElement | null;
      el?.addEventListener('input', () => {
        params[k] = parseFloat(el.value);
        const vs = root.querySelector('#st-v-' + k);
        if (vs) vs.textContent = el.value;
        apply();
      });
    });
    (root.querySelector('#st-flipY') as HTMLInputElement | null)?.addEventListener('change', (e) => {
      flipY = (e.target as HTMLInputElement).checked; apply();
    });
    root.querySelector('#st-copy')?.addEventListener('click', () => {
      const txt = root.querySelector('#st-out')?.textContent ?? '';
      const btn = root.querySelector('#st-copy') as HTMLButtonElement | null;
      navigator.clipboard?.writeText(txt).then(() => { if (btn) { btn.textContent = '✓ 已复制'; setTimeout(() => { btn.textContent = '📋 复制参数'; }, 1200); } });
    });
    root.querySelector('#st-close')?.addEventListener('click', () => root.remove());
    apply();
    this.events.once('shutdown', () => root.remove());
  }

  // P100: createDmgStatsPanel 改新建 DOM overlay (DmgStatsPanel 实例)
  private createDmgStatsPanel() {
    if (this.dmgStatsDom) return;
    this.dmgStatsDom = new DmgStatsPanel(this);
    this.events.once('shutdown', () => { this.dmgStatsDom?.destroy(); this.dmgStatsDom = undefined; });
  }
  // P100: 旧 Phaser-canvas 自创实现已删, 全部走 DmgStatsPanel (DOM overlay) 1:1 JS HTML.

  /** v0.9.5.D2: rAF auto-refresh — 比对 stack 字段快照, 变化才重渲 (JS ui.js startBadgeAutoRefresh) */
  private _badgeSnapshots: WeakMap<Fighter, Record<string, unknown>> = new WeakMap();
  private _badgeWatchFields: string[] = [
    '_equipCandleStage', '_equipRevolverBullets', '_equipWaveStacks', '_equipDragonEggStacks',
    '_miniCrystallize', '_inkStacks', '_shockStacks', '_goldLightning', '_crystallize',
    '_goldCoins', '_drones', '_lavaTransformTurns', '_undeadLockTurns', '_bambooCharged',
    '_prismColor',
  ];
  private _badgeTickerStarted = false;
  private startBadgeAutoRefresh() {
    if (this._badgeTickerStarted) return;
    this._badgeTickerStarted = true;
    this.events.on('update', () => {
      for (const v of this.views) {
        const f = v.fighter as unknown as Record<string, unknown>;
        let snap = this._badgeSnapshots.get(v.fighter);
        if (!snap) { snap = {}; this._badgeSnapshots.set(v.fighter, snap); }
        let dirty = false;
        for (const k of this._badgeWatchFields) {
          // P16: _drones[] 是数组, 引用不变但 length 会涨; 比 length 而不是 reference
          let cur = f[k];
          if (k === '_drones' && Array.isArray(cur)) cur = cur.length;
          if (snap[k] !== cur) { snap[k] = cur; dirty = true; }
        }
        if (dirty) this.refreshStatusIcons(v);
      }
    });
  }

  /**
   * E3/6: reviveFighter — JS state.js:109-142 1:1 port
   *
   * 共用复活 helper, 被 phoenix / angel / ruleRevive 调用。
   * 严格按 JS 实现, 不简化:
   *   1. hpPct 计算 (含 _synergyRegenReviveBonus +15/+25%, cap 100%)
   *   2. 重置 alive/_deathProcessed/_pendingDeath
   *   3. 清除死亡视觉 (sprite alpha 1, clearTint, 取消死亡 tween)
   *   4. **保留 buffs** (JS 注释 "复活后保留所有增益和减益效果")
   *   5. spawnFloatingText label (crit-label, y=-25 中心偏上)
   *   6. 200ms 后 +HP 飘字 (heal-num, y=0)
   *   7. updateHpBar + renderStatusIcons
   *   8. rAF 后 double-check 死亡视觉没回来
   *   9. log + sfxRebirth
   *   10. onRevive callback (phoenix-specific 副作用)
   */
  private reviveFighter(view: FighterView, opts: {
    hpPct: number;
    label?: string;
    log?: string;
    sfx?: boolean;
    onRevive?: () => void;
  }) {
    const f = view.fighter as Fighter & { _synergyRegenReviveBonus?: number };
    // JS state.js:110-113 — 协同 bonus 加在 hpPct 上, cap 100
    let hpPct = opts.hpPct;
    if (f._synergyRegenReviveBonus) hpPct += f._synergyRegenReviveBonus * 100;
    hpPct = Math.min(100, hpPct);
    f.hp = Math.round(f.maxHp * hpPct / 100);
    // 用户: 复活回血也计入治疗统计 (与自疗同口径 recordHeal(self,self) → 计 healDone+healTaken)。死前为0血, 回血量=新HP。
    if (f.hp > 0) battleStats.recordHeal(f, f, f.hp);
    f.alive = true;
    (f as Fighter & { _deathProcessed?: boolean })._deathProcessed = false;
    (f as Fighter & { _pendingDeath?: boolean })._pendingDeath = false;
    // 清除死亡视觉 (JS 对应 .dead/.death-anim CSS class 移除)
    view.sprite.setAlpha(1);
    view.sprite.clearTint();
    view.sprite.setScale(view.sprite.scaleX < 0 ? -1 : 1, 1);  // 重置 deathHop 旋转
    view.sprite.setRotation(0);
    this.tweens.killTweensOf(view.sprite);  // 取消正在进行的 death tween
    // **NOT** clearing buffs — JS 明确保留 (state.js 注释)

    // 主 label 飘字 (JS state.js:127, y=-25 中心偏上)
    if (opts.label) {
      spawnFloatingText(this, view.sprite.x, view.sprite.y - 25, opts.label, 'crit-label');
    }
    // +HP 飘字 (JS state.js:129, delayMs=200, y=0 中心)
    this.time.delayedCall(200, () => {
      spawnFloatingText(this, view.sprite.x, view.sprite.y, `+${f.hp}HP`, 'heal-num');
    });

    // 更新 HP bar + status icons
    if (view.hpBar) {
      const ratio = f.hp / f.maxHp;
      view.hpBar.width = 118 * ratio;
    }
    if (view.hpText) view.hpText.setText(`${f.hp}/${f.maxHp}`);
    this.refreshStatusIcons(view);

    // rAF double-check (JS state.js:134-138)
    this.time.delayedCall(20, () => {
      view.sprite.setAlpha(1);
      view.sprite.clearTint();
    });

    // Log
    if (opts.log) this.battleLog.log(opts.log);

    // SFX
    if (opts.sfx !== false) {
      try { this.sound.play('sfx-rebirth', { volume: 0.7 }); } catch { /* ignore */ }
    }

    // onRevive 副作用 (phoenix 走这里加 burn+healReduce)
    if (opts.onRevive) opts.onRevive();

    // 再生羁绊 tier3: 复活时对随机敌人造成 1×ATK 魔法 (_synergyRegenReviveAttack — 之前 set flag 从不消费)
    const fa = f as Fighter & { _synergyRegenReviveAttack?: boolean };
    if (fa._synergyRegenReviveAttack) {
      const enemies = this.views.filter(vv => vv.fighter.side !== f.side && vv.fighter.alive);
      if (enemies.length > 0) {
        const tgtV = enemies[Math.floor(Math.random() * enemies.length)];
        const t = tgtV.fighter;
        const dmg = Math.max(1, Math.round(f.atk * calcDmgMult(calcEffMr(f, t))));
        const wasA = t.alive;
        const r = applyRawDamage(t, dmg, 'magic');
        const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        battleStats.recordDamage(f, t, shown, 'mag');
        if (wasA && !t.alive) battleStats.recordKill(f, t);
        spawnFloatingText(this, tgtV.sprite.x, tgtV.sprite.y - 40, `-${shown}🌀`, 'magic-dmg', { amount: shown, atkSide: f.side });
        this.battleLog.log(`⚱ ${f.name} 再生·复活反击 → ${t.name}：${shown} 魔法`);
      }
    }
  }

  /** 处理 burn/poison/bleed/curse DoT 层, 返回总伤害 */
  /** P1.8 死亡 passive 汇聚: phoenix 复活 / undead 锁血 / deathExplode / hunter 击杀偷 / chest 抽装备 */
  private processDeathPassives(deadView: FighterView) {
    const dead = deadView.fighter;

    // ═══════════════════════════════════════════════════════
    // 1. phoenixRebirth — JS state.js:154-181 1:1 port (v0.9.5.E3/6)
    // ═══════════════════════════════════════════════════════
    // JS 检查: f.passive.type === 'phoenixRebirth' && !f._rebirthUsed
    //   - 标志位用 _rebirthUsed (跟 JS 同名, 之前 Phaser 用 _phoenixUsed 是错的)
    //   - 强化版检查 _phoenixEnhancedRebirth flag (跟 JS 同名)
    //   - revivePct 读 passive.revivePct (默认 30%, JS pets.js phoenix passive 配置)
    //     之前 Phaser 写 50% 是错的
    if (dead.passive?.type === 'phoenixRebirth' && !dead._rebirthUsed) {
      dead._rebirthUsed = true;
      const isEnhanced = !!dead._phoenixEnhancedRebirth || dead._passiveSkills?.some?.((ps: { type: string }) =>
        ps.type === 'phoenixEnhancedRebirth');
      const revivePct = (dead.passive.revivePct as number) ?? 30;
      this.reviveFighter(deadView, {
        hpPct: isEnhanced ? 100 : revivePct,
        label: '涅槃重生!',
        log: `🔥🐢 ${dead.name} 涅槃重生! 以 ${isEnhanced ? 100 : revivePct}% HP 复活!`,
        onRevive: () => {
          // 强化版: 永久 +20% baseAtk + 飘字 (JS state.js:162-166)
          if (isEnhanced) {
            const atkBoost = Math.round(dead.baseAtk * 0.20);
            dead.baseAtk += atkBoost;
            dead.atk += atkBoost;
            this.time.delayedCall(400, () => {
              spawnFloatingText(this, deadView.sprite.x, deadView.sprite.y - 40,
                `+${atkBoost}ATK`, 'passive-num');
            });
          }
          // 全体敌人施加灼烧 + 治疗削减 (JS state.js:168-176)
          const enemies = this.views.filter(v => v.fighter.side !== dead.side && v.fighter.alive);
          for (const eView of enemies) {
            const e = eView.fighter;
            // F4: 涅槃灼烧 = applySkillDebuffs({burn:true}) 默认层数 round(atk×0.67) (JS state.js:170)
            //   (旧 PoC 自创 round(atk×0.40+maxHp×0.08) duration4 → 经 tick maxHp 再放大, 远超 JS)
            applyDotStacks(e, 'burn', defaultBurnStacks(dead));
            // 治疗削减: 已存在则刷新 turns, 否则新增
            const existingHR = e.buffs.find(b => b.type === 'healReduce');
            if (existingHR) {
              existingHR.duration = 4;   // 对齐 +1 约定 (其它3回合healReduce用duration:4); 原3→实际少1回合
            } else {
              e.buffs.push({ type: 'healReduce', value: 50, duration: 4 });
            }
            // 飘字 (JS state.js:174): '🔥灼烧+☠️削减' debuff-label, delayMs=300, y=-10
            this.time.delayedCall(300, () => {
              spawnFloatingText(this, eView.sprite.x, eView.sprite.y - 50,
                '🔥灼烧+☠️削减', 'debuff-label');
            });
            this.refreshStatusIcons(eView);
          }
          if (enemies.length > 0) {
            this.battleLog.log(`🔥 ${dead.name} 涅槃之火灼烧全体敌人!`);
          }
        },
      });
      return;
    }

    // ═══════════════════════════════════════════════════════
    // 1b. Angel 圣光复活 — JS state.js:184-191 1:1
    // ═══════════════════════════════════════════════════════
    // 触发: f._angelRevive flag (angel 龟的某 passive skill 启用此 flag)
    if ((dead as Fighter & { _angelRevive?: boolean; _angelReviveUsed?: boolean })._angelRevive
        && !(dead as Fighter & { _angelReviveUsed?: boolean })._angelReviveUsed) {
      (dead as Fighter & { _angelReviveUsed?: boolean })._angelReviveUsed = true;
      this.reviveFighter(deadView, {
        hpPct: 25,
        label: '😇圣光重生!',
        log: `😇 ${dead.name} 圣光之力! 以 25% HP 重生!`,
      });
      return;
    }

    // ═══════════════════════════════════════════════════════
    // 1c. 复活护符 (b_revive equipRevive) — JS state.js:194-211 1:1
    // ═══════════════════════════════════════════════════════
    // 触发: f._equipRevive (大商店 b_revive 购入), 不走 reviveFighter (固定 1 HP 语义)
    if ((dead as Fighter & { _equipRevive?: boolean; _equipReviveUsed?: boolean })._equipRevive
        && !(dead as Fighter & { _equipReviveUsed?: boolean })._equipReviveUsed) {
      (dead as Fighter & { _equipReviveUsed?: boolean })._equipReviveUsed = true;
      dead.alive = true;
      dead.hp = 1;
      (dead as Fighter & { _deathProcessed?: boolean })._deathProcessed = false;
      (dead as Fighter & { _pendingDeath?: boolean })._pendingDeath = false;
      deadView.sprite.setAlpha(1);
      deadView.sprite.clearTint();
      this.tweens.killTweensOf(deadView.sprite);
      spawnFloatingText(this, deadView.sprite.x, deadView.sprite.y - 25, '⚱ 复活护符!', 'crit-label');
      this.time.delayedCall(200, () => {
        spawnFloatingText(this, deadView.sprite.x, deadView.sprite.y, '+1HP', 'heal-num');
      });
      if (deadView.hpBar) deadView.hpBar.width = 118 * dead.hp / dead.maxHp;
      deadView.hpText.setText(`${dead.hp}/${dead.maxHp}`);
      this.refreshStatusIcons(deadView);
      this.battleLog.log(`⚱ ${dead.name} 复活护符触发! 以 1 HP 复活!`);
      try { this.sound.play('sfx-rebirth', { volume: 0.7 }); } catch { /* ignore */ }
      return;
    }

    // ═══════════════════════════════════════════════════════
    // 1d. chestPhoenix 凤凰雕像 — JS state.js:215-222 + action.js:562-604 1:1
    // ═══════════════════════════════════════════════════════
    // 触发: hasChestEquip(f, 'phoenix') && !f._chestReviveUsed
    //   pct 读 _chestEquips.find(e=>e.id==='phoenix').pct (默认 25)
    //   视觉: 800ms 等待 → 8 橙色粒子从 60-100px 外汇聚 → 橙色屏闪 → 复活
    const chestEquips = (dead as Fighter & { _chestEquips?: Array<{ id: string; pct?: number }> })._chestEquips;
    const hasChestPhoenix = chestEquips?.some(e => e.id === 'phoenix');
    if (hasChestPhoenix && !(dead as Fighter & { _chestReviveUsed?: boolean })._chestReviveUsed) {
      (dead as Fighter & { _chestReviveUsed?: boolean })._chestReviveUsed = true;
      dead.alive = true;
      dead.hp = 1;  // 临时 1 HP 保活, 动画完后真正复活值
      (dead as Fighter & { _pendingDeath?: boolean })._pendingDeath = false;
      this.battleLog.log(`🐦 ${dead.name} 被击败... 凤凰雕像开始发光!`);
      // 8 粒子从外向中心汇聚 (JS action.js:572-591)
      this.time.delayedCall(800, () => {
        const cx = deadView.sprite.x, cy = deadView.sprite.y;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const dist = 60 + Math.random() * 40;
          const px = cx + Math.cos(angle) * dist;
          const py = cy + Math.sin(angle) * dist;
          const particle = this.add.circle(px, py, 6, 0xff9f43, 1).setDepth(46);
          // 橙色光晕模拟 box-shadow
          const glow = this.add.circle(px, py, 12, 0xff6600, 0.5).setDepth(45);
          const dur = (0.4 + i * 0.05) * 1000;  // 400-750ms, JS:584 0.4+i*0.05s
          this.tweens.add({
            targets: [particle, glow], x: cx, y: cy, alpha: 0, scale: 0.3,
            duration: dur, ease: 'cubic.in',
            onComplete: () => { particle.destroy(); glow.destroy(); },
          });
        }
      });
      // 橙色全屏闪 (JS action.js:595)
      this.time.delayedCall(1600, () => {
        const { width, height } = this.scale.gameSize;
        const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xff9f43, 0.4).setDepth(195);
        this.tweens.add({
          targets: flash, alpha: 0, duration: 500, onComplete: () => flash.destroy(),
        });
        try { this.sound.play('sfx-rebirth', { volume: 0.7 }); } catch { /* ignore */ }
      });
      // 真正复活 (JS action.js:596-602: sleep 300 后)
      this.time.delayedCall(1900, () => {
        const revivePct = chestEquips?.find(e => e.id === 'phoenix')?.pct ?? 25;
        dead.hp = Math.round(dead.maxHp * revivePct / 100);
        (dead as Fighter & { _deathProcessed?: boolean })._deathProcessed = false;
        deadView.sprite.setAlpha(1);
        deadView.sprite.clearTint();
        deadView.sprite.setRotation(0);
        this.tweens.killTweensOf(deadView.sprite);
        spawnFloatingText(this, deadView.sprite.x, deadView.sprite.y - 25, '🐦凤凰重生!', 'crit-label');
        this.time.delayedCall(200, () => {
          spawnFloatingText(this, deadView.sprite.x, deadView.sprite.y, `+${dead.hp}HP`, 'heal-num');
        });
        if (deadView.hpBar) deadView.hpBar.width = 118 * dead.hp / dead.maxHp;
        deadView.hpText.setText(`${dead.hp}/${dead.maxHp}`);
        this.refreshStatusIcons(deadView);
        this.battleLog.log(`🐦 ${dead.name} 凤凰雕像! 以 ${revivePct}% HP 重生!`);
      });
      return;
    }

    // ═══════════════════════════════════════════════════════
    // 1e. conch 海螺变形 (简化版) — JS equip-effects.js:150-208
    // ═══════════════════════════════════════════════════════
    // 触发: f._equipConch && !f._conchUsed
    // 完整版含 sprite 替换 / 召唤物级联清理 / 装备销毁, 这里简化:
    //   stats 转小虫 + skill 替换 + flag + 飘字 + log
    if ((dead as Fighter & { _equipConch?: boolean; _conchUsed?: boolean })._equipConch
        && !(dead as Fighter & { _conchUsed?: boolean })._conchUsed) {
      (dead as Fighter & { _conchUsed?: boolean })._conchUsed = true;
      // E3/21: 召唤物级联清理 (JS equip-effects.js:153-164)
      // _summon / _pirateShip / _crystalBall 各杀掉, _drones 清空
      const deadAny = dead as Fighter & {
        _summon?: Fighter; _pirateShip?: Fighter; _crystalBall?: Fighter;
        _drones?: Array<unknown>;
      };
      if (deadAny._summon?.alive) {
        deadAny._summon.alive = false;
        deadAny._summon.hp = 0;
      }
      if (deadAny._pirateShip?.alive) {
        deadAny._pirateShip.alive = false;
        deadAny._pirateShip.hp = 0;
      }
      if (deadAny._crystalBall?.alive) {
        deadAny._crystalBall.alive = false;
        deadAny._crystalBall.hp = 0;
      }
      if (Array.isArray(deadAny._drones)) deadAny._drones = [];
      const lv = (dead._level as number) ?? 1;
      const lvBonus = 1 + (lv - 1) * 0.05;
      dead.maxHp = Math.round(150 * lvBonus);
      dead.hp = dead.maxHp;
      dead.baseAtk = Math.round(20 * lvBonus); dead.atk = dead.baseAtk;
      dead.baseDef = 0; dead.def = 0;
      dead.baseMr = 0; dead.mr = 0;
      dead.crit = 0;
      dead.armorPen = 0; dead.armorPenPct = 0;
      dead.magicPen = 0; dead.magicPenPct = 0;
      dead.shield = 0;
      dead.alive = true;
      dead.buffs = [];
      (dead as Fighter & { _isConchWorm?: boolean })._isConchWorm = true;
      dead.name = '海螺小虫'; dead.emoji = '🐛';
      dead.passive = null;   // 新召唤物实体: 清原龟被动/身份 (用户: 不应是原龟, 是独立召唤物)
      // 替换技能: 啃咬 (每回合自动攻击最低血敌人) — JS equip-effects.js:198-200
      dead.skills = [{
        name: '啃咬', type: 'physical', hits: 1, power: 0, pierce: 0,
        cd: 0, cdLeft: 0, atkScale: 1.0,
        brief: '每回合自动攻击当前生命值最低的敌人，造成（{N:ATK}）物理伤害。',
        detail: '海螺小虫每回合末自动咬向当前生命值最低的敌人，造成（100%×攻击力({ATK}) = {N:ATK}）物理伤害。',
      } as Fighter['skills'][0]];
      // 装备清除 (JS equip-effects.js:180-188 全部 _equip* flag 清空)
      const eqAny = dead as Fighter & {
        _equips?: unknown[]; _fortuneEquips?: unknown[];
        _equipConch?: boolean; _equipPearl?: boolean; _equipHammer?: number;
        _equipBackrowBonus?: number; _equipCarapaceCap?: number; _equipCarapaceGain?: number;
        _equipBurn?: boolean; _equipStun?: number; _equipHot?: number; _equipRage?: boolean;
        _equipFlatReduce?: number; _equipMultiHit?: number; _equipReflect?: number;
        _equipSplash?: number; _equipThunderShell?: boolean; _thunderShellStacks?: number;
        _equipThunderBell?: boolean | number; _equipMiniCrystal?: boolean; _equipDragonEgg?: boolean;
        _equipBladeBleed?: number; _equipGhostSquid?: boolean; _equipRevolver?: boolean;
        _equipDart?: boolean; _equipCandle?: boolean; _equipDumbbell?: boolean;
        _equipDoll?: boolean; _equipWave?: boolean;
        _lifestealPct?: number;
        _deathProcessed?: boolean;
      };
      eqAny._equips = [];
      eqAny._fortuneEquips = [];
      eqAny._equipConch = false;
      eqAny._equipPearl = false;
      eqAny._equipHammer = 0;
      eqAny._equipBackrowBonus = 0;
      eqAny._equipCarapaceCap = 0;
      eqAny._equipCarapaceGain = 0;
      eqAny._equipBurn = false;
      eqAny._equipStun = 0;
      eqAny._equipHot = 0;
      eqAny._equipRage = false;
      eqAny._equipFlatReduce = 0;
      eqAny._equipMultiHit = 0;
      eqAny._equipReflect = 0;
      eqAny._equipSplash = 0;
      eqAny._equipThunderShell = false;
      eqAny._thunderShellStacks = 0;
      eqAny._equipThunderBell = false;
      eqAny._equipMiniCrystal = false;
      eqAny._equipDragonEgg = false;
      eqAny._equipBladeBleed = 0;
      eqAny._equipGhostSquid = false;
      eqAny._equipRevolver = false;
      eqAny._equipDart = false;
      eqAny._equipCandle = false;
      eqAny._equipDumbbell = false;
      eqAny._equipDoll = false;
      eqAny._equipWave = false;
      eqAny._lifestealPct = 0;
      eqAny._deathProcessed = false;
      // 视觉
      deadView.sprite.setAlpha(1);
      deadView.sprite.clearTint();
      this.tweens.killTweensOf(deadView.sprite);
      if (deadView.hpBar) deadView.hpBar.width = 118;
      deadView.hpText.setText(`${dead.hp}/${dead.maxHp}`);
      this.refreshStatusIcons(deadView);

      // E3/23: conch sprite swap — JS triggerConchTransform 调 renderFighters 重渲染
      // Phaser 端用 tint 大幅变绿 + emoji 字 overlay 表示小虫 (没 conch-worm sprite 资产)
      // 跟 conch-worm.png 加载到 BootScene 后这里直接 setTexture 替换更佳, 此为临时方案
      deadView.sprite.setTint(0x66cc44);  // 偏绿色 = 虫
      // 头上加 🐛 emoji 永久 overlay (sprite 旁边)
      const wormBadge = this.add.text(deadView.sprite.x, deadView.sprite.y, '🐛', {
        fontSize: '48px', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(deadView.sprite.depth + 1);
      // 把 badge 跟 sprite 绑定位置 (sprite 移动时 badge 跟着)
      const followUpdate = () => {
        if (!dead.alive || !wormBadge.active) return;
        wormBadge.x = deadView.sprite.x;
        wormBadge.y = deadView.sprite.y;
      };
      this.events.on(Phaser.Scenes.Events.UPDATE, followUpdate);
      // 小虫死亡时清掉 badge
      const cleanupBadge = () => {
        wormBadge.destroy();
        this.events.off(Phaser.Scenes.Events.UPDATE, followUpdate);
      };
      (dead as Fighter & { _conchBadgeCleanup?: () => void })._conchBadgeCleanup = cleanupBadge;

      spawnFloatingText(this, deadView.sprite.x, deadView.sprite.y - 30, '🐛 化形小虫!', 'crit-label');
      this.battleLog.log(`🐛 ${dead.name} 复活海螺: 化形为小虫!`);
      return;
    }

    // ═══════════════════════════════════════════════════════
    // 1f. ruleRevive 亡灵之日 — JS state.js:242-249 1:1
    // ═══════════════════════════════════════════════════════
    if ((dead as Fighter & { _ruleRevive?: boolean })._ruleRevive) {
      (dead as Fighter & { _ruleRevive?: boolean })._ruleRevive = false;
      this.reviveFighter(deadView, {
        hpPct: 15,
        label: '💀亡灵复活!',
        log: `💀 ${dead.name} 亡灵之日! 以 15% HP 复活!`,
      });
      return;
    }

    // v0.9.5.A50: ghostEnhancedCurse — 死亡时额外诅咒全体敌人 5 回合
    if (dead._passiveSkills?.some?.((ps: { type: string }) => ps.type === 'ghostEnhancedCurse')) {
      const enemies = this.views.filter(v => v.fighter.side !== dead.side && v.fighter.alive);
      for (const e of enemies) {
        e.fighter.buffs.push({
          type: 'curse',
          value: Math.round(e.fighter.maxHp * 0.05),
          duration: 6,
          _src: dead,   // 致死计入施加者(死亡怨灵的幽灵龟)击杀
        });
      }
      if (enemies.length) this.battleLog.log(`👻 ${dead.name} 死亡怨灵! 敌方全体诅咒 5 回合`);
    }

    // v0.9.5.A90: cyberDrone 死亡变机甲 (JS action.js:299-380 简化版)
    // P16: 读 _drones[].length 替代 _droneCount (字段统一)
    if (dead.passive?.type === 'cyberDrone' && !(dead as Fighter & { _mechFormed?: boolean })._mechFormed) {
      const p = dead.passive;
      const _drArr = (dead as Fighter & { _drones?: unknown[] })._drones;
      const dc = Array.isArray(_drArr) ? _drArr.length : 0;
      if (dc > 0) {
        (dead as Fighter & { _mechFormed?: boolean })._mechFormed = true;
        const lv = ((dead._level as number) ?? 1);
        const hpPer = ((p.mechHpPerBase as number) ?? 30) + ((p.mechHpPerLv as number) ?? 2) * lv;
        const atkPer = ((p.mechAtkPerBase as number) ?? 4.5) + ((p.mechAtkPerLv as number) ?? 0.1) * lv;
        const finalHp = Math.round(hpPer * dc);
        const finalAtk = Math.round(atkPer * dc);

        dead.alive = true;
        dead.maxHp = finalHp; dead.hp = finalHp;
        dead.baseAtk = finalAtk; dead.atk = finalAtk;
        // #8 M11: 强化浮游炮 → 机甲额外获得 3×浮游炮数 护甲与魔抗 (描述承诺, 旧版恒0未实装)
        const mechArmor = (dead as Fighter & { _cyberEnhanced?: boolean })._cyberEnhanced ? 3 * dc : 0;
        dead.baseDef = mechArmor; dead.def = mechArmor; dead.baseMr = mechArmor; dead.mr = mechArmor;
        dead.shield = 0; dead.crit = 0.25;
        dead.buffs = [];
        dead.name = '机甲'; dead.emoji = '🤖';
        // 关键: 标记 _isMech (JS state.js:257) — 否则不进 side-end 自动攻击循环(7305) 且 isNonActor 不认 →
        //   机甲既不自动出手、又被当成玩家可控实体(每回合要手动指挥)。设了它才"召唤物·每回合自动攻击最低血"。
        (dead as Fighter & { _isMech?: boolean })._isMech = true;
        this.swapPetTexture(deadView, 'pet-mech');   // J5: 换机甲本体立绘 (JS action.js f.img)
        // D4: 机甲朝向 — 机甲资源默认朝右 (同 makeView FACING_RIGHT_ASSETS). swapPetTexture 沿用了
        //   原赛博龟(朝左资源)的 flipX → 机甲朝向反了。左方面朝右(不翻)/右方面朝左(翻), 重设。
        deadView.sprite.setFlipX(dead.side === 'right');
        dead.passive = {
          type: 'mechBody', droneCount: dc, mechHpPer: hpPer, mechAtkPer: atkPer,
          brief: `由 ${dc} 个浮游炮组装而成 (Lv.${lv})`,
        };
        dead.skills = [{
          name: '机甲攻击', type: 'physical', hits: 1, power: 0, pierce: 0,
          cd: 0, cdLeft: 0, atkScale: 1.5,
          brief: '每回合自动攻击当前生命值最低的敌人，造成（{N:1.5*ATK}）物理伤害',
          detail: '机甲每回合末自动攻击当前生命值最低的敌人，造成（150%×攻击力({ATK}) = {N:1.5*ATK}）物理伤害（吃护甲）。',
        }];

        // 视觉: 粒子汇聚 + flash + rebirth
        const sx = deadView.sprite.x, sy = deadView.sprite.y;
        const cone = this.add.particles(sx, sy, '__DEFAULT', {
          lifespan: 720, speed: { min: 60, max: 180 },
          scale: { start: 0.8, end: 0 }, alpha: { start: 1, end: 0 },
          tint: [0x4cc9f0, 0x9af6ff, 0xffffff], blendMode: 'ADD',
          quantity: dc * 6, emitting: false,
        }).setDepth(46);
        cone.explode(dc * 6);
        this.time.delayedCall(900, () => cone.destroy());

        // K8: 播放专门的 8 帧机甲组装序列 (JS action.js:306-326 cyber-mech-birth) — 之前加载了却从不播放
        if (this.textures.exists('vfx-cyber-mech-birth') && this.anims.exists('anim-cyber-mech-birth')) {
          const birth = this.add.sprite(sx, sy, 'vfx-cyber-mech-birth').setDepth(47).setDisplaySize(128, 128);
          try { birth.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
          birth.play('anim-cyber-mech-birth');
          birth.once('animationcomplete', () => birth.destroy());
        }

        // 中心闪光 (mech birth)
        const flash = this.add.circle(sx, sy, 40, 0x9af6ff, 0.8).setDepth(47);
        this.tweens.add({
          targets: flash, radius: 90, alpha: 0,
          duration: 720, ease: 'cubic.out',
          onComplete: () => flash.destroy(),
        });
        this.cameras.main.shake(300, 0.012);
        this.sound.play('sfx-rebirth', { volume: 0.7 });

        // HP 条 + 文字回正常 (复活的)
        deadView.hpText.setText(`${dead.hp}/${dead.maxHp}`);
        this.tweens.add({ targets: deadView.hpBar, width: 118, duration: 600, ease: 'cubic.out' });
        deadView.sprite.setAlpha(1).setScale(deadView.sprite.scaleX, deadView.sprite.scaleY);

        this.battleLog.log(`🤖 ${dead.name} 浮游炮组装成机甲! ${finalHp}HP / ${finalAtk}ATK`);
        this.grantShiftSynergy(deadView);   // 换形羁绊: 机甲变身后护盾(+tier3 首次 ATK)
        return;
      }
    }

    // 2. undeadRage — 锁血 1HP 一次 (一次性)
    if (dead.passive?.type === 'undeadRage' && !dead._undeadUsed) {
      dead._undeadUsed = true;
      dead.alive = true;
      dead.hp = 1;
      dead._undeadLockTurns = 2;
      this.battleLog.log(`💀 ${dead.name} 不死狂怒! 锁 1 HP`);
      return;
    }

    // ═══════════════════════════════════════════════════════
    // deathExplode 死亡爆炸 — JS state.js:316-326 1:1
    // ═══════════════════════════════════════════════════════
    // JS: 只对 attacker (killer) 一只造成 maxHp × pct% **物理** 伤害, 不是 AOE
    // 之前 Phaser 是 AOE 20% 真伤, **完全错**
    if (dead.passive?.type === 'deathExplode' && this.currentAttacker && this.currentAttacker.alive) {
      const attacker = this.currentAttacker;
      const attackerView = this.views.find(v => v.fighter === attacker);
      const pct = (dead.passive.pct as number) ?? 30;
      const dmg = Math.round(dead.maxHp * pct / 100);
      attacker.hp = Math.max(0, attacker.hp - dmg);
      if (attackerView) {
        spawnFloatingText(this, attackerView.sprite.x, attackerView.sprite.y - 40,
          `${dmg}💥`, 'phys-dmg', { amount: dmg, atkSide: dead.side });
      }
      try { this.sound.play('sfx-defeat', { volume: 0.4 }); } catch { /* ignore */ }
      this.battleLog.log(`💥 ${dead.name} 死亡爆炸! 对 ${attacker.name} 造成 ${dmg} 物理`);
      if (attacker.hp <= 0) attacker.alive = false;
    }

    // ═══════════════════════════════════════════════════════
    // deathHook / pirateBarrage 死亡钩锁 — JS state.js:328-341 1:1
    // ═══════════════════════════════════════════════════════
    const pType = dead.passive?.type;
    const hookPct = pType === 'deathHook' ? (dead.passive!.pct as number)
                  : pType === 'pirateBarrage' ? ((dead.passive!.deathHookPct as number) ?? 0)
                  : 0;
    // 用户(2026-05-29): 死亡钩子改为对【随机存活敌人】(原依赖 currentAttacker → DoT/同时死亡时不触发)。
    //   双方同时死亡(deal AOE 同时清场) → 无存活敌人 → enemies 为空 → 跳过, 不崩。
    const hookEnemies = hookPct > 0
      ? this.views.filter(v => v.fighter.alive && v.fighter.side !== dead.side).map(v => v.fighter)
      : [];
    if (hookEnemies.length > 0) {
      const attacker = hookEnemies[Math.floor(Math.random() * hookEnemies.length)];
      const attackerView = this.views.find(v => v.fighter === attacker);
      const dmg = Math.round(dead.maxHp * hookPct / 100);
      // JS 走 applyRawDmg pierce=true true-type
      const wasAlive = attacker.alive;
      const r = applyRawDamage(attacker, dmg, 'true', true);
      const shown = r.hpLoss + r.shieldAbs + (r.bubbleAbs ?? 0) + (r.auraAbs ?? 0);
      battleStats.recordDamage(dead, attacker, shown, 'tru');   // 计入战绩 (原死亡钩锁伤害不进统计)
      if (attackerView) {
        spawnFloatingText(this, attackerView.sprite.x, attackerView.sprite.y - 40,
          `${shown}`, 'true-dmg', { amount: shown, atkSide: dead.side });
      }
      this.battleLog.log(`⚓ ${dead.name} 钩锁! 对 ${attacker.name} 造成 ${shown} 真实`);
      // G5: JS state.js:338 钩锁伤害后触发 on-hit 链 (吸血/装备/反击/结晶 等)
      triggerOnHitEffects(dead, attacker, dmg, {
        floatNum: (t, txt, c) => { const tv = this.views.find(vv => vv.fighter === t); if (tv) this.spawnFloatingPassive(tv, txt, c); },
      });
      if (wasAlive && attacker.hp <= 0) { attacker.alive = false; battleStats.recordKill(dead, attacker); }
    }

    // ═══════════════════════════════════════════════════════
    // healOnKill 击杀回血 — JS state.js:360-368 1:1
    // ═══════════════════════════════════════════════════════
    if (this.currentAttacker && this.currentAttacker.alive
        && this.currentAttacker.passive?.type === 'healOnKill') {
      const attacker = this.currentAttacker;
      const attackerView = this.views.find(v => v.fighter === attacker);
      const pct = (attacker.passive!.pct as number) ?? 10;
      const heal = Math.round(attacker.maxHp * pct / 100);
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
      if (attackerView) {
        // JS:365 delayMs=400, heal-num
        this.time.delayedCall(400, () => {
          spawnFloatingText(this, attackerView.sprite.x, attackerView.sprite.y, `+${heal}`, 'heal-num');
        });
      }
      this.battleLog.log(`💚 ${attacker.name} 击杀回血 ${heal} HP`);
    }

    // ═══════════════════════════════════════════════════════
    // fortuneGold 财神金币 — JS state.js:425-434 1:1
    // ═══════════════════════════════════════════════════════
    // 任何死亡时, 所有活的 fortuneGold 龟 +9 金币 + 飘字
    const fortunes = this.views.filter(v =>
      v.fighter.alive && v.fighter.passive?.type === 'fortuneGold');
    for (const fg of fortunes) {
      const fgF = fg.fighter as Fighter & { _goldCoins?: number };
      fgF._goldCoins = (fgF._goldCoins ?? 0) + 9;
      // 飘字: 统一用 💰 (与每回合/聚财/骰子一致), passive-num delayMs=500
      this.time.delayedCall(500, () => {
        spawnFloatingText(this, fg.sprite.x, fg.sprite.y, `+9💰`, 'passive-num');
      });
      this.refreshStatusIcons(fg);
      this.battleLog.log(`🪙 ${fg.fighter.name} 阵亡金币 +9 (共 ${fgF._goldCoins})`);
    }

    // ═══════════════════════════════════════════════════════
    // hunterKill 猎杀吸收 — JS state.js:397-423 1:1
    // ═══════════════════════════════════════════════════════
    // JS: stealPct 来自 hunter.passive.stealPct, 不是硬编码
    // 偷 dead 的 baseAtk/baseDef/baseMr/maxHp 各 stealPct%
    // 跟踪 _hunterKills + _hunterStolenAtk/Def/Mr/Hp 累积
    // 含 lifesteal bonus (passive.lifesteal)
    // 飘字: '+Atk+Def+Mr+HP' passive-num delayMs=300, y=0
    // 用户 2026-05-29: 「任何敌人死亡就算」— 不再要求猎人本人是击杀者。
    //   只要有敌方单位死亡 (任何死因: 队友击杀/DoT/处决/自爆), 在场所有猎人各窃取一次。
    const hunters = this.views.filter(v =>
      v.fighter.alive && v.fighter.passive?.type === 'hunterKill' && v.fighter.side !== dead.side
    );
    for (const h of hunters) {
      const hf = h.fighter as Fighter & {
        _hunterKills?: number; _hunterStolenAtk?: number; _hunterStolenDef?: number;
        _hunterStolenMr?: number; _hunterStolenHp?: number; _lifestealPct?: number;
      };
      const stealPct = (hf.passive!.stealPct as number) ?? 5;
      const sAtk = Math.round(dead.baseAtk * stealPct / 100);
      const sDef = Math.round(dead.baseDef * stealPct / 100);
      const sMr = Math.round((dead.baseMr ?? dead.baseDef) * stealPct / 100);
      const sHp = Math.round(dead.maxHp * stealPct / 100);
      hf.baseAtk += sAtk;
      hf.atk = hf.baseAtk;
      hf.baseDef += sDef;
      hf.def = hf.baseDef;
      hf.baseMr = (hf.baseMr ?? hf.baseDef) + sMr;
      hf.mr = hf.baseMr;
      hf.maxHp += sHp;
      hf.hp += sHp;
      hf._hunterKills = (hf._hunterKills ?? 0) + 1;
      hf._hunterStolenAtk = (hf._hunterStolenAtk ?? 0) + sAtk;
      hf._hunterStolenDef = (hf._hunterStolenDef ?? 0) + sDef;
      hf._hunterStolenMr = (hf._hunterStolenMr ?? 0) + sMr;
      hf._hunterStolenHp = (hf._hunterStolenHp ?? 0) + sHp;
      // G11: JS state.js:413-416 把偷取 HP 计入猎人输出统计 (_dmgDealt + 真伤 bar)
      battleStats.recordDamage(h.fighter, dead, sHp, 'tru');
      const lifesteal = hf.passive!.lifesteal as number | undefined;
      if (lifesteal) hf._lifestealPct = (hf._lifestealPct ?? 0) + lifesteal;
      // 飘字 (JS:418): passive-num delayMs=300
      this.time.delayedCall(300, () => {
        spawnFloatingText(this, h.sprite.x, h.sprite.y,
          `+${sAtk}攻+${sDef}甲+${sMr}抗+${sHp}HP`, 'passive-num');
      });
      // HP bar 刷新
      if (h.hpBar) h.hpBar.width = 118 * hf.hp / hf.maxHp;
      h.hpText.setText(`${hf.hp}/${hf.maxHp}`);
      this.battleLog.log(`🏹 ${h.fighter.name} 猎杀吸收! 攻+${sAtk} 甲+${sDef} 抗+${sMr} HP+${sHp}`);
    }

    // P143: chestTreasure 财宝累积已移到 on-hit (setChestTreasureHook, 按造成伤害量 1:1 JS).
    //   之前这里在敌方死亡 +dead.maxHp 是自创 — JS 只按伤害累积, 删.
  }

  /** v0.9.5.C3: 宝箱龟 treasure 累积 + 阈值触发 5 池抽装备 (JS state.js:843-880) */
  private processChestTreasureGain(view: FighterView, gain: number) {
    const f = view.fighter as Fighter & {
      _chestTreasure?: number; _chestTier?: number;
      _chestEquips?: Array<{ id: string; icon: string; name: string; desc: string; stat: string; pct?: number; bonusHp?: number }>;
      _chestGreed?: boolean;
    };
    const p = f.passive;
    if (!p || p.type !== 'chestTreasure') return;
    // 寻宝直觉 (chestIntuition) 装备时阈值整体降低 (JS pets.js:720-722); 之前 flag 设了从未被读
    const thresholds = (f as Fighter & { _chestIntuition?: boolean })._chestIntuition
      ? [60, 120, 220, 350, 500]
      : ((p.thresholds as number[]) ?? [80, 130, 240, 360, 590]);
    const pools = (p.pools as Array<Array<{ id: string; icon: string; name: string; desc: string; stat: string; pct?: number; bonusHp?: number }>>) ?? [];
    const lvMult = 1 + (((f._level as number) ?? 1) - 1) * 0.03;
    const scaledThresh = (i: number) => Math.round(thresholds[i] * lvMult);
    const healPctByPool = [8, 11, 15];
    f._chestTreasure = (f._chestTreasure ?? 0) + gain;
    f._chestEquips = f._chestEquips ?? [];

    while ((f._chestTier ?? 0) < thresholds.length && (f._chestTreasure ?? 0) >= scaledThresh(f._chestTier ?? 0)) {
      const tier = f._chestTier ?? 0;
      const poolIdx = tier < 2 ? 0 : tier < 4 ? 1 : 2;
      const pool = pools[poolIdx];
      if (!pool || pool.length === 0) { f._chestTier = tier + 1; continue; }
      const owned = f._chestEquips.map(e => e.id);
      const available = pool.filter(e => !owned.includes(e.id));
      if (available.length === 0) { f._chestTier = tier + 1; continue; }
      const drawn = available[Math.floor(Math.random() * available.length)];
      f._chestEquips.push({ ...drawn });
      f._chestTier = tier + 1;

      // 应用 stat (atk / defMr / crit / lifesteal / hot / burn / healReduce / revive / crown / chain / rock / thunder / star)
      this.applyChestEquipStat(view, drawn);
      // 修(2026-05-30 用户报"宝箱龟生命偷取显示 80%"): 应用后立即 recalc, 让 lifestealPct/crit 等 buff
      //   类字段同步进 f 的小数 % (否则要等下回合 turn-begin recalc, 面板显示+实战伤害都滞后一回合)。
      if ((f as Fighter & { _baseCrit?: number })._baseCrit === undefined) snapshotBaseStats(f);
      recalcStats(f, this.views.filter(v => v.fighter.side === f.side && v.fighter.alive).map(v => v.fighter));

      // Heal
      const healPct = healPctByPool[poolIdx];
      const healAmt = Math.round(f.maxHp * healPct / 100);
      const before = f.hp;
      f.hp = Math.min(f.maxHp, f.hp + healAmt);
      const actual = f.hp - before;
      if (actual > 0) {
        this.tweens.add({ targets: view.hpBar, width: 118 * (f.hp / f.maxHp), duration: 200 });
        view.hpText.setText(`${f.hp}/${f.maxHp}`);
      }

      this.spawnFloatingPassive(view, `📦 ${drawn.name}!`, '#ffd93d');
      this.battleLog.log(`📦 ${f.name} <b>开宝箱</b> → ${drawn.name} (+${actual}HP)`);
    }
  }

  /** v0.9.5.C3: 宝箱装备 stat 应用 (JS state.js:882-899) */
  private applyChestEquipStat(view: FighterView, equip: { stat: string; pct?: number; bonusHp?: number }) {
    const f = view.fighter as Fighter & { _chestEquipStar?: boolean; _chestEquipThunder?: boolean; _chestEquipChain?: boolean; _chestEquipRock?: boolean; _chestEquipRum?: boolean; _chestEquipFire?: boolean; _chestEquipPoison?: boolean; _chestEquipRevive?: boolean; _chestEquipRumPct?: number };
    const pct = equip.pct ?? 0;
    switch (equip.stat) {
      case 'atk':
        f.baseAtk += Math.round(f.baseAtk * pct / 100);
        f.atk = f.baseAtk;
        break;
      case 'defMr':
        f.baseDef += Math.round(f.baseDef * pct / 100);
        f.baseMr = (f.baseMr ?? f.baseDef) + Math.round((f.baseMr ?? f.baseDef) * pct / 100);
        f.def = f.baseDef; f.mr = f.baseMr;
        if (equip.bonusHp) {
          f.maxHp += equip.bonusHp;
          f.hp += equip.bonusHp;
        }
        break;
      case 'crit':
        f.crit = Math.min(1, f.crit + pct / 100);
        break;
      case 'lifesteal':
        f._lifestealPct = ((f._lifestealPct as number) ?? 0) + pct;
        break;
      case 'crown':
        f.baseAtk += Math.round(f.baseAtk * 40 / 100);
        f.atk = f.baseAtk;
        f.crit = Math.min(1, f.crit + 0.40);
        f._extraCritDmgPerm = ((f._extraCritDmgPerm as number) ?? 0) + 0.25;
        f._lifestealPct = ((f._lifestealPct as number) ?? 0) + 15;
        break;
      case 'hot':
        // 海盗龟酒: 每回合回 X% maxHp (turn-begin 处理, 设 flag)
        f._chestEquipRum = true;
        f._chestEquipRumPct = pct;
        break;
      case 'trueDmg':
        // 修(2026-05-30 用户报"宝箱龟星辉完全没生效"): 池里 star 装备的 `equip.stat === 'trueDmg'`
        //   (pets.ts:3034), 但旧 case 写的 'star' → 永远不匹配 → _chestEquipStar 永不设 → 所有伤害转真伤 dead。
        //   改 case 跟 pool 的 stat 字段对齐。(P87 那次只修了 flag 命名, 没核 case 跟 stat 对不上。)
        f._chestEquipStar = true;
        break;
      case 'thunder':
        f._chestEquipThunder = true;
        break;
      case 'chain':
        f._chestEquipChain = true;
        break;
      case 'rock':
        f._chestEquipRock = true;
        break;
      case 'burn':
        f._chestEquipFire = true;
        break;
      case 'healReduce':
        f._chestEquipPoison = true;
        break;
      case 'revive':
        f._chestEquipRevive = true;
        break;
    }
    // 贪婪 passive +4% ATK +7% maxHP per equip
    if (f._chestGreed) {
      const atkBonus = Math.round(f.baseAtk * 0.04);
      const hpBonus = Math.round(f.maxHp * 0.07);
      f.baseAtk += atkBonus; f.atk = f.baseAtk;
      f.maxHp += hpBonus; f.hp += hpBonus;
    }
  }

  /** P23 confirmSurrender — JS engine.js confirmSurrender 简化版
   *  弹 modal "确定退出战斗?" + 确定/取消. 用户报 "点 ← 直接退出, 没确认".
   */
  private confirmSurrender() {
    const old = document.getElementById('poc-surrender-modal');
    if (old) old.remove();
    const modal = document.createElement('div');
    modal.id = 'poc-surrender-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.72);backdrop-filter:blur(4px);font-family:pixel-zh, "Microsoft YaHei",sans-serif';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
      <div style="background:linear-gradient(135deg,#1a2740,#0e1828);border:2px solid #58a6ff;border-radius:12px;padding:24px 28px;max-width:380px;width:80%;color:#dde;box-shadow:0 8px 30px rgba(0,0,0,.6);text-align:center">
        <div style="font-size:18px;color:#ffd93d;font-weight:700;margin-bottom:12px">⚠️ 退出战斗</div>
        <div style="font-size:14px;color:#bcd;margin-bottom:18px;line-height:1.6">真的要放弃这场战斗吗?<br>本局进度将丢失.</div>
        <div style="display:flex;gap:12px;justify-content:center">
          <button id="poc-surr-cancel" style="background:#333;color:#fff;border:none;padding:8px 18px;border-radius:6px;font-size:13px;cursor:pointer">取消</button>
          <button id="poc-surr-ok" style="background:#c94545;color:#fff;border:none;padding:8px 18px;border-radius:6px;font-size:13px;cursor:pointer;font-weight:700">确定退出</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#poc-surr-cancel')?.addEventListener('click', () => modal.remove());
    modal.querySelector('#poc-surr-ok')?.addEventListener('click', () => {
      modal.remove();
      this.backToMenu();
    });
  }

  /** P23 showSynergyDetail — JS synergies.js:335-368 1:1
   *  弹 480px 卡片 modal: emoji + name + ✕ + tier 2 / tier 3 描述, 当前档高亮 (金辉 box-shadow + "(当前激活)").
   *  之前 poc 走 showCenterBanner 单行 64px 大字幕 — 完全错位.
   */
  private showSynergyDetail(tag: string, currentTier: number) {
    const cfg = SYNERGY_TAGS[tag as keyof typeof SYNERGY_TAGS];
    if (!cfg) return;
    const t2 = cfg.tier2 ? cfg.tier2.desc : '(无 ×2 效果)';
    const t3 = cfg.tier3 ? cfg.tier3.desc : '(无 ×3 效果)';
    // 移除旧 modal
    const old = document.getElementById('poc-synergy-detail-modal');
    if (old) old.remove();
    const modal = document.createElement('div');
    modal.id = 'poc-synergy-detail-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);font-family:pixel-zh, "Microsoft YaHei",sans-serif';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
      <div style="background:linear-gradient(135deg,#1a2740,#0e1828);border:2px solid #58a6ff;border-radius:12px;padding:24px 28px;max-width:480px;width:90%;color:#dde;box-shadow:0 8px 30px rgba(0,0,0,.6)">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <span style="font-size:32px">${cfg.emoji ?? '⚔'}</span>
          <h3 style="margin:0;font-size:22px;color:#ffd93d">${cfg.name}</h3>
          <button id="poc-syn-close" style="margin-left:auto;background:#333;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer">✕</button>
        </div>
        <div style="margin-bottom:12px;padding:10px 12px;background:rgba(150,150,180,.12);border-left:3px solid #aaa;border-radius:4px;${currentTier === 2 ? 'box-shadow:0 0 12px rgba(255,217,61,.4)' : 'opacity:.7'}">
          <div style="font-weight:700;color:#cfd0d8;margin-bottom:4px">×2 ${currentTier === 2 ? '<span style="color:#ffd93d">(当前激活)</span>' : ''}</div>
          <div style="font-size:13px;line-height:1.6">${t2}</div>
        </div>
        <div style="padding:10px 12px;background:rgba(255,215,0,.1);border-left:3px solid #ffd93d;border-radius:4px;${currentTier === 3 ? 'box-shadow:0 0 12px rgba(255,217,61,.4)' : 'opacity:.7'}">
          <div style="font-weight:700;color:#ffd93d;margin-bottom:4px">×3 ${currentTier === 3 ? '<span>(当前激活)</span>' : ''}</div>
          <div style="font-size:13px;line-height:1.6">${t3}</div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#poc-syn-close')?.addEventListener('click', () => modal.remove());
  }

  /** P23 showCenterBanner — 1:1 JS showTurnStartBanner (battle-setup.js:72-86 + battle.css:1826-1835)
   *  DOM overlay: 36px gold text + letter-spacing 6px + .9s slide-in (-30%→0→0→+30%) + 副标题.
   *  之前 Phaser 64px scale-pop 是 poc 自创. */
  private _turnBannerCssInstalled = false;
  private installTurnBannerCss() {
    if (this._turnBannerCssInstalled) return;
    this._turnBannerCssInstalled = true;
    const st = document.createElement('style');
    st.textContent = `
      .poc-turn-banner {
        position: fixed; inset: 0; z-index: 9998;
        display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: opacity .25s ease;
        pointer-events: none;
        font-family: 'pixel-zh', 'Microsoft YaHei', system-ui, sans-serif;
      }
      .poc-turn-banner.show { opacity: 1; }
      .poc-turn-banner-inner {
        background: linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(20,30,60,.92) 25%, rgba(20,30,60,.92) 75%, rgba(0,0,0,0) 100%);
        padding: 18px 64px;
        text-align: center;
        border-top: 2px solid rgba(255,215,61,.5);
        border-bottom: 2px solid rgba(255,215,61,.5);
        transform: translateX(-30%);
        animation: poc-turn-banner-slide .9s ease forwards;
        min-width: 60%;
      }
      .poc-turn-banner-text {
        font-size: 36px; font-weight: 900; color: #ffd93d;
        text-shadow: 0 0 14px rgba(255,215,0,.45), 0 2px 4px rgba(0,0,0,.6);
        letter-spacing: 6px;
      }
      .poc-turn-banner-sub {
        font-size: 14px; color: #cdd; margin-top: 4px;
        letter-spacing: 3px; opacity: .8;
      }
      @keyframes poc-turn-banner-slide {
        0%   { transform: translateX(-30%); opacity: 0; }
        30%  { transform: translateX(0); opacity: 1; }
        70%  { transform: translateX(0); opacity: 1; }
        100% { transform: translateX(30%); opacity: 0; }
      }
    `;
    document.head.appendChild(st);
  }
  private showCenterBanner(text: string, durationMs: number = 1100, _color: string = '#ffd93d', sub?: string) {
    this.installTurnBannerCss();
    const el = document.createElement('div');
    el.className = 'poc-turn-banner';
    el.innerHTML = `<div class="poc-turn-banner-inner">
      <div class="poc-turn-banner-text">${text}</div>
      ${sub ? `<div class="poc-turn-banner-sub">${sub}</div>` : ''}
    </div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
    }, durationMs);
  }

  /** P17 showSkillAnnounce — JS ui.js:1124-1142 + scene.css:367-371 1:1
   *  屏幕中心 (top:50% left:50%) 半透明黑底 (rgba(0,0,0,.75) + blur(4px) + 边 rgba(255,255,255,.1))
   *  innerHTML: petIcon(28) + name(稀有度色) + arrow(#aaa 14px) + skill(#fff)
   *  动画: 600ms (0% opacity:0 scale:.8 → 15% opacity:1 scale:1.05 → 30% scale:1 → 80% opacity:1 → 100% opacity:0 translateY(-10))
   *  setTimeout(hide, 1200) — banner 总寿命 ~1.2s
   */
  private _skillAnnounceContainer?: Phaser.GameObjects.Container;
  private showSkillAnnounce(actor: FighterView, skillName: string) {
    const { width, height } = this.scale.gameSize;
    const RARITY_HEX: Record<string, string> = {
      C: '#06d6a0', B: '#4cc9f0', A: '#3a9abf',
      S: '#c77dff', SS: '#ffd93d', SSS: '#ff6b6b',
    };
    const nameColor = RARITY_HEX[actor.fighter.rarity as keyof typeof RARITY_HEX] ?? '#fff';

    // 清掉旧的 banner (re-cast 时 JS animation 重新触发)
    if (this._skillAnnounceContainer) {
      this._skillAnnounceContainer.destroy();
      this._skillAnnounceContainer = undefined;
    }

    // JS:屏幕中心 (poc 用 width/2, height/2). 加 depth:80 比 cut-in (60) 高
    const container = this.add.container(width / 2, height / 2).setDepth(80).setAlpha(0);
    // JS scene.css:367 — rgba(0,0,0,.75) bg + 1px rgba(255,255,255,.1) border + padding 8x20 + radius 8
    const bg = this.add.rectangle(0, 0, 440, 40, 0x000000, 0.75).setStrokeStyle(1, 0xffffff, 0.1);
    container.add(bg);
    // 龟头像 28px (JS:ui.js:1137 petIcon(f, 28))
    const iconKey = `pet-${actor.fighter.id}`;
    const iconX = -190;
    if (this.textures.exists(iconKey)) {
      const icon = this.add.image(iconX, 0, iconKey).setDisplaySize(28, 28);
      container.add(icon);
    } else {
      container.add(this.add.text(iconX, 0, actor.fighter.emoji ?? '🐢', {
        fontSize: '24px', fontFamily: 'monospace',
      }).setOrigin(0.5));
    }
    // 名字 (16px 稀有度色, JS: .sa-name 16px)
    const nameText = this.add.text(iconX + 22, 0, actor.fighter.name, {
      fontSize: '16px', color: nameColor, fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    container.add(nameText);
    // 箭头 14px #aaa (JS: .sa-arrow 14px gray)
    const nameW = nameText.width;
    container.add(this.add.text(iconX + 22 + nameW + 8, 0, '▸', {
      fontSize: '14px', color: '#aaa', fontFamily: 'monospace',
    }).setOrigin(0, 0.5));
    // 技能名 (16px 白 — JS: .sa-skill 16px white, 之前 poc 用 #fff3a0 错)
    container.add(this.add.text(iconX + 22 + nameW + 26, 0, skillName, {
      fontSize: '16px', color: '#ffffff', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
    }).setOrigin(0, 0.5));

    this._skillAnnounceContainer = container;

    // JS @keyframes skillAnnounce (600ms ease forwards):
    //   0%   opacity:0 scale:.8
    //   15%  opacity:1 scale:1.05   (= 90ms)
    //   30%  scale:1                (= 180ms)
    //   80%  opacity:1              (= 480ms hold)
    //   100% opacity:0 translateY(-10)  (= 600ms)
    // poc 用 chained tweens 模拟:
    container.setScale(0.8).setAlpha(0);
    this.tweens.chain({
      targets: container,
      tweens: [
        { alpha: 1, scaleX: 1.05, scaleY: 1.05, duration: 90,  ease: 'sine.out' },
        { scaleX: 1, scaleY: 1,                  duration: 90,  ease: 'sine.out' },
        { alpha: 1,                              duration: 300 },  // hold
        { alpha: 0, y: height / 2 - 10,         duration: 120, ease: 'sine.in' },
      ],
      onComplete: () => {
        container.destroy();
        if (this._skillAnnounceContainer === container) this._skillAnnounceContainer = undefined;
      },
    });
    // setTimeout(hide, 1200) 兜底 (JS:ui.js:1141)
    this.time.delayedCall(1200, () => {
      if (container.active) {
        container.destroy();
        if (this._skillAnnounceContainer === container) this._skillAnnounceContainer = undefined;
      }
    });
  }

  /** P17 helper: announce + 600ms wait + runSkillHandler + endTurn
   *  JS action.js:511-512 1:1 — 选目标 / AoE / selfCast 三路都要走 announce.
   *  executeAttack (有 attack-hop 的单体打击) 走自己的 announce 路径在 hop 前.
   */
  /** P19 A7: 通用前跳 hop (1:1 JS ui-anim.js playAttackAnimation — 任何技能都 hop)。
   *  抽出复用: 自施/群体/AoE 技能 (castWithAnnounce) 之前完全没 hop, 只有定向攻击有。
   *  自驱位移的技能 (basicSlam/气波/忍者) 由 caller 跳过。 */
  private playAttackHop(actor: FighterView): void {
    const att = actor.fighter;
    const dir = att.side === 'left' ? 1 : -1;
    const homeX = actor.homeX, homeY = actor.homeY;
    const keyframes: Array<{ t: number; x: number; y: number }> = [
      { t: 0, x: 0, y: 0 }, { t: 0.15, x: dir * 18, y: -6 }, { t: 0.20, x: dir * 25, y: 0 },
      { t: 0.80, x: dir * 25, y: 0 }, { t: 0.95, x: dir * 5, y: -3 }, { t: 1.0, x: 0, y: 0 },
    ];
    actor._inHop = true;
    const counter = this.tweens.addCounter({
      from: 0, to: 1, duration: 1200, ease: 'Linear',
      onUpdate: (tween) => {
        const p = tween.getValue() ?? 0;
        let kIdx = 0;
        for (let i = 0; i < keyframes.length - 1; i++) {
          if (p >= keyframes[i].t && p <= keyframes[i + 1].t) { kIdx = i; break; }
          if (p > keyframes[i + 1].t) kIdx = i + 1;
        }
        const a = keyframes[kIdx], b = keyframes[Math.min(kIdx + 1, keyframes.length - 1)];
        const span = b.t - a.t;
        const localRaw = span > 0 ? Math.max(0, Math.min(1, (p - a.t) / span)) : 0;
        const local = localRaw * localRaw * (3 - 2 * localRaw);
        const dx = a.x + (b.x - a.x) * local, dy = a.y + (b.y - a.y) * local;
        actor.sprite.x = homeX + dx; actor.sprite.y = homeY + dy;
        if (actor.shadow) actor.shadow.x = homeX + dx + (actor.shadowDirX ?? 0);   // 保持方向性偏移
      },
      onComplete: () => {
        actor.sprite.x = homeX; actor.sprite.y = homeY;
        if (actor.shadow) actor.shadow.x = homeX + (actor.shadowDirX ?? 0);   // 保持方向性偏移
        actor._inHop = false;
      },
    });
    (counter as Phaser.Tweens.BaseTween & { _isSkillTween?: boolean })._isSkillTween = true;
  }

  private async castWithAnnounce(actor: FighterView, target: FighterView | null, skillIdx: number) {
    const skill = actor.fighter.skills[skillIdx];
    if (skill) {
      this.showSkillAnnounce(actor, skill.name);
      await new Promise<void>(r => this.time.delayedCall(600, () => r()));
    }
    // P19 A7: 自施/群体/AoE 技能也前跳 (1:1 JS playAttackAnimation 任何技能都 hop) — 之前完全没 hop。
    //   自驱位移的技能跳过 (它们 handler 自己控制 caster 位移)。
    const SELF_DRIVE = new Set(['basicSlam', 'basicChiWave', 'ninjaImpact', 'ninjaBackstab']);
    if (skill && !SELF_DRIVE.has(skill.type)) {
      this.playAttackHop(actor);
      this.playAction(actor, 'attack');
    }
    await this.runSkillHandler(actor, target, skillIdx);   // 内部已在末尾跑 processHunterExecute (即时猎杀)
    this.endTurn();
  }

  /** P2.12 crit 全屏白闪 */
  private flashCritScreen() {
    const { width, height } = this.scale.gameSize;
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0)
      .setDepth(95);
    this.tweens.add({
      targets: flash, alpha: 0.4, duration: 80, yoyo: true,
      onComplete: () => flash.destroy(),
    });
  }

  /** v0.9.5.A50: 战斗开始时各 fighter 登场触发的 passive (JS engine.js 对齐)
   *  - ghostCurse: 全体敌方诅咒 N 回合
   *  - 其他登场被动 (frostAura registers bonusTargets etc) 在 createFighter 已处理
   */
  private triggerEnterPassives() {
    for (const v of this.views) {
      const f = v.fighter;
      const p = f.passive;
      if (!p) continue;
      // ghostCurse: 登场诅咒全体敌人 (turns 默认 3, value=5% maxHp 真伤/回合)
      if (p.type === 'ghostCurse') {
        const turns = (p.turns as number) ?? 3;
        const pct = (p.hpPct as number) ?? 5;
        const enemies = this.views.filter(x => x.fighter.alive && x.fighter.side !== f.side);
        for (const e of enemies) {
          e.fighter.buffs.push({
            type: 'curse',
            value: Math.round(e.fighter.maxHp * pct / 100),
            duration: turns + 1,
            _src: f,   // 致死计入施加者(怨灵诅咒的幽灵龟)击杀
          });
        }
        if (enemies.length) this.battleLog.log(`👻 ${f.name} <b>怨灵诅咒</b>: 敌方全体 ${turns} 回合`);
      }
      // v0.9.5.A57: frostAura — 登场冰寒。用户(2026-05-28): 用 chilled 状态(与竹击等"冰寒"统一、
      //   状态栏显示❄冰寒图标), 而非 atkDown。chilled 恒 -20% ATK (stats-recalc 只检 type 不读 value),
      //   与原 atkDownPct 20 同效; 下回合 recalc 即生效 (同 atkDown 原时序)。
      if (p.type === 'frostAura') {
        const turns = (p.atkDownTurns as number) ?? 6;
        const enemies = this.views.filter(x => x.fighter.alive && x.fighter.side !== f.side);
        for (const e of enemies) {
          e.fighter.buffs.push({ type: 'chilled', value: 1, duration: turns + 1 });
        }
        if (enemies.length) this.battleLog.log(`❄️ ${f.name} <b>冰寒</b>: 敌方 ATK -20% ${turns} 回合`);
      }
      // twoHeadVitality: 登场即得 shieldPct% maxHp 护盾
      if (p.type === 'twoHeadVitality') {
        const pct = (p.shieldPct as number) ?? 20;
        const amt = Math.round(f.maxHp * pct / 100);
        f.shield = (f.shield || 0) + amt;
      }
      // undeadRage: 设 lifestealBase (固定 22% 基础生命偷取)
      if (p.type === 'undeadRage') {
        const ls = ((p.lifestealBase as number) ?? 22) / 100;
        (f as Fighter & { _baseLifesteal?: number })._baseLifesteal = ls;
        (f as Fighter & { lifestealPct?: number }).lifestealPct = ls;
      }
    }
  }

  /** v0.9.5.A57: undeadRage ATK 加成 — 每回合 recalc 后调用 */
  private applyUndeadRageAtk(f: Fighter): void {
    const p = f.passive;
    if (!p || p.type !== 'undeadRage' || f.maxHp <= 0) return;
    const lostPct = Math.max(0, 1 - f.hp / f.maxHp) * 100;
    const atkMax = (p.atkMaxBonus as number) ?? 100;
    const perLost = (p.atkPerLostPct as number) ?? 1.0;
    const bonusPct = Math.min(atkMax, lostPct * perLost);
    f.atk += Math.round(f.baseAtk * bonusPct / 100);
  }

  /** P2.9 每回合 fighter 行动前其他 passive: fortune/lightning/auraAwaken/twoHeadDual */
  /** 坚壁: 该方回合开始一次性 +护甲 (与出手/眩晕脱钩, nextActor 每方每回合调一次)。
   *  capTurns 回合叠满 maxDefInitPct%×开局护甲, 永久写 baseDef; 进度走血条下黄条 + battleLog。 */
  private applyStoneWallGain(f: Fighter): void {
    const p = f.passive;
    if (!p || p.type !== 'stoneWall' || !f.alive) return;
    const ff = f as Fighter & { _stoneDefGained?: number; _stoneDefFraction?: number; _initDef?: number };
    if (!ff._stoneDefGained) ff._stoneDefGained = 0;
    if (!ff._stoneDefFraction) ff._stoneDefFraction = 0;
    const initDef = ff._initDef ?? f.baseDef;
    const maxCap = Math.round(initDef * ((p.maxDefInitPct as number) ?? 100) / 100);
    if (ff._stoneDefGained >= maxCap) return;
    const capTurns = (p.capTurns as number) ?? 6;
    ff._stoneDefFraction = (ff._stoneDefFraction ?? 0) + maxCap / capTurns;
    const target = Math.min(maxCap, Math.round(ff._stoneDefFraction));
    const gain = target - (ff._stoneDefGained ?? 0);
    if (gain > 0) {
      f.baseDef += gain;
      f.def = f.baseDef;   // recalc 之后 buff 再 apply (与原 turn-begin 行为一致)
      ff._stoneDefGained = target;
      this.battleLog.log(`🪨 ${f.name} <b>坚壁</b> +${gain} 护甲 (累计 +${target}/${maxCap})`);
    }
  }

  private processTurnBeginPassives(view: FighterView) {
    const f = view.fighter;
    // 防"换龟"重复触发: 同一只龟同一回合的"回合开始处理"只跑一次。否则反复重选同一只龟可在一回合内
    //   多次累积 stoneWall 永久护甲(及多次扣 buff 时长) — 用户报"石头龟点不断换龟就能一回合叠满被动"。
    const ftb = f as Fighter & { _lastTurnBeginTurn?: number };
    if (ftb._lastTurnBeginTurn === this.turn) return;
    ftb._lastTurnBeginTurn = this.turn;
    // v0.9.5.A51: 重置 per-turn 标记 (shieldOnHit 等)
    resetPerTurnFlags(f);
    // v0.9.5.A54: 减 buff duration + 重算 stats (atkDown/defDown 等真正生效)
    tickBuffsDuration(f);
    // (清理) 删 hidingShield buff 到期回血死代码 — 缩头防御已改 _hidingShieldVal 特殊池(到期回血见 processRoundEndBuffs),
    //   不再 push 'hidingShield' buff → expired 永不含它, 整个循环恒空。
    // G9: 用 === undefined 而非 falsy — 否则 0 暴击龟每回合重照, 把 buff 暴击烤进 base 累积
    if ((f as Fighter & { _baseCrit?: number })._baseCrit === undefined) snapshotBaseStats(f);
    recalcStats(f, this.views.filter(v => v.fighter.side === f.side).map(v => v.fighter));
    // v0.9.5.A57: undeadRage HP-scaling ATK 加成
    this.applyUndeadRageAtk(f);
    // P92 1:1 JS turn.js:564-568 — e_anemone HoT: turn begin %maxHp 回血 (单次, 不论行动几次)
    //   旧 equipment-runtime onTurnBegin 每次行动都触发, 多动龟堆叠. 移到这里只 1 次.
    const hotPct = ((f as Fighter & { _equipHot?: number })._equipHot ?? 0);
    if (hotPct > 0 && f.alive) {
      // #8 低#10: 治愈海葵 HoT 走 applyHeal (受治疗削减/增幅影响), 旧版直接 f.hp+= 绕过了; applyHeal 内部已 recordHeal
      const actual = applyHeal(f, Math.round(f.maxHp * hotPct / 100), f);
      if (actual > 0) this.spawnFloatingPassive(view, `+${actual}🪸`, '#06d6a0');
    }
    // P108: 孵化器 turn-begin +5 进度 + level apply (5% per level)
    const fInc = f as Fighter & { _incubatorProgress?: number; _incubatorTempLevel?: number };
    if (typeof fInc._incubatorProgress === 'number' && f.alive) {
      this._incubatorProgress(view, 5, '回合');
    }
    // P114 涌动 buff turn-begin -1
    const fSurge = f as Fighter & { _lightningSurgeTurns?: number };
    if ((fSurge._lightningSurgeTurns ?? 0) > 0) {
      fSurge._lightningSurgeTurns = (fSurge._lightningSurgeTurns ?? 0) - 1;
      if (fSurge._lightningSurgeTurns <= 0) {
        delete (fSurge as Fighter & { _lightningShockBoostPct?: number })._lightningShockBoostPct;
      }
    }
    // P105 小龟帽 turn-begin recover (每回合 +25 HP, 累计灰字)
    // P159: desc 明确"受治疗减益和治疗强度影响" → 走 applyHeal (healReduce/rippleHealAmp/
    //   synergyGuardAmp), 不再 flat f.hp+=25. applyHeal 内部已 recordHeal, 不重复 record.
    const fHat = f as Fighter & { _turtleHelmetRecover?: number; _turtleHelmetHealStat?: number };
    if ((fHat._turtleHelmetRecover ?? 0) > 0 && f.alive) {
      const actual = applyHeal(f, fHat._turtleHelmetRecover ?? 0, f);
      if (actual > 0) {
        fHat._turtleHelmetHealStat = (fHat._turtleHelmetHealStat ?? 0) + actual;
        this.spawnFloatingPassive(view, `+${actual}🪖`, '#06d6a0');
      }
    }
    const p = f.passive;
    if (!p) return;

    // fortuneGold: 每回合 +2 深海币 (用户 v0.9.9; this.coins = 本局深海币/商店货币). 玩家方加 this.coins, 野生敌方走 aiGainCoins.
    if (p.type === 'fortuneGold') {
      if (f.side === 'left') {
        this.coins += 2;
        this.refreshCoinDisplay();
        this.battleLog.log(`💰 ${f.name} <b>财神</b> +2 深海币`);
      } else {
        this.aiGainCoins(2, '财神');
      }
    }
    // 财富 synergy: _synergyWealthCoinPerTurn 每回合 +4 龟币 (用户 v0.9.9, tier2/3)
    //   玩家方加 this.coins; 野生敌方走 aiGainCoins (深海/Boss 不给)
    const wealthCoin = (f as Fighter & { _synergyWealthCoinPerTurn?: number })._synergyWealthCoinPerTurn;
    if (wealthCoin) {
      if (f.side === 'left') {
        this.coins += wealthCoin;
        this.refreshCoinDisplay();
      } else {
        this.aiGainCoins(wealthCoin, '财富');
      }
    }
    // P34 stoneWall 坚壁: 已移到 nextActor 的「该方回合开始」一次性结算 (applyStoneWallGain) —
    //   原本挂在每只龟自己 turn-begin, 被眩晕跳过整回合时就漏加 (用户: 不合理, 应轮到该方回合开始就加)。
    // P144: 删 lightningStorm turn-begin 自动电击 — 这是错误重复实现.
    //   JS 闪电每回合电击在 side-end processLightningStorm (PoC processSideEnd:5634 已正确实现:
    //   每回合 1 随机敌 0.82×ATK 真伤过护盾+统计). 之前 turn-begin 还有一段"每3回合打3敌
    //   1.0×ATK 直扣血" 是错形 → 闪电龟双重触发多打伤害. 删之.
    // auraAwaken 气场觉醒 → 已移到 applyRoundStartPassive ("该方回合开始", 被眩晕也不漏 = 不会永久错过觉醒)
    //   (储能波击仍在回合末 processEnergyWave; 此处只是不再做"觉醒"判定)
    // twoHeadDual: 纯换形/融合被动 (JS pets.js:218 / fighter.js:178), **无**每回合 ATK 增长。
    //   (删除自创 +3 baseATK/2回合: JS 无此, 会让双头龟攻击随时间虚高)

    // P16: cyberDrone 每回合 spawn + fire — 已在 processSideEnd 处理 (line 4545+),
    // 之前这里也写了一份, 写 _droneCount 还重复 fire 一发, 导致字段双写 + 双攻击.
    // 删除此处, 走 processSideEnd 的 _drones[] 统一路径 (JS turn.js:723-776 1:1).
    // 留空 if 块以保持调用结构清晰
    void p;  // suppress unused-var lint while we keep the if-chain shape

    // v0.9.5.A87: P2 turn-begin passives (JS turn.js:208-540)

    // bambooCharge — 每 2 回合充能, 下次技能后追加强化攻击 (JS turn.js:208-222)
    if (p.type === 'bambooCharge') {
      const ff = f as Fighter & { _bambooCounter?: number; _bambooCharged?: boolean; _bambooFired?: boolean };
      ff._bambooFired = false;
      if (!ff._bambooCharged) {
        ff._bambooCounter = (ff._bambooCounter ?? 0) + 1;
        if (ff._bambooCounter >= 2) {
          ff._bambooCharged = true;
          ff._bambooCounter = 0;
          this.spawnFloatingPassive(view, '🎋充能!', '#10b981');
          this.battleLog.log(`🎋 ${f.name} 竹编充能! 下次技能后追加强化攻击`);
        }
      }
    }

    // chestTreasure 朗姆酒 HoT → 已移到 applyRoundStartPassive ("该方回合开始", 眩晕也不漏)

    // candySteal 甜蜜掠夺 → 已移到 applyRoundStartPassive ("该方回合开始", 被动触发, 眩晕也不漏)

    // P52 crystalImmortal — 存活到第 10 回合 +5000 maxHP/+400 ATK
    //   JS turn.js:295-313: f._crystalImmortal && !f._crystalImmortalTriggered && turnNum >= 10
    //   PoC 之前检查 p.type === 'crystalImmortal' 错 (主 passive 是 crystalResonance)
    //   现 1:1 检查 _crystalImmortal flag (P52 装备时 BattleScene init 设置)
    const ff = f as Fighter & { _crystalImmortal?: boolean; _crystalImmortalTriggered?: boolean };
    if (ff._crystalImmortal && !ff._crystalImmortalTriggered && this.turn >= 10) {
      ff._crystalImmortalTriggered = true;
      const hpGain = 5000;
      const atkGain = 400;
      f.maxHp += hpGain;
      f.hp += hpGain;
      f.baseAtk += atkGain;
      f.atk = f.baseAtk;
      this.spawnFloatingPassive(view, `不朽! +${hpGain}HP +${atkGain}ATK`, '#c77dff');
      this.tweens.add({ targets: view.hpBar, width: 118 * (f.hp / f.maxHp), duration: 300 });
      view.hpText.setText(`${f.hp}/${f.maxHp}`);
      this.battleLog.log(`💎 ${f.name} 水晶不朽! +${hpGain}HP +${atkGain}ATK`);
    }

    // rainbowPrism 已移到 nextActor 的"该方回合开始"一次性触发 (与出手/眩晕脱钩, 同坚壁)

    // P43 gamblerBlood (骰子龟 passive, JS turn.js:1044-1054):
    //   每回合重算 crit = _initCrit + min(maxCritGain, lostPct/maxCritAtLoss × maxCritGain)
    //   损 0% → crit base; 损 maxCritAtLoss% (默认 30%) → crit + maxCritGain (默认 50%)
    //   超 100% crit 部分由 calcCritMult overflowMult 1.5 转 critDmg
    if (p.type === 'gamblerBlood') {
      const ff = f as Fighter & { _initCrit?: number };
      const initCrit = ff._initCrit ?? f.crit;
      const lostPct = Math.max(0, 1 - f.hp / f.maxHp) * 100;
      const maxCritAtLoss = (p.maxCritAtLoss as number) ?? 30;
      const maxCritGain = (p.maxCritGain as number) ?? 50;
      const bonusCrit = Math.min(maxCritGain, lostPct / maxCritAtLoss * maxCritGain);
      f.crit = initCrit + bonusCrit / 100;   // 可超 1, calcCritMult overflowMult 处理
      // F3 1:1 JS turn.js:1050-1052 — gamblerBlood 覆写 crit 后**重新加** diceFateCrit buff
      //   (否则失血骰子龟下回合丢命运骰子暴击, 因 recalc 的 critAdd 被此处覆盖)
      for (const b of f.buffs) {
        if (b.type === 'diceFateCrit') f.crit += b.value / 100;
      }
    }

    // gamblerFateWheel 命运之轮 → 已移到 applyRoundStartPassive ("每回合开始抽花色", 眩晕也不漏)
  }

  /** v0.9.5.A88: P2 复杂装备效果 (turn-begin 触发, 需要 team 上下文)
   *  - e_dragon_egg: 3 层吐息 → 沿一排喷火龙 (友军 +40, 敌军 50 法术 + 25 灼烧)
   *  - e_mini_crystal A: 回合末发射 2 段 30 魔法 + 1 层迷你水晶 (3 层引爆 14% maxHp)
   *  - e_mini_crystal B: 横扫全敌 20 魔法 + 1 层 (同上引爆)
   *  - e_conch worm: 复活后每回合自动攻击当前 HP 最低敌人 1× ATK
   */
  private processComplexEquipEffects(actor: FighterView) {
    const f = actor.fighter as Fighter & {
      _equipDragonEgg?: boolean;
      _equipDragonEggStacks?: number;
      _equipMiniCrystal?: boolean;
      _equipMiniCrystalB?: boolean;
      _isConchWorm?: boolean;
      _equipFpga?: boolean;
      _equipAmplifier?: boolean;
      _fpgaStateThisTurn?: number;
    };
    if (!f.alive) return;

    const enemies = this.views.filter(v => v.fighter.side !== f.side && v.fighter.alive);
    const allies = this.views.filter(v => v.fighter.side === f.side && v.fighter.alive);

    // 修(2026-05-30): 重置本回合增伤字段(FPGA-10 / 放大器共用), 让下面 roll 用 Math.max 取较大。
    //   JS engine.js:503 同款: turn-begin 先清, 后续装备效果累 Math.max。
    (f as Fighter & { _dmgBonusThisTurnPct?: number })._dmgBonusThisTurnPct = 0;

    // P59 e_fpga 1:1 JS engine.js:227-232 — 4-state 2-bit random per turn
    if (f._equipFpga) {
      const state = Math.floor(Math.random() * 4);  // 0=00, 1=01, 2=10, 3=11
      f._fpgaStateThisTurn = state;
      // P130 FPGA 累计灰字 stat — 4 state 全跟踪 (之前只 atk/def/mr, 生命偷取/buff 次数漏)
      const ffp = f as Fighter & {
        _fpgaAtkGiven?: number; _fpgaDefGiven?: number; _fpgaMrGiven?: number;
        _fpgaLifestealGiven?: number; _fpgaBuffCount?: number;
      };
      if (state === 0) {
        // 00: heal 5% maxHp + permanent +2 def/mr
        const heal = Math.round(f.maxHp * 0.05);
        const before = f.hp;
        f.hp = Math.min(f.maxHp, f.hp + heal);
        f.baseDef += 2; f.def = f.baseDef;
        f.baseMr = (f.baseMr ?? f.baseDef) + 2; f.mr = f.baseMr;
        ffp._fpgaDefGiven = (ffp._fpgaDefGiven ?? 0) + 2;
        ffp._fpgaMrGiven = (ffp._fpgaMrGiven ?? 0) + 2;
        this.spawnFloatingPassive(actor, `🔧FPGA-00 +${f.hp - before}HP +2甲/抗`, '#9af6ff');
        this.battleLog.log(`🔧 ${f.name} FPGA 00: 治疗 + 永久 +2 甲/抗`);
      } else if (state === 1) {
        // 01: permanent +5 ATK + permanent +4% lifesteal
        f.baseAtk += 5; f.atk = f.baseAtk;
        const ff = f as Fighter & { _lifestealPct?: number };
        ff._lifestealPct = (ff._lifestealPct ?? 0) + 4;
        ffp._fpgaAtkGiven = (ffp._fpgaAtkGiven ?? 0) + 5;
        ffp._fpgaLifestealGiven = (ffp._fpgaLifestealGiven ?? 0) + 4;   // P130 加生命偷取累计
        this.spawnFloatingPassive(actor, '🔧FPGA-01 +5 ATK +4% 生命偷取', '#9af6ff');
        this.battleLog.log(`🔧 ${f.name} FPGA 01: 永久 +5 ATK + 4% 生命偷取`);
      } else if (state === 2) {
        // 10: this-turn +15% 增伤 — JS combat.js:888 1:1 用 _dmgBonusThisTurnPct, applyRawDamage 乘所有出伤。
        //   修(2026-05-30 用户): 用户明确"增伤是独立概念, 该乘所有出伤, 不只 ATK"。换 atkUp buff → _dmgBonusThisTurnPct。
        //   跟放大器共用此字段, 已在 turn-begin 重置为 0, 这里 Math.max 取较大(JS 同款)。
        const fb = f as Fighter & { _dmgBonusThisTurnPct?: number };
        fb._dmgBonusThisTurnPct = Math.max(fb._dmgBonusThisTurnPct ?? 0, 15);
        ffp._fpgaBuffCount = (ffp._fpgaBuffCount ?? 0) + 1;   // P130 buff 触发次数 (10/11 共用)
        this.spawnFloatingPassive(actor, '🔧FPGA-10 本回合 +15% 增伤', '#9af6ff');
        this.battleLog.log(`🔧 ${f.name} FPGA 10: 本回合 +15% 增伤`);
      } else {
        // 11: this-turn -25% taken — 描述"受到的所有伤害-25%(除真伤)"。
        //   用 dmgReduce(对所有非真伤减%)而非 physImmune(只减物理) → 原本魔法照常吃满, 与描述不符。
        //   修(2026-05-30 Agent C): duration 2→1 同款
        f.buffs.push({ type: 'dmgReduce', value: 25, duration: 1 });
        ffp._fpgaBuffCount = (ffp._fpgaBuffCount ?? 0) + 1;   // P130 buff 触发次数
        this.spawnFloatingPassive(actor, '🔧FPGA-11 本回合 -25% 受伤', '#9af6ff');
        this.battleLog.log(`🔧 ${f.name} FPGA 11: 本回合 -25% 受伤`);
      }
    }

    // P59 e_amplifier 1:1 JS engine.js:233-238 — 每回合开始 16-24% 增伤
    // 修(2026-05-30 用户): 换 atkUp buff → _dmgBonusThisTurnPct (跟 FPGA-10 共用, Math.max), 让"增伤"真正乘所有出伤。
    if (f._equipAmplifier) {
      const pct = 16 + Math.floor(Math.random() * 9);   // 16..24
      const fb = f as Fighter & { _dmgBonusThisTurnPct?: number };
      fb._dmgBonusThisTurnPct = Math.max(fb._dmgBonusThisTurnPct ?? 0, pct);
      this.spawnFloatingPassive(actor, `📡放大器 +${pct}% 增伤`, '#9af6ff');
      this.battleLog.log(`📡 ${f.name} <b>放大器</b>: 本回合 +${pct}% 增伤`);
    }

    // P61 e_ripple 1:1 JS turn.js:570-583 — 每回合给全体友方回已损 HP × allyHotPct%
    const ff = f as Fighter & { _equipRippleAllyHotPct?: number };
    if ((ff._equipRippleAllyHotPct ?? 0) > 0) {
      const pct = ff._equipRippleAllyHotPct ?? 3;
      for (const av of allies) {
        const a = av.fighter;
        const lostHp = a.maxHp - a.hp;
        if (lostHp <= 0) continue;
        const heal = Math.round(lostHp * pct / 100);
        if (heal <= 0) continue;
        const before = a.hp;
        a.hp = Math.min(a.maxHp, a.hp + heal);
        const actual = a.hp - before;
        if (actual > 0) {
          battleStats.recordHeal(f, a, actual);
          this.spawnFloatingPassive(av, `+${actual}🌊`, '#06d6a0');
          this.tweens.add({ targets: av.hpBar, width: 118 * (a.hp / a.maxHp), duration: 200 });
          av.hpText.setText(`${a.hp}/${a.maxHp}`);
        }
      }
    }

    // ── 龙蛋: 累积 3 层喷火 ──
    if (f._equipDragonEgg) {
      const stacks = (f._equipDragonEggStacks ?? 0) + 1;
      f._equipDragonEggStacks = stacks;
      if (stacks >= 3) {
        f._equipDragonEggStacks = 0;
        this.triggerDragonFly(actor, allies, enemies);
      } else {
        this.spawnFloatingPassive(actor, `🐉${stacks}/3`, '#ff6633');
      }
    }

    // #8 M13: 迷你水晶球 A/B 原在此 (回合开始) 触发 — 错。两者描述均为「回合末」, 且 B 在
    //   processSideEndEquipment(:7042) 已有完整回合末实现 → 这里再触发 = B 双发。A 旧版只打 1 随机
    //   目标(描述是「沿同列穿过」)。现统一移到 processSideEndEquipment 回合末处理 (A 新增 + B 去重)。

    // I6: 海螺小虫攻击移到 processSideEnd (conch 是 non-actor, 这里只对行动者调用 = 永不触发)。
  }

  /** 龙蛋喷火: 友军 +40, 敌军 50 法术 + 25 灼烧 */
  private triggerDragonFly(actor: FighterView, allies: FighterView[], enemies: FighterView[]) {
    // P92 1:1 JS equip-effects.js:14-86 — 单列 (随机有敌人的列) 同列友军+40HP / 敌军 50 magic + 25 burn
    //   之前 PoC: 全友 +40 / 全敌 50+25 = 全场命中 → 比 JS 强 ~3x
    if (!enemies.length) return;
    // 找有敌人的列 (JS:19-25)
    const colsWithEnemy = [...new Set(enemies.map(ev => {
      const k = (ev.fighter as Fighter & { _slotKey?: string })._slotKey || '';
      const m = k.match(/-(\d+)$/);
      return m ? parseInt(m[1]) : null;
    }).filter((c): c is number => c != null))];
    if (!colsWithEnemy.length) return;
    const col = colsWithEnemy[Math.floor(Math.random() * colsWithEnemy.length)];
    const onCol = (vv: FighterView): boolean => {
      const k = (vv.fighter as Fighter & { _slotKey?: string })._slotKey || '';
      const m = k.match(/-(\d+)$/);
      return !!(m && parseInt(m[1]) === col);
    };
    const colAllies = allies.filter(a => a.fighter.alive && onCol(a));
    const colEnemies = enemies.filter(ev => ev.fighter.alive && onCol(ev));
    this.battleLog.log(`🐉 ${actor.fighter.name} 龙蛋: 龙飞过${col === 0 ? '上' : col === 1 ? '中' : '下'}排!`);
    // K5: 龙息火柱横扫该列 (JS dragon-fly-trail) — 从施放者扫向敌方该列
    const dir = actor.fighter.side === 'left' ? 1 : -1;
    const sweepY = colEnemies.length ? colEnemies[0].sprite.y : actor.sprite.y;
    const sweepToX = colEnemies.length ? colEnemies[colEnemies.length - 1].sprite.x + dir * 70 : (dir > 0 ? this.scale.width : 0);
    spawnFireSweep(this, actor.sprite.x, sweepY, sweepToX);
    for (const a of colAllies) {
      // 修(2026-05-30 Agent C): 旧直写 hp 绕过 applyHeal → 漏潮汐涟漪/海浪 healAmp / healReduce / 守护羁绊
      const before = a.fighter.hp;
      applyHeal(a.fighter, 40, actor.fighter);
      if (a.fighter.hp > before) {
        this.spawnFloatingPassive(a, `+${a.fighter.hp - before}🐉`, '#06d6a0');
        this.tweens.add({ targets: a.hpBar, width: 118 * (a.fighter.hp / a.fighter.maxHp), duration: 200 });
        a.hpText.setText(`${a.fighter.hp}/${a.fighter.maxHp}`);
      }
    }
    for (const ev of colEnemies) {
      this.dealMagicHit(ev, 50, '🐉', actor.fighter);   // 走 on-hit 链 (火珊瑚/冰封水母/吸血/雷电法杖)
      applyDotStacks(ev.fighter, 'burn', 25);
      this.refreshStatusIcons(ev);
    }
  }

  // #8 M13: addMiniCrystalStack 删除 — 旧 A/B 回合开始路径专用 (用 _miniCrystalStacks), 已移至
  //   processSideEndEquipment 回合末路径 (统一用 _miniCrystallize 字段)。此方法成死代码故移除。

  /** 通用 dealMagicHit (复杂装备共用)。
   *  修(2026-05-30 Agent C): 加 attacker 参数 + triggerOnHitEffects 调用,
   *  让 e_fire 火珊瑚 burn / e_jelly 冰封水母 stun / lifesteal / 雷电法杖充能 / blade bleed 等在装备 proc(龙息/珍珠火球)上也触发。
   *  之前完全 bypass on-hit 链 → 装备组合(火珊瑚+龙蛋等)在 JS 联动 PoC 不联动。 */
  private dealMagicHit(view: FighterView, dmg: number, emoji: string, attacker?: Fighter) {
    const f = view.fighter;
    if (!f.alive) return;
    const wasAlive = f.alive;
    const r = applyRawDamage(f, dmg, 'magic');
    const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
    battleStats.recordDamage(attacker ?? null, f, shown, 'mag');
    this.spawnFloatingPassive(view, `${shown}${emoji}`, '#4cc9f0');   // 伤害统一无符号
    this.tweens.add({ targets: view.hpBar, width: 118 * (f.hp / f.maxHp), duration: 200 });
    view.hpText.setText(`${f.hp}/${f.maxHp}`);
    if (wasAlive && !f.alive) {
      if (attacker) battleStats.recordKill(attacker, f);
      this.killView(view);
    }
    // on-hit 链 (火珊瑚 burn / 冰封水母 stun / lifesteal / 雷电法杖充能 / blade bleed 等)
    if (attacker && f.alive) triggerOnHitEffects(attacker, f, dmg, {});
  }

  /** 海螺小虫攻击落伤 (dmg 已由调用方过 calcDamage 减免); attacker 归属伤害/击杀, 飘字走伤害弹跳。 */
  private dealPhysicalHit(view: FighterView, dmg: number, attacker?: Fighter) {
    const f = view.fighter;
    if (!f.alive) return;
    const wasAlive = f.alive;
    const r = applyRawDamage(f, dmg, 'physical');
    const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
    battleStats.recordDamage(attacker ?? null, f, shown, 'phy');
    if (attacker && wasAlive && !f.alive) battleStats.recordKill(attacker, f);
    // 飘字与其它伤害统一: 裸数字弹跳 (原 N🐛 上飘标签)
    spawnFloatingText(this, view.sprite.x, view.sprite.y, `${shown}`, 'direct-dmg', { amount: shown, atkSide: f.side === 'left' ? 'right' : 'left' });
    this.updateHpVisual(view, { duration: 200 });
    if (wasAlive && !f.alive) this.killView(view);
  }

  /** 缩头随从 回合末自动行动 (JS hiding.js summonAutoAction 1:1): AI 选技能+目标, 直接 runSkillHandler 执行
   *  (不走 endTurn/finishSide → 无再入)。随从是真龟, 有自己的技能/被动/AI。 */
  private async summonAutoAction(sv: FighterView): Promise<void> {
    const summon = sv.fighter;
    if (!summon.alive) return;
    const ready = (summon.skills ?? []).filter(s => (s.cdLeft ?? 0) === 0);
    if (!ready.length) return;
    const enemyViews = this.views.filter(v => v.fighter.side !== summon.side && v.fighter.alive
      && !(v.fighter as Fighter & { _untargetable?: boolean })._untargetable);
    if (!enemyViews.length) return;
    const owner = (summon as Fighter & { _owner?: Fighter })._owner;
    const allyViews = this.views.filter(v => v.fighter.side === summon.side && v.fighter.alive);
    if (owner && owner.alive && !allyViews.some(v => v.fighter === owner)) {
      const ov = this.views.find(v => v.fighter === owner); if (ov) allyViews.push(ov);
    }
    const SELF_TYPES = new Set(['phoenixShield', 'fortuneDice', 'hidingDefend', 'hidingCommand', 'cyberDeploy', 'cyberBuff', 'ghostPhase', 'diamondFortify', 'diceFate', 'chestCount', 'bambooHeal', 'volcanoArmor', 'crystalBarrier']);
    const ALLY_TYPES = new Set(['heal', 'shield', 'bubbleShield', 'angelBless']);
    // 2026-05-30 audit: 随从禁用清单 — 当前为空 (Agent A 报的 twoHeadSwitch 经核 handler 是
    //   self-contained, 双头随从该正常切形态, 不拦)。保留集本身, 以后真有该禁的再加。
    const SUMMON_SKIP = new Set<string>([]);
    const gc = (summon as Fighter & { _goldCoins?: number })._goldCoins ?? 0;
    // 修(2026-05-30 用户审 / Agent A): stone 的 heal 技能没 atkScale/hot/healPct(只加 defUp/mrUp),
    //   AI 当 heal 触发但实际不治疗 → 随从在低血时反复选这条空技能。要求 heal 类必须真有治疗字段才认。
    const healS = ready.find(s => {
      if (s.type === 'bambooHeal') return true;
      if (s.type !== 'heal') return false;
      const sx = s as Record<string, unknown>;
      return sx.atkScale != null || sx.hot != null || sx.healPct != null || sx.healHpPct != null;
    });
    const shieldS = ready.find(s => s.type === 'shield' || s.type === 'bubbleShield');
    const dmgS = ready.filter(s => !SELF_TYPES.has(s.type) && !ALLY_TYPES.has(s.type) && s.type !== 'hidingCommand'
      && !SUMMON_SKIP.has(s.type)
      && !(s.type === 'fortuneAllIn' && gc <= 0)
      && !(s.type === 'fortuneBuyEquip' && gc < (((s as Record<string, unknown>).coinCost as number) || 20))
      // 修(2026-05-30 / Agent A): gamblerBet 每次扣 40% 当前 HP → 随从在低血时会反复自杀; HP < 50% 不用。
      && !(s.type === 'gamblerBet' && summon.hp / summon.maxHp < 0.5));
    const selfS = ready.filter(s => SELF_TYPES.has(s.type) && !SUMMON_SKIP.has(s.type));
    let skill: typeof ready[number] | undefined;
    // 修(2026-05-30 / Agent A): shield 类若是 selfCast (candy 的 shield 是 selfCast:true), 触发条件只看自己,
    //   不该用 "盟友低盾" 触发 — 之前会出现"盟友濒死 → 随从给自己加盾, 盟友照样死"。
    const shieldIsSelfCast = shieldS && (shieldS as Record<string, unknown>).selfCast;
    if (healS && (summon.hp / summon.maxHp < 0.35 || (owner && owner.alive && owner.hp / owner.maxHp < 0.35))) skill = healS;
    else if (shieldS && (shieldIsSelfCast
        ? (summon.shield ?? 0) < 20 && summon.hp / summon.maxHp < 0.6
        : allyViews.some(a => (a.fighter.shield ?? 0) < 20 && a.fighter.hp / a.fighter.maxHp < 0.6))) skill = shieldS;
    else if (selfS.length && Math.random() < 0.3) skill = selfS[Math.floor(Math.random() * selfS.length)];
    else if (dmgS.length) { dmgS.sort((a, b) => (((b.cd as number) || 0) - ((a.cd as number) || 0))); skill = (((dmgS[0].cd as number) || 0) > 0 && Math.random() < 0.8) ? dmgS[0] : dmgS[Math.floor(Math.random() * dmgS.length)]; }
    else skill = ready[0];
    if (skill && skill.type === 'hidingCommand') { skill = ready.find(s => s.type !== 'hidingCommand'); }
    if (!skill) return;
    // 目标选择
    const sk = skill as Record<string, unknown>;
    let targetView: FighterView | undefined;
    if (SELF_TYPES.has(skill.type) || sk.selfCast) targetView = sv;
    else if (ALLY_TYPES.has(skill.type)) targetView = allyViews.slice().sort((a, b) => (a.fighter.hp / a.fighter.maxHp) - (b.fighter.hp / b.fighter.maxHp))[0];
    else {
      let pool = enemyViews;
      if (!sk.ignoreRow) { const front = enemyViews.filter(e => e.fighter._position === 'front'); if (front.length) pool = front; }
      const taunters = pool.filter(e => e.fighter.buffs.some(b => b.type === 'taunt'));
      if (taunters.length) targetView = taunters[0];
      else {
        const sorted = pool.slice().sort((a, b) => (a.fighter.hp / a.fighter.maxHp) - (b.fighter.hp / b.fighter.maxHp));
        const lowest = sorted[0];
        if ((lowest.fighter as Fighter & { _undeadLockTurns?: number })._undeadLockTurns) targetView = sorted.find(e => !(e.fighter as Fighter & { _undeadLockTurns?: number })._undeadLockTurns) || lowest;
        else if (lowest.fighter.hp / lowest.fighter.maxHp < 0.2 && Math.random() < 0.9) targetView = lowest;
        else if (Math.random() < 0.7) targetView = lowest;
        else targetView = pool[Math.floor(Math.random() * pool.length)];
      }
    }
    if (!targetView) return;
    const skillIdx = summon.skills.indexOf(skill);
    this.battleLog.log(`🐢 ${summon.emoji}${summon.name}(随从) 自动 <b>${skill.name}</b>`);
    if (!['basicSlam', 'basicChiWave', 'ninjaImpact', 'ninjaBackstab'].includes(skill.type)) {
      this.playAttackHop(sv); this.playAction(sv, 'attack');
    }
    await this.runSkillHandler(sv, targetView, skillIdx);
  }

  /** 飘字辅助 — passive 通用 (单字 + 颜色) */
  private spawnFloatingPassive(view: FighterView, text: string, color: string) {
    const t = this.add.text(view.sprite.x, view.sprite.y - 50, text, {
      fontSize: '16px', color, fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({
      targets: t, y: view.sprite.y - 95, alpha: 0, duration: 800, ease: 'cubic.out',
      onComplete: () => t.destroy(),
    });
  }

  /** 线条龟 连笔: 在两个被连敌人【脚底】之间画一道【持续】墨线 (随连笔在, 连笔结束/一方死亡即消失)。
   *  图层 depth 0 = 角色(depth 1-2)之下 → 像画在地上、角色站在线上; 颜色偏淡。
   *  位置每帧由 updateInkLinks 跟随双方脚底重画 (跳跃/归位都跟得上)。 */
  private _inkLinkLines: Array<{ a: FighterView; b: FighterView; gfx: Phaser.GameObjects.Graphics }> = [];
  private drawInkLink(a: FighterView, b: FighterView): void {
    // 涉及同一只龟的旧线先清 (重复连笔 → 刷新, 不叠多条)
    for (let i = this._inkLinkLines.length - 1; i >= 0; i--) {
      const l = this._inkLinkLines[i];
      if (l.a === a || l.a === b || l.b === a || l.b === b) { l.gfx.destroy(); this._inkLinkLines.splice(i, 1); }
    }
    const ln = { a, b, gfx: this.add.graphics().setDepth(0) };
    this._inkLinkLines.push(ln);
    this.redrawInkLink(ln);
  }

  private redrawInkLink(ln: { a: FighterView; b: FighterView; gfx: Phaser.GameObjects.Graphics }): void {
    const footY = (v: FighterView) => v.sprite.y + (v.sprite.displayHeight ?? 80) / 2 - 4;
    const x1 = ln.a.sprite.x, y1 = footY(ln.a);
    const x2 = ln.b.sprite.x, y2 = footY(ln.b);
    const g = ln.gfx;
    g.clear();
    g.lineStyle(8, 0x140a28, 0.16);   // 外层淡墨晕 (很淡)
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
    g.lineStyle(3, 0x8a5cff, 0.32);   // 主墨线 (淡紫, 半透)
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
    g.fillStyle(0x8a5cff, 0.38);
    g.fillCircle(x1, y1, 4); g.fillCircle(x2, y2, 4);   // 两端脚底墨点
  }

  /** 每帧: 重画活跃连笔线; 任一方失去 _inkLink (到期) 或死亡 → 销毁该线。 */
  private updateInkLinks(): void {
    if (!this._inkLinkLines.length) return;
    for (let i = this._inkLinkLines.length - 1; i >= 0; i--) {
      const ln = this._inkLinkLines[i];
      const aF = ln.a.fighter as Fighter & { _inkLink?: unknown };
      const bF = ln.b.fighter as Fighter & { _inkLink?: unknown };
      if (!(aF.alive && bF.alive && aF._inkLink && bF._inkLink)) {
        ln.gfx.destroy(); this._inkLinkLines.splice(i, 1); continue;
      }
      this.redrawInkLink(ln);
    }
  }

  /** 黑洞特效: 被黑洞吸入(持 'blackhole' buff)的单位, 用黑色椭圆盖住其位置 (像被吸进黑洞), 出黑洞即移除。
   *  覆盖在 sprite(depth1-2) 之上、血条(depth3+) 之下 → 看得到血条但看不到本体。由 buff 驱动存亡。 */
  private _blackholeOverlays = new Map<FighterView, Phaser.GameObjects.Ellipse>();
  private updateBlackholeVisuals(): void {
    for (const v of this.views) {
      const hasBH = v.fighter.alive && (v.fighter.buffs?.some(b => b.type === 'blackhole') ?? false);
      // 不可选中标记随 blackhole buff 存亡 (整个黑洞期间不可被单体选中, 与徽章/黑椭圆一致)
      (v.fighter as Fighter & { _isInBlackhole?: boolean })._isInBlackhole = hasBH;
      const ex = this._blackholeOverlays.get(v);
      if (hasBH && !ex) {
        const e = this.add.ellipse(v.sprite.x, v.sprite.y, 64, 88, 0x05010f, 0.95)
          .setDepth((v.sprite.depth ?? 2) + 0.6).setStrokeStyle(3, 0x8b5cf6, 0.85);
        this._blackholeOverlays.set(v, e);
      } else if (!hasBH && ex) {
        ex.destroy(); this._blackholeOverlays.delete(v);
      } else if (hasBH && ex) {
        ex.setPosition(v.sprite.x, v.sprite.y);
      }
    }
  }

  /** "该方回合开始"一次性被动 (与出手/眩晕脱钩 — 用户要求): 坚壁/棱镜/气场觉醒/命运之轮/朗姆酒HoT/甜蜜掠夺。
   *  竹叶充能(绑自身蓄力)、赌徒之血(实时算暴击) 不在此 — 仍按该龟自己行动结算。 */
  private applyRoundStartPassive(view: FighterView): void {
    const f = view.fighter;
    const p = f.passive;
    const pt = p?.type;
    if (pt === 'stoneWall') { this.applyStoneWallGain(f); return; }
    if (pt === 'rainbowPrism') { this.applyRainbowPrism(view); return; }
    // 龟壳 气场觉醒: 第 N 回合一次性永久全属性+ (被眩晕也不漏)
    if (pt === 'auraAwaken' && p) {
      const turn = ((f._auraTurn as number) || 0) + 1;
      f._auraTurn = turn;
      const awakenTurn = (p.awakenTurn as number) ?? 4;
      const enhancedTurn = (p.enhancedAwakenTurn as number) ?? 8;
      const atkPct = (p.atkPct as number) ?? 12;
      const defPct = (p.defPct as number) ?? 12;
      const mrPct = (p.mrPct as number) ?? 12;
      const hpPct = (p.hpPct as number) ?? 12;
      const lifestealPct = (p.lifestealPct as number) ?? 12;
      const reflectPct = (p.reflectPct as number) ?? 12;
      const critGain = (p.critGain as number) ?? 0.25;
      const doAwaken = (label: string) => {
        f.baseAtk = Math.round(f.baseAtk * (1 + atkPct / 100)); f.atk = f.baseAtk;
        f.baseDef = Math.round(f.baseDef * (1 + defPct / 100)); f.def = f.baseDef;
        f.baseMr = Math.round((f.baseMr ?? f.mr) * (1 + mrPct / 100)); f.mr = f.baseMr;
        const newMaxHp = Math.round(f.maxHp * (1 + hpPct / 100));
        const hpDelta = newMaxHp - f.maxHp; f.maxHp = newMaxHp; f.hp += hpDelta;
        (f as Fighter & { lifestealPct?: number }).lifestealPct = ((f as Fighter & { lifestealPct?: number }).lifestealPct || 0) + lifestealPct / 100;
        (f as Fighter & { reflectPct?: number }).reflectPct = ((f as Fighter & { reflectPct?: number }).reflectPct || 0) + reflectPct / 100;
        f.crit = (f.crit || 0) + critGain;
        this.battleLog.log(`✨ ${f.name} ${label}! +${atkPct}% 全属性 + ${critGain * 100}% 暴击`);
      };
      if (turn === awakenTurn) doAwaken('气场觉醒');
      if (turn === enhancedTurn && f._passiveSkills?.some?.((ps: { type: string }) => ps.type === 'shellEnhanceAwaken')) doAwaken('强化觉醒');
      return;
    }
    // 宝箱 朗姆酒 HoT: 抽到朗姆酒后每回合回血 (regen, 眩晕也不停)
    const fRum = f as Fighter & { _chestEquipRum?: boolean; _chestEquipRumPct?: number };
    if (pt === 'chestTreasure' && fRum._chestEquipRum) {
      const heal = Math.round(f.maxHp * (fRum._chestEquipRumPct ?? 8) / 100);
      const before = f.hp; f.hp = Math.min(f.maxHp, f.hp + heal);
      const actual = f.hp - before;
      if (actual > 0) {
        this.spawnFloatingPassive(view, `+${actual}🍺`, '#06d6a0');
        this.tweens.add({ targets: view.hpBar, width: 118 * (f.hp / f.maxHp), duration: 200 });
        view.hpText.setText(`${f.hp}/${f.maxHp}`);
      }
      return;
    }
    // 糖果 甜蜜掠夺: 指定回合 D&D 吸血 (被动触发, 眩晕也不漏)
    if (pt === 'candySteal' && p && this.turn === ((p.stealTurn as number) ?? 3)) {
      const enemies = this.views.filter(v => v.fighter.side !== f.side && v.fighter.alive).map(v => v.fighter);
      if (enemies.length) {
        const target = enemies[Math.floor(Math.random() * enemies.length)];
        const stealAmt = Math.round(target.maxHp * ((p.stealPct as number) ?? 10) / 100);
        target.maxHp = Math.max(1, target.maxHp - stealAmt);
        target.hp = Math.max(1, Math.min(target.hp - stealAmt, target.maxHp));
        f.maxHp += stealAmt; f.hp += stealAmt;
        const tv = this.views.find(v => v.fighter === target);
        if (tv) {
          // 真伤(记 'tru') → 走真实伤害弹跳飘字, 与别的飘字统一 (去 🍬 emoji)
          spawnFloatingText(this, tv.sprite.x, tv.sprite.y, `${stealAmt}`, 'true-dmg', { amount: stealAmt, atkSide: f.side === 'left' ? 'right' : 'left' });
          this.tweens.add({ targets: tv.hpBar, width: 118 * (target.hp / target.maxHp), duration: 200 });
          tv.hpText.setText(`${target.hp}/${target.maxHp}`);
        }
        this.tweens.add({ targets: view.hpBar, width: 118 * (f.hp / f.maxHp), duration: 200 });
        view.hpText.setText(`${f.hp}/${f.maxHp}`);
        battleStats.recordDamage(f, target, stealAmt, 'tru');
        this.battleLog.log(`🍬 ${f.name} 甜蜜掠夺! ${target.emoji}${target.name} -${stealAmt}HP/-${stealAmt}maxHP`);
      }
      return;
    }
    // 赌神 命运之轮 (含装备 _fateWheel): 每回合开始抽花色永久加属性
    if (pt === 'gamblerFateWheel' || (f as Fighter & { _fateWheel?: boolean })._fateWheel) {
      const ff = f as Fighter & { _fateWheelCounts?: { spade: number; heart: number; diamond: number; club: number }; _initHp?: number; _lifestealPct?: number };
      if (!ff._fateWheelCounts) ff._fateWheelCounts = { spade: 0, heart: 0, diamond: 0, club: 0 };
      const suit = Math.floor(Math.random() * 4);
      if (suit === 0) {
        ff._fateWheelCounts.spade++;
        f.baseAtk += 5; f.atk += 5; f.maxHp += 30; f.hp += 30; ff._initHp = f.maxHp;
        this.spawnFloatingPassive(view, '♠ +5攻+30HP', '#fff');
        this.tweens.add({ targets: view.hpBar, width: 118 * (f.hp / f.maxHp), duration: 200 });
        view.hpText.setText(`${f.hp}/${f.maxHp}`);
      } else if (suit === 1) {
        ff._fateWheelCounts.heart++;
        f.baseDef += 2; f.def += 2; f.baseMr = (f.baseMr ?? f.baseDef) + 2; f.mr += 2;
        this.spawnFloatingPassive(view, '♥ +2甲+2魔抗', '#ef4444');
      } else if (suit === 2) {
        ff._fateWheelCounts.diamond++;
        const fb = f as Fighter & { _baseCrit?: number; _baseArmorPen?: number };
        f.crit = (f.crit || 0) + 0.08;
        if (fb._baseCrit !== undefined) fb._baseCrit += 0.08;
        f.armorPen = (f.armorPen ?? 0) + 2;
        fb._baseArmorPen = (fb._baseArmorPen ?? f.armorPen - 2) + 2;
        this.spawnFloatingPassive(view, '♦ +8%暴击+2穿甲', '#ffd93d');
      } else {
        ff._fateWheelCounts.club++;
        ff._lifestealPct = (ff._lifestealPct ?? 0) + 4;
        this.spawnFloatingPassive(view, '♣ +4%吸血', '#10b981');
      }
    }
  }

  /** v0.9.5.A87: rainbowPrism 随机色光 (JS turn.js:397-444) */
  private applyRainbowPrism(view: FighterView) {
    const f = view.fighter;
    const p = f.passive;
    if (!p) return;
    const allies = this.views.filter(v => v.fighter.side === f.side && v.fighter.alive);
    const enemies = this.views.filter(v => v.fighter.side !== f.side && v.fighter.alive);
    const atkPct = (p.atkPct as number) ?? 10;
    const defPct = (p.defPct as number) ?? 10;
    const healPct = (p.healPct as number) ?? 5;
    const enhanced = (f._enhancedPrism as boolean) ?? false;

    // JS turn.js:405/411 — 首回合(turn<=1)不抽绿光(2)
    const basePool = this.turn <= 1 ? [0, 1] : [0, 1, 2];
    const extraPool = [3, 4, 5, 6];
    const picks: number[] = [];
    picks.push(basePool[Math.floor(Math.random() * basePool.length)]);
    if (enhanced) picks.push(extraPool[Math.floor(Math.random() * extraPool.length)]);
    // JS turn.js:414-415 — 记录主色(七彩光束 prismBonus 读) + 全部色(UI 徽章读)
    (f as Fighter & { _prismColor?: number; _prismColors?: number[] })._prismColor = picks[0];
    (f as Fighter & { _prismColor?: number; _prismColors?: number[] })._prismColors = picks.slice();

    const NAMES = ['🔴红', '🔵蓝', '🟢绿', '🟠橙', '🟡黄', '🩵青', '🟣紫'];
    for (const color of picks) {
      if (color === 0) {  // 红: 全队 atk +%
        for (const a of allies) {
          const g = Math.round(a.fighter.baseAtk * atkPct / 100);
          a.fighter.buffs.push({ type: 'atkUp', value: g, duration: 2 });
          a.fighter.atk += g;
        }
      } else if (color === 1) {  // 蓝: 全队 def/mr +%
        for (const a of allies) {
          const dg = Math.round(a.fighter.baseDef * defPct / 100);
          const mg = Math.round((a.fighter.baseMr ?? a.fighter.baseDef) * defPct / 100);
          a.fighter.buffs.push({ type: 'defUp', value: dg, duration: 2 });
          a.fighter.buffs.push({ type: 'mrUp', value: mg, duration: 2 });
          a.fighter.def += dg; a.fighter.mr += mg;
        }
      } else if (color === 2) {  // 绿: 全队回 %
        for (const a of allies) {
          const h = Math.round(a.fighter.maxHp * healPct / 100);
          const before = a.fighter.hp;
          a.fighter.hp = Math.min(a.fighter.maxHp, a.fighter.hp + h);
          if (a.fighter.hp > before) {
            this.tweens.add({ targets: a.hpBar, width: 118 * (a.fighter.hp / a.fighter.maxHp), duration: 200 });
            a.hpText.setText(`${a.fighter.hp}/${a.fighter.maxHp}`);
          }
        }
      } else if (color === 3) {  // 橙: 生命偷取 1 回合
        for (const a of allies) a.fighter.buffs.push({ type: 'lifesteal', value: 10, duration: 2 });
      } else if (color === 4 && enemies.length) {  // 黄: 灼烧随机敌
        const t = enemies[Math.floor(Math.random() * enemies.length)];
        // F4: JS turn.js:433 applySkillDebuffs({burn:true}) → 默认层数 round(atk×0.67)
        applyDotStacks(t.fighter, 'burn', defaultBurnStacks(f));
        this.refreshStatusIcons(t);
      } else if (color === 5 && enemies.length) {  // 青: 冰寒
        const t = enemies[Math.floor(Math.random() * enemies.length)];
        t.fighter.buffs.push({ type: 'chilled', value: 1, duration: 2 });
        this.refreshStatusIcons(t);
      } else if (color === 6 && enemies.length) {  // 紫: 诅咒
        const t = enemies[Math.floor(Math.random() * enemies.length)];
        // #8 低#1: 紫光诅咒 0.09→0.05 与全游戏其它「诅咒」统一 (用户定)
        t.fighter.buffs.push({ type: 'curse', value: Math.round(t.fighter.maxHp * 0.05), duration: 3, _src: f });
        this.refreshStatusIcons(t);
      }
    }
    // 多色飘字合并成一条 (不再各飘一个叠在一起)
    this.spawnFloatingPassive(view, picks.map(c => NAMES[c] ?? '?').join(' '), '#ffffff');
    this.battleLog.log(`🌈 ${f.name} <b>棱镜</b>: ${picks.map(c => NAMES[c]).join(' + ')}`);
  }

  /** v0.9.5.C2: hunterKill execute — JS state.js processHunterKill (3 phase animation, ~85 行)
   *  每回合检查活敌, HP < threshPct% 时触发处决:
   *  1) icon overlay 700ms (target 上方放大消失)
   *  2) arrow particles 500ms (hunter → target 飞过)
   *  3) red screen flash + kill
   */
  private async processHunterExecute(): Promise<void> {
    for (const v of this.views) {
      const f = v.fighter;
      if (!f.alive || f.passive?.type !== 'hunterKill') continue;
      const threshPct = (f.passive.hpThresh as number) ?? 15;
      const enemies = this.views.filter(e => e.fighter.alive && e.fighter.side !== f.side);
      for (const ev of enemies) {
        const e = ev.fighter;
        // JS state.js:697 严格 < (恰好 threshPct% 不处决); 旧 PoC > 在边界多处决一次
        if (e.hp / e.maxHp * 100 >= threshPct) continue;
        // 跳过 undeadLock
        if ((e as Fighter & { _undeadLockTurns?: number })._undeadLockTurns) continue;

        // Phase 1: hunter-kill 图标放大消失 700ms (JS state.js:706-714 用 hunter-kill-icon.png, 非 🎯emoji)
        let icon: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
        let s0: number, s1: number, s2: number;
        if (this.textures.exists('passive-hunter-kill')) {
          const img = this.add.image(ev.sprite.x, ev.sprite.y - 30, 'passive-hunter-kill').setOrigin(0.5).setDepth(60);
          s1 = 84 / (img.width || 96);   // "scale 1" ≈ 84px
          s0 = s1 * 0.3; s2 = s1 * 1.6;
          icon = img;
        } else {
          icon = this.add.text(ev.sprite.x, ev.sprite.y - 30, '🎯', {
            fontSize: '64px', stroke: '#000', strokeThickness: 4,
          }).setOrigin(0.5).setDepth(60);
          s0 = 0.3; s1 = 1; s2 = 1.6;
        }
        icon.setScale(s0);
        this.tweens.add({
          targets: icon, scale: s1, alpha: 0.95, duration: 280, ease: 'back.out',
        });
        this.time.delayedCall(600, () => {
          this.tweens.add({
            targets: icon, scale: s2, alpha: 0, duration: 280, ease: 'cubic.out',
            onComplete: () => icon.destroy(),
          });
        });
        await new Promise<void>(r => this.time.delayedCall(700, () => r()));
        if (!e.alive) continue;

        // Phase 2: arrow particles hunter → target 500ms
        const arrows: Phaser.GameObjects.Rectangle[] = [];
        for (let i = 0; i < 5; i++) {
          const a = this.add.rectangle(v.sprite.x, v.sprite.y + (i - 2) * 8, 20, 4, 0xff5050).setDepth(55);
          a.setStrokeStyle(1, 0xff0000, 0.8);
          arrows.push(a);
          this.tweens.add({
            targets: a, x: ev.sprite.x, y: ev.sprite.y, alpha: 0,
            duration: 280 + i * 50, ease: 'cubic.in',
            onComplete: () => a.destroy(),
          });
        }
        await new Promise<void>(r => this.time.delayedCall(500, () => r()));

        // Phase 3: red screen flash + kill
        const flash = this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
          this.scale.width, this.scale.height, 0xff3232, 0.3).setDepth(200);
        this.tweens.add({
          targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy(),
        });
        this.cameras.main.shake(300, 0.015);
        // JS state.js:754 同款: hunter-kill 图标 + 猎杀! 金色 crit-label (DOM 飘字支持 <img>);
        //   比 JS 多保留上面的图标放大 + 箭雨 + 红屏震 动画 (PoC 改进)。
        spawnFloatingText(this, ev.sprite.x, ev.sprite.y - 20,
          `<img src="passive/hunter-kill-icon.png" style="width:22px;height:22px;vertical-align:middle">猎杀!`, 'crit-label');
        const execDmg = e.hp + (e.shield ?? 0);
        const r = applyRawDamage(e, execDmg, 'true');
        const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        battleStats.recordDamage(f, e, shown, 'tru');
        // G6: JS state.js:755-762 — 先保活 → triggerOnHitEffects(猎人 8% 吸血/泡泡束缚等) → 再杀
        e.alive = true;
        triggerOnHitEffects(f, e, execDmg, {
          floatNum: (t, txt, c) => { const tv = this.views.find(vv => vv.fighter === t); if (tv) this.spawnFloatingPassive(tv, txt, c); },
        });
        e.hp = 0; e.alive = false;
        battleStats.recordKill(f, e);
        this.tweens.add({ targets: ev.hpBar, width: 0, duration: 200 });
        ev.hpText.setText(`0/${e.maxHp}`);
        this.battleLog.log(`🎯 ${f.name} <b>猎杀</b> ${e.name}!`);
        // G7: 设 currentAttacker = 猎人, 让被处决者死亡被动(deathExplode/Hook)结算到正确攻击者
        this.currentAttacker = f;
        this.killView(ev);
        await new Promise<void>(r => this.time.delayedCall(500, () => r()));
      }
    }
  }

  /** 换形羁绊结算 + 飘字/统计/血条刷新 (lava 火山变身 / cyber 机甲变身 共用)。 */
  private grantShiftSynergy(view: FighterView) {
    const r = applyShiftSynergy(view.fighter);
    if (r.shieldAdded > 0) {
      battleStats.recordShield(view.fighter, r.shieldAdded);
      this.spawnFloatingPassive(view, `+${r.shieldAdded}🛡`, '#c0c0c0');
      this.updateHpVisual(view);
    }
    if (r.atkAdded > 0) this.spawnFloatingPassive(view, `换形 +${r.atkAdded}ATK`, '#ff9d5c');
  }

  /** 运气羁绊: 第1回合(战斗 setup)发物品到该侧装备席 (_synergyLuckGrant* 之前 set flag 从不消费, JS 亦 stub)。
   *  tier2: 1 个随机消耗品(全8种等概率); tier3: 额外 1 件随机装备(normal+unique)。flag 在 team[0]。 */
  private grantLuckSynergy(team: Fighter[], side: 'left' | 'right') {
    const h = team.find(f => {
      const x = f as Fighter & { _synergyLuckGrantConsumable?: number; _synergyLuckGrantEquip?: number };
      return x._synergyLuckGrantConsumable || x._synergyLuckGrantEquip;
    }) as (Fighter & { _synergyLuckGrantConsumable?: number; _synergyLuckGrantEquip?: number }) | undefined;
    if (!h) return;
    const sideName = side === 'left' ? '我方' : '敌方';
    if (h._synergyLuckGrantConsumable) {
      const pool = EQUIP_POOL.filter(e => e.category === 'consumable');
      if (pool.length) {
        const eq = pool[Math.floor(Math.random() * pool.length)];
        this.addToBench(eq, side);
        this.battleLog?.log(`🎲 运气羁绊: ${sideName}获得消耗品「${eq.name}」`);
      }
      h._synergyLuckGrantConsumable = 0;
    }
    if (h._synergyLuckGrantEquip) {
      const pool = EQUIP_POOL.filter(e => e.category === 'normal' || e.category === 'unique');
      if (pool.length) {
        const eq = pool[Math.floor(Math.random() * pool.length)];
        this.addToBench(eq, side);
        this.battleLog?.log(`🎲 运气羁绊: ${sideName}获得装备「${eq.name}」`);
      }
      h._synergyLuckGrantEquip = 0;
    }
  }

  /** v0.9.5.C1: lavaRage 完整 transform — JS state.js processLavaTransform (~90 行)
   *  怒气满 → 变身: +scaled HP/ATK/DEF/MR + 切 volcanoSkills + AOE 120% magic + 灼烧 + 回血
   *  倒计时: 变身结束 → 还原全部属性 + skill 集回 small form
   */
  private processLavaRage(view: FighterView) {
    const f = view.fighter as Fighter & {
      _lavaTransformed?: boolean;
      _lavaTransformTurns?: number;
      _lavaRage?: number;
      _lavaRageReady?: boolean;
      _lavaSpent?: boolean;
      _lavaSmallSkills?: typeof f.skills;
      _lavaHpGain?: number; _lavaAtkGain?: number; _lavaDefGain?: number; _lavaMrGain?: number;
      _lavaSmallName?: string;
    };
    if (f.passive?.type !== 'lavaRage') return;
    const p = f.passive;

    // 已变身: 倒计时 (每【回合】-1, 非每行动 — boss 行动2次会2倍速; 用回合闸, 与 buff/锁血一致)
    if (f._lavaTransformed) {
      const lf = f as Fighter & { _lastLavaTransformTickTurn?: number };
      if (lf._lastLavaTransformTickTurn === this.turn) return;   // 本回合已减过 (boss 第2次行动) → 跳
      lf._lastLavaTransformTickTurn = this.turn;
      const turns = (f._lavaTransformTurns ?? 0) - 1;
      f._lavaTransformTurns = turns;
      if (turns <= 0) {
        // 还原: 撤回 HP/ATK/DEF/MR + 切回 small skills
        f._lavaTransformed = false;
        f._lavaSpent = false;  // 允许下次变身 (JS 同款)
        f._lavaRage = 0;
        const oldMax = f.maxHp;
        f.maxHp = Math.max(1, f.maxHp - (f._lavaHpGain ?? 0));
        f.hp = Math.max(1, Math.round(f.hp * f.maxHp / oldMax));
        f.baseAtk -= (f._lavaAtkGain ?? 0); f.atk = f.baseAtk;
        f.baseDef -= (f._lavaDefGain ?? 0); f.def = f.baseDef;
        f.baseMr = Math.max(0, (f.baseMr ?? f.baseDef) - (f._lavaMrGain ?? 0));
        f.mr = f.baseMr;
        if (f._lavaSmallSkills) f.skills = f._lavaSmallSkills;
        if (f._lavaSmallName) f.name = f._lavaSmallName;
        this.swapPetTexture(view, 'pet-body-lava');   // J6: 还原小形态贴图
        // HP 条同步
        this.tweens.add({ targets: view.hpBar, width: 118 * (f.hp / f.maxHp), duration: 300 });
        view.hpText.setText(`${f.hp}/${f.maxHp}`);
        this.battleLog.log(`🌋 ${f.name} 火山形态结束, 恢复小形态`);
      }
      return;
    }

    // 未变身: 检查怒气是否满
    if (!f._lavaRageReady || f._lavaSpent) return;
    f._lavaRage = 0;
    f._lavaRageReady = false;
    f._lavaSpent = true;
    f._lavaTransformed = true;
    f._lavaTransformTurns = (p.transformDuration as number) ?? 6;

    // 保存 small form
    f._lavaSmallSkills = [...f.skills];
    f._lavaSmallName = f.name;

    // 计算 transform 加成 (基于变身前 ATK)
    const preAtk = f.atk;
    const hpGain = Math.round(preAtk * ((p.transformHpScale as number) ?? 4.0));
    const atkGain = Math.round(preAtk * ((p.transformAtkScale as number) ?? 1.5));
    const defGain = Math.round(preAtk * ((p.transformDefScale as number) ?? 0.8));
    const mrGain = Math.round(preAtk * ((p.transformMrScale as number) ?? 0.8));
    f._lavaHpGain = hpGain;
    f._lavaAtkGain = atkGain;
    f._lavaDefGain = defGain;
    f._lavaMrGain = mrGain;

    // 应用 stat boosts
    const oldMax = f.maxHp;
    f.maxHp += hpGain;
    f.hp = Math.round(f.hp * f.maxHp / oldMax);
    f.baseAtk += atkGain; f.atk = f.baseAtk;
    f.baseDef += defGain; f.def = f.baseDef;
    f.baseMr = (f.baseMr ?? f.baseDef) + mrGain; f.mr = f.baseMr;

    // 切 volcanoSkills (从 PET_BY_ID 拿) — JS state.js:596-601 1:1: 按【已装备 index】配对取火山技能
    //   (与 two_head 近战切换同款), 而非无脑 slice(0,3)。否则玩家选的小形态技能不带过来、岩浆践踏永远拿不到,
    //   且 强化熔岩之心(占一个槽的被动)无法体现"火山形态少一个技能槽"。passiveSkill 过滤天然处理少槽。
    const petDef = (PET_BY_ID as Record<string, { volcanoSkills?: typeof f.skills; defaultSkills?: number[] }>)[f.id];
    if (petDef?.volcanoSkills) {
      const volc = petDef.volcanoSkills;
      const eqIdxs = (f as Fighter & { _equippedIdxs?: number[] })._equippedIdxs ?? petDef.defaultSkills ?? [0, 1, 2];
      const paired = eqIdxs
        .filter(i => i < volc.length && !volc[i].passiveSkill)
        .map(i => ({ ...volc[i], cdLeft: 0 }));
      f.skills = paired.length ? paired : volc.filter(s => !s.passiveSkill).slice(0, 3).map(s => ({ ...s, cdLeft: 0 }));
    }
    f.name = '火山龟';
    this.swapPetTexture(view, 'pet-form-volcano');   // J6: 换火山形态贴图 (JS state.js:606)

    // 视觉: camera shake + 大粒子爆 + flash
    this.cameras.main.shake(500, 0.02);
    const sx = view.sprite.x, sy = view.sprite.y;
    const flash = this.add.rectangle(this.scale.width / 2, this.scale.height / 2,
      this.scale.width, this.scale.height, 0xff6600, 0.45).setDepth(200);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 500,
      onComplete: () => flash.destroy(),
    });
    const burst = this.add.particles(sx, sy, '__DEFAULT', {
      lifespan: 800, speed: { min: 100, max: 400 }, scale: { start: 1.5, end: 0 },
      tint: [0xff4400, 0xff8800, 0xffdd33], quantity: 28, blendMode: 'ADD', emitting: false,   // 性能P0: 60→28 (PERF-PLAN F)
    }).setDepth(45);
    burst.explode(28);
    this.time.delayedCall(900, () => burst.destroy());

    // HP 条同步
    this.tweens.add({ targets: view.hpBar, width: 118 * (f.hp / f.maxHp), duration: 400 });
    view.hpText.setText(`${f.hp}/${f.maxHp}`);
    this.spawnFloatingPassive(view, '🌋 变身!', '#ff6600');
    this.battleLog.log(`🌋 ${f.name} 变身! +${hpGain}HP +${atkGain}ATK +${defGain}DEF +${mrGain}MR (${f._lavaTransformTurns} 回合)`);
    this.grantShiftSynergy(view);   // 换形羁绊: 变身后护盾(+tier3 首次 ATK)

    // 变身 AOE: 120% post-transform ATK magic 全体敌方 + 灼烧 + 每次 +8% 已损 HP
    const aoeScale = (p.transformAoeDmgScale as number) ?? 1.2;
    const aoeDmg = Math.round(f.atk * aoeScale);
    const enemies = this.views.filter(v => v.fighter.side !== f.side && v.fighter.alive);
    this.currentAttacker = f;   // G7: 变身 AOE 击杀的死亡被动归熔岩龟
    for (const ev of enemies) {
      const e = ev.fighter;
      const effMr = calcEffMr(f, e);
      const dmg = Math.max(1, Math.round(aoeDmg * calcDmgMult(effMr) * ruleModifiers.magicMult()));
      const wasA = e.alive;
      const r = applyRawDamage(e, dmg, 'magic');
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      battleStats.recordDamage(f, e, shown, 'mag');
      if (wasA && !e.alive) battleStats.recordKill(f, e);
      this.spawnFloatingPassive(ev, `${shown}🌋`, '#ff6600');   // 伤害统一无符号
      this.tweens.add({ targets: ev.hpBar, width: 118 * (e.hp / e.maxHp), duration: 300 });
      ev.hpText.setText(`${e.hp}/${e.maxHp}`);
      // P89 1:1 JS state.js:638 applySkillDebuffs default — stacks = max(1, round(atk×0.67))
      //   JS state.js:637-647: 灼烧+回血都在 !burnImmune 内 → 对烧免疫敌不施灼烧也不回血
      const eBurnImmune = !!(e.passive && (e.passive as { burnImmune?: boolean }).burnImmune)
        || !!(e as Fighter & { _burnImmune?: boolean })._burnImmune;
      if (!eBurnImmune) {
        applyDotStacks(e, 'burn', defaultBurnStacks(f));
        this.refreshStatusIcons(ev);
        // 回 8% 已损 HP
        const lostHp = f.maxHp - f.hp;
        const burnHeal = Math.round(lostHp * 0.08);
        if (burnHeal > 0) {
          const before = f.hp;
          f.hp = Math.min(f.maxHp, f.hp + burnHeal);
          if (f.hp > before) this.spawnFloatingPassive(view, `+${f.hp - before}🌋`, '#06d6a0');
        }
      }
      if (!e.alive) this.killView(ev);
    }
  }

  /** v0.9.5.A82: 战斗开始时召唤物登场 (JS battle-setup.js:258-388 简化版)
   *
   *  覆盖 4 种召唤源:
   *  - summonAlly (缩头乌龟): 随机 C/B/A pet, hp = owner.maxHp × hpPct/100, 占空 slot
   *  - pirateShipPassive (海盗龟): 海盗船虚拟单位, 每回合自动开炮 0.2×owner.atk
   *  - candyBombPassive (糖果龟): 糖果炸弹 (P2 简化: 给 owner +burn 抗性 buff)
   *  - crystalBall (水晶龟): 水晶球 (P2 简化: 给 owner +shield)
   */
  private processBattleStartSummons(_width: number) {
    const initial = [...this.views];  // 避免新 push 进的影响迭代
    for (const owner of initial) {
      const f = owner.fighter;
      const passive = f.passive;
      const allPassive = [...(f._passiveSkills as unknown[] ?? [])] as Array<{ type?: string; hpPct?: number; maxRarity?: string }>;
      const passives: Array<{ type?: string; hpPct?: number; maxRarity?: string }> = [];
      if (passive && typeof passive === 'object') passives.push(passive as { type?: string });
      passives.push(...allPassive);

      for (const p of passives) {
        if (!p || typeof p !== 'object') continue;

        if (p.type === 'summonAlly') {
          this.spawnSummonAlly(owner, p as { hpPct?: number; maxRarity?: string });
        } else if (p.type === 'sweetTrap') {
          // 糖果龟「糖果罐」被动 (JS battle-setup.js:420-426): 开局在己方装备席放 1 个糖果罐, 打碎按回合掉落。
          const jar = EQUIP_POOL.find(e => e.id === 'c_candy_jar');
          if (jar) {
            this.addToBench({ ...jar }, f.side);
            this.battleLog.log(`${f.emoji}${f.name} 被动「糖果罐」: 装备席获得 🍬糖果罐 (点击「打碎」按回合掉落奖励)`);
          }
        } else if (p.type === 'pirateShipPassive') {
          // P29 fix: JS turn.js:347 spawns ship on TURN 3, not battle start.
          // Mark flag here; turn-3 trigger fires actual spawn.
          // Also disable base pirateBarrage opening/death-hook per JS fighter.js:259-266.
          const f = owner.fighter as Fighter & { _pirateShipEnabled?: boolean };
          f._pirateShipEnabled = true;
          if (f.passive && f.passive.type === 'pirateBarrage') {
            (f.passive as { bombardPct?: number; deathHookPct?: number }).bombardPct = 0;
            (f.passive as { bombardPct?: number; deathHookPct?: number }).deathHookPct = 0;
          }
        } else if (p.type === 'crystalBall') {
          // P133: 完整水晶球 1:1 JS main.js:325-374 _spawnCrystalBall
          //   独立 fighter (50% owner maxHp, 1× owner atk, 0 def/mr/crit),
          //   占独立 slot, 友方都行动后射 2-seg 魔法光线沿目标列.
          //   owner 死 → ball 死 (同步).
          this.spawnCrystalBall(owner);
        } else if (p.type === 'candyBombPassive') {
          // K9: 完整糖果炸弹 (JS main.js:378-423 _spawnCandyBomb) — 召唤 40% owner maxHp 实体,
          //   逐回合衰减, 死亡引爆 150% maxHp 分摊全敌。取代旧"出场一次性 -20"简化。
          this.spawnCandyBomb(owner, p as { hpPct?: number; decayPct?: number; explodePct?: number });
        }
      }
    }
  }

  /** 召唤随从 (缩头乌龟 summonAlly): 占空 slot, hp = owner.maxHp × hpPct% */
  private spawnSummonAlly(owner: FighterView, passive: { hpPct?: number; maxRarity?: string }) {
    const ownerF = owner.fighter;
    const hpPct = passive.hpPct ?? 40;
    const maxR = passive.maxRarity ?? 'A';
    const validRarities = maxR === 'A' ? ['C', 'B', 'A']
      : maxR === 'B' ? ['C', 'B']
      : ['C'];

    // 找候选 (排除已上场的)
    const usedIds = new Set(this.views.map(v => v.fighter.id));
    const candidates = ALL_PETS.filter(p => validRarities.includes(p.rarity) && !usedIds.has(p.id));
    if (candidates.length === 0) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];

    // Phase C: JS main.js:328-336 1:1 — 优先用 owner._savedSummonSlot (TeamSelect 玩家拖的位置)
    const team = this.views.filter(v => v.fighter.side === ownerF.side);
    const used = new Set(team.map(v => (v.fighter as Fighter & { _slotKey?: string })._slotKey).filter(Boolean));
    const savedSlot = (ownerF as Fighter & { _savedSummonSlot?: string })._savedSummonSlot;
    let slotKey: string | undefined = savedSlot && !used.has(savedSlot) ? savedSlot : undefined;
    if (!slotKey) {
      const order = ['back-2', 'back-1', 'back-0', 'front-2', 'front-1', 'front-0'];
      slotKey = order.find(s => !used.has(s));
    }
    if (!slotKey) {
      this.battleLog.log(`📢 ${ownerF.name} 召唤失败: 阵地已满`);
      return;
    }

    // 2026-05-30 港 JS: 按主人等级随机抽 1 基础 + 已解锁池(idx 0/1/2 始终; idx 3 lv≥4; idx 4 lv≥7),
    //   30% 概率含 1 个被动技。aiPickSkills 返 null → 池≤3 用 defaultSkills。
    //   防御性再过 SUMMON_SPAWNS_UNIT (JS:316) — 现这 5 项都是 passiveSkill 已被 createFighter 过滤,
    //   但留着防以后被动 flag 改了。
    const ownerLv = (ownerF._level as number) ?? 1;
    const skillPool = (pick.skillPool ?? []) as Array<{ type?: string; passiveSkill?: boolean; isAlly?: boolean }>;
    const SUMMON_SPAWNS_UNIT = new Set(['pirateShipPassive', 'crystalBall', 'candyBombPassive',
      'cyberEnhancedDrone', 'hidingEnhancedSummon']);
    let pickedIdxs = aiPickSkills(skillPool, ownerLv);
    if (pickedIdxs) {
      pickedIdxs = pickedIdxs.filter(i => skillPool[i] && !SUMMON_SPAWNS_UNIT.has(skillPool[i].type ?? ''));
      if (pickedIdxs.length === 0) pickedIdxs = null;   // 全过滤掉了 → fallback defaultSkills
    }
    // 创建 fighter (用 createFighter, 然后改 hp/maxHp 到 owner × hpPct%)
    const summon = createFighter(pick.id, ownerF.side, pickedIdxs ? { equippedIdxs: pickedIdxs } : undefined);
    // #8 低#9: 强化喊龟时按主体减半前的原始 maxHp 算随从血 (_summonHpBase); 普通喊龟无此字段 → 用当前 maxHp
    const hpBasis = (ownerF as Fighter & { _summonHpBase?: number })._summonHpBase ?? ownerF.maxHp;
    const sHp = Math.round(hpBasis * hpPct / 100);
    summon.maxHp = sHp;
    summon.hp = sHp;
    (summon as Fighter & { _slotKey?: string })._slotKey = slotKey;
    summon._position = slotKey.startsWith('front') ? 'front' : 'back';
    (summon as Fighter & { _isSummon?: boolean; _owner?: Fighter })._isSummon = true;
    (summon as Fighter & { _isSummon?: boolean; _owner?: Fighter })._owner = ownerF;
    summon._level = ownerF._level;   // 召唤物显示等级随主人
    // I7: 反向挂 owner._summon (JS battle-setup.js:325) — 否则 hidingBuffSummon/hidingCommand
    //   永远读到 undefined → "随从已亡" 永久禁用。
    (ownerF as Fighter & { _summon?: Fighter })._summon = summon;

    // 渲染
    const { width } = this.scale.gameSize;
    const { x, y } = this.slotToCoords(slotKey, ownerF.side, width);
    const view = this.makeView(summon, x, y);
    this.views.push(view);

    this.battleLog.log(`📢 ${ownerF.name} 召唤了 ${summon.name} 作为随从 (${sHp}HP)`);
  }

  /**
   * P133: 水晶球 1:1 JS main.js:325-374 _spawnCrystalBall
   * 独立 fighter, maxHp = 50% owner.maxHp, atk = 100% owner.atk, 0 def/mr/crit
   * 占独立 slot (优先 _savedCrystalBallSlot, 否则 back→front), 不主动出招
   * 友方都行动结束后由 processCrystalBallBeam 触发射魔法光线
   */
  private spawnCrystalBall(owner: FighterView): void {
    const ownerF = owner.fighter as Fighter & { _crystalBall?: Fighter; _savedCrystalBallSlot?: string };
    if (!ownerF.alive) return;
    if (ownerF._crystalBall) return;   // 已召唤
    // 找 slot
    const team = this.views.filter(v => v.fighter.side === ownerF.side);
    const used = new Set(team.map(v => (v.fighter as Fighter & { _slotKey?: string })._slotKey).filter(Boolean));
    const saved = ownerF._savedCrystalBallSlot;
    let slotKey: string | undefined = saved && !used.has(saved) ? saved : undefined;
    if (!slotKey) {
      const order = ['back-2', 'back-1', 'back-0', 'front-2', 'front-1', 'front-0'];
      slotKey = order.find(s => !used.has(s));
    }
    if (!slotKey) {
      this.battleLog.log(`${ownerF.emoji}${ownerF.name} 水晶球: 阵型已满, 无空位召唤`);
      return;
    }
    const ballHp = Math.round(ownerF.maxHp * 0.5);
    const ballAtk = Math.round(ownerF.atk * 1.0);
    // 用 createFighter('basic'-like) 然后覆写为 ball 属性. crystal-ball.png 已 BootScene 预载.
    const ball = createFighter('crystal', ownerF.side) as Fighter & {
      _isCrystalBall?: boolean; _owner?: Fighter; _slotKey?: string;
    };
    ball.id = 'crystal-ball';
    ball.name = '水晶球';
    ball.emoji = '🔮';
    ball.maxHp = ballHp; ball.hp = ballHp; ball.shield = 0;
    ball.baseAtk = ballAtk; ball.atk = ballAtk;
    ball.baseDef = 0; ball.def = 0; ball.baseMr = 0; ball.mr = 0;
    ball.crit = 0; ball.armorPen = 0; ball.armorPenPct = 0; ball.magicPen = 0; ball.magicPenPct = 0;
    // 展示用被动 (魔法射线) — 仅详情面板显示, 无 handler 监听 crystalBeam → 不触发逻辑; 真正射线走 processCrystalBallBeam。
    ball.passive = {
      type: 'crystalBeam', name: '魔法射线',
      brief: '友方全部行动后, 沿目标纵列射出魔法光线: 2 段各 50%×攻击力 魔法 + 每段叠 1 层结晶印记。',
      desc: '友方所有龟行动结束后, 水晶球沿目标所在纵列射出魔法光线, 对沿途敌人造成 2 段、每段 50%×攻击力的魔法伤害(受魔抗减免), 每段命中叠 1 层结晶印记(与水晶龟本体共享, 满 4 层引爆)。',
    } as Fighter['passive'];
    ball.skills = [];   // 不主动出招
    ball._slotKey = slotKey;
    ball._position = slotKey.startsWith('front') ? 'front' : 'back';
    ball._isCrystalBall = true;
    ball._owner = ownerF;
    ball._level = ownerF._level;   // 召唤物显示等级随主人
    ownerF._crystalBall = ball;
    // 渲染
    const { width } = this.scale.gameSize;
    const { x, y } = this.slotToCoords(slotKey, ownerF.side, width);
    const view = this.makeView(ball, x, y);
    this.views.push(view);
    this.battleLog.log(`${ownerF.emoji}${ownerF.name} <span class="log-passive">🔮水晶球登场！(${ballHp}HP)</span>`);
  }

  // ══════════════════════════════════════════════════════════
  // K9: 糖果炸弹 — JS main.js:378-445 _spawnCandyBomb / _detonateCandyBomb 1:1
  //   召唤 40% owner maxHp 实体 (占空 slot, 0 攻防, 不行动), 逐回合衰减 decayPct,
  //   死亡(衰减归零 或 被击杀) 引爆 explodePct% 自身 maxHp 总魔法, 分摊全部存活敌人 + 爆炸 VFX。
  // ══════════════════════════════════════════════════════════
  private spawnCandyBomb(owner: FighterView, passive: { hpPct?: number; decayPct?: number; explodePct?: number }): void {
    const ownerF = owner.fighter as Fighter & { _candyBomb?: Fighter; _savedCandyBombSlot?: string };
    if (!ownerF.alive || ownerF._candyBomb) return;
    const team = this.views.filter(v => v.fighter.side === ownerF.side);
    const used = new Set(team.map(v => (v.fighter as Fighter & { _slotKey?: string })._slotKey).filter(Boolean));
    const saved = ownerF._savedCandyBombSlot;
    let slotKey: string | undefined = saved && !used.has(saved) ? saved : undefined;
    if (!slotKey) {
      const order = ['back-2', 'back-1', 'back-0', 'front-2', 'front-1', 'front-0'];
      slotKey = order.find(s => !used.has(s));
    }
    if (!slotKey) { this.battleLog.log(`${ownerF.emoji}${ownerF.name} 糖果炸弹: 阵型已满, 无空位召唤`); return; }
    const hpPct = passive.hpPct ?? 40, decayPct = passive.decayPct ?? 20, explodePct = passive.explodePct ?? 150;
    const bombHp = Math.max(1, Math.round(ownerF.maxHp * hpPct / 100));
    const bomb = createFighter('candy', ownerF.side) as Fighter & {
      _isCandyBomb?: boolean; _owner?: Fighter; _slotKey?: string;
      _candyBombDecayPct?: number; _candyBombExplodePct?: number; _candyBombDetonated?: boolean; _spawnTurn?: number;
    };
    bomb.id = 'candy-bomb'; bomb.name = '糖果炸弹'; bomb.emoji = '🍬💣';
    bomb.maxHp = bombHp; bomb.hp = bombHp; bomb.shield = 0;
    bomb.baseAtk = 0; bomb.atk = 0; bomb.baseDef = 0; bomb.def = 0; bomb.baseMr = 0; bomb.mr = 0;
    bomb.crit = 0; bomb.armorPen = 0; bomb.armorPenPct = 0; bomb.magicPen = 0; bomb.magicPenPct = 0;
    // 展示用被动 (糖果炸弹自爆) — 仅供详情面板显示, 无 handler 监听 candyBombExplode → 不触发任何逻辑;
    //   真正的衰减/引爆走 processCandyBombDecay / detonateCandyBomb。图标=糖果炸弹技能图。
    bomb.passive = {
      type: 'candyBombExplode', name: '糖果炸弹',
      brief: `每回合损失 20% 最大生命值; 生命归零时引爆, 对全体敌方造成共 ${explodePct}% 自身最大生命值的魔法伤害(吃魔抗), 由存活敌人均摊。`,
      desc: `每回合开始损失 ${decayPct}% 自身最大生命值; 生命归零(自损或被击杀)时引爆: 对全体敌方造成总计 ${explodePct}% 自身最大生命值的魔法伤害(受魔抗减免), 由所有存活敌人均摊(每只受 总伤害 ÷ 存活敌人数)。`,
    } as Fighter['passive'];
    bomb.skills = [];
    bomb._slotKey = slotKey; bomb._position = slotKey.startsWith('front') ? 'front' : 'back';
    bomb._isCandyBomb = true; bomb._owner = ownerF;
    bomb._level = ownerF._level;   // 召唤物显示等级随主人 (用户: 原来一直 Lv.1)
    bomb._candyBombDecayPct = decayPct; bomb._candyBombExplodePct = explodePct;
    bomb._spawnTurn = this.turn;   // 出生回合不衰减 (JS _spawnTurn)
    ownerF._candyBomb = bomb;
    const { width } = this.scale.gameSize;
    const { x, y } = this.slotToCoords(slotKey, ownerF.side, width);
    const v = this.makeView(bomb, x, y);
    this.views.push(v);
    this.battleLog.log(`${ownerF.emoji}${ownerF.name} <span class="log-passive">🍬💣糖果炸弹登场！(${bombHp}HP)</span>`);
  }

  /** K9: 逐回合衰减全部糖果炸弹 (JS turn.js:104-113) — 每回合 -decayPct% maxHp, 归零则引爆。回合开始调。 */
  private processCandyBombDecay(): void {
    for (const v of [...this.views]) {
      const b = v.fighter as Fighter & {
        _isCandyBomb?: boolean; _candyBombDecayPct?: number; _candyBombDetonated?: boolean; _spawnTurn?: number;
      };
      if (!b._isCandyBomb || !b.alive || b._candyBombDetonated) continue;
      if ((b._spawnTurn ?? 0) >= this.turn) continue;   // 出生回合不衰减
      const dec = Math.max(1, Math.round(b.maxHp * (b._candyBombDecayPct ?? 20) / 100));
      // 自衰减走标准伤害收口 applyRawDamage(自损真伤), 不再裸 b.hp-=dec —— "扣血走规矩"。
      //   不记 battleStats: 这是引信自耗, 非对敌输出; 真正算输出的是引爆那段(已记 mag)。
      const r = applyRawDamage(b, dec, 'true', true);
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      // 自损 → dot-dmg 弹跳飘字 (与别的飘字统一, 无 emoji)
      spawnFloatingText(this, v.sprite.x, v.sprite.y, `-${shown}`, 'dot-dmg', { amount: shown });
      this.updateHpVisual(v, { duration: 200 });
      if (b.hp <= 0) {
        b.alive = false;
        this.detonateCandyBomb(b);
        this.killView(v);
      }
    }
  }

  /** K9: 糖果炸弹引爆 (JS main.js:426-445) — explodePct% 自身 maxHp 总魔法分摊全敌 + 爆炸 VFX + 震屏 */
  private detonateCandyBomb(bomb: Fighter): void {
    const bf = bomb as Fighter & { _candyBombDetonated?: boolean; _candyBombExplodePct?: number };
    if (bf._candyBombDetonated) return;
    bf._candyBombDetonated = true;
    const bv = this.views.find(v => v.fighter === bomb);
    if (bv) {
      const boom = this.add.particles(bv.sprite.x, bv.sprite.y, '__DEFAULT', {
        lifespan: 480, speed: { min: 90, max: 300 }, scale: { start: 1.3, end: 0 },
        tint: [0xff6bd6, 0xffd93d, 0xff5050], quantity: 28, blendMode: 'ADD', emitting: false,   // 性能P0: 36→28 (PERF-PLAN F)
      }).setDepth(48);
      boom.explode(28);
      this.time.delayedCall(560, () => boom.destroy());
      this.cameras.main.shake(260, 0.01);
    }
    const enemies = this.views.map(v => v.fighter).filter(e => e.alive && e.side !== bomb.side);
    if (!enemies.length) return;
    const totalDmg = Math.max(1, Math.round(bomb.maxHp * (bf._candyBombExplodePct ?? 150) / 100));
    const baseShare = Math.max(1, Math.round(totalDmg / enemies.length));   // 均摊基数 (魔抗减免前)
    this.battleLog.log(`💥 糖果炸弹引爆！全体敌方均摊 ${totalDmg} 法术 (每只基数 ${baseShare}, 过魔抗)`);
    for (const e of enemies) {
      if (!e.alive) continue;
      // 用户 2026-05-29: 炸弹魔法伤害吃魔抗 (与其它魔法技能一致; 炸弹无魔穿 → calcEffMr=目标魔抗)
      const dealt = Math.max(1, Math.round(baseShare * calcDmgMult(calcEffMr(bomb, e))));
      const r = applyRawDamage(e, dealt, 'magic');
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      battleStats.recordDamage(bomb, e, shown, 'mag');
      if (!e.alive) battleStats.recordKill(bomb, e);   // 炸弹炸死也记击杀 (原漏)
      const ev = this.views.find(v => v.fighter === e);
      if (ev) {
        spawnFloatingText(this, ev.sprite.x, ev.sprite.y, `${shown}`, 'magic-dmg', { amount: shown, atkSide: bomb.side === 'left' ? 'right' : 'left' });
        this.updateHpVisual(ev, { duration: 200 });
        if (!e.alive) this.killView(ev);
      }
    }
  }

  /**
   * P133: 水晶球射线 1:1 JS main.js:452-485 processCrystalBallBeam
   * activeSide 所有龟行动结束后, 该侧水晶球射魔法光线:
   *   随机敌人方向 + 沿目标列 (同 column 全部敌人) + 2 段每段 0.5×ATK 魔法
   *   每段命中给目标加 1 层 _crystallize (跟水晶龟本体共享, 满 4 引爆)
   */
  private async processCrystalBallBeam(activeSide: 'left' | 'right'): Promise<void> {
    const balls = this.views.filter(v => {
      const f = v.fighter as Fighter & { _isCrystalBall?: boolean; _owner?: Fighter };
      return f.alive && f._isCrystalBall && f.side === activeSide && f._owner?.alive;
    });
    for (const ballView of balls) {
      const ball = ballView.fighter;
      const enemies = this.views
        .map(v => v.fighter)
        .filter(f => f.side !== activeSide && f.alive);
      if (!enemies.length) continue;
      const aim = enemies[Math.floor(Math.random() * enemies.length)];
      const aimSlot = (aim as Fighter & { _slotKey?: string })._slotKey;
      const aimCol = aimSlot ? aimSlot.split('-')[1] : null;
      const inPath: Fighter[] = aimCol
        ? enemies.filter(e => ((e as Fighter & { _slotKey?: string })._slotKey ?? '').endsWith('-' + aimCol))
        : [aim];
      if (!inPath.length) continue;
      this.battleLog.log(`${ball.emoji}${ball.name} 射出魔法光线！`);
      // K1: 水晶光线 VFX (JS drawCrystalBeam) — 从水晶球朝目标方向射红警告→蓝紫光线
      const aimView = this.views.find(v => v.fighter === aim);
      if (aimView) await castCrystalBeam(this, ballView.sprite.x, ballView.sprite.y, aimView.sprite.x, aimView.sprite.y);
      const segDmgBase = Math.round(ball.atk * 0.5);
      // 结晶层数归属水晶龟本体 (共享 _crystallize, 用本体 passive 参数引爆); 本体不在则退回 ball
      const crystalOwner = (ball as Fighter & { _owner?: Fighter })._owner ?? ball;
      const beamCtx = {
        floatNum: (t: Fighter, text: string) => {
          const tv = this.views.find(v => v.fighter === t);
          if (tv) spawnFloatingText(this, tv.sprite.x, tv.sprite.y, text, 'magic-dmg',
            { atkSide: ball.side === 'left' ? 'right' : 'left' });
        },
        log: (text: string) => this.battleLog.log(text),
      };
      for (let seg = 0; seg < 2; seg++) {
        for (const e of inPath) {
          if (!e.alive) continue;
          // 标准魔法 → 吃魔抗 (calcEffMr; 球无魔穿=目标魔抗) + 记击杀 (原 raw 不减魔抗、漏 recordKill)
          const dealt = Math.max(1, Math.round(segDmgBase * calcDmgMult(calcEffMr(ball, e))));
          const wasAlive = e.alive;
          const r = applyRawDamage(e, dealt, 'magic');
          const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
          battleStats.recordDamage(ball, e, shown, 'mag');
          if (wasAlive && !e.alive) battleStats.recordKill(ball, e);
          // 叠 1 层结晶 (与水晶龟本体共享 _crystallize, 满4引爆); 引爆伤害合并进本次射线数字 (JS Ornn脆风格)
          let boom = 0;
          if (e.alive) {
            applyCrystallizeStack(crystalOwner, e, beamCtx);
            boom = (e as Fighter & { _pendingCrystalBoom?: number })._pendingCrystalBoom ?? 0;
            (e as Fighter & { _pendingCrystalBoom?: number })._pendingCrystalBoom = 0;
          }
          const ev = this.views.find(v => v.fighter === e);
          if (ev) {
            spawnFloatingText(this, ev.sprite.x, ev.sprite.y, `${shown + boom}`, 'magic-dmg',
              { amount: shown + boom, atkSide: ball.side === 'left' ? 'right' : 'left' });
          }
          if (!e.alive && ev) this.killView(ev);
        }
        await new Promise<void>(r => this.time.delayedCall(200, r));
      }
    }
  }

  /**
   * E3/28: 召唤大熊 (玩偶小熊装备满 5 层) — JS equip-effects.js:752-790 1:1 port
   * 250 HP / 50 ATK / 25 DEF/MR, 无 passive 无 skill, _isSummon 标记
   * 占空 slot (front 优先); 没空位返回 false (调用方继续攒层, 不归零)
   */
  private spawnDollBear(ownerF: Fighter): boolean {
    const team = this.views.filter(v => v.fighter.side === ownerF.side && v.fighter.alive);
    const used = new Set(team.map(v => (v.fighter as Fighter & { _slotKey?: string })._slotKey).filter(Boolean));
    const order = ['front-0', 'front-1', 'front-2', 'back-0', 'back-1', 'back-2'];
    const slotKey = order.find(s => !used.has(s));
    if (!slotKey) return false;

    // 借 'basic' 模板 createFighter 然后覆写为大熊属性
    const bear = createFighter('basic', ownerF.side);
    bear.id = 'doll_bear';
    bear.name = '大熊';
    bear.emoji = '🧸';
    bear.rarity = 'C';
    bear.maxHp = 250; bear.hp = 250; bear.shield = 0;
    bear.baseAtk = 50; bear.atk = 50;
    bear.baseDef = 25; bear.def = 25;
    bear.baseMr = 25; bear.mr = 25;
    bear.crit = 0; bear.armorPen = 0; bear.armorPenPct = 0;
    bear.magicPen = 0; bear.magicPenPct = 0;
    bear.passive = null;
    bear.buffs = [];
    // 修(2026-05-30 v2 用户): 之前 skills=[] → summonAutoAction line 5606 早 return → 大熊召唤后永不攻击,
    //   与装备描述"加入战斗 + 50攻击力"严重不符 (JS 也有同款 bug, 这里改进过 JS)。
    //   给大熊一个 1.0×ATK 单体物理「熊掌挥击」cd 0 — summonAutoAction 会自动选它打对方阵营。
    bear.skills = [{
      name: '熊掌挥击', type: 'physical', hits: 1, power: 0, pierce: 0, cd: 0, cdLeft: 0,
      atkScale: 1.0,
      brief: '大熊向敌人挥出熊掌, 造成（{N:1.0*ATK}）物理伤害。',
      detail: '大熊向对方阵营一名敌人发起攻击, 造成 100%×攻击力({ATK}) = {N:1.0*ATK} 物理伤害。',
    }] as unknown as typeof bear.skills;
    bear.equipment = [];
    bear.alive = true;
    (bear as Fighter & { _initHp?: number; _initAtk?: number; _initDef?: number; _initMr?: number; _initCrit?: number; _initArmorPen?: number })._initHp = 250;
    (bear as Fighter & { _initAtk?: number })._initAtk = 50;
    (bear as Fighter & { _initDef?: number })._initDef = 25;
    (bear as Fighter & { _initMr?: number })._initMr = 25;
    (bear as Fighter & { _initCrit?: number })._initCrit = 0;
    (bear as Fighter & { _initArmorPen?: number })._initArmorPen = 0;
    (bear as Fighter & { _slotKey?: string })._slotKey = slotKey;
    bear._position = slotKey.startsWith('front') ? 'front' : 'back';
    (bear as Fighter & { _isSummon?: boolean; _owner?: Fighter })._isSummon = true;
    (bear as Fighter & { _isSummon?: boolean; _owner?: Fighter })._owner = ownerF;

    // P65 fix: 召唤羁绊加成字段名 — synergies.ts:134/138 是 _synergySummonAtkFlat (不是 AtkBoost)
    // JS equip-effects.js:783-784 同款 _synergySummonHpBoost (×%) + _synergySummonAtkFlat (+整数)
    const oAny = ownerF as Fighter & { _synergySummonHpBoost?: number; _synergySummonAtkFlat?: number };
    if (oAny._synergySummonHpBoost) {
      bear.maxHp = Math.round(bear.maxHp * (1 + oAny._synergySummonHpBoost));
      bear.hp = bear.maxHp;
    }
    if (oAny._synergySummonAtkFlat) {
      bear.baseAtk += oAny._synergySummonAtkFlat;
      bear.atk = bear.baseAtk;
    }

    const { width } = this.scale.gameSize;
    const { x, y } = this.slotToCoords(slotKey, ownerF.side, width);
    const view = this.makeView(bear, x, y);
    this.views.push(view);
    return true;
  }

  /** P29 1:1 JS turn.js:357-394 — 海盗船召唤 (turn 3 trigger).
   *   maxHp = owner.maxHp × 1.5 (NOT 0.6), atk = owner.atk, def/mr = 0
   *   slot 优先 F1→F2→F3→B1→B2→B3 (JS:353 同款, 之前 PoC 反序错的)
   *   skills: 单一'开炮' physical hits:1 atkScale:0.2
   *   FloatNum 在 OWNER 上 (NOT ship): "海盗船登场!" crit-label yOff -25 */
  private spawnPirateShip(owner: FighterView) {
    const ownerF = owner.fighter;
    const team = this.views.filter(v => v.fighter.side === ownerF.side && v.fighter.alive);
    const used = new Set(team.map(v => (v.fighter as Fighter & { _slotKey?: string })._slotKey).filter(Boolean));
    // JS turn.js:353 — F1 优先
    const order = ['front-0', 'front-1', 'front-2', 'back-0', 'back-1', 'back-2'];
    const slotKey = order.find(s => !used.has(s)) ?? 'back-2';

    const shipHp = Math.round(ownerF.maxHp * 1.5);    // JS:357 ×1.5 (PoC 之前 ×0.6 错!)
    const shipAtk = ownerF.atk;
    const ship: Fighter = {
      ...createFighter('hiding', ownerF.side),  // 借 hiding 模板, 之后覆写
      id: 'pirate-ship',
      name: '海盗船',
      emoji: '🚢',
      rarity: ownerF.rarity,
      maxHp: shipHp, hp: shipHp, shield: 0,
      baseAtk: shipAtk, atk: shipAtk,
      baseDef: 0, def: 0, baseMr: 0, mr: 0,
      crit: 0, armorPen: 0, magicPen: 0,
      // 展示用被动 (海盗船开炮) — 仅详情面板显示, 无 handler 监听 pirateShipFire → 不触发逻辑;
      //   真正开炮走 processPirateShipFire。图标=火炮齐射图。
      passive: {
        type: 'pirateShipFire', name: '开炮',
        brief: '海盗船每回合自动对一名随机敌人开炮, 造成 20%×攻击力的物理伤害。',
        desc: '海盗船每回合自动对一名随机敌人开炮, 造成 20%×攻击力的物理伤害(过护甲)。',
      } as Fighter['passive'],
      buffs: [],
      // JS:384 — 单一 '开炮' 技能 0.2×ATK 物理
      skills: [{ name: '开炮', type: 'physical', hits: 1, power: 0, atkScale: 0.2, cd: 0, cdLeft: 0 } as unknown as Fighter['skills'][0]],
      equipment: [],
      alive: true,
    } as Fighter;
    (ship as Fighter & { _initHp?: number })._initHp = shipHp;
    (ship as Fighter & { _initAtk?: number })._initAtk = shipAtk;
    (ship as Fighter & { _slotKey?: string })._slotKey = slotKey;
    ship._position = slotKey.startsWith('front') ? 'front' : 'back';
    (ship as Fighter & { _isPirateShip?: boolean; _shipFireScale?: number; _owner?: Fighter; _shipOwner?: Fighter })._isPirateShip = true;
    (ship as Fighter & { _isPirateShip?: boolean; _shipFireScale?: number; _owner?: Fighter; _shipOwner?: Fighter })._shipFireScale = 0.2;
    (ship as Fighter & { _isPirateShip?: boolean; _shipFireScale?: number; _owner?: Fighter; _shipOwner?: Fighter })._shipOwner = ownerF;
    (ownerF as Fighter & { _pirateShip?: Fighter })._pirateShip = ship;
    ship._level = ownerF._level;   // 召唤物显示等级随主人

    const { width } = this.scale.gameSize;
    const { x, y } = this.slotToCoords(slotKey, ownerF.side, width);
    const view = this.makeView(ship, x, y);
    this.views.push(view);

    // JS turn.js:391 — FloatNum 在 OWNER 上, NOT ship
    spawnFloatingText(this, owner.sprite.x, owner.sprite.y - 25, '海盗船登场!', 'crit-label');
    this.battleLog.log(`🚢 ${ownerF.name} 的海盗船在${ship._position === 'front' ? '前排' : '后排'}登场！HP${shipHp} ATK${shipAtk}`);
  }

  /** v0.9.5.A82: 海盗船每回合自动开炮 (JS turn.js:84-99) */
  private processPirateShipFire(allFighters: Fighter[]) {
    for (const f of allFighters) {
      const ship = f as Fighter & { _isPirateShip?: boolean; _shipFireScale?: number };
      if (!ship._isPirateShip || !f.alive) continue;
      const enemies = allFighters.filter(e => e.alive && e.side !== f.side);
      if (!enemies.length) continue;
      const target = enemies[Math.floor(Math.random() * enemies.length)];
      const dmg = Math.round(f.atk * (ship._shipFireScale ?? 0.2));
      // 走标准 calcDamage (统一 DEF_CONSTANT=40) — 修原手算 eff/(eff+100) 常数错误 (海盗船曾超伤)
      const final = Math.max(1, Math.round(calcDamage(f, target, dmg, 'physical')));
      const wasAlive = target.alive;
      const r = applyRawDamage(target, final, 'physical');
      const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
      battleStats.recordDamage(f, target, shown, 'phy');   // 计入战绩 (原来海盗船伤害根本不进统计)
      if (wasAlive && !target.alive) battleStats.recordKill(f, target);
      const view = this.views.find(v => v.fighter === target);
      if (view) {
        this.updateHpVisual(view, { duration: 200 });
        view.hpText.setText(`${target.hp}/${target.maxHp}`);
        // 飘字走伤害弹跳路径 (原来自绘 -N💥 直直上飘) — 海盗船开炮=物理, 用 direct-dmg
        spawnFloatingText(this, view.sprite.x, view.sprite.y, `-${shown}`, 'direct-dmg', { amount: shown });
        if (!target.alive) this.killView(view);
      }
      this.battleLog.log(`🚢 海盗船开炮 → ${target.emoji}${target.name}：${shown} 物理`);
    }
  }

  /** v0.9.5.A91: 中立生物双方各 1 (JS events.js:269-303 spawnPairedNeutral)
   *  - 海葵母: 寄生型, 不站场不占 slot, 附在双方各 1 只活寄主身上 (+护盾 +攻击); 满格也能出
   *  - 宝箱怪/巨蟹: 站场实体, 占 1 空 slot (前排优先), 该侧满则跳过 */
  private spawnNeutralPair(type: 'treasure' | 'crab' | 'anemone') {
    const template = NEUTRAL_TEMPLATES[type];
    if (!template) return;

    if (type === 'anemone') {
      let attached = 0;
      for (const side of ['left', 'right'] as const) {
        // 寄主: 前排优先的活真龟 (排除事件生物/召唤物/大师)
        const candidates = this.views.filter(v => {
          const f = v.fighter as Fighter & { _isNeutral?: boolean; _isMasterTrainer?: boolean; _untargetable?: boolean };
          return f.side === side && f.alive && !f._isNeutral && !f._isMasterTrainer && !f._untargetable;
        }).map(v => v.fighter);
        if (!candidates.length) continue;
        const host = candidates.find(c => c._position === 'front') ?? candidates[0];
        const h = host as Fighter & { _anemoneShield?: number; _anemoneActive?: string; _anemoneHostAtkBonus?: number };
        h._anemoneShield = (h._anemoneShield ?? 0) + (template.parasiteShield ?? 350);
        h._anemoneActive = side;
        h._anemoneHostAtkBonus = template.hostAtkBonus ?? 15;
        host.baseAtk += template.hostAtkBonus ?? 15;
        host.atk = host.baseAtk;
        this.syncHpView(host);
        const hv = this.views.find(v => v.fighter === host);
        if (hv) this.spawnFloatingPassive(hv, `🪼+${template.parasiteShield ?? 350}🛡`, '#7fd4ff');
        attached++;
      }
      if (attached > 0) {
        this.neutralSpawned = true;
        this.flashEventEntrance();
        this.showCenterBanner('🪼 海葵母寄生!', 1500, '#7fd4ff');
        this.battleLog.log('✦ 中立: 海葵母寄生双方各 1 只寄主 (+15 攻 / +350 寄生护盾) — 先打穿对面护盾者拿大奖');
      }
      return;
    }

    // ── treasure / crab: 站场实体 ──
    let spawned = 0;
    for (const side of ['left', 'right'] as const) {
      const slotKey = this.findEmptySlot(side, true);   // 前排优先 (JS)
      if (!slotKey) continue;  // 该侧满 → 跳过

      // 借 hiding pet 模板, 覆写为中立属性 (中立不在 PET_BY_ID)
      const fighter = createFighter('hiding', side);
      fighter.id = template.id;
      fighter.name = template.name;
      fighter.emoji = template.emoji;
      fighter.rarity = 'C';
      fighter.maxHp = template.hp; fighter.hp = template.hp;
      fighter.baseAtk = template.atk; fighter.atk = template.atk;
      fighter.baseDef = template.def; fighter.def = template.def;
      fighter.baseMr = template.mr; fighter.mr = template.mr;
      fighter.crit = 0; fighter.armorPen = 0; fighter.armorPenPct = 0;
      fighter.shield = 0; fighter.buffs = [];
      fighter.passive = null;
      // C2: 中立生物给一个攻击技能 — 既在详情面板展示(技能图+表述), 又据此每回合自动攻打对方阵营。
      const neutralSkillName: Record<string, string> = { crab: '巨蟹猛击', treasure: '宝箱猛砸' };
      const neutralSkillIcon: Record<string, string> = { crab: 'pets/giant-crab.png' };
      const sc = template.atkScale;
      fighter.skills = [{
        name: neutralSkillName[type] ?? '猛击',
        type: 'physical', hits: 1, power: 0, pierce: 0, cd: 0, cdLeft: 0,
        atkScale: sc,
        ...(neutralSkillIcon[type] ? { icon: neutralSkillIcon[type] } : {}),
        brief: `${template.name}向对方阵营一名敌人发起攻击，造成（{N:${sc}*ATK}）物理伤害。`,
        detail: `${template.name}向对方阵营一名敌人发起攻击，造成（${Math.round(sc * 100)}%×攻击力({ATK}) = {N:${sc}*ATK}）物理伤害。`,
      }] as unknown as typeof fighter.skills;
      (fighter as Fighter & { _slotKey?: string })._slotKey = slotKey;
      fighter._position = slotKey.startsWith('front') ? 'front' : 'back';
      (fighter as Fighter & { _isNeutral?: boolean; _neutralType?: string; _atkScale?: number })._isNeutral = true;
      (fighter as Fighter & { _isNeutral?: boolean; _neutralType?: string; _atkScale?: number })._neutralType = type;
      (fighter as Fighter & { _isNeutral?: boolean; _neutralType?: string; _atkScale?: number })._atkScale = template.atkScale;

      const { width } = this.scale.gameSize;
      const { x, y } = this.slotToCoords(slotKey, side, width);
      const view = this.makeView(fighter, x, y);
      this.views.push(view);
      spawned++;
    }
    if (spawned > 0) {
      this.neutralSpawned = true;
      this.flashEventEntrance();
      this.showCenterBanner(`${template.emoji} ${template.name} 登场!`, 1500, '#fff3a0');
      this.battleLog.log(`✦ 中立: ${spawned === 2 ? '双方各' : '单方'}刷出 ${template.name} — 跨阵营 KO 拿奖`);
    }
    // spawned===0 (双方都满且抽中 treasure/crab — 罕见, rollNeutral 已尽量在满格时给 anemone):
    //   不设 neutralSpawned, 让本回合后续仍可走 env 事件; 不刷误导横幅。
  }

  /** round-end: 海葵母寄生处理 (JS processAnemoneHeal + 护盾打穿结算)
   *  - 任一侧仍有活寄主 → 全场每回合回 5% maxHp
   *  - 寄主寄生护盾被对面打穿 (_anemoneShield<=0 但 bonus 未还原) → 还原寄主攻击 +
   *    跨阵营首破拿大奖(15币+净化海域), 后破小奖(10币) */
  private processAnemoneParasite(): void {
    const all = this.views.map(v => v.fighter as Fighter & {
      _anemoneShield?: number; _anemoneActive?: string; _anemoneHostAtkBonus?: number;
      _anemoneBrokenBy?: 'left' | 'right' | null;
    });
    // 1) 护盾打穿结算 (在回血前, 防回血干扰判定)
    for (const f of all) {
      if (!f.alive) continue;
      if (f._anemoneActive && (f._anemoneShield ?? 0) <= 0 && (f._anemoneHostAtkBonus ?? 0) > 0) {
        // 还原寄主攻击 (无论谁打穿都还原)
        f.baseAtk -= f._anemoneHostAtkBonus ?? 0;
        f.atk = f.baseAtk;
        f._anemoneHostAtkBonus = 0;
        const hostSide = f._anemoneActive as 'left' | 'right';
        f._anemoneActive = undefined;
        // 归属: 优先用记录的打穿者阵营; 同阵营自己打穿 → 不算击杀, 不发奖 (只还原攻击)
        const brokenBy = f._anemoneBrokenBy;
        f._anemoneBrokenBy = undefined;
        if (brokenBy && brokenBy === hostSide) {
          this.battleLog.log('🪼 海葵母寄生护盾被自己打穿 — 无奖励');
          continue;
        }
        // 跨阵营: 用记录的打穿者; 未记录(旧路径)则默认对面
        const winSide: 'left' | 'right' = brokenBy ?? (hostSide === 'left' ? 'right' : 'left');
        const tpl = NEUTRAL_TEMPLATES.anemone;
        const isFirst = this.neutralFirstKilledSide === null;
        if (isFirst) this.neutralFirstKilledSide = winSide;
        const reward = isFirst ? tpl.bigReward : tpl.smallReward;
        if (winSide === 'left' && reward.coins) { this.coins += reward.coins; this.refreshCoinDisplay(); }
        else if (winSide === 'right' && reward.coins) { this.aiGainCoins(reward.coins, '海葵母'); }
        this.battleLog.log(`🪼 ${winSide === 'left' ? '我方' : '敌方'} 打穿海葵母寄生护盾 → +${reward.coins} 龟币 (${isFirst ? '首破大奖' : '后破小奖'})`);
        const big = reward as { coins: number; debuff?: 'purify' };
        if (big.debuff === 'purify') {
          const loseSide = winSide === 'left' ? 'right' : 'left';
          let n = 0;
          for (const v of this.views) {
            if (v.fighter.side !== loseSide || !v.fighter.alive) continue;
            v.fighter.buffs.push({ type: 'healReduce', value: 10, duration: 4 });
            this.refreshStatusIcons(v);
            n++;
          }
          if (n) this.battleLog.log(`🪼 净化海域: ${loseSide === 'left' ? '我方' : '敌方'} ${n} 只 3 回合 -10% 治疗`);
        }
      }
    }
    // 2) 仍有活寄主 → 全场回 5% maxHp (JS processAnemoneHeal)
    const hasAnemone = all.some(f => f.alive && f._anemoneActive && (f._anemoneShield ?? 0) > 0);
    if (!hasAnemone) return;
    for (const v of this.views) {
      const f = v.fighter;
      if (!f.alive) continue;
      const heal = Math.max(1, Math.round(f.maxHp * 0.05));
      f.hp = Math.min(f.maxHp, f.hp + heal);
      this.syncHpView(f);
    }
  }

  /** v0.9.5.A91: 中立 KO 奖励 (JS events.js:308-337 onNeutralKilled)
   *  killer.side ≠ neutral.side, 首杀大奖, 后杀小奖
   */
  private handleNeutralKilled(neutralFighter: Fighter, killer: Fighter | null) {
    const n = neutralFighter as Fighter & { _isNeutral?: boolean; _neutralType?: string };
    if (!n._isNeutral || !n._neutralType) return;
    const tpl = NEUTRAL_TEMPLATES[n._neutralType as keyof typeof NEUTRAL_TEMPLATES];
    if (!tpl) return;
    // C1 修复: 中立死亡若无 killer 归属 (DOT/反伤/雷暴等间接致死, recordKill 传 null),
    //   旧代码直接 return → 玩家打了一路却"没给奖励"。中立站在哪一侧, 奖励就归对面
    //   (右侧中立=玩家的, 左侧中立=AI的); 仅当 killer 与中立同侧(自残)才不发。
    let killerSide: 'left' | 'right';
    if (killer && killer.side !== neutralFighter.side) killerSide = killer.side;
    else if (!killer) killerSide = neutralFighter.side === 'left' ? 'right' : 'left';
    else return;   // killer 与中立同侧 = 自残, 不算
    const killerName = killer && killer.side === killerSide ? killer.name : (killerSide === 'left' ? '我方' : '敌方');
    const isFirst = this.neutralFirstKilledSide === null;
    if (isFirst) this.neutralFirstKilledSide = killerSide;
    const reward = isFirst ? tpl.bigReward : tpl.smallReward;
    if (killerSide === 'left' && reward.coins) {
      this.coins += reward.coins;
      this.refreshCoinDisplay();
    } else if (killerSide === 'right' && reward.coins) {
      this.aiGainCoins(reward.coins, '中立KO');
    }
    this.battleLog.log(`✦ ${killerName} KO ${n.name} → +${reward.coins} 龟币 (${isFirst ? '首杀大奖' : '后杀小奖'})`);
    // JS events.js:326-336 大奖额外: equip:1 → 掉装备进席; debuff:'purify' → 对面 3 回合 -10% 治疗
    const big = reward as { coins: number; equip?: number; debuff?: 'purify' };
    if (big.equip && killerSide === 'left') {
      // 25% 改掉训龟大师的口哨 (用户 spec: 中立生物掉落), 否则普通装备
      if (this.maybeDropWhistle(0.25)) {
        this.battleLog.log(`✦ ${n.name} 大奖: 掉落 训龟大师的口哨!`);
      } else {
        this.dropLootEquip();
        this.battleLog.log(`✦ ${n.name} 大奖: 掉落 1 件装备进备战席`);
      }
    }
    if (big.debuff === 'purify') {
      const enemySide = killerSide === 'left' ? 'right' : 'left';
      let n2 = 0;
      for (const v of this.views) {
        if (v.fighter.side !== enemySide || !v.fighter.alive) continue;
        v.fighter.buffs.push({ type: 'healReduce', value: 10, duration: 4 });   // JS turns:3 → PoC duration+1
        this.refreshStatusIcons(v);
        n2++;
      }
      if (n2) this.battleLog.log(`🪼 净化海域: ${enemySide === 'left' ? '我方' : '敌方'} ${n2} 只 3 回合 -10% 治疗`);
    }
  }

  // ════════════════════════════════════════════════════════
  // 训龟大师的口哨 (用户新装备) — 吹响召唤训龟大师, 登场 4 回合, 每回合释放 1 种能力
  // ════════════════════════════════════════════════════════

  /** 找一侧空 slot, 无则 null。只计活着的占位 (JS _findEmptySlot 同款 — 死龟 slot 可复用)。
   *  frontFirst: 中立 spawn 用前排优先 (JS); 训龟大师默认后排优先 (非战斗体放后排) */
  private findEmptySlot(side: 'left' | 'right', frontFirst = false): string | null {
    const used = new Set(this.views
      .filter(v => v.fighter.side === side && v.fighter.alive)
      .map(v => (v.fighter as Fighter & { _slotKey?: string })._slotKey)
      .filter(Boolean));
    const order = frontFirst
      ? ['front-0', 'front-1', 'front-2', 'back-0', 'back-1', 'back-2']
      : ['back-2', 'back-1', 'back-0', 'front-2', 'front-1', 'front-0'];
    return order.find(s => !used.has(s)) ?? null;
  }

  /** 一侧的真龟 (排除召唤物/中立/大师等非真龟实体, 给能力 4/5/7 选目标) */
  private realTurtlesOnSide(side: 'left' | 'right'): Fighter[] {
    return this.views
      .filter(v => {
        const f = v.fighter as Fighter & { _isSummon?: boolean; _isNeutral?: boolean; _isMasterTrainer?: boolean; _isPirateShip?: boolean; _isMech?: boolean; _isDummy?: boolean; _isCandyBomb?: boolean };
        return f.side === side && f.alive && !f._isSummon && !f._isNeutral && !f._isMasterTrainer
          && !f._isPirateShip && !f._isMech && !f._isDummy && !f._isCandyBomb;
      })
      .map(v => v.fighter);
  }

  /** HP 条 + 文本同步 (maxHp/hp/shield 变动后) */
  private syncHpView(f: Fighter): void {
    const view = this.views.find(v => v.fighter === f);
    if (!view) return;
    view.hpText.setText(`${f.hp}/${f.maxHp}`);
    const ratio = Math.max(0, Math.min(1, f.hp / f.maxHp));
    this.tweens.add({ targets: view.hpBar, width: 118 * ratio, duration: 250 });
  }

  /** 吹响口哨: 校验空位 → 消耗口哨 → 召唤训龟大师 (口哨只进我方席, 仅玩家可吹) */
  private blowMasterWhistle(benchIdx: number, side: 'left' | 'right'): void {
    if (side !== 'left') return;
    if (this.findEmptySlot(side) === null) {
      this.showCenterBanner('⚠ 己方场上无空位, 无法吹响', 1200, '#ff9090');
      return;
    }
    this.benchInventory.splice(benchIdx, 1);
    this.benchRail.render('left', this.benchInventory);
    this.spawnMasterTrainer(side);
  }

  /** 糖果罐打碎 (JS candy.js breakCandyJar): 移除糖果罐 → 按当前回合掉落 1-4 件奖励进装备席 */
  private breakCandyJar(benchIdx: number, side: 'left' | 'right'): void {
    if (side !== 'left') return;
    const bench = this.benchInventory;
    const item = bench[benchIdx];
    if (!item || item.id !== 'c_candy_jar') return;
    bench.splice(benchIdx, 1);   // 先腾出 1 格, 再发奖励 (满席 addToBench 自带 10%HP 补偿)
    const loot = this.generateCandyJarLoot(this.turn);
    for (const r of loot) this.addToBench({ ...r }, side);
    this.refreshBenchUI();
    const names = loot.map(l => l.name).join(' + ');
    this.battleLog.log(`🍬 <b>糖果罐打碎</b> (回合${this.turn}) → ${names}`);
    this.showCenterBanner(`🍬 糖果罐 → ${names}`, 1500, '#ffd93d');
  }

  /** 糖果罐战利品 (JS candy.js generateCandyJarLoot): 回合越晚奖励越好 (糖果罐/口哨等 special 不入池) */
  private generateCandyJarLoot(turn: number): import('../types').EquipmentDef[] {
    const t = Math.max(1, Math.floor(turn));
    const rng = Math.random;
    const consumables = EQUIP_POOL.filter(e => e.category === 'consumable');
    const equipment = EQUIP_POOL.filter(e => e.category === 'normal' || e.category === 'unique');
    const heal = EQUIP_POOL.find(e => e.id === 'c_heal');
    const speed = EQUIP_POOL.find(e => e.id === 'c_speed');
    const bomb = EQUIP_POOL.find(e => e.id === 'c_bomb');
    const pick = <T,>(arr: T[]): T | undefined => arr[Math.floor(rng() * arr.length)];
    const out: (import('../types').EquipmentDef | undefined)[] = [];
    if (t <= 2) out.push(rng() < 0.5 ? heal : speed);
    else if (t <= 4) { out.push(rng() < 0.5 ? heal : speed); out.push(bomb); }
    else if (t <= 6) { out.push(pick(consumables)); out.push(pick(equipment)); }
    else if (t <= 9) { out.push(pick(consumables)); out.push(pick(consumables)); out.push(pick(equipment)); }
    else { out.push(pick(consumables)); out.push(pick(consumables)); out.push(pick(equipment)); out.push(pick(equipment)); }
    return out.filter((x): x is import('../types').EquipmentDef => !!x);
  }

  /** 召唤训龟大师 (占 1 空位, 4 回合, 不可选/不受伤/不造成伤害) */
  private spawnMasterTrainer(side: 'left' | 'right'): void {
    const slotKey = this.findEmptySlot(side);
    if (!slotKey) return;
    // 借 hiding 精灵作占位 (无专属美术); 仅改名/标记, 不改 id 以保留可渲染纹理
    const trainer = createFighter('hiding', side);
    trainer.name = '训龟大师';
    trainer.emoji = '📯';
    trainer.rarity = 'C';
    trainer.maxHp = 100; trainer.hp = 100;   // 不可受伤, 仅为 HP 条不显残血 (实际免伤)
    trainer.baseAtk = 0; trainer.atk = 0;
    trainer.baseDef = 0; trainer.def = 0;
    trainer.baseMr = 0; trainer.mr = 0;
    trainer.crit = 0; trainer.armorPen = 0; trainer.armorPenPct = 0;
    trainer.shield = 0; trainer.buffs = [];
    trainer.passive = null;
    trainer.skills = [];
    const tt = trainer as Fighter & { _slotKey?: string; _isSummon?: boolean; _untargetable?: boolean; _isMasterTrainer?: boolean; _masterTrainerTurns?: number };
    tt._slotKey = slotKey;
    trainer._position = slotKey.startsWith('front') ? 'front' : 'back';
    tt._isSummon = true;
    tt._untargetable = true;
    tt._isMasterTrainer = true;
    tt._masterTrainerTurns = 4;
    const { width } = this.scale.gameSize;
    const { x, y } = this.slotToCoords(slotKey, side, width);
    const view = this.makeView(trainer, x, y);
    this.views.push(view);
    this.flashEventEntrance();
    this.showCenterBanner('📯 训龟大师登场!', 1500, '#ffd86b');
    this.battleLog.log('📯 吹响口哨 — 训龟大师登场 4 回合');
  }

  /** round-end: 每个活着的训龟大师释放 1 能力, 倒计时, 到 0 离场 */
  private async processMasterTrainer(): Promise<void> {
    const trainers = this.views.filter(v =>
      (v.fighter as Fighter & { _isMasterTrainer?: boolean })._isMasterTrainer && v.fighter.alive);
    for (const view of trainers) {
      const t = view.fighter as Fighter & { _masterTrainerTurns?: number };
      this.fireMasterAbility(view);
      t._masterTrainerTurns = (t._masterTrainerTurns ?? 1) - 1;
      if ((t._masterTrainerTurns ?? 0) <= 0) {
        this.battleLog.log('📯 训龟大师离场');
        view.fighter.alive = false;
        view.fighter.hp = 0;
        this.killView(view);
      }
    }
  }

  /** 随机释放 7 能力之一 (4/5/7 无真龟目标则不选) */
  private fireMasterAbility(view: FighterView): void {
    const side = view.fighter.side;
    const reals = this.realTurtlesOnSide(side);
    const candidates = [1, 2, 3, 4, 5, 6, 7].filter(id =>
      (id === 4 || id === 5 || id === 7) ? reals.length > 0 : true);
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    switch (pick) {
      case 1:
        this.masterChiWave(view);
        break;
      case 2: {
        const consumables = EQUIP_POOL.filter(e => e.category === 'consumable');
        const c = consumables[Math.floor(Math.random() * consumables.length)];
        if (c) this.addToBench(c, side);
        if (side === 'left') { this.coins += 2; this.refreshCoinDisplay(); } else { this.aiGainCoins(2, '大师'); }
        this.battleLog.log(`📯 训龟大师: 赠 ${c?.name ?? '消耗品'} + 2 深海币`);
        break;
      }
      case 3:
        this.dropLootEquip();
        this.battleLog.log('📯 训龟大师: 赠 1 件装备');
        break;
      case 4: {
        const t = reals.reduce((a, b) => (b.maxHp > a.maxHp ? b : a));
        t.maxHp += 50; t.hp += 50;
        t.baseDef += 5; t.def = t.baseDef;
        t.baseMr = (t.baseMr ?? t.baseDef) + 5; t.mr = t.baseMr;
        this.syncHpView(t);
        const tv = this.views.find(v => v.fighter === t);
        if (tv) this.spawnFloatingPassive(tv, '+50❤ +5🛡', '#06d6a0');
        this.battleLog.log(`📯 训龟大师: ${t.name} +50 最大生命 / +5 护甲 / +5 魔抗`);
        break;
      }
      case 5: {
        const dmgOf = (f: Fighter) => (f as Fighter & { _dmgDealt?: number })._dmgDealt ?? 0;
        const t = reals.reduce((a, b) => (dmgOf(b) > dmgOf(a) ? b : a));
        t.baseAtk += 15; t.atk = t.baseAtk;
        t.armorPen = (t.armorPen ?? 0) + 5;
        t.magicPen = (t.magicPen ?? 0) + 5;
        const tv = this.views.find(v => v.fighter === t);
        if (tv) this.spawnFloatingPassive(tv, '+15⚔ +5穿', '#ffd86b');
        this.battleLog.log(`📯 训龟大师: ${t.name} +15 攻击 / +5 护甲穿透 / +5 魔法穿透`);
        break;
      }
      case 6: {
        const team = this.views.filter(v => {
          const f = v.fighter as Fighter & { _isMasterTrainer?: boolean };
          return f.side === side && f.alive && !f._isMasterTrainer;
        }).map(v => v.fighter);
        if (team.length) {
          const per = Math.floor(150 / team.length);
          for (const f of team) { f.shield = (f.shield ?? 0) + per; this.syncHpView(f); }
          this.battleLog.log(`📯 训龟大师: 全场 ${team.length} 只均分 150 永久护盾 (各 +${per})`);
        }
        break;
      }
      case 7: {
        const t = reals[Math.floor(Math.random() * reals.length)];
        // +1 临时等级 = +5% 基础属性 (同孵化器临时等级公式)
        const atkB = Math.round((t.baseAtk ?? 0) * 0.05);
        const defB = Math.round((t.baseDef ?? 0) * 0.05);
        const mrB = Math.round((t.baseMr ?? t.baseDef ?? 0) * 0.05);
        const hpB = Math.round(t.maxHp * 0.05);
        t.baseAtk = (t.baseAtk ?? 0) + atkB; t.atk = t.baseAtk;
        t.baseDef = (t.baseDef ?? 0) + defB; t.def = t.baseDef;
        t.baseMr = (t.baseMr ?? t.baseDef ?? 0) + mrB; t.mr = t.baseMr;
        t.maxHp += hpB; t.hp += hpB;
        const tl = t as Fighter & { _masterTempLevel?: number };
        tl._masterTempLevel = (tl._masterTempLevel ?? 0) + 1;
        this.syncHpView(t);
        const tv = this.views.find(v => v.fighter === t);
        if (tv) this.spawnFloatingPassive(tv, `Lv+${tl._masterTempLevel}`, '#ffd86b');
        this.battleLog.log(`📯 训龟大师: ${t.name} +1 临时等级`);
        break;
      }
    }
  }

  /** 能力 1: 灵体小龟龟派气波 — 随机一行敌人, 三段共 90 物理 (击飞 = 灰字flavor) */
  private masterChiWave(view: FighterView): void {
    const side = view.fighter.side;
    const enemySide = side === 'left' ? 'right' : 'left';
    const enemies = this.views.filter(v => v.fighter.side === enemySide && v.fighter.alive
      && !(v.fighter as Fighter & { _untargetable?: boolean })._untargetable);
    if (!enemies.length) { this.battleLog.log('📯 训龟大师: 龟派气波 (无敌人)'); return; }
    const rows = ['front', 'back'].filter(r =>
      enemies.some(v => (v.fighter as Fighter & { _slotKey?: string })._slotKey?.startsWith(r + '-')));
    const row = rows.length ? rows[Math.floor(Math.random() * rows.length)] : 'front';
    const targets = enemies.filter(v =>
      (v.fighter as Fighter & { _slotKey?: string })._slotKey?.startsWith(row + '-'));
    this.battleLog.log(`📯 训龟大师: 灵体小龟龟派气波 → ${row === 'front' ? '前' : '后'}排 ${targets.length} 敌 (三段共 90 物理, 击飞)`);
    for (const tv of targets) {
      const tgt = tv.fighter;
      let total = 0;
      for (let seg = 0; seg < 3; seg++) {
        if (!tgt.alive) break;
        const dmg = Math.max(1, Math.round(30 * calcDmgMult(calcEffArmor(view.fighter, tgt))));
        const r = applyRawDamage(tgt, dmg, 'physical', false, false, view.fighter.side);
        total += r.hpLoss + (r.shieldAbs ?? 0);
      }
      if (total > 0) {
        battleStats.recordDamage(view.fighter, tgt, total, 'phy');   // 气波伤害进战绩(归训龟大师)
        // 飘字与其它伤害统一: 裸数字弹跳 (原 -N 上飘标签)
        spawnFloatingText(this, tv.sprite.x, tv.sprite.y, `${total}`, 'direct-dmg', { amount: total, atkSide: view.fighter.side });
      }
      this.syncHpView(tgt);
      if (!tgt.alive) { battleStats.recordKill(view.fighter, tgt); this.killView(tv); }
    }
  }

  /** 口哨掉落: chance 概率给我方席补 1 个训龟大师口哨, 返回是否掉落 */
  private maybeDropWhistle(chance: number): boolean {
    if (Math.random() >= chance) return false;
    const whistle = EQUIP_POOL.find(e => e.id === 'e_master_whistle');
    if (!whistle) return false;
    this.addToBench(whistle, 'left');
    this.battleLog.log('📯 掉落: 训龟大师的口哨 (装备席「吹响」使用)');
    return true;
  }

  /** v0.9.5.A81: 雷暴事件持续 (JS events.js:60 _thunderstormTurns)
   *  事件触发后 2 回合每回合随机活单位 40 真伤
   */
  private processThunderstormTick(allFighters: Fighter[]) {
    const ticking = allFighters.find(f => ((f as Fighter & { _thunderstormTurns?: number })._thunderstormTurns ?? 0) > 0);
    if (!ticking) return;
    const alive = allFighters.filter(f => f.alive);
    if (alive.length) {
      const t = alive[Math.floor(Math.random() * alive.length)];
      t.hp = Math.max(0, t.hp - 40);
      if (t.hp === 0) t.alive = false;
      const view = this.views.find(v => v.fighter === t);
      if (view) {
        const fx = this.add.text(view.sprite.x, view.sprite.y - 40, '-40⚡', {
          fontSize: '20px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
          stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(50);
        this.tweens.add({
          targets: fx, y: view.sprite.y - 90, alpha: 0, duration: 800, ease: 'cubic.out',
          onComplete: () => fx.destroy(),
        });
      }
    }
    // 衰减
    for (const f of allFighters) {
      const ft = f as Fighter & { _thunderstormTurns?: number };
      if ((ft._thunderstormTurns ?? 0) > 0) ft._thunderstormTurns!--;
    }
  }

  /** v0.9.5.A80: 元素 ×3 羁绊 — 每回合随机灼烧一名敌人 (JS turn.js:71-83)
   *  stacks = max(1, round(target.maxHp × 0.02))
   *  含规则倍率 (烈焰之日 ×1.5)
   */
  private processSynergyElemBurnTick() {
    for (const side of ['left', 'right'] as const) {
      const team = this.views.filter(v => v.fighter.side === side).map(v => v.fighter);
      const tagger = team.find(f => f.alive && (f as Fighter & { _synergyElemBurnTick?: boolean })._synergyElemBurnTick);
      if (!tagger) continue;
      const enemies = this.views.filter(v => v.fighter.side !== side && v.fighter.alive).map(v => v.fighter);
      if (!enemies.length) continue;
      const target = enemies[Math.floor(Math.random() * enemies.length)];
      const baseStacks = Math.max(1, Math.round(target.maxHp * 0.02));
      const stacks = Math.round(baseStacks * ruleModifiers.burnMult());
      applyDotStacks(target, 'burn', stacks);   // F4: 层数累加 + duration:999 (JS turn.js:81)
      // 飘字提示
      const view = this.views.find(v => v.fighter === target);
      if (view) {
        const t = this.add.text(view.sprite.x, view.sprite.y - 60, `🔥 +${stacks}`, {
          fontSize: '16px', color: '#ff6600', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
          stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(50);
        this.tweens.add({
          targets: t, y: view.sprite.y - 100, alpha: 0, duration: 800, ease: 'cubic.out',
          onComplete: () => t.destroy(),
        });
        this.refreshStatusIcons(view);
      }
      this.battleLog.log(`🔥 元素 ×3 羁绊: ${tagger.name} 烧 ${target.emoji}${target.name} (+${stacks} 层)`);
    }
  }

  /**
   * E3/16 processSideEnd — JS turn.js:829-894 1:1 port
   *
   * 当一侧 (endedSide) 全部行动完, 切到对面前调用:
   *   1. DoT tick — opposing team (attacker 留的 burn/poison/bleed)
   *   2. HoT tick — own team (own hot buff + bubbleStore passive)
   *   3. (lightningStorm / thunderShell / cyberDrone / lavaTransform — TODO)
   *   4. side-end equipment (candle/dumbbell/...) — TODO
   * 之前 Phaser 在 startActorTurn 时 tick — 错位 (JS 是 side-end)
   */
  private async processSideEnd(endedSide: 'left' | 'right'): Promise<void> {
    // P133: 水晶球射线 — 友方所有龟行动结束后, 该侧水晶球射魔法光线
    //   JS main.js:452-485 processCrystalBallBeam, 在 side-end (DoT/HoT) 之前
    await this.processCrystalBallBeam(endedSide);

    const ownTeam = this.views.filter(v => v.fighter.side === endedSide);
    const oppTeam = this.views.filter(v => v.fighter.side !== endedSide);

    const dotTypes = ['burn', 'poison', 'bleed', 'curse', 'dot'];
    const dotCandidates = oppTeam.filter(v =>
      v.fighter.alive && v.fighter.buffs.some(b => dotTypes.includes(b.type)));
    const hotCandidates = ownTeam.filter(v =>
      v.fighter.alive && (
        v.fighter.buffs.some(b => b.type === 'hot') ||
        (v.fighter.passive?.type === 'bubbleStore' && ((v.fighter.bubbleStore as number) ?? 0) > 0)
      ));

    // G2: 旧 `if(!hasEffects) return` 会跳过下面的 闪电/雷鸣/浮游炮/熔岩变身/side-end 装备。
    //   JS 把这些放 DoT/HoT guard 外 (turn.js:897 "否则装备永不触发")。改为只 guard DoT/HoT 块。
    const hasEffects = dotCandidates.length > 0 || hotCandidates.length > 0;
    if (hasEffects) {
    // 1.5s pause — JS turn.js:851 "cause-effect beat" — Phaser 简化为 300ms
    await new Promise(r => this.time.delayedCall(300, r));

    // DoT tick on opposing team
    for (const v of dotCandidates) {
      if (!v.fighter.alive) continue;
      const dmg = this.tickDoTs(v.fighter);
      if (dmg > 0) {
        // B4: 刷新真 HP 条 (TurtleHud) — 旧代码只 tween 已废弃的 Phaser v.hpBar rect,
        //   灼烧/中毒/流血扣血看不见血条动。updateHpVisual 会驱动 sceneTurtleDom + 红 trail。
        this.updateHpVisual(v, { duration: 200 });
        v.hpText.setText(`${v.fighter.hp}/${v.fighter.maxHp}`);
        if (!v.fighter.alive) this.killView(v);
      }
    }

    // HoT tick on own team (JS turn.js:780-823)
    for (const v of hotCandidates) {
      await this.tickHoTsOn(v);
    }
    }   // end if(hasEffects) — 以下 闪电/雷鸣/浮游炮/变身/装备 无条件运行 (G2)

    // E3/17: lightningStorm side-end zap (JS state.js:791)
    // ownTeam (endedSide) 持 lightningStorm passive 的 → 随机敌方真伤
    const lightningOwners = ownTeam.filter(v =>
      v.fighter.alive && v.fighter.passive?.type === 'lightningStorm');
    for (const v of lightningOwners) {
      this.currentAttacker = v.fighter;   // G7: 闪电风暴击杀死亡被动归施放者
      const enemies = this.views.filter(vv => vv.fighter.side !== v.fighter.side && vv.fighter.alive);
      if (!enemies.length) continue;
      const target = enemies[Math.floor(Math.random() * enemies.length)];
      const shockScale = (v.fighter.passive!.shockScale as number) ?? 1.0;
      // P114 涌动: _lightningSurgeTurns>0 时被动电击真伤 ×(1+boost%) — 与 passive-triggers 满层引爆同款 (描述"被动电击(含满层引爆)")
      const surgeF = v.fighter as Fighter & { _lightningSurgeTurns?: number; _lightningShockBoostPct?: number };
      const surgeBoost = ((surgeF._lightningSurgeTurns ?? 0) > 0) ? (1 + (surgeF._lightningShockBoostPct ?? 50) / 100) : 1;
      const shockDmg = Math.round(v.fighter.atk * shockScale * surgeBoost);
      // P78: 闪电劈下 VFX (JS state.js:799 spawnLightningStrike)
      const groundY = target.sprite.y + (target.sprite.displayHeight ?? 80) / 2;
      spawnLightningStrike(this, target.sprite.x, groundY);
      const r = applyRawDamage(target.fighter, shockDmg, 'true', true);  // pierce true
      const shown = r.hpLoss + r.shieldAbs;
      battleStats.recordDamage(v.fighter, target.fighter, shown, 'tru');
      spawnFloatingText(this, target.sprite.x, target.sprite.y - 40,
        `-${shown}`, 'pierce-dmg', { amount: shown, atkSide: v.fighter.side });
      // JS state.js:808 — 自动电击也走 triggerOnHitEffects → 给目标叠 1 层电击 (6k, 满8层引爆);
      //   PoC 之前漏调 → "雷电被动" 的每回合自动电击不叠层 (只有主动技能叠)。对齐 JS。
      triggerOnHitEffects(v.fighter, target.fighter, shockDmg, {
        floatNum: (t, txt, c) => { const tv = this.views.find(vv => vv.fighter === t); if (tv) this.spawnFloatingPassive(tv, txt, c); },
      });
      this.battleLog.log(`⚡ ${v.fighter.name} 闪电风暴 → ${target.fighter.name}：${shown} 真实`);
      if (!target.fighter.alive) this.killView(target);
      await new Promise(r2 => this.time.delayedCall(600, r2));
    }

    // E3/17: thunderShell equipment side-end (JS state.js:818)
    // ownTeam 装 _equipThunderBell 的 → 随机敌方真伤 (按件数循环)
    const thunderOwners = ownTeam.filter(v => v.fighter.alive
      && ((v.fighter as Fighter & { _equipThunderBell?: number | boolean })._equipThunderBell));
    for (const v of thunderOwners) {
      const f = v.fighter as Fighter & { _equipThunderBell?: number | boolean };
      this.currentAttacker = f;   // G7: 雷鸣贝壳击杀死亡被动归持有者
      const zapsRaw = f._equipThunderBell;
      const zaps = zapsRaw === true ? 1 : (zapsRaw as number) | 0;
      for (let i = 0; i < zaps; i++) {
        if (!f.alive) break;
        const enemies = this.views.filter(vv => vv.fighter.side !== f.side && vv.fighter.alive);
        if (!enemies.length) break;
        const target = enemies[Math.floor(Math.random() * enemies.length)];
        const dmg = Math.round(f.atk * 1.0);
        const r = applyRawDamage(target.fighter, dmg, 'true');
        const shown = r.hpLoss + r.shieldAbs;
        battleStats.recordDamage(f, target.fighter, shown, 'tru');
        // P115b 累计灰字 stat: 雷鸣贝壳造成伤害
        (f as Fighter & { _thunderShellDmgStat?: number })._thunderShellDmgStat =
          ((f as Fighter & { _thunderShellDmgStat?: number })._thunderShellDmgStat ?? 0) + shown;
        spawnFloatingText(this, target.sprite.x, target.sprite.y - 40,
          `-${shown}🛎`, 'true-dmg', { amount: shown, atkSide: f.side });
        this.battleLog.log(`🛎 ${f.name} <b>雷鸣贝壳</b> → ${target.fighter.name}：${shown} 真实`);
        if (!target.fighter.alive) this.killView(target);
        await new Promise(r2 => this.time.delayedCall(600, r2));
      }
    }

    // E3/17: cyberDrone spawn + fire (JS turn.js:723-776)
    // ownTeam 持 cyberDrone passive 的 (非机甲态) → 生成新炮 + 全炮射敌
    const droneOwners = ownTeam.filter(v => v.fighter.alive
      && v.fighter.passive?.type === 'cyberDrone'
      && !((v.fighter as Fighter & { _isMech?: boolean })._isMech));
    for (const v of droneOwners) {
      const f = v.fighter as Fighter & { _drones?: Array<{ age: number }>; _cyberEnhanced?: boolean };
      if (!f._drones) f._drones = [];
      // Spawn 阶段
      const spawnCount = (f.passive!.dronesPerTurn as number) ?? 1;
      const maxDrones = (f.passive!.maxDrones as number) ?? 6;
      let spawned = 0;
      for (let di = 0; di < spawnCount && (f._drones?.length ?? 0) < maxDrones; di++) {
        f._drones!.push({ age: 0 });
        spawned++;
      }
      if (spawned > 0) {
        spawnFloatingText(this, v.sprite.x, v.sprite.y, `+${spawned}<img src="passive/cyber-drone-icon.png" style="width:14px;height:14px;vertical-align:middle">`, 'passive-num');
        this.battleLog.log(`🛸 ${f.name} <b>生成</b> ${spawned} 浮游炮 (${f._drones!.length}/${maxDrones})`);
      }
      this.refreshStatusIcons(v);
      // 第 1 回合只 spawn 不 fire
      if (this.turn <= 1) {
        await new Promise(r2 => this.time.delayedCall(200, r2));
        continue;
      }
      // Fire 阶段: 每炮打 1 随机敌
      const droneCount = f._drones?.length ?? 0;
      const droneScale = f._cyberEnhanced ? 0.12 : ((f.passive!.droneScale as number) ?? 0.25);
      let totalDmg = 0;
      this.currentAttacker = f;   // G7: 无人机击杀的死亡被动归 cyber 主
      for (let di = 0; di < droneCount; di++) {
        const alive = this.views.filter(vv => vv.fighter.side !== f.side && vv.fighter.alive);
        if (!alive.length) break;
        const target = alive[Math.floor(Math.random() * alive.length)];
        const dmg = Math.round(f.atk * droneScale);
        const effDef = target.fighter.def - (f.armorPen ?? 0);
        const finalDmg = Math.max(1, Math.round(dmg * (effDef >= 0 ? 1 - effDef / (effDef + 40) : 1 + Math.abs(effDef) / (Math.abs(effDef) + 40))));
        const wasAlive = target.fighter.alive;
        const r = applyRawDamage(target.fighter, finalDmg, 'physical');
        const shown = r.hpLoss + r.shieldAbs;
        totalDmg += shown;
        battleStats.recordDamage(f, target.fighter, shown, 'phy');
        if (wasAlive && !target.fighter.alive) battleStats.recordKill(f, target.fighter);   // 无人机击杀补记
        // JS turn.js:766 — 无人机命中也走 on-hit 链 (反伤/结晶/受击盾 等)
        triggerOnHitEffects(f, target.fighter, finalDmg, {
          floatNum: (t, txt, c) => { const tv = this.views.find(vv => vv.fighter === t); if (tv) this.spawnFloatingPassive(tv, txt, c); },
          hpLoss: r.hpLoss,
        });
        // 飘字与其它伤害统一: 裸数字弹跳 (去 -🛸)
        spawnFloatingText(this, target.sprite.x, target.sprite.y,
          `${shown}`, 'direct-dmg', { amount: shown, atkSide: f.side });
        if (!target.fighter.alive) this.killView(target);
        await new Promise(r2 => this.time.delayedCall(400, r2));
      }
      if (droneCount > 0) {
        this.battleLog.log(`🛸 ${f.name} ${droneCount} 个浮游炮 共 ${totalDmg} 物理`);
      }
    }

    // I6: 海螺小虫每回合自动攻击最低 HP 敌 (JS turn.js:1326). conch 是 non-actor,
    //   旧攻击码在 processComplexEquipEffects(只对行动者调) → 死代码; 这里 side-end fire。
    const conchOwners = ownTeam.filter(v => v.fighter.alive
      && (v.fighter as Fighter & { _isConchWorm?: boolean })._isConchWorm);
    for (const cw of conchOwners) {
      const cf = cw.fighter;
      const conchEnemies = this.views.filter(vv => vv.fighter.side !== cf.side && vv.fighter.alive);
      if (!conchEnemies.length) continue;
      this.currentAttacker = cf;
      const lowest = conchEnemies.reduce((a, b) => a.fighter.hp < b.fighter.hp ? a : b);
      // 吃护甲: 走 calcDamage (原 raw atk×1.0 无视护甲=bug) — 啃咬 100%ATK 物理
      const cwDmg = Math.max(1, Math.round(calcDamage(cf, lowest.fighter, cf.atk, 'physical')));
      this.dealPhysicalHit(lowest, cwDmg, cf);
      await new Promise(r => this.time.delayedCall(400, r));
    }

    // 机甲: 召唤物, 每回合自动攻击当前最低血敌人 (150%ATK 物理, 吃护甲) — 用户 2026-05-29 (非玩家可控)
    const mechs = ownTeam.filter(v => v.fighter.alive
      && (v.fighter as Fighter & { _isMech?: boolean })._isMech);
    for (const mv of mechs) {
      const mf = mv.fighter;
      const mechEnemies = this.views.filter(vv => vv.fighter.side !== mf.side && vv.fighter.alive);
      if (!mechEnemies.length) continue;
      this.currentAttacker = mf;
      const lowest = mechEnemies.reduce((a, b) => a.fighter.hp < b.fighter.hp ? a : b);
      const mechDmg = Math.max(1, Math.round(calcDamage(mf, lowest.fighter, mf.atk * 1.5, 'physical')));
      this.dealPhysicalHit(lowest, mechDmg, mf);
      this.battleLog.log(`🤖 ${mf.name} 自动攻击 → ${lowest.fighter.emoji}${lowest.fighter.name}`);
      await new Promise(r => this.time.delayedCall(400, r));
    }

    // 缩头随从: 回合末自动行动 (JS hiding.js summonAutoAction) — 玩家不可控, 跑 AI 放技能 (排训龟大师)
    const summonViews = ownTeam.filter(v => v.fighter.alive
      && (v.fighter as Fighter & { _isSummon?: boolean })._isSummon
      && !(v.fighter as Fighter & { _isMasterTrainer?: boolean })._isMasterTrainer);
    for (const sv of summonViews) {
      await this.summonAutoAction(sv);
      await new Promise(r => this.time.delayedCall(300, r));
    }

    // E3/17: lavaTransform 二次检查 (JS state.js:889-892)
    // DoT 可能填满怒气, 这里 check 一遍 (复用现有 processLavaRage)
    for (const v of this.views) {
      if (!v.fighter.alive) continue;
      const f = v.fighter as Fighter & { _lavaRageReady?: boolean; _lavaTransformed?: boolean; _lavaSpent?: boolean };
      if (f._lavaRageReady && !f._lavaTransformed && !f._lavaSpent) {
        this.processLavaRage(v);  // 现有 helper
      }
    }

    // E3/19: side-end equipment 5 简单项 (JS equip-effects.js:556-865)
    // 复杂 VFX 项 (miniCrystalB 旋转激光 / wave 横扫) 跳过, 单独 round
    await this.processSideEndEquipment(endedSide);

    // 短暂收尾 pause
    await new Promise(r => this.time.delayedCall(150, r));
  }

  /**
   * E3/19: side-end equipment 5 简单项 — JS equip-effects.js:556+ 1:1
   *   蜡烛 / 哑铃 / 飞镖 / 左轮 / 玩偶小熊
   * 跳过 (复杂 VFX 单独 round):
   *   miniCrystal A/B 旋转激光 + wave 横扫
   */
  private async processSideEndEquipment(endedSide: 'left' | 'right'): Promise<void> {
    const PAUSE = 200;  // JS 450, Phaser 紧凑
    for (const v of this.views) {
      if (!v.fighter.alive || v.fighter.side !== endedSide) continue;
      const f = v.fighter as Fighter & {
        _equipCandle?: boolean; _equipCandleStage?: number;
        _equipDumbbell?: boolean; _equipDumbbellGain?: number;
        _equipDart?: boolean;
        _equipRevolver?: boolean; _equipRevolverBullets?: number;
        _equipDoll?: boolean; _equipDollSpawned?: boolean; _equipDollBigBearStacks?: number;
        _knockedUpThisTurn?: boolean;
      };

      // 蜡烛 (JS:565-604): 3 阶段循环 — 0:idle, 1:微弱 self+邻 heal, 2:燃烧 横排 AOE
      if (f._equipCandle) {
        f._equipCandleStage = ((f._equipCandleStage ?? 0) + 1) % 3;
        if (f._equipCandleStage === 1) {
          // 微弱: 自己 +20, 邻格友军 +10
          const before = f.hp;
          f.hp = Math.min(f.maxHp, f.hp + 20);
          const actual = f.hp - before;
          if (actual > 0) {
            battleStats.recordHeal(f, f, actual);
            spawnFloatingText(this, v.sprite.x, v.sprite.y, `🕯+${actual}`, 'heal-num');
          }
          // 邻格友军 (按 slot_key 相邻): 简化为所有友军 +10
          const team = this.views.filter(vv => vv.fighter.side === f.side && vv.fighter !== f && vv.fighter.alive);
          for (const nb of team) {
            const b2 = nb.fighter.hp;
            nb.fighter.hp = Math.min(nb.fighter.maxHp, nb.fighter.hp + 10);
            const a2 = nb.fighter.hp - b2;
            if (a2 > 0) {
              battleStats.recordHeal(f, nb.fighter, a2);
              spawnFloatingText(this, nb.sprite.x, nb.sprite.y, `🕯+${a2}`, 'heal-num');
            }
          }
          this.battleLog.log(`🕯 ${f.name} 蜡烛(微弱): 自己 +20 邻 +10`);
        } else if (f._equipCandleStage === 2) {
          // 燃烧: 选 1 排敌人 30 magic + 20 burn stacks
          const enemies = this.views.filter(vv => vv.fighter.side !== f.side && vv.fighter.alive);
          if (enemies.length > 0) {
            const aim = enemies[Math.floor(Math.random() * enemies.length)];
            const aimRow = aim.fighter._slotKey?.split('-')[0];
            const targets = aimRow
              ? enemies.filter(vv => vv.fighter._slotKey?.startsWith(aimRow + '-'))
              : [aim];
            for (const t of targets) {
              const dmg = Math.max(1, Math.round(30 * calcDmgMult(calcEffMr(f, t.fighter))));
              const r = applyRawDamage(t.fighter, dmg, 'magic');
              const shown = r.hpLoss + r.shieldAbs;
              battleStats.recordDamage(f, t.fighter, shown, 'mag');
              spawnFloatingText(this, t.sprite.x, t.sprite.y - 40, `${shown}`, 'magic-dmg',
                { amount: shown, atkSide: f.side });
              applyDotStacks(t.fighter, 'burn', 20);   // F4: 20 层累加 + duration:999
            }
            this.battleLog.log(`🕯 ${f.name} 蜡烛(燃烧): ${aimRow === 'front' ? '前排' : '后排'} 30 魔法 + 20 灼烧层`);
          }
        }
        this.refreshStatusIcons(v);
        await new Promise(r => this.time.delayedCall(PAUSE, r));
      }

      // 哑铃 (JS:607-627): 每回合 +25 maxHp + 扔哑铃 5%maxHp 物理
      if (f._equipDumbbell) {
        f.maxHp += 25;
        f.hp += 25;
        f._equipDumbbellGain = (f._equipDumbbellGain ?? 0) + 25;
        spawnFloatingText(this, v.sprite.x, v.sprite.y, '🏋+25 maxHp', 'passive-num');
        const enemies = this.views.filter(vv => vv.fighter.side !== f.side && vv.fighter.alive);
        if (enemies.length > 0) {
          const target = enemies[Math.floor(Math.random() * enemies.length)];
          await fireStraightProjectile(this, v.sprite.x, v.sprite.y, target.sprite.x, target.sprite.y, 'equip-e_dumbbell', 42, 420);   // K7
          const baseDmg = Math.max(1, Math.round(f.maxHp * 0.05));
          const finalDmg = Math.max(1, Math.round(calcDamage(f, target.fighter, baseDmg, 'physical')));
          const r = applyRawDamage(target.fighter, finalDmg, 'physical');
          const shown = r.hpLoss + r.shieldAbs;
          battleStats.recordDamage(f, target.fighter, shown, 'phy');
          spawnFloatingText(this, target.sprite.x, target.sprite.y - 40, `${shown}`, 'phys-dmg',
            { amount: shown, atkSide: f.side });
          this.battleLog.log(`🏋 ${f.name} <b>哑铃</b> → ${target.fighter.name}：${shown}`);
        }
        await new Promise(r => this.time.delayedCall(PAUSE, r));
      }

      // 飞镖 (JS:796-812): 找带 _knockedUpThisTurn 靶子的敌人 → 50 物理 + 20 流血
      if (f._equipDart) {
        const enemyTeam = this.views.filter(vv => vv.fighter.side !== f.side && vv.fighter.alive);
        for (const eView of enemyTeam) {
          const e = eView.fighter as Fighter & { _knockedUpThisTurn?: boolean };
          if (!e._knockedUpThisTurn) continue;
          await fireStraightProjectile(this, v.sprite.x, v.sprite.y, eView.sprite.x, eView.sprite.y, 'equip-e_dart', 30, 340);   // K7
          const finalDmg = Math.max(1, Math.round(calcDamage(f, e, 50, 'physical')));
          const r = applyRawDamage(e, finalDmg, 'physical');
          const shown = r.hpLoss + r.shieldAbs;
          battleStats.recordDamage(f, e, shown, 'phy');
          spawnFloatingText(this, eView.sprite.x, eView.sprite.y - 40, `${shown}`, 'phys-dmg',
            { amount: shown, atkSide: f.side });
          applyDotStacks(e, 'bleed', 20);   // F4: 20 层流血累加 + duration:999
          e._knockedUpThisTurn = false;  // 移除靶子
          await new Promise(r => this.time.delayedCall(200, r));
        }
        await new Promise(r => this.time.delayedCall(PAUSE, r));
      }

      // 左轮 (JS:815-830): 弹数>0 时 → 随机敌方 40 物理, 消耗 1 弹
      if (f._equipRevolver && (f._equipRevolverBullets ?? 0) > 0) {
        const enemies = this.views.filter(vv => vv.fighter.side !== f.side && vv.fighter.alive);
        if (enemies.length > 0) {
          const target = enemies[Math.floor(Math.random() * enemies.length)];
          f._equipRevolverBullets = (f._equipRevolverBullets ?? 0) - 1;
          await fireStraightProjectile(this, v.sprite.x, v.sprite.y, target.sprite.x, target.sprite.y, 'vfx-revolver-bullet', 30, 300);   // K7
          const finalDmg = Math.max(1, Math.round(calcDamage(f, target.fighter, 40, 'physical')));
          const r = applyRawDamage(target.fighter, finalDmg, 'physical');
          const shown = r.hpLoss + r.shieldAbs;
          battleStats.recordDamage(f, target.fighter, shown, 'phy');
          spawnFloatingText(this, target.sprite.x, target.sprite.y - 40, `${shown}`, 'phys-dmg',
            { amount: shown, atkSide: f.side });
          this.battleLog.log(`🔫 ${f.name} <b>左轮</b> → ${target.fighter.name}：${shown} (剩 ${f._equipRevolverBullets} 弹)`);
        }
        await new Promise(r => this.time.delayedCall(PAUSE, r));
      }

      // E3/23 wave 海浪: 每 3 层巨浪横扫一条【横排】(随机高度 0/1/2 = 同高度的前+后, 敌我双方)。
      //   横向移动的波 → 命中横排, VFX/逻辑/描述一致 (旧版按 front/back 扫整列竖排, 与横向波不符)。
      // 友方: +20 shield + 2 def/mr 永久; 敌方: 20 magic + -2 def/mr
      const fAny = f as Fighter & { _equipWave?: boolean; _equipWaveStacks?: number };
      if (fAny._equipWave) {
        fAny._equipWaveStacks = (fAny._equipWaveStacks ?? 0) + 1;
        if (fAny._equipWaveStacks >= 3) {
          fAny._equipWaveStacks = 0;
          // 修(2026-05-30 v2): 装备描述"随机选一条横排(同高度的前后位置)" — yPct 41/55/69 三档,
          //   每档含 {左前-i, 左后-i, 右前-i, 右后-i} 4 张同高度槽。rowKey 是 0/1/2 行索引,
          //   launchWaveSweep 用 endsWith('-' + rowKey) 匹配, wave 才能跟一行的真 y 对齐。
          const rowKey = String(Math.floor(Math.random() * 3));
          await launchWaveSweep(this, rowKey, this.views, (unit) => {
            if (unit.side === f.side) {
              // 友方
              unit.shield = (unit.shield ?? 0) + 20;
              unit.baseDef += 2;
              unit.baseMr = (unit.baseMr ?? unit.baseDef) + 2;
              unit.def = unit.baseDef;
              unit.mr = unit.baseMr;
              const uView = this.views.find(vv => vv.fighter === unit);
              if (uView) {
                spawnFloatingText(this, uView.sprite.x, uView.sprite.y, '🌊+20盾+2甲/抗', 'shield-num');
              }
            } else {
              // 敌方
              const dmg = Math.max(1, Math.round(20 * calcDmgMult(calcEffMr(f, unit))));
              const r = applyRawDamage(unit, dmg, 'magic');
              const shown = r.hpLoss + r.shieldAbs;
              battleStats.recordDamage(f, unit, shown, 'mag');
              unit.baseDef = Math.max(0, unit.baseDef - 2);
              unit.baseMr = Math.max(0, (unit.baseMr ?? unit.baseDef) - 2);
              unit.def = unit.baseDef;
              unit.mr = unit.baseMr;
              const uView = this.views.find(vv => vv.fighter === unit);
              if (uView) {
                spawnFloatingText(this, uView.sprite.x, uView.sprite.y - 40, `${shown}`, 'magic-dmg',
                  { amount: shown, atkSide: f.side });
              }
            }
          });
          this.battleLog.log(`🌊 ${f.name} 海浪 横扫 第 ${Number(rowKey) + 1} 排`);
          await new Promise(r2 => this.time.delayedCall(PAUSE, r2));
        }
      }

      // E3/23 miniCrystal B 旋转激光 (JS:638-734)
      // 一道红光以 owner 为中心 180° 扫, 触碰敌人 20 magic + 1 mini_crystal 层
      // 层数 ≥3 引爆 14% maxHp magic
      const fMc = f as Fighter & { _equipMiniCrystalB?: boolean };
      if (fMc._equipMiniCrystalB) {
        const enemies = this.views.filter(vv => vv.fighter.side !== f.side && vv.fighter.alive);
        if (enemies.length > 0) {
          await launchMiniCrystalBeam(this, v, enemies, (target) => {
            if (!target.alive) return;
            const dmg = Math.max(1, Math.round(20 * calcDmgMult(calcEffMr(f, target))));
            const r = applyRawDamage(target, dmg, 'magic');
            const shown = r.hpLoss + r.shieldAbs;
            battleStats.recordDamage(f, target, shown, 'mag');
            const tView = this.views.find(vv => vv.fighter === target);
            if (tView) {
              spawnFloatingText(this, tView.sprite.x, tView.sprite.y - 40, `${shown}`, 'magic-dmg',
                { amount: shown, atkSide: f.side });
            }
            // 累 mini-crystal 层
            const tt = target as Fighter & { _miniCrystallize?: number };
            tt._miniCrystallize = (tt._miniCrystallize ?? 0) + 1;
            if ((tt._miniCrystallize ?? 0) >= 3) {
              tt._miniCrystallize = 0;
              // 引爆: 14% maxHp magic, 不走 on-hit/lifesteal (JS skipOnHit:true)
              const explBase = Math.max(1, Math.round(target.maxHp * 0.14));
              const explDmg = Math.max(1, Math.round(explBase * calcDmgMult(calcEffMr(f, target))));
              const explR = applyRawDamage(target, explDmg, 'magic');
              const explShown = explR.hpLoss + explR.shieldAbs;
              battleStats.recordDamage(f, target, explShown, 'mag');
              if (tView) {
                spawnFloatingText(this, tView.sprite.x, tView.sprite.y - 60, `${explShown}`, 'crit-magic',
                  { amount: explShown, atkSide: f.side });
              }
            }
            if (tView && !target.alive) this.killView(tView);
          });
          this.battleLog.log(`💎 ${f.name} 迷你水晶球 B 旋转扫射`);
          await new Promise(r2 => this.time.delayedCall(PAUSE, r2));
        }
      }

      // #8 M13: 迷你水晶球 A — 回合末朝随机敌人方向射魔法光线, 沿【同一列】穿过, 2 段各 30 魔法 + 1 层
      //   迷你水晶 (≥3 引爆 14% maxHp)。原在 processComplexEquipEffects 回合开始 + 只打 1 目标, 现对齐描述。
      const fMcA = f as Fighter & { _equipMiniCrystal?: boolean };
      if (fMcA._equipMiniCrystal) {
        const enemies = this.views.filter(vv => vv.fighter.side !== f.side && vv.fighter.alive);
        if (enemies.length > 0) {
          const aim = enemies[Math.floor(Math.random() * enemies.length)];
          const aimCol = ((aim.fighter as Fighter & { _slotKey?: string })._slotKey ?? '').split('-')[1];
          const colTargets = aimCol
            ? enemies.filter(vv => ((vv.fighter as Fighter & { _slotKey?: string })._slotKey ?? '').endsWith('-' + aimCol))
            : [aim];
          await castCrystalBeam(this, v.sprite.x, v.sprite.y, aim.sprite.x, aim.sprite.y);
          for (let seg = 0; seg < 2; seg++) {
            for (const tView of colTargets) {
              const target = tView.fighter;
              if (!target.alive) continue;
              const dmg = Math.max(1, Math.round(30 * calcDmgMult(calcEffMr(f, target))));
              const r = applyRawDamage(target, dmg, 'magic');
              const shown = r.hpLoss + r.shieldAbs;
              battleStats.recordDamage(f, target, shown, 'mag');
              spawnFloatingText(this, tView.sprite.x, tView.sprite.y - 40, `${shown}`, 'magic-dmg',
                { amount: shown, atkSide: f.side });
              const tt = target as Fighter & { _miniCrystallize?: number };
              tt._miniCrystallize = (tt._miniCrystallize ?? 0) + 1;
              if ((tt._miniCrystallize ?? 0) >= 3) {
                tt._miniCrystallize = 0;
                const explDmg = Math.max(1, Math.round(Math.round(target.maxHp * 0.14) * calcDmgMult(calcEffMr(f, target))));
                const explR = applyRawDamage(target, explDmg, 'magic');
                const explShown = explR.hpLoss + explR.shieldAbs;
                battleStats.recordDamage(f, target, explShown, 'mag');
                spawnFloatingText(this, tView.sprite.x, tView.sprite.y - 60, `${explShown}`, 'crit-magic',
                  { amount: explShown, atkSide: f.side });
              }
              if (!target.alive) this.killView(tView);
            }
            await new Promise(r2 => this.time.delayedCall(180, r2));
          }
          this.battleLog.log(`💎 ${f.name} 迷你水晶球 A 沿列射击`);
          await new Promise(r2 => this.time.delayedCall(PAUSE, r2));
        }
      }

      // 玩偶小熊 (JS:737-793): 小熊攻击 30 物理 + 5 层召唤大熊
      if (f._equipDoll && !f._equipDollSpawned) {
        const enemies = this.views.filter(vv => vv.fighter.side !== f.side && vv.fighter.alive);
        if (enemies.length > 0) {
          const front = enemies.filter(vv => vv.fighter._position === 'front');
          const pool = front.length > 0 ? front : enemies;
          const target = pool[Math.floor(Math.random() * pool.length)];
          const finalDmg = Math.max(1, Math.round(calcDamage(f, target.fighter, 30, 'physical')));
          const r = applyRawDamage(target.fighter, finalDmg, 'physical');
          const shown = r.hpLoss + r.shieldAbs;
          battleStats.recordDamage(f, target.fighter, shown, 'phy');
          // P115b 累计灰字 stat: 小熊玩偶造成伤害
          (f as Fighter & { _dollBearDmgStat?: number })._dollBearDmgStat =
            ((f as Fighter & { _dollBearDmgStat?: number })._dollBearDmgStat ?? 0) + shown;
          spawnFloatingText(this, target.sprite.x, target.sprite.y - 40, `${shown}`, 'phys-dmg',
            { amount: shown, atkSide: f.side });
        }
        f._equipDollBigBearStacks = (f._equipDollBigBearStacks ?? 0) + 1;
        // E3/28: 满 5 层 + 空 slot → 实际 spawn fighter view (1:1 JS equip-effects.js:752-790)
        // 没空 slot 时不归零 stacks, 下回合继续攒
        if ((f._equipDollBigBearStacks ?? 0) >= 5) {
          const spawned = this.spawnDollBear(f);
          if (spawned) {
            f._equipDollSpawned = true;
            // 移除 doll 装备 (JS:761 f._equips = filter eq.id !== 'e_doll')
            f.equipment = (f.equipment ?? []).filter(eq => eq.id !== 'e_doll');
            spawnFloatingText(this, v.sprite.x, v.sprite.y, '🧸 大熊登场!', 'crit-label');
            this.battleLog.log(`🧸 ${f.name} <b>玩偶</b> → 召唤大熊登场`);
          } else {
            this.battleLog.log(`🧸 ${f.name} <b>玩偶</b> → 阵地已满, 继续攒层`);
          }
        }
        await new Promise(r => this.time.delayedCall(PAUSE, r));
      }
    }
  }

  /**
   * P21: side-end → 完整 JS round-end pipeline (turn.js:1349-1380 1:1)
   *   sidesActedThisRound >= 2 时跑:
   *     1) processRoundEndBuffs (turn.js:907-1002) — lavaShield/bubbleShield/hidingShield/inkLink tick + buff expire + revert
   *     2) processFortuneGold (state.js:774-785) — fortuneGold passive 每回合 +3-8 金币
   *     3) processEnergyWave (chest.js:209-251) — auraAwaken 周期 burst + 储能转 _auraShield
   *     4) processPendingMechTransforms (action.js:299) — cyber 死龟变机甲
   *   每 side-end (不到 round 末) 不跑 round-end pipeline.
   * 之前 poc 把 inkLink/lavaShield/bubbleShield tick 放在每 side-end 跑 → 一回合减 2 次, 错.
   */
  private continueAfterSideEnd(): void {
    // E2: 敌方回合开始 AI 自动榨干装备席 (JS bench.js:478)
    if (this.activeSide === 'right' && !this.finished) {
      this.aiDrainBench();
    }
    if (this.sidesActedThisRound >= 2) {
      // Round-end pipeline (async — handler 内含 sleeps)
      this.runRoundEnd().then(async () => {
        // 切回合 + UI
        this.turn++;
        this.processCandyBombDecay();   // K9: 回合开始糖果炸弹逐回合衰减 (归零则引爆)
        this.topRow.setTurnText(`第 ${this.turn} 回合`);
        this._updateTurnTimeline();
        this.sidesActedThisRound = 0;
        this.isFirstRound = false;
        // P98 1:1 JS turn.js:beginTurn — await showTurnStartBanner('第 N 回合', 1100) 再继续
        await this.roundBanner();   // B1: 事件/商店回合预告
        await this.runRoundStartPipeline();   // A1: 预告后立即跑事件/中立 (再开商店/弹选龟框)
        // 用户 v0.9.9 经济: 每回合开始 +10, 外加利息 (每持有 5 币得 1, 上限 10/回合, TFT 风).
        //   利息按"加 10 之前"的存款算 (先结息再发回合币 = TFT 顺序: 利息基于上回合结余).
        const interest = Math.min(10, Math.floor(this.coins / 5));
        this.coins += 10 + interest;
        this.refreshCoinDisplay();
        this.battleLog.log(`💎 回合 +10${interest > 0 ? ` +利息${interest}` : ''} 深海币 (共 ${this.coins})`);
        // 野生敌方 AI 同步收币 (深海/Boss 不给, 见 aiGainCoins 守卫)
        this.aiGainCoins(10 + Math.min(10, Math.floor(this.enemyCoins / 5)), '回合');
        // CD 递减 (JS turn.js:43-45)
        for (const v of this.views) {
          if (!v.fighter.alive) continue;
          for (const s of v.fighter.skills) {
            if (s.cdLeft && s.cdLeft > 0) s.cdLeft--;
          }
        }
        // P116 1:1 用户 spec: 商店改 4/8/12... 阶段 (之前 % 2 偶数, 现 % 4)
        if (this.turn % 4 === 0 && this.turn > this.lastShopTurn && !this.finished) {
          this.lastShopTurn = this.turn;
          this.openShop();
          return;
        }
        this.beginSideTurn();   // A1: 新回合 → 我方回合横幅 → nextActor
      });
      return;
    }
    // P20: side-end 切边 → A1 侧横幅 (敌/我方回合) → nextActor
    this.beginSideTurn();
  }

  /** P21 完整 round-end pipeline (JS turn.js:1349-1380 1:1) — 顺序 4 步 */
  private async runRoundEnd(): Promise<void> {
    if (this.finished) return;
    await this.processRoundEndBuffs();
    if (this.finished) return;
    await this.processFortuneGold();
    if (this.finished) return;
    await this.processEnergyWave();
    if (this.finished) return;
    await this.processPendingMechTransforms();
    if (this.finished) return;
    this.processAnemoneParasite();       // 海葵母寄生: 全场回血 + 护盾打穿结算
    if (this.finished) return;
    await this.processMasterTrainer();   // 训龟大师每回合释放 1 能力
  }

  /** P21 processRoundEndBuffs — JS turn.js:907-1002 1:1
   *  - lavaShield turns-- + 到期清值
   *  - bubbleShield turns-- + 自然到期 → owner.atk×0.8 AOE 爆破 + 清 owner ref
   *  - hidingShield 到期 → heal shieldHealPct% × 剩余盾
   *  - inkLink turns-- + 到期清
   *  - critUp/chiWaveActive/blackhole "即将到期" 检测 → buff.turns-- 后从 stats 回滚 / 视觉清理
   */
  private async processRoundEndBuffs(): Promise<void> {
    let hadTick = false;
    for (const view of this.views) {
      const f = view.fighter as Fighter & {
        _lavaShieldTurns?: number; _lavaShieldVal?: number; _lavaShieldCounter?: number;
        bubbleShieldTurns?: number; bubbleShieldVal?: number; bubbleShieldOwner?: Fighter | null; bubbleShieldBurstScale?: number;
        _inkLink?: { turns: number };
        _hidingShieldHealPct?: number;
      };
      if (!f.alive) continue;

      // 1) Lava shield tick
      if ((f._lavaShieldTurns ?? 0) > 0) {
        f._lavaShieldTurns = (f._lavaShieldTurns ?? 0) - 1;
        if ((f._lavaShieldTurns ?? 0) <= 0) {
          f._lavaShieldVal = 0;
          f._lavaShieldCounter = 0;
          this.battleLog.log(`${f.emoji}${f.name} 的熔岩盾消散了`);
        }
      }
      // 1b) Hiding shield tick — 到期: 剩余盾 × healPct% 转生命, 清盾 (用户 2026-05-29)
      const fh = f as Fighter & { _hidingShieldTurns?: number; _hidingShieldVal?: number; _hidingShieldHealPct?: number };
      if ((fh._hidingShieldTurns ?? 0) > 0) {
        fh._hidingShieldTurns = (fh._hidingShieldTurns ?? 0) - 1;
        if ((fh._hidingShieldTurns ?? 0) <= 0) {
          const rem = fh._hidingShieldVal ?? 0;
          const heal = Math.round(rem * (fh._hidingShieldHealPct ?? 20) / 100);
          if (heal > 0 && f.alive) {
            const before = f.hp; f.hp = Math.min(f.maxHp, f.hp + heal);
            const actual = f.hp - before;
            if (actual > 0) { battleStats.recordHeal(f, f, actual); this.spawnFloatingPassive(view, `+${actual}`, '#06d6a0'); }
          }
          fh._hidingShieldVal = 0;
          this.battleLog.log(`🛡 ${f.name} 缩头盾到期 → 剩余盾转 ${heal} HP`);
          hadTick = true;
        }
      }
      // 2) Bubble shield tick + 自然到期爆破
      if ((f.bubbleShieldTurns ?? 0) > 0) {
        f.bubbleShieldTurns = (f.bubbleShieldTurns ?? 0) - 1;
        if ((f.bubbleShieldTurns ?? 0) <= 0 && (f.bubbleShieldVal ?? 0) > 0) {
          const owner = f.bubbleShieldOwner;
          if (owner && owner.alive) {
            // #8 H3: 旧版硬编 0.8×ATK 物理 (无视 burstScale 且类型错)。改读 burstScale (默认2.0) 且按魔法结算。
            const burstScale = f.bubbleShieldBurstScale ?? 2;
            const burstDmg = Math.round(owner.atk * burstScale);
            const enemies = this.views.filter(v => v.fighter.side !== f.side && v.fighter.alive);
            for (const ev of enemies) {
              const wasAlive = ev.fighter.alive;
              // 用户 2026-05-29: 泡泡盾爆裂可暴击 (逐目标独立判定); 偏离 JS(原版不暴击) — 主动设计改进
              const isCrit = rollCrit(owner.crit);
              const critMult = isCrit ? calcCritMult(owner) : 1;
              const ed = Math.max(1, Math.round(burstDmg * calcDmgMult(calcEffMr(owner, ev.fighter)) * critMult));   // 吃魔抗 + 暴击
              const r = applyRawDamage(ev.fighter, ed, 'magic');
              const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
              battleStats.recordDamage(owner, ev.fighter, shown, 'mag');
              if (wasAlive && !ev.fighter.alive) {
                battleStats.recordKill(owner, ev.fighter);
                this.killView(ev);
              }
              // 飘字统一: 裸数字弹跳 (暴击走 crit-magic 大字)
              spawnFloatingText(this, ev.sprite.x, ev.sprite.y, `${shown}`, isCrit ? 'crit-magic' : 'magic-dmg', { amount: shown, atkSide: owner.side });
            }
            this.battleLog.log(`${f.emoji}${f.name} 泡泡盾自然破碎! 对敌方全体 ${burstDmg} 魔法`);
            hadTick = true;
          }
          f.bubbleShieldVal = 0;
          f.bubbleShieldOwner = null;
        }
      }
      // 3) HidingShield 到期回血 (JS hiding.js:1-13 expiry hook)
      //    tickBuffsDuration 已经做了; 这里再扫一次作为兜底 (turn-begin 也做)
      //    P18 已实现, 不重复.

      // 4) InkLink tick
      if (f._inkLink && f._inkLink.turns > 0) {
        f._inkLink.turns--;
        if (f._inkLink.turns <= 0) {
          delete (f as { _inkLink?: unknown })._inkLink;
          this.battleLog.log(`${f.emoji}${f.name} 连笔链接消散`);
        }
      }
      // 5) Blackhole 到期清 — JS turn.js:980-984 "脱离黑洞" 飘字
      const blackhole = f.buffs.find(b => b.type === 'blackhole' && b.duration <= 1);
      if (blackhole) {
        this.spawnFloatingPassive(view, '🌀脱离黑洞', '#c77dff');
      }
      // 6) buff 已在 tickBuffsDuration (processTurnBeginPassives) 减; 这里不重复减.
      this.refreshStatusIcons(view);
    }
    if (hadTick) await new Promise(r => this.time.delayedCall(800, r));
  }

  /** P21 processFortuneGold — JS state.js:774-785 1:1
   *  fortuneGold passive 每回合末 +3-8 金币 (随机)
   */
  private async processFortuneGold(): Promise<void> {
    for (const view of this.views) {
      const f = view.fighter as Fighter & { _goldCoins?: number };
      if (!f.alive || f.passive?.type !== 'fortuneGold') continue;
      const roll = 3 + Math.floor(Math.random() * 6);
      f._goldCoins = (f._goldCoins ?? 0) + roll;
      this.spawnFloatingPassive(view, `+${roll}💰`, '#ffd93d');
      this.battleLog.log(`💰 ${f.name} <b>财神被动</b>: +${roll} 金币 (共 ${f._goldCoins})`);
      this.refreshStatusIcons(view);
      await new Promise(r => this.time.delayedCall(300, r));
    }
  }

  /** P21 processEnergyWave — JS chest.js:209-251 1:1
   *  auraAwaken+energyStore 持有者每 energyReleaseTurn 回合 burst:
   *    burst = _storedEnergy × energyDmgPct → 全敌物理
   *    shield = _storedEnergy × energyShieldPct → _auraShield (独立护盾槽)
   *  清 _storedEnergy.
   */
  private async processEnergyWave(): Promise<void> {
    for (const view of this.views) {
      const f = view.fighter as Fighter & {
        _auraEnergy?: number; _auraShield?: number; _auraShieldGainTurn?: number; _auraShieldDecayCount?: number;
      };
      if (!f.alive) continue;
      const p = f.passive;
      if (!p || p.type !== 'auraAwaken' || !p.energyStore) continue;
      const period = (p.energyReleaseTurn as number) ?? 4;
      if (this.turn < period || this.turn % period !== 0) continue;
      // 读 _auraEnergy (on-hit 累积的实际字段; 旧读 _storedEnergy 从不赋值 → 此函数全程空转)
      const stored = f._auraEnergy ?? 0;
      if (stored <= 0) continue;
      const lvl = Math.max(1, ((f as Fighter & { _level?: number })._level) ?? 1);
      const perLv = (p.perLevelPct as number) ?? 0.01;
      const dmgPct = ((p.energyDmgPct as number) ?? 0.6) + (lvl - 1) * perLv;
      const shieldPct = ((p.energyShieldPct as number) ?? 0.8) + (lvl - 1) * perLv;
      const waveDmg = Math.max(1, Math.round(stored * dmgPct));
      const enemies = this.views.filter(v => v.fighter.side !== f.side && v.fighter.alive);
      for (const ev of enemies) {
        const wasAlive = ev.fighter.alive;
        const r = applyRawDamage(ev.fighter, waveDmg, 'physical');
        const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        battleStats.recordDamage(f, ev.fighter, shown, 'phy');
        if (wasAlive && !ev.fighter.alive) {
          battleStats.recordKill(f, ev.fighter);
          this.killView(ev);
        }
        this.spawnFloatingPassive(ev, `${shown}`, '#ff4444');   // P131 删自创⚡, 龟壳储能波击 = 物理伤害 (direct-dmg cls)
      }
      const shieldAmt = Math.round(stored * shieldPct);
      f._auraShield = (f._auraShield ?? 0) + shieldAmt;
      f._auraShieldGainTurn = this.turn;
      f._auraShieldDecayCount = 0;
      this.spawnFloatingPassive(view, `+${shieldAmt}`, '#fff');   // P131 删自创⚡, 气场护盾 = shield-num cls (#fff)
      this.battleLog.log(`⚡ ${f.name} 储能波击! 全体 ${waveDmg} 物理 + ${shieldAmt} 气场盾`);
      f._auraEnergy = 0;
      this.refreshStatusIcons(view);
      await new Promise(r => this.time.delayedCall(800, r));
      if (this.finished) return;
    }
  }

  /** P21 processPendingMechTransforms — JS action.js:299 简化版
   *  cyberDrone 持有者死亡时 _pendingMech 标记 → 这里把它替换成 mech 形态.
   *  poc 在死亡 hook 里已立即处理 cyber 变机甲 (BattleScene:2986 死亡分支),
   *  这里只清残留 _pendingMech 标记 (若有). 跨 commit 兼容字段命名.
   */
  private async processPendingMechTransforms(): Promise<void> {
    for (const view of this.views) {
      const f = view.fighter as Fighter & { _pendingMech?: number };
      if (!f._pendingMech) continue;
      const dc = f._pendingMech;
      f._pendingMech = undefined;
      // 已在死亡 hook 处理过实际变形 (BattleScene:2986+), 这里仅 log
      this.battleLog.log(`🤖 ${f.name} <b>浮游炮</b> ${dc} 组装机甲完成`);
    }
  }

  /** E3/16 tickHoTsOn — JS turn.js:780-823 1:1 */
  private async tickHoTsOn(view: FighterView): Promise<void> {
    const f = view.fighter;
    if (!f.alive) return;
    // HoT buff (stackable, 每个独立 tick)
    const hots = f.buffs.filter(b => b.type === 'hot');
    for (const h of hots) {
      const before = f.hp;
      f.hp = Math.min(f.maxHp, f.hp + (h.value as number));
      const actual = f.hp - before;
      if (actual > 0) {
        battleStats.recordHeal(f, f, actual);
        spawnFloatingText(this, view.sprite.x, view.sprite.y, `+${actual}`, 'heal-num');
        this.battleLog.log(`💚 ${f.name} <b>持续回</b> ${actual} HP (剩 ${h.duration - 1} 回合)`);
      }
    }
    // bubbleStore passive: 从 store 回血 + 对随机敌 magic
    if (f.passive?.type === 'bubbleStore' && ((f.bubbleStore as number) ?? 0) > 0) {
      const healPct = (f.passive.healPct as number) ?? 25;
      const dmgPct = (f.passive.dmgPct as number) ?? 0;
      const healAmt = Math.round(((f.bubbleStore as number) ?? 0) * healPct / 100);
      // JS turn.js:796 applyHeal (受 healReduce) → store 仍按 healAmt 扣 (JS:797)
      const actual = applyHeal(f, healAmt, f);
      f.bubbleStore = ((f.bubbleStore as number) ?? 0) - healAmt;
      if (actual > 0) {
        spawnFloatingText(this, view.sprite.x, view.sprite.y, `+${actual}🫧`, 'bubble-num');
      }
      // dmg portion
      if (dmgPct > 0) {
        const dmgAmt = Math.round(((f.bubbleStore as number) ?? 0) * dmgPct / 100);
        f.bubbleStore = ((f.bubbleStore as number) ?? 0) - dmgAmt;
        if (dmgAmt > 0) {
          const enemies = this.views.filter(vv => vv.fighter.side !== f.side && vv.fighter.alive);
          if (enemies.length > 0) {
            const t = enemies[Math.floor(Math.random() * enemies.length)];
            // 用户 2026-05-29: 泡沫被动溅射可暴击; 偏离 JS(原版不暴击)
            const isCrit = rollCrit(f.crit);
            const critMult = isCrit ? calcCritMult(f) : 1;
            const finalDmg = Math.max(1, Math.round(dmgAmt * calcDmgMult(calcEffMr(f, t.fighter)) * critMult));   // 吃魔抗 + 暴击
            const wasAlive = t.fighter.alive;
            const r = applyRawDamage(t.fighter, finalDmg, 'magic');
            const shown = r.hpLoss + r.shieldAbs;
            battleStats.recordDamage(f, t.fighter, shown, 'mag');
            if (wasAlive && !t.fighter.alive) { battleStats.recordKill(f, t.fighter); this.killView(t); }
            // 飘字统一: 裸数字弹跳 (暴击走 crit-magic 大字)
            spawnFloatingText(this, t.sprite.x, t.sprite.y, `${shown}`, isCrit ? 'crit-magic' : 'magic-dmg', { amount: shown, atkSide: f.side });
          }
        }
      }
      if (((f.bubbleStore as number) ?? 0) < 1) f.bubbleStore = 0;
      // HP bar refresh
      this.tweens.add({ targets: view.hpBar, width: 118 * (f.hp / f.maxHp), duration: 200 });
      view.hpText.setText(`${f.hp}/${f.maxHp}`);
    }
  }

  /** P1.5 DOT 衰减系统: burn 每 tick ×2/3, poison/bleed ×3/4, curse 不衰减 (按 turns--) */
  private tickDoTs(f: import('../types').Fighter): number {
    let total = 0;
    const view = this.views.find(v => v.fighter === f);
    // P65: 元素羁绊 — DoT 整体 +X% (JS turn.js:672-674)
    //   target.side 的对面有 _synergyElemDmgBoost 的话, DoT ×(1+boost)
    //   buff 没存 sourceIdx, 简化: 取对面队伍最大 boost
    const opposingTeam = this.views.filter(v => v.fighter.side !== f.side && v.fighter._passiveSkills !== undefined).map(v => v.fighter);
    let elemBoost = 0;
    for (const o of opposingTeam) {
      const b = (o as Fighter & { _synergyElemDmgBoost?: number })._synergyElemDmgBoost ?? 0;
      if (b > elemBoost) elemBoost = b;
    }
    // burn 额外: dmg = value + maxHp × 0.1% × value (旧版 formula)
    for (const b of f.buffs) {
      let dmg = 0;
      let decayRate = 0;
      let dotCls: import('../types').FloatCls = 'dot-dmg';
      if (b.type === 'burn') {
        dmg = b.value + Math.round(f.maxHp * b.value * 0.001);
        decayRate = 1 / 3;
        dotCls = 'dot-dmg';
      } else if (b.type === 'poison') {
        dmg = b.value;
        decayRate = 1 / 4;
        dotCls = 'dot-poison';
      } else if (b.type === 'bleed') {
        dmg = b.value;
        decayRate = 1 / 4;
        dotCls = 'dot-bleed';
      } else if (b.type === 'curse') {
        dmg = b.value;
        decayRate = 0;  // 老式 curse 走 turns--
        dotCls = 'dot-curse';
      }
      // P65 应用元素羁绊 +X% boost
      if (elemBoost > 0 && dmg > 0) dmg = Math.max(1, Math.round(dmg * (1 + elemBoost)));
      if (dmg > 0) {
        // P139 1:1 JS turn.js:675 — DOT 走 applyRawDamage (过护盾 + physImmune/dmgReduce 减伤),
        //   不再 f.hp -= dmg 直扣. dmgType: bleed=物理 / burn,poison=魔法 / curse=真伤.
        //   stats 按 dmgType 记 (JS 经 bus 按 type 统计, 非自创 'dot' 类).
        const dotDmgType: import('../types').DamageType =
          b.type === 'bleed' ? 'physical' : b.type === 'curse' ? 'true' : 'magic';
        // DoT 来源 (施加者): 有 _src 则伤害/击杀归功于它 (诅咒带 _src → 致死计入施加者击杀, 修"诅咒致死不计击杀")
        const src = (b as typeof b & { _src?: import('../types').Fighter })._src ?? null;
        const wasAliveDot = f.alive;
        const r = applyRawDamage(f, dmg, dotDmgType);
        const shown = (r.hpLoss ?? 0) + (r.shieldAbs ?? 0);
        total += shown;
        const statCat = dotDmgType === 'physical' ? 'phy' : dotDmgType === 'magic' ? 'mag' : 'tru';
        battleStats.recordDamage(src, f, shown, statCat);
        if (wasAliveDot && !f.alive && src) battleStats.recordKill(src, f);
        // DoT 飘字: 走和伤害数字同一条弹跳路径 (pop+抛物+参与行堆叠), 不再自绘"往上飘"的标签
        //   (用户 2026-05-29: 中毒原是绿色 -N 直直上飘, 应像魔法伤害那样弹跳)。dotCls 决定颜色+dot行。
        if (view && shown > 0) {
          // 飘字统一无符号 (用户 2026-05-29 规则): 之前 `-N` 但 dispatcher 只为 *-dmg 类剥前导减号,
          //   导致 burn(dot-dmg) 显示干净数字、poison/bleed/curse(dot-*) 保留 `-N` 不一致。统一裸数字。
          spawnFloatingText(this, view.sprite.x, view.sprite.y, `${shown}`, dotCls, { amount: shown });
        }
        // 层数衰减
        if (decayRate > 0) {
          const after = Math.floor(b.value * (1 - decayRate));
          b.value = after < 1 ? 0 : after;
        }
      }
    }
    // 衰减到 0 的清掉
    f.buffs = f.buffs.filter(b => {
      if (b.type === 'burn' || b.type === 'poison' || b.type === 'bleed') return b.value > 0;
      return true;
    });
    if (f.hp === 0) f.alive = false;
    return total;
  }

  // v0.9.5.A64: 羁绊 chip-style (JS synergies.js:312 renderBattleSynergyBar 同款)
  // 每 chip: emoji + ×N (×2 银色 / ×3 金色), click → showSynergyDetail
  private renderSynergyBar(synergies: ActiveSynergy[], side: 'left' | 'right') {
    // 全部交给 BattleStatsRail (DOM overlay, JS synergies.js:312-332 1:1)
    this.statsRail.renderSynergy(side, synergies);
  }

  // P23: endTurn 删 +1/action 自创 (JS deep_coin.js 无此条).
  // JS 深海币只来自: 击杀 +5 / 阵亡补偿 +2 / 财神回合 +1 / **回合开始 +3** / 关卡 +10.
  // 回合开始 +3 由 P23 在 round-end pipeline 触发 (BattleScene continueAfterSideEnd).
  private endTurn() {
    this.time.delayedCall(400, () => this.nextActor());
  }

  /** P23: refreshCoinDisplay 改走 statsRail.setDeepCoin (JS renderDeepCoinUI 1:1).
   *  之前找 coinsText Phaser object 是老路径自创 — JS 战中无顶部龟币 UI, 只有 deep-coin pill. */
  private refreshCoinDisplay() {
    this.statsRail?.setDeepCoin('left', this.coins);
  }

  private openShop() {
    // shopIndex: turn4→0 / turn8→1 / turn12→2 (价格 ×1.25^n)
    const shopIndex = Math.max(0, Math.floor(this.turn / 4) - 1);
    this.battleLog.log(`🛒 商店开张 (第 ${shopIndex + 1} 次)! 龟币: ${this.coins}`);
    // 野生敌方 AI 同步开商店自动消费 (深海/Boss 不给币不开店, 见 aiAutoShop 守卫)
    this.aiAutoShop(shopIndex);
    const playerFighters = this.views.filter(v => v.fighter.side === 'left').map(v => v.fighter);
    this.shop.open(this.coins, playerFighters, shopIndex, (after) => {
      this.coins = after;
      this.refreshCoinDisplay();
      this.battleLog.log(`🛒 商店关闭, 剩 ${this.coins} 龟币`);
      this.time.delayedCall(300, () => this.nextActor());
    });
  }

  /** 野生敌方模式? (PVE 普通战 / 自定义对战) — 此时敌方 AI 像玩家一样攒币开店。
   *  深海闯关 (dungeon) / Boss / 测试 模式: 敌方 AI 不给币不开店 (用户 v0.9.9 确认)。 */
  private isWildEnemyMode(): boolean {
    return this.mode === 'pve' || this.mode === 'custom';
  }

  /** 野生敌方 AI 收币 (深海/Boss/测试 模式直接 no-op)。 */
  private aiGainCoins(amount: number, _reason?: string): void {
    if (!this.isWildEnemyMode() || amount <= 0) return;
    this.enemyCoins += amount;
  }

  /** 野生敌方 AI 自动消费: 纯决策(planAiShop)算买哪些, 这里施加副作用 —
   *  装备进右席(aiDrainBench 装上), 增益施给右队。深海/Boss 模式 no-op。 */
  private aiAutoShop(shopIndex: number): void {
    if (!this.isWildEnemyMode() || this.enemyCoins <= 0 || this.finished) return;
    const rightTeam = this.views.filter(v => v.fighter.side === 'right' && v.fighter.alive).map(v => v.fighter);
    if (!rightTeam.length) return;
    const plan = planAiShop(this.enemyCoins, shopIndex);
    this.enemyCoins = plan.coinsLeft;
    for (const slot of plan.buys) {
      if (slot.equipId) {
        const eq = EQUIP_POOL.find(e => e.id === slot.equipId);
        if (eq) this.addToBench(eq, 'right');   // E2 aiDrainBench 会在敌方回合装上
      } else if (slot.buff) {
        if (slot.buff.kind === 'team-buff') {
          applyTeamBuff(rightTeam, slot.buff);
        } else if (slot.buff.applyToTarget) {
          // 单体增益: 标记型给我方前排, 其余给右队随机一只
          if (slot.buff.wantsEnemy) {
            const myTargets = this.views.filter(v => v.fighter.side === 'left' && v.fighter.alive).map(v => v.fighter);
            if (myTargets.length) slot.buff.applyToTarget(myTargets[Math.floor(Math.random() * myTargets.length)]);
          } else {
            slot.buff.applyToTarget(rightTeam[Math.floor(Math.random() * rightTeam.length)]);
          }
        }
      }
    }
    if (plan.buys.length) {
      this.battleLog.log(`🛒 敌方购入 ${plan.buys.length} 件 (花 ${plan.spent}, 余 ${this.enemyCoins})`);
    }
  }

  /** P3.1 掉落装备进 bench (战利品) */
  private dropLootEquip() {
    // 5% 概率改掉落训龟大师的口哨 (用户 spec: 给装备时有概率给到)
    if (this.maybeDropWhistle(0.05)) return;
    // special (糖果罐/口哨) / chest / consumable 不进普通掉落池
    const eligible = EQUIP_POOL.filter(e =>
      e.category !== 'chest' && e.category !== 'consumable' && e.category !== 'special');
    if (!eligible.length) return;
    const eq = eligible[Math.floor(Math.random() * eligible.length)];
    if (eq) this.addToBench(eq);
  }

  /** E2/2: 神秘商人稀有装备 → 推 bench (JS events.js merchant + bench.js dropRandomEquip rarity='unique') */
  private dropMerchantUniqueToBench() {
    import('../data/equipment').then(m => {
      const pool = m.EQUIP_POOL.filter(e =>
        e.category !== 'consumable' && e.category !== 'chest' &&
        (e.rarity === 'S' || e.rarity === 'SS' || e.rarity === 'SSS')
      );
      if (!pool.length) return;
      const eq = pool[Math.floor(Math.random() * pool.length)];
      this.addToBench(eq, 'left');
    });
  }

  /**
   * 把装备推进装备席 (JS bench.js pushToBench 对齐)
   * 满席规则: 全员有人受伤 → 全员 +10% maxHp 回血, 装备遗失
   *           全员满血 → 直接遗失
   */
  public addToBench(eq: import('../types').EquipmentDef, side: 'left' | 'right' = 'left'): boolean {
    const bench = side === 'left' ? this.benchInventory : this.rightBench;
    if (bench.length < 10) {
      bench.push(eq);
      if (side === 'left') this.battleLog.log(`📦 战利品: ${eq.name}`);
      this.refreshBenchUI();   // 双方同步刷新 (right bench 也走 DOM, JS 同款 2-rail 布局)
      return true;
    }
    // 满席: 尝试 10% 回血补偿
    const team = this.views.filter(v => v.fighter.side === side && v.fighter.alive);
    const anyHurt = team.some(v => v.fighter.hp < v.fighter.maxHp);
    if (anyHurt) {
      for (const v of team) {
        const heal = Math.round(v.fighter.maxHp * 0.10);
        v.fighter.hp = Math.min(v.fighter.maxHp, v.fighter.hp + heal);
      }
      this.battleLog.log(`📦 ${side === 'left' ? '我方' : '敌方'}装备席满, 全员 +10%HP 回血 (${eq.name} 遗失)`);
    } else {
      this.battleLog.log(`📦 ${side === 'left' ? '我方' : '敌方'}装备席满且全员满血, ${eq.name} 遗失`);
    }
    return false;
  }

  /** E2: 装备合规校验 (JS bench.js probeEquipFit 对齐) */
  private validateEquipFit(f: import('../types').Fighter, eq: import('../types').EquipmentDef): { ok: boolean; reason?: string } {
    if (!f.alive) return { ok: false, reason: '已阵亡' };
    // 非装备载体的召唤物 (糖果炸弹/海盗船/水晶球/海螺小虫) — 不能装备也不能受物品 (用户: 糖果炸弹不该能装物品)。
    //   缩头随从(真龟)/机甲 不在此列 → 仍可装备。
    const neq = f as import('../types').Fighter & { _isCandyBomb?: boolean; _isPirateShip?: boolean; _isCrystalBall?: boolean; _isConchWorm?: boolean };
    if (neq._isCandyBomb || neq._isPirateShip || neq._isCrystalBall || neq._isConchWorm) return { ok: false, reason: '召唤物, 不可装备' };
    // actionable 物品 (口哨「吹响」/ 糖果罐「打碎」) 只能点击使用, 不能拖到龟身上装备
    if ((eq as { actionable?: string }).actionable) return { ok: false, reason: '点击使用, 不可装备' };
    const isConsumable = eq.category === 'consumable';
    if (isConsumable) {
      // 消耗品: 用前判效用
      if (eq.id === 'c_heal' && f.hp >= f.maxHp) return { ok: false, reason: '已满血' };
      if (eq.id === 'c_speed') {
        const hasCd = Array.isArray(f.skills) && f.skills.some(s => s && (s.cdLeft ?? 0) > 0);
        if (!hasCd) return { ok: false, reason: '无技能冷却' };
      }
      return { ok: true };
    }
    if ((f.equipment?.length ?? 0) >= 10) return { ok: false, reason: '装备已满 (10/10)' };
    if (eq.unique !== false) {
      const has = (f.equipment || []).some(e => e.id === eq.id);
      if (has) return { ok: false, reason: '已装备同名' };
    }
    return { ok: true };
  }

  /** E2: 把 bench 装备应用到指定 fighter (JS bench.js tryEquipFromBench 对齐) */
  private applyBenchEquipToFighter(f: import('../types').Fighter, eq: import('../types').EquipmentDef, benchIdx: number, side: 'left' | 'right' = 'left') {
    const bench = side === 'left' ? this.benchInventory : this.rightBench;
    const isConsumable = eq.category === 'consumable';
    if (isConsumable) {
      // 消耗品: 即时 apply, 不进 _equips
      //   apply() 只改数值(无 scene), 这里抓 hp/shield delta → 飘字 + hit-shake + HP 条刷新
      //   (修: c_bomb 等拖到敌人只扣血不跳数字/无动画)
      const hpBefore = f.hp ?? 0;
      const shieldBefore = f.shield ?? 0;
      const wasAlive = f.alive;
      try { eq.apply(f); } catch (e) { console.warn(`[bench] ${eq.id} apply 失败`, e); }
      // 修(2026-05-30 用户报"怒火药水没生效"): 增益类消耗品 (怒火药水 atkUp / 应急护盾 等) push buff 后,
      //   f.atk 要等目标下回合 turn-begin 的 recalcStats 才更新 → 拖上去当回合毫无变化, 看着像"没生效"。
      //   这里立即 recalc(先补 base 快照), 让属性类消耗品当场生效。对纯伤害/治疗消耗品是无害空转。
      if ((f as Fighter & { _baseCrit?: number })._baseCrit === undefined) snapshotBaseStats(f);
      recalcStats(f, this.views.filter(v => v.fighter.side === f.side && v.fighter.alive).map(v => v.fighter));
      const dmgDealt = (hpBefore - (f.hp ?? 0)) + (shieldBefore - (f.shield ?? 0));
      const healDone = ((f.hp ?? 0) - hpBefore);
      const tv = this.views.find(v => v.fighter === f);
      if (tv) {
        if (dmgDealt > 0) {
          this.spawnFloatingPassive(tv, `${dmgDealt}`, '#ff4444');
          this.playHitKnockback(tv, side);   // JS sceneKnockback (远离投掷方)
        } else if (healDone > 0) {
          this.spawnFloatingPassive(tv, `+${healDone}`, '#06d6a0');
        }
        this.updateHpVisual(tv);
        if (wasAlive && !f.alive) this.killView(tv);
      }
      this.battleLog.log(`${f.emoji}${f.name} <b>使用</b> ${eq.icon ?? '🧪'} ${eq.name}${dmgDealt > 0 ? ` → ${dmgDealt} 伤害` : ''}`);
    } else {
      attachEquipment(f, eq);
      this.battleLog.log(`🎒 ${f.name} <b>装备</b> ${eq.icon ?? '⚔'} ${eq.name}`);
    }
    bench.splice(benchIdx, 1);
    this.refreshBenchUI();  // 双方同步 (DOM bench 同时管 left/right)
    if (this.tutorial && side === 'left') this.tutorialGuide?.notify('equip-dropped');
  }

  /**
   * E2: AI 自动榨干装备席 (JS bench.js aiDrainBench)
   * 每次 activeSide 切到 right 时调一次, 贪心给装备数最少的 alive 龟装上
   */
  private aiDrainBench() {
    if (this.rightBench.length === 0) return;
    let safety = 0;
    let didEquip = true;
    while (didEquip && safety++ < 30 && this.rightBench.length > 0) {
      didEquip = false;
      for (let i = 0; i < this.rightBench.length; i++) {
        const eq = this.rightBench[i];
        const isConsumable = eq.category === 'consumable';
        // 消耗品 target='enemy' (e.g. c_bomb) 应用到对面; 否则同阵营
        const wantsEnemy = isConsumable && (eq as { target?: string }).target === 'enemy';
        const targetSide: 'left' | 'right' = wantsEnemy ? 'left' : 'right';
        let candidates = this.views
          .filter(v => v.fighter.side === targetSide && v.fighter.alive)
          .map(v => v.fighter);
        if (isConsumable) {
          if (eq.id === 'c_heal') candidates = candidates.filter(f => f.hp < f.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
          else if (eq.id === 'c_speed') candidates = candidates.filter(f => Array.isArray(f.skills) && f.skills.some(s => s && (s.cdLeft ?? 0) > 0));
          else if (eq.id === 'c_bomb') candidates.sort((a, b) => b.hp - a.hp);
        } else {
          candidates = candidates.filter(f =>
            (f.equipment?.length ?? 0) < 10 &&
            !(eq.unique !== false && (f.equipment || []).some(e => e.id === eq.id))
          );
          candidates.sort((a, b) => (a.equipment?.length ?? 0) - (b.equipment?.length ?? 0));
        }
        if (!candidates.length) continue;
        const pick = candidates[0];
        const fit = this.validateEquipFit(pick, eq);
        if (!fit.ok) continue;
        this.applyBenchEquipToFighter(pick, eq, i, 'right');
        didEquip = true;
        break;
      }
    }
  }

  // 装备席 rail 刷新 — JS index.html:467-468 + battle.css:2621-2670 1:1
  //   双方各 10 槽, BenchRail (DOM overlay) 持有 rail 节点, 这里只推数据
  private refreshBenchUI() {
    this.benchRail.render('left',  this.benchInventory);
    this.benchRail.render('right', this.rightBench);
  }

  // ── P220 装备席拖拽命中/高亮 (1:1 JS bench.js dragMove probe + drop) ──────
  private benchDragRing?: Phaser.GameObjects.Rectangle;

  /** 屏幕坐标 → 指针下的目标龟 (c_bomb 等 target='enemy' 找敌方, 否则我方) */
  private benchDragHitTest(eq: import('../types').EquipmentDef, sx: number, sy: number): FighterView | null {
    const rect = this.game.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const gx = (sx - rect.left) / rect.width * this.scale.gameSize.width;
    const gy = (sy - rect.top) / rect.height * this.scale.gameSize.height;
    const wantsEnemy = eq.category === 'consumable' && (eq as { target?: string }).target === 'enemy';
    const targetSide: 'left' | 'right' = wantsEnemy ? 'right' : 'left';
    let best: FighterView | null = null, bestDist = Infinity;
    for (const v of this.views) {
      if (v.fighter.side !== targetSide || !v.fighter.alive) continue;
      const b = v.sprite.getBounds();
      const pad = 24;
      if (gx >= b.x - pad && gx <= b.right + pad && gy >= b.y - pad && gy <= b.bottom + pad) {
        const d = Math.hypot(v.sprite.x - gx, v.sprite.y - gy);
        if (d < bestDist) { bestDist = d; best = v; }
      }
    }
    return best;
  }

  private showBenchDragRing(view: FighterView, ok: boolean) {
    const color = ok ? 0x06d6a0 : 0xff5050;
    const b = view.sprite.getBounds();
    if (!this.benchDragRing) {
      this.benchDragRing = this.add.rectangle(b.centerX, b.centerY, b.width + 24, b.height + 24)
        .setStrokeStyle(4, color, 0.95).setFillStyle().setDepth(62);
    }
    this.benchDragRing.setPosition(b.centerX, b.centerY).setSize(b.width + 24, b.height + 24)
      .setStrokeStyle(4, color, 0.95).setVisible(true);
  }

  private clearBenchDragRing() {
    if (this.benchDragRing) this.benchDragRing.setVisible(false);
  }

  // ── P221 教程步骤引导 ──────────────────────────────────────
  private setupTutorialGuide() {
    // 预置装备席: 1 装备 + 1 消耗品 (供拖拽教学)
    const seed = ['e_turtle_sword', 'c_heal']
      .map(id => EQUIP_BY_ID[id])
      .filter((e): e is import('../types').EquipmentDef => !!e);
    for (const eq of seed) this.benchInventory.push(eq);
    this.refreshBenchUI();
    this.benchRail.setLocked('left', false);
    this.tutorialGuide = new TutorialGuide(this, [
      { text: '欢迎来到<b>教程战斗</b>！你的队伍：石头龟(前排) + 小龟·竹叶龟(后排)，对面是 3 只 1 级龟。', anchor: 'top' },
      { text: '左侧是<b>装备席</b>。把里面的装备/消耗品<b>拖到你的乌龟身上</b>即可装备/使用。先拖一件试试。', advanceOn: 'equip-dropped', anchor: 'top' },
      { text: '轮到你时，下方会让你<b>选出手的龟 → 选技能 → 选目标</b>。释放一次技能继续。', advanceOn: 'skill-cast', anchor: 'top' },
      { text: '每隔几回合会开<b>商店</b>(龟币购买)，买到的装备/消耗品同样进装备席，<b>拖到龟身上</b>使用。', anchor: 'top' },
      { text: '教程到此结束！你可以打完这局，或回主菜单挑战<b>深海闯关</b>。', anchor: 'top' },
    ], () => { this.tutorialGuide = undefined; });
  }

  /** P2.10 多类型混合飘字 (e.g. ninja 暴击 真+物 复合) */
  private showHitStack(view: FighterView, parts: Array<{ amount: number; color: string; emoji?: string }>) {
    parts.forEach((p, i) => {
      const t = this.add.text(view.sprite.x, view.sprite.y - 40 - i * 22, `-${p.amount}${p.emoji ?? ''}`, {
        fontSize: '24px', color: p.color, fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(50);
      this.tweens.add({
        targets: t, y: view.sprite.y - 100 - i * 22, alpha: 0, scale: 1.2,
        duration: 700, delay: i * 80, ease: 'power2',
        onComplete: () => t.destroy(),
      });
    });
  }

  private showDamageVfx(view: FighterView, dmg: number, isCrit: boolean, dmgType: 'physical' | 'magic' | 'true' = 'physical') {
    const tgt = view.fighter;

    // 受击动画
    this.playAction(view, 'hurt');

    // P2.4 HP 延迟伤害条: 灰色延迟条显示被打的量, 200ms 后再实际收缩
    const newRatio = tgt.hp / tgt.maxHp;
    const newWidth = 118 * newRatio;
    const oldWidth = view.hpBar.width;
    if (oldWidth > newWidth) {
      // 灰色延迟条 (一次性 element)
      const delayBar = this.add.rectangle(view.hpBar.x, view.hpBar.y, oldWidth - newWidth, view.hpBar.height,
        0xff6666, 0.6).setOrigin(0, 0.5).setDepth(4);
      delayBar.x = view.hpBar.x + newWidth;  // 紧贴新 HP 末端
      this.tweens.add({
        targets: delayBar, width: 0, duration: 400, delay: 200, ease: 'power2',
        onComplete: () => delayBar.destroy(),
      });
    }

    // HP 条 / 数字更新
    const ratio = tgt.hp / tgt.maxHp;
    this.tweens.add({
      targets: view.hpBar, width: 118 * ratio, duration: 300, ease: 'power2',
    });
    this.refreshShieldBar(view);

    // E3/5: 飘字走 spawnFloatingText (pop+hold+arc JS 节奏), 替代原来 700ms linear fade
    // B4: 暴击也要按伤害类型上色 — 旧 isCrit 一律 'crit'(红) → 魔法暴击错显红色 (应蓝 crit-magic)。
    const cls: FloatCls = isCrit
      ? (dmgType === 'magic' ? 'crit-magic' : dmgType === 'true' ? 'crit-true' : 'crit-dmg')
      : (dmgType === 'magic' ? 'magic-dmg' : dmgType === 'true' ? 'true-dmg' : 'phys-dmg');
    spawnFloatingText(this, view.sprite.x, view.sprite.y - 40, `-${dmg}${isCrit ? '!' : ''}`, cls,
      { amount: dmg, atkSide: tgt.side === 'left' ? 'right' : 'left' });

    // SFX — v0.9.5.A86: 按伤害类型选音 (JS engine.js:765-773)
    playDmgSfx(this, { type: dmgType, isCrit });

    // tint flash (chi-hit-flash 等价); 自创 alpha 闪烁删。camera shake 仅暴击 (JS 选择性, 非每击)
    view.sprite.setTint(0xff6666);
    this.time.delayedCall(180, () => view.sprite.clearTint());
    if (isCrit) { this.cameras.main.shake(200, 0.014); this.flashCritScreen(); }

    // E3/4: 通用 impact FX (白环 + 闪点; 暴击金色 + 4 向飞溅)
    this.playImpactFx(view, isCrit);

    // 受击击退 — JS sceneKnockback (远离攻击者 18px + 抬3px, .35s ease-out)。
    //   旧自创 launch→apex→bounce.out 弹跳 + 每击 camera shake 删。
    this.playHitKnockback(view, tgt.side === 'left' ? 'right' : 'left');

    // v0.9.5.A88: 生命珍珠火球 (HP < 50% 触发后)
    const tgtAny = tgt as Fighter & { _pearlFireballPending?: boolean };
    if (tgtAny._pearlFireballPending) {
      tgtAny._pearlFireballPending = false;
      const enemies = this.views.filter(v => v.fighter.side !== tgt.side && v.fighter.alive);
      if (enemies.length) {
        const e = enemies[Math.floor(Math.random() * enemies.length)];
        const fbDmg = Math.round(e.fighter.maxHp * 0.08);
        // K6: 火球飞行 VFX (JS launchPearlFireball) — castFireball 视觉 (damage:visual 总线无订阅, 不重复飘字)
        const ownerV = this.views.find(v => v.fighter === tgt);
        if (ownerV) void castFireball(this, ownerV, e, fbDmg);
        this.dealMagicHit(e, fbDmg, '🔥', tgt);   // 走 on-hit 链 (火珊瑚/冰封水母/吸血/雷电法杖)
        applyDotStacks(e.fighter, 'burn', 30);   // F4: 30 层累加 + duration:999
        this.refreshStatusIcons(e);
        this.battleLog.log(`💧 ${tgt.name} 珍珠火球! ${e.fighter.name} -${fbDmg} + 30 灼烧`);
      }
    }
  }

  private killView(view: FighterView) {
    // K9: 糖果炸弹死亡(被击杀 或 衰减归零) → 引爆 (JS engine.js:565). detonate 内有去重, 不会双爆。
    const cb = view.fighter as Fighter & { _isCandyBomb?: boolean; _candyBombDetonated?: boolean };
    if (cb._isCandyBomb && !cb._candyBombDetonated) this.detonateCandyBomb(view.fighter);
    // P84 1:1 JS scene.css:180 — .scene-turtle.dead.burning ::before display:none
    if (view.burnOverlay) { view.burnOverlay.destroy(); view.burnOverlay = undefined; }
    // P91 1:1 JS state.js:375-384 — e_revolver: 敌人死亡时, 对侧所有 revolver 持者补 1 颗子弹
    //   PoC 之前 0 处补充, 子弹只减不加 → 6 颗用完后永远 0
    const deadSide = view.fighter.side;
    const otherSide = deadSide === 'left' ? 'right' : 'left';
    for (const vv of this.views) {
      if (vv.fighter.side !== otherSide || !vv.fighter.alive) continue;
      const owner = vv.fighter as Fighter & { _equipRevolver?: number; _equipRevolverBullets?: number };
      if ((owner._equipRevolver ?? 0) > 0) {
        const max = 6 * (owner._equipRevolver ?? 1);  // 每件上限 6
        owner._equipRevolverBullets = Math.min(max, (owner._equipRevolverBullets ?? 0) + 1);
      }
    }
    // P108 孵化器: 任意单位死亡 → 双方持孵化器者各加进度 (敌方死 +10 / 我方死 +15)
    for (const vv of this.views) {
      const owner = vv.fighter as Fighter & { _incubatorProgress?: number };
      if (typeof owner._incubatorProgress !== 'number' || !vv.fighter.alive) continue;
      const isOurDeath = view.fighter.side === vv.fighter.side;
      this._incubatorProgress(vv, isOurDeath ? 15 : 10, isOurDeath ? '我方死' : '敌方死');
    }
    this.sound.play('sfx-defeat', { volume: 0.5 });
    this.battleLog.log(`☠ ${view.fighter.name} 阵亡`);
    // 用户 v0.9.9: 阵亡方补偿 +20. 我方阵亡 → 我方 +20; 野生敌方阵亡 → AI +20 (深海/Boss 不给).
    if (view.fighter.side === 'left') {
      this.coins += 20;
      this.refreshCoinDisplay();
    } else if (view.fighter.side === 'right') {
      this.aiGainCoins(20, '阵亡补偿');
    }

    // P1.8 死亡 passive 汇聚 (phoenix 复活 / undead 锁血 / deathExplode / hunter 击杀偷 / chest 抽装备)
    this.processDeathPassives(view);
    if (view.fighter.alive) {
      // passive 复活 → 不淡出
      view.hpText.setText(`${view.fighter.hp}/${view.fighter.maxHp}`);
      const ratio = view.fighter.hp / view.fighter.maxHp;
      this.tweens.add({ targets: view.hpBar, width: 118 * ratio, duration: 300 });
      return;
    }

    // P1.6 装备 onDeath 触发 (e_conch 复活成小虫 等)
    fireOnDeath(view.fighter, null);
    if (view.fighter.alive) {
      // 装备复活了! 不淡出
      this.battleLog.log(`🐛 ${view.fighter.name} 变形 小虫复活!`);
      view.hpText.setText(`${view.fighter.hp}/${view.fighter.maxHp}`);
      const ratio = view.fighter.hp / view.fighter.maxHp;
      this.tweens.add({ targets: view.hpBar, width: 118 * ratio, duration: 300 });
      return;
    }

    // 阶段3 死亡演出: 碎裂粒子爆发 + 短慢镜 (叠在 JS deathHop 之上, 不改落地动画)。
    {
      const dx = view.sprite.x, dy = view.sprite.y;
      this.add.particles(dx, dy, '__DEFAULT', {
        lifespan: 420, speed: { min: 60, max: 210 }, scale: { start: 0.7, end: 0 },
        quantity: 18, tint: [0xcfd6e0, 0x9aa3b5, 0xffffff], emitting: false,
      }).setDepth(40).explode(18);
      this.juiceHitStop(120);   // 阵亡短慢镜
    }
    // P28: deathHop 1:1 JS scene.css:95-129 (deathHopLeft/Right keyframes, 1200ms ease-out).
    //   JS 死亡仅是 sprite hop + tilt -15° + grayscale fade. 无 screen-flash/skull/camera-shake.
    //   Left side: 0% (0,0,0°) → 12% (-10,-8,-8°,brightness2.5) → 33% (-14,0,-15°) → 100% (opacity 0)
    //   Right side mirrored (+10, +14, +15° rotations).
    const startX = view.sprite.x, startY = view.sprite.y;
    const sx = view.sprite.scaleX, sy = view.sprite.scaleY;
    const dropDir = view.fighter.side === 'left' ? -1 : 1;
    // 12% of 1200 = 144ms — peak flash (brightness ≈ tint white pulse)
    // 33% of 1200 = 396ms — landed prone at -15° / +15°
    // 75% of 1200 = 900ms — hold prone grayscale
    // 100% = 1200ms — fade out
    const tinted = view.sprite as Phaser.GameObjects.Sprite;
    tinted.setTint?.(0xffffff);
    this.tweens.chain({
      targets: view.sprite,
      tweens: [
        // Phase 1 (0→12%, 144ms): hop up + back tilt -8° + flash
        { x: startX + dropDir * 10, y: startY - 8, angle: -8 * dropDir, duration: 144, ease: 'sine.out' },
        // Phase 2 (12→33%, 252ms): land prone at -15° lean (JS scene.css:101 rotate(-15deg))
        { x: startX + dropDir * 14, y: startY, angle: -15 * dropDir, duration: 252, ease: 'cubic.in' },
        // Phase 3 (33→75%, 504ms): hold prone — slight grayscale via tint darken
        {
          duration: 504,
          onStart: () => { tinted.setTint?.(0x808080); },
        },
        // Phase 4 (75→100%, 300ms): fade out
        { alpha: 0, duration: 300, ease: 'power2' },
      ],
    });
    // UI 渐隐 (与 sprite 同步) — 整段 1200ms 配合
    this.tweens.add({
      targets: [view.shadow, view.hpBar, view.hpBarBg, view.hpBarHi, view.shieldBar, view.hpDelayBar, view.hpText, view.nameText, view.statusGroup].filter(Boolean),
      alpha: 0, duration: 1200, ease: 'power2',
    });
    // P182 新血条 (TurtleHud) 也随之淡出 — 之前漏了它 → 用户报"角色死亡后血条没消失"
    view.sceneTurtleDom?.fadeOut(1200);
    void sx; void sy;
    // Death sprite anim (如有 spritesheet)
    this.playAction(view, 'death');
  }

  // ─── 胜负屏 ───
  private endBattle(result: 'win' | 'lose') {
    this.finished = true;
    this.clearTurnTimer();
    this.actionPanel.hide();
    this.clearTargeting();

    const bgm = this.sound.get('bgm-battle') ?? this.sound.get('bgm-boss');   // I5: 含 boss BGM
    if (bgm) this.tweens.add({ targets: bgm, volume: 0, duration: 600, onComplete: () => bgm.stop() });

    // 收集 stats, 跳 BattleEndScene
    const playerStats = this.views.filter(v => v.fighter.side === 'left').map(v => ({
      id: v.fighter.id, name: v.fighter.name, rarity: v.fighter.rarity, alive: v.fighter.alive,
      hp: v.fighter.hp, maxHp: v.fighter.maxHp, ...v.stats,
    }));

    // dungeon: 玩家 HP 快照供下一关继承 (P1.2 含 alive / P1.3 含 position)
    const playerHpSnapshot = this.mode === 'dungeon'
      ? this.views.filter(v => v.fighter.side === 'left').map(v => ({
          id: v.fighter.id,
          hp: v.fighter.hp,
          maxHp: v.fighter.maxHp,
          shield: v.fighter.shield,
          alive: v.fighter.alive,
          position: v.fighter._position as 'front' | 'back' | undefined,
          // C3 修复: 跨关携带每只龟身上已装备的装备 id (旧 snapshot 只带 hp → 装上的装备每关全丢)
          equipIds: (v.fighter.equipment ?? []).map(e => (e as { id?: string }).id).filter((x): x is string => !!x),
          // C3: 跨关携带被动累积成长 (竹叶/命运之轮/石墙/猎手)
          growth: this.captureGrowth(v.fighter),
        }))
      : undefined;

    // E2: 装备席跨关持久化 (JS bench.js dungeonState.equipBenchIds)
    const benchInventoryIds = this.mode === 'dungeon'
      ? this.benchInventory.map(e => e.id)
      : undefined;

    // P27: 直接 start, 不 fadeOut 黑屏
    this.time.delayedCall(600, () => {
      this.scene.start('BattleEndScene', {
        result,
        playerStats,
        turn: this.turn,
        leftTeam: this.leftTeam,
        leftSlots: this.leftSlots,
        mode: this.mode,
        rule: this.rule,
        dungeonStage: this.dungeonStage,
        playerHpSnapshot,
        benchInventoryIds,
        coins: this.mode === 'dungeon' ? this.coins : undefined,   // C3: 深海币结余跨关携带
      });
    });
  }

  private makeBigButton(x: number, y: number, label: string, onClick: () => void) {
    const w = 180, h = 50;
    const bg = this.add.rectangle(x, y, w, h, 0x1a2740, 0.95)
      .setStrokeStyle(3, 0xffd93d).setDepth(102)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontSize: '20px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(103);

    bg.setScale(0).setAlpha(0);
    text.setScale(0).setAlpha(0);
    this.tweens.add({ targets: [bg, text], scale: 1, alpha: 1, duration: 250, ease: 'back.out' });

    bg.on('pointerover', () => {
      this.tweens.add({ targets: [bg, text], scale: 1.06, duration: 120, ease: 'back.out' });
      bg.setStrokeStyle(3, 0xfff3a0);
    });
    bg.on('pointerout', () => {
      this.tweens.add({ targets: [bg, text], scale: 1, duration: 120, ease: 'back.out' });
      bg.setStrokeStyle(3, 0xffd93d);
    });
    bg.on('pointerdown', () => {
      this.tweens.add({ targets: [bg, text], scale: 0.95, duration: 60, yoyo: true, ease: 'power1' });
      this.time.delayedCall(80, onClick);
    });
  }

  private makeIconButton(x: number, y: number, icon: string, onClick: () => void) {
    const bg = this.add.circle(x, y, 18, 0x000000, 0.55).setStrokeStyle(2, 0x58d3ff)
      .setInteractive({ useHandCursor: true }).setDepth(10);
    const text = this.add.text(x, y, icon, {
      fontSize: '18px', color: '#fff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(11);
    bg.on('pointerover', () => { bg.setStrokeStyle(2, 0xffd93d); });
    bg.on('pointerout', () => { bg.setStrokeStyle(2, 0x58d3ff); });
    bg.on('pointerdown', () => {
      this.tweens.add({ targets: [bg, text], scale: 0.85, duration: 60, yoyo: true });
      this.time.delayedCall(80, onClick);
    });
  }

  private backToMenu() {
    // P27: 直接 start, 不 fadeOut 黑屏. BGM 立即停 (不再 tween 等 400ms)
    const bgm = this.sound.get('bgm-battle') ?? this.sound.get('bgm-boss');   // I5: 含 boss BGM
    if (bgm) bgm.stop();
    this.scene.start('MainMenuScene');
  }
}
