# 龟龟对战 — 项目运营手册 + 全量 Backlog (HacknPlan 满配版)

> 单一总图: 散落的计划/审计/记忆提炼而成, 供搭进 HacknPlan(会员)。
> 状态: ✅完成 / 🔄进行中 / ⬜待做 / 🅿️保留(暂不做) ｜ 优先级 P0/P1/P2 ｜ (待核)=需在游戏/代码复核。
> **桥接**: HacknPlan=你的驾驶舱(排期/设计/美术/决策); 你每轮把「进行中」批次告诉我(Claude); 我实现+typecheck+Playwright验+提交; 此文件+记忆=程序侧镜像。

---

## 一、HacknPlan 一次性骨架 (Administration)
- **Modules**: 启用 Game Design Model + Storage(会员后可传图)。
- **Categories(职能)**: `程序/Bug · 性能 · 体验打磨 · 新功能 · 美术 · 文案 · 平衡(数值) · 移动端 · 发布/运维`
- **Tags(横切)**: `#bug #perf #mobile #art #balance #infra #juice #第三方`
- **Board 列(会员可自定义)**: 待办 → 设计中 → 进行中 → 验证中(QA) → 完成, 另加 Blocked。
- **Priority**: P0必须 / P1重要 / P2锦上添花。
- **Estimate**: 1人+AI 工时失真 → 用 Points 粗估或不估, 靠优先级排。
- **Milestones**: `V1`(完成) / `V2` / `V3` / `Icebox`; V2 设目标日期。

## 二、日常闭环
1. **收集** → Backlog 建 work item(分类+优先级+标签+挂设计元素+里程碑; 快捷键 `U`)。
2. **排期** → 版本开始把 P0/P1 拖上 Board。
3. **执行** → 拖「进行中」→ 把这批告诉我 → 我做+验+提交 → 「验证中」→ 你眼验 → 「完成」。
4. **复盘** → 每周看 Metrics + Backlog 重排 + 定下批(3–6 条)。
5. **发布** → 里程碑清空 → build dist + 标 tag → 给合作方 dist.zip + INTEGRATION.md。

## 三、Definition of Done
typecheck 过 + Playwright 验逻辑(感觉/美术你眼验) + 一条 fix 一提交 + push。

---

## 四、里程碑路线
- **V1 — 已交付** ✅ (tag `v1`): 完整可嵌入对战 demo。
- **V2 — 已交付** ✅ (tag `v2`, 2026-05-27): 稳定&性能达标(显存P0关闭/perf P0/剪影阴影) + 重出 dist 交付。WebP 移 V3。
- **V3 — 商业质感**: 品牌/转场/音频/打击感/FTUE/像素占位图(COMMERCIAL-POLISH-PLAN 6 阶段) + 技能图标 + 文案统一。
- **Icebox — 点子池**: 地图/探索系统、严格 skew 投影、新龟/新装备/剧情。

---

## 五、Backlog 全量

### ✅ V1 已完成 (存档参考, 不必录)
28龟技能文案 revamp+验收 · #8 全龟全装备审查(7高14中8低修) · #7 整局规则 · #3 水晶球 · 8项playtest · 6条dead羁绊实装 · 闪电打击描述对齐 · 性能P0(blur降级/FPS自动降级/HUD布局抖动/浮动数字ticker+对象池/粒子降量) · 剪影阴影系统+调试器 · dist.zip V1交付+INTEGRATION.md。

### ✅ V2 — 稳定/性能/移动端 (2026-05-27 收口, tag `v2`)
> **里程碑结论**: V2 核心目标(弱机/手机跑完整局不崩、帧率达标)**已达成** — 深海显存P0 实测无累积关闭、性能P0(ticker+对象池+粒子降量)已交付、剪影阴影定稿、移动端原"待修"多为误报。出包(rebuild dist + tag `v2`)完成。下面 P1/P2 项**未做但不阻塞 V2 目标**, 已重归类(WebP→V3发布优化; 懒加载/节奏/idle暂停/增量DOM→V3性能或仅弱机需; 移动端真机细节→V3 或真机回归)。
> 注: 移动端经 2026-05-27 复核, 多项原"待修"是误报(DetailPanel fitScale 每次重算√、BattleLog 已封顶√、ENVELOP 仅桌面√) — 已剔除。

- ✅/🅿️ **~~P0 深海5连关显存累积~~ 关闭(2026-05-27 实测不复现)**: 重启战斗6次纹理/场景/DOM全持平, 无累积。BootScene全预载+按key复用+shutdown清理干净, "关间textures.remove"无意义。
- 📊 **显存基线实测 ~320MB** (decoded): 龟sheet **194MB**(大头, 最大 shell 10000×500=19MB) / 背景 **54MB** / 其余。**背景非4K, 实为 1672×941 (~6MB/张)** — 旧文档"~4K"是错的, 降采样无意义。
- ⬜ **P2(仅弱机需) 性能** 按战斗懒加载龟 sheet (只载本场~6-12只, 非全28) → 194MB→~50MB, 总~130MB。比背景降采样有效得多。桌面/中高端手机全预载(~320MB)即可, 无需做。 `#perf #mobile`
- ⬜ **P1 性能/手感** 多段/AOE 节奏与 tween 收敛: 逐段 tween 合并 + 每技能 hand-tune 间隔(现统一 500ms 是错的, 见 POLISH-AUDIT §3) `#perf #juice`
- ✅ **~~P1 打磨 backlog D/E/F~~ 关闭(2026-05-27 核实已完成提交)**: A-F 全组已做并提交 (D=490d77f2/4167b5f8, E=19cd619b/15097537, F1=28f61983, F3=0d38fc81, F2移动端基础已备)。"待做"是过时索引误记。**只剩非阻塞「你眼验确认」项**(见下), 不需我开发。
  > 你眼验清单(dev上瞄一眼, 要调再说): 初始装备/商店/状态文案/血条观感 · 机甲朝向是否取反 · 赛博激光高度 · 光标观感 · D其余效果标签(反伤/甲抗)是否也去字 · F2真机手感(指尖尺寸/超宽屏letterbox)
- ➡️V3 **资产 WebP 预压缩** (移出 V2): 2026-05-27 核实 = **纯下载/磁盘优化(168MB dist→~100MB), 不降 decoded RAM**, 对 V2 稳定/帧率目标零贡献。且工具链无 WebP 编码器(jimp 1.6 不支持, 无 sharp/cwebp) → 要装 sharp 原生依赖 + 改 ~505 处 `.png` 引用。归入 **V3 发布优化**, 真要做时配合出包一起。 `#perf #infra`
- ⬜ **P2 性能** idle 动画离屏/非活动暂停 (anims.pause) (PERF-PLAN H) `#perf`
- ⬜ **P2 性能** ActionPanel/DetailPanel 增量 DOM (G) + 金币 RAF 并入 Phaser 时钟 (J) `#perf`
- ⬜ **P2 移动端** 多浮层(DmgStatsPanel/GlobalToolbar/BattleTopRow)接 --poc-ui-scale (仅极端分辨率失调, 观感优化非bug) `#mobile`
- ⬜ **P2 移动端** 触控点击区 <40px 审计 (GlobalToolbar/BattleTopRow 按钮) `#mobile`
- ⬜ **P2 移动端** 超窄屏 <360px: ActionPanel 溢出贴边 `#mobile`
- ⬜ **P2 移动端** 横竖屏中途旋转: sprite homeX/Y 重算 vs DOM HUD 同步验 (待核) `#mobile`
- ✅ **P1 发布** V2 出包: rebuild dist(168MB) + 标 `v2` + dist.zip 交付合作方 (2026-05-27 完成) `#infra #第三方`

### 🌟 V3 — 商业质感 (COMMERCIAL-POLISH-PLAN 6 阶段)
- ⬜ **阶段0 品牌** 去 PoC/Phaser 字样 + 正式标题/加载页(logo+进度条) + 调试/反馈键缩到角落 + 统一开源像素中文字体 + 自定义光标 ✨ `#art #infra`
- ⬜ **阶段1 转场/氛围** 水波/气泡/海浪过场替硬切 + 环境粒子(樱花/深海气泡/尘埃) + 加载进度条 + 关卡过场卡✨ + 调色后处理(bloom/暗角)✨ + 结算战利品弹出 `#juice #art`
- ⬜ **阶段2 音频** SFX 事件总线(命中/暴击/技能/治疗/护盾/死亡/UI) 接 sfx-synth + CC0 占位 + BGM 淡入淡出/激烈度切换 `#juice`
- ⬜ **阶段3 打击感 juice** hit-stop + 震屏分级 + 伤害数字重量感 + 命中闪白顿挫 + 数字滚动计数✨ + 死亡溶解演出✨ + 按钮凹陷/悬停发光 `#juice`
- ⬜ **阶段4 FTUE/设置** 首局高亮指引(选龟→技能→羁绊→出手)+术语tooltip(文案待你) + 设置面板补全(音量/重置存档) + localStorage 持久化 `#新功能 文案待你`
- ⬜ **阶段5 像素占位图** 列 emoji/占位清单逐个生成像素图接入(糖果炸弹/调试键等) `#art`
- ⬜ **P1 体验/美术** 🎯**选龟界面大改 (Team Select Revamp)** — 范围=Layer A 视觉重构(三栏+队伍加成面板+右侧常驻详情面板+清空/自动布阵+卡片元素/星级+技能5选3整合进右栏), 不动数据/战斗。详 `TEAMSELECT-REVAMP.md`(6 子任务全P1)。Layer B(补element/stars数据)/Layer C(速度入出手序·元素克制·队伍加成公式)标P2待决策。 `#juice #art`
- ⬜ **P1 美术** per-skill 技能图标全套 (skill revamp 图标部分) `#art`
- ⬜ **P2 体验** 技能详情面板游戏化 (skill revamp) `#juice`
- ⬜ **P2 文案** 全游戏文案统一 pass (含 #8 低保留项: 灼烧"持续N回合"措辞、彩虹紫诅咒等) `#文案`
- ⬜ **P2 平衡** 数值平衡复盘 (实战后) `#balance`

### 🅿️ Icebox — 点子池
- 🅿️ 真·地图/探索系统 (用户提过; 大功能, 现为纯回合制战斗场景; 设计待定)
- 🅿️ 严格 skew 斜切投影阴影 (现压扁+旋转近似; 要轻量 shader)
- 🅿️ 新龟 / 新装备 / 剧情模式
- 🅿️ 敌方 AI 接整局规则/羁绊折扣 (planAiShop 等小缺口)

---

## 六、Game Design Model (GDM 设计树大纲)
任务可挂到这些设计元素上(改某龟即连到它):
- **0 定位/愿景**: 网页商业向龟龟自走棋, 可嵌第三方 app
- **1 核心循环**: 野生 / 深海闯关(5关) / 商店(6格) / 随机事件(财宝雨·巨蟹·海葵) / 整局规则
- **2 龟图鉴(28只)**: 每只一元素 — 被动+技能组+数值 (src/data/pets.ts, CodexScene)
- **3 装备(46件)**: src/data/equipment.ts
- **4 羁绊/整局规则**: synergies.ts / data/rules.ts
- **5 数值缩放契约**: SCALING-CONTRACT.md
- **6 美术规范**: 剪影阴影(记忆 shadow_silhouette) / UI缩放(--poc-ui-scale, ENVELOP仅桌面/触屏FIT) / 像素风 / 字体
- **7 部署交付**: dist=Vite产物不进git / Vercel / INTEGRATION.md / petState 数据契约
- **8 审计账本**: AUDIT.md(JS保真) / qa-2026-05-26 / qa-2026-05-27 / POLISH-AUDIT / PERF-PLAN / MOBILE-RESOLUTION-PLAN

---

## 七、源文档索引 (深挖某项时翻)
- 性能: `qa-2026-05-26/PERF-PLAN.md` (P0-P2 全项 + 文件:行)
- 移动端: `qa-2026-05-26/MOBILE-RESOLUTION-PLAN.md` (已解决√ + 待实测风险)
- 保真/手感: `POLISH-AUDIT.md` (HP条/每回合播报/伤害节奏/缺失场景FX)
- 商业质感: `COMMERCIAL-POLISH-PLAN.md` (6 阶段全细节)
- bug审查: `qa-2026-05-27/AUDIT-INDEX.md` + 分组明细 A-E
- 记忆(我侧): MEMORY.md 各 project_* 条目
