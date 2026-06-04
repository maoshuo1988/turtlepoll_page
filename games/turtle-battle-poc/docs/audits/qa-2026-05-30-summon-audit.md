# Summon AI Skill Audit — 2026-05-30

Scope: 19 C/B/A pets that the hiding turtle's `summonAlly` passive can summon. For each, audit `defaultSkills [0,1,2]` (with `passiveSkill:true` entries filtered by `createFighter` at `src/engine/fighter.ts:48`) against `summonAutoAction` AI in `src/scenes/BattleScene.ts:5561-5617` and the corresponding handlers in `src/engine/skill-handlers.ts`.

Reference:
- `SELF_TYPES` (target = self): `['phoenixShield','fortuneDice','hidingDefend','hidingCommand','cyberDeploy','cyberBuff','ghostPhase','diamondFortify','diceFate','chestCount','bambooHeal','volcanoArmor','crystalBarrier']` (BattleScene.ts:5574)
- `ALLY_TYPES` (target = lowest-HP ally): `['heal','shield','bubbleShield','angelBless']` (BattleScene.ts:5575)
- `selfCast: true` on the skill data also routes target → self (BattleScene.ts:5594)
- Anything else: routed to enemy front-row lowest-HP / taunters.

Verdict legend: 🔴 crash · 🟠 buggy/exploit · 🟡 no-op/degraded · ✅ correct.

---

## basic (C) — defaultSkills: physical, turtleShieldBash, basicBarrage

### physical ✅
Generic damage handler `skill-handlers.ts:549`. Reads only `caster.atk/def/mr/maxHp` + skill params. No owner-specific state. AI routes to enemy. **Works correctly.**

### turtleShieldBash ✅
Handler `skill-handlers.ts:647`. Reads `caster.atk`, target.maxHp/hp, `caster.passive?.type === 'basicTurtle'` (which the summon-as-basic DOES have, since `createFighter` clones `pet.passive`). Plays 5-phase animation; adds shield to caster. Targets enemy. **Works.**

### basicBarrage ✅
Handler `skill-handlers.ts:806`. Multi-shot at random alive enemies. No owner state. **Works.**

---

## stone (C) — defaultSkills: physical, shield, heal

### physical ✅
Same generic handler. **Works.**

### shield ✅ (but mild AI mis-trigger — see note)
Handler `skill-handlers.ts:1186`. `aoeAlly: true` → shields all allies. AI: `ALLY_TYPES` routes target = lowest-HP ally, but handler ignores `target` when `aoeAlly` is set and shields every ally. **Functionally works.** Stone summon's shield can buff the owner. Good.

### heal 🟡 (degraded — purely a defUp/mrUp buff, no heal)
Handler `skill-handlers.ts:5763`. Stone's `heal` skill has NO `atkScale` and NO `hot` — only `defUpPct`+`mrUpPct`. The handler's heal branch requires `skill.atkScale != null` (line 5768), so it skips healing entirely and only applies defUp/mrUp buffs.
**Issue:** AI's heal trigger (`summon.hp/maxHp < 0.35 || owner.hp/maxHp < 0.35`, BattleScene.ts:5584) fires this skill as if it heals. The skill does nothing for HP, only buffs the targeted ally's defense. Summon will pop the buff when low — no actual hp gain.
**Recommendation:** Low priority. Either rename the AI condition or give stone's heal an actual `hot.pctMaxHp` value. Not a blocker — the buff still has *some* value.

---

## bamboo (C) — skillPool [0,1,2] = bambooLeaf, bambooHeal, bambooSmack

bambooLeaf at index 0 is NOT a passive (no `passiveSkill` flag in `pets.ts:424-433`). So summon's `skills` = **[bambooLeaf, bambooHeal, bambooSmack]** (3 skills, none filtered). Counter to the prompt's hypothesis — no third-slot fill problem.

### bambooLeaf ✅
Handler `skill-handlers.ts:2503`. `atk×scale + maxHp×selfHpPct/100` per hit, 3 hits. No owner-specific state. **Works.**

### bambooHeal ✅
Handler `skill-handlers.ts:2528`. Heals self + shields allies (or solo-heal if no allies). In `SELF_TYPES` → targets self correctly. **Works.**

### bambooSmack ✅
Handler `skill-handlers.ts:2564`. Single physical + chilled + knockToFront. Targets enemy. **Works.**

---

## angel (B) — defaultSkills: physical, angelBless, angelEquality

### physical ✅
Generic. **Works.**

### angelBless ✅
Handler `skill-handlers.ts:1248`. In `ALLY_TYPES` → AI picks lowest-HP ally. Handler defaults `target = caster` if missing. Adds shield + defUp/mrUp buffs. **Works** (can buff the owner — good).

### angelEquality ✅
Handler `skill-handlers.ts:5514`. 2 physical hits + (if target rarity ∈ A/S/SS/SSS) 1 true-damage hit. Reads only `caster.atk`. Routes to enemy. **Works.**

---

## ice (B) — skillPool [0,1,2] = iceSpike, iceBurnImmune (passive), iceFrost

After passive filter, summon's `skills` = **[iceSpike, iceFrost]** (only 2 skills — confirmed by `passiveSkill:true` at `pets.ts:664`).

### iceSpike ✅
Handler `skill-handlers.ts:3670`. 6 hits alternating physical/magic. Reads `caster.passive?.type === 'frostAura'` for bonus (passive is cloned by `createFighter`, so works on summon ice). **Works.**

### iceFrost ✅
Handler `skill-handlers.ts:3586`. AoE mrDown debuff + 10 hits to all enemies. No owner state. **Works.**

---

## ninja (B) — defaultSkills: ninjaImpact, ninjaShuriken, ninjaBomb

### ninjaImpact ✅
Handler `skill-handlers.ts:1553`. Complex dash + behind-target combo. Reads only caster sprite/view. Targets enemy. **Works** (the AI even skips its `playAttackHop`/`playAction` for ninjaImpact at BattleScene.ts:5613-5615 → animation chains intact).

### ninjaShuriken ✅
Handler `skill-handlers.ts:1714`. Reads `caster._level` for true-pct (defaults to 1 if unset; summon sets `_level = ownerF._level` at BattleScene.ts:6251). **Works.**

### ninjaBomb ✅
Handler `skill-handlers.ts:1855`. AoE physical + armorBreak debuff. **Works.**

---

## two_head (B) — defaultSkills: twoHeadMagicWave, physical, twoHeadSwitch

### twoHeadMagicWave ✅
Handler `skill-handlers.ts:3997`. 4 hits alternating physical/true. **Works.**

### physical ✅
Generic AoE (skill has `aoe:true`). **Works.**

### twoHeadSwitch 🟠 (form-swap on summon — exotic but non-crashing)
Handler `skill-handlers.ts:4067`. The skill swaps a two_head fighter's `skills` array to its **melee** counterpart (reads `pet.meleeSkills`, applies `_equippedIdxs` filter at `skill-handlers.ts:4095-4106`) AND modifies base stats (HP/DEF/MR/ATK/shield, lines 4086-4092). On a SUMMON:
- `caster._equippedIdxs` is `[0,1,2]` (assigned at `fighter.ts:69`). `pets.ts:991-1019` lists two_head's `meleeSkills[0,1,2]` = twoHeadHammer, twoHeadAbsorb, twoHeadSwitch.
- The summon's skill bar effectively reskins mid-battle, then can swap back via the new `twoHeadSwitch` (cdLeft = 4).
- It also performs an attack on `target` (1.2× ATK on melee, 1.4× ATK + defDown on ranged → see lines 4109-4146).
- AI routes via damage path (not in SELF_TYPES, no `selfCast`) → enemy target → OK for handler.

**Verdict:** Works mechanically but is jarring: a random "two_head" summon morphs mid-fight, recovers all CDs, etc. Not a bug per spec (two_head is supposed to do this), but feels weird for a temporary summon.

**Recommendation (optional):** Add to a new "skip list" in `summonAutoAction` if you want to suppress form-swap by summons. Alternatively, add `twoHeadSwitch` to a "SUMMON_BLACKLIST" filter near BattleScene.ts:5579 (`dmgS = ready.filter(...)` line) so summons never pick it. Suggested:
```ts
const SUMMON_BLACKLIST = new Set(['twoHeadSwitch', 'hidingCommand', 'fortuneBuyEquip']);
const dmgS = ready.filter(s => !SELF_TYPES.has(s.type) && !ALLY_TYPES.has(s.type) && !SUMMON_BLACKLIST.has(s.type) && ...);
```

---

## ghost (B) — defaultSkills: ghostTouch, ghostPhantom, ghostStorm

All three are confirmed NOT `passiveSkill` (only `ghostEnhancedCurse` at index 3 is). All handlers read only `caster.atk` and target buffs.

### ghostTouch ✅
Single-hit phys+true. **Works.**

### ghostPhantom ✅
Handler `skill-handlers.ts:1379`. 1.5× ATK magic + 80% lifesteal heal + 25% dodge buff (self). All caster-only state. **Works.** (Note: shellCopy's BLACKLIST excludes this — that BLACKLIST is for shellCopy's mimic, not for summons.)

### ghostStorm ✅
Handler `skill-handlers.ts:1454`. Reads target buffs (curse → real damage branch). **Works.**

---

## diamond (B) — defaultSkills: physical, diamondFortify, diamondCollide

### physical ✅
Generic. **Works.**

### diamondFortify ✅
Handler `skill-handlers.ts:5855`. In `SELF_TYPES` → targets self. Self-shield + defUp/mrUp. **Works.**

### diamondCollide ✅
Handler `skill-handlers.ts:2393`. Single physical + `_diamondCollideStacks` on TARGET (not caster). Stun on stack threshold. No caster state required. **Works.**

---

## fortune (B) — defaultSkills: fortuneStrike, fortuneDice, fortuneAllIn

### fortuneStrike ✅
Handler `skill-handlers.ts:3759`. Reads `caster._goldCoins` (defaults 0 → just base scale). Summon starts at 0 coins; only `fortuneDice` can give it coins (since fortuneGainCoins/fortuneBuyEquip aren't in defaults). **Works** but is on the weak side until summon has used fortuneDice once or twice.

### fortuneDice ✅
Handler `skill-handlers.ts:3731`. In `SELF_TYPES` → self. Generates `_goldCoins`, heals %maxHp, checks `fortuneAllIn` cdLeft for bonus shield. Self-contained. **Works.**

### fortuneAllIn 🟡 (degraded if no coins)
Handler `skill-handlers.ts:5611`. Consumes ALL `_goldCoins` (defaults 0). AI already gates: `dmgS` filter excludes `fortuneAllIn` if `gc <= 0` (BattleScene.ts:5580). So summon won't pick it with 0 coins. After fortuneDice procs and gives 3-8 coins, summon could allIn for moderate damage. **Works under AI gate.**

---

## dice (B) — defaultSkills: diceAttack, diceAllIn, diceFate

### diceAttack ✅
Handler `skill-handlers.ts:2620`. Reads `caster.atk`, `caster.crit`. **Works.**

### diceAllIn ✅
Handler `skill-handlers.ts:5011`. AoE damage + lifesteal. **Works.**

### diceFate ✅
Handler `skill-handlers.ts:2650`. In `SELF_TYPES` → self. Adds `diceFateCrit` buff. **Works.**

---

## rainbow (A) — defaultSkills: magic, shield, rainbowStorm

### magic ✅
Handler `skill-handlers.ts:5714`. Reads `skill.prismBonus` + `caster._prismColor`. `_prismColor` is set by rainbow's passive — but the rainbow passive is `rainbowPrism` which is not strictly subscribed for summon. Worst case `_prismColor === undefined` → all branches skipped → just plain magic dmg. **Works.** No crash.

### shield ✅
Rainbow's shield (`pets.ts:1563-1576`). Let me check the actual data:

Rainbow's `skillPool[1]` is in fact `'shield'` type with `aoeAlly` etc. Same as stone's. Routes via ALLY_TYPES, shields allies. **Works.**

### rainbowStorm ✅
Handler `skill-handlers.ts:2993`. AoE 4-hit magic+true on all enemies. No owner state. **Works.**

---

## gambler (A) — defaultSkills: gamblerCards, gamblerDraw, gamblerBet

### gamblerCards ✅
Handler `skill-handlers.ts:4756`. Random scale per hit, reads only `caster.atk`. **Works.**

### gamblerDraw ✅
Handler `skill-handlers.ts:4787`. 2 hits + self shield + self heal + random debuff. Targets enemy. **Works.**

### gamblerBet 🟠 (HP self-cost can leave summon at 1 HP)
Handler `skill-handlers.ts:4703`. Costs 40% of caster's current HP (`caster.hp = max(1, caster.hp - hpCost)` line 4714). For a summon at ~40% owner.maxHp, this can drop it to 1 HP every cast. The AI doesn't avoid casting it at low HP — there's only a guard `if (caster.hp/maxHp <= 0.4) return early`, but that early-return drops the action silently (skill consumed? No — it just bails before applying damage and the AI still spent its turn).

**Verdict:** Not a crash, but a summon spamming gamblerBet self-bleeds aggressively. The HP-floor `max(1, ...)` prevents death.

**Recommendation (optional):** Treat `gamblerBet` as a HP-conditional skill in the AI's `dmgS` filter — e.g. `&& !(s.type === 'gamblerBet' && caster.hp/maxHp < 0.5)`. Cite BattleScene.ts:5579-5582.

### Side note — AI's heal trigger uses `gamblerBet` HP self-loss as a setup?
No, gamblerBet doesn't heal. Self-bleed sequence is a niche edge.

---

## hunter (A) — defaultSkills: hunterShot, hunterStealth, hunterBarrage

### hunterShot ✅
Handler `skill-handlers.ts:2676`. Reads target HP for execute threshold. Reads `caster.crit`. **Works.**

### hunterStealth ✅
Handler `skill-handlers.ts:5877`. 1 hit + self dodge buff + self shield. AI: NOT in SELF_TYPES (the handler reads `if (!target) return` so requires an enemy). AI routes to enemy as damage skill → enemy target → handler hits then self-buffs. **Works.** (Could optionally add to `SELF_TYPES` since most of its value is self, but current routing still works.)

### hunterBarrage ✅
Handler `skill-handlers.ts:4942`. 10-hit AoE true damage to random enemies. **Works.**

---

## pirate (A) — defaultSkills: physical, pirateCannonBarrage, heal

### physical ✅
Generic 4-hit. **Works.**

### pirateCannonBarrage ✅
Handler `skill-handlers.ts:5308`. 6 ticks × all enemies. No owner state. **Works.**

### heal ✅
Pirate's heal at `pets.ts:1897` has `selfCast:true` + `hot` + `defUpAtkPct`. AI: `selfCast` overrides ALLY_TYPES → target = self. Handler `skill-handlers.ts:5763`: tgt = caster (or supplied ally, both same side), no atkScale → skips immediate heal, applies HoT + defUp buffs on the summon. **Works.**

---

## candy (A) — defaultSkills: physical, shield, candyBarrage

### physical ✅
Has `selfHpPct:5` (糖果锤 hp-scaling extra dmg). Reads `caster.maxHp`. **Works.**

### shield 🟠 (AI mis-targets via ALLY_TYPES vs selfCast precedence — actually OK, see analysis)
Candy's `shield` (`pets.ts:2002`) has `selfCast:true`. In `summonAutoAction`, `selfCast` check is BEFORE ALLY_TYPES, so target = self. But the **trigger condition** (`shieldS && allyViews.some(...)` BattleScene.ts:5585) checks for low-HP **allies**, not the caster. So a candy summon may fire `shield` when ANY ally (e.g. owner) is low-HP, but the shield only applies to candy itself (selfCast). The owner still doesn't get the shield.

**Verdict:** Suboptimal AI trigger (uses an ally-pred to fire self-buff), but no crash. Mild waste of CD.

**Recommendation (optional):** In BattleScene.ts:5585, refine: `if (shieldS && (shieldS as Record<string,unknown>).selfCast ? summon.hp/summon.maxHp < 0.6 : allyViews.some(...))`.

### candyBarrage ✅
Handler `skill-handlers.ts:3536`. 4-hit AoE physical + `_candyPenGain` armor pen buff on caster. **Works.**

---

## bubble (A) — defaultSkills: physical, bubbleShield, bubbleBind

### physical ✅
3-hit. **Works.**

### bubbleShield ✅
Handler `skill-handlers.ts:5446`. In `ALLY_TYPES` → lowest-HP ally target. Sets `bubbleShieldVal`/`Turns`/`Owner`/`BurstScale` on target. End-of-round natural expiration triggers burst (handled in BattleScene). **Works** for any caster (the `bubbleShieldOwner` field stores the caster for credit). Bubble summon shielding the owner = good behavior.

### bubbleBind ✅
Handler `skill-handlers.ts:3470`. Reads `caster._level` (set from owner's level on summon spawn). Adds bubbleBind buff to target. **Works.**

Bubble's passive `bubbleStore` (accumulates on receiving damage, see `damage.ts:270-276`) DOES work on summon — passive is cloned by `createFighter`, and the damage hook reads `tgt.passive?.type`. So a bubble summon WILL accumulate bubbleStore from being hit (relevant only if the team also has bubbleBurst, which isn't in defaults — so this is just dead state for the summon).

---

## line (A) — defaultSkills: lineSketch, lineLink, lineFinish

### lineSketch ✅
Handler `skill-handlers.ts:5169`. 3 hits + adds `_inkStacks` to target (state lives on the target, not the caster). **Works.**

### lineLink ✅
Handler `skill-handlers.ts:5226`. Links target ⇆ second enemy with `_inkLink` (state on the two enemies). Adds 1 ink stack each. **Works.**

### lineFinish 🟡 (degraded if 0 ink stacks on target)
Handler `skill-handlers.ts:3417`. Reads `target._inkStacks` (defaults to 0). Damage = `caster.atk × baseScale` + `caster.atk × perStackScale × stacks`. With 0 stacks, just deals base 1.0× ATK physical — works but trivial. Reads `caster._inkTrueDmg` (set by line's passive `inkMark`) — for a line summon, the passive is cloned, but `_inkTrueDmg` is only set if `lineRapid` (an enhance-passive at index 3 in pool, NOT in default summon skills) gets equipped → so `_inkTrueDmg` will be undefined → burst stays magic-type → fine.

**Verdict:** Works, just weak when ink stacks are missing. AI ordering (lineSketch CD 0 → builds stacks → lineLink and lineFinish on CD) means summon will sometimes lineFinish at 0 stacks because cd-tie-break picks highest cd skill 80% of the time. Not a bug per se.

**Recommendation (optional):** None. Acceptable.

---

## lightning (A) — defaultSkills: lightningStrike, lightningSurgeBuff, lightningBarrage

### lightningStrike ✅
Handler `skill-handlers.ts:2855`. 5 hits magic + shock stacks via `triggerOnHitEffects` + splash. Reads `caster.atk`. **Works.**

### lightningSurgeBuff ✅
Handler `skill-handlers.ts:2960`. Sets `_lightningSurgeTurns` and `_lightningShockBoostPct` on caster, then deals 1 true hit to target. Reads `caster.passive?.shockScale` (lightning's passive `lightningStorm` — `pets.ts:2284` — has `shockScale` field). The passive is cloned by `createFighter` so `passive.shockScale` is present. **Works.**

The buff increases the boost of the summon's own shock procs for `surgeTurns+1` turns. Tied to caster state — fine for summon.

### lightningBarrage ✅
Handler `skill-handlers.ts:2892`. 20 random hits + shock stacks. **Works.**

---

## Summary Table

| Pet | Skill | Verdict | Notes |
|-----|-------|---------|-------|
| basic | physical / turtleShieldBash / basicBarrage | ✅ / ✅ / ✅ | clean |
| stone | physical / shield / heal | ✅ / ✅ / 🟡 | heal is defUp/mrUp only (no actual heal) — AI mis-triggers it as a heal |
| bamboo | bambooLeaf / bambooHeal / bambooSmack | ✅ / ✅ / ✅ | no passive filter (bambooLeaf is active) — summon gets all 3 |
| angel | physical / angelBless / angelEquality | ✅ / ✅ / ✅ | clean |
| ice | iceSpike / [iceBurnImmune filtered] / iceFrost | ✅ / — / ✅ | summon has only 2 skills |
| ninja | ninjaImpact / ninjaShuriken / ninjaBomb | ✅ / ✅ / ✅ | clean |
| two_head | twoHeadMagicWave / physical / **twoHeadSwitch** | ✅ / ✅ / 🟠 | summon will swap form mid-fight + new skill set; mechanically valid but exotic |
| ghost | ghostTouch / ghostPhantom / ghostStorm | ✅ / ✅ / ✅ | ghostPhantom self-buffs cleanly |
| diamond | physical / diamondFortify / diamondCollide | ✅ / ✅ / ✅ | clean |
| fortune | fortuneStrike / fortuneDice / fortuneAllIn | ✅ / ✅ / 🟡 | AI already gates allIn on 0 coins; strike weak at 0 coins |
| dice | diceAttack / diceAllIn / diceFate | ✅ / ✅ / ✅ | clean |
| rainbow | magic / shield / rainbowStorm | ✅ / ✅ / ✅ | clean |
| gambler | gamblerCards / gamblerDraw / **gamblerBet** | ✅ / ✅ / 🟠 | bet self-bleeds to 1 HP repeatedly; no death due to `max(1, ...)` |
| hunter | hunterShot / hunterStealth / hunterBarrage | ✅ / ✅ / ✅ | hunterStealth works via enemy route |
| pirate | physical / pirateCannonBarrage / heal | ✅ / ✅ / ✅ | heal has selfCast → self-HoT |
| candy | physical / **shield** / candyBarrage | ✅ / 🟠 / ✅ | shield is selfCast but AI fires it based on ally HP (mistargets) |
| bubble | physical / bubbleShield / bubbleBind | ✅ / ✅ / ✅ | bubbleStore inactive (no bubbleBurst in defaults) — fine |
| line | lineSketch / lineLink / lineFinish | ✅ / ✅ / 🟡 | lineFinish weak at 0 ink stacks (still works) |
| lightning | lightningStrike / lightningSurgeBuff / lightningBarrage | ✅ / ✅ / ✅ | clean |

**Totals:** 🔴 0 (no crashes) · 🟠 3 · 🟡 3 · ✅ 50

---

## Recommendations (priority order)

### P1 — twoHeadSwitch form-swap on summon (🟠)
**File/line:** BattleScene.ts:5579-5582 (`dmgS` filter).
**Why:** A summon morphing form mid-battle is jarring and arguably violates the "summon = simple temp pet" intent. The handler reassigns `caster.skills`, modifies `baseAtk/baseDef/baseMr/maxHp`, and adds permanent stat deltas. When the summon dies, this state is discarded — but visually the player sees a "two_head summon" reskinning itself.

**Fix:**
```ts
// In summonAutoAction near BattleScene.ts:5574
const SUMMON_BLACKLIST = new Set(['twoHeadSwitch', 'hidingCommand', 'fortuneBuyEquip']);
// ... then update dmgS filter line 5579:
const dmgS = ready.filter(s =>
  !SELF_TYPES.has(s.type) && !ALLY_TYPES.has(s.type)
  && !SUMMON_BLACKLIST.has(s.type)
  && !(s.type === 'fortuneAllIn' && gc <= 0)
  && !(s.type === 'fortuneBuyEquip' && gc < (((s as Record<string, unknown>).coinCost as number) || 20)));
```
This also handles `hidingCommand` more cleanly (currently filtered by the special `if (skill && skill.type === 'hidingCommand')` at line 5589) and `fortuneBuyEquip` (which can never make sense for a summon — there's no run-bench commitment).

### P2 — gamblerBet on summon (🟠)
**File/line:** BattleScene.ts:5579-5582 (`dmgS` filter).
**Why:** Summons at 40% owner.maxHp will bleed themselves to 1 HP on every gamblerBet cast (40% of current HP self-cost). Doesn't kill (floored at 1) but pretty much breaks the summon for the rest of the fight.

**Fix:** Add HP-conditional gate to `dmgS` filter:
```ts
&& !(s.type === 'gamblerBet' && summon.hp / summon.maxHp < 0.6)
```

### P3 — candy shield AI mis-trigger (🟠)
**File/line:** BattleScene.ts:5585.
**Why:** The condition `allyViews.some(a => (a.fighter.shield ?? 0) < 20 && a.fighter.hp / a.fighter.maxHp < 0.6)` fires when ANY ally is low-HP, but candy's shield is `selfCast:true` and only shields the summon itself. Net effect: summon "panics" for a low-HP teammate but spends the CD on self.

**Fix:**
```ts
else if (shieldS && (
  ((shieldS as Record<string, unknown>).selfCast)
    ? (summon.shield ?? 0) < 20 && summon.hp / summon.maxHp < 0.6
    : allyViews.some(a => (a.fighter.shield ?? 0) < 20 && a.fighter.hp / a.fighter.maxHp < 0.6)
)) skill = shieldS;
```

### P4 — stone heal AI mis-trigger (🟡)
**File/line:** BattleScene.ts:5584 and `skill-handlers.ts:5763`.
**Why:** Stone's "heal" doesn't heal — only buffs DEF/MR. AI fires it on low HP, gaining no HP.

**Two options:**
1. **AI side:** Whitelist actual healers in the trigger: require the skill data to actually have `atkScale` or `hot`. Trivial: `const healS = ready.find(s => s.type === 'bambooHeal' || (s.type === 'heal' && (s.atkScale != null || s.hot != null)));`.
2. **Data side:** Add a small `hot.pctMaxHp` to stone's heal in `pets.ts:330-346` so it both buffs and heals.

Option 1 is safer (no design change).

### P5 — lineFinish low-stack (🟡)
**File/line:** none — leave as-is. Acceptable. Player builds via lineSketch first; summon's AI doesn't currently prioritize ink-building, but `lineSketch` CD is 0 so it gets picked frequently anyway via the cd-tie 80% heuristic.

### P6 — fortuneAllIn 0-coin (🟡)
Already gated. No action.

---

## Notes on other state-dependent behaviors checked and confirmed safe

- **`caster._level`** (ninjaShuriken, bubbleBind): summon sets `_level = ownerF._level` at BattleScene.ts:6251.
- **`caster.passive`**: cloned at `fighter.ts:79` (`pet.passive ? { ...pet.passive } : null`) — handlers reading `caster.passive?.type` (basicTurtle / frostAura / lightningStorm.shockScale / etc.) work.
- **`caster._equippedIdxs`**: assigned at `fighter.ts:69` (`equippedIdxs`). twoHeadSwitch reads this for melee skill pairing.
- **`caster._isSummon` / `caster._owner`**: set at BattleScene.ts:6249-6250. Used by hidingBuffSummon/hidingCommand on the OWNER's side, never affects summon-cast handlers.
- **Pirate ship state (`_pirateShip`)**: `pirateShipPassive` is `passiveSkill:true` (filtered from default summon skills). Pirate's index [0,1,2] = physical/pirateCannonBarrage/heal. NO ship spawn needed. **No crash risk.**
- **Chest treasure (`_chestTreasure`)**: chest is NOT in the 19-pet summon list (chest is rarity SSS/S? — actually `chest` in pets.ts:2888 isn't C/B/A in the list above). Confirmed irrelevant.

---

## Files referenced

- `c:/Users/Louis/Documents/GitHub/Turtle-Project-L_Demo/poc-phaser/src/scenes/BattleScene.ts` (summonAutoAction 5561-5617, spawnSummonAlly 6212-6263)
- `c:/Users/Louis/Documents/GitHub/Turtle-Project-L_Demo/poc-phaser/src/engine/fighter.ts` (createFighter filtering, passive clone)
- `c:/Users/Louis/Documents/GitHub/Turtle-Project-L_Demo/poc-phaser/src/engine/skill-handlers.ts` (all handlers cited inline)
- `c:/Users/Louis/Documents/GitHub/Turtle-Project-L_Demo/poc-phaser/src/data/pets.ts` (skillPool / passiveSkill flags / selfCast)
- `c:/Users/Louis/Documents/GitHub/Turtle-Project-L_Demo/poc-phaser/src/engine/damage.ts:270-276` (bubbleStore subscription)
