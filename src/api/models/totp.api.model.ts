/** POST /totp/setup response body — field names match the API verbatim. */
export interface TotpSetupResponse {
  secret: string;
  qrCodeUrl: string;
}

/** A disposable account with TOTP already enabled, plus the secret to derive codes. */
export interface TotpEnabledUser {
  email: string;
  password: string;
  secret: string;
}
