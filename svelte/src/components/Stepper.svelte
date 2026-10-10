<script>
  import Icon from './Icon.svelte';
  let { value, min = 0, max = 99, step = 1, label = '', onchange, size = 'md', bare = false } = $props();
  const set = (v) => { const n = Math.max(min, Math.min(max, v)); if (n !== value) onchange(n); };
</script>

<div class="stepper {size}" class:bare role="group" aria-label={label}>
  <button type="button" aria-label="Diminuer {label}" disabled={value <= min} onclick={() => set(value - step)}><Icon name="minus" size={18} /></button>
  {#if !bare}<output class="num" aria-live="polite">{value}</output>{:else}<span class="div" aria-hidden="true"></span>{/if}
  <button type="button" aria-label="Augmenter {label}" disabled={value >= max} onclick={() => set(value + step)}><Icon name="plus" size={18} /></button>
</div>

<style>
  .stepper { display: inline-flex; align-items: stretch; border: 1px solid var(--line); border-radius: 4px; background: var(--abyss); flex: none; }
  button { width: 40px; min-height: 40px; display: grid; place-items: center; background: none; border: 0; color: var(--text); }
  button:disabled { opacity: .3; cursor: default; }
  button:not(:disabled):active { background: var(--hull-2); }
  output { min-width: 2ch; display: grid; place-items: center; font-size: 1.15rem; font-weight: 600; padding: 0 2px; }
  .sm button { width: 38px; min-height: 38px; }
  .div { width: 1px; background: var(--line); margin: 6px 0; }
  .sm output { font-size: 1rem; }
</style>
