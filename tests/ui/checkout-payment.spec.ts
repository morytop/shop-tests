import { expect, test } from '@src/merge.fixture';

// User Stories v5 — Checkout Payment (test_plan.md §5.8). The Payment step is the
// last wizard step, reached by advancing a guest through cart → sign-in → billing
// address (the `reachPaymentAsGuest` action fixture). The whole step is one Angular
// reactive form: a `payment-method` <select> reveals a method-specific sub-form
// (each behind an @if, so switching method removes the previous method's inputs),
// and the "Confirm" button stays disabled until the form is valid. Per-field
// validators and exact error copy were live-verified; §17 records where production
// has drifted ahead of the pinned v5.0 source (gift-card rules, card-holder copy).
// This pass covers the method dropdown + per-method field validation + form reset;
// placing a real order is deliberately out of scope (would write invoices to shared
// prod data). Products are chosen dynamically (§3, §9); see
// .ai-docs/checkout-payment-plan.md.

test.describe('Verify checkout payment step', () => {
  // AC1 — the method dropdown offers exactly the five documented payment methods,
  // and the form is invalid (Confirm disabled) until one is chosen.
  test(
    'payment method dropdown offers the five payment methods',
    { tag: ['@checkout', '@regression'] },
    async ({ reachPaymentAsGuest, checkoutPaymentPage }) => {
      await reachPaymentAsGuest();

      await expect(checkoutPaymentPage.heading).toBeVisible();
      await expect(checkoutPaymentPage.paymentMethodOptions).toHaveText([
        'Choose your payment method',
        'Bank Transfer',
        'Cash on Delivery',
        'Credit Card',
        'Buy Now Pay Later',
        'Gift Card',
      ]);
      await expect(checkoutPaymentPage.finishButton).toBeDisabled();
    },
  );

  // AC7 — Cash on Delivery adds no fields and leaves the form immediately valid.
  test(
    'cash on delivery needs no extra details and enables confirming',
    { tag: ['@checkout', '@regression'] },
    async ({ reachPaymentAsGuest, checkoutPaymentPage }) => {
      await reachPaymentAsGuest();

      await checkoutPaymentPage.selectPaymentMethod('cash-on-delivery');

      await expect(checkoutPaymentPage.bankNameInput).toBeHidden();
      await expect(checkoutPaymentPage.creditCardNumberInput).toBeHidden();
      await expect(checkoutPaymentPage.finishButton).toBeEnabled();
    },
  );

  // AC2 — Bank Transfer: bank name letters/spaces only, account name alphanumeric
  // plus . ' -, account number digits only. One negative test per field.
  test(
    'bank transfer rejects a bank name containing digits',
    { tag: ['@checkout', '@regression'] },
    async ({ reachPaymentAsGuest, checkoutPaymentPage }) => {
      await reachPaymentAsGuest();
      await checkoutPaymentPage.selectPaymentMethod('bank-transfer');

      await checkoutPaymentPage.bankNameInput.fill('Bank 123');
      await checkoutPaymentPage.bankNameInput.blur();

      await expect(checkoutPaymentPage.bankNameError).toBeVisible();
      await expect(checkoutPaymentPage.finishButton).toBeDisabled();
    },
  );

  test(
    'bank transfer rejects a disallowed character in the account name',
    { tag: ['@checkout', '@regression'] },
    async ({ reachPaymentAsGuest, checkoutPaymentPage }) => {
      await reachPaymentAsGuest();
      await checkoutPaymentPage.selectPaymentMethod('bank-transfer');

      await checkoutPaymentPage.accountNameInput.fill('Acc@unt');
      await checkoutPaymentPage.accountNameInput.blur();

      await expect(checkoutPaymentPage.accountNameError).toBeVisible();
      await expect(checkoutPaymentPage.finishButton).toBeDisabled();
    },
  );

  test(
    'bank transfer rejects a non-numeric account number',
    { tag: ['@checkout', '@regression'] },
    async ({ reachPaymentAsGuest, checkoutPaymentPage }) => {
      await reachPaymentAsGuest();
      await checkoutPaymentPage.selectPaymentMethod('bank-transfer');

      await checkoutPaymentPage.accountNumberInput.fill('12ab34');
      await checkoutPaymentPage.accountNumberInput.blur();

      await expect(checkoutPaymentPage.accountNumberError).toBeVisible();
      await expect(checkoutPaymentPage.finishButton).toBeDisabled();
    },
  );

  test(
    'bank transfer with valid details clears errors and enables confirming',
    { tag: ['@checkout', '@regression'] },
    async ({ reachPaymentAsGuest, checkoutPaymentPage }) => {
      await reachPaymentAsGuest();
      await checkoutPaymentPage.selectPaymentMethod('bank-transfer');
      await expect(checkoutPaymentPage.finishButton).toBeDisabled();

      await checkoutPaymentPage.fillBankTransfer(
        'National Bank',
        "O'Brien-Smith Trading 12.",
        '12345678',
      );

      await expect(checkoutPaymentPage.bankNameError).toBeHidden();
      await expect(checkoutPaymentPage.accountNameError).toBeHidden();
      await expect(checkoutPaymentPage.accountNumberError).toBeHidden();
      await expect(checkoutPaymentPage.finishButton).toBeEnabled();
    },
  );

  // AC3 — Credit Card: number XXXX-XXXX-XXXX-XXXX, CVV 3–4 digits, holder name
  // letters/spaces only. (These fields are pattern-only, not required, per §17.)
  test(
    'credit card rejects a malformed card number',
    { tag: ['@checkout', '@regression'] },
    async ({ reachPaymentAsGuest, checkoutPaymentPage }) => {
      await reachPaymentAsGuest();
      await checkoutPaymentPage.selectPaymentMethod('credit-card');

      await checkoutPaymentPage.creditCardNumberInput.fill('1234567890123456');
      await checkoutPaymentPage.creditCardNumberInput.blur();

      await expect(checkoutPaymentPage.creditCardNumberError).toBeVisible();
      await expect(checkoutPaymentPage.finishButton).toBeDisabled();
    },
  );

  test(
    'credit card rejects a CVV that is not 3 to 4 digits',
    { tag: ['@checkout', '@regression'] },
    async ({ reachPaymentAsGuest, checkoutPaymentPage }) => {
      await reachPaymentAsGuest();
      await checkoutPaymentPage.selectPaymentMethod('credit-card');

      await checkoutPaymentPage.cvvInput.fill('12');
      await checkoutPaymentPage.cvvInput.blur();

      await expect(checkoutPaymentPage.cvvError).toBeVisible();
      await expect(checkoutPaymentPage.finishButton).toBeDisabled();
    },
  );

  // The card-holder field is pattern-only and shows no error text on production —
  // a violation only turns the input ng-invalid and disables Confirm (§17).
  test(
    'credit card rejects a holder name containing digits',
    { tag: ['@checkout', '@regression'] },
    async ({ reachPaymentAsGuest, checkoutPaymentPage }) => {
      await reachPaymentAsGuest();
      await checkoutPaymentPage.selectPaymentMethod('credit-card');

      await checkoutPaymentPage.cardHolderNameInput.fill('John3 Doe');
      await checkoutPaymentPage.cardHolderNameInput.blur();

      await expect(checkoutPaymentPage.cardHolderNameInput).toHaveClass(
        /ng-invalid/,
      );
      await expect(checkoutPaymentPage.finishButton).toBeDisabled();
    },
  );

  test(
    'credit card rejects a malformed expiration date',
    { tag: ['@checkout', '@regression'] },
    async ({ reachPaymentAsGuest, checkoutPaymentPage }) => {
      await reachPaymentAsGuest();
      await checkoutPaymentPage.selectPaymentMethod('credit-card');

      await checkoutPaymentPage.expirationDateInput.fill('13/2030');
      await checkoutPaymentPage.expirationDateInput.blur();

      await expect(checkoutPaymentPage.expirationFormatError).toBeVisible();
      await expect(checkoutPaymentPage.finishButton).toBeDisabled();
    },
  );

  // AC4 — a past (but well-formed) expiration date shows the dedicated message.
  test(
    'credit card rejects a past expiration date',
    { tag: ['@checkout', '@regression'] },
    async ({ reachPaymentAsGuest, checkoutPaymentPage }) => {
      await reachPaymentAsGuest();
      await checkoutPaymentPage.selectPaymentMethod('credit-card');

      await checkoutPaymentPage.expirationDateInput.fill('01/2020');
      await checkoutPaymentPage.expirationDateInput.blur();

      await expect(checkoutPaymentPage.expirationPastError).toBeVisible();
      await expect(checkoutPaymentPage.finishButton).toBeDisabled();
    },
  );

  test(
    'credit card with valid details clears errors and enables confirming',
    { tag: ['@checkout', '@regression'] },
    async ({ reachPaymentAsGuest, checkoutPaymentPage }) => {
      await reachPaymentAsGuest();
      await checkoutPaymentPage.selectPaymentMethod('credit-card');
      await checkoutPaymentPage.creditCardNumberInput.fill('1234567890123456');
      await checkoutPaymentPage.creditCardNumberInput.blur();
      await expect(checkoutPaymentPage.finishButton).toBeDisabled();

      await checkoutPaymentPage.fillCreditCard(
        '1234-5678-9012-3456',
        '12/2030',
        '123',
        'John Doe',
      );

      await expect(checkoutPaymentPage.creditCardNumberError).toBeHidden();
      await expect(checkoutPaymentPage.expirationFormatError).toBeHidden();
      await expect(checkoutPaymentPage.expirationPastError).toBeHidden();
      await expect(checkoutPaymentPage.cvvError).toBeHidden();
      await expect(checkoutPaymentPage.cardHolderNameInput).not.toHaveClass(
        /ng-invalid/,
      );
      await expect(checkoutPaymentPage.finishButton).toBeEnabled();
    },
  );

  // AC6 — Gift Card: gift card number + validation code, both required. On
  // production the rule is stricter than the docs — exactly 16 and exactly 4
  // letters/digits respectively (the code input also caps at maxlength=4), §17.
  test(
    'gift card rejects a non-alphanumeric gift card number',
    { tag: ['@checkout', '@regression'] },
    async ({ reachPaymentAsGuest, checkoutPaymentPage }) => {
      await reachPaymentAsGuest();
      await checkoutPaymentPage.selectPaymentMethod('gift-card');

      await checkoutPaymentPage.giftCardNumberInput.fill('ABC-123');
      await checkoutPaymentPage.giftCardNumberInput.blur();

      await expect(checkoutPaymentPage.giftCardNumberError).toBeVisible();
      await expect(checkoutPaymentPage.finishButton).toBeDisabled();
    },
  );

  test(
    'gift card rejects a non-alphanumeric validation code',
    { tag: ['@checkout', '@regression'] },
    async ({ reachPaymentAsGuest, checkoutPaymentPage }) => {
      await reachPaymentAsGuest();
      await checkoutPaymentPage.selectPaymentMethod('gift-card');

      // maxlength=4 caps the input, so use a 4-char value with a disallowed
      // character (a longer string would be truncated to a valid one).
      await checkoutPaymentPage.validationCodeInput.fill('A-1B');
      await checkoutPaymentPage.validationCodeInput.blur();

      await expect(checkoutPaymentPage.validationCodeError).toBeVisible();
      await expect(checkoutPaymentPage.finishButton).toBeDisabled();
    },
  );

  test(
    'gift card with valid details clears errors and enables confirming',
    { tag: ['@checkout', '@regression'] },
    async ({ reachPaymentAsGuest, checkoutPaymentPage }) => {
      await reachPaymentAsGuest();
      await checkoutPaymentPage.selectPaymentMethod('gift-card');
      await expect(checkoutPaymentPage.finishButton).toBeDisabled();

      await checkoutPaymentPage.fillGiftCard('ABC123DEF4567890', 'AB12');

      await expect(checkoutPaymentPage.giftCardNumberError).toBeHidden();
      await expect(checkoutPaymentPage.validationCodeError).toBeHidden();
      await expect(checkoutPaymentPage.finishButton).toBeEnabled();
    },
  );

  // AC5 — Buy Now Pay Later offers 3/6/9/12 monthly installments and requires a
  // selection before confirming.
  test(
    'buy now pay later offers 3, 6, 9 and 12 monthly installments',
    { tag: ['@checkout', '@regression'] },
    async ({ reachPaymentAsGuest, checkoutPaymentPage }) => {
      await reachPaymentAsGuest();

      await checkoutPaymentPage.selectPaymentMethod('buy-now-pay-later');

      await expect(checkoutPaymentPage.monthlyInstallmentsOptions).toHaveText([
        'Choose your monthly installments',
        '3 Monthly Installments',
        '6 Monthly Installments',
        '9 Monthly Installments',
        '12 Monthly Installments',
      ]);
      await expect(checkoutPaymentPage.finishButton).toBeDisabled();

      await checkoutPaymentPage.selectMonthlyInstallments('6');

      await expect(checkoutPaymentPage.finishButton).toBeEnabled();
    },
  );

  // AC8 — switching payment method drops the previous method's inputs and errors,
  // showing only the new method's fields (no stale values/errors carried over).
  test(
    'switching payment method clears the previous method fields and errors',
    { tag: ['@checkout', '@regression'] },
    async ({ reachPaymentAsGuest, checkoutPaymentPage }) => {
      await reachPaymentAsGuest();
      await checkoutPaymentPage.selectPaymentMethod('bank-transfer');
      await checkoutPaymentPage.bankNameInput.fill('Bank 123');
      await checkoutPaymentPage.bankNameInput.blur();
      await expect(checkoutPaymentPage.bankNameError).toBeVisible();

      await checkoutPaymentPage.selectPaymentMethod('credit-card');

      await expect(checkoutPaymentPage.bankNameInput).toBeHidden();
      await expect(checkoutPaymentPage.bankNameError).toBeHidden();
      await expect(checkoutPaymentPage.creditCardNumberInput).toBeVisible();
    },
  );
});
