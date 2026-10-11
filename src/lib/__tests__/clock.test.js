// T07: day/night clock and energy engine (book p.72, p.108-110, p.112).
import { describe, it, expect, afterEach } from 'vitest';
import { normalizeAll, blankCampaign, blankCharacter, fromTemplate } from '../store.svelte.js';
import { GAME_DATA as D } from '../data.js';
import { setRng } from '../rng.js';
import { status } from '../rules.js';
import { endDay, nightCharge, startDay, transfer, drainPack, energyRules, defaultExclude, blankClock } from '../clock.js';
import { roundtrip } from './roundtrip.js';
import { rig } from './helpers.js';

afterEach(() => setRng(null));

/** A robot by chassis parts with `ep` EP. */
function robot(name, ep, extra = {}) {
  const c = blankCharacter('pc');
  Object.assign(c, { name, model: 'battle', head: 'Pashin Ama 9', torso: 'Ganymeda Nava PRS', undercarriage: 'LBM Terra 004' }, extra);
  c.ep.current = ep;
  return c;
}
function table(chars, campaign = {}) {
  return normalizeAll({ version: 3, campaign: { ...blankCampaign('T'), ...campaign }, chars, activeId: null });
}
/** The same table, already in the night (after the evening drain), nobody excluded. */
function nightTable(chars, campaign = {}) {
  const d = table(chars, campaign);
  d.campaign.clock.phase = 'night';
  return d;
}
const ep = (d, n) => d.chars.find((c) => c.name === n).ep.current;

describe('Evening: daily drain and sleep mode', () => {
  it('everyone spends 1 EP; a robot at 1 EP drops into standby', () => {
    const d = table([robot('A', 5), robot('B', 1), robot('C', 0)]);
    const r = endDay(d);
    expect([ep(d, 'A'), ep(d, 'B'), ep(d, 'C')]).toEqual([4, 0, 0]);
    expect(status(d.chars[1]).asleep).toBe(true);
    expect(r.lines.map((l) => l.text)).toEqual(['−1 PE (4/10 PE)', '−1 PE (0/10 PE), passe en veille', 'rien à dépenser (0/10 PE), toujours en veille']);
    expect(d.campaign.clock.phase).toBe('night');
    expect(d.campaign.journal.at(-1).text.split('\n')).toHaveLength(4); // title + one line per robot
    expect(d.campaign.journal.at(-1).day).toBe(1);
  });

  it('creatures are untouched; NPCs take part only when the GM pool is off', () => {
    const rats = fromTemplate(D.npcTemplates.find((t) => t.id === 'zone-rats'));
    const guard = fromTemplate(D.npcTemplates.find((t) => t.id === 'guard'));
    guard.ep.current = 3;
    const d = table([robot('A', 5), rats, guard]);
    d.combat.usePool = true;
    endDay(d);
    expect(guard.ep.current).toBe(3); // the input object is not the save; read from d
    expect(d.chars.find((c) => c.template === 'guard').ep.current).toBe(3);
    expect(d.chars.find((c) => c.template === 'zone-rats').ep.current).toBe(rats.ep.current);
    d.combat.usePool = false;
    d.campaign.clock.phase = 'day'; // next evening
    endDay(d);
    expect(d.chars.find((c) => c.template === 'guard').ep.current).toBe(2);
  });

  it('a destroyed robot is left alone', () => {
    const dead = robot('Épave', 4);
    dead.damage = { servos: 9, stabilite: 9, processeur: 9, reseau: 9 };
    const d = table([dead]);
    endDay(d);
    expect(ep(d, 'Épave')).toBe(4);
  });
});

describe('Night: base station, ration and solar cells', () => {
  it('a connected robot recharges up to the ration of the Énergie band, never above', () => {
    const d = nightTable([robot('Bas', 1), robot('Haut', 8)], { dev: { Energie: 35, Production: 50, 'Défense': 50, Information: 50 } });
    expect(energyRules(d.campaign).ration).toBe(4); // 31-40 → 4 EP (p.109)
    nightCharge(d);
    expect([ep(d, 'Bas'), ep(d, 'Haut')]).toEqual([4, 8]);
    expect(d.campaign.clock.report.lines[1].text).toMatch(/déjà au rationnement/);
  });

  it('the ration is capped by the max: 10, or 12 with Alimentation de secours', () => {
    const d = nightTable([robot('Std', 0), robot('Secours', 0, { secondary: ['Alimentation de secours'] })], { rules: { energy: { overrideRation: 20 } } });
    nightCharge(d);
    expect([ep(d, 'Std'), ep(d, 'Secours')]).toEqual([10, 12]);
    expect(d.campaign.clock.report.lines[0].text).toMatch(/se réveille/);
  });

  it('a robot that is not connected only gets the solar EP, with or without a station', () => {
    const d = nightTable([robot('Dehors', 3, { online: false })]);
    nightCharge(d);
    expect(ep(d, 'Dehors')).toBe(4);
  });

  it('Panneaux solaires add D6 under a clear sky only, deterministic with setRng', () => {
    const mk = () => nightTable([robot('Panneaux', 1, { online: false, secondary: ['Panneaux solaires'] })]);
    rig(3);
    const d = mk();
    nightCharge(d);
    expect(ep(d, 'Panneaux')).toBe(5); // 1 + solar 1 + D6 3
    const cloudy = mk();
    cloudy.campaign.clock.clearSky = false;
    nightCharge(cloudy);
    expect(ep(cloudy, 'Panneaux')).toBe(2);
    setRng(42); const a = mk(); nightCharge(a);
    setRng(42); const b = mk(); nightCharge(b);
    expect(ep(a, 'Panneaux')).toBe(ep(b, 'Panneaux'));
  });

  it('Scrap Robots have no base station: excluded by default, included when the GM says so', () => {
    const d = table([robot('Clou', 1, { model: 'scrap' }), robot('A', 1)]);
    endDay(d);
    expect(d.campaign.clock.exclude).toEqual(defaultExclude(d));
    expect(defaultExclude(d)).toEqual([d.chars[0].id]);
    nightCharge(d);
    expect([ep(d, 'Clou'), ep(d, 'A')]).toEqual([0, 5]);
    expect(d.campaign.clock.report.lines[0].text).toMatch(/pas de borne/);
    const d2 = nightTable([robot('Clou', 1, { model: 'scrap' })]);
    nightCharge(d2, { exclude: [] });
    expect(ep(d2, 'Clou')).toBe(5);
  });

  it('GM overrides: daily drain, solar EP and ration', () => {
    const d = table([robot('A', 6), robot('B', 2, { online: false })], { rules: { energy: { dailyDrain: 2, outsideSolarEp: 0, overrideRation: 3.7 } } });
    const R = energyRules(d.campaign);
    expect([R.dailyDrain, R.outsideSolarEp, R.ration, R.bookRation]).toEqual([2, 0, 3, 5]); // 3.7 → 3
    endDay(d);
    expect([ep(d, 'A'), ep(d, 'B')]).toEqual([4, 0]);
    nightCharge(d);
    expect([ep(d, 'A'), ep(d, 'B')]).toEqual([4, 0]); // 4 ≥ ration 3; no solar
    expect(energyRules({ ...d.campaign, rules: { energy: { overrideRation: '' } } }).ration).toBe(5);
  });
});

describe('Morning, transfers and saving', () => {
  it('steps only run in order: day → evening → one night charge → morning', () => {
    const d = table([robot('A', 5)]);
    expect(nightCharge(d)).toBe(null);
    expect(startDay(d)).toBe(false);
    expect(endDay(d)).not.toBe(null);
    expect(endDay(d)).toBe(null);
    expect(ep(d, 'A')).toBe(4);
    expect(nightCharge(d)).not.toBe(null);
    expect(nightCharge(d)).toBe(null);
    expect(startDay(d)).toBe(true);
    expect(d.campaign.clock.day).toBe(2);
  });

  it('EP never go down at night, even above the max (an old save, a lost Alimentation de secours)', () => {
    const d = nightTable([robot('Dehors', 12, { online: false }), robot('Dedans', 11)]);
    nightCharge(d);
    expect([ep(d, 'Dehors'), ep(d, 'Dedans')]).toEqual([12, 11]);
    expect(d.campaign.clock.report.lines[0].text).toMatch(/soleil \+0/);
  });

  it('Panneaux solaires: none for a connected robot, none for an excluded (active) one; creatures untouched at night', () => {
    rig(6, 6);
    const rats = fromTemplate(D.npcTemplates.find((t) => t.id === 'zone-rats'));
    const d = nightTable([robot('Branché', 1, { secondary: ['Panneaux solaires'] }), robot('Actif', 1, { online: false, secondary: ['Panneaux solaires'] }), rats]);
    const ratsEp = d.chars[2].ep.current;
    nightCharge(d, { exclude: [d.chars[1].id] });
    expect([ep(d, 'Branché'), ep(d, 'Actif'), d.chars[2].ep.current]).toEqual([5, 2, ratsEp]);
    expect(d.campaign.clock.report.lines.map((l) => l.name)).toEqual(['Branché', 'Actif']);
  });

  it('an NPC at 0 EP (GM pool off) is not reported in sleep mode', () => {
    const guard = fromTemplate(D.npcTemplates.find((t) => t.id === 'guard'));
    guard.ep.current = 1;
    const d = table([guard]);
    d.combat.usePool = false;
    expect(endDay(d).lines[0].text).not.toMatch(/veille/);
  });

  it('a new day: day + 1, flags reset, the night report cleared', () => {
    const d = table([robot('Clou', 4, { model: 'scrap', daily: { barter: true } })]);
    endDay(d); nightCharge(d); startDay(d);
    expect(d.campaign.clock).toMatchObject({ day: 2, phase: 'day', charged: false, exclude: [], report: null });
    expect(d.chars[0].daily.barter).toBe(false);
  });

  it('cable transfer and Banque d\'énergie (5 EP, both ways), capped at both ends', () => {
    const a = robot('A', 9, { equipment: [{ name: "Banque d'énergie", integre: false, charge: 4 }] });
    const d = table([a, robot('B', 8)]);
    const [A, B] = d.chars;
    expect(transfer(d, { id: A.id }, { id: B.id }, 5)).toBe(2); // B max 10
    expect(transfer(d, { id: A.id }, { id: A.id, item: 0 }, 3)).toBe(1); // bank holds 5
    expect(A.equipment[0].charge).toBe(5);
    expect(A.ep.current).toBe(6);
    expect(transfer(d, { id: A.id, item: 0 }, { id: A.id }, 9)).toBe(4); // A has room for 4
    expect([A.ep.current, A.equipment[0].charge, B.ep.current]).toEqual([10, 1, 10]);
    expect(transfer(d, { id: A.id }, { id: 'nobody' }, 1)).toBe(0);
    expect(transfer(d, { id: A.id }, { id: A.id, item: null }, 1)).toBe(0); // to itself
    expect(transfer(d, { id: A.id }, { id: B.id }, -3)).toBe(0);
  });

  it('no transfer with a creature or a destroyed robot; a curly apostrophe still names a bank', () => {
    const rats = fromTemplate(D.npcTemplates.find((t) => t.id === 'zone-rats'));
    const dead = robot('Épave', 0);
    dead.damage = { servos: 9, stabilite: 9, processeur: 9, reseau: 9 };
    const d = table([robot('A', 5, { equipment: [{ name: 'Banque d’énergie', integre: false, charge: 2 }] }), rats, dead]);
    const [A, R, X] = d.chars;
    expect(transfer(d, { id: A.id }, { id: R.id }, 1)).toBe(0);
    expect(transfer(d, { id: A.id }, { id: X.id }, 1)).toBe(0);
    expect(A.equipment[0].charge).toBe(2);
  });

  it('E-pack and Batterie: D6 EP, then gone', () => {
    rig(4);
    const d = table([robot('A', 3, { equipment: [{ name: 'E-pack', integre: false }, { name: 'Lunette thermique', integre: false }] })]);
    expect(drainPack(d, d.chars[0].id, 0)).toEqual({ roll: 4, gain: 4 });
    expect(d.chars[0].equipment.map((e) => e.name)).toEqual(['Lunette thermique']);
    expect(drainPack(d, d.chars[0].id, 0)).toBe(null);
  });

  it('clock, daily flags and bank charge survive a save and reload', () => {
    const d = table([robot('A', 3, { daily: { barter: true }, equipment: [{ name: "Banque d'énergie", integre: false, charge: 3 }] })]);
    endDay(d); nightCharge(d);
    d.campaign.clock.clearSky = false;
    d.campaign.clock.exclude = [d.chars[0].id];
    const { before, after } = roundtrip(d);
    expect(after).toEqual(before);
    expect(after.campaign.clock.report.lines).toHaveLength(1);
    expect(after.chars[0].daily.barter).toBe(true);
    expect(after.chars[0].equipment[0].charge).toBe(3);
    expect(normalizeAll({ version: 3, campaign: { clock: { day: -2, phase: 'x' } }, chars: [] }).campaign.clock).toEqual({ ...blankClock() });
  });
});
