import { describe, it, expect, afterEach } from 'vitest';
import { setRng } from '../rng.js';
import { rollActivation, settleActivation } from '../energy.js';
import { findSecondary } from '../rules.js';
import { blankCharacter, blankCombat, payEp } from '../store.svelte.js';
import { rig } from './helpers.js';

afterEach(() => setRng(null));

const SAVER = "Économiseur d'énergie";

describe('rollActivation (overheating)', () => {
  it('no 1: works, pays the EP spent', () => {
    rig(4, 5);
    const act = rollActivation(blankCharacter(), 2);
    expect(act).toMatchObject({ dice: [4, 5], incident: null, cost: 2, works: true, effective: 2 });
  });

  it('a 1 rolls on the table; Bug (2) doubles the cost', () => {
    rig(1, 3, 2);
    const act = rollActivation(blankCharacter(), 2);
    expect(act.incident).toBe(2);
    expect(act.cost).toBe(4);
    expect(act.works).toBe(true);
  });

  it('Fatal Error (1): no effect, and settling breaks the module and pays', () => {
    const c = blankCharacter();
    c.modules = ['X'];
    c.ep.current = 5;
    rig(1, 1);
    const act = rollActivation(c, 1);
    expect(act.works).toBe(false);
    const data = { chars: [c], combat: blankCombat() };
    settleActivation(data, c, 0, act, payEp);
    expect(c.ep.current).toBe(4);
    expect(c.brokenModules).toEqual([0]);
  });

  it('Power Surge (6): each EP counts double', () => {
    rig(1, 6);
    const act = rollActivation(blankCharacter(), 1);
    expect(act.effective).toBe(2);
    expect(act.works).toBe(true);
  });

  it('Power Saver: one extra die, a 6 saves 1 EP', () => {
    expect(findSecondary(SAVER)).toBeTruthy();
    const c = blankCharacter();
    c.secondary = [SAVER];
    rig(6, 3);
    const act = rollActivation(c, 1);
    expect(act.dice).toEqual([6, 3]);
    expect(act.cost).toBe(0);
  });
});
