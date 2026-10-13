<script>
  // Logo (→ home screen), then whose fiche is on screen (or the campaign in the
  // other spaces), « Quitter la démo » during the demo, the « MJ » switch and the
  // campaign menu (which also holds the robot's exports, T17).
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
  <button class="home" onclick={() => store.goHome()} aria-label="Accueil" title="Accueil"><img class="logo" src={logo} alt="" width="624" height="236" /></button>
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
  {#if store.campaign.demo}<button class="btn small ghost quit" onclick={() => store.quitDemo()} aria-label="Quitter la démo"><span class="long">Quitter la démo</span><span class="short">Quitter</span></button>{/if}
  <button class="gm" role="switch" aria-checked={store.ui.gm} aria-label="Mode MJ" title="Mode MJ : affiche l'espace MJ et les outils du meneur, sur cet appareil" onclick={() => store.setGm(!store.ui.gm)}>
    <span class="gml">MJ</span><i class="sw" class:on={store.ui.gm} aria-hidden="true"></i>
  </button>
  <button class="icon-btn" aria-label="Menu de la campagne" title="Campagne, mode MJ, sauvegardes, thème" onclick={() => store.open({ type: 'campaign' })}><Icon name="menu" /></button>
</div>

<style>
  .bar { display: flex; align-items: center; gap: 6px; padding: 8px 10px 6px 12px; padding-top: max(8px, env(safe-area-inset-top)); background: var(--hull); }
  .home { flex: none; display: grid; place-items: center; min-height: 44px; padding: 0 2px; margin-right: 2px; background: none; border: 0; border-radius: 4px; }
  .home:hover { background: var(--hull-2); }
  .logo { height: 26px; width: auto; display: block; }
  .gm { flex: none; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 6px; background: none; border: 0; border-radius: 4px; color: var(--muted); font-family: var(--display); font-weight: 700; font-size: .85rem; }
  .gm[aria-checked='true'] { color: var(--amber); }
  .gm:hover { background: var(--hull-2); }
  .sw { width: 34px; height: 20px; border-radius: 10px; background: var(--line); position: relative; transition: background .15s; }
  .sw::after { content: ''; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: var(--hull); transition: translate .15s; }
  .sw.on { background: var(--amber); }
  .sw.on::after { translate: 14px 0; }
  .who { flex: 1; min-width: 0; display: grid; text-align: left; background: none; border: 0; padding: 2px 4px; min-height: 44px; }
  .name { font-family: var(--display); font-weight: 700; font-size: 1.15rem; line-height: 1.15; display: flex; align-items: center; gap: 8px; min-width: 0; }
  .nm { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .count { display: inline-flex; align-items: center; gap: 3px; font-size: .75rem; font-weight: 600; color: var(--muted); padding: 1px 6px; border: 1px solid var(--line); border-radius: 10px; flex: none; }
  .sub { font-size: .8rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .quit { flex: none; padding: 0 8px; color: var(--amber); }
  .quit .short { display: none; }
  /* Phones: the robot's name needs the room. */
  @media (max-width: 479.98px) { .quit .long { display: none; } .quit .short { display: inline; } .count { display: none; } .bar { gap: 2px; } .gm { padding: 0 4px; gap: 4px; } }
  @media (max-width: 340px) { .logo { height: 22px; } }
  @media (min-width: 720px) { .bar { padding: 10px 20px 8px; } .name { font-size: 1.35rem; } .logo { height: 42px; } }
</style>
