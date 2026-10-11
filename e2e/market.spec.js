// T09: the GM's market editor (MJ space) and the open catalog (Marché space).
import { test, expect } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const url = pathToFileURL(fileURLToPath(new URL('../dist/index.html', import.meta.url))).href;
const nav = (page, label) => page.locator('#app-nav button', { hasText: label });
const save = (page) => page.waitForTimeout(400).then(() => page.evaluate(() => JSON.parse(localStorage['mechatron-v3'])));

for (const { w, h, theme } of [{ w: 390, h: 844, theme: 'dark' }, { w: 1280, h: 900, theme: 'light' }]) {
  test(`the GM edits prices, rarity, stock and adds an item (${w}px, ${theme})`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url);
    await page.getByRole('button', { name: 'Ouvrir la démo' }).click();
    await nav(page, 'Marché').click();
    await expect(page.getByRole('heading', { name: 'Modules' })).toBeVisible();
    await expect(page.locator('li', { hasText: 'Pistolet laser' }).first()).toContainText('2 PE'); // p.234
    await page.screenshot({ path: `e2e/screenshots/market-catalog-${w}-${theme}.png` });

    await page.getByRole('button', { name: 'Menu de la campagne' }).click();
    await page.getByRole('switch', { name: /Mode MJ/ }).click();
    await page.keyboard.press('Escape');
    await nav(page, 'MJ').click();
    await expect(page.getByRole('heading', { name: 'Marché noir' })).toBeVisible();
    await page.getByRole('searchbox', { name: 'Rechercher un objet' }).fill('jetpack');
    const row = page.locator('.rows li', { hasText: 'Jetpack' });
    await expect(row.getByText('livre p.234')).toBeVisible();
    await row.getByLabel('Prix de Jetpack en PE').fill('7');
    await row.getByLabel('Prix de Jetpack en PE').press('Tab');
    await expect(row.getByText('règle maison (livre : 5)')).toBeVisible();
    await row.getByLabel('Rareté de Jetpack').selectOption('unique');
    await row.getByLabel('Stock de Jetpack').fill('1');
    await row.getByLabel('Stock de Jetpack').press('Tab');
    await page.getByRole('searchbox', { name: 'Rechercher un objet' }).fill('banque');
    await expect(page.locator('.rows li', { hasText: "Banque d'énergie" }).getByText('prix à fixer')).toBeVisible();
    await page.getByLabel("Nom de l'objet perso").fill('Huile de luxe');
    await page.getByLabel("Prix de l'objet perso").fill('3');
    await page.getByRole('button', { name: 'Ajouter un objet perso' }).click();
    await page.getByRole('searchbox', { name: 'Rechercher un objet' }).fill('');
    await page.screenshot({ path: `e2e/screenshots/market-editor-${w}-${theme}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);

    const d = await save(page);
    const jet = d.campaign.market.listings.find((l) => l.ref === 'Jetpack');
    expect([jet.price, jet.rarity, jet.stock]).toEqual([7, 'unique', 1]);
    expect(d.campaign.market.listings.at(-1)).toMatchObject({ kind: 'custom', custom: 'Huile de luxe', price: 3 });

    // Close the market: players see it closed.
    await page.getByRole('heading', { name: 'Marché noir' }).locator('..').getByText('Ouvert').click();
    await nav(page, 'Marché').click();
    await expect(page.getByText('Le MJ a fermé le marché noir pour le moment.')).toBeVisible();
    await page.reload();
    expect((await save(page)).campaign.market.open).toBe(false);
    expect(errors).toEqual([]);
    await ctx.close();
  });
}
