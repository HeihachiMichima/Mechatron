import { describe, it, expect } from 'vitest';
import { normalize, normalizeAll, blankCharacter, blankCombat, newCombatant } from '../store.svelte.js';
import { bookRobot, npc } from './helpers.js';
import { roundtrip } from './roundtrip.js';

describe('normalize', () => {
  it('turns garbage into a blank robot', () => {
    const c = normalize(null);
    const b = blankCharacter();
    expect({ ...c, id: '' }).toEqual({ ...b, id: '' });
  });

  it('keeps known fields, coerces types and drops unknown fields (and the old per-robot DEV levels)', () => {
    const c = normalize({ version: 2, name: 'Rouille', ep: { current: '7' }, damage: { servos: -3, reseau: 2 }, junk: 1, kind: 'npc', dev: { Energie: 80 } });
    expect('dev' in c).toBe(false);
    expect(c.name).toBe('Rouille');
    expect(c.ep.current).toBe(7);
    expect(c.damage.servos).toBe(0);
    expect(c.damage.reseau).toBe(2);
    expect(c.kind).toBe('npc');
    expect('junk' in c).toBe(false);
  });

  it('drops broken-module indexes that point past the module list', () => {
    const c = normalize({ version: 2, modules: ['a', 'b'], brokenModules: [1, 5, -1] });
    expect(c.brokenModules).toEqual([1]);
  });
});

describe('normalizeAll', () => {
  it('an empty save gives version 3, no robot, no active robot and a fresh campaign', () => {
    const d = normalizeAll({});
    expect(d.version).toBe(3);
    expect(d.chars).toEqual([]);
    expect(d.activeId).toBe(null);
    expect(d.combat).toEqual(blankCombat());
    expect(d.campaign).toMatchObject({ name: '', phase: 'creation', rules: {}, journal: [], clock: null, market: null, xp: { log: [] }, maps: [], encounters: [] });
    expect(Object.values(d.campaign.dev)).toEqual([50, 50, 50, 50]);
  });

  it('fixes duplicate ids and an unknown active id', () => {
    const a = bookRobot(); const b = bookRobot();
    b.id = a.id;
    const d = normalizeAll({ chars: [a, b], activeId: 'nope' });
    expect(new Set(d.chars.map((c) => c.id)).size).toBe(2);
    expect(d.activeId).toBe(d.chars[0].id);
  });

  it('drops combatants whose robot is gone and caps the log at 60 lines', () => {
    const a = bookRobot();
    const combat = blankCombat();
    combat.combatants = [newCombatant(a.id, 'ally'), newCombatant('ghost', 'enemy')];
    combat.log = Array.from({ length: 70 }, (_, i) => ({ round: 1, text: `l${i}` }));
    const d = normalizeAll({ chars: [a], activeId: a.id, combat });
    expect(d.combat.combatants.map((x) => x.cid)).toEqual([a.id]);
    expect(d.combat.log).toHaveLength(60);
    expect(d.combat.log[0].text).toBe('l10');
  });
});

describe('round-trip (save → reload)', () => {
  it('a table with PCs, NPCs and a fight in progress comes back unchanged', () => {
    const pc = bookRobot();
    pc.name = 'Brise-Fer'; pc.model = 'battle'; pc.damage.servos = 1; pc.armorDamage = 1;
    pc.weapons = [{ name: 'Pistolet laser', bonus: 3, degats: 2, portee: 'Longue', note: '', power: 'epack', empty: true, crankDue: false, oneUse: false, spent: false }];
    pc.modules = ['Lance-grenades', 'Accélérateur']; pc.brokenModules = [1];
    pc.equipment = [{ name: 'E-pack', integre: false }];
    const foe = npc('robot');
    const combat = blankCombat();
    combat.phase = 'fight'; combat.active = true; combat.round = 3; combat.gmPool = 4;
    const x = newCombatant(pc.id, 'ally'); x.init = 5; x.acted = true;
    x.lock = { target: 'abc', atk: 1, dmg: 1 };
    const y = newCombatant(foe.id, 'enemy'); y.init = 2; y.held = { by: pc.id, how: 'grip', mod: -1, with: '' };
    combat.combatants = [x, y];
    combat.log = [{ round: 3, text: 'Tir' }];
    const data = normalizeAll({ chars: [pc, foe], activeId: pc.id, combat });
    const { before, after, loaded } = roundtrip(data);
    expect(after).toEqual(before);
    expect(loaded.activeId).toBe(pc.id);
  });
});
