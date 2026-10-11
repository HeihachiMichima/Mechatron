<script>
  // A list of robots with their attributes: tap to open the fiche, duplicate, delete.
  // Used by « Gérer l'équipe » (PCs) and the MJ space (NPCs).
  import Icon from './Icon.svelte';
  import { store, newId } from '../lib/store.svelte.js';
  import { chassis, attrCurrent, shownAttrs, attrLabels, modelOf, status } from '../lib/rules.js';
  import { GAME_DATA as D } from '../lib/data.js';

  let { list, onpick, empty = '' } = $props();
  let confirmDel = $state(null);
  const inCombat = (id) => store.combat.combatants.some((x) => x.cid === id);
  const sub = (c) => {
    if (c.template) return D.npcTemplates.find((t) => t.id === c.template)?.name ?? 'PNJ';
    const m = modelOf(c);
    return m ? m.name : c.kind === 'npc' ? 'PNJ' : 'Modèle à choisir';
  };
  function dup(c) {
    const copy = JSON.parse(JSON.stringify($state.snapshot(c)));
    copy.id = newId(); copy.name = `${c.name || 'Robot'} (copie)`;
    if (copy.kind !== 'npc') copy.color = '';
    store.addChar(copy, { activate: false, label: `${copy.name} créé` });
  }
  function del(c) {
    if (confirmDel !== c.id) { confirmDel = c.id; setTimeout(() => confirmDel === c.id && (confirmDel = null), 3500); return; }
    confirmDel = null; store.removeChar(c.id);
  }
</script>

{#if list.length === 0 && empty}<p class="muted empty">{empty}</p>{/if}
<ul class="list">
  {#each list as c (c.id)}
    {@const ch = chassis(c)}
    {@const st = status(c, ch)}
    <li class="row" class:active={c.id === store.c?.id}>
      <button class="main" onclick={() => onpick(c.id)}>
        <span class="name">{#if c.kind !== 'npc'}<span class="cdot" style="background:{c.color}"></span>{/if}{c.name || 'Sans nom'}{#if c.id === store.c?.id}<Icon name="check" size={16} />{/if}</span>
        <span class="sub">{sub(c)}{#if inCombat(c.id)}<em class="tag">en combat</em>{/if}{#if st.deactivated}<em class="tag bad">{c.body === 'creature' ? 'hors de combat' : 'désactivé'}</em>{/if}</span>
        <span class="stats num">
          {#each shownAttrs(c, ch) as a (a)}
            {@const cur = attrCurrent(c, ch, a)}
            <span class:hurt={cur < ch.attrMax[a]}>{attrLabels(c)[a].short} {cur}/{ch.attrMax[a]}</span>
          {/each}
          {#if c.kind !== 'npc' && c.body !== 'creature'}<span class="ep">PE {c.ep.current}</span>{/if}
        </span>
      </button>
      <button class="icon-btn" aria-label="Dupliquer {c.name}" title="Dupliquer" onclick={() => dup(c)}><Icon name="copy" /></button>
      <button class="icon-btn del" class:armed={confirmDel === c.id} aria-label="Supprimer {c.name}" title={confirmDel === c.id ? 'Toucher encore pour supprimer' : 'Supprimer'} onclick={() => del(c)}><Icon name="trash" /></button>
    </li>
  {/each}
</ul>

<style>
  .empty { font-size: .9rem; margin: 4px 0 8px; }
  .row { display: flex; align-items: center; gap: 2px; }
  .row.active { box-shadow: inset 3px 0 0 var(--amber); }
  .main { flex: 1; min-width: 0; display: grid; gap: 2px; text-align: left; background: none; border: 0; padding: 10px 8px 10px 10px; }
  .name { font-family: var(--display); font-weight: 600; font-size: 1.05rem; display: flex; gap: 6px; align-items: center; }
  .active .name { color: var(--amber); }
  .cdot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
  .sub { font-size: .85rem; color: var(--muted); display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .tag { font-style: normal; font-size: .72rem; padding: 0 6px; border-radius: 3px; background: var(--hull-2); color: var(--text); }
  .tag.bad { color: var(--fault); }
  .stats { display: flex; gap: 10px; flex-wrap: wrap; font-size: .82rem; color: var(--muted); }
  .stats .hurt { color: var(--fault); }
  .stats .ep { color: var(--coolant); }
  .del.armed { color: var(--fault); background: color-mix(in srgb, var(--fault) 15%, transparent); }
</style>
