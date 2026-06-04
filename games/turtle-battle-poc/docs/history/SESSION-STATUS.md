# SESSION-STATUS — JS 对齐进度

## 本次 session 工作汇总 (A55–A82)

### A78–A88 新增 (P0 全部清完 + P1 5 项 + P2 5 项)

#### P0 (A78-A82): 战斗规则/羁绊/事件/召唤 全部 6/6
- **A78** 护盾顺序 bubble→aura→shield (damage.ts; JS combat.js:962-966)
- **A79** 战斗规则重写 7 种 (rule-effects.ts): 烈焰/雷暴/铁壁/狂暴/装备/下雨/深海, +深海 magic ×0.8
- **A80** 元素 ×3 羁绊 turn-start 灼烧 (JS turn.js:71-83) + lastRoundStartTurn 守护 (修复 applyRulePerTurn 每 actor 重复 6 次→ 1 次)
- **A81** 6 个 env 事件数值对齐 JS events.js:33-98 + _thunderstormTurns 持续触发
- **A82** 4 种召唤物登场 (缩头龟 summonAlly / 海盗龟 pirateShip + 自动开炮 / 水晶龟 / 糖果龟)

#### P1 (A83-A86): 视觉/音效 5 项
- **A83** 同段飘字按 type 分行 (true/crit row 0, magic row 1, phys row 2, shield/heal row 3, dot row 4)
- **A84** attack-hop 4 段链式 (crouch → jump arc → land → return) + 击退弧线 4 段 (launch up → apex → bounce land → walk home)
- **A85** 近战 arc trail VFX (金色彗星 12 段贝塞尔 + impact 14 粒子 burst + flash 圈)
- **A86** SFX per dmg type (magic detune +500/rate 1.15, true -500/0.92, dodge 高音 whoosh)

#### P2 (A87-A92): turn-begin / 装备 / 形态切换 / 中立 / combat 层
- **A87** 6 种 passive: bambooCharge / chestTreasure rum / candySteal / crystalImmortal / rainbowPrism / gamblerFateWheel
- **A88** 4 件复杂装备: 龙蛋喷火 / 迷你水晶 A&B 引爆 / 海螺小虫 / 生命珍珠火球
- **A89** bambooCharge 触发 hook (1.5×ATK 强化攻击) + 二头龟 form swap 完整版 (ranged↔melee 切技能/属性/switch-attack)
- **A90** cyberDrone 浮游炮 (每回合 +1 + 攻击随机敌) + 死亡变机甲 (mechBody 接管)
- **A91** 中立生物 (宝箱怪/巨蟹/海葵母) — 3/6/9/12 回合 60% spawn + 跨阵营 KO 拿首杀大奖/后杀小奖
- **A92** combat 4 层: judgement passive + _equipSplash 30% + gamblerMultiHit + gamblerPierceConvert buff

## 本次 session 工作汇总 (A55–A77b)

### 主要完成
- **3v3 重构** (A45): 6v6→3v3, side-block 回合, autoAssignSlots 菱形阵
- **战斗本体 + 朝向** (A56): body PNG (非头像), JS 资源默认朝左
- **战斗流 side-block** (A55): 左 3 全打→右 3 全打→round++, 首回合 cap 2
- **AI 升级** (A52, A58): heal/shield/ult 偏好 + 1.2s 延迟 + 特殊宠物策略
- **passive 实质化** (A57): lavaRage 怒气 / undeadRage HP-scaling / frostAura 登场
- **on-hit 链** (A53, A59): triggerOnHitEffects 接入 dealPhysical/Magic + 14 直接 applyRawDmg
- **DoT 飘字** (A71): burn/poison/bleed/curse 飘字
- **buff icons 实时** (A68, A69): PNG status + 文字 chip
- **多段间隔** (A63, A65, A77b): sleep(280) + HP 同步 + 受击抖动
- **技能 brief/detail 切换** (A63): 详细 ▾ 按钮
- **羁绊 chip + 装备席 rail** (A64)
- **顶部按钮 + 深海币** (A67)
- **CSS battle-active** (A67/A73): 深海径向渐变填黑边
- **飘字字号缩放 + 暴击** (A68): JS engine.js:793 公式
- **Vercel 404 修复** (A66 中文名→ASCII / A72 去 `/` 前导 / A74 URL 尾随斜杠重定向)
- **stun/fear 跳过 + dodge buff + taunt 强制 + stealth 不可选** (A75): JS turn.js + combat.js + action.js
- **飘字堆叠 Y-offset** (A76): JS engine.js:759 _floatStacks
- **applyRawDamage 增层** (A74): physImmune / dmgReduce / undeadLock
- **基础伤害公式** (A77): bonusDmgAbove60 / fear 减伤 / diamondStructure flat reduce
- **hunterShot 完整** (A77b): execThresh + execCrit/CritDmg + multi-hit

## 我的认错
之前的"对齐"是浅层 — 只读了 turn.js/combat.js/main.js/action.js 的片段, 没有系统通读 26 个 JS 文件 (17923 行). 用户 1000+ 小时调的细节大量丢失.

## 还没读完的 JS 文件

| 文件 | 行数 | 状态 |
|---|---|---|
| ui.js | 1538 | 未读 — UI 主入口 |
| main.js | 1951 | 部分 — game mode 入口 |
| turn.js | 1434 | 30% — 完整回合 hooks |
| combat.js | 1097 | 30% — 完整 damage 流程 |
| engine.js | 1049 | 30% — 全局 helpers |
| state.js | 903 | 未读 — 状态管理 |
| equip-effects.js | 865 | 10% — 装备复杂效果 |
| dungeon.js | 852 | 未读 — 闯关 |
| ui-anim.js | 683 | 30% — sprite 动画 |
| skills/*.js × 34 | 6667 | 仅 4 个细读 (basic/shell/ghost/hunter), 30 个不到 |
| events.js | 436 | 未读 — 局中事件 / 中立生物 |
| bench.js | 607 | 部分 — drag-drop |
| ui-skill-text.js | 部分 | brief/detail 模板已用 |
| ui-summon.js | 未读 | 召唤物 UI |

---

## 已识别但**未修**的关键细节 (P0/P1/P2/P3)

### P0 — 玩家立刻感知 / 卡死  ✅ 全部完成 (A78–A82)
- [x] **召唤物系统简化版** (A82): 缩头乌龟 summonAlly / 海盗船 + 自动开炮 / 水晶球 / 糖果炸弹 — 已登场
  - 未完: summon 独立技能 AI / 浮游炮组装机甲 / 二头龟 form swap → 拆 P2
- [x] **护盾顺序 bubble → aura → shield** (A78, JS combat.js:962-966)
- [x] **战斗规则下雨天** (A79, turn.js:48-70)
- [x] **战斗规则深海之日 magic ×0.8** (A79, combat.js:919)
- [x] **元素 ×3 羁绊 turn-start 灼烧** (A80, turn.js:71-83)
- [x] **第 3/6/9/12 回合事件** (A81, events.js) — 6 env 事件数值对齐
  - 未完: 中立生物 (treasure golem/giant crab/anemone mother) → 拆 P2

### P1 — 高频体验
- [ ] **多段攻击节奏完整** (hunter.js:23-50 + basic.js:38-104): 前跳 240ms + 段间 sleep + projectile flight (240ms) + hit-shake 140ms + 段间 80-120ms
- [ ] **JS attack-hop CSS** vs Phaser tween dash — 视觉差大
- [ ] **击退动画** (basic.js:84-104): 1400ms 完整轨迹 (launch up + apex + ground + bounce + rise + walk home)
- [ ] **arc trail VFX** (basic.js:46-60): golden 弧线扫过 + impact burst sprite
- [ ] **暴击 ::before crit-dmg-icon** (battle.css:floating-num.crit-dmg::before) — Phaser 用 emoji 💥
- [ ] **floating-num.heal-num / shield-num / dodge-num** CSS 样式差异
- [ ] **同段飘字按 type 分行** (combat.js:218-238): TRUE 上 → MAGIC → PHY → shield → bubble (我加了 stackY 但没分 type)
- [ ] **SFX per dmg type** (engine.js:765-773): sfxHit/sfxCrit/sfxShieldBreak/sfxShield/sfxHeal/sfxDodge — Phaser 部分

### P2 — gameplay 完整度
- [ ] **每个 turn-begin passive** (turn.js:124-400): 大量 passive 未实质化:
  - chestTreasure rum 8% HoT
  - candySteal D&D Life Drain
  - crystalImmortal turn 10 +5000HP/+400ATK
  - gambler fateWheel 4 花色抽属性
  - rainbowPrism 随机增益
  - pirate ship 第 3 回合召唤
  - bambooCharge 每 2 回合充能
- [ ] **复杂装备效果** (equip-effects.js): 龙蛋 / 生命珍珠 / 海螺 / 迷你水晶球
- [ ] **calcCrit 函数统一** (combat.js): JS 用 calcCrit 返 {isCrit, critMult}, Phaser 分开
- [ ] **gamblerPierceConvert buff** (combat.js:178-180): X% main 转 true
- [ ] **inkMark deferred damage** (combat.js applyRawDmg)
- [ ] **judgement passive 追加魔法伤** (combat.js:244-261)
- [ ] **_equipSplash 单体溅射 30%** (combat.js:269-280)
- [ ] **gamblerMultiHit 追打** (combat.js:799-825)
- [ ] **海葵母 _anemoneShield** (combat.js:877)
- [ ] **黑洞 isInBlackhole** (combat.js:872)
- [ ] **碳壳叠层** (combat.js:972-996)
- [ ] **bubbleBind perHitLoss** (combat.js:583-598)
- [ ] **trap 夹子反击** (combat.js:633-645)
- [ ] **buff stat recalc 完整** (turn.js:1018-1059): 我 port 简版, JS 有 hasHpScalingPassive 等
- [ ] **二头龟 form swap** (twoHeadSwitch melee/ranged)
- [ ] **lava transform countdown** 已部分 (A57)
- [ ] **mech transform 8 帧 + 粒子汇聚** (action.js:299+)

### P3 — 后期 / 视觉
- [ ] **中立生物** (events.js): 海葵母 / 巨蟹 / 神龛 / 神秘商人 / 宝箱怪
- [ ] **dungeon 5 关完整逻辑** (dungeon.js 852 行)
- [ ] **drag-drop 装备**
- [ ] **bench 满席给全队回血** (bench.js:30-54)
- [ ] **equip pick 3 选 1 UI** (action.js:115-172)
- [ ] **每个 skill 独立 sprite anim** (ui-anim.js sprite-frame strategy)
- [ ] **targetable / active-turn CSS 高亮** (action.js:234+)
- [ ] **enemy 装备席 rail** (index.html L468)
- [ ] **calcCrit 整合 + 全程 calcCrit 替代散 rollCrit** (统一架构)
- [ ] **PVP online sync** (online.js 不做)

---

## 接下来的工作策略

1. **优先 P0**: 召唤物 + 护盾顺序 + 战斗规则 (下雨/深海)
2. **P1 视觉**: 攻击 hop / 击退 / arc trail / 同段飘字分类型
3. **P2 装备 + passive**: equip-effects.js + turn.js 完整 hook
4. **P3 stage / 中立**: 后期

每完成一项 commit + 更新此文件. 不再投机覆盖.
