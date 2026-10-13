<script>
  // MJ → Rencontres (T15): the encounter library and four quick setups. « Lancer »
  // builds the fight (team, NPCs, surprise, pool, map, tokens on the spawn zones)
  // and opens Combat → Préparation.
  import EncounterEditor from './EncounterEditor.svelte';
  import Icon from '../../components/Icon.svelte';
  import { store, newId } from '../../lib/store.svelte.js';
  import { PRESETS, enemyLine, matches, encounterFile, readEncounterFile } from '../../lib/encounters.js';
  import { downloadBlob, jsonBlob, slug } from '../../lib/exports.js';

  const encs = $derived(store.campaign.encounters);
  const maps = $derived(store.campaign.maps);
  let q = $state('');
  let tag = $state(null);
  let editing = $state(null);
  const tags = $derived([...new Set(encs.flatMap((e) => e.tags))].sort());
  const shown = $derived(encs.filter((e) => matches(e, q) && (!tag || e.tags.includes(tag))));
  const mapName = (id) => maps.find((m) => m.id === id)?.name || null;

  // Launching replaces a fight in progress: ask with a second tap.
  const busy = $derived(store.combat.combatants.length > 0);
  let armed = $state(null);
  function launch(e) {
    if (busy && armed !== (e.id ?? e.name)) { armed = e.id ?? e.name; setTimeout(() => (armed = null), 3500); return; }
    armed = null;
    store.launchEncounter($state.snapshot(e));
  }
  const launchLabel = (e) => (busy && armed === (e.id ?? e.name) ? 'Remplacer le combat en cours' : 'Lancer');

  function add() { editing = store.saveEncounter({ name: `Rencontre ${encs.length + 1}` }); }
  function dup(e) {
    const { id, ...rest } = $state.snapshot(e);
    store.saveEncounter({ ...rest, name: `${e.name || 'Sans nom'} (copie)` });
    store.notify('Rencontre dupliquée');
  }
  function copyPreset(p) {
    const mapId = store.saveMap({ ...p.map, name: p.name });
    editing = store.saveEncounter({ name: p.name, tags: p.tags, mapId, enemies: p.enemies, surprise: p.surprise, gmPool: null, notes: p.notes });
    store.notify('Copiée dans la bibliothèque');
  }
  let delArmed = $state(null);
  function del(e) {
    if (delArmed !== e.id) { delArmed = e.id; setTimeout(() => (delArmed = null), 3500); return; }
    store.removeEncounter(e.id);
    store.notify('Rencontre supprimée');
  }

  let fileInput = $state(null);
  function exportFile() {
    const list = $state.snapshot(shown);
    downloadBlob(jsonBlob(encounterFile(list, $state.snapshot(maps))), `rencontres-${slug({ name: store.campaign.name || 'campagne' })}.json`);
    store.notify(`${list.length} rencontre${list.length > 1 ? 's' : ''} exportée${list.length > 1 ? 's' : ''}`);
  }
  async function importFile(ev) {
    const f = ev.currentTarget.files[0];
    ev.currentTarget.value = '';
    if (!f) return;
    let read = null;
    try { read = readEncounterFile(JSON.parse(await f.text()), newId); } catch {}
    if (!read) { store.notify("Ce fichier n'est pas un fichier de rencontres."); return; }
    read.maps.forEach((m) => store.saveMap(m));
    read.encounters.forEach((e) => store.saveEncounter(e));
    const n = read.encounters.length;
    store.notify(`${n} rencontre${n > 1 ? 's' : ''} importée${n > 1 ? 's' : ''}`);
  }
</script>

<section class="panel enc">
  <div class="panel-head">
    <h2>Rencontres <span class="muted num">{encs.length}</span></h2>
    {#if !editing}<button class="btn primary" onclick={add}><Icon name="plus" size={16} />Nouvelle rencontre</button>{/if}
  </div>

  {#if editing && encs.some((e) => e.id === editing)}
    <EncounterEditor id={editing} ondone={() => (editing = null)} />
  {:else}
    <h3 class="sub">Mises en place rapides</h3>
    <ul class="presets">
      {#each PRESETS as p (p.id)}
        <li>
          <b>{p.name}</b>
          <small>{enemyLine(p)}{p.surprise === 'enemies' ? ', embuscade' : ''}</small>
          <span class="muted note">{p.notes}</span>
          <div class="acts">
            <button class="btn small primary" class:armed={busy && armed === p.name} onclick={() => launch(p)}>{launchLabel(p)}</button>
            <button class="btn small ghost" onclick={() => copyPreset(p)}><Icon name="copy" size={16} />Copier pour la modifier</button>
          </div>
        </li>
      {/each}
    </ul>

    <h3 class="sub">Bibliothèque</h3>
    {#if encs.length}
      <input class="input search" type="search" placeholder="Chercher un nom, un mot-clé, un PNJ…" aria-label="Chercher une rencontre" value={q} oninput={(e) => (q = e.currentTarget.value)} />
      {#if tags.length}
        <div class="chips tags">{#each tags as t (t)}<button class="chip" aria-pressed={tag === t} onclick={() => (tag = tag === t ? null : t)}>{t}</button>{/each}</div>
      {/if}
    {:else}
      <p class="muted">Aucune rencontre enregistrée. Créez-en une, ou copiez une mise en place rapide pour l'adapter.</p>
    {/if}
    <ul class="list lib">
      {#each shown as e (e.id)}
        <li>
          <span class="who"><b>{e.name || 'Sans nom'}</b>
            <small>{enemyLine(e) || 'Aucun PNJ'}{mapName(e.mapId) ? `, carte ${mapName(e.mapId)}` : ''}{e.surprise !== 'none' ? (e.surprise === 'enemies' ? ', embuscade' : ', surprise') : ''}</small>
            {#if e.tags.length}<small class="tg">{e.tags.join(' · ')}</small>{/if}
          </span>
          <div class="acts">
            <button class="btn small primary" disabled={!e.enemies.length} onclick={() => launch(e)}>{launchLabel(e)}</button>
            <button class="icon-btn" aria-label="Modifier {e.name}" title="Modifier" onclick={() => (editing = e.id)}><Icon name="edit" /></button>
            <button class="icon-btn" aria-label="Dupliquer {e.name}" title="Dupliquer" onclick={() => dup(e)}><Icon name="copy" /></button>
            <button class="icon-btn" class:danger={delArmed === e.id} aria-label={delArmed === e.id ? `Toucher encore pour supprimer ${e.name}` : `Supprimer ${e.name}`} title="Supprimer" onclick={() => del(e)}><Icon name="trash" /></button>
          </div>
        </li>
      {/each}
      {#if encs.length && !shown.length}<li class="muted none">Aucune rencontre ne correspond.</li>{/if}
    </ul>
    <div class="files">
      <button class="btn small" disabled={!shown.length} onclick={exportFile}><Icon name="download" size={16} />Exporter{q || tag ? ' la sélection' : ''}</button>
      <button class="btn small" onclick={() => fileInput.click()}><Icon name="upload" size={16} />Importer</button>
      <input type="file" accept="application/json,.json" hidden bind:this={fileInput} onchange={importFile} />
    </div>
  {/if}
</section>

<style>
  .sub { font-size: .95rem; color: var(--muted); font-weight: 600; margin: 4px 0 8px; }
  .sub + .presets, .sub + .muted { margin-top: 0; }
  .presets { list-style: none; margin: 0 0 14px; padding: 0; display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
  .presets li { display: grid; gap: 4px; align-content: start; padding: 10px 12px; background: var(--abyss); border-left: 3px solid var(--line); }
  .presets b { font-family: var(--display); font-weight: 600; }
  .presets small { font-size: .82rem; }
  .note { font-size: .82rem; }
  .acts { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; margin-top: 4px; }
  .armed { background: transparent; color: var(--amber); }
  .search { margin-bottom: 8px; }
  .tags { margin-bottom: 8px; }
  .lib li { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; padding: 10px 0; }
  .lib .who { flex: 1 1 220px; display: grid; min-width: 0; }
  .lib b { font-family: var(--display); font-weight: 600; }
  .lib small { font-size: .82rem; color: var(--muted); }
  .lib .tg { color: var(--amber); }
  .lib .acts { margin: 0; }
  .icon-btn.danger { color: var(--fault); }
  .none { padding: 10px 0; }
  .files { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
</style>
