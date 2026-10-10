import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Builds ONE self-contained dist/index.html (scripts, styles and fonts
// inlined), so it opens by double-click, offline, or on GitHub Pages.
export default defineConfig({
  base: './',
  // Nothing is copied next to the build: the logo is imported from src/assets and inlined.
  publicDir: false,
  plugins: [svelte(), viteSingleFile()],
  build: { assetsInlineLimit: 100000000, cssCodeSplit: false }
});
