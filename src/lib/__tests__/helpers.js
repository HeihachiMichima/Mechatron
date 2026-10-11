// Shared test helpers (not a test file: Vitest only runs *.test.js).
import { setRng } from '../rng.js';
import { GAME_DATA as D } from '../data.js';
import { blankCharacter, fromTemplate } from '../store.svelte.js';

/** Float that makes rng.d6() return face `v` (1-6). */
export const face = (v) => (v - 0.5) / 6;

/**
 * Force the next dice to the given faces, in order. When the list runs out,
 * every further draw is a 3 (no success, no 1), so a test notices extra rolls
 * only through its own assertions, never through a crash.
 */
export function rig(...faces) {
  const q = [...faces];
  setRng(() => face(q.length ? q.shift() : 3));
  return q; // what's left, so a test can check that all dice were used
}

/** A chassis robot built from real book parts (the first of each list). */
export function bookRobot(kind = 'pc') {
  const c = blankCharacter(kind);
  c.head = D.chassis.heads[0].name;
  c.torso = D.chassis.torsos[0].name;
  c.undercarriage = D.chassis.undercarriages[0].name;
  return c;
}

/** An NPC from the first book template whose body matches. */
export const npc = (body = 'robot') => fromTemplate(D.npcTemplates.find((t) => t.body === body));
