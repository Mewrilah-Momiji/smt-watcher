import { defineConfig } from '@playwright/test';

const PORT = 4173;

// Tests the built page, as only the build has the Content-Security-Policy and the browser versions of Node modules.
export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.e2e.ts',
  outputDir: 'test-results',
  forbidOnly: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Uses the installed browser, so no separate browser download is needed.
    channel: 'chrome',
    // No region, so that the page starts with Germany as before. en-US would start with the United States.
    locale: 'en',
  },
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
  },
});
