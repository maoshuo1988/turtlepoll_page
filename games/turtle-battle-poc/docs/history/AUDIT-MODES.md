# AUDIT — Modes / Fonts / Panels / Stats / Log / Back-link (2026-05-19)

Citations use `<file>:<line>` against repo root.

---

## Q1 — Modes (pve / boss / boss-pick / dungeon / test)

### pve (野生对局)
**JS** (`games/turtle-battle/js/main.js:1481-1493`):
- `rightTeam` = 3 龟 from `ALL_PETS.filter(p => !selectedIds.includes(p.id))`, `shuffle().slice(0,3)`, each `_createAiFighter(id, 'right', avgLv)`.
- AvgLv = player team avg level (`_avgLevel(leftTeam)`).
- No HP/ATK/DEF multipliers.
- Pre-battle: `showRulePickModal` → user picks 1 of 7 rules (fire/thunder/shield/rage/equip/rain/normal), `_pendingBattleRule` set, consumed in `startBattle()` (`battle-setup.js:394-397`).
- Bench: starts empty (`bench.js:28 clearBenches()`, called in `battle-setup.js:412 resetBenchForBattle({keepLeft:false})`).

**poc** (`poc-phaser/src/scenes/BattleScene.ts:181-201`, `MainMenuScene.ts:109`):
- `rightTeam = pickRandomEnemyTeam(leftTeam, 3)` (`BattleScene.ts:200,284-291`) from a hardcoded 22-pet list, NOT ALL_PETS.
- Rule pick modal: Wave 1 comment says it is invoked inside `TeamSelectScene`. (Not verified in this audit — see Q7.)
- Enemy avgLv: NOT derived from player team (no `avgLv` parameter passed to enemy fighter creation).
- Bench: `benchInventory = []` (`BattleScene.ts:230`).

**Diff**:
- poc enemy pool hardcodes 22 pets; ALL_PETS has 35+ → 13+ pets never spawn as wild enemy.
- poc does not scale enemy level to player.

**Fix**: use `ALL_PETS` for filter pool; pass `avgLv` from leftTeam into enemy createFighter.

### boss
**JS** (`main.js:1529-1549`):
- `bossPool = ALL_PETS.filter(p => !selectedIds.includes(p.id))`, pick random.
- `bossLv = _avgLevel(leftTeam)` (line 1537 explicit comment "not hardcoded Lv.10").
- Mult: `maxHp ×3.5`, `baseAtk ×1.2`, `baseDef ×1.4`, `baseMr ×1.4`.
- `boss._isBoss=true`, `name = 'BOSS ' + name`, `_position='front'`, `_slotKey='front-1'`.
- Right side hides `rightFighter1` (only 1 enemy slot shown, `battle-setup.js:206`).
- Background: `bg-ruins.png` (`battle-setup.js:149`).
- BGM: `playBgm('boss')` (`battle-setup.js:210`).
- Right team label: `<img equip-crown-icon.png> BOSS` (`battle-setup.js:201`).

**poc** (`BattleScene.ts:190-192`, `:237-244`):
- `rightTeam = [pickRandomEnemyTeam(leftTeam, 1)[0]]` — uses hardcoded 22-pet list, not ALL_PETS.
- `applyEnemyModeMods` multipliers match JS exactly: ×3.5/×1.2/×1.4/×1.4.
- `f._isBoss=true`, `f.name = 'BOSS ' + name`. ✓
- No `_position` / `_slotKey` set during mod — relies on `autoAssignSlots`.

**Diff**:
- Enemy pool: 22 vs 35+.
- Boss level: NOT scaled to `avgLv` (JS line 1537 explicit fix is missing).

**Fix**: pool=ALL_PETS; pass `_avgLevel(leftTeam)` to createFighter for boss.

### boss-pick (指定 Boss)
**JS** (`main.js:1501-1528`):
- User picks 1 pet via `showBossPickModal`, then `showSkillPickModal` to configure that boss's skills (not saved globally, `skipSave:true`).
- `createFighter(bossPetId, 'right', chosenIdxs, bossLv)` with `bossLv = _avgLevel(leftTeam)`.
- Same `_isBoss`/×3.5/×1.2/×1.4/×1.4 mods, then `gameMode='boss'`, `startBattle()`.

**poc** (`BossPickScene.ts`, `BattleScene.ts:193-196`):
- BossPickScene shows 28-pet grid (`ALL_PETS.filter(!leftTeam.includes)`). ✓
- NO skill-pick step — boss uses default skills.
- `bossId` passed to BattleScene, modded identically.

**Diff**:
- Missing JS `showSkillPickModal` — JS lets user configure boss's 3 skills, poc doesn't.

**Fix**: add a SkillPickModal scene between BossPick and Battle; pass chosen skill indices via `loadouts[bossId]`.

### dungeon (深海闯关)
**JS** (`dungeon.js:6-12, 14-180`):
- 5 stages with HP/ATK/DEF triplets:
  - S1: ×0.85/0.85/0.85, 3 enemies
  - S2: ×1.0/1.0/1.0, 3 enemies
  - S3: ×1.1/1.1/1.1, 3 enemies
  - S4: ×1.2/1.2/1.2, 3 enemies
  - S5 BOSS: ×3.0/1.25/1.4, 1 enemy, `_isBoss`, `name='BOSS '+`
- `dungeonAvgLv = cfg.boss ? 10 : _avgLevel(leftTeam)` (`dungeon.js:158`).
- Enemy pool: `ALL_PETS.filter(p => !ds.teamIds.includes(p.id))`, shuffled.
- Across stages: dead at 70% maxHp on revive (`dungeon.js:42`); alive carry full maxHp; reward picks accumulate as `ds.buffs[]` and `ds.carryState` (chest treasure / equips / bubble store / hunter stolen stats / fate-wheel counts / carapace stacks etc., `dungeon.js:60-126`).
- Bench: `restoreBenchFromDungeon` from `dungeonState.equipBenchIds`, persists left bench across stages (`battle-setup.js:414`).
- Buffs apply to all fighters incl. revived (`dungeon.js:46-59`): types `atk/def/mr/crit/lifesteal/maxHp/atkPct/dodge/magicPen/hotPct/killBonus`.
- BG per stage: `bg-sakura`, `bg-oasis`, `bg-cave-alt`, `bg-ice`, `bg-ruins` (`battle-setup.js:151-159`).

**poc** (`DungeonScene.ts:29-40`, `BattleScene.ts:181-232`):
- 5 stages with same HP/ATK/DEF triplets ✓ (`DungeonScene.ts:30-39`).
- BUT each stage has a `pool: string[]` of 4-5 hardcoded pets (`DungeonScene.ts:31,33,35,37,39`). JS has NO per-stage pool — JS picks any non-team pet from ALL_PETS.
- `dungeonAvgLv`: NOT derived from player team; enemy levels come from defaults.
- TeamBonus `kind` types: `atk/hp/crit/lifesteal/shield/equip/heal` (`DungeonScene.ts:199-204`). JS has 11 types (atk/def/mr/crit/lifesteal/maxHp/atkPct/dodge/magicPen/hotPct/killBonus). Missing: def/mr/atkPct/dodge/magicPen/hotPct/killBonus. Extra: shield/heal/equip (not in JS list).
- `carryState` (chest treasure / hunter stolen / fate wheel / equip carapace / 2-head resilience): NOT implemented in `BattleScene.init`. Only `playerHpSnapshot` (hp/maxHp/shield/alive/position) carries.
- Bench: `benchInventoryIds` rebuild ✓.

**Diff**:
- Hardcoded 4-5 per-stage pool vs JS uses ALL_PETS shuffle.
- Reward-bonus type set diverges (poc is self-created).
- 70% HP revive ✓ (description renders in DungeonScene); enforcement not verified in BattleScene `applyHpSnapshot`.
- `carryState` chest/hunter/fate-wheel completely missing — these are essential to JS character mechanics across stages.

**Fix**: pool=ALL_PETS; align bonus.kind with JS 11 types; port `carryState` snapshot/restore.

### test (测试模式)
**JS** (`main.js:1494-1500`):
- `slots = ['front-0','front-1','front-2','back-0','back-1','back-2']` — 6 dummies.
- Each `_createTestDummy('right', slotKey)` → 2000HP, 0 ATK/DEF/MR, no skills, AI auto-skip.
- Right team label: `🎯 假人` (`battle-setup.js:200`).
- `testBgPicker` display (`battle-setup.js:188-191`).

**poc** (`BattleScene.ts:197-198`, `:245-256`):
- `rightTeam = ['basic', 'basic', 'basic']` — only 3 dummies, all `basic` id.
- `applyEnemyModeMods` test branch: 2000HP, 0 stats, name=`木桩 ${id}`, `_isDummy=true`. ✓

**Diff**:
- 3 vs 6 dummies (JS uses all 6 slot positions).
- All 3 reuse `basic` ID — JS dummies don't share an id (each is independent dummy in its own slot).

**Fix**: spawn 6 dummies and stub names like `dummy-front-0`; allow leftTeam to test against 6 enemies.

---

## Q2 — Font sizes

JS battle UI elements vs poc:

| Element | JS source | JS size | poc location | poc size | Status |
|---|---|---|---|---|---|
| `.turn-banner` (PC pill) | `battle.css:2570` | 14px | `BattleTopRow.ts:61` | 14px | ✓ |
| `.turn-banner` (default) | `battle.css:28` | 16px | n/a (PC only) | — | ✓ |
| `.btn-help` | `battle.css:29` | 16px | `BattleTopRow.ts:79` | 16px | ✓ |
| `.btn-battle-back` | `battle.css:35` | 18px | `BattleTopRow.ts:99` | 18px | ✓ |
| `.deep-coin-pill` | `battle.css:43` | 18px | `BattleStatsRail.ts:98` | 18px | ✓ |
| `.synergy-chip` | `battle.css:191` | 15px | `BattleStatsRail.ts:131` | 15px | ✓ |
| `.synergy-chip-tier` | `battle.css:208` | 9px | (not verified) | ? | needs check |
| `.battle-log` (PC) | `battle.css:787` | 11px | `BattleLog.ts:72` | 11px | ✓ |
| `.battle-log` (default) | `battle.css:727` | 13px | n/a (PC only) | — | ✓ |
| `.log-entry.round-sep` | `battle.css:732` | 12px | `BattleLog.ts:92` | 12px | ✓ |
| `.scene-turtle .st-name` | `scene.css:194` | 12px | poc renders sprite name via Phaser `nameText` `BattleScene.ts:881-883` | uses `'13px'` (search `nameText` def) | NEEDS VERIFY |
| `.st-level-badge` | `base.css:55` | 10px | `scene-turtle-dom.ts:109` | 10px | ✓ |
| `.st-level-badge.is-boss` | `scene.css:12` | 13px | `scene-turtle-dom.ts:98` | 13px | ✓ |
| `.st-hp-text` | `scene.css:215` | 9px | `scene-turtle-dom.ts:186` | 9px | ✓ (JS does not render but poc CSS exists) |
| `.floating-num.direct-dmg` | `battle.css:375` | 22px | floating handled via `spawnFloatingText` | dynamic | NEEDS VERIFY |
| `.floating-num.crit-dmg` | `battle.css:389` | 26px | dynamic | NEEDS VERIFY |
| `.floating-num.heal-num` | `battle.css:385` | 24px | dynamic | NEEDS VERIFY |
| `.fdp-hp-line` | `scene.css:331` | 15px | (FighterDetailPanel not in poc — see Q7) | missing | DIVERGENT |
| `.fdp-name` | `scene.css:322` | 18px | (missing) | — | DIVERGENT |
| `.skill-card` | `battle.css:664` | 13px | `ActionPanel.ts` (button text) | uses fontSize 14 (DOM via `addDomText`) | minor diff |
| `.skill-header` | `battle.css:668` | 15px | (not verified) | ? | NEEDS VERIFY |
| `.skill-body-brief/detail` | `battle.css:669` | 12px | (not verified) | ? | NEEDS VERIFY |
| `.action-header` | `battle.css:657` | 14px | (not verified) | ? | NEEDS VERIFY |
| `.action-header .acting-name` | `battle.css:658` | 16px | (not verified) | ? | NEEDS VERIFY |
| `.test-bg-picker` | `battle.css:2473` | 12px | `BattleScene.ts:264,274` | 12px / 10px (chip 10) | ✓ |
| `.dmg-stats-panel` | `battle.css:608` | 10px | `BattleScene.ts:2577,2585,2659` | 11/10 | minor diff |
| `.dmg-stats-header` | `battle.css:616` | 11px | `BattleScene.ts:2577` | 15px | DIVERGENT (15 vs 11) |
| `.help-title` | `battle.css:212` | 15px | (HelpPanel) | not verified | NEEDS VERIFY |
| `.help-item` | `battle.css:216` | 12px | not verified | ? | NEEDS VERIFY |
| `.passive-popup-title` | `battle.css:281` | 16px | not used in poc | — | DIVERGENT |
| `.passive-popup-desc` | `battle.css:283` | 13px | not used | — | DIVERGENT |
| `.skill-announce` | `scene.css:367` | 16px | not used (poc uses Phaser text) | — | DIVERGENT |

**Worst font issues**:
1. `.dmg-stats-header` title: poc 15px vs JS 11px.
2. Fighter detail modal (`.fdp-name` 18px, `.fdp-hp-line` 15px, `.fdp-stat` 13px) — not implemented in poc.
3. Several skill-card-related sizes need verification against `ActionPanel.ts`.

---

## Q3 — z-index (panel overlap / 漂血条字体浮在面板)

### JS z-index hierarchy (battle screen)

| Element | JS source | JS z-index |
|---|---|---|
| `.scene-turtle` (sprite) | `scene.css:6` | 2 |
| `.scene-turtle.targetable` | `scene.css:77` | 10 |
| `.scene-summon` | `battle.css:574` | 1 |
| `.hp-delay` | `battle.css:302` | 0 (inside bar) |
| `.hp-fill` | `battle.css:306` | 1 (inside bar) |
| `.shield-fill` | `battle.css:314` | 2 (inside bar) |
| `.bubble-shield-fill` | `battle.css:315` | 3 (inside bar) |
| `.hp-ticks` | `battle.css:317` | 4 (inside bar) |
| `.floating-num` | `battle.css:363` | 50 |
| `.dmg-stats-panel` | `battle.css:608` | 200 |
| `.target-hint` | `battle.css:719` | 100 |
| `.battle-log-wrapper` (PC) | `battle.css:786` | 50 |
| `.fighter-detail-panel` | `scene.css:319` | 250 |
| `.passive-popup` | `base.css:280` | 300 |
| `.skill-announce` | `scene.css:367` | 200 |
| `.help-panel` (PC) | `battle.css:2609` | 50 |
| `.turn-banner-row` (PC) | `battle.css:2527` | 40 |
| `.test-bg-picker` | `battle.css:2473` | 42 |
| `.equip-bench-rail` | `battle.css:2630` | 6 |
| `.action-panel` (PC) | `battle.css:2595` | 30 |
| `.turtle-picker` (PC) | `battle.css:2585` | 30 |
| `.bench-drag-ghost` | `battle.css:2676` | 9999 |
| `.bench-toast` | `battle.css:2700` | 9998 |
| `.turn-start-banner` | `base.css:1826` | 9998 |
| `.rule-banner` | `base.css:1819` | 9999 |
| `.game-confirm-overlay` | `base.css:2390` | 10000 |

Key JS observation: scene-turtle is z=2 (z=10 when targetable). All UI panels (help/log/picker/action/banners/dmg-stats/modals) sit ≥30, with most at ≥50-300. Sprites are ALWAYS below panels in JS.

### poc z-index

| Element | poc source | poc value |
|---|---|---|
| `.poc-scene-turtle` (DOM body) | `scene-turtle-dom.ts:80` | **50** |
| Scene HP bar items (z inside body) | `scene-turtle-dom.ts:139,146,157,164,171,182` | 0/1/2/3/4 (relative) |
| Phaser sprite | `BattleScene.ts:838,844` | depth 2 |
| Phaser shadow | `BattleScene.ts:827` | depth 1 |
| Phaser hp/shield bars (canvas) | `BattleScene.ts:866-875` | depth 3-4.5 |
| Phaser status group | `BattleScene.ts:894` | depth 6 |
| `#poc-battle-log-wrapper` | `BattleLog.ts:62` | 50 |
| `.poc-deep-coin-pill` | `BattleStatsRail.ts:94` | 45 |
| `.poc-synergy-bar` | `BattleStatsRail.ts:120` | 44 |
| `#poc-battle-top-row` | `BattleTopRow.ts:46` | 100 |
| `#poc-debug-overlay` | `DebugOverlay.ts:26` | **250** |
| HelpPanel overlay | `HelpPanel.ts:73,88` | 220, 221 |
| ActionPanel | `ActionPanel.ts:51` | 180 |
| BenchRail | `BenchRail.ts:77` | 6 |
| dmg-stats-panel (Phaser canvas) | `BattleScene.ts:2575` | **depth 50** (canvas only, NOT DOM z) |

### Issues

1. **DOM scene-turtle z=50** (`scene-turtle-dom.ts:80`) is **way too high**. JS uses z=2. As result:
   - When `BattleStatsRail` (z=44/45) opens, scene-turtle DOM HP bars / level badges / equip chips visually float over the rail's content.
   - Phaser-canvas `dmg-stats-panel` (`setDepth(50)`) lives ONLY in canvas — the DOM scene-turtle (z=50) sits on a separate stacking context that is RENDERED ABOVE the entire Phaser canvas. So the dmg-stats-panel is buried by every DOM scene-turtle.
   - BattleTopRow z=100 sits above scene-turtle z=50 ✓; BattleLog z=50 is **at same level** as scene-turtle, so HP bars at the rightmost turtle clash with the log strip's left edge — this matches the user's "随便点一个面板甚至有血条字体浮在面板上" complaint.
   - HelpPanel z=220 / DebugOverlay z=250 / ActionPanel z=180 all correctly sit above 50; user's complaint must concern dmg-stats and bench/synergy rails.

2. **dmg-stats-panel is Phaser canvas (depth 50)** but the user expects it to overlay DOM. It can never visually beat any DOM element. Needs DOM-port or container w/ very high CSS z (≥300).

3. **BattleLog z=50** equals scene-turtle DOM z=50 → DOM document order tie-breaker decides; user reports HP bar font bleeding over log.

### Fixes

| Target | Change | Why |
|---|---|---|
| `scene-turtle-dom.ts:80` | `z-index: 5` (or 2 to match JS) | bring sprite layer below panels |
| `scene-turtle.targetable` (poc has no equivalent) | add `z-index: 10` for targetable state | match JS targetable promotion |
| `BattleLog.ts:62` | keep 50 OR raise turtle wrapper below; since wrapper is fixed-right strip, also acceptable to leave 50 once sprite is z=5 | unify |
| dmg-stats-panel | port to DOM with z-index 200 (JS value) OR raise containing scene + canvas to layered Phaser scene above DOM | so it actually overlays |
| `BattleStatsRail.ts:94,120` deep-coin/synergy | keep 44/45 ✓ (matches JS) | OK |
| HelpPanel | 220 ≥ JS 50 (PC), but acceptable | OK |
| `DebugOverlay.ts:26` z=250 | matches JS modal-tier z=250-300 | OK |

**Worst clash**: `.poc-scene-turtle z=50` vs JS `.scene-turtle z=2`. Lowering this single value fixes the bulk of the floating-HP-bar over-panel complaint.

---

## Q4 — 战斗统计 (dmg stats panel)

### JS `ui.js:1350-1409` `updateDmgStats`

Per fighter row (`ds-row`):
- `ds-name`: `buildPetAvatarHTML(f, 16)` (16px avatar) + ` ${f.name}` text.
- `ds-val`: total dmg (Dealt or Taken depending on tab).
- `ds-bar-wrap`: 3 stacked bars (physical orange `#ff6b6b`, magic blue `#4dabf7`, true white `#ffffff`), each width = `<value>/<max>*100%`, magic offset by physPct, true offset by physPct+magicPct.
- Class `ds-dead` if `!f.alive` (greyed).
- Class `ds-left`/`ds-right` for side coloring.

Per-fighter fields tracked: `_dmgDealt, _dmgTaken, _physDmgDealt, _physDmgTaken, _magicDmgDealt, _magicDmgTaken, _trueDmgDealt, _trueDmgTaken`.

Tabs: `dealt` / `taken` (via `_dmgStatsTab` + `switchDmgTab`).

Layout: 2-column `ds-col` (我方 / 敌方), each side sorted descending by value, with its own local max for bar normalization.

### poc `BattleScene.ts:2557-2696` `refreshDmgStatsPanel`

Per row:
- 16px pet sprite avatar (`pet-${id}` texture) ✓
- name slice(0,6) ✓ (JS shows full name)
- total dmg value ✓
- stacked bar (phy/mag/tru/**dot**) — JS doesn't include dot stripe.
- Class `dead` greyed via view.fighter.alive ✓.
- 2-col 我方/敌方 ✓.

Per-fighter fields tracked (from `battle-stats.ts`): includes `kills, crits, healDone, dmgDealt, dmgTaken, dmgDealtByType{phy,mag,tru,dot}, dmgTakenByType{...}` — has extras not in JS.

Tabs ✓.

Sort by side-local max ✓ (`maxAllyDealt` / `maxEnemyDealt` analog via `Math.max(...rows)`).

### Mismatches

1. **dot stripe**: poc adds a 4th yellow band per row (`DMG_TYPE_INFO.dot`). JS has only 3 (phy/mag/tru). DOT (灼烧/poison/bleed) in JS is rolled into the matching dmgType (灼烧→magic) so it shows up as magic stripe color.
2. **panel-level max** vs **per-side max**: poc computes one `maxVal` over both sides for bar normalization (line 2629). JS computes 4 separate maxes (allyDealt/enemyDealt/allyTaken/enemyTaken). Result: poc bars are skewed when one side has huge dmg — the other side's bars look near-empty.
3. **name truncate to 6 chars** (`s.name.slice(0,6)`) — JS shows full name and lets CSS ellipsis handle overflow.
4. **header font 15px** vs JS 11px (see Q2).
5. **summons inclusion**: JS iterates `allFighters` which includes summons after `startBattle` pushes them. poc uses `battleStats.all()` whose population needs verifying — summons may or may not be tracked.
6. **extras**: poc tracks `kills, crits, healDone` — not displayed in the panel but stored. JS does not track these in fighter at all.

### Fix priorities

1. Drop dot band (merge into mag color).
2. Use 4 per-quadrant maxes for bar normalization.
3. Remove name truncation; let CSS handle it.
4. Header 15 → 11.

---

## Q5 — 战斗日志 (battle log content)

### Stats

| File | addLog count |
|---|---|
| JS `skills/basic.js` | 5 |
| JS `skills/cyber.js` | 4 |
| JS `skills/line.js` | 5 |
| JS `skills/phoenix.js` | 5 |
| JS `skills/shell.js` | 6 |
| JS `skills/_misc.js` | 22 |
| poc `engine/skill-handlers.ts` | **0** |
| poc `scenes/BattleScene.ts` | 86 (mostly turn/damage/event/death-level logs, not per-skill flavor) |

Poc skill handlers do NOT call `this.battleLog.log(...)` at all. All log output is generated by BattleScene's combat-step plumbing (attack lines, death lines, round separators) via colorize() regex auto-wrap.

### 5-skill comparison

**basicBarrage** (10-段 ranged barrage)
- JS `basic.js:229`: `${attacker.emoji}${attacker.name} <b>打击</b> ${hits}段随机分布：<span class="log-direct">共${totals.dmg}伤害</span>` (one summary line per cast).
- poc `skill-handlers.ts:586-622`: no log call. Player sees floating numbers per hit but no aggregate log line.

**cyberBeam** (drone-supported laser)
- JS `cyber.js:302`: `${attacker.emoji}${attacker.name} <b>能量大炮</b> → ${rowLabel}（${droneCount}炮台）：${logBits.join('、')}` — per-target dmg list.
- poc `skill-handlers.ts:2202+`: no log.

**lineLink** (inked link tether)
- JS `line.js:102`: `${attacker} <b>连笔</b>：连接${target1}与${target2} ${duration}回合（伤害传递${transferPct}%${linkType==='true'?'真实':'魔法'}）`
- JS `line.js:104`: fallback when no 2nd target.
- poc `skill-handlers.ts:4114+`: no log.

**phoenixBurn** (burn DoT)
- JS `phoenix.js:45`: `${attacker} <b>灼烧</b> → ${target}：<span class="log-direct">${shown}伤害</span>`.
- poc `skill-handlers.ts:1241+`: no log.

**shellAbsorb** (absorb HP+maxHP)
- JS `shell.js:307`: `${f} <b>${skill.name}</b>：${target} 损失 ${stealAmt}HP 和 ${stealAmt}最大生命值`.
- poc `skill-handlers.ts:1425+`: no log.

### colorize() vs structured spans

JS embeds rich color via explicit `<span class="log-direct/log-magic/log-pierce/log-heal/log-shield/log-crit/log-passive/log-debuff/log-dot">` per token in each line. The result is multi-color highlights inside one entry (e.g. `<b>素描</b> → 龟: <span class="log-direct">120物理伤害</span>（墨迹3层）`).

poc's `BattleLog.colorize()` (lines 166-176) auto-wraps based on regex keywords (`暴击/治疗/护盾/灼烧/...`). This misses:
- Direct damage value coloring (JS wraps the number+伤害 phrase, poc only wraps `\d+` into `<b>`).
- Numeric badges (穿透 vs 物理 vs 魔法 distinction by class — poc only matches keywords).
- Multi-color lines (`物理+真实` mixed) where JS uses two separate spans.

### Fix priorities

1. Have poc skill handlers receive `api.log(...)` accepting same JS-style HTML; replicate JS strings 1:1.
2. Drop / supplement colorize() — preferable to author logs in handlers with explicit spans.

---

## Q6 — 返回主站 button

JS `index.html:114` (top nav, always visible) AND `:176` (inside `#screenMenu .menu-top-bar`):
```html
<a class="back-link" href="../../index.html">← 返回龟投</a>
```
Two locations: global top nav and main menu screen. CSS `base.css:165-167`: `.menu-top-bar .back-link{color:var(--accent);text-decoration:none;font-size:14px}`.

**poc** `MainMenuScene.ts:157-163`:
```ts
const back = this.add.text(20, 20, '← 返回龟投', {
  fontSize: '14px', color: '#ffd93d', ...
}).setInteractive({ useHandCursor: true });
back.on('pointerdown', () => this.shake());
```
Label exists ✓ at correct font size 14px, but click handler is `this.shake()` — only shakes camera, **does NOT navigate**.

Also no equivalent on any post-menu scene (TeamSelect / BossPick / Dungeon / Battle / Codex) — JS shows the top-nav back link on every screen.

### Fix

Replace `() => this.shake()` with `() => { window.location.href = '../../index.html'; }` (or appropriate relative path for poc deployment). Add the same link to top of TeamSelectScene / BattleScene / DungeonScene / CodexScene / etc.

---

## Q7 — 其他自创元素 (self-created not in JS)

1. **MainMenu watermark** `MainMenuScene.ts:166-168`: `'Phaser 3 PoC v0.5'` text bottom-center. Not in JS.
2. **MainMenu particles** `MainMenuScene.ts:57-68`: gold sparkle particle emitter. Comment "保留, 让废墟也有动静" — explicitly self-created; JS has `menu-title-drop`/`menu-title-float` but no particles.
3. **Tutorial 4-step modal** `MainMenuScene.ts:393-468`: first-visit local-storage tutorial. JS has no such overlay (it uses 跨页 onboarding in `tutorial.js` differently).
4. **Right side 5-card info panel** `MainMenuScene.ts:132-139`: cards (`图鉴/引导/成就/龟币/战绩`) — JS has equivalents but as different layout (`menu-info-card` horizontal flex). poc layout/sizes approximate; 战绩 card formatting is poc-specific (`暂无` fallback string).
5. **Phaser btn-frame hover scale** `MainMenuScene.ts:182-227`: uses alpha pulse + texture swap; JS uses CSS brightness. Visually different "press" feel.
6. **DungeonScene difficulty chips** `DungeonScene.ts:169-189`: 3 chips HP/ATK/DEF with `×N.NN` formatted display. JS dungeon flow shows label in turn banner; no such chip preview.
7. **DungeonScene progress bar** `DungeonScene.ts:232-256`: 5-segment progress bar with历史最佳 text. JS has no equivalent pre-stage scene — dungeon transition uses Reward modal directly.
8. **DungeonScene per-stage pool** `DungeonScene.ts:30-39`: hardcoded 4-5 pet pool per stage (self-created — JS uses ALL_PETS minus team).
9. **BossPickScene 28-card grid** `BossPickScene.ts:64-95`: scrollable grid w/ wheel. JS uses a smaller `showBossPickModal` (not verified shape but likely 8-12 candidates max).
10. **Hardcoded enemy pet pool** `BattleScene.ts:285-287`: 22 pet IDs (`stone, bamboo, angel, ice, two_head, diamond, fortune, dice, rainbow, gambler, hunter, pirate, candy, bubble, line, lightning, cyber, crystal, chest, space, hiding, headless`). JS uses ALL_PETS.length=35+. Difference: poc never spawns ~13 pets as wild/boss enemy (`basic, ghost, ninja, shell, sweet, gobi, lava, phoenix, mech, star, dollbear, doll`, etc.).
11. **`'Phaser 3 PoC v0.5'` footer** — see #1.
12. **TeamBonus types** `DungeonScene.ts:199-204`: `atk/hp/crit/lifesteal/shield/equip/heal` — JS dungeon has 11 different types (Q1).
13. **dmg-stats-panel header label "📊 伤害统计"** at 15px (`BattleScene.ts:2577`). JS uses just tabs without a separate header.
14. **dmg-stats dot stripe** — see Q4.
15. **Tutorial step text**: poc tutorial steps reference `深海闯关` as 28 vs 35 turtles and "3 前 + 3 后" (`MainMenuScene.ts:401-406`) — JS has different copy.
16. **poc-deep-coin-pill** font 18 ✓ matches; but JS `font-size` source `battle.css:43` is in same block as a `font-weight:800` declaration — verify weight 800 carried.
17. **DOM scene-turtle z-index 50** vs JS scene-turtle z-index 2 (see Q3).
18. **BattleLog colorize regex** (see Q5).
19. **Camera shake on disabled buttons** `MainMenuScene.ts:89-90`: pressing disabled `快速匹配/房间对战` shakes screen. Not in JS (JS shows toast).
20. **Settings/Permshop scenes** exist (`SettingsScene.ts, PermShopScene.ts`) but PoC user note says "局外是没有商店的" — confirm whether PermShop reachable.

---

## SUMMARY (≤200 words)

**Biggest mode divergence**: **dungeon**. Per-stage hardcoded 4-5 pet pools (JS uses ALL_PETS); TeamBonus kinds (`shield/heal/equip` extras, `def/mr/atkPct/dodge/magicPen/hotPct/killBonus` missing); chest/hunter/fate-wheel `carryState` cross-stage state is not ported; level scaling missing. Test mode is also visibly wrong: 3 vs 6 dummies.

**Worst font/z-index issue**: **DOM `.poc-scene-turtle` declared `z-index:50`** in `scene-turtle-dom.ts:80`. JS uses `z-index:2` on `.scene-turtle` (`scene.css:6`). At z=50 the DOM turtle (incl. HP bars / equip chips / status icons) floats over BattleStatsRail (z=44/45), BenchRail (z=6), and the Phaser-canvas dmg-stats-panel (a separate stacking context — DOM always paints above canvas regardless of `setDepth(50)`). This single value drives the "随便点一个面板甚至有血条字体浮在面板上" complaint. Lower to 5–10 (with a `.targetable` bump to 12) for JS parity. Secondary: `.dmg-stats-header` 15px vs JS 11px, and the entire `.fighter-detail-panel` is unported (`.fdp-name` 18, `.fdp-hp-line` 15, etc.).

**Doc**: `poc-phaser/AUDIT-MODES.md`.
