import { BASE_URL } from '@config/env.config';
import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

// Saved logged-in session (gitignored). The `setup` project writes it; the
// `chromium-logged` project loads it so @logged specs start authenticated.
export const STORAGE_STATE = path.join(__dirname, 'tmp', 'session.json');

export default defineConfig({
  testDir: './tests',
  globalSetup: 'config/global.setup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 0,
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
    {
      name: 'chromium-logged',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      grep: /@logged/,
      testIgnore: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      grepInvert: /@logged/,
      testIgnore: /.*\.setup\.ts/,
    },
  ],
});
