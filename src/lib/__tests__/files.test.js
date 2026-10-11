// T04: campaign files (classify, name), automatic backups, start / import / restore.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { classifyImport, campaignFileName, makeBackup, listBackups, backupData, backupLabel } from '../campaign.js';
import { store, normalizeAll, blankCampaign, blankCharacter, VERSION, OLD_SAVE } from '../store.svelte.js';
import { demoParty } from '../demo.js';
import { bookRobot } from './helpers.js';

/** A Map-backed localStorage stand-in; `quota` makes every write throw. */
function fakeStorage({ quota = false } = {}) {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (quota) throw new Error('QuotaExceededError'); m.set(k, String(v)); },
    removeItem: (k) => m.delete(k),
    keys: () => [...m.keys()].sort()
  };
}
const save = (name, n = 0) => ({ version: VERSION, campaign: blankCampaign(name), chars: Array.from({ length: n }, () => blankCharacter()), activeId: null });
const strip = (d) => JSON.parse(JSON.stringify(d, (k, v) => (k === 'id' || k === 'color' || k === 'activeId' || k === 'cid' || k === 'tie' ? undefined : v)));

describe('classifyImport', () => {
  it('recognises campaigns, robots, old files and junk', () => {
    expect(classifyImport(save('A'))).toBe('campaign');
    expect(classifyImport(bookRobot())).toBe('robot');
    expect(classifyImport({ version: 2, chars: [] })).toBe('old');
    expect(classifyImport({ version: 3, chars: [] })).toBe('old'); // 2.x table: no campaign
    expect(classifyImport({ version: 4, campaign: {}, chars: [] })).toBe('old');
    expect(classifyImport({ name: 'x' })).toBe('unknown');
    expect(classifyImport([1, 2])).toBe('unknown');
    expect(classifyImport(null)).toBe('unknown');
  });

  it('names the file after the campaign', () => {
    expect(campaignFileName('Le Fantôme dans la machine !')).toBe('le-fantome-dans-la-machine.mechatron.json');
    expect(campaignFileName('')).toBe('campagne.mechatron.json');
  });
});

describe('automatic backups', () => {
  it('keeps the 3 newest, newest first, with date, name and robot count', () => {
    const s = fakeStorage();
    ['A', 'B', 'C', 'D'].forEach((n, i) => makeBackup(s, save(n, i), { reason: 'Ouverture', now: new Date(2026, 9, 11, 10 + i) }));
    const list = listBackups(s);
    expect(list.map((b) => b.name)).toEqual(['D', 'C', 'B']);
    expect(list[0].robots).toBe(3);
    expect(list.map((b) => b.n)).toEqual([1, 2, 3]);
    expect(backupData(s, 3).campaign.name).toBe('B');
    expect(s.keys()).toEqual(['mechatron-v3-backup-1', 'mechatron-v3-backup-2', 'mechatron-v3-backup-3']);
    expect(backupLabel(list[0])).toBe("D, 3 robots, à l'ouverture");
  });

  it('ifChanged: no copy when the newest backup holds the same data', () => {
    const s = fakeStorage();
    expect(makeBackup(s, save('A'), { ifChanged: true })).toBe(true);
    const same = JSON.parse(backupData(s, 1) && JSON.stringify(backupData(s, 1)));
    expect(makeBackup(s, same, { ifChanged: true })).toBe(false);
    expect(listBackups(s)).toHaveLength(1);
    same.campaign.name = 'A2';
    expect(makeBackup(s, same, { ifChanged: true })).toBe(true);
    expect(listBackups(s).map((b) => b.name)).toEqual(['A2', 'A']);
  });

  it('a full storage just skips the backup', () => {
    expect(makeBackup(fakeStorage({ quota: true }), save('A'))).toBe(false);
    expect(makeBackup(null, save('A'))).toBe(false);
    expect(listBackups(null)).toEqual([]);
  });
});

describe('Store: campaign lifecycle', () => {
  let ls;
  beforeEach(() => { ls = fakeStorage(); globalThis.localStorage = ls; store.data = normalizeAll({}); store.started = false; });
  afterEach(() => { delete globalThis.localStorage; });

  it('start() opens a campaign and saves it at once', () => {
    expect(store.start(save('Neuve'))).toBe(true);
    expect(store.started).toBe(true);
    expect(JSON.parse(ls.getItem('mechatron-v3')).campaign.name).toBe('Neuve');
  });

  it('nothing is saved while no campaign exists (welcome screen)', () => {
    store.flush();
    expect(ls.getItem('mechatron-v3')).toBe(null);
  });

  it('start() refuses another version and stays on the welcome screen', () => {
    expect(store.start({ version: 2, chars: [] })).toBe(false);
    expect(store.started).toBe(false);
    expect(store.toast.text).toBe(OLD_SAVE);
  });

  it('export → import in a clean profile gives the same state', () => {
    const party = demoParty();
    const cp = { ...blankCampaign('Démo'), phase: 'play', journal: [{ at: '2026-10-11T10:00:00.000Z', text: 'Départ' }], maps: [{ id: 'm1' }] };
    store.start({ version: VERSION, campaign: cp, ...party });
    store.commitAll(null, (d) => { d.campaign.dev.Energie = 70; d.chars[0].ep.current = 3; });
    const file = JSON.parse(JSON.stringify(store.exportData()));
    expect(classifyImport(file)).toBe('campaign');
    const before = strip(file);
    // Clean profile.
    store.data = normalizeAll({}); store.started = false;
    store.start(file);
    expect(strip(store.exportData())).toEqual(before);
    expect(store.campaign.maps).toEqual([{ id: 'm1' }]);
  });

  it('a failed import changes nothing', () => {
    store.start(save('Mienne', 2));
    const before = JSON.stringify(store.exportData());
    expect(store.replaceAll({ version: 2, chars: [] })).toBe(false);
    expect(store.replaceAll(null)).toBe(false);
    expect(JSON.stringify(store.exportData())).toBe(before);
    expect(listBackups(ls)).toEqual([]);
  });

  it('importing backs up the current campaign; undo brings it back', () => {
    store.start(save('Mienne', 2));
    store.replaceAll(save('Leur', 1), 'Importée');
    expect(store.campaign.name).toBe('Leur');
    expect(listBackups(ls).map((b) => [b.name, b.robots, b.reason])).toEqual([['Mienne', 2, 'Avant remplacement']]);
    store.undo();
    expect(store.campaign.name).toBe('Mienne');
    expect(store.chars).toHaveLength(2);
  });

  it('restoring a backup works and is undoable', () => {
    store.start(save('Ancienne', 1));
    store.backup('Fin de séance');
    store.renameCampaign('Actuelle');
    store.commitAll(null, (d) => d.chars.push(blankCharacter()));
    expect(store.restoreBackup(1)).toBe(true);
    expect(store.campaign.name).toBe('Ancienne');
    expect(store.chars).toHaveLength(1);
    expect(listBackups(ls)).toHaveLength(1); // restoring doesn't push the others out
    store.undo();
    expect(store.campaign.name).toBe('Actuelle');
    expect(store.chars).toHaveLength(2);
  });

  it('restoring from the welcome screen starts the campaign', () => {
    makeBackup(ls, save('Sauvée', 3));
    expect(store.restoreBackup(1)).toBe(true);
    expect(store.started).toBe(true);
    expect(store.chars).toHaveLength(3);
  });

  it('rename: commit → reload → undo', () => {
    store.start(save('Avant'));
    store.renameCampaign('  Après ');
    expect(normalizeAll(JSON.parse(JSON.stringify(store.data))).campaign.name).toBe('Après');
    store.undo();
    expect(store.campaign.name).toBe('Avant');
  });
});
