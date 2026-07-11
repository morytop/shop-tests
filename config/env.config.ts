import * as dotenv from 'dotenv';
import * as path from 'path';

// Resolve `.env` by absolute path (repo root, one level up from config/) rather
// than the process cwd, so the vars load the same whether run from the CLI or
// evaluated by the IDE/Playwright extension (whose cwd may differ).
dotenv.config({ path: path.resolve(__dirname, '..', '.env'), override: true });

function requireEnvVariable(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Environment variable ${name} is not set.`);
  }
  return value;
}

export const BASE_URL = requireEnvVariable('BASE_URL');
export const API_URL = requireEnvVariable('API_URL');
export const USER_EMAIL = requireEnvVariable('USER_EMAIL');
export const USER_PASSWORD = requireEnvVariable('USER_PASSWORD');

// The seeded admin account. It is shared with every other user of the public demo
// site and must only ever be driven read-only (TEST_PLAN.md §3) — and never with a
// wrong password: lockout triggers on the 3rd failed attempt and is permanent (§20).
export const ADMIN_EMAIL = requireEnvVariable('ADMIN_EMAIL');
export const ADMIN_PASSWORD = requireEnvVariable('ADMIN_PASSWORD');
