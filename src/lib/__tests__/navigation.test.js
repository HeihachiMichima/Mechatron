// T05: spaces, the fiche on screen and the « Mode MJ » switch (UI prefs, per device).
import { describe, it, expect, beforeEach } from 'vitest';
import { store, normalizeAll, blankCharacter, cleanUi, restoreAll } from '../store.svelte.js';

let pc, pc2, npc;
beforeEach(() => {
  store.data = normalizeAll({});
  Object.assign(store.ui, { space: 'equipe', tab: 'etat', gm: false, npc: null, pc: null, peek: null, sheet: null });
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

  it('from Combat, an NPC fiche opens in place in both GM modes, and any move closes it', () => {
    for (const gm of [false, true]) {
      store.ui.gm = gm;
      store.go('combat');
      expect(store.openFiche(npc, 'materiel')).toBe(true);
      expect([store.space, store.ui.tab, store.fiche?.id]).toEqual(['combat', 'materiel', npc]);
      store.go('combat'); // « Retour au combat » or the Combat tab
      expect(store.fiche).toBe(null);
      expect(store.ui.peek).toBe(null);
    }
    // A PC still opens in Équipe.
    store.go('combat');
    store.openFiche(pc2);
    expect([store.space, store.fiche.id]).toEqual(['equipe', pc2]);
  });

  it('an NPC fiche open in Combat closes if the NPC is deleted', () => {
    store.go('combat');
    store.openFiche(npc);
    store.removeChar(npc);
    store.syncFiche();
    expect(store.fiche).toBe(null);
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

  it('coming back to Équipe shows the PC seen there last, not the first one', () => {
    store.openFiche(pc2);
    store.setGm(true);
    store.openFiche(npc);
    expect(store.c.id).toBe(npc);
    store.go('equipe');
    expect(store.c.id).toBe(pc2);
  });

  it('an undo that activates an NPC while in Équipe is put right', () => {
    store.commitAll(null, (d) => (d.activeId = npc));
    store.syncFiche();
    expect(store.c.id).toBe(pc);
  });

  it('undoing « Fiche passée en PNJ » in MJ follows the robot back to Équipe', () => {
    store.setGm(true);
    store.openFiche(pc2, 'robot');
    store.commit('Fiche passée en PNJ', (s) => (s.kind = 'npc'));
    store.openFiche(pc2, 'robot');
    expect(store.space).toBe('mj');
    store.undo();
    store.syncFiche();
    expect([store.space, store.ui.npc, store.fiche?.id]).toEqual(['equipe', null, pc2]);
  });

  it('a deleted NPC closes its fiche in MJ', () => {
    store.setGm(true);
    store.openFiche(npc);
    store.removeChar(npc);
    store.syncFiche();
    expect(store.ui.npc).toBe(null);
    expect(store.fiche).toBe(null);
  });
});

describe('restoreAll scope', () => {
  it("« Remettre l'équipe à neuf » leaves the NPCs alone, and the reverse", () => {
    store.commitAll(null, (d) => d.chars.forEach((c) => (c.armorDamage = 2)));
    const d = JSON.parse(JSON.stringify(store.data));
    expect(restoreAll(d, 'pc')).toBe(2);
    expect(d.chars.map((c) => c.armorDamage)).toEqual([0, 0, 2]);
    expect(restoreAll(d, 'npc')).toBe(1);
    expect(d.chars.map((c) => c.armorDamage)).toEqual([0, 0, 0]);
  });
});
