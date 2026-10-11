// T14: what the map suggests during a fight (lib/tactics/combat.js).
import { describe, it, expect } from 'vitest';
import { normalizeAll, blankCampaign, blankCharacter, newCombatant } from '../store.svelte.js';
import { parseMap, mapCtx, posOf, rangeBetween, bandText, sight, within, nearestEnemyBand, coverSuggestion, moveSquaresFor, maxWeaponRange, overwatchers, blastFromCell, takenSquares } from '../tactics/index.js';
import { HOUSE } from '../house.js';

/** A fight on an ASCII map: capitals are combatants (A, B… allies; X, Y, Z enemies). */
function fight(ascii, extra = {}) {
  const { map, marks } = parseMap(ascii);
  const chars = [], combatants = [];
  for (const [ch, pos] of Object.entries(marks)) {
    const c = blankCharacter(ch >= 'X' ? 'npc' : 'pc');
    Object.assign(c, { name: ch, model: 'battle', head: 'Pashin Ama 9', torso: 'Ganymeda Nava PRS', undercarriage: 'LBM Terra 004', weapons: [{ name: 'Pistolet laser', bonus: 3, degats: 2, portee: 'Longue', note: '' }] }, extra[ch]?.c || {});
    const x = newCombatant(c.id, ch >= 'X' ? 'enemy' : 'ally');
    x.id = ch; x.pos = pos;
    Object.assign(x, extra[ch]?.x || {});
    chars.push(c); combatants.push(x);
  }
  const d = normalizeAll({ version: 3, campaign: { ...blankCampaign('T'), maps: [{ id: 'm', w: map.w, h: map.h, cells: map.cells }] }, chars, activeId: null, combat: { phase: 'fight', active: true, combatants, mapId: 'm' } });
  const X = (id) => d.combat.combatants.find((y) => y.id === id);
  return { d, ctx: mapCtx(d), X };
}

describe('Without a map, nothing is suggested', () => {
  it('no mapId, or a combatant off the map → null everywhere', () => {
    const { d, X } = fight('A . . X');
    d.combat.mapId = null;
    expect(mapCtx(d)).toBe(null);
    const ctx = mapCtx({ ...d, combat: { ...d.combat, mapId: 'm' } });
    X('X').pos = null;
    expect(posOf(ctx, X('X'))).toBe(null);
    expect(rangeBetween(ctx, X('A'), X('X'))).toBe(null);
    expect(sight(ctx, X('A'), X('X'))).toBe(null);
    expect(within(ctx, X('A'), X('X'), 'Proche')).toBe(null);
    expect(coverSuggestion(ctx, d, X('A'))).toBe(null);
    expect(nearestEnemyBand(ctx, d, X('A'))).toBe(null);
  });
});

describe('Range and sight', () => {
  it('range band and squares between two combatants', () => {
    const { ctx, X } = fight(`A ${'. '.repeat(6)}X`);
    const r = rangeBetween(ctx, X('A'), X('X'));
    expect(r).toEqual({ d: 7, band: 'Courte' });
    expect(bandText(r)).toBe('Courte (7 cases)');
    expect(bandText({ d: 1, band: 'Bras' })).toBe('Bras (1 case)');
  });
  it('GM overrides of the band edges apply', () => {
    const { d, X } = fight('A . . . X');
    expect(rangeBetween(mapCtx(d, { ...HOUSE.grid, bands: { Bras: 1, Proche: 5, Courte: 12 } }), X('A'), X('X')).band).toBe('Proche');
  });
  it('sight through a wall is refused; within() follows the band', () => {
    const { ctx, X } = fight(`
      A . # . X
      . . # . Y
    `);
    expect(sight(ctx, X('A'), X('X'))).toBe(false);
    expect(within(ctx, X('A'), X('X'), 'Proche')).toBe(false);
    expect(within(ctx, X('A'), X('X'), 'Courte')).toBe(true);
  });
});

describe('Cover suggestion (never applied by itself)', () => {
  it('against the nearest enemy in sight', () => {
    const { d, ctx, X } = fight('X . . . m A');
    expect(coverSuggestion(ctx, d, X('A'))).toMatchObject({ rating: 3, source: 'Meuble' });
    expect(d.chars.every((c) => !c.cover)).toBe(true);
  });
  it('skips an enemy that cannot see you, and destroyed or fled ones', () => {
    const { d, ctx, X } = fight(`
      Y . . . . . . .
      # # # # # # # #
      . . . . . . . .
      X . . . . . m A
    `);
    expect(coverSuggestion(ctx, d, X('A')).from.id).toBe('X');
    X('X').fled = true;
    expect(coverSuggestion(ctx, d, X('A'))).toBe(null); // Y is behind the wall
  });
  it('exposed → 0', () => {
    const { d, ctx, X } = fight('X . . . . A');
    expect(coverSuggestion(ctx, d, X('A')).rating).toBe(0);
  });
});

describe('Fleeing, moving, overwatch, blasts', () => {
  it('nearest enemy band for fleeing', () => {
    const { d, ctx, X } = fight('A . X . . . . . . Y');
    expect(nearestEnemyBand(ctx, d, X('A'))).toMatchObject({ d: 2, band: 'Proche' });
  });
  it('movement modules double the squares per maneuver', () => {
    const c = blankCharacter('pc');
    expect(moveSquaresFor(c)).toBe(4);
    c.modules = ['Accélérateur'];
    expect(moveSquaresFor(c)).toBe(8);
    expect(moveSquaresFor(c, undefined, 0)).toBe(4); // can't pay for it
    c.brokenModules = [0];
    expect(moveSquaresFor(c)).toBe(4);
  });
  it('longest ranged weapon', () => {
    const c = blankCharacter('pc');
    expect(maxWeaponRange(c)).toBe(null);
    c.weapons = [{ name: 'Pistolet maser', bonus: 2, degats: 3, portee: 'Courte' }, { name: 'Fusil laser', bonus: 3, degats: 3, portee: 'Lointaine' }];
    expect(maxWeaponRange(c)).toBe('Lointaine');
  });
  it('overwatch: only watchers on the other side, in sight and in weapon range', () => {
    const short = { c: { weapons: [{ name: 'Pistolet maser', bonus: 2, degats: 3, portee: 'Courte' }] }, x: { overwatch: true } };
    const { d, ctx, X } = fight(`
      X . . . A . . . . . . . . . . . . Z
      # # # # # # # # # # # # # # # # # #
      Y . . . . . . . . . . . . . . . . B
    `, { X: short, Y: { x: { overwatch: true } }, Z: short, B: { x: { overwatch: true } } });
    // X sees A at Courte; Y is behind the wall; Z is too far for its pistol; B is an ally.
    expect(overwatchers(ctx, d, X('A')).map((w) => w.x.id)).toEqual(['X']);
    X('X').overwatch = false;
    expect(overwatchers(ctx, d, X('A'))).toEqual([]);
  });
  it('blast from a square: victims in sight by band, nearest first', () => {
    const { d, ctx, X } = fight(`
      A . X . . . . Y . . . . . . . . . Z
      . . . . . . . . . . . . . . . . . .
      . . # . . . . . . . . . . . . . . .
      . . B . . . . . . . . . . . . . . .
    `);
    expect(blastFromCell(ctx, d, { x: 2, y: 0 }).map((v) => [v.xid, v.band])).toEqual([['X', 'Bras'], ['A', 'Proche'], ['Y', 'Courte']]);
    expect(blastFromCell(ctx, d, { x: 99, y: 0 })).toEqual([]);
    expect(takenSquares(ctx, d, 'A').sort()).toEqual(['17,0', '2,0', '2,3', '7,0']);
  });
});
