<script>
  // GM mode: the energy rules the clock uses, each with the book's value and a
  // reset. Stored in campaign.rules.energy (lib/clock.js energyRules).
  import Stepper from '../../components/Stepper.svelte';
  import { store } from '../../lib/store.svelte.js';
  import { energyRules } from '../../lib/clock.js';

  const R = $derived(energyRules(store.campaign));
  const ov = $derived(store.campaign.rules.energy || {});
  const rows = [
    { key: 'dailyDrain', label: 'Consommation quotidienne', unit: 'PE par soir', book: 'dailyDrain', max: 5 },
    { key: 'outsideSolarEp', label: 'Soleil, dehors', unit: 'PE par jour', book: 'outsideSolarEp', max: 6 },
    { key: 'overrideRation', label: 'Rationnement', unit: 'PE à la borne', book: 'ration', max: 12 }
  ];
  const value = (r) => (r.key === 'overrideRation' ? R.ration : R[r.key]);
  function set(r, v) {
    store.commitAll(`${r.label} : ${v} (MJ)`, (d) => {
      d.campaign.rules.energy = { ...(d.campaign.rules.energy || {}), [r.key]: v };
    });
  }
  function reset(r) {
    store.commitAll(`${r.label} : valeur du livre`, (d) => {
      const e = { ...(d.campaign.rules.energy || {}) };
      delete e[r.key];
      if (Object.keys(e).length) d.campaign.rules.energy = e;
      else delete d.campaign.rules.energy;
    });
  }
</script>

<details class="panel rules">
  <summary><h2>Règles de l'énergie</h2><span class="meta">mode MJ</span></summary>
  <ul class="list">
    {#each rows as r (r.key)}
      {@const set_ = ov[r.key] != null && ov[r.key] !== ''}
      <li>
        <div class="lbl"><b>{r.label}</b><small>{r.unit} ; valeur du livre : {R.book[r.book]}{r.key === 'overrideRation' ? ` (Énergie ${store.campaign.dev.Energie})` : ''}</small></div>
        <Stepper value={value(r)} min={0} max={r.max} label={r.label} onchange={(v) => set(r, v)} size="sm" />
        <button class="btn small ghost" disabled={!set_} onclick={() => reset(r)}>Réinitialiser</button>
      </li>
    {/each}
  </ul>
  <p class="hint">Ces réglages valent pour toute la campagne et partent avec elle à l'export.</p>
</details>

<style>
  .rules { grid-column: 1 / -1; }
  summary { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; cursor: pointer; min-height: 44px; align-items: center; }
  summary h2 { font-size: 1.12rem; }
  .meta { font-size: .85rem; color: var(--muted); }
  li { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 0; }
  .lbl { flex: 1; min-width: 12em; display: grid; }
  .lbl small { font-size: .82rem; color: var(--muted); }
</style>
