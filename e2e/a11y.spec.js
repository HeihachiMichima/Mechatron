// T16: accessibility checks on every space, at 390 and 1280 px, in both themes:
// every control has a name, every control offers a 44 px target (a ::before hit
// area counts; the LED segment cells are narrower by design, their ± stepper is the
// full-size control), and text contrast meets WCAG AA (4.5:1, 3:1 for large text).
import { test, expect } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
const url = pathToFileURL(fileURLToPath(new URL('../dist/index.html', import.meta.url))).href;
const AUDIT = () => {
  const out = { small: [], unnamed: [], contrast: [] };
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden]'); };
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  for (const el of document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=switch], [role=radio], [tabindex="0"]')) {
    if (!vis(el)) continue;
    const r0 = el.getBoundingClientRect();
    const pb = getComputedStyle(el, '::before');
    const grow = (v) => (pb.content !== 'none' && pb.position === 'absolute' && parseFloat(v) < 0 ? -parseFloat(v) : 0);
    const r = { width: r0.width + grow(pb.left) + grow(pb.right), height: r0.height + grow(pb.top) + grow(pb.bottom) };
    if (el.matches('input[type=checkbox], input[type=radio]')) {
      const lab = el.closest('label'); const lr = lab?.getBoundingClientRect();
      if (!lr || lr.height < 43.5 || lr.width < 43.5) out.small.push(`${el.tagName} checkbox in label ${Math.round(lr?.width || r.width)}×${Math.round(lr?.height || r.height)} "${label(lab || el)}"`);
    } else if ((r.height < 43.5 || (r.width < 43.5 && !el.matches('.seg button.cell'))) && !el.matches('svg')) out.small.push(`${el.tagName}.${(el.className?.baseVal ?? el.className).toString().split(' ')[0]} ${Math.round(r.width)}×${Math.round(r.height)} "${label(el)}"`);
    const name = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent.trim() || el.getAttribute('title') || el.closest('label')?.textContent.trim() || (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent) || el.getAttribute('placeholder');
    if (!name) out.unnamed.push(`${el.tagName}.${el.className} ${el.outerHTML.slice(0, 80)}`);
  }
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { let layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let base = { r: 255, g: 255, b: 255 }; for (const l of layers.reverse()) base = { r: l.r * l.a + base.r * (1 - l.a), g: l.g * l.a + base.g * (1 - l.a), b: l.b * l.a + base.b * (1 - l.a) }; return base; };
  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || el.closest('svg')) continue;
    const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
    if (!txt) continue;
    const cs = getComputedStyle(el);
    // Disabled controls are exempt (WCAG); faded text counts, blended by its opacity.
    if (el.closest(':disabled, [aria-disabled="true"]')) continue;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
    const fg = parse(cs.color); const bg = bgOf(el);
    const a = (fg.a ?? 1) * op; const f2 = { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a) };
    const L1 = lum(f2), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    const key = `${cs.color}|${Math.round(L2 * 1000)}|${el.className}`;
    if (ratio < need && !seen.has(key)) { seen.add(key); out.contrast.push(`${ratio.toFixed(2)} < ${need} "${txt.slice(0, 30)}" ${el.tagName}.${el.className} color=${cs.color}`); }
  }
  return out;
};
const screens = async (page) => {
  const nav = (l) => page.locator('#app-nav button', { hasText: l });
  const res = {};
  // Let entrance animations (toasts, sheets) finish before measuring.
  const grab = async (name) => { await page.waitForTimeout(450); res[name] = await page.evaluate(AUDIT); };
  await grab('welcome');
  await page.getByRole('button', { name: 'Ouvrir la démo' }).click();
  await page.evaluate(() => window.__mechatron.setRng(5)); // reproducible initiative and dice
  await page.getByRole('button', { name: 'Menu de la campagne' }).click();
  await page.getByRole('switch', { name: /Mode MJ/ }).click();
  await grab('menu');
  await page.keyboard.press('Escape');
  const sheet = async (name, open) => { await open(); await page.waitForTimeout(250); await grab(name); await page.keyboard.press('Escape'); await page.waitForTimeout(250); };
  for (const t of ['État', 'Programmes', 'Matériel', 'Identité']) { await page.getByRole('tab', { name: t }).or(page.getByRole('button', { name: t, exact: true })).first().click().catch(() => {}); await grab('equipe-' + t); }
  await page.getByRole('tab', { name: 'État' }).or(page.getByRole('button', { name: 'État', exact: true })).first().click();
  await sheet('sheet-damage', () => page.getByRole('button', { name: 'Subir des dégâts' }).click());
  await sheet('sheet-roster', () => page.getByRole('button', { name: /^Gérer/ }).first().click());
  await page.getByRole('button', { name: 'Nouveau robot joueur' }).click();
  await grab('wizard-model');
  await page.getByRole('button', { name: 'Abandonner' }).click();
  for (const s of ['Énergie', 'Marché', 'Séance', 'MJ']) { await nav(s).click(); await grab(s); }
  for (const d of await page.locator('details').all()) await d.evaluate((e) => (e.open = true));
  await grab('MJ-details');
  await sheet('sheet-templates', () => page.getByRole('button', { name: 'Nouveau PNJ' }).click());
  await page.locator('section.enc .presets li').first().getByRole('button', { name: 'Lancer' }).click();
  await grab('combat-prep');
  await page.getByRole('button', { name: 'Initiative', exact: true }).last().click();
  await grab('combat-init');
  await page.getByRole('button', { name: /^Lancer pour/ }).first().click();
  await page.getByRole('button', { name: /^Commencer le combat/ }).click();
  await grab('combat-fight');
  await page.locator('section.turn').getByRole('button', { name: /^Tirer|^Corps à corps/ }).first().click();
  await grab('combat-setup');
  await nav('MJ').click();
  await page.locator('section.enc').getByRole('button', { name: 'Nouvelle rencontre' }).click();
  await page.getByRole('button', { name: 'Ajouter des PNJ' }).click();
  await grab('encounter-editor');
  await page.getByRole('button', { name: 'Terminé' }).click();
  await page.locator('.mrow').first().getByRole('button', { name: 'Modifier' }).click();
  await grab('map-editor');
  return res;
};
for (const theme of ['dark', 'light']) for (const w of [390, 1280]) test(`names, 44 px targets and contrast (${w}px, ${theme})`, async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: theme });
  const page = await ctx.newPage();
  await page.goto(url);
  const res = await screens(page);
  const all = (k) => Object.entries(res).flatMap(([screen, r]) => r[k].map((x) => `${screen}: ${x}`));
  expect(all('unnamed')).toEqual([]);
  expect(all('small')).toEqual([]);
  expect(all('contrast')).toEqual([]);
  await ctx.close();
});

test('enlarged hit areas never cover a neighbouring control', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(url);
  await page.getByRole('button', { name: 'Ouvrir la démo' }).click();
  // Compact steppers: each edge of « − » and « + » still belongs to its own button.
  const res = await page.evaluate(() => [...document.querySelectorAll('.stepper')].flatMap((st) => {
    const [minus, plus] = st.querySelectorAll('button');
    const out = [];
    for (const b of [minus, plus]) {
      const r = b.getBoundingClientRect();
      for (const x of [r.left + 1, r.right - 1]) {
        const hit = document.elementFromPoint(x, r.top + r.height / 2)?.closest('button');
        if (hit && hit !== b && (hit === minus || hit === plus)) out.push(`${b.getAttribute('aria-label')} at x=${Math.round(x)} → ${hit.getAttribute('aria-label')}`);
      }
    }
    return out;
  }));
  expect(res).toEqual([]);
  // Chips: the visible part of a chip is never covered by another control's hit area.
  const chips = await page.evaluate(() => [...document.querySelectorAll('.chip')].flatMap((c) => {
    const r = c.getBoundingClientRect();
    if (!r.width) return [];
    return [[r.left + r.width / 2, r.top + 1], [r.left + r.width / 2, r.bottom - 1]]
      .map(([x, y]) => document.elementFromPoint(x, y)?.closest('button, a, input, select'))
      .filter((h) => h && h !== c).map((h) => `${c.textContent.trim()} covered by ${h.textContent.trim() || h.getAttribute('aria-label')}`);
  }));
  expect(chips).toEqual([]);
});
