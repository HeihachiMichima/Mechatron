// T06: the creation wizard's rules (book p.16-29) and the robot it builds.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GAME_DATA as D } from '../data.js';
import { bindCampaign } from '../settings.js';
import { setRng } from '../rng.js';
import { store, normalize, normalizeAll, blankCampaign } from '../store.svelte.js';
import { demoParty } from '../demo.js';
import { STEPS, blankDraft, draftFrom, stepErrors, buildRobot, applyDraft, gearItems, newSerial, partOwner, moduleOwner, programTotal, firstInvalid, startWizard, finishWizard } from '../creation.js';
import { strip, roundtrip } from './roundtrip.js';

/** The demo's Battle Robot, entered step by step. */
function briseFer() {
  return {
    ...blankDraft(),
    model: 'battle', nick: 'Brise-Fer', serial: 'BTL-07',
    head: 'Pashin Ama 9', torso: 'Ganymeda Nava PRS', undercarriage: 'LBM Terra 004',
    programRatings: { assaut: 3, tir: 3, deplacement: 2, force: 1 }, specialRating: 1,
    secondary: 'Caméra IR',
    modules: ['Lance-grenades', 'Accélérateur', 'Armure réactive'],
    gear: [null, null, 0]
  };
}
const others = () => demoParty().chars.filter((c) => c.name !== 'Brise-Fer BTL-07');

afterEach(() => { bindCampaign(null); setRng(null); });

describe('Creation wizard: building a robot', () => {
  it('a wizard robot equals the hand-built one (ignoring id and color)', () => {
    const hand = demoParty().chars[0];
    const wiz = buildRobot(briseFer());
    expect(strip(normalize(wiz))).toEqual(strip(normalize(hand)));
  });

  it('the robot survives a save and reload', () => {
    const c = buildRobot({ ...briseFer(), player: 'Johanna', buddy: 'Clou', hate: 'Limbo', protect: 'NODOS', dream: 'Être un rouage utile' });
    const { before, after } = roundtrip(normalizeAll({ version: 3, campaign: blankCampaign('T'), chars: [c], activeId: c.id }));
    expect(after).toEqual(before);
    expect(after.chars[0].dream).toBe('Être un rouage utile');
  });

  it('starts with the ration of EP (Énergie level, p.22)', () => {
    const cp = blankCampaign();
    bindCampaign(() => cp);
    cp.dev.Energie = 80;
    expect(buildRobot(briseFer()).ep.current).toBe(7);
    cp.dev.Energie = 15;
    expect(buildRobot(briseFer()).ep.current).toBe(2);
  });

  it("gives the model's whole gear box, with the chosen item where there is a choice", () => {
    const d = { ...briseFer(), gear: [null, null, 1] };
    expect(gearItems(d)).toEqual(['E-pack', 'Lunette thermique', 'Vibro-couteau']);
    const c = buildRobot(d);
    expect(c.weapons.map((w) => w.name)).toEqual(['Vibro-couteau']);
    expect(c.equipment.map((e) => e.name)).toEqual(['E-pack', 'Lunette thermique']);
    expect(buildRobot({ ...briseFer(), model: 'scrap', gear: [] }).equipment).toEqual([]);
  });

  it('every gear item of every model exists in the weapons or the equipment', () => {
    const known = new Set([...D.weapons.map((w) => w.name), ...D.equipment.map((e) => e.name)]);
    for (const m of D.models) for (const g of m.gear) for (const name of g) expect(known.has(name), `${m.id}: ${name}`).toBe(true);
  });

  it('draftFrom → applyDraft gives the same robot back (edit mode)', () => {
    const c = demoParty().chars[1];
    const d = draftFrom(c);
    expect([d.nick, d.serial]).toEqual(['Clou', 'SCR-311']);
    const copy = applyDraft(normalize(JSON.parse(JSON.stringify(c))), d);
    expect(strip(normalize(copy))).toEqual(strip(normalize(c)));
  });
});

describe('Creation wizard: what blocks each step', () => {
  const ctx = () => ({ chars: others(), id: null, gm: false });

  it('a complete, legal draft passes every step', () => {
    for (const s of STEPS) expect(stepErrors(s.id, briseFer(), ctx()), s.id).toEqual([]);
    expect(firstInvalid(briseFer(), ctx())).toBe(0); // no step invalid: findIndex → -1 → 0
  });

  it('programs: exactly 10 points, max 3 each, specialist at least 1', () => {
    const d = briseFer();
    expect(programTotal(d)).toBe(10);
    expect(stepErrors('programmes', { ...d, programRatings: { ...d.programRatings, force: 0 } })).toEqual(['Il reste 1 point à répartir.']);
    expect(stepErrors('programmes', { ...d, programRatings: { ...d.programRatings, force: 3 } })).toEqual(['2 points de trop.']);
    expect(stepErrors('programmes', { ...d, programRatings: { assaut: 4, tir: 3, deplacement: 1, force: 1 } })).toEqual(['Maximum 3 par programme à la création.']);
    expect(stepErrors('programmes', { ...d, specialRating: 0, programRatings: { ...d.programRatings, force: 2 } })).toEqual(['Cible, votre programme spécialiste, doit être au moins à 1.']);
  });

  it('chassis: a part used by another PC is blocked, Scrap parts never, GM mode overrides', () => {
    const d = { ...briseFer(), head: 'Kordura MOD 022' }; // Serpillière's head
    expect(partOwner(others(), 'heads', 'Kordura MOD 022')?.name).toBe('Serpillière CLN-9');
    expect(stepErrors('chassis', d, ctx())).toEqual(['Kordura MOD 022 est déjà pris par Serpillière CLN-9.']);
    expect(stepErrors('chassis', d, { ...ctx(), gm: true })).toEqual([]);
    expect(stepErrors('chassis', { ...d, head: 'Scrap Head' }, ctx())).toEqual([]); // Clou has it too
    expect(stepErrors('chassis', { ...d, head: '' }, ctx())).toEqual(['Choisissez une tête.']);
  });

  it('chassis: editing a robot never conflicts with itself, and NPCs do not count', () => {
    const party = demoParty().chars;
    const clou = party[1];
    expect(stepErrors('chassis', draftFrom(clou), { chars: party, id: clou.id })).toEqual([]);
    expect(partOwner(party, 'heads', 'Pashin Ama 9', 'x')?.kind).toBe('pc');
  });

  it('modules: no more than the slots, none another PC has (p.22)', () => {
    const d = briseFer(); // 3 slots
    expect(stepErrors('modules', { ...d, modules: [...d.modules, 'Jetpack'] }, ctx())).toEqual(['Trop de modules : votre châssis a 3 emplacements.']);
    expect(moduleOwner(others(), 'Tronçonneuse')?.name).toBe('Clou SCR-311');
    expect(stepErrors('modules', { ...d, modules: ['Tronçonneuse'] }, ctx())).toEqual(['Tronçonneuse est déjà pris par Clou SCR-311.']);
    expect(stepErrors('modules', { ...d, modules: ['Tronçonneuse'] }, { ...ctx(), gm: true })).toEqual([]);
    expect(stepErrors('modules', { ...d, modules: [] }, ctx())).toEqual([]); // fewer is allowed
  });

  it('secondary function from the model only; gear choice required; name and serial format', () => {
    expect(stepErrors('fonction', { ...briseFer(), secondary: 'Surrégime' })).toEqual(['Choisissez une fonction secondaire.']);
    expect(stepErrors('equipement', { ...briseFer(), gear: [] })).toEqual(['Choisissez : Pistolet laser ou Vibro-couteau.']);
    expect(stepErrors('equipement', { ...briseFer(), gear: [] }, { id: 'edit' })).toEqual([]);
    expect(stepErrors('nom', { ...briseFer(), nick: ' ' })).toEqual(['Donnez un surnom à votre robot.']);
    expect(stepErrors('nom', { ...briseFer(), serial: 'Ferraille-Libre' })).toEqual([]); // junk robots name themselves
    expect(stepErrors('nom', { ...briseFer(), serial: '' })).toEqual([]);
  });

  it('serials are three letters, a dash, three digits, and not already used', () => {
    setRng(3);
    const s = newSerial(demoParty().chars);
    expect(s).toMatch(/^[A-Z]{3}-\d{3}$/);
  });
});

describe('Creation wizard in the store', () => {
  beforeEach(() => {
    store.data = normalizeAll({ version: 3, campaign: blankCampaign('T'), chars: others(), activeId: null });
    Object.assign(store.ui, { space: 'equipe', tab: 'etat', gm: false, npc: null, pc: null, peek: null, wizard: null, sheet: null });
  });

  it('a finished wizard adds the robot and opens its fiche; an invalid one adds nothing', () => {
    startWizard();
    expect(store.fiche).toBe(null); // the wizard replaces the fiche
    store.ui.wizard.draft = { ...briseFer(), gear: [] };
    expect(finishWizard()).toBe(null);
    expect(store.chars).toHaveLength(6);
    store.ui.wizard.draft.gear = [null, null, 0];
    const id = finishWizard();
    expect(store.ui.wizard).toBe(null);
    expect(store.fiche.id).toBe(id);
    expect(store.c.name).toBe('Brise-Fer BTL-07');
    store.undo();
    expect(store.char(id)).toBeUndefined();
  });

  it('editing through the wizard keeps gear, EP and damage', () => {
    const clou = store.chars.find((c) => c.name === 'Clou SCR-311');
    store.commitOn(clou.id, null, (s) => { s.ep.current = 2; s.damage.servos = 1; });
    startWizard(clou.id);
    store.ui.wizard.draft.dream = 'Un bras qui ne grince pas';
    finishWizard();
    const c = store.char(clou.id);
    expect([c.dream, c.ep.current, c.damage.servos, c.weapons[0].name]).toEqual(['Un bras qui ne grince pas', 2, 1, 'Couteau de ferraille']);
  });

  it("« L'équipe est prête »: creation → play, in the journal, undoable", () => {
    expect(store.campaign.phase).toBe('creation');
    store.setPhase('play');
    expect(store.campaign.phase).toBe('play');
    expect(store.campaign.journal.at(-1).text).toMatch(/L'équipe est prête/);
    expect(normalizeAll(JSON.parse(JSON.stringify(store.data))).campaign.phase).toBe('play');
    store.undo();
    expect(store.campaign.phase).toBe('creation');
  });
});
