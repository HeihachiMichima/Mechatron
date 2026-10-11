// The demo party for « Essayer la démo » (T04): four player robots in the
// book's usual mix (Battle, Scrap, Protocol, Cleaning) and three NPCs from the
// book's templates. Builds follow the creation rules (p.16-29): 10 program
// points, max 3 per program, specialist program at 1, distinct chassis parts
// except the Scrap ones, no more modules than slots. Every stat comes from
// data.js; only the names and the choices are ours.
import { GAME_DATA as D } from './data.js';
import { blankCharacter, fromTemplate, ensureColor } from './store.svelte.js';

const weapon = (name) => {
  const ref = D.weapons.find((w) => w.name === name);
  return { name, bonus: ref?.bonus ?? '', degats: ref?.degats ?? '', portee: ref?.portee ?? '', note: '' };
};
const gear = (...names) => names.map((name) => ({ name, integre: false }));

function pc(model, name, parts, programRatings, secondary, modules, weapons, equipment) {
  const c = blankCharacter('pc');
  Object.assign(c, { model, name, head: parts[0], torso: parts[1], undercarriage: parts[2], programRatings, specialRating: 1 });
  c.secondary = [secondary];
  c.modules = modules;
  c.weapons = weapons.map(weapon);
  c.equipment = gear(...equipment);
  return c;
}

/** A fresh demo table: { chars, activeId } (the campaign comes from the caller). */
export function demoParty() {
  const chars = [
    pc('battle', 'Brise-Fer BTL-07', ['Pashin Ama 9', 'Ganymeda Nava PRS', 'LBM Terra 004'],
      { assaut: 3, tir: 3, deplacement: 2, force: 1 }, 'Caméra IR',
      ['Lance-grenades', 'Accélérateur', 'Armure réactive'], ['Pistolet laser'], ['E-pack', 'Lunette thermique']),
    pc('scrap', 'Clou SCR-311', ['Scrap Head', 'Scrap Torso', 'Scrap Legs'],
      { reparation: 3, scan: 2, force: 2, infiltration: 2 }, 'Compagnon de ferraille',
      ['Tronçonneuse', 'Unité de réparation', 'Système de secours'], ['Couteau de ferraille'], []),
    pc('protocol', 'Virgule PRT-52', ['Lux Nanito+', 'Modessi RK "Una"', 'Lagos MD-18'],
      { archives: 3, analyse: 3, interaction: 2, contestation: 1 }, 'Interprète',
      ['Holoprojecteur'], [], ['E-pack']),
    pc('cleaning', 'Serpillière CLN-9', ['Kordura MOD 022', 'Kleenkorp PTU5', 'LBM Dyno-Q'],
      { reparation: 2, scan: 2, deplacement: 2, force: 2, contestation: 1 }, 'Souffleur de déchets',
      ['Bras supplémentaires', 'Système de câbles', 'Impulsion de détection'], [], ['Élastique'])
  ];
  for (const id of ['guard', 'sentinel', 'zone-rats']) chars.push(fromTemplate(D.npcTemplates.find((t) => t.id === id)));
  chars.forEach((c) => ensureColor(chars, c));
  return { chars, activeId: chars[0].id };
}
