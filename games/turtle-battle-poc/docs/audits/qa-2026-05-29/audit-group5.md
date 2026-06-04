# Group 5 审计 (cyber/crystal/chest/space/hiding/headless/shell)

> 方法: 三方交叉 — 描述(pets.ts brief/detail) × 实现(skill-handlers.ts / passive-triggers.ts / BattleScene.ts) × 审计实际(skill-audit.json / passive-audit.json)。
> 仅读源码, 未改任何文件。display 层(飘字/演出/状态栏图标)无法纯逻辑核实, 标 "显示待眼验"。
> 审计 harness 的 dummy 多为高 maxHp(~1M), 故 maxHp%/currentHp% 类技能 dmg 出现 6 位数, 属正常。

---

## 赛博龟 (cyber)
### 被动: 浮游炮 cyberDrone — ✓ — 每回合生成 1 炮(上限10), 每炮 0.25×ATK 物理(记 'phy'), 本体阵亡组装机甲(HP=(30+2×lv)×炮数, ATK=(4.5+0.1×lv)×炮数, crit25%, def/mr=0; 强化版 def/mr=3×炮数), 机甲 1.5×ATK 物理打最低血。spawn/fire 在 BattleScene.ts:7008-7063, 机甲组装 4400-4473。passive-audit 无逐回合 buff 变化(炮数是 _drones[] 字段, 非 buff)正确。

### 技能表
| 技能 | type | 描述预期 | 审计实际 | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 激光枪 | physical | 5段共 0.75×ATK + 12%目标maxHp 物理 | dmgToPrimary=120040, hpPct=2.4×5=12% | ✓ | physical handler hpPct 每段叠加 skill-handlers.ts:543-600;数据 hits5/atkScale0.15/hpPct2.4 pets.ts:2702-2710 |
| 能量大炮 | cyberBeam | 横排(前后同位)每敌 2段物理共 100%ATK + 2段真实共 10%ATK×炮数 | dmgToPrimary=52(=ATK,炮数0无真伤), touched=1 | ✓ | 物理记'phy'/真实记'tru' 分类型 skill-handlers.ts:3269-3300;真伤 5%/段×炮数 |
| 部署 | cyberDeploy | 立即部署3炮(上限10/强化20) | 无伤害, touched=1 | ✓ | skill-handlers.ts:5670-5692 |
| 强化浮游炮 | cyberEnhancedDrone | enhancesPassive: 上限/生成翻倍, 单炮 0.12×ATK, 机甲+3×炮数甲抗 | passiveSkill, no-op handler | ✓ 显示待眼验 | flag _cyberEnhanced 读于 cyberBeam/Deploy/SwarmShield/机甲;机甲甲抗 BattleScene:4418 |
| 浮游联防 | cyberSwarmShield | 全友永久护盾 = (60% + 15%×炮数)×ATK | casterShield=31(=0.6×51,炮数0) | ✓ | recordShield 全友 skill-handlers.ts:5896-5916 |

---

## 水晶龟 (crystal)
### 被动: 水晶共鸣 crystalResonance — ✓ — 受魔法额外减免20%(damage.ts:184-186 applyRawDamage 收口);攻击叠1层结晶, 满4层引爆 maxHp×19% 魔法(经 calcEffMr, 记'mag') + mrDown -20%/3t, 引爆清零(passive-triggers.ts:89-119)。passive-audit `tgt:[_crystallize+1]` 印证叠层。

### 技能表
| 技能 | type | 描述预期 | 审计实际 | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 水晶刺 | crystalSpike (magic) | 2段共 100%ATK + 6%目标maxHp 魔法, 每段叠结晶 | dmgToPrimary=60048 | ✓ | dealMagic→结晶叠层自动 skill-handlers.ts:3031-3048 |
| 水晶壁垒 | crystalBarrier | 自盾 0.9×ATK + 全友 def/mr +15% 3t | casterShield=43, defUp3/mrUp4 | ✓ | flat 值 per-ally baseDef×15% skill-handlers.ts:3054-3071 |
| 碎晶爆破 | crystalBurst (magic) | AOE 3段 23.3%ATK魔法 + 3.3%ATK真实/段, 每段叠结晶 | dmgToPrimary=39, dmgToAll=117, touched=3 | ✓ | 魔法记'mag'/真实记'tru' skill-handlers.ts:3073-3104 |
| 水晶球 | crystalBall | 登场召唤球(HP=50%本体maxHp, ATK=100%本体), 全友行动后射2段共100%ATK魔法+叠结晶 | passiveSkill, no-op handler | ✓ 显示待眼验 | 召唤 BattleScene:6043-6091, 光线在友方行动后触发, 共享 _crystallize |
| 不朽 | crystalImmortal | 存活到第10回合 +5000maxHP +400ATK | passiveSkill | ✓ | turn>=10 一次性 per-fighter BattleScene:5251-5263 (读 _crystalImmortal flag) |

---

## 宝箱龟 (chest)
### 被动: 藏宝图 chestTreasure — ✓ — 按造成伤害累积财宝(on-hit hook), 阈值 [80/130/240/360/590]×(1+3%/级) 抽装备, 3池(基础/进阶/传说)各回 8%/11%/15% maxHp, 最多5件;chestIntuition 降阈值。BattleScene:4629-4677。朗姆酒 HoT 仅抽到 rum 才有(_chestEquipRum, applyRoundStartPassive:5547)。passive-audit 无即时 buff(财宝是累积字段)正确。

### 技能表
| 技能 | type | 描述预期 | 审计实际 | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 宝箱砸击 | chestSmash | 3段共 1.5×ATK 物理(star→真实/rock→+甲抗/chain/thunder/fire/poison 变种) | dmgToPrimary=66(=1.5×44) | ✓ | totalBasePower/hits, 记'phy'(或'tru') skill-handlers.ts:3781-3884;brief 动态生成 skill-text.ts:157-187 |
| 清点财宝 | chestCount | 回 5%maxHp + 0.6×ATK 护盾, 每100财宝 +14%强度 | casterShield=26(=0.6×44) | ✓ | treasureBonus 倍率 skill-handlers.ts:5635-5654 |
| 财宝风暴 | chestStorm | AOE 5段共 100%ATK 物理 | dmgToPrimary=45, dmgToAll=135, touched=3 | ✓ | 5×0.2×ATK 记'phy' skill-handlers.ts:4842-4899 |
| 寻宝直觉 | chestIntuition | enhancesPassive: 阈值降为 60/120/220/350/500 | passiveSkill, no-op handler | ✓ | flag _chestIntuition 读于阈值 BattleScene:4639-4641 |
| 贪婪 | chestGreed | 每件装备 +4%ATK +7%maxHp | passiveSkill, no-op handler | ✓ 显示待眼验 | 装备时累加 BattleScene init(_chestGreed) |

---

## 星际龟 (space)
### 被动: 星能 starEnergy — ✓ — 造成伤害的 62% 转星能(上限 40%maxHp), 每次技能后追加 30% 储能真伤(fireStarPassive, 记'tru'), 流星暴击满能消耗全部能对全敌 100% 储能真伤。chargeRate62/maxChargePct40/passiveFirePct30/burstPct100 均从 passive 读(技能里 `??` 仅 fallback)。fireStarPassive helper skill-handlers.ts:513-531。passive-audit 无变化(星能是 _starEnergy 字段)正确。

### 技能表
| 技能 | type | 描述预期 | 审计实际 | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 星光射线 | starBeam (magic) | 3段, 每段 0.4×ATK + 6%目标当前HP 魔法 | dmgToPrimary=169532 | ✓ | 记'mag' + 末尾 fireStarPassive 真伤'tru' skill-handlers.ts:4178-4239 |
| 虫洞 | starWormhole | 永久 +(6+0.5×lv)魔穿 + 沿目标横排(前后同位)4段共 1.5×ATK×(1+10%回合) 魔法 + 击飞 | dmgToPrimary=136, touched=2(含caster) | ✓ ⚠️ | 魔穿+魔法'mag'+knockup+fireStarPassive skill-handlers.ts:4500-4534;**"横排"实为 sameColumnFighters=front-N+back-N(纵向前后位)**, 与赛博能量大炮同一约定(代码注释4498-4499 自承), 但虫洞 brief 未注明"前后同位", 文案略易误解 |
| 流星暴击 | starMeteor (magic) | AOE 100%ATK 魔法 + mrDown-20%/3t;满能消耗全能对全敌 100%储能真伤 | dmgToPrimary=76, dmgToAll=174, touched=3, mrDown20/3 | ✓ | 魔法'mag'/burst真伤'tru'(burstPct100) + fireStarPassive skill-handlers.ts:4243-4311 |
| 黑洞 | starBlackhole | 非最后敌: 100%ATK魔法+踢入黑洞(stun1回合);最后1敌: 1.8×ATK魔法 或 <15%HP斩杀 | dmgToPrimary=49(=ATK), blackhole1/2+stun1/2, touched=1 | ✓ | skill-handlers.ts:4321-4442 |
| 扭曲空间 | starGravityWarp (magic) | AOE 0.8×ATK 魔法;满能换位 F0↔B2/F1↔B1/F2↔B0 | dmgToPrimary=61, dmgToAll=139, touched=3 | ✓ | 魔法'mag' + 满能换位发事件 + fireStarPassive skill-handlers.ts:4445-4496 |

---

## 缩头乌龟 (hiding)
### 被动: 喊龟 summonAlly — ✓ — 战斗开始召唤随机 C/B/A 级随从(HP=本体maxHp×40%, 强化版110%), 挂 owner._summon, 随从每回合末自动出招;随从躲身后→敌方单体技能不可选中(BattleScene:2639), AOE 仍命中。召唤 spawnSummonAlly BattleScene:6008-6053。passive-audit 无 buff 变化(召唤发生在 battle init)正确。

### 技能表
| 技能 | type | 描述预期 | 审计实际 | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 攻击 | physical | 100%ATK 物理 + 自身护甲 +20%(2回合) | dmgToPrimary=41, casterBuff defUp4/3(=20%×baseDef20, dur turns+1) | ✓ | selfDefUpPct skill-handlers.ts:592-598 |
| 防御 | hidingDefend | 20%maxHp 护盾(4回合), 到期剩余盾20%转生命 | casterShield=0 | ✓(见注) | 盾入自定义 _hidingShieldVal(非 caster.shield), damage.ts:223 吸收, 到期转生命 BattleScene:7489-7503;**审计 casterShield=0 因读不到自定义盾字段, 非bug, 显示待眼验** |
| 指挥 | hidingCommand | 命令随从立即额外出招一次 | 无伤害, touched=1(无随从→只caster) | ✓ | emit 'hiding-command' skill-handlers.ts:5475-5486 |
| 强化随从 | hidingBuffSummon | 随从 atk/def/mr+10%, 吸血+10%, 暴击+20%, 2回合 | 无伤害, touched=1(无随从) | ✓ | buff 上在 summon 身上 skill-handlers.ts:5450-5471 |
| 强化喊龟 | hidingEnhancedSummon | enhancesPassive: 本体-50%maxHp, 随从改110%maxHp | passiveSkill, no-op handler | ✓ 显示待眼验 | BattleScene:1347-1359(_summonHpBase) |

---

## 无头龟 (headless)
### 被动: 亡灵 undeadRage — ✓ — 登场 22% 吸血(BattleScene:5087-5089);每损1%生命 ATK+1%(上限+100%, applyUndeadRageAtk:5096-5105);首次濒死锁1HP+亡灵2回合(_undeadLockTurns, 死亡hook:4496-4502, HP不可<1 由 applyRawDamage damage.ts:189 守)。passive-audit 无变化(ATK 加成需失血, dummy满血)正确。

### 技能表
| 技能 | type | 描述预期 | 审计实际 | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 撕咬 | physical | 2段共 130%ATK + 8%目标maxHp 物理 | dmgToPrimary=80058 | ✓ | hits2/atkScale0.65/hpPct4×2 skill-handlers.ts:543-600 |
| 恐吓 | twoHeadFear | 0.9×ATK 物理 + 恐惧3回合(对无头龟伤害-20%, 真实除外) | dmgToPrimary=40, fear20/4 | ✓ ⚠️ | 物理 + fear buff skill-handlers.ts:5802-5823;**fear 在 damage.ts:66-68 减"被恐惧者对所有目标"的物理/魔法伤害(全局), 描述写"对无头龟", 实现更宽松(对所有人减伤);真实除外 ✓** |
| 灵魂收割 | soulReap | AOE 110%ATK + 10%目标已损HP 物理 | dmgToPrimary=48(=1.1×44,满血0损), dmgToAll=144, touched=3 | ✓ | 每敌按自身已损血, 记'phy' skill-handlers.ts:5360-5397 |
| 亡灵风暴 | headlessStorm | 本次 +22%吸血, AOE 3段共 150%ATK 物理 | dmgToPrimary=66, dmgToAll=198, touched=3 | ✓ | 3×0.5×ATK 无暴击/无护甲减(JS 1:1) 记'phy' + tempLifesteal skill-handlers.ts:3906-3940 |
| 灵魂打击 | headlessSoulStrike (magic) | 0.9×ATK + 20%目标当前HP 魔法 | dmgToPrimary=200040 | ✓ | **加 calcEffMr 魔抗减免 + 可暴击, 记'mag'(已修离群raw bug)** skill-handlers.ts:5339-5356 |

---

## 龟壳 (shell)
### 被动: 气场觉醒 auraAwaken — ✓ — 第4回合一次性永久全属性 +12%(ATK/DEF/MR/maxHP/吸血/反伤) + 暴击 +25%, 写 baseAtk/baseDef/baseMr(applyRoundStartPassive:5518-5543, 眩晕也不漏);受伤累积 _auraEnergy(上限50%maxHp, passive-triggers.ts:196-200), 每4回合 burst: 储能×(40%+1%/lv) 物理AOE(记'phy') + 储能×(80%+1%/lv) 气场盾(2回合衰减, BattleScene:7591-7636);强化觉醒第8回合二次觉醒。passive-audit `self:[_auraEnergy+100]` 印证受击储能。

### 技能表
| 技能 | type | 描述预期 | 审计实际 | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 攻击 | shellStrike | 2段(段1物理/段2真实)共 120%ATK混合, 每段对相邻溅射25%;无相邻该段×1.5 | dmgToPrimary=62, dmgToAll=78, touched=2 | ✓ | 偶段记'phy'/奇段记'tru' + 溅射类型跟随主段 skill-handlers.ts:2268-2348 |
| 复制 | shellCopy | 随机复制敌方2个可用技能, 60%效果立即释放 | dmgToPrimary=71, casterShield=23, touched=2 | ✓ 显示待眼验 | COPY_MULT 0.6 全字段缩放 + 黑名单 skill-handlers.ts:2129-2203 |
| 吸收 | shellAbsorb | 偷目标10%maxHp 转给自身(双方maxHp与当前HP同步增减) | dmgToPrimary=100000, casterHpDelta=100000, touched=2 | ✓ | target maxHp/hp 双扣, caster 双增, 记'tru' skill-handlers.ts:2243-2259 |
| 侵蚀 | shellErode (magic) | N道弯波(N=3+暴击每20%加1), 每道主目标 0.25×ATK + 同列另一 0.10×ATK 魔法 | dmgToPrimary=39, touched=1(无同列) | ✓ | waveCount=3+floor(crit%/20)=4(crit25%) skill-handlers.ts:2206-2235 |
| 强化觉醒 | shellEnhanceAwaken | enhancesPassive: 第8回合二次觉醒(同首觉效果) | passiveSkill, no-op handler | ✓ | enhancedAwakenTurn8 触发 BattleScene:5542 |

---

## 本组问题清单
- [低] space·虫洞(starWormhole): brief "沿目标横排移动" 实际命中 sameColumnFighters = front-N + back-N(纵向前后同位置), 与赛博"能量大炮"同一游戏约定(代码自承), 但虫洞描述未像能量大炮那样注明"同高度的前后位置", 文案略易误解。逻辑无 bug。(skill-handlers.ts:4508, slot-helpers.ts:70-75, pets.ts:3173-3174)
- [低] headless·恐吓(twoHeadFear): 描述"被恐惧目标对**无头龟**的伤害减少20%", 实现的 fear buff 在 damage.ts:66-68 减少被恐惧者对**所有目标**的物理/魔法伤害(无来源判定), 比描述更宽松(玩家利好);真实伤害正确排除。(skill-handlers.ts:5816)
- [低/非bug] hiding·防御(hidingDefend): 审计 casterShield=0 是因护盾进自定义字段 _hidingShieldVal(限时盾)而非 caster.shield, 审计字段读不到。逻辑正确(damage.ts:223 吸收 + BattleScene:7489-7503 到期转生命), 仅 HUD/审计可见性差异, 显示待眼验。
