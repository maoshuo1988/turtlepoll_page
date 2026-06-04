// ══════════════════════════════════════════════════════════
// ActionPanel — DOM overlay 版, 1:1 复刻 JS battle.css:654-674 + ui-action.js:18-149
// ══════════════════════════════════════════════════════════
// JS HTML (index.html:516-522):
//   <div class="action-panel" id="actionPanel">
//     <div class="action-header">
//       <button class="btn-back-picker">← 换龟</button>
//       <span class="acting-name">小龟</span> 的回合
//     </div>
//     <div class="action-buttons">
//       <div class="skill-btn-wrap">
//         <div class="skill-card ${ready?'':'disabled'}">
//           <div class="skill-main" onclick="pickSkill(${i})">
//             <div class="skill-header">${icon} ${name}${×N}${cdStr}</div>
//             <div class="skill-body-brief">${brief}</div>
//             <div class="skill-body-detail" style="display:none">${detail}</div>
//           </div>
//           <div class="skill-toggle"><span class="skill-toggle-btn">详细 ▾</span></div>
//         </div>
//       </div>
//       ...
//     </div>
//   </div>
// JS CSS (battle.css:654-674):
//   .action-panel       bg(.88) blur(6) radius(10) padding(12 16) margin-bottom(8)
//                       transition .3s (entrance opacity 0+translateY 10 → 1+0)
//                       border 1px rgba(255,255,255,.06)
//   .action-header      14px color #aaa(fg2) margin-bottom 8
//     .acting-name      bold 16px
//   .btn-back-picker    12px 1px white(.15) border, color #aaa, padding 3x10, radius 6
//   .action-buttons     flex gap 8 flex-wrap
//   .skill-btn-wrap     flex:1 min-width:140 max-width:260
//   .skill-card         bg(.04) border 1 rgba(.1) radius 10 padding(10 14) 13px text
//                       hover translateY(-2) bg rgba(88,166,255,.06) border:#58a6ff
//     .skill-header     15px bold mb 5
//     .skill-body-brief 12px line-height 1.6 color #aaa
//     .skill-toggle-btn 11px color #58a6ff (toggle 详细 ▾ ↔ 简略 ▴)
//     .cd-tag           10px red 700 absolute top:4 right:6
import Phaser from 'phaser';
import type { Fighter, SkillDef } from '../types';
import { renderSkillTemplate, type SkillCtx } from '../systems/skill-text';

let cssInstalled = false;
function installCss() {
  if (cssInstalled) return;
  cssInstalled = true;
  const st = document.createElement('style');
  st.textContent = `
    #poc-action-panel {
      /* v0.9.9: 全部尺寸 calc(基准px × --poc-ui-scale) 随分辨率等比 (同 bench/coin/synergy);
         基准 = 之前固定 1.5× 值 / 1.5 → 1080p(scale1.5) 复现已验证的大尺寸, 小窗等比缩小。 */
      position: fixed; left: 50%; bottom: calc(12px * var(--poc-ui-scale, 1)); transform: translateX(-50%);
      z-index: 180;
      max-width: 96vw; min-width: calc(533px * var(--poc-ui-scale, 1));
      background: linear-gradient(180deg, rgba(24,32,54,.97), rgba(10,15,28,.98));
      backdrop-filter: blur(6px);
      border-radius: calc(11px * var(--poc-ui-scale, 1));
      padding: calc(13px * var(--poc-ui-scale, 1)) calc(20px * var(--poc-ui-scale, 1)) calc(16px * var(--poc-ui-scale, 1));
      margin-bottom: 8px;
      border: 2px solid #3a4a6a;
      box-shadow: 0 0 0 1px rgba(255,216,107,.22), 0 8px 30px rgba(0,0,0,.62), inset 0 1px 0 rgba(255,255,255,.1);
      font-family: 'm6x11', 'pixel-zh', 'Microsoft YaHei', system-ui, -apple-system, sans-serif;
      color: #e6edf3;
      opacity: 0;
      transform: translate(-50%, 10px);
      pointer-events: none;
      transition: opacity .3s, transform .3s;
      display: none;
    }
    #poc-action-panel.show {
      opacity: 1; transform: translate(-50%, 0);
      pointer-events: auto;
      display: block;
    }
    #poc-action-panel .action-header {
      font-size: calc(9px * var(--poc-ui-scale, 1)); margin-bottom: calc(7px * var(--poc-ui-scale, 1)); color: #b8c2cc;
      display: flex; align-items: center; gap: calc(7px * var(--poc-ui-scale, 1));
    }
    #poc-action-panel .ah-avatar {
      width: calc(33px * var(--poc-ui-scale, 1)); height: calc(33px * var(--poc-ui-scale, 1));
      border-radius: calc(7px * var(--poc-ui-scale, 1)); image-rendering: pixelated;
      object-fit: cover; flex: 0 0 auto;
      border: 2px solid #ffd86b; background: rgba(0,0,0,.35);
      box-shadow: 0 0 8px rgba(255,216,107,.35);
    }
    #poc-action-panel .action-header .acting-name {
      font-weight: 900; font-size: calc(18px * var(--poc-ui-scale, 1)); color: #ffe9a8;
      text-shadow: 0 0 7px rgba(255,216,107,.45), 0 1px 2px rgba(0,0,0,.7);
    }
    #poc-action-panel .btn-back-picker {
      background: none;
      border: 1px solid rgba(255,255,255,.15);
      color: #aaa;
      font-size: 12px;
      padding: 3px 10px;
      border-radius: 6px;
      cursor: pointer;
      font-family: inherit;
      margin-right: 8px;
      transition: .15s;
    }
    #poc-action-panel .btn-back-picker:hover { border-color: #58a6ff; color: #58a6ff; }
    #poc-action-panel .btn-back-picker[hidden] { display: none; }
    #poc-action-panel .action-buttons {
      display: flex; gap: calc(5px * var(--poc-ui-scale, 1)); flex-wrap: wrap;
    }
    #poc-action-panel .skill-btn-wrap {
      flex: 1; min-width: calc(180px * var(--poc-ui-scale, 1)); max-width: calc(300px * var(--poc-ui-scale, 1));
      position: relative;
    }
    #poc-action-panel .skill-card {
      background: linear-gradient(180deg, rgba(44,56,86,.72), rgba(20,28,46,.72));
      border: 2px solid rgba(120,140,180,.42);
      border-radius: calc(11px * var(--poc-ui-scale, 1));
      padding: calc(10px * var(--poc-ui-scale, 1)) calc(12px * var(--poc-ui-scale, 1));
      cursor: pointer; color: inherit;
      transition: .18s;
      text-align: left;
      font-size: calc(9px * var(--poc-ui-scale, 1));
      position: relative;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.1), 0 3px 8px rgba(0,0,0,.42);
    }
    #poc-action-panel .skill-main { display: flex; gap: calc(7px * var(--poc-ui-scale, 1)); align-items: flex-start; }
    #poc-action-panel .skill-icon, #poc-action-panel .skill-icon-emoji {
      width: calc(47px * var(--poc-ui-scale, 1)); height: calc(47px * var(--poc-ui-scale, 1));
      flex: 0 0 auto; border-radius: calc(8px * var(--poc-ui-scale, 1));
      border: 1px solid rgba(255,255,255,.22); background: rgba(0,0,0,.32);
      box-shadow: inset 0 0 6px rgba(0,0,0,.4);
    }
    #poc-action-panel .skill-icon { image-rendering: pixelated; object-fit: cover; }
    #poc-action-panel .skill-icon-emoji { display: flex; align-items: center; justify-content: center; font-size: calc(28px * var(--poc-ui-scale, 1)); }
    #poc-action-panel .skill-body { flex: 1; min-width: 0; }
    #poc-action-panel .skill-card:hover {
      border-color: #ffd86b;
      transform: translateY(-3px);
      box-shadow: 0 0 14px rgba(255,216,107,.4), inset 0 1px 0 rgba(255,255,255,.14), 0 4px 10px rgba(0,0,0,.5);
    }
    #poc-action-panel .skill-card.disabled {
      filter: grayscale(.7); opacity: .5;
      cursor: not-allowed;
    }
    #poc-action-panel .skill-card.disabled .skill-main { cursor: not-allowed; }
    #poc-action-panel .skill-header { font-size: calc(16px * var(--poc-ui-scale, 1)); font-weight: 900; margin-bottom: calc(4px * var(--poc-ui-scale, 1)); color: #ffe9a8; }
    #poc-action-panel .skill-body-brief,
    #poc-action-panel .skill-body-detail {
      font-size: calc(11px * var(--poc-ui-scale, 1)); color: #aaa; line-height: 1.6;
    }
    #poc-action-panel .skill-body-detail { line-height: 1.7; }
    #poc-action-panel .skill-toggle { text-align: right; margin-top: 4px; }
    #poc-action-panel .skill-toggle-btn {
      font-size: calc(8px * var(--poc-ui-scale, 1)); color: #58a6ff;
      cursor: pointer; opacity: .7; transition: .15s;
    }
    #poc-action-panel .skill-toggle-btn:hover { opacity: 1; }
    #poc-action-panel .cd-tag {
      position: absolute; top: 4px; right: 8px;
      font-size: calc(7px * var(--poc-ui-scale, 1)); color: #ff6b6b; font-weight: 700;
    }
    /* val-* color spans for skill brief/detail (跟 PDP 同款) */
    #poc-action-panel .val-normal { color:#ff6b6b; font-weight:700 }
    #poc-action-panel .val-magic  { color:#4dabf7; font-weight:700 }
    #poc-action-panel .val-true,
    #poc-action-panel .val-pierce { color:#fff; font-weight:700 }
    #poc-action-panel .val-shield { color:rgba(255,255,255,.9); font-weight:700 }
    #poc-action-panel .val-heal,
    #poc-action-panel .val-lifesteal { color:#06d6a0; font-weight:700 }
    #poc-action-panel .val-buff   { color:#7dffb3; font-weight:700 }
    #poc-action-panel .val-atk    { color:#ff9f43; font-weight:700 }
    #poc-action-panel .val-def    { color:#ffd93d; font-weight:700 }
    #poc-action-panel .val-mr     { color:#4dabf7; font-weight:700 }
    #poc-action-panel .val-extra  { color:#ffcc00; font-weight:700 }
    #poc-action-panel .val-burn   { color:#ff6600; font-weight:700 }
    #poc-action-panel .val-dot    { color:#9b59b6; font-weight:700 }
    #poc-action-panel .val-crit   { color:#ff4757; font-weight:700 }
    #poc-action-panel .val-crit-dmg { color:#ff6348; font-weight:700 }
    #poc-action-panel .val-stun   { color:#ffee00; font-weight:700 }
    #poc-action-panel .val-heal-reduce { color:#ff88aa; font-weight:700 }
    #poc-action-panel .val-reflect { color:#e67e22; font-weight:700 }
  `;
  document.head.appendChild(st);
}

const ICON_MAP: Record<string, string> = {
  physical: '⚔️', magic: '✨', true: '⚡', heal: '💚', shield: '🛡',
  bubbleShield: '🫧', hidingDefend: '🛡', hidingCommand: '🫣',
};

export class ActionPanel {
  private scene: Phaser.Scene;
  private root: HTMLDivElement | null = null;
  private currentFighter: Fighter | null = null;
  private onPick: ((skillIdx: number) => void) | null = null;
  private visible = false;
  // 每卡 brief/detail 文本缓存 (用于 toggle)
  private briefs: string[] = [];
  private details: string[] = [];
  private expanded: boolean[] = [false, false, false];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    installCss();
    const root = document.createElement('div');
    root.id = 'poc-action-panel';
    root.innerHTML = `
      <div class="action-header">
        <button class="btn-back-picker" hidden>← 换龟</button>
        <img class="ah-avatar" alt="" onerror="this.style.display='none'">
        <span class="acting-name"></span><span>&nbsp;的回合</span>
        <span class="hint" style="margin-left:auto;font-size:12px;color:#888"></span>
      </div>
      <div class="action-buttons"></div>
    `;
    document.body.appendChild(root);
    this.root = root;
    // P209 同款: 拦下面板上的 pointer 事件不让冒泡到 window — 否则 Phaser InputManager 照样 hit-test
    //   面板后方的龟精灵 → 点施法面板会触发后面龟 pointerdown→弹详情盖住面板 ("放不了技能")。
    //   只拦 pointerdown/up 等, 不拦 click → 技能按钮的 click 仍正常触发。
    (['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend'] as const)
      .forEach(type => root.addEventListener(type, (e) => e.stopPropagation()));
    scene.events.once('shutdown', () => this.destroy());
  }

  /** 显示并填充当前 fighter 的技能 (JS ui-action.js:18-63 showActionPanel + renderActionButtons 合并)
   *  opts.canBack/onBack: JS ui-action.js:31-36 — 同侧 >1 可行动时显示「← 换龟」回 picker */
  show(fighter: Fighter, onPick: (skillIdx: number) => void,
       opts?: { canBack?: boolean; onBack?: () => void }) {
    if (!this.root) return;
    this.currentFighter = fighter;
    this.onPick = onPick;
    this.expanded = [false, false, false];

    const nameEl = this.root.querySelector('.acting-name') as HTMLElement | null;
    const hintEl = this.root.querySelector('.hint') as HTMLElement | null;
    const avatarEl = this.root.querySelector('.ah-avatar') as HTMLImageElement | null;
    if (nameEl) nameEl.textContent = fighter.name;
    if (avatarEl) { avatarEl.style.display = ''; avatarEl.src = `avatars/${fighter.id}.png`; }   // 方形头像 (非 spritesheet)
    if (hintEl) hintEl.textContent = '选择技能';

    // U1: 「← 换龟」按钮 — JS ui-action.js:31-36 (同侧 >1 可行动才显示)
    const backBtn = this.root.querySelector('.btn-back-picker') as HTMLButtonElement | null;
    if (backBtn) {
      if (opts?.canBack && opts.onBack) {
        backBtn.hidden = false;
        backBtn.onclick = () => opts.onBack!();
      } else {
        backBtn.hidden = true;
        backBtn.onclick = null;
      }
    }

    const box = this.root.querySelector('.action-buttons') as HTMLElement | null;
    if (!box) return;

    const skills = fighter.skills as Array<SkillDef & { cdLeft?: number }>;
    this.briefs = []; this.details = [];

    // 渲染每个 skill 卡 (JS ui-action.js:65-125 renderActionButtons 1:1)
    box.innerHTML = skills.map((s, i) => {
      // ready 状态 (JS:70-77)
      let ready = (s.cdLeft ?? 0) === 0;
      const fAny = fighter as Fighter & {
        _summon?: { alive?: boolean }; _goldCoins?: number;
        bubbleStore?: number;
      };
      if (s.type === 'hidingCommand' && (!fAny._summon || !fAny._summon.alive)) ready = false;
      if (s.type === 'hidingBuffSummon' && (!fAny._summon || !fAny._summon.alive)) ready = false;
      if (s.type === 'gamblerBet' && fighter.hp / fighter.maxHp <= 0.4) ready = false;
      if (s.type === 'fortuneAllIn' && (fAny._goldCoins ?? 0) <= 0) ready = false;
      if (s.type === 'fortuneBuyEquip') {
        const cost = ((fAny as { _fortuneBuyCost?: number })._fortuneBuyCost) ?? ((s as Record<string, unknown>).coinCost as number ?? 20);  // 递增后的当前价
        if ((fAny._goldCoins ?? 0) < cost) ready = false;
        else {
          // 币够但 装备席满 且 全员满血 → 抽到的装备遗失 + 满席回血也无效 = 纯浪费 → 禁用
          const sc = this.scene as unknown as { benchInventory?: { length: number }; rightBench?: { length: number }; views?: Array<{ fighter: Fighter }> };
          const bench = fighter.side === 'left' ? sc.benchInventory : sc.rightBench;
          if ((bench?.length ?? 0) >= 10) {
            const allies = (sc.views ?? []).filter(v => v.fighter.side === fighter.side && v.fighter.alive);
            if (allies.length > 0 && allies.every(v => v.fighter.hp >= v.fighter.maxHp)) ready = false;
          }
        }
      }
      if (s.type === 'bubbleBurst' && (fAny.bubbleStore ?? 0) <= 0) ready = false;

      const isPassive = (s as Record<string, unknown>).passiveSkill === true;
      if (isPassive) ready = false;  // passive 不可点

      const dmgType = (s as Record<string, unknown>).dmgType as string | undefined;
      const icon = isPassive ? '⭐' : (ICON_MAP[s.type] ?? ICON_MAP[dmgType ?? ''] ?? '⚔️');
      // 游戏化: 优先用 per-skill PNG 图标 (skills/X.png), 缺失回退 emoji
      const iconPath = (s as Record<string, unknown>).icon as string | undefined;
      const iconHtml = iconPath
        ? `<img class="skill-icon" src="${iconPath}" onerror="this.style.visibility='hidden'">`
        : `<span class="skill-icon-emoji">${icon}</span>`;
      const hits = (s.hits as number | undefined) ?? 1;
      const hitsLabel = (!isPassive && hits > 1) ? ` ×${hits}` : '';

      // reasonStr (JS:83-92)
      let reasonStr = '';
      if (!ready) {
        if ((s.cdLeft ?? 0) > 0) reasonStr = `CD${s.cdLeft}`;
        else if ((s.type === 'hidingCommand' || s.type === 'hidingBuffSummon')) reasonStr = '随从已阵亡';
        else if (s.type === 'fortuneAllIn') reasonStr = '无金币';
        else if (s.type === 'fortuneBuyEquip') {
          const cost = ((fAny as { _fortuneBuyCost?: number })._fortuneBuyCost) ?? ((s as Record<string, unknown>).coinCost as number ?? 20);
          reasonStr = (fAny._goldCoins ?? 0) < cost ? '金币不足' : '席满且满血';
        }
        else if (s.type === 'bubbleBurst') reasonStr = '无泡沫';
        else if (s.type === 'gamblerBet') reasonStr = 'HP过低';
        else if (isPassive) reasonStr = '被动';
        else reasonStr = '不可用';
      }
      const cdStr = reasonStr ? ` <span class="cd-tag">${reasonStr}</span>` : '';

      // brief / detail (JS:110-111 + skill-text)
      const ctx: SkillCtx = {
        atk: fighter.atk, def: fighter.def, mr: fighter.mr ?? fighter.def,
        maxHp: fighter.maxHp, hits: s.hits ?? 1, crit: fighter.crit ?? 0.25,
        lv: (fighter as { _level?: number })._level ?? 1,   // {LV} 模板
      };
      // 线条龟「画龙点睛」动态占位符需读速写 flag (装备速写 → 7 层/真实)
      const inkF = fighter as { _inkCapOverride?: number; _inkTrueDmg?: boolean };
      (ctx as Record<string, unknown>)._inkCapOverride = inkF._inkCapOverride;
      (ctx as Record<string, unknown>)._inkTrueDmg = inkF._inkTrueDmg;
      // 宝箱龟「宝箱砸击」动态占位符需读已开出的宝箱装备 flag
      const chestF = fighter as { _chestEquipRock?: boolean; _chestEquipStar?: boolean; _chestEquipChain?: boolean; _chestEquipThunder?: boolean };
      (ctx as Record<string, unknown>)._chestEquipRock = chestF._chestEquipRock;
      (ctx as Record<string, unknown>)._chestEquipStar = chestF._chestEquipStar;
      (ctx as Record<string, unknown>)._chestEquipChain = chestF._chestEquipChain;
      (ctx as Record<string, unknown>)._chestEquipThunder = chestF._chestEquipThunder;
      const briefTpl = String((s as Record<string, unknown>).brief ?? '');
      const detailTpl = String((s as Record<string, unknown>).detail ?? briefTpl);
      const briefHtml = renderSkillTemplate(briefTpl, ctx, s as Record<string, unknown>);
      const detailHtml = renderSkillTemplate(detailTpl, ctx, s as Record<string, unknown>).replace(/\n/g, '<br>');
      this.briefs[i] = briefHtml;
      this.details[i] = detailHtml;

      const cdLine = s.cd && s.cd > 0 && s.cd < 100
        ? `<span class="skill-cd-info" style="font-size:11px;color:#aaa;opacity:.7;display:block;margin-top:4px">冷却 ${s.cd}回合</span>` : '';

      return `<div class="skill-btn-wrap" data-idx="${i}">
        <div class="skill-card ${ready ? '' : 'disabled'}">
          <div class="skill-main" data-action="${ready ? 'pick' : 'noop'}">
            ${iconHtml}
            <div class="skill-body">
              <div class="skill-header">${s.name}${hitsLabel}${cdStr}</div>
              <div class="skill-body-brief">${briefHtml}${cdLine}</div>
              <div class="skill-body-detail" style="display:none">${detailHtml}</div>
            </div>
          </div>
          ${detailHtml !== briefHtml ? `<div class="skill-toggle"><span class="skill-toggle-btn" data-action="toggle">详细 ▾</span></div>` : ''}
        </div>
      </div>`;
    }).join('');

    // wire pickSkill + toggleDetail
    box.querySelectorAll<HTMLElement>('.skill-btn-wrap').forEach(wrap => {
      const idx = parseInt(wrap.dataset.idx ?? '-1', 10);
      const main = wrap.querySelector('.skill-main') as HTMLElement | null;
      const toggle = wrap.querySelector('.skill-toggle-btn') as HTMLElement | null;
      const card = wrap.querySelector('.skill-card') as HTMLElement | null;
      if (main && main.dataset.action === 'pick') {
        main.addEventListener('click', () => this.onPick?.(idx));
      }
      if (toggle) {
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleDetail(idx, card);
        });
      }
    });

    this.root.classList.add('show');
    this.visible = true;
  }

  private toggleDetail(idx: number, card: HTMLElement | null) {
    if (!card) return;
    const brief = card.querySelector('.skill-body-brief') as HTMLElement | null;
    const detail = card.querySelector('.skill-body-detail') as HTMLElement | null;
    const toggleBtn = card.querySelector('.skill-toggle-btn') as HTMLElement | null;
    if (!brief || !detail) return;
    this.expanded[idx] = !this.expanded[idx];
    const isDetail = this.expanded[idx];
    brief.style.display = isDetail ? 'none' : '';
    detail.style.display = isDetail ? '' : 'none';
    if (toggleBtn) toggleBtn.textContent = isDetail ? '简略 ▴' : '详细 ▾';
  }

  /** 进入选目标状态: 改提示, 卡片整体禁用点击 (JS 把 panel disabled)
   *  U2: onCancel → 显示「← 返回选技能」可取消回技能列表 (JS action.js:417 cancelTarget) */
  enterTargeting(skill: SkillDef, onCancel?: () => void) {
    if (!this.root) return;
    const hintEl = this.root.querySelector('.hint') as HTMLElement | null;
    if (hintEl) {
      hintEl.innerHTML = onCancel
        ? `选择目标 (${skill.name}) <button class="btn-cancel-target" style="margin-left:8px;background:none;border:1px solid rgba(255,255,255,.15);color:#aaa;font-size:12px;padding:2px 8px;border-radius:6px;cursor:pointer">← 返回选技能</button>`
        : `选择目标 (${skill.name})`;
      const cancelBtn = hintEl.querySelector('.btn-cancel-target') as HTMLButtonElement | null;
      if (cancelBtn && onCancel) cancelBtn.onclick = () => onCancel();
    }
    this.root.querySelectorAll<HTMLElement>('.skill-main').forEach(m => {
      m.style.pointerEvents = 'none';
    });
  }

  /** U2: 取消选目标 → 回到技能选择 (重新启用卡片点击 + 复位提示) */
  exitTargeting() {
    if (!this.root) return;
    const hintEl = this.root.querySelector('.hint') as HTMLElement | null;
    if (hintEl) hintEl.textContent = '选择技能';
    this.root.querySelectorAll<HTMLElement>('.skill-main').forEach(m => {
      m.style.pointerEvents = '';
    });
  }

  hide() {
    if (!this.root) return;
    this.root.classList.remove('show');
    this.visible = false;
    this.currentFighter = null;
    this.onPick = null;
  }

  isVisible(): boolean { return this.visible; }

  destroy() {
    if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
    this.root = null;
    this.visible = false;
  }
}
