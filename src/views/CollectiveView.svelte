<script>
  import Stepper from '../components/Stepper.svelte';
  import { store } from '../lib/store.svelte.js';
  import { GAME_DATA as D } from '../lib/data.js';
  import { DEV_KEYS, DEV_LABELS, devBand, fmtBonus } from '../lib/rules.js';
  import { d6 } from '../lib/rng.js';

  const c = $derived(store.c);
  const linked = (k) => D.programs.filter((p) => p.devBonus === k).map((p) => p.label);
  function decay() {
    const rolls = DEV_KEYS.map(() => d6());
    store.commitAll(`Usure : ${DEV_KEYS.map((k, i) => `${DEV_LABELS[k]} −${rolls[i]}`).join(', ')}`, (d) => { const base = { ...store.c.dev }; d.chars.forEach((s) => DEV_KEYS.forEach((k, i) => (s.dev[k] = Math.max(0, base[k] - rolls[i])))); });
  }
  // The collective is shared: every robot on the table sees the same levels.
  const setDev = (k, v) => store.commitAll(`${DEV_LABELS[k]} : ${v}`, (d) => d.chars.forEach((s) => (s.dev[k] = Math.max(0, Math.min(100, v)))));
</script>

<div class="grid">
  <section class="panel wide">
    <div class="panel-head">
      <h2>Niveaux de développement</h2>
      <label class="toggle">
        <input type="checkbox" checked={c.online} onchange={(e) => store.commit(e.currentTarget.checked ? 'Connecté au collectif' : 'Hors ligne : bonus désactivés', (s) => (s.online = e.currentTarget.checked))} />
        <span>Connecté au collectif</span>
      </label>
    </div>
    <p class="hint top">Partagés par tous vos robots. Tous commencent à 50 et baissent de 1D6 après chaque séance ; les ordres de travail les remontent. Hors ligne, les programmes ne reçoivent plus de bonus.</p>
    <button class="btn small decay" onclick={decay}>Fin de séance : −1D6 à chaque niveau</button>
    <div class="devs">
      {#each DEV_KEYS as k (k)}
        {@const band = devBand(c.dev[k])}
        <div class="dev">
          <h3>{DEV_LABELS[k]}</h3>
          <div class="dev-val">
            <input class="input num" type="number" min="0" max="100" value={c.dev[k]} aria-label="Niveau {DEV_LABELS[k]}"
              onchange={(e) => setDev(k, parseInt(e.currentTarget.value) || 0)} />
            <Stepper value={c.dev[k]} min={0} max={100} label={DEV_LABELS[k]} onchange={(v) => setDev(k, v)} size="sm" />
          </div>
          <div class="bar" aria-hidden="true"><span style="width:{c.dev[k]}%"></span></div>
          <p class="effect">
            {#if k === 'Energie'}<b class="num">{band.energyEp} PE</b> de recharge par jour
            {:else}<b class="num" class:neg={band.bonus < 0}>{fmtBonus(band.bonus)}</b> à {linked(k).join(' et ')}{/if}
          </p>
        </div>
      {/each}
    </div>
  </section>

  <section class="panel wide">
    <div class="panel-head"><h2>Notes et journal</h2></div>
    <textarea class="input" bind:value={store.c.notes} placeholder="Ordres de travail, PNJ rencontrés, secrets de la Fraternité, indices sur les humains…" aria-label="Notes"></textarea>
  </section>
</div>

<style>
  .grid { display: grid; gap: 12px; }
  .grid > .panel + .panel { margin-top: 0; }
  .top { margin: -4px 0 12px; max-width: 70ch; }
  .decay { margin: -2px 0 14px; }
  .toggle { display: inline-flex; align-items: center; gap: 8px; font-size: .9rem; min-height: 44px; cursor: pointer; }
  .toggle input { width: 20px; height: 20px; accent-color: var(--amber); }
  .devs { display: grid; gap: 16px; }
  @media (min-width: 640px) { .devs { grid-template-columns: 1fr 1fr; } }
  @media (min-width: 1100px) { .devs { grid-template-columns: repeat(4, 1fr); } }
  .top { max-width: none; }
  .dev h3 { font-size: 1rem; margin-bottom: 6px; }
  .dev-val { display: flex; gap: 8px; }
  .dev-val .input { width: 5.5em; font-size: 1.2rem; font-weight: 600; text-align: center; }
  .bar { height: 4px; background: var(--line); margin: 10px 0 6px; }
  .bar span { display: block; height: 100%; background: var(--amber); }
  .effect { margin: 0; font-size: .9rem; color: var(--muted); }
  .effect b { color: var(--text); font-size: 1.05rem; }
  .effect b.neg { color: var(--fault); }
</style>
