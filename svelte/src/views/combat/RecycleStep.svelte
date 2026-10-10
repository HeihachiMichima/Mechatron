<script>
  // Recycle (Scrap Robot, book p.62-63): in a conflict the roll is an action.
  // Success: the right item from your collection, Gear Bonus = successes, one
  // use (one extra success makes it durable). Weapons: a blunt instrument
  // (+1, damage 1, Arm's Length); each extra success raises the Gear Bonus
  // (up to +2), the damage (up to 3) or the range one step (up to Long).
  import Icon from '../../components/Icon.svelte';
  import DiceTray from '../../components/DiceTray.svelte';
  import { store } from '../../lib/store.svelte.js';
  import { poolFor } from '../../lib/rules.js';

  let { actor, onback, ondone } = $props();
  const nm = (c) => c?.name || 'Sans nom';
  const RANGES = ['Bras', 'Proche', 'Courte', 'Longue'];
  let roll = $state(null);
  let mode = $state('weapon');
  let picks = $state([]);
  const s = $derived(roll?.successes || 0);
  const extra = $derived(Math.max(0, s - 1));
  const count = (k) => picks.filter((p) => p === k).length;
  const weapon = $derived({ bonus: Math.min(2, 1 + count('bonus')), degats: Math.min(3, 1 + count('dmg')), portee: RANGES[Math.min(3, count('range'))], durable: count('durable') > 0 });
  const toolDurable = $derived(mode === 'tool' && picks.includes('durable'));
  const toolBonus = $derived(toolDurable ? s - 1 : s);
  const left = $derived(mode === 'weapon' ? extra - picks.length : 0);
  const can = (k) => left > 0 && (k === 'bonus' ? weapon.bonus < 2 : k === 'dmg' ? weapon.degats < 3 : k === 'range' ? count('range') < 3 : !weapon.durable);

  function conclude() {
    const aid = actor.c.id;
    let msg;
    store.commitOn(aid, null, (c) => {
      if (mode === 'weapon') {
        const w = weapon;
        c.weapons.push({ name: 'Arme recyclée', bonus: w.bonus, degats: w.degats, portee: w.portee, note: w.durable ? 'Recyclée, durable.' : 'Recyclée, usage unique.', power: 'epack', empty: false, crankDue: false, oneUse: !w.durable, spent: false });
        msg = `Arme recyclée : +${w.bonus}, dégâts ${w.degats}, portée ${w.portee}${w.durable ? ', durable' : ', usage unique'}.`;
      } else {
        c.equipment.push({ name: `Outil recyclé +${toolBonus}${toolDurable ? '' : ' (usage unique)'}`, integre: false });
        msg = `Outil recyclé : bonus d'équipement +${toolBonus}${toolDurable ? ', durable' : ', usage unique'}.`;
      }
      store.log(`${nm(c)} recycle : ${msg}`);
    });
    store.notify(msg, true);
    ondone(msg);
  }
</script>

<p class="hint">Recycler : fouiller votre collection pour trouver l'objet qu'il faut (compte comme une action). Échec : impossible de relancer pour la même chose.</p>
<DiceTray cid={actor.c.id} title="{nm(actor.c)} : Recycler" pool={poolFor(actor.c, '__special')} onresult={(t) => { roll = t; picks = []; }} />
{#if roll && s > 0}
  <div class="chips">
    <button class="chip" aria-pressed={mode === 'weapon'} onclick={() => { mode = 'weapon'; picks = []; }}>Une arme</button>
    <button class="chip" aria-pressed={mode === 'tool'} onclick={() => { mode = 'tool'; picks = []; }}>Un outil (bonus +{s})</button>
  </div>
  {#if mode === 'weapon'}
    <p class="hint">Instrument contondant (+1, dégâts 1, portée Bras){extra ? `, et ${extra} succès en plus à répartir` : ''}{left > 0 ? ` (reste ${left})` : ''}.</p>
    {#if extra}
      <div class="chips">
        <button class="chip" disabled={!can('bonus')} onclick={() => (picks = [...picks, 'bonus'])}>+1 bonus (max +2)</button>
        <button class="chip" disabled={!can('dmg')} onclick={() => (picks = [...picks, 'dmg'])}>+1 dégât (max 3)</button>
        <button class="chip" disabled={!can('range')} onclick={() => (picks = [...picks, 'range'])}>+1 portée (max Longue)</button>
        <button class="chip" disabled={!can('durable')} onclick={() => (picks = [...picks, 'durable'])}>Durable</button>
        {#if picks.length}<button class="chip" onclick={() => (picks = [])}>Effacer</button>{/if}
      </div>
    {/if}
    <p class="res"><b>Arme recyclée</b> : +{weapon.bonus}, dégâts {weapon.degats}, portée {weapon.portee}, {weapon.durable ? 'durable' : 'usage unique'}.</p>
  {:else}
    {#if s > 1}<label class="tog"><input type="checkbox" checked={toolDurable} onchange={(e) => (picks = e.currentTarget.checked ? ['durable'] : [])} /><span>Durable (coûte un succès : bonus +{s - 1})</span></label>{/if}
    <p class="res"><b>Outil recyclé</b> : bonus d'équipement +{toolBonus} pour l'action prévue, {toolDurable ? 'durable' : 'usage unique'}.</p>
  {/if}
{/if}
<div class="nav">
  <button class="btn ghost" onclick={onback}>Retour</button>
  {#if roll && s > 0}<button class="btn primary" onclick={conclude}>Prendre l'objet<Icon name="chevron" size={18} /></button>
  {:else if roll}<button class="btn primary" onclick={() => { store.log(`${nm(actor.c)} ne trouve rien d'utile dans sa collection`); ondone('Rien d\'utile dans la collection.'); }}>Conclure</button>{/if}
</div>

<style>
  .tog { display: flex; gap: 10px; align-items: center; cursor: pointer; font-size: .92rem; }
  .tog input { width: 20px; height: 20px; accent-color: var(--amber); flex: none; }
  .res { margin: 0; }
  .nav { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
  .nav .primary { margin-left: auto; }
</style>
