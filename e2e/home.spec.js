// T17: the logo opens the home screen, « Reprendre », « Quitter la démo », the MJ
// switch in the top bar, the random nickname and the « Reset » label.
import { test, expect } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const url = pathToFileURL(fileURLToPath(new URL('../dist/index.html', import.meta.url))).href;
const nav = (page, label) => page.locator('#app-nav button', { hasText: label });

for (const { w, theme } of [{ w: 390, theme: 'dark' }, { w: 1280, theme: 'light' }]) {
  test(`home, resume, quit the demo (${w}px, ${theme})`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: theme });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url);
    await expect(page.getByText('Pas de sauvegarde serveur : exportez la campagne pour la stocker.')).toBeVisible();
    await expect(page.getByText("Créez les robots de l'équipe et c'est parti.")).toBeVisible();
    await page.getByRole('button', { name: 'Ouvrir la démo' }).click();

    // MJ switch in the top bar.
    await page.getByRole('switch', { name: 'Mode MJ' }).click();
    await expect(nav(page, 'MJ')).toHaveCount(1);

    // Logo → home, from another space; « Reprendre » goes back where we were.
    await nav(page, 'Marché').click();
    await page.getByRole('button', { name: 'Accueil' }).click();
    await expect(page.locator('.resume').getByRole('heading', { name: 'Démo' })).toBeVisible();
    await page.screenshot({ path: `e2e/screenshots/home-${w}-${theme}.png`, fullPage: w === 390 });
    await page.getByRole('button', { name: 'Reprendre la campagne' }).click();
    await expect(page.getByRole('heading', { name: /Aujourd'hui, jour/ })).toBeVisible();

    // Quit the demo from the menu: back to an empty home, nothing saved, demo in the backups.
    await page.getByRole('button', { name: 'Menu de la campagne' }).click();
    await page.getByRole('button', { name: /Quitter la démo/ }).click();
    await expect(page.getByRole('button', { name: 'Reprendre la campagne' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Nouvelle campagne' })).toBeVisible();
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => localStorage['mechatron-v3'] ?? null)).toBe(null);
    expect(JSON.parse(await page.evaluate(() => localStorage['mechatron-v3-backup-1'])).reason).toBe('Démo quittée');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Nouvelle campagne' })).toBeVisible();

    // A real campaign: no « Quitter la démo »; random nickname in the wizard; « Reset » in the roster.
    await page.getByLabel('Nom de la campagne').fill('Opération Noatun');
    await page.getByRole('button', { name: 'Créer la campagne' }).click();
    await page.getByRole('button', { name: 'Menu de la campagne' }).click();
    await expect(page.getByRole('button', { name: /Quitter la démo/ })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Nouveau robot' }).first().click();
    await page.locator('.models button, .model').first().click().catch(() => {});
    await page.getByRole('button', { name: /^Étape 2/ }).click();
    await page.getByRole('button', { name: 'Au hasard' }).click();
    expect((await page.getByLabel('Surnom').inputValue()).length).toBeGreaterThan(1);
    expect(errors).toEqual([]);
    await ctx.close();
  });
}

test('« Reset » keeps its confirmation', async ({ page }) => {
  await page.goto(url);
  await page.getByRole('button', { name: 'Ouvrir la démo' }).click();
  await nav(page, 'Combat').click();
  const reset = page.getByRole('button', { name: 'Reset', exact: true }).first();
  await reset.click();
  await expect(page.getByRole('button', { name: /Confirmer : tout remettre à neuf/ }).first()).toBeVisible();
});
