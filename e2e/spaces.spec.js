// T05: navigation by spaces, « Mode MJ », and every v2.3.6 feature within 2 taps
// of the Équipe home (État tab). Screenshots of each space in e2e/screenshots/.
import { test, expect } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const url = pathToFileURL(fileURLToPath(new URL('../dist/index.html', import.meta.url))).href;

function watch(page) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth).then((v) => expect(v).toBe(false));
const nav = (page, label) => page.locator('#app-nav button', { hasText: label });
async function setGm(page, on) {
  await page.getByRole('button', { name: 'Menu de la campagne' }).click();
  const sw = page.getByRole('switch', { name: /Mode MJ/ });
  if ((await sw.getAttribute('aria-checked')) !== String(on)) await sw.click();
  await page.keyboard.press('Escape');
}

for (const { w, h } of [{ w: 390, h: 844 }, { w: 1280, h: 900 }]) {
  for (const theme of ['dark', 'light']) {
    test(`every space at ${w}px, ${theme} theme`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
      const page = await ctx.newPage();
      const errors = watch(page);
      await page.goto(url);
      await page.getByRole('button', { name: 'Ouvrir la démo' }).click();
      await setGm(page, true);
      const shots = [['Équipe', 'equipe'], ['Énergie', 'energie'], ['Marché', 'marche'], ['Combat', 'combat'], ['Séance', 'seance'], ['MJ', 'mj']];
      for (const [label, file] of shots) {
        await nav(page, label).click();
        await page.waitForTimeout(150);
        await noHScroll(page);
        await page.screenshot({ path: `e2e/screenshots/space-${file}-${w}-${theme}.png` });
      }
      await page.locator('button.main', { hasText: 'Unité Sentinelle' }).click();
      await expect(page.getByRole('button', { name: 'Tous les PNJ' })).toBeVisible();
      await page.screenshot({ path: `e2e/screenshots/space-mj-fiche-${w}-${theme}.png` });
      for (const tab of ['Programmes', 'Matériel', 'Identité']) {
        await page.getByRole('tab', { name: tab }).click();
        await noHScroll(page);
      }
      await page.screenshot({ path: `e2e/screenshots/space-mj-identite-${w}-${theme}.png` });
      expect(errors).toEqual([]);
      await ctx.close();
    });
  }
}

test('GM mode: shows the MJ space and NPC tools, hides them again, combat unchanged', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = watch(page);
  await page.goto(url);
  await page.getByRole('button', { name: 'Ouvrir la démo' }).click();

  // Off by default: no MJ space, no NPC anywhere in Équipe.
  await expect(nav(page, 'MJ')).toHaveCount(0);
  await expect(page.locator('.pctabs').getByText(/Robot de garde|Sentinelle|Rats/)).toHaveCount(0);
  await page.getByRole('button', { name: "Gérer l'équipe", exact: true }).click();
  await expect(page.getByRole('dialog').getByText('Unité Sentinelle')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Identité' }).click();
  await expect(page.getByRole('button', { name: 'MJ (PNJ)' })).toHaveCount(0);

  // A combat prepared without GM mode.
  await nav(page, 'Combat').click();
  const combatOff = await page.locator('#contenu').innerText();

  await setGm(page, true);
  await expect(nav(page, 'MJ')).toHaveCount(1);
  await nav(page, 'Combat').click();
  expect(await page.locator('#contenu').innerText()).toBe(combatOff);
  const saved = await page.evaluate(() => localStorage['mechatron-v3']);

  await nav(page, 'MJ').click();
  await expect(page.getByRole('heading', { name: /PNJ du MJ/ })).toBeVisible();
  await page.locator('button.main', { hasText: 'Robot de garde' }).click();
  await expect(page.locator('.plate')).toBeVisible();
  // The preference stays on this device after a reload.
  await page.reload();
  await expect(nav(page, 'MJ')).toHaveCount(1);
  expect(await page.evaluate(() => JSON.parse(localStorage['mechatron-ui-v3']).gm)).toBe(true);

  await setGm(page, false);
  await expect(nav(page, 'MJ')).toHaveCount(0);
  await expect(page.locator('.plate')).toBeVisible(); // back in Équipe, on a PC
  await expect(page.getByRole('button', { name: /gérer l'équipe \(4\)/i })).toBeVisible();
  await page.waitForTimeout(400);
  // The switch changes nothing in the campaign.
  const after = JSON.parse(await page.evaluate(() => localStorage['mechatron-v3']));
  const before = JSON.parse(saved);
  delete after.activeId; delete before.activeId;
  expect(after).toEqual(before);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('every v2.3.6 feature is within 2 taps of Équipe (GM mode on)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = watch(page);
  await page.goto(url);
  await page.getByRole('button', { name: 'Ouvrir la démo' }).click();
  await setGm(page, true);

  const dialog = () => page.getByRole('dialog');
  const btn = (name, exact = false) => () => page.getByRole('button', { name, exact }).first().click();
  const tab = (name) => () => page.getByRole('tab', { name }).click();
  const go = (label) => () => nav(page, label).click();
  // [feature, taps from home, what must then be visible]. Inside Combat nothing moved: the GM pool,
  // NPC duplication and the combatant sheets appear with the enemies, as before.
  const checklist = [
    ['Attributs, PE, armure, couverture (État)', [], () => page.getByRole('heading', { name: 'Protection' })],
    ['Subir des dégâts', [btn('Subir des dégâts')], () => dialog()],
    ['Jet libre', [btn('Jet libre')], () => dialog()],
    ['Expérience : PX et dépense', [], () => page.getByRole('button', { name: /Dépenser \d+ PX/ })],
    ['Changer de robot (onglets PJ)', [() => page.locator('.pctabs .tab', { hasText: 'Clou' }).click()], () => page.locator('.pctabs .tab.active', { hasText: 'Clou' })],
    ['Jet de programme', [tab('Programmes'), () => page.getByRole('button', { name: /^Lancer / }).first().click()], () => dialog()],
    ['Matériel : armes, équipement, modules', [tab('Matériel')], () => page.getByRole('heading', { name: /Armes/ }).first()],
    ['Identité : modèle, châssis, relations, notes', [tab('Identité')], () => page.getByText('Notes', { exact: true })],
    ['Activer un module', [tab('Matériel'), btn('Activer', true)], () => dialog()],
    ['Modifier une arme', [tab('Matériel'), () => page.getByRole('button', { name: /^Modifier / }).first().click()], () => dialog()],
    ['PJ ou PNJ (mode MJ)', [tab('Identité')], () => page.getByRole('button', { name: 'MJ (PNJ)' })],
    ['Choisir une pièce de châssis', [tab('Identité'), () => page.locator('.part').first().click()], () => dialog()],
    ['Exports du robot (JSON, lien, texte, image, impression)', [btn('Exporter')], () => dialog()],
    ["Gérer l'équipe : dupliquer, supprimer, nouveau, remise à neuf", [btn("Gérer l'équipe", true)], () => dialog().getByRole('button', { name: /Remettre l'équipe à neuf/ })],
    ['Combat : préparation, initiative, tours', [go('Combat')], () => page.getByRole('button', { name: 'Initiative', exact: true })],
    ['Niveaux de développement et connexion', [go('Énergie')], () => page.getByRole('heading', { name: 'Connexion au collectif' })],
    ['Usure des niveaux (fin de séance)', [go('Séance')], () => page.getByRole('button', { name: /−1D6 à chaque niveau/ })],
    ['Questions de fin de séance (PX)', [go('Séance'), btn('Questions')], () => dialog()],
    ['Journal de campagne', [go('Séance')], () => page.getByRole('heading', { name: 'Journal de campagne' })],
    ['Campagne : exporter, importer, nouvelle, sauvegardes, thème, mode MJ', [btn('Menu de la campagne')], () => page.getByRole('switch', { name: /Mode MJ/ })],
    ['PNJ du MJ', [go('MJ')], () => page.getByRole('heading', { name: /PNJ du MJ/ })],
    ['Nouveau PNJ (modèles du livre)', [go('MJ'), btn('Nouveau PNJ')], () => dialog()],
    ['Dupliquer ou supprimer un PNJ', [go('MJ'), () => page.getByRole('button', { name: /^Dupliquer / }).first().click()], () => page.getByText(/\(copie\)/).first()],
    ['Fiche d’un PNJ', [go('MJ'), () => page.locator('button.main', { hasText: 'Unité Sentinelle' }).click()], () => page.getByRole('button', { name: 'Tous les PNJ' })]
  ];
  for (const [name, taps, visible] of checklist) {
    // Home: Équipe, État tab, no sheet open (not counted).
    await page.keyboard.press('Escape');
    await nav(page, 'Équipe').click();
    if (await page.locator('.pctabs .tab', { hasText: 'Brise-Fer' }).count()) await page.locator('.pctabs .tab', { hasText: 'Brise-Fer' }).click();
    await page.getByRole('tab', { name: 'État' }).click();
    expect(taps.length, name).toBeLessThanOrEqual(2);
    for (const t of taps) await t();
    await expect(visible(), name).toBeVisible();
  }
  expect(errors).toEqual([]);
  await ctx.close();
});

test('outside GM mode, an NPC is never shown or exported from Équipe', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = watch(page);
  await page.goto(url);
  await page.getByLabel('Nom de la campagne').fill('Sans PJ');
  await page.getByRole('button', { name: 'Créer la campagne' }).click();
  // The only robot is an enemy added in combat: it becomes the active robot.
  await nav(page, 'Combat').click();
  await page.getByRole('button', { name: 'Depuis les modèles du livre' }).click();
  await page.getByRole('dialog').locator('button.item').first().click();
  await nav(page, 'Équipe').click();
  await expect(page.getByRole('heading', { name: 'Créez votre premier robot' })).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter depuis un fichier' }).click();
  await expect(page.getByRole('dialog').getByText("Aucun robot pour l’instant")).toBeVisible();
  await expect(page.getByRole('button', { name: 'Télécharger ce robot' })).toHaveCount(0);
  expect(errors).toEqual([]);
  await ctx.close();
});
