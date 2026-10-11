<script>
  // Logo, then whose fiche is on screen (or the campaign in the other spaces),
  // the campaign menu and, on a fiche, the robot's exports.
  import Icon from './Icon.svelte';
  import { store } from '../lib/store.svelte.js';
  import { modelOf, hierarchy } from '../lib/rules.js';
  import { GAME_DATA as D } from '../lib/data.js';
  import logo from '../assets/logo.png';
  const c = $derived(store.fiche);
  const m = $derived(c && modelOf(c));
  const tpl = $derived(c?.template ? D.npcTemplates.find((t) => t.id === c.template) : null);
  const SPACE = { equipe: "L'équipe", energie: 'Énergie et collectif', marche: 'Marché noir', combat: 'Combat', seance: 'Fin de séance', mj: 'Outils du MJ' };
  const pcs = $derived(store.chars.filter((x) => x.kind !== 'npc').length);
  // On a PC's fiche: « Gérer l'équipe »; on an NPC's: back to the NPC list; elsewhere: the campaign menu.
  function tap() {
    if (c && store.space === 'combat') store.go('combat');
    else if (c?.kind === 'npc') store.ui.npc = null;
    else if (c || store.space === 'equipe') store.open({ type: 'roster' });
    else store.open({ type: 'campaign' });
  }
</script>

<div class="bar">
  <img class="logo" src={logo} alt="Mutant : Année Zéro" width="624" height="236" />
  {#if c}
    <button class="who" onclick={tap} aria-label={`${c.name || 'Robot sans nom'} : ${store.space === 'combat' ? 'retour au combat' : c.kind === 'npc' ? 'retour à la liste des PNJ' : `gérer l'équipe (${pcs})`}`}>
      <span class="name"><span class="nm">{c.name || 'Robot sans nom'}</span>{#if c.kind !== 'npc'}<span class="count num"><Icon name="users" size={14} />{pcs}</span>{/if}</span>
      <span class="sub">{c.kind === 'npc' ? 'PNJ, ' : ''}{tpl ? tpl.name : m ? m.name : 'Modèle à choisir'}{#if m}, hiér. {hierarchy(c)}{/if}</span>
    </button>
  {:else}
    <button class="who" onclick={tap} aria-label={store.space === 'equipe' ? "Gérer l'équipe" : `Campagne ${store.campaign.name || 'sans nom'}`}>
      <span class="name"><span class="nm">{store.campaign.name || 'Campagne sans nom'}</span></span>
      <span class="sub">{SPACE[store.space]}{store.campaign.phase === 'creation' ? ', création de l\'équipe' : ''}</span>
    </button>
  {/if}
  <button class="icon-btn" aria-label="Menu de la campagne" title="Campagne, mode MJ, sauvegardes, thème" onclick={() => store.open({ type: 'campaign' })}><Icon name="menu" /></button>
  {#if c}<button class="btn small export" onclick={() => store.open({ type: 'export' })}><Icon name="share" size={18} /><span>Exporter</span></button>{/if}
</div>

<style>
  .bar { display: flex; align-items: center; gap: 6px; padding: 8px 10px 6px 12px; padding-top: max(8px, env(safe-area-inset-top)); background: var(--hull); }
  .logo { height: 26px; width: auto; flex: none; display: block; margin-right: 2px; }
  .who { flex: 1; min-width: 0; display: grid; text-align: left; background: none; border: 0; padding: 2px 4px; min-height: 44px; }
  .name { font-family: var(--display); font-weight: 700; font-size: 1.15rem; line-height: 1.15; display: flex; align-items: center; gap: 8px; min-width: 0; }
  .nm { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .count { display: inline-flex; align-items: center; gap: 3px; font-size: .75rem; font-weight: 600; color: var(--muted); padding: 1px 6px; border: 1px solid var(--line); border-radius: 10px; flex: none; }
  .sub { font-size: .8rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  @media (max-width: 380px) { .export span { display: none; } .export { padding: 0 10px; } }
  @media (max-width: 340px) { .logo { height: 22px; } }
  @media (min-width: 720px) { .bar { padding: 10px 20px 8px; } .name { font-size: 1.35rem; } .logo { height: 42px; } }
</style>
