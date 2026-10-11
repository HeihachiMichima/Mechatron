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
      await expect(page.getByRole('heading', { name: 'Compagnon Mechatron' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await page.screenshot({ path: `e2e/screenshots/welcome-${w}-${theme}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Ouvrir la démo' }).click();
      await expect(page.locator('#app-nav')).toBeVisible();
      expect(await page.evaluate(() => typeof window.__mechatron?.setRng)).toBe('function');
      await page.screenshot({ path: `e2e/screenshots/etat-${w}-${theme}.png` });

      await page.locator('#app-nav button', { hasText: 'Combat' }).click();
      await expect(page.getByRole('button', { name: 'Initiative', exact: true })).toBeVisible();
      await page.screenshot({ path: `e2e/screenshots/combat-${w}-${theme}.png` });

      await page.getByRole('button', { name: 'Menu de la campagne' }).click();
      await expect(page.getByRole('button', { name: /Exporter la campagne/ })).toBeVisible();
      await page.waitForTimeout(350); // sheet animation
      await page.screenshot({ path: `e2e/screenshots/menu-${w}-${theme}.png` });
      await page.keyboard.press('Escape');

      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      expect(errors).toEqual([]);
      await ctx.close();
    });
  }
}

function watch(page) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

test('clean profile: welcome screen, then a new campaign with an empty team', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = watch(page);
  await page.addInitScript(() => { if (!sessionStorage.seeded) { localStorage.setItem('mechatron-roster-v3', '{"version":3,"chars":[]}'); sessionStorage.seeded = 1; } });
  await page.goto(url);

  await expect(page.getByRole('heading', { name: 'Nouvelle campagne' })).toBeVisible();
  // Nothing is saved while no campaign exists; old keys are gone.
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['mechatron-ui-v3']); // UI prefs only

  await page.getByLabel('Nom de la campagne').fill('Opération Test');
  await page.getByRole('button', { name: 'Créer la campagne' }).click();
  for (const tab of ['État', 'Programmes', 'Matériel', 'Robot']) {
    await page.locator('#app-nav button', { hasText: tab }).click();
    await expect(page.getByRole('heading', { name: 'Créez votre premier robot' })).toBeVisible();
  }
  await page.locator('#app-nav button', { hasText: 'Combat' }).click();
  await expect(page.getByText('Il faut au moins un allié et un ennemi.')).toBeVisible();
  await page.locator('#app-nav button', { hasText: 'Collectif' }).click();
  await expect(page.getByRole('heading', { name: 'Niveaux de développement' })).toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/empty-collectif-390.png' });

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
  const saved = await page.evaluate(() => JSON.parse(localStorage['mechatron-v3']));
  expect(saved.campaign.name).toBe('Opération Test');
  expect(saved.campaign.phase).toBe('creation');
  expect(saved.chars).toEqual([]);
  expect(saved.activeId).toBe(null);
  expect(saved.campaign.dev.Energie).toBe(50);

  // Reload: no welcome screen any more, and a startup backup exists.
  await page.reload();
  await expect(page.locator('#app-nav')).toBeVisible();
  expect(await page.evaluate(() => !!localStorage['mechatron-v3-backup-1'])).toBe(true);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('export the demo campaign, import it in a clean profile, restore a backup', async ({ browser }) => {
  const a = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const pa = await a.newPage();
  const errors = watch(pa);
  await pa.goto(url);
  await pa.getByRole('button', { name: 'Ouvrir la démo' }).click();
  await pa.getByRole('button', { name: 'Menu de la campagne' }).click();
  const [dl] = await Promise.all([pa.waitForEvent('download'), pa.getByRole('button', { name: /Exporter la campagne/ }).click()]);
  expect(dl.suggestedFilename()).toBe('demo.mechatron.json');
  const file = await dl.path();
  const exported = await pa.evaluate(() => JSON.parse(localStorage['mechatron-v3']));

  const b = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pb = await b.newPage();
  errors.push(...watch(pb));
  await pb.goto(url);
  await pb.locator('input[type=file]').setInputFiles(file);
  await expect(pb.locator('#app-nav')).toBeVisible();
  await pb.waitForTimeout(400);
  const imported = await pb.evaluate(() => JSON.parse(localStorage['mechatron-v3']));
  expect(imported.chars.map((c) => c.name)).toEqual(exported.chars.map((c) => c.name));
  expect(imported.campaign.name).toBe('Démo');

  // New campaign from the menu (backs up the demo), then restore the demo.
  await pb.getByRole('button', { name: 'Menu de la campagne' }).click();
  await pb.getByRole('button', { name: /Nouvelle campagne/ }).click();
  await pb.getByRole('button', { name: 'Remplacer' }).click();
  await expect(pb.getByRole('heading', { name: 'Créez votre premier robot' })).toBeVisible();
  await pb.getByRole('button', { name: 'Menu de la campagne' }).click();
  await pb.getByRole('button', { name: /Restaurer une sauvegarde/ }).click();
  await pb.waitForTimeout(350);
  await pb.screenshot({ path: 'e2e/screenshots/backups-1280.png' });
  await pb.getByRole('button', { name: 'Restaurer', exact: true }).first().click();
  await expect(pb.getByRole('button', { name: /Changer de robot \(7\)/ })).toBeVisible();
  expect(errors).toEqual([]);
  await a.close(); await b.close();
});
