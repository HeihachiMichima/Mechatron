<script>
  // LED-style meter: `current` lit cells out of `max`; cells between current
  // and max are drawn as faults (damaged). Optional onset makes cells tappable.
  let { max, current, tone = 'amber', size = 'md', onset = null, label = '' } = $props();
  const cells = $derived(Array.from({ length: Math.max(0, max) }, (_, i) => i + 1));
</script>

{#if onset}
  <div class="seg {size} {tone}" role="group" aria-label={label}>
    {#each cells as i (i)}
      <button type="button" class="cell" class:on={i <= current} class:fault={i > current}
        aria-label="{label} à {i}" onclick={() => onset(i === current ? i - 1 : i)}></button>
    {/each}
  </div>
{:else}
  <div class="seg {size} {tone}" aria-hidden="true">
    {#each cells as i (i)}<span class="cell" class:on={i <= current} class:fault={i > current}></span>{/each}
  </div>
{/if}

<style>
  .seg { display: flex; gap: 3px; }
  .cell { flex: 1 1 0; min-width: 0; height: 8px; border: 0; padding: 0; border-radius: 1px; background: var(--line); }
  .md .cell { height: 26px; border-radius: 2px; max-width: 34px; }
  .sm .cell { height: 6px; }
  button.cell { cursor: pointer; }
  .amber .on { background: var(--amber); box-shadow: 0 0 8px color-mix(in srgb, var(--amber) 45%, transparent); }
  .coolant .on { background: var(--coolant); box-shadow: 0 0 8px color-mix(in srgb, var(--coolant) 45%, transparent); }
  .steel .on { background: var(--muted); }
  .fault { background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--fault) 70%, transparent) 0 3px, transparent 3px 6px); box-shadow: inset 0 0 0 1px var(--fault); }
  .coolant .fault, .steel .fault { background: transparent; box-shadow: inset 0 0 0 1px var(--line); }
</style>
