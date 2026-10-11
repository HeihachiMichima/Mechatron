// Square-grid geometry (T12): pure functions that SUGGEST a range band, cover
// and line of sight from a map. The book's combat rules (shootRanges, fleeMods,
// blastDice) stay the only rules; nothing here changes a robot.
//
// Conventions: cell (x, y) covers [x, x+1] × [y, y+1]; its centre is
// (x + .5, y + .5). Diagonals count 1 (Chebyshev). A ray or a step may pass
// between two diagonal cells only if they don't BOTH block it.
import { HOUSE } from '../house.js';
import { inside, terrainAt, terrainCover, key } from './terrain.js';

/** Default grid rules (house.js); callers pass getRules().grid to honour GM overrides. */
const DEFAULT = HOUSE.grid;
const bandsOf = (rules) => ({ ...DEFAULT.bands, ...(rules?.bands || {}) });

/** Distance in squares (diagonals count 1). */
export const distance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/**
 * Walk the cells crossed by the segment p0 → p1 (continuous coordinates).
 * Returns the cells in order, the first being the cell of p0. A step that goes
 * exactly through a grid corner is diagonal and carries `corner`: the two cells
 * it squeezes between.
 */
function walk(x0, y0, x1, y1) {
  let cx = Math.floor(x0), cy = Math.floor(y0);
  const ex = Math.floor(x1), ey = Math.floor(y1);
  const dx = x1 - x0, dy = y1 - y0;
  const sx = Math.sign(dx), sy = Math.sign(dy);
  const tdx = dx ? 1 / Math.abs(dx) : Infinity;
  const tdy = dy ? 1 / Math.abs(dy) : Infinity;
  let tx = dx > 0 ? (cx + 1 - x0) / dx : dx < 0 ? (x0 - cx) / -dx : Infinity;
  let ty = dy > 0 ? (cy + 1 - y0) / dy : dy < 0 ? (y0 - cy) / -dy : Infinity;
  const out = [{ x: cx, y: cy, corner: null }];
  let guard = Math.abs(ex - cx) + Math.abs(ey - cy) + 2;
  while ((cx !== ex || cy !== ey) && guard-- > 0) {
    if (Math.abs(tx - ty) < 1e-9) {
      const corner = [{ x: cx + sx, y: cy }, { x: cx, y: cy + sy }];
      cx += sx; cy += sy; tx += tdx; ty += tdy;
      out.push({ x: cx, y: cy, corner });
    } else if (tx < ty) {
      cx += sx; tx += tdx;
      out.push({ x: cx, y: cy, corner: null });
    } else {
      cy += sy; ty += tdy;
      out.push({ x: cx, y: cy, corner: null });
    }
  }
  return out;
}

/** Every cell the centre-to-centre segment a → b crosses, a and b included. */
export function line(a, b) {
  return walk(a.x + 0.5, a.y + 0.5, b.x + 0.5, b.y + 0.5).map(({ x, y }) => ({ x, y }));
}

const blocksSight = (map, p) => !inside(map, p) || terrainAt(map, p).block;

/**
 * Follow one ray; returns { clear, blockers } where blockers are the cells
 * that stopped it (a wall, or the two walls of a squeezed corner). The
 * start and end cells never block.
 */
function ray(map, x0, y0, x1, y1) {
  const steps = walk(x0, y0, x1, y1);
  const last = steps.length - 1;
  for (let i = 1; i <= last; i++) {
    const s = steps[i];
    if (s.corner && s.corner.every((c) => blocksSight(map, c))) return { clear: false, blockers: s.corner, steps };
    if (i < last && blocksSight(map, s)) return { clear: false, blockers: [{ x: s.x, y: s.y }], steps };
  }
  return { clear: true, blockers: [], steps };
}

const INSET = 0.1;
/** Four rays from each corner of a (slightly inside) to the centre of b. */
function rays(map, a, b) {
  const tx = b.x + 0.5, ty = b.y + 0.5;
  return [[INSET, INSET], [1 - INSET, INSET], [INSET, 1 - INSET], [1 - INSET, 1 - INSET]]
    .map(([ox, oy]) => ray(map, a.x + ox, a.y + oy, tx, ty));
}

/**
 * How much of b is hidden from a: rays from the centre of a to the four
 * corners of b (slightly inside). Returns { blocked (0-4), blockers }.
 */
function hidden(map, a, b) {
  const ax = a.x + 0.5, ay = a.y + 0.5;
  const rs = [[INSET, INSET], [1 - INSET, INSET], [INSET, 1 - INSET], [1 - INSET, 1 - INSET]]
    .map(([ox, oy]) => ray(map, ax, ay, b.x + ox, b.y + oy));
  return { blocked: rs.filter((r) => !r.clear).length, blockers: rs.flatMap((r) => r.blockers) };
}

/**
 * Line of sight between a and b: corner-to-centre rays cast both ways (8 rays),
 * so the answer is the same from either end (who sees whom also decides who
 * can shoot back). visible = at least one ray is clear; partial = visible but
 * some rays are blocked. Also returns `clear` (how many of the 8), `blocked`
 * (8 − clear) and `blockers` (cells that stopped a ray, once each).
 */
export function los(map, a, b) {
  if (a.x === b.x && a.y === b.y) return { visible: true, partial: false, clear: 8, blocked: 0, blockers: [] };
  const rs = [...rays(map, a, b), ...rays(map, b, a)];
  const clear = rs.filter((r) => r.clear).length;
  const seen = new Set();
  const blockers = rs.flatMap((r) => r.blockers).filter((p) => !seen.has(key(p)) && seen.add(key(p)));
  return { visible: clear > 0, partial: clear > 0 && clear < rs.length, clear, blocked: rs.length - clear, blockers };
}

/**
 * Suggested cover for `target` against a ranged attack from `attacker`:
 * the highest rating among the obstacles next to the target and between it and
 * the attacker — furniture / steel door on the centre line (or squeezed between
 * two of them at a corner; one corner merely grazed doesn't count), and a wall
 * next to the target that hides at least WALL_MIN_HIDDEN of the target's four
 * corners from the attacker's centre (Mur): one clipped corner isn't hiding. { rating: 0, source: null }
 * when exposed, at arm's length or out of sight (`los` tells which).
 */
/** Corners of the target (of 4) a wall must hide before it counts as cover. */
export const WALL_MIN_HIDDEN = 2;

export function suggestCover(map, attacker, target) {
  const sight = los(map, attacker, target);
  const none = { rating: 0, source: null, los: sight };
  if (!sight.visible || distance(attacker, target) <= 1) return none;
  const near = (p) => distance(p, target) === 1;
  const found = [];
  // Obstacles the shot passes through or squeezes past (they don't block sight).
  const steps = walk(attacker.x + 0.5, attacker.y + 0.5, target.x + 0.5, target.y + 0.5);
  const shield = (p) => inside(map, p) && !terrainAt(map, p).block && terrainCover(terrainAt(map, p)) > 0;
  const add = (p) => { const t = terrainAt(map, p); found.push({ rating: terrainCover(t), source: t.cover, cell: { x: p.x, y: p.y } }); };
  for (const s of steps) {
    if (near(s) && shield(s)) add(s);
    // Squeezing between two obstacles at a corner: the lower of the two protects.
    if (s.corner && s.corner.every(shield) && s.corner.some(near)) {
      add(s.corner.reduce((m, p) => (terrainCover(terrainAt(map, p)) < terrainCover(terrainAt(map, m)) ? p : m)));
    }
  }
  // A wall corner: only part of the target can be seen.
  const hid = hidden(map, attacker, target);
  if (hid.blocked >= WALL_MIN_HIDDEN) for (const p of hid.blockers) {
    if (!inside(map, p) || !near(p)) continue;
    const t = terrainAt(map, p);
    if (terrainCover(t) > 0) found.push({ rating: terrainCover(t), source: t.cover, cell: { x: p.x, y: p.y } });
  }
  if (!found.length) return none;
  const best = found.reduce((m, f) => (f.rating > m.rating ? f : m));
  return { ...best, los: sight };
}

/** Range band for a distance in squares: Bras, Proche, Courte or Longue (Lointaine never on a map). */
export function bandOf(cells, rules = DEFAULT) {
  const b = bandsOf(rules);
  if (cells <= b.Bras) return 'Bras';
  if (cells <= b.Proche) return 'Proche';
  if (cells <= b.Courte) return 'Courte';
  return 'Longue';
}

const stepCost = (map, p) => (inside(map, p) ? terrainAt(map, p).cost : Infinity);
const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/**
 * Cells reachable from `from` with `maneuvers` maneuvers of M squares each
 * (house rule `moveSquares`), paying each entered cell's movement cost.
 * Diagonal steps cost like straight ones but can't squeeze between two
 * impassable cells. `blocked` = keys of cells that can't be entered (other
 * tokens). Returns a Map key → cost (the start cell at 0).
 */
export function reach(map, from, maneuvers = 1, rules = DEFAULT, { blocked = [] } = {}) {
  const budget = maneuvers * (rules?.moveSquares ?? DEFAULT.moveSquares);
  const stop = new Set(blocked);
  const cost = new Map([[key(from), 0]]);
  const open = [{ ...from, c: 0 }];
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].c < open[bi].c) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur.c > (cost.get(key(cur)) ?? Infinity)) continue;
    for (const [dx, dy] of NEIGHBOURS) {
      const n = { x: cur.x + dx, y: cur.y + dy };
      const k = key(n);
      if (stop.has(k)) continue;
      if (dx && dy && stepCost(map, { x: cur.x + dx, y: cur.y }) === Infinity && stepCost(map, { x: cur.x, y: cur.y + dy }) === Infinity) continue;
      const c = cur.c + stepCost(map, n);
      if (c > budget || c >= (cost.get(k) ?? Infinity)) continue;
      cost.set(k, c);
      open.push({ ...n, c });
    }
  }
  return cost;
}

/** How many maneuvers a movement cost takes (1 square ≈ 1 cost). */
export const maneuversFor = (cost, rules = DEFAULT) => Math.max(0, Math.ceil(cost / (rules?.moveSquares ?? DEFAULT.moveSquares)));

/**
 * Who an explosion at `centre` can hit: tokens ({ x, y, … }) at Bras, Proche or
 * Courte with a line of sight from the centre, nearest first, each with its
 * `band`. Whether Courte is hit depends on the Blast Power (blastDice, p.92).
 */
export function blastVictims(map, centre, tokens, rules = DEFAULT) {
  return tokens
    .map((t) => ({ token: t, d: distance(centre, t) }))
    .map((v) => ({ ...v, band: bandOf(v.d, rules) }))
    .filter((v) => v.band !== 'Longue' && los(map, centre, v.token).visible)
    .sort((a, b) => a.d - b.d);
}

/**
 * Squares for tokens to start on: allies on the ally spawn zone (`a`), enemies
 * on the enemy one (`e`), row by row, skipping `taken` keys. `list` = [{ id, side }];
 * returns { id: {x, y} } for those that found a square (the others stay off the map).
 */
export function spawnPlaces(map, list, taken = []) {
  const used = new Set(taken);
  const free = { ally: [], enemy: [] };
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    const ch = map.cells[y * map.w + x];
    if (ch === 'a') free.ally.push({ x, y });
    else if (ch === 'e') free.enemy.push({ x, y });
  }
  const out = {};
  for (const t of list) {
    const pool = free[t.side === 'enemy' ? 'enemy' : 'ally'];
    while (pool.length && used.has(key(pool[0]))) pool.shift();
    const p = pool.shift();
    if (p) { out[t.id] = p; used.add(key(p)); }
  }
  return out;
}

/** Can a token stand on this square? (inside, passable, not taken) */
export const canStand = (map, p, taken = []) => inside(map, p) && terrainAt(map, p).cost !== Infinity && !taken.includes(key(p));
