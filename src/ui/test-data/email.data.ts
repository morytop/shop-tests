/**
 * Email-format boundary cases shared by the register and forgot-password specs —
 * both forms validate the address with the same Angular pattern validator.
 */

/** RFC-format boundary cases rejected by the email pattern validator. */
export const INVALID_EMAILS = ['plainaddress', 'foo@', '@example.com'];

/** Valid edge cases the pattern accepts. */
export const VALID_EMAILS = ['a@b.co', 'first.last+tag@sub.example.com'];
