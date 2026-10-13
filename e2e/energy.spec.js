// T08: the Énergie space runs a whole day for the team in 3 taps; undo reverts one step.
import { test, expect } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const url = pathToFileURL(fileURLToPath(new URL('../dist/index.html', import.meta.url))).href;
const nav = (page, label) => page.locator('#app-nav button', { hasText: label });
const save = (page) => page.waitForTimeout(400).then(() => page.evaluate(() => JSON.parse(localStorage['mechatron-v3'])));
const pcEp = (d) => d.chars.filter((c) => c.kind !== 'npc').map((c) => c.ep.current);

for (const { w, h, theme } of [{ w: 390, h: 844, theme: 'dark' }, { w: 1280, h: 900, theme: 'light' }]) {
  test(`a day, a night and a morning in 3 taps (${w}px, ${theme})`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(url);
    await page.getByRole('button', { name: 'Ouvrir la démo' }).click();
    await nav(page, 'Énergie').click();
    await expect(page.getByRole('heading', { name: 'Jour 1' })).toBeVisible();
    const start = pcEp(await save(page)); // demo: 5 EP each (Clou is a Scrap Robot)
    await page.screenshot({ path: `e2e/screenshots/energy-day-${w}-${theme}.png`, fullPage: w === 390 });

    await page.getByRole('button', { name: /Terminer la journée/ }).click(); // tap 1
    expect(pcEp(await save(page))).toEqual(start.map((x) => x - 1));
    await expect(page.getByRole('heading', { name: /Jour 1, soir/ })).toBeVisible();
    await expect(page.getByLabel('Pas de borne')).toBeChecked(); // the Scrap Robot
    await page.screenshot({ path: `e2e/screenshots/energy-night-${w}-${theme}.png`, fullPage: w === 390 });

    await page.getByRole('button', { name: /Recharger pour la nuit/ }).click(); // tap 2
    const charged = await save(page);
    const scrap = charged.chars.findIndex((c) => c.model === 'scrap');
    expect(pcEp(charged).filter((_, i) => i !== scrap)).toEqual([5, 5, 5]); // back to the ration
    expect(pcEp(charged)[scrap]).toBe(start[scrap] - 1); // no base station
    await expect(page.getByRole('heading', { name: /Jour 1, nuit/ })).toBeVisible();
    await page.screenshot({ path: `e2e/screenshots/energy-report-${w}-${theme}.png`, fullPage: w === 390 });

    // Undo reverts the whole night charge, then redo it.
    await page.getByRole('button', { name: 'Annuler' }).click();
    expect(pcEp(await save(page))).toEqual(start.map((x) => x - 1));
    await expect(page.getByRole('button', { name: /Recharger pour la nuit/ })).toBeVisible();
    await page.getByRole('button', { name: /Recharger pour la nuit/ }).click();

    await page.getByRole('button', { name: /Nouveau jour/ }).click(); // tap 3
    await expect(page.getByRole('heading', { name: 'Jour 2' })).toBeVisible();
    const d = await save(page);
    expect(d.campaign.clock).toMatchObject({ day: 2, phase: 'day' });
    expect(d.campaign.journal.map((j) => j.text.split('\n')[0])).toEqual(expect.arrayContaining(['Jour 1, soir : consommation quotidienne', 'Jour 1, nuit : recharge', 'Jour 2 : nouvelle journée']));
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);
    await ctx.close();
  });
}

test('transfers, the GM rules and the fiche without « Nouveau jour »', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url);
  await page.getByRole('button', { name: 'Ouvrir la démo' }).click();
  await expect(page.getByRole('button', { name: /Nouveau jour/ })).toHaveCount(0); // État
  await nav(page, 'Énergie').click();
  const panel = page.locator('section', { has: page.getByRole('heading', { name: 'Donner des PE' }) });
  await panel.getByLabel('De').selectOption({ index: 0 });
  await panel.getByRole('button', { name: /Donner 1 PE/ }).click();
  let d = await save(page);
  expect(pcEp(d)).toEqual([4, 6, 5, 5]);
  // E-pack (Brise-Fer carries one): +D6, then gone.
  await page.evaluate(() => window.__mechatron.setRng(7));
  await page.getByRole('button', { name: /Brise-Fer.*vider E-pack/ }).click();
  d = await save(page);
  expect(d.chars[0].equipment.map((e) => e.name)).not.toContain('E-pack');
  // GM rules: ration override, then reset.
  await page.getByRole('switch', { name: /Mode MJ/ }).click();
  await nav(page, 'Énergie').click();
  await page.getByText("Règles de l'énergie").click();
  await page.getByRole('button', { name: 'Augmenter Rationnement' }).click();
  await expect(page.getByText('réglé par le MJ')).toBeVisible();
  d = await save(page);
  expect(d.campaign.rules.energy.overrideRation).toBe(6);
  await page.screenshot({ path: 'e2e/screenshots/energy-rules-390.png', fullPage: true });
  await page.getByRole('listitem').filter({ hasText: 'Rationnement' }).getByRole('button', { name: 'Réinitialiser' }).click();
  d = await save(page);
  expect(d.campaign.rules.energy).toBeUndefined();
  expect(errors).toEqual([]);
  await ctx.close();
});
