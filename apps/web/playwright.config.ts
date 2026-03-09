import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env['CI'];

/**
 * Playwright E2E test configuration for SavSpot web app.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  reporter: process.env['CI'] ? 'github' : 'html',
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    /* ---------- Setup ---------- */
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    /* ---------- Desktop Chrome ---------- */
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    /* ---------- Mobile Chrome ---------- */
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  /* Start the API and Next.js servers before tests run */
  webServer: [
    {
      command: isCI
        ? 'node apps/api/dist/main'
        : 'pnpm --filter @savspot/api dev',
      url: 'http://localhost:3001/api',
      reuseExistingServer: !isCI,
      timeout: 120_000,
      cwd: process.cwd().replace(/\/apps\/web$/, ''),
      env: {
        DATABASE_URL: process.env['DATABASE_URL'] ?? 'postgresql://savspot:savspot_dev@localhost:5432/savspot_dev',
        REDIS_URL: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
        WEB_URL: 'http://localhost:3000',
        NODE_ENV: 'test',
        PORT: '3001',
      },
    },
    {
      command: isCI ? 'pnpm start' : 'pnpm dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
  ],
});
