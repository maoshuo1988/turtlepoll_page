# Handoff — v0.9 BattleScene 8-Phase + 用户后续 5 点反馈

> 写于 2026-05-18. 新会话发 "接 v0.9, 看 poc-phaser/HANDOFF.md" 即可续.

## 已完成 (commit pushed eb01683)

Phase 1-8 + P9 + P10 全 push, 每个 commit body 严格列 JS 行号:

| Phase | Commit | 内容 |
|---|---|---|
| P1 | f2cc3f0 | 删自创: 龟下名字+HP/静态 bob/龟币/顶 3 stats |
| P2 | 814b978 | 顶部 5 按钮行 DOM overlay (JS index.html:364-371 + battle.css:27-35 1:1) |
| P3 | 39a25b8 | 帮助 panel modal (JS index.html:380-460 + battle.css:209-221 1:1) |
| P4 | 30d1143 | 深海币 + 羁绊 chip DOM (JS battle.css:8-25,37-56,175-208 1:1) |
| P5 | f1c1fc6 | 战斗日志 DOM (JS battle.css:726-743,786-789 1:1) |
| P6 | d949df1 | bench rails 左右 DOM (JS index.html:467-468 + battle.css:2621-2670 1:1) |
| P7 | cd39ea2 | 音量+全屏 global (JS index.html:122-124 + base.css:136-143 1:1) |
| P8 | db59bff | SceneTurtleDom 接入 (JS .scene-turtle 全字段) |
| P9+P10 | eb01683 | 龟尺寸 113 + NEAREST filter + 详情 modal 防多开 |

## 用户后续反馈 — 剩 P11-P14 未完成

用户 5/18 给的清单:
1. ✅ 对局内龟有点糊 (P9 已修: NEAREST filter)
2. ✅ 大小调正 (P9 已修: 140 → 113 = JS 80 × 1.417)
3. ⚠️ **站位** (P9 已对齐 JS _STD_POS.desktop %, 视觉若仍偏需实测确认)
4. ✅ 每次点击龟周围大量黑色框 (P10 已修: showFighterDetail dedupe)
5. **P11 选龟界面 (TeamSelect): 框位往中间挤, 每只龟头像被截一点, 头像框长宽比改了** ❌
6. **P12 所有召唤物的图片没用** ❌ — 看 JS 怎么用 (summon pets 在 pets.js / scene 里有 summon-* 资产?)
7. **P13 JS 版龟两侧分别显示装备和状态** — P8 SceneTurtleDom 已实现 (`.st-status` left-side + `.st-equips` right-side), 视觉确认即可; 装备图片走 `eq.icon` 路径 (e.g. `equip/dungeon-blade.png`)
8. ⚠️ 装备图片没接 — P6 BenchRail / P8 SceneTurtleDom 都已接 `eq.icon`, 需视觉确认
9. **P14 商店是自创** — JS battle.css:73-114 .shop-overlay / .shop-panel (BG: assets/menu/shop-panel-bg.png) ❌
10. ⚠️ 深海币用对图片 — P4 已用 `battle/deep-coin.png` (跟 JS 一致, ✓)

## P11-P14 实施提示 (下次直接动手)

### P11 — TeamSelect 选龟界面
文件: [src/scenes/TeamSelectScene.ts](src/scenes/TeamSelectScene.ts)
JS 参照: `games/turtle-battle/index.html` 选龟屏 + `games/turtle-battle/css/scene.css`
- JS `.pet-card` 用 grid auto-fill minmax(140px, 1fr), gap 12px
- 头像框长宽比: 1:1 (不能自创长方)
- 一行 7 个时如果挤就 wrap 到下一行, 不能压缩

### P12 — 召唤物图
查看 JS 用 summon assets: `grep -rn "summon" games/turtle-battle/js/ | head -20`
poc public 应有 `pets/` 下的 summon 图 — 确认 spawnSummonAlly 是否用对纹理 key

### P13 — 装备图+状态两侧
已在 [src/systems/scene-turtle-dom.ts](src/systems/scene-turtle-dom.ts) L154-166 实现:
- side-left: status 左外, equips 右外
- side-right: status 右外, equips 左外
图片走 `eq.icon` (PNG full path) + STATUS_ICON_MAP. 视觉测试: 装备龟 → 看身侧有图片显示.

### P14 — 商店 1:1
文件: [src/scenes/ShopOverlay.ts](src/scenes/ShopOverlay.ts) (当前自创, 全推倒)
JS 参照: `index.html:shop-overlay` + `battle.css:73-114` .shop-overlay/.shop-panel
- `.shop-overlay` position:fixed inset:0 z:90 bg rgba(8,12,20,.75) blur 4px
- `.shop-panel` min(80vw, 900px) padding:24px 32px BG `menu/shop-panel-bg.png` center/contain
- `.shop-header` flex gap:14 border-bottom rgba(255,255,255,.15)
- `.shop-title` color #ffd93d / `.shop-coins` #aef0ff / `.shop-timer` #ff9
- `.shop-grid` 2 列 grid-template-columns repeat(2, 1fr) gap:10px
- `.shop-item` bg rgba(20,30,45,.7) border rgba(80,120,180,.3) padding:10x12 radius:8px
- `.shop-item-buy` linear-gradient(135deg, #58a6ff, #2d6fce) padding:5x14
- `.shop-skip` rgba(80,80,90,.5) border rgba(255,255,255,.15)

## 差异表 (Phase 1-8 + P9-P10 完成度)

| 项 | JS 源 | poc 实现 | 状态 |
|---|---|---|---|
| 顶部 5 按钮行 | index.html:364-371 + battle.css:27-35 | BattleTopRow.ts | ✅ 1:1 |
| 帮助 panel 19 术语 | index.html:380-460 + battle.css:209-221 | HelpPanel.ts | ✅ 1:1 |
| 深海币 pill | index.html:373-374 + battle.css:37-56 | BattleStatsRail.ts | ✅ 1:1 |
| 羁绊 chip 竖排 | index.html:376-377 + battle.css:175-208 + synergies.js:312 | BattleStatsRail.ts | ✅ 1:1 |
| 战斗日志 10 色 | battle.css:726-743 + 786-789 | BattleLog.ts | ✅ 1:1 |
| bench rail 左右 | index.html:467-468 + battle.css:2621-2670 | BenchRail.ts | ✅ 1:1 |
| 音量+全屏 global | index.html:122-124 + base.css:136-143 | GlobalToolbar.ts | ✅ 1:1 |
| 龟身 HP/shield/level/status/equips/chest/specialty bars | scene.css + ui.js:178-206 + base.css:55 | scene-turtle-dom.ts | ✅ 1:1 |
| 龟 sprite 113×NEAREST | ui.js:21 _STD_POS.scale=1.417 × 80 + image-rendering:pixelated | BattleScene.makeView | ✅ |
| 详情 modal 防多开 | (poc 自有问题) | detailOpen flag | ✅ |
| **TeamSelect 选龟界面 grid 1:1** | scene.css .pet-card | (未改) | ❌ P11 |
| **召唤物图** | pets.js summon resources | (可能 spawnSummonAlly 没用对 key) | ❌ P12 |
| **shop 1:1** | battle.css:73-114 + assets/menu/shop-panel-bg.png | ShopOverlay.ts 全自创 | ❌ P14 |

> P13 (装备+状态两侧) 已实现在 SceneTurtleDom, 待用户视觉确认.

## 战略提醒
- 不允许偏差: 用户已明确 "JS 1:1, 不允许出错". Phase 2-8 全列 JS 行号 + DIVERGENCE.
- pixelArt:false + antialias:true 保留 (text 用), 仅 pet 纹理 NEAREST.
- :root CSS 变量定义在 BattleStatsRail.ts (--poc-bench-*), BenchRail / 后续都复用.
