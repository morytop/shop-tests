import * as dotenv from 'dotenv';
import * as path from 'path';

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

export const ADMIN_EMAIL = requireEnvVariable('ADMIN_EMAIL');
export const ADMIN_PASSWORD = requireEnvVariable('ADMIN_PASSWORD');
