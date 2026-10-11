// T05: spaces, the fiche on screen and the « Mode MJ » switch (UI prefs, per device).
import { describe, it, expect, beforeEach } from 'vitest';
import { store, normalizeAll, blankCharacter, cleanUi } from '../store.svelte.js';

let pc, pc2, npc;
beforeEach(() => {
  store.data = normalizeAll({});
  Object.assign(store.ui, { space: 'equipe', tab: 'etat', gm: false, npc: null, sheet: null });
  pc = store.addChar({ ...blankCharacter('pc'), name: 'Brise-Fer' });
  pc2 = store.addChar({ ...blankCharacter('pc'), name: 'Clou' }, { activate: false });
  npc = store.addChar({ ...blankCharacter('npc'), name: 'Garde' }, { activate: false });
});

describe('UI prefs', () => {
  it('keeps known values and drops the rest (no campaign data in there)', () => {
    expect(cleanUi({ space: 'seance', tab: 'materiel', theme: 'dark', gm: true, chars: [] }))
      .toEqual({ space: 'seance', tab: 'materiel', theme: 'dark', gm: true });
    expect(cleanUi({ space: 'collectif', tab: 'combat', theme: 'pink', gm: 'yes' }))
      .toEqual({ space: 'equipe', tab: 'etat', theme: 'auto', gm: false });
    expect(cleanUi(null)).toEqual({ space: 'equipe', tab: 'etat', theme: 'auto', gm: false });
  });

  it('GM mode is not part of the campaign: export and reload ignore it', () => {
    store.setGm(true);
    expect(JSON.stringify(store.exportData())).not.toMatch(/"gm"/);
    expect(normalizeAll(store.exportData()).campaign).not.toHaveProperty('gm');
  });
});

describe('Spaces', () => {
  it('Équipe shows the active PC; the other spaces have no fiche', () => {
    expect(store.fiche.id).toBe(pc);
    for (const s of ['energie', 'marche', 'combat', 'seance']) { store.go(s); expect(store.space).toBe(s); expect(store.fiche).toBe(null); }
  });

  it('MJ needs GM mode', () => {
    store.go('mj');
    expect(store.space).toBe('equipe');
    store.ui.space = 'mj'; // a stale pref from a session in GM mode
    expect(store.space).toBe('equipe');
    store.setGm(true);
    store.go('mj');
    expect(store.space).toBe('mj');
    expect(store.fiche).toBe(null); // the NPC list
  });

  it('an NPC never shows in Équipe: going there activates a PC', () => {
    store.activate(npc);
    expect(store.fiche).toBe(null);
    store.go('equipe');
    expect(store.c.id).toBe(pc);
  });

  it('openFiche: PCs open in Équipe, NPCs in MJ (GM mode only)', () => {
    store.go('combat');
    expect(store.openFiche(pc2, 'materiel')).toBe(true);
    expect([store.space, store.ui.tab, store.fiche.id]).toEqual(['equipe', 'materiel', pc2]);

    expect(store.openFiche(npc)).toBe(false);
    expect(store.c.id).toBe(pc2);

    store.setGm(true);
    expect(store.openFiche(npc, 'robot')).toBe(true);
    expect([store.space, store.ui.tab, store.ui.npc, store.fiche.id]).toEqual(['mj', 'robot', npc, npc]);
  });

  it('turning GM mode off leaves the MJ space and closes the NPC fiche', () => {
    store.setGm(true);
    store.openFiche(npc);
    store.setGm(false);
    expect(store.space).toBe('equipe');
    expect(store.ui.npc).toBe(null);
    expect(store.c.kind).toBe('pc');
  });

  it('GM mode changes nothing in the save (combat included)', () => {
    store.commitAll(null, (d) => { d.combat.phase = 'fight'; d.combat.round = 2; });
    const before = JSON.stringify(store.data);
    store.setGm(true);
    store.setGm(false);
    expect(JSON.stringify(store.data)).toBe(before);
  });
});
