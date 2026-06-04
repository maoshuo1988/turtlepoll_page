# UI 渲染迁移方案：DOM 浮层 → Canvas + 位图字体

> 目的：根治 iOS WebKit 上"只看得到画布、DOM 浮层整层消失"的问题，同时不牺牲（甚至提升）文字清晰度。

---

## 1. 背景与动机
- **现状**：关键 UI 走 DOM 浮层（`addDomText / addDomImage / addDomHTML`，见 `systems/dom-text.ts`）叠在 Phaser 画布上，初衷是文字锐利（尤其中文 + 富文本多色）。
- **问题**：iOS Safari / WKWebView 上整个 DOM 浮层不可见，只剩 WebGL 画布。`#game` 视口锁定（fixed+inset）已试，无效。
- **关键事实**：App Store 套壳用的就是 **WKWebView = WebKit**，同一引擎，**套壳躲不掉这个 bug**。所以无论走不走 App Store，都得从渲染层解决。
- **目标**：关键 UI 改为 **Phaser 画布内渲染**，用 **位图字体（BitmapText）** 保清晰 → 跨平台稳定（iOS 重点）+ 像素级锐利 + 更好性能。

---

## 2. 为什么用位图字体（BitmapText），不是普通 Text
| 方案 | 清晰度 | 跨平台 | 性能 | 说明 |
|---|---|---|---|---|
| 现状 DOM | 中文最锐 | ❌ iOS 坏 | 一般 | 就是现在的坑 |
| Phaser 普通 Text | 中文 FIT 放大略软 | ✅ | 一般（逐 text 一纹理） | `setResolution` 治标 |
| **BitmapText** | **任意缩放像素级锐** | ✅ | **高（图集合批）** | 预渲染字形图集，最契合像素美术 |

结论：位图字体在像素风游戏里**比 DOM 还锐**，且 iOS 铁稳。代价是要解决"中文字符集"和"富文本排版"两个工程问题（见下）。

---

## 3. 两个核心难点

### 3.1 中文位图字体（字符集体积）
中文常用字 3500+，全量图集几十 MB，不可行。选项：
- **A. 预扫描静态图集（推荐）**：游戏文案是**固定**的。写构建脚本扫描所有文案（`pets.ts` / `skills` / 各 Scene 字符串 / 成就 / 装备…）→ 收集**实际用到的字**（估计 800–1500 字）→ 离线生成只含这些字的 BMFont 图集。锐利、体积可控（几百 KB）。
- **B. 运行时动态字形缓存**：用 canvas 即时把需要的字画进纹理图集（动态 BMFont）。只渲染出现过的字。适合**未知字**（玩家自定义命名等）。
- **C. 普通 Text 兜底**：不做位图，普通 Text + 高 resolution。最省力，中文略软但跨平台稳。

→ **推荐 A 为主 + B 兜底未知字**。若想最省力先验证可行性，可先用 C 把战斗 UI 迁过去看 iOS 是否解决。

### 3.2 富文本排版（最大工作量，约占 80%）
现在 `addDomHTML` 用 HTML 实现了：**多色片段（`val-*` 那套）+ 自动换行 + 行高 + 可滚动**。Codex 技能/被动详情、DetailPanel 技能大卡、技能文字全是这种。
Canvas 没有现成富文本，需要自建一个 **inline 富文本排版器**：
- 把 `<span class=val-xxx>...</span>` 解析成 `{text, color}` 片段流。
- 逐字测量宽度做**自动换行**（中文逐字、英文按词）。
- 逐片段用 BitmapText（或带 tint 的 Text）画。
- 长文本套 **可滚动容器**（Phaser container + geometry mask + 拖拽/滚轮）。

这是整个迁移最重、最容易出 bug 的部分。

---

## 4. 迁移范围（当前 DOM 浮层清单）
按"对 iOS 可玩性的阻断程度"排序：
- **战斗核心**（最阻断）：`ActionPanel`(技能选择)、`BattleTopRow`、`BattleStatsRail`(深海币/羁绊)、`scene-turtle-dom`(血条/名字)、`DmgStatsPanel`、飘字(`visual_dispatcher`，部分已 canvas)。
- **菜单/入口**：`MainMenuScene`(标题/按钮文字/龟币/磁贴)、全屏弹窗、新手引导。
- **富文本重灾区**：`DetailPanel`(技能大卡)、`CodexScene`(海量多色文字)、`ShopOverlay`、`HelpPanel`。
- **其它 Scene**：`TeamSelectScene`、`RewardPick / ChoiceEvent / Achievements / RecordScene`。

不受影响（已经是 canvas）：所有 sprite / graphics / 纯 Phaser `Text`。

---

## 5. 分阶段计划

### Phase 0（先做，~1–2 天）— 再试一轮针对性 iOS DOM 修复
大迁移前**必须先排除低成本解**。逐个试、单独验证：
1. 强制 Phaser DOM 容器 `z-index` 高于画布 + `transform: translateZ(0)`（提升合成层，治 iOS "WebGL 盖住 DOM"）。
2. `visualViewport` 对齐（监听 `window.visualViewport` resize，校正 DOM 容器位置/缩放）。
3. 关掉 `transparent: true`（iOS 透明画布合成行为差异）。
4. DOM 容器 `position: fixed` 而非 absolute。
→ **任一生效则整个迁移可免。成本极低，先做。**

### Phase 1 — 位图字体基建
- 选像素中文字体（确认商用授权）。
- 构建脚本：扫描文案 → 字符集 → 生成 BMFont 图集（普通位图或 MSDF）。
- 封装 `bmText(scene,x,y,text,style)`（替代 `addDomText`）。
- 富文本排版器原型：`richCanvasText(scene, x, y, html, {width, maxHeight, scroll})`（替代 `addDomHTML`）。← **本阶段难点**

### Phase 2 — 战斗核心 UI 迁移（让 iOS 能打完一局）
- 飘字、血条/名字、ActionPanel、TopRow、StatsRail、DmgStatsPanel 全部 canvas 化。
- 验收：iOS Safari 完整打一局深海。

### Phase 3 — 菜单 + 详情/图鉴 + 各 Scene
- MainMenu / TeamSelect / DetailPanel / Codex / Shop / 其它 Scene 的 DOM → canvas。
- 富文本 + 滚动重灾区在此消化。

### Phase 4 — 清理与回归
- 删 `dom-text.ts` 及 `dom: {createContainer:true}`（若全部迁完）。
- 全平台回归：iOS Safari / 安卓 Chrome / 桌面。

---

## 6. 工作量与风险（诚实评估）
- **总量：大**。Phase 1–4 全量，单人全职粗估 **2–4 周**，主要取决于富文本排版器的打磨。
- **最大风险/工作量**：富文本（多色 + 换行 + 滚动）canvas 重做（§3.2），约占 80%。
- **中文字体管线**：选型 + 授权 + 扫描脚本，中等。
- **收益**：iOS 彻底稳 + 像素级锐利（比现 DOM 还锐）+ 性能更好 + App Store 套壳无障碍。

---

## 7. 折中选项
- **只迁战斗核心（Phase 0→2 停）**：让 iOS 能打，菜单/图鉴等次要页保留 DOM，或在 iOS 上对这些页用普通 Text 降级兜底。工作量减半。
- **全程用普通 Text（跳过位图）**：最省力，中文略软；先用它验证"canvas 化能否解决 iOS"，验证通过再决定要不要上位图。

---

## 8. 待你拍板的决策点
1. **先做 Phase 0（低成本试修）还是直接上迁移？**（强烈建议先 Phase 0）
2. **中文字体**：预扫描静态图集（推荐）/ 动态 / 普通 Text 兜底？
3. **范围**：全量迁移 / 只迁战斗核心？
