// The Store class itself: commit → reload (normalizeAll) → undo keeps the T03 fields.
import { describe, it, expect, beforeEach } from 'vitest';
import { store, normalizeAll, blankCharacter, OLD_SAVE } from '../store.svelte.js';
import { getDev } from '../settings.js';

const reload = () => normalizeAll(JSON.parse(JSON.stringify(store.data)));

beforeEach(() => { store.data = normalizeAll({}); });

describe('Store', () => {
  it('starts with no robot: store.c is null and robot commits do nothing', () => {
    expect(store.c).toBe(null);
    store.commit('x', (c) => (c.name = 'nope'));
    expect(store.chars).toEqual([]);
  });

  it('DEV levels: commit → reload → undo, and the accessor follows', () => {
    store.commitAll('Énergie', (d) => (d.campaign.dev.Energie = 77));
    expect(getDev().Energie).toBe(77);
    expect(reload().campaign.dev.Energie).toBe(77);
    store.commitAll('Énergie', (d) => (d.campaign.dev.Energie = 20));
    store.undo();
    expect(store.campaign.dev.Energie).toBe(77);
    expect(getDev().Energie).toBe(77);
  });

  it('journal: addJournal → reload → undo', () => {
    store.addJournal('Premier ordre de travail', { day: 1 });
    expect(reload().campaign.journal.map((j) => j.text)).toEqual(['Premier ordre de travail']);
    store.addJournal('Deuxième');
    store.undo();
    expect(store.campaign.journal.map((j) => j.text)).toEqual(['Premier ordre de travail']);
  });

  it('deleting the last robot leaves an empty team', () => {
    const id = store.addChar(blankCharacter('pc'));
    expect(store.c.id).toBe(id);
    store.removeChar(id);
    expect(store.chars).toEqual([]);
    expect(store.data.activeId).toBe(null);
    expect(store.c).toBe(null);
  });

  it('typing in one field is a single undo step', () => {
    const id = store.addChar(blankCharacter('pc'));
    for (const v of ['R', 'Ro', 'Rob']) store.type(id, 'name', (c) => (c.name = v));
    store.type(id, 'player', (c) => (c.player = 'Kim'));
    expect(store.c.name).toBe('Rob');
    store.undo();
    expect(store.c.player).toBe('');
    expect(store.c.name).toBe('Rob');
    store.undo();
    expect(store.c.name).toBe('');
  });

  it('undo keeps at most 40 steps', () => {
    for (let i = 1; i <= 45; i++) store.commitAll(null, (d) => (d.campaign.dev.Production = i));
    for (let i = 0; i < 50; i++) store.undo();
    expect(store.campaign.dev.Production).toBe(5);
  });

  it('maps and encounters are not rolled back by undo', () => {
    store.commitAll(null, (d) => { d.campaign.maps.push({ id: 'm1' }); d.campaign.dev.Information = 10; });
    store.undo();
    expect(store.campaign.dev.Information).toBe(50);
    expect(store.campaign.maps).toEqual([{ id: 'm1' }]);
  });

  it('a save of another version is refused', () => {
    expect(store.replaceAll({ version: 2, chars: [] })).toBe(false);
    expect(store.toast.text).toBe(OLD_SAVE);
    // A 2.x table also said version 3, but had no campaign.
    expect(store.replaceAll({ version: 3, chars: [blankCharacter()] })).toBe(false);
    expect(store.replaceAll({ version: 3, campaign: {}, chars: [blankCharacter()] })).toBe(true);
    expect(store.chars).toHaveLength(1);
  });

  it('undoing an import brings the previous maps back', () => {
    store.commitAll(null, (d) => d.campaign.maps.push({ id: 'mine' }));
    store.replaceAll({ version: 3, campaign: { maps: [{ id: 'theirs' }] }, chars: [] });
    expect(store.campaign.maps).toEqual([{ id: 'theirs' }]);
    store.undo();
    expect(store.campaign.maps).toEqual([{ id: 'mine' }]);
  });

  it('activeId follows the team when robots are added by a raw commit', () => {
    store.commitAll(null, (d) => d.chars.push(blankCharacter('pc')));
    expect(store.data.activeId).toBe(store.chars[0].id);
  });
});
