# 忍者龟 1:1 Diff Audit

读源: `games/turtle-battle/js/pets.js:177-214`, `ninja.js`, `battle-setup.js:221`, `fighter.js:171`

## 数值层 (CRITICAL — 影响游戏数学)

### ninjaInstinct passive (开局一次性 buff)
| 项 | JS battle-setup.js:221-225 | Phaser | Status |
|---|---|---|---|
| +30% 暴击率 | `f.crit += critBonus/100` (0.30) | **完全没** | ❌ |
| +20% 暴击伤害 永久 | `_extraCritDmgPerm = critDmgBonus/100` (0.20) | **完全没** | ❌ |
| +8 护甲穿透 | `f.armorPen += 8` | **完全没** | ❌ |

**实际影响**: 忍者龟开局应是凶残暴击龟 (crit 25→55%, critDmg 1.5→1.7, +8 armorPen). 现在 Phaser 跟普通 B 龟一样, **核心强度被砍掉 ~40%**.

### ninjaFeet passiveSkill (玩家装备此技能时永久 buff)
| 项 | JS fighter.js:171-174 | Phaser | Status |
|---|---|---|---|
| +25% 闪避 | `_extraDodge += 25` | **完全没** (handler no-op) | ❌ |
| +40% 暴击 | `f.crit += 0.40` | **完全没** | ❌ |

**实际影响**: 玩家选 ninjaFeet 替代某 active skill, **零收益**. JS 装上后 crit 累计 55%+40% = 95%, Phaser 还是 25%.

## ninjaShuriken 飞镖 (E3/24 已修, ✓)
- 260ms wait + spritesheet 旋转 + damageAtMs 240 + crit 拆 TRUE+PHYS — 全 1:1
- hit-shake CSS class → tween yoyo (等效)

## ninjaImpact 冲击 (基础数据 ✓, 视觉漏 9 项)
| 项 | JS ninja.js:155-374 (~220 行) | Phaser ninjaImpact (~20 行) | Status |
|---|---|---|---|
| atkScale 1.3 / behindScale 0.8 | ✓ | ✓ | ✓ |
| crit + DEF 减免 (dealPhysical) | ✓ | ✓ | ✓ |
| **run.png 4-frame 400ms phase 0** (caster Y-hop to target row) | ✓ | 漏 | ❌ |
| **dash.png 18-frame 1800ms** sprite overlay | ✓ | 漏 | ❌ |
| **300ms windup F1-3** | ✓ | 漏 | ❌ |
| **500ms flight + ninja-dash-trail VFX** | ✓ | 漏 | ❌ |
| **mid-flight hit timing** (`passFraction = hitX/dashX`) | ✓ | 立即落 | ❌ |
| **14-stage knockup juggle 1400ms** (launch→apex→slam→bounce→rise→walk back) | ✓ | 简单 knockup | ⚠ |
| **camera shake on arrival** | ✓ | 漏 | ❌ |
| **chi-hit-flash** 140ms target flash class | ✓ | 漏 | ❌ |
| **1000ms recovery** | ✓ | 漏 | ❌ |

## ninjaBomb 炸弹 (基础数据 ✓, 视觉漏 6 项)
| 项 | JS ninja.js:523-674 (~150 行) | Phaser ninjaBomb (~15 行) | Status |
|---|---|---|---|
| atkScale 1.1 / armorBreak{25,3} | ✓ | ✓ | ✓ |
| 全敌 dealPhysical | ✓ | ✓ | ✓ |
| **12-frame bomb.png sprite 1200ms** | ✓ | 漏 | ❌ |
| **parabolic 抛物 + 2 bounces** (Phase A throw → B/C bounces → D settle) | ✓ | 漏 | ❌ |
| **fuse F5-8 hold 400ms** | ✓ | 漏 | ❌ |
| **800ms detonate F9 才落伤害** | ✓ | 立即落 | ❌ |
| **camera shake on detonation** | ✓ | 漏 | ❌ |
| **mushroom cloud F9-12 400ms** | ✓ | 漏 | ❌ |

## ninjaBackstab 背刺 (基础 ✓, 视觉漏 5 项)
| 项 | JS ninja.js:382-515 (~130 行) | Phaser ninjaBackstab | Status |
|---|---|---|---|
| hits 3 / atkScale 0.6667 / ignoreRow | ✓ | ✓ | ✓ |
| armorPenBuff 5 / 1 turn | 直接 += / finally 还回 | buff push + recalcStats | ⚠ E3/27 等效 |
| 段间 300ms | ✓ | ✓ E3/27 | ✓ |
| **18-frame backstab.png 1800ms sprite** | ✓ | 漏 | ❌ |
| **300ms windup F1-3** | ✓ | 漏 | ❌ |
| **F4 teleport to behind target** (geometry math) | ✓ | 漏 | ❌ |
| **F15 teleport back home** | ✓ | 漏 | ❌ |
| **F16-18 recovery** | ✓ | 漏 | ❌ |

## 总结

**数值差异 (必修)**: 5 项 ❌
1. ninjaInstinct +30% crit
2. ninjaInstinct +20% critDmg
3. ninjaInstinct +8 armorPen
4. ninjaFeet +25% dodge
5. ninjaFeet +40% crit

**视觉差异 (大块)**:
- ninjaImpact: 9 项视觉漏 (run/dash sprite + trail + timing + camera shake + knockup juggle)
- ninjaBomb: 6 项 (bomb sprite + 抛物线 + fuse delay + camera shake + mushroom)
- ninjaBackstab: 5 项 (backstab sprite + teleport-to-behind + teleport-home)
- ninjaShuriken: ✓ 已 1:1 (E3/24)

**最严重**: ninjaInstinct + ninjaFeet 让忍者龟核心强度归零, 玩家选忍者完全打不出 JS 同款威力. 这是数学 bug, 不是装饰.
