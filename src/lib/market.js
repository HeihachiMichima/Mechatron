// Black market (T09 catalog and GM editor; T10 availability, buy, sell).
// campaign.market = { open, sellRate, rarities, listings, ledger }.
// listing = { id, kind: 'module'|'weapon'|'equipment'|'part'|'custom', ref, custom,
//             price (null = to be set by the GM), rarity, stock (null = unlimited),
//             enabled, hidden, note }.
// Book prices: data.js goodsPrices (p.234). Everything else is a house rule (house.js).
import { GAME_DATA as D } from './data.js';
import { HOUSE } from './house.js';
import { findModule, findWeapon, findEquipment, findPart } from './rules.js';

const H = HOUSE.market;
export const KINDS = [
  { id: 'module', label: 'Modules', one: 'module' },
  { id: 'weapon', label: 'Armes', one: 'arme' },
  { id: 'part', label: 'Pièces de châssis', one: 'pièce de châssis' },
  { id: 'equipment', label: 'Équipement', one: 'équipement' },
  { id: 'custom', label: 'Objets du MJ', one: 'objet' }
];
const PART_CATS = { heads: 'Tête', torsos: 'Torse', undercarriages: 'Support' };
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const intOrNull = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Math.max(0, Math.round(Number(v))));

/** The book's price for a listing (p.234), or null when the book gives none. */
export function bookPrice(l) {
  const P = D.goodsPrices;
  if (l.kind === 'module') return P.module;
  if (l.kind === 'part') return P.part;
  if (l.kind === 'weapon') return P.weapons[l.ref] ?? null;
  return null;
}
/** Where the price comes from: 'book' (p.234), 'house' (GM or house rule) or 'none' (to be set). */
export const priceSource = (l) => (l.price == null ? 'none' : bookPrice(l) === l.price ? 'book' : 'house');

const listing = (kind, ref, extra = {}) => {
  const l = { id: `${kind}:${ref}`, kind, ref, custom: '', price: null, rarity: H.rarityByKind[kind], stock: null, enabled: true, hidden: false, note: '', ...extra };
  if (!('price' in extra)) l.price = bookPrice(l);
  return l;
};

/** The default catalog: every module, weapon (not bare hands), chassis part and equipment item of data.js. */
export function defaultListings() {
  return [
    ...D.modules.map((m) => listing('module', m.name)),
    ...D.weapons.filter((w) => w.name !== 'Mains nues').map((w) => listing('weapon', w.name)),
    ...Object.keys(PART_CATS).flatMap((cat) => D.chassis[cat].map((p) => listing('part', p.name))),
    ...D.equipment.map((e) => listing('equipment', e.name))
  ];
}

export const defaultRarities = () => H.rarities.map((r) => ({ ...r }));

/** A fresh market: the whole catalog, house rarities and sell rate. Open once the game starts. */
export const blankMarket = (open = false) => ({ open, sellRate: H.sellRate, rarities: defaultRarities(), listings: defaultListings(), ledger: [] });

function normalizeListing(raw) {
  if (!isObj(raw)) return null;
  const kind = KINDS.some((k) => k.id === raw.kind) ? raw.kind : 'custom';
  const ref = str(raw.ref);
  const custom = str(raw.custom).trim();
  if (kind === 'custom' ? !custom : !ref) return null;
  return {
    id: str(raw.id) || `${kind}:${ref || custom}`,
    kind, ref, custom,
    price: intOrNull(raw.price),
    rarity: str(raw.rarity) || H.rarityByKind[kind],
    stock: intOrNull(raw.stock),
    enabled: raw.enabled !== false,
    hidden: !!raw.hidden,
    note: str(raw.note)
  };
}

/** Rebuild a saved market. Missing → a fresh one, open when the game has started. */
export function normalizeMarket(raw, phase = 'creation') {
  if (!isObj(raw)) return blankMarket(phase === 'play');
  const rarities = (Array.isArray(raw.rarities) ? raw.rarities : []).filter(isObj).map((r) => ({ id: str(r.id), label: str(r.label) || str(r.id), chance: Math.max(0, Math.min(1, Number(r.chance) || 0)) })).filter((r) => r.id);
  const seen = new Set();
  const listings = (Array.isArray(raw.listings) ? raw.listings : defaultListings()).map(normalizeListing).filter((l) => l && !seen.has(l.id) && seen.add(l.id));
  const ids = new Set((rarities.length ? rarities : defaultRarities()).map((r) => r.id));
  for (const l of listings) if (!ids.has(l.rarity)) l.rarity = H.rarityByKind[l.kind];
  return {
    open: !!raw.open,
    sellRate: Number.isFinite(Number(raw.sellRate)) ? Math.max(0, Math.min(1, Number(raw.sellRate))) : H.sellRate,
    rarities: rarities.length ? rarities : defaultRarities(),
    listings,
    ledger: (Array.isArray(raw.ledger) ? raw.ledger : []).filter(isObj).map((e) => JSON.parse(JSON.stringify(e)))
  };
}

/** Display name of a listing. */
export const listingName = (l) => (l.kind === 'custom' ? l.custom : l.ref);

/** One-line description: module effect, weapon stats, part stats, equipment note. */
export function listingInfo(l) {
  if (l.kind === 'module') return findModule(l.ref)?.effect ?? '';
  if (l.kind === 'weapon') { const w = findWeapon(l.ref); return w ? `Bonus ${w.bonus ?? '—'}, dégâts ${w.degats}, portée ${w.portee.toLowerCase()}${w.note ? `. ${w.note}` : ''}` : ''; }
  if (l.kind === 'equipment') return findEquipment(l.ref)?.note ?? '';
  if (l.kind === 'part') {
    for (const [cat, label] of Object.entries(PART_CATS)) {
      const p = findPart(cat, l.ref);
      if (p) return `${label} : Serv ${p.servos}, Stab ${p.stabilite}, Proc ${p.processeur}, Rés ${p.reseau}, ${p.slots} empl., armure ${p.armor}`;
    }
  }
  return l.note;
}
/** The chassis slot of a part listing: 'head' | 'torso' | 'undercarriage' | null. */
export function partSlot(l) {
  const key = { heads: 'head', torsos: 'torso', undercarriages: 'undercarriage' };
  for (const cat of Object.keys(PART_CATS)) if (findPart(cat, l.ref)) return key[cat];
  return null;
}

/** Selling back: sellRate of the price, rounded, at least sellMin (house rule). */
export const sellPrice = (l, market) => (l.price == null ? null : Math.max(H.sellMin, Math.round(l.price * (market?.sellRate ?? H.sellRate))));

export const rarityOf = (market, id) => market.rarities.find((r) => r.id === id) ?? { id, label: id, chance: 0 };

/** A new custom listing (« Ajouter un objet perso »). */
export const customListing = (name, price = null, rarity = H.rarityByKind.custom) => ({ ...listing('custom', '', { price: intOrNull(price), rarity }), id: `custom:${Math.random().toString(36).slice(2, 8)}`, custom: name.trim() });

/** Market file (export/import): listings, rarities, sell rate. */
export const marketFile = (m) => ({ mechatronMarket: 1, sellRate: m.sellRate, rarities: m.rarities, listings: m.listings });
export function readMarketFile(raw) {
  if (!isObj(raw) || !Array.isArray(raw.listings)) return null;
  const m = normalizeMarket({ ...raw, open: false, ledger: [] });
  return m.listings.length ? m : null;
}
