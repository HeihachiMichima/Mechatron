import { describe, it, expect, afterEach } from 'vitest';
import { GAME_DATA as D } from '../data.js';
import { setRng } from '../rng.js';
import { chassis, tally, push, rollPool, resolveDamage, rollInitiative, maxPushes, hitLocation, armorCurrent, attrCurrent, findSecondary } from '../rules.js';
import { blankCharacter } from '../store.svelte.js';
import { rig, bookRobot, npc } from './helpers.js';

afterEach(() => setRng(null));

describe('chassis', () => {
  it('adds up the three book parts', () => {
    const c = bookRobot();
    const parts = [D.chassis.heads[0], D.chassis.torsos[0], D.chassis.undercarriages[0]];
    const ch = chassis(c);
    expect(ch.known).toBe(3);
    for (const a of ['servos', 'stabilite', 'processeur', 'reseau']) expect(ch.attrMax[a]).toBe(parts.reduce((t, p) => t + p[a], 0));
    expect(ch.armorBase).toBe(parts.reduce((t, p) => t + p.armor, 0));
    expect(ch.slots).toBe(parts.reduce((t, p) => t + p.slots, 0));
  });

  it('falls back to the default slot count with no known part', () => {
    const ch = chassis(blankCharacter());
    expect(ch.known).toBe(0);
    expect(ch.slots).toBe(D.defaults.slotsDefault);
  });

  it('uses typed stats in direct mode, with at least one slot per module', () => {
    const c = blankCharacter('npc');
    c.statMode = 'direct';
    c.direct = { servos: 4, stabilite: 3, processeur: 2, reseau: 1, armor: 2, slots: 1 };
    c.modules = ['a', 'b', 'c'];
    const ch = chassis(c);
    expect(ch.attrMax).toEqual({ servos: 4, stabilite: 3, processeur: 2, reseau: 1 });
    expect(ch.armorBase).toBe(2);
    expect(ch.slots).toBe(3);
  });
});

describe('dice', () => {
  it('tally: 6s succeed, negative 6s cancel them, 1s are counted per type', () => {
    const t = tally([
      { t: 'base', v: 6 }, { t: 'prog', v: 6 }, { t: 'gear', v: 1 },
      { t: 'base', v: 1 }, { t: 'neg', v: 6 }, { t: 'prog', v: 1 }
    ]);
    expect(t).toEqual({ successes: 1, cancelled: 1, baseOnes: 1, gearOnes: 1, gear: 1 });
  });

  it('push: keeps 6s and the base/gear 1s, rerolls everything else', () => {
    expect(D.rules.pushKeepsOnes).toBe(true);
    rig(6, 6, 6);
    const out = push([
      { t: 'base', v: 6 }, { t: 'base', v: 1 }, { t: 'gear', v: 1 },
      { t: 'prog', v: 1 }, { t: 'prog', v: 3 }, { t: 'neg', v: 2 }
    ]);
    expect(out.map((d) => d.v)).toEqual([6, 1, 1, 6, 6, 6]);
    expect(out.map((d) => d.rerolled)).toEqual([false, false, false, true, true, true]);
  });

  it('rollPool: one die per type and count, reproducible with a seed', () => {
    setRng(42);
    const a = rollPool({ base: 3, prog: 2, gear: 1, neg: 1 });
    setRng(42);
    const b = rollPool({ base: 3, prog: 2, gear: 1, neg: 1 });
    expect(a).toEqual(b);
    expect(a.map((d) => d.t)).toEqual(['base', 'base', 'base', 'prog', 'prog', 'gear', 'neg']);
    expect(a.every((d) => d.v >= 1 && d.v <= 6)).toBe(true);
  });

  it('maxPushes: two with Surrégime', () => {
    const c = blankCharacter();
    expect(maxPushes(c)).toBe(1);
    expect(findSecondary('Surrégime')).toBeTruthy();
    c.secondary = ['Surrégime'];
    expect(maxPushes(c)).toBe(2);
  });

  it('rollInitiative: SWAT Tactics rolls two and keeps the best', () => {
    const c = blankCharacter();
    rig(4);
    expect(rollInitiative(c)).toEqual({ value: 4, text: '4' });
    expect(findSecondary('Tactiques SWAT')).toBeTruthy();
    c.secondary = ['Tactiques SWAT'];
    rig(2, 5);
    expect(rollInitiative(c)).toEqual({ value: 5, text: '2 et 5, garde 5' });
  });
});

describe('resolveDamage', () => {
  it('a forced location takes the damage when armor is ignored', () => {
    const c = bookRobot();
    const out = resolveDamage(c, { amount: 1, ignoreArmor: true, location: 'servos' });
    expect(out.taken).toBe(1);
    expect(c.damage.servos).toBe(1);
  });

  it('cover blocks with 6s (ranged only) and keeps its rating when nothing gets through', () => {
    const c = bookRobot();
    rig(6, 6);
    const out = resolveDamage(c, { amount: 2, ranged: true, coverRating: 2 });
    expect(out.taken).toBe(0);
    expect(out.newCover).toBe(2);
    expect(out.steps.at(-1)).toBe('Aucun dégât ne passe.');
  });

  it('cover wears by its 1s when damage gets through', () => {
    const c = bookRobot();
    rig(6, 1);
    const out = resolveDamage(c, { amount: 2, ranged: true, coverRating: 2, ignoreArmor: true, location: 'servos' });
    expect(out.coverDice).toEqual([6, 1]);
    expect(out.newCover).toBe(1);
    expect(c.damage.servos).toBe(1);
  });

  it('armor wears by its 1s when damage gets through', () => {
    const c = bookRobot();
    const armor = armorCurrent(c, chassis(c));
    expect(armor).toBeGreaterThanOrEqual(2);
    rig(1, 1); // the other armor dice are 3s
    resolveDamage(c, { amount: 1, location: 'stabilite' });
    expect(c.armorDamage).toBe(2);
    expect(c.damage.stabilite).toBe(1);
  });

  it('a random hit uses the D6 location table', () => {
    const c = bookRobot();
    rig(3);
    resolveDamage(c, { amount: 1, ignoreArmor: true });
    expect(hitLocation(3)).toBe('stabilite');
    expect(c.damage.stabilite).toBe(1);
  });

  it('a 6 on the location table breaks a module', () => {
    const c = bookRobot();
    c.modules = [D.modules[0].name, D.modules[1].name];
    rig(6, 1); // location 6, then the module pick (a low roll picks the first)
    resolveDamage(c, { amount: 1, ignoreArmor: true });
    expect(c.brokenModules).toEqual([0]);
  });

  it('creatures take all damage to Strength (servos slot)', () => {
    const c = npc('creature');
    const ch = chassis(c);
    const before = attrCurrent(c, ch, 'servos');
    const out = resolveDamage(c, { amount: before + 3, ignoreArmor: true });
    expect(c.damage.servos).toBe(before);
    expect(out.deactivated).toBe(true);
  });
});
