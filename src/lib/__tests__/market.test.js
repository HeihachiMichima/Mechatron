// T09: black market catalog, book prices (p.234), house rules and persistence.
import { describe, it, expect } from 'vitest';
import { GAME_DATA as D } from '../data.js';
import { HOUSE } from '../house.js';
import { normalizeAll, blankCampaign } from '../store.svelte.js';
import { defaultListings, blankMarket, normalizeMarket, bookPrice, priceSource, sellPrice, customListing, marketFile, readMarketFile, listingName, partSlot } from '../market.js';
import { roundtrip } from './roundtrip.js';

const find = (ls, kind, ref) => ls.find((l) => l.kind === kind && l.ref === ref);

describe('Catalog', () => {
  it('covers every module, weapon (not bare hands), chassis part and equipment item of data.js', () => {
    const ls = defaultListings();
    for (const m of D.modules) expect(find(ls, 'module', m.name), m.name).toBeTruthy();
    for (const w of D.weapons.filter((x) => x.name !== 'Mains nues')) expect(find(ls, 'weapon', w.name), w.name).toBeTruthy();
    for (const cat of ['heads', 'torsos', 'undercarriages']) for (const p of D.chassis[cat]) expect(find(ls, 'part', p.name), p.name).toBeTruthy();
    for (const e of D.equipment) expect(find(ls, 'equipment', e.name), e.name).toBeTruthy();
    expect(find(ls, 'weapon', 'Mains nues')).toBeUndefined();
    expect(new Set(ls.map((l) => l.id)).size).toBe(ls.length);
  });

  it('book prices (p.234): module 5, chassis part 8, the eleven weapons', () => {
    const ls = defaultListings();
    expect(find(ls, 'module', 'Jetpack').price).toBe(5);
    expect(find(ls, 'part', 'Scrap Head').price).toBe(8);
    const expected = { 'Couteau de ferraille': 1, 'Gourdin de ferraille': 1, 'Matraque électrique': 2, 'Fer à souder laser': 3, 'Vibro-couteau': 3, 'Scie de combat': 5, 'Pistolet paralysant': 3, 'Pistolet laser': 2, 'Fusil laser': 5, 'Pistolet maser': 4, 'Fusil à plasma': 7 };
    for (const [name, p] of Object.entries(expected)) expect(find(ls, 'weapon', name).price, name).toBe(p);
    for (const l of ls.filter((x) => x.price != null)) expect(priceSource(l)).toBe('book');
  });

  it('no book price → null, to be set by the GM; a changed price is a house price', () => {
    const ls = defaultListings();
    const bank = find(ls, 'equipment', "Banque d'énergie");
    const club = find(ls, 'weapon', 'Instrument contondant');
    expect([bank.price, priceSource(bank), club.price, bookPrice(club)]).toEqual([null, 'none', null, null]);
    expect(priceSource({ ...bank, price: 4 })).toBe('house');
    expect(priceSource({ ...find(ls, 'module', 'Jetpack'), price: 6 })).toBe('house');
  });

  it('house rules: rarities by kind, sell back at half price, at least 1', () => {
    const m = blankMarket();
    expect(m.rarities.map((r) => r.id)).toEqual(HOUSE.market.rarities.map((r) => r.id));
    expect(find(m.listings, 'module', 'Jetpack').rarity).toBe('rare');
    expect(find(m.listings, 'part', 'Scrap Head').rarity).toBe('peu-commun');
    expect(sellPrice({ price: 5 }, m)).toBe(3);
    expect(sellPrice({ price: 1 }, m)).toBe(1);
    expect(sellPrice({ price: null }, m)).toBe(null);
  });

  it('part listings know their chassis slot; custom items carry their own name', () => {
    expect(partSlot({ kind: 'part', ref: 'Lagos MD-18' })).toBe('undercarriage');
    const c = customListing('  Huile de luxe ', 3);
    expect([listingName(c), c.price, c.kind]).toEqual(['Huile de luxe', 3, 'custom']);
  });
});

describe('Persistence', () => {
  it('GM edits survive a save and reload', () => {
    const cp = blankCampaign('Marché');
    const jet = find(cp.market.listings, 'module', 'Jetpack');
    Object.assign(jet, { price: 7, rarity: 'unique', stock: 1, hidden: true, note: 'Volé à la Sécurité' });
    find(cp.market.listings, 'equipment', "Banque d'énergie").price = 4;
    find(cp.market.listings, 'weapon', 'Fusil à plasma').enabled = false;
    cp.market.listings.push(customListing('Huile de luxe', 3));
    cp.market.sellRate = 0.4;
    cp.market.rarities[2].chance = 1 / 3;
    cp.market.open = true;
    const { before, after } = roundtrip(normalizeAll({ version: 3, campaign: cp, chars: [] }));
    expect(after).toEqual(before);
    expect(after.campaign.market.listings.at(-1).custom).toBe('Huile de luxe');
  });

  it('a save without a market gets the catalog, open when the game has started', () => {
    expect(normalizeAll({ version: 3, campaign: { phase: 'play' }, chars: [] }).campaign.market.open).toBe(true);
    expect(normalizeAll({ version: 3, campaign: { phase: 'creation' }, chars: [] }).campaign.market.open).toBe(false);
    expect(normalizeMarket(null).listings.length).toBe(defaultListings().length);
  });

  it('bad listings are dropped, unknown rarities fall back to the kind default', () => {
    const m = normalizeMarket({ listings: [{ kind: 'module', ref: 'Jetpack', rarity: 'légendaire', price: '6' }, { kind: 'custom', custom: '' }, 'x'] });
    expect(m.listings).toHaveLength(1);
    expect([m.listings[0].rarity, m.listings[0].price]).toEqual(['rare', 6]);
  });

  it('market file: export then import gives the same catalog; anything else is refused', () => {
    const m = blankMarket(true);
    m.listings[0].price = 9;
    const back = readMarketFile(JSON.parse(JSON.stringify(marketFile(m))));
    expect(back.listings).toEqual(m.listings);
    expect(back.open).toBe(false);
    expect(readMarketFile({ chars: [] })).toBe(null);
    expect(readMarketFile({ listings: [] })).toBe(null);
  });
});
