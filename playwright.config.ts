import { BASE_URL } from '@config/env.config';
import { STORAGE_STATE } from '@config/storage.config';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  globalSetup: 'config/global.setup.ts',
  // Sized for the shared prod backend under parallel load (§33): order-placing
  // specs chain many round-trips whose cumulative latency legitimately exceeds
  // 60s when several workers place orders at once.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  // Safety net for the one flake class code can't fix: the shared prod backend
  // intermittently 500s mid-flow (§33) on requests the app itself drives (UI
  // login, product-detail fetch), where no wait or in-code retry can recover.
  // Investigate any spec that passes only on retry before blaming the backend.
  retries: 1,
  workers: undefined,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    testIdAttribute: 'data-test',
    actionTimeout: 0,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // API specs run browserless (nothing requests a page fixture) and as their
    // own unit: `npx playwright test --project=api`.
    {
      name: 'api',
      testMatch: 'tests/api/**/*.spec.ts',
    },
    {
      name: 'chromium-logged',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      grep: /@logged/,
      testIgnore: ['**/*.setup.ts', 'tests/api/**'],
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      grepInvert: /@logged/,
      testIgnore: ['**/*.setup.ts', 'tests/api/**'],
    },
  ],
});
