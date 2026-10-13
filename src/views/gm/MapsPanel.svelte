<script>
  // MJ → Cartes (T13): the campaign's maps (new, duplicate, edit, delete) and the
  // grid's house rules (square size, band edges, squares per maneuver).
  import MapEditor from './MapEditor.svelte';
  import Icon from '../../components/Icon.svelte';
  import { store } from '../../lib/store.svelte.js';
  import { HOUSE } from '../../lib/house.js';
  import { getRules } from '../../lib/settings.js';
  import { blankMap } from '../../lib/tactics/index.js';

  const maps = $derived(store.campaign.maps);
  let editing = $state(null);
  function add() {
    editing = store.saveMap({ ...blankMap(16, 12), name: `Carte ${maps.length + 1}` });
  }
  function dup(m) {
    const { id, ...rest } = $state.snapshot(m);
    store.saveMap({ ...rest, name: `${m.name || 'Sans nom'} (copie)` });
    store.notify('Carte dupliquée');
  }

  // Grid house rules, overridable per campaign (campaign.rules.grid).
  const g = $derived(getRules().grid);
  const FIELDS = [
    { k: 'squareM', label: 'Taille d\'une case (m)', min: 1, max: 10, get: (r) => r.squareM, set: (o, v) => (o.squareM = v) },
    { k: 'Proche', label: 'Proche jusqu\'à (cases)', min: 2, max: 10, get: (r) => r.bands.Proche, set: (o, v) => (o.bands = { ...(o.bands || {}), Proche: v }) },
    { k: 'Courte', label: 'Courte jusqu\'à (cases)', min: 3, max: 40, get: (r) => r.bands.Courte, set: (o, v) => (o.bands = { ...(o.bands || {}), Courte: v }) },
    { k: 'moveSquares', label: 'Cases par manœuvre', min: 1, max: 12, get: (r) => r.moveSquares, set: (o, v) => (o.moveSquares = v) }
  ];
  function setRule(f, raw) {
    const v = Math.round(Number(raw));
    if (!Number.isFinite(v)) return;
    const val = Math.min(f.max, Math.max(f.min, v));
    store.commitAll('Règle de la grille modifiée', (d) => {
      const o = { ...(d.campaign.rules.grid || {}) };
      f.set(o, val);
      d.campaign.rules.grid = o;
    });
  }
  const changed = $derived(FIELDS.some((f) => f.get(g) !== f.get(HOUSE.grid)));
  const reset = () => store.commitAll('Règles de la grille : valeurs maison', (d) => { delete d.campaign.rules.grid; });
</script>

<section class="panel">
  <div class="panel-head">
    <h2>Cartes <span class="muted num">{maps.length}</span></h2>
    {#if !editing}<button class="btn primary" onclick={add}><Icon name="plus" size={16} />Nouvelle carte</button>{/if}
  </div>
  {#if editing && maps.some((m) => m.id === editing)}
    <MapEditor id={editing} ondone={() => (editing = null)} />
  {:else}
    {#if maps.length === 0}<p class="muted">Aucune carte. Une carte est facultative : elle suggère portées, couverture et lignes de vue pendant le combat.</p>{/if}
    <ul class="list">
      {#each maps as m (m.id)}
        <li class="mrow">
          <span class="who"><b>{m.name || 'Sans nom'}</b><small class="num">{m.w} × {m.h} cases</small></span>
          <button class="icon-btn" aria-label="Dupliquer {m.name}" title="Dupliquer" onclick={() => dup(m)}><Icon name="copy" /></button>
          <button class="btn small" onclick={() => (editing = m.id)}><Icon name="edit" size={16} />Modifier</button>
        </li>
      {/each}
    </ul>
    <details class="rules">
      <summary>Règles de la grille <span class="badge">règle maison</span></summary>
      <p class="hint">Le livre compte les distances en portées (p.82). Ces valeurs ne servent qu'aux suggestions de la carte.</p>
      <div class="fields">
        {#each FIELDS as f (f.k)}
          <label class="field"><span>{f.label}</span>
            <input class="input num" type="number" min={f.min} max={f.max} value={f.get(g)} onchange={(e) => setRule(f, e.currentTarget.value)} />
            {#if f.get(g) !== f.get(HOUSE.grid)}<small class="muted">valeur maison : {f.get(HOUSE.grid)}</small>{/if}
          </label>
        {/each}
      </div>
      {#if changed}<button class="btn small" onclick={reset}>Revenir aux valeurs maison</button>{/if}
    </details>
  {/if}
</section>

<style>
  .mrow { display: flex; align-items: center; gap: 8px; min-height: 56px; }
  .who { flex: 1; display: grid; min-width: 0; }
  .who b { font-family: var(--display); font-weight: 600; }
  .who small { color: var(--muted); font-size: .82rem; }
  .rules { margin-top: 12px; border-top: 1px solid var(--line); padding-top: 10px; }
  .rules summary { cursor: pointer; font-family: var(--display); font-weight: 600; min-height: 44px; display: flex; align-items: center; gap: 8px; }
  .fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0 12px; margin-top: 10px; }
  .badge { font-family: var(--body); font-size: .7rem; font-weight: 600; padding: 1px 6px; border-radius: 3px; background: var(--hull-2); color: var(--amber); }
</style>
