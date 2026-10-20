import { defineConfig, devices } from '@playwright/test';

const localNoProxy = [
  process.env.NO_PROXY,
  process.env.no_proxy,
  '127.0.0.1',
  'localhost',
  '::1',
]
  .filter(Boolean)
  .join(',');
process.env.NO_PROXY = localNoProxy;
process.env.no_proxy = localNoProxy;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 3,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4323',
    trace: {
      mode: 'retain-on-failure',
      snapshots: false,
      screenshots: true,
      sources: true,
    },
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command:
      'node node_modules/astro/bin/astro.mjs preview --host 127.0.0.1 --port 4323 --ignore-lock',
    url: 'http://127.0.0.1:4323/zig-docs/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
