// Builds item lists for the generic picker sheet from GAME_DATA.
import { GAME_DATA as D } from './data.js';

const tagLabel = (t) => (t === 'R' ? 'réactif' : t === 'E' ? 'amélioration' : '');

export function secondaryItems(model) {
  const all = D.secondaryFunctions;
  const items = [];
  if (model) all.filter((f) => f.model === model.id).forEach((f) => items.push({ value: f.name, title: f.name, sub: f.nameEn, detail: f.desc, group: `Fonctions du ${model.name.toLowerCase()}` }));
  all.filter((f) => f.model === 'general').forEach((f) => items.push({ value: f.name, title: f.name, sub: f.nameEn, detail: f.desc, group: 'Fonctions générales' }));
  all.filter((f) => f.model !== 'general' && (!model || f.model !== model.id)).forEach((f) => {
    const m = D.models.find((x) => x.id === f.model);
    items.push({ value: f.name, title: f.name, sub: `${f.nameEn}, ${m ? m.name.toLowerCase() : ''}`, detail: f.desc, group: 'Autres modèles' });
  });
  return items;
}

export function moduleItems() {
  return D.modules.map((m) => ({
    value: m.name, title: m.name,
    sub: [m.nameEn, m.cost, tagLabel(m.tag)].filter(Boolean).join(', '),
    detail: m.effect || 'Effet à compléter dans data.js.'
  }));
}

export function weaponItems() {
  return D.weapons.map((w) => ({
    value: w.name, title: w.name,
    sub: `Bonus ${w.bonus ?? '—'}, dégâts ${w.degats}, portée ${w.portee.toLowerCase()}`,
    detail: w.note || '', group: w.portee === 'Bras' && w.name !== 'Pistolet paralysant' ? 'Corps à corps' : 'À distance'
  }));
}

export function equipmentItems() {
  return D.equipment.map((e) => ({ value: e.name, title: e.name, sub: [e.nameEn, e.bonus ? `bonus +${e.bonus}` : ''].filter(Boolean).join(', '), detail: e.note || '' }));
}

export function partItems(cat) {
  return D.chassis[cat].map((p) => ({ value: p.name, title: p.name, detail: p.desc, part: p }));
}
