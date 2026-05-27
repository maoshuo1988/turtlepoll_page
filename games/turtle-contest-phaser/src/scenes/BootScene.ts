// ══════════════════════════════════════════════════════════
// BootScene — 资产 preload, 进度条主题化
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import { ALL_PETS } from '../data/pets';
import { EQUIP_POOL } from '../data/equipment';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // 单一加载屏: 只用 index.html 的深海主题 #splash (气泡+呼吸logo+进度条)。
    //   之前这里还在 canvas 上画了一条旧的 Phaser 进度条 (蓝条+"加载中"), 它在透明 canvas 上,
    //   #splash 已移除/半透时会露出 → 用户报"加载动画有时新有时旧"。现移除, 只留 #splash。
    //   若 #splash 不存在(罕见 re-boot)则无 canvas 加载条, boot 很快无碍。
    this.load.on('progress', (p: number) => {
      const fill = document.querySelector<HTMLElement>('#splash .fill');
      if (fill) fill.style.width = `${Math.round(p * 100)}%`;
    });
    this.load.on('complete', () => {
      const sp = document.getElementById('splash');
      if (sp) {
        const fill = sp.querySelector<HTMLElement>('.fill');
        if (fill) fill.style.width = '100%';
        sp.classList.add('hide');
        setTimeout(() => sp.remove(), 600);
      }
    });

    // ── 资产: vite publicDir 已指向 /games/turtle-battle/assets ──

    // 主菜单专用资产
    this.load.image('menu-bg', `menu/menu-bg.png`);
    this.load.image('menu-bg-tile', `menu/menu-bg-tile.png`);   // v0.9.5.A 主菜单 tile 漂移
    this.load.image('menu-title', `menu/menu-title.png`);
    this.load.image('btn-frame', `menu/btn-frame.png`);
    this.load.image('btn-frame-pressed', `menu/btn-frame-pressed.png`);
    this.load.image('btn-frame-disabled', `menu/btn-frame-disabled.png`);
    this.load.image('codex-icon', `menu/codex-icon.png`);
    this.load.image('help-button', `ui/help-button.png`);   // v0.9.5.A2 引导卡用
    // 主菜单大改素材 (用户配图): 长框(模式按钮)/方框(功能磁贴)/龟币框 + 成就/战绩图标
    this.load.image('menu-frame-rect', `menu/frame-rect.png`);
    this.load.image('menu-frame-square', `menu/frame-square.png`);
    this.load.image('menu-frame-coin', `menu/frame-coin.png`);
    this.load.image('menu-icon-achievements', `menu/icon-achievements.png`);
    this.load.image('menu-icon-record', `menu/icon-record.png`);
    this.load.image('ui-coin', `ui/coin.png`);   // 龟币框内: Phaser 纹理便于 tint 成绿色
    // 战斗规则配图 (用户配图) — 图鉴规则列表用 Phaser 纹理 rule-<id>; DOM 处 (选规则弹窗/规则详情) 直接走 icon 路径
    for (const id of ['fire', 'thunder', 'shield', 'rage', 'equip', 'rain', 'normal']) {
      this.load.image(`rule-${id}`, `rules/${id}.png`);
    }
    // 糖果炸弹实体 sprite (用户配图) — 载为 pet-candy-bomb, create 里 makeCandyBombTexture 的
    //   exists 守卫会自动跳过程序化占位图, 改用这张真图。
    this.load.image('pet-candy-bomb', `pets/candy-bomb.png`);
    // 主菜单工具栏图标按钮 (全屏/音量) — 与战斗顶栏同款贴图 (用户配图), 主菜单用 Phaser 纹理
    this.load.image('ui-btn-fullscreen', `ui/btn-fullscreen.png`);
    this.load.image('ui-btn-sound', `ui/btn-sound.png`);

    // 背景 — 9 张地图全部加载
    const BG_MAPS = [
      'bg-sakura', 'bg-cave-alt', 'bg-firefly', 'bg-forest',
      'bg-ice', 'bg-oasis', 'bg-ruins', 'bg-shipwreck', 'bg-underwater',
    ];
    for (const k of BG_MAPS) this.load.image(k, `bg/${k}.png`);

    // 28 龟 avatar portrait (静态, 用于 Codex/TeamSelect 圆头像)
    for (const pet of ALL_PETS) {
      this.load.image(`pet-${pet.id}`, `avatars/${pet.id}.png`);
    }

    // P12: 召唤物图 (JS battle-setup.js:271-289 + equip-effects.js spawnDollBear/spawnPirateShip)
    //   spawn 单位用 createFighter 后改 id, 走 makeView pet-${id} 取图; 必须预载.
    //   ID 用下划线 (与 spawn*Bear/PirateShip 1:1), 文件用 dash 命名.
    this.load.image('pet-doll_bear',    'pets/doll-bear.png');
    this.load.image('pet-pirate-ship',  'battle/pirate-ship.png');
    this.load.image('pet-crystal-ball', 'pets/crystal-ball.png');
    this.load.image('pet-conch-worm',   'pets/conch-worm.png');
    this.load.image('pet-giant_crab',   'pets/giant-crab-entity.png');   // 中立巨蟹 站场实体本体图 (giant-crab.png 是攻击技能图, 实体用专用图)
    // 形态变身静态图 (lava 火山 / cyber 机甲) — JS 变身换 f.img 形态图 (state.js:606)
    this.load.image('pet-form-volcano', 'passive/volcano-form-icon.png');
    this.load.image('pet-form-mech',    'passive/mech-form-icon.png');
    this.load.image('pet-mech',         'pets/mech.png');         // 机甲变身本体立绘 (替代小形态图标)
    // 中立宝箱怪 (treasure_golem) idle 序列 6 帧 74×73 — makeView 按 fighter.id 找 pet-sheet-<id>
    this.load.spritesheet('pet-sheet-treasure_golem', 'pets/treasure-golem.png', { frameWidth: 74, frameHeight: 73 });

    // v0.9.5.A56: 只给"没 spritesheet 的 10 龟"加载 body PNG (避免和 spritesheet 同 URL 冲突)
    // 有 sprite metadata 的龟战斗中用 spritesheet anim, 不需要静态 body
    for (const pet of ALL_PETS) {
      if (pet.sprite) continue;
      if (pet.img) this.load.image(`pet-body-${pet.id}`, pet.img);
    }

    // 动画 spritesheet —— 18 龟有 sprite{} 元数据走 spritesheet idle,
    // 10 龟无 sprite (ice/two_head/diamond/dice/rainbow/pirate/lightning/phoenix/lava/cyber) 退到静态 body PNG
    for (const pet of ALL_PETS) {
      if (!pet.sprite) continue;
      this.load.spritesheet(`pet-sheet-${pet.id}`, pet.img, {
        frameWidth: pet.sprite.frameW,
        frameHeight: pet.sprite.frameH,
      });
    }
    // 动作: 每只龟 attack/hurt/death/knockup; ninja attack 用 throw.png
    const ACTION_SHEETS: Array<{ pet: string; action: string; file: string; w: number; h: number }> = [
      { pet: 'basic',  action: 'attack',  file: 'attack.png',  w: 120, h: 120 },
      { pet: 'basic',  action: 'hurt',    file: 'hurt.png',    w: 120, h: 120 },
      { pet: 'basic',  action: 'death',   file: 'death.png',   w: 120, h: 120 },
      { pet: 'ghost',  action: 'attack',  file: 'attack.png',  w: 64,  h: 64 },
      { pet: 'ghost',  action: 'hurt',    file: 'hurt.png',    w: 64,  h: 64 },
      { pet: 'ghost',  action: 'death',   file: 'death.png',   w: 64,  h: 64 },
      { pet: 'ghost',  action: 'knockup', file: 'knockup.png', w: 64,  h: 64 },
      { pet: 'ninja',  action: 'attack',  file: 'throw.png',   w: 64,  h: 64 },
      { pet: 'ninja',  action: 'hurt',    file: 'hurt.png',    w: 64,  h: 64 },
      { pet: 'ninja',  action: 'death',   file: 'death.png',   w: 64,  h: 64 },
      { pet: 'ninja',  action: 'knockup', file: 'knockup.png', w: 64,  h: 64 },
    ];
    for (const a of ACTION_SHEETS) {
      this.load.spritesheet(`pet-action-${a.pet}-${a.action}`,
        `pets/animations/${a.pet}/${a.file}`,
        { frameWidth: a.w, frameHeight: a.h });
    }
    // 忍者龟冲刺/背刺专用序列 (18 帧 64×64, 1800ms) — ninjaImpact/Backstab 自驱 dash 时盖在 caster 身上
    //   (JS ninja.js:262 playFighterSpriteOnce dash.png / backstab.png)
    this.load.spritesheet('pet-action-ninja-dash', 'pets/animations/ninja/dash.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('pet-action-ninja-backstab', 'pets/animations/ninja/backstab.png', { frameWidth: 64, frameHeight: 64 });
    // 幽灵虚化序列 (13 帧 64×64, ~1300ms) — ghostPhase 盖在 caster 身上 (K4)
    this.load.spritesheet('pet-action-ghost-phase', 'pets/animations/ghost/phase.png', { frameWidth: 64, frameHeight: 64 });

    // E3/24: VFX 飞行物 (JS vfx/projectile.js 用)
    // ninja-shuriken: 4 帧 128×128 spritesheet, 100ms/帧 旋转
    this.load.spritesheet('vfx-ninja-shuriken',
      'vfx/ninja-shuriken.png',
      { frameWidth: 128, frameHeight: 128 });
    // hunter-arrow: 单帧 (后续也用)
    this.load.image('vfx-hunter-arrow', 'vfx/hunter-arrow.png');
    // P31 basic 小龟 VFX (JS scene.css:947-1024 1:1 spritesheet specs)
    // P98 1:1 实测 PNG: basic-shieldbash-arc 640×128 → 5 frames × 128×128 (之前 160×160 全错)
    this.load.spritesheet('vfx-basic-shieldbash-arc',
      'vfx/basic-shieldbash-arc.png',
      { frameWidth: 128, frameHeight: 128 });
    // P98 1:1 实测 PNG: basic-shieldbash-impact 640×128 → 5 frames × 128×128 (之前 144×144 错)
    this.load.spritesheet('vfx-basic-shieldbash-impact',
      'vfx/basic-shieldbash-impact.png',
      { frameWidth: 128, frameHeight: 128 });
    // P153 basic-barrage-bolt: 7帧 spritesheet (896×128 = 7×128, 实测 PNG) — JS scene.css:498
    //   之前误当单图加载 → 打击弹道只显第1帧不动画. 改 spritesheet + anim.
    this.load.spritesheet('vfx-basic-barrage-bolt', 'vfx/basic-barrage-bolt.png',
      { frameWidth: 128, frameHeight: 128 });
    // P155 basic-chiwave: 15帧 spritesheet (1920×128 = 15×128, 实测 PNG) — JS scene.css:466
    //   之前没加载 → 龟派气波用矩形 fallback. 改 spritesheet + anim (15帧 1500ms).
    this.load.spritesheet('vfx-basic-chiwave', 'vfx/basic-chiwave.png',
      { frameWidth: 128, frameHeight: 128 });
    // P218 竹叶龟绿球: orb 8 帧×128 (实测 1024×128) / burst 6 帧×128 (768×128)
    this.load.spritesheet('vfx-bamboo-charge-orb', 'vfx/bamboo-charge-orb.png',
      { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('vfx-bamboo-charge-burst', 'vfx/bamboo-charge-burst.png',
      { frameWidth: 128, frameHeight: 128 });
    // D3 赛博龟能量大炮激光: 6帧 spritesheet (768×128 = 6×128) — JS scene.css:883 cyber-beam-sweep
    //   steps(6) 720ms 横向激光扫. 之前 PoC 用纯蓝矩形替代 → 与 JS 纹理激光不符。
    this.load.spritesheet('vfx-cyber-beam-sweep', 'vfx/cyber-beam-sweep.png',
      { frameWidth: 128, frameHeight: 128 });
    // P161 basic-slam-impact: 9帧 spritesheet (实测 PNG 1152×128 = 9×128). 之前误当单图加载
    //   → 过肩摔砸地只显第 1 帧 (静态). 改 spritesheet + anim (JS scene.css:757 steps(9) 720ms).
    this.load.spritesheet('vfx-basic-slam-impact', 'vfx/basic-slam-impact.png',
      { frameWidth: 128, frameHeight: 128 });
    // P75 ninja-bomb: 12 frames × 64×64 spritesheet (JS ninja.js:550-551)
    this.load.spritesheet('vfx-ninja-bomb', 'vfx/ninja-bomb.png',
      { frameWidth: 64, frameHeight: 64 });
    // P78 common-lightning-strike: 5 frames × 200×200 (JS scene.css:918-934)
    //   闪电龟 lightningStorm + 8-stack detonate + 宝箱龟 thunder 5-stack 用
    // P98 1:1 实测 PNG: 640×128 → 5 frames × 128×128 (之前 200×200 错)
    this.load.spritesheet('vfx-common-lightning-strike', 'vfx/common-lightning-strike.png',
      { frameWidth: 128, frameHeight: 128 });
    // P84 burn-loop: 8 帧 × 128×128 (JS scene.css:167-184) — 任何 fighter 有 burn buff 时显示
    //   PoC 之前完全没接, 用户报"灼烧 都得找". JS .scene-turtle.burning .st-body::before
    this.load.spritesheet('vfx-burn-loop', 'vfx/burn-loop.png',
      { frameWidth: 128, frameHeight: 128 });
    // P86 ghost VFX trio (JS scene.css:1056-1131) — 之前 PoC 完全没接, 3 张 PNG 0 引用
    //   ghost-phantom: 5 frames × 64×64 (atlas 320×64), 500ms — ghostPhantom 命中
    //   ghost-storm:   8 frames × 64×64 (atlas 512×64), 800ms — ghostStorm 2 hit AOE
    //   ghost-touch:   7 frames × 64×64 (atlas 448×64), 700ms — ghostTouch basic hit
    this.load.spritesheet('vfx-ghost-phantom', 'vfx/ghost-phantom.png',
      { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('vfx-ghost-storm', 'vfx/ghost-storm.png',
      { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('vfx-ghost-touch', 'vfx/ghost-touch.png',
      { frameWidth: 64, frameHeight: 64 });
    // P90 ninja-dash-trail: 4 frames × 128×128 (JS scene.css:818-832), 200ms infinite loop
    //   忍者龟 ninjaImpact/ninjaBackstab dash flight 期间挂 caster body, 速度残影
    this.load.spritesheet('vfx-ninja-dash-trail', 'vfx/ninja-dash-trail.png',
      { frameWidth: 128, frameHeight: 128 });
    // P98 1:1 实测 PNG: cyber-mech-birth 1024×128 → 8 frames × 128×128 (之前 96×96 错)
    //   赛博龟 mech 形态切换时底部锚定脚下播一次
    this.load.spritesheet('vfx-cyber-mech-birth', 'vfx/cyber-mech-birth.png',
      { frameWidth: 128, frameHeight: 128 });
    // P91 装备 VFX: revolver-bullet / wave-sweep (JS equip-effects.js:822/424 引用, PoC 之前 0 引用)
    //   revolver-bullet: 单帧子弹精灵 (左轮手枪装备 fire 时直线射出, 320ms 320px size)
    //   wave-sweep:      单帧/动图 (海浪装备 3-stack→sweep 全场, 之前 PoC 用 graphics 替代)
    this.load.image('vfx-revolver-bullet', 'vfx/revolver-bullet.png');
    this.load.image('vfx-wave-sweep', 'vfx/wave-sweep.png');

    // UI icon
    this.load.image('coin', `ui/coin.png`);

    // P1.1 + P2.6: status / passive PNG icons (替换 emoji)
    const STATUS_ICONS = ['burn', 'poison', 'bleed', 'chilled', 'curse-debuff', 'dodge',
      'fear', 'heal-reduce', 'reflect', 'shield', 'stealth', 'stun', 'taunt'];
    // 加载构建期小图 (_sm, ≤128px); 源图~500px 留给详情面板 DOM <img>。脚本: scripts/gen-small-icons.mjs
    for (const s of STATUS_ICONS) this.load.image(`status-${s}`, `status/_sm/${s}-icon.png`);

    const PASSIVE_ICONS = ['aura-awaken', 'bamboo-charge', 'bubble-store', 'candy-steal',
      'chest-treasure', 'crystal-resonance', 'cyber-drone', 'diamond-structure',
      'fortune-gold', 'frost-aura', 'ghost-curse', 'gambler-blood', 'gambler-multi',
      'hunter-kill', 'judgement', 'lava-heart', 'lightning-storm', 'mech-form',
      'ninja-instinct', 'phoenix-rebirth', 'pirate-plunder', 'rainbow-prism',
      'star-energy', 'stone-wall', 'summon-ally', 'two-head', 'undead-rage', 'unyielding'];
    for (const p of PASSIVE_ICONS) this.load.image(`passive-${p}`, `passive/_sm/${p}-icon.png`);

    // v0.9.5.A22: 装备 icon — 静态从 EQUIP_POOL 扫 eq.icon, 让 Codex 左列表 Phaser.Image 被 mask clip
    for (const eq of EQUIP_POOL) {
      if (eq.icon && eq.icon.endsWith('.png')) {
        // 用 _sm 小图 (Codex 列表 32px / 详情仍 ≤128); 源图大留 DOM
        this.load.image(`equip-${eq.id}`, eq.icon.replace(/\/([^/]+\.png)$/, '/_sm/$1'));
      }
    }

    // Audio
    this.load.audio('bgm-menu', `bgm-menu.mp3`);
    this.load.audio('bgm-battle', `bgm-battle.mp3`);
    this.load.audio('bgm-boss', `bgm-boss.mp3`);   // I5: boss 关 BGM
    this.load.audio('sfx-hit', `sfx/hit-physical.wav`);
    this.load.audio('sfx-crit', `sfx/hit-crit.wav`);
    this.load.audio('sfx-defeat', `sfx/defeat.wav`);
    this.load.audio('sfx-shield-break', `sfx/shield-break.wav`);
    this.load.audio('sfx-heal', `sfx/heal.wav`);
    this.load.audio('sfx-rebirth', `sfx/rebirth.wav`);
    this.load.audio('sfx-shield-gain', `sfx/shield-gain.wav`);
  }

  create() {
    // idle 动画 loop -1 —— 所有有 sprite{} 的龟
    for (const pet of ALL_PETS) {
      if (!pet.sprite) continue;
      const animKey = `anim-idle-${pet.id}`;
      if (this.anims.exists(animKey)) continue;
      const key = `pet-sheet-${pet.id}`;
      if (!this.textures.exists(key)) continue;
      const tex = this.textures.get(key);
      const frameCount = Math.min(pet.sprite.frames, tex.frameTotal - 1);
      if (frameCount <= 0) continue;
      const durationMs = pet.sprite.duration ?? 800;
      const fps = Math.max(4, Math.round((frameCount * 1000) / Math.max(200, durationMs)));
      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers(key, { start: 0, end: frameCount - 1 }),
        frameRate: fps, repeat: -1,
      });
    }
    // 动作动画 (单次播放) —— 仅 basic/ghost/ninja 有完整 attack/hurt/death/knockup sheet
    const ACTION_PETS = ['basic', 'ghost', 'ninja'];
    const ACTIONS = ['attack', 'hurt', 'death', 'knockup'];
    for (const pet of ACTION_PETS) {
      for (const action of ACTIONS) {
        const key = `pet-action-${pet}-${action}`;
        if (!this.textures.exists(key)) continue;
        const animKey = `anim-${action}-${pet}`;
        if (this.anims.exists(animKey)) continue;
        const tex = this.textures.get(key);
        const frameCount = tex.frameTotal - 1;
        if (frameCount <= 0) continue;
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(key, { start: 0, end: frameCount - 1 }),
          frameRate: 12, repeat: 0,
        });
      }
    }

    // 中立宝箱怪 idle 6 帧循环 (~700ms) — makeView hasIdleAnim('treasure_golem') 据此走 sprite 路径
    if (this.textures.exists('pet-sheet-treasure_golem') && !this.anims.exists('anim-idle-treasure_golem')) {
      this.anims.create({
        key: 'anim-idle-treasure_golem',
        frames: this.anims.generateFrameNumbers('pet-sheet-treasure_golem', { start: 0, end: 5 }),
        frameRate: 9, repeat: -1,
      });
    }

    // 忍者冲刺/背刺序列 18 帧 / 1800ms = 10fps, 单次播放
    for (const k of ['dash', 'backstab']) {
      const tex = `pet-action-ninja-${k}`, anim = `anim-${k}-ninja`;
      if (this.textures.exists(tex) && !this.anims.exists(anim)) {
        this.anims.create({
          key: anim,
          frames: this.anims.generateFrameNumbers(tex, { start: 0, end: 17 }),
          frameRate: 10, repeat: 0,
        });
      }
    }
    // 幽灵虚化 13 帧 / ~1300ms = 10fps (K4)
    if (this.textures.exists('pet-action-ghost-phase') && !this.anims.exists('anim-phase-ghost')) {
      this.anims.create({
        key: 'anim-phase-ghost',
        frames: this.anims.generateFrameNumbers('pet-action-ghost-phase', { start: 0, end: 12 }),
        frameRate: 10, repeat: 0,
      });
    }

    // E3/24: vfx projectile spritesheet 动画
    // E3/42 FIX: JS scene.css:560 是 `animation:... 120ms steps(4) infinite` —
    //   120ms 一整圈 4 帧 = 每帧 30ms ≈ 33 fps (我之前误读为 100ms/帧, 慢 3 倍)
    if (this.textures.exists('vfx-ninja-shuriken') && !this.anims.exists('anim-shuriken-spin')) {
      this.anims.create({
        key: 'anim-shuriken-spin',
        frames: this.anims.generateFrameNumbers('vfx-ninja-shuriken', { start: 0, end: 3 }),
        frameRate: 33, repeat: -1,  // JS 120ms/cycle = 30ms/frame
      });
    }

    // P153 basic-barrage-bolt: 7 frames @ 220ms (JS scene.css:507 basicBarrageBoltLife steps(7))
    if (this.textures.exists('vfx-basic-barrage-bolt') && !this.anims.exists('anim-basic-barrage-bolt')) {
      this.anims.create({
        key: 'anim-basic-barrage-bolt',
        frames: this.anims.generateFrameNumbers('vfx-basic-barrage-bolt', { start: 0, end: 6 }),
        frameRate: 32, repeat: 0,  // 7 帧 / 0.22s ≈ 32fps
      });
    }
    // P155 basic-chiwave: 15 frames @ 1500ms (JS scene.css:476 basicChiwaveLife steps(15))
    if (this.textures.exists('vfx-basic-chiwave') && !this.anims.exists('anim-basic-chiwave')) {
      this.anims.create({
        key: 'anim-basic-chiwave',
        frames: this.anims.generateFrameNumbers('vfx-basic-chiwave', { start: 0, end: 14 }),
        frameRate: 10, repeat: 0,  // 15 帧 / 1.5s = 10fps
      });
    }
    // P218 竹叶龟绿球: orb 8帧循环 (飞行中) / burst 6帧一次
    if (this.textures.exists('vfx-bamboo-charge-orb') && !this.anims.exists('anim-bamboo-charge-orb')) {
      this.anims.create({ key: 'anim-bamboo-charge-orb',
        frames: this.anims.generateFrameNumbers('vfx-bamboo-charge-orb', { start: 0, end: 7 }), frameRate: 14, repeat: -1 });
    }
    if (this.textures.exists('vfx-bamboo-charge-burst') && !this.anims.exists('anim-bamboo-charge-burst')) {
      this.anims.create({ key: 'anim-bamboo-charge-burst',
        frames: this.anims.generateFrameNumbers('vfx-bamboo-charge-burst', { start: 0, end: 5 }), frameRate: 21, repeat: 0 });
    }

    // P31 basic VFX 动画 (JS scene.css:947-995 steps 模拟)
    // basicShieldbashArcLife: 5 frames @ 300ms total = 60ms/frame ≈ 17fps
    if (this.textures.exists('vfx-basic-shieldbash-arc') && !this.anims.exists('anim-basic-shieldbash-arc')) {
      this.anims.create({
        key: 'anim-basic-shieldbash-arc',
        frames: this.anims.generateFrameNumbers('vfx-basic-shieldbash-arc', { start: 0, end: 4 }),
        frameRate: 17, repeat: 0,
      });
    }
    // basicShieldbashImpactLife: 5 frames @ 250ms total = 50ms/frame = 20fps
    if (this.textures.exists('vfx-basic-shieldbash-impact') && !this.anims.exists('anim-basic-shieldbash-impact')) {
      this.anims.create({
        key: 'anim-basic-shieldbash-impact',
        frames: this.anims.generateFrameNumbers('vfx-basic-shieldbash-impact', { start: 0, end: 4 }),
        frameRate: 20, repeat: 0,
      });
    }
    // P161 basicSlamImpactLife: 9 frames @ 720ms total = 80ms/frame ≈ 12.5fps (JS scene.css:757)
    if (this.textures.exists('vfx-basic-slam-impact') && !this.anims.exists('anim-basic-slam-impact')) {
      this.anims.create({
        key: 'anim-basic-slam-impact',
        frames: this.anims.generateFrameNumbers('vfx-basic-slam-impact', { start: 0, end: 8 }),
        frameRate: 12.5, repeat: 0,
      });
    }
    // D3 cyber-beam-sweep: 6 帧 @ 720ms total = 120ms/帧 ≈ 8.33fps (JS scene.css:883 steps(6) 720ms)
    if (this.textures.exists('vfx-cyber-beam-sweep') && !this.anims.exists('anim-cyber-beam-sweep')) {
      this.anims.create({
        key: 'anim-cyber-beam-sweep',
        frames: this.anims.generateFrameNumbers('vfx-cyber-beam-sweep', { start: 0, end: 5 }),
        frameRate: 8.333, repeat: 0,
      });
    }
    // P75 ninja-bomb: 12 frames @ 1200ms total = 100ms/frame = 10fps (JS ninja.js:553)
    if (this.textures.exists('vfx-ninja-bomb') && !this.anims.exists('anim-ninja-bomb')) {
      this.anims.create({
        key: 'anim-ninja-bomb',
        frames: this.anims.generateFrameNumbers('vfx-ninja-bomb', { start: 0, end: 11 }),
        frameRate: 10, repeat: 0,
      });
    }
    // P78 common-lightning-strike: 5 frames @ 560ms total = 112ms/frame ≈ 9fps (JS:929)
    if (this.textures.exists('vfx-common-lightning-strike') && !this.anims.exists('anim-common-lightning-strike')) {
      this.anims.create({
        key: 'anim-common-lightning-strike',
        frames: this.anims.generateFrameNumbers('vfx-common-lightning-strike', { start: 0, end: 4 }),
        frameRate: 9, repeat: 0,
      });
    }
    // P84 burn-loop: 8 frames @ 800ms total steps(8) infinite (JS scene.css:174)
    if (this.textures.exists('vfx-burn-loop') && !this.anims.exists('anim-burn-loop')) {
      this.anims.create({
        key: 'anim-burn-loop',
        frames: this.anims.generateFrameNumbers('vfx-burn-loop', { start: 0, end: 7 }),
        frameRate: 10, repeat: -1,  // 8 frames @ 10fps = 800ms loop, infinite
      });
    }
    // P86 ghost VFX trio anims (JS scene.css:1068/1094/1119)
    if (this.textures.exists('vfx-ghost-phantom') && !this.anims.exists('anim-ghost-phantom')) {
      this.anims.create({
        key: 'anim-ghost-phantom',
        frames: this.anims.generateFrameNumbers('vfx-ghost-phantom', { start: 0, end: 4 }),
        frameRate: 10, repeat: 0,  // 5 frames @ 10fps = 500ms (JS 500ms steps(5))
      });
    }
    if (this.textures.exists('vfx-ghost-storm') && !this.anims.exists('anim-ghost-storm')) {
      this.anims.create({
        key: 'anim-ghost-storm',
        frames: this.anims.generateFrameNumbers('vfx-ghost-storm', { start: 0, end: 7 }),
        frameRate: 10, repeat: 0,  // 8 frames @ 10fps = 800ms (JS 800ms steps(8))
      });
    }
    if (this.textures.exists('vfx-ghost-touch') && !this.anims.exists('anim-ghost-touch')) {
      this.anims.create({
        key: 'anim-ghost-touch',
        frames: this.anims.generateFrameNumbers('vfx-ghost-touch', { start: 0, end: 6 }),
        frameRate: 10, repeat: 0,  // 7 frames @ 10fps = 700ms (JS 700ms steps(7))
      });
    }
    // P90 ninja-dash-trail: 4 帧 200ms infinite (JS scene.css:827)
    if (this.textures.exists('vfx-ninja-dash-trail') && !this.anims.exists('anim-ninja-dash-trail')) {
      this.anims.create({
        key: 'anim-ninja-dash-trail',
        frames: this.anims.generateFrameNumbers('vfx-ninja-dash-trail', { start: 0, end: 3 }),
        frameRate: 20, repeat: -1,  // 4 frames @ 20fps = 200ms loop
      });
    }
    // P90 cyber-mech-birth: 8 帧 720ms steps forwards (JS scene.css:798)
    if (this.textures.exists('vfx-cyber-mech-birth') && !this.anims.exists('anim-cyber-mech-birth')) {
      this.anims.create({
        key: 'anim-cyber-mech-birth',
        frames: this.anims.generateFrameNumbers('vfx-cyber-mech-birth', { start: 0, end: 7 }),
        frameRate: 11, repeat: 0,  // 8 frames @ 11fps ≈ 720ms total
      });
    }

    // P29: 生成 shadow radial-gradient 纹理 (1:1 JS scene.css:18-31)
    //   JS: radial-gradient(ellipse at center, rgba(0,0,0,.55) 0%, .25 50%, transparent 80%)
    //   + drop-shadow(0 0 3px rgba(0,0,0,.3))
    //   单 Phaser ellipse 颜色均匀, 双层叠加仍非真 radial → 用 Canvas2D 烤 1 张 256×80 png 注册成纹理.
    this.makeShadowTexture();
    this.makeCandyBombTexture();   // K9: 糖果炸弹无 PNG 资产 → 用 emoji 烤一张纹理

    // 角色/动作精灵统一 NEAREST 过滤 (像素艺术)。游戏全局 pixelArt:false/antialias:true (LINEAR,
    //   为中文/曲线锐利), 但角色贴图是小像素图放大显示 → LINEAR 会糊。idle 在 makeView 里已设 NEAREST,
    //   但 playAction 换上的攻击/受击/死亡/冲刺/背刺贴图没设 → 播放的角色动画发糊 (用户报)。
    //   在此对所有 pet-* 纹理 (idle/action/body/form/dummy) 统一设 NEAREST, 一处搞定。
    for (const k of this.textures.getTextureKeys()) {
      if (k.startsWith('pet-')) {
        try { this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
      }
    }

    // 菜单背景 = CSS `html.menu-bg-active::before` 海 tile (透过透明画布显示), 无需画布内背景层。
    // P27: 删 fadeIn 黑屏
    this.time.delayedCall(200, () => this.scene.start('MainMenuScene'));
  }

  private makeShadowTexture() {
    const KEY = 'fx-shadow';
    if (this.textures.exists(KEY)) return;
    const W = 256, H = 80;     // 高分辨率纹理, 实际用 setDisplaySize(80×24) 等缩小
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // ellipse-at-center radial gradient
    const gx = W / 2, gy = H / 2;
    const r = Math.min(gx, gy);
    const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    grad.addColorStop(0,   'rgba(0,0,0,0.55)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.25)');
    grad.addColorStop(0.8, 'rgba(0,0,0,0.00)');
    grad.addColorStop(1,   'rgba(0,0,0,0.00)');
    ctx.fillStyle = grad;
    // 绘成椭圆形状 (W:H = 256:80 → 椭圆 aspect)
    ctx.beginPath();
    ctx.ellipse(gx, gy, r * (W / (2 * r)), r * (H / (2 * r)), 0, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    this.textures.addCanvas(KEY, canvas);
  }

  /** K9: 糖果炸弹 (candy-bomb) 无 PNG 资产。阶段5: 程序化画一个「糖果包装的炸弹」占位图
   *  (替原来的 🍬💣 emoji — emoji 各系统渲染不一致)。圆炸弹身 + 左右粉色糖纸扭结 +
   *  顶部引线火花 + 高光。跨设备一致, 风格统一。后续可换正式像素 PNG。 */
  private makeCandyBombTexture() {
    const KEY = 'pet-candy-bomb';
    if (this.textures.exists(KEY)) return;
    const W = 128, H = 112;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cx = 64, cy = 66, R = 30;
    // 左右糖纸扭结 (粉)
    ctx.fillStyle = '#ff7eb6';
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + dir * (R + 1), cy);
      ctx.lineTo(cx + dir * (R + 20), cy - 13);
      ctx.lineTo(cx + dir * (R + 20), cy + 13);
      ctx.closePath(); ctx.fill();
    }
    // 炸弹球身 (深色球面渐变)
    const g = ctx.createRadialGradient(cx - 10, cy - 10, 4, cx, cy, R);
    g.addColorStop(0, '#5a6473'); g.addColorStop(0.5, '#2e3540'); g.addColorStop(1, '#171b22');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    // 糖果粉色横纹 (clip 在球身内)
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(255,126,182,.5)'; ctx.fillRect(cx - R, cy - 6, R * 2, 12);
    ctx.restore();
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.beginPath(); ctx.arc(cx - 11, cy - 11, 5, 0, Math.PI * 2); ctx.fill();
    // 引线接口 + 引线 + 火花
    ctx.fillStyle = '#8a6a3a'; ctx.fillRect(cx - 5, cy - R - 8, 10, 10);
    ctx.strokeStyle = '#c9a05a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, cy - R - 6); ctx.quadraticCurveTo(cx + 14, cy - R - 22, cx + 8, cy - R - 28); ctx.stroke();
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(cx + 8, cy - R - 30, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8c1a'; ctx.beginPath(); ctx.arc(cx + 8, cy - R - 30, 3, 0, Math.PI * 2); ctx.fill();
    this.textures.addCanvas(KEY, canvas);
  }
}
