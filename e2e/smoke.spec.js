// Smoke test: the built app loads with no console error, at phone and desktop
// widths, in both themes. Screenshots land in e2e/screenshots/ (git-ignored).
import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dist = fileURLToPath(new URL('../dist/index.html', import.meta.url));
const url = pathToFileURL(dist).href;

const sizes = [{ w: 390, h: 844 }, { w: 1280, h: 900 }];
const themes = ['dark', 'light'];

test.beforeAll(() => {
  if (!existsSync(dist)) throw new Error('dist/index.html is missing: run `npm run build` first.');
});

for (const { w, h } of sizes) {
  for (const theme of themes) {
    test(`loads cleanly at ${w}px, ${theme} theme`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(String(e)));

      await page.goto(url);
      await expect(page).toHaveTitle('Compagnon Mechatron');
      await expect(page.locator('#app-nav')).toBeVisible();
      expect(await page.evaluate(() => typeof window.__mechatron?.setRng)).toBe('function');
      await page.screenshot({ path: `e2e/screenshots/etat-${w}-${theme}.png` });

      await page.locator('#app-nav button', { hasText: 'Combat' }).click();
      await expect(page.getByRole('button', { name: 'Initiative', exact: true })).toBeVisible();
      await page.screenshot({ path: `e2e/screenshots/combat-${w}-${theme}.png` });

      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      expect(errors).toEqual([]);
      await ctx.close();
    });
  }
}

test('clean profile: no robot, an empty state on every tab, old keys removed', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => { if (!sessionStorage.seeded) { localStorage.setItem('mechatron-roster-v3', '{"version":3,"chars":[]}'); sessionStorage.seeded = 1; } });
  await page.goto(url);

  for (const tab of ['État', 'Programmes', 'Matériel', 'Robot']) {
    await page.locator('#app-nav button', { hasText: tab }).click();
    await expect(page.getByRole('heading', { name: 'Créez votre premier robot' })).toBeVisible();
  }
  await page.locator('#app-nav button', { hasText: 'Combat' }).click();
  await expect(page.getByText('Il faut au moins un allié et un ennemi.')).toBeVisible();
  await page.locator('#app-nav button', { hasText: 'Collectif' }).click();
  await expect(page.getByRole('heading', { name: 'Niveaux de développement' })).toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/empty-collectif-390.png' });
  await page.getByRole('button', { name: 'Exporter' }).click();
  await expect(page.getByText('Aucun robot pour l’instant')).toBeVisible();
  await page.keyboard.press('Escape');

  // Create a robot, then delete it: the team is empty again.
  await page.locator('#app-nav button', { hasText: 'État' }).click();
  await page.getByRole('button', { name: 'Nouveau robot', exact: true }).click();
  await expect(page.locator('.plate')).toBeVisible();
  await page.getByRole('button', { name: /Changer de robot/ }).click();
  await page.getByRole('button', { name: /Supprimer/ }).click();
  await page.getByRole('button', { name: /Supprimer/ }).click();
  await page.keyboard.press('Escape');
  await page.locator('#app-nav button', { hasText: 'État' }).click();
  await expect(page.getByRole('heading', { name: 'Créez votre premier robot' })).toBeVisible();

  await page.waitForTimeout(400); // debounced autosave
  const keys = await page.evaluate(() => Object.keys(localStorage).sort());
  expect(keys).toContain('mechatron-v3');
  expect(keys).not.toContain('mechatron-roster-v3');
  const saved = await page.evaluate(() => JSON.parse(localStorage['mechatron-v3']));
  expect(saved.chars).toEqual([]);
  expect(saved.activeId).toBe(null);
  expect(saved.campaign.dev.Energie).toBe(50);
  expect(errors).toEqual([]);
  await ctx.close();
});
