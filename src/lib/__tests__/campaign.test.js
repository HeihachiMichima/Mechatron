import { describe, it, expect, afterEach } from 'vitest';
import { GAME_DATA as D } from '../data.js';
import { bindCampaign, getRules, getDev } from '../settings.js';
import { devModFor, poolFor, programs, programPoints, chassis, modelOf } from '../rules.js';
import { normalizeAll, normalizeCampaign, blankCampaign, pushJournal, blankCharacter, newCombatant } from '../store.svelte.js';
import { demoParty } from '../demo.js';
import { bookRobot } from './helpers.js';
import { roundtrip } from './roundtrip.js';

afterEach(() => bindCampaign(null));

/** A full campaign with every T03 field set to something non-default. */
function richCampaign() {
  const c = blankCampaign('Le fantôme dans la machine');
  c.phase = 'play';
  c.dev = { Energie: 61, Production: 12, 'Défense': 0, Information: 100 };
  c.rules = { xpPerUpgrade: 6, energy: { dailyDrain: 2 } };
  c.journal = [{ at: '2026-10-11T10:00:00.000Z', text: 'Arrivée au secteur 7' }, { at: '2026-10-11T11:00:00.000Z', day: 3, text: 'Nuit au dépôt' }];
  c.clock = { day: 3, phase: 'night', clearSky: false };
  c.market = { open: true, sellRate: 0.5, rarities: [{ id: 'commun', label: 'Commun', chance: 1 }], listings: [{ id: 'custom:x', kind: 'custom', ref: '', custom: 'Huile fine', price: 5, rarity: 'commun', stock: 2, enabled: true, hidden: false, note: '' }], ledger: [] };
  c.xp = { log: [{ at: 'a', awards: [] }] };
  c.maps = [{ id: 'm1', w: 4, h: 3, terrain: '............' }];
  c.encounters = [{ id: 'e1', name: 'Quai', enemies: [] }];
  return c;
}

describe('campaign model', () => {
  it('round-trip: every campaign field survives save → reload', () => {
    const pc = bookRobot();
    const data = normalizeAll({ campaign: richCampaign(), chars: [pc], activeId: pc.id });
    const { before, after } = roundtrip(data);
    expect(after).toEqual(before);
    expect(after.campaign.dev.Energie).toBe(61);
    expect(after.campaign.journal[1].day).toBe(3);
  });

  it('normalizeCampaign clamps DEV levels and drops broken journal lines', () => {
    const c = normalizeCampaign({ dev: { Energie: 140, Production: -5 }, phase: 'weird', journal: [null, { text: '' }, { at: 1, text: 'ok', day: 'x' }] });
    expect(c.dev).toEqual({ Energie: D.defaults.devMax, Production: 0, 'Défense': 50, Information: 50 });
    expect(c.phase).toBe('creation');
    expect(c.journal).toEqual([{ at: '1', text: 'ok' }]);
  });

  it('pushJournal appends a dated line, with the in-game day when given', () => {
    const data = normalizeAll({});
    pushJournal(data, '  Réparé la borne  ', { day: 2 });
    pushJournal(data, '   ');
    expect(data.campaign.journal).toHaveLength(1);
    expect(data.campaign.journal[0]).toMatchObject({ day: 2, text: 'Réparé la borne' });
    expect(Number.isNaN(Date.parse(data.campaign.journal[0].at))).toBe(false);
  });
});

describe('shared DEV levels', () => {
  it('one change moves the dice bonus of every connected robot (PC or NPC), never an offline one', () => {
    const data = normalizeAll({ chars: [bookRobot('pc'), bookRobot('npc'), bookRobot('pc')] });
    data.chars[2].online = false;
    bindCampaign(() => data.campaign);
    const prog = D.programs.find((p) => p.devBonus === 'Production');
    const bonus = () => data.chars.map((c) => devModFor(c, prog));
    data.campaign.dev.Production = 80;
    const high = bonus();
    data.campaign.dev.Production = 5;
    const low = bonus();
    expect(high[0]).toBe(high[1]);
    expect(low[0]).toBe(low[1]);
    expect(high[0]).toBeGreaterThan(low[0]);
    expect(high[2]).toBe(0);
    expect(low[2]).toBe(0);
  });

  it('pools read the shared level (no copy on the robot)', () => {
    const data = normalizeAll({ chars: [bookRobot()] });
    bindCampaign(() => data.campaign);
    const c = data.chars[0];
    const prog = D.programs.find((p) => p.devBonus);
    c.programRatings[prog.key] = 2;
    data.campaign.dev[prog.devBonus] = 100;
    const a = poolFor(c, prog.key).prog;
    data.campaign.dev[prog.devBonus] = 0;
    expect(poolFor(c, prog.key).prog).toBeLessThan(a);
    expect(getDev()).toBe(data.campaign.dev);
  });
});

describe('getRules', () => {
  it('book values and XP questions, then the campaign overrides', () => {
    expect(getRules().xpPerUpgrade).toBe(D.rules.xpPerUpgrade);
    expect(getRules().xpQuestions).toEqual(D.xpQuestions);
    const data = normalizeAll({ campaign: { rules: { xpPerUpgrade: 7 } } });
    bindCampaign(() => data.campaign);
    expect(getRules().xpPerUpgrade).toBe(7);
    expect(getRules().programMax).toBe(D.rules.programMax);
  });
});

describe('demo party', () => {
  it('four player robots built by the creation rules, plus three book NPCs', () => {
    const { chars, activeId } = demoParty();
    const pcs = chars.filter((c) => c.kind === 'pc');
    expect(pcs.map((c) => c.model)).toEqual(['battle', 'scrap', 'protocol', 'cleaning']);
    expect(chars.filter((c) => c.kind === 'npc')).toHaveLength(3);
    expect(activeId).toBe(pcs[0].id);
    const used = new Set();
    for (const c of pcs) {
      const ch = chassis(c);
      expect(ch.known).toBe(3);
      expect(programPoints(c)).toBe(D.rules.creationProgramPoints);
      expect(programs(c).every((p) => p.rating <= D.rules.creationProgramMax)).toBe(true);
      expect(c.specialRating).toBeGreaterThanOrEqual(1);
      expect(c.modules.length).toBeLessThanOrEqual(ch.slots);
      expect(modelOf(c).secondary).toContain(c.secondary[0]);
      for (const part of [c.head, c.torso, c.undercarriage]) {
        if (/^Scrap /.test(part)) continue; // Scrap parts can always be found (p.18)
        expect(used.has(part)).toBe(false);
        used.add(part);
      }
      expect(c.color).not.toBe('');
    }
    for (const c of chars) for (const m of c.modules) expect(D.modules.some((x) => x.name === m)).toBe(true);
  });
});
