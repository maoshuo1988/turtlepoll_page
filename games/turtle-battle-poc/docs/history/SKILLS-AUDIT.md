# Skills Audit — JS 1:1 vs poc-phaser (2026-05-19)

Audit reference points:
- JS registry: `games/turtle-battle/js/skills/registry.js` (181 lines, ~110 entries)
- JS picker: `games/turtle-battle/js/action.js:186-232`
- poc handlers: `poc-phaser/src/engine/skill-handlers.ts` (4533 lines)
- poc data: `poc-phaser/src/data/pets.ts` (3409 lines)
- poc picker: `poc-phaser/src/scenes/BattleScene.ts:1118-1145` `onPlayerSkillPicked`

Legend: ✅ matches / ⚠️ partial / ❌ broken / 🆕 missing in poc / 🚫 N/A

---

## §A Player skill picker divergence (action.js:186-232 vs BattleScene.ts:1118-1145)

### A.1 JS hardcoded SELF-CAST list (action.js:197)
The JS picker fires self-cast skills WITHOUT entering target-selection mode if any of these are true:
1. `skill.selfCast === true`
2. `skill.type === 'fortuneDice'`
3. `skill.type === 'fortuneBuyEquip'`
4. `skill.type === 'phoenixShield'`
5. `skill.type === 'hidingDefend'`
6. `skill.type === 'hidingCommand'`
7. `skill.type === 'cyberDeploy'`
8. `skill.type === 'diamondFortify'`
9. `skill.type === 'diceFate'`
10. `skill.type === 'chestCount'`
11. `skill.type === 'bambooHeal'`
12. `skill.type === 'volcanoArmor'`
13. `skill.type === 'crystalBarrier'`
14. `skill.type === 'shellCopy'`
15. `skill.type === 'twoHeadSwitch' && switchTo === 'melee'` (the ranged→melee form switch is self-only)

### A.2 JS AoE auto-target list (action.js:209)
Skill auto-fires (target=null) WITHOUT target selection if:
1. `skill.aoe === true`
2. `skill.aoeAlly === true`
3. `skill.type === 'hunterBarrage'`
4. `skill.type === 'ninjaBomb'`
5. `skill.type === 'lightningBarrage'`
6. `skill.type === 'iceFrost'`
7. `skill.type === 'basicBarrage'`
8. `skill.type === 'starMeteor'`
9. `skill.type === 'starGravityWarp'`
10. `skill.type === 'diceAllIn'`
11. `skill.type === 'angelSmite'`
12. `skill.type === 'diceFlashStrike'`

### A.3 JS auto-target lowest-HP list (action.js:203)
Auto-targets lowest-HP enemy without picker:
1. `skill.type === 'mechAttack'`
2. `skill.type === 'wormBite'`

### A.4 JS ally-target list (action.js:193)
Triggers ally-target (green) picker (`isAlly`):
1. `skill.type === 'heal'`
2. `skill.type === 'shield'`
3. `skill.type === 'bubbleShield'`
4. `skill.type === 'angelBless'`
5. `skill.type === 'bubbleHeal'`
6. `skill.type === 'crystalResHeal'`
7. `skill.type === 'phoenixPurify'`
8. `skill.isAlly === true`

### A.5 Comparison table

| Category | JS list completeness | poc impl | Status |
|---|---|---|---|
| Self-cast (no target picker) | 14 explicit types + `selfCast` flag + `twoHeadSwitch→melee` (action.js:197) | poc only checks `aoe` + `aoeAlly` + `isAlly` (BattleScene.ts:1127-1141). **NEVER checks `skill.selfCast` field or the hardcoded 14-skill list** | ❌ |
| AoE auto enemies | `aoe` OR `aoeAlly` OR 10 explicit types (action.js:209) | Only `skill.aoe` (BattleScene.ts:1127). Missing: `hunterBarrage` / `ninjaBomb` / `lightningBarrage` / `iceFrost` / `basicBarrage` / `starMeteor` / `starGravityWarp` / `diceAllIn` / `angelSmite` / `diceFlashStrike` — these all set `aoe:true` in pets.ts data ✅ so they happen to work. Verified at pets.ts:214,802,2217,646,214,3040,3070,1397,568,1434 — all have `aoe:true` ⇒ AoE list redundancy survives | ⚠️ relies on data flags being set; fragile |
| Auto-target lowest-HP | `mechAttack`, `wormBite` | Not handled in `onPlayerSkillPicked`. These skills DON'T appear on player turtles directly (they're summon-only) so unlikely to hit player but **AI summons via `mechAttack` would crash trying to pick target** | ⚠️ |
| Ally-target picker | 7 types + `isAlly` flag | `isAllySkill = isAlly OR aoeAlly` THEN **forwards to `runSkillHandler(actor, actor, ...)` — fires on self instead of opening ally picker** (BattleScene.ts:1136-1140) | ❌ |
| `fortuneBuyEquip` equip filter | `_isSummon/_isPirateShip/_isDummy/_isMech` excluded (action.js:217-219) | Same filter applied in `enterTargetingMode` (BattleScene.ts:1158-1163) | ✅ |
| `taunt` redirect + front-row priority | action.js:221-228 | BattleScene.ts:1166-1175 1:1 | ✅ |
| Single candidate auto-fires | action.js:230 | BattleScene.ts:1177-1182 | ✅ |
| `commonTeamShield` aoeAlly toggle | registry `shield-flex` mode (registry.js:220-230) | poc uses `aoeAlly` data flag inside `shield` handler (skill-handlers.ts:627-641); doesn't dispatch through registry | ⚠️ different path, ends up correct |

**§A bottom line**: poc picker effectively assumes `skill.selfCast` flag is reliable and never enters target picker for self-cast. But the picker doesn't even check `selfCast`. It also routes `isAlly`/`aoeAlly` straight to caster-self instead of opening an ally-target picker. Healing teammates by player click is **impossible** in the poc.

---

## §B Skill-by-skill audit

### B.1 basic.js (小龟 — basic family)

| Skill | JS targetMode | poc handler | JS pets.js | poc pets.ts | Status | Notes |
|---|---|---|---|---|---|---|
| `physical` | n/a (普攻) | ✅ skill-handlers.ts:432 | line 60 | line 190 | ✅ | supports atkScale/defScale/mrScale |
| `turtleShieldBash` | single | ✅ skill-handlers.ts:457 (95 lines, full 5-stage anim) | line 63 | line 201 | ✅ | matches lostHpPct + shieldFromDmgPct + frostAura/basicTurtle bonus |
| `basicBarrage` | no-target (AoE auto via action.js:209) | ✅ skill-handlers.ts:554 | line 66 (hits:10, atkScale:3.1) | line 214 | ✅ | atkScale split across hits matches |
| `basicChiWave` | single (row-pierce) | ✅ skill-handlers.ts:574 | line 69 | line 225 | ✅ | self-buff (critUp/critDmgUp/lifesteal/armorPen) 1 turn + row-pierce |
| `basicSlam` | single | ✅ skill-handlers.ts:608 | line 73 | line 240 | ✅ | targetHpPct + splashAtkScale + splashHpPct |

### B.2 stone.js (石头龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `physical` (打击) | n/a | ✅ uses generic physical | ✅ | atkScale:0.35, defScale:0.75, mrScale:0.4 — generic handler covers |
| `shield` (岩石护甲) | shield-flex (aoeAlly) | ✅ skill-handlers.ts:627 | ✅ | aoeAlly=true; works |
| `heal` (磐石) | single isAlly | ✅ skill-handlers.ts:4395 | ⚠️ **simple heal** — JS pets.js:91 has `defUpPct:{pct:20,turns:3}, mrUpPct:{...}` (a buff package) — poc `heal` handler just heals, doesn't apply def/mr buffs |
| `stoneShield` (磐石之躯, selfCast) | single (target=self) | ✅ skill-handlers.ts:1457 | ✅ | shieldHpPct + shieldTurns |
| `stoneTaunt` (嘲讽, selfCast) | no-target | ✅ skill-handlers.ts:1469 | ✅ | redirectAll buff + selfShieldAtkScale shield |

### B.3 bamboo.js (竹叶龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `bambooLeaf` | single | ✅ skill-handlers.ts:1493 | ✅ | hits×(atkScale + selfHpPct%) |
| `bambooHeal` (selfCast) | no-target | ✅ skill-handlers.ts:1515 | ✅ | self-heal + ally-shield package |
| `bambooSmack` | single | ✅ skill-handlers.ts:1550 | ⚠️ knockToFront in JS bamboo.js:187 NOT in poc (slot reassignment) — poc only applies chilled debuff |
| `bambooSpikes` (aoe) | no-target | ✅ skill-handlers.ts:1577 | ✅ | hits×(atkScale + selfHpPct%) AoE |
| `bambooCharged` (passive) | no-op | ✅ stub | ✅ | passive |

### B.4 angel.js (天使龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `angelBless` (isAlly) | single ally | ✅ skill-handlers.ts:671 | ✅ | shieldScale + defBoostScale (def + mr buffs) |
| `angelEquality` | single | ✅ skill-handlers.ts:4139 | ✅ | 2 phys + extra true for A+; **missing: judgement passive trigger per hit** (JS angel.js:34-46 inlines judgement bonus damage) |
| `angelSmite` | no-target | ✅ skill-handlers.ts:689 | ⚠️ partial — confirm auto-target highest `_dmgDealt`, but JS adds permanent baseDef/baseMr theft (angel.js:153-165); poc TBD |
| `angelRevive` (passive) | n/a | ✅ skill-handlers.ts:4121 (handler exists for revive logic) | ⚠️ stub auto-revive at first dead ally; JS triggers passively on caster death |

### B.5 ice.js (冰龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `iceSpike` | single | ✅ skill-handlers.ts:2557 | ✅ | 6-hit alternating physical/magic, dodge check, judgement bonus |
| `iceFrost` (aoe in pets) | no-target (AoE auto) | ✅ skill-handlers.ts:2484 | ⚠️ — mrDown applied; verify frostAura `bonusTargets` (lava/phoenix) bonus damage is folded in |
| `iceFreeze` | single | ✅ skill-handlers.ts:2532 | ✅ | atkScale + 100% stun chance |
| `commonTeamShield` (selfCast, aoeAlly) | no-target | ✅ skill-handlers.ts:643 | ⚠️ poc uses flat `caster.atk * 0.3` default; JS uses `skill.shieldScale` (0.5 default) — different magic constant |
| `iceBurnImmune` (passive) | n/a | ✅ stub | ✅ |

### B.6 two_head.js (双头龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `twoHeadMagicWave` | single | ✅ skill-handlers.ts:2825 | ⚠️ JS two_head.js:8 alternates physical(even) / true(odd); verify poc handles split |
| `physical` (灵能冲击 aoe) | n/a | ✅ generic physical | ⚠️ JS pets.js:227 has `aoe:true, hpPct:15` — poc generic physical doesn't honor aoe flag or hpPct |
| `twoHeadSwitch (melee)` | **single but is selfCast** (action.js:197) | ✅ skill-handlers.ts:2895 | ⚠️ poc handler logic OK; **picker fails** — JS treats `switchTo:'melee'` as selfCast (no target), poc ignores this and would request target |
| `twoHeadSwitch (ranged)` | single | ✅ same handler | ✅ | needs target (defReduction debuff target) — picker correct path |
| `twoHeadHammer` (melee) | single | ✅ skill-handlers.ts:2798 | ✅ | shieldFromDmgPct + atkScale |
| `twoHeadAbsorb` (melee) | single | ✅ skill-handlers.ts:2968 | ✅ | hpPct + healAtkPct + healLostPct |
| `twoHeadFear` | single | ✅ skill-handlers.ts:4413 | ✅ | fearTurns + fearReduction |
| `twoHeadMindBlast` | single | ✅ skill-handlers.ts:2862 | ⚠️ shieldBreakPct + healReduce — verify poc handler computes shieldBreak before damage |
| `twoHeadDual/Resilience/Fusion` (passive) | n/a | ✅ stubs | ✅ |

### B.7 ghost.js (幽灵龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `ghostTouch` | single | ✅ skill-handlers.ts:754 | ✅ | normalScale (phys) + pierceScale (true) |
| `ghostPhantom` | single | ✅ skill-handlers.ts:790 | ✅ | lifestealPct + dodgePct/turns |
| `ghostStorm` | single | ✅ skill-handlers.ts:812 | ⚠️ JS branches on `hasCurse` (true vs magic damage); poc handler may not differentiate — verify |
| `ghostPhase` | single | ✅ skill-handlers.ts:851 | ⚠️ JS atkScale converted to true-damage (multi-hit during phase); verify physReducePct buff applied |
| `ghostBlast` | n/a (poc-only) | ✅ skill-handlers.ts:884 | 🚫 doesn't exist in JS, **REMOVE from poc** |
| `ghostEnhancedCurse/Curse` (passive) | n/a | ✅ stubs | ✅ |

### B.8 hunter.js (猎人龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `hunterShot` | single | ✅ skill-handlers.ts:1651 | ⚠️ JS hunter.js:14 has execThresh/execCrit/execCritDmg conditional — confirm poc threshold logic |
| `hunterStealth` | single (target=self, isAlly?) | ✅ skill-handlers.ts:4467 | ⚠️ JS:93 deals damage + dodge buff + shield; **JS targetMode is `single` (registry.js:33) but pets.js has no isAlly flag**; pet damages target and self-buffs. poc currently selfCast-only? — verify it actually fires on a clicked enemy |
| `hunterBarrage` (aoe via action.js:209) | no-target | ✅ skill-handlers.ts:3654 | ✅ | true-dmg arrows |
| `hunterPoison` | single | ✅ skill-handlers.ts:3686 | ⚠️ JS:122 uses `applyDotStacks` model (stack count); poc may use old `dot.dmg/turns` |
| `hunterMark` | single | ✅ skill-handlers.ts:1738 | ✅ | execThresh markExecPct |
| `hunterKill` (passive) | n/a | ✅ stub | ✅ |

### B.9 gambler.js (赌徒龟) & gambler-like (财神 fortune)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `gamblerCards` | single | ✅ skill-handlers.ts:3502 | ✅ | min/maxScale random per-hit |
| `gamblerDraw` | single | ✅ skill-handlers.ts:3532 | ⚠️ JS has 1-of-8 random debuff pool (atkDown/defDown/mrDown/healReduce/poison/bleed/burn/chilled); poc may apply only subset |
| `gamblerBet` | single | ✅ skill-handlers.ts:3462 | ⚠️ JS requires HP > 40% gate; verify poc enforces |
| `gamblerMultiHit` (passive) | n/a | ✅ skill-handlers.ts:2663 (active variant for passive proc) | ✅ |
| `gamblerBlood` (passive) | n/a | ✅ skill-handlers.ts:2675 (active proc handler) | ✅ |
| `gamblerEnhanced/FateWheel` (passive) | n/a | ✅ stubs | ✅ |

### B.10 fortune.js (财神龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `fortuneStrike` | single | ✅ skill-handlers.ts:2641 | ✅ | perCoinAtkScale per-hit bonus |
| `fortuneDice` (selfCast in picker — action.js:197) | no-target | ✅ skill-handlers.ts:2617 | ⚠️ poc handler exists; **picker would still pop target picker** since action.js:197 lists `fortuneDice` explicitly but pets.ts JS:330 has NO `selfCast:true` — so the picker hardcode is the only gate. poc picker doesn't have this hardcode |
| `fortuneAllIn` | single | ✅ skill-handlers.ts:4223 | ✅ | consumes all coins |
| `fortuneBuyEquip` (selfCast per action.js:197, but real target select happens via bench) | single in registry — but picker treats as self | ✅ skill-handlers.ts:4206 | ✅ | uses scene event 'fortune-buy-equip' |
| `fortuneGainCoins` (selfCast) | no-target | ✅ skill-handlers.ts:4196 | ✅ | flat coinGain |
| `fortuneGold` (passive) | n/a | ✅ stub | ✅ |

### B.11 lightning.js (闪电龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `lightningStrike` | single | ✅ skill-handlers.ts:1811 | ⚠️ JS:7 includes secondary splash 25% — verify poc handler does splash |
| `lightningBarrage` (aoe via action.js:209) | no-target | ✅ skill-handlers.ts:1837 | ✅ |
| `lightningShield` (selfCast) | single (target=self) | ✅ skill-handlers.ts:1874 | ✅ | shieldScale + counterScale counter buff |
| `lightningSurge` (aoe data flag) | no-target | ✅ skill-handlers.ts:1854 | ✅ | consumes _shockStacks |
| `commonAtkBuff` (selfCast aoeAlly) | no-target | ✅ skill-handlers.ts:653 | ⚠️ poc uses different formula `baseAtk * (1+pct/100)` permanent vs JS which pushes turn-limited buff |
| `lightningStorm` (passive) | n/a | ✅ stub | ✅ |

### B.12 star.js (星星龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `starBeam` | single | ✅ skill-handlers.ts:3008 | ✅ | atkScale + currentHpPct + star energy charge + fireStarPassive tail |
| `starWormhole` | single | ✅ skill-handlers.ts:3322 | ⚠️ verify magicPenAtkPct permanent magicPen buff |
| `starMeteor` (aoe via action.js:209) | no-target | ✅ skill-handlers.ts:3073 | ⚠️ JS triggers `starMeteorBurst` if energy full; verify poc full-energy burst path |
| `starBlackhole` | single | ✅ skill-handlers.ts:3146 | ⚠️ JS branches: last-enemy → executeThreshPct execute OR 1.8×ATK; otherwise normal + blackhole buff + stun. Confirm |
| `starGravityWarp` (aoe via action.js:209) | no-target | ✅ skill-handlers.ts:3270 | ⚠️ JS swaps front/back slots at full energy; poc may not implement slot swap |
| `starEnergy` (passive) | n/a | ✅ stub | ✅ |

### B.13 line.js (线条龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `lineSketch` | single | ✅ skill-handlers.ts:3816 | ✅ | adds inkStack per hit |
| `lineLink` | single | ✅ skill-handlers.ts:3881 | ✅ | establishes _inkLink between target + 2nd |
| `lineFinish` | single | ✅ skill-handlers.ts:2323 | ⚠️ verify burst type (true vs magic) based on `_inkTrueDmg` |
| `lineInkBomb` (aoe) | no-target | ✅ skill-handlers.ts:3849 | ✅ | hits × atkScale + inkStacks per enemy |
| `lineRapid` (passive) | n/a | ✅ skill-handlers.ts:2308 (stub fn naming odd — has async impl but really a passive enabler) | ⚠️ check passive sets `_inkTrueDmg` flag |
| `inkMark` (passive) | n/a | ✅ stub | ✅ |

### B.14 cyber.js (赛博龟) — **CRITICAL: split-brain drone state**

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `cyberDeploy` (selfCast hardcoded in action.js:197) | no-target | ❌ skill-handlers.ts:4330 — **writes `_droneCount` (number)** | ❌ JS cyber.js:336-354 writes to **`caster._drones[]` array**, with `_drones.push({ age: 0 })` |
| `cyberBeam` | single | ❌ skill-handlers.ts:2050 — reads `_droneCount` line 2060 | ❌ JS cyber.js:98 reads `(attacker._drones \|\| []).length` |
| `cyberSwarmShield` / `cyberFirewall` (aoeAlly) | no-target | ❌ skill-handlers.ts:4505 — reads `_drones?.length` line 4507 | ❌ Different field! `cyberDeploy` set `_droneCount` but `cyberSwarmShield` reads `_drones.length` → **always 0 after deploy, drone shield is broken** |
| BattleScene drone passive trigger | n/a | skill-handlers cross-reference | ❌ BattleScene.ts:3567-3571 sets `_droneCount`, but :4551-4563 spawn loop uses `_drones[]` (array). **Split-brain.** |
| `cyberDrone/EnhancedDrone` (passive) | n/a | ✅ stubs | ✅ |

**Fix path**: unify on one field. JS canonical is `_drones[]` array (lets each drone track `age`). Recommend renaming all `_droneCount` writes to `_drones.push({age:0})` and all reads to `_drones.length` so deploy/beam/shield/passive agree.

### B.15 crystal.js (水晶龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `crystalSpike` | single | ✅ skill-handlers.ts:1946 | ⚠️ verify `_pendingCrystalBoom` merge into hit float (JS:18-22) |
| `crystalBarrier` (selfCast hardcoded) | no-target | ✅ skill-handlers.ts:1978 | ✅ | self-shield + team defMrUp buff |
| `crystalBurst` (aoe) | no-target | ✅ skill-handlers.ts:1996 | ✅ | hits × magic + pierceScale |
| `crystalBall/Immortal/Resonance` (passive) | n/a | ✅ stubs | ✅ |
| `crystalResHeal` (in registry, _misc) | single | 🆕 **MISSING in poc** | ❌ | JS _misc.js:44 — healMrScale × MR + healAtkPct |
| `crystalDetonate` (in registry, _misc) | single | 🆕 **MISSING in poc** | ❌ | JS _misc.js:201 — consume `_crystallize` stacks |

### B.16 headless.js (无头龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `soulReap` (aoe) | no-target | ✅ skill-handlers.ts:4000 | ✅ | atkScale + lostHpPct + lifestealPct |
| `headlessStorm` (aoe) | no-target | ✅ skill-handlers.ts:2752 | ⚠️ JS:42 temp +lifesteal during skill; verify poc temp-buff scope |
| `headlessSoulStrike` | single | ✅ skill-handlers.ts:3981 | ✅ | atkScale + targetCurrentHpPct |
| `headlessRegen` (in registry, _misc) | no-target | 🆕 **MISSING in poc** | ❌ | JS _misc.js:54 — heal lost HP + lifestealUp buff |
| `undeadRage` (passive) | n/a | ✅ stub | ✅ |

### B.17 candy.js (糖果龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `candyBarrage` (aoe) | no-target | ✅ skill-handlers.ts:2435 | ✅ | armorPen buff + AoE hits |
| `candyBomb` (in registry, _misc) | no-target | 🆕 **MISSING in poc** | ❌ | JS _misc.js:7 — AoE multi-hit + armorPen |
| `physical` (糖果锤) | n/a | ✅ generic | ⚠️ JS pets.js:471 has `selfHpPct:5, atkDown:{...}` — generic physical doesn't apply atkDown debuff |
| `shield` (焦糖铠) | shield-flex selfCast | ✅ skill-handlers.ts:627 | ⚠️ JS:474 has `shieldAtkScale, healHpPct, selfCast:true` — poc shield handler doesn't heal |
| `candySteal/sweetTrap/candyBombPassive` (passive) | n/a | ✅ stubs | ✅ |

### B.18 lava.js / volcano.js (熔岩龟 / 火山龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `lavaBolt` | single | ✅ skill-handlers.ts:1754 | ✅ | atkScale + targetHpPct + burn |
| `lavaQuake` (aoe) | no-target | ✅ skill-handlers.ts:1764 | ✅ | atkScale + mrDown debuff |
| `lavaSurge` | single | ✅ skill-handlers.ts:1776 | ⚠️ JS:63 self-shield from shieldAtkPct — verify |
| `lavaSplash` (aoe) | single | ✅ skill-handlers.ts:1787 | ⚠️ JS registers `single` in registry but pets has `aoe:true` — picker treats as AoE auto |
| `volcanoSmash` | single | ✅ skill-handlers.ts:3348 | ✅ | atkScale + selfHpPct + lifestealPct |
| `volcanoArmor` (selfCast) | no-target | ✅ skill-handlers.ts:3431 | ✅ | shieldAtkScale + defMrUp + healLostPct |
| `volcanoErupt` (aoe) | no-target | ✅ skill-handlers.ts:3379 | ⚠️ JS:92 heals 15% of total damage at tail; verify |
| `volcanoStomp` (aoe, _misc) | no-target | ✅ skill-handlers.ts:3422 | ✅ |
| `lavaEnhancedRage/Rage` (passive) | n/a | ✅ stubs | ✅ |
| `lavaErupt` (poc-only) | — | ✅ skill-handlers.ts:1186 | 🚫 **not in JS** — verify or remove |

### B.19 chest.js (宝箱龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `chestSmash` | single | ✅ skill-handlers.ts:2696 | ⚠️ JS chest.js:1-98 has complex equip-conditional logic (star → true dmg, rock → +def+mr, thunder → 5-stack lightning, chain → 25% splash). Verify poc handles all chest equip variants |
| `chestCount` (selfCast hardcoded) | no-target | ✅ skill-handlers.ts:4264 | ✅ | healHpPct + shieldAtkScale × treasureBonus |
| `chestStorm` (aoe) | no-target | ✅ skill-handlers.ts:3594 | ⚠️ same chest-equip complexity as chestSmash; verify |
| `chestGreed/Intuition/Treasure` (passive) | n/a | ✅ stubs/handlers (4286, 4315) | ⚠️ chestGreed/Intuition exist as active in poc but should be passives in JS |

### B.20 pirate.js / rainbow.js (海盗 / 彩虹)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `pirateCannonBarrage` (aoe) | no-target | ✅ skill-handlers.ts:3942 (REWRITTEN) | ✅ |
| `piratePlunder` | single | ✅ skill-handlers.ts:2246 | ✅ | shield break + atkScale + steal def/mr |
| `pirateBarrage` (poc-only?) | — | ✅ skill-handlers.ts:2229 | 🚫 **not in JS registry** but JS has `pirateBarrage` as passive (pets.js:443) — this should be a passive stub, not active handler |
| `rainbowStorm` (aoe) | no-target | ✅ skill-handlers.ts:1904 | ⚠️ JS:50 applies `applySkillDebuffs(skill, enemy)` (burn etc) — verify |
| `rainbowGuard` (isAlly) | single ally | ✅ skill-handlers.ts:3796 | ✅ | shieldAtkScale + atkUp buff |
| `rainbowPrism` | n/a (passive) | ✅ skill-handlers.ts:1889 | ⚠️ exists as active but should be passive |
| `rainbowEnhancedPrism` (passive) | n/a | ✅ stub | ✅ |
| `rainbowBarrier` (in registry, _misc) | no-target | 🆕 **MISSING in poc** | ❌ | shieldAtkScale × allies |
| `rainbowHeal` (in registry, _misc, alias of `bambooAoeHeal`) | no-target | 🆕 **MISSING in poc** | ❌ |
| `pirateFlag` (in registry, _misc) | no-target | 🆕 **MISSING in poc** | ❌ | team atkUp |

### B.21 phoenix.js (凤凰龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `phoenixBurn` | single | ✅ skill-handlers.ts:1115 | ✅ | atkScale magic + burn DoT stacks |
| `phoenixShield` (selfCast hardcoded) | no-target | ✅ skill-handlers.ts:1126 | ⚠️ JS sets `_lavaShieldVal/Turns/Counter` (specific fields for counter logic); verify poc tracks counter |
| `phoenixScald` | single | ✅ skill-handlers.ts:1136 | ⚠️ JS:65 breaks 50% shield (incl bubbleShield) before damage; verify ordering |
| `phoenixPurify` (isAlly) | single ally | ✅ skill-handlers.ts:1160 | ✅ | removes debuffs + heals per removed |
| `phoenixFlare` (poc-only) | — | ✅ skill-handlers.ts:1176 | 🚫 **not in JS registry, not in JS pets — REMOVE** |
| `phoenixEnhancedRebirth/Rebirth` (passive) | n/a | ✅ stubs | ✅ |

### B.22 ninja.js (忍者龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `ninjaImpact` | single | ✅ skill-handlers.ts:895 | ⚠️ JS:155 has `behindScale:0.8` (back-row scaling); verify |
| `ninjaShuriken` | single | ✅ skill-handlers.ts:936 | ⚠️ JS:1 has crit split (truePct = 40 + 2×lv) → physical + true; verify poc handler does crit split |
| `ninjaBomb` (aoe via action.js:209) | no-target | ✅ skill-handlers.ts:1066 | ✅ | armorBreak buff |
| `ninjaBackstab` | single (`ignoreRow:true`) | ✅ skill-handlers.ts:1086 | ⚠️ JS:382 has armorPenBuff + ignoreRow (skips front-row gate); confirm poc honors |
| `ninjaFeet/Instinct` (passive) | n/a | ✅ stubs | ✅ |

### B.23 shell.js (龟壳龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `shellStrike` | single | ✅ skill-handlers.ts:1315 | ⚠️ JS:1 has adjacent splash (splashAdjacent%) + isolatedBonus 1.5×; verify poc |
| `shellCopy` (selfCast hardcoded) | no-target | ✅ skill-handlers.ts:1199 (recursively calls SKILL_HANDLERS) | ⚠️ JS:113 has 24-item BLACKLIST; poc has 25 items but **subtle differences**: poc missing `cyberBuff`, `chestCount`, `chestSmash`, `mechAttack`, `starShieldBreak`; JS doesn't include `lightningShield` in SELF set whereas poc does |
| `shellErode` | single | ✅ skill-handlers.ts:1260 | ✅ | N waves (3 + crit/20) main + same-col splash |
| `shellAbsorb` | single | ✅ skill-handlers.ts:1292 | ✅ | maxHp drain + transfer to caster |
| `shellEnergyShield` (in registry, _misc) | no-target | 🆕 **MISSING in poc** | ❌ | converts `_storedEnergy` to shield |
| `shellAuraBurst` (in registry, _misc) | no-target | 🆕 **MISSING in poc** | ❌ | atkScale + energyDmgScale × stored energy |
| `auraAwaken/EnhanceAwaken` (passive) | n/a | ✅ stubs | ✅ |

### B.24 dice.js (骰子龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `diceAttack` | single | ✅ skill-handlers.ts:1600 | ⚠️ JS:1 uses critBonusMult ATK×crit% bonus; verify |
| `diceAllIn` (aoe via action.js:209) | no-target | ✅ skill-handlers.ts:3715 | ✅ | lifestealPct |
| `diceFate` (selfCast hardcoded) | no-target | ✅ skill-handlers.ts:1629 | ✅ | random crit buff |
| `diceFlashStrike` (aoe via action.js:209) | no-target | ✅ skill-handlers.ts:3754 | ✅ | 1d6 random + falloff |
| `diceDeathBet` (in registry, _misc) | single | 🆕 **MISSING in poc** | ❌ | atkScale + lostHp bonus |
| `diceLuckyCrit` (in registry, _misc) | single | 🆕 **MISSING in poc** | ❌ | random crit 150-350% |
| `diceGamblerConvert` (passive) | n/a | ✅ stub | ✅ |

### B.25 diamond.js (钻石龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `diamondFortify` (selfCast hardcoded) | no-target | ✅ skill-handlers.ts:4446 | ✅ | shieldHpPct + defUpAtkPct/mrUpAtkPct |
| `diamondCollide` | single | ✅ skill-handlers.ts:1422 | ⚠️ JS:36 tracks `_diamondCollideCount[tIdx]` for cumulative stun-after — verify poc tracking |
| `diamondSmash` | single | ✅ skill-handlers.ts:1396 | ✅ | def+mr+atk damage + bleed DoT stacks |
| `diamondStructure/Enhanced` (passive) | n/a | ✅ stubs | ✅ |

### B.26 hiding.js (喊龟 / summon master)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `hidingDefend` (selfCast hardcoded) | no-target | ✅ skill-handlers.ts:2733 | ⚠️ JS:1 pushes `hidingShield` buff (`turns:shieldDuration, healPct on expiry`); verify poc tracks expiry heal |
| `hidingCommand` (selfCast hardcoded) | no-target | ✅ skill-handlers.ts:4106 | ⚠️ poc emits `hiding-command` scene event; verify BattleScene listens and triggers summon's `summonAutoAction` (full sub-skill execution chain) |
| `hidingBuffSummon` (selfCast) | no-target | ✅ skill-handlers.ts:4084 | ✅ |
| `hidingReflect` (in registry, _misc) | no-target | 🆕 **MISSING in poc** | ❌ |
| `hidingStrike` (in registry, _misc) | single | 🆕 **MISSING in poc** | ❌ |
| `summonAlly` (passive) | n/a | ✅ stub | ✅ |
| `hidingEnhancedSummon` (passive) | n/a | ✅ stub | ✅ |

### B.27 bubble.js (泡泡龟)

| Skill | JS targetMode | poc handler | Status | Notes |
|---|---|---|---|---|
| `bubbleShield` (isAlly) | single ally | ✅ skill-handlers.ts:4067 | ✅ | bubbleShieldVal + duration + owner |
| `bubbleBind` | single | ✅ skill-handlers.ts:2374 | ✅ | perHitLoss debuff |
| `bubbleHeal` (isAlly hardcoded) | single ally | ✅ skill-handlers.ts:4035 | ✅ | healAtkPct + healHpPct + splashPct |
| `bubbleBurst` | single | ✅ skill-handlers.ts:2390 | ⚠️ JS:54 hits target's row (front/back) — verify poc handler resolves row |
| `bubbleStore` (passive) | n/a | ✅ stub | ✅ |

### B.28 _misc.js (chain-fed enhanced variants — most absent in poc)

| Skill | JS targetMode | poc handler | Status |
|---|---|---|---|
| `candyBomb` | no-target | 🆕 **MISSING** | ❌ |
| `mechAttack` | single (auto-lowest-HP via action.js:203) | 🆕 **MISSING** | ❌ |
| `bambooAoeHeal` | no-target | 🆕 **MISSING** | ❌ |
| `rainbowHeal` (alias bambooAoeHeal) | no-target | 🆕 **MISSING** | ❌ |
| `fortuneBless` (alias bambooAoeHeal) | no-target | 🆕 **MISSING** | ❌ |
| `crystalResHeal` (isAlly) | single ally | 🆕 **MISSING** | ❌ |
| `headlessRegen` | no-target | 🆕 **MISSING** | ❌ |
| `rainbowBarrier` | no-target | 🆕 **MISSING** | ❌ |
| `shellEnergyShield` | no-target | 🆕 **MISSING** | ❌ |
| `pirateFlag` | no-target | 🆕 **MISSING** | ❌ |
| `ghostShadow` | no-target | 🆕 **MISSING** | ❌ |
| `starWarp` | no-target | 🆕 **MISSING** | ❌ |
| `hidingReflect` | no-target | 🆕 **MISSING** | ❌ |
| `gamblerCheat` | single | 🆕 **MISSING** | ❌ |
| `gamblerAllIn` | single | 🆕 **MISSING** | ❌ |
| `hunterSnipe` | single | 🆕 **MISSING** | ❌ |
| `fortuneGoldRain` | no-target | 🆕 **MISSING** | ❌ |
| `crystalDetonate` | single | 🆕 **MISSING** | ❌ |
| `shellAuraBurst` | no-target | 🆕 **MISSING** | ❌ |
| `stoneQuake` | no-target | 🆕 **MISSING** | ❌ |
| `volcanoStomp` | no-target | ✅ skill-handlers.ts:3422 | ✅ |
| `hidingStrike` | single | 🆕 **MISSING** | ❌ |
| `diceDeathBet` | single | 🆕 **MISSING** | ❌ |
| `diceLuckyCrit` | single | 🆕 **MISSING** | ❌ |

These are mostly "enhanced" variants triggered by upgrade chains in JS. They don't appear in default pet skill rows, but `summonAutoAction` (`hidingCommand`'s chain) and chain-fed skills CAN spawn them. If skipping for v0.9 is intentional, mark explicitly in code.

### B.29 poc-only handlers (not in JS, should be removed or stubbed)

| Skill | Where | JS analog | Action |
|---|---|---|---|
| `ghostBlast` | skill-handlers.ts:884 | none | 🚫 **REMOVE** |
| `phoenixFlare` | skill-handlers.ts:1176 | none | 🚫 **REMOVE** |
| `lavaErupt` | skill-handlers.ts:1186 | none (JS has `volcanoErupt`) | 🚫 **REMOVE** or alias |
| `pirateBarrage` | skill-handlers.ts:2229 | none (JS has `pirateCannonBarrage`) | 🚫 **REMOVE** — JS `pirateBarrage` is a passive |
| `rainbowPrism` (as active) | skill-handlers.ts:1889 | passive only in JS | ⚠️ should be passive stub only |

---

## §C Critical bugs found (priority ordered)

### 1. **Self-cast skills enter target picker (14 skills)** ❌
`onPlayerSkillPicked` (BattleScene.ts:1118) never checks `skill.selfCast` flag NOR the hardcoded action.js:197 list. Affected:
- `fortuneDice`, `fortuneBuyEquip`, `phoenixShield`, `hidingDefend`, `hidingCommand`, `cyberDeploy`, `diamondFortify`, `diceFate`, `chestCount`, `bambooHeal`, `volcanoArmor`, `crystalBarrier`, `shellCopy`, `twoHeadSwitch (switchTo='melee')`

Some of these (`phoenixShield`, `chestCount`, `bambooHeal`, `volcanoArmor`, `crystalBarrier`, `cyberDeploy`, `diamondFortify`, `diceFate`, `fortuneDice`, `fortuneGainCoins`, `stoneShield`, `stoneTaunt`, `hidingDefend`, `hidingCommand`, `commonTeamShield`, `lightningShield`, `commonAtkBuff`) work in poc because their pets.ts data has `selfCast:true` set — BUT poc picker doesn't check `selfCast` either. They work by accident: `commonTeamShield`/`commonAtkBuff`/`lightningShield`/`stoneShield`/`stoneTaunt` etc. all have `aoeAlly:true` or are registered as `no-target` in JS but in poc they leak into the `if (isAllySkill)` branch and self-fire.

Fix: copy JS action.js:197 hardcoded list verbatim into `onPlayerSkillPicked`, OR add `selfCast:true` to ALL relevant data rows AND have picker check it.

### 2. **`_drones` (JS array) vs `_droneCount` (poc number) split-brain** ❌
- `cyberDeploy` (skill-handlers.ts:4342) writes `_droneCount`
- `cyberSwarmShield` (skill-handlers.ts:4507) reads `_drones?.length`
- BattleScene cyberDrone passive (BattleScene.ts:3567-3571) writes `_droneCount`
- BattleScene summon-spawn block (BattleScene.ts:4551-4563) writes `_drones[]`
- Death cleanup (BattleScene.ts:2855) clears `_drones[]`

Result: after `cyberDeploy` fires, `cyberSwarmShield` always computes 0 drones. Drone-based scaling broken across deploy → shield → beam.

Fix: unify on `_drones[]` array (JS canonical). Replace every `_droneCount` write with `_drones.push({age:0})` and every read with `_drones.length`.

### 3. **Ally-target picker never opens** ❌
BattleScene.ts:1136-1140: when `isAllySkill` (isAlly or aoeAlly), poc auto-fires on `actor` (self). Affected: `heal`, `shield (aoeAlly:false)`, `bubbleShield`, `angelBless`, `bubbleHeal`, `crystalResHeal`, `phoenixPurify`, `rainbowGuard` — player cannot heal a chosen ally.

Fix: split `isAllySkill` into "aoeAlly → auto-fire on team" vs "isAlly → enter ally-target picker" (call `enterTargetingMode(actor, skillIdx, 'ally')`).

### 4. **24 _misc.js handlers missing in poc** ❌
See §B.28 — list of 24 active skills from `_misc.js` that the JS registry dispatches but poc never registered. If these never appear in pet skills directly, they only matter through `hidingCommand` chains, but registry.js explicitly registers them so they ARE callable.

### 5. **AoE auto-target list relies on data flags being set** ⚠️
poc picker only checks `skill.aoe`; the explicit JS list (10 types in action.js:209) is omitted. By coincidence every one of those 10 types has `aoe:true` in pets.ts data, so it works — but a future skill data edit forgetting to set `aoe:true` would break the AoE auto-pick.

### 6. **mechAttack / wormBite auto-target lowest-HP not handled** ⚠️
action.js:203 explicitly auto-targets lowest-HP enemy for these. poc has no handler at all (mechAttack missing, wormBite missing). If a summon (mech / sea worm) is fielded, it'll either crash on no handler or skip turn.

### 7. **Several skills exist in poc but not in JS** ❌
`ghostBlast`, `phoenixFlare`, `lavaErupt`, `pirateBarrage` (as active handler — JS has it as passive only), `rainbowPrism` (as active — JS passive only). These were probably early demo code. They sit in dispatch table but no pets.ts data row uses them, so they're dead code.

### 8. **Stone heal skill drops def/mr buff package** ⚠️
JS pets.js:91 `磐石 type:'heal'` has `defUpPct:{pct:20,turns:3}, mrUpPct:{...}` — these buffs are NOT applied by poc's generic `heal` handler (skill-handlers.ts:4395 only heals).

### 9. **Generic `physical` handler ignores aoe/hpPct/atkDown debuff** ⚠️
- `twoHeadDual physical` (pets.js:227): has `aoe:true, hpPct:15` — poc treats as single-target only
- `candy physical` (pets.js:471): has `atkDown:{pct:15,turns:2}` — poc doesn't apply atkDown
- shellStrike, fortuneStrike, candyPhysical etc. need data-driven debuff/aoe extension

### 10. **shellCopy auto-execute drifts vs JS shellCopy** ⚠️
JS shell.js:113-240 uses `executeAction()` to dispatch (full lightning trigger chain). poc shell-handlers.ts:1199 calls SKILL_HANDLERS dispatch directly. Differences in side-effects (on-hit chain triggers, summon AI integration) — passive-triggered chain skills may not fire.

### 11. **Counter buff tracking inconsistencies** ⚠️
`phoenixShield` uses JS `_lavaShieldVal/_lavaShieldTurns/_lavaShieldCounter` (3 dedicated fields). poc adds to general `caster.shield`. Counter logic that reads those specific fields will mis-fire.

---

## §D Per-skill data field divergences

JS pets.js and poc pets.ts are structurally aligned (both JSON-like skill objects). Major value differences:

| Skill | Field | JS value | poc value | Note |
|---|---|---|---|---|
| `iceFreeze` | atkScale | 0.6 | check pets.ts:662 | mostly aligned |
| `gamblerDraw` | random debuff pool | 8 types | needs verification | poc may use subset |
| `phoenixShield` | counterScale | 0.14 | check | |
| `cyberDeploy` | deployCount | 3 | check | |
| `commonTeamShield` | shieldScale | 0.5 | poc fallback `atk*0.3` (skill-handlers.ts:645) | ❌ DIFFERENT |
| `commonAtkBuff` | atkUpPct | 15 | poc reads `atkBuffPct` and applies permanent baseAtk multiply (skill-handlers.ts:657) | ❌ JS uses turn-bounded buff |

A full numeric diff is feasible but not critical — values are mostly read directly from skill data so mismatches lie inside data, not in handlers.

---

## §E Missing poc handlers (full list)

From `games/turtle-battle/js/skills/_misc.js` + registry, NOT present in `SKILL_HANDLERS`:

1. `candyBomb`
2. `mechAttack`
3. `bambooAoeHeal`
4. `rainbowHeal` (alias)
5. `fortuneBless` (alias)
6. `crystalResHeal`
7. `headlessRegen`
8. `rainbowBarrier`
9. `shellEnergyShield`
10. `pirateFlag`
11. `ghostShadow`
12. `starWarp`
13. `hidingReflect`
14. `gamblerCheat`
15. `gamblerAllIn`
16. `hunterSnipe`
17. `fortuneGoldRain`
18. `crystalDetonate`
19. `shellAuraBurst`
20. `stoneQuake`
21. `hidingStrike`
22. `diceDeathBet`
23. `diceLuckyCrit`

(`volcanoStomp` IS present in poc.)

If these are intentionally deferred for v0.9, the registry should explicitly skip-list them. Currently they would fail dispatch silently.

---

## §F Worklist (concrete fixes)

Ordered by impact / dependency. Each item: file:line, change, JS reference.

### Picker fixes (P0 — gameplay-breaking)

1. **`BattleScene.ts:1118-1145`** — replace `onPlayerSkillPicked` body with the JS action.js:186-232 logic 1:1:
   - Add hardcoded selfCast list (14 types) check BEFORE aoe/ally branches.
   - Add mechAttack/wormBite auto-lowest-HP branch.
   - Add explicit AoE auto-fire list (12 types — superset of `skill.aoe`).
   - Split ally branch: `skill.aoeAlly` → auto-fire on team; `skill.isAlly` OR ally-list → call `enterTargetingMode(actor, skillIdx, 'ally')` (green ring).
   JS ref: `action.js:186-232`.

2. **`BattleScene.ts:1148-1208`** `enterTargetingMode` — ensure ally `kind` actually iterates ally side (it does already at line 1155 `kind === 'ally' ? same side : enemies`). Verify ring color path is wired (currently `glowColor = kind === 'ally' ? 0x06d6a0 : 0xff3c3c` — OK).

### Drone state unification (P0)

3. **`skill-handlers.ts:4338-4344`** `cyberDeploy` — replace `_droneCount` writes with `_drones.push({age:0})`. JS ref: `cyber.js:339-348`.

4. **`skill-handlers.ts:2060`** `cyberBeam` — replace `_droneCount` read with `_drones?.length`. JS ref: `cyber.js:98`.

5. **`BattleScene.ts:3567-3577`** cyberDrone passive trigger — replace `_droneCount` with `_drones`. JS ref: `cyber.js:336-354`.

6. **`BattleScene.ts:2371`** stack-badge render — read `_drones?.length` instead of `_droneCount`.

7. **`BattleScene.ts:2566`** drone-state list — change `_droneCount` to `_drones` in serialization arrays.

8. **`BattleScene.ts:2986`** death-spawn-mech read — change `_droneCount` → `_drones?.length`.

### Missing handlers (P1 — restore _misc skill chain)

9-31. **`skill-handlers.ts`** — add 23 handlers listed in §E. Source code: `games/turtle-battle/js/skills/_misc.js:7-337`. Port each into existing `SKILL_HANDLERS` object pattern.

### Heal/shield/buff completeness (P1)

32. **`skill-handlers.ts:4395`** generic `heal` handler — read `defUpPct`/`mrUpPct` from skill data, push buffs. JS ref: stone `heal` data row pets.js:91. Pattern: `if (skill.defUpPct) target.buffs.push({type:'defUp', value: round(target.baseDef * skill.defUpPct.pct/100), duration: skill.defUpPct.turns+1});`.

33. **`skill-handlers.ts:643-651`** `commonTeamShield` — read `skill.shieldScale` (not hardcoded `0.3`). JS ref: `common.js:13-25`.

34. **`skill-handlers.ts:653-662`** `commonAtkBuff` — replace permanent baseAtk multiply with turn-bounded `atkUp` buff. JS ref: `common.js:28-45`.

### Per-skill detail fixes (P2)

35. **`skill-handlers.ts:432-448`** generic `physical` — honor `skill.aoe` (loop all enemies), `skill.hpPct` (extra dmg from enemy maxHp), `skill.atkDown` (debuff). Used by `twoHeadDual physical` (aoe), candy `physical` (atkDown), etc.

36. **`skill-handlers.ts:812-849`** `ghostStorm` — verify hasCurse branch (true vs magic dmg). JS ref: `ghost.js:114-176`.

37. **`skill-handlers.ts:851-877`** `ghostPhase` — confirm physImmune buff + true-dmg conversion. JS ref: `ghost.js:51-109`.

38. **`skill-handlers.ts:1066-1084`** `ninjaBomb` — confirm armorBreak buff with correct turns. JS ref: `ninja.js:523-...`.

39. **`skill-handlers.ts:1086-1106`** `ninjaBackstab` — confirm `ignoreRow` is honored (skip front-row guard at picker level since registry is `single`). JS ref: `ninja.js:382-...`.

40. **`skill-handlers.ts:936-...`** `ninjaShuriken` — verify crit splits damage into physical + true at `truePct = 40 + 2 × _level`. JS ref: `ninja.js:1-58`.

41. **`skill-handlers.ts:1550-1577`** `bambooSmack` — implement `knockToFront` slot reassignment (move back→front, animate). JS ref: `bamboo.js:187-219`.

42. **`skill-handlers.ts:1126-1134`** `phoenixShield` — set `_lavaShieldVal/_lavaShieldTurns/_lavaShieldCounter` fields specifically (counter logic reads these). JS ref: `phoenix.js:50-63`.

43. **`skill-handlers.ts:1136-1158`** `phoenixScald` — break 50% of shield/bubbleShield BEFORE damage. JS ref: `phoenix.js:69-83`.

44. **`skill-handlers.ts:3146-...`** `starBlackhole` — branch: lastEnemy + executeThresh → execute / 1.8× ATK; else normal + blackhole buff (1t stun + invisible). JS ref: `star.js:174-235`.

45. **`skill-handlers.ts:3270-3322`** `starGravityWarp` — implement slot swap on full energy (F0↔B2, F1↔B1, F2↔B0). JS ref: `star.js:262-321`.

46. **`skill-handlers.ts:1396-...`** `diamondSmash` bleed — verify DoT stack model. JS ref: `diamond.js:58-74`.

47. **`skill-handlers.ts:1422-...`** `diamondCollide` — track `_diamondCollideCount[tIdx]` for cumulative stun-after. JS ref: `diamond.js:36-50`.

48. **`skill-handlers.ts:2696-...`** `chestSmash` + **`skill-handlers.ts:3594-...`** `chestStorm` — honor all chest equip variants (star→true dmg, rock→+def+mr, thunder→5-stack lightning, chain→25% splash, fire→burn, poison→healReduce). JS ref: `chest.js:1-206`.

49. **`skill-handlers.ts:4106-4117`** `hidingCommand` — verify BattleScene listens to `hiding-command` event and executes `summonAutoAction` (full smart AI). JS ref: `hiding.js:15-230`.

50. **`skill-handlers.ts:2733-...`** `hidingDefend` — push `hidingShield` buff with expiry heal (healPct of leftover shield). JS ref: `hiding.js:1-13`.

### Cleanup (P3)

51. **`skill-handlers.ts:884`** — delete `ghostBlast` (not in JS).
52. **`skill-handlers.ts:1176`** — delete `phoenixFlare` (not in JS).
53. **`skill-handlers.ts:1186`** — delete `lavaErupt` or alias to `volcanoErupt`.
54. **`skill-handlers.ts:2229`** — delete `pirateBarrage` active handler (JS pirateBarrage is passive only).
55. **`skill-handlers.ts:1889`** — convert `rainbowPrism` to passive-stub (active path unused in JS).

### Picker safety net (P3)

56. **`BattleScene.ts:1118`** — after porting JS picker, add a fallback: if `skill.type` not in any list and `skill.aoe`/`aoeAlly`/`isAlly`/`selfCast` all false, log a warning and treat as single-enemy. Helps catch future additions early.

---

## Summary

- **~110 skills audited** across 30 turtle families + registry + _misc
- **~56 concrete fixes** identified, split P0 (picker / drone) / P1 (handlers / heal completeness) / P2 (per-skill detail) / P3 (cleanup)
- **Largest single class of bugs**: poc picker oversimplified (lost 14-skill selfCast list, 10-skill AoE list, ally-target branch)
- **Most critical individual bug**: cyberDrone state split-brain (`_droneCount` vs `_drones[]`) breaks 3 skills + passive trigger
- **Largest gap**: 23 of 24 `_misc.js` handlers absent in poc

