<script>
  // Rules reminder, one colored section per topic (close combat and shooting apart).
  import { GAME_DATA as D } from '../lib/data.js';
  let { only = null } = $props();
  const sections = $derived(only ? D.combatGuide.filter((s) => only.includes(s.id)) : D.combatGuide);
</script>

<div class="guide">
  {#each sections as s (s.id)}
    <details class="sec {s.tone}" open={!!only}>
      <summary><span class="bar" aria-hidden="true"></span>{s.title}</summary>
      <dl>
        {#each s.items as it (it.h)}<dt>{it.h}</dt><dd>{it.t}</dd>{/each}
      </dl>
    </details>
  {/each}
</div>

<style>
  .guide { display: grid; gap: 6px; }
  .sec { background: var(--abyss); border: 1px solid var(--line); border-radius: 4px; --tone: var(--muted); }
  .sec.amber { --tone: var(--amber); }
  .sec.fault { --tone: var(--fault); }
  .sec.coolant { --tone: var(--coolant); }
  .sec.steel { --tone: var(--text); }
  summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 10px; padding: 10px 12px; font-family: var(--display); font-weight: 700; font-size: 1rem; color: var(--tone); min-height: 44px; }
  summary::-webkit-details-marker { display: none; }
  summary::after { content: '+'; margin-left: auto; color: var(--muted); font-weight: 500; }
  details[open] summary::after { content: '−'; }
  .bar { width: 4px; align-self: stretch; background: var(--tone); border-radius: 2px; }
  dl { margin: 0; padding: 0 12px 12px 26px; display: grid; gap: 2px 0; }
  dt { font-weight: 600; font-size: .9rem; margin-top: 8px; color: var(--text); }
  dd { margin: 0; font-size: .88rem; color: var(--muted); line-height: 1.45; }
</style>
