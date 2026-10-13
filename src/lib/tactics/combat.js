// Map ↔ combat (T14): what the map suggests during a fight. Pure functions on
// the save. Every one returns null when there is no map or when a combatant
// isn't on it: the turn then works exactly as without a map. Nothing here
// changes the save — the UI pre-selects, the players confirm.
import { HOUSE } from '../house.js';
import { RANGES, rangeIndex, status, combatWeapons } from '../rules.js';
import { moduleFx } from '../energy.js';
import { inside, key } from './terrain.js';
import { distance, bandOf, los, suggestCover, blastVictims } from './geometry.js';

/**
 * The fight's map context, or null: { map, rules } where rules = grid rules
 * (pass getRules().grid; house values by default).
 */
export function mapCtx(data, rules = HOUSE.grid) {
  const map = data?.campaign?.maps?.find((m) => m.id === data.combat?.mapId);
  return map ? { map, rules: rules || HOUSE.grid } : null;
}

/** The square of a combatant on the map, or null. */
export const posOf = (ctx, x) => (ctx && x?.pos && inside(ctx.map, x.pos) ? x.pos : null);

/** Distance and band between two combatants: { d, band } or null. */
export function rangeBetween(ctx, a, b) {
  const pa = posOf(ctx, a), pb = posOf(ctx, b);
  if (!pa || !pb) return null;
  const d = distance(pa, pb);
  return { d, band: bandOf(d, ctx.rules) };
}

/** "Courte (7 cases)" */
export const bandText = (r) => (r ? `${r.band} (${r.d} case${r.d > 1 ? 's' : ''})` : '');

/** Line of sight between two combatants (symmetric): true / false, or null without a map. */
export function sight(ctx, a, b) {
  const pa = posOf(ctx, a), pb = posOf(ctx, b);
  return pa && pb ? los(ctx.map, pa, pb).visible : null;
}

/** Is b within `band` of a (Bras, Proche, Courte…)? null without a map. */
export function within(ctx, a, b, band) {
  const r = rangeBetween(ctx, a, b);
  return r ? rangeIndex(r.band) <= rangeIndex(band) : null;
}

/** Live opponents of x that are on the map, nearest first: [{ x, d }]. */
function foes(ctx, data, x) {
  return data.combat.combatants
    .filter((y) => y.side !== x.side && !y.fled && posOf(ctx, y))
    .filter((y) => { const c = data.chars.find((k) => k.id === y.cid); return c && !status(c).deactivated; })
    .map((y) => ({ x: y, d: distance(x.pos, y.pos) }))
    .sort((a, b) => a.d - b.d);
}

/** Band to the nearest live enemy on the map (fleeing, p.82), or null. */
export function nearestEnemyBand(ctx, data, x) {
  if (!posOf(ctx, x)) return null;
  const [n] = foes(ctx, data, x);
  return n ? { d: n.d, band: bandOf(n.d, ctx.rules), x: n.x } : null;
}

/**
 * Cover the map suggests for x when it takes cover (the maneuver): against the
 * nearest live enemy that can see it. { rating, source, from } or null
 * (no map, not placed, or nobody in sight).
 */
export function coverSuggestion(ctx, data, x) {
  if (!posOf(ctx, x)) return null;
  const n = foes(ctx, data, x).find((f) => los(ctx.map, f.x.pos, x.pos).visible);
  if (!n) return null;
  const s = suggestCover(ctx.map, n.x.pos, x.pos);
  return { rating: s.rating, source: s.source, from: n.x };
}

/**
 * Squares per maneuver for this robot: × 2 with a working movement module
 * (Accélérateur, Jetpack…) it can pay for (`ep`, when given).
 */
export function moveSquaresFor(c, rules = HOUSE.grid, ep = Infinity) {
  const m = rules?.moveSquares ?? HOUSE.grid.moveSquares;
  return c && moduleFx(c, 'move').some((f) => (f.cost || 0) <= ep) ? m * 2 : m;
}

/** Longest range among a robot's ranged weapons (book weapon range), or null. */
export function maxWeaponRange(c) {
  const ws = combatWeapons(c, 'ranged').filter((w) => !w.swarmOnly);
  if (!ws.length) return null;
  return RANGES[Math.max(...ws.map((w) => rangeIndex(w.portee)))];
}

/**
 * Combatants in overwatch who could fire at `mover` where it now stands: on
 * the other side, up, in sight and within their weapon's range. The 90° arc is
 * left to the table. [{ x, c, range }]
 */
export function overwatchers(ctx, data, mover) {
  if (!posOf(ctx, mover)) return [];
  return data.combat.combatants
    .filter((y) => y.overwatch && y.side !== mover.side && !y.fled && posOf(ctx, y))
    .map((y) => ({ x: y, c: data.chars.find((k) => k.id === y.cid) }))
    .filter((r) => r.c && !status(r.c).deactivated)
    .map((r) => ({ ...r, range: rangeBetween(ctx, r.x, mover), max: maxWeaponRange(r.c) }))
    .filter((r) => r.max && rangeIndex(r.range.band) <= rangeIndex(r.max) && los(ctx.map, r.x.pos, mover.pos).visible);
}

/**
 * Who an explosion centred on `cell` catches: the combatants on the map at
 * Bras / Proche / Courte in sight of the centre, nearest first:
 * [{ cid, xid, band, d }]. blastDice(power, band) then says how many dice.
 */
export function blastFromCell(ctx, data, cell) {
  if (!ctx || !cell || !inside(ctx.map, cell)) return [];
  const tokens = data.combat.combatants.filter((y) => !y.fled && posOf(ctx, y)).map((y) => ({ x: y.pos.x, y: y.pos.y, xid: y.id, cid: y.cid }));
  return blastVictims(ctx.map, cell, tokens, ctx.rules).map((v) => ({ cid: v.token.cid, xid: v.token.xid, band: v.band, d: v.d }));
}

/** Keys of the squares taken by combatants other than `except` (to block movement). */
export const takenSquares = (ctx, data, except) => data.combat.combatants.filter((y) => y.id !== except && posOf(ctx, y)).map((y) => key(y.pos));
