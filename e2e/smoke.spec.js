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
