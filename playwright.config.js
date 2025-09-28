// playwright.config.js
// Central Playwright configuration with dynamic base URL
// Priority: process.env.UI_BASE_URL > process.env.BASE_URL > default http://localhost:3006
const { defineConfig } = require('@playwright/test');

const DEFAULT_BASE_URL = 'http://localhost:3006';
const BASE_URL = process.env.UI_BASE_URL || process.env.BASE_URL || DEFAULT_BASE_URL;

console.log(`[Playwright] Using baseURL: ${BASE_URL}`);

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 10000 },
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'on-first-retry'
  },
  reporter: [ ['html'], ['list'] ],
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 }
      }
    }
  ]
});