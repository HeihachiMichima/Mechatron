<script>
  import Icon from '../components/Icon.svelte';
  import Stepper from '../components/Stepper.svelte';
  import { store, ensureColor } from '../lib/store.svelte.js';
  import { GAME_DATA as D } from '../lib/data.js';
  import { ATTRS, chassis, modelOf, autoHierarchy, attrLabels } from '../lib/rules.js';
  import { partItems } from '../lib/pickers.js';
  import { startWizard } from '../lib/creation.js';

  const c = $derived(store.c);
  // Typed text: one undo step per field edit.
  const typed = (field) => (e) => store.type(c.id, field, (s) => (s[field] = e.currentTarget.value));
  const ch = $derived(chassis(c));
  const m = $derived(modelOf(c));
  const slots = [
    { key: 'head', cat: 'heads', label: 'Tête' },
    { key: 'torso', cat: 'torsos', label: 'Torse' },
    { key: 'undercarriage', cat: 'undercarriages', label: 'Support' }
  ];
  const statCols = [...ATTRS.map((a) => [a, D.attributeLabels[a].short]), ['slots', 'Empl.'], ['armor', 'Arm.']];
  const L = $derived(attrLabels(c));

  function pickPart(s) {
    store.open({
      type: 'picker', title: `Choisir : ${s.label.toLowerCase()}`, items: partItems(s.cat), current: c[s.key], allowClear: true,
      onpick: (name) => store.commit(name ? `${s.label} : ${name}` : `${s.label} retiré`, (st) => (st[s.key] = name))
    });
  }
  // GM mode only: the fiche then moves to its space (PC → Équipe, NPC → MJ).
  function setKind(k) {
    if (k === (c.kind === 'npc' ? 'npc' : 'pc')) return;
    const id = c.id;
    store.commit(k === 'npc' ? 'Fiche passée en PNJ' : 'Fiche passée en PJ', (s, d) => { s.kind = k; ensureColor(d.chars, s); });
    store.openFiche(id, 'robot');
  }
  const setBody = (b) => store.commit(null, (s) => { s.body = b; if (b !== 'robot') s.statMode = 'direct'; if (b === 'creature') s.online = false; });
  function setMode(m) {
    store.commit(m === 'direct' ? 'Statistiques saisies directement' : 'Statistiques calculées par le châssis', (s) => {
      if (m === 'direct' && s.statMode !== 'direct') {
        const cur = chassis(s);
        s.direct = { servos: cur.attrMax.servos, stabilite: cur.attrMax.stabilite, processeur: cur.attrMax.processeur, reseau: cur.attrMax.reseau, armor: cur.armorBase, slots: cur.slots };
      }
      s.statMode = m;
    });
  }
  const directCols = $derived([...ATTRS.map((a) => [a, L[a].label]), ['armor', 'Armure'], ['slots', 'Emplacements']]);
  const pickModel = (id) => store.commit(`Modèle : ${D.models.find((x) => x.id === id).name}`, (s) => (s.model = id));
</script>

<div class="grid">
  <section class="panel">
    <div class="panel-head"><h2>Identité</h2>
      {#if c.kind !== 'npc' && (store.campaign.phase === 'creation' || store.ui.gm)}<button class="btn small" onclick={() => startWizard(c.id)}>Reprendre l'assistant</button>{/if}
    </div>
    <label class="field"><span>Nom et numéro de série</span><input class="input" value={c.name} oninput={typed('name')} placeholder="ex. Rani NON-836" autocomplete="off" /></label>
    <label class="field"><span>Joueur</span><input class="input" value={c.player} oninput={typed('player')} autocomplete="off" /></label>
    {#if c.kind !== 'npc'}
      <div class="field">
        <span>Couleur de l'onglet</span>
        <div class="swatches" role="radiogroup" aria-label="Couleur de l'onglet">
          {#each D.pcColors as col (col.hex)}
            {@const owner = store.chars.find((x) => x.id !== c.id && x.kind !== 'npc' && x.color === col.hex)}
            <button class="sw" role="radio" aria-checked={c.color === col.hex} aria-label="{col.name}{owner ? `, déjà pris par ${owner.name || 'un autre robot'}` : ''}" title="{col.name}{owner ? ` (${owner.name || 'autre robot'})` : ''}"
              style="--sw:{col.hex}" class:taken={!!owner} onclick={() => store.commit(null, (s) => (s.color = col.hex))}></button>
          {/each}
        </div>
      </div>
    {/if}
    <label class="field">
      <span>Hiérarchie {#if autoHierarchy(c) != null}<em class="muted">(automatique : {autoHierarchy(c)})</em>{/if}</span>
      <input class="input" value={c.hierarchy} oninput={typed('hierarchy')} inputmode="numeric" placeholder={autoHierarchy(c) != null ? `${autoHierarchy(c)}, laissez vide pour l'automatique` : '0 à 10'} />
    </label>
  </section>

  <section class="panel">
    <div class="panel-head"><h2>Type de fiche</h2></div>
    <div class="opts">
      {#if store.ui.gm}<div><span class="ol">Joué par</span>
        <div class="chips">
          <button class="chip" aria-pressed={c.kind !== 'npc'} onclick={() => setKind('pc')}>Joueur (PJ)</button>
          <button class="chip" aria-pressed={c.kind === 'npc'} onclick={() => setKind('npc')}>MJ (PNJ)</button>
        </div>
      </div>{/if}
      <div><span class="ol">Corps</span>
        <div class="chips">
          <button class="chip" aria-pressed={c.body === 'robot'} onclick={() => setBody('robot')}>Robot</button>
          <button class="chip" aria-pressed={c.body === 'drone'} onclick={() => setBody('drone')}>Drone</button>
          <button class="chip" aria-pressed={c.body === 'creature'} onclick={() => setBody('creature')}>Créature</button>
        </div>
      </div>
      {#if c.body === 'robot'}
        <div><span class="ol">Statistiques</span>
          <div class="chips">
            <button class="chip" aria-pressed={c.statMode !== 'direct'} onclick={() => setMode('chassis')}>Par le châssis</button>
            <button class="chip" aria-pressed={c.statMode === 'direct'} onclick={() => setMode('direct')}>Saisie directe</button>
          </div>
        </div>
      {/if}
    </div>
    {#if c.body === 'drone'}<p class="hint">Drone : pas de Processeur ni de Réseau ; pour ces programmes il ne lance que les dés de programme. Localisation : 1-3 Servos, 4-5 Stabilité, 6 module.</p>{/if}
    {#if c.body === 'creature'}<p class="hint">Créature vivante : Force, Agilité, Intellect, Empathie. Les dégâts réduisent la Force.</p>{/if}
  </section>

  {#if c.body !== 'creature'}
  <section class="panel">
    <div class="panel-head"><h2>Modèle</h2>{#if m}<span class="meta">spécialité : {m.special}</span>{/if}</div>
    <div class="models">
      {#each D.models as mo (mo.id)}
        <button class="model" aria-pressed={c.model === mo.id} onclick={() => pickModel(mo.id)}>
          <span class="mname">{mo.name.replace('Robot de ', '').replace('Robot ', '')}</span>
          <span class="msub">{mo.special}, hiér. {mo.hierarchy}</span>
        </button>
      {/each}
    </div>
    {#if m?.startingGear}<p class="hint">Équipement de départ : {m.startingGear}.</p>{/if}
  </section>
  {/if}

  {#if c.statMode === 'direct'}
  <section class="panel wide">
    <div class="panel-head"><h2>Statistiques</h2><span class="meta">saisie directe</span></div>
    <div class="direct">
      {#each directCols as [k, l] (k)}
        {#if !(c.body !== 'robot' && (k === 'processeur' || k === 'reseau') && c.body === 'drone')}
          <div class="dc"><span>{l}</span><Stepper value={c.direct[k]} min={0} max={30} label={l} onchange={(v) => store.commit(null, (s) => (s.direct[k] = v))} size="sm" /></div>
        {/if}
      {/each}
    </div>
  </section>
  {:else}

  <section class="panel wide">
    <div class="panel-head"><h2>Châssis</h2><span class="meta">{ch.known}/3 pièces</span></div>
    <div class="parts">
      {#each slots as s (s.key)}
        {@const part = ch.parts[slots.indexOf(s)]}
        <button class="part" class:set={!!c[s.key]} onclick={() => pickPart(s)}>
          <span class="plabel">{s.label}</span>
          <span class="pname">{c[s.key] || 'Choisir une pièce'}</span>
          {#if part}
            <span class="pstats">{#each statCols as [k, l] (k)}<span><small>{l}</small><b class="num">{part[k]}</b></span>{/each}</span>
          {:else if c[s.key]}<span class="muted">Pièce personnalisée, sans statistiques</span>{/if}
          <span class="chev"><Icon name="chevron" size={18} /></span>
        </button>
      {/each}
    </div>
    <div class="totals" aria-label="Totaux du châssis">
      {#each statCols as [k, l] (k)}
        <div><small>{k === 'slots' ? 'Emplacements' : k === 'armor' ? 'Armure' : L[k].label}</small><b class="num">{k === 'slots' ? ch.slots : k === 'armor' ? ch.armorBase : ch.attrMax[k]}</b></div>
      {/each}
    </div>
  </section>

  {/if}

  <section class="panel wide">
    <div class="panel-head"><h2>{c.kind === 'npc' ? 'Notes du MJ' : 'Relations et rêve'}</h2></div>
    {#if c.kind === 'npc'}
      <textarea class="input" value={c.notes} oninput={typed('notes')} placeholder="Motivation, ordres, équipement…" aria-label="Notes du PNJ"></textarea>
    {:else}
    <div class="rel">
      <label class="field"><span>Mon binôme</span><input class="input" value={c.buddy} oninput={typed('buddy')} /></label>
      <label class="field"><span>Je déteste</span><input class="input" value={c.hate} oninput={typed('hate')} /></label>
      <label class="field"><span>Je dois protéger</span><input class="input" value={c.protect} oninput={typed('protect')} /></label>
      <label class="field"><span>Mon grand rêve</span><input class="input" value={c.dream} oninput={typed('dream')} /></label>
    </div>
    <label class="field notes"><span>Notes</span><textarea class="input" value={c.notes} oninput={typed('notes')} placeholder="Ce que ce robot sait, ses ordres, ses secrets…"></textarea></label>
    {/if}
  </section>
</div>

<style>
  .grid { display: grid; gap: 12px; }
  .grid > .panel + .panel { margin-top: 0; }
  @media (min-width: 900px) { .grid { grid-template-columns: 1fr 1fr; align-items: start; } .wide { grid-column: 1 / -1; } }
  @media (min-width: 1500px) { .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  em { font-style: normal; }
  .models { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
  @media (min-width: 560px) { .models { grid-template-columns: repeat(4, 1fr); } }
  .model { display: grid; text-align: left; gap: 2px; padding: 10px; min-height: 58px; background: var(--abyss); border: 1px solid var(--line); border-radius: 4px; }
  .model[aria-pressed='true'] { border-color: var(--amber); box-shadow: inset 0 0 0 1px var(--amber); }
  .model[aria-pressed='true'] .mname { color: var(--amber); }
  .mname { font-family: var(--display); font-weight: 600; text-transform: capitalize; }
  .msub { font-size: .8rem; color: var(--muted); }
  .parts { display: grid; gap: 8px; }
  @media (min-width: 720px) { .parts { grid-template-columns: repeat(3, 1fr); } }
  .part { position: relative; display: grid; gap: 4px; text-align: left; padding: 12px 36px 12px 12px; background: var(--abyss); border: 1px dashed var(--line); border-radius: 4px; min-height: 64px; }
  .part.set { border-style: solid; }
  .part:hover { border-color: var(--amber); }
  .plabel { font-size: .8rem; color: var(--muted); }
  .pname { font-family: var(--display); font-weight: 600; font-size: 1.05rem; }
  .pstats { display: flex; gap: 10px; flex-wrap: wrap; }
  .pstats span { display: grid; }
  .pstats small, .totals small { font-size: .7rem; color: var(--muted); }
  .chev { position: absolute; right: 10px; top: 50%; translate: 0 -50%; color: var(--muted); }
  .totals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
  @media (min-width: 560px) { .totals { grid-template-columns: repeat(6, 1fr); } }
  .totals div { display: grid; }
  .totals b { font-size: 1.4rem; color: var(--amber); }
  .swatches { display: flex; flex-wrap: wrap; gap: 8px; }
  .sw { width: 36px; height: 36px; border-radius: 50%; background: var(--sw); border: 2px solid var(--hull); box-shadow: 0 0 0 1px var(--line); position: relative; }
  .sw[aria-checked='true'] { box-shadow: 0 0 0 2px var(--text); }
  .sw.taken::after { content: ''; position: absolute; inset: 13px; border-radius: 50%; background: var(--hull); opacity: .7; }
  .opts { display: grid; gap: 12px; }
  .ol { display: block; font-size: .85rem; color: var(--muted); margin-bottom: 6px; }
  .direct { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
  .dc { display: grid; gap: 4px; }
  .dc span { font-size: .85rem; color: var(--muted); }
  .notes { margin-bottom: 0; }
  .notes textarea { min-height: 110px; }
  .rel { display: grid; gap: 0 12px; }
  @media (min-width: 720px) { .rel { grid-template-columns: 1fr 1fr; } }
</style>
