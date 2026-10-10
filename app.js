/**
 * MECHATRON — interactive character sheet logic
 * Everything here reads/writes a single `state` object, mirrored to
 * localStorage on every change, and offers Export/Import to .json so a
 * character can be versioned, backed up, or handed to another player.
 */

const STORAGE_KEY = "mechatron-sheet-v1";

/* ----------------------------------------------------------------------
 * Default character: blank sheet, except pre-filled with what's already
 * known about the user's own Battle Robot (see /areas/mechatron-campaign
 * notes): Pashin Ama 9 head, Laser Pistol, Grenade Launcher, Accelerator
 * and Reactive Armor.
 * -------------------------------------------------------------------- */
function blankState(){
  const dd = GAME_DATA.defaults.devDefault;
  return {
    name: "", player: "", model: "",
    head: "", torso: "", undercarriage: "",
    hate: "", protect: "", dream: "",
    hierarchy: "",
    attributes: { servos: 0, stabilite: 0, processeur: 0, reseau: 0 },
    // Two lines of Protection: Armure (chassis Armor Rating) rolls first
    // against any damage; Couverture (cover) is a *separate*, extra roll
    // that only helps against ranged attacks (book p.90: "the effect of
    // cover can be combined with armor — first roll for the cover, then
    // for your own Armor Rating").
    protection: { armor: 0, cover: 0 },
    ep: { current: 0, max: GAME_DATA.defaults.epMax },
    xp: { current: 0, max: GAME_DATA.defaults.xpMax },
    programRatings: {},      // key -> number, for the 12 base programs
    specialRating: 0,
    customPrograms: [],      // [{label, rating}]
    secondary: [],           // [string] chosen from GAME_DATA.secondaryFunctions
    modules: [],             // [string], length tracks computed slots
    equipment: [],           // [{name, integre}]
    weapons: [],             // [{name, bonus, degats, portee}]
    notes: "",
    // Mechatron-7 collective Development Levels, 0-100 each (book default
    // is the current ration level, ~50 to start a campaign).
    dev: { Energie: dd, Production: dd, Défense: dd, Information: dd }
  };
}

function prefillState(){
  const s = blankState();
  s.model = "battle";
  s.head = "Pashin Ama 9";
  s.weapons = [{ name: "Pistolet laser", bonus: "", degats: "", portee: "" }];
  s.modules = ["Lance-grenades", "Accélérateur", "Armure réactive"];
  return s;
}

let state = loadState();

// Old saves may have `protection` as a plain number (single track) and/or
// `dev` values as booleans (toggle hexes) — migrate both to the current
// shape so nobody's saved character breaks when the sheet is updated.
function migrateState(s){
  if(typeof s.protection === "number"){
    s.protection = { armor: s.protection, cover: 0 };
  } else if(!s.protection || typeof s.protection !== "object"){
    s.protection = { armor: 0, cover: 0 };
  } else {
    if(typeof s.protection.armor !== "number") s.protection.armor = 0;
    if(typeof s.protection.cover !== "number") s.protection.cover = 0;
  }
  if(s.dev){
    Object.keys(s.dev).forEach(k=>{
      if(typeof s.dev[k] === "boolean") s.dev[k] = s.dev[k] ? 75 : GAME_DATA.defaults.devDefault;
    });
  }
  return s;
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return prefillState();
    const saved = JSON.parse(raw);
    // shallow-merge over a blank state so new fields never crash old saves
    const base = blankState();
    const merged = Object.assign(base, saved, {
      attributes: Object.assign(base.attributes, saved.attributes || {}),
      ep: Object.assign(base.ep, saved.ep || {}),
      xp: Object.assign(base.xp, saved.xp || {}),
      dev: Object.assign(base.dev, (saved.dev && typeof saved.dev === "object") ? saved.dev : {})
    });
    return migrateState(merged);
  }catch(e){
    console.warn("Could not read saved character, starting fresh.", e);
    return prefillState();
  }
}

function saveState(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch(e){ console.warn("Could not save character.", e); }
}

/* ---------------------------------------------------------------------- *
 * Small DOM helpers
 * ---------------------------------------------------------------------- */
const $ = (id) => document.getElementById(id);

function el(tag, props={}, children=[]){
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k,v])=>{
    if(k === "class") node.className = v;
    else if(k === "text") node.textContent = v;
    else if(k === "html") node.innerHTML = v;
    else if(k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(c=>{
    if(c) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return node;
}

function hexSvg(){
  return `<svg viewBox="0 0 24 24"><polygon points="6,2 18,2 24,12 18,22 6,22 0,12" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
}

/* ---------------------------------------------------------------------- *
 * Hex-pip tracker: click a pip to set the value to it; clicking the
 * currently-topmost filled pip empties it (classic "fill / empty" toggle).
 * ---------------------------------------------------------------------- */
function renderPips(container, max, current, onChange){
  container.innerHTML = "";
  max = Math.max(0, max|0);
  current = Math.min(current|0, max);
  for(let i=1; i<=max; i++){
    const filled = i <= current;
    const pip = el("div", { class: "hex-pip" + (filled ? " filled" : "") });
    pip.appendChild(el("div", { class: "face" }));
    pip.addEventListener("click", ()=>{
      const next = (current === i) ? i-1 : i;
      onChange(next);
    });
    container.appendChild(pip);
  }
}

/* ---------------------------------------------------------------------- *
 * Chassis helpers
 * ---------------------------------------------------------------------- */
function findChassis(category, name){
  if(!name) return null;
  const list = GAME_DATA.chassis[category] || [];
  return list.find(p => p.name.toLowerCase() === name.trim().toLowerCase()) || null;
}

function sumStat(parts, key){
  let total = 0, known = 0;
  parts.forEach(p=>{
    if(p && typeof p[key] === "number"){ total += p[key]; known++; }
  });
  return known > 0 ? total : null; // null = "no data yet", fall back to default
}

function computedChassis(){
  const h = findChassis("heads", state.head);
  const t = findChassis("torsos", state.torso);
  const u = findChassis("undercarriages", state.undercarriage);
  const parts = [h, t, u];
  const d = GAME_DATA.defaults;
  return {
    parts,
    attrMax: {
      servos: sumStat(parts, "servos") ?? d.attributeMax,
      stabilite: sumStat(parts, "stabilite") ?? d.attributeMax,
      processeur: sumStat(parts, "processeur") ?? d.attributeMax,
      reseau: sumStat(parts, "reseau") ?? d.attributeMax
    },
    armorMax: sumStat(parts, "armor") ?? d.armorMax,
    slots: sumStat(parts, "slots") ?? d.slotsDefault
  };
}

/* ---------------------------------------------------------------------- *
 * Renderers
 * ---------------------------------------------------------------------- */
function renderHeader(){
  $("charName").value = state.name;
  $("playerName").value = state.player;
  $("hierarchyValue").value = state.hierarchy;
  $("fieldHate").value = state.hate;
  $("fieldProtect").value = state.protect;
  $("fieldDream").value = state.dream;
  $("notesArea").value = state.notes;

  const modelSel = $("modelSelect");
  if(!modelSel.dataset.filled){
    GAME_DATA.models.forEach(m=>{
      modelSel.appendChild(el("option", { value: m.id, text: `${m.name} (${m.nameEn})` }));
    });
    modelSel.dataset.filled = "1";
  }
  modelSel.value = state.model;

  ["heads","torsos","undercarriages"].forEach(cat=>{
    const dlId = "dl-" + cat;
    if(!$(dlId)){
      const dl = el("datalist", { id: dlId });
      GAME_DATA.chassis[cat].forEach(p => dl.appendChild(el("option", { value: p.name })));
      document.body.appendChild(dl);
    }
  });
  ensureInputList("headSelect", "dl-heads");
  ensureInputList("torsoSelect", "dl-torsos");
  ensureInputList("undercarriageSelect", "dl-undercarriages");
  $("headSelect").value = state.head;
  $("torsoSelect").value = state.torso;
  $("undercarriageSelect").value = state.undercarriage;
}

// Swap a <select> placeholder for a free-text input backed by a <datalist>,
// so the catalogue stays open-ended (easy to extend in data.js) while still
// behaving like a searchable dropdown.
function ensureInputList(selectId, datalistId){
  const old = $(selectId);
  if(old.tagName === "INPUT") return old;
  const input = el("input", { type: "text", id: selectId, list: datalistId, placeholder: "— choisir ou saisir —" });
  old.replaceWith(input);
  return input;
}

function renderAttributes(){
  const chassis = computedChassis();
  const wrap = $("attributesTrack");
  wrap.innerHTML = "";
  Object.entries(GAME_DATA.attributeLabels).forEach(([key, info])=>{
    const max = chassis.attrMax[key];
    const row = el("div", { class: "attr-row" });
    row.appendChild(el("div", { class: "attr-text" }, [
      el("span", { class: "attr-sub", text: info.sub }),
      el("span", { class: "attr-name", text: info.label })
    ]));
    const pipWrap = el("div", { class: "pip-row" });
    row.appendChild(pipWrap);
    wrap.appendChild(row);
    const redraw = (val)=>{ state.attributes[key] = val; saveState(); renderPips(pipWrap, max, val, redraw); };
    renderPips(pipWrap, max, state.attributes[key], redraw);
  });

  // Two lines of Protection (book p.90): Armure is the robot's own Armor
  // Rating (from chassis parts); Couverture is a *separate* roll for
  // situational cover (furniture/door/wall…) that only helps against
  // ranged attacks and is rolled in addition to Armure, not summed into it.
  const protWrap = $("protectionTrack");
  protWrap.innerHTML = "";

  const arow = el("div", { class: "attr-row" });
  arow.appendChild(el("div", { class: "attr-text" }, [
    el("span", { class: "attr-sub", text: "blindage châssis" }),
    el("span", { class: "attr-name", text: "Armure" })
  ]));
  const apips = el("div", { class: "pip-row" });
  arow.appendChild(apips);
  protWrap.appendChild(arow);
  const redrawArmor = (val)=>{ state.protection.armor = val; saveState(); renderPips(apips, chassis.armorMax, val, redrawArmor); };
  renderPips(apips, chassis.armorMax, state.protection.armor, redrawArmor);

  const crow = el("div", { class: "attr-row" });
  crow.appendChild(el("div", { class: "attr-text" }, [
    el("span", { class: "attr-sub", text: "meuble / porte / mur" }),
    el("span", { class: "attr-name", text: "Couverture" })
  ]));
  const cpips = el("div", { class: "pip-row" });
  crow.appendChild(cpips);
  protWrap.appendChild(crow);
  const coverMax = GAME_DATA.defaults.coverMax;
  const redrawCover = (val)=>{ state.protection.cover = val; saveState(); renderPips(cpips, coverMax, val, redrawCover); };
  renderPips(cpips, coverMax, state.protection.cover, redrawCover);

  const presetRow = el("div", { class: "cover-presets" });
  GAME_DATA.coverPresets.forEach(preset=>{
    const btn = el("button", { class: "cover-preset-btn", type: "button", text: `${preset.name} (${preset.armor})`, title: `Définir Couverture à ${preset.armor}` });
    btn.addEventListener("click", ()=>{ redrawCover(preset.armor); });
    presetRow.appendChild(btn);
  });
  protWrap.appendChild(presetRow);

  // Chassis panel hint / computed summary
  const parts = chassis.parts;
  const known = parts.filter(Boolean).length;
  $("chassisHint").textContent = known === 0
    ? "Les caractéristiques et l'armure se calculent automatiquement une fois les pièces renseignées."
    : `Calculé depuis ${known}/3 pièce(s) reconnue(s) — Servos ${chassis.attrMax.servos}, Stabilité ${chassis.attrMax.stabilite}, Processeur ${chassis.attrMax.processeur}, Réseau ${chassis.attrMax.reseau}, Armure ${chassis.armorMax}, Emplacements ${chassis.slots}.`;

  $("slotsCount").textContent = chassis.slots;
  return chassis;
}

function renderEnergyAndXp(){
  $("epMax").value = state.ep.max;
  $("xpMax").value = state.xp.max;
  const epWrap = $("epTrack");
  const redrawEp = (val)=>{ state.ep.current = val; saveState(); renderPips(epWrap, state.ep.max, val, redrawEp); };
  renderPips(epWrap, state.ep.max, state.ep.current, redrawEp);

  const xpWrap = $("xpTrack");
  const redrawXp = (val)=>{ state.xp.current = val; saveState(); renderPips(xpWrap, state.xp.max, val, redrawXp); };
  renderPips(xpWrap, state.xp.max, state.xp.current, redrawXp);
}

// Looks up the "Effect of Being Online" band for a Development Level score
// (0-100) and returns { min, bonus, energyEp } — see GAME_DATA.devThresholds.
function devBandFor(score){
  const n = Number(score) || 0;
  const bands = GAME_DATA.devThresholds;
  for(const b of bands){ if(n >= b.min) return b; }
  return bands[bands.length-1];
}

function formatBonus(n){
  return n > 0 ? `+${n}` : String(n);
}

// The small "losange" icon next to a program on the sheet: shows the live
// numeric bonus that program gets from its linked Development Level
// (Production -> Surcharge, Défense -> Assaut & Tir, Information -> Archives).
function devMarkSvg(devBonus){
  if(!devBonus) return "";
  const band = devBandFor(state.dev[devBonus]);
  const cls = band.bonus > 0 ? "dev-bonus-pos" : band.bonus < 0 ? "dev-bonus-neg" : "dev-bonus-zero";
  return `<span class="dev-mark-badge ${cls}">${formatBonus(band.bonus)}</span>`;
}

function renderPrograms(){
  const wrap = $("programsList");
  wrap.innerHTML = "";
  GAME_DATA.programs.forEach(p=>{
    const rating = state.programRatings[p.key] ?? 0;
    const row = el("div", { class: "program-row" });
    const num = el("input", { type: "number", min: "0", max: "6", value: rating });
    num.addEventListener("change", ()=>{ state.programRatings[p.key] = parseInt(num.value)||0; saveState(); });
    row.appendChild(num);
    row.appendChild(el("div", { class: "attr-text", style:"flex:1;text-align:left;" }, [
      el("span", { class: "prog-name", text: p.label + " " }),
      el("span", { class: "prog-desc", text: `(${GAME_DATA.attributeLabels[p.attr].label}) ${p.desc}` })
    ]));
    row.appendChild(el("div", { class: "dev-mark", html: devMarkSvg(p.devBonus), title: p.devBonus ? `Bonus du niveau de développement "${p.devBonus}" (${state.dev[p.devBonus]})` : "" }));
    wrap.appendChild(row);
  });

  // Specialist (13th) program, tied to the chosen model
  const model = GAME_DATA.models.find(m => m.id === state.model);
  if(model){
    const row = el("div", { class: "program-row" });
    const num = el("input", { type: "number", min: "0", max: "6", value: state.specialRating || 0 });
    num.addEventListener("change", ()=>{ state.specialRating = parseInt(num.value)||0; saveState(); });
    row.appendChild(num);
    row.appendChild(el("div", { class: "attr-text", style:"flex:1;text-align:left;" }, [
      el("span", { class: "prog-name", text: model.special + " " }),
      el("span", { class: "prog-desc", text: `— programme spécialiste (${model.name})` })
    ]));
    wrap.appendChild(row);
  }

  // Custom / extra program lines (the sheet leaves blank lines here too)
  state.customPrograms.forEach((cp, idx)=>{
    const row = el("div", { class: "program-row custom" });
    const num = el("input", { type: "number", min:"0", max:"6", value: cp.rating || 0 });
    num.addEventListener("change", ()=>{ state.customPrograms[idx].rating = parseInt(num.value)||0; saveState(); });
    const txt = el("input", { type: "text", value: cp.label || "", placeholder: "programme personnalisé…" });
    txt.addEventListener("input", ()=>{ state.customPrograms[idx].label = txt.value; saveState(); });
    const rm = el("button", { class: "add-row-btn", type: "button", text: "×", title: "supprimer" });
    rm.addEventListener("click", ()=>{ state.customPrograms.splice(idx,1); saveState(); renderPrograms(); });
    row.appendChild(num); row.appendChild(txt); row.appendChild(rm);
    wrap.appendChild(row);
  });

  const addBtn = el("button", { class: "add-row-btn", type: "button", text: "+ programme" });
  addBtn.addEventListener("click", ()=>{ state.customPrograms.push({label:"", rating:0}); saveState(); renderPrograms(); });
  wrap.appendChild(addBtn);
}

// Builds the option groups for one secondary-function row: the current
// model's own functions first (book p.65-68), then the 20 general ones any
// robot can learn later for 5 PX (p.68-69) — real catalogue data, not
// freeform text, per GAME_DATA.secondaryFunctions.
function secondaryOptionGroups(model){
  const all = GAME_DATA.secondaryFunctions;
  const groups = [];
  if(model){
    const own = all.filter(f => f.model === model.id);
    if(own.length) groups.push({ label: "Fonctions de " + model.name, items: own });
  }
  const general = all.filter(f => f.model === "general");
  groups.push({ label: "Fonctions générales (5 PX)", items: general });
  const others = all.filter(f => f.model !== "general" && (!model || f.model !== model.id));
  if(others.length) groups.push({ label: "Autres modèles", items: others });
  return groups;
}

function renderSecondary(){
  const wrap = $("secondaryList");
  wrap.innerHTML = "";
  const model = GAME_DATA.models.find(m => m.id === state.model);
  const groups = secondaryOptionGroups(model);

  state.secondary.forEach((name, idx)=>{
    const row = el("div", { class: "secondary-row" });
    const sel = el("select", { class: "sec-name" });
    sel.appendChild(el("option", { value: "", text: "— choisir —" }));
    groups.forEach(g=>{
      const og = el("optgroup", { label: g.label });
      g.items.forEach(f => og.appendChild(el("option", { value: f.name, text: `${f.name} (${f.nameEn})` })));
      sel.appendChild(og);
    });
    sel.value = name;
    const meta = el("div", { class: "hint-text sec-meta" });
    const updateMeta = ()=>{
      const entry = GAME_DATA.secondaryFunctions.find(f => f.name === sel.value);
      meta.textContent = entry ? entry.desc : "";
    };
    updateMeta();
    sel.addEventListener("change", ()=>{ state.secondary[idx] = sel.value; saveState(); updateMeta(); });
    const rm = el("button", { class: "add-row-btn", type: "button", text: "×", title: "supprimer" });
    rm.addEventListener("click", ()=>{ state.secondary.splice(idx,1); saveState(); renderSecondary(); });
    const top = el("div", { class: "row-top" }, [sel, rm]);
    row.appendChild(top);
    row.appendChild(meta);
    wrap.appendChild(row);
  });

  const addBtn = el("button", { class: "add-row-btn", type: "button", text: "+ ligne" });
  addBtn.addEventListener("click", ()=>{ state.secondary.push(""); saveState(); renderSecondary(); });
  wrap.appendChild(addBtn);
}

function moduleMetaText(entry){
  if(!entry) return "";
  const bits = [];
  if(entry.cost != null) bits.push(`${entry.cost}`);
  if(entry.tag) bits.push(entry.tag === "R" ? "Réactif" : entry.tag === "E" ? "Amélioration" : entry.tag);
  if(entry.effect) bits.push(entry.effect);
  return bits.join(" — ");
}

function renderModules(chassis){
  const wrap = $("modulesList");
  wrap.innerHTML = "";
  if(!$("dl-modules")){
    const dl = el("datalist", { id: "dl-modules" });
    GAME_DATA.modules.forEach(m => dl.appendChild(el("option", { value: m.name })));
    document.body.appendChild(dl);
  }
  const slotCount = Math.max(chassis.slots, state.modules.length);
  while(state.modules.length < slotCount) state.modules.push("");

  state.modules.forEach((name, idx)=>{
    const entry = GAME_DATA.modules.find(m => m.name.toLowerCase() === (name||"").trim().toLowerCase());
    const row = el("div", { class: "module-row" });
    const top = el("div", { class: "row-top" });
    const input = el("input", { type: "text", list: "dl-modules", value: name, placeholder: `emplacement ${idx+1}` });
    const meta = el("div", { class: "module-meta", text: moduleMetaText(entry) });
    input.addEventListener("input", ()=>{
      state.modules[idx] = input.value; saveState();
      const e2 = GAME_DATA.modules.find(m => m.name.toLowerCase() === input.value.trim().toLowerCase());
      meta.textContent = moduleMetaText(e2);
    });
    top.appendChild(input);
    if(idx >= chassis.slots){
      const rm = el("button", { class: "add-row-btn", type: "button", text: "×", title: "supprimer l'emplacement" });
      rm.addEventListener("click", ()=>{ state.modules.splice(idx,1); saveState(); renderModules(chassis); });
      top.appendChild(rm);
    }
    row.appendChild(top);
    row.appendChild(meta);
    wrap.appendChild(row);
  });

  const addBtn = el("button", { class: "add-row-btn", type: "button", text: "+ emplacement" });
  addBtn.addEventListener("click", ()=>{ state.modules.push(""); saveState(); renderModules(chassis); });
  wrap.appendChild(addBtn);
}

function renderEquipment(){
  const wrap = $("equipList");
  wrap.innerHTML = "";
  if(!$("dl-equipment")){
    const dl = el("datalist", { id: "dl-equipment" });
    GAME_DATA.equipment.forEach(m => dl.appendChild(el("option", { value: m.name })));
    document.body.appendChild(dl);
  }
  while(state.equipment.length < 6) state.equipment.push({ name: "", integre: false });

  state.equipment.forEach((row0, idx)=>{
    const row = el("div", { class: "equip-row" });
    const input = el("input", { type: "text", list: "dl-equipment", value: row0.name || "", placeholder: "objet, artefact…" });
    input.addEventListener("input", ()=>{ state.equipment[idx].name = input.value; saveState(); });
    row.appendChild(input);
    const pip = el("div", { class: "hex-pip small" + (row0.integre ? " filled" : ""), title: "intégré" });
    pip.appendChild(el("div", { class: "face" }));
    pip.addEventListener("click", ()=>{
      state.equipment[idx].integre = !state.equipment[idx].integre; saveState(); renderEquipment();
    });
    row.appendChild(pip);
    wrap.appendChild(row);
  });
}

function renderWeapons(){
  const wrap = $("weaponsList");
  wrap.innerHTML = "";
  if(!$("dl-weapons")){
    const dl = el("datalist", { id: "dl-weapons" });
    GAME_DATA.weapons.forEach(m => dl.appendChild(el("option", { value: m.name })));
    document.body.appendChild(dl);
  }
  while(state.weapons.length < 5) state.weapons.push({ name:"", bonus:"", degats:"", portee:"" });

  state.weapons.forEach((w, idx)=>{
    const row = el("div", { class: "weapon-row" });
    const name = el("input", { type: "text", list: "dl-weapons", value: w.name || "", placeholder: "nom de l'arme" });
    const bonus = el("input", { type: "text", value: w.bonus ?? "" });
    const degats = el("input", { type: "text", value: w.degats ?? "" });
    const portee = el("input", { type: "text", value: w.portee ?? "" });
    name.addEventListener("input", ()=>{
      state.weapons[idx].name = name.value;
      const entry = GAME_DATA.weapons.find(x => x.name.toLowerCase() === name.value.trim().toLowerCase());
      if(entry){
        if(!bonus.value && entry.bonus != null){ bonus.value = entry.bonus; state.weapons[idx].bonus = entry.bonus; }
        if(!degats.value && entry.degats != null){ degats.value = entry.degats; state.weapons[idx].degats = entry.degats; }
        if(!portee.value && entry.portee != null){ portee.value = entry.portee; state.weapons[idx].portee = entry.portee; }
      }
      saveState();
    });
    bonus.addEventListener("input", ()=>{ state.weapons[idx].bonus = bonus.value; saveState(); });
    degats.addEventListener("input", ()=>{ state.weapons[idx].degats = degats.value; saveState(); });
    portee.addEventListener("input", ()=>{ state.weapons[idx].portee = portee.value; saveState(); });
    row.appendChild(name); row.appendChild(bonus); row.appendChild(degats); row.appendChild(portee);
    wrap.appendChild(row);
  });
}

function renderDevTrack(){
  const wrap = $("devTrack");
  wrap.innerHTML = "";
  const dd = GAME_DATA.defaults;
  ["Energie","Production","Défense","Information"].forEach(cat=>{
    const bonusPrograms = GAME_DATA.programs.filter(p => p.devBonus === cat).map(p=>p.label);
    const cell = el("div", { class: "dev-cell" });
    cell.appendChild(el("div", { class: "dev-name", text: cat }));

    const num = el("input", {
      type: "number", class: "dev-input", min: "0", max: String(dd.devMax),
      value: state.dev[cat]
    });
    num.addEventListener("change", ()=>{
      let v = parseInt(num.value);
      if(isNaN(v)) v = dd.devDefault;
      v = Math.max(0, Math.min(dd.devMax, v));
      num.value = v;
      state.dev[cat] = v;
      saveState();
      renderDevTrack();
      renderPrograms();
    });
    cell.appendChild(num);

    const band = devBandFor(state.dev[cat]);
    const effectText = cat === "Energie"
      ? `${band.energyEp} PE/jour`
      : (bonusPrograms.length ? `${formatBonus(band.bonus)} — ${bonusPrograms.join(" & ")}` : formatBonus(band.bonus));
    cell.appendChild(el("div", { class: "dev-bonus", text: effectText }));
    wrap.appendChild(cell);
  });
}

function renderAll(){
  renderHeader();
  const chassis = renderAttributes();
  renderEnergyAndXp();
  renderPrograms();
  renderSecondary();
  renderModules(chassis);
  renderEquipment();
  renderWeapons();
  renderDevTrack();
}

/* ---------------------------------------------------------------------- *
 * Wire up simple text fields (name, player, hierarchy, free fields, notes)
 * ---------------------------------------------------------------------- */
function bindSimpleFields(){
  const map = {
    charName: "name", playerName: "player", hierarchyValue: "hierarchy",
    fieldHate: "hate", fieldProtect: "protect", fieldDream: "dream", notesArea: "notes"
  };
  Object.entries(map).forEach(([id, key])=>{
    $(id).addEventListener("input", ()=>{ state[key] = $(id).value; saveState(); });
  });

  $("modelSelect").addEventListener("change", ()=>{
    state.model = $("modelSelect").value;
    const model = GAME_DATA.models.find(m => m.id === state.model);
    if(model && !state.hierarchy && model.hierarchy != null){
      state.hierarchy = String(model.hierarchy);
      $("hierarchyValue").value = state.hierarchy;
    }
    saveState();
    renderPrograms();
    renderSecondary();
  });

  ["headSelect","torsoSelect","undercarriageSelect"].forEach((id, i)=>{
    const key = ["head","torso","undercarriage"][i];
    document.body.addEventListener("input", (ev)=>{
      if(ev.target && ev.target.id === id){
        state[key] = ev.target.value; saveState();
        const chassis = renderAttributes();
        renderModules(chassis);
      }
    });
  });

  $("epMax").addEventListener("change", ()=>{
    state.ep.max = Math.max(1, parseInt($("epMax").value)||GAME_DATA.defaults.epMax);
    saveState(); renderEnergyAndXp();
  });
  $("xpMax").addEventListener("change", ()=>{
    state.xp.max = Math.max(1, parseInt($("xpMax").value)||GAME_DATA.defaults.xpMax);
    saveState(); renderEnergyAndXp();
  });

  document.body.addEventListener("click", (ev)=>{
    if(ev.target && ev.target.dataset && ev.target.dataset.add === "equip"){
      state.equipment.push({name:"", integre:false}); saveState(); renderEquipment();
    }
    if(ev.target && ev.target.dataset && ev.target.dataset.add === "weapons"){
      state.weapons.push({name:"",bonus:"",degats:"",portee:""}); saveState(); renderWeapons();
    }
  });
}

/* ---------------------------------------------------------------------- *
 * Theme picker — a display preference, kept separate from the character
 * (own localStorage key) so switching themes never touches saved data.
 * ---------------------------------------------------------------------- */
const THEME_KEY = "mechatron-theme-v1";
function bindTheme(){
  const saved = localStorage.getItem(THEME_KEY) || "";
  document.documentElement.setAttribute("data-theme", saved);
  $("themeSelect").value = saved;
  $("themeSelect").addEventListener("change", ()=>{
    const val = $("themeSelect").value;
    document.documentElement.setAttribute("data-theme", val);
    try{ localStorage.setItem(THEME_KEY, val); }catch(e){}
  });
}

/* ---------------------------------------------------------------------- *
 * Toolbar: export / import / print / reset
 * ---------------------------------------------------------------------- */
function bindToolbar(){
  $("btnExport").addEventListener("click", ()=>{
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: (state.name || "mechatron-personnage").replace(/[^a-z0-9\-_]+/gi,"_") + ".json" });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });

  $("btnImport").addEventListener("click", ()=> $("fileImport").click());
  $("fileImport").addEventListener("change", (ev)=>{
    const file = ev.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const data = JSON.parse(reader.result);
        state = migrateState(Object.assign(blankState(), data, {
          attributes: Object.assign(blankState().attributes, data.attributes || {}),
          ep: Object.assign(blankState().ep, data.ep || {}),
          xp: Object.assign(blankState().xp, data.xp || {}),
          dev: Object.assign(blankState().dev, (data.dev && typeof data.dev === "object") ? data.dev : {})
        }));
        saveState();
        renderAll();
      }catch(e){
        alert("Fichier invalide : " + e.message);
      }
    };
    reader.readAsText(file);
    ev.target.value = "";
  });

  $("btnPrint").addEventListener("click", ()=> window.print());

  $("btnReset").addEventListener("click", ()=>{
    if(confirm("Effacer toute la fiche et repartir d'un personnage vierge ?")){
      state = blankState();
      saveState();
      renderAll();
    }
  });
}

/* ---------------------------------------------------------------------- */
bindTheme();
bindSimpleFields();
bindToolbar();
renderAll();
