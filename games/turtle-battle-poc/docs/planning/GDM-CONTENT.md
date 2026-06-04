# GDM 设计文档正文 (粘进 HacknPlan Game Design Model)

> 用法: 在 GDM 建对应 folder/设计元素 → 把该段粘进它的「描述」。角色/物品只放指针, 别抄数据。
> 来源: 从代码 + 各审计/计划 + 记忆提炼。标 (待核) 的可在代码/游戏复核。

---

## 📁 定位 & 设计支柱 (顶层)
**定位**: 网页端商业向"龟龟自走棋/自动战斗" roguelike。可独立运行, 也可作为模块嵌入第三方 App。
**设计支柱** (一切决策围绕这四条):
1. **收集养成** — 28 只风格各异的龟, 等级 1-10 成长。
2. **构筑搭配** — 技能 5 选 3、装备、羁绊、整局规则, 鼓励玩家组合出 build。
3. **爽快回合战** — 自动结算 + 打击感 + 清晰的伤害/状态反馈。
4. **可嵌入** — 纯静态前端, 通过 localStorage `petState` 与宿主对接。
**保真基准**: 早期对齐一份 vanilla-JS 原版; 现策略是"以 JS 为参考去改进", 非严格 1:1 (见记忆 feedback_1to1_audit)。

---

## 📁 机制 Mechanics

### └ 战斗系统
- 回合制自走棋。基准分辨率 1280×720。回合流按 side-block: 我方回合 → 敌方回合, 每方按出手序逐个行动。
- 双方各布阵 (最多 6 槽: `front-0/1/2` `back-0/1/2`; 列索引 N 纵向)。前排/后排影响选取与部分技能。
- **三种伤害**: 物理(吃护甲 def) / 魔法(吃魔抗 mr) / 真实(无视防御)。暴击 crit; 暴击率 >100% 溢出部分转爆伤 (calcCritMult)。
- **护盾**: 通用 shield + 特殊独立护盾 (泡泡盾 bubbleShieldVal 独立槽优先扣 / 熔岩盾)。
- **DoT 层数模型**: 灼烧/中毒/流血 = 累加层 + 每回合衰减 (duration 999, applyDotStacks); 诅咒 = 固定回合真伤。
- **状态**: 冰寒(-20%攻)、眩晕、嘲讽(单体伤害转移)、治疗削减、各种 Up/Down buff (recalcStats 每回合从 base 重算: Down 是百分比乘, Up 是绝对值加)。
- **被动触发链** (triggerOnHitEffects): 反伤(石头龟等)/吸血/命中层累积(电击 8 层引爆、结晶满 4 引爆、墨迹)/各龟 on-hit 特性。
- **死亡触发**: deathExplode / deathHook / healOnKill / 凤凰复活 / 猎人窃取 — 用 `currentAttacker` 判定"击杀者"(普攻/斩杀/变身AOE等都设它)。
- 出手有计时条; dev 有 `__autoBattle` 双方AI自动跑。

### └ 数值 & 平衡框架
- **稀有度** C/B/A/S/SS/SSS → 基础数值梯度 (越高越强)。
- **等级** 1-10 (`petState.levels[id]`, getPetLevel); 影响数值与部分技能解锁 (idx3 需 Lv4 / idx4 需 Lv7)。
- **缩放**: POSITIONS_SCALE=1.417; baseScale (普通 0.9×, Boss ×1.5); DISPLAY_BOX=80×baseScale。详见 `SCALING-CONTRACT.md`。
- **平衡哲学**: 每只龟一个清晰 fantasy, 强度靠技能特色/机制而非堆数值; dummy 测试桩 maxHp=1,000,000 → %HP 项数字会爆表, 非 bug。

### └ 羁绊 (Synergies)
- SYNERGY_TAGS 分 tier2/tier3, 左右队**独立**结算 (flags 写在该侧 team[0])。
- 6 条已实装: 物理(攻击附流血) / 魔法 / 换形(变身/切换时护盾 + tier3 首次换形 +ATK) / 财富(tier3 商店 -25% 价) / 再生(tier3 复活时反击) / 运气(第1回合发消耗品+tier3额外装备)。设计意图: 鼓励同标签构筑。(敌方 AI 暂未吃商店折扣 — Icebox)

### └ 整局规则 (Battle Rules)
- BATTLE_RULES 7 条: 烈焰之日(伤害附灼烧)/雷暴之日(全体暴击+20%)/铁壁之日(护盾+30%)/狂暴之日(攻+20%甲抗-15%)/装备之日(每3回合各选1件)/下雨天(每回合 5×N 魔法+永久-N甲抗)/正常对局。
- 野生(pve)开局 modal 选; 深海闯关第1关随机定一条、全程沿用; 战斗顶栏有规则徽章显示。

### └ 商店 & 经济
- 6 格商店 (rollShopItems), 每 4 回合开; 龟币来源重平衡 + 利息; 财富羁绊 tier3 打 75 折。深海币跨关携带。

### └ 核心循环
- 选龟组队 (3v3, 拖站位 + 5选3技能 + 装备) → 战斗 → (深海)关间三选一奖励 → 下一关。
- 模式: 野生(人机) / 深海闯关(5关递进) / 自定义(PvP) / 首领挑战 / 单龟测试。

---

## 📁 关卡 Levels

### └ 深海闯关 (主 roguelike 模式)
- 5 关递进; 三轴难度倍率分离 (HP / ATK / DEF mult); 第 1-4 关普通 + 第 5 关 BOSS (hp×3)。
- 关间 RewardPickScene 三选一 bonus; 装备席 + 深海币跨关携带; 整局规则全程同一条。
- 关间存活龟回满血、阵亡龟 70% HP 复活。
- **已知最大风险**: 5 连关每关重建 BattleScene 无 `textures.remove`, 低内存安卓显存累积可能崩 (V2 P0)。

### └ 野生对局
- 人机单场; 开局选整局规则。

### └ (Icebox) 地图/探索系统
- 现为纯回合制战斗场景 (静态背景图 + 角色固定槽位改坐标), **无可走大地图**。若做需 tilemap+相机+节点触发 (大功能, 待定)。

---

## 📁 角色 Characters (只放指针, 别抄数据)
28 只龟的被动+技能+数值**源头在 `src/data/pets.ts` + 游戏内图鉴(Codex)**, 不在此重抄。
- 当**要重做/调平衡某只龟**时, 才在此建该龟子元素, 写"新设计意图", 并把对应任务挂上去。
- 龟 id: basic/stone/bamboo/angel/ice/ninja/two_head/ghost/diamond/fortune/dice/rainbow/gambler/hunter/pirate/candy/bubble/line/lightning/phoenix/lava/cyber/crystal/chest/space/hiding/headless/shell。

## 📁 物品 Items (只放指针)
46 件装备**源头在 `src/data/equipment.ts`**。6 件是 PoC 自加(孵化器/电棍/竹叶/小龟帽/剑/壳), 是认可的添加非自创。重做某件时才建子元素。

---

## 📁 UI / UX
- 缩放: FIT(菜单/选龟) / ENVELOP(桌面战斗) / 触屏设备战斗强制 FIT 防裁切。
- `--poc-ui-scale` = innerHeight/720 (钳 0.8–1.7), 战斗 DOM 浮层等比缩放。
- HUD 走 DOM overlay (scene-turtle-dom) 锚槽位, 不随龟身动画乱飞。
- 顶栏: 回合 banner + 时间轴(回合/事件/商店节点) + 整局规则徽章。
- 详情面板(每次打开重算 fit)、战斗日志(已封顶 MAX_LINES)、iOS 安全区 + 竖屏拦截。

## 📁 美术 Art
- **像素风**: NEAREST filter (image-rendering:pixelated 等价)。
- **字体**: 待统一为开源像素中文 (Fusion Pixel/Zpix), 替掉 m6x11+YaHei 混搭 (V3 阶段0)。
- **剪影阴影**: 角色阴影=龟剪影 (复制精灵 setTintFill 黑) + 压扁躺地 + 朝一侧投 + 半透明柔边; 全场单一太阳统一方向(不镜像); 见 applyShadowTransform, bake 值在 makeView; dev `__shadowTuner()` 可调。
- **转场/粒子/调色**: V3 阶段1 (水波/气泡过场、环境粒子、bloom/暗角后处理)。

## 📁 音频 Audio
- SFX 事件总线 (命中/暴击/技能/治疗/护盾/死亡/UI) → 接 `src/systems/sfx-synth.ts` 钩子; V3 阶段2 用 CC0 占位。
- BGM: 菜单/战斗/Boss 三条已有, 补淡入淡出 + 激烈度切换。

## 📁 发布 & 集成 Tech
- **dist** = Vite 构建产物 (`npm run build`), **不进 git** (gitignore; 317MB, 重复 public 源资产)。
- 部署 = **Vercel** (vercel.json buildCommand 在云端 build); 给玩家发**线上网址**, 不是 GitHub ZIP (ZIP 里没 dist → 打不开)。
- 给第三方: **dist.zip 离线交付** + `INTEGRATION.md` (iframe / 同源子路径 / 整页托管; 必须 http 服务, file:// 打不开)。
- **数据契约**: 宿主写 localStorage `petState` { pets:[{id,owned}], levels, coins } 控制玩家拥有哪些龟/等级/币。
- 版本: git tag (v1 已交付); 每个发布里程碑出一版 dist + tag。

## 📁 剧情 Story
暂无 (Icebox)。

---

> 维护约定: 这些是**设计意图**层; 具体数据/代码改动以仓库为准, 我(程序侧)在 PM-BOARD.md/记忆同步。
