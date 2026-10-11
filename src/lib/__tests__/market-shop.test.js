// T10: black market availability (daily draw), buying and selling.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { store, normalizeAll, blankCampaign, blankCharacter, payEp, availableEp } from '../store.svelte.js';
import { setRng } from '../rng.js';
import { drawMarket, isAvailable, buyBlock, buy, sell, sellables, blankMarket } from '../market.js';
import { rig } from './helpers.js';

afterEach(() => setRng(null));

function robot(name, ep, extra = {}) {
  const c = blankCharacter('pc');
  Object.assign(c, { name, model: 'battle', head: 'Pashin Ama 9', torso: 'Ganymeda Nava PRS', undercarriage: 'LBM Terra 004' }, extra); // 3 slots
  c.ep.current = ep;
  return c;
}
function table(chars) {
  const cp = blankCampaign('Marché');
  cp.phase = 'play';
  cp.market = blankMarket(true);
  return normalizeAll({ version: 3, campaign: cp, chars, activeId: chars[0]?.id ?? null });
}
const L = (d, ref) => d.campaign.market.listings.find((l) => l.ref === ref || l.custom === ref);
const opts = { pay: payEp, ep: availableEp };
const forceIn = (d, ...refs) => refs.forEach((r) => (L(d, r).force = 'in'));

describe('Availability', () => {
  it('the daily draw follows the rarity odds and is reproducible with setRng', () => {
    const d1 = table([]); setRng(11); const a = drawMarket(d1.campaign.market, 1);
    const d2 = table([]); setRng(11); const b = drawMarket(d2.campaign.market, 1);
    expect(a).toEqual(b);
    expect(d1.campaign.market.draw.day).toBe(1);
    const m = d1.campaign.market;
    // commun = always, unique = never by chance
    expect(m.listings.filter((l) => l.rarity === 'commun' && l.enabled).every((l) => a.includes(l.id))).toBe(true);
    expect(m.listings.filter((l) => l.rarity === 'unique').some((l) => a.includes(l.id))).toBe(false);
  });

  it('the GM forces an item in or out; no price, no stock or disabled = not on sale', () => {
    const d = table([]);
    const m = d.campaign.market;
    rig(6); // the next random() is high: a rare item does not show up
    drawMarket(m, 1);
    const jet = L(d, 'Jetpack');
    expect(isAvailable(m, jet)).toBe(false);
    jet.force = 'in';
    expect(isAvailable(m, jet)).toBe(true);
    const pistol = L(d, 'Pistolet laser');
    pistol.force = 'out';
    expect(isAvailable(m, pistol)).toBe(false);
    pistol.force = null;
    expect(isAvailable(m, pistol)).toBe(true); // commun
    pistol.stock = 0;
    expect(isAvailable(m, pistol)).toBe(false);
    expect(isAvailable(m, { ...L(d, "Banque d'énergie"), force: 'in' })).toBe(false); // no price
  });
});

describe('Buying', () => {
  it('blocked without enough EP or a free slot, with a clear message; a module can only be had once', () => {
    const full = robot('Plein', 9, { modules: ['Accélérateur', 'Tronçonneuse', 'Hurleur'] });
    const poor = robot('Fauché', 3);
    const d = table([full, poor]);
    forceIn(d, 'Jetpack', 'Fusil à plasma', 'Accélérateur');
    const m = d.campaign.market;
    const [F, P] = d.chars;
    expect(buyBlock(m, L(d, 'Fusil à plasma'), P, 3)).toBe('Pas assez de PE : il en faut 7, Fauché en a 3.');
    expect(buyBlock(m, L(d, 'Jetpack'), F, 9)).toBe('Aucun emplacement libre (3 sur 3 pris).');
    F.modules.pop();
    expect(buyBlock(m, L(d, 'Accélérateur'), F, 9)).toBe('Plein a déjà ce module.');
    expect(buy(d, L(d, 'Fusil à plasma').id, P.id, opts)).toMatch(/Pas assez de PE/);
    expect(P.ep.current).toBe(3);
  });

  it('a purchase pays, adds the item, lowers the stock and is written to the ledger and the journal', () => {
    const d = table([robot('A', 9)]);
    forceIn(d, 'Jetpack', 'Pistolet laser', 'Lagos MD-18');
    L(d, 'Jetpack').stock = 2;
    const A = d.chars[0];
    expect(buy(d, L(d, 'Jetpack').id, A.id, opts)).toBe(null);
    expect(buy(d, L(d, 'Pistolet laser').id, A.id, opts)).toBe(null);
    expect([A.ep.current, A.modules, A.weapons.map((w) => [w.name, w.bonus, w.degats]), L(d, 'Jetpack').stock]).toEqual([2, ['Jetpack'], [['Pistolet laser', 3, 2]], 1]);
    expect(buy(d, L(d, 'Lagos MD-18').id, A.id, opts)).toMatch(/Pas assez/);
    expect(d.campaign.market.ledger.map((e) => [e.type, e.name, e.price])).toEqual([['buy', 'Jetpack', 5], ['buy', 'Pistolet laser', 2]]);
    expect(d.campaign.journal.at(-1).text).toBe('A achète Pistolet laser au marché noir : 2 PE');
  });

  it('an NPC pays from the GM pool when it is on', () => {
    const npc = blankCharacter('npc'); npc.name = 'Garde'; npc.ep.current = 0;
    const d = table([npc]);
    d.combat.usePool = true; d.combat.gmPool = 6;
    forceIn(d, 'Pistolet laser');
    expect(buy(d, L(d, 'Pistolet laser').id, d.chars[0].id, opts)).toBe(null);
    expect(d.combat.gmPool).toBe(4);
  });
});

describe('Selling', () => {
  it('half price (house rule), back in stock; nothing beyond the EP max; no price = not taken back', () => {
    const d = table([robot('A', 4, { modules: ['Jetpack', 'Hurleur'], brokenModules: [1], equipment: [{ name: 'Pièce bizarre', integre: false }] })]);
    const A = d.chars[0];
    L(d, 'Jetpack').stock = 0;
    const list = sellables(d.campaign.market, A);
    expect(list.map((x) => [x.name, x.price])).toEqual([['Jetpack', 3], ['Hurleur', 3], ['Pièce bizarre', null]]);
    expect(sell(d, A.id, { kind: 'module', index: 0 })).toBe(null);
    expect([A.ep.current, A.modules, A.brokenModules, L(d, 'Jetpack').stock]).toEqual([7, ['Hurleur'], [0], 1]);
    expect(sell(d, A.id, { kind: 'equipment', index: 0 })).toMatch(/ne reprend pas/);
    A.ep.current = 9;
    expect(sell(d, A.id, { kind: 'module', index: 0 })).toBe('Trop de PE : A ne peut en recevoir que 1 (max 10).');
  });
});

describe('In the store: undo restores EP, stock and inventory', () => {
  beforeEach(() => {
    store.data = table([robot('A', 9)]);
    Object.assign(store.ui, { space: 'marche', gm: false, wizard: null, sheet: null });
  });

  it('undo after a purchase and after a sale', () => {
    const d = store.data;
    L(d, 'Jetpack').force = 'in';
    L(d, 'Jetpack').stock = 1;
    const id = L(d, 'Jetpack').id, A = d.chars[0].id;
    store.commitAll('achat', (x) => buy(x, id, A, opts));
    expect([store.char(A).ep.current, store.char(A).modules.length, L(store.data, 'Jetpack').stock, store.data.campaign.market.ledger.length]).toEqual([4, 1, 0, 1]);
    store.undo();
    expect([store.char(A).ep.current, store.char(A).modules.length, L(store.data, 'Jetpack').stock, store.data.campaign.market.ledger.length]).toEqual([9, 0, 1, 0]);
    store.commitAll('achat', (x) => buy(x, id, A, opts));
    store.commitAll('vente', (x) => sell(x, A, { kind: 'module', index: 0 }));
    expect(store.char(A).ep.current).toBe(7);
    store.undo();
    expect([store.char(A).ep.current, store.char(A).modules]).toEqual([4, ['Jetpack']]);
  });

  it('the draw and the forced items survive a reload', () => {
    setRng(5);
    drawMarket(store.data.campaign.market, 3);
    L(store.data, 'Jetpack').force = 'out';
    const back = normalizeAll(JSON.parse(JSON.stringify(store.data))).campaign.market;
    expect(back.draw).toEqual(store.data.campaign.market.draw);
    expect(back.listings.find((l) => l.ref === 'Jetpack').force).toBe('out');
  });
});
