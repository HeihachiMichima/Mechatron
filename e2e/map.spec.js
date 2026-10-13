// T13: the tactical map — paint tool, placing tokens, DOM budget, panning speed,
// reload. Screenshots at 390 and 1280 px in both themes.
import { test, expect } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const url = pathToFileURL(fileURLToPath(new URL('../dist/index.html', import.meta.url))).href;
const nav = (page, label) => page.locator('#app-nav button', { hasText: label });
const save = (page) => page.waitForTimeout(400).then(() => page.evaluate(() => JSON.parse(localStorage['mechatron-v3'])));
const mapSvg = (page) => page.locator('svg[role="application"]').first();
/** Screen point of the centre of square (x, y) of a map `cols` squares wide (scrolls the map into view). */
async function at(page, cols, x, y) {
  await mapSvg(page).scrollIntoViewIfNeeded();
  const b = await mapSvg(page).boundingBox();
  const sq = b.width / cols;
  return [b.x + sq * (x + 0.5), b.y + sq * (y + 0.5)];
}

async function open(browser, w, h, theme) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.getByRole('button', { name: 'Ouvrir la démo' }).click();
  return { ctx, page, errors };
}
async function gmOn(page) {
  await page.getByRole('switch', { name: /Mode MJ/ }).click();
}

/** A 30 × 20 map with walls, crates and doors, and a fight of 10 combatants on it. */
async function bigFight(page, placeAll = true, fight = false) {
  await page.waitForTimeout(600); // let the autosave settle, or it would overwrite the injected save
  await page.evaluate(([placeAll, fight]) => {
    const d = JSON.parse(localStorage['mechatron-v3']);
    const W = 30, H = 20;
    const cells = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let ch = '.';
      if (x === 10 && y !== 6 && y !== 14) ch = '#';
      if (x === 10 && y === 14) ch = 'd';
      if (y === 10 && x > 14 && x < 24) ch = '#';
      if ((x === 5 || x === 6) && y === 4) ch = 'm';
      if (x === 20 && y > 2 && y < 6) ch = 'm';
      if (x > 24 && y > 15) ch = '~';
      if (x < 3 && y > 15) ch = 'a';
      if (x > 26 && y < 3) ch = 'e';
      cells.push(ch);
    }
    d.campaign.maps = [{ id: 'big', name: 'Entrepôt test', w: W, h: H, cells: cells.join('') }];
    // 4 PCs + 3 NPCs from the demo, + 3 NPC copies = 10 combatants.
    const npcs = d.chars.filter((c) => c.kind === 'npc');
    for (let i = 0; i < 3; i++) d.chars.push({ ...npcs[i % npcs.length], id: 'copy' + i, name: npcs[i % npcs.length].name + ' ' + (i + 2) });
    d.combat.combatants = d.chars.map((c, i) => ({
      id: 'x' + i, cid: c.id, side: c.kind === 'npc' ? 'enemy' : 'ally', init: 10 - i, tie: 0.5,
      pos: placeAll || i % 2 ? (c.kind === 'npc' ? { x: 22 + (i % 5), y: 4 + i } : { x: 2 + i, y: 12 }) : null
    }));
    d.combat.mapId = 'big';
    if (fight) Object.assign(d.combat, { phase: 'fight', active: true, round: 1, turn: 0 });
    localStorage['mechatron-v3'] = JSON.stringify(d);
  }, [placeAll, fight]);
  await page.reload();
}

for (const { w, h, theme } of [{ w: 390, h: 844, theme: 'dark' }, { w: 1280, h: 900, theme: 'light' }, { w: 390, h: 844, theme: 'light' }, { w: 1280, h: 900, theme: 'dark' }]) {
  test(`map in combat: budget, overlays, placing (${w}px, ${theme})`, async ({ browser }) => {
    const { ctx, page, errors } = await open(browser, w, h, theme);
    await bigFight(page, false);
    await nav(page, 'Combat').click();
    await expect(mapSvg(page)).toBeVisible();

    // DOM budget: 30 × 20 map, 10 tokens, default overlays, < 150 elements.
    const placed = await page.evaluate(() => JSON.parse(localStorage['mechatron-v3']).combat.combatants.filter((x) => x.pos).length);
    expect(placed).toBe(5);
    // Place the rest by tap: pick each from the « À placer » tray, tap a square.
    await page.locator('.tray .avbtn').first().click();
    for (let i = 0; i < 5; i++) await page.mouse.click(...(await at(page, 30, 12 + i, 17)));
    let d = await save(page);
    expect(d.combat.combatants.filter((x) => x.pos).length).toBe(10);
    await expect(page.locator('.tray')).toHaveCount(0);
    const count = await mapSvg(page).evaluate((el) => el.querySelectorAll('*').length + 1);
    expect(count).toBeLessThan(150);

    // Select a token: lines of sight + list in words; then ranges and reach.
    await page.locator('[data-tok="x0"]').click();
    await expect(page.locator('.sightlist li').first()).toBeVisible();
    await page.getByRole('button', { name: 'Portées' }).click();
    await page.getByRole('button', { name: 'Déplacement' }).click();
    expect(await mapSvg(page).evaluate((el) => el.querySelectorAll('*').length + 1)).toBeLessThan(150);
    await page.screenshot({ path: `e2e/screenshots/map-prep-${w}-${theme}.png`, fullPage: w === 390 });

    // Drag a token to a new square (x0, placed first from the tray at (12,17) → (4,15)).
    await page.mouse.move(...(await at(page, 30, 12, 17)));
    await page.mouse.down();
    await page.mouse.move(...(await at(page, 30, 4, 15)), { steps: 8 });
    await page.mouse.up();
    d = await save(page);
    expect(d.combat.combatants.find((x) => x.id === 'x0').pos).toEqual({ x: 4, y: 15 });
    // A wall is not a place to stand.
    await page.locator('[data-tok="x0"]').click();
    await page.mouse.click(...(await at(page, 30, 10, 2)));
    await expect(page.getByText('On ne peut pas se tenir là')).toBeVisible();

    // Reload: the map and the positions are still there.
    await page.reload();
    await nav(page, 'Combat').click();
    await expect(page.locator('[data-tok="x0"]')).toBeVisible();
    expect(errors).toEqual([]);
    await ctx.close();
  });
}

for (const { w, h, theme } of [{ w: 390, h: 844, theme: 'dark' }, { w: 1280, h: 900, theme: 'light' }, { w: 1440, h: 900, theme: 'dark' }]) {
  test(`map during the fight: layout (${w}px, ${theme})`, async ({ browser }) => {
    const { ctx, page, errors } = await open(browser, w, h, theme);
    await bigFight(page, true, true);
    await nav(page, 'Combat').click();
    await expect(mapSvg(page)).toBeVisible();
    // The current actor (highest initiative, x0) is highlighted and its sight lines drawn.
    await expect(page.locator('[data-tok="x0"] .halo')).toHaveCount(1);
    await expect(page.locator('.sightlist li').first()).toBeVisible();
    const mapBox = await mapSvg(page).boundingBox();
    const turn = await page.locator('.track-panel').boundingBox();
    if (w >= 1280) expect(mapBox.x + mapBox.width).toBeLessThan(turn.x); // map on the left, turn panel on the right
    else expect(mapBox.y).toBeGreaterThan(turn.y); // phones: under the turn lane, above the turn panel
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `e2e/screenshots/map-fight-${w}-${theme}.png` });
    expect(errors).toEqual([]);
    await ctx.close();
  });
}

test('panning a 30 × 20 map keeps p95 frame time under 33 ms', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser, 1280, 900, 'dark');
  await bigFight(page);
  await nav(page, 'Combat').click();
  await page.getByRole('button', { name: 'Zoomer', exact: true }).click();
  await page.getByRole('button', { name: 'Zoomer', exact: true }).click();
  await mapSvg(page).scrollIntoViewIfNeeded();
  const box = await mapSvg(page).boundingBox();
  await page.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    const tick = (now) => { window.__frames.push(now - last); last = now; if (window.__frames.length < 1000 && !window.__stop) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  // A 2-second scripted pan gesture on empty floor.
  const cx = box.x + box.width * 0.55, cy = box.y + box.height * 0.3;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  const t0 = Date.now();
  let i = 0;
  while (Date.now() - t0 < 2000) {
    const a = (i++ / 30) * Math.PI;
    await page.mouse.move(cx + Math.cos(a) * 200, cy + Math.sin(a) * 150);
  }
  await page.mouse.up();
  const frames = await page.evaluate(() => { window.__stop = true; return window.__frames.slice(2); });
  const sorted = [...frames].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  console.log(`pan: ${frames.length} frames, ${i} moves, p95 ${p95.toFixed(1)} ms`);
  expect(frames.length).toBeGreaterThan(30);
  expect(p95).toBeLessThan(33);
  expect(errors).toEqual([]);
  await ctx.close();
});

for (const { w, theme } of [{ w: 390, theme: 'dark' }, { w: 1280, theme: 'light' }]) {
  test(`GM paint tool: rectangle, brush, undo, saved (${w}px, ${theme})`, async ({ browser }) => {
    const { ctx, page, errors } = await open(browser, w, 900, theme);
    await gmOn(page);
    await nav(page, 'MJ').click();
    await page.locator('section', { hasText: 'Cartes' }).getByRole('button', { name: 'Nouvelle carte' }).click();
    await page.getByRole('radio', { name: 'Mur' }).click();
    await page.getByRole('radio', { name: 'Rectangle' }).click();
    await page.mouse.move(...(await at(page, 16, 2, 1)));
    await page.mouse.down();
    await page.mouse.move(...(await at(page, 16, 6, 1)), { steps: 5 });
    await page.mouse.up();
    let d = await save(page);
    expect(d.campaign.maps[0].cells.slice(16, 32)).toBe('..#####.........');
    // Brush a crate, then undo it.
    await page.getByRole('radio', { name: 'Meuble' }).click();
    await page.getByRole('radio', { name: 'Pinceau' }).click();
    await page.mouse.click(...(await at(page, 16, 8, 5)));
    d = await save(page);
    expect(d.campaign.maps[0].cells[5 * 16 + 8]).toBe('m');
    await page.getByRole('button', { name: 'Annuler', exact: true }).click();
    d = await save(page);
    expect(d.campaign.maps[0].cells[5 * 16 + 8]).toBe('.');
    expect(d.campaign.maps[0].cells.slice(16, 32)).toBe('..#####.........');
    await page.screenshot({ path: `e2e/screenshots/map-editor-${w}-${theme}.png`, fullPage: w === 390 });
    await page.getByRole('button', { name: 'Terminé' }).click();
    await expect(page.getByText('16 × 12 cases')).toBeVisible();
    expect(errors).toEqual([]);
    await ctx.close();
  });
}
