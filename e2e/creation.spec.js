// T06: the creation wizard end to end, then the « équipe prête » gate.
// Screenshots of every step in e2e/screenshots/wizard-*.png.
import { test, expect } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const url = pathToFileURL(fileURLToPath(new URL('../dist/index.html', import.meta.url))).href;
const nav = (page, label) => page.locator('#app-nav button', { hasText: label });

function watch(page) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth).then((v) => expect(v).toBe(false));

async function newCampaign(page) {
  await page.goto(url);
  await page.getByLabel('Nom de la campagne').fill('Le fantôme');
  await page.getByRole('button', { name: 'Créer la campagne' }).click();
}

for (const { w, h, theme } of [{ w: 390, h: 844, theme: 'dark' }, { w: 1280, h: 900, theme: 'light' }]) {
  test(`the wizard builds a robot step by step (${w}px, ${theme})`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
    const page = await ctx.newPage();
    const errors = watch(page);
    await newCampaign(page);
    const next = page.getByRole('button', { name: 'Suivant' });
    const shot = async (n) => { await noHScroll(page); await page.screenshot({ path: `e2e/screenshots/wizard-${n}-${w}-${theme}.png`, fullPage: w === 390 }); };

    await page.getByRole('button', { name: 'Nouveau robot', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nouveau robot' })).toBeVisible();
    await expect(next).toBeDisabled();
    await expect(page.getByText('Choisissez un modèle.')).toBeVisible();
    await page.getByRole('button', { name: /^Robot industriel/ }).click();
    await shot('1-modele');
    await next.click();

    await page.getByLabel('Surnom').fill('Rani');
    await page.getByRole('button', { name: 'Générer' }).click();
    await expect(page.getByLabel('Numéro de série')).toHaveValue(/^[A-Z]{3}-\d{3}$/);
    await page.getByLabel('Numéro de série').fill('NON-836');
    await page.getByLabel('Joueur ou joueuse').fill('Johanna');
    await shot('2-nom');
    await next.click();

    // The book's example (p.18): Odessa Vega 1.5, Modessi RK « Una », LBM Dyno-Q.
    await page.getByRole('radio', { name: /^Odessa Vega 1\.5/ }).click();
    await page.getByRole('radio', { name: /^Modessi RK/ }).click();
    await page.getByRole('radio', { name: /^LBM Dyno-Q/ }).click();
    await expect(page.locator('.totals')).toContainText('5'); // Servos 5
    await shot('3-chassis');
    await next.click();

    // Programs (p.21): Manufacture 3, Move 2, Assault 2, Interact 1, Question 1, Repair 1.
    await expect(next).toBeDisabled();
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Augmenter Fabriquer' }).click();
    await expect(page.getByRole('button', { name: 'Augmenter Fabriquer' })).toBeDisabled(); // max 3
    for (const [l, n] of [['Déplacement', 2], ['Assaut', 2], ['Interaction', 1], ['Contestation', 1]]) for (let i = 0; i < n; i++) await page.getByRole('button', { name: `Augmenter ${l}` }).click();
    await expect(page.getByText('Il reste 1 point à répartir.')).toBeVisible();
    await page.getByRole('button', { name: 'Augmenter Réparation' }).click();
    await page.getByRole('button', { name: 'Augmenter Force' }).click();
    await expect(page.getByText('1 point de trop.')).toBeVisible();
    await expect(next).toBeDisabled();
    await page.getByRole('button', { name: 'Diminuer Force' }).click();
    await shot('4-programmes');
    await next.click();

    await page.getByRole('radio', { name: /^Production de masse/ }).click();
    await shot('5-fonction');
    await next.click();

    await page.getByRole('button', { name: /^Système de câbles/ }).click();
    await page.getByRole('button', { name: /^Tronçonneuse/ }).click();
    await expect(page.getByRole('button', { name: /^Jetpack/ })).toBeDisabled(); // 2 slots
    await shot('6-modules');
    await next.click();

    await expect(page.getByText('Fer à souder laser')).toBeVisible();
    await expect(page.getByText(/Énergie de départ : 5 PE/)).toBeVisible();
    await shot('7-equipement');
    await next.click();

    await page.getByLabel(/Mon grand rêve/).fill('Devenir un petit rouage utile');
    await shot('8-relations');
    await next.click();

    await expect(page.getByText('Rani NON-836, joué par Johanna')).toBeVisible();
    await shot('9-recap');
    await page.getByRole('button', { name: 'Créer le robot' }).click();

    await expect(page.locator('.plate')).toBeVisible();
    await expect(page.locator('.pctabs .tab.active')).toContainText('Rani');
    await page.waitForTimeout(400);
    const saved = await page.evaluate(() => JSON.parse(localStorage['mechatron-v3']));
    const r = saved.chars[0];
    expect([r.name, r.model, r.head, r.torso, r.undercarriage, r.specialRating, r.secondary, r.modules, r.ep.current]).toEqual(
      ['Rani NON-836', 'industrial', 'Odessa Vega 1.5', 'Modessi RK "Una"', 'LBM Dyno-Q', 3, ['Production de masse'], ['Système de câbles', 'Tronçonneuse'], 5]);
    expect(r.weapons.map((x) => x.name)).toEqual(['Fer à souder laser']);
    expect(r.equipment.map((x) => x.name)).toEqual(['Outil électrique', 'E-pack']);
    expect(errors).toEqual([]);
    await ctx.close();
  });
}

test('a second robot cannot take the first one\'s parts or modules; the GM opens the game', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = watch(page);
  await page.goto(url);
  await page.getByRole('button', { name: 'Ouvrir la démo' }).click();
  // The demo is already in play: reopen the creation in GM mode.
  await page.getByRole('button', { name: 'Menu de la campagne' }).click();
  await page.getByRole('switch', { name: /Mode MJ/ }).click();
  await page.keyboard.press('Escape');
  await nav(page, 'MJ').click();
  await page.getByRole('button', { name: 'Rouvrir la création' }).click();
  await page.getByRole('button', { name: /Toucher encore/ }).click();
  await expect(page.getByRole('heading', { name: "Création de l'équipe" })).toBeVisible();
  await nav(page, 'Marché').click();
  await expect(page.getByText("Le marché noir ouvre une fois l'équipe créée.")).toBeVisible();

  // Outside GM mode, a part another PC has is unavailable; Scrap parts stay free.
  await page.getByRole('button', { name: 'Menu de la campagne' }).click();
  await page.getByRole('switch', { name: /Mode MJ/ }).click();
  await page.keyboard.press('Escape');
  await nav(page, 'Équipe').click();
  await page.getByRole('button', { name: 'Nouveau robot joueur' }).click();
  await page.getByRole('button', { name: /^Robot de sécurité/ }).click();
  await page.getByRole('button', { name: 'Suivant' }).click();
  await page.getByLabel('Surnom').fill('Verrou');
  await page.getByRole('button', { name: 'Suivant' }).click();
  await expect(page.getByRole('radio', { name: /^Pashin Ama 9.*pris par Brise-Fer/ })).toBeDisabled();
  await expect(page.getByRole('radio', { name: /^Scrap Head/ })).toBeEnabled();
  await page.screenshot({ path: 'e2e/screenshots/wizard-taken-390.png', fullPage: true });
  await page.getByRole('button', { name: 'Abandonner' }).click();
  await page.getByRole('button', { name: /Toucher encore pour abandonner/ }).click();
  await expect(page.locator('.plate')).toBeVisible();

  // GM: « L'équipe est prête » opens the market.
  await page.getByRole('button', { name: 'Menu de la campagne' }).click();
  await page.getByRole('switch', { name: /Mode MJ/ }).click();
  await page.keyboard.press('Escape');
  await nav(page, 'MJ').click();
  await page.screenshot({ path: 'e2e/screenshots/gate-390.png', fullPage: true });
  await page.getByRole('button', { name: "L'équipe est prête" }).click();
  await expect(page.getByRole('heading', { name: 'Partie en cours' })).toBeVisible();
  await nav(page, 'Marché').click();
  await expect(page.getByRole('heading', { name: /Aujourd'hui, jour/ })).toBeVisible(); // the market is open
  await page.waitForTimeout(400);
  const saved = await page.evaluate(() => JSON.parse(localStorage['mechatron-v3']));
  expect(saved.campaign.phase).toBe('play');
  expect(saved.campaign.journal.at(-1).text).toMatch(/L'équipe est prête/);
  expect(errors).toEqual([]);
  await ctx.close();
});
