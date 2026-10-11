<script>
  import Sheet from '../components/Sheet.svelte';
  import Icon from '../components/Icon.svelte';
  import { store } from '../lib/store.svelte.js';
  import { GAME_DATA as D } from '../lib/data.js';
  import { ATTRS } from '../lib/rules.js';
  let { title, items, onpick, search = false, allowCustom = false, allowClear = false, current = '' } = $props();
  let q = $state('');
  const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const shown = $derived(q ? items.filter((it) => norm(`${it.title} ${it.sub || ''} ${it.detail || ''}`).includes(norm(q))) : items);
  const groups = $derived.by(() => {
    const map = new Map();
    shown.forEach((it) => { const g = it.group || ''; if (!map.has(g)) map.set(g, []); map.get(g).push(it); });
    return [...map.entries()];
  });
  const exact = $derived(items.some((it) => norm(it.title) === norm(q)));
  const choose = (v) => { const fn = onpick; store.close(); fn(v); };
  const statCols = [...ATTRS.map((a) => [a, D.attributeLabels[a].short]), ['slots', 'Empl.'], ['armor', 'Arm.']];
</script>

<Sheet {title}>
  {#if search || allowCustom}
    <input class="input search" type="search" bind:value={q} placeholder={allowCustom ? 'Rechercher ou saisir un nom' : 'Rechercher'} aria-label="Rechercher" />
  {/if}
  {#if allowCustom && q.trim() && !exact}
    <button class="custom" onclick={() => choose(q.trim())}><Icon name="plus" size={18} />Utiliser « {q.trim()} »</button>
  {/if}
  {#each groups as [g, list] (g)}
    {#if g}<h3 class="group">{g}</h3>{/if}
    <ul class="list">
      {#each list as it (it.value)}
        <li>
          <button class="item" class:current={it.value === current} onclick={() => choose(it.value)}>
            <span class="t">{it.title}{#if it.value === current}<Icon name="check" size={18} />{/if}</span>
            {#if it.sub}<span class="s">{it.sub}</span>{/if}
            {#if it.part}
              <span class="stats">{#each statCols as [k, l] (k)}<span><small>{l}</small><b class="num">{it.part[k]}</b></span>{/each}</span>
            {/if}
            {#if it.detail}<span class="d">{it.detail}</span>{/if}
          </button>
        </li>
      {/each}
    </ul>
  {/each}
  {#if shown.length === 0}<p class="muted">Rien ne correspond à « {q} ».</p>{/if}
  {#if allowClear && current}
    <button class="btn danger small clear" onclick={() => choose('')}>Retirer la pièce</button>
  {/if}
</Sheet>

<style>
  .search { margin-bottom: 8px; position: sticky; top: 0; z-index: 1; }
  .group { font-size: .9rem; color: var(--muted); margin: 14px 0 2px; font-weight: 500; }
  .item { width: 100%; display: grid; gap: 3px; text-align: left; padding: 12px 4px; background: none; border: 0; min-height: 48px; }
  .item:hover .t { color: var(--amber); }
  .t { font-family: var(--display); font-weight: 600; font-size: 1.05rem; display: flex; align-items: center; gap: 6px; }
  .current .t { color: var(--amber); }
  .s { font-size: .85rem; color: var(--muted); }
  .d { font-size: .9rem; }
  .stats { display: flex; gap: 14px; margin: 2px 0; }
  .stats span { display: grid; }
  .stats small { font-size: .7rem; color: var(--muted); }
  .stats b { font-size: 1.1rem; }
  .custom { width: 100%; display: flex; align-items: center; gap: 8px; min-height: 48px; padding: 0 12px; margin-bottom: 4px; border: 1px dashed var(--amber); border-radius: 4px; background: none; color: var(--amber); font-weight: 600; text-align: left; }
  .clear { margin-top: 12px; }
</style>
