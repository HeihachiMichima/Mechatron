<script>
  // Tap a combatant in the initiative strip: status and the out-of-turn tools.
  import Sheet from '../components/Sheet.svelte';
  import Avatar from '../components/Avatar.svelte';
  import Segments from '../components/Segments.svelte';
  import Stepper from '../components/Stepper.svelte';
  import { store } from '../lib/store.svelte.js';
  import { GAME_DATA as D } from '../lib/data.js';
  import { chassis, attrCurrent, shownAttrs, attrLabels, armorCurrent, armorTotal, status, combatWeapons } from '../lib/rules.js';

  let { xid: xidProp } = $props();
  const xid = xidProp;
  const x = $derived(store.combat.combatants.find((y) => y.id === xid));
  const c = $derived(x ? store.char(x.cid) : null);
  const ch = $derived(c ? chassis(c) : null);
  const covers = [{ name: 'À découvert', armor: 0 }, ...D.coverPresets];
  const setX = (patch, label) => store.commitAll(label, (d) => Object.assign(d.combat.combatants.find((y) => y.id === xid), patch));
  function remove() { const n = c.name; store.close(); store.commitAll(`${n || 'Robot'} retiré du combat`, (d) => (d.combat.combatants = d.combat.combatants.filter((y) => y.id !== xid))); }
  function openSheet() { const id = c.id; store.close(); store.openFiche(id, 'etat'); }
  function shootNow() { store.close(); store.ui.turn = null; store.ui.turnActor = xid; window.scrollTo({ top: 0, behavior: 'smooth' }); }
</script>

{#if x && c}
<Sheet title={c.name || 'Sans nom'} subtitle="{x.side === 'ally' ? 'Allié' : 'Ennemi'}, initiative {x.init ?? '–'}">
  <div class="top">
    <Avatar {c} side={x.side} size={64} label={false} down={status(c, ch).deactivated} />
    <div class="meters">
      {#each shownAttrs(c, ch) as a (a)}
        {@const cur = attrCurrent(c, ch, a)}
        <div class="m"><span>{attrLabels(c)[a].label} <b class="num" class:hurt={cur < ch.attrMax[a]}>{cur}/{ch.attrMax[a]}</b></span><Segments max={ch.attrMax[a]} current={cur} size="sm" /></div>
      {/each}
      <div class="m"><span>Armure <b class="num">{armorCurrent(c, ch)}/{armorTotal(c, ch)}</b></span><Segments max={armorTotal(c, ch)} current={armorCurrent(c, ch)} size="sm" tone="steel" /></div>
    </div>
  </div>

  <div class="chips st">
    {#if x.lock}<span class="tag">verrouille {store.char(x.lock.target)?.name || '?'} (+{x.lock.atk})</span>{/if}
    {#if x.overwatch}<span class="tag">en surveillance</span>{/if}
    {#if x.prone}<span class="tag">à terre</span>{/if}
    {#if x.lostAction}<span class="tag">prochaine action perdue</span>{/if}
    {#if x.defending}<span class="tag">a défendu ce tour</span>{/if}
  </div>

  {#if x.overwatch && store.combat.active && combatWeapons(c, 'ranged').length}
    <button class="btn primary block" onclick={shootNow}>Tirer maintenant (surveillance)</button>
  {/if}

  <div class="row"><span class="lbl">Initiative</span><Stepper value={x.init ?? 0} min={0} max={30} label="initiative" onchange={(v) => setX({ init: v }, null)} size="sm" /></div>
  <span class="lbl">Couverture</span>
  <div class="chips">{#each covers as cv (cv.name)}<button class="chip" aria-pressed={(c.cover || 0) === cv.armor} onclick={() => store.commitOn(c.id, null, (s) => (s.cover = cv.armor))}>{cv.armor ? `${cv.name} ${cv.armor}` : cv.name}</button>{/each}</div>
  <span class="lbl">État</span>
  <div class="chips">
    <button class="chip" aria-pressed={x.prone} onclick={() => setX({ prone: !x.prone }, null)}>À terre</button>
    <button class="chip" aria-pressed={x.lostAction} onclick={() => setX({ lostAction: !x.lostAction }, null)}>Action perdue</button>
    {#if x.lock}<button class="chip" onclick={() => setX({ lock: null }, 'Verrouillage levé')}>Lever le verrouillage</button>{/if}
    <button class="chip" aria-pressed={x.side === 'ally'} onclick={() => setX({ side: 'ally' }, null)}>Allié</button>
    <button class="chip" aria-pressed={x.side === 'enemy'} onclick={() => setX({ side: 'enemy' }, null)}>Ennemi</button>
  </div>

  {#snippet footer()}
    <button class="btn small danger-soft" onclick={() => store.open({ type: 'damage', cid: c.id })}>Subir des dégâts</button>
    {#if c.kind === 'npc'}<button class="btn small" onclick={() => store.open({ type: 'enemyEdit', cid: c.id })}>Modifier</button>{/if}
    {#if c.kind !== 'npc' || store.ui.gm}<button class="btn small ghost" onclick={openSheet}>Ouvrir la fiche</button>{/if}
    <button class="btn small ghost" onclick={remove}>Retirer</button>
  {/snippet}
</Sheet>
{/if}

<style>
  .top { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 10px; }
  .meters { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px 12px; }
  .m { display: grid; gap: 3px; font-size: .82rem; color: var(--muted); }
  .m b { color: var(--text); }
  .m b.hurt { color: var(--fault); }
  .st { margin-bottom: 10px; }
  .tag { font-size: .78rem; padding: 2px 8px; border-radius: 3px; background: var(--hull-2); }
  .row { display: flex; align-items: center; justify-content: space-between; margin: 12px 0 4px; }
  .lbl { display: block; font-size: .82rem; color: var(--muted); margin: 10px 0 6px; }
  .row .lbl { margin: 0; }
  .danger-soft { color: var(--fault); border-color: color-mix(in srgb, var(--fault) 50%, var(--line)); background: transparent; }
</style>
