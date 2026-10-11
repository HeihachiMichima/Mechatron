// T11: GM-editable XP rules, the end-of-session wizard and spending XP (book p.26).
import { describe, it, expect, afterEach } from 'vitest';
import { normalizeAll, blankCampaign, blankCharacter, store } from '../store.svelte.js';
import { setRng } from '../rng.js';
import { bookXp, xpRules, sessionDraft, sessionXp, rollDecay, applySession, sinceLast, programBlock, spendProgram, spendSecondary } from '../xp.js';
import { roundtrip } from './roundtrip.js';
import { rig } from './helpers.js';

afterEach(() => setRng(null));

function pc(name, xp = 0, extra = {}) {
  const c = blankCharacter('pc');
  Object.assign(c, { name, model: 'battle', programRatings: { tir: 3 }, specialRating: 1, secondary: ['Caméra IR'] }, extra);
  c.xp.current = xp;
  return c;
}
const table = (chars, campaign = {}) => normalizeAll({ version: 3, campaign: { ...blankCampaign('T'), phase: 'play', ...campaign }, chars, activeId: null });

describe('XP rules', () => {
  it('default = the book: the 6 questions at 1 XP, 5 XP per upgrade (as in v2.3.6)', () => {
    const r = xpRules(table([]).campaign);
    expect(r.questions).toHaveLength(6);
    expect(r.questions.every((q) => q.xp === 1 && q.enabled)).toBe(true);
    expect(r.costs).toEqual({ program: 5, secondary: 5 });
    expect(r).toEqual(bookXp());
  });

  it('the GM edits questions, costs and bonus awards; bad entries are cleaned on read', () => {
    const rules = { xp: { questions: [{ id: 'a', text: 'Participé', xp: 1 }, { id: 'b', text: 'Ordre de travail', xp: '2' }, { id: 'c', text: '', xp: 9 }, { id: 'd', text: 'Hors jeu', xp: 1, enabled: false }], costs: { program: 6 }, bonusAwards: [{ id: 'w', text: 'Erreur éliminée', xp: 1 }] } };
    const r = xpRules(table([], { rules }).campaign);
    expect(r.questions.map((q) => [q.id, q.xp, q.enabled])).toEqual([['a', 1, true], ['b', 2, true], ['d', 1, false]]);
    expect(r.costs).toEqual({ program: 6, secondary: 5 });
    expect(r.bonusAwards).toEqual([{ id: 'w', text: 'Erreur éliminée', xp: 1 }]);
  });
});

describe('End of session', () => {
  it('« participé » is ticked for every PC; 1 XP per yes by default; a question worth 2 counts double', () => {
    const d = table([pc('A'), pc('B')]);
    const draft = sessionDraft(d);
    const [A, B] = d.chars;
    expect(sessionXp(draft, xpRules(d.campaign), A.id)).toBe(1);
    draft.checks[A.id].q3 = true;
    expect(sessionXp(draft, xpRules(d.campaign), A.id)).toBe(2);
    d.campaign.rules.xp = { questions: xpRules(d.campaign).questions.map((q) => (q.id === 'q3' ? { ...q, xp: 2 } : q)) };
    expect(sessionXp(draft, xpRules(d.campaign), A.id)).toBe(3);
    draft.adjust[B.id] = -5;
    expect(sessionXp(draft, xpRules(d.campaign), B.id)).toBe(0); // never below 0
  });

  it('applying a session adds XP, wears the DEV levels, updates relations, logs the history and the journal', () => {
    rig(3, 1, 6, 2);
    const d = table([pc('A', 4), pc('B')]);
    const draft = sessionDraft(d);
    const [A, B] = d.chars;
    draft.checks[B.id].q2 = true;
    rollDecay(draft, d);
    expect(Object.values(draft.dev).map((x) => x.value)).toEqual([47, 49, 44, 48]);
    draft.dev.Information.value = 50; // the GM overrides one
    draft.relations[A.id].dream = 'Revoir le soleil';
    applySession(d, draft);
    expect([A.xp.current, B.xp.current, A.dream]).toEqual([5, 2, 'Revoir le soleil']);
    expect(d.campaign.dev).toEqual({ Energie: 47, Production: 49, 'Défense': 44, Information: 50 });
    expect(d.campaign.xp.log).toHaveLength(1);
    expect(d.campaign.xp.log[0].awards.map((a) => [a.name, a.total])).toEqual([['A', 1], ['B', 2]]);
    expect(d.campaign.journal.at(-1).text.split('\n')[0]).toBe('Fin de séance 1');
  });

  it('the history lists every session; the summary counts days and market deals since the last one', () => {
    const d = table([pc('A')]);
    applySession(d, sessionDraft(d));
    d.campaign.clock.day = 4;
    d.campaign.market.ledger.push({ type: 'buy', name: 'Jetpack', price: 5 });
    expect(sinceLast(d)).toEqual({ days: 3, deals: [{ type: 'buy', name: 'Jetpack', price: 5 }] });
    applySession(d, sessionDraft(d));
    expect(d.campaign.xp.log.map((s) => s.day)).toEqual([1, 4]);
    expect(d.campaign.journal.at(-1).text).toMatch(/3 jours de jeu depuis la séance précédente/);
    expect(d.campaign.journal.at(-1).text).toMatch(/Marché noir : achat de Jetpack \(5 PE\)/);
    expect(sinceLast(d)).toEqual({ days: 0, deals: [] });
  });

  it('one undo step in the store reverts the whole session', () => {
    store.data = table([pc('A', 2)]);
    const draft = sessionDraft(store.data);
    store.commitAll('Séance terminée', (x) => applySession(x, draft));
    expect(store.chars[0].xp.current).toBe(3);
    store.undo();
    expect([store.chars[0].xp.current, store.campaign.xp.log.length]).toEqual([2, 0]);
  });
});

describe('Spending XP', () => {
  it('a program +1 for 5 XP, blocked at level 5 and without enough XP; logged', () => {
    const d = table([pc('A', 12, { programRatings: { tir: 4, assaut: 5 } })]);
    const A = d.chars[0];
    expect(spendProgram(d, A.id, 'tir')).toBe(null);
    expect([A.programRatings.tir, A.xp.current]).toEqual([5, 7]);
    expect(programBlock(A, 'tir', xpRules(d.campaign))).toBe('Déjà au maximum (5).');
    expect(spendProgram(d, A.id, 'assaut')).toBe('Déjà au maximum (5).');
    expect(spendProgram(d, A.id, '__special')).toBe(null);
    expect(A.specialRating).toBe(2);
    expect(spendProgram(d, A.id, 'scan')).toBe('Il faut 5 PX, A en a 2.');
    expect(d.campaign.xp.spent.map((s) => [s.what, s.cost])).toEqual([['Tir 5', 5], ['programme spécialiste 2', 5]]);
  });

  it('a new secondary function, from any model; not twice; costs from the GM rules', () => {
    const d = table([pc('A', 6)], { rules: { xp: { costs: { secondary: 6 } } } });
    const A = d.chars[0];
    expect(spendSecondary(d, A.id, 'Caméra IR')).toBe('A a déjà cette fonction.');
    expect(spendSecondary(d, A.id, 'Tactiques SWAT')).toBe(null); // a Coordination Robot's function
    expect([A.secondary, A.xp.current]).toEqual([['Caméra IR', 'Tactiques SWAT'], 0]);
    expect(d.campaign.journal.at(-1).text).toBe('A dépense 6 PX : fonction secondaire Tactiques SWAT');
  });

  it('rules, history and spends survive a save and reload', () => {
    const d = table([pc('A', 9)], { rules: { xp: { questions: [{ id: 'a', text: 'Participé', xp: 2, enabled: true }], costs: { program: 4, secondary: 6 }, bonusAwards: [{ id: 'w', text: 'Ordre accompli', xp: 1 }] } } });
    applySession(d, sessionDraft(d));
    spendProgram(d, d.chars[0].id, 'tir');
    const { before, after } = roundtrip(d);
    expect(after).toEqual(before);
    expect(after.campaign.xp.spent).toHaveLength(1);
    expect(after.campaign.rules.xp.costs.program).toBe(4);
  });
});
