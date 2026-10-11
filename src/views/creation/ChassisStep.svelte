<script>
  // Step 3: head, torso and undercarriage, with live totals (p.17-20). A part
  // another PC already has is unavailable, except the Scrap parts (p.18); in
  // GM mode it can still be picked.
  import Icon from '../../components/Icon.svelte';
  import { store } from '../../lib/store.svelte.js';
  import { GAME_DATA as D } from '../../lib/data.js';
  import { ATTRS } from '../../lib/rules.js';
  import { SLOTS, partOwner, draftAttrs } from '../../lib/creation.js';

  let { draft, selfId } = $props();
  const L = D.attributeLabels;
  const tot = $derived(draftAttrs(draft));
  // The slot whose list is open: the first empty one to begin with.
  let open = $state(SLOTS.find((s) => !draft[s.key])?.key ?? null);
  const cols = [...ATTRS.map((a) => [a, L[a].short]), ['slots', 'Empl.'], ['armor', 'Arm.']];

  function choose(s, name) {
    draft[s.key] = name;
    open = SLOTS.find((x) => !draft[x.key])?.key ?? null;
  }
</script>

<div class="totals" aria-label="Totaux du châssis">
  {#each cols as [k, l] (k)}<div><small>{l}</small><b class="num">{tot[k]}</b></div>{/each}
</div>
<p class="hint">Les attributs, l'armure et le nombre de modules sont la somme des trois pièces. Deux joueurs ne peuvent pas prendre la même pièce, sauf les pièces de ferraille{store.ui.gm ? ' (en mode MJ, vous pouvez passer outre)' : ''}.</p>

{#each SLOTS as s (s.key)}
  {@const chosen = D.chassis[s.cat].find((p) => p.name === draft[s.key])}
  <section class="slot">
    <button class="head" aria-expanded={open === s.key} onclick={() => (open = open === s.key ? null : s.key)}>
      <span class="sl">{s.label}</span>
      <span class="sn">{chosen ? chosen.name : 'À choisir'}</span>
      <span class="chev" class:up={open === s.key}><Icon name="chevron" size={18} /></span>
    </button>
    {#if open === s.key}
      <ul class="parts" role="radiogroup" aria-label={s.label}>
        {#each D.chassis[s.cat] as p (p.name)}
          {@const owner = partOwner(store.chars, s.cat, p.name, selfId)}
          <li>
            <button class="part" role="radio" aria-checked={draft[s.key] === p.name} disabled={!!owner && !store.ui.gm} onclick={() => choose(s, p.name)}>
              <span class="pn">{p.name}{#if p.scrap}<em class="tag">toujours disponible</em>{/if}{#if owner}<em class="tag taken">pris par {owner.name || 'un autre robot'}</em>{/if}</span>
              <span class="pd">{p.desc}</span>
              <span class="ps num">{#each cols as [k, l] (k)}<span><small>{l}</small>{p[k]}</span>{/each}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/each}

<style>
  .totals { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; padding: 10px 12px; background: var(--abyss); border: 1px solid var(--line); border-radius: 4px; }
  .totals div { display: grid; justify-items: center; }
  .totals small, .ps small { font-size: .7rem; color: var(--muted); }
  .totals b { font-size: 1.45rem; color: var(--amber); line-height: 1.1; }
  .hint { margin: 8px 0 12px; }
  .slot { border-top: 1px solid var(--line); }
  .head { width: 100%; min-height: 56px; display: grid; grid-template-columns: 5.5em 1fr auto; align-items: center; gap: 8px; background: none; border: 0; text-align: left; padding: 6px 2px; }
  .sl { font-size: .85rem; color: var(--muted); }
  .sn { font-family: var(--display); font-weight: 600; font-size: 1.05rem; }
  .chev { color: var(--muted); transition: rotate .15s; }
  .chev.up { rotate: 90deg; }
  .parts { list-style: none; margin: 0 0 12px; padding: 0; display: grid; gap: 6px; }
  @media (min-width: 900px) { .parts { grid-template-columns: 1fr 1fr; } }
  .part { width: 100%; display: grid; gap: 3px; text-align: left; padding: 10px 12px; background: var(--abyss); border: 1px solid var(--line); border-radius: 4px; }
  .part[aria-checked='true'] { border-color: var(--amber); box-shadow: inset 0 0 0 1px var(--amber); }
  .part[aria-checked='true'] .pn { color: var(--amber); }
  .part:disabled { opacity: .5; cursor: not-allowed; }
  .pn { font-family: var(--display); font-weight: 600; display: flex; flex-wrap: wrap; gap: 6px; align-items: baseline; }
  .pd { font-size: .85rem; color: var(--muted); }
  .ps { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: .95rem; }
  .ps span { display: inline-flex; gap: 4px; align-items: baseline; }
  .tag { font-style: normal; font-family: var(--body); font-weight: 500; font-size: .72rem; padding: 0 6px; border-radius: 3px; background: var(--hull-2); color: var(--muted); }
  .tag.taken { color: var(--text); }
</style>
