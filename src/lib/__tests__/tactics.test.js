// T12: square-grid geometry. Grids are drawn in ASCII: # wall, m furniture,
// b steel door, d closed door, / open door, : rough ground, ~ water,
// A attacker, T target, other capitals = more tokens.
import { describe, it, expect } from 'vitest';
import {
  parseMap, mapToAscii, setCell, fillRect, resizeMap, blankMap, charAt, key,
  distance, line, los, suggestCover, bandOf, reach, maneuversFor, blastVictims
} from '../tactics/index.js';
import { HOUSE } from '../house.js';
import { GAME_DATA as D } from '../data.js';
import { blastDice } from '../energy.js';

const cover = (name) => D.coverPresets.find((p) => p.name === name).armor;
const grid = (s) => parseMap(s);
const cov = (s) => { const { map, marks } = grid(s); return suggestCover(map, marks.A, marks.T); };
const sight = (s) => { const { map, marks } = grid(s); return los(map, marks.A, marks.T); };

describe('Map format', () => {
  it('parses ASCII with tokens on floor cells and prints it back', () => {
    const { map, marks } = grid(`
      A . #
      . m T
    `);
    expect(map).toEqual({ w: 3, h: 2, cells: '..#.m.' });
    expect(marks).toEqual({ A: { x: 0, y: 0 }, T: { x: 2, y: 1 } });
    expect(mapToAscii(map)).toBe('..#\n.m.');
  });
  it('edits are pure: setCell, fillRect and resizeMap return new maps', () => {
    const m = blankMap(4, 3);
    const m2 = setCell(m, { x: 1, y: 1 }, '#');
    expect(m.cells).toBe('.'.repeat(12));
    expect(charAt(m2, { x: 1, y: 1 })).toBe('#');
    expect(mapToAscii(fillRect(m, { x: 2, y: 2 }, { x: 1, y: 0 }, 'm'))).toBe('.mm.\n.mm.\n.mm.');
    expect(mapToAscii(resizeMap(m2, 2, 4))).toBe('..\n.#\n..\n..');
    expect(setCell(m, { x: 9, y: 9 }, '#')).toBe(m); // outside: unchanged
    expect(setCell(m, { x: 0, y: 0 }, 'Z')).toBe(m); // unknown terrain: unchanged
  });
  it('a rectangle dragged off the map changes nothing; pointer decimals snap to the cell', () => {
    const m = blankMap(4, 3);
    expect(fillRect(m, { x: 5, y: 0 }, { x: 7, y: 2 }, '#')).toBe(m);
    expect(fillRect(m, { x: -5, y: 0 }, { x: -2, y: 2 }, '#')).toBe(m);
    expect(charAt(setCell(m, { x: 1.7, y: 0.2 }, '#'), { x: 1.2, y: 0.9 })).toBe('#');
    expect(parseMap('').map).toEqual({ w: 1, h: 1, cells: '.' });
  });
  it('outside the map reads as wall; maps are capped at 32 × 24', () => {
    expect(charAt(blankMap(2, 2), { x: -1, y: 0 })).toBe('#');
    expect(blankMap(99, 99)).toMatchObject({ w: 32, h: 24 });
  });
});

describe('distance and line', () => {
  it('diagonals count 1 (Chebyshev)', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 3 })).toBe(3);
    expect(distance({ x: 0, y: 0 }, { x: 5, y: 2 })).toBe(5);
    expect(distance({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(0);
  });
  it('a straight line crosses each cell between the two ends', () => {
    expect(line({ x: 0, y: 0 }, { x: 3, y: 0 })).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]);
  });
  it('an exact diagonal goes corner to corner', () => {
    expect(line({ x: 0, y: 0 }, { x: 2, y: 2 })).toEqual([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }]);
  });
  it('a knight-like line crosses every cell it touches, in order', () => {
    expect(line({ x: 0, y: 0 }, { x: 2, y: 1 })).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }]);
  });
  it('is the same set of cells both ways', () => {
    const k = (cs) => cs.map(key).sort();
    expect(k(line({ x: 1, y: 4 }, { x: 6, y: 1 }))).toEqual(k(line({ x: 6, y: 1 }, { x: 1, y: 4 })));
  });
});

describe('Line of sight', () => {
  it('open floor: fully visible', () => {
    expect(sight(`
      A . . .
      . . . .
      . . . T
    `)).toMatchObject({ visible: true, partial: false, clear: 8, blocked: 0 });
  });
  it('a wall in between hides the target', () => {
    expect(sight(`
      . . # . .
      A . # . T
      . . # . .
    `).visible).toBe(false);
  });
  it('furniture does not block the line of sight', () => {
    expect(sight('A . m . T').visible).toBe(true);
  });
  it('no line of sight through two diagonal walls', () => {
    expect(sight(`
      A #
      # T
    `).visible).toBe(false);
  });
  it('one diagonal wall does not block an adjacent diagonal target', () => {
    expect(sight(`
      A #
      . T
    `).visible).toBe(true);
  });
  it('a long diagonal squeezing between two walls is blocked', () => {
    expect(sight(`
      A . . .
      . . # .
      . # . .
      . . . T
    `).visible).toBe(false);
  });
  it('a closed door blocks, an open door does not', () => {
    expect(sight('A . d . T').visible).toBe(false);
    expect(sight('A . / . T').visible).toBe(true);
  });
  it('around a wall corner: partial line of sight', () => {
    expect(sight(`
      A . . . . . .
      . . . . . # #
      . . . . . . T
    `)).toMatchObject({ visible: true, partial: true });
  });
  it('is the same from both ends (who sees you can be shot back)', () => {
    const { map, marks } = grid(`
      . . . . A
      . T # . .
      . . . . .
    `);
    const ab = los(map, marks.A, marks.T), ba = los(map, marks.T, marks.A);
    expect(ab.visible).toBe(ba.visible);
    expect(ab.clear).toBe(ba.clear);
  });
});

describe('Suggested cover (book Typical Cover: Meuble 3, Porte blindée 5, Mur 7)', () => {
  it('exposed target → 0', () => {
    expect(cov(`
      A . . . .
      . . . . T
    `)).toMatchObject({ rating: 0, source: null });
  });
  it('behind furniture → 3', () => {
    expect(cov('A . . . m T')).toMatchObject({ rating: cover('Meuble'), source: 'Meuble' });
    expect(cover('Meuble')).toBe(3);
  });
  it('behind furniture, shot at an angle → still 3', () => {
    expect(cov(`
      A . . . . .
      . . . . . .
      . . . . m T
    `)).toMatchObject({ rating: 3 });
  });
  it('furniture on the far side gives no cover', () => {
    expect(cov('A . . . T m').rating).toBe(0);
  });
  it('furniture that is not next to the target gives no cover', () => {
    expect(cov('A . m . . T').rating).toBe(0);
  });
  it('behind a steel door → 5', () => {
    expect(cov('A . . . b T')).toMatchObject({ rating: cover('Porte blindée'), source: 'Porte blindée' });
    expect(cover('Porte blindée')).toBe(5);
  });
  it('behind a wall corner with partial line of sight → 7', () => {
    expect(cov(`
      A . . . . . .
      . . . . . # #
      . . . . . . T
    `)).toMatchObject({ rating: cover('Mur'), source: 'Mur' });
    expect(cover('Mur')).toBe(7);
  });
  it('the best of several: furniture + wall corner → 7', () => {
    expect(cov(`
      A . . . . . .
      . . . . . # #
      . . . . . m T
    `).rating).toBe(7);
  });
  it('tucked in a corner between two crates, shot diagonally → 3', () => {
    expect(cov(`
      A . . .
      . . . .
      . . . m
      . . m T
    `)).toMatchObject({ rating: 3 });
  });
  it('a single crate merely grazed at its corner by a diagonal shot → 0', () => {
    expect(cov(`
      A . . .
      . . . .
      . . . m
      . . . T
    `).rating).toBe(0);
  });
  it('a pillar that only clips the target\'s edge is not a wall to hide behind', () => {
    const { map, marks } = grid(`
      . . . . . . .
      . . . . . . .
      . A . . . . .
      . . . . . . .
      . . . . . . .
      . . . . . . .
      . . . . # T .
    `);
    const r = suggestCover(map, marks.A, marks.T);
    expect(r.los.partial).toBe(true); // the pillar does stop some rays…
    expect(r.rating).toBe(0);          // …but hides less than half the target
  });
  it('out of sight → no suggestion (the shot is not possible)', () => {
    const r = cov('A # T');
    expect(r.rating).toBe(0);
    expect(r.los.visible).toBe(false);
  });
  it('at arm\'s length, cover does not count', () => {
    expect(cov(`
      A m
      . T
    `).rating).toBe(0);
    expect(cov('A T m').rating).toBe(0);
    expect(cov('A m T').rating).toBe(3); // two squares away: Proche, the crate counts
  });
  it('a wall next to the target with full line of sight is not cover', () => {
    expect(cov(`
      A . . . .
      . . . . T
      . . . . #
    `).rating).toBe(0);
  });
});

describe('Range bands (1 square = 2 m, house)', () => {
  it('Bras ≤ 1, Proche ≤ 3, Courte ≤ 12, then Longue', () => {
    expect([1, 2, 3, 4, 12, 13, 30].map((n) => bandOf(n))).toEqual(['Bras', 'Proche', 'Proche', 'Courte', 'Courte', 'Longue', 'Longue']);
  });
  it('Courte ends at 24 m, within the book\'s "20-30 yards"', () => {
    expect(HOUSE.grid.bands.Courte * HOUSE.grid.squareM).toBe(24);
  });
  it('GM overrides apply', () => {
    expect(bandOf(5, { bands: { Bras: 1, Proche: 5, Courte: 10 } })).toBe('Proche');
  });
});

describe('Reach (M = 4 squares per maneuver, house)', () => {
  const reachOf = (s, n = 1, opts) => { const { map, marks } = grid(s); return { r: reach(map, marks.A, n, HOUSE.grid, opts), marks }; };
  it('open floor: 4 squares in any direction for one maneuver, 8 for two', () => {
    const { map, marks } = grid(`A${'.'.repeat(11)}`);
    const one = reach(map, marks.A, 1);
    const two = reach(map, marks.A, 2);
    expect(one.has('4,0')).toBe(true);
    expect(one.has('5,0')).toBe(false);
    expect(two.has('8,0')).toBe(true);
    expect(two.has('9,0')).toBe(false);
  });
  it('diagonals cost 1', () => {
    const { map, marks } = grid(Array(6).fill('......').join('\n').replace('.', 'A'));
    expect(reach(map, marks.A, 1).get('4,4')).toBe(4);
  });
  it('walls and water are impassable; furniture and rough ground cost 2', () => {
    const { r } = reachOf('A m . . ~ .');
    expect(r.get('1,0')).toBe(2);
    expect(r.get('3,0')).toBe(4);
    expect(r.has('4,0')).toBe(false);
    const { r: r2 } = reachOf('A : : .');
    expect(r2.get('2,0')).toBe(4);
    expect(r2.has('3,0')).toBe(false);
  });
  it('no corner-cutting between two walls', () => {
    const { r } = reachOf(`
      A #
      # .
    `, 2);
    expect(r.has('1,1')).toBe(false);
  });
  it('one wall on the corner does not stop a diagonal step', () => {
    const { r } = reachOf(`
      A #
      . .
    `);
    expect(r.get('1,1')).toBe(1);
  });
  it('the way round a wall costs more', () => {
    const { r } = reachOf(`
      . # .
      A # .
      . . .
    `, 2);
    // around the end of the wall: (0,1) → (1,2) → (2,1) = 2 squares
    expect(r.get('2,1')).toBe(2);
    expect(r.get('2,0')).toBe(3);
  });
  it('other tokens can be blocked out; maneuversFor rounds up', () => {
    const { r } = reachOf('A B .', 1, { blocked: ['1,0'] });
    expect(r.has('1,0')).toBe(false);
    expect(r.has('2,0')).toBe(false); // a one-row corridor
    expect([0, 1, 4, 5, 8].map((c) => maneuversFor(c))).toEqual([0, 1, 1, 2, 2]);
  });
});

describe('Blast victims', () => {
  it('lists tokens by band, nearest first, only with a line of sight from the centre', () => {
    const { map, marks } = grid(`
      . . . . . . . . . . . . . . . .
      . X . B . . P . . . . . . . . L
      . # . . . . . . . . . . . . . .
      . H . . . . . . . . . . . . . .
    `);
    const tokens = ['X', 'B', 'P', 'L', 'H'].map((id) => ({ id, ...marks[id] }));
    const centre = marks.X;
    const v = blastVictims(map, centre, tokens);
    expect(v.map((x) => [x.token.id, x.band])).toEqual([['X', 'Bras'], ['B', 'Proche'], ['P', 'Courte']]);
    // H is at Proche but behind the wall; L is at Longue.
  });
  it('the band feeds the book\'s blast dice (power 6 does not reach Courte)', () => {
    const { map, marks } = grid('X . . . . P');
    const [v] = blastVictims(map, marks.X, [{ id: 'P', ...marks.P }]);
    expect(v.band).toBe('Courte');
    expect(blastDice(6, v.band)).toBe(0);
    expect(blastDice(8, v.band)).toBe(2);
  });
});

describe('Purity', () => {
  it('no function changes the map', () => {
    const { map, marks } = grid(`
      A . m .
      . # . T
    `);
    const before = JSON.stringify(map);
    los(map, marks.A, marks.T); suggestCover(map, marks.A, marks.T); reach(map, marks.A, 2);
    blastVictims(map, marks.A, [{ ...marks.T }]); line(marks.A, marks.T);
    expect(JSON.stringify(map)).toBe(before);
  });
});
