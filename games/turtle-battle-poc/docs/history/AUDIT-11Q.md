# AUDIT-11Q — 11 项 1:1 保真度审计 (P22 之后)

跨档案对比: `games/turtle-battle/` (JS 参考实现) ↔ `poc-phaser/src/` (Phaser TS 复刻).

图例: ✅ 已 1:1 / ⚠️ 有偏差 / ❌ 自创 or 缺失.

---

## Q1 — "战斗开始"/"第 N 回合" banner 样式

### JS spec
- 函数 `showTurnStartBanner` 定义在 `games/turtle-battle/js/battle-setup.js:72-86` (不在 ui.js, 用户描述笔误).
- 调用点: `battle-setup.js:461` & `467` (战斗开始, durationMs=1500); `turn.js:22` (每回合开始, durationMs=1100).
- HTML: `<div class="turn-start-banner"><div class="turn-start-banner-inner"><div class="turn-start-banner-text">${text}</div><div class="turn-start-banner-sub">${sub}</div></div></div>` (battle-setup.js:76-80).
- CSS (`battle.css:1826-1835`):
  - `.turn-start-banner` position:fixed inset:0 z-index:9998 flex center, opacity 0→1 over 250ms
  - `.turn-start-banner-inner` 渐变带 `linear-gradient(90deg, transparent 0%, rgba(20,30,60,.92) 25/75%, transparent 100%)`, padding 18px 64px, 上下 2px 金边 `rgba(255,215,61,.5)`, min-width 60%, **slide 动画** `turnBannerSlide .9s ease forwards` (从 translateX(-30%) 滑到 +30%).
  - `.turn-start-banner-text` font 36px weight 900 color **#ffd93d**, letter-spacing **6px**, text-shadow 金辉 + 黑投影.
  - `.turn-start-banner-sub` font 14px color #cdd, letter-spacing 3px, opacity .8 (副标题, 如 "Battle Start" / "Round 2").

### poc state
- `BattleScene.ts:3472-3489` `showCenterBanner(text, duration, color)`:
  - Phaser.add.text 单层文字, **64px** color #ffd93d (默认), fontStyle:bold, stroke 黑 8px, shadow blur 20.
  - 动画: scale 0.3→1 (back.out, 300ms), 然后 alpha 1→0 + scale→1.15 (300ms 出场).
  - **无副标题** (sub 参数被丢弃 — JS 总是带 "Battle Start"/"Round N").
  - **无渐变背景带**, **无金色上下边**, **无 slide-in**, **无 letter-spacing**.
- 调用点: `BattleScene.ts:533` (第 1 回合, delayed 800ms), `:845` ("战斗开始!" 1500ms), `:5099` (后续回合).

### Status: ❌ 自创风格

### Fix
1. `showCenterBanner` 改名 `showTurnStartBanner` 或重写: DOM overlay 而非 Phaser text (canvas 字体无法 letter-spacing 6px 也无 slide 渐变带).
2. 新增 DOM 元素结构 = JS HTML 1:1, 套 `battle.css:1826-1835` 同款 CSS (复制到 BattleScene 或新文件 BannerOverlay.ts).
3. 接受第二参数 `sub` (e.g. "Battle Start" / "Round 2"), 战斗开始处补 `showCenterBanner('⚔️ 战斗开始', 1500, '#ffd93d', 'Battle Start')`.
4. 字体 36px (非 64px), letter-spacing 6px, 走 0.9s `turnBannerSlide` keyframe (translateX -30→0→0→+30).
5. 取消 Phaser scale.back.out — JS 没有该 ease.

---

## Q2 — 攻击 hop (P22 后回归)

### JS spec
- `action.js:520-521`: `SKIP_DEFAULT_HOP = new Set(['ninjaImpact','ninjaBackstab'])` — 这两种技能 handler 自驱.
- `scene.css:277-294` `@keyframes attackHopRight/Left` 1.2s ease-in-out:
  - 0% (0,0), 15% (±18,-6), 20% (±25,0), 80% (±25,0), 95% (±5,-3), 100% (0,0)
- `ui-anim.js:161-176`: `card.classList.add('attack-hop')`; hop 时长 1200ms 总, sprite 在 240ms 时换到 attack 图.
- `constants.js:15-22` `ATTACK_HOP_TOTAL_MS=1200`, `ATTACK_HOP_FORWARD_MS=240`, `ATTACK_DAMAGE_SYNC_MS=400`.

### poc state
- `BattleScene.ts:1733-1740`: `SKIP_DEFAULT_HOP = new Set(['ninjaImpact', 'ninjaBackstab'])` — ✓ wired.
- `BattleScene.ts:1754-1818`: 完整 6-keyframe 表 + addCounter `cubic.inOut` ease (≈ ease-in-out).
  - 关键帧 1:1: 0/0.15/0.20/0.80/0.95/1.0 (×, dir × 18/25/25/5/0; y 0/-6/0/0/-3/0).
  - `dir = att.side === 'left' ? 1 : -1`, `forwardX = homeX + dir*25` — 正确.
  - shadow.x 同步跟随 (✓ 修正了 P20 影子不跟随的回归).
- `time.delayedCall(240, playAction('attack'))`, `time.delayedCall(400, runSkillHandler + endTurn)` — JS 时序 1:1.

### Status: ✅ 已 1:1
P22 layout 改动是 DOM root.top 计算, 不影响 sprite Phaser-side hop (sprite 仍由 canvas 渲染, DOM 不动).

### Fix: 无.

---

## Q3 — 面板该有的东西 (战斗 UI 完整性)

### JS spec (index.html:362-538)
- `:364-371` `.turn-banner-row`: ← / banner / ? / 📜 / 📊 / 🛠 (6 按钮)
- `:373-374` `.deep-coin-pill` 左/右 (两边各一个金币计数)
- `:376-377` `.synergy-bar` 左/右 (羁绊 chip 列, 紧贴 bench rail 外侧)
- `:380-460` `.help-panel` (术语说明 modal)
- `:467-468` `.equip-bench-rail` 左/右 (10 槽装备席)
- `:486-489` `.scene-labels` 我方/敌方 + side-indicator
- `:499-502` `.dmg-stats-panel` (浮动伤害统计面板)
- `:510-513` `.turtle-picker` (出战龟选择)
- `:516-522` `.action-panel` + `.action-buttons`
- `:530-538` `.battle-log-wrapper` (固定右侧 280px log)

### poc state
- `BattleTopRow.ts:104-112`: 6 按钮 ✓ 1:1.
- `BattleStatsRail.ts`: deep-coin pill 左右 ✓ + synergy chip 列 ✓.
- `HelpPanel.ts`: ✓ 接入 (toggle 走 `topRow onHelp`).
- `BenchRail.ts`: 左右 bench rail ✓.
- `BattleScene.ts:485-489` team-label 左右 ✓.
- `dmgStatsPanel` Phaser container (`BattleScene.ts:2597-2725`): 存在但 ⚠️ 配色/布局非 1:1 (见 Q4).
- `TurtlePicker.ts`: ✓.
- `ActionPanel.ts`: ✓ 接入.
- `BattleLog.ts`: ✓ DOM 固定右侧 280px 1:1.
- `DebugOverlay.ts`: ✓.

### 自创 / 缺失:
- ⚠️ `BattleScene.ts:801-804` 顶部右侧自创 `📊` 按钮 (line 801: `const dmgBtn = this.add.text(width - 50, 36, '📊'...)`) — 跟 TopRow 已有的 📊 重复. **删除**.
- ⚠️ `:415` `onLog: () => showCenterBanner('战斗日志待 Phase 5 接入', ...)` — 📜 按钮不接战斗日志开关 (见 Q9).
- ⚠️ `BattleScene.ts:5418` `refreshCoinDisplay` 仍找 `coinsText` Phaser object — 自创"顶部龟币"老路径残留, 应清掉.

### Status: ⚠️ 大部分到位, 但有 3 处残留自创.

### Fix
1. 删 `BattleScene.ts:801-805` 的自创 📊 按钮 (TopRow 已有).
2. `onLog` 改 `() => this.battleLog.toggleVisible()` (需 BattleLog 加 toggle API).
3. 删 `refreshCoinDisplay` 全文 + 它的所有调用点 (line 451, 463, 4592, 5411 etc) — JS 战中无龟币 UI, 只有 deep-coin pill.

---

## Q4 — 战斗统计 造成/承受 1:1

### JS spec
- `ui.js:1350-1409` `updateDmgStats`:
  - 2 tab: `造成伤害` / `承受伤害` (`ui.js:1406-1407`, button onclick `switchDmgTab`).
  - 2 列: `.ds-columns` flex, `.ds-col` `<div class="ds-col-label">我方</div>` / `敌方`.
  - 每行 `.ds-row`: top = 头像(16) + 名字 + 总值; 下面 `.ds-bar-wrap` 含 3 段堆叠 bar.
  - 排序: `byDealt = [...allFighters].sort((a,b) => b._dmgDealt - a._dmgDealt)` (各列内部排序).
  - 死亡: `.ds-dead { opacity: .4 }` (battle.css:622).
- `battle.css:629-633` 颜色:
  - `.ds-bar-normal` (物理) — **rgba(255,68,68,.6)** 红
  - `.ds-bar-magic` — **rgba(77,171,247,.6)** 蓝
  - `.ds-bar-true` — **rgba(255,255,255,.6)** 白
  - `.ds-bar-pierce` — rgba(255,224,102,.7) 黄 (pierce; poc 未含)

### poc state
- `BattleScene.ts:2597-2722` `createDmgStatsPanel` + `refreshDmgStatsPanel`.
- Phaser Container (非 DOM): width=520, height=360, 浮在右上.
- 2 tab: `造成` / `承受` ✓.
- 2 列 我方/敌方 ✓ (`:2662-2667`).
- 每行: 头像 16px + 名字 + 数值 + 4-段 stacked bar ✓.
- 排序 `:2707` `lSorted.sort((a,b) => b[valKey] - a[valKey])` ✓.
- Dead 灰色 `:2685` ✓.
- **颜色**: 走 `DMG_TYPE_INFO` (`battle-stats.ts:14-17`):
  - phy = **0xffa552** 橙 ❌ (JS 是 #ff4444 红)
  - mag = **0xc77dff** 紫 ❌ (JS 是 #4dabf7 蓝)
  - tru = **0xff5252** 红 ❌ (JS 是 #ffffff 白)
  - dot = 0xffd93d 黄 (JS 无 dot 单独柱, dot 跟物/法/真之一相加)
- Live refresh `:2630` `bus.on('stats:updated')` throttle 60ms ✓.

### Status: ⚠️ 结构 1:1, 但 bar 配色完全错位 (橙/紫/红 vs JS 红/蓝/白).

### Fix
1. `battle-stats.ts:14-17` `DMG_TYPE_INFO` colors:
   - `phy: { color: 0xff4444, cssColor: '#ff4444' }`
   - `mag: { color: 0x4dabf7, cssColor: '#4dabf7' }`
   - `tru: { color: 0xffffff, cssColor: '#ffffff' }`
   - `dot: { color: 0xff6600, cssColor: '#ff6600' }` (按 .log-dot 同色)
2. (可选) 移除 dot 单独 bar — JS 只画 phys/mag/true 三段.
3. 飘字配色另开变量 — JS 飘字 .float-text-physical 也是 #ff4444 (但 poc 飘字配色另有偏差, 不在本题范围).
4. 改 panel 用 DOM 而非 Phaser container, 复用 `.dmg-stats-panel` CSS (battle.css:608-633) — 字体清晰度 + selectable.

---

## Q5 — 战斗日志样式 + 内容

### JS spec
- `engine.js:608-615` `addLog(html, cls='')`: append `<div class="log-entry ${cls}">${html}</div>` to `#battleLog`, auto-scroll to bottom.
- 9 内联色 class (`battle.css:735-743`):
  - `.log-direct` #ff4444, `.log-pierce` #d06bff, `.log-heal` #06d6a0, `.log-shield` rgba(255,255,255,.9), `.log-shield-dmg` #999, `.log-crit` #ffa500, `.log-dot` #ff6600, `.log-debuff` #ff9f43, `.log-passive` #7dffb3 italic.
- Entry format (调用方手工标 class): e.g. `addLog(\`${emoji}${name} <b>技能</b> → ${tEmoji}${tName}: <span class="log-direct">${dmg}伤害</span>\`)` (combat.js).
- 桌面端 (battle.css:786-789): `.battle-log-wrapper` fixed right:0 top:40px **width:280px** height:calc(100vh - 40px) z-index:50, **pointer-events:none** but inner has pointer-events:auto, bg rgba(0,0,0,.7) blur 8px, padding 8 font-size **11px**.
- `.log-entry b { color:#58a6ff }` — 数字加粗会变 accent 蓝.
- 默认 hidden, `toggleBattleLog` (`ui-action.js:151-167`) 加 `.log-open` class. 桌面端 css 强制总是 visible? 检查: `battle.css:727` `.battle-log{...display:none}` + `:728` `.battle-log-wrapper.log-open .battle-log{display:block}`. 桌面 default 是 `display:none` → 必须点 📜 开. → JS 日志是 toggle 可见.

### poc state
- `BattleLog.ts:50-148`: DOM overlay, fixed right:0 **top:48px** width:280px ✓.
- 9 色 class 全 1:1 ✓ (`:97-105`).
- `log(text)` → `colorize(text)` 自动 regex sniff (`:152-162`) **加** keyword (暴击/治疗/穿透 等) → 自动包 class.
- **diff**: JS 让调用方手工标 class (combat.js / passive-triggers.js 等), poc 通过 regex 自动推断 — 行为差不多但 fragile (e.g. 名字含"暴击"会误标).
- **总是显示**: `BattleLog.ts:122-127` 构造时直接 appendChild + 无 hidden 模式 → **永远显示**, 不能关 (用户报 "战斗日志不可关闭").
- Max lines 200 (`:50`).

### Status: ⚠️ 样式 1:1, 内容 fragile + 不可关闭.

### Fix
1. 增加 `setVisible(v: boolean)` / `toggle()` API.
2. `BattleScene.ts:415` `onLog` 改 wire 到 `this.battleLog.toggle()`.
3. 初始 hidden (JS 默认 hidden, 点 📜 开).
4. Long-term: colorize 改成手工标 (调用方传 cls + html) — 现 regex 实现做兜底.

---

## Q6 — 深海币系统

### JS spec (`deep_coin.js`)
- `_store()` 初始 `{ left: 0, right: 0 }` — **初始 0**.
- 收入项 (注释 line 5):
  - 击杀 +5 (`onKill` line 43, boss +30)
  - 阵亡补偿 +2 (`onAnyDeath` line 49)
  - 财神龟 +1 (per live fortune, on death event)
  - **回合 +3** (`onTurnBegin` line 69; 财富 ×2 buff +2)
  - 关卡 +10 (`onStageClear`)
- 弹商店时机 (`shop.js:356-364` `maybeOpenShopOnTurnBegin`):
  - 仅偶数回合 (`turn % 2 !== 0` 跳过)
  - 仅特定 modes: boss / dungeon / pve / pvp / pvp-online
  - 触发: `turn.js:1266-1268` 在 player side 行动开始时.
- UI: `renderDeepCoinUI` 把数填进 `#deepCoinLeftVal` / `#deepCoinRightVal`.
- 单机模式 (boss/dungeon/pve) 右侧 AI 永不加币 (`_isAISide` line 32-36).

### poc state
- `BattleScene.ts:143` `private coins = 50;` — **初始 50!** ❌ (JS 是 0)
- `:806` `this.coins = 50;` (create 内再次设).
- 增量来源 (poc grep):
  - `:454` `addBattleCoins` debug
  - `:462` `addDeepCoin` debug
  - `:839` (CHEST rew +20)
  - `:1080` 事件奖 +15
  - `:1434` _goldCoins 装备
  - `:1853` 击杀 +5 ✓
  - `:3696` fortuneGold +1/turn ✓
  - `:4590` reward.coins (闯关后)
  - `:5099` 回合开始无 +3 (JS onTurnBegin)
  - `:5410` `endTurn` 给 left +1 — ❌ JS 无 "actor 行动结束 +1" 这条
- 开商店: `:5421-5430` `openShop()` — 找不到自动开店 trigger. 是手工 / debug only? 检查 grep 看是否有 `maybeOpen` 路径接入 → 无, **poc 没有 JS 的 "偶数回合自动弹店"** 接入. 但 debug 路径有 (DebugOverlay openShop).
- 用户报 "一进商店就 40 多币" — 初始 50 + endTurn +1 多次累 + chest +20 + event +15 都会让"进店看到 40+ 币".

### Status: ❌ 初始值错 + 缺 "回合 +3" + 自创 "endTurn +1" + 缺自动开店触发.

### Fix
1. `BattleScene.ts:143` `private coins = 0;` (删 50 初始).
2. `:806` 同步改 `this.coins = 0;`.
3. `:5410` 删 `endTurn` 内 `+1` (无 JS 依据).
4. 实现 `onTurnBegin` 加 +3 (财富 ×2 +2): 在 `BattleScene.ts:5095` 切回合处加.
5. 实现 `onAnyDeath` 阵亡方 +2 (`killView` 处).
6. 实现 `maybeOpenShopOnTurnBegin(turn, side)`: turn % 2 === 0 && mode in {dungeon/pve/...} → 自动弹 shop (在 nextSideAction 入口加判断).
7. AI side check: 右队不加币 (`_isAISide` 逻辑).

---

## Q7 — 调试面板没接入

### JS spec
- `index.html:370` 🛠 按钮 onclick=`showDebugPanel()`.
- `debug.js:1-` 完整 debug panel + 按 D 键也开.

### poc state
- `DebugOverlay.ts:290-305`: `show()` / `hide()` / `toggle()` API 完备.
- `BattleScene.ts:420` `this.debugOverlay = new DebugOverlay(this, {...})` 构造 ✓ (在 topRow 之后, 但 topRow 用闭包 `() => this.debugOverlay?.toggle()` 延迟解引用, 不存在时序问题).
- `BattleScene.ts:417` `onDebug: () => this.debugOverlay?.toggle()` ✓.
- DOM `#poc-debug-overlay` 用 `display:none` (`DebugOverlay.ts:34`), `.show` 切 block.
- 各按钮 (fullHeal / killAllEnemies / addCoins / openShop / giveEquip) 在 `BattleScene.ts:421-510` 全 wire ✓.

### Status: ✅ 已接入

### Fix
- 无代码 fix. 如用户实际点击无反应, 检查浏览器 console — 大概率是 `installCss()` 未跑 / 元素 z-index 被遮 / 或 `topRow` button 没真正注册 click (检查 `BattleTopRow.ts:117-125` wire 是否在 root append 之后 — ✓ 在之后).
- 建议加键盘 D 键快捷 (`scene.input.keyboard.on('keydown-D', ...)`)便于测试.

---

## Q8 — bug 反馈没结束 (open items)

历史 bug 状态扫描 (基于 commit messages + 当前代码):

- **浮字位置** — P20 commit msg 提及修复, 当前 `BattleScene.ts` spawnFloating* 函数都用 `view.sprite.x/y` (sprite home) — ✓.
- **自创小球 VFX** (playMeleeArcTrail) — P20 删除. grep 确认 BattleScene.ts 无 playMeleeArcTrail. ✓
- **影子 (shadow)** — P20 重新接入 `actor.shadow` 在 hop 中同步 x (`:1802`). ✓
- **等级显示** — `scene-turtle-dom.ts:316` `${lv ? <st-level-badge>${lv}</...>}` ✓.
- **战斗流程** — P21 重写 round-end pipeline. 应已修.
- **DOM 布局** — P22 加 `.st-body` 113×113 占位 让 HP row 在 sprite 头顶 + status/equips 锚到 body 中心. ✓
- **TODO 残留**:
  - `BattleScene.ts:413` `// TODO: confirmSurrender modal (JS confirmSurrender)` — 用户报"返回直接退出, 没退出确认".
  - `:415` 战斗日志 Phase 5 占位 (见 Q9).
  - `:4670-4671` "lightningStorm / thunderShell / cyberDrone / lavaTransform — TODO" + "side-end equipment (candle/dumbbell) — TODO".

### Status: ⚠️ 几大件 P20-P22 已修, 但 3 个 TODO 还在 (退出确认 / 日志 toggle / round-end 装备).

### Fix
1. 实现 confirmSurrender modal — 简单 DOM confirm overlay (JS `engine.js` 有 source).
2. Q9 修复 (见下).
3. P21 commit 已写"重写 round-end" — 但 side-end equipment 仍 TODO, 后续 phase 收掉.

---

## Q9 — 战斗日志不可关闭

### JS spec
- `ui-action.js:151-167` `toggleBattleLog()`:
  - 桌面: `wrapper.classList.toggle('log-open')` — 默认无, 点 📜 open.
  - `battle.css:727` `.battle-log{display:none}` `:728` `.battle-log-wrapper.log-open .battle-log{display:block}` — **桌面默认日志隐藏**.
- 也即点 📜 = toggle on/off.

### poc state
- `BattleLog.ts`: 构造时 wrapper 直接 appendChild, 无 hidden 状态. Wrapper 总是 `display: block`.
- `BattleScene.ts:415` 📜 按钮 wire 到 `showCenterBanner('战斗日志待 Phase 5 接入', 1200, '#58a6ff')` — **不开关日志**, 只弹一句话.

### Status: ❌ 永远显示, 📜 按钮不接日志.

### Fix
1. `BattleLog.ts` 加属性 `private visible = true;` (或 false, JS 默认是 false 桌面端) + `setVisible(v)` / `toggle()` 方法:
   ```ts
   toggle() { this.visible = !this.visible; if (this.wrapper) this.wrapper.style.display = this.visible ? 'block' : 'none'; }
   ```
2. `BattleScene.ts:415` `onLog: () => this.battleLog.toggle()`.
3. 初始 `visible = false` (JS 默认 hidden), append wrapper 但 display:none.
4. (可选) 在 wrapper 内加 ✕ close 按钮 hover 可见 (JS 移动端有 mobile-overlay-close, 桌面靠 📜 toggle).

---

## Q10 — 点击羁绊弹的大字 (自创 modal)

### JS spec (`synergies.js:325-369`)
- chip `<span class="synergy-chip">` onclick=`showSynergyDetail(tag, tier)`.
- `showSynergyDetail` (line 335-369) 创建 `#synergyDetailModal` overlay:
  - 黑底全屏 + blur(4px)
  - 中央卡片: 480px 宽 90vw, 渐变背景 #1a2740→#0e1828, 2px #58a6ff 边, padding 24/28, radius 12
  - 内部: emoji 32px + 名字 22px #ffd93d + ✕ 按钮
  - 两区: tier 2 / tier 3 描述, 当前激活档高亮 (金辉 box-shadow + "(当前激活)" label)
  - 点击空白 / ✕ 关闭

### poc state
- `BattleStatsRail.ts:223-227`: chip click 触发 `this.handlers.onSynergyClick(tag, tier)`.
- `BattleScene.ts:523-529` 实现:
  ```ts
  onSynergyClick: (tag, tier) => {
    const cfg = SYNERGY_TAGS[tag];
    const tierCfg = tier === 3 ? cfg.tier3 : cfg.tier2;
    const desc = tierCfg?.desc ?? '';
    this.showCenterBanner(`${cfg.emoji} ${cfg.name} ×${tier} — ${desc}`, 2200, '#ffd93d');
  }
  ```
- ❌ 弹的是 **showCenterBanner** (单行 64px 大字幕) — 这就是用户报的"自创大字".

### Status: ❌ 完全错位 — 应弹 modal, poc 弹 banner.

### Fix
1. 删 `BattleScene.ts:523-529` showCenterBanner 调用.
2. 新增 DOM `SynergyDetailModal.ts` 1:1 复制 JS HTML/CSS (synergies.js:352-368).
3. 调用 `this.synergyDetailModal.open(tag, tier)`.

---

## Q11 — 血条位置 / 样式 / 量表

### JS spec
- `ui.js:178-194` HTML 结构 (`.st-hp-row` → `.st-hp-wrap` → `.st-hp-bar`).
- `scene.css:197-218`:
  - `.st-hp-wrap` width **88px** flex column align center, margin-bottom 2px.
  - `.st-hp-bar` width 100% height **10px**, bg `linear-gradient(180deg,rgba(20,8,8,.7)→rgba(40,15,15,.9))`, radius 2px, 1px rgba(80,80,80,.6) 边, inset shadow.
  - `.st-hp-delay` 受击红尾 (positon absolute, z 0).
  - `.st-hp-fill` 主条 width transition .15s, z 1.
  - `.st-shield-fill` z 2 白盾.
  - `.st-bubble-shield` z 3 青泡盾 animation bubbleShimmer.
  - `.st-hp-ticks` z 4 50/500 刻度 (repeating-linear-gradient).
  - `.st-hp-text` 9px 数字 `${hp}/${maxHp}` + icons.
- `ui.js:162-164` Gradient:
  - 我方: `linear-gradient(180deg, #3deb9e 38%, #1fb57f 42%)` 绿
  - 敌方: `linear-gradient(180deg, #c084fc 38%, #9d5be8 42%)` 紫
- Boss override (`scene.css:10-11`): `.is-boss .st-hp-wrap{width:160px}` + `.is-boss .st-hp-bar{height:16px}`.
- HP row 位置: `.scene-turtle` flex column align center → HP row 是**第一个 flex child** (在 sprite 上方).

### poc state
- `scene-turtle-dom.ts:111-198`:
  - `.st-hp-wrap` width 88px ✓.
  - `.st-hp-bar` height 10px ✓ + bg gradient 1:1 ✓ + border 1:1 ✓.
  - HP gradient (`:365-368`): 我方 `#3deb9e→#1fb57f`, 敌方 `#c084fc→#9d5be8` ✓.
  - delay / fill / shield / bubble / ticks 全 1:1.
  - `.st-hp-text` 9px ✓ + sh-ico/bub-ico/aura-ico ✓.
- 位置: `:374-401` `applyPosition` — root.top = ground - 135 (HP row 22 + body 113). sy 缩放. P22 修复.
- Boss override: ❌ 未实现. `scene-turtle-dom.ts` 没有 `.is-boss` class / 没有 160px+16px 切换逻辑.
- 量表 (ticks): `:572-581` `rebuildTicks(barMax)` 1:1 复制 JS 50/500 步长 + `repeating-linear-gradient`.

### Status: ⚠️ HP 位置/样式 1:1, **缺 boss HP 加宽 (160×16)**.

### Fix
1. `scene-turtle-dom.ts` 构造时检测 `f._isBoss` (或 `f.tier === 'boss'`) → root 加 class `is-boss`.
2. 加 CSS:
   ```css
   .poc-scene-turtle.is-boss .st-hp-wrap { width: 160px; }
   .poc-scene-turtle.is-boss .st-hp-bar { height: 16px; border-width: 2px; }
   .poc-scene-turtle.is-boss .st-level-badge { font-size: 13px; padding: 2px 6px; }
   ```
3. `applyPosition` 时 BODY_PX 用 boss 缩放后值 (boss 龟 sprite 更大, e.g. 1.91 倍 → 113 × 1.91 ≈ 215).
4. ticks 大刻度: boss `barMax > 1000` 倍增 step (`ui.js:166-167` 注释 "Boss-scale (>1000) doubles both steps") — `rebuildTicks` 加分支:
   ```ts
   const minorStep = barMax > 1000 ? 100 : 50;
   const majorStep = barMax > 1000 ? 1000 : 500;
   ```

---

## 总结

### 最大 fidelity gap (top 3)
1. **Q1 (banner 自创风格)** — 64px Phaser scale 弹出 vs 36px DOM letter-spacing-6 slide-in 横幅 + 副标题, **完全两套**.
2. **Q6 (深海币系统)** — 初始 50 (vs 0) + 缺"回合 +3" + 缺自动开店 + 自创"endTurn +1", **核心机制错位**.
3. **Q10 (羁绊点击)** — 应弹 modal (480px 卡片 + tier 2/3 高亮), 实际弹 64px 大字幕, **触发动作不同**.

### 已经 1:1 (no fix)
- **Q2** (attack hop) — P19/P20 keyframes 1:1, P22 不影响 sprite-side
- **Q7** (调试面板) — 已接入, 按钮 wire ✓

### 部分到位 (易修)
- **Q3** TopRow/Rail/Bench 全在, 但 3 处自创残留 (老 📊 / 老 coinsText / Phase 5 占位)
- **Q4** 结构 1:1, 配色 3 色全错位 (橙紫红 vs 红蓝白)
- **Q5** 样式 1:1, 但 colorize 用 regex sniff fragile + 永远显示
- **Q9** 📜 不接日志 — 是 Q5 的一部分
- **Q11** HP 位置/样式 1:1 (P22 修), 缺 boss 加宽 + ticks scale

### 文档位置
`c:\Users\Louis\Documents\GitHub\Turtle-Project-L_Demo\poc-phaser\AUDIT-11Q.md`
