<script>
  // MJ space (GM mode only): the NPC roster, then the GM's editors as they arrive
  // (market T09, rules T11, encounters T15). An NPC's fiche opens in this space.
  import Icon from '../components/Icon.svelte';
  import RobotList from '../components/RobotList.svelte';
  import ResetAllButton from '../components/ResetAllButton.svelte';
  import { store } from '../lib/store.svelte.js';

  const npcs = $derived(store.chars.filter((c) => c.kind === 'npc'));
  const soon = [
    { icon: 'marche', title: 'Marché noir', text: 'Prix, rareté et stock des marchandises.' },
    { icon: 'edit', title: 'Règles maison', text: 'Les valeurs que le livre ne donne pas, et les PX de fin de séance.' },
    { icon: 'combat', title: 'Rencontres', text: 'Des combats préparés à lancer en un geste.' }
  ];
</script>

<div class="grid">
  <section class="panel">
    <div class="panel-head">
      <h2>PNJ du MJ <span class="muted num">{npcs.length}</span></h2>
      <button class="btn small primary" onclick={() => store.open({ type: 'templates', mode: 'roster' })}><Icon name="plus" size={16} />Nouveau PNJ</button>
    </div>
    <RobotList list={npcs} onpick={(id) => store.openFiche(id)} empty="Aucun PNJ. Créez-en un depuis les modèles du livre, ou ajoutez des adversaires en préparant un combat." />
    {#if npcs.length}<div class="reset-row"><ResetAllButton small /></div>{/if}
  </section>

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
  .soon li { display: flex; gap: 14px; align-items: center; padding: 10px 0; color: var(--muted); }
  .soon li > :global(svg) { flex: none; }
  .soon span { display: grid; }
  .soon b { font-family: var(--display); font-weight: 600; color: var(--text); }
  .soon small { font-size: .85rem; }
</style>
