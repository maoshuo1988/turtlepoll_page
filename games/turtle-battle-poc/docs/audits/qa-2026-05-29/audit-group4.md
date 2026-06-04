# Group 4 审计 (bubble/line/lightning/phoenix/lava)

> 三方源: 描述 `src/data/pets.ts`(行号下注) · 实现 `src/engine/skill-handlers.ts` / `passive-triggers.ts` / `BattleScene.ts` / `damage.ts` · 审计实际 `skill-audit.json` + `passive-audit.json`。
>
> **审计模式 HP 假象说明**: 多行 `dmgToPrimary` 形如 `80040 / 312034 / 295079` 是审计假人最大生命值极大(命中后 hpLoss 累计成数十万) 的取数副作用, 不代表数值 bug。本组凡含 maxHp 比例项 (lavaBolt 的 8%maxHp) 的技能会出现此形态, 已逐项标注 "HP假象, 非bug"。

---

## 泡泡龟 (bubble)

### 被动: 泡沫 bubbleStore — ✓ — 受伤(hpLoss) 100% 存为泡泡值(cap=maxHp); 每回合 15% 回血 + 35% 化魔法打随机敌。
- 储能: `passive-triggers.ts:274-281` 用 `ctx.hpLoss ?? dmg` × pct(100), cap=maxHp。审计 `passive-audit.json` bubble `asTarget: self:[bubbleStore+100]` 命中 100% 储存, 正确。
- desc 行 `pets.ts:2084-2085` healPct=15 / dmgPct=35。回血与放魔法在 side-end 结算 (非本审计字段覆盖) → **回血/放魔法显示待眼验**, 储能逻辑已核实。

### 技能表
| 技能 | type | 描述预期 | 审计实际(dmg/类型/段/buff/盾/hp) | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 泡泡攻击 | physical | 3段共150%×ATK 物理 | dmgToPrimary63 type physical touched1 | ✓ | 通用 physical handler; atkScale0.5×3=1.5 (`pets.ts:2096`) |
| 泡泡盾 | bubbleShield | 友方 180%×ATK 泡泡盾3回合, 到期爆裂200%×ATK 全体魔法 | casterBuffs bubbleShield:74/4 (=1.8×41) shield字段0 | ✓ | 独立护盾池 bubbleShieldVal, 非普通shield (`skill-handlers.ts:5431-5446`); burstScale=2 存于 `bubbleShieldBurstScale`, 到期爆裂走 processRoundEndBuffs → **爆裂显示待眼验** |
| 泡泡束缚 | bubbleBind | 束缚8回合, 每受一段-X甲抗(lv1-5=1/6-10=2) cap30 | targetBuffs bubbleBind:1/9 | ✓ | duration8→buff dur 9(turn-end-1) (`skill-handlers.ts:3454-3467`); 每段扣减在 `passive-triggers.ts:314-330` perHitLoss/lossCap/lossUsed 守卫齐全 |
| 泡泡爆破 | bubbleBurst | 消耗全部泡泡: 竖排每敌 40%×消耗值魔法 + 80%×ATK物理 | dmgToAll99 touched3 (魔+物分记) | ✓ | 竖排=同 `_position` (≤3); magic 记 'mag' / phys 记 'phy' 双段分类型统计 (`skill-handlers.ts:3471-3510`) |
| 治愈泡泡 | bubbleHeal | 单友回 120%×ATK+10%maxHp, 其他友 25% 溅射 | hpDelta0 touched1 (审计无友军) | ✓ | applyHeal 受治疗削减/守护加成 (`skill-handlers.ts:5402-5425`); 审计单体无队友→splash无量, 逻辑正确 |

---

## 线条龟 (line)

### 被动: 墨迹 inkMark — ✓ — 技能叠墨迹(cap5; 速写后cap7+转真伤), 目标受伤每层额外 5% 魔法(速写后真实)。
- 额外伤实现 `damage.ts:281-295` applyInkBonus: `original × stacks × 0.05`, magic 走魔抗 / `_inkRapidActive`(速写) 转 true 且 pierce。叠层 helper `skill-handlers.ts:453-468`(cap 默认5, `_inkCapOverride`=7)。
- 审计 `passive-audit.json` line `asAttacker/asTarget` 全 "(无变化)" — 因被动本身不在登场/受击瞬间触发(靠技能叠层+受伤放大), 审计探针未叠层 → 正常, 非漏装。

### 技能表
| 技能 | type | 描述预期 | 审计实际 | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 素描 | lineSketch | 3段共150%×ATK 物理, 每段+1墨迹 | dmgToPrimary83 physical touched1 | ✓ | 每段 addInkStack(+1) 含 link 同步 (`skill-handlers.ts:5154-5178`) |
| 连笔 | lineLink | 双目标各80%×ATK物理+1墨迹; 建链3回合, 一方受伤30%以魔法(速写后真实)传另一方; 墨迹同步 | dmgToPrimary41 dmgToAll82 touched2 | ✓ | 双段记 'phy'; 建 `_inkLink{transferPct30,dmgType}` (`skill-handlers.ts:5213-5283`); 传导在 `damage.ts:250-257` 按 totalShown×30% 分流 |
| 画龙点睛 | lineFinish | 70%×ATK物理 + 45%×ATK×墨迹层 引爆(默认魔法/速写后真实), 击杀重置CD | dmgToPrimary34 dmgToAll34 touched1 | ✓ | baseScale0.7 perStackScale0.45 (`pets.ts:2229-2230`); 物理记'phy'+引爆记'mag'/'tru' 分类型 (`skill-handlers.ts:3402-3448`); 审计目标0墨迹→仅基础34, 引爆=0 合理 |
| 墨水炸弹 | lineInkBomb | 4段全体共100%×ATK物理, 每敌+4墨迹 | dmgToPrimary48 dmgToAll144 touched3 | ✓ | atkScale0.25×4 + inkStacks4 (`pets.ts:2255-2256`,`skill-handlers.ts:5183-5208`) |

---

## 闪电龟 (lightning)

### 被动: 雷电 lightningStorm — ✓ — 每回合(side-end)自动电击随机敌 82%×ATK真伤; 每段攻击+1电击层, 满8层引爆 82%×ATK 真伤并清零。
- 每回合自动电击: `BattleScene.ts:6944-6969` side-end zap, 0.82×ATK 真伤 pierce + recordDamage 'tru'。**P144 已删 turn-begin 的重复错误实现**(注释 `BattleScene.ts:5202-5205`)。
- 满层引爆: `passive-triggers.ts:375-396` stackMax(默认5, passive 配 `stackMax:8`)→真伤清零, recordDamage 'tru'。
- 审计 `passive-audit.json` lightning `asAttacker: tgt:[_shockStacks+1]` 确认每段攻击+1层, 正确。

### 涌动 +50% 是否作用于"每回合自动电击": ✓ **两处都接了 surgeBoost**
- side-end 自动电击: `BattleScene.ts:6956-6957` `surgeBoost = _lightningSurgeTurns>0 ? 1+boost%/100 : 1`, `shockDmg = atk×shockScale×surgeBoost`。
- 满层引爆: `passive-triggers.ts:384-386` 同款 surgeBoost。
- buff 计时 turn-begin -1: `BattleScene.ts:5158-5164`。涌动 handler 设 `_lightningSurgeTurns = surgeTurns+1` (`skill-handlers.ts:2953`)。描述"被动电击(含满层引爆)+50%"与实现一致。

### 技能表
| 技能 | type | 描述预期 | 审计实际 | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 闪电打击 | lightningStrike | 5段共23%×ATK魔法(总), 每段+1电击+25%溅射 | dmgToPrimary10 dmgToAll15 touched3 | ✓ | **perHit=atk×0.23/hits(=除5)** 防 5×超伤 (`skill-handlers.ts:2848-2849`); dealMagic 内 triggerOnHit 自动+电击层; 溅射基数=perHit×25%。主伤低是设计(注释:主价值在叠层+溅射) |
| 涌动 | lightningSurgeBuff | 2回合内电击真伤+50%; 立即对目标 82%×ATK×1.5 真伤 | dmgToPrimary55 type(handler) touched2 | ✓ | dmg=atk×shockScale×(1+50%)=42×0.82×1.5≈51(+暴击浮动) (`skill-handlers.ts:2948-2968`); 真伤记'tru'; touched2含caster |
| 雷暴 | lightningBarrage | 20道随机魔法共220%×ATK, 每道+1电击 | dmgToPrimary30 dmgToAll137 touched3 | ✓ | arrowScale0.11×20 (`pets.ts:2328`); dealMagic自动叠层 (`skill-handlers.ts:2880-2899`) |
| 感电 | lightningSurge | 全体按电击层每层10%×ATK真伤并清层 | dmgToAll0 touched0 (探针无层) | ✓ | shockPerStackScale0.1 真伤记'tru', **先清层再triggerOnHit** 防重叠 (`skill-handlers.ts:2902-2924`); 审计目标0层→0伤0命中, 正确边界 |
| 雷盾 | lightningShield | 自身90%×ATK护盾; 持盾每受一段反击10%×ATK魔法+1电击 | casterShield41 casterBuffs counter:5/3 | ✓ | shield=0.9×45≈41; counter buff value=0.1×45≈5(round4-5) dur3 (`skill-handlers.ts:2927-2941`); 反击在 `passive-triggers.ts:363-373` 仅持盾(shield>0)时触发, 记'mag' |

---

## 凤凰龟 (phoenix)

### 被动: 涅槃 phoenixRebirth — ✓ — 首次死亡以30%maxHp复活, 对全体敌施灼烧(0.67×ATK)+治疗削减3回合; 强化涅槃改100%HP+永久+20%ATK。
- `BattleScene.ts:4084-4092` 检 `passive.type==='phoenixRebirth' && !_rebirthUsed`; revivePct=30; isEnhanced→100% + ATK buff。审计探针不触发死亡 → `passive-audit.json` 全"(无变化)"正常。**复活+全体灼烧显示待眼验**(逻辑已核实)。

### 技能表
| 技能 | type | 描述预期 | 审计实际 | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 灼烧 | phoenixBurn | 90%×ATK魔法 + 0.53×ATK灼烧值 | dmgToPrimary41 type magic burn:24/999 | ✓ | dealMagic(0.9×46≈41); dot=round(46×0.53)=24 层数模型 dur999 (`skill-handlers.ts:2038-2052`); 灼烧 tick 走 dot.ts 记魔法 |
| 熔岩盾 | phoenixShield | 75%×ATK 熔岩盾4回合(限时), 持盾受击反击14%×ATK魔法 | casterShield0 casterBuffs"-" hpDelta0 | ⚠️ | **限时盾正确实装但不进审计字段**: 用 `_lavaShieldVal/_lavaShieldTurns`(独立池, 非 `shield`/`buffs`) (`skill-handlers.ts:2055-2066`), 故 casterShield/casterBuffs 显示空属预期; 反击在 `passive-triggers.ts:349-361` 判 `_lavaShieldVal>0`。dur=4 ✓。判⚠️仅因审计字段无法体现该特殊池, **非bug**(用户2026-05-29 主动改为限时池) |
| 烫伤 | phoenixScald | 破50%护盾(含泡泡盾)+70%×ATK魔法+atk/def/mr-15%+灼烧+治疗削减 均4回合 | dmgToPrimary32 atkDown/defDown/mrDown:15/5,burn:31/999,healReduce:50/5 | ✓ | 同破 shield+bubbleShieldVal (`skill-handlers.ts:2068-2098`); 三debuff dur=turns+1=5; burn层=round(46×0.67)=31; healReduce dur5。全中 |
| 火焰净化 | phoenixPurify | 清友方所有减益, 每清1个回10%maxHp | hpDelta0 touched1 (探针无减益) | ✓ | debuffTypes 含 chilled/stun (`skill-handlers.ts:2100-2116`); recalcStats 立即恢复; 审计目标无减益→0回血, 边界正确 |

---

## 熔岩龟 (lava)

### 被动: 熔岩之心 lavaRage — ✓ — 造成伤害25%+承受伤害(hpLoss)20%累怒气, 满100变身火山龟6回合(+属性+火山技能组+变身AOE灼烧回血); 强化版开局直接满怒变身。
- 攻方累怒 `passive-triggers.ts:256-263` dmg×25%; 受方 `:264-272` hpLoss×20%(打盾不积); 满 max(100) 设 `_lavaRageReady`。审计 `passive-audit.json` lava `asAttacker self:[_lavaRage+25] asTarget self:[_lavaRage+20]` 精确匹配 25/20。
- 变身: `BattleScene.ts:5821-5924` 加成基于变身前 ATK (transformHpScale2.5/atk0.2/def0.2/mr0.2, `pets.ts:2502-2507`), 切 volcanoSkills, 变身AOE 120%×ATK魔法+灼烧+8%已损HP回血。**变身/AOE 显示待眼验**(逻辑已核实)。

### 跨形态链路 (volcanoSkills 配对): ⚠️ 见问题清单
- 切技能 `BattleScene.ts:5854-5862` 按 **已装备 index**(`_equippedIdxs` 或 defaultSkills) 配对取 volcanoSkills 同 index。
- `volcanoSkills` 顺序 (`pets.ts:2594-2666`): [0]烈焰重击 volcanoSmash, [1]熔岩铠甲 volcanoArmor, [2]火山爆发 volcanoErupt, [3]岩浆践踏 volcanoStomp, [4]强化熔岩之心(passive)。
- defaultSkills=[0,1,2] (`pets.ts:2588-2592`) → 默认配对得 烈焰重击/熔岩铠甲/火山爆发, **岩浆践踏(index3)默认拿不到**, 仅当玩家把小形态技能槽选到 index3 才会带过来。属可达性设计但与"火山技能组"直觉有出入 → 标⚠️ 供用户拍板。

### 技能表 (小形态)
| 技能 | type | 描述预期 | 审计实际 | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 熔岩弹 | lavaBolt | 90%×ATK + 8%目标maxHp 魔法 + 灼烧4回合 | dmgToPrimary80040(HP假象) burn:29/999 | ✓ | mainDmg走魔抗, hpBonus(8%maxHp)不走魔抗, 合并一次applyRawDamage记'mag' (`skill-handlers.ts:2754-2778`); burn层=round(44×0.67)=29; 80040=8%×假人巨额maxHp, **非bug** |
| 地裂 | lavaQuake | 全体60%×ATK魔法 + -20%魔抗3回合 | dmgToPrimary26 dmgToAll78 touched3 mrDown:20/4 | ✓ | dealMagic; mrDown max-merge 防重复叠 (`skill-handlers.ts:2780-2801`); dur=turns+1=4 |
| 岩浆涌动 | lavaSurge | 单体150%×ATK魔法 + 自身80%×ATK永久护盾 | dmgToPrimary66 casterShield35 touched2 | ✓ | dmg=dealMagic(1.5×44); shield=round(44×0.8)≈35 (`skill-handlers.ts:2802-2813`); touched2含caster |
| 熔岩喷射 | lavaSplash | 全体3段共60%×ATK魔法 + 灼烧4回合 | dmgToPrimary27 dmgToAll81 touched3 burn:29/999 | ✓ | **aoe:true 已修真·全体**(注释H7, 旧版单体bug已修) (`skill-handlers.ts:2817-2837`); atkScale0.2×3段 |

### 技能表 (火山形态 volcanoSkills — 审计未跑, 仅源码核实)
| 技能 | type | 描述预期 | 实现核实 | 判定 | 备注(file:line) |
|---|---|---|---|---|---|
| 烈焰重击 | volcanoSmash | 单体130%×ATK+8%自身maxHp物理 + 20%生命偷取 | physical记'phy', selfHpPct8, lifesteal20 | ✓ | `skill-handlers.ts:4539-4565` |
| 熔岩铠甲 | volcanoArmor | 90%×ATK护盾 + def/mr+20%×3回合 + 回15%已损HP | shieldAtkScale0.9, defMrUp20/3, healLost15 | ✓ | `skill-handlers.ts:4657+` |
| 火山爆发 | volcanoErupt | 全体5段共(110%×ATK+15%自身maxHp)魔法 + 灼烧 + 总伤15%吸血 | 5段magic记'mag', selfHpPct3, burn, 15%lifesteal | ✓ | `skill-handlers.ts:4570-4611` |
| 岩浆践踏 | volcanoStomp | 全体80%×ATK魔法 + 40%概率眩晕 + 回10%已损HP | AOE magic, stunChance40, healLost10 | ✓ | **已修**(旧版单体physical+100%stun+无heal完全错, 现1:1 JS) (`skill-handlers.ts:4614-4654`); 但默认配对拿不到(见上⚠️) |

---

## 本组问题清单
- [低] lava·岩浆践踏 volcanoStomp: volcanoSkills 按已装备 index 配对, defaultSkills=[0,1,2] 下 index3 的岩浆践踏默认带不到火山形态; 仅玩家把小形态技能槽选到 index3 才可达。属设计取舍但与"切到完整火山技能组"直觉有偏差, 请用户确认是否预期 (`BattleScene.ts:5854-5862`, `pets.ts:2588-2592 / 2640-2655`)。
- [低] phoenix·熔岩盾 phoenixShield: 改为特殊限时盾池(`_lavaShieldVal`, 4回合) 后, 不再写 `shield`/`buffs` → 审计 `casterShield=0 / casterBuffs="-"`, 纯逻辑审计无法验盾值与到期/反击表现, 需眼验 HUD aura 段特殊色 + 反击飘字 (`skill-handlers.ts:2055-2066`, `passive-triggers.ts:349-361`)。
- [低/待眼验] 显示层项 (非逻辑bug): 泡泡盾到期爆裂、泡泡被动每回合回血/放魔法、凤凰涅槃复活+全体灼烧、熔岩变身AOE/回血/换贴图 — 均逻辑已核实, 表现需运行眼验。

## 结论
本组 ✗ = 0, ⚠️ = 2 (phoenixShield 限时盾审计字段不可见 / lava volcanoStomp 默认可达性), 其余 23 项技能+被动判定 ✓。两处⚠️均为设计取舍或审计探针局限, 非功能 bug; 涌动 +50% 已确认作用于"每回合自动电击"与"满层引爆"两处, 熔岩盾确为 4 回合限时盾, 闪电打击已除段数(无 5× 超伤), 混合伤害(泡泡爆破/连笔/画龙点睛引爆/熔岩弹)均按类型分别 recordDamage。
