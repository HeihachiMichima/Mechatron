// T13: saved maps, token positions, SVG paths and spawn zones.
import { describe, it, expect, beforeEach } from 'vitest';
import { store, normalizeAll, blankCampaign, blankCharacter, newCombatant } from '../store.svelte.js';
import { normalizeMap, parseMap, terrainPaths, cellsPath, gridPath, ring, spawnPlaces, canStand, blankMap } from '../tactics/index.js';
import { roundtrip } from './roundtrip.js';

const reload = () => normalizeAll(JSON.parse(JSON.stringify(store.data)));

describe('normalizeMap', () => {
  it('keeps a good map as it is', () => {
    const m = { id: 'm1', name: 'Quai', w: 3, h: 2, cells: '.#m~:.' };
    expect(normalizeMap(m)).toEqual(m);
  });
  it('clamps sizes, pads or cuts the cells, turns unknown terrain into floor', () => {
    expect(normalizeMap({ id: 'x', w: 99, h: 0, cells: '##' })).toMatchObject({ w: 32, h: 1, cells: '##' + '.'.repeat(30) });
    expect(normalizeMap({ id: 'x', w: 2, h: 2, cells: '#Z#m.....' }).cells).toBe('#.#m');
    expect(normalizeMap(null, () => 'new').id).toBe('new');
  });
});

describe('Persistence (round-trip, reload, undo)', () => {
  function table() {
    const a = blankCharacter('pc'); a.name = 'A';
    const b = blankCharacter('npc'); b.name = 'B';
    const xa = newCombatant(a.id, 'ally'); xa.pos = { x: 1, y: 2 };
    const xb = newCombatant(b.id, 'enemy');
    const campaign = { ...blankCampaign('T'), maps: [{ id: 'm1', name: 'Salle', w: 4, h: 3, cells: '....#.......' }] };
    return { version: 3, campaign, chars: [a, b], activeId: a.id, combat: { ...normalizeAll({}).combat, mapId: 'm1', combatants: [xa, xb] } };
  }
  it('maps, the fight\'s map and token positions survive a save and reload', () => {
    const { before, after, loaded } = roundtrip(table());
    expect(after).toEqual(before);
    expect(loaded.campaign.maps[0].id).toBe('m1');
    expect(loaded.combat.mapId).toBe('m1');
    expect(loaded.combat.combatants.map((x) => x.pos)).toEqual([{ x: 1, y: 2 }, null]);
  });
  it('saveMap is not an undo step; placing a token is', () => {
    store.data = normalizeAll(table());
    const id = store.saveMap({ name: 'Neuve', w: 5, h: 4 });
    expect(reload().campaign.maps.map((m) => m.name)).toEqual(['Salle', 'Neuve']);
    const xb = store.combat.combatants[1].id;
    store.placeToken(xb, { x: 3, y: 0 });
    expect(reload().combat.combatants[1].pos).toEqual({ x: 3, y: 0 });
    store.saveMap({ ...store.campaign.maps.find((m) => m.id === id), cells: '#'.repeat(20) });
    store.undo(); // undoes the move, keeps the maps as they are now
    expect(store.combat.combatants[1].pos).toBe(null);
    expect(store.campaign.maps.find((m) => m.id === id).cells).toBe('#'.repeat(20));
  });
  it('choosing the map is undoable; deleting a map clears the fight\'s choice', () => {
    store.data = normalizeAll(table());
    store.setCombatMap(null);
    expect(store.combatMap).toBe(null);
    store.undo();
    expect(store.combatMap.id).toBe('m1');
    store.removeMap('m1');
    expect(store.campaign.maps).toEqual([]);
    expect(store.combat.mapId).toBe(null);
  });
  it('bad positions are dropped', () => {
    const t = table();
    t.combat.combatants[0].pos = { x: -1, y: 2 };
    t.combat.combatants[1].pos = { x: 'a', y: 1 };
    expect(normalizeAll(t).combat.combatants.map((x) => x.pos)).toEqual([null, null]);
  });
});

describe('SVG paths', () => {
  it('one path per terrain, cells merged by row', () => {
    const { map } = parseMap(`
      # # .
      . m m
    `);
    const p = terrainPaths(map);
    expect(p['#']).toBe('M0 0h2v1h-2z');
    expect(p.m).toBe('M1 1h2v1h-2z');
    expect(p['.']).toBe('M2 0h1v1h-1zM0 1h1v1h-1z');
  });
  it('cell sets merge runs; grid lines are one path', () => {
    expect(cellsPath(['0,0', '1,0', '3,0', { x: 0, y: 2 }])).toBe('M0 0h2v1h-2zM3 0h1v1h-1zM0 2h1v1h-1z');
    expect(gridPath(2, 2)).toBe('M1 0V2M0 1H2');
  });
  it('band rings are clipped to the map', () => {
    expect(ring(blankMap(10, 8), { x: 1, y: 1 }, 3)).toEqual({ x: 0, y: 0, w: 5, h: 5 });
  });
});

describe('Spawn zones', () => {
  it('allies on a, enemies on e, row by row, skipping taken squares', () => {
    const { map } = parseMap(`
      a a . e
      a . . e
    `);
    const out = spawnPlaces(map, [{ id: 1, side: 'ally' }, { id: 2, side: 'ally' }, { id: 3, side: 'enemy' }, { id: 4, side: 'enemy' }, { id: 5, side: 'enemy' }], ['0,0']);
    expect(out).toEqual({ 1: { x: 1, y: 0 }, 2: { x: 0, y: 1 }, 3: { x: 3, y: 0 }, 4: { x: 3, y: 1 } });
  });
  it('a token stands only on a free, passable square', () => {
    const { map } = parseMap('. # ~ m');
    expect([0, 1, 2, 3].map((x) => canStand(map, { x, y: 0 }))).toEqual([true, false, false, true]);
    expect(canStand(map, { x: 0, y: 0 }, ['0,0'])).toBe(false);
    expect(canStand(map, { x: 9, y: 0 })).toBe(false);
  });
});
