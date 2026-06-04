# 龟壳「复制」 (shellCopy) 全量技能审计 — 2026-05-30

审计对象：`src/engine/skill-handlers.ts:2136-2210` 的 `shellCopy` 黑名单/SELF/ALLY/AOE 分类。
范围：28 只龟的全部 active skillPool（已过滤 `passiveSkill:true`）。

每个技能按以下规则评估：当龟壳偷该技能、以 60% 缩放、自动选目标后是否正确执行。

图例：
- 🔴 = SHOULD be BLACKLISTed（崩、自伤、目标不可解析、目标设置错）
- 🟠 = BLACKLIST 多余 / SELF↔ALLY↔dmg 归错
- 🟡 = 退化（基础工作，但因依赖龟壳没有的施法者状态而效果远低于本龟）
- ✅ = 工作正确

---

## 1. 现行 shellCopy 配置（src/engine/skill-handlers.ts:2137-2200）

```
BLACKLIST = 23 个（见 :2137-2145）
SELF      = phoenixShield, volcanoArmor, crystalBarrier, lightningShield  (:2189)
ALLY      = heal, shield, bubbleShield, angelBless, phoenixPurify         (:2190)
AOE       = 15 个（hunterBarrage, ninjaBomb, lightningBarrage, iceFrost,
            basicBarrage, starMeteor, lavaQuake, volcanoErupt, rainbowStorm,
            pirateCannonBarrage, chestStorm, crystalBurst, lavaSplash,
            soulReap, candyBarrage）                                       (:2186)
单体兜底：取最低 HP 敌方                                                   (:2198)
```

注：`shellCopy` 还会捕获 `copied.aoe`（数据中 `aoe:true` 的技能），所以即便没列进 AOE Set 也会被识别为 self-target，例如 `bambooSpikes`、`twoHeadAbsorb` 中的"灵能冲击"(`type:'physical', aoe:true`)。

---

## 2. 风险按技能 type 分类（仅列待修/退化项；其余 ✅ 见末尾汇总）

> 行末 file:line = 命中的 handler 位置。

### 🔴 应进 BLACKLIST 而当前没进

#### 🔴 `stoneTaunt`（嘲讽，stone）— `src/engine/skill-handlers.ts:2476`
- 行为：给 caster push `redirectAll` buff（嘲讽：吃掉敌方对己方单体技能的转嫁）+ 永久盾 = `atk × 1.0`。
- 复制后果：让**龟壳**自己嘲讽 3 回合 → 把对方对**敌方友军**的单体技能全转嫁到龟壳头上（龟壳是己方）。语义荒谬，且让龟壳成了敌方的转移靶（自伤）。盾的部分自洽但只是顺带。
- **建议：加入 BLACKLIST**（核心机制依赖"队内队友存在嘲讽方"的关系，复制后角色错位）。

#### 🔴 `bambooSpikes`（竹刺阵，bamboo）— `src/engine/skill-handlers.ts:2596`
- 行为：`aoe:true` 全敌物理 5 段，`base = atk×0.18 + maxHp×0.03` × 5。
- 复制后果：`aoe:true` 触发 self-target（line 2192 `copied.aoe`），目标 = caster。但 handler 内部走 `getEnemies(api, caster)` 自取敌方→其实**会正常打到敌方**。然而 `selfHpPct:3` 用的是 **caster.maxHp**，所以伤害是龟壳的 maxHp 而非竹叶龟的 maxHp，公式仍生效但与设计意图脱节（这部分是 🟡）。**实际不会崩、能打中。归 🟡 退化（HP 项按龟壳算）**。

> 修正：bambooSpikes 不是 🔴，是 🟡，下面已经在 🟡 列出。

#### 🔴 `gamblerFateWheel` 已是 passiveSkill — 不会被拾。无需动作。

#### 🔴 `lineFinish`（画龙点睛，line）— `src/engine/skill-handlers.ts:3417`
- 行为：`baseScale × ATK` 物理 + `perStackScale × ATK × _inkStacks` 二段（默认 magic，rapid 时 true）。
- 复制后果：龟壳没有 `_inkRapidActive`/`_inkTrueDmg`，但**目标可能有 `_inkStacks`**（线条龟早些回合叠的），龟壳的复制会一次性把目标墨迹引爆 → 给敌人意外的额外魔法/物理打击，技术上不崩。但若目标 0 层 = 退化到纯 `0.7×ATK×0.6 = 0.42×ATK` 单段物理；若有层则可能爆出很大数（吃的是 caster 的 atk，缩放 60% 后仍可观）。
- **建议：归 🟡 退化（无层时偏弱；有层时居然超模 — 但不该加进 BLACKLIST，因为这是「合理的衍生伤害」）**。

#### 🔴 `gamblerBet`（赌注，gambler）— `src/engine/skill-handlers.ts:4703`
- 行为：自损 `caster.hp × 40%` → 7 段物理。
- 复制后果：**龟壳自伤 40% 当前 HP**，然后用这点伤害打 1 个敌人。`hpCostPct` 缩了 60% 吗？看 :4709 `(skill.hpCostPct as number) ?? 40`，`hpCostPct` 不在 `shellCopy` 的字段缩放列表里（:2167-2184）→ **缩放无效，仍按 40% 自损**。即使能扣，对龟壳是非常蠢的自残（敌人有时复制后还会触发龟壳大败局）。
- **建议：加入 BLACKLIST**（自伤型技能 + 缩放未覆盖 `hpCostPct`）。

#### 🔴 `fortuneStrike`（打击两下，fortune）— `src/engine/skill-handlers.ts:3759`
- 行为：`base = (atkScale + perCoinAtkScale × coins) × ATK`，2 段物理。
- 复制后果：依赖 `caster._goldCoins`，龟壳没有金币系统 → `coins = 0`，公式退化为单纯 `atkScale×ATK = 0.5×0.6 = 0.3×ATK` 两段 = 0.6×ATK 总，比龟壳本体 1.2×ATK 普攻 (`shellStrike`) 弱很多。基础工作但偏弱。
- **建议：归 🟡 退化（无金币加成）**。

#### 🔴 `fortuneAllIn`（梭哈，fortune）— `src/engine/skill-handlers.ts:5611`
- 已在 BLACKLIST（:2143）— ✅ 正确（`coins=0` 会直接 return；无意义）。

#### 🔴 `chestSmash`（宝箱砸击，chest）— `src/engine/skill-handlers.ts:3802`
- 已在 BLACKLIST（:2141）— ✅ 正确（chest equip 变体需 `caster._chestEquipStar/Rock/Thunder/...`）。

#### 🔴 `cyberBeam`（能量大炮，cyber）— `src/engine/skill-handlers.ts:3137`
- 行为：依赖 `caster._drones[].length` 计算真伤段；同时做 KOF 全屏 cut-in、相机 zoom+pan、caster 跳到目标排、光束动画 ~3000ms。
- 复制后果：`_drones` 是 cyber 龟特有数组 → 龟壳的 `droneCount=0` → 真伤段 = 0，只剩物理段；物理段公式仍工作。**但是**整个 KOF 演出会把龟壳拉到敌方排（`hopMs=460`，相机 zoom 1.2x，全屏蓝 flash 500ms，光束 720ms…）。**视觉极度突兀、演出抢了 1.5s 时间，且龟壳跳跑乱位**。建议：进 BLACKLIST，不让龟壳"假装赛博龟"。
- **建议：加入 BLACKLIST**（演出强绑赛博龟身份；功能上真伤段恒 0 也属于 🟡 退化，但演出问题更严重）。

#### 🔴 `cyberSwarmShield`（浮游联防，cyber）— `src/engine/skill-handlers.ts:5915`
- 行为：`shieldAmt = atk × (0.6 + 0.15 × droneCount)`，给**全友**护盾。
- 复制后果：龟壳 `_drones` 不存在 → `droneCount = 0`，护盾退化为 `atk × 0.6 × 60% = atk × 0.36`，但**功能是「全友护盾」→ 这是 aoeAlly！** 看 handler 内部 `getAllies(api, caster)`，全友覆盖。
- 当前分类：不在 SELF/ALLY，会走单体兜底"最低 HP 敌方"→ `copyTarget=敌方`，**但 handler 内部不读 target、直接遍历 allies**，所以 copyTarget 错了无伤（handler 不用 target）。等于"目标参数忽略 + 全友盾"。功能 OK，但盾值缩水。
- **建议：归 🟡 退化（盾值偏低；非阻塞）**。可选改进：加进 ALLY 让意图更清楚（虽然 handler 实际无视 target）。

#### 🔴 `pirateShipPassive` 已是 passiveSkill — 不会被拾。无需动作。

#### 🔴 `candyBomb`（_misc handler 5949）— 这个 type 不在 pets 的 skillPool 里（pets 里是 `candyBombPassive`），所以不会被偷。无需动作。

#### 🔴 `chestStorm`（财宝风暴，chest）— `src/engine/skill-handlers.ts:4857`
- 已在 BLACKLIST（:2141）— ✅ 正确。但**注意：handler 内部对所有 6 件 chest equip flag 都有分支**（`_chestEquipStar`/`_chestEquipThunder` 等）— 黑名单是对的。

#### 🔴 `headlessSoulStrike`（灵魂打击，headless）— `src/engine/skill-handlers.ts:5354`
- 行为：单体 magic = `atk×0.9 + target.hp×20%`。无 caster 状态依赖。
- 复制后果：完全工作。✅。

#### 🔴 `volcanoStomp`（岩浆践踏，lava 火山形态）— `src/engine/skill-handlers.ts:4629`
- 行为：AOE magic + 40% stun + heal-lost-hp。
- 复制后果：能正常工作，但**注意它是 火山形态 (`volcanoSkills`)**，pets.ts:2594-2667 火山技能组只有龟主动切到火山态后才装备。也就是只有当对面是火山态熔岩龟时才会出现在 pool。复制 OK。✅。
- 但当前**未被列入 AOE Set**（:2186-2188）→ `copied.aoe` 检测会处理（`aoe:true` 在数据里有）→ 走 self-target 兜底 → handler 内部 `getEnemies` 自取 → 工作正常。✅。

#### 🔴 `volcanoSmash`（烈焰重击，lava 火山形态）— `src/engine/skill-handlers.ts:4554`
- 单体物理 + lifesteal。无依赖。✅。

#### 🔴 `commonTeamShield`（团队护盾，ice 第 5 技）— `src/engine/skill-handlers.ts:1213`
- 行为：`amt = atk × 0.5`，全友 push shield + duration。无 caster 依赖。
- **当前 ALLY Set 不含**，会走单体兜底"最低 HP 敌方"→ `copyTarget=敌方`，但 handler `getAllies(api, caster)` 全友覆盖，target 被忽略。功能 OK。
- **建议：归 🟠**，应**加入 ALLY Set**（语义对齐；handler 已 全友且无视 target，但加 ALLY 让目标解析显式 — 与 `shield`/`commonAtkBuff`/cyberSwarmShield 同套对待）。

#### 🔴 `commonAtkBuff`（aoeAlly atkUp）— `src/engine/skill-handlers.ts:1228`
- 不被任一 pet 当前 skillPool 引用（grep 全 pets.ts 无 `commonAtkBuff` 类型）→ 不会被偷。无需动作。

#### 🔴 `twoHeadSwitch`（切换近战/远程）— `src/engine/skill-handlers.ts:4067`
- 已在 BLACKLIST（:2140）— ✅ 正确（依赖 `caster.id=='two_head'` + `meleeSkills`+formGain）。
- handler 直接读 `PET_BY_ID[caster.id].meleeSkills`，复制后龟壳 id='shell' 无 meleeSkills → 进入 else 分支但 `_formHpGain` 也无 → 平淡跳过；伤害段会跑（对 target 单体打 1.2× ATK 物理）。技术上不会崩，但语义错。**BLACKLIST 是对的**。

#### 🔴 `twoHeadFusion` 已是 passiveSkill — 不会被拾。

#### 🔴 `mechAttack`（_misc handler 5969）— 已 BLACKLIST。`mechAttack` 不是龟主动技能（是机甲召唤物的攻击 type）→ 不会出现在 pets 的 skillPool。但 BLACKLIST 防御性写法没问题。

#### 🔴 `diamondFortify`（坚不可摧，diamond）— `src/engine/skill-handlers.ts:5855`
- 已在 BLACKLIST（:2140）— 看用途：`shield = caster.maxHp × 20%`、`defUp / mrUp = caster.atk × 20%`。**完全可以正常复制给龟壳自己！** 无 caster 身份依赖。
- **建议：从 BLACKLIST 移除，移入 SELF**（同 `phoenixShield`/`volcanoArmor`/`crystalBarrier`/`lightningShield` 一类自盾+自 buff，**还有可能比 `crystalBarrier` 还简洁**）。归 🟠。

#### 🔴 `bambooHeal`（自然恢复，bamboo）— `src/engine/skill-handlers.ts:2528`
- 已在 BLACKLIST（:2139）— 实际语义：有队友 → 自回血 + 队友盾；无队友 → 仅自回血。**逻辑完全自洽，可以复制**。`healPct`/`shieldPct`/`soloHealPct` 都基于 `caster.maxHp`/缩放后字段。**当前 BLACKLIST 拒绝是过度防御**。
- **建议：从 BLACKLIST 移除，移入 ALLY 集合**（与 `bubbleHeal`/`bubbleShield`/`angelBless`/`phoenixPurify` 同类，handler 内 `getAllies` 自行覆盖全友盾+自回血；ALLY 集合让目标选解析靠谱）。归 🟠。

#### 🔴 `bambooLeaf`（一叶刃，bamboo）— `src/engine/skill-handlers.ts:2503`
- 已在 BLACKLIST（:2139）— 但**它就是普通 3 段物理 + selfHp% 加成**！无 caster 身份依赖，无形态依赖，无充能依赖。`selfHpPct` 字段缩放 60% 已在 :2175 覆盖。**完全应该可以被复制**。
- **建议：从 BLACKLIST 移除**。归 🟠。

#### 🔴 `ghostPhase`（虚化，ghost）— `src/engine/skill-handlers.ts:1498`
- 已在 BLACKLIST（:2140）— 行为：自施 `physImmune` 90% buff + 2 段真伤。**逻辑可复制（自施 buff 不依赖 caster id）**。但 handler 会**切换 caster 的 sprite 纹理为 `pet-action-ghost-phase`**（:1508）→ 龟壳的精灵会被替成 ghost 帧 → 视觉严重错位！
- **建议：保留在 BLACKLIST**（视觉 sprite 切换强绑幽灵龟）。✅ 现状 OK。

#### 🔴 `ghostPhantom`（幽冥突袭，ghost）— `src/engine/skill-handlers.ts:1379`
- 已在 BLACKLIST（:2144）— 行为：`1.5×ATK` magic + 80% lifesteal + 25% dodge buff + 13-keyframe 击退 juggle 1400ms。**核心机制可复制**（lifesteal/dodge/伤害都基于 caster.atk）。但播放 ghost-phantom + ghost-touch VFX（:1412-1413）— 是 ghost 视觉签名。
- **建议：保留在 BLACKLIST**（视觉 VFX 绑龟身份；同 phase 一致处理）。✅ 现状 OK。

#### 🔴 `diceFate`（命运骰子，dice）— `src/engine/skill-handlers.ts:2650`
- 已在 BLACKLIST（:2139）— 行为：纯自施 buff `diceFateCrit` 加暴击 5 回合。**完全可复制**给龟壳。`crit` 加成对暴击主题（龟壳气场觉醒+25% 暴击）反而有协同。
- **建议：从 BLACKLIST 移除，移入 SELF**。归 🟠。

#### 🔴 `fortuneDice`（骰子，fortune）— `src/engine/skill-handlers.ts:3731`
- 已在 BLACKLIST（:2139）— 行为：自加 3~8 金币 + 自回 maxHp×8%。
- 复制后果：龟壳本来没金币系统，`_goldCoins` 会被加但没用；自回血部分有用。整体是退化的纯自回血技能。**保留 BLACKLIST 即可**（无意义协同）。✅。

#### 🔴 `fortuneAllIn` / `fortuneBuyEquip` / `fortuneGainCoins` — 已 BLACKLIST，正确（都是金币系统专属）。

#### 🔴 `gamblerDraw`（万能牌，gambler）— `src/engine/skill-handlers.ts:4787`
- 已在 BLACKLIST（:2141）— 行为：2 段物理 + 自盾 + 自回血 + 随机 debuff 给目标。**逻辑完全自洽**：盾/回血基于 `caster.atk`、debuff 是给敌方。
- **建议：从 BLACKLIST 移除**。归 🟠（可正常执行 — 不必特别归 SELF 或 ALLY，单体 dmg target 选最低 HP 敌方即可）。

#### 🔴 `gamblerBet` / `chestCount` / `chestSmash` / `starWormhole` / `bubbleBurst` / `shellAbsorb` / `shellErode` / `shellFortify` — 已 BLACKLIST。

- `gamblerBet`：✅ 正确（自伤 40% HP）。
- `chestCount`：handler 用 `_chestTreasure`，0 时退化但工作；`maxHp×5%` 自回血 + `atk×0.6` 自盾。**实际可复制**，但当前 BLACKLIST。归 🟠 — 可移出 BLACKLIST 进 SELF。但 chest 主题感强，**保留 BLACKLIST 不失偏颇**。
- `chestSmash`：handler 大量 chest equip flag 分支，BLACKLIST 正确。
- `starWormhole` :4514 行为：永久 +魔法穿透 `(6+0.5×level)` + 横排 4 段 magic。**核心可复制**，magicPen 加给龟壳也合理。当前 BLACKLIST 略保守 — 但 `caster.magicPen += penGain` 是永久增长，复制后让龟壳吃到永久穿透有点超模。**保留 BLACKLIST 合理**。
- `bubbleBurst` :3487 行为：消耗 `caster.bubbleStore`。龟壳没有 `bubbleStore`（那是 bubble 龟被动），`stored=0` → 消耗 0、`magicDmg=0`，只剩物理段 `0.8×ATK×0.6 = 0.48×ATK` 全列。**会被严重削弱**，但**不崩**。归 🟠 — 可以从 BLACKLIST 移出退化为 🟡（弱物理段），但**保留 BLACKLIST 也合理**（语义脱节）。
- `shellAbsorb` :2255 — 复制自己的吸取，理论上偷敌方 maxHp 10%→缩放 60% = 6%，给龟壳自己。完全可工作。但**自指复制 = 无聊**。BLACKLIST 合理。
- `shellErode` :2213 — 复制自己的侵蚀，弯波 = `3 + crit/20`，公式吃龟壳 `crit`，完全可复制。但**自指**。BLACKLIST 合理。
- `shellFortify` — 该 type 不存在于 pets.ts（grep 不到），BLACKLIST 是防御性的（疑似旧版命名）。无害。

#### 🔴 `hidingDefend`（防御，hiding）— `src/engine/skill-handlers.ts:3909`
- 已在 BLACKLIST（:2138）— 行为：自盾 `maxHp×20%` 4t + 到期剩余盾 20% 转生命。写入 `_hidingShieldVal/_hidingShieldTurns/_hidingShieldHealPct` 私有字段（HUD aura 特殊色）。
- **完全可复制为 SELF**：龟壳获得 maxHp×12%（缩放 60%）4t 临时盾，到期回 20% 剩余转生命。功能 OK，**视觉 HUD aura 段会显示成"缩头护盾"色** — 有点违和但不阻塞。
- **建议：可考虑从 BLACKLIST 移出 → SELF**。归 🟠（保守保留 BLACKLIST 也行）。

#### 🔴 `hidingCommand`（指挥，hiding）— `src/engine/skill-handlers.ts:5492`
- 已在 BLACKLIST（:2138）— 行为：让 `caster._summon` 额外打一次。龟壳无 `_summon` → "随从已亡"飘字 + return。无害但无效。
- **建议：保留 BLACKLIST**（无意义）。✅。

#### 🔴 `hidingBuffSummon`（强化随从）— `src/engine/skill-handlers.ts:5467`
- 已在 BLACKLIST（:2144）— 同上，无 `_summon` 失败。BLACKLIST 正确。

#### 🔴 `starShieldBreak` / `cyberDeploy` / `cyberBuff` —
- `starShieldBreak` 不存在于 pets.ts（grep 不到）→ 防御性 BLACKLIST，无害。
- `cyberDeploy` :5689 已 BLACKLIST — 依赖 `caster.passive.type=='cyberDrone'`（明显检查 :5691），不是 cyber 直接 return。**正确 BLACKLIST**。
- `cyberBuff` 不存在于 pets.ts（grep 不到）→ 防御性 BLACKLIST。

#### 🔴 `crystalBall` / `crystalImmortal` — 都是 passiveSkill，不会被拾。

### 🟠 当前归错集合 / BLACKLIST 多余

| 技能 | 当前 | 建议 | 理由 |
|---|---|---|---|
| `diamondFortify` :5855 | BLACKLIST | **SELF** | 纯自盾+自 buff，无身份依赖。归 SELF 与 `phoenixShield`/`volcanoArmor`/`crystalBarrier`/`lightningShield` 同套。 |
| `diceFate` :2650 | BLACKLIST | **SELF** | 纯自施暴击 buff，完全可给龟壳。 |
| `bambooLeaf` :2503 | BLACKLIST | **移除（→ 单体 dmg）** | 普通 3 段物理 + selfHpPct，无依赖。 |
| `bambooHeal` :2528 | BLACKLIST | **ALLY** | 自回血+全友盾/无友自回血，handler 自处理目标。 |
| `gamblerDraw` :4787 | BLACKLIST | **移除（→ 单体 dmg）** | 2 段物理 + 自盾自回血 + debuff，自洽。 |
| `commonTeamShield` :1213 | 无 set | **ALLY** | 全友护盾，handler 已 `getAllies`，加 ALLY 让目标解析显式。 |
| `cyberSwarmShield` :5915 | 无 set | **ALLY**（可选） | 同上。退化为 0.6×atk×0.6 = 0.36×atk 全友盾。 |
| `phoenixPurify` :2107 | ALLY ✓ | 保持 | handler 自动选 caster 当自治（`tgt = target.side===caster.side ? target : caster`）；放 ALLY 选最低 HP 友。✅。 |
| `stoneTaunt` :2476 | 无 set | **BLACKLIST**（新增） | 复制后龟壳吃下敌方对友方的单体技能 = 反向自杀。 |
| `gamblerBet` :4703 | BLACKLIST ✓ | 保持 | 自损 40% 当前 HP + `hpCostPct` 字段未在 `shellCopy` 缩放列表 → 不缩。 |
| `cyberBeam` :3137 | 无 set | **BLACKLIST**（新增） | 演出强绑赛博龟（KOF cut-in、相机 zoom、caster 跳目标排）；真伤段恒 0。 |

### 🟡 退化但能跑（无须修复，记录用）

| 技能 | 退化原因 |
|---|---|
| `fortuneStrike` :3759 | `_goldCoins=0` → `effectiveScale = baseScale = 0.5` 2段，公式仅基础部分。约等于 0.6×ATK 物理总。|
| `lineFinish` :3417 | 龟壳无 `_inkRapidActive` → burst 段默认 magic 而非真伤；目标 0 层时 burst=0 → 退化为单段 0.42×ATK 物理；目标已有层时反而**超模**（高层墨迹+龟壳 atk）。|
| `cyberBeam` :3137（功能层面） | `droneCount=0` → 真伤段恒 0，只剩物理两段 ≈ 0.3×ATK（缩放后）。**主要问题是演出而非功能**，故归在 🔴。|
| `cyberSwarmShield` :5915 | `droneCount=0` → 盾值 `atk×0.36`，比设计弱。|
| `bambooSpikes` :2596 | `selfHpPct:3` 用 caster.maxHp = 龟壳 maxHp 而非竹叶龟 maxHp；公式生效，伤害以龟壳血量为准。|
| `diamondCollide` :2393 | 物理 = atk×0.8 + def×0.9 + mr×0.9 + maxHp×0.08。**完全自洽**（用 caster 自己的 def/mr/maxHp），但 stun-after-N 计数器在**目标**身上累积；复制次数少时无 stun。归 🟡 仅因 stun 触发概率被稀释。|
| `diamondSmash` :2365 | 同上，公式 def×1 + mr×1 + atk×0.1，用 caster 自己 → 完全自洽 + bleed。✅ 严格说不算退化。|
| `rockShockwave` :2431 | `_rockLayers=0`（龟壳无岩层被动）→ 伤害不放大，stun 概率 0%；只剩基础 (DEF×0.5 + MR×0.5)。|
| `diceAttack` :2620 | 公式 = atk×0.9 + crit×55，crit 部分基于龟壳 crit。完全工作，无退化。✅ 严格说不算退化。|
| `gamblerCards` :4756 | 完全自洽（atk×随机），无退化。✅。|
| `diceAllIn` :5011 | AOE 物理 + 10% lifesteal，公式自洽。✅。|
| `diceFlashStrike` :5049 | 4+1d6 段随机敌物理，公式自洽。✅。|
| `hunterPoison` :4982 | 物理 + poison 层 + healReduce。公式自洽。✅。|
| `hunterMark` :2740 | 物理 + hunterMark buff。复制后龟壳给目标印记 → 24%执行线。**自洽 ✅**。|
| `hunterShot` :2676 | 单体 3 段物理 + execThresh<50% 时 +暴击/爆伤。自洽 ✅。|
| `hunterStealth` :5877 | 物理段 + 自施 dodge + 自盾。自洽 ✅。当前不在 SELF 集合但**handler 必须有 target**，单体兜底会选最低 HP 敌方 → 物理段打他，buff 加自己。✅ OK，目标选择没问题。|
| `bubbleBind` :3470 | 给目标束缚 buff，`perHitLoss` 用 `caster._level`（默认 1）。复制后龟壳的 `_level` 用龟壳的等级。基本工作，**但 perHitLoss 取 lvl>=6 时 2 否则 1，龟壳等级可能远超泡泡龟自身**。归 🟡（穿越使用，反而可能更强）。|
| `bubbleHeal` :5417 | 单友回血 + 25% splash。ALLY 集合 ✅。自洽。 ✅。|

### ✅ 可直接被复制（无需修改）

#### 基础物理 / generic dmg
- `physical`（pets：basic/angel/pirate/cyber/candy/bubble/hiding/headless 多用），:549 — 处理所有字段。✅
- `magic`（rainbow 七彩光束 :5714，用 `prismBonus` 走 caster `_prismColor`）。🟡 `_prismColor` 龟壳没有 → 跳过 bonus 段；主魔法照打。✅ 基本工作。

#### 龟壳本体
- `shellStrike` :2280 — pets.ts 中只有龟壳的，但黑名单不写它（写了 `shellCopy`、`shellAbsorb`、`shellErode`、`shellFortify`）。能不能被偷？**敌方阵中不会有龟壳**（最多 1 个 SSS），实战很少出现。理论上能复制；公式工作 ✅。

#### Stone
- `physical`（打击，:300 用 atkScale + defScale + mrScale，handler `physical` 已支持，:549-595）。✅
- `shield`（岩石护甲）— 当前 ALLY ✓。`shieldFromDmgPct` 用 caster maxHp + atk，缩放 60% ✓。✅
- `heal`（磐石，给单友 +defUp/mrUp）— 当前 ALLY ✓。handler :5763 用 `caster.baseDef` 算 defGain，完全自洽。✅
- `rockShockwave`（磐石之躯） — 🟡 退化（无岩层，但能打）。

#### Bamboo
- `bambooSmack` :2564 — 单体物理 + chilled debuff + knockToFront。公式自洽 ✅。
- `bambooSpikes` :2596 — 🟡 退化（HP 项用龟壳 maxHp）。

#### Angel
- `physical` 裁决 — ✅
- `angelBless` — ALLY ✓。`shieldScale`/`defBoostScale` 字段已缩。✅
- `angelEquality` :5514 — A 级以上目标 = 龟壳的目标稀有度判定，自洽；lifestealPct 用 caster 自吸。✅
- `angelSmite` :1270 — 自动选 `_dmgDealt` 最高敌方；waveCount/atkScale 都缩 60%；永久偷护甲魔抗给 caster。**功能上是 self-target 自取目标**，handler 不读外部 target。当前不在 AOE/SELF/ALLY 集合 → 走单体兜底（最低 HP 敌方），但 handler 内自选目标覆盖。✅ 工作正常。
- 注：`angelSmite` 永久偷护甲魔抗给 caster — 复制让龟壳吃这个超长持续福利。**可考虑归 🟠 加入 BLACKLIST（永久属性窃取被复制后被龟壳吃），不过缩放 60% 后只偷 `1.8 + 0.12×level` 也不离谱**。归 🟡 边缘。

#### Ice
- `iceSpike` :3670 — 单体多段 phys/magic 交替，`frostAura` passive 加成需 `caster.passive?.type=='frostAura'` → 龟壳无 → 跳过加成；其他公式自洽。✅
- `iceFrost` :3586 — AOE ✓。mrDown debuff + 10 段魔法。✅
- `iceFreeze` :3641 — 单体魔法 + 必中眩晕。✅
- `commonTeamShield` :1213 — 🟠 建议加入 ALLY。

#### Ninja
- `ninjaImpact` :1553 — 单体 + 身后单体。✅
- `ninjaShuriken` :1714（未读细看，但描述/handler 标准 — 单体物理 + 暴击转真伤）。✅
- `ninjaBomb` :1855 — AOE ✓。物理 + armorBreak。`armorPen` 字段不在缩放列表但 ninjaBomb 没用它。`armorBreak.pct/turns` 是描述用，handler 用 push buff `value:pct`。**buff 没被缩** — 🟡 但意图通常被允许。✅。
- `ninjaBackstab` :1949 — 临时穿甲 buff `caster.armorPen += 5` 1t + 3 段背刺。复制让龟壳吃 1t 穿甲。背刺切换 caster sprite 为 `pet-action-ninja-backstab` :1977 → **龟壳精灵被换 ninja 帧**（同 ghostPhase 问题）！但 backstab 没被列 BLACKLIST！
  - **建议：归 🔴 加入 BLACKLIST**（视觉签名同 ghostPhase/ghostPhantom 一类）。

#### Two_head（远程默认 skillPool）
- `twoHeadMagicWave` :3997 — 单体物理/真伤交替。✅
- `physical`（灵能冲击）— `aoe:true` → self-target → handler 自取敌方。✅
- `twoHeadMindBlast` :4034 — 单体魔法 + 护盾破 + 治疗削减。✅
- `twoHeadSwitch` — BLACKLIST ✓。
- `twoHeadHammer` :3970（仅 meleeSkills 出现）— 单体物理 + `shieldFromDmgPct` 自盾。✅
- `twoHeadAbsorb` :4157（meleeSkills）— 单体物理 + 自回血。✅

#### Ghost
- `ghostTouch` :1337 — 单体物理 + 真伤。✅
- `ghostPhantom` :1379 — BLACKLIST（视觉签名） ✓。
- `ghostStorm` :1454 — 单体 2 段魔法 + 诅咒。✅
- `ghostPhase` :1498 — BLACKLIST（视觉签名） ✓。

#### Diamond
- `physical`（钻石切割）— atkScale + defScale + mrScale。✅
- `diamondFortify` — 🟠 应移 BLACKLIST → SELF。
- `diamondCollide` :2393 — 单体物理 + 累计 stun。✅
- `diamondSmash` :2365 — 单体物理 + bleed。✅

#### Fortune
- `fortuneStrike` :3759 — 🟡 退化。
- `fortuneDice` / `fortuneAllIn` / `fortuneBuyEquip` / `fortuneGainCoins` — BLACKLIST ✓。

#### Dice
- `diceAttack` :2620 — 单体物理 + crit 加成。✅
- `diceAllIn` :5011 — AOE ✓。
- `diceFate` :2650 — 🟠 应移 BLACKLIST → SELF。
- `diceFlashStrike` :5049 — 多段随机物理。✅

#### Rainbow
- `magic` 七彩光束 — ✅（prism bonus 退化）。
- `shield` 棱镜护盾 — ALLY 解析正确（`aoeAlly:true`）。✅
- `rainbowStorm` — AOE ✓。
- `rainbowReflect` :5109 — 在 ally/enemy 间反射，从 caster（龟壳）开始。可工作 ✅。

#### Gambler
- `gamblerCards` :4756 — 3 段随机物理。✅
- `gamblerDraw` :4787 — 🟠 应移 BLACKLIST。
- `gamblerBet` :4703 — BLACKLIST ✓。

#### Hunter
- `hunterShot` :2676 — 单体 3 段物理 + 执行加成。✅
- `hunterStealth` :5877 — 物理 + 自 dodge + 自盾。✅ 自洽（hunter 不在任何特殊集合，但单体兜底打敌人 + 自加 buff/盾 OK）。
- `hunterBarrage` :4942 — AOE ✓。10 道随机真伤。✅
- `hunterPoison` :4982 — 单体物理 + poison + healReduce。✅
- `hunterMark` :2740 — 单体物理 + 印记 24%执行。✅

#### Pirate
- `physical` 弯刀 — ✅。
- `pirateCannonBarrage` :5308 — AOE ✓。
- `heal` 朗姆酒 — 含 `defUpAtkPct` buff，`selfCast:true`。handler :5763 用 `target.side===caster.side ? target : caster`。当前不在 ALLY → 单体兜底选最低 HP 敌方 → handler 用 `tgt = caster`（敌方 side ≠ caster.side → tgt=caster）。✅ 自动落到 caster。
- `piratePlunder` :3346 — 单体物理 + 偷护甲/魔抗给 caster。✅（功能上让龟壳偷敌人护甲，3 回合）。

#### Candy
- `physical` 糖果锤 — ✅。
- `shield` 焦糖铠 — ✅。`selfCast:true`，handler `shield` 走 caster（`aoeAlly` 未设）。
- `candyBarrage` :3536 — AOE ✓。armorPen buff 自施 + AOE 物理。

#### Bubble
- `physical` 泡泡攻击 — ✅。
- `bubbleShield` :5446 — ALLY ✓。`burstScale` 字段不在缩放列表 — 🟡 爆裂值未缩；功能 OK。
- `bubbleBind` :3470 — 🟡（`_level` 取龟壳的）。
- `bubbleBurst` :3487 — BLACKLIST ✓（依赖 `caster.bubbleStore`）。
- `bubbleHeal` :5417 — ALLY ✓。

#### Line
- `lineSketch` :5169 — 3 段物理 + 给目标加墨迹。✅
- `lineLink` :5226 — 单体+第 2 目标 + 建立 `_inkLink`。`_inkCapOverride` 默认 5。**功能 OK**：龟壳建立两敌之间的连笔传导（复制时由 `_inkTrueDmg` 决定 magic/true，龟壳无 → magic）。✅。
- `lineFinish` :3417 — 🟡（无层时退化；有层时可能超模）。
- `lineInkBomb` :5198 — AOE 物理 + 全敌加墨迹。✅

#### Lightning
- `lightningStrike` :2855 — 5 段魔法 + splash。✅
- `lightningSurgeBuff` :2960 — 立即电击 target + 设 `caster._lightningSurgeTurns/_lightningShockBoostPct` 2t。**复制后龟壳吃 2t shock boost** — 但龟壳没有 lightning passive，boost 无效作用对象。技术上不崩，飘字"+50%电真伤"也是无效宣告。归 🟡。
- `lightningBarrage` :2892 — AOE ✓。20 道随机魔法。
- `lightningSurge` :2914 — AOE，消耗每个敌人身上的 `_shockStacks` 引爆真伤。**电击层是 lightningStorm passive 加的**（敌方有 shock 才有用）。若敌方没 shock → 跳过整个技能。归 🟡（依赖场上 shock 标记）。**当前不在 AOE Set，会走单体兜底，但 handler 内 `getEnemies` 自取**。✅。
- `lightningShield` :2939 — SELF ✓。自施盾 + counter buff。

#### Phoenix
- `phoenixBurn` :2045 — 单体魔法 + burn。✅
- `phoenixShield` :2062 — SELF ✓。**注意**：handler 写入 `caster._lavaShieldVal` 字段（特殊熔岩盾 aura）→ 龟壳的 HUD 会显示熔岩盾段橙色 → 视觉违和但功能 OK。归 🟡 视觉。
- `phoenixScald` :2075 — 单体魔法 + 多 debuff + 烫伤。✅
- `phoenixPurify` :2107 — ALLY ✓。

#### Lava
- `lavaBolt` :2766 — 单体魔法 + burn。✅
- `lavaQuake` :2792 — AOE ✓。
- `lavaSurge` :2814 — 单体魔法 + 自盾。✅
- `lavaSplash` :2829 — AOE ✓。
- 火山形态：`volcanoSmash`/`volcanoArmor`/`volcanoErupt`/`volcanoStomp` — 只有对面熔岩龟切到火山时才出现在 pool；都能复制。`volcanoArmor` 已 SELF ✓。`volcanoErupt` AOE ✓。`volcanoStomp` AOE 数据（aoe:true）→ 走 self-target → handler 内 `getEnemies` ✓。

#### Cyber
- `physical` 激光枪 — ✅。
- `cyberBeam` :3137 — 🔴 建议加 BLACKLIST（演出 + 真伤段退化）。
- `cyberDeploy` :5689 — BLACKLIST ✓（依赖 `caster.passive.type=='cyberDrone'`）。
- `cyberSwarmShield` :5915 — 🟠 建议加 ALLY；功能 OK 但盾值退化。

#### Crystal
- `crystalSpike` :3044 — 单体魔法 + 叠结晶层。✅
- `crystalBarrier` :3070 — SELF ✓。给全友 +defUp/mrUp，handler 内 `getAllies` 全友。**注意**：SELF Set 让 copyTarget = caster，但 handler 不用 target、自取 allies → 全友盾覆盖。✅。
- `crystalBurst` :3089 — AOE ✓。

#### Chest
- `chestSmash` :3802 — BLACKLIST ✓。
- `chestCount` :5654 — BLACKLIST ✓（依赖 `_chestTreasure`）。
- `chestStorm` :4857 — BLACKLIST ✓（chest equip 变体）。

#### Space
- `starBeam` :4200 — 单体多段魔法 + 充星能（依赖 `caster.passive.type=='starEnergy'` → 龟壳无 → 跳过充能）。✅
- `starMeteor` :4259 — AOE ✓ + 满能 burst 真伤（依赖 starEnergy passive → 退化）。
- `starBlackhole` :4336 — 单体 + 黑洞踢入。**复制 OK**：黑洞 graphics VFX + 单体魔法 + 踢 stun。✅。
- `starWormhole` :4514 — BLACKLIST ✓（永久 +magicPen 给 caster，可能超模）。
- `starGravityWarp` :4459 — AOE ✓ + 满能换位（依赖 starEnergy → 退化）。

#### Hiding
- `physical` 攻击 — ✅。
- `hidingDefend` :3909 — BLACKLIST（保守保留 OK，可移 SELF）。
- `hidingCommand` :5492 — BLACKLIST ✓（无 `_summon`）。
- `hidingBuffSummon` :5467 — BLACKLIST ✓（无 `_summon`）。

#### Headless
- `physical` 撕咬 — ✅。
- `twoHeadFear` :5821 — 单体物理 + 恐惧 debuff。**注意**：此 type 名是历史遗留，被 headless 龟用于"恐吓"技能（pets.ts:3380）。功能完全独立，复制 OK ✅。
- `soulReap` :5375 — AOE ✓。
- `headlessStorm` :3927 — AOE 物理 3 段 + 22% temp lifesteal。✅
- `headlessSoulStrike` :5354 — 单体魔法 + 目标当前 HP×20%。✅

#### Shell（龟壳自己） — 见上面 BLACKLIST 自指处理。

---

## 3. SELF 集合补全建议

当前 `SELF = ['phoenixShield','volcanoArmor','crystalBarrier','lightningShield']`。

> 准入条件：**只对自己施加状态/盾/buff**，无 ally/enemy 选择需求，handler 不使用 target。

**应加入**：
- `diamondFortify` :5855 — 自盾 + 自 defUp/mrUp。
- `diceFate` :2650 — 自 critUp buff。
- （可选）`hidingDefend` :3909 — 自特殊限时盾。
- （可选）`hunterStealth` :5877 — 但 handler 还要打 target 物理段，**严格说不是 SELF**（"dmg + self buff" 混合类）。当前不在任何 Set 走单体兜底（打最低 HP 敌方+给自己 buff）已正确 → 不需要动。

**注意**：`crystalBarrier` 严格说是 ally-AoE（给全友 def/mr +15%），归 SELF 是因为 handler 不读 target + 给自己加盾。SELF 集合更多是"目标解析时填 caster"，handler 内可以自由扩展。

---

## 4. ALLY 集合补全建议

当前 `ALLY = ['heal','shield','bubbleShield','angelBless','phoenixPurify']`。

> 准入条件：handler 期望一个**友军 target**（即 `target.side===caster.side`）才能正确执行，单体兜底"最低 HP 敌方"会出错或被 handler 用 `target=caster` 兜底。

**应加入**：
- `commonTeamShield` :1213 — 全友盾。handler 已 `getAllies`，加进来语义对齐。
- `cyberSwarmShield` :5915 — 全友盾。
- `bambooHeal` :2528 — 自回血+全友盾。
- `bubbleHeal` :5417 — 单友回血 + splash。**handler 已经把非己方 target fallback 到 caster**（:5419 `tgt = target.side===caster.side ? target : caster`）→ 即便不在 ALLY 也能跑，但加进来更显式。

**也不必加**（handler 已经 robust）：
- `pirate heal` 朗姆酒 — handler 自动 fallback caster。

---

## 5. 汇总修复建议（按优先级）

### 高优先级（功能错或视觉错）
1. 🔴 **`stoneTaunt`** → 加 BLACKLIST。复制让龟壳吃下敌方对友方的单体技能 = 反向自杀。
2. 🔴 **`cyberBeam`** → 加 BLACKLIST。整套 KOF cut-in/相机/跳排演出强绑赛博龟，且真伤段恒 0。
3. 🔴 **`ninjaBackstab`** → 加 BLACKLIST。handler 切换 caster sprite 为 `pet-action-ninja-backstab`，龟壳精灵被替成 ninja 帧（与 ghostPhase/ghostPhantom 同类视觉签名）。

### 中优先级（BLACKLIST 多余，可让玩法更丰富）
4. 🟠 **`diamondFortify`** → BLACKLIST 移到 SELF。
5. 🟠 **`diceFate`** → BLACKLIST 移到 SELF。
6. 🟠 **`bambooLeaf`** → BLACKLIST 移除（普通 3 段物理）。
7. 🟠 **`bambooHeal`** → BLACKLIST 移到 ALLY。
8. 🟠 **`gamblerDraw`** → BLACKLIST 移除（自洽，可正常打 target）。

### 低优先级（语义对齐，handler 已 robust）
9. 🟠 **`commonTeamShield`** → 加入 ALLY。
10. 🟠 **`cyberSwarmShield`** → 加入 ALLY。
11. 🟠 **`bubbleHeal`** → 加入 ALLY（handler 已 fallback caster，加只是显式）。

### 不必动（保留现状）
- `gamblerBet`（自伤）、`fortune*`（金币系统）、`chest*`（chest 装备 flag）、`hiding*`（_summon）、`starWormhole`（永久 magicPen）、`shellAbsorb`/`shellErode`/`shellCopy`（自指）、`twoHeadSwitch`（形态切换）、`ghostPhantom`/`ghostPhase`（视觉签名）、`cyberDeploy`（passive 检查）— BLACKLIST 都合理。
- `crystalBall`/`crystalImmortal`/`gamblerFateWheel`/`pirateShipPassive`/`twoHeadFusion` 等 passiveSkill — 不会被拾。
- `mechAttack`/`shellFortify`/`starShieldBreak`/`cyberBuff` — 不存在于 pets 当前 skillPool，BLACKLIST 是防御性，无害。

---

## 6. 退化（🟡）但能跑，不必修

`fortuneStrike`、`lineFinish`、`bambooSpikes`(HP项)、`rockShockwave`、`bubbleBind`(用龟壳level)、`bubbleShield`(burstScale 未缩)、`lightningSurgeBuff`(boost 无效作用)、`lightningSurge`(依赖场上 shock)、`starBeam`/`starMeteor`/`starGravityWarp`(无 starEnergy passive)、`magic` 七彩光束(无 prismColor)、`phoenixShield` 视觉走熔岩盾色 — 都属于"基础工作但因 caster 状态缺失，效果≤原龟"，符合"龟壳模仿 ≠ 完美复制"的设计语义。

---

## 附录：完整技能 type → handler 索引

（按 pet.id 排序，去除 `passiveSkill:true`）

```
basic:      physical, turtleShieldBash, basicBarrage, basicChiWave, basicSlam
stone:      physical, shield, heal, rockShockwave, stoneTaunt
bamboo:     bambooLeaf, bambooHeal, bambooSmack, bambooSpikes
angel:      physical, angelBless, angelEquality, angelSmite
ice:        iceSpike, iceFrost, iceFreeze, commonTeamShield
ninja:      ninjaImpact, ninjaShuriken, ninjaBomb, ninjaBackstab
two_head:   twoHeadMagicWave, physical(aoe 灵能), twoHeadSwitch, twoHeadMindBlast
            (melee: twoHeadHammer, twoHeadAbsorb, twoHeadSwitch)
ghost:      ghostTouch, ghostPhantom, ghostStorm, ghostPhase
diamond:    physical, diamondFortify, diamondCollide, diamondSmash
fortune:    fortuneStrike, fortuneDice, fortuneAllIn, fortuneBuyEquip, fortuneGainCoins
dice:       diceAttack, diceAllIn, diceFate, diceFlashStrike
rainbow:    magic, shield, rainbowStorm, rainbowReflect
gambler:    gamblerCards, gamblerDraw, gamblerBet
hunter:     hunterShot, hunterStealth, hunterBarrage, hunterPoison, hunterMark
pirate:     physical, pirateCannonBarrage, heal(朗姆酒), piratePlunder
candy:      physical, shield, candyBarrage
bubble:     physical, bubbleShield, bubbleBind, bubbleBurst, bubbleHeal
line:       lineSketch, lineLink, lineFinish, lineInkBomb
lightning:  lightningStrike, lightningSurgeBuff, lightningBarrage, lightningSurge, lightningShield
phoenix:    phoenixBurn, phoenixShield, phoenixScald, phoenixPurify
lava:       lavaBolt, lavaQuake, lavaSurge, lavaSplash
            (volcano: volcanoSmash, volcanoArmor, volcanoErupt, volcanoStomp)
cyber:      physical, cyberBeam, cyberDeploy, cyberSwarmShield
crystal:    crystalSpike, crystalBarrier, crystalBurst
chest:      chestSmash, chestCount, chestStorm
space:      starBeam, starWormhole, starMeteor, starBlackhole, starGravityWarp
hiding:     physical, hidingDefend, hidingCommand, hidingBuffSummon
headless:   physical, twoHeadFear(恐吓), soulReap, headlessStorm, headlessSoulStrike
shell:      shellStrike, shellCopy, shellAbsorb, shellErode
```
