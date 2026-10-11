// T11: the end-of-session wizard, the GM's XP rules and spending XP.
import { test, expect } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const url = pathToFileURL(fileURLToPath(new URL('../dist/index.html', import.meta.url))).href;
const nav = (page, label) => page.locator('#app-nav button', { hasText: label });
const save = (page) => page.waitForTimeout(400).then(() => page.evaluate(() => JSON.parse(localStorage['mechatron-v3'])));

for (const { w, h, theme } of [{ w: 390, h: 844, theme: 'dark' }, { w: 1280, h: 900, theme: 'light' }]) {
  test(`end of session for the whole team, then spending XP (${w}px, ${theme})`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url);
    await page.getByRole('button', { name: 'Ouvrir la démo' }).click();

    // GM: the « binôme » question is worth 2 XP this campaign.
    await page.getByRole('button', { name: 'Menu de la campagne' }).click();
    await page.getByRole('switch', { name: /Mode MJ/ }).click();
    await page.keyboard.press('Escape');
    await nav(page, 'MJ').click();
    await page.getByRole('button', { name: 'Augmenter PX de la question 3' }).click();
    await page.screenshot({ path: `e2e/screenshots/xp-rules-${w}-${theme}.png` });

    await nav(page, 'Séance').click();
    await page.getByRole('button', { name: 'Terminer la séance' }).click();
    await expect(page.getByRole('heading', { name: 'Fin de séance', level: 1 })).toBeVisible();
    const brise = page.locator('section.robot', { hasText: 'Brise-Fer' });
    await expect(brise.getByRole('checkbox', { name: /participé/ })).toBeChecked();
    await brise.getByRole('checkbox', { name: /binôme/ }).check();
    await expect(brise.locator('.tot')).toHaveText('+3 PX'); // 1 + 2
    await page.screenshot({ path: `e2e/screenshots/session-xp-${w}-${theme}.png`, fullPage: w === 390 });
    await page.getByRole('button', { name: /Suivant/ }).click();

    await page.evaluate(() => window.__mechatron.setRng(3));
    await page.getByRole('button', { name: /Lancer 1D6 par niveau/ }).click();
    await page.screenshot({ path: `e2e/screenshots/session-dev-${w}-${theme}.png` });
    await page.getByRole('button', { name: /Suivant/ }).click();
    await page.locator('section.robot', { hasText: 'Brise-Fer' }).getByLabel('Mon grand rêve').fill('Revoir le soleil');
    await page.getByRole('button', { name: /Suivant/ }).click();
    await expect(page.getByText(/Brise-Fer BTL-07 \+3 PX/)).toBeVisible();
    await page.getByRole('button', { name: 'Terminer la séance' }).click();
    await expect(page.getByRole('heading', { name: 'Séance terminée' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Exporter la campagne' })).toBeVisible();

    let d = await save(page);
    expect(d.chars.filter((c) => c.kind !== 'npc').map((c) => c.xp.current)).toEqual([3, 1, 1, 1]);
    expect(d.chars[0].dream).toBe('Revoir le soleil');
    expect(Object.values(d.campaign.dev).every((v) => v < 50)).toBe(true);
    expect(d.campaign.xp.log).toHaveLength(1);
    expect(d.campaign.journal.at(-1).text.split('\n')[0]).toBe('Fin de séance 1');
    expect(await page.evaluate(() => !!localStorage['mechatron-v3-backup-1'])).toBe(true);
    await page.getByRole('button', { name: 'Fermer' }).click();
    await expect(page.getByRole('heading', { name: 'Séances' })).toBeVisible();

    // Spend XP: the GM sets a program +1 to 3 XP; Brise-Fer raises Tir 3 → 4.
    await nav(page, 'MJ').click();
    for (let i = 0; i < 2; i++) await page.getByRole('button', { name: "Diminuer Coût d'un programme +1" }).click();
    await nav(page, 'Séance').click();
    await page.locator('li.xp', { hasText: 'Brise-Fer' }).getByRole('button', { name: 'Dépenser' }).click();
    await page.getByRole('dialog').locator('li', { hasText: /^Tir/ }).getByRole('button', { name: 'Monter' }).click();
    d = await save(page);
    expect([d.chars[0].programRatings.tir, d.chars[0].xp.current]).toEqual([4, 0]);
    expect(d.campaign.xp.spent.at(-1)).toMatchObject({ what: 'Tir 4', cost: 3 });
    await page.screenshot({ path: `e2e/screenshots/xp-spend-${w}-${theme}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);
    await ctx.close();
  });
}
