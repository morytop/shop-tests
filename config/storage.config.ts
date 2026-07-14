import * as path from 'path';

// Saved logged-in session (gitignored). The `setup` project writes it; the
// `chromium-logged` project loads it so @logged specs start authenticated.
export const STORAGE_STATE = path.join(__dirname, '..', 'tmp', 'session.json');

// Credentials of the user the `setup` project registered for the @logged session.
// The API mints JWTs with a 5-minute TTL, so a saved token alone goes stale
// mid-run — the logged-session fixture re-logs-in with these to mint a fresh one.
export const SESSION_USER = path.join(
  __dirname,
  '..',
  'tmp',
  'session-user.json',
);
