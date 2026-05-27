// ══════════════════════════════════════════════════════════
// CodexScene — 龟图鉴 (28 龟 + 装备), 纯 Phaser 像素风
// 左列: 滚动 grid; 右栏: hover/click 详情卡
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import type { PetDef, Rarity } from '../types';
import { ALL_PETS, RARITY_MULT } from '../data/pets';
import { EQUIP_POOL } from '../data/equipment';
import { SYNERGY_TAGS } from '../data/synergies';
import { STATUS_DEFS } from '../data/status';
import { BATTLE_RULES } from '../data/rules';
import { BUFF_POOL, BASE_PRICE, SLOT_DIST, type ShopRarity } from '../data/shop-quick';
import { tracker } from '../systems/achievement-tracker';
import { renderSkillTemplate, type SkillCtx } from '../systems/skill-text';
import { addDomHTML, addDomText, addDomImage } from '../systems/dom-text';
import { EASE_MENU_IN } from '../systems/ease';
import { PASSIVE_ICONS } from '../data/passive-icons';
import { MenuDebugOverlay } from './MenuDebugOverlay';
import { getPetLevel, getLevelBonus, skillUnlockLevel } from '../systems/pet-level';

const RARITY_COLOR: Record<Rarity, string> = {
  C: '#06d6a0', B: '#4cc9f0', A: '#3a9abf', S: '#c77dff', SS: '#ffd93d', SSS: '#ff6b6b',
};

type Mode = 'pets' | 'equips' | 'synergies' | 'status' | 'rules';

export class CodexScene extends Phaser.Scene {
  private mode: Mode = 'pets';
  private gridContainer!: Phaser.GameObjects.Container;
  private detailContainer!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScrollY = 0;
  private menuDebug?: MenuDebugOverlay;
  private listWidth = 280;   // P136: 存 listW 供 refreshList 原地重渲
  private currentPetId?: string;   // P146: 当前详情显示的龟 (供 refreshDetail 重渲)
  // P176: 列表名字改 DOM (参考 JS 原生文字, 锐如 HTML). DOMElement 加进 row 容器自动跟随滚动,
  //   但 Phaser 几何遮罩裁不到 DOM → 需按行 worldY 是否在视口内逐行显隐裁切 (clipGridNames).
  private listY = 150;
  private listH = 0;
  private _gridDomNames: Array<{ dom: Phaser.GameObjects.DOMElement; rowY: number }> = [];

  constructor() { super('CodexScene'); }

  /** P146: 等级变更后只重渲详情面板 (图鉴左侧 grid 不显示等级, 无需重建 → 不闪整页).
   *  调试面板"全员等级"调这个, 不再 refreshList 重建 28 行 grid. */
  refreshDetail() {
    if (this.mode !== 'pets') return;
    const pet = ALL_PETS.find(p => p.id === this.currentPetId) ?? ALL_PETS[0];
    if (pet) this.showPetDetail(pet);
  }

  create() {
    const { width, height } = this.scale.gameSize;

    // v0.9.5.A19: 沿用主菜单 tile bg, 不再单独画 bg-sakura → 进入无黑屏闪
    document.documentElement.classList.add('menu-bg-active');
    // Phase D: 不再 remove — html.menu-bg-active 全程挂着, drift 动画不重启 (JS body::before 同款)
    tracker.onCodexOpen();

    // 标题 (drop 入场)
    const title = this.add.text(width / 2, -30, '图鉴', {
      fontSize: '48px', color: '#ffd93d', fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold', resolution: 2,
      stroke: '#1a1a2e', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(10).setResolution(2);
    this.tweens.add({ targets: title, y: 50, duration: 400, ease: EASE_MENU_IN });

    // 返回按钮 — 直接 start, 不 fadeOut 防黑屏
    this.makeIconButton(40, 40, '←', () => {
      this.scene.start('MainMenuScene');
    });

    // 调试面板 🛠 (右上角) — 图鉴侧 menu-level debug (设等级/加币/重置/快速对战)
    this.menuDebug = new MenuDebugOverlay(this, {
      quickBattle: (mode) => { this.menuDebug?.hide(); this.scene.start('TeamSelectScene', { mode }); },
      jumpDungeonBoss: () => {
        // JS debugJumpToDungeonBoss: 没队伍时用前 3 龟兜底 (否则 stage 5 提示先组队)
        this.menuDebug?.hide();
        const team = ALL_PETS.slice(0, 3).map(p => p.id);
        this.scene.start('DungeonScene', { stage: 5, playerTeam: team });
      },
      // P146: 只重渲详情面板 (grid 不显示等级, 无需重建 → 不闪整页)
      afterLevelChange: () => this.refreshDetail(),
    });
    this.makeIconButton(width - 40, 40, '🛠', () => this.menuDebug?.toggle());

    // Tab: 5 个 (龟 / 装备 / 羁绊 / 状态 / 规则) — v0.9.5.A19 删 "技能" tab (用户要求, 技能在每只龟详情里已显示)
    const TABS: Array<{ key: Mode; label: string }> = [
      { key: 'pets',      label: `🐢 龟 (${ALL_PETS.length})` },
      { key: 'equips',    label: `⚔ 装备 (${EQUIP_POOL.length})` },
      { key: 'synergies', label: `🔗 羁绊 (${Object.keys(SYNERGY_TAGS).length})` },
      { key: 'status',    label: `💫 状态 (${STATUS_DEFS.length})` },
      { key: 'rules',     label: `📜 规则 (${BATTLE_RULES.length})` },
    ];
    const tabW = 170, tabGap = 8;
    const totalTabW = TABS.length * tabW + (TABS.length - 1) * tabGap;
    const tabStartX = (width - totalTabW) / 2 + tabW / 2;
    TABS.forEach((tab, i) => {
      const x = tabStartX + i * (tabW + tabGap);
      this.makeTab(x, 110, tab.label, this.mode === tab.key, () => {
        this.mode = tab.key;
        this.scrollY = 0;
        this.scene.restart();
      });
    });

    // v0.9.5.A18 双列布局 (照游戏物品栏): 左 280 列表 + 右 980 详情
    const listX = 40, listY = 150, listW = 280, listH = height - listY - 20;
    // P176: scene.restart 不重跑构造器 → 在此重置 DOM 名字追踪 + 存视口边界 (供滚动裁切)
    this._gridDomNames = [];
    this.listY = listY; this.listH = listH;
    const listBg = this.add.rectangle(listX + listW / 2, listY + listH / 2, listW, listH, 0x000000, 0.4)
      .setStrokeStyle(2, 0x58d3ff, 0.5).setDepth(2);
    this.gridContainer = this.add.container(listX, listY).setDepth(3);
    // Mask 让 list 只显示在区域内
    const maskShape = this.make.graphics({ x: 0, y: 0 });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(listX, listY, listW, listH);
    this.gridContainer.setMask(maskShape.createGeometryMask());

    // 详情卡区域 (右侧大块)
    const detailX = listX + listW + 20, detailY = 150, detailW = width - detailX - 40, detailH = height - detailY - 20;
    const detailBg = this.add.rectangle(detailX + detailW / 2, detailY + detailH / 2, detailW, detailH, 0x000000, 0.6)
      .setStrokeStyle(2, 0xffd93d, 0.6).setDepth(2);
    this.detailContainer = this.add.container(detailX, detailY).setDepth(4);

    // v0.9.5.A21 入场动画 (照 menu 同款 ease): list 从左滑入, detail 从右滑入
    listBg.x -= 360; this.gridContainer.x -= 360;
    listBg.alpha = 0; this.gridContainer.alpha = 0;
    detailBg.x += 360; this.detailContainer.x += 360;
    detailBg.alpha = 0; this.detailContainer.alpha = 0;
    this.tweens.add({
      targets: [listBg, this.gridContainer], x: '+=360', alpha: 1,
      duration: 420, delay: 150, ease: EASE_MENU_IN,
    });
    this.tweens.add({
      targets: [detailBg, this.detailContainer], x: '-=360', alpha: 1,
      duration: 420, delay: 250, ease: EASE_MENU_IN,
    });

    // 填充 list (左侧 280 宽)
    if (this.mode === 'pets')      this.renderPetsGrid(listW);
    else if (this.mode === 'equips')    this.renderEquipsGrid(listW);
    else if (this.mode === 'synergies') this.renderSynergiesList(listW);
    else if (this.mode === 'status')    this.renderStatusList(listW);
    else if (this.mode === 'rules')     this.renderRulesList(listW);
    this.clipGridNames();   // P176: 初次渲染后设 DOM 名字初始可见性

    // 滚动: 鼠标滚轮
    this.input.on('wheel', (_p: unknown, _go: unknown, _dx: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, this.maxScrollY);
      this.gridContainer.y = listY - this.scrollY;
      this.clipGridNames();   // P176: 滚动时按视口逐行显隐 DOM 名字
    });

    // 默认选中第一项
    if (this.mode === 'pets' && ALL_PETS.length) this.showPetDetail(ALL_PETS[0]);
    else if (this.mode === 'equips' && EQUIP_POOL.length) this.showEquipDetail(EQUIP_POOL[0].id);
    else if (this.mode === 'synergies') this.showSynergyDetail(Object.keys(SYNERGY_TAGS)[0]);
    else if (this.mode === 'status' && STATUS_DEFS.length) this.showStatusDetail(STATUS_DEFS[0].id);
    else if (this.mode === 'rules' && BATTLE_RULES.length) this.showRuleDetail(BATTLE_RULES[0].id);
  }

  // ─── v0.9.4.A: 富文本 helper ───

  /** PetDef → SkillCtx (rarity + 等级加成 stats), 用于 renderSkillTemplate 占位符替换 */
  // P126: +100 耐久度已 baked 进 pets.ts hp; P146: 乘等级加成让技能 {N:ATK} 值随等级变
  private petToCtx(pet: PetDef): SkillCtx {
    const m = RARITY_MULT[pet.rarity] * getLevelBonus(pet.id);
    return {
      atk: Math.round(pet.atk * m),
      def: Math.round(pet.def * m),
      mr: Math.round((pet.mr ?? pet.def) * m),
      maxHp: Math.round(pet.hp * m),
      crit: pet.crit ?? 0,
      lv: getPetLevel(pet.id),   // {LV} 模板用 (神罚偷取 3+0.2×LV 等随等级实时算)
    };
  }



  /** v0.9.5.A18: 龟列表单列 (280×50 行), 物品栏风格 */
  private renderPetsGrid(listW: number) {
    const rowH = 52, rowGap = 4, padding = 8;
    ALL_PETS.forEach((pet, i) => {
      const y = padding + i * (rowH + rowGap) + rowH / 2;
      const row = this.add.container(listW / 2, y);
      const rarityColor = parseInt(RARITY_COLOR[pet.rarity].slice(1), 16);

      const bg = this.add.rectangle(0, 0, listW - 16, rowH, 0x1a2740, 0.85)
        .setStrokeStyle(2, rarityColor, 0.7)
        .setInteractive({ useHandCursor: true });
      row.add(bg);
      // P147: 圆头像 — cover 缩放保持长宽比 (源非方形不拉伸) + 圆形几何遮罩.
      //   遮罩 Graphics 加进 row 容器, 随滚动一起移动 (geometry mask 用 world 变换).
      this.addCircularAvatar(row, -(listW - 16) / 2 + 26, 0, `pet-${pet.id}`, 40, rarityColor);
      // P176: 名字改 DOM (锐如 JS HTML); localY=0 (在 row 内), clipY=y (行在 grid 的 y)
      this.addGridName(row, -(listW - 16) / 2 + 56, 0, y, pet.name, '#fff', 15);
      row.add(this.add.text((listW - 16) / 2 - 14, 0, pet.rarity, {
        fontSize: '14px', color: RARITY_COLOR[pet.rarity], fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(1, 0.5).setResolution(2));

      bg.on('pointerover', () => bg.setStrokeStyle(3, 0xffd93d, 1));
      bg.on('pointerout', () => bg.setStrokeStyle(2, rarityColor, 0.7));
      bg.on('pointerdown', () => this.showPetDetail(pet));
      this.gridContainer.add(row);
    });
    const contentH = ALL_PETS.length * (rowH + rowGap) + padding * 2;
    this.maxScrollY = Math.max(0, contentH - 540);
  }

  /** v0.9.5.A18: 装备列表单列 + category 分组 header + 真 icon PNG (照 JS codex.js L43-78) */
  private renderEquipsGrid(listW: number) {
    const catColor: Record<string, number> = {
      unique: 0xffd93d, special: 0xc77dff, normal: 0x4cc9f0,
      chest: 0xff6b6b, consumable: 0x06d6a0,
    };
    const catLabel: Record<string, string> = {
      unique: '唯一', special: '特殊', normal: '普通', chest: '宝箱专属', consumable: '消耗品',
    };
    const catOrder = ['unique', 'special', 'normal', 'chest', 'consumable'] as const;
    const rowH = 48, rowGap = 4;
    let y = 8;
    for (const cat of catOrder) {
      const items = EQUIP_POOL.filter(e => e.category === cat);
      if (!items.length) continue;
      const headerColor = '#' + (catColor[cat] ?? 0x666666).toString(16).padStart(6, '0');
      this.addGridName(this.gridContainer, 14, y, y, `▸ ${catLabel[cat]} (${items.length})`, headerColor, 14);
      y += 24;

      items.forEach(eq => {
        const ry = y + rowH / 2;
        const row = this.add.container(listW / 2, ry);
        const bg = this.add.rectangle(0, 0, listW - 16, rowH, 0x1a2740, 0.85)
          .setStrokeStyle(2, catColor[cat] ?? 0x666666, 0.7)
          .setInteractive({ useHandCursor: true });
        row.add(bg);
        // icon (Phaser image 才能被 mask clip)
        if (this.textures.exists(`equip-${eq.id}`)) {
          row.add(this.add.image(-(listW - 16) / 2 + 22, 0, `equip-${eq.id}`).setDisplaySize(32, 32));
        } else {
          row.add(this.add.text(-(listW - 16) / 2 + 22, 0, '📦', {
            fontSize: '22px', fontFamily: 'monospace',
          }).setOrigin(0.5));
        }
        // 名字 (DOM, 锐如 JS)
        this.addGridName(row, -(listW - 16) / 2 + 46, 0, ry, eq.name, '#fff', 13);

        bg.on('pointerover', () => bg.setStrokeStyle(3, 0xffd93d, 1));
        bg.on('pointerout', () => bg.setStrokeStyle(2, catColor[cat] ?? 0x666666, 0.7));
        bg.on('pointerdown', () => this.showEquipDetail(eq.id));
        this.gridContainer.add(row);
        y += rowH + rowGap;
      });
      y += 10;   // 类别间隔
    }
    this.maxScrollY = Math.max(0, y - 540);
  }

  /** v0.9.5.A21: 详情面板顶部固定 (portrait + 名字 + tag icons + stats + passive 全文)
   *  底部状态切换: skill 列表 ↔ skill 详情 (点击 list 行进 detail, detail 顶部 "← 返回")
   */
  private showPetDetail(pet: PetDef, view: 'skill-list' | 'form-list' | { skillIdx: number; form?: boolean } | 'passive' = 'skill-list') {
    this.detailContainer.removeAll(true);
    this.currentPetId = pet.id;   // P146: 记当前龟供 refreshDetail
    const lv = getPetLevel(pet.id);
    const rarityColor = RARITY_COLOR[pet.rarity];
    const ctx = this.petToCtx(pet);
    const detailW = 900;

    // ════ 顶部固定信息区 (0-230) ════
    // v0.9.5.A27 三栏布局 + 中间横线分隔区
    // v0.9.5.A30: 横线 210→195, 留给下面 passive/skill 更多空间 (龟壳 brief 长)
    const DIVIDER_Y = 195;

    // 1) 头像 (左, 170×170, NEAREST) — v29: 缩小
    // P148: 详情页要"全身" (动画 idle sprite), 但按帧长宽比 contain-fit 进 170 框, 不拉伸.
    //   (grid 用圆头, 详情用全身 — 用户要求)
    const portraitX = 100, portraitY = 110;
    const BOX = 170;
    const containFit = (w: number, h: number): { w: number; h: number } => {
      if (!w || !h) return { w: BOX, h: BOX };
      const s = BOX / Math.max(w, h);   // 长边铺满 BOX, 保持比例
      return { w: Math.round(w * s), h: Math.round(h * s) };
    };
    if (this.anims.exists(`anim-idle-${pet.id}`)) {
      const fw = (pet.sprite?.frameW as number) ?? BOX;
      const fh = (pet.sprite?.frameH as number) ?? BOX;
      const fit = containFit(fw, fh);
      const s = this.add.sprite(portraitX, portraitY, `pet-sheet-${pet.id}`).setDisplaySize(fit.w, fit.h);
      s.play(`anim-idle-${pet.id}`);
      try { s.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
      this.detailContainer.add(s);
    } else {
      // 静态图: DOM object-fit:contain 保持长宽比 (不拉伸不裁切)
      const imgPath = pet.img ? `${pet.img}` : `avatars/${pet.id}.png`;
      this.detailContainer.add(addDomImage(this, portraitX, portraitY, imgPath, BOX, BOX, { crisp: true, objectFit: 'contain' }));
    }

    // 2) 中间名字栏 — P146: 显示实际等级 (getPetLevel)
    const midX = 220;
    this.detailContainer.add(addDomText(this, midX, 30, `Lv ${lv}.  ${pet.name}`, {
      fontSize: 32, color: '#ffd93d', fontWeight: 'bold', pointerThrough: true,
    }).setOrigin(0, 0.5));
    this.detailContainer.add(addDomText(this, midX, 75, '稀有度', {
      fontSize: 14, color: '#888', pointerThrough: true,
    }).setOrigin(0, 0.5));
    this.detailContainer.add(addDomText(this, midX + 60, 75, pet.rarity, {
      fontSize: 28, color: rarityColor, fontWeight: 'bold', pointerThrough: true,
    }).setOrigin(0, 0.5));
    if (Array.isArray(pet.tags) && pet.tags.length > 0) {
      // v0.9.5.A28: 每个 tag 一组 [图+名] 上下对齐居中, 而不是图横排 + 名字单独一行
      pet.tags.slice(0, 4).forEach((tag, i) => {
        const cx = midX + 25 + i * 70;
        this.detailContainer.add(addDomImage(this, cx, 130, `tags/${tag}标签.png`, 50, 60));
        this.detailContainer.add(addDomText(this, cx, 180, tag, {
          fontSize: 14, color: '#58d3ff', fontWeight: 'bold', pointerThrough: true,
        }).setOrigin(0.5, 0.5));
      });
    }

    // 3) 4 属性右栏 (回到老 y=30 顶上位置)
    // 用户要求: 护甲/魔抗 每 2.5 一格
    // P126: +100 耐久度已 baked 进 pets.ts hp; P146: 乘等级加成 (每级 +5%, JS fighter.js:24)
    const m = RARITY_MULT[pet.rarity] * getLevelBonus(pet.id);
    const stats: Array<{ key: string; label: string; val: number; color: string; divisor: number }> = [
      { key: 'hp',   label: '最大生命值', val: Math.round(pet.hp * m),                 color: '#06d6a0', divisor: 40  },
      { key: 'atk',  label: '攻击力',     val: Math.round(pet.atk * m),                color: '#ff9f43', divisor: 5   },
      { key: 'def',  label: '护甲',       val: Math.round(pet.def * m),                color: '#ffd93d', divisor: 2.5 },
      { key: 'mr',   label: '魔抗',       val: Math.round((pet.mr ?? pet.def) * m),    color: '#4dabf7', divisor: 2.5 },
    ];
    // v0.9.5.A38: 整栏左移让 bars 占右半 — icon 620→500, value 870→700, bars 从 720 起
    const statColX = 500, statRowH = 42;
    const valueX = 700;        // value 右对齐 X
    const barsStartX = 716;    // value 右缘 + 16 留白
    const sqW = 5, sqH = 14, sqGap = 2, sqPitch = sqW + sqGap; // 7px pitch — 比 v37 大, 单行更显眼
    stats.forEach((st, i) => {
      const sy = 30 + i * statRowH;
      this.detailContainer.add(addDomImage(this, statColX, sy, `stats/${st.key}-icon.png`, 26, 26));
      this.detailContainer.add(addDomText(this, statColX + 28, sy, st.label, {
        fontSize: 16, color: '#bbb', pointerThrough: true,
      }).setOrigin(0, 0.5));
      this.detailContainer.add(addDomText(this, valueX, sy, String(st.val), {
        fontSize: 24, color: st.color, fontWeight: 'bold', pointerThrough: true,
      }).setOrigin(1, 0.5));
      // 量化方格 — 数字右边, 同行垂直居中
      const count = Math.floor(st.val / st.divisor);
      const colorHex = parseInt(st.color.slice(1), 16);
      for (let k = 0; k < count; k++) {
        const sqCx = barsStartX + k * sqPitch + sqW / 2;
        this.detailContainer.add(this.add.rectangle(sqCx, sy, sqW, sqH, colorHex, 1));
      }
    });

    // 横线分隔
    this.detailContainer.add(
      this.add.rectangle(detailW / 2, DIVIDER_Y, detailW - 40, 1, 0xffd93d, 0.4)
    );

    // 4) 被动 — v0.9.5.A31: 只放 icon + 名字一行, 点击弹出 modal 看完整描述
    if (pet.passive) {
      const passiveY = DIVIDER_Y + 18;
      const piPath = PASSIVE_ICONS[pet.passive.type as string];
      const passiveName = pet.passive.name ?? '';

      // 整条 hit box (20→detailW-20, 高 50)
      const barBg = this.add.rectangle(detailW / 2, passiveY + 25, detailW - 40, 50, 0x12202a, 0.55)
        .setStrokeStyle(1, 0x58d3ff, 0.5)
        .setInteractive({ useHandCursor: true });
      this.detailContainer.add(barBg);

      let textX = 30;
      if (piPath) {
        if (piPath.endsWith('.png')) {
          this.detailContainer.add(addDomImage(this, 50, passiveY + 25, `${piPath}`, 40, 40));
          textX = 80;
        } else {
          this.detailContainer.add(addDomText(this, 50, passiveY + 25, piPath, { fontSize: 32, pointerThrough: true }));
          textX = 80;
        }
      }
      this.detailContainer.add(addDomText(this, textX, passiveY + 25, `被动 · ${passiveName}`, {
        fontSize: 20, color: '#58d3ff', fontWeight: 'bold', pointerThrough: true,
      }).setOrigin(0, 0.5));
      const isPassiveView = view === 'passive';
      const hint = isPassiveView ? '收起 ▾' : '点击查看 ▸';
      this.detailContainer.add(addDomText(this, detailW - 30, passiveY + 25, hint, {
        fontSize: 13, color: isPassiveView ? '#ffd93d' : '#888', pointerThrough: true,
      }).setOrigin(1, 0.5));
      // 选中态: 描边亮黄
      if (isPassiveView) barBg.setStrokeStyle(2, 0xffd93d, 1);

      barBg.on('pointerover', () => barBg.setStrokeStyle(2, 0xffd93d, 1));
      barBg.on('pointerout',  () => barBg.setStrokeStyle(isPassiveView ? 2 : 1, isPassiveView ? 0xffd93d : 0x58d3ff, isPassiveView ? 1 : 0.5));
      barBg.on('pointerdown', () => this.showPetDetail(pet, isPassiveView ? 'skill-list' : 'passive'));
    }

    // (旧 v21 残留的第二条分割线已删, 现在只 v27 的 DIVIDER_Y 一条)

    // ════ 底部区: skill-list / skill-detail / passive-detail (235-540) ════
    const skillPool = pet.skillPool ?? [];
    // E1: 双形态龟 (lava 火山 / 其他带 volcanoSkills) — 提供"形态切换"按钮查看变身形态技能。
    const formSkills = (pet as PetDef & { volcanoSkills?: PetDef['skillPool'] }).volcanoSkills;
    const hasForm = Array.isArray(formSkills) && formSkills.length > 0;
    const isFormView = view === 'form-list' || (typeof view === 'object' && 'form' in view && !!view.form);

    if (view === 'passive') {
      this.renderPassiveDetailSection(pet, ctx, detailW);
    } else if (typeof view === 'object' && 'skillIdx' in view) {
      this.renderSkillDetailSection(pet, view.skillIdx, ctx, detailW, view.form ? formSkills : undefined);
    } else {
      this.renderSkillListSection(pet, isFormView ? (formSkills ?? []) : skillPool, ctx, detailW, isFormView);
    }

    // E1: 形态切换按钮 (仅列表/形态列表视图显示, 单技能详情页不显示)
    if (hasForm && (view === 'skill-list' || view === 'form-list')) {
      const label = isFormView ? '🐢 查看 普通形态技能' : '🌋 查看 火山形态技能';
      const btnW = 220, btnH = 30, btnX = detailW - 20 - btnW / 2, btnY = 262;
      const tBg = this.add.rectangle(btnX, btnY, btnW, btnH, isFormView ? 0x3a1810 : 0x2a1430, 0.92)
        .setStrokeStyle(2, isFormView ? 0x58d3ff : 0xff7043, 1)
        .setInteractive({ useHandCursor: true });
      this.detailContainer.add(tBg);
      this.detailContainer.add(addDomText(this, btnX, btnY, label, {
        fontSize: 14, color: isFormView ? '#9fd8ff' : '#ffae80', fontWeight: 'bold', pointerThrough: true,
      }));
      tBg.on('pointerover', () => tBg.setStrokeStyle(2, 0xffd93d, 1));
      tBg.on('pointerout', () => tBg.setStrokeStyle(2, isFormView ? 0x58d3ff : 0xff7043, 1));
      tBg.on('pointerdown', () => this.showPetDetail(pet, isFormView ? 'skill-list' : 'form-list'));
    }
  }

  /** 技能图标 HTML (排法B: 图标内联在名字左侧)。解析同 DetailPanel:
   *  有 icon 字段 → 用; enhancesPassive 无显式 icon → 取被动图标; iconPlus/enhancesPassive → 叠 "+"。
   *  无图标(还没画的主动技能) → 返回 '' (回退纯文字, 不占位)。 */
  private skillIconHtml(sk: Record<string, unknown>, pet: PetDef, px: number): string {
    let src = typeof sk.icon === 'string' && sk.icon ? sk.icon : '';
    if (!src && sk.enhancesPassive && pet.passive?.type) src = PASSIVE_ICONS[pet.passive.type] ?? '';
    if (!src || !src.endsWith('.png')) return '';   // emoji 被动图标/无图 → 不内联
    // 强化被动"+"角标 — 与局内详情面板 .fdp-skill-plus 一致 (绿色圆形徽章)
    const plus = (sk.enhancesPassive || sk.iconPlus)
      ? `<span style="position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;padding:0 3px;box-sizing:border-box;border-radius:10px;background:#06d6a0;color:#05382a;font-weight:900;font-size:15px;line-height:18px;display:flex;align-items:center;justify-content:center;border:2px solid #0c1018;box-shadow:0 1px 3px rgba(0,0,0,.55)">+</span>`
      : '';
    // 图标框 (深底 + 金边 + 内发光, 与装备席同款质感)
    const pad = Math.max(2, Math.round(px * 0.08));
    return `<span style="position:relative;display:inline-block;vertical-align:middle;line-height:0;padding:${pad}px;`
      + `background:radial-gradient(circle at 50% 35%, rgba(255,217,102,.12), rgba(10,16,24,.7));`
      + `border:1.5px solid rgba(255,217,102,.5);border-radius:8px;box-shadow:inset 0 0 6px rgba(255,217,102,.18),0 1px 3px rgba(0,0,0,.5)">`
      + `<img src="${src}" style="width:${px}px;height:${px}px;image-rendering:pixelated;vertical-align:middle;display:block" onerror="this.parentNode.style.display='none'">${plus}</span>`;
  }

  /** v0.9.5.A25: 技能列表 — 5 个横排紧凑卡, 字体 ×1.5 + 卡片更大 */
  private renderSkillListSection(pet: PetDef, skillPool: PetDef['skillPool'], ctx: SkillCtx, detailW: number, isForm = false) {
    // E1: 形态技能列表 — 变身形态(火山)无等级锁/默认星标概念, 全部视为已解锁普通展示。
    const defaultIdxs = isForm ? [] : (pet.defaultSkills ?? [0, 1, 2]);
    const petLv = getPetLevel(pet.id);   // P146: 技能锁判定 (idx3 需 Lv4, idx4 需 Lv7)
    // 5 卡 1 行。卡片高度必须塞进详情大框: 大框 detailH=550, 卡从 skStartY=282 起 (clear 上方被动栏 213-263),
    //   故 skCardH ≤ 550-282-8 = 260。之前 340 → 卡底到 622, 超出大框 72px (用户报"小框超出大框")。
    const skCardW = 168, skCardH = 260, skGap = 8;
    const skStartX = 20, skStartY = 282;
    skillPool?.slice(0, 5).forEach((sk, i) => {
      if (!sk) return;
      const cx = skStartX + i * (skCardW + skGap);
      const isDefault = defaultIdxs.includes(i);
      // P146: 技能锁 — idx3 需 Lv4, idx4 需 Lv7. 锁定仍可点开查看, 只挂小锁标.
      //   E1: 形态技能不走等级锁 (变身后整套生效)。
      const unlockLv = isForm ? 1 : skillUnlockLevel(i);
      const isLocked = !isForm && petLv < unlockLv;

      // 提高卡框对比度: 之前 fill 0x12202a@0.7 + 边 0.4 alpha 在深色面板上几乎看不见 ("框拉哪去了")。
      //   现 fill 更亮更实 + 边框加粗提亮, 让每张技能卡是清晰的框。
      const bg = this.add.rectangle(cx + skCardW / 2, skStartY + skCardH / 2, skCardW, skCardH, isLocked ? 0x141d2a : 0x18283c, isLocked ? 0.7 : 0.92)
        .setStrokeStyle(isDefault ? 2.5 : 2, isLocked ? 0x6b7686 : (isDefault ? 0x2bd99a : 0x4a93d6), isLocked ? 0.7 : 1)
        .setInteractive({ useHandCursor: true });
      this.detailContainer.add(bg);

      const starLabel = isDefault ? '<span style="color:#06d6a0">★</span> ' : '';
      const lockLabel = isLocked ? '🔒 ' : '';
      let typeChip: string;
      if ((sk as Record<string, unknown>).passiveSkill) {
        typeChip = '<span style="color:#c77dff;font-size:13px;background:rgba(199,125,255,.15);padding:1px 6px;border-radius:3px">被动</span>';
      } else if (!sk.cd || sk.cd === 0) {
        typeChip = '<span style="color:#58d3ff;font-size:13px;background:rgba(88,211,255,.15);padding:1px 6px;border-radius:3px">基础</span>';
      } else {
        typeChip = `<span style="color:#06d6a0;font-size:13px;background:rgba(6,214,160,.15);padding:1px 6px;border-radius:3px">主动 CD${sk.cd}</span>`;
      }
      // P146: 锁定标 — Lv.N 解锁 (灰底)
      if (isLocked) {
        typeChip += ` <span style="color:#ffb454;font-size:12px;background:rgba(255,180,84,.15);padding:1px 6px;border-radius:3px">Lv.${unlockLv}解锁</span>`;
      }
      // 排法B(带框大图标): 图标(带框)居左 + 名字居右同行 → chip 自成一行(图标下方) → 简述铺到卡底。
      //   星标省略(默认技能由绿框表达); 锁定信息由 chip 行的 "Lv.N解锁" 表达。
      void starLabel; void lockLabel;
      const iconHtml = this.skillIconHtml(sk as Record<string, unknown>, pet, 38);
      if (iconHtml) {
        this.detailContainer.add(addDomHTML(this, cx + 8, skStartY + 8, iconHtml, {
          width: 54, fontSize: 18, pointerThrough: true,
        }));
      }
      // 名字 (有图标→居右与图标同行垂直居中; 无图标→占满左侧)
      const nameX = iconHtml ? cx + 61 : cx + 8;
      const nameW = iconHtml ? skCardW - 61 - 8 : skCardW - 16;
      this.detailContainer.add(addDomHTML(this, nameX, skStartY + 18, `<b style="color:${isLocked ? '#bbb' : '#ffd93d'};font-size:16px;white-space:nowrap">${sk.name}</b>`, {
        width: nameW, fontSize: 16, defaultColor: '#fff', pointerThrough: true,
      }));
      // 类型/锁 chip — 自成一行 (图标下方)
      this.detailContainer.add(addDomHTML(this, cx + 8, skStartY + 60, typeChip, {
        width: skCardW - 16, fontSize: 13, pointerThrough: true,
      }));
      // 简述 — 铺到卡底, 多行省略 (…); 短则留白、长则截断带省略号, 不溢出不留 footer 空隙
      const html = renderSkillTemplate(String(sk.brief ?? ''), ctx, sk as Record<string, unknown>);
      const briefEl = addDomHTML(this, cx + 8, skStartY + 82, html, {
        width: skCardW - 16, fontSize: 13, defaultColor: '#aaa', lineHeight: 1.4, pointerThrough: true,
      });
      const bns = (briefEl.node as HTMLElement).style;
      bns.setProperty('display', '-webkit-box');
      bns.setProperty('-webkit-box-orient', 'vertical');
      bns.setProperty('-webkit-line-clamp', '9');   // 卡变矮(260) → 简述行数收到 9, 不溢出卡底
      bns.setProperty('overflow', 'hidden');
      this.detailContainer.add(briefEl);

      bg.on('pointerover', () => bg.setStrokeStyle(2, 0xffd93d, 1));
      bg.on('pointerout', () => bg.setStrokeStyle(isDefault ? 2 : 1, isDefault ? 0x06d6a0 : 0x58d3ff, isDefault ? 1 : 0.4));
      bg.on('pointerdown', () => this.showPetDetail(pet, { skillIdx: i, form: isForm }));
    });
    void detailW;
  }

  /** v0.9.5.A21: 单技能详情页 — 顶部 ← 返回 + 完整 brief + detail */
  private renderSkillDetailSection(pet: PetDef, idx: number, ctx: SkillCtx, detailW: number, formPool?: PetDef['skillPool']) {
    // E1: formPool 传入则查看形态(火山)技能详情, 否则普通 skillPool
    const sk = (formPool ?? pet.skillPool ?? [])[idx];
    if (!sk) return;
    const isForm = !!formPool;

    // 返回按钮 (字体 ×1.5)
    const backY = 278, backX = 20;
    const backBg = this.add.rectangle(backX + 50, backY + 18, 100, 32, 0x1a2740, 0.9)
      .setStrokeStyle(1, 0x58d3ff, 0.6)
      .setInteractive({ useHandCursor: true });
    this.detailContainer.add(backBg);
    this.detailContainer.add(addDomText(this, backX + 50, backY + 18, '← 返回列表', {
      fontSize: 14, color: '#58d3ff', pointerThrough: true,
    }));
    backBg.on('pointerover', () => backBg.setStrokeStyle(2, 0xffd93d, 1));
    backBg.on('pointerout', () => backBg.setStrokeStyle(1, 0x58d3ff, 0.6));
    backBg.on('pointerdown', () => this.showPetDetail(pet, isForm ? 'form-list' : 'skill-list'));

    // 标题 (技能名 + CD chip) — 字体 ×1.5
    const isDefault = !isForm && (pet.defaultSkills ?? [0, 1, 2]).includes(idx);
    const star = isDefault ? '<span style="color:#06d6a0">★</span> ' : '';
    const cdChip = sk.cd ? `　<span style="color:#06d6a0;font-size:20px">CD${sk.cd}</span>` : '';
    const dIcon = this.skillIconHtml(sk as Record<string, unknown>, pet, 40);
    this.detailContainer.add(addDomHTML(this, 160, 283, `${dIcon}${star}<b style="color:#ffd93d;font-size:32px">${sk.name}</b>${cdChip}`, {
      width: detailW - 180, fontSize: 32, defaultColor: '#fff', pointerThrough: true,
    }));

    // v0.9.5.A25: 只显示详情, 不放简述
    const text = sk.detail ?? sk.brief ?? '';
    const html = renderSkillTemplate(String(text), ctx, sk as Record<string, unknown>);
    // 用户: 长技能文字会"下拉"溢出详情框 → 限高 + 内部滚动, 塞回框内 (y=340, 框底 ~700)
    const boxed = `<div style="max-height:352px;overflow-y:auto;padding-right:6px">${html}</div>`;
    this.detailContainer.add(addDomHTML(this, 20, 340, boxed, {
      width: detailW - 40, fontSize: 13, defaultColor: '#fff', lineHeight: 1.5, pointerThrough: true,
    }));
  }

  /** v0.9.5.A34: 被动详情 — 只放完整 desc, 头部 返回/icon/名 已去掉
   *  返回靠点 passive bar (toggle); icon/名 bar 本身已经显示 */
  private renderPassiveDetailSection(pet: PetDef, ctx: SkillCtx, detailW: number) {
    if (!pet.passive) return;
    const fullDesc = String(pet.passive.desc ?? pet.passive.brief ?? '');
    const html = renderSkillTemplate(fullDesc, ctx, {}).replace(/\n/g, '<br>');
    // 完整描述直接占据下方区域 — v0.9.5.A34: 字号 17→13 与 brief 卡片一致
    // 用户: 长被动文字溢出 → 限高 + 内部滚动, 塞回框内 (y=290, 框底 ~700)
    const boxed = `<div style="max-height:402px;overflow-y:auto;padding-right:6px">${html}</div>`;
    this.detailContainer.add(addDomHTML(this, 20, 290, boxed, {
      width: detailW - 40, fontSize: 13, defaultColor: '#fff', lineHeight: 1.5, pointerThrough: true,
    }));
  }

  /** v0.9.5.A20: 装备 detail 适配 920 宽: icon 大图 + 名字 + 类别 chip + 描述 + 数值预览 */
  private showEquipDetail(eqId: string) {
    const eq = EQUIP_POOL.find(e => e.id === eqId);
    if (!eq) return;
    this.detailContainer.removeAll(true);

    const CAT_COLOR: Record<string, string> = {
      unique: '#ffd93d', special: '#c77dff', normal: '#4cc9f0', chest: '#ff6b6b', consumable: '#06d6a0',
    };
    const CAT_LABEL: Record<string, string> = {
      unique: '唯一', special: '特殊', normal: '普通', chest: '宝箱专属', consumable: '消耗品',
    };
    const catColor = CAT_COLOR[eq.category] ?? '#888';
    const detailW = 920;

    // 大 icon 左上 120×120
    if (eq.icon && eq.icon.endsWith('.png')) {
      this.detailContainer.add(addDomImage(this, 90, 90, `${eq.icon}`, 120, 120));
    } else {
      this.detailContainer.add(addDomText(this, 90, 90, eq.icon ?? '📦', { fontSize: 72, pointerThrough: true }));
    }

    // 名字 + 类别 chip — v0.9.5.A23: 默认是唯一, 只对 unique:false 显示"可叠加"badge
    this.detailContainer.add(addDomText(this, 180, 30, eq.name, {
      fontSize: 30, color: '#ffd93d', fontWeight: 'bold', pointerThrough: true,
    }).setOrigin(0, 0.5));
    this.detailContainer.add(addDomText(this, 180, 68, CAT_LABEL[eq.category] ?? eq.category, {
      fontSize: 13, color: catColor, fontWeight: 'bold', pointerThrough: true,
    }).setOrigin(0, 0.5));
    if (eq.unique === false) {
      this.detailContainer.add(addDomText(this, 240, 68, '可叠加', {
        fontSize: 13, color: '#06d6a0', fontWeight: 'bold', pointerThrough: true,
      }).setOrigin(0, 0.5));
    }

    // 描述 (v0.9.5.A22: 结构化解析照 JS codex.js L65-68 — `:` 结尾标题加粗蓝, `※` 灰斜小字)
    this.detailContainer.add(addDomText(this, 180, 110, '描述', {
      fontSize: 14, color: '#58d3ff', fontWeight: 'bold', pointerThrough: true,
    }).setOrigin(0, 0));
    const descRaw = eq.desc ?? '';
    const descHtml = descRaw
      .replace(/^※\s?(.+)$/gm, '<i style="color:#888;font-size:12px">※ $1</i>')
      .replace(/^(.+[:：])$/gm, '<b style="color:#9ad8ff;font-size:14px">$1</b>')
      .replace(/\n/g, '<br>');
    this.detailContainer.add(addDomHTML(this, 180, 132, descHtml, {
      width: detailW - 200, fontSize: 13, defaultColor: '#fff', lineHeight: 1.6, pointerThrough: true,
    }));

    // 数值预览 (扫 apply 函数源码)
    const applySrc = eq.apply.toString();
    const previewLines: string[] = [];
    const m1 = /baseAtk\s*\+=\s*(\d+)/.exec(applySrc); if (m1) previewLines.push(`+${m1[1]} ATK`);
    const m2 = /maxHp\s*\+=\s*(\d+)/.exec(applySrc); if (m2) previewLines.push(`+${m2[1]} HP`);
    const m3 = /baseDef\s*\+=\s*(\d+)/.exec(applySrc); if (m3) previewLines.push(`+${m3[1]} DEF`);
    const m4 = /baseMr.*?\+=\s*(\d+)/.exec(applySrc); if (m4) previewLines.push(`+${m4[1]} MR`);
    const m5 = /armorPen\s*\+=\s*(\d+)/.exec(applySrc); if (m5) previewLines.push(`+${m5[1]} 物穿`);
    const m6 = /magicPen.*?\+\s*(\d+)/.exec(applySrc); if (m6) previewLines.push(`+${m6[1]} 法穿`);
    if (/_lifestealPct.*?\+/.test(applySrc)) previewLines.push('+生命偷取%');
    if (/_equipReflect/.test(applySrc)) previewLines.push('+反伤%');
    if (/_equipBurn/.test(applySrc)) previewLines.push('⊕ 烧伤');
    if (/_equipStun/.test(applySrc)) previewLines.push('⊕ 眩晕');
    if (/_equipHot/.test(applySrc)) previewLines.push('⊕ 持续回血');
    if (/_equipBladeBleed/.test(applySrc)) previewLines.push('⊕ 流血');
    if (/_equipPearl/.test(applySrc)) previewLines.push('⊕ HP 触发回血');

    if (previewLines.length > 0) {
      this.detailContainer.add(addDomText(this, 20, 260, '数值预览', {
        fontSize: 14, color: '#58d3ff', fontWeight: 'bold', pointerThrough: true,
      }).setOrigin(0, 0));
      this.detailContainer.add(addDomText(this, 20, 284, previewLines.join('   ·   '), {
        fontSize: 14, color: '#ffd93d', fontWeight: 'bold', pointerThrough: true,
      }).setOrigin(0, 0));
    }
  }

  // ═══════════════════════════════════════════════════════
  // v0.9.3.A: 4 个新 tab 的 grid/list + detail
  // ═══════════════════════════════════════════════════════

  /** 羁绊 tab: 单列卡片列表 */
  private renderSynergiesList(gridW: number) {
    const items = Object.entries(SYNERGY_TAGS);
    // v0.9.5.A20: 改单列紧凑 (与 pets/equips 一致)
    const rowH = 52, rowGap = 4, padding = 8;
    items.forEach(([key, syn], i) => {
      const y = padding + i * (rowH + rowGap) + rowH / 2;
      const row = this.add.container(gridW / 2, y);
      const bg = this.add.rectangle(0, 0, gridW - 16, rowH, 0x1a2740, 0.85)
        .setStrokeStyle(2, 0x4cc9f0, 0.7)
        .setInteractive({ useHandCursor: true });
      row.add(bg);
      // v0.9.5.A25: 标签 PNG 替代 emoji (DOM <img> 受滚动 mask 不 clip 问题, 但视觉好; 列表行高足够)
      row.add(addDomImage(this, -(gridW - 16) / 2 + 22, 0, `tags/${syn.name}标签.png`, 30, 36));
      this.addGridName(row, -(gridW - 16) / 2 + 52, 0, y, syn.name, '#ffd93d', 15);

      bg.on('pointerover', () => bg.setStrokeStyle(3, 0xffd93d, 1));
      bg.on('pointerout', () => bg.setStrokeStyle(2, 0x4cc9f0, 0.7));
      bg.on('pointerdown', () => this.showSynergyDetail(key));
      this.gridContainer.add(row);
    });
    const contentH = items.length * (rowH + rowGap) + padding * 2;
    this.maxScrollY = Math.max(0, contentH - 540);
  }

  /** v0.9.5.A20: 羁绊 detail 适配 920 宽 — 大 emoji + tier 2/3 + 拥有此羁绊的龟列表 (多列) */
  private showSynergyDetail(tag: string) {
    this.detailContainer.removeAll(true);
    const syn = SYNERGY_TAGS[tag as keyof typeof SYNERGY_TAGS];
    if (!syn) return;
    const detailW = 920;

    // v0.9.5.A22: 大 PNG 标签图 + 名字 (PNG 优先, fallback emoji)
    this.detailContainer.add(addDomImage(this, 60, 70, `tags/${syn.name}标签.png`, 90, 108));
    this.detailContainer.add(addDomText(this, 130, 40, syn.name, {
      fontSize: 32, color: '#ffd93d', fontWeight: 'bold', pointerThrough: true,
    }).setOrigin(0, 0.5));
    this.detailContainer.add(addDomText(this, 130, 76, '羁绊', {
      fontSize: 14, color: '#888', pointerThrough: true,
    }).setOrigin(0, 0.5));

    // tier 2/3 横排两列
    const tier2X = 20, tier3X = detailW / 2 + 10, tierY = 140, tierW = detailW / 2 - 30;
    this.detailContainer.add(addDomText(this, tier2X, tierY, '2★ 激活 (2 只龟)', {
      fontSize: 15, color: '#58d3ff', fontWeight: 'bold', pointerThrough: true,
    }).setOrigin(0, 0));
    this.detailContainer.add(addDomText(this, tier2X, tierY + 24, syn.tier2.desc, {
      fontSize: 13, color: '#fff', pointerThrough: true,
    }).setOrigin(0, 0));
    this.detailContainer.add(addDomText(this, tier3X, tierY, '3★ 激活 (3 只龟)', {
      fontSize: 15, color: '#ffd93d', fontWeight: 'bold', pointerThrough: true,
    }).setOrigin(0, 0));
    this.detailContainer.add(addDomText(this, tier3X, tierY + 24, syn.tier3.desc, {
      fontSize: 13, color: '#fff', pointerThrough: true,
    }).setOrigin(0, 0));
    // 隔条
    void tierW;

    // 拥有此羁绊的龟 (920 宽下可放 10 列 × 1~2 行)
    const pets = ALL_PETS.filter(p => Array.isArray(p.tags) && p.tags.includes(syn.name));
    if (pets.length > 0) {
      this.detailContainer.add(addDomText(this, 20, 240, `拥有此羁绊的龟 (${pets.length}):`, {
        fontSize: 14, color: '#58d3ff', fontWeight: 'bold', pointerThrough: true,
      }).setOrigin(0, 0));
      pets.slice(0, 20).forEach((p, i) => {
        const cols = 10;
        const col = i % cols, row = Math.floor(i / cols);
        const px = 40 + col * 88;
        const py = 290 + row * 70;
        this.detailContainer.add(this.add.image(px, py, `pet-${p.id}`).setDisplaySize(48, 48));
        this.detailContainer.add(addDomText(this, px, py + 32, p.name, {
          fontSize: 11, color: '#fff', pointerThrough: true,
        }));
      });
    }
  }

  /** 状态 tab: 按 category 分段单列列表 */
  private renderStatusList(gridW: number) {
    const CAT_LABEL: Record<string, { label: string; color: number }> = {
      dot:     { label: 'DoT (持续伤害)',  color: 0xef4444 },
      cc:      { label: 'CC (控制)',       color: 0xc77dff },
      buff:    { label: 'Buff (增益)',     color: 0x06d6a0 },
      debuff:  { label: 'Debuff (减益)',   color: 0xfbbf24 },
    };
    // v0.9.5.A20: 单列紧凑 + 分组 header
    const rowH = 44, rowGap = 4;
    let y = 8;
    const cats = ['dot', 'cc', 'buff', 'debuff'] as const;
    for (const cat of cats) {
      const items = STATUS_DEFS.filter(s => s.category === cat);
      if (!items.length) continue;
      const headerColor = '#' + CAT_LABEL[cat].color.toString(16).padStart(6, '0');
      this.addGridName(this.gridContainer, 14, y, y, CAT_LABEL[cat].label, headerColor, 13);
      y += 22;

      items.forEach(st => {
        const row = this.add.container(gridW / 2, y + rowH / 2);
        const bg = this.add.rectangle(0, 0, gridW - 16, rowH, 0x1a2740, 0.85)
          .setStrokeStyle(2, CAT_LABEL[cat].color, 0.5)
          .setInteractive({ useHandCursor: true });
        row.add(bg);
        if (this.textures.exists(st.iconKey)) {
          row.add(this.add.image(-(gridW - 16) / 2 + 22, 0, st.iconKey).setDisplaySize(26, 26));
        } else {
          row.add(this.add.text(-(gridW - 16) / 2 + 22, 0, '?', {
            fontSize: '20px', fontFamily: 'monospace',
          }).setOrigin(0.5));
        }
        this.addGridName(row, -(gridW - 16) / 2 + 46, 0, y + rowH / 2, st.name, '#ffd93d', 14);

        bg.on('pointerover', () => bg.setStrokeStyle(3, 0xffd93d, 1));
        bg.on('pointerout', () => bg.setStrokeStyle(2, CAT_LABEL[cat].color, 0.5));
        bg.on('pointerdown', () => this.showStatusDetail(st.id));
        this.gridContainer.add(row);
        y += rowH + rowGap;
      });
      y += 8;
    }
    this.maxScrollY = Math.max(0, y - 540);
  }

  private showStatusDetail(id: string) {
    this.detailContainer.removeAll(true);
    const st = STATUS_DEFS.find(s => s.id === id);
    if (!st) return;

    const CAT_LABEL: Record<string, string> = {
      dot: 'DoT 持续伤害', cc: 'CC 控制', buff: '增益', debuff: '减益',
    };

    // icon (大) + 名字 + 类别
    if (this.textures.exists(st.iconKey)) {
      this.detailContainer.add(this.add.image(70, 70, st.iconKey).setDisplaySize(100, 100));
    }
    this.detailContainer.add(addDomText(this, 140, 38, st.name, {
      fontSize: 32, color: '#ffd93d', fontWeight: 'bold', pointerThrough: true,
    }).setOrigin(0, 0.5));
    this.detailContainer.add(addDomText(this, 140, 78, CAT_LABEL[st.category] ?? st.category, {
      fontSize: 14, color: '#58d3ff', fontWeight: 'bold', pointerThrough: true,
    }).setOrigin(0, 0.5));

    // desc
    this.detailContainer.add(addDomText(this, 20, 150, '说明', {
      fontSize: 14, color: '#58d3ff', fontWeight: 'bold', pointerThrough: true,
    }).setOrigin(0, 0));
    this.detailContainer.add(addDomHTML(this, 20, 174, st.desc, {
      width: 880, fontSize: 13, defaultColor: '#fff', lineHeight: 1.55, pointerThrough: true,
    }));

    if (st.formula) {
      this.detailContainer.add(addDomText(this, 20, 240, '生效公式', {
        fontSize: 14, color: '#58d3ff', fontWeight: 'bold', pointerThrough: true,
      }).setOrigin(0, 0));
      this.detailContainer.add(addDomText(this, 20, 264, st.formula, {
        fontSize: 14, color: '#ffd93d', fontFamily: 'monospace', fontWeight: 'bold', pointerThrough: true,
      }).setOrigin(0, 0));
    }
  }

  /** v0.9.5.A20: 规则左列表单列, 含 7 条战斗规则 + 1 个"小商店池"虚拟入口 (点击右详情显全部 22 件) */
  private renderRulesList(gridW: number) {
    const rowH = 52, rowGap = 4, padding = 8;
    let y = padding;
    BATTLE_RULES.forEach(rule => {
      const row = this.add.container(gridW / 2, y + rowH / 2);
      const bg = this.add.rectangle(0, 0, gridW - 16, rowH, 0x1a2740, 0.85)
        .setStrokeStyle(2, rule.color, 0.7)
        .setInteractive({ useHandCursor: true });
      row.add(bg);
      const iconX = -(gridW - 16) / 2 + 24;
      if (this.textures.exists(`rule-${rule.id}`)) {
        const img = this.add.image(iconX, 0, `rule-${rule.id}`).setOrigin(0.5);
        const t = this.textures.get(`rule-${rule.id}`).getSourceImage();
        const s = 38 / Math.max(t.width, t.height);   // 等比塞进 38px 框
        img.setScale(s);
        row.add(img);
      } else {
        row.add(this.add.text(iconX, 0, rule.emoji, { fontSize: '22px', fontFamily: 'monospace' }).setOrigin(0.5));
      }
      this.addGridName(row, -(gridW - 16) / 2 + 46, 0, y + rowH / 2, rule.name, '#ffd93d', 14);
      bg.on('pointerover', () => bg.setStrokeStyle(3, 0xffd93d, 1));
      bg.on('pointerout', () => bg.setStrokeStyle(2, rule.color, 0.7));
      bg.on('pointerdown', () => this.showRuleDetail(rule.id));
      this.gridContainer.add(row);
      y += rowH + rowGap;
    });
    // 小商店池虚拟入口
    y += 8;
    const shopRow = this.add.container(gridW / 2, y + rowH / 2);
    const shopBg = this.add.rectangle(0, 0, gridW - 16, rowH, 0x1a2740, 0.85)
      .setStrokeStyle(2, 0x06d6a0, 0.7)
      .setInteractive({ useHandCursor: true });
    shopRow.add(shopBg);
    shopRow.add(this.add.text(-(gridW - 16) / 2 + 20, 0, '🛒', { fontSize: '22px', fontFamily: 'monospace' }).setOrigin(0.5));
    this.addGridName(shopRow, -(gridW - 16) / 2 + 46, 0, y + rowH / 2, '小商店物品池', '#06d6a0', 14);
    shopBg.on('pointerover', () => shopBg.setStrokeStyle(3, 0xffd93d, 1));
    shopBg.on('pointerout', () => shopBg.setStrokeStyle(2, 0x06d6a0, 0.7));
    shopBg.on('pointerdown', () => this.showShopPoolDetail());
    this.gridContainer.add(shopRow);
    y += rowH + rowGap;

    this.maxScrollY = Math.max(0, y - 540);
  }

  /** 小商店详情 — 6 格 A~F, 按稀有度分布抽 + 动态定价 (用户 v0.9.9 经济规格) */
  private showShopPoolDetail() {
    this.detailContainer.removeAll(true);
    const detailW = 920;
    this.detailContainer.add(addDomText(this, 20, 20, '🛒 小商店', {
      fontSize: 28, color: '#06d6a0', fontWeight: 'bold', pointerThrough: true,
    }).setOrigin(0, 0));
    this.detailContainer.add(addDomText(this, 20, 58, '第 4/8/12 回合开张, 6 格 A~F: A~E 按各自稀有度分布抽, F 恒为重置骰子', {
      fontSize: 12, color: '#888', pointerThrough: true,
    }).setOrigin(0, 0));

    const rarityLabel: Record<ShopRarity, string> = { buff: '增益', consumable: '消耗品', normal: '普通装备', unique: '独特装备' };
    const rarityColor: Record<ShopRarity, string> = { buff: '#6edc8c', consumable: '#5ac8dc', normal: '#aab0c0', unique: '#ffc846' };
    const rarities: ShopRarity[] = ['buff', 'consumable', 'normal', 'unique'];

    let y = 92;
    // 基准价 + 动态规则
    this.detailContainer.add(addDomText(this, 20, y, '▸ 价格 (第一次商店基准, 动态 ±10%, 每次商店整体 +25%)', {
      fontSize: 14, color: '#ffd93d', fontWeight: 'bold', pointerThrough: true,
    }).setOrigin(0, 0));
    y += 24;
    rarities.forEach(r => {
      this.detailContainer.add(addDomText(this, 32, y, `· ${rarityLabel[r]}`, {
        fontSize: 12, color: rarityColor[r], fontWeight: 'bold', pointerThrough: true,
      }).setOrigin(0, 0));
      this.detailContainer.add(addDomText(this, 200, y, `🪙 ${BASE_PRICE[r]}`, {
        fontSize: 12, color: '#ffd93d', pointerThrough: true,
      }).setOrigin(0, 0));
      y += 20;
    });
    y += 10;

    // 每格稀有度分布
    this.detailContainer.add(addDomText(this, 20, y, '▸ 每格稀有度分布 (%)', {
      fontSize: 14, color: '#58d3ff', fontWeight: 'bold', pointerThrough: true,
    }).setOrigin(0, 0));
    y += 24;
    this.detailContainer.add(addDomText(this, 32, y, `格   ${rarities.map(r => rarityLabel[r]).join('  ')}`, {
      fontSize: 11, color: '#888', pointerThrough: true,
    }).setOrigin(0, 0));
    y += 20;
    for (const slot of ['A', 'B', 'C', 'D', 'E']) {
      const d = SLOT_DIST[slot];
      this.detailContainer.add(addDomText(this, 32, y,
        `${slot}    ${d.buff}      ${d.consumable}        ${d.normal}        ${d.unique}`, {
        fontSize: 11, color: '#cdd', pointerThrough: true,
      }).setOrigin(0, 0));
      y += 18;
    }
    this.detailContainer.add(addDomText(this, 32, y, 'F    重置骰子 (重投: 首次 2 币, 之后每次 +1, 进商店重置)', {
      fontSize: 11, color: '#bea0ff', pointerThrough: true,
    }).setOrigin(0, 0));
    y += 30;

    // 增益池清单
    this.detailContainer.add(addDomText(this, 20, y, `▸ 增益池 (${BUFF_POOL.length})`, {
      fontSize: 14, color: '#6edc8c', fontWeight: 'bold', pointerThrough: true,
    }).setOrigin(0, 0));
    y += 22;
    BUFF_POOL.forEach(it => {
      this.detailContainer.add(this.add.rectangle(20 + (detailW - 40) / 2, y + 14, detailW - 40, 28, 0x12202a, 0.6)
        .setStrokeStyle(1, 0x6edc8c, 0.35));
      this.detailContainer.add(addDomText(this, 32, y + 14, it.name, {
        fontSize: 12, color: '#ffd93d', fontWeight: 'bold', pointerThrough: true,
      }).setOrigin(0, 0.5));
      this.detailContainer.add(addDomText(this, 32 + 150, y + 14, it.desc, {
        fontSize: 11, color: '#bbb', pointerThrough: true,
      }).setOrigin(0, 0.5));
      y += 32;
    });
  }

  /** v0.9.5.A20: 规则 detail 适配 920 宽 */
  private showRuleDetail(id: string) {
    this.detailContainer.removeAll(true);
    const rule = BATTLE_RULES.find(r => r.id === id);
    if (!rule) return;

    this.detailContainer.add(addDomImage(this, 64, 78, rule.icon, 92, 92, {
      objectFit: 'contain', pointerThrough: true,
    }));
    this.detailContainer.add(addDomText(this, 130, 40, rule.name, {
      fontSize: 32, color: '#ffd93d', fontWeight: 'bold', pointerThrough: true,
    }).setOrigin(0, 0.5));
    this.detailContainer.add(addDomText(this, 130, 78, '战斗规则', {
      fontSize: 14, color: '#888', pointerThrough: true,
    }).setOrigin(0, 0.5));

    this.detailContainer.add(addDomText(this, 20, 160, '效果', {
      fontSize: 15, color: '#58d3ff', fontWeight: 'bold', pointerThrough: true,
    }).setOrigin(0, 0));
    this.detailContainer.add(addDomHTML(this, 20, 186, rule.desc, {
      width: 880, fontSize: 14, defaultColor: '#fff', lineHeight: 1.6, pointerThrough: true,
    }));
  }

  private makeTab(x: number, y: number, label: string, active: boolean, onClick: () => void) {
    const bg = this.add.rectangle(x, y, 170, 36, active ? 0xffd93d : 0x1a2740, 0.9)
      .setStrokeStyle(2, 0xffd93d).setDepth(10)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontSize: '14px', color: active ? '#1a1a2e' : '#ffd93d',
      fontFamily: 'm6x11, pixel-zh, Microsoft YaHei, system-ui', fontStyle: 'bold', resolution: 2,
    }).setOrigin(0.5).setDepth(11);
    bg.on('pointerdown', onClick);
    return { bg, text };
  }

  /** P147: 圆头像 (Phaser, 可在滚动容器内) — cover 缩放保持长宽比 + 圆形遮罩 + 描边环.
   *  parent: 行容器; (x,y): 头像在 parent 内的局部坐标; texKey: pet-${id}; d: 直径. */
  /** P176: 列表名字 (DOM 文字, 锐如 JS HTML). 加进 row 容器自动跟随滚动; 注册供 clipGridNames 裁切. */
  private addGridName(parent: Phaser.GameObjects.Container, x: number, localY: number, clipY: number, text: string, color: string, fontSize = 14): Phaser.GameObjects.DOMElement {
    const dom = addDomText(this, x, localY, text, {
      fontSize, color, fontWeight: 'bold', textAlign: 'left', pointerThrough: true,
    }).setOrigin(0, 0.5);
    parent.add(dom);
    this._gridDomNames.push({ dom, rowY: clipY });   // clipY = 该行在 gridContainer 内的 y (滚动裁切用)
    return dom;
  }

  /** P176: DOM 名字不受 Phaser 几何遮罩裁切 → 按行 worldY 是否在列表视口内逐行显隐 (滚动裁切). */
  private clipGridNames(): void {
    if (!this.gridContainer) return;
    const top = this.listY, bot = this.listY + this.listH, gy = this.gridContainer.y;
    for (const { dom, rowY } of this._gridDomNames) {
      const wy = gy + rowY;
      dom.setVisible(wy >= top - 26 && wy <= bot + 26);
    }
  }

  private addCircularAvatar(parent: Phaser.GameObjects.Container, x: number, y: number, texKey: string, d: number, ringColor: number) {
    const r = d / 2;
    // P174 修头像框 bug: 旧版给每个头像挂"圆形几何遮罩", 但列表 gridContainer 本身已挂滚动裁切遮罩
    //   (line 110). Phaser 遮罩不能嵌套 — 子对象自带遮罩会顶掉父容器的裁切 → 头像滚动时溢出列表/裁切错乱.
    //   改: 用离屏 canvas 把"圆形裁切 + cover 缩放"一次性烘焙成纹理, 头像就是普通 Image (无 live 遮罩),
    //   父容器滚动裁切正常作用; canvas clip 像素锐利.
    const cacheKey = `circavatar:${texKey}:${d}`;
    if (!this.textures.exists(cacheKey) && this.textures.exists(texKey)) {
      const frame = this.textures.getFrame(texKey, 0);
      const srcImg = frame?.texture?.getSourceImage?.() as CanvasImageSource | undefined;
      const sw = frame?.cutWidth ?? 0, sh = frame?.cutHeight ?? 0;
      if (srcImg && sw > 0 && sh > 0) {
        const cv = this.textures.createCanvas(cacheKey, d, d);
        const ctx = cv?.getContext();
        if (ctx) {
          ctx.imageSmoothingEnabled = false;   // 像素锐利
          ctx.save();
          ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
          // cover: 短边铺满 d, 居中裁切; 用 frame 的 cut 子矩形 (兼容 spritesheet 取第 0 帧)
          const scale = d / Math.min(sw, sh);
          const dw = sw * scale, dh = sh * scale;
          ctx.drawImage(srcImg, frame.cutX, frame.cutY, sw, sh, (d - dw) / 2, (d - dh) / 2, dw, dh);
          ctx.restore();
          cv?.refresh();
        }
      }
    }
    const useKey = this.textures.exists(cacheKey) ? cacheKey : texKey;
    const img = this.add.image(x, y, useKey);
    if (useKey === texKey) img.setDisplaySize(d, d);   // fallback: 无烘焙时直接缩到 d×d
    try { img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST); } catch { /* ignore */ }
    parent.add(img);
    // 描边环 (圆形边框, 跟稀有度色) — Graphics 无自带遮罩, 不影响父容器裁切
    const ring = this.add.graphics();
    ring.lineStyle(2, ringColor, 0.9);
    ring.strokeCircle(x, y, r);
    parent.add(ring);
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
