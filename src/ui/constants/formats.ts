export const USD_PRICE_REGEX = /^\$\d+\.\d{2}$/;

export const BARE_PRICE_REGEX = /^\d+\.\d{2}$/;

export const TOTP_SECRET_REGEX = /^[A-Z2-7]{16}$/;

export const ORDER_CONFIRMATION_REGEX =
  /Thanks for your order! Your invoice number is INV-\d+\./;

export const strengthBarWidthRegex = (width: string): RegExp =>
  new RegExp(`width:\\s*${width};`);
