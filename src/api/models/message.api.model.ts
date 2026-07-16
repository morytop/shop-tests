/**
 * POST /messages request body (the contact form). `name`/`email` are only
 * required when the sender is not authenticated.
 */
export interface ContactPayload {
  name?: string;
  email?: string;
  subject: string;
  message: string;
}
