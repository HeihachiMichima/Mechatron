// T16: home-screen install and the size budget. The manifest is only linked when
// the page is served over http(s) (GitHub Pages); by double-click it isn't.
import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, extname } from 'node:path';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const TYPES = { '.html': 'text/html', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };

test('the single file stays under the 900 kB budget', () => {
  const size = statSync(join(dist, 'index.html')).size;
  console.log(`dist/index.html: ${(size / 1000).toFixed(1)} kB`);
  expect(size).toBeLessThan(900_000);
});

test('served over http: manifest and icons are reachable, no console error', async ({ page }) => {
  const server = createServer((req, res) => {
    const path = join(dist, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!path.startsWith(dist) || !existsSync(path)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' }).end(readFileSync(path));
  });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base);
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await page.request.get(base + href)).json();
  expect(manifest).toMatchObject({ name: 'Compagnon Mechatron', short_name: 'Mechatron', display: 'standalone', lang: 'fr', start_url: './' });
  expect(manifest.icons.map((i) => i.sizes)).toEqual(['192x192', '512x512', '512x512']);
  expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  for (const src of [...manifest.icons.map((i) => i.src), await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')]) {
    const r = await page.request.get(base + src);
    expect(r.status(), src).toBe(200);
    expect(r.headers()['content-type']).toBe('image/png');
  }
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
  server.close();
});

test('opened by double-click: no manifest link, no error', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(pathToFileURL(join(dist, 'index.html')).href);
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
});
