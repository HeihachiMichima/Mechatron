<script>
  // Énergie space: the collective's development levels (shared by every robot)
  // and which robots are connected to it. T08 adds the day/night clock here.
  import Stepper from '../components/Stepper.svelte';
  import { store } from '../lib/store.svelte.js';
  import { GAME_DATA as D } from '../lib/data.js';
  import { DEV_KEYS, DEV_LABELS, devBand, fmtBonus } from '../lib/rules.js';

  // The collective's levels are stored once, in the campaign: every robot shares them.
  const dev = $derived(store.campaign.dev);
  const linked = (k) => D.programs.filter((p) => p.devBonus === k).map((p) => p.label);
  function setDev(k, raw) {
    const v = Math.max(0, Math.min(D.defaults.devMax, raw));
    store.commitAll(`${DEV_LABELS[k]} : ${v}`, (d) => (d.campaign.dev[k] = v));
  }
  // Creatures have no link to the collective. NPCs are listed in GM mode only.
  const robots = $derived(store.chars.filter((c) => c.body !== 'creature' && (c.kind !== 'npc' || store.ui.gm)));
  const setOnline = (c, on) => store.commitOn(c.id, `${c.name || 'Robot'} : ${on ? 'connecté au collectif' : 'hors ligne, bonus désactivés'}`, (s) => (s.online = on));
</script>

<div class="grid">
  <section class="panel">
    <div class="panel-head"><h2>Niveaux de développement</h2></div>
    <p class="hint top">Partagés par tous vos robots. Tous commencent à 50 et baissent de 1D6 à chaque fin de séance (espace Séance). Les ordres de travail les remontent.</p>
    <div class="devs">
      {#each DEV_KEYS as k (k)}
        {@const band = devBand(dev[k])}
        <div class="dev">
          <h3>{DEV_LABELS[k]}</h3>
          <div class="dev-val">
            <input class="input num" type="number" min="0" max="100" value={dev[k]} aria-label="Niveau {DEV_LABELS[k]}"
              onchange={(e) => setDev(k, parseInt(e.currentTarget.value) || 0)} />
            <Stepper value={dev[k]} min={0} max={100} label={DEV_LABELS[k]} onchange={(v) => setDev(k, v)} size="sm" />
          </div>
          <div class="bar" aria-hidden="true"><span style="width:{dev[k]}%"></span></div>
          <p class="effect">
            {#if k === 'Energie'}<b class="num">{band.energyEp} PE</b> de recharge par jour
            {:else}<b class="num" class:neg={band.bonus < 0}>{fmtBonus(band.bonus)}</b> à {linked(k).join(' et ')}{/if}
          </p>
        </div>
      {/each}
    </div>
  </section>

  {#if robots.length}
  <section class="panel">
    <div class="panel-head"><h2>Connexion au collectif</h2></div>
    <p class="hint top">Hors ligne, un robot ne reçoit plus les bonus des niveaux et ne se recharge qu'au soleil.</p>
    <ul class="list links">
      {#each robots as c (c.id)}
        <li>
          <label class="toggle">
            <span class="who">{#if c.kind !== 'npc'}<span class="cdot" style="background:{c.color}"></span>{:else}<em class="tag">PNJ</em>{/if}{c.name || 'Sans nom'}</span>
            <input type="checkbox" checked={c.online} onchange={(e) => setOnline(c, e.currentTarget.checked)} />
            <span class="state" class:off={!c.online}>{c.online ? 'Connecté' : 'Hors ligne'}</span>
          </label>
        </li>
      {/each}
    </ul>
  </section>
  {/if}
</div>

<style>
  .grid { display: grid; gap: 12px; }
  .grid > .panel + .panel { margin-top: 0; }
  @media (min-width: 1100px) { .grid { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); align-items: start; } }
  .top { margin: -4px 0 12px; }
  .devs { display: grid; gap: 16px; }
  @media (min-width: 640px) { .devs { grid-template-columns: 1fr 1fr; } }
  .dev h3 { font-size: 1rem; margin-bottom: 6px; }
  .dev-val { display: flex; gap: 8px; }
  .dev-val .input { width: 5.5em; font-size: 1.2rem; font-weight: 600; text-align: center; }
  .bar { height: 4px; background: var(--line); margin: 10px 0 6px; }
  .bar span { display: block; height: 100%; background: var(--amber); }
  .effect { margin: 0; font-size: .9rem; color: var(--muted); }
  .effect b { color: var(--text); font-size: 1.05rem; }
  .effect b.neg { color: var(--fault); }
  .toggle { display: flex; align-items: center; gap: 10px; min-height: 48px; cursor: pointer; }
  .toggle input { width: 20px; height: 20px; accent-color: var(--coolant); flex: none; }
  .who { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; font-family: var(--display); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cdot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
  .tag { font-style: normal; font-family: var(--body); font-size: .7rem; font-weight: 600; padding: 1px 5px; border-radius: 3px; background: var(--hull-2); color: var(--muted); }
  .state { width: 6.5em; font-size: .85rem; color: var(--coolant); }
  .state.off { color: var(--muted); }
</style>
