<script>
  // Step 6: as many modules as the chassis has slots; no two PCs may have the
  // same module (p.22). GM mode can pass over a module already taken.
  import { store } from '../../lib/store.svelte.js';
  import { GAME_DATA as D } from '../../lib/data.js';
  import { moduleOwner, draftAttrs, plural } from '../../lib/creation.js';

  let { draft, selfId } = $props();
  const slots = $derived(draftAttrs(draft).slots);
  const n = $derived(draft.modules.length);
  function toggle(name) {
    const i = draft.modules.indexOf(name);
    if (i >= 0) draft.modules.splice(i, 1);
    else if (n < slots) draft.modules.push(name);
  }
</script>

<div class="budget" role="status">
  <b class="num">{n}</b><span>/ {plural(slots, 'emplacement')}</span>
  <small>{n < slots ? `${plural(slots - n, 'emplacement libre', 'emplacements libres')} : vous pourrez les remplir en jeu.` : 'Châssis complet.'} Activer un module coûte des PE et peut le faire surchauffer.</small>
</div>

<ul class="mods">
  {#each D.modules as mo (mo.name)}
    {@const on = draft.modules.includes(mo.name)}
    {@const owner = moduleOwner(store.chars, mo.name, selfId)}
    <li>
      <button class="mod" aria-pressed={on} disabled={!on && (n >= slots || (!!owner && !store.ui.gm))} onclick={() => toggle(mo.name)}>
        <span class="mn">{mo.name}<em class="cost num">{mo.cost}</em>{#if owner}<em class="tag">pris par {owner.name || 'un autre robot'}</em>{/if}</span>
        <span class="me">{mo.effect}</span>
      </button>
    </li>
  {/each}
</ul>

<style>
  .budget { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; padding: 10px 12px; margin-bottom: 10px; background: var(--abyss); border: 1px solid var(--line); border-radius: 4px; }
  .budget b { font-size: 1.6rem; color: var(--amber); line-height: 1; }
  .budget small { flex-basis: 100%; color: var(--muted); font-size: .85rem; }
  .mods { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  @media (min-width: 900px) { .mods { grid-template-columns: 1fr 1fr; } }
  .mod { width: 100%; height: 100%; display: grid; gap: 4px; align-content: start; text-align: left; padding: 10px 12px; background: var(--abyss); border: 1px solid var(--line); border-radius: 4px; }
  .mod[aria-pressed='true'] { border-color: var(--amber); box-shadow: inset 0 0 0 1px var(--amber); }
  .mod[aria-pressed='true'] .mn { color: var(--amber); }
  .mod:disabled { opacity: .5; cursor: not-allowed; }
  .mn { font-family: var(--display); font-weight: 600; display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
  .cost { font-style: normal; font-family: var(--body); font-size: .8rem; color: var(--coolant); }
  .me { font-size: .85rem; color: var(--muted); }
  .tag { font-style: normal; font-family: var(--body); font-weight: 500; font-size: .72rem; padding: 0 6px; border-radius: 3px; background: var(--hull-2); color: var(--text); }
</style>
