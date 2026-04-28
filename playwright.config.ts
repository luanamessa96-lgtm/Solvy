import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'https://solvyapp.com',
    headless: true,
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro
    locale: 'it-IT',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  reporter: [['list']],
});
