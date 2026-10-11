// Every random draw in the game goes through here, so tests (and agents in a
// browser, via window.__mechatron.setRng) can make dice reproducible.
// Ids and toast keys are not dice: they keep using Math.random directly.

let rand = Math.random;

/** Mulberry32: tiny, fast, good enough for dice. Returns floats in [0, 1). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seed the dice. A number gives a reproducible sequence; a function is used
 * as the source itself (it must return floats in [0, 1)); null or nothing
 * goes back to Math.random.
 */
export function setRng(seed) {
  if (typeof seed === 'function') rand = seed;
  else if (seed == null) rand = Math.random;
  else rand = mulberry32(Number(seed));
}

/** A float in [0, 1). */
export const random = () => rand();
/** One six-sided die. */
export const d6 = () => 1 + Math.floor(rand() * 6);
/** A random element of a non-empty array. */
export const pick = (list) => list[Math.floor(rand() * list.length)];
