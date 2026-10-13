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
    await expect(page.getByRole('heading', { name: /Aujourd'hui, jour/ })).toBeVisible();
    await page.getByRole('button', { name: /^Armes/ }).click().catch(() => {}); // open the group if closed
    await expect(page.locator('li.item', { has: page.locator('.cn', { hasText: /^Pistolet laser$/ }) })).toContainText('2 PE'); // p.234
    await page.screenshot({ path: `e2e/screenshots/market-catalog-${w}-${theme}.png` });

    await page.getByRole('switch', { name: /Mode MJ/ }).click();
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

test('T10: buy, blocked purchases, undo, sell, and the GM forcing an item in', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url);
  await page.getByRole('button', { name: 'Ouvrir la démo' }).click();
  await nav(page, 'Marché').click();
  await expect(page.getByRole('radio', { name: /Brise-Fer/ })).toHaveAttribute('aria-checked', 'true');
  const card = (name) => page.locator('li.item', { has: page.locator('.cn', { hasText: new RegExp(`^${name}$`) }) });
  const details = async (name) => { const b = card(name).locator('button.nm'); if ((await b.getAttribute('aria-expanded')) !== 'true') await b.click(); };
  const group = async (label) => { const g = page.getByRole('button', { name: new RegExp(`^${label}`) }); if ((await g.getAttribute('aria-expanded')) !== 'true') await g.click(); };
  await group('Armes');

  // A common weapon is always on sale: Brise-Fer (5 EP) buys a laser pistol for 2 EP.
  await details('Pistolet laser');
  await expect(card('Pistolet laser')).toContainText('Brise-Fer BTL-07 a : Pistolet laser');
  await card('Pistolet laser').getByRole('button', { name: 'Acheter' }).click();
  let d = await save(page);
  expect(d.chars[0].ep.current).toBe(3);
  expect(d.chars[0].weapons.map((w) => w.name)).toEqual(['Pistolet laser', 'Pistolet laser']);
  expect(d.campaign.market.ledger.at(-1)).toMatchObject({ type: 'buy', name: 'Pistolet laser', price: 2 });
  // Undo restores EP and inventory.
  await page.getByRole('button', { name: 'Annuler' }).click();
  d = await save(page);
  expect([d.chars[0].ep.current, d.chars[0].weapons.length, d.campaign.market.ledger.length]).toEqual([5, 1, 0]);

  // Not enough EP: the plasma rifle costs 7.
  await expect(card('Fusil à plasma').getByRole('button', { name: 'Acheter' })).toBeDisabled();
  await expect(card('Fusil à plasma')).toContainText('Pas assez de PE : il en faut 7, Brise-Fer BTL-07 en a 5.');

  // GM mode: force a rare module in. Brise-Fer has no free slot; Clou (6 slots) buys it.
  await page.getByRole('switch', { name: /Mode MJ/ }).click();
  await nav(page, 'Marché').click();
  await page.getByLabel('Tout le catalogue (MJ)').check();
  await group('Modules');
  await details('Jetpack');
  await card('Jetpack').getByLabel('Disponibilité de Jetpack').selectOption('in');
  await expect(card('Jetpack')).toContainText('Aucun emplacement libre (3 sur 3 pris).');
  await page.getByRole('radio', { name: /Clou/ }).click();
  await card('Jetpack').getByRole('button', { name: 'Acheter' }).click();
  d = await save(page);
  const clou = d.chars.find((c) => c.name === 'Clou SCR-311');
  expect([clou.ep.current, clou.modules.includes('Jetpack')]).toEqual([0, true]);
  await page.screenshot({ path: 'e2e/screenshots/market-shop-gm-390.png', fullPage: true });

  // Sell it back: half of 5 = 3 EP (house rule).
  await page.locator('.sells li', { hasText: 'Jetpack' }).getByRole('button', { name: /Vendre/ }).click();
  d = await save(page);
  expect(d.chars.find((c) => c.name === 'Clou SCR-311').ep.current).toBe(3);
  expect(d.campaign.market.ledger.at(-1)).toMatchObject({ type: 'sell', name: 'Jetpack', price: 3 });

  // Players don't see hidden items.
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  expect(errors).toEqual([]);
  await ctx.close();
});
