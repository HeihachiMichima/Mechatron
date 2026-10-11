# Mechatron: from character sheet to game companion

**Implementation plan for coding agents · version 2** (revised after a hostile review and the owner's decisions of 2026-10-11)
Repo: `HeihachiMichima/Mechatron` (local: `G:\MYZ\mechatron-sheet`) · Baseline: v2.3.6 (commit `57ed691`) + uncommitted v2.3.7 (logo in app and git)
**Source of truth:** `docs/PLAN-COMPAGNON.md` in the repo. The copy in the claude.ai project is only a mirror.

---

## 0. Ground rules

### 0.1 Commit policy (owner's rule)

- **Until the owner says "plan agreed", nobody commits or pushes.** Planning work and file edits stay uncommitted.
- **Once the plan is agreed, commits and pushes are allowed**, with this flow:
  1. One ticket at a time, in the order of §4. No parallel tracks: they would collide in the store, `App.svelte` and the navigation.
  2. Each ticket starts from an up-to-date `main` on a branch `ticket/<id>-<slug>` (for example `ticket/T05-navigation`).
  3. Make small commits with messages like `v3.1.0: T05 navigation by spaces`, plus the attribution lines the session requires.
  4. When the ticket is done, push the branch and open a PR (`gh pr create`) whose description is the ticket's report (§0.3, step 7). **The owner merges.** The agent never merges its own PR and never pushes to `main`.
  5. The version bump (`package.json`) goes in the ticket's PR: minor for a feature, patch for a fix. There is no collision because merges are sequential.
- The `main` branch deploys automatically to GitHub Pages (T00). A merged PR is the release; there are no more `releases/` snapshots, because the git history is the archive.

### 0.2 Soft rule: simple to use, simple to maintain

- At equal value, choose the option with less code, fewer screens and fewer settings.
- **Don't force a request that fits the tech badly.** If a request clashes with the tech choices (static site, single file, no server), propose a simpler alternative, or ask, rather than building something fragile.
- **When unsure, ask the owner** (one short question) rather than guessing.

### 0.3 Standard agent workflow (every ticket)

1. **Read** this plan's §1 (current state) and §2 (conventions), then the ticket's *Read first* files. For tickets marked "Plan agent first", start a `Plan` agent that returns a file-by-file change list before any code.
2. **Branch** as described in §0.1, once the plan is agreed.
3. **Implement** in small steps, running `npm run build` after each one.
4. **Test.** Pure logic gets Vitest tests, and any new persisted field gets a save → reload → undo round-trip test (§2.4). UI changes get Playwright screenshots at 390 px and 1280 px, in both dark and light themes.
5. **Self-review** the diff against the acceptance criteria.
6. **Independent review** for tickets marked ★: a separate agent (general-purpose) that has **not** seen the implementation receives the ticket text and the diff. It checks each criterion and looks for regressions.
7. **Report** (it becomes the PR description): files changed, how each criterion was verified, open questions, version bump.

### 0.4 Skills and tools for agents

| Need | Use |
|---|---|
| UI layout and visual quality | `frontend-design` skill (T05, T06, T08, T09, T10, T11, T13, T15) |
| Small charts (optional) | `dataviz` skill |
| Browser checks | Playwright. In Claude's cloud workspace, Chromium is preinstalled at `/opt/pw-browsers` (never run `playwright install` there). On the owner's PC, use `npx playwright install chromium` once. |
| Code inventory | `Explore` agent ("very thorough") |
| Architecture before code | `Plan` agent |
| Implementation | `general-purpose` agent |
| Rules | **The rulebook in Markdown: `Mechatron-livre-md/`** at the repo root (owner's copy, git-ignored, see §1). Read `INDEX.md` first, then only the slice you need (`p0071-0075.md`…); cite pages with the `<!-- page N -->` markers (PDF page numbers; printed page ≈ PDF page − 1). The text is OCR: check tables (numbers can be garbled) and, if in doubt, ask the owner to check the PDF. **Never invent book numbers.** Values the book doesn't give go in the house-rules file (§2.6). |

---

## 1. Current state (verified against the code; as of v3.8.0, after T11)

- **Stack:** Svelte 5 (runes), Vite 8, `vite-plugin-singlefile` → a single `dist/index.html` (about 624 kB) with scripts, CSS, fonts and logo inlined. French UI, mobile-first, side rail at ≥ 960 px.
- **Layout and deploy (T00, v2.3.8):** the app lives at the repo root (`index.html` = Vite entry, `src/`, `package.json`). `.github/workflows/deploy.yml` builds and deploys `dist/` to GitHub Pages on each push to `main`; `dist/` is git-ignored. Paths below are relative to the root (`src/...`); before T00 they were under `svelte/`.
- **Logo (v2.3.7):** `src/assets/logo.png` (tracked) is shown in `TopBar.svelte` and `PrintSheet.svelte`. Taken from the *Road to Eden* video game logo, cropped in v3.0.1 to « MUTANT / YEAR ZERO » (the « Road to Eden » line removed); the owner chose to keep it.
- **Docs (tracked since T00):** `CLAUDE.md` (agent guide), `README.md` (French, user-facing), `docs/PLAN-COMPAGNON.md`. The v1 files, `releases/` and the committed build are gone.
- **State (T03, v3.0.0)** (`lib/store.svelte.js`): `data = { version: 3, campaign, chars[], activeId, combat }` in `localStorage['mechatron-v3']`; UI prefs in `mechatron-ui-v3`. Older keys are deleted at startup.
  - `campaign = { name, createdAt, updatedAt, phase, dev, rules, journal, clock, market, xp, maps, encounters }`, normalised by `normalizeCampaign()`; `normalizeAll()` keeps it (round-trip tested).
  - **DEV levels are stored once** in `campaign.dev`, read through `getDev()` (`settings.js`); `devModFor` gives the bonus to every `c.online` robot. Rule values come from `getRules()` (book + `xpQuestions` ← house ← `campaign.rules`).
  - `store.c` can be `null` (empty team); `EmptyTeam` replaces the fiche views. No pre-filled robot: the demo party is `demoParty()` in `lib/demo.js` (wired in T04).
  - Journal: `campaign.journal`, `pushJournal()` / `store.addJournal()` (no UI before T05). Text fields go through `store.type()` (one undo step per field edit).
  - Autosave 300 ms + flush on `pagehide`/hidden tab, error toast; undo 40 steps without maps/encounters.
- **First launch (T04, v3.1.0):** `WelcomeView` while no campaign exists (`store.started` false: clean profile or a save of another version; nothing is saved meanwhile): *Nouvelle campagne* (name → empty team, `phase: 'creation'`), *Importer une campagne*, *Essayer la démo* (`demoParty()`, campaign « Démo », `phase: 'play'`), plus the automatic backups when there are any. `store.start()` opens it (no undo back to the welcome screen) and calls `navigator.storage.persist()`.
- **Campaign menu (T04):** the ☰ button in the top bar (it replaced the theme button) opens `CampaignSheet`: rename, *Exporter la campagne* (`<nom>.mechatron.json`, `store.exportData()`), *Importer* (`classifyImport`: a v3 campaign replaces after a confirmation offering to export first; a robot is added), *Nouvelle campagne*, *Restaurer une sauvegarde automatique*, the « Mode MJ » switch (T05), theme.
- **Automatic backups (T04):** `mechatron-v3-backup-1…3` (`src/lib/campaign.js`): one at startup if the save changed, one before each replacement (import, new campaign); `store.backup(reason)` for T11; `store.restoreBackup(n)` is undoable.
- **Spaces (T05, v3.2.0):** bottom nav / side rail `Équipe · Énergie · Marché · Combat · Séance · (MJ)`; `ui.space`, `ui.tab`, `ui.gm` are UI prefs (`cleanUi`, per device). `store.space`, `store.fiche`, `store.go(space, tab)`, `store.openFiche(id, tab)`, `store.setGm(on)`.
  - Équipe: PC tabs (+ new, *Gérer* = `RosterSheet`, PCs only), vitals plate, `FicheTabs` (État · Programmes · Matériel · Identité = `RobotView`). NPCs never show there.
  - Énergie: `EnergyView` (DEV levels + each robot's connection; NPCs listed in GM mode). T08 adds the clock.
  - Marché: `MarketView` placeholder (« Le marché noir ouvre une fois l'équipe créée » during creation).
  - Séance: `SessionView`: « Terminer la séance » (T11 wizard), each PC's XP with « Dépenser », history of sessions, campaign journal (list newest first + add).
  - MJ (GM mode): `GmView` = NPC roster (`RobotList`, *Nouveau PNJ*, *Tout remettre à neuf*) + placeholders (market, house rules, encounters); an NPC's fiche opens there with « Tous les PNJ » to go back.
  - GM mode hides tools, not information: combat is identical in both modes. From Combat, « Ouvrir la fiche » opens an NPC's fiche in place (`ui.peek`, v3.2.1) with « Retour au combat ». Outside GM mode the PJ/PNJ switch (Identité) is hidden.
  - The robot's own notes (`c.notes`) moved from Collectif to Identité; the « Fin de séance » button left État (Séance has it).
- **Creation (T06, v3.3.0):** every new PC goes through `views/creation/CreationWizard.svelte` (rules in `lib/creation.js`, draft in `store.ui.wizard`, not saved): Modèle → Nom → Châssis → Programmes → Fonction secondaire → Modules → Équipement → Relations → Récapitulatif. Players move forward through valid steps only; GM mode opens any step and may take a part or module another PC has. « Reprendre l'assistant » (Identité) edits a PC during creation or in GM mode (gear, EP, damage untouched). Gate: the MJ space shows « Création de l'équipe » (unfinished robots listed) with *L'équipe est prête* → `campaign.phase = 'play'` (`store.setPhase`, journal entry, undoable; *Rouvrir la création* reverses it). The market placeholder reads the phase. The clock start (Day 1) waits for T07.
- **Clock engine (T07, v3.4.0):** `src/lib/clock.js` (pure, tested): `campaign.clock = { day, phase, clearSky, charged, exclude, report }`; `endDay` → `nightCharge` → `startDay`, in that order only; `energyRules(campaign)` (book ← `campaign.rules.energy`); `transfer` (cable, Banque d'énergie with `charge`), `drainPack` (E-pack / Batterie); `c.daily = { barter }`. The ration (fiche, wizard, GM pool) comes from `energyRules`.
- **Énergie space (T08, v3.5.0):** `EnergyView` = clock header (day, phase, clear sky, one main button per step, disabled while `phase === 'creation'`), team table (`clockRobots`, NPCs in GM mode), last report, ration, `energy/EnergyTransfer`, DEV levels, `energy/EnergyRules` (GM mode, `campaign.rules.energy`). Each step = one `commitAll` (undo reverts it). The fiche keeps ±1 and « Recharger jusqu'à », not « Nouveau jour ».
- **Black market (T09, v3.6.0):** `src/lib/market.js`, `campaign.market = { open, sellRate, rarities, listings, ledger }` (normalised, round-trip tested). Catalog = every module, weapon (not bare hands), chassis part and equipment item; book prices `GAME_DATA.goodsPrices` (p.234); house defaults `HOUSE.market` (sell-back ½ min 1, rarities commun 1 / peu commun ½ / rare ⅙ / unique GM-only, rarity by kind). GM editor `views/gm/MarketEditor.svelte` (MJ space). The gate opens the market; the demo starts open.
- **Shop (T10, v3.7.0):** `MarketView` = today's offer (`market.draw`, drawn once per in-game day by `store.ensureDraw`; GM: *Nouveau tirage*, whole catalog, `listing.force` in/out), buyer picker, `buy` / `sell` in `market.js` (EP, slots, duplicates, half price, EP max, stock), `market.ledger` + journal; one commit per purchase or sale.
- **Energy on the fiche:** StateView keeps ±1, "Recharger jusqu'à {ration}" and "Soleil (+1)" when `c.online` is false (outside).
- **XP (T11, v3.8.0):** `src/lib/xp.js`. Rules = `campaign.rules.xp` or the book's (6 questions × 1 XP, 5 XP per upgrade), GM editor `views/gm/XpRulesEditor.svelte`. « Terminer la séance » = `views/session/SessionWizard.svelte` (backup, XP grid with « participé » pre-ticked and GM adjustment, DEV decay 1D6 with override, relations, summary with days and market deals) → one undoable `applySession`, `campaign.xp.log`, journal, then « Exporter la campagne ». Spending = `XpSpendSheet` (program +1 up to `programMax`, secondary function of any model) → `campaign.xp.spent` + journal.
- **Combat:** preparation → initiative → guided turn (`TurnFlow.svelte`, about 1,060 lines).
  - Range is chosen by hand (`shootRanges`).
  - Cover is **a state of the robot** (`c.cover`): set by the "se mettre à couvert" maneuver (chips), and worn down by hits (`t.cover = res.newCover`).
  - Overwatch exists as a manual state. The quick guide (data.js about line 511) describes it as covering "votre arc de 90°".
  - Moving is described as "Bras ↔ Proche ↔ Courte: 1 maneuver per range band; beyond Courte, 2 maneuvers in a row per band" (data.js about line 520). **No maneuver counter exists.**
- **Exports:** robot JSON, share link `#robot=…` (it imports a **copy**), text, PNG card, print, and « Toute la campagne » → *Exporter la campagne* (T04; the old « Télécharger la table » is gone).
- **Tests (T02, v2.3.10):** Vitest `npm test` (`src/lib/__tests__/`, helpers `rig()` and `roundtrip()`), dice through `src/lib/rng.js` (`setRng`, `window.__mechatron.setRng`), Playwright `npm run e2e` (`e2e/smoke.spec.js`, needs a build).
- **Rulebook:** `Mechatron-livre-md/` at the repo root: the owner's Markdown conversion of the Mechatron rulebook (237 pages, OCR via pymupdf4llm + ocrmypdf, `meta.json`). `INDEX.md` maps chapters to pages; one file per 5 pages (`p0001-0005.md` … `p0236-0237.md`); `<!-- page N -->` markers give PDF page numbers. **Git-ignored** (copyrighted content, not to publish): it exists only on the owner's PC. An agent working from a GitHub clone (cloud) doesn't have it and must ask the owner for the relevant slice.
- **Key book pages for the tickets** (PDF pages): XP p.26 · chassis parts and "two players may not choose the same part" p.18 · energy points and charging p.72 · range, movement and fleeing p.82 · cover p.91 · DEV levels p.107-108 · base stations and energy as currency p.112 · black market p.116-117 · **goods and services price list p.234**.

---

## 2. Conventions (all tickets)

1. **Vocabulary:** the app is a **"compagnon de jeu"** ("Compagnon Mechatron"); a single robot's page stays a **"fiche"**.
2. **Language:** French UI (short, book terms: PE, PX, MJ, PJ, PNJ, « », plural agreement); code and comments in English.
3. **Single file and offline:** the build stays one `index.html` that opens by double-click. No backend, no runtime CDN, and no new runtime dependency without the owner's OK.
4. **Persistence:**
   - **Every new persisted field must be added to the `normalize*` functions** (or it vanishes on undo or reload).
   - Every ticket that adds one includes a test: save → reload → undo → the field is still there.
   - Edits go through `commit*`; replace the `bind:value={store.c.*}` you touch with `value` + `oninput` → `commit`.
5. **No compatibility with the past:** there is no user base. No migration of old saves, no legacy keys, no support for old share links or files. A schema change just bumps `version`; a save in an unknown version shows "Sauvegarde d'une ancienne version, impossible à ouvrir" and the welcome screen.
6. **House rules:**
   - `src/lib/data.js` = **book only** (CLAUDE.md rule: never invent a number).
   - Values the book doesn't give (equipment prices, square size, availability odds, etc.) go in **`src/lib/house.js`**. Each entry carries `source: 'house'`, appears in the app with a « règle maison » badge, and is GM-editable.
   - A single accessor `getRules()` merges book + house + the campaign's GM overrides.
7. **Seedable dice:** all randomness goes through `src/lib/rng.js` (`d6()`, `setRng(seed)`), exposed in dev as `window.__mechatron.setRng(seed)` for tests.
8. **Accessibility:** 44 px touch targets, `aria-*` on custom controls, keyboard support on desktop, both themes.
9. **Version:** 3.0.0 when T03 lands (new schema), then minor per ticket.

---

## 3. Target experience

**First launch:** a welcome screen with *Nouvelle campagne* · *Importer une campagne* · *Essayer la démo*. No pre-filled robot.

**One campaign at a time** (simple to maintain): to switch, export the current one (one tap), then create or import another.

**Usage: one device for the table** (a shared tablet or the GM's laptop).
- A **"Mode MJ"** switch reveals the GM's *authoring tools*: NPCs, market editor, rules, encounters.
- **No logins and no sync between devices.** A player who wants their robot on their phone opens the existing share link, which gives them a **copy** that isn't synchronised.

**Navigation in the order of play:**

```
Équipe   create the team (wizard) → robot fiches (État · Programmes · Matériel · Identité)
Énergie  Mechatron-7 day/night clock, charging, collective levels
Marché   black market (opens after creation; prices, rarity and stock set by the GM)
Combat   encounters → tactical map (optional) → preparation / initiative / turn
Séance   end of session: XP (GM rules), level decay, campaign journal, export
(MJ)     GM-mode only: NPCs, market editor, rules editor, encounter library
```

---

## 4. Tickets, in order

| # | Ticket | Size | Depends on |
|---|---|---|---|
| T00 ★ | Repo restructure, build and deploy on GitHub, docs tracked | M | plan agreed |
| T01 | Rebrand "fiche" → "compagnon de jeu" | S | T00 |
| T02 | Tests, seedable dice, round-trip helper | S | T00 |
| T03 ★ | Data model v3.0: campaign, journal, shared DEV levels, clean first launch | M | T02 |
| T04 | Welcome screen, demo, campaign export/import, automatic backups | M | T03 |
| T05 ★ | Navigation by spaces + "Mode MJ" switch | M | T04 |
| T06 | Team creation wizard + "équipe prête" gate | L | T05 |
| T07 ★ | Day/night clock and energy engine (logic) | M | T03 |
| T08 | Énergie space (UI) | M | T05, T07 |
| T09 | Black market: catalog, prices, rarity, GM editor | M | T06 |
| T10 | Black market: availability, buy, sell | M | T09, T07 |
| T11 | GM-editable XP rules + end-of-session wizard | M | T05 (summary sections from T07/T10 if present) |
| T12 ★ | Square-grid geometry (logic) | M | T02 |
| T13 | Map, tokens, minimal paint tool | L | T12, T05 |
| T14 ★ | Map ↔ combat: suggested range, cover and line of sight | L | T13 |
| T15 | Encounter library + 4 quick setups | M | T14 |
| T16 | Finish: accessibility, home-screen install, docs, 3.x | M | all |

T07 and T12 are pure logic and could be done earlier, but **they still go in sequence** (§0.1).

---

## 5. Tickets

### T00 ★: Repo restructure, build and deploy on GitHub, docs tracked

**Goal:** a single, simple layout: **the app at the repo root** (`index.html` at the root of git), built and deployed by GitHub Actions, with no generated files committed and the docs tracked.

**Agent setup:** `general-purpose`. Start with the owner's machine (`G:\MYZ\mechatron-sheet`): this ticket deletes local files. **List what will be deleted and wait for the owner's OK before deleting.**

**Tasks**
1. **Delete the old stuff** (owner's decision: no history to keep):
   - the local v1 files at the root: `app.js`, `data.js`, `style.css`, `v1/`, `assets/`, the root v1 `README.md`;
   - `svelte/releases/` and `svelte/public/`;
   - the root redirect `index.html`;
   - the `.gitignore` lines related to v1.
2. **Flatten the repo:** `git mv svelte/* .` (that is, `src/`, `index.html`, `package.json`, `package-lock.json`, `vite.config.js`, `svelte.config.js`, `README.md`, and `.gitignore` merged into the root one). The font paths in `src/app.css` (`../node_modules/...`) stay valid because the relative depth is the same. Check with a build.
3. **Stop tracking the build:** add `dist/` to `.gitignore`; `git rm -r --cached svelte/dist`.
4. **Deploy workflow:** replace `static.yml` with `deploy.yml`: checkout → `actions/setup-node` (Node 22, npm cache) → `npm ci` → `npm run build` → `actions/upload-pages-artifact` with `path: dist` → `actions/deploy-pages`. It triggers on push to `main` and manual runs. The site URL doesn't change.
5. **Docs:** remove `*.md` from `.gitignore` (keep `*.txt` if useful).
   - Track `CLAUDE.md`, `README.md` and `docs/`.
   - **Before tracking `CLAUDE.md`**, take out machine-specific details (Windows paths to the PDFs, "purchased PDFs", the OCR workflow) and keep only: "rules reference = `Mechatron-livre-md/` (git-ignored, owner's PC only; read `INDEX.md` first)".
   - Keep `/Mechatron-livre-md/` in `.gitignore` (already added on 2026-10-11) and check with `git check-ignore` that no book file is tracked.
   - Update `CLAUDE.md`:
     - the new layout;
     - the build is about 624 kB;
     - `CombatAddSheet` no longer exists;
     - the commit flow from §0.1;
     - the house rules (§2.6);
     - no compatibility with the past (§2.5);
     - remove the `releases/` step.
6. **`src/lib/house.js`:** empty skeleton `export const HOUSE = {}` + `getRules()` in `src/lib/settings.js` (book + house + campaign overrides). Wiring comes in T03.
7. Fold the uncommitted v2.3.7 work (logo) into the first commit of this ticket.

**Acceptance criteria**
- After merging to `main`, the Action passes and the site (same URL) shows the app with its logo.
- `git ls-files` contains no `dist/`, no v1 files and no `releases/`, but does contain `index.html` (Vite entry) at the root, `CLAUDE.md`, `README.md`, `docs/`, and `src/assets/logo.png`.
- `npm run build` works from the root, and `dist/index.html` opens by double-click.

**Out of scope:** any feature change.

---

### T01: Rebrand "fiche" → "compagnon de jeu"

**Goal:** wherever the *app* is named, it becomes "Compagnon Mechatron"; a robot's page stays a "fiche".

**Agent setup:** an `Explore` agent for the inventory (`grep -rni "fiche\|sheet"`), then `general-purpose`.

**Inventory to confirm**

| Where | Today | Change to |
|---|---|---|
| `index.html` `<title>` | Fiche robot Mechatron | Compagnon Mechatron |
| `index.html` meta description | Fiche de personnage interactive… | Compagnon de jeu pour Mutant : Année Zéro — Mechatron : équipe, énergie, marché noir, combat |
| `Nav.svelte` `aria-label` | Sections de la fiche | Sections du compagnon. **And** in `TurnFlow.svelte` (about line 68), which looks the nav up by this label: replace it with `id="app-nav"` and `getElementById`. |
| `exports.js` (PNG card footer) | Fiche de fan, non officielle. | Compagnon de fan, non officiel. |
| `data.js` header comment | the character sheet's dropdowns | the companion's pickers |
| `package.json` and `package-lock.json` (2 occurrences) `name` | mechatron-sheet | mechatron-companion |
| `PcTabs.svelte` (comment) | whose sheet it is | whose fiche it is |

**Keep:** "Ouvrir la fiche", "Fiche imprimable", "Type de fiche", "Fiche passée en PNJ/PJ", "Fiche de {nom}", and the `data.js` comments that refer to the **official paper sheet** (about lines 331 and 374). Keep the `Sheet.svelte` / `*Sheet.svelte` components (they are dialogs). Don't rename the repo or the folder.

**Acceptance criteria:** no user-visible text calls the app a "fiche"; combat still scrolls correctly; `grep "Sections de la fiche"` returns nothing.

---

### T02: Tests, seedable dice, round-trip helper

**Goal:** agents can test logic and persistence.

**Agent setup:** `general-purpose`.

**Tasks**
1. Vitest: `"test": "vitest run"`; `src/lib/__tests__/`.
2. `src/lib/rng.js`: route the existing `d6` helpers (`rules.js`, `energy.js`, `combat.js`, `store.svelte.js` for `tie`) through it, with no change in behavior. Add `window.__mechatron = { setRng }` in dev and in the build (harmless).
3. First tests: `chassis`, `tally`, `push`, `resolveDamage`, `rollActivation`, `order`, `endTurn`, and `normalize` / `normalizeAll`.
4. `src/lib/__tests__/roundtrip.js` helper: `roundtrip(data)` = JSON → `normalizeAll` → JSON, compared ignoring `id` and `color`. Every later ticket uses it.
5. Playwright: `e2e/smoke.spec.js` (loads `dist/index.html`, no console errors, screenshots at 390 and 1280 px). `"e2e": "playwright test"`.

**Acceptance criteria:** `npm test` passes with ≥ 15 tests; `npm run e2e` produces the screenshots.

---

### T03 ★: Data model v3.0: campaign, journal, shared DEV levels, clean first launch

**Goal:** a single, clean campaign model that gives later features a home, with no pre-filled robot and no legacy data.

**Agent setup:** `Plan` agent first → `general-purpose`. The ★ reviewer checks every `store.c` and `c.dev` reader.

**Schema** (key `mechatron-v3`; old keys are deleted on startup, since there's no user base):

```js
{
  version: 3,
  campaign: {
    name, createdAt, updatedAt,
    phase: 'creation' | 'play',                 // T06 gate
    dev: { Energie: 50, Production: 50, 'Défense': 50, Information: 50 },  // one shared copy
    rules: {},                                  // GM overrides (merged by getRules)
    journal: [ { at, day?, text } ],            // campaign journal (T05, T08, T11)
    clock: null, market: null, xp: { log: [] }, // T07, T09, T11
    maps: [], encounters: []                    // T13, T15
  },
  chars: [...], activeId: null | id, combat: {...}
}
// UI prefs (per device, never exported): 'mechatron-ui-v3' = { space, sub, theme, gm: false }
```

**Tasks**
1. **No `prefill()` at startup.** Move it to `src/lib/demo.js` as a 4-robot demo party (Battle, Scrap, Protocol and Cleaning robots, plus 3 NPCs). The demo uses it (T04).
2. **`store.c` can be `null`.** Audit every reader (`TopBar`, `VitalsPlate`, `PcTabs`, the views, the sheets, `PrintSheet`) for an empty state or "Créez votre premier robot". `removeChar` no longer recreates a robot.
3. **DEV levels in a single place:**
   - `campaign.dev` replaces `c.dev`;
   - `devModFor(c, prog)` reads `getDev()` (the store accessor) instead of `c.dev`;
   - update the readers PrintSheet, StateView, CombatPrep and CombatFight;
   - remove the copying in TemplateSheet and `addChar`;
   - remove `dev` from `blankCharacter` and `normalize`.
   - **The rule doesn't change:** any robot with `c.online` (PC or NPC) gets the shared bonus, as today.
4. **Journal:** `campaign.journal` plus a "Ajouter au journal" helper that writes inside a `commitAll`. The robot's own notes (`c.notes`) stay as they are, but go through `commit`.
5. **`normalizeAll`** keeps and normalises `campaign` (every field above), with the round-trip test.
6. **`getRules()`** (T00) is wired up: `D.rules.*` and `D.xpQuestions` are read through it everywhere.
7. **Autosave:** 300 ms debounce **plus a forced save on `pagehide` and `visibilitychange`**. Catch storage errors (quota, private browsing): show a toast "Sauvegarde impossible : exportez la campagne".
8. **Undo:** limit it to 40 snapshots. `campaign.maps` and `campaign.encounters` are **left out of the snapshots** (they have their own save in T13).

**Acceptance criteria**
- Clean profile → zero robots, no error, an empty state everywhere.
- Changing a DEV level once changes the dice bonuses of every connected robot, and the round-trip test keeps `campaign.dev`.
- Deleting the last robot leaves an empty team.
- `grep -rn "c.dev\|\.dev\[" src` only finds the accessor.

---

### T04: Welcome screen, demo, campaign export/import, automatic backups

**Goal:** a clear start and simple save handling.

**Agent setup:** `general-purpose`, `frontend-design`.

**Tasks**
1. **Welcome screen** (`views/WelcomeView.svelte`), shown **only when no campaign exists**:
   - *Nouvelle campagne*: name field → empty campaign, `phase: 'creation'`, opens Équipe;
   - *Importer une campagne*: a `.json` file;
   - *Essayer la démo*: the T03 demo, with `phase: 'play'`.
2. **Campaign menu** (top bar):
   - rename;
   - *Exporter la campagne* (`<nom>.mechatron.json`, the full content);
   - *Importer* (confirm "remplace la campagne actuelle — exporter d'abord ?");
   - *Nouvelle campagne* (same confirmation);
   - *Restaurer une sauvegarde automatique*.
3. **Automatic backups:** keep the 3 latest snapshots (`mechatron-v3-backup-<n>`): one at startup if the data changed since the last snapshot, one before each end of session (T11). They come with a date and the number of robots.
4. **Import:** accept only `version: 3`. Recognise a campaign file by its shape (`campaign` + `chars`) and a robot file (an object with `name` and `programRatings`): the robot gets **added** to the current campaign. The share link `#robot=` keeps working (adds a copy).
5. Replace "Télécharger la table" (ExportSheet) with the campaign export.
6. Call `navigator.storage.persist()` once, after the first campaign is created (in a try/catch).

**Acceptance criteria:** export → import in a clean profile gives the same state (round-trip); a failed import changes nothing; restoring a backup works and is undoable.

---

### T05 ★: Navigation by spaces + "Mode MJ" switch

**Goal:** the app follows the order of play, and the GM's tools only appear in GM mode.

**Agent setup:** `general-purpose`, `frontend-design`. The ★ reviewer checks the screenshots and that every v2.3.6 feature is reachable.

**Read first:** `App.svelte`, `Nav.svelte`, `PcTabs.svelte`, `TopBar.svelte`, `VitalsPlate.svelte`, `views/*`, `Icon.svelte`.

**Tasks**
1. **Spaces** (`ui.space`): `equipe`, `energie`, `marche`, `combat`, `seance`, and `mj` (only when `ui.gm` is on).
2. **Équipe:** PC tabs + vitals plate (as now) + a segmented control `État · Programmes · Matériel · Identité` (Identité = today's Robot view) + "Gérer l'équipe" (the PC part of the roster).
3. **Énergie:** today's Collectif (DEV levels), with no notes. T08 adds the clock.
4. **Marché:** "Le marché noir ouvre une fois l'équipe créée" (T09 fills it).
5. **Combat:** unchanged.
6. **Séance:** the XP entry point (today's XpSheet), the DEV decay button (moved from Collectif), and the **campaign journal** (list + add).
7. **MJ** (GM mode): the NPC roster (moved out of the "PNJ" button in `PcTabs` and the roster sheet), plus placeholders for the market, rules and encounters.
8. **"Mode MJ" switch** in the top bar menu, stored in the **UI prefs** (per device, never in the campaign).
   - **It hides tools, not information:** combat stays the same in both modes (the GM plays the NPCs' turns on the same device).
   - Outside GM mode, NPCs aren't reachable from Équipe.
   - No PIN.
9. Icons for `energie`, `marche`, `seance` and `mj`. The bottom nav has at most 6 labelled items; the side rail at ≥ 960 px.

**Acceptance criteria**
- A checklist of every v2.3.6 feature (built from the old tabs and sheets), each reachable in ≤ 2 taps.
- No horizontal scrolling at 390 px.
- Turning GM mode off hides the MJ space and the editors without changing combat.

---

### T06: Team creation wizard + "équipe prête" gate

**Goal:** players build their robots step by step, in the book's order. The GM then opens the game (and the market).

**Agent setup:** `general-purpose`, `frontend-design`. Rules: `data.js` (`creationProgramPoints: 10`, `creationProgramMax: 3`, models, `startingGear`) and the book (`Mechatron-livre-md/`, creation p.16-29, models p.30-46).

**Steps** (`views/creation/CreationWizard.svelte`, one screen each, with Back/Next and a progress bar):
1. **Modèle:** 8 cards (hierarchy, specialist program, the 3 secondary functions).
2. **Nom:** nickname + serial (with a "Générer" button), player, color.
3. **Châssis:** head, torso and undercarriage, with a live total of attributes, armor and slots. A part already used by another PC is **unavailable** (book p.18: "Two players may not choose the same chassis parts"), **except the Scrap parts** (Scrap Head/Torso/Legs), which can always be found. The GM can override in GM mode.
4. **Programmes:** 10 points, max 3 each, specialist ≥ 1. Next is blocked while the spend is invalid.
5. **Fonction secondaire:** 1 of the model's 3.
6. **Modules:** as many as there are slots.
7. **Équipement:** the model's `startingGear`, **including the choices** it contains ("au choix : pistolet laser ou vibro-couteau"). Starting EP = the ration from the Energy DEV band.
8. **Relations:** buddy (another PC), hated NPC, protected NPC, big dream (free text).
9. **Récapitulatif** → "Créer le robot".

**Gate:** `campaign.phase = 'creation'` until the GM (in GM mode) taps "L'équipe est prête". Then `phase = 'play'`: the market opens and the clock starts at Day 1 (T07). Adding a robot later reuses the wizard; the GM can edit any step.

**Acceptance criteria:** a wizard robot equals a hand-built one (round-trip comparison ignoring `id` and `color`); invalid spends are blocked; the market is locked during creation.

---

### T07 ★: Day/night clock and energy engine (logic)

**Goal:** a day/night rhythm for energy, built from book rules, with the GM able to adjust it.

**Agent setup:** `Plan` → `general-purpose`. Pure logic + tests. The ★ reviewer checks every rule against `data.js` and the book (p.72 energy points, p.107-108 DEV levels, p.112 base stations).

**Book rules (already in `data.js`; don't re-derive them)**
- `dailyDrain: 1`: 1 EP each evening (p.71).
- Ration: Energy DEV band → `energyEp`. A charging station refills **up to** the ration, never above the max (10, or 12 with Alimentation de secours).
- Not connected (`c.online === false`, which the app already treats as "outside"): `outsideSolarEp: 1` per day.
- Panneaux solaires: D6 EP per day when outside, idle, clear sky. Générateur: 1 EP/hour. Recycleur de déchets: 1 EP per D6 hours. Banque d'énergie: 5 EP, both ways. E-pack/Batterie: D6 EP, then empty.
- 0 EP → standby (`status().asleep`).
- Base stations (p.112): each robot has its own charging station and recharges after its day's shift. **Scrap Robots have no base station** ("they siphon energy wherever they can"): by default they are excluded from the night charge, and the GM ticks them in when they found energy.

**Model:** `campaign.clock = { day: 1, phase: 'day'|'night', clearSky: true }`. GM overrides are in `campaign.rules.energy` (`dailyDrain`, `outsideSolarEp`, `overrideRation`). **No new per-robot location:** reuse `c.online`. A per-day flag `c.daily = { barter: false }` is added to `normalize` (with a round-trip test).

**API** (`src/lib/clock.js`, pure functions, called inside `commitAll`):
- `endDay(data)`: evening: −`dailyDrain` per active PC (not creatures; NPCs only if the GM pool is off); flags robots in standby; moves to night; returns a report.
- `nightCharge(data, { exclude })`: connected → up to the ration; not connected → +1 (solar), plus Panneaux solaires (`rollD6` through rng) when the sky is clear.
- `startDay(data)`: day + 1, resets `c.daily`.
- `transfer(data, from, to, n)`: Banque d'énergie / E-pack.
- Every step appends one line per robot to the journal.

**Acceptance criteria:** tests for: drop into standby; ration capped by the max and the band; Alimentation de secours = 12; solar only when not connected; creatures untouched; GM overrides applied; deterministic with `setRng`.

---

### T08: Énergie space (UI)

**Goal:** run the team's days and nights in a few taps.

**Agent setup:** `general-purpose`, `frontend-design`.

**Layout**
1. **Header:** "Jour 3 · Nuit", a sun/moon icon, a clear-sky toggle, and **one main button that changes with the phase**: "Terminer la journée" → "Recharger pour la nuit" → "Nouveau jour".
2. **Team table:** EP bar (the existing `Segments`), max, status (OK / low ≤ 2 / standby), connected or not, and an "exclu cette nuit" box.
3. **Ration:** Energy DEV → ration, with a short explanation; a ration override in GM mode.
4. **Night report:** what happened to each robot (it also goes to the journal).
5. **Transfers:** "Donner des PE".
6. **DEV levels** (today's Collectif).
7. **Energy rules** (GM mode, collapsed): the overrides, each with "valeur du livre" and "réinitialiser".

On the fiche, "Nouveau jour (−1)" disappears (the clock replaces it); ±1 and "Recharger" stay.

**Acceptance criteria:** a full day → night → day loop for 4 robots in ≤ 3 taps; undo reverts a whole step.

---

### T09: Black market: catalog, prices, rarity, GM editor

**Goal:** after creation, robots can buy and sell. **The GM sets prices, rarity and stock.**

**Depends on:** T06 (the gate opens the market) · **Agent setup:** `general-purpose`, `frontend-design`.

**Model**

```js
campaign.market = {
  open: false,                     // set to true by the T06 gate; the GM can close it
  sellRate: HOUSE.market.sellRate, // « règle maison »
  rarities: HOUSE.market.rarities, // [{ id, label, chance }], editable
  listings: [{ id, kind: 'module'|'weapon'|'equipment'|'part'|'custom', ref, custom, price, rarity, stock /* null = unlimited */, enabled, hidden, note }],
  ledger: []                       // T10
}
```

**Book prices (p.234 "Goods and services", "actual costs may vary") go into `data.js` as `goodsPrices`:**
- Typical module **5 EP**, typical chassis part **8 EP**.
- Weapons: scrap knife 1, scrap club 1, stun baton 2, laser welder 3, vibro knife 3, battle saw 5, stun gun 3, laser pistol 2, laser rifle 5, maser pistol 4, plasma rifle 7 (scrap club and vibro knife checked in the PDF by the owner on 2026-10-11; the OCR had garbled them).
- Services (attribute repair 1 EP per point, fancy meal 2, etc.) and drugs are listed in the book but **not in the shop** (simple: the GM deducts EP by hand).

**House defaults (`house.js`, shown with a « règle maison » badge):**
- Equipment (no price in the book): `null` = price to be set by the GM before it can be sold.
- Rarity tiers: `commun` (always available), `peu-commun` (chance 1/2), `rare` (1/6), `unique` (only when the GM enables it). The book only says the black market is run by Scrap Robots and that security robots react to military items (p.116-117).
- Sell-back: half price, rounded, minimum 1.
- **Chassis parts are sold** (8 EP, book p.234; swapping parts p.26). **Secondary functions are not sold** (they cost XP, p.26).

**GM editor** (MJ → Marché): a table with search and filters (kind, rarity, enabled); inline editing of price, rarity and stock; "Ajouter un objet perso"; "Tout réinitialiser"; market export/import (JSON).

**Acceptance criteria:** the default catalog covers every module, weapon, chassis part and equipment item in `data.js`; book prices match p.234; a price without a book source shows its « règle maison » badge; an item with a `null` price can't be bought until the GM sets one; edits survive the round-trip.

---

### T10: Black market: availability, buy, sell

**Goal:** a simple shop for the table.

**Agent setup:** `general-purpose`, `frontend-design`.

**Tasks**
1. **Availability:** one draw **per in-game day** (or on demand, "Nouveau tirage", in GM mode), using `rng`. The GM can force an item in or out.
2. **Shop:** cards by kind with price, rarity and stock; a buyer picker (the active PC by default) showing their EP; for weapons, a comparison with the robot's current weapon.
3. **Buying:**
   - check EP (`availableEp`), module slots (`chassis().slots`) and duplicates;
   - `payEp`, add the item, decrement the stock, write to the ledger and the journal;
   - a toast with undo.
4. **Selling:** half price (house rule); the item goes back into stock.
5. Hidden items aren't shown outside GM mode.
6. **Not included (owner's decision):** haggling, installation rolls, bartering.

**Acceptance criteria:** a purchase without enough EP or a free slot is blocked with a clear message; undo restores EP, stock and inventory; the draw is reproducible with `setRng`.

---

### T11: GM-editable XP rules + end-of-session wizard

**Goal:** the GM owns the XP rules, and the end of a session is one guided flow for the whole team.

**Agent setup:** `general-purpose`, `frontend-design`.

**Model**

```js
campaign.rules.xp = {
  questions: [{ id, text, xp: 1, enabled: true }],  // default = the 6 book questions
  costs: { program: 5, secondary: 5 },              // book p.26: 5 XP; program max 5; a secondary function also needs scrap
  bonusAwards: []                                   // e.g. « Ordre de travail accompli » +1, empty by default
}
campaign.xp.log = [{ at, awards: [{ cid, total, items }] }]
```

**End-of-session wizard** (Séance → "Terminer la séance"):
1. Automatic backup (T04).
2. **XP grid:** PCs × questions + bonus awards, with "participé" pre-checked; totals; the GM adjusts.
3. **DEV decay:** 1D6 per level (existing logic), with a manual override.
4. **Relations:** a reminder and quick editing (protected NPC, hated NPC, dream).
5. **Summary** → journal: XP per robot, DEV changes, plus *if present* the market ledger (T10) and the days elapsed (T07). Then "Exporter la campagne".

**Spending XP:** replace "Dépenser 5 PX" with real purchases: program +1 (cost from the rules, blocked at `programMax`) or a new secondary function (picker). Each spend is logged.

**GM editor** (MJ → Règles → Expérience): questions (add, reorder, disable, change the XP), costs, bonus awards, and "valeurs du livre".

**Acceptance criteria:** with the default rules, the results match v2.3.6 (1 XP per "oui", 5 XP per upgrade); a question worth 2 counts double; the history lists every session.

---

### T12 ★: Square-grid geometry (logic)

**Goal:** pure, tested functions that **suggest** a range band, cover and line of sight from a map. The book's rules (`shootRanges`, `fleeMods`, `blastDice`) stay the only combat rules.

**Agent setup:** `Plan` → `general-purpose`. The ★ reviewer redraws the test cases on paper.

**Decisions** (simple):
- **Square grid only**, diagonals count 1 (Chebyshev), no corner-cutting between two walls.
- **No facing.** The book's 90° overwatch arc is left to the GM's judgment (T14).
- **Range bands from the book's distances** (p.82: Arm's Length "just next to each other", Near "a few steps away", Short "up to 20-30 yards", Long "up to a few hundred yards", Distant "as far as you can see"). With **1 square = 2 m** (house):
  - **Bras** ≤ 1 square;
  - **Proche** ≤ 3 squares (house reading of "a few steps");
  - **Courte** ≤ 12 squares (≈ 24 m, book);
  - **Longue** beyond 12 (on a map it always ends at the map edge);
  - **Lointaine** never on a map (GM's call, as today).
- **Movement:** the book counts maneuvers per range band, relative to the enemy (p.82: 1 maneuver per band up to Courte, 2 maneuvers in a row beyond). On a grid, the reach overlay uses **M = 4 squares per maneuver** (house rule, GM-editable) as a visual guide only; the app doesn't enforce movement.
- The house values (square size, Proche edge, M) live in `house.js`.
- **Terrain** (data, editable): `sol`; `mur` (blocks movement and line of sight); `meuble` (cover 3, doesn't block line of sight, costs 2 to cross); `porte` (closed = wall, open = floor); `porte blindée` (cover 5 when used as a shield); `difficile` (costs 2); `eau` (impassable). Cover ratings come from the book (p.91 "Typical cover": Furniture 3, Steel Door 5, wall 7, as in `coverPresets`; the steel door value was checked in the PDF by the owner, since the OCR reads "2)").

**API** (`src/lib/tactics/`):
- `distance(a, b)`;
- `line(a, b)`: every cell the segment crosses;
- `los(map, a, b)` → `{ visible, partial }`: four corner-to-center rays;
- `suggestCover(map, attacker, target)` → `{ rating, source }`: the highest rating among the obstacles **adjacent to the target and between it and the attacker** (meuble 3, porte blindée 5, and **a wall corner when line of sight is only partial = Mur 7**); 0 when exposed;
- `bandOf(cells, rules)`;
- `reach(map, from, maneuvers, rules)`: Dijkstra with movement costs;
- `blastVictims(map, centre, tokens)`: by band, with line of sight from the center.

**Acceptance criteria:** ≥ 25 tests written as ASCII grids (`#` wall, `m` furniture, `A` attacker, `T` target); exposed target → 0; behind furniture → 3; behind a wall corner with partial line of sight → 7; no line of sight through two diagonal walls; all functions pure.

---

### T13: Map, tokens, minimal paint tool

**Goal:** an optional map in the Combat space: grid, terrain, tokens, panning and zooming, and a minimal paint tool for the GM.

**Agent setup:** `general-purpose`, `frontend-design`.

**Tasks**
1. `components/tactics/MapView.svelte`:
   - **SVG** with a `viewBox`, **one `<path>` per terrain type** (not one element per cell);
   - `touch-action: none` **on the map only** (the page keeps its normal scrolling);
   - two-finger panning and pinch zoom, plus +/− buttons and "Recentrer".
2. **Tokens:** use `Avatar` (initials, PC color, a red ring for enemies), the existing state rings, and a highlight on whoever is acting. Place them **by tap** (select the token, then tap the cell) and also by dragging.
3. **Overlays** (toggles) from the selected token: the 5 range bands, the reachable area (1 maneuver / 2 maneuvers), and lines of sight to enemies with a suggested cover badge.
4. **Minimal paint tool** (GM mode): sol, mur, meuble, porte, porte blindée, difficile, eau, ally/enemy spawn zones; brush and rectangle; undo inside the tool; map size (≤ 32×24).
5. **Saving:** `campaign.maps` (compact terrain string), left out of the undo history (T03), included in the campaign export.
6. **Layout:** on phones, the map sits above the turn panel and can be collapsed; at ≥ 1280 px, the map is on the left and the turn panel on the right.
7. **Not included (owner's decision):** a full editor, background images, fog of war.

**Acceptance criteria:**
- The DOM of a 30×20 map with 10 tokens stays under 150 elements.
- Panning in Chromium (Playwright, a 2-second scripted gesture) keeps a p95 frame time under 33 ms, sampled with `requestAnimationFrame`.
- A map survives a reload and an export/import.

---

### T14 ★: Map ↔ combat: suggested range, cover and line of sight

**Goal:** the map **suggests**, and the GM and players **confirm**. No new combat rules, and the turn's flow stays the same.

**Agent setup:** `Plan` → `general-purpose`. The ★ reviewer replays 3 seeded fights (melee, shooting with cover, grenade) with and without a map.

**Read first:** `TurnFlow.svelte` (all of it), `combat.js`, `rules.js`, `energy.js` (`blastDice`, `rollBlast`), `data.js` (`shootRanges`, `fleeMods`, `coverPresets`, `combatGuide`).

**Tasks** (each one only applies when both tokens are on the map; otherwise everything stays as in v2.3.6):
1. **Range:** picking a target pre-selects `bandOf(distance)` among the existing chips, labelled "Courte (7 cases)". Still changeable.
2. **Cover (stays a state of the robot, `c.cover`):** the "se mettre à couvert" maneuver **pre-selects** the chip `suggestCover(...)` for the robot's position against the nearest enemy. **The app never changes `c.cover` on its own**, and wear from hits works as before.
3. **Line of sight:** without line of sight, a "Pas de ligne de vue" banner (the GM can override it).
4. **Moving:** drag the token. The reachable area is shown for 1 and 2 maneuvers (×2 with any working module whose `fx` is `move`, such as the Accelerator or Jetpack). **No maneuver counter:** the guided turn already handles the action/maneuver choices.
5. **Overwatch:** when a token finishes moving inside the line of sight and the weapon range of a combatant in overwatch, show a prompt "Tir de surveillance de X ? (arc de 90° : à vous de juger)" → the existing overwatch flow. No automatic trigger.
6. **Fleeing:** `fleeMods` pre-selected from the distance to the nearest enemy.
7. **Explosions:** pick the target cell → `blastVictims()` lists the victims by band → existing `rollBlast`.
8. **Module ranges:** effects with a `range` (Proche, Courte, Bras) only list the targets in range; Protéger (Security Robot) checks Proche.
9. **Log:** "Tir à Courte (7 cases), couverture Meuble 3".

**Acceptance criteria:** with no map, a seeded fight (`setRng`) produces **exactly** the same log as before; with a map, the suggestions show up and can be changed; `c.cover` never changes without a user action.

---

### T15: Encounter library + 4 quick setups

**Goal:** launch a ready fight in under 30 seconds.

**Agent setup:** `general-purpose`, `frontend-design`. The presets are **original** layouts (no maps copied from the book).

**Model:** `campaign.encounters = [{ id, name, tags, mapId, enemies: [{ template, count, spawn }], surprise: 'none'|'allies'|'enemies', gmPool, notes }]`.

**Tasks**
1. **Library** (MJ → Rencontres): list, search, tags, duplicate, delete, export/import JSON.
2. **"Lancer":**
   - create the NPCs with `fromTemplate` + `addCopies` (shared group = shared initiative, as today);
   - add them to the combat and place the tokens on the spawn zones;
   - set surprise and the GM pool;
   - open Combat → Préparation.
3. **4 quick setups** (about 20×14 cells, enough room for Longue range): *Couloir de service* (ambush), *Quai* (crates, water), *Salle du réacteur* (catwalks, central hazard), *Entrepôt* (shelving). Each comes with a suggested enemy mix from `npcTemplates`.
4. **Not included (owner's decision):** a fight generator, a threat badge.

**Acceptance criteria:** launching a quick setup reaches initiative in ≤ 3 taps; encounters survive export/import.

---

### T16: Finish: accessibility, home-screen install, docs, 3.x

**Agent setup:** `general-purpose`, `frontend-design`; an independent reviewer runs the checklist.

**Checklist**
- The full Playwright suite (both themes, 390 and 1280 px).
- Contrast and labels; 44 px touch targets.
- A single-file size budget < 900 kB.
- **Home-screen install:** `manifest.webmanifest` + icons, deployed next to `index.html` by the Action. This limits Safari's deletion of stored data after 7 days without a visit.
- A reminder "Exportez la campagne" at the end of each session (T11).
- French `README.md` (players and GM) and `CLAUDE.md` up to date.
- Re-check the T01 vocabulary.

---

## 6. What was dropped, and why

| Initial request / idea | Decision | Why |
|---|---|---|
| Separate player and GM interfaces, logins | **One device + "Mode MJ" switch** | A static GitHub Pages site has no server: logins or sync would need a cloud service (accounts, privacy, quotas) or public P2P relays (fragile). At one table, the GM already sees everything. |
| Live sync (P2P) | Dropped | Same reason; too much code for 4 friends. |
| Fog of war | Dropped | Only useful with separate player devices. |
| Fight generator, threat badge | Dropped | An invented heuristic; the library + 4 setups is enough. |
| Hex grid | Dropped | Mechatron-7 interiors fit squares; less code. |
| Haggling, installation rolls, bartering | Dropped | Invented rules; buying at the GM's price is enough. |
| Full map editor, background images | Reduced to a minimal paint tool | Editing on a phone isn't realistic; images don't suit a single-file app. |
| Several campaigns at once | One campaign + export/import | Simpler; switching = exporting. |
| Migrating old saves, `releases/`, v1 files | Dropped | No user base; git keeps the history. |

---

## 7. Research notes (tactical combat)

- **The RPG (Year Zero Engine)** uses abstract range bands and movement by bands. The map must therefore **compute a band** and let the existing rules apply. The band edges in T12 follow from the book's movement rule.
- **The *Road to Eden* video game** (an XCOM-style tactics game on a square grid) contributes: positioning before the fight (the book's surprise rule), overwatch (here a GM prompt, not a trigger), and cover read off the map (here a suggestion, never an automatic change).
- ***Zone Wars*** (the miniatures game) contributes the corner-ray check for partial line of sight; the cover values stay the RPG's (3/5/7).

---

## 8. Review log

**Hostile review (2026-10-11), main points and how they were resolved**

| Point raised | Resolution in v2 |
|---|---|
| CLAUDE.md forbids inventing numbers, but the plan invented defaults | `house.js` + « règle maison » badge; `data.js` stays book-only (§2.6) |
| Parallel tracks impossible without commits | Sequential tickets, one branch + PR per ticket, the owner merges (§0.1) |
| `normalize` drops unknown fields | Global rule + round-trip test (§2.4, T02) |
| The welcome screen bounces back on an empty campaign | Shown only when no campaign exists (T04) |
| `c.dev` read in about 23 places | One accessor, explicit audit, the online rule kept (T03) |
| Role and PIN stored in the campaign | The role is in the device's UI prefs; no PIN (T05) |
| Hiding enemy stats breaks GM turns on a shared device | GM mode hides tools, not information (T05) |
| No campaign journal | `campaign.journal` (T03) |
| Automatic cover erases the maneuver and wear | Cover is suggested, never changed automatically (T14) |
| Overwatch 90° arc vs no facing | A GM prompt with a reminder of the arc (T14) |
| Band edges inconsistent with movement | Bands derived from M squares per maneuver (T12) |
| Unverifiable criteria (60 fps, < 2 min, < 1 s) | DOM budget, p95 frame time, `setRng` hook (T02, T13, T14) |
| Hidden dependencies | T09 ← T06; T11 summary conditional on T07/T10 |
| Rules guide unreachable for local agents | The owner's Markdown rulebook `Mechatron-livre-md/` (git-ignored, local only); cloud agents ask for the slice they need |
| Committed build file causes collisions | Build on GitHub, `dist/` not tracked (T00) |
| Old-save migrations | Dropped: no user base (§2.5) |

**Points noted without action:** the logo comes from the *Road to Eden* video game's, cropped to « MUTANT / YEAR ZERO » in v3.0.1 (the owner's choice); `data.js` contains French paraphrases of the book (a hobby fan project, unchanged).

---

## 9. Owner decisions (log)

- 2026-10-11:
  - commits and pushes only after the plan is agreed, then branch + PR per ticket;
  - no compatibility with the past;
  - don't force requests that clash with the tech;
  - one device + GM switch;
  - flattened repo + build on GitHub;
  - house-rules file;
  - drop the generator, threat badge, hex grid, haggling/installation and full editor.
  - the rulebook is available as Markdown in `Mechatron-livre-md/` (root, git-ignored); every rules reference points there. Consequence: market prices come from the book (p.234) and chassis parts are sold; range bands follow the book's distances (p.82); Scrap Robots have no base station (p.112).
- 2026-10-11: the owner checked garbled OCR values in the PDF: scrap club 1 EP, vibro knife 3 EP (p.234), steel door cover 5 (p.91).
- 2026-10-11: **plan agreed** → commits and pushes allowed, following §0.1.
- 2026-10-11: crop the logo to remove the « Road to Eden » line (v3.0.1, before T04).
- 2026-10-11: T05 merged; NPC fiches open in place from Combat in both GM modes (option chosen over hiding the buttons or switching GM mode on).
- 2026-10-11 (T06, confirmed by the owner): starting gear = the model's whole GEAR box with its « or » choices (p.31-46 and the example robot p.29), although p.25 says « one piece of gear »; modules are unique among PCs like chassis parts (p.22); the serial format (3 letters, 3 digits) is generated but not enforced, since junk robots name themselves (p.16) and the demo's serials are shorter.
- **Still open:** none blocking. If a ticket raises a question, the agent asks before choosing.

---

## Sources

- [Mutant Year Zero: Road to Eden: tactics (official site)](https://mutantyearzero.com/?p=5313)
- [Mutant Year Zero: Road to Eden review (TechPowerUp)](https://www.techpowerup.com/review/mutant-year-zero/single-page.html)
- [Mutant Year Zero: Zone Wars, rules summary](https://spilth.org/rules/zone-wars)
- The Mechatron rulebook, Markdown copy `Mechatron-livre-md/` (owner's copy, not published), and the page references in `src/lib/data.js`
