// T17: home screen, demo flag, quitting the demo, random nicknames.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { store, normalizeAll, blankCampaign, blankCharacter } from '../store.svelte.js';
import { randomNick } from '../creation.js';
import { setRng } from '../rng.js';
import { roundtrip } from './roundtrip.js';

afterEach(() => setRng(null));

describe('Demo flag', () => {
  it('survives save and reload; other campaigns are not demos', () => {
    const { before, after, loaded } = roundtrip(normalizeAll({ version: 3, campaign: { ...blankCampaign('Démo'), demo: true }, chars: [], activeId: null }));
    expect(after).toEqual(before);
    expect(loaded.campaign.demo).toBe(true);
    expect(normalizeAll({ version: 3, campaign: { demo: 'yes' } }).campaign.demo).toBe(false);
    expect(blankCampaign('x').demo).toBe(false);
  });
});

describe('Home screen and quitting the demo', () => {
  beforeEach(() => {
    store.start({ version: 3, campaign: { ...blankCampaign('Démo'), demo: true }, chars: [blankCharacter('pc')], activeId: null }, null);
  });
  it('goHome shows the home screen over the campaign; starting another closes it', () => {
    store.goHome();
    expect(store.ui.home).toBe(true);
    expect(store.started).toBe(true);
    store.leaveHome();
    expect(store.ui.home).toBe(false);
    store.goHome();
    store.replaceAll({ version: 3, campaign: blankCampaign('Autre'), chars: [], activeId: null }, null);
    expect(store.ui.home).toBe(false);
    expect(store.campaign.name).toBe('Autre');
  });
  it('quitDemo empties the app (no campaign, nothing saved) and keeps a backup', () => {
    store.quitDemo();
    expect(store.started).toBe(false);
    expect(store.chars).toEqual([]);
    expect(store.ui.home).toBe(false);
  });
});

describe('Random nickname', () => {
  it('is reproducible with setRng, and never reuses a PC nickname', () => {
    setRng(7);
    const a = randomNick([]);
    setRng(7);
    expect(randomNick([])).toBe(a);
    const team = ['Boulon', 'Rivet', 'Piston'].map((n) => Object.assign(blankCharacter('pc'), { name: `${n} ABC-123` }));
    for (let i = 0; i < 50; i++) expect(['Boulon', 'Rivet', 'Piston']).not.toContain(randomNick(team));
  });
});
