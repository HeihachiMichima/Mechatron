import { describe, it, expect, afterEach } from 'vitest';
import { setRng, d6, random, pick } from '../rng.js';

afterEach(() => setRng(null));

describe('rng', () => {
  it('a seed gives the same dice every time', () => {
    setRng(7);
    const a = Array.from({ length: 20 }, d6);
    setRng(7);
    expect(Array.from({ length: 20 }, d6)).toEqual(a);
    expect(a.every((v) => Number.isInteger(v) && v >= 1 && v <= 6)).toBe(true);
    expect(new Set(a).size).toBeGreaterThan(1);
  });

  it('a function is used as the source; null goes back to Math.random', () => {
    setRng(() => 0.999);
    expect(d6()).toBe(6);
    expect(pick(['a', 'b'])).toBe('b');
    setRng(null);
    const v = random();
    expect(v >= 0 && v < 1).toBe(true);
  });
});
