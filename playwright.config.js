// Playwright: smoke test of the built single file (run `npm run build` first).
// On a PC, install the browser once with `npx playwright install chromium`.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'e2e/results',
  reporter: 'list',
  use: { browserName: 'chromium' }
});
