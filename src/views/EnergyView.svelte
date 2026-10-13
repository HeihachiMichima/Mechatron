<script>
  // Énergie space (T08): the Mechatron-7 day/night clock and the team's energy.
  // One main button walks the day: « Terminer la journée » (daily drain) →
  // « Recharger pour la nuit » (base stations, solar cells) → « Nouveau jour ».
  // Each step is one undoable commit (lib/clock.js does the rules), then the
  // ration, transfers, the collective's DEV levels and, in GM mode, the rules.
  import Icon from '../components/Icon.svelte';
  import Segments from '../components/Segments.svelte';
  import Stepper from '../components/Stepper.svelte';
  import EnergyTransfer from './energy/EnergyTransfer.svelte';
  import EnergyRules from './energy/EnergyRules.svelte';
  import { store } from '../lib/store.svelte.js';
  import { GAME_DATA as D } from '../lib/data.js';
  import { DEV_KEYS, DEV_LABELS, devBand, fmtBonus, epMax, status } from '../lib/rules.js';
  import { endDay, nightCharge, startDay, clockRobots, energyRules } from '../lib/clock.js';

  const clock = $derived(store.campaign.clock);
  const dev = $derived(store.campaign.dev);
  const R = $derived(energyRules(store.campaign));
  const playing = $derived(store.campaign.phase === 'play');
  const night = $derived(clock.phase === 'night');
  // NPCs follow the clock only without the GM pool; they are shown in GM mode.
  const robots = $derived(clockRobots(store.data).filter((c) => c.kind !== 'npc' || store.ui.gm));
  const step = $derived(!night ? 'end' : clock.charged ? 'morning' : 'charge');
  const STEP = {
    end: { label: 'Terminer la journée', sub: (r) => `Chaque robot consomme ${r.dailyDrain} PE` },
    charge: { label: 'Recharger pour la nuit', sub: (r) => `Bornes jusqu'à ${r.ration} PE, soleil dehors` },
    morning: { label: 'Nouveau jour', sub: () => `Passer au jour ${clock.day + 1}` }
  };

  function next() {
    if (step === 'end') store.commitAll(`Fin du jour ${clock.day}`, (d) => endDay(d));
    else if (step === 'charge') store.commitAll(`Nuit du jour ${clock.day} : recharge`, (d) => nightCharge(d));
    else store.commitAll(`Jour ${clock.day + 1}`, (d) => startDay(d));
  }
  const setSky = (on) => store.commitAll(on ? 'Ciel dégagé' : 'Ciel couvert', (d) => (d.campaign.clock.clearSky = on));
  function setExcluded(c, out) {
    store.commitAll(null, (d) => {
      const ex = new Set(d.campaign.clock.exclude);
      out ? ex.add(c.id) : ex.delete(c.id);
      d.campaign.clock.exclude = [...ex];
    });
  }
  const setOnline = (c, on) => store.commitOn(c.id, `${c.name || 'Robot'} : ${on ? 'connecté au collectif' : 'hors ligne (dehors)'}`, (s) => (s.online = on));
  const state = (c) => (c.ep.current === 0 ? (c.kind === 'npc' ? 'vide' : 'en veille') : c.ep.current <= 2 ? 'bas' : 'ok');
  const STATE = { ok: 'OK', bas: 'Bas', 'en veille': 'En veille', vide: 'Vide' };

  // Ration: the band of the Énergie level (p.109).
  const bands = D.devThresholds;
  const band = $derived(devBand(dev.Energie));
  const bandTop = $derived(bands[bands.indexOf(band) - 1]?.min - 1 || 100);
  const linked = (k) => D.programs.filter((p) => p.devBonus === k).map((p) => p.label);
  function setDev(k, raw) {
    const v = Math.max(0, Math.min(D.defaults.devMax, raw));
    store.commitAll(`${DEV_LABELS[k]} : ${v}`, (d) => (d.campaign.dev[k] = v));
  }
  const names = $derived(new Map(store.chars.map((c) => [c.id, c.name || 'Robot sans nom'])));
</script>

<div class="grid">
  <section class="panel clock" class:night>
    <div class="when">
      <span class="icon"><Icon name={night ? 'moon' : 'sun'} size={30} /></span>
      <div>
        <h2 class="num">Jour {clock.day}</h2>
        <span class="phase">{night ? (clock.charged ? 'Nuit, recharge faite' : 'Nuit') : 'Journée'}</span>
      </div>
      <label class="sky"><input type="checkbox" checked={clock.clearSky} onchange={(e) => setSky(e.currentTarget.checked)} /><span>Ciel dégagé</span></label>
    </div>
    {#if playing}
      <button class="btn primary block main" onclick={next}>
        <span><b>{STEP[step].label}</b><small>{STEP[step].sub(R)}</small></span><Icon name="chevron" size={20} />
      </button>
    {:else}
      <p class="callout">L'horloge démarre quand le MJ ouvre la partie (« L'équipe est prête », espace MJ).</p>
    {/if}
  </section>

  <section class="panel team">
    <div class="panel-head"><h2>Équipe</h2><span class="meta">max 10 PE, 12 avec alimentation de secours</span></div>
    {#if robots.length === 0}<p class="muted">Aucun robot à recharger.</p>{/if}
    <ul class="list rows">
      {#each robots as c (c.id)}
        {@const max = epMax(c)}
        {@const st = state(c)}
        {@const out = clock.exclude.includes(c.id)}
        <li>
          <div class="who">
            {#if c.kind !== 'npc'}<span class="cdot" style="background:{c.color}"></span>{:else}<em class="tag">PNJ</em>{/if}
            <b>{c.name || 'Sans nom'}</b>
            <span class="st {st.replace(' ', '-')}">{STATE[st]}</span>
          </div>
          <div class="ep"><span class="num"><b>{c.ep.current}</b>/{max}</span><Segments {max} current={c.ep.current} size="sm" tone="coolant" /></div>
          <div class="opts">
            <label class="chk"><input type="checkbox" checked={c.online} onchange={(e) => setOnline(c, e.currentTarget.checked)} /><span>Connecté</span></label>
            {#if night && !clock.charged}
              <label class="chk"><input type="checkbox" checked={out} onchange={(e) => setExcluded(c, e.currentTarget.checked)} /><span>{c.online ? (c.model === 'scrap' ? 'Pas de borne' : 'Exclu cette nuit') : 'Pas resté inactif'}</span></label>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
    {#if night && !clock.charged && robots.some((c) => c.model === 'scrap' && c.online)}<p class="hint">Les robots de rebut n'ont pas de borne : décochez « Pas de borne » s'ils ont trouvé de l'énergie.</p>{/if}
  </section>

  {#if clock.report}
    <section class="panel report">
      <div class="panel-head"><h2>{clock.report.title}</h2></div>
      <ul class="list">{#each clock.report.lines as l, i (i)}<li><b>{names.get(l.id) || l.name || 'Robot'}</b><span>{l.text}</span></li>{/each}</ul>
      <p class="hint">Aussi noté dans le journal (espace Séance).</p>
    </section>
  {/if}

  <section class="panel">
    <div class="panel-head"><h2>Rationnement</h2>{#if R.ration !== R.bookRation}<span class="tag gm">réglé par le MJ</span>{/if}</div>
    <p class="ration"><b class="num">{R.ration} PE</b> par recharge à la borne</p>
    <p class="hint">Énergie {dev.Energie} (tranche {band.min}-{bandTop}) donne {R.bookRation} PE. Une borne recharge jusqu'à ce niveau, jamais au-delà, et un robot qui en a déjà plus ne se recharge pas. Dehors, chaque robot gagne {R.outsideSolarEp} PE par jour au soleil.</p>
  </section>

  <EnergyTransfer />

  <section class="panel wide">
    <div class="panel-head"><h2>Niveaux de développement</h2></div>
    <p class="hint top">Partagés par tous vos robots. Tous commencent à 50 et baissent de 1D6 à chaque fin de séance (espace Séance). Les ordres de travail les remontent.</p>
    <div class="devs">
      {#each DEV_KEYS as k (k)}
        {@const b = devBand(dev[k])}
        <div class="dev">
          <h3>{DEV_LABELS[k]}</h3>
          <div class="dev-val">
            <input class="input num" type="number" min="0" max="100" value={dev[k]} aria-label="Niveau {DEV_LABELS[k]}" onchange={(e) => setDev(k, parseInt(e.currentTarget.value) || 0)} />
            <Stepper value={dev[k]} min={0} max={100} label={DEV_LABELS[k]} onchange={(v) => setDev(k, v)} size="sm" />
          </div>
          <div class="bar" aria-hidden="true"><span style="width:{dev[k]}%"></span></div>
          <p class="effect">
            {#if k === 'Energie'}<b class="num">{b.energyEp} PE</b> de rationnement
            {:else}<b class="num" class:neg={b.bonus < 0}>{fmtBonus(b.bonus)}</b> à {linked(k).join(' et ')}{/if}
          </p>
        </div>
      {/each}
    </div>
  </section>

  {#if store.ui.gm}<EnergyRules />{/if}
</div>

<style>
  .grid { display: grid; gap: 12px; }
  .grid > .panel + .panel, .grid > :global(.panel + .panel) { margin-top: 0; }
  @media (min-width: 1100px) { .grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; } .wide { grid-column: 1 / -1; } }
  .clock { box-shadow: inset 0 0 0 1px var(--line), inset 3px 0 0 var(--coolant); }
  .when { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .when > div { flex: 1; display: grid; }
  .icon { width: 52px; height: 52px; display: grid; place-items: center; border-radius: 50%; background: var(--abyss); color: var(--amber); flex: none; }
  .night .icon { color: var(--coolant); }
  h2.num { font-size: 1.7rem; line-height: 1.05; }
  .phase { color: var(--muted); }
  .sky { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; cursor: pointer; font-size: .9rem; }
  .sky input, .chk input { width: 20px; height: 20px; accent-color: var(--coolant); }
  .main { min-height: 60px; justify-content: space-between; text-align: left; padding: 8px 16px; }
  .main span { display: grid; }
  .main b { font-size: 1.1rem; }
  .main small { font-weight: 500; }
  .callout { margin: 0; padding: 10px 12px; border-left: 3px solid var(--line); background: var(--abyss); }
  .rows li { display: grid; gap: 6px; padding: 10px 0; }
  @media (min-width: 640px) { .rows li { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto; align-items: center; gap: 12px; } }
  .who { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .who b { font-family: var(--display); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cdot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
  .tag { font-style: normal; font-size: .7rem; font-weight: 600; padding: 1px 6px; border-radius: 3px; background: var(--hull-2); color: var(--muted); }
  .tag.gm { color: var(--text); }
  .st { margin-left: auto; font-size: .78rem; font-weight: 600; padding: 1px 8px; border-radius: 10px; border: 1px solid var(--line); color: var(--muted); flex: none; }
  .st.bas { color: var(--text); border-color: var(--coolant); }
  .st.en-veille, .st.vide { color: var(--abyss); background: var(--muted); border-color: var(--muted); }
  .ep { display: grid; gap: 4px; }
  .ep span { font-size: .9rem; color: var(--muted); }
  .ep b { font-size: 1.15rem; color: var(--coolant); }
  .opts { display: flex; flex-wrap: wrap; gap: 4px 14px; }
  .chk { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; cursor: pointer; font-size: .9rem; }
  .report li { display: grid; padding: 8px 0; }
  .report li span { color: var(--muted); font-size: .92rem; }
  .ration { margin: 0 0 4px; }
  .ration b { font-size: 1.5rem; color: var(--coolant); }
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
</style>
