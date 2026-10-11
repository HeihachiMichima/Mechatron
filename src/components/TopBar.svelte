<script>
  import Icon from './Icon.svelte';
  import { store } from '../lib/store.svelte.js';
  import { modelOf, hierarchy } from '../lib/rules.js';
  import { GAME_DATA as D } from '../lib/data.js';
  import logo from '../assets/logo.png';
  const c = $derived(store.c);
  const m = $derived(c && modelOf(c));
  const tpl = $derived(c?.template ? D.npcTemplates.find((t) => t.id === c.template) : null);
</script>

<div class="bar">
  <img class="logo" src={logo} alt="Mutant : Année Zéro" width="624" height="236" />
  <button class="who" onclick={() => store.open({ type: 'roster' })} aria-label="Changer de robot ({store.chars.length})">
    <span class="name"><span class="nm">{c ? c.name || 'Robot sans nom' : 'Aucun robot'}</span><span class="count num"><Icon name="users" size={14} />{store.chars.length}</span></span>
    <span class="sub">{#if c}{c.kind === 'npc' ? 'PNJ, ' : ''}{tpl ? tpl.name : m ? m.name : 'Modèle à choisir'}{#if m}, hiér. {hierarchy(c)}{/if}{:else}Créez votre premier robot{/if}</span>
  </button>
  <button class="icon-btn" aria-label="Menu de la campagne" title="Campagne, sauvegardes, thème" onclick={() => store.open({ type: 'campaign' })}><Icon name="menu" /></button>
  <button class="btn small export" onclick={() => store.open({ type: 'export' })}><Icon name="share" size={18} /><span>Exporter</span></button>
</div>

<style>
  .bar { display: flex; align-items: center; gap: 6px; padding: 8px 10px 6px 12px; padding-top: max(8px, env(safe-area-inset-top)); background: var(--hull); }
  .logo { height: 26px; width: auto; flex: none; display: block; margin-right: 2px; }
  .who { flex: 1; min-width: 0; display: grid; text-align: left; background: none; border: 0; padding: 2px 4px; }
  .name { font-family: var(--display); font-weight: 700; font-size: 1.15rem; line-height: 1.15; display: flex; align-items: center; gap: 8px; min-width: 0; }
  .nm { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .count { display: inline-flex; align-items: center; gap: 3px; font-size: .75rem; font-weight: 600; color: var(--muted); padding: 1px 6px; border: 1px solid var(--line); border-radius: 10px; flex: none; }
  .sub { font-size: .8rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  @media (max-width: 380px) { .export span { display: none; } .export { padding: 0 10px; } }
  @media (max-width: 340px) { .logo { height: 22px; } }
  @media (min-width: 720px) { .bar { padding: 10px 20px 8px; } .name { font-size: 1.35rem; } .logo { height: 42px; } }
</style>
