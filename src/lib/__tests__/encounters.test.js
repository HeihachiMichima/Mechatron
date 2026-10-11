// T15: encounter library, files, quick setups and launching.
import { describe, it, expect, beforeEach } from 'vitest';
import { store, normalizeAll, blankCampaign, blankCharacter, newId } from '../store.svelte.js';
import { normalizeEncounter, enemyLine, matches, encounterFile, readEncounterFile, PRESETS, cleanTags } from '../encounters.js';
import { TERRAIN, inside } from '../tactics/index.js';
import { GAME_DATA as D } from '../data.js';
import { roundtrip } from './roundtrip.js';

const reload = () => normalizeAll(JSON.parse(JSON.stringify(store.data)));
function team(n = 4) {
  const chars = Array.from({ length: n }, (_, i) => Object.assign(blankCharacter('pc'), { name: `PJ ${i + 1}`, model: 'battle', head: 'Pashin Ama 9', torso: 'Ganymeda Nava PRS', undercarriage: 'LBM Terra 004' }));
  return normalizeAll({ version: 3, campaign: blankCampaign('T'), chars, activeId: chars[0].id });
}

describe('normalizeEncounter', () => {
  it('keeps a good encounter, drops unknown templates, clamps counts', () => {
    const e = normalizeEncounter({ id: 'e1', name: 'Rixe', tags: [' Nuit ', 'nuit', 'BAR'], mapId: 'm', enemies: [{ template: 'guard', count: 40 }, { template: 'nope', count: 1 }, { template: 'sentinel', count: 1, side: 'ally' }], surprise: 'allies', gmPool: '12', notes: 'x' });
    expect(e).toEqual({ id: 'e1', name: 'Rixe', tags: ['nuit', 'bar'], mapId: 'm', enemies: [{ template: 'guard', count: 12, side: 'enemy' }, { template: 'sentinel', count: 1, side: 'ally' }], surprise: 'allies', gmPool: 12, notes: 'x' });
    expect(normalizeEncounter({ gmPool: '' }, () => 'new')).toMatchObject({ id: 'new', gmPool: null, surprise: 'none', enemies: [] });
    expect(cleanTags('a, b ,,a')).toEqual(['a', 'b']);
  });
  it('enemy line and search (accents ignored)', () => {
    const e = normalizeEncounter({ name: 'Entrepôt', tags: ['couverture'], enemies: [{ template: 'guard', count: 2 }, { template: 'sentinel', count: 1, side: 'ally' }] });
    expect(enemyLine(e)).toBe('2 × Robot de garde, Unité Sentinelle (allié)');
    expect(matches(e, 'entrepot')).toBe(true);
    expect(matches(e, 'sentinelle')).toBe(true);
    expect(matches(e, 'quai')).toBe(false);
  });
  it('survives save, reload and undo (not an undo step itself)', () => {
    const d = team(1);
    d.campaign.encounters = [normalizeEncounter({ id: 'e1', name: 'A', enemies: [{ template: 'guard', count: 2 }] })];
    const { before, after } = roundtrip(d);
    expect(after).toEqual(before);
    store.data = d;
    store.commitAll('x', (dd) => (dd.campaign.dev.Energie = 10));
    store.saveEncounter({ name: 'B' });
    store.undo();
    expect(store.campaign.encounters.map((e) => e.name)).toEqual(['A', 'B']);
    expect(reload().campaign.encounters).toHaveLength(2);
    store.removeEncounter(store.campaign.encounters[1].id);
    expect(store.campaign.encounters.map((e) => e.name)).toEqual(['A']);
  });
});

describe('Encounter files', () => {
  it('export carries the maps used; import gives fresh ids and keeps the links', () => {
    const maps = [{ id: 'm1', name: 'Salle', w: 4, h: 3, cells: '#'.repeat(12) }, { id: 'm2', name: 'Autre', w: 2, h: 2, cells: '....' }];
    const encs = [normalizeEncounter({ id: 'e1', name: 'A', mapId: 'm1', enemies: [{ template: 'guard', count: 1 }] })];
    const file = JSON.parse(JSON.stringify(encounterFile(encs, maps)));
    expect(file.maps.map((m) => m.id)).toEqual(['m1']);
    const read = readEncounterFile(file, newId);
    expect(read.maps[0].id).not.toBe('m1');
    expect(read.encounters[0].mapId).toBe(read.maps[0].id);
    expect(read.encounters[0].id).not.toBe('e1');
    expect(readEncounterFile({ hello: 1 }, newId)).toBe(null);
  });
});

describe('Quick setups', () => {
  it('four original maps of 20 × 14, known terrain, enough spawn squares, book templates', () => {
    expect(PRESETS).toHaveLength(4);
    for (const p of PRESETS) {
      expect(p.map.cells).toHaveLength(p.map.w * p.map.h);
      expect([p.map.w, p.map.h]).toEqual([20, 14]);
      expect([...p.map.cells].every((ch) => TERRAIN[ch])).toBe(true);
      const count = (ch) => [...p.map.cells].filter((c) => c === ch).length;
      expect(count('a')).toBeGreaterThanOrEqual(4);
      expect(count('e')).toBeGreaterThanOrEqual(p.enemies.reduce((t, e) => t + e.count, 0));
      expect(p.enemies.every((e) => D.npcTemplates.some((t) => t.id === e.template))).toBe(true);
      expect(normalizeEncounter(p)).toMatchObject({ name: p.name, surprise: p.surprise });
    }
  });
});

describe('Launching', () => {
  beforeEach(() => { store.data = team(4); });
  it('a quick setup: the team + its NPCs (shared group), surprise, pool, map, tokens on the spawn zones', () => {
    const p = PRESETS[0]; // Couloir de service: 2 gardes + 1 sentinelle, ambush
    store.launchEncounter(p);
    const cb = store.combat;
    expect(store.space).toBe('combat');
    expect(cb.phase).toBe('prep');
    expect(cb.combatants).toHaveLength(7);
    const npcs = cb.combatants.filter((x) => x.side === 'enemy').map((x) => store.char(x.cid));
    expect(npcs.map((c) => c.name)).toEqual(['Robot de garde 1', 'Robot de garde 2', 'Unité Sentinelle']);
    expect(npcs[0].group).toBeTruthy();
    expect(npcs[0].group).toBe(npcs[1].group);
    expect(cb.combatants.filter((x) => x.surprise).every((x) => x.side === 'enemy')).toBe(true);
    expect(cb.combatants.filter((x) => x.surprise)).toHaveLength(3);
    expect(cb.gmPool).toBeGreaterThan(0);
    const map = store.combatMap;
    expect(map.name).toBe('Couloir de service');
    for (const x of cb.combatants) {
      expect(inside(map, x.pos)).toBe(true);
      expect(map.cells[x.pos.y * map.w + x.pos.x]).toBe(x.side === 'ally' ? 'a' : 'e');
    }
    // Relaunching reuses the same map copy.
    store.launchEncounter(p);
    expect(store.campaign.maps).toHaveLength(1);
  });
  it('one undo step; the GM pool can be fixed; unknown map → no map', () => {
    const before = store.combat.combatants.length;
    store.launchEncounter({ name: 'Rixe', mapId: 'nope', gmPool: 7, enemies: [{ template: 'guard', count: 1 }, { template: 'sentinel', count: 1, side: 'ally' }], surprise: 'allies' });
    expect(store.combat.mapId).toBe(null);
    expect(store.combat.gmPool).toBe(7);
    const sentinel = store.combat.combatants.find((x) => store.char(x.cid).name === 'Unité Sentinelle');
    expect(sentinel).toMatchObject({ side: 'ally', surprise: true });
    store.undo();
    expect(store.combat.combatants).toHaveLength(before);
    expect(store.chars.filter((c) => c.kind === 'npc')).toHaveLength(0);
  });
});
