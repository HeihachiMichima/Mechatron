<script>
  // Logic conflict (book p.83-84): Interact vs Question, Hierarchy and the
  // "logical basis" give +1s, extra successes damage the opponent's Network.
  // A Companion Robot can Manipulate instead (vs Question, or vs Sense
  // Emotion for the living) and Hierarchy then plays no part.
  import Avatar from '../../components/Avatar.svelte';
  import Icon from '../../components/Icon.svelte';
  import Stepper from '../../components/Stepper.svelte';
  import DiceTray from '../../components/DiceTray.svelte';
  import { store } from '../../lib/store.svelte.js';
  import { poolFor, hierarchy, chassis, attrCurrent, attrLabel, fmtBonus } from '../../lib/rules.js';

  let { actor, opponents, onback, ondone } = $props();
  const nm = (c) => c?.name || 'Sans nom';
  const log = (t) => store.log(t);
  const canManip = $derived(actor.c.model === 'companion' && (actor.c.specialRating || 0) > 0);
  const targets = $derived(opponents.filter((r) => canManip || r.c.body !== 'creature'));
  let tid = $state(null);
  let prog = $state('interaction');
  const tgt = $derived(targets.find((r) => r.c.id === tid) ?? targets[0] ?? null);
  const living = $derived(tgt?.c.body === 'creature');
  const useProg = $derived(living ? '__special' : prog);
  const hNum = (c) => { const h = Number(hierarchy(c)); return Number.isFinite(h) ? h : 0; };
  let hA = $state(0);
  let lastA = null;
  let hB = $state(0);
  let aware = $state(true);
  let pros = $state([]);
  let cons = $state([]);
  let manual = $state(0);
  let rollA = $state(null);
  let rollB = $state(null);
  let spend = $state(0);
  let lastT = null;
  $effect(() => { if (actor.c.id !== lastA) { lastA = actor.c.id; hA = hNum(actor.c); } });
  $effect(() => { if (tgt && tgt.c.id !== lastT) { lastT = tgt.c.id; hB = hNum(tgt.c); aware = tgt.c.kind !== 'npc' || living; rollA = null; rollB = null; spend = 0; } });

  const PROS = ["Ne coûte rien à l'adversaire", 'Bon pour le Collectif (MJ)', 'Argument très bien présenté (MJ)'];
  const CONS = ['Demande précieuse ou risquée', "L'adversaire n'a rien à y gagner", 'Pourrait nuire au Collectif', 'Portée Courte ou plus, hors ligne'];
  const manip = $derived(useProg === '__special');
  const diff = $derived(manip ? 0 : hA - hB);
  const modA = $derived(Math.max(0, diff) + pros.length + manual);
  const modB = $derived(Math.max(0, -diff) + cons.length);
  const locked = $derived(!!(tgt && tgt.x.lock && tgt.x.lock.target === actor.c.id));
  const poolA = $derived(poolFor(actor.c, useProg, { mod: modA }));
  const poolB = $derived.by(() => {
    if (!tgt || !aware) return null;
    if (living) { const base = attrCurrent(tgt.c, chassis(tgt.c), 'reseau'); return { attr: 'reseau', base, prog: Math.max(0, modB), neg: Math.max(0, -modB), gear: 0 }; }
    return poolFor(tgt.c, 'contestation', { mod: modB });
  });
  const done = $derived(!!rollA && (!aware || !!rollB));
  const win = $derived(done && (aware ? rollA.successes > rollB.successes : rollA.successes >= 1));
  const extra = $derived(win ? (aware ? rollA.successes - rollB.successes - 1 : rollA.successes - 1) : 0);
  const stuntAttr = 'reseau';
  // Any change of target or modifiers invalidates rolls already made.
  const rkey = $derived(`${tgt?.c.id}:${useProg}:${modA}:${modB}:${aware}`);
  $effect(() => { rkey; rollA = null; rollB = null; spend = 0; });
  const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  function conclude() {
    const t = tgt.c, n = Math.min(spend, extra);
    let hit = 0;
    store.commitAll(null, (d) => {
      const c = d.chars.find((y) => y.id === t.id);
      if (win && n) { const cur = attrCurrent(c, chassis(c), stuntAttr); hit = Math.min(cur, n); c.damage[stuntAttr] = (c.damage[stuntAttr] || 0) + hit; }
      log(`${nm(actor.c)} ${manip ? 'manipule' : 'raisonne'} ${nm(t)} : ${win ? `convaincu${hit ? `, ${attrLabel(t, stuntAttr)} −${hit}` : ''}` : 'échec'} (${rollA.successes}${aware ? ` contre ${rollB.successes}` : ''})`);
    });
    ondone(win ? `${nm(t)} fait ce que ${nm(actor.c)} demande${living && manip ? ', mais voudra quelque chose en retour' : ''}.${hit ? ` Erreurs système : ${attrLabel(t, stuntAttr)} −${hit}.` : ''}` : `${nm(t)} refuse${aware ? ' et peut mal le prendre' : ''}.`);
  }
</script>

<p class="hint">{manip ? (living ? 'Manipuler contre Empathie (Percevoir les émotions).' : 'Manipuler contre Contestation.') : 'Interaction contre Contestation, seulement entre robots. Si la cible n\'est pas consciente d\'elle-même, vous seul lancez.'} Le jet ne compte comme une action que pour vous.</p>
<span class="lbl">Interlocuteur</span>
<div class="targets">
  {#each targets as o (o.x.id)}<button class="tg" aria-pressed={tgt?.c.id === o.c.id} onclick={() => (tid = o.c.id)}><Avatar c={o.c} side={o.x.side} size={44} selected={tgt?.c.id === o.c.id} /></button>{/each}
  {#if !targets.length}<p class="muted">Aucun robot à raisonner.</p>{/if}
</div>
{#if tgt}
  {#if locked}<p class="banner bad">{nm(tgt.c)} vous a pris pour cible : impossible de l'Interagir ou de le Manipuler.</p>{/if}
  {#if canManip && !living}
    <div class="chips"><button class="chip" aria-pressed={prog === 'interaction'} onclick={() => (prog = 'interaction')}>Interaction</button><button class="chip" aria-pressed={prog === '__special'} onclick={() => (prog = '__special')}>Manipuler (sans Hiérarchie)</button></div>
  {/if}
  {#if !manip}
    <div class="pair">
      <div class="h"><span>Hiérarchie de {nm(actor.c)}</span><Stepper value={hA} min={0} max={12} label="hiérarchie de {nm(actor.c)}" onchange={(v) => (hA = v)} size="sm" /></div>
      <div class="h"><span>Hiérarchie de {nm(tgt.c)}</span><Stepper value={hB} min={0} max={12} label="hiérarchie de {nm(tgt.c)}" onchange={(v) => (hB = v)} size="sm" /></div>
    </div>
    <p class="hint">{diff > 0 ? `+${diff} pour vous` : diff < 0 ? `+${-diff} pour ${nm(tgt.c)}` : 'Même rang : pas de bonus'} (+1 par cran d'écart).</p>
  {/if}
  <span class="lbl">Base logique : +1 pour vous</span>
  <div class="chips">{#each PROS as p (p)}<button class="chip" aria-pressed={pros.includes(p)} onclick={() => (pros = toggle(pros, p))}>{p}</button>{/each}</div>
  <span class="lbl">+1 pour {nm(tgt.c)}</span>
  <div class="chips">{#each CONS as p (p)}<button class="chip" aria-pressed={cons.includes(p)} onclick={() => (cons = toggle(cons, p))}>{p}</button>{/each}</div>
  <label class="tog"><input type="checkbox" checked={aware} onchange={(e) => { aware = e.currentTarget.checked; rollB = null; }} /><span>{nm(tgt.c)} {living ? 'résiste (jet opposé)' : 'est conscient de lui-même (jet opposé)'}</span></label>
  <div class="h"><span>Autre modificateur</span><Stepper value={manual} min={-6} max={6} label="modificateur" onchange={(v) => (manual = v)} size="sm" /></div>
  <p class="sum">Vous {fmtBonus(modA)}{aware ? `, ${nm(tgt.c)} ${fmtBonus(modB)}` : ''}</p>
  {#if !locked}
    {#key rkey}
      <div class="trays" class:two={aware}>
        <DiceTray cid={actor.c.id} title="{nm(actor.c)} : {manip ? 'Manipuler' : 'Interaction'}" pool={poolA} onresult={(t) => { rollA = t; spend = 0; }} />
        {#if aware && poolB}<DiceTray cid={tgt.c.id} title="{nm(tgt.c)} : {living ? 'Empathie' : 'Contestation'}" pool={poolB} onresult={(t) => { rollB = t; spend = 0; }} />{/if}
      </div>
    {/key}
  {/if}
  {#if done}
    <div class="outcome" class:hit={win}>
      <b>{win ? 'Convaincu' : 'Échec'}</b> : {rollA.successes}{aware ? ` contre ${rollB.successes}` : ''} succès.
      {#if win && extra > 0}
        <div class="h"><span>Succès en plus dépensés en erreurs système ({attrLabel(tgt.c, stuntAttr)} −1 chacun)</span><Stepper value={spend} min={0} max={extra} label="erreurs système" onchange={(v) => (spend = v)} size="sm" /></div>
      {/if}
    </div>
  {/if}
{/if}
<div class="nav">
  <button class="btn ghost" onclick={onback}>Retour</button>
  {#if done}<button class="btn primary" onclick={conclude}>Conclure<Icon name="chevron" size={18} /></button>{/if}
</div>

<style>
  .lbl { display: block; font-size: .82rem; color: var(--muted); margin-top: 4px; }
  .targets { display: flex; flex-wrap: wrap; gap: 4px; }
  .tg { display: grid; justify-items: center; background: none; border: 0; padding: 4px; border-radius: 8px; }
  .tg[aria-pressed='true'] { background: var(--hull-2); }
  .pair { display: grid; gap: 8px; }
  @media (min-width: 560px) { .pair { grid-template-columns: 1fr 1fr; } }
  .h { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: .9rem; }
  .tog { display: flex; gap: 10px; align-items: center; cursor: pointer; font-size: .92rem; }
  .tog input { width: 20px; height: 20px; accent-color: var(--amber); flex: none; }
  .sum { margin: 0; font-weight: 600; }
  .trays { display: grid; gap: 10px; }
  @media (min-width: 720px) { .trays.two { grid-template-columns: 1fr 1fr; } }
  .outcome { padding: 10px 12px; border-left: 3px solid var(--muted); background: var(--abyss); display: grid; gap: 8px; }
  .outcome.hit { border-color: var(--amber); }
  .banner { margin: 0; padding: 10px 12px; border-left: 3px solid var(--fault); background: var(--abyss); }
  .nav { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
  .nav .primary { margin-left: auto; }
</style>
