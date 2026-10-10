<script>
  // Create NPCs from the book's stat blocks — for the roster or straight into a combat.
  import Sheet from '../components/Sheet.svelte';
  import Stepper from '../components/Stepper.svelte';
  import Icon from '../components/Icon.svelte';
  import { store, fromTemplate, blankCharacter, newId, newCombatant } from '../lib/store.svelte.js';
  import { GAME_DATA as D } from '../lib/data.js';

  let { mode: modeProp = 'roster' } = $props();
  const mode = modeProp; // captured: props vanish once the sheet closes
  let qty = $state(1);
  let side = $state('enemy');
  let q = $state('');
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const list = $derived(q ? D.npcTemplates.filter((t) => norm(`${t.name} ${t.group}`).includes(norm(q))) : D.npcTemplates);
  const groups = $derived([...new Set(list.map((t) => t.group))]);
  const statLine = (t) => {
    const L = t.body === 'creature' ? ['For', 'Agi', 'Int', 'Emp'] : ['Serv', 'Stab', 'Proc', 'Rés'];
    return t.attrs.map((v, i) => (v ? `${L[i]} ${v}` : '')).filter(Boolean).join(', ') + `, armure ${t.armor}`;
  };

  function create(make, baseName) {
    const group = qty > 1 ? newId() : '';
    const dev = { ...$state.snapshot(store.c.dev) };
    const made = Array.from({ length: qty }, (_, i) => { const c = make(); c.dev = { ...dev }; c.name = qty > 1 ? `${baseName} ${i + 1}` : baseName; c.group = group; return c; });
    store.close();
    store.commitAll(`${qty > 1 ? `${qty} × ` : ''}${baseName} ${mode === 'combat' ? 'en combat' : qty > 1 ? 'créés' : 'créé'}`, (d) => {
      made.forEach((c) => {
        d.chars.push(c);
        if (mode === 'combat') d.combat.combatants.push(newCombatant(c.id, side));
      });
      if (mode === 'roster' && qty === 1) d.activeId = made[0].id;
    });
    if (mode === 'roster' && qty === 1) store.ui.tab = 'robot';
  }
  const fromT = (t) => create(() => fromTemplate(t), t.name);
  function blank(body) {
    create(() => { const c = blankCharacter('npc'); c.statMode = 'direct'; c.body = body; c.online = body !== 'creature'; return c; }, body === 'creature' ? 'Créature' : body === 'drone' ? 'Drone' : 'Robot PNJ');
  }
</script>

<Sheet title={mode === 'combat' ? 'Ajouter des adversaires' : 'Nouveau PNJ'} subtitle="Modèles du chapitre « Robots et monstres »">
  <div class="controls">
    <div class="ctl"><span>Nombre</span><Stepper value={qty} min={1} max={12} label="nombre" onchange={(v) => (qty = v)} size="sm" /></div>
    {#if mode === 'combat'}
      <div class="ctl"><span>Camp</span>
        <div class="chips">
          <button class="chip" aria-pressed={side === 'ally'} onclick={() => (side = 'ally')}>Allié</button>
          <button class="chip" aria-pressed={side === 'enemy'} onclick={() => (side = 'enemy')}>Ennemi</button>
        </div>
      </div>
    {/if}
  </div>
  {#if qty > 1}<p class="hint">Un groupe identique partage un seul jet d'initiative (règle du livre).</p>{/if}
  <input class="input" type="search" bind:value={q} placeholder="Rechercher un modèle" aria-label="Rechercher un modèle" />
  <div class="blanks">
    <button class="btn small" onclick={() => blank('robot')}><Icon name="plus" size={16} />Nouveau robot</button>
    <button class="btn small" onclick={() => blank('drone')}><Icon name="plus" size={16} />Nouveau drone</button>
    <button class="btn small" onclick={() => blank('creature')}><Icon name="plus" size={16} />Nouvelle créature</button>
  </div>
  {#each groups as g (g)}
    <h3 class="sec">{g}</h3>
    <ul class="list">
      {#each list.filter((t) => t.group === g) as t (t.id)}
        <li>
          <button class="item" onclick={() => fromT(t)}>
            <span class="t">{t.name}{#if t.body === 'drone'}<em>drone</em>{/if}</span>
            <span class="s num">{statLine(t)}</span>
            {#if t.weapons.length || t.modules.length}<span class="d">{[...t.weapons.map((w) => (typeof w === 'string' ? w : w.name)), ...t.modules].join(', ')}</span>{/if}
          </button>
        </li>
      {/each}
    </ul>
  {/each}
</Sheet>

<style>
  .controls { display: flex; flex-wrap: wrap; gap: 12px 20px; margin-bottom: 10px; }
  .ctl { display: flex; align-items: center; gap: 10px; }
  .ctl > span { font-size: .9rem; color: var(--muted); }
  .blanks { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 4px; }
  .sec { font-size: .9rem; color: var(--muted); font-weight: 500; margin: 14px 0 2px; }
  .item { width: 100%; display: grid; gap: 2px; text-align: left; background: none; border: 0; padding: 10px 4px; }
  .item:hover .t { color: var(--amber); }
  .t { font-family: var(--display); font-weight: 600; font-size: 1.02rem; display: flex; gap: 8px; align-items: baseline; }
  .t em { font-style: normal; font-family: var(--body); font-size: .75rem; color: var(--muted); }
  .s { font-size: .85rem; color: var(--muted); }
  .d { font-size: .85rem; }
</style>
