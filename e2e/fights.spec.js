// T14: three seeded fights (melee, shooting with cover, grenade), played through
// the guided turn. Without a map, the combat log must be exactly the one the
// app wrote before the map existed (e2e/fixtures/no-map-logs.json, recorded on
// v3.10.0). With a map, the suggestions show up and can be changed.
import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const url = pathToFileURL(fileURLToPath(new URL(process.env.APP || '../dist/index.html', import.meta.url))).href;
const fixture = fileURLToPath(new URL('./fixtures/no-map-logs.json', import.meta.url));
const nav = (page, label) => page.locator('#app-nav button', { hasText: label });

// Map for the fights (20 × 12). Garde behind a crate, Sentinelle behind a wall corner.
//   B = Brise-Fer (2,5), C = Clou (3,7), G = Garde (12,5) with a crate at (11,5),
//   S = Sentinelle (15,2) next to a wall.
const MAP = [
  '....................',
  '....................',
  '..............#.....',
  '..............#.....',
  '....................',
  '...........m........',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................'
].join('');

async function setup(page, { seed, cover = {}, map = false, overwatch = [] }) {
  await page.goto(url);
  await page.getByRole('button', { name: 'Ouvrir la démo' }).click();
  await page.waitForTimeout(600);
  await page.evaluate(([cover, map, MAP, overwatch]) => {
    const d = JSON.parse(localStorage['mechatron-v3']);
    const by = (p) => d.chars.find((c) => c.name.startsWith(p));
    const cast = [['Brise-Fer', 'ally', 10, { x: 2, y: 5 }], ['Robot de garde', 'enemy', 8, { x: 12, y: 5 }], ['Clou', 'ally', 6, { x: 3, y: 7 }], ['Unité Sentinelle', 'enemy', 4, { x: 15, y: 2 }]];
    d.combat = { phase: 'fight', active: true, round: 1, turn: 0, log: [], gmPool: 20, usePool: true, mapId: map ? 'm' : null,
      combatants: cast.map(([n, side, init, pos], i) => ({ id: 'x' + i, cid: by(n).id, side, init, tie: 0.5, pos: map ? pos : null })) };
    for (const [n, v] of Object.entries(cover)) by(n).cover = v;
    for (const i of overwatch) d.combat.combatants[i].overwatch = true;
    if (map) d.campaign.maps = [{ id: 'm', name: 'Salle', w: 20, h: 12, cells: MAP }];
    localStorage['mechatron-v3'] = JSON.stringify(d);
  }, [cover, map, MAP, overwatch]);
  await page.reload();
  await page.evaluate((s) => window.__mechatron.setRng(s), seed);
  await nav(page, 'Combat').click();
}

const turnPanel = (page) => page.locator('section.turn');
async function resolve(page) {
  const p = turnPanel(page);
  for (let i = 0; i < 6; i++) {
    for (const name of ['Dégâts', 'Appliquer les dégâts']) {
      const b = p.getByRole('button', { name, exact: true });
      if (await b.isVisible()) { await b.click(); break; }
    }
    const end = p.getByRole('button', { name: 'Fin du tour', exact: true });
    if (await end.isVisible()) { await end.click(); return; }
  }
  throw new Error('turn did not end');
}
async function attack(page, kind, check) {
  const p = turnPanel(page);
  await p.getByRole('button', { name: kind === 'melee' ? /^Corps à corps/ : /^Tirer/ }).click();
  if (check) await check(p);
  await p.getByRole('button', { name: /^Aux dés/ }).click();
  await p.getByRole('button', { name: /^Lancer \d+ dé/ }).first().click();
  await resolve(page);
}
async function grenade(page, targets, check) {
  const p = turnPanel(page);
  await p.getByRole('button', { name: /^Module/ }).click();
  await p.locator('button.modbtn', { hasText: 'Obus explosif' }).click();
  for (const t of targets) await p.locator('.targets .tg', { hasText: t }).click();
  if (check) await check(p, page);
  await p.getByRole('button', { name: /^Activer/ }).click();
  await p.getByRole('button', { name: 'Fin du tour', exact: true }).click();
}
const logOf = (page) => page.waitForTimeout(400).then(() => page.evaluate(() => JSON.parse(localStorage['mechatron-v3']).combat.log.map((l) => `T${l.round} ${l.text}`)));

const FIGHTS = {
  melee: { seed: 11, play: async (page) => { for (let i = 0; i < 4; i++) await attack(page, 'melee'); } },
  shooting: {
    seed: 2, cover: { 'Robot de garde': 3, 'Unité Sentinelle': 5 },
    play: async (page) => { await attack(page, 'shoot'); await attack(page, 'shoot'); await attack(page, 'melee'); await attack(page, 'shoot'); }
  },
  grenade: {
    seed: 33,
    play: async (page) => { await grenade(page, ['Robot', 'Unité']); await attack(page, 'melee'); await attack(page, 'melee'); await attack(page, 'shoot'); }
  }
};

for (const [name, f] of Object.entries(FIGHTS)) {
  test(`no map: the ${name} fight writes the same log as before the map (seed ${f.seed})`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await setup(page, { seed: f.seed, cover: f.cover });
    await f.play(page);
    const log = await logOf(page);
    expect(log.length).toBeGreaterThan(3);
    if (process.env.RECORD) {
      const all = existsSync(fixture) ? JSON.parse(readFileSync(fixture, 'utf8')) : {};
      all[name] = log;
      mkdirSync(fileURLToPath(new URL('./fixtures/', import.meta.url)), { recursive: true });
      writeFileSync(fixture, JSON.stringify(all, null, 2) + '\n');
    } else {
      expect(log).toEqual(JSON.parse(readFileSync(fixture, 'utf8'))[name]);
    }
    expect(errors).toEqual([]);
    await ctx.close();
  });
}

// ---- with a map: the suggestions, and the players still decide ----
const save = (page) => page.waitForTimeout(400).then(() => page.evaluate(() => JSON.parse(localStorage['mechatron-v3'])));
const mapSvg = (page) => page.locator('svg[role="application"]').first();
async function at(page, x, y) {
  await mapSvg(page).scrollIntoViewIfNeeded();
  const b = await mapSvg(page).boundingBox();
  const sq = b.width / 20;
  return [b.x + sq * (x + 0.5), b.y + sq * (y + 0.5)];
}

for (const { w, theme } of [{ w: 390, theme: 'dark' }, { w: 1280, theme: 'light' }]) {
  test(`map: range, sight, cover suggestion and log (${w}px, ${theme})`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: theme });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await setup(page, { seed: 2, map: true });
    const p = turnPanel(page);
    // Brise-Fer shoots: the Garde is at Courte (10 squares), pre-selected.
    await p.getByRole('button', { name: /^Tirer/ }).click();
    await expect(p.getByRole('button', { name: /^Courte \(10 cases\)/ })).toHaveAttribute('aria-pressed', 'true');
    // The Sentinelle is behind the wall: banner, and « Aux dés » waits for the GM.
    await p.locator('.targets .tg', { hasText: 'hors de vue' }).click();
    await expect(p.getByText('Pas de ligne de vue')).toBeVisible();
    await expect(p.getByRole('button', { name: /^Aux dés/ })).toBeDisabled();
    await page.screenshot({ path: `e2e/screenshots/map-nosight-${w}-${theme}.png`, fullPage: w === 390 });
    await p.getByRole('checkbox', { name: /autorise le tir/ }).check();
    await expect(p.getByRole('button', { name: /^Aux dés/ })).toBeEnabled();
    // Back to the Garde; the range chip can still be changed by hand.
    await p.locator('.targets .tg', { hasText: 'Courte (10 cases)' }).click();
    await p.getByRole('button', { name: /^Proche/ }).click();
    await expect(p.getByRole('button', { name: /^Proche/ })).toHaveAttribute('aria-pressed', 'true');
    await p.getByRole('button', { name: /^Courte/ }).click();
    await p.getByRole('button', { name: /^Aux dés/ }).click();
    await p.getByRole('button', { name: /^Lancer \d+ dé/ }).first().click();
    await resolve(page);
    let d = await save(page);
    expect(d.combat.log[0].text).toBe('Brise-Fer BTL-07 → Robot de garde : tir à Courte (10 cases), à découvert');
    // The Garde's turn: the map suggests the crate (Meuble 3) against Clou, but the cover doesn't change by itself.
    await expect(p.getByRole('button', { name: 'Meuble 3' })).toHaveClass(/sug/);
    await expect(p.getByText(/La carte suggère Meuble 3 face à Clou/)).toBeVisible();
    d = await save(page);
    expect(d.chars.find((c) => c.name === 'Robot de garde').cover).toBe(0);
    await page.screenshot({ path: `e2e/screenshots/map-cover-${w}-${theme}.png`, fullPage: w === 390 });
    await p.getByRole('button', { name: 'Meuble 3' }).click();
    d = await save(page);
    expect(d.chars.find((c) => c.name === 'Robot de garde').cover).toBe(3);
    // Fleeing: the band to the nearest enemy is pre-selected (Clou at 9 squares: Courte).
    await p.getByRole('button', { name: /^Fuir/ }).click();
    await expect(p.getByRole('button', { name: /^Courte/ })).toHaveAttribute('aria-pressed', 'true');
    expect(errors).toEqual([]);
    await ctx.close();
  });
}

test('map: grenade aimed at a square, victims by band from the map', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await setup(page, { seed: 33, map: true });
  const p = turnPanel(page);
  await p.getByRole('button', { name: /^Module/ }).click();
  await p.locator('button.modbtn', { hasText: 'Obus explosif' }).click();
  await expect(page.getByText("Touchez la case visée par l'explosion.")).toBeVisible();
  await page.mouse.click(...(await at(page, 12, 5))); // the Garde's square
  // Power 9: Bras/Proche full dice, Courte 3 dice. Garde at Bras; Clou (9) and Brise-Fer (10) at Courte; the Sentinelle is behind the wall.
  const names = await p.locator('.chips.stunt .tname').allTextContents();
  expect(names).toEqual(['Robot de garde', 'Clou SCR-311', 'Brise-Fer BTL-07']);
  await expect(p.locator('.chips.stunt', { hasText: 'Robot de garde' }).getByRole('button', { name: /^Bras/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(p.locator('.chips.stunt', { hasText: 'Clou' }).getByRole('button', { name: /^Courte/ })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: 'e2e/screenshots/map-blast-1280.png' });
  // The table can still take someone out of the blast.
  await p.locator('.targets .tg', { hasText: 'Brise-Fer' }).click();
  expect(await p.locator('.chips.stunt .tname').allTextContents()).toEqual(['Robot de garde', 'Clou SCR-311']);
  await p.getByRole('button', { name: /^Activer/ }).click();
  const d = await save(page);
  expect(d.combat.log.map((l) => l.text).filter((t) => t.startsWith('Lance-grenades →'))).toHaveLength(2);
  expect(d.combat.log.some((t) => /Souffle 9 dés \(Bras\)/.test(t.text))).toBe(true);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('map: walking into overwatch asks; the shot targets the mover, then the turn resumes', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await setup(page, { seed: 5, map: true, overwatch: [3] }); // the Sentinelle watches
  const p = turnPanel(page);
  // Brise-Fer starts his turn (cover chip), then steps into the Sentinelle's sight at Courte.
  await p.getByRole('button', { name: /^Tirer/ }).click();
  await page.locator('[data-tok="x0"]').click();
  await page.mouse.click(...(await at(page, 16, 6)));
  await expect(page.getByText(/Tir de surveillance d'Unité Sentinelle, à Courte \(4 cases\)/)).toBeVisible();
  let d = await save(page);
  expect(d.combat.combatants[3].overwatch).toBe(true); // nothing fired on its own
  await page.getByRole('button', { name: 'Tirer en surveillance' }).click();
  await expect(p.getByText('Tir de surveillance')).toBeVisible();
  // Cancelling keeps the overwatch and gives Brise-Fer his turn back where it was.
  await p.getByRole('button', { name: /^Annuler le tir/ }).click();
  d = await save(page);
  expect(d.combat.combatants[3]).toMatchObject({ overwatch: true, lostAction: false });
  await expect(p.getByRole('heading', { name: 'Brise-Fer BTL-07' })).toBeVisible();
  await expect(p.getByRole('button', { name: /^Aux dés/ })).toBeVisible(); // still in his shooting setup
  // Ask again and really fire: the mover is the target.
  await page.locator('[data-tok="x0"]').click();
  await page.mouse.click(...(await at(page, 16, 7)));
  await page.getByRole('button', { name: 'Tirer en surveillance' }).click();
  await p.getByRole('button', { name: /^Tirer/ }).click();
  await expect(p.locator('.targets .tg[aria-pressed="true"]')).toContainText('Brise');
  await p.getByRole('button', { name: /^Aux dés/ }).click();
  await p.getByRole('button', { name: /^Lancer \d+ dé/ }).first().click();
  await resolve(page);
  d = await save(page);
  expect(d.combat.combatants[3]).toMatchObject({ overwatch: false, lostAction: true });
  expect(d.combat.combatants[0].acted).toBe(false);
  await expect(p.getByRole('heading', { name: 'Brise-Fer BTL-07' })).toBeVisible(); // his turn resumes
  expect(errors).toEqual([]);
  await ctx.close();
});

test('map: a target beyond the weapon\'s range needs the GM', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await setup(page, { seed: 5, map: true });
  // The Sentinelle (Pistolet maser, Courte) steps out at (16,6): Brise-Fer is 14 squares away (Longue).
  await page.locator('[data-tok="x3"]').click();
  await page.mouse.click(...(await at(page, 16, 6)));
  const p = turnPanel(page);
  for (let i = 0; i < 3; i++) await p.getByRole('button', { name: /^Fin du tour/ }).click();
  await expect(p.getByRole('heading', { name: 'Unité Sentinelle' })).toBeVisible();
  await p.getByRole('button', { name: /^Tirer/ }).click();
  await expect(p.getByText(/Hors de portée/)).toBeVisible();
  await expect(p.getByRole('button', { name: /^Courte/ })).toHaveAttribute('aria-pressed', 'true'); // capped by the weapon
  await expect(p.getByRole('button', { name: /^Aux dés/ })).toBeDisabled();
  await p.getByRole('checkbox', { name: /autorise le tir/ }).check();
  await expect(p.getByRole('button', { name: /^Aux dés/ })).toBeEnabled();
  // Clou comes within Courte: picking him clears the warning.
  await page.locator('[data-tok="x2"]').click();
  await page.mouse.click(...(await at(page, 9, 7)));
  await p.locator('.targets .tg', { hasText: 'Courte (7 cases)' }).click();
  await expect(p.getByText(/Hors de portée/)).toHaveCount(0);
  await expect(p.getByRole('button', { name: /^Aux dés/ })).toBeEnabled();
  await ctx.close();
});
