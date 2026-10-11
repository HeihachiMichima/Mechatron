<script>
  // Print-only A4 layout. Hidden on screen; App hides the interactive UI when printing.
  import { store } from '../lib/store.svelte.js';
  import logo from '../assets/logo.png'; // inlined into the single-file build as a data URI
  import { GAME_DATA as D } from '../lib/data.js';
  import { attrLabels, ATTRS, DEV_KEYS, DEV_LABELS, chassis, attrCurrent, armorTotal, armorCurrent, epMax, modelOf, hierarchy, programs, findModule, findSecondary, devBand, fmtBonus } from '../lib/rules.js';
  import { getRules, getDev } from '../lib/settings.js';
  import { xpRules } from '../lib/xp.js';
  const c = $derived(store.c);
  const ch = $derived(c && chassis(c));
  const m = $derived(c && modelOf(c));
  const progs = $derived(c ? programs(c) : []);
  const dev = $derived(getDev());
  const R = $derived(getRules());
  const boxes = (n) => Array.from({ length: Math.max(0, n) }, (_, i) => i);
</script>

{#if c}
<article class="print" aria-hidden="true">
  <header>
    <div>
      <h1>{c.name || 'Robot sans nom'}</h1>
      <p>{m ? m.name : 'Modèle non choisi'}{m ? `, hiérarchie ${hierarchy(c)}` : ''}{c.player ? `. Joueur : ${c.player}` : ''}</p>
    </div>
    {#if logo}<img class="logo" src={logo} alt="" />
    {:else}<div class="brand">Mechatron<br /><small>Mutant : Année Zéro</small></div>{/if}
  </header>

  <div class="cols">
    <div>
      <section>
        <h2>Châssis</h2>
        <table>
          <thead><tr><th></th><th>Pièce</th>{#each ATTRS as a (a)}<th>{D.attributeLabels[a].short}</th>{/each}<th>Empl.</th><th>Arm.</th></tr></thead>
          <tbody>
            {#each [['Tête', c.head, 0], ['Torse', c.torso, 1], ['Support', c.undercarriage, 2]] as [l, n, i] (l)}
              <tr><td>{l}</td><td>{n || '—'}</td>{#each ATTRS as a (a)}<td class="n">{ch.parts[i]?.[a] ?? ''}</td>{/each}<td class="n">{ch.parts[i]?.slots ?? ''}</td><td class="n">{ch.parts[i]?.armor ?? ''}</td></tr>
            {/each}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Attributs</h2>
        {#each ATTRS as a (a)}
          <div class="track"><span>{attrLabels(c)[a].label} <b>{attrCurrent(c, ch, a)}/{ch.attrMax[a]}</b></span><span class="boxes">{#each boxes(ch.attrMax[a]) as i (i)}<i class:on={i < attrCurrent(c, ch, a)}></i>{/each}</span></div>
        {/each}
        <div class="track"><span>Armure <b>{armorCurrent(c, ch)}/{armorTotal(c, ch)}</b></span><span class="boxes">{#each boxes(armorTotal(c, ch)) as i (i)}<i class:on={i < armorCurrent(c, ch)}></i>{/each}</span></div>
        <div class="track"><span>Énergie <b>{c.ep.current}/{epMax(c)} PE</b></span><span class="boxes">{#each boxes(epMax(c)) as i (i)}<i class:on={i < c.ep.current}></i>{/each}</span></div>
        <p class="small">Expérience : <b>{c.xp.current} PX</b>. Couverture actuelle : {c.cover || 'aucune'}.</p>
      </section>

      <section>
        <h2>Programmes</h2>
        <table>
          <thead><tr><th>Programme</th><th>Attribut</th><th>Niv.</th><th>Collectif</th></tr></thead>
          <tbody>
            {#each progs as p (p.id)}
              <tr><td>{p.label}{p.special ? ' (spécialiste)' : ''}</td><td>{p.attr ? attrLabels(c)[p.attr].label : '—'}</td><td class="n"><b>{p.rating}</b></td><td class="n">{p.devBonus ? fmtBonus(devBand(dev[p.devBonus]).bonus) : ''}</td></tr>
            {/each}
          </tbody>
        </table>
      </section>
    </div>

    <div>
      <section>
        <h2>Modules ({c.modules.filter(Boolean).length}/{ch.slots})</h2>
        {#each c.modules.filter(Boolean) as name, i (i)}
          {@const mo = findModule(name)}
          <p class="item"><b>{name}</b>{mo?.cost ? ` (${mo.cost})` : ''}{mo?.effect ? ` : ${mo.effect}` : ''}</p>
        {:else}<p class="small">Aucun.</p>{/each}
      </section>
      <section>
        <h2>Fonctions secondaires</h2>
        {#each c.secondary as name, i (i)}
          <p class="item"><b>{name}</b>{findSecondary(name) ? ` : ${findSecondary(name).desc}` : ''}</p>
        {:else}<p class="small">Aucune.</p>{/each}
      </section>
      <section>
        <h2>Armes</h2>
        <table>
          <thead><tr><th>Arme</th><th>Bonus</th><th>Dégâts</th><th>Portée</th></tr></thead>
          <tbody>
            {#each c.weapons as w, i (i)}<tr><td>{w.name}</td><td class="n">{w.bonus !== '' ? `+${w.bonus}` : ''}</td><td class="n">{w.degats}</td><td>{w.portee}</td></tr>{/each}
            {#each boxes(Math.max(0, 3 - c.weapons.length)) as i (i)}<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>{/each}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Équipement</h2>
        <p class="small">{c.equipment.map((e) => e.name + (e.integre ? ' (intégré)' : '')).join(', ') || '—'}</p>
      </section>
      <section>
        <h2>Relations</h2>
        <p class="small">Binôme : {c.buddy || '—'}<br />Je déteste : {c.hate || '—'}<br />Je dois protéger : {c.protect || '—'}<br />Mon grand rêve : {c.dream || '—'}</p>
      </section>
      <section>
        <h2>Collectif {c.online ? '' : '(hors ligne)'}</h2>
        <p class="small">{#each DEV_KEYS as k, i (k)}{DEV_LABELS[k]} {dev[k]}{i < 3 ? ', ' : '.'}{/each}</p>
      </section>
      <section class="rules">
        <p><b>Forcer un jet :</b> relancez tous les dés sauf les 6{R.pushKeepsOnes ? ' (et les 1 des dés de base et d\'équipement)' : ''}. Chaque 1 sur un dé de base : 1 PE ou 1 dégât à l'attribut. Chaque 1 sur un dé d'équipement : bonus −1.</p>
        <p><b>{xpRules(store.campaign).costs.program} PX :</b> un programme +1 (max {R.programMax}) ; <b>{xpRules(store.campaign).costs.secondary} PX :</b> une nouvelle fonction secondaire.</p>
      </section>
    </div>
  </div>
  {#if c.notes}<section class="notes"><h2>Notes</h2><p>{c.notes}</p></section>{/if}
</article>
{/if}

<style>
  .print { display: none; }
  @media print {
    .print { -webkit-print-color-adjust: exact; print-color-adjust: exact; display: block; color: #111; background: #fff; font: 9.5pt/1.35 var(--body); }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2pt solid #111; padding-bottom: 6pt; margin-bottom: 8pt; }
    h1 { font-size: 22pt; line-height: 1.05; }
    header p { margin: 2pt 0 0; }
    .brand { font-family: var(--display); font-weight: 700; font-size: 14pt; text-align: right; line-height: 1.1; }
    .logo { height: 46pt; width: auto; }
    .brand small { font-weight: 500; font-size: 8pt; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14pt; }
    section { margin-bottom: 9pt; break-inside: avoid; }
    h2 { font-size: 11pt; border-bottom: .75pt solid #888; margin-bottom: 4pt; padding-bottom: 1pt; }
    table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    th { text-align: left; font-weight: 600; border-bottom: .75pt solid #888; padding: 1pt 3pt; }
    td { border-bottom: .5pt solid #ccc; padding: 1.5pt 3pt; }
    .n { text-align: center; }
    .track { display: flex; justify-content: space-between; align-items: center; padding: 2pt 0; border-bottom: .5pt solid #ddd; }
    .boxes { display: flex; gap: 2pt; }
    .boxes i { width: 9pt; height: 9pt; border: .75pt solid #111; display: block; }
    .boxes i.on { background: #111; }
    .small, .item { margin: 0 0 3pt; font-size: 8.5pt; }
    .rules { font-size: 8pt; border: .75pt solid #888; padding: 4pt 6pt; }
    .rules p { margin: 0 0 3pt; }
    .notes p { white-space: pre-wrap; font-size: 8.5pt; margin: 0; }
  }
</style>
