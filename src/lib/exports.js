// All the ways a character leaves the app: JSON file, share link,
// Markdown text, PNG card. Printing is handled by PrintSheet + CSS.
import { GAME_DATA as D } from './data.js';
import { attrLabels, ATTRS, chassis, attrCurrent, armorCurrent, armorTotal, epMax, modelOf, hierarchy, programs, findModule } from './rules.js';

export const slug = (c) => (c.name || 'robot-mechatron').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'robot';

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareOrDownload(blob, filename, title) {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return 'shared'; }
    catch (e) { if (e.name === 'AbortError') return 'cancelled'; }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}

export const jsonBlob = (c) => new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' });

// ---------- share link ----------
const b64url = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0));

async function pipe(bytes, stream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function shareUrl(c) {
  const raw = new TextEncoder().encode(JSON.stringify(c));
  let payload;
  if (typeof CompressionStream !== 'undefined') payload = 'z' + b64url(await pipe(raw, new CompressionStream('deflate-raw')));
  else payload = 'j' + b64url(raw);
  const base = location.href.split('#')[0];
  return `${base}#robot=${payload}`;
}

export async function parseShareHash(hash = location.hash) {
  const m = /robot=([zj])([A-Za-z0-9_-]+)/.exec(hash);
  if (!m) return null;
  let bytes = unb64url(m[2]);
  if (m[1] === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
  return JSON.parse(new TextDecoder().decode(bytes));
}

// ---------- text ----------
export function toText(c) {
  const ch = chassis(c);
  const m = modelOf(c);
  const L = [];
  L.push(`**${c.name || 'Robot sans nom'}**${m ? ` | ${m.name}, hiérarchie ${hierarchy(c)}` : ''}`);
  const parts = [c.head, c.torso, c.undercarriage].filter(Boolean);
  if (parts.length) L.push(`Châssis : ${parts.join(' / ')}`);
  L.push(ATTRS.filter((a) => ch.attrMax[a] > 0).map((a) => `${attrLabels(c)[a].label} ${attrCurrent(c, ch, a)}/${ch.attrMax[a]}`).join(' | '));
  L.push(`Énergie ${c.ep.current}/${epMax(c)} PE | Armure ${armorCurrent(c, ch)}/${armorTotal(c, ch)} | PX ${c.xp.current}`);
  const progs = programs(c).filter((p) => p.rating > 0).map((p) => `${p.label} ${p.rating}`);
  if (progs.length) L.push(`Programmes : ${progs.join(', ')}`);
  if (c.secondary.length) L.push(`Fonctions : ${c.secondary.join(', ')}`);
  const mods = c.modules.filter(Boolean);
  if (mods.length) L.push(`Modules : ${mods.join(', ')}`);
  if (c.weapons.length) L.push(`Armes : ${c.weapons.map((w) => `${w.name} (+${w.bonus || 0}, dégâts ${w.degats || '?'}, ${w.portee || '?'})`).join(', ')}`);
  if (c.equipment.length) L.push(`Équipement : ${c.equipment.map((e) => e.name).join(', ')}`);
  const rel = [['Binôme', c.buddy], ['Je déteste', c.hate], ['Je protège', c.protect], ['Grand rêve', c.dream]].filter(([, v]) => v);
  rel.forEach(([k, v]) => L.push(`${k} : ${v}`));
  return L.join('\n');
}

// ---------- PNG card ----------
export async function cardBlob(c) {
  await Promise.all(['700 64px "Chakra Petch"', '600 32px "Chakra Petch"', '400 28px "IBM Plex Sans"', '600 28px "IBM Plex Sans"'].map((f) => document.fonts.load(f).catch(() => {})));
  const W = 1080, H = 1350, P = 64;
  const cv = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const g = cv.getContext('2d');
  const col = { abyss: '#12292e', hull: '#1b3a40', line: '#2f5a61', text: '#e7efe9', muted: '#9bb6b3', amber: '#f2a541', coolant: '#7fe0d6', fault: '#ff6b5b' };
  const ch = chassis(c);
  const m = modelOf(c);
  const disp = (w, s) => `${w} ${s}px "Chakra Petch", sans-serif`;
  const body = (w, s) => `${w} ${s}px "IBM Plex Sans", sans-serif`;
  const chamfer = (x, y, w, h, k) => { g.beginPath(); g.moveTo(x + k, y); g.lineTo(x + w, y); g.lineTo(x + w, y + h - k); g.lineTo(x + w - k, y + h); g.lineTo(x, y + h); g.lineTo(x, y + k); g.closePath(); };
  const fit = (text, maxW) => { let t = text; while (g.measureText(t).width > maxW && t.length > 3) t = t.slice(0, -2); return t === text ? t : t.trimEnd() + '…'; };

  g.fillStyle = col.abyss; g.fillRect(0, 0, W, H);
  chamfer(32, 32, W - 64, H - 64, 28); g.fillStyle = col.hull; g.fill(); g.strokeStyle = col.line; g.lineWidth = 2; g.stroke();
  g.fillStyle = col.amber; g.fillRect(32 + 28, 32, 260, 6);

  // header
  g.fillStyle = col.text; g.font = disp(700, 72); g.textBaseline = 'alphabetic';
  g.fillText(fit(c.name || 'Robot sans nom', W - 2 * P - 40), P + 16, 150);
  g.fillStyle = col.muted; g.font = body(400, 30);
  g.fillText(fit(m ? `${m.name}, hiérarchie ${hierarchy(c)}` : 'Modèle à choisir', W - 2 * P), P + 16, 196);
  const parts = [c.head, c.torso, c.undercarriage].filter(Boolean).join('  /  ');
  if (parts) { g.font = body(400, 24); g.fillText(fit(parts, W - 2 * P - 32), P + 16, 234); }

  // meters
  let y = 300;
  const meter = (label, cur, max, color, yy) => {
    g.fillStyle = col.muted; g.font = body(600, 26); g.fillText(label, P + 16, yy);
    g.fillStyle = cur < max && color === col.amber ? col.fault : color; g.font = disp(700, 44);
    const txt = `${cur}`; g.textAlign = 'right'; g.fillText(txt, W - P - 16 - 56, yy + 4);
    g.fillStyle = col.muted; g.font = disp(500, 28); g.fillText(`/${max}`, W - P - 16, yy + 4); g.textAlign = 'left';
    const x0 = P + 260, x1 = W - P - 140, n = Math.max(max, 1), gap = 6, cw = (x1 - x0 - gap * (n - 1)) / n;
    for (let i = 0; i < max; i++) {
      const x = x0 + i * (cw + gap);
      if (i < cur) { g.fillStyle = color; g.fillRect(x, yy - 26, cw, 26); }
      else { g.strokeStyle = color === col.amber ? col.fault : col.line; g.lineWidth = 2; g.strokeRect(x + 1, yy - 25, cw - 2, 24); }
    }
  };
  ATTRS.filter((a) => ch.attrMax[a] > 0 || c.statMode !== 'direct').forEach((a) => { meter(attrLabels(c)[a].label, attrCurrent(c, ch, a), ch.attrMax[a], col.amber, y); y += 66; });
  meter('Énergie', c.ep.current, epMax(c), col.coolant, y); y += 66;
  meter('Armure', armorCurrent(c, ch), armorTotal(c, ch), col.muted, y); y += 40;

  g.fillStyle = col.line; g.fillRect(P + 16, y, W - 2 * P - 32, 2); y += 56;

  // two columns
  const colW = (W - 2 * P - 32 - 40) / 2, xL = P + 16, xR = xL + colW + 40;
  const heading = (t, x, yy) => { g.fillStyle = col.amber; g.font = disp(600, 30); g.fillText(t, x, yy); return yy + 44; };
  const line = (t, x, yy, w, color = col.text) => { g.fillStyle = color; g.font = body(400, 26); g.fillText(fit(t, w), x, yy); return yy + 38; };

  let yl = heading('Programmes', xL, y);
  const progs = programs(c).filter((p) => p.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 9);
  if (!progs.length) yl = line('Aucun programme renseigné', xL, yl, colW, col.muted);
  progs.forEach((p) => {
    g.fillStyle = col.text; g.font = body(400, 26); g.fillText(fit(p.label, colW - 80), xL, yl);
    g.font = disp(700, 28); g.textAlign = 'right'; g.fillText(String(p.rating), xL + colW, yl); g.textAlign = 'left';
    yl += 38;
  });

  let yr = heading('Modules', xR, y);
  const mods = c.modules.filter(Boolean);
  if (!mods.length) yr = line('Aucun module', xR, yr, colW, col.muted);
  mods.slice(0, 5).forEach((name) => { const mo = findModule(name); yr = line(`${name}${mo?.cost ? `  (${mo.cost})` : ''}`, xR, yr, colW); });
  yr += 18;
  yr = heading('Armes', xR, yr);
  if (!c.weapons.length) yr = line('Aucune arme', xR, yr, colW, col.muted);
  c.weapons.slice(0, 4).forEach((w) => { yr = line(`${w.name}  +${w.bonus || 0} / ${w.degats || '?'} / ${w.portee || '?'}`, xR, yr, colW); });
  if (c.secondary.length) { yr += 18; yr = heading('Fonctions', xR, yr); c.secondary.slice(0, 3).forEach((s) => { yr = line(s, xR, yr, colW); }); }

  // footer
  g.fillStyle = col.muted; g.font = body(400, 22);
  g.fillText('Mutant : Année Zéro, Mechatron. Compagnon de fan, non officiel.', P + 16, H - 64);
  g.textAlign = 'right'; g.fillStyle = col.amber; g.font = disp(600, 24); g.fillText('MECHATRON-7', W - P - 16, H - 64); g.textAlign = 'left';

  return new Promise((res) => cv.toBlob(res, 'image/png'));
}
