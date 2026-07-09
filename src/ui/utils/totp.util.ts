import { createGuardrails, generateSync } from 'otplib';

/**
 * The API mints its TOTP secret with `pragmarx/google2fa`, which emits 16 base32
 * characters — 80 bits, or 10 bytes. otplib v13 refuses secrets under its 128-bit
 * floor, so that one guardrail is relaxed to match the server. The remaining
 * parameters (SHA1, 6 digits, 30s period) are otplib's defaults and already agree
 * with the `otpauth://` URI the app provisions.
 */
const APP_SECRET_GUARDRAILS = createGuardrails({ MIN_SECRET_BYTES: 10 });

/**
 * Derive the current 6-digit code for a TOTP secret. Codes rotate every 30s, so
 * call this immediately before submitting rather than caching the result.
 */
export function generateTotpCode(secret: string): string {
  return generateSync({ secret, guardrails: APP_SECRET_GUARDRAILS });
}
