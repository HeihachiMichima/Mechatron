import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Builds ONE self-contained dist/index.html (scripts, styles and fonts
// inlined), so it opens by double-click, offline, or on GitHub Pages.
export default defineConfig({
  base: './',
  // The logo is imported from src/assets and inlined. pwa/ (manifest + icons for the
  // home-screen install, T16) is copied next to index.html; the page works without it.
  publicDir: 'pwa',
  plugins: [svelte(), viteSingleFile()],
  build: { assetsInlineLimit: 100000000, cssCodeSplit: false },
  // Vitest: unit tests live next to the code in src/**/__tests__; e2e/ is Playwright's.
  test: { include: ['src/**/*.test.js'], environment: 'node' }
});
