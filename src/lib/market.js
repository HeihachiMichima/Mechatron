// Black market (T09 catalog and GM editor; T10 availability, buy, sell).
// campaign.market = { open, sellRate, rarities, listings, ledger }.
// listing = { id, kind: 'module'|'weapon'|'equipment'|'part'|'custom', ref, custom,
//             price (null = to be set by the GM), rarity, stock (null = unlimited),
//             enabled, hidden, note, force: null|'in'|'out' (GM override of the day's draw) }.
// market.draw = { day, ids }: what is on sale on that in-game day (T10).
// Book prices: data.js goodsPrices (p.234). Everything else is a house rule (house.js).
import { GAME_DATA as D } from './data.js';
import { HOUSE } from './house.js';
import { findModule, findWeapon, findEquipment, findPart, chassis, epMax } from './rules.js';
import { random } from './rng.js';

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
  const l = { id: `${kind}:${ref}`, kind, ref, custom: '', price: null, rarity: H.rarityByKind[kind], stock: null, enabled: true, hidden: false, note: '', force: null, ...extra };
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
export const blankMarket = (open = false) => ({ open, sellRate: H.sellRate, rarities: defaultRarities(), listings: defaultListings(), ledger: [], draw: { day: 0, ids: [] } });

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
    note: str(raw.note),
    force: raw.force === 'in' || raw.force === 'out' ? raw.force : null
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
    ledger: (Array.isArray(raw.ledger) ? raw.ledger : []).filter(isObj).map((e) => JSON.parse(JSON.stringify(e))),
    draw: { day: Math.max(0, Math.floor(Number(raw.draw?.day)) || 0), ids: (Array.isArray(raw.draw?.ids) ? raw.draw.ids : []).filter((x) => typeof x === 'string') }
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

// ---------- T10: availability, buy, sell ----------

/** Draw the day's offer: each item for sale shows up with its rarity's chance (rng). */
export function drawMarket(market, day) {
  const ids = market.listings.filter((l) => l.enabled && random() < rarityOf(market, l.rarity).chance).map((l) => l.id);
  market.draw = { day, ids };
  return ids;
}

/** On sale today: enabled, priced, in stock, and drawn (or forced in by the GM; forced out never). */
export function isAvailable(market, l) {
  if (!l.enabled || l.price == null || l.stock === 0 || l.force === 'out') return false;
  return l.force === 'in' || market.draw.ids.includes(l.id);
}

/** What a robot already has of that kind (to block a second copy of a module). */
const hasModule = (c, name) => c.modules.includes(name);

/**
 * Why `c` can't buy `l` today (a French sentence), or null. ep = what it can spend
 * (availableEp: the GM pool for an NPC when the pool is on).
 */
export function buyBlock(market, l, c, ep) {
  if (!c) return 'Choisissez un acheteur.';
  if (c.body === 'creature') return 'Une créature n\'achète rien.';
  if (!market.open) return 'Le marché noir est fermé.';
  if (l.price == null) return 'Le MJ n\'a pas encore fixé de prix.';
  if (!isAvailable(market, l)) return l.stock === 0 ? 'Épuisé.' : 'Pas en vente aujourd\'hui.';
  if (ep < l.price) return `Pas assez de PE : il en faut ${l.price}, ${c.name || 'ce robot'} en a ${ep}.`;
  if (l.kind === 'module') {
    if (hasModule(c, l.ref)) return `${c.name || 'Ce robot'} a déjà ce module.`;
    const ch = chassis(c);
    if (c.modules.filter(Boolean).length >= ch.slots) return `Aucun emplacement libre (${ch.slots} sur ${ch.slots} pris).`;
  }
  return null;
}

const weaponFrom = (name) => { const w = findWeapon(name); return { name, bonus: w?.bonus ?? '', degats: w?.degats ?? '', portee: w?.portee ?? '', note: '' }; };
const record = (data, entry) => {
  const day = data.campaign.clock?.day ?? null;
  data.campaign.market.ledger.push({ at: new Date().toISOString(), day, ...entry });
  if (data.campaign.market.ledger.length > 300) data.campaign.market.ledger.splice(0, data.campaign.market.ledger.length - 300);
  data.campaign.journal.push({ at: new Date().toISOString(), ...(day ? { day } : {}), text: entry.text });
};

/**
 * Buy listing `id` for robot `cid` (inside commitAll). pay(data, c, n) takes the
 * EP (store.payEp: the GM pool for NPCs when on). Returns null or the reason.
 */
export function buy(data, id, cid, { pay, ep }) {
  const m = data.campaign.market;
  const l = m.listings.find((x) => x.id === id);
  const c = data.chars.find((x) => x.id === cid);
  if (!l) return 'Objet introuvable.';
  const why = buyBlock(m, l, c, ep(data, c));
  if (why) return why;
  pay(data, c, l.price);
  const name = listingName(l);
  if (l.kind === 'module') c.modules.push(name);
  else if (l.kind === 'weapon') c.weapons.push(weaponFrom(name));
  else c.equipment.push({ name, integre: false, ...(/^banque d.énergie$/i.test(name) ? { charge: 0 } : {}) });
  if (l.stock != null) l.stock -= 1;
  record(data, { type: 'buy', cid, listing: l.id, name, price: l.price, text: `${c.name || 'Robot'} achète ${name} au marché noir : ${l.price} PE` });
  return null;
}

/** The listing the market would take an item back as (same kind and name), or null. */
export function listingFor(market, kind, name) {
  const kinds = kind === 'equipment' ? ['equipment', 'part', 'custom'] : [kind];
  return market.listings.find((l) => kinds.includes(l.kind) && listingName(l) === name) ?? null;
}

/** What robot `c` could sell: [{ kind, index, name, listing, price }] (price null = not taken back). */
export function sellables(market, c) {
  if (!c) return [];
  const out = [];
  c.modules.forEach((name, index) => name && out.push({ kind: 'module', index, name }));
  c.weapons.forEach((w, index) => out.push({ kind: 'weapon', index, name: w.name }));
  c.equipment.forEach((e, index) => out.push({ kind: 'equipment', index, name: e.name }));
  return out.map((it) => { const l = listingFor(market, it.kind, it.name); return { ...it, listing: l, price: l ? sellPrice(l, market) : null }; });
}

/** Sell item {kind, index} of robot `cid`: half price (house rule), back in stock. Returns null or the reason. */
export function sell(data, cid, { kind, index }) {
  const m = data.campaign.market;
  const c = data.chars.find((x) => x.id === cid);
  if (!c) return 'Robot introuvable.';
  if (!m.open) return 'Le marché noir est fermé.';
  const it = sellables(m, c).find((x) => x.kind === kind && x.index === index);
  if (!it) return 'Objet introuvable.';
  if (it.price == null) return 'Le marché noir ne reprend pas cet objet (pas de prix).';
  const room = epMax(c) - c.ep.current;
  if (room < it.price) return `Trop de PE : ${c.name || 'ce robot'} ne peut en recevoir que ${room} (max ${epMax(c)}).`;
  if (kind === 'module') {
    c.modules.splice(index, 1);
    c.brokenModules = c.brokenModules.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i));
  } else if (kind === 'weapon') c.weapons.splice(index, 1);
  else c.equipment.splice(index, 1);
  c.ep.current += it.price;
  if (it.listing.stock != null) it.listing.stock += 1;
  record(data, { type: 'sell', cid, listing: it.listing.id, name: it.name, price: it.price, text: `${c.name || 'Robot'} vend ${it.name} au marché noir : +${it.price} PE` });
  return null;
}
