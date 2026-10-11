import { describe, it, expect, afterEach } from 'vitest';
import { setRng } from '../rng.js';
import { order, current, endTurn, rollInits } from '../combat.js';
import { blankCombat, newCombatant } from '../store.svelte.js';
import { bookRobot, npc, rig } from './helpers.js';

afterEach(() => setRng(null));

/** A table with the given robots, each in combat on the given side. */
function table(...entries) {
  const data = { chars: [], combat: blankCombat() };
  for (const [c, side, init] of entries) {
    data.chars.push(c);
    const x = newCombatant(c.id, side);
    x.init = init ?? null;
    data.combat.combatants.push(x);
  }
  return data;
}
const xOf = (data, c) => data.combat.combatants.find((x) => x.cid === c.id);

describe('order', () => {
  it('sorts by initiative, then current Stability, then the hidden tie', () => {
    const a = bookRobot(); a.name = 'A';
    const b = bookRobot(); b.name = 'B';
    const c = bookRobot(); c.name = 'C';
    const d = bookRobot(); d.name = 'D';
    b.damage.stabilite = 1; // same initiative as C, less Stability
    const data = table([a, 'ally', 3], [b, 'ally', 5], [c, 'enemy', 5], [d, 'enemy', 1]);
    xOf(data, a).tie = 0.1;
    expect(order(data).map((r) => r.c.name)).toEqual(['C', 'B', 'A', 'D']);
  });

  it('leaves out those who fled', () => {
    const a = bookRobot(); const b = bookRobot();
    const data = table([a, 'ally', 4], [b, 'enemy', 2]);
    xOf(data, a).fled = true;
    expect(order(data).map((r) => r.c.id)).toEqual([b.id]);
  });
});

describe('endTurn', () => {
  it('marks the actor; a new round starts once everybody has acted', () => {
    const a = bookRobot(); const b = bookRobot();
    const data = table([a, 'ally', 4], [b, 'enemy', 2]);
    const lines = [];
    const log = (t) => lines.push(t);
    expect(current(data).c.id).toBe(a.id);
    expect(endTurn(data, xOf(data, a), log)).toBe(false);
    expect(current(data).c.id).toBe(b.id);
    xOf(data, b).defending = true;
    expect(endTurn(data, xOf(data, b), log)).toBe(true);
    expect(data.combat.round).toBe(2);
    expect(data.combat.combatants.every((x) => !x.acted && !x.defending)).toBe(true);
    expect(lines).toEqual(['— Tour 2 —']);
  });

  it('skips deactivated robots when looking for the next actor', () => {
    const a = bookRobot(); const b = npc('robot');
    for (const k of Object.keys(b.damage)) b.damage[k] = 99;
    const data = table([a, 'ally', 4], [b, 'enemy', 2]);
    expect(endTurn(data, xOf(data, a), () => {})).toBe(true);
  });
});

describe('rollInits', () => {
  it('an NPC group shares one roll; surprise adds 2', () => {
    const g1 = npc('robot'); const g2 = npc('robot'); const pc = bookRobot();
    g1.group = g2.group = 'g';
    const data = table([g1, 'enemy'], [g2, 'enemy'], [pc, 'ally']);
    xOf(data, pc).surprise = true;
    rig(4, 1);
    rollInits(data, data.combat.combatants, () => {});
    expect([xOf(data, g1).init, xOf(data, g2).init, xOf(data, pc).init]).toEqual([4, 4, 3]);
  });
});
