# PoC-Phaser 需求文档 (v1.0, P104+)

> 本文档列所有 P104+ 阶段要做的根基修复 + 内容迭代。**全部 1:1 JS** 是硬底线 —
> 任何"自创""简化""近似" 都视为 bug, 必须先看 JS 源码 (`games/turtle-battle/js/`).
> 项目工作流: 一项一 commit, 全部完成后汇报.

---

## 第一部分: 根基修复 (无新内容)

### A. 已完成 (P78-P103) 概要
- 闪电劈下 / 灼烧 / ghost / ninja-dash / cyber-mech VFX 接入 (P78/P84/P86/P90)
- 27 龟技能 1:1 audit + 18 大 bug (lightning shock/crystal explosion/lava burn/...) 
- 30 装备 audit + 双发/dead 字段/命名错配 19 bug 修
- mapCoverPos resize / 攻击 hop / 字体 / banner 时序 / 战斗日志 / dmg 统计面板
- 主菜单按钮 "鼠标停在目标位卡半" (P103 hover killTweens 误杀 slide-in)

### B. 已知遗留 (需在 P104+ 阶段保护根基时一并修)
- **dealMagic 缺 crit roll** (system-level, 20+ 魔法技能少 ~12-15% 伤害)
- **大量 emoji float 自创** (🩸 ❤ 🌿 🌑 🟢) — 只修了 soulReap, 其他 50+ 处待查
- **cyberBeam/ninjaImpact/turtleShieldBash 微观动画自创近似** (宏观对齐但 keyframe 不精确 1:1)
- **水晶球完整 spawn + beam logic** — 当前 PoC 只 "+30% maxHp 护盾" 占位, JS 是独立 fighter + 友方行动后 2 段 beam + 共享 _crystallize stack

---

## 第二部分: 资源补全 (P105-P107)

### P105: 复制用户提供的 6 张装备图 (在 repo 根)
- `小龟剑装备.png` → 小龟剑 (初始, +10 ATK + 劈砍)
- `小龟壳装备.png` → 小龟壳 (初始, +5 def +5 mr + 格挡)
- `小龟帽装备.png` → 小龟帽 (初始, +70 maxHp + 复苏)
- `电棍装备图.png` → 新装备 (3 层电击)
- `竹叶装备图.png` → 新装备 (生长充能)
- `小龟龟盾技能图标.png` → 龟盾 skill icon

### P106: 消耗品图标补全
当前 PoC pets.ts 用 emoji 占位 (💣 💉 🛡 🩹 🧴) — 改用 PNG (JS 走同款路径需 emoji 即可, 但视觉
更精致). 优先级低, 如 JS 也用 emoji 则保持 1:1.

### P107: 宝箱怪 (chest enemy) 入场动画
宝箱龟有专属 chest sprite. 检 JS `pets/animations/chest/` 是否有 + 接入.

---

## 第三部分: 新装备 (P108-P110)

### P108: 孵化器 (Incubator) — +20 maxHp
**孵化进度**:
- 每回合 +5 (回合开始)
- 敌方单位死亡 +10 (即时)
- 我方单位死亡 +15 (即时)
- 携带者造成伤害 ×0.1 (实时累加)
- 携带者承受伤害 ×0.1 (实时累加)

**临时等级**: 进度达 100 → 等级 +1 (上限 +3), 进度重置 0.
**临时等级效果**: 每级 +5% 基础属性 (atk/def/mr/maxHp/crit). 仅本对局.
**UI**: 装备图标下小进度条 (0-100%).
**灰字**: "每一级提升 5% 基础属性, 临时等级只在这个对局生效"

### P109: 电棍 (Stun Baton) — +20 maxHp +5 def +5 mr
- 装备时拥有 3 层电击层数 (`_stunBatonStacks: 3`)
- 携带者**施法后** (cast 完成后), 单体技能 → 电击 target / 非单体 → 电击随机敌人
- 电击: 30 魔法伤害 + 眩晕 1 回合
- 消耗 1 层电击. 层数 = 0 不再触发 (装备不消失)
- **灰字**: "层数为 0, 这个装备不会消失"

### P110: 竹叶 (Bamboo Leaf) — +50 maxHp
- 装备时获得 1 次**生长充能** (`_bambooLeafCharge: 1`)
- 施法后附带强化攻击:
  - 随机敌人 → (35 + 携带者 20% maxHp) 魔法伤害
  - 回携带者 20% maxHp
  - **永久** +100 maxHp (基础值, 持续到本局结束)
- 消耗充能后**装备不摧毁**
- **灰字**: "消耗这个充能后不会摧毁这件装备"

---

## 第四部分: 数据统计显示 (P115)

每件装备在 BENCH / 装备图标 hover/tooltip 时显示 grey 灰字实时统计.

举例 (用户列):

### 小龟帽 (P115a)
- 灰字: "治疗效果: N"
- N = 本场累计 heal 实际生效量 (受 healReduce / 护盾减益影响)

### 小龟剑 (P115b)
- 灰字: "造成伤害: N" + "治疗效果: M"
- 群体技能优先选前排目标

### 小龟壳 (P115c)
- 灰字: "已格挡的伤害: N"
- 不包括真伤 — 每次承受非真伤 -2 (累加 N)

### 雷鸣贝壳 (P115d)
- 灰字: "造成伤害: N"

### 灼烧珊瑚 (P115e)
- 灰字: "施加的灼烧层数: N"

### FPGA 板 (P115f)
- 灰字: "已提供的属性: N atk / M def / L mr / ..." (4-state 累积)

### 小熊玩偶 (P115g)
- 灰字: "小熊已造成伤害: N"

### 冰冻水母 (P115h)
- 灰字: "获得的护盾: N / 眩晕次数: M"

**实现**: BattleStats 加 per-equip tracking dict, equipment.ts 各 hook 写入,
BenchRail / equip badge tooltip 渲染对应 stat.

---

## 第五部分: 对局流程改造 (P111-P113, P116)

### P111: 全员 +100 maxHp (耐久度)
所有 fighter base maxHp += 100. data/pets.ts 全部 +100 或运行时统一加.

### P112: 初始装备阶段 (3 选 1)
**PVP / 野生**:
- 第 1 回合开始时, **我方先选**: 弹 3 选 1 modal (从初始装备池抽 3 张)
- 选完轮敌方选 (AI 自动选 / PVP 对手手动)
- 选完才进入正常 turn 1
- 初始装备池: 小龟帽 / 小龟剑 / 小龟壳 + 其他根据需要扩展

**深海**:
- 仅第 1 关第 1 回合有初始装备选 (人机不拿)
- 跨关不重新触发

### P113: 顶部回合条 (5-window 滚动 timeline)
显示当前回合 ± 2 的预览, 比如:
```
[我方选初装]-[我方回合]-[敌方选初装]-[敌方回合]-[我方回合]-[敌方回合]-[随机事件]-...
```
显示 5 个: `当前-2 / 当前-1 / 当前 / 当前+1 / 当前+2`, 当前居中高亮, 每过一回合滚动.

**实现**: BattleTopRow 新增 `turnTimeline` 子组件, watch this.turn 变化平移.

### P116: 小商店改 4/8/12... 阶段
当前 PoC `if (this.turn % 2 === 0 && this.turn > this.lastShopTurn)` — 偶数回合弹店.
改为 `this.turn % 4 === 0` (第 4/8/12/16... 回合).
JS 现行规则也是每 2 回合, 但用户要求改 4 回合.

---

## 第六部分: 技能改动 (P114)

### P114: 闪电龟 团队鼓舞 → 涌动 (4 cd)
**旧** (`commonAtkBuff`): 全队 ATK +15% 3t
**新** (`lightningSurge2` 新 type 或重定义 `lightningSurge`):
- CD 4
- 接下来 **2 回合** 内被动电击 (`lightningStorm` 8-stack 引爆) **真伤 +50%**
- 立即电击 target 造成被动电击伤害 (1×ATK × shockScale × 1.5 = 1.5×ATK*0.82×... ? — 跟 JS spec 对齐)

**实现**:
- pets.ts: 改 lightning 第 2 技能定义
- skill-handlers.ts: 新增 `surge` handler
- passive-triggers.ts: lightningStorm shock detonate 检查 `caster._lightningSurgeActive` 时 ×1.5 真伤
- 持续 2 回合: `caster._lightningSurgeTurns = 2`, 每回合 -1

---

## 第七部分: 完成标准

### 验收
1. **不允许"自创""简化""近似"** — 所有数值/动画/视觉**必须**有 JS 源码引用 (注释中标 `JS file.js:line`)
2. **无视觉异常**:
   - 龟身大小不随机变化
   - 主菜单 hover 不卡半 (已修)
   - 战斗日志 / 伤害统计排版正常
   - 攻击动画跟 JS attack-hop 一致
3. **类型检查 0 错误** (`npx tsc --noEmit`)
4. **每项一个 commit**, commit message 注明 JS 源 + 修复要点

### 顺序
P104(本文) → P105(图) → P106-P107(资源) → P108-P110(新装备) → P111-P113(流程)
→ P114(技能) → P115(统计) → P116(商店) → P117(最终汇报)

---

## 第八部分: 工作流红线

1. **写代码前**: 先 grep / cat 对应 JS 文件 (e.g. 装备走 `js/equip-effects.js` + `js/engine.js`).
2. **类似 spritesheet 配错的事件不可再发生** — 任何资源加载先用 `file` 命令验证 PNG 尺寸.
3. **任何 emoji float / 自创 buff type / 自创关键词颜色都视为 bug**, 必须删.
4. **大改前先 commit + push**, 防止状态污染.

— 文档生成时间: P104, 2026-05-19 (commit `0631049` 之后)
