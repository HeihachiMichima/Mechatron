<script>
  // Trash Blower (Cleaning Robot, book p.66): roll Clean against a target up to
  // Near range. No damage, but on a success the victim must roll Force at once;
  // failure means it misses its next action.
  import Avatar from '../../components/Avatar.svelte';
  import Icon from '../../components/Icon.svelte';
  import DiceTray from '../../components/DiceTray.svelte';
  import { store } from '../../lib/store.svelte.js';
  import { poolFor } from '../../lib/rules.js';

  let { actor, opponents, onback, ondone } = $props();
  const nm = (c) => c?.name || 'Sans nom';
  let tid = $state(null);
  const tgt = $derived(opponents.find((r) => r.c.id === tid) ?? opponents[0] ?? null);
  let clean = $state(null);
  let force = $state(null);

  function conclude() {
    const t = tgt, ok = clean.successes > 0, miss = ok && force && force.successes === 0;
    store.commitAll(null, (d) => {
      if (miss) d.combat.combatants.find((y) => y.id === t.x.id).lostAction = true;
      store.log(`${nm(actor.c)} : Souffleur de déchets sur ${nm(t.c)} : ${!ok ? 'raté' : miss ? 'Force ratée, perd sa prochaine action' : 'la cible tient bon'}`);
    });
    ondone(!ok ? 'Le souffle manque sa cible.' : miss ? `${nm(t.c)} perd sa prochaine action.` : `${nm(t.c)} résiste au souffle.`);
  }
</script>

<p class="hint">Souffleur de déchets : jet de Nettoyer jusqu'à portée Proche. Pas de dégât ; en cas de réussite, la cible fait aussitôt un jet de Force, et un échec lui fait perdre sa prochaine action.</p>
<span class="lbl">Cible</span>
<div class="targets">
  {#each opponents as o (o.x.id)}<button class="tg" aria-pressed={tgt?.c.id === o.c.id} onclick={() => { tid = o.c.id; clean = null; force = null; }}><Avatar c={o.c} side={o.x.side} size={44} selected={tgt?.c.id === o.c.id} /></button>{/each}
</div>
{#if tgt}
  {#key tgt.c.id}
    <DiceTray cid={actor.c.id} title="{nm(actor.c)} : Nettoyer" pool={poolFor(actor.c, '__special')} onresult={(t) => { clean = t; force = null; }} />
    {#if clean && clean.successes > 0}
      <DiceTray cid={tgt.c.id} title="{nm(tgt.c)} : Force" pool={poolFor(tgt.c, 'force')} onresult={(t) => (force = t)} />
    {/if}
  {/key}
{/if}
<div class="nav">
  <button class="btn ghost" onclick={onback}>Retour</button>
  {#if clean && (clean.successes === 0 || force)}<button class="btn primary" onclick={conclude}>Conclure<Icon name="chevron" size={18} /></button>{/if}
</div>

<style>
  .lbl { display: block; font-size: .82rem; color: var(--muted); margin-top: 4px; }
  .targets { display: flex; flex-wrap: wrap; gap: 4px; }
  .tg { display: grid; justify-items: center; background: none; border: 0; padding: 4px; border-radius: 8px; }
  .tg[aria-pressed='true'] { background: var(--hull-2); }
  .nav { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
  .nav .primary { margin-left: auto; }
</style>
