# 审计 Batch4 — 宝箱(chest) / 星际(space) / 缩头(hiding) / 无头(headless) / 龟壳(shell) / 普通(basic)

审计日期 2026-05-28。比对 `src/data/pets.ts` 描述（真理来源）vs 实际代码行为。
- 技能 handler：`src/engine/skill-handlers.ts`
- 被动/受击：`src/engine/passive-triggers.ts`、伤害收口 `src/engine/damage.ts`（`applyRawDamage`）
- 回合/召唤/变身/储能/装备池：`src/scenes/BattleScene.ts`
- 站位/邻接：`src/engine/slot-helpers.ts`

分类：NUMERIC / BEHAVIOR / EDGE / DEAD-FLAG / DESC-GAP / SCOPE。

**基线复核**：`qa-2026-05-27/audit-D`（chest/space/hiding/headless/shell）与 `audit-A`（basic）已先读。上一批的几个核心问题本批确认 **已修**：
- 无头·灵魂收割（原"按施法者已损血"）→ 现 **per-target 已损血**（skill-handlers:5348 `eLostHp = e.maxHp - e.hp`）✅ 已修
- 缩头·攻击 `selfDefUpPct`（原战斗中完全不生效）→ 现通用 physical handler **已读取**（skill-handlers:586-594）✅ 已修
- 缩头·强化随从 暴击双加 → 现仅 critUp buff + `_baseCrit` 锚定，不再永久直改（skill-handlers:5433-5437）✅ 已修
- 缩头·强化喊龟 随从血 → 现按 `_summonHpBase`(减半前原始 maxHp)×110%（BattleScene:1312 / 5962）✅ 已修
- 赛博·强化浮游炮 机甲 +3×炮数 甲抗 → 现已实装（BattleScene:4362-4364，非本批范围，顺带确认）✅ 已修

---

## 小龟 (basic) — C / HP450 / ATK40 / DEF14 / MR13 / 暴25%
被动「不屈」(basicTurtle) + 攻击 / 龟盾 / 打击 / 龟派气波 / 过肩摔

| 描述 | 代码 | 判定 |
|---|---|---|
| 不屈：按目标稀有度增伤 C20/B23/A26/S29/SS32/SSS34 | bonusMap 逐项相符；中央收口 `calcDamage`(damage.ts:60-64) 对所有 deal* 路径单次应用 | ✅ |
| 攻击 2 段共 140%×ATK | physical handler 2×0.7 | ✅ |
| 龟盾 0.7×ATK + 20%目标已损HP，80%伤害永久盾，击飞 | turtleShieldBash:646-647/752；手算路径但 bonusMap/frostAura/暴击/护甲齐全 | ✅ |
| 打击 10 段共 310%×ATK 随机分布 | basicBarrage total/hits 随机选活敌(:798-845) | ✅ |
| 龟派气波 自增益 + 横排三连共 230%×ATK | sameColumnFighters(横排) + 3×(2.3/3)（:899-1041） | ✅ |
| 过肩摔 主 0.7×ATK+26%主目标maxHp / 溅射 0.2×ATK+19%主目标maxHp，击飞 | basicSlam:1143-1162（splash 用 `target.maxHp`=主目标） | ✅ |

**结论：basic 全项一致。** 注：turtleShieldBash 走 `applyRawDamage` 手算（非 dealPhysical），但已内联 bonusMap+frostAura+暴击+护甲，且中央 `passiveDmgMult`(skill-handlers:276-284) 注释确认 basicTurtle 不会双算，无重复。

---

## 宝箱龟 (chest) — S / HP445 / ATK40 / DEF16 / MR14 / 暴25%
藏宝图(chestTreasure) + 宝箱砸击 / 清点财宝 / 财宝风暴 / 寻宝直觉 / 贪婪

| 描述 | 代码 | 判定 |
|---|---|---|
| 阈值 80/130/240/360/590 ×(1+0.03(LV-1)) | thresholds 默认值相符；scaledThresh 等级系数对（BattleScene:4582-4585） | ✅ |
| 池1(第1-2件回8%)/池2(第3-4件回11%)/池3(第5件回15%) | poolIdx = tier<2?0:tier<4?1:2；healPctByPool=[8,11,15]（:4586/4592/4606） | ✅ |
| 财宝按造成伤害积累 | on-hit hook `_chestTreasureHook?.(attacker, dmg)`（passive-triggers:252-253） | ✅ |
| 装备 stat：blade/sword 攻、shield/gem 甲抗、dice 暴击、vamp 偷取、crown 套装、chain/rock/thunder/star/fire/poison/revive | applyChestEquipStat:4625-4680 逐项对，crown 硬写 40/0.40/0.25/15 与描述一致 | ✅ |
| **rum「海盗龟小瓶朗姆酒」：每回合回 8% maxHp**（池1的一件装备，需开出才生效） | **BattleScene:5223 无条件给所有 chestTreasure 龟 8% HoT**（注释自承"简化:不检查 chest equip"） | 🔴 BEHAVIOR |
| 宝箱砸击 3 段共 150%×ATK 物理 + 6 装备变种 | chestSmash:3775-3853（hits3 atkScale1.5；thunder 满5引爆 1×ATK真伤；chain 25%溅射；star真伤；rock+甲抗；fire/poison） | ✅ |
| 财宝风暴 全敌 5 段共 100%×ATK 物理 | chestStorm:4828-4881（hits5 atkScale0.2 pierce0） | ✅ |
| 清点财宝 回 5%maxHp + 0.6×ATK 盾，每100财宝强度+14% | chestCount:5615-5631（treasureBonus=1+floor(财宝/100)×0.14 同放大回血与盾） | ✅ |
| 寻宝直觉：阈值降为 60/120/220/350/500 | chestIntuition flag 切阈值（:4580-4582） | ✅ |
| 贪婪：每件装备 +4%ATK +7%maxHp | 选龟期 baseline(:1289-1298) + 开宝箱新装备(:4682-4687) | ✅ |
| 凤凰雕像(revive)：首次死亡 25% maxHp 重生 | 实装走 `_chestEquips.some(id==='phoenix')`（BattleScene:4134-4172），25% 对 | ✅ |

### 🔴 chest-1（BEHAVIOR，中-高）：rum HoT 无条件发放给所有宝箱龟
- file：`src/scenes/BattleScene.ts:5222-5233`
- 代码：
  ```ts
  // chestTreasure rum HoT 8% maxHp/回合 (JS turn.js:246-256, 简化: 不检查 chest equip)
  if (p.type === 'chestTreasure') {
    const heal = Math.round(f.maxHp * 0.08);  // 每个宝箱龟每回合白送 8% 回血
    ...
  }
  ```
- 描述：rum 是「藏宝图」基础池(池1)6 件之一，效果「每回合回复 8% 最大生命值」——应当 **只有抽中 rum 这件装备时才生效**。
- 偏差：代码对**任何**宝箱龟（不论是否开出 rum）每回合无条件回 8% maxHp。宝箱龟白嫖一个本应"运气抽中"的强力回复。
- 附带 **DEAD-FLAG**：`applyChestEquipStat` 在抽中 rum 时设 `_chestEquipRum=true`/`_chestEquipRumPct`（BattleScene:4654-4655），但全工程**无任何处读取**（grep 确认）——本应是 HoT 的开关，被无条件分支架空。
- 建议修复：把 HoT 条件改为 `if (p.type === 'chestTreasure' && f._chestEquipRum)`，回血百分比读 `f._chestEquipRumPct ?? 8`。

### ⚠️ chest-2（DEAD-FLAG，低）：`_chestEquipRevive` set 后不读
- file：`src/scenes/BattleScene.ts:4677-4678`（set）
- 凤凰复活实际走 `_chestEquips.some(e=>e.id==='phoenix')`（:4134），`_chestEquipRevive` 从未被读取。功能正常（复活生效），仅该 flag 是死字段。建议删除或改用该 flag 统一判定。

---

## 星际龟 (space) — S / HP449 / ATK45 / DEF13 / MR15 / 暴25%
星能(starEnergy) + 星光射线 / 虫洞 / 流星暴击 / 黑洞 / 扭曲空间

| 描述 | 代码 | 判定 |
|---|---|---|
| 星能：伤害 62% 转星能，上限 40%maxHp | chargeRate=62 / maxChargePct=40 字段值（默认 30/25 为死分支） | ✅ |
| 每次释放技能后追加 储能×30% 真伤 | passiveFirePct=30；5 个技能均调 fireStarPassive（含 inline）（:508-526 等） | ✅ |
| 流星暴击满能 → 消耗全部对全敌 100% 真伤 | burstPct=100；starMeteor:4283-4301 | ✅ |
| 星光射线 三段共 120%×ATK + 18%目标当前生命值 魔法 | starBeam:4181-4185 每段 0.4×ATK + 6%×**当前**HP（逐段递减，实际略低于 18%） | ⚠️ DESC-GAP |
| 虫洞：标记 4 回合，期间受**所有**真实伤害 +20%；自身永久 +10%×ATK 魔穿 | 标记/魔穿对；但 **+20% 真伤仅 starMeteor 爆发段消费**（见下） | ⚠️ SCOPE |
| 流星暴击 全敌 100%×ATK 魔法 + 魔抗-20%×3回合 | starMeteor:4243-4276（atkScale1，mrDown 20/3） | ✅ |
| 黑洞 踢入1回合(眩晕+不可选+被动仍触发) 100%×ATK 魔；仅剩1敌→180%×ATK 直伤，<15%→斩杀 | starBlackhole:4318-4438 | ✅ |
| 扭曲空间 全敌 80%×ATK 魔法；满能换位 F0↔B2/F1↔B1/F2↔B0 | starGravityWarp:4442-4492 | ✅ |

### ⚠️ space-1（SCOPE，中）：虫洞「受到的所有真实伤害 +20%」实际只对流星爆发段生效
- file：`src/engine/skill-handlers.ts:4505-4510`（打标记）；`damage.ts`（收口处无消费）；唯一消费点 `:4289-4290`（starMeteor burst）。
- 描述：detail 明写「被标记目标受到的**所有真实伤害** +20%」。
- 偏差：`wormhole.pierceBonusPct` 没有进 `applyRawDamage`（伤害收口），只在 **starMeteor 满能爆发那一段** 手动乘。因此对以下真伤**全部不生效**：
  - 星能被动 fireStarPassive 的 +30% 储能真伤（每次技能后那一发）
  - 黑洞斩杀/直伤（魔法，但即便有别的真伤源也不享受）
  - 其它任何龟/技能/DoT 对该目标的真实伤害
- 即「虫洞」≈ 只是「让自己的流星爆发对该目标多 20%」，与描述「所有真实伤害」相距甚远。
- 建议修复：把 wormhole 的 `pierceBonusPct` 放进 `applyRawDamage`（dmgType==='true' 时）按 buff 统一加成，或至少让 fireStarPassive 也消费它。

### ⚠️ space-2（DESC-GAP，低）：星光射线"18%当前生命值"实为 6%/段递减
- file：`src/engine/skill-handlers.ts:4185` `target.hp × 6%`，三段，每段基于**实时剩余**HP（已被前段打掉）。名义 18% 但实际 < 18%。描述把它写成固定"18%目标当前生命值"。建议描述改"每段 6% 当前生命值（共约 18%，随剩余血递减）"。

注：starBeam/starMeteor/Warp 的 magic 段均走 `calcEffMr`+`calcDmgMult`（吃魔抗），无问题；黑洞 magic 段同样吃魔抗。

---

## 缩头乌龟 (hiding) — SS / HP515 / ATK37 / DEF20 / MR21 / 暴25%
喊龟(summonAlly) + 攻击 / 防御 / 指挥 / 强化随从 / 强化喊龟

| 描述 | 代码 | 判定 |
|---|---|---|
| 喊龟：开局召 A 级及以下随从，HP=40%常规maxHp，独立CD/AI，每回合末出手 | spawnSummonAlly:5931-5980（C/B/A 随机，hpPct40，独立 fighter） | ✅ |
| **随从躲身后，敌方单体技能无法选中随从** | **无 `_isSummon` 排除**：玩家选靶(enterTargetingMode:2370-2391) 与 AI 选靶(:2567-2583) 仅按 stealth/taunt/前排守门 过滤 | ⚠️ BEHAVIOR |
| 攻击 100%×ATK 物理 + 自身护甲 +20%(DEF×0.2) 2回合 | physical handler 现读 `selfDefUpPct`（:586-594，defUp buff turns+1） | ✅（已修） |
| 防御 20%maxHp 盾 4回合，到期回 20%剩余盾 | hidingDefend:3880-3890 + 到期回收 | ✅ |
| 指挥 随从额外出手1次（亡则无效） | hidingCommand:5447-5457（emit + AI 守活） | ✅ |
| 强化随从 ATK/甲/抗+10% 偷取+10% 暴击+20% 2回合 | hidingBuffSummon:5422-5443（暴击改临时 buff + _baseCrit 锚定） | ✅（已修） |
| 强化喊龟 本体-50%maxHp，随从改 110% 常规maxHp（原值110%） | BattleScene:1309-1320 + 5962 `_summonHpBase`(减半前)×110% | ✅（已修） |

### ⚠️ hiding-1（BEHAVIOR，中）：随从"敌方单体无法选中"机制未实装
- file：玩家 `src/scenes/BattleScene.ts:2370-2391`；AI `:2567-2583`；`src/engine/slot-helpers.ts:80-89`(visibleEnemyTargets)。
- 描述：「随从躲在缩头乌龟身后，**敌方单体技能无法选中随从**（但仍受 AOE 与回合被动伤害）」。
- 偏差：单体选靶（玩家红圈 + 敌方 AI）均**不**排除 `_isSummon`（仅 `fortuneBuyEquip` 在 :2374-2378 排除召唤物）。随从被当作普通后排单位：靠"前排守门"间接获得保护——若前排有活龟则单体打不到后排随从，与任意后排龟无异；spawn 槽位顺序优先后排(`back-2/1/0` 在前，:5951)使其多数情况在后排，但若后排已满而落到前排，则可被单体直接选中。
- 即「躲在身后免单体」这一专属机制不存在，仅有通用前排守门兜底。
- 建议修复：在玩家与 AI 单体选靶的候选过滤里加 `&& !f._isSummon`（owner 存活时），与描述对齐；或确保随从永远占后排且 owner 在前挡。

注（低，信息项）：「缩头乌龟阵亡时随从一同阵亡」——显式 `_summon.alive=false` 仅在海螺虫变身路径（BattleScene:4205-4207）。普通阵亡未见统一清理孤儿随从的逻辑；胜负判定 nextActor:1961 把随从计为 combatant，理论上 owner 普通死亡后随从可能继续存活/计入未败方。建议核实主体普通阵亡路径是否同步清随从（基线标 ✅ 但本次未找到通用清理点）。

---

## 无头龟 (headless) — SS / HP450 / ATK39 / DEF13 / MR12 / 暴25%
亡灵(undeadRage) + 撕咬 / 恐吓 / 灵魂收割 / 亡灵风暴 / 灵魂打击

| 描述 | 代码 | 判定 |
|---|---|---|
| 亡灵：登场 +22% 偷取；每损1%HP +1%ATK(上限+100%)；首次濒死锁1HP 2回合 | lifestealBase22(:5012)；applyUndeadRageAtk:5020-5028 每回合重算；undeadLock 4423-4427 + 倒计时 2149-2155 | ✅ |
| 撕咬 2 段共 130%×ATK + 8%目标maxHp 物理 | physical handler（hits2 atkScale0.65 hpPct4） | ✅ |
| 恐吓 90%×ATK 物理 + 恐惧3回合（对无头龟-20%，真伤除外） | twoHeadFear:5781-5801（fear20/turns+1，真伤豁免在 damage.ts:66-69） | ✅ |
| 灵魂收割 全敌 110%×ATK + 10%**目标**已损生命值 物理 | soulReap:5332-5368（per-target `eLostHp`） | ✅（已修） |
| 亡灵风暴 本次+22%偷取，全敌3段共150%×ATK物理 | headlessStorm:3900-3937（无暴击/无护甲减免，刻意 1:1） | ✅ |
| 灵魂打击 90%×ATK + 20%目标当前生命值 魔法 | headlessSoulStrike:5313-5328 | ⚠️ 见下 |

### ⚠️ headless-1（DESC-GAP / 可能 BUG，低-中）：灵魂打击魔法伤害不吃魔抗
- file：`src/engine/skill-handlers.ts:5313-5328`
- 代码：`totalDmg = round(atk×0.9) + round(target.hp×20%)`，直接 `applyRawDamage(target, totalDmg, 'magic')`——**没有** `calcEffMr`/`calcDmgMult`，也无暴击。
- 描述："魔法伤害"。通常魔法应被魔抗减免；此技实为"无视魔抗的魔法"。同批其它魔法技（星际/水晶/龟壳侵蚀）都经 `dealMagic` 或显式 `calcEffMr` 吃魔抗。
- 这可能是刻意 1:1 JS（注释"1:1 JS headless.js:63-76"），但描述未注明"无视魔抗"。建议核实 JS 是否真无视魔抗：若是，描述应补"无视魔抗"；若否，应补 `calcEffMr` 减免。
- 注：headlessStorm 同样无暴击/无护甲（基线已记 DESC-GAP 低），属同类刻意行为。

---

## 龟壳 (shell) — SSS / HP490 / ATK44 / DEF17 / MR18 / 暴25%
气场觉醒(auraAwaken) + 攻击 / 复制 / 吸收 / 侵蚀 / 强化觉醒

| 描述 | 代码 | 判定 |
|---|---|---|
| 第4回合觉醒：ATK/甲/抗/maxHp/偷取/反伤 各+12%，暴击+25% | doAwaken:5171-5187（逐项相符） | ✅ |
| 储能=受伤累积(上限50%maxHp)；每4回合：全敌 储能×(40%+1%/级) 物理 + 储能×(80%+1%/级) 气场盾(两回合衰减) | 储能 hpLoss 累积 cap50%(passive-triggers:196-199)；processEnergyWave:7465-7505 dmgPct=0.4+(lv-1)0.01 / shieldPct=0.8+(lv-1)0.01；每4回合 turn%4===0 | ✅ |
| 攻击 2 段(物理+真实)共 120%×ATK，每段相邻溅射25%，无相邻则该段×1.5 | shellStrike:2260-2339（perHit0.6，偶 physical 奇 true，splash25 独立暴击，isolated×1.5） | ✅ |
| 复制 随机复制敌方2技能 60%效果释放 | shellCopy:2121-2195（黑名单+全字段×0.6+按 AOE/SELF/ALLY/单体选靶） | ✅ |
| 吸收 偷目标10%maxHp（双方 maxHp+当前HP 同步） | shellAbsorb:2235-2251（target 同步扣 HP，caster 同步加） | ✅ |
| 侵蚀 弯波数=3+暴击%每20加1，主目标25%×ATK + 同列另一目标10%×ATK 魔法，每段触发被动 | shellErode:2198-2227（waveCount=3+floor(crit×100/20)；dealMagic 内含 triggerOnHitEffects 每波触发被动） | ✅ |
| 强化觉醒 第8回合再次觉醒同款 | enhancedAwakenTurn8 + `_passiveSkills` 含 shellEnhanceAwaken（:5190-5191） | ✅ |

**结论：shell 全项一致。** 低信息项：储能用 `hpLoss`（打盾不积），描述"受到的伤害"措辞略宽，与 JS 一致，无害。

---

## 小结（按严重度）

🔴 **1 项**
1. **宝箱龟·rum 8% HoT 无条件发放（BEHAVIOR，中-高）** — `BattleScene.ts:5223` 给**每个**宝箱龟每回合白送 8% maxHp 回血，无视是否抽中「朗姆酒」装备；配套 `_chestEquipRum`/`_chestEquipRumPct`(:4654-4655) 是死字段。本批最实质的偏差（破坏"运气抽装备"设计，且免费续航）。

⚠️ **6 项**
2. **星际龟·虫洞 +20%真伤只对流星爆发生效（SCOPE，中）** — 描述"所有真实伤害+20%"，实际 `pierceBonusPct` 仅在 starMeteor 爆发段消费（skill-handlers:4289），未进 `applyRawDamage` 收口，连星能被动 +30% 真伤都不享受。
3. **缩头·随从"敌方单体无法选中"未实装（BEHAVIOR，中）** — 单体选靶（玩家:2370-2391 / AI:2567-2583）不排除 `_isSummon`，随从仅靠通用前排守门兜底，落前排即可被单体选中。
4. **无头·灵魂打击魔法不吃魔抗（DESC-GAP/可能BUG，低-中）** — skill-handlers:5321 直接 raw magic，缺 `calcEffMr`；需核实 JS 是否刻意无视魔抗并同步描述。
5. **宝箱·`_chestEquipRevive` 死字段（DEAD-FLAG，低）** — set 后不读，复活走另一路径（功能正常）。
6. **星际·星光射线"18%当前HP"实为 6%/段递减（DESC-GAP，低）**。
7. **缩头·随从血量措辞**（基线已记，本批确认已修为原值110%）；以及主体普通阵亡是否同步清随从待核实（信息项，低）。

其余约 50 项（basic 全套、chest 全部机制与装备池/砸击/风暴/清点/直觉/贪婪/凤凰、space 星能/流星/黑洞/扭曲、hiding 防御/指挥/强化随从/强化喊龟、headless 亡灵/撕咬/恐吓/收割/风暴、shell 全套与觉醒/储能）经逐行核对**数值与行为均与当前 pets.ts 描述一致**，且上一批 5 个核心问题（灵魂收割、缩头攻击、强化随从、强化喊龟、机甲甲抗）已全部修复，本批未见回归。
