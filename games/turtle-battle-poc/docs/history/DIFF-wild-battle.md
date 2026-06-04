# 野生对局 1:1 Diff Audit (Phase 1)

读源: `main.js`, `battle-setup.js`, `index.html`, `base.css`. **Phase 1 = 只列差异不动代码**.

---

## A. 流程顺序 (架构级!)

| 步骤 | JS | Phaser | 1:1 |
|---|---|---|---|
| 1 | 主菜单点"野生对局" → `showSelectScreen` (`gameMode='pve'`) | 主菜单点"野生对局" → `openRulePick()` → `RulePickScene` | ❌ |
| 2 | 选 3 龟 → `confirmTeam` | 选规则 → `TeamSelectScene` | ❌ |
| 3 | confirmTeam 触发 `showRulePickModal` overlay | 选 3 龟 → `confirmTeam` → `BattleScene` | ❌ |
| 4 | 选规则 → `_pendingBattleRule = rule; startBattle()` | (没了, 规则已在 step 1 选好) | ❌ |

**JS 是: 团队 → 规则 → 战斗**. **Phaser 反过来: 规则 → 团队 → 战斗**.

**JS `gameMode` 值**: 野生对局走 `'pve'`. **Phaser**: 走 `'custom'`. 数据值不同, 影响后续逻辑分支.

---

## B. RulePickScene → JS `showRulePickModal`

| # | 项 | JS (`battle-setup.js:33-68`) | Phaser (`RulePickScene.ts`) | 1:1 |
|---|---|---|---|---|
| B1 | 类型 | DOM overlay modal (`<div class="rule-pick-overlay">`) 在选龟界面上方弹出 | 独立 Phaser Scene | ❌ |
| B2 | 显示时机 | confirmTeam → 弹出 | 主菜单 → 一进就显示 | ❌ |
| B3 | bg | 玩家可见选龟界面背景 (modal 半透明) | 主菜单 tile bg | ❌ |
| B4 | 卡片 | 7 卡 (fire/thunder/shield/rage/equip/rain/normal) | 7 卡 ✓ | ✓ |
| B5 | 卡片样式 | `.rule-pick-card` CSS, icon 顶 + name + desc | DOM rect + 左色条 + emoji 右上 + 名+desc | ⚠ 等效 |
| B6 | 🎲 随机按钮 | `<button id="rulePickRandomBtn">🎲 随机一个</button>` 底部 | 卡片下方金色按钮 | ✓ E3/33 已加 |
| B7 | 关闭流程 | `overlay.classList.remove('show')` + 250ms 后 `overlay.remove()` | scene.start 切场 | ❌ |
| B8 | 副标"规则修改对局环境" | 无 | 有 (Phaser 自创) | ⚠ Phaser 多 |

---

## C. TeamSelectScene → JS `screenSelect` 整屏

JS HTML (`index.html:301-358`) 结构:
```
#screenSelect
├── #selectTitle ("选择你的队伍")
├── .mode-guide#modeGuide (header + tips ul)
├── .select-top
│   ├── .formation-grid (3 rows × 4 cells)
│   │   ├── 前排 row: label + 3 fg-slot
│   │   ├── 后排 row: label + 3 fg-slot
│   │   └── 替补 row (display:none unless dungeon)
│   ├── .select-actions
│   │   ├── 返回
│   │   ├── ↺ 上次阵容 (display:none unless 有 last lineup)
│   │   └── #btnConfirmTeam (disabled 直到 3 龟)
│   └── .synergy-preview#synergyPreview (display:none unless ≥2 龟)
├── .pg-filter-bar
│   ├── .pg-filter-pills (全部/C/B/A/S/SS/SSS — 注意 C 在左)
│   └── .pg-filter-right > select#pgSort (稀有度↓/等级↓/名称)
└── .pet-grid#petGrid
```

JS pet card (`main.js:313-321`):
```html
<div class="pet-card ${selected ? 'selected' : ''}" data-id draggable>
  <span class="pet-rarity-badge">${rarity}</span>
  <div class="pet-avatar">${imgHTML}${passiveHtml}</div>
  <div class="pet-name">${name}</div>
  <div class="pet-lv">Lv.${lv}</div>
</div>
```

### C.1 顶部 / 标题
| # | 项 | JS | Phaser | 1:1 |
|---|---|---|---|---|
| C1.1 | 标题文本 | `#selectTitle` 默认 "选择你的队伍", 进入时 setInnerHTML 自定义 | "组队" (Phaser 自起) | ❌ |
| C1.2 | 标题样式 | `<h2 class="screen-title">` 黄色 24px+ | 42px 黄色 stroke | ⚠ 大小差 |
| C1.3 | 返回按钮位置 | `.select-actions` 内 — slot 下面 | 左上 (40, 40) | ❌ |

### C.2 Mode Guide
| # | 项 | JS | Phaser | 1:1 |
|---|---|---|---|---|
| C2.1 | 6 模式 | pve / boss / boss-pick / test / dungeon / pvp-online | pve / boss / boss-pick / test / dungeon / **custom** | ❌ |
| C2.2 | 缺 pvp-online | 有 (在线对战, tips 1 条) | 没有 | ❌ |
| C2.3 | 多了 custom | 没有 | 有 (我自创) | ❌ |
| C2.4 | pve 的 tips | 选择 3 只龟 / 前排优先目标 / 先手平衡 (3 条) | (我加给了 custom, key 错) | ❌ |
| C2.5 | DOM 结构 | `<div class="guide-header">${icon} ${title}</div><ul class="guide-tips">${tips}</ul>` | 一行 flex (icon + title + 水平 ul) | ⚠ 布局差 |
| C2.6 | CSS | bg rgba(255,255,255,.03) + 圆角 + max-width:600px + 在 title 下面块状 | 我用 rgba(0,0,0,0.4) + 水平窄条 | ❌ |

### C.3 Formation Grid (3 排 × 4 cell)
| # | 项 | JS | Phaser | 1:1 |
|---|---|---|---|---|
| C3.1 | 行结构 | 前排 row + 后排 row + 替补 row (3 行) | 前排 row + 后排 row (2 行) | ❌ |
| C3.2 | 替补行 | 闯关模式显示 (3 备用槽) | 完全没有 | ❌ |
| C3.3 | 行 label | `.fg-label` 左侧 ("前排"/"后排"/"替补") | Phaser text 左侧 | ✓ 等效 |
| C3.4 | slot 数 | 6 (野生) / 9 (闯关) | 固定 6 | ⚠ 部分 |
| C3.5 | slot 样式 (空) | 圆角虚框 + 黄色"空"字 | 黑底 + + 号 + "前 X"/"后 X" | ❌ |
| C3.6 | slot 样式 (满) | 圆角实框 + 头像 + 名 + 稀有度边框色 | 头像 + 名 + 稀有度边框 + 编辑✎按钮 + passive icon | ⚠ Phaser 多 |
| C3.7 | slot 点击 (空) | `fgSlotClick(key)` 设 active slot, 之后点 pet card 入此槽 | 无 active 概念 | ❌ |
| C3.8 | slot 点击 (满) | active 选中态, 再点别的 slot swap | 直接清空 | ❌ |
| C3.9 | slot drop 接收 | `ondrop="fgDrop(event, key)"` HTML attr | `dropZone:true` + scene.input.drop | ✓ 等效 |
| C3.10 | slot drag (filled) | `draggable=true` + `ondragstart` 设 `_fgDragId = petId` (能拖出去 swap) | 没做 (slot 现在不可拖) | ❌ |
| C3.11 | drag-over 视觉 | `.drag-over` CSS 金描边 | setStrokeStyle 金 ✓ | ✓ |
| C3.12 | summon mark slot | `SUMMON_MARK = '__summon__'` 占位, 可拖到空格, 拒接 turtle 替换 | 没做 | ❌ |
| C3.13 | crystal-ball mark slot | 同上 (水晶球占位) | 没做 | ❌ |
| C3.14 | candy-bomb mark slot | 同上 (糖果炸弹占位) | 没做 | ❌ |

### C.4 选 actions row
| # | 项 | JS | Phaser | 1:1 |
|---|---|---|---|---|
| C4.1 | "返回" 按钮 | `<button class="btn btn-secondary select-btn">` 在 actions row 内 | 左上 ICON 圆按钮 | ❌ |
| C4.2 | "↺ 上次阵容" | 有上次阵容时显示, 点击 `restoreLastLineup()` | **完全没做** | ❌ |
| C4.3 | "开始战斗" 按钮文本 | `<span id="selectCtaLabel">请选择 3 只龟</span>` 动态: 0/3 不够 / 3/3 可点 | "开始战斗" 静态 | ❌ |
| C4.4 | disabled 视觉 | `disabled` attr + CSS 灰 | alpha 0.4 + 摇晃 | ⚠ 等效 |

### C.5 Synergy Preview (≥2 龟 时显)
| # | 项 | JS | Phaser | 1:1 |
|---|---|---|---|---|
| C5.1 | 触发 | 选 ≥2 龟时显示, 0-1 龟隐 | 始终显示 (拼接字串) | ❌ |
| C5.2 | UI | `<div class="synergy-preview">` 单独面板 + `synergy-preview-list` 内羁绊 chip | 单行 text "协同标签: x · y" | ❌ |
| C5.3 | 内容 | 算激活羁绊 (×2 / ×3) + 显示 icon + 数值加成 | 仅列 tags 字符串 | ❌ |

### C.6 Filter / Sort Bar
| # | 项 | JS | Phaser | 1:1 |
|---|---|---|---|---|
| C6.1 | pills 顺序 | **全部 → C → B → A → S → SS → SSS** (低到高) | 全部 → SSS → SS → S → A → B → C (高到低) | ❌ |
| C6.2 | pills 数量 | 7 (含 全部) | 7 (含 全部) | ✓ 数对 |
| C6.3 | pills 样式 | `.pg-pill` CSS 圆角 (16px 高?) | 26px Phaser rect | ⚠ |
| C6.4 | sort options text | 稀有度↓ / 等级↓ / 名称 | 排序: 稀有度 / 排序: 等级 / 排序: 名字 | ❌ |

### C.7 Pet Card
| # | 项 | JS | Phaser | 1:1 |
|---|---|---|---|---|
| C7.1 | 卡 padding | `padding:14px 10px` | rect 96×96 无 padding | ⚠ |
| C7.2 | sprite 大小 | desktop 144px, mobile 60-80px | 54×54 | ❌ |
| C7.3 | rarity 徽章 | 左上 `<span class="pet-rarity-badge">` | 右上 | ❌ 位置反 |
| C7.4 | 选中态 | `.selected` 加金边 + 金背景 + box-shadow 发光 | **没做** | ❌ |
| C7.5 | hover 态 | `translateY(-2px)` + golden border + shadow | setStrokeStyle 金 | ⚠ |
| C7.6 | idle animation 控制 | `animation-play-state: paused`, hover/selected 时 running | sprite 没用 spritesheet | ❌ |
| C7.7 | passive icon 位置 | 右上 (相对 .pet-avatar) `top:-8px;right:-8px` | 我自己放 (36, 36) 右下 | ❌ |
| C7.8 | passive icon 大小 | 42×42px + 32×32 inner img | 22×22 | ❌ |
| C7.9 | passive icon click | `showSkillPickModal(petId, callback)` callback 调 sync/render | `openSkillPicker(petId)` 无 callback | ❌ |
| C7.10 | Lv.X 位置 | 卡底部 `<div class="pet-lv">Lv.${lv}</div>` CSS 决定 | 左下 黄底 | ❌ 位置差 |
| C7.11 | drag attr | desktop `draggable=true` + html5 dnd | Phaser dragstart | ✓ 等效 |
| C7.12 | touch drag | 移动端 fgTouchStart/Move/End + ghost clone | **完全没做** | ❌ |

### C.8 Pet Grid Layout
| # | 项 | JS | Phaser | 1:1 |
|---|---|---|---|---|
| C8.1 | 列数 | CSS grid auto-fit (响应式) | 固定 7 列 | ⚠ |
| C8.2 | 滚动 | CSS `overflow-y:auto` | scene.input.wheel 监听 | ⚠ 等效 |
| C8.3 | owned 过滤 | 读 `localStorage.petState.pets` 过滤已拥有的 (没拥有的不显示) | 显示所有 28 龟 | ❌ |

---

## D. BattleScene (野生对局规则应用部分)

| # | 项 | JS | Phaser | 1:1 |
|---|---|---|---|---|
| D1 | rule 来源 | `_pendingBattleRule` 全局 var | scene init data `rule: string` | ⚠ 等效 |
| D2 | rule 应用时机 | `startBattle()` line 393-399 | `BattleScene.create()` line 591 (applyRuleStart) | ✓ |
| D3 | rule.apply(fighters) 内容 | JS 各 rule 的 apply 函数直接改 fighter 属性 | applyRuleStart 替代 | ✓ E3/27 验过 |
| D4 | rule banner | JS 战斗开始 `showTurnStartBanner` 显规则名 | Phaser 有 pill 显规则 | ⚠ 等效 |

---

## 总计

- **架构级偏差**: 流程顺序 (规则先选还是后选), gameMode 值 ('pve' vs 'custom')
- **完全漏的 features**: 替补行 / summon-mark slot / crystal-ball-mark slot / candy-bomb-mark slot / 上次阵容按钮 / 选中态视觉 / 触屏拖拽 / synergy preview 面板 / owned 过滤
- **位置/样式偏差**: 标题大小, 返回按钮位置, mode-guide 布局, pill 顺序, sort 文本, rarity 徽章位置, passive icon 位置+大小, Lv 位置
- **行为偏差**: slot active 选中状态, slot 满状态点击 swap, slot drag (filled 也能拖)

**1:1 实测得分**: 7 ✓ + 8 ⚠ + 31 ❌ = **17% 算 1:1**.

差异大头:
1. **流程顺序反了** — 这个不修 commit 就不能说 1:1
2. **替补行 + 3 个 mark slot (summon/crystal-ball/candy-bomb)** — JS 阵地系统的关键, Phaser 完全没
3. **选中态视觉** + **上次阵容** + **synergy preview 面板** — 玩家直观感受差
4. **触屏拖拽** — 移动端用户根本拖不动
