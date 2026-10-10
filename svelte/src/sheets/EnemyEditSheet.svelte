<script>
  // Quick edit of an NPC from the combat preparation: stats, key programs, weapons.
  import Sheet from '../components/Sheet.svelte';
  import Stepper from '../components/Stepper.svelte';
  import Icon from '../components/Icon.svelte';
  import { store } from '../lib/store.svelte.js';
  import { GAME_DATA as D } from '../lib/data.js';
  import { shownAttrs, attrLabels, chassis, ATTRS, findWeapon } from '../lib/rules.js';
  import { weaponItems, moduleItems } from '../lib/pickers.js';

  let { cid: cidProp } = $props();
  const cid = cidProp;
  const c = $derived(store.char(cid));
  const keyProgs = ['assaut', 'tir', 'deplacement', 'infiltration', 'scan', 'surcharge'];
  const progLabel = (k) => D.programs.find((p) => p.key === k)?.label;
  const ranges = ['Bras', 'Proche', 'Courte', 'Longue', 'Lointaine'];
  const upd = (fn) => store.commitOn(cid, null, fn);
  function addWeapon() {
    store.open({ type: 'picker', title: 'Ajouter une arme', items: weaponItems(), search: true, allowCustom: true,
      onpick: (name) => { const r = findWeapon(name); store.commitOn(cid, `${name} ajoutée`, (s) => s.weapons.push({ name, bonus: r?.bonus ?? '', degats: r?.degats ?? 1, portee: r?.portee ?? 'Bras', note: '' })); store.open({ type: 'enemyEdit', cid }); } });
  }
  function addModule() {
    store.open({ type: 'picker', title: 'Ajouter un module', items: moduleItems(), search: true,
      onpick: (name) => { store.commitOn(cid, `${name} ajouté`, (s) => { s.modules.push(name); if (s.statMode === 'direct') s.direct.slots = Math.max(s.direct.slots || 0, s.modules.length); }); store.open({ type: 'enemyEdit', cid }); } });
  }
  function openSheet() { store.close(); store.activate(cid); store.ui.tab = 'robot'; window.scrollTo({ top: 0 }); }
</script>

{#if c}
<Sheet title="Modifier {c.name || 'le PNJ'}" subtitle="Les changements s'appliquent tout de suite" wide>
  <label class="field"><span>Nom</span><input class="input" value={c.name} oninput={(e) => (store.char(cid).name = e.currentTarget.value)} /></label>

  {#if c.statMode === 'direct'}
    <h3>Attributs et armure</h3>
    <div class="grid">
      {#each (c.body === 'robot' ? ATTRS : shownAttrs(c, chassis(c))) as a (a)}
        <div class="f"><span>{attrLabels(c)[a].label}</span><Stepper value={c.direct[a]} min={0} max={30} label={attrLabels(c)[a].label} onchange={(v) => upd((s) => (s.direct[a] = v))} size="sm" /></div>
      {/each}
      <div class="f"><span>Armure</span><Stepper value={c.direct.armor} min={0} max={30} label="armure" onchange={(v) => upd((s) => (s.direct.armor = v))} size="sm" /></div>
    </div>
  {:else}
    <p class="hint">Statistiques calculées par le châssis : modifiez-les depuis la fiche complète.</p>
  {/if}

  <h3>Programmes de combat</h3>
  <div class="grid">
    {#each keyProgs as k (k)}
      <div class="f"><span>{progLabel(k)}</span><Stepper value={c.programRatings[k] || 0} min={0} max={8} label={progLabel(k)} onchange={(v) => upd((s) => (s.programRatings[k] = v))} size="sm" /></div>
    {/each}
  </div>

  <h3>Armes</h3>
  {#each c.weapons as w, i (i)}
    <div class="wrow">
      <input class="input" value={w.name} oninput={(e) => (store.char(cid).weapons[i].name = e.currentTarget.value)} aria-label="Nom de l'arme" />
      <div class="f"><span>Bonus</span><Stepper value={Number(w.bonus) || 0} min={0} max={6} label="bonus" onchange={(v) => upd((s) => (s.weapons[i].bonus = v))} size="sm" /></div>
      <div class="f"><span>Dégâts</span><Stepper value={Number(w.degats) || 0} min={0} max={10} label="dégâts" onchange={(v) => upd((s) => (s.weapons[i].degats = v))} size="sm" /></div>
      <select class="input" value={w.portee} onchange={(e) => upd((s) => (s.weapons[i].portee = e.currentTarget.value))} aria-label="Portée">{#each ranges as r (r)}<option value={r}>{r}</option>{/each}</select>
      <button class="icon-btn" aria-label="Retirer {w.name}" onclick={() => upd((s) => s.weapons.splice(i, 1))}><Icon name="trash" /></button>
    </div>
  {/each}
  <button class="btn small" onclick={addWeapon}><Icon name="plus" size={16} />Arme</button>

  <h3>Modules</h3>
  <div class="chips">
    {#each c.modules as m, i (i)}{#if m}<span class="mod">{m}<button aria-label="Retirer {m}" onclick={() => upd((s) => { s.modules.splice(i, 1); s.brokenModules = (s.brokenModules || []).filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)); })}>×</button></span>{/if}{/each}
    <button class="chip" onclick={addModule}>+ Module</button>
  </div>

  {#snippet footer()}
    <button class="btn ghost" onclick={openSheet}>Ouvrir la fiche complète</button>
    {#if c.kind === 'npc'}<button class="btn" onclick={() => store.open({ type: 'duplicate', cid })}><Icon name="copy" size={16} />Dupliquer</button>{/if}
    <button class="btn primary" style="margin-left:auto" onclick={() => store.close()}>Terminé</button>
  {/snippet}
</Sheet>
{/if}

<style>
  h3 { font-size: 1rem; margin: 16px 0 8px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  .f { display: grid; gap: 4px; }
  .f span { font-size: .82rem; color: var(--muted); }
  .wrow { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-items: end; padding: 8px 0; border-top: 1px solid var(--line); }
  @media (min-width: 640px) { .wrow { grid-template-columns: 1.4fr auto auto 1fr auto; } }
  .mod { display: inline-flex; align-items: center; gap: 4px; padding: 4px 4px 4px 10px; border: 1px solid var(--line); border-radius: 16px; font-size: .9rem; }
  .mod button { background: none; border: 0; color: var(--muted); width: 26px; height: 26px; border-radius: 50%; }
</style>
