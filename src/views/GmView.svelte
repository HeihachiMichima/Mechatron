<script>
  // MJ space (GM mode only): the NPC roster, then the GM's editors as they arrive
  // (market T09, rules T11, encounters T15). An NPC's fiche opens in this space.
  import Icon from '../components/Icon.svelte';
  import RobotList from '../components/RobotList.svelte';
  import ResetAllButton from '../components/ResetAllButton.svelte';
  import MarketEditor from './gm/MarketEditor.svelte';
  import { store } from '../lib/store.svelte.js';
  import { stepErrors, draftFrom, startWizard } from '../lib/creation.js';

  const npcs = $derived(store.chars.filter((c) => c.kind === 'npc'));
  const pcs = $derived(store.chars.filter((c) => c.kind !== 'npc'));
  const creating = $derived(store.campaign.phase === 'creation');
  // What is still missing on each PC, by the creation rules (taken parts included).
  const issues = (c) => stepErrors('recap', draftFrom(c), { chars: store.chars, id: c.id, gm: false });
  const unready = $derived(pcs.filter((c) => issues(c).length));
  let reopen = $state(false);
  const soon = [
    { icon: 'edit', title: 'Règles maison', text: 'Les valeurs que le livre ne donne pas, et les PX de fin de séance.' },
    { icon: 'combat', title: 'Rencontres', text: 'Des combats préparés à lancer en un geste.' }
  ];
</script>

<div class="grid">
  <section class="panel gate" class:open={!creating}>
    <div class="panel-head"><h2>{creating ? "Création de l'équipe" : 'Partie en cours'}</h2></div>
    {#if creating}
      <p class="hint top">Les joueurs créent leurs robots avec l'assistant. Quand tout le monde est prêt, ouvrez la partie : le marché noir ouvre.</p>
      {#if pcs.length === 0}<p class="muted">Aucun robot joueur pour l'instant.</p>{/if}
      <ul class="list ready">
        {#each pcs as c (c.id)}
          {@const miss = issues(c)}
          <li>
            <span class="cdot" style="background:{c.color}"></span>
            <span class="who"><b>{c.name || 'Sans nom'}</b><small>{miss.length ? miss[0] + (miss.length > 1 ? ` (et ${miss.length - 1} autre${miss.length > 2 ? 's' : ''})` : '') : 'Prêt'}</small></span>
            {#if miss.length}<button class="btn small" onclick={() => startWizard(c.id)}>Compléter</button>{/if}
          </li>
        {/each}
      </ul>
      <button class="btn primary block go" disabled={pcs.length === 0} onclick={() => store.setPhase('play')}>L'équipe est prête</button>
      {#if unready.length && pcs.length}<p class="hint">{unready.length > 1 ? `${unready.length} robots ne sont pas finis` : `${unready[0].name || 'Un robot'} n'est pas fini`} : vous pouvez ouvrir la partie quand même.</p>{/if}
    {:else}
      <p class="hint top">Le marché noir est ouvert. Un nouveau robot se crée toujours avec l'assistant.</p>
      <button class="btn small ghost" class:armed={reopen} onclick={() => { if (!reopen) { reopen = true; setTimeout(() => (reopen = false), 3500); return; } reopen = false; store.setPhase('creation'); }}>{reopen ? 'Toucher encore pour rouvrir la création' : 'Rouvrir la création'}</button>
    {/if}
  </section>

  <section class="panel">
    <div class="panel-head">
      <h2>PNJ du MJ <span class="muted num">{npcs.length}</span></h2>
      <button class="btn primary" onclick={() => store.open({ type: 'templates', mode: 'roster' })}><Icon name="plus" size={16} />Nouveau PNJ</button>
    </div>
    <RobotList list={npcs} onpick={(id) => store.openFiche(id)} empty="Aucun PNJ. Créez-en un depuis les modèles du livre, ou ajoutez des adversaires en préparant un combat." />
    {#if npcs.length}<div class="reset-row"><ResetAllButton small kind="npc" /></div>{/if}
  </section>

  <MarketEditor />

  <section class="panel">
    <div class="panel-head"><h2>Outils à venir</h2></div>
    <ul class="list soon">
      {#each soon as s (s.title)}
        <li><Icon name={s.icon} /><span><b>{s.title}</b><small>{s.text}</small></span></li>
      {/each}
    </ul>
    <p class="hint">Le mode MJ cache ces outils aux joueurs ; il ne change rien au combat. Il se règle dans le menu ☰, pour cet appareil seulement.</p>
  </section>
</div>

<style>
  .grid { display: grid; gap: 12px; }
  .grid > .panel + .panel { margin-top: 0; }
  @media (min-width: 1100px) { .grid { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); align-items: start; } }
  .panel-head { align-items: center; }
  .reset-row { display: flex; justify-content: flex-end; margin-top: 12px; }
  .gate { border-left: 3px solid var(--amber); }
  .gate.open { border-left-color: var(--line); }
  .top { margin: -4px 0 10px; }
  .ready li { display: flex; align-items: center; gap: 10px; min-height: 52px; }
  .ready .who { flex: 1; min-width: 0; display: grid; }
  .ready small { font-size: .82rem; color: var(--muted); }
  .cdot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
  .go { margin-top: 12px; min-height: 52px; }
  .armed { color: var(--amber); border-color: var(--amber); }
  @media (min-width: 1100px) { .gate { grid-column: 1 / -1; } }
  .soon li { display: flex; gap: 14px; align-items: center; padding: 10px 0; color: var(--muted); }
  .soon li > :global(svg) { flex: none; }
  .soon span { display: grid; }
  .soon b { font-family: var(--display); font-weight: 600; color: var(--text); }
  .soon small { font-size: .85rem; }
</style>
