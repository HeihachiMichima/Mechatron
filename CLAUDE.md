# CLAUDE.md — Compagnon Mechatron

Fan-made, unofficial game companion (robot fiches, energy, black market, combat) for
**Mutant: Year Zero — Mechatron**. UI is in **French**;
code, comments and identifiers are in English.

## Repository layout

```
(repo root)
├── CLAUDE.md, README.md (French, user-facing — keep in sync with features)
├── docs/PLAN-COMPAGNON.md   the implementation plan: tickets T00–T16, follow it in order
├── index.html, package.json, vite.config.js, svelte.config.js
├── .github/workflows/deploy.yml   builds and deploys to GitHub Pages on push to main
├── Mechatron-livre-md/  the rulebook in Markdown (git-ignored, never commit): READ THIS for rules
├── dist/index.html      the build (git-ignored): ONE self-contained file (JS, CSS, fonts, logo inlined)
├── e2e/smoke.spec.js    Playwright smoke test of dist/index.html (screenshots → e2e/screenshots/, ignored)
└── src/
    ├── main.js, App.svelte, app.css     entry, sheet router, design tokens
    ├── assets/logo.png  app logo (top bar + print sheet), inlined into the build (the only tracked logo.png)
    ├── lib/
    │   ├── data.js          GAME_DATA — every game number, from the book only
    │   ├── house.js         house rules: values the book doesn't give (« règle maison », GM-editable)
    │   ├── settings.js      getRules() (book ← house ← campaign overrides), getDev() (campaign.dev)
    │   ├── demo.js          demoParty(): the demo team (« Essayer la démo »)
    │   ├── creation.js      creation wizard: STEPS, stepErrors, buildRobot/applyDraft, start/finishWizard
    │   ├── clock.js         day/night clock + energy engine: endDay, nightCharge, startDay, transfer, drainPack
    │   ├── market.js        black market: catalog (defaultListings), normalizeMarket, prices, sell price, file
    │   ├── xp.js            XP rules (xpRules ← campaign.rules.xp), session draft/apply, spendProgram/Secondary
    │   ├── campaign.js      campaign files (classifyImport, readImport, file name) + automatic backups
    │   ├── rules.js         pure rules functions (chassis, pools, dice, damage…)
    │   ├── rng.js           every random draw: d6(), random(), pick(), setRng(seed)
    │   ├── __tests__/       Vitest tests (*.test.js) + helpers.js (rig dice) + roundtrip.js
    │   ├── store.svelte.js  roster + combat state, undo, localStorage
    │   ├── combat.js        initiative order, turn advance, group rolls
    │   ├── energy.js        module activation (overheating, Power Saver), module fx
    │   │                    lookup, energy-weapon power sources, E-packs, blasts
    │   ├── exports.js       JSON / text / share-link / PNG card exports
    │   └── pickers.js       list builders for the picker sheets
    ├── components/          TopBar, PcTabs, VitalsPlate, FicheTabs, Nav, RobotList, Sheet, Stepper,
    │                        EmptyTeam, BackupList, Segments, Toast, Icon, Avatar, DiceTray, CombatGuide,
    │                        PrintSheet, OverheatDice (shows one module activation)
    ├── views/               Welcome (no campaign yet); fiche tabs État, Programmes, Matériel, Robot
    │                        (« Identité »); spaces Energy, Market, Combat, Session, Gm
    │   ├── energy/          EnergyTransfer (« Donner des PE »), EnergyRules (GM overrides)
    │   ├── gm/              MarketEditor (MJ → Marché noir), XpRulesEditor (MJ → Règles de l'expérience)
    │   ├── session/         SessionWizard (« Terminer la séance »)
    │   ├── combat/          CombatPrep → CombatInit → CombatFight (+ TurnFlow, ActorStats,
    │   │                    LogicConflict, BlowerStep, RecycleStep)
    │   └── creation/        CreationWizard (+ ChassisStep, ProgramStep, ModuleStep)
    └── sheets/              bottom-sheet dialogs (Roll, Damage, Module, Picker, Weapon,
                             Template, Roster (« Gérer l'équipe », PCs), Export, Incoming, XpSpend, Combatant, EnemyEdit, Duplicate,
                             Campaign = the top bar menu: rename, export, import, new, backups, theme)
```

**Rules reference: `Mechatron-livre-md/`** (repo root, git-ignored — it is the user's own copy of a
copyrighted book: never commit, quote at length or publish it). It is the whole Mechatron rulebook
converted to Markdown (237 PDF pages, OCR, see `meta.json`):
- read `INDEX.md` first (chapter map + sub-section titles with pages), then open only the slice
  you need: one file per 5 pages, `p0001-0005.md` … `p0236-0237.md`;
- cite pages with the `<!-- page N -->` markers (PDF page numbers; printed page ≈ PDF page − 1);
- the text is OCR: table cells can be garbled (e.g. "2)" for a number). When a number matters
  and looks wrong, ask the user to check the PDF instead of guessing;
- useful pages: XP 26 · chassis parts 18 · energy points 72 · modules 72-78 · range & movement 82 ·
  cover 91 · DEV levels 107-108 · base stations, energy as currency 112 · black market 116-117 ·
  goods & services prices 234.
The folder only exists on the user's PC: an agent working
from a GitHub clone doesn't have it and must ask the user for the pages it needs.

## Commands (run at the repo root)

```bash
npm install
npm run dev       # Vite dev server
npm run build     # → dist/index.html (single file, ~624 kB)
npm run preview
npm test          # Vitest unit tests (src/**/__tests__/*.test.js)
npm run e2e       # Playwright smoke test of the build (run npm run build first)
```

Stack: Svelte 5 (runes), Vite 8, `vite-plugin-singlefile`, fonts from
`@fontsource/chakra-petch` and `@fontsource/ibm-plex-sans` referenced by relative
`node_modules` paths in `app.css` so they get inlined. No router, no CSS framework,
no backend. Output must stay a **static page** that opens by double-click, offline.

## Hard rules

- **Never invent game numbers.** Every stat in `data.js` comes from the rulebook
  (page refs in comments). If the book is silent, use `null` and let the UI fall
  back gracefully. When unsure, read the page in `Mechatron-livre-md/` first.
- **Mobile first.** Design for ~380 px wide, thumb reach (bottom nav, bottom sheets),
  44 px touch targets, no horizontal scroll. Desktop is a bonus layout.
- **French UI text**, proper typography (« », non-breaking spaces before `:` when
  natural, accents). Correct plural agreement in messages/toasts.
- **No backward compatibility.** There is no user base: no migration of old saves, no legacy
  keys, no support for old share links or files. A schema change just bumps `version`.
- **Every persisted field goes through `normalize()` / `normalizeAll()` / `normalizeCombat()`.**
  They rebuild objects from a fixed list of fields, and undo/reload pass through them: a field
  they don't know disappears. Add a save → reload → undo test for each new field.
  Keys: save `mechatron-v3`, UI prefs `mechatron-ui-v3` (per device, never exported). Older keys are
  deleted at startup; a save that isn't `version: 3` with a `campaign` (`isCurrentSave`) is refused
  (« Sauvegarde d'une ancienne version… »): 2.x tables also said version 3 but had no campaign.
- **House rules.** `data.js` holds book values only. A value the book doesn't give goes in
  `src/lib/house.js`, is shown with a « règle maison » badge and is GM-editable; read rule
  values through `getRules()` (`src/lib/settings.js`).
- **Simple to use, simple to maintain.** At equal value, less code, fewer screens, fewer
  settings. Don't force a request that fits the static single-file tech badly: propose a simpler
  alternative or ask the user.
- Colors are semantic: `--amber` primary/successes, `--coolant` energy only,
  `--fault` damage only; dice: base yellow, program green, gear black. Light/dark/auto
  themes via `:root[data-theme]`.


## Architecture notes

**Store (`store.svelte.js`).** `store.data = { version: 3, campaign, chars[], activeId, combat }`,
`store.ui = { space, tab, theme, gm, npc, pc, peek, sheet, turn, turnActor }`. Mutate only through
`commit(label, fn)`, `commitOn(charId, label, fn(char, data))` or `commitAll` — they
snapshot for undo (40 steps), autosave and toast. Text fields use `store.type(charId, field, fn)`
(`value` + `oninput`, never `bind:value={store.c.*}`): keystrokes in one field coalesce into one
undo step. `store.open(type, props)` / `store.close()` drive bottom sheets; **props vanish after
`close()`**, so capture them in consts first.
- **Spaces (T05).** `ui.space` ∈ `SPACES` (`equipe energie marche combat seance mj`), `ui.tab` ∈
  `FICHE_TABS` (`etat programmes materiel robot`), `ui.gm` = « Mode MJ »; these and the theme are the
  UI prefs (`cleanUi()`), per device, never in the campaign. Read the space with `store.space` (`mj`
  falls back to `equipe` without GM mode) and the robot on screen with `store.fiche`: the active PC
  in Équipe, the open NPC (`ui.npc`) in MJ, the NPC opened from Combat (`ui.peek`, any GM mode, closed
  by any `go()`) in Combat, else `null`. Navigate with `store.go(space, tab)` (Équipe makes a PC
  active) and `store.openFiche(id, tab)` (PC → Équipe; NPC → in place from Combat, else MJ, refused
  without GM mode).
  `store.setGm(on)`. App runs `store.syncFiche()` in an effect to keep the active robot in line with
  the space (an undo or a combat sheet can activate another robot): Équipe comes back to the last PC
  seen there (`ui.pc`, not saved). Sheets about « the robot on screen » (ExportSheet) read
  `store.fiche`, never `store.c`, so a hidden NPC can't leak into Équipe. GM mode hides tools (MJ
  space, NPC fiches, the PC/NPC switch), never combat information. `restoreAll(data, kind)` and
  `ResetAllButton kind` reset the team (`pc`), the NPCs (`npc`) or everyone (combat).
- **Creation wizard (T06, `lib/creation.js`).** `store.ui.wizard = { id, step, draft }` (not saved;
  `id` = PC being edited, else a new robot); App shows `CreationWizard` in Équipe while it is set
  (`store.fiche` is then null). `startWizard(id?)`, `closeWizard()`, `finishWizard()` (adds with
  `addChar` or saves with `commitOn` + `applyDraft`, then opens the fiche). `stepErrors(step, draft,
  {chars, id, gm})` is the single source of the rules: 10 points / max 3 / specialist ≥ 1
  (`getRules()`), the model's secondary, chassis parts and modules unique among PCs except
  `scrap: true` parts (GM mode overrides), gear choices. `buildRobot(draft)` = `applyDraft` + the
  model's `gear` groups (data.js) + EP = today's ration. Edit mode leaves gear, EP, damage, XP alone.
  `store.setPhase('play'|'creation')` = « L'équipe est prête » / « Rouvrir la création » (journal).
- **Clock and energy (T07, `lib/clock.js`).** Pure functions on the save, inside `commitAll`:
  `endDay` (−`dailyDrain` to every robot of `clockRobots()`: no creatures, no destroyed robots,
  NPCs only with the GM pool off; sleep at 0), `nightCharge` (connected → base station up to the
  ration, capped by `epMax`; not connected → `outsideSolarEp`, + D6 Panneaux solaires under a clear
  sky; `clock.exclude` = no station / no panels; Scrap Robots excluded by default, p.112), `startDay`
  (day + 1, `c.daily` reset). Each step refuses to run out of order (null/false), never lowers EP and
  writes one journal entry (one line per robot) plus `clock.report`. `energyRules(campaign)` = book
  values ← `campaign.rules.energy` (`dailyDrain`, `outsideSolarEp`, `overrideRation`); every ration
  (fiche, wizard, GM pool) reads it. `transfer(data, {id, item?}, {id, item?}, n)` = cable or Banque
  d'énergie (`charge`, `capacity: 5` in data.js); `drainPack` = E-pack / Batterie D6, used up.
- **Black market (T09, `lib/market.js`).** `listing = { id, kind: module|weapon|equipment|part|custom,
  ref, custom, price (null = not for sale until the GM sets it), rarity, stock (null = unlimited),
  enabled, hidden, note }`. `defaultListings()` = every module, weapon (not Mains nues), chassis part
  and equipment item; book prices from `GAME_DATA.goodsPrices` (p.234), `priceSource(l)` = book /
  house / none. House defaults in `house.js` (`HOUSE.market`: sellRate 0.5, sellMin 1, rarities with
  daily chances, rarity by kind). `setPhase('play')` opens the market, `'creation'` closes it; the
  demo starts open. GM editor: `views/gm/MarketEditor.svelte` in the MJ space.
  T10: `market.draw = { day, ids }` (`drawMarket` through rng; `store.ensureDraw()` draws once per
  in-game day when the Marché space shows, not an undo step; `store.redraw()` for the GM);
  `listing.force` ('in'|'out'|null); `isAvailable`; `buyBlock` (closed, no price, not today, EP via
  `availableEp`, module slots, duplicate module) → `buy(data, id, cid, { pay: payEp, ep: availableEp })`
  (item added: module, weapon, else equipment; a part goes to the equipment); `sellables` / `sell`
  (`sellPrice`, never above `epMax`, back in stock). Both write `market.ledger` (300 last) and the journal.
- **Experience (T11, `lib/xp.js`).** `xpRules(campaign)` = `campaign.rules.xp` (`questions [{id, text,
  xp, enabled}]`, `costs {program, secondary}`, `bonusAwards`) or the book's (`bookXp()`: the 6
  questions at 1 XP, 5 XP per upgrade, p.26). « Terminer la séance » (SessionView → `store.ui.session =
  { step, draft, done }`, not saved; opening it calls `store.backup('Fin de séance')`): `sessionDraft`
  (« participé » ticked), `sessionXp`, `rollDecay`, then one `commitAll` → `applySession` (XP, DEV,
  relations, `xp.log` entry with `day` and market `ledger` length, journal; `sinceLast` gives the
  days and deals since the previous session). Spending: `XpSpendSheet` → `spendProgram` (max
  `programMax`) / `spendSecondary` (any model), logged in `xp.spent` and the journal.
- **`store.started`** is false while no campaign exists (clean profile, or a save of another
  version): App shows `WelcomeView` and nothing is saved. `store.start(raw, label)` opens the first
  campaign (new, demo, file, backup) with no undo back to the welcome screen, saves at once and
  calls `navigator.storage.persist()`. Later replacements go through `replaceAll(raw, label)`
  (undoable; copies the current campaign to the backups first, except when restoring one).
- **Campaign files** (`campaign.js`): `classifyImport(raw)` → `campaign` (version 3 with
  `campaign` + `chars`, replaces after a confirmation offering to export first), `robot` (`name` +
  `programRatings`, added to the team), `old` (refused with `OLD_SAVE`), `unknown`. Export =
  `store.exportData()` (everything, maps included) as `<slug>.mechatron.json`.
- **Automatic backups:** `mechatron-v3-backup-1…3` (1 = newest) = `{ at, reason, name, robots, data }`.
  One at startup if the save changed since the newest backup, one before each replacement;
  T11 calls `store.backup('Fin de séance')`. `store.restoreBackup(n)` is undoable. Storage errors
  are swallowed (a backup is a bonus).
- **`store.c` can be `null`** (empty team: clean first launch, last robot deleted). `activeId` is
  then `null`; `commit()` does nothing; App shows `EmptyTeam` instead of the fiche views and closes
  the robot sheets (roll, module, damage, weapon, xp). Combat and Collectif work with no robot.
- **Campaign** (`campaign`, normalised by `normalizeCampaign`): `name, createdAt, updatedAt,
  phase ('creation'|'play'), dev {Energie, Production, Défense, Information}, rules {} (GM
  overrides), journal [{at, day?, text}], clock, market, xp {log}, maps [], encounters []`.
  `clock` = `{ day, phase, clearSky, charged, exclude[], report }` (`normalizeClock`, T07);
  `market` = `{ open, sellRate, rarities[], listings[], ledger[] }` (`normalizeMarket`, T09);
  `xp` = `{ log: [session], spent: [spend] }` (`normalizeXp`, T11); `maps`/`encounters` are kept as
  plain JSON until their ticket (T13…T15).
  Journal: `pushJournal(data, text, {day})` inside a commit, or `store.addJournal(text)`.
  Rename with `store.renameCampaign(name)`.
- **DEV levels live once, in `campaign.dev`** — read them with `getDev()` (`settings.js`), never
  from a robot. `devModFor(c, prog)` gives the bonus to any `c.online` robot (PC or NPC).
- **Rule values:** `getRules()` (`settings.js`) = `GAME_DATA.rules` + `xpQuestions` ← `house.js` ←
  `campaign.rules`. The store binds the campaign with `bindCampaign()`; in unit tests nothing is
  bound unless a test does it.
- **Autosave:** 300 ms after the last change, plus a forced `flush()` on `pagehide` and when the
  tab is hidden; a storage error shows « Sauvegarde impossible : exportez la campagne » (once).
- **Undo** snapshots leave out `campaign.maps` and `campaign.encounters` (they keep their own saves).
- `src/lib/demo.js` → `demoParty()`: 4 PCs (Battle, Scrap, Protocol, Cleaning) + 3 book NPCs,
  built by the creation rules; « Essayer la démo » opens it as the campaign « Démo » (`phase: 'play'`).

**Characters.** `blankCharacter(kind)` with `kind: 'pc' | 'npc'`, `body: robot | drone |
creature`, `statMode: 'chassis' | 'direct'` (direct = stats typed in, used by NPC
templates). Damage is stored as damage (`c.damage[attr]`, `c.armorDamage`), never by
lowering the max. Each PC gets a color from `GAME_DATA.pcColors` (`ensureColor`).

**Rules (`rules.js`) — Year Zero Engine as implemented:**
- Pool = base dice (current attribute) + program dice + gear dice. 6 = success.
- Modifiers (collective dev level, range, aim, manual) change **program dice only**;
  below zero they become **negative dice** that cancel successes.
- Push: reroll non-6 dice; base and gear 1s are locked. After a push each base 1 =
  1 EP spent or 1 damage to that attribute; each gear 1 = weapon/gear bonus −1.
  Two pushes with the secondary function Surrégime (`maxPushes`).
- A program whose attribute is broken (current 0) cannot be used.
- `resolveDamage(c, {amount, ranged, coverRating, ignoreArmor, location, reduce})`:
  cover (ranged only) → armor (each 6 blocks; armor wears 1 if any damage gets
  through) → optional reduction (Reactive Armor, anti-EMP) → D6 hit location
  (robot / drone tables), excess rerolls location, a module breaks on its first
  point. Creatures take damage to Strength (servos slot).
- Initiative: D6; SWAT Tactics rolls two keep best; identical NPC group shares one
  roll; surprise +2; ties → current Stability, then hidden random `tie`.
- NPCs pay EP from the GM pool (`payEp` / `availableEp`).

**Combat (3 stages, `views/combat/`).** `data.combat = { phase: 'prep'|'init'|'fight',
active, round, turn, combatants[], log[], gmPool, usePool }`; combatant =
`newCombatant(cid, side)` with `init, tie, acted, defending, overwatch, surprise,
lostAction, prone, fled, lock, initBonus`.
- Prep: PC avatars toggle in/out; enemies from `npcTemplates` (TemplateSheet, mode
  `combat`) or existing NPCs; `EnemyEditSheet` edits them inline.
- Init: roll all / per row / manual entry, order preview.
- Fight: initiative track (`Avatar`), `TurnFlow` = guided steps
  action → setup (target, weapon, modifiers, defense) → roll (`DiceTray` for attacker
  then defender) → damage → result → `endTurn`. Only combat-relevant options appear
  (modules tagged `combat: 'action'|'boost'|'reaction'`, weapons `kind: melee|ranged`).
  Per-combatant actions (manual damage, open sheet, remove, edit) live in
  `CombatantSheet`, opened by tapping an avatar. `CombatGuide` = colored, collapsible
  quick reference from `GAME_DATA.combatGuide`.

**Modules in combat (v2.2).** Each module in `data.js` has an `fx` list (machine-readable
effects: `kind`, `cost` or `perEp`, `range`, flags). `moduleFx(c, kinds)` lists the working
ones. Every activation goes through `rollActivation()` (one Gear Die per EP, any 1 → overheat
table; Power Saver adds a die and a 6 saves 1 EP; Glitch doubles the cost, Power Surge doubles
the effect, Fatal Error/Crossed Wires/Bluescreen = no effect) then `settleActivation()` inside a
commit. Where kinds plug in: `initBoost` (CombatInit), `extraAttack` / `fullAttr` / `sawDmg` /
`grappleHit` / `extraDefense` (TurnFlow attack steps), `react` (damage step), action kinds
(`dmg multi fatigue selfHarm disable control grappleAtk hold blast shift escape info`, TurnFlow
`fx` step), free kinds (`repair repairModule drone`, no action). TurnFlow keeps the chosen fx in
`T.fxObj` because a Fatal Error removes the module from the working list.
**Party support (v2.3).** TurnFlow setup offers *Aide* (+1 per ally who hasn't acted; sets
their `lostAction`) and *Calculer* (Protocol Robot rolls first; success lets the attacker
withdraw after the roll, before pushing — `withdraw()`; extra successes add +1 each). Cleaning
Robots get a pseudo-weapon from `combatWeapons()` (index −2, `prog: '__special'`, damage 3,
Short, `swarmOnly`; `isSwarm()`). Steps in their own components: `LogicConflict.svelte`
(Interact/Manipulate vs Question/Empathy, Hierarchy and logical-basis +1s, Network damage
stunts), `BlowerStep.svelte` (Trash Blower), `RecycleStep.svelte` (Recycle; one-use weapons
`oneUse`, discarded in `finish()` via `T.spentIdx`).
Combatant extras: `held` (immobilized: by, how, mod, with), `extra` (bonus attacks used this
round), `defenses`, `protectRound` (Protect once per round). Weapons: `power`
(`epack|internal|crank`), `empty`, `crankDue`. Sleep mode: PC robot at 0 EP passes its turn.

## Svelte gotchas met so far

- `{@const}` must be the first child of a block (`{#if}`, `{#each}`…).
- Cannot `bind:value` to a function call — use `value=` + `oninput`.
- `@page` is not allowed in component CSS — put print page rules in `app.css`.
- Keep `overflow-anchor: none` (app.css): with scroll anchoring the page jumps whenever a
  panel above or around the viewport changes height.
- Don't remove a `GAME_DATA` key without grepping for it (deleting `pcColors` once
  blanked the whole app at startup).

## Testing

- **Unit tests (Vitest):** `npm test`. Tests live in `src/lib/__tests__/*.test.js` (node
  environment; `.svelte.js` runes compile through the Svelte plugin in `vite.config.js`).
- **Dice:** every random draw goes through `src/lib/rng.js` (`d6`, `random`, `pick`). Never call
  `Math.random()` for game randomness (ids and toast keys are the only exceptions). In tests,
  `rig(6, 1, 3)` (helpers.js) forces the next faces; `setRng(seed)` gives a reproducible
  sequence; `setRng(null)` restores `Math.random`. In the browser (dev and build),
  `window.__mechatron.setRng(5)` makes a whole fight reproducible.
- **Persistence:** every new persisted field gets a round-trip test with
  `roundtrip(data)` (`__tests__/roundtrip.js`): JSON → `normalizeAll` → JSON, compared without
  `id` and `color` (`expect(after).toEqual(before)`). Reload and undo both go through
  `normalizeAll`, so this covers them.
- **Browser:** `npm run build && npm run e2e` (Playwright, `e2e/smoke.spec.js`): loads
  `dist/index.html` at 390 and 1280 px in both themes, no console error, screenshots in
  `e2e/screenshots/`. `@playwright/test` is pinned to the version whose Chromium is preinstalled
  in Claude's cloud workspace (`/opt/pw-browsers`; never run `playwright install` there); on the
  user's PC run `npx playwright install chromium` once.
- For combat changes, also click through Préparation → Initiative → Combat for a few rounds
  (seeded) and read the log from `localStorage['mechatron-v3']`.

## Delivering changes

Follow `docs/PLAN-COMPAGNON.md` §0: one ticket at a time, in order.
1. Start from an up-to-date `main` on a branch `ticket/<id>-<slug>`.
2. Edit in `src/`, `npm run build` after each step; test (Vitest from T02, Playwright screenshots
   at 390 and 1280 px, both themes).
3. Update `README.md` (French, user-facing) when behavior changes; bump `version` in
   `package.json` (minor for a feature, patch for a fix).
4. Commit with `vX.Y.Z: …` messages, push the branch, open a PR whose description is the ticket
   report. **The user merges** — never merge your own PR, never push to `main`.
5. A merge to `main` deploys the site (GitHub Actions). Git history is the archive: no
   `releases/` snapshots, no committed build.

## Status / history

- v1: vanilla JS replica of the paper sheet (deleted in v2.3.8; see git history).
- v2.0: Svelte rewrite, mobile-first, book data filled in, exports (JSON, text,
  share link, PNG card, print), roster of PCs/NPCs with color tabs, negative dice.
- v2.1 (2026-10-10): guided 3-stage combat (prep with avatars, initiative roll or
  manual, step-by-step turns with target lock, both sides' dice, armor and damage),
  split melee/ranged quick reference, broken-attribute actions disabled.
- v2.2 (2026-10-10): modules and secondary functions act in combat (book ch.4-6), with
  overheating on every activation; energy management (energy panel, weapon power sources,
  E-pack drain/reload, recharge items, EP transfer, sleep mode); grapple/hold state; Protect.
- v2.3 (2026-10-10): party support in combat — help (+1, NPC group attacks), Calculate with
  withdraw, Clean vs swarms, Trash Blower, Recycle (weapon/tool), logic conflicts (Interact,
  Manipulate). Fixed the initiative track widening the page with many combatants.
- v2.3.1 (2026-10-10): « Nouveau robot / drone / Nouvelle créature » buttons; duplicate an NPC
  (`DuplicateSheet`, `addCopies()` in the store: fresh ids, numbered names, shared group,
  same side and initiative in combat).
- v2.3.2 (2026-10-10): no more scroll jumps in combat — `overflow-anchor: none` in `app.css`
  (browser scroll anchoring shifted the page at every turn-panel height change); TurnFlow
  scrolls only when no panel button is visible after a step/turn change.
- v2.3.3 (2026-10-10): the initiative track is a turn lane (CombatFight `lane`): current actor
  first, then those still to act, a dashed separator, then those who acted (greyed), then the
  destroyed; `animate:flip`, lane scrolls back to its start on each turn.
- v2.3.4 (2026-10-10): `ActorStats.svelte` (acting robot's attributes, armor, EP, combat
  programs, weapons, modules) above « Manœuvre »; no max width on `main` — views add columns
  at ≥1500 px (État/Matériel: right column splits in two; Programmes/Robot: 3 columns), combat
  side column grows to 28 % at ≥1400 px.
- v2.3.5 (2026-10-10): « Tout remettre à neuf » (`ResetAllButton`, `restoreAll()` in the store)
  in combat prep, fight footer and the robot list: damage, armor, cover, modules, EP, energy
  weapons, worn Gear Bonus (up to the book value), combat temporary states.
- v2.3.6 (2026-10-11): the target's stats (`ActorStats`, grey left border) under every target
  picker — TurnFlow snippet `tstats(c)` in setup, lock-on, single-target fx and drone steps,
  plus LogicConflict.
- v2.3.7 (2026-10-11): the logo is part of the app and of git — shown in the top bar (`TopBar`,
  30 px high on phones, 42 px from 720 px) and on the print sheet (plain import, no more optional
  glob); `.gitignore` tracks only that `logo.png`; the Markdown rulebook folder is ignored.
- v2.3.8 (2026-10-11, plan ticket T00): repo flattened (the app is at the repo root, v1 files and
  `releases/` deleted), GitHub Actions builds and deploys `dist/` (no committed build), docs
  tracked (`CLAUDE.md`, `README.md`, `docs/`), `house.js` + `getRules()` skeleton.
- v2.3.9 (2026-10-11, plan ticket T01): the app is named « Compagnon Mechatron » (page title,
  meta description, nav label, PNG card footer, package name `mechatron-companion`); a robot's
  page stays a « fiche ». The bottom nav has `id="app-nav"` (TurnFlow finds it by id).
- v2.3.10 (2026-10-11, plan ticket T02): tests — Vitest (`npm test`, 34 tests: chassis, dice,
  push, damage, overheating, initiative order, end of turn, normalize, round-trip), seedable dice
  (`rng.js`, `window.__mechatron.setRng`), round-trip helper, Playwright smoke test (`npm run e2e`).
- v3.0.0 (2026-10-11, plan ticket T03): data model v3 — `campaign` (DEV levels stored once,
  journal, GM rule overrides, placeholders for clock/market/xp/maps/encounters), key `mechatron-v3`
  (older keys deleted, other versions refused), no pre-filled robot (empty team + `EmptyTeam`; the
  demo party moved to `demo.js`), `store.c` nullable, `getRules()`/`getDev()` wired everywhere,
  typed fields through `store.type`, autosave debounced and flushed on `pagehide`, undo capped at 40.
- v3.0.1 (2026-10-11): logo cropped to « MUTANT / YEAR ZERO » (the « Road to Eden » line removed),
  leftover spray under it cleared; 624×236, 26 px high on phones (22 px ≤ 340 px), 42 px from 720 px.
- v3.1.0 (2026-10-11, plan ticket T04): welcome screen when no campaign exists (new campaign,
  import, demo, automatic backups); top bar menu (☰, replaces the theme button): rename, export
  `<nom>.mechatron.json`, import (campaign replaces after a confirmation, robot is added), new
  campaign, restore one of the 3 automatic backups, theme; « Télécharger la table » became
  « Exporter la campagne »; `navigator.storage.persist()` on the first campaign.
- v3.2.0 (2026-10-11, plan ticket T05): navigation by spaces (Équipe · Énergie · Marché · Combat ·
  Séance · MJ) with the fiche's segmented control (État · Programmes · Matériel · Identité);
  « Mode MJ » switch in the menu (UI prefs): MJ space with the NPC roster and NPC fiches, placeholders
  for the GM tools; Séance = XP questions per robot (`XpSheet` takes `cid`), DEV wear (logged to the
  journal) and the campaign journal; Énergie = DEV levels + connection of each robot; PC notes moved
  to Identité; the roster sheet is PCs only (`RobotList` shared with the MJ space); « remettre à
  neuf » is scoped there (team / NPCs).
- v3.3.0 (2026-10-11, plan ticket T06): team creation wizard (9 steps in the book's order, numbered
  rail, live chassis totals, blocked invalid spends, parts and modules unique among PCs except Scrap
  parts, model gear with choices, EP = ration, summary) for every new PC and « Reprendre
  l'assistant » (creation phase or GM mode); « L'équipe est prête » gate in the MJ space (lists
  unfinished robots) opens the market; `models[].gear` and `scrap: true` parts in data.js.
- v3.4.0 (2026-10-11, plan ticket T07): day/night clock and energy engine (`lib/clock.js`, logic and
  tests only): daily drain, night charge up to the ration, solar cells and Panneaux solaires, Scrap
  Robots without a base station, transfers, E-packs; `c.daily`; GM overrides `rules.energy`.
- v3.5.0 (2026-10-11, plan ticket T08): Énergie space = the clock (one button per phase: Terminer la
  journée → Recharger pour la nuit → Nouveau jour, clear-sky toggle, disabled during creation), team
  table (EP bar, OK / bas / en veille, connected, « exclu cette nuit » / « pas de borne »), last report,
  ration with its band, transfers and E-packs, DEV levels, GM energy rules with book value and reset;
  the fiche lost « Nouveau jour (−1) ».
- v3.6.0 (2026-10-11, plan ticket T09): black market catalog (every item of data.js, book prices
  p.234, house rarities and sell-back rate, `null` price = not for sale), GM editor in the MJ space
  (search, filters, inline price/rarity/stock/on sale/hidden, custom items, reset, JSON export and
  import, market house rules), open/closed switch, read-only catalog in the Marché space.
- v3.7.0 (2026-10-11, plan ticket T10): black market shop: daily draw by rarity (reproducible with
  `setRng`), GM redraw / whole catalog / force in or out, buyer picker with EP, buy with clear blocking
  reasons (EP, slots, duplicate module), weapon comparison, sell back at the house rate, ledger and
  journal, every purchase and sale undoable.
- v3.8.0 (2026-10-11, plan ticket T11): GM-editable XP rules (questions, XP per question, bonus
  awards, costs, book values), end-of-session wizard for the whole team (backup, XP grid, DEV decay
  with override, relations, summary with days and market deals, export), XP spending (program +1 up
  to 5, secondary function of any model), session history; the per-robot XpSheet and the separate
  DEV wear button are gone.
- v3.2.1 (2026-10-11): from Combat, « Ouvrir la fiche » opens an NPC's full fiche in place, in both
  GM modes, with « Retour au combat » (`ui.peek`): combat is now strictly the same in both modes.

## Ideas not done yet

- Hover drone moves/Scan/Infiltrate, Holoflage/Sensor Pulse (no combat flow yet), Energy Bank
  as a weapon power source, EMP weapons (none in the data), Self-Destruct.
- Rules: see "Rules reference" above. Page refs in `data.js` comments are PDF page numbers; the
  book's own cross-references ("see page 86") point one page earlier.
