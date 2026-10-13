// T15: encounter library and quick setups.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const url = pathToFileURL(fileURLToPath(new URL('../dist/index.html', import.meta.url))).href;
const nav = (page, label) => page.locator('#app-nav button', { hasText: label });
const save = (page) => page.waitForTimeout(400).then(() => page.evaluate(() => JSON.parse(localStorage['mechatron-v3'])));

async function gmDemo(browser, w, theme) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: theme, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.getByRole('button', { name: 'Ouvrir la démo' }).click();
  await page.getByRole('switch', { name: /Mode MJ/ }).click();
  await nav(page, 'MJ').click();
  return { ctx, page, errors };
}

for (const { w, theme } of [{ w: 390, theme: 'dark' }, { w: 1280, theme: 'light' }]) {
  test(`a quick setup reaches initiative in 2 taps (${w}px, ${theme})`, async ({ browser }) => {
    const { ctx, page, errors } = await gmDemo(browser, w, theme);
    const enc = page.locator('section.enc');
    await enc.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `e2e/screenshots/encounters-${w}-${theme}.png`, fullPage: w === 390 });
    // Tap 1: launch « Couloir de service ».
    await enc.locator('.presets li', { hasText: 'Couloir de service' }).getByRole('button', { name: 'Lancer' }).click();
    await expect(page.getByRole('button', { name: /^1\s*Préparation/ })).toHaveAttribute('aria-current', 'step');
    await expect(page.locator('[data-tok]')).toHaveCount(7);
    await page.screenshot({ path: `e2e/screenshots/encounter-launched-${w}-${theme}.png`, fullPage: w === 390 });
    // Tap 2: on to initiative.
    await page.getByRole('button', { name: 'Initiative', exact: true }).last().click();
    await expect(page.getByRole('button', { name: /^2\s*Initiative/ })).toHaveAttribute('aria-current', 'step');
    const d = await save(page);
    expect(d.combat.combatants.filter((x) => x.side === 'enemy').every((x) => x.surprise)).toBe(true);
    expect(d.combat.combatants.every((x) => x.pos)).toBe(true);
    const guards = d.chars.filter((c) => d.combat.combatants.some((x) => x.cid === c.id) && c.template === 'guard');
    expect(guards.map((c) => c.name)).toEqual(['Robot de garde 1', 'Robot de garde 2']);
    expect(guards[0].group).toBeTruthy();
    expect(guards[0].group).toBe(guards[1].group); // one initiative for the pair
    expect(errors).toEqual([]);
    await ctx.close();
  });
}

test('library: create, edit, launch over a running fight, export and import', async ({ browser }) => {
  const { ctx, page, errors } = await gmDemo(browser, 1280, 'dark');
  const enc = page.locator('section.enc');
  await enc.getByRole('button', { name: 'Nouvelle rencontre' }).click();
  await enc.getByLabel('Nom', { exact: true }).fill('Patrouille de nuit');
  await enc.getByLabel(/Mots-clés/).fill('nuit, patrouille');
  await enc.getByLabel(/Mots-clés/).blur();
  await enc.getByRole('button', { name: 'Ajouter des PNJ' }).click();
  await enc.getByRole('button', { name: /Augmenter nombre de Robot de garde/ }).click();
  await enc.getByRole('button', { name: 'Ajouter des PNJ' }).click();
  await enc.getByLabel('Modèle 2').selectOption('sentinel');
  await enc.getByRole('button', { name: 'Allié' }).nth(1).click();
  await enc.getByRole('button', { name: "L'équipe" }).click();
  await enc.getByRole('button', { name: 'Terminé' }).click();
  await expect(enc.getByText('2 × Robot de garde, Unité Sentinelle (allié), surprise')).toBeVisible();
  await expect(enc.locator('.tags').getByRole('button', { name: 'nuit', exact: true })).toBeVisible();

  // Launch it, then launching a quick setup over it asks for a second tap.
  await enc.locator('.lib li', { hasText: 'Patrouille de nuit' }).getByRole('button', { name: 'Lancer' }).click();
  let d = await save(page);
  expect(d.combat.combatants).toHaveLength(7);
  expect(d.combat.combatants.filter((x) => x.surprise)).toHaveLength(5); // the team + the allied Sentinelle
  await nav(page, 'MJ').click();
  const quai = page.locator('section.enc .presets li', { hasText: 'Quai' });
  await quai.getByRole('button', { name: 'Lancer' }).click();
  await expect(quai.getByRole('button', { name: 'Remplacer le combat en cours' })).toBeVisible();
  await quai.getByRole('button', { name: 'Remplacer le combat en cours' }).click();
  d = await save(page);
  expect(d.combat.mapId).toBe(d.campaign.maps.find((m) => m.name === 'Quai').id);

  // Export the library, delete the encounter, import it back.
  await nav(page, 'MJ').click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('section.enc').getByRole('button', { name: /^Exporter/ }).click()]);
  const file = await dl.path();
  const json = JSON.parse(readFileSync(file, 'utf8'));
  expect(json.encounters.map((e) => e.name)).toEqual(['Patrouille de nuit']);
  const row = page.locator('section.enc .lib li', { hasText: 'Patrouille de nuit' });
  await row.getByRole('button', { name: /Supprimer/ }).click();
  await row.getByRole('button', { name: /Toucher encore pour supprimer/ }).click();
  await expect(page.locator('section.enc .lib li', { hasText: 'Patrouille de nuit' })).toHaveCount(0);
  await page.locator('section.enc input[type=file]').setInputFiles(file);
  await expect(page.locator('section.enc .lib li', { hasText: 'Patrouille de nuit' })).toHaveCount(1);
  d = await save(page);
  expect(d.campaign.encounters[0]).toMatchObject({ name: 'Patrouille de nuit', tags: ['nuit', 'patrouille'], surprise: 'allies' });
  expect(errors).toEqual([]);
  await ctx.close();
});
