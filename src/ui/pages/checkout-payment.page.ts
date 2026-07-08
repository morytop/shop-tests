import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { NavbarComponent } from '@src/ui/components/navbar.component';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

/**
 * The "Payment" step of the checkout wizard (`/checkout`), reached by advancing
 * past the billing address step (`proceed-3`) — `goto()` lands on the cart step,
 * not here, like the other wizard page objects. The whole step is one Angular
 * reactive `FormGroup`: a `payment-method` `<select>` reveals a method-specific
 * sub-form (each behind an `@if`, so switching method removes the previous
 * method's inputs from the DOM), and the "Confirm" button (`finish`) is disabled
 * until the form is valid. Validation errors surface as visible
 * `.alert.alert-danger` text only once a control is dirty/touched (test_plan.md
 * §17). Locators/validators mirror the pinned v5.0 source `checkout/payment`.
 */
export class CheckoutPaymentPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.CHECKOUT;
  readonly bookmarks: NavbarComponent;
  readonly heading: Locator;
  readonly paymentMethodSelect: Locator;
  readonly paymentMethodOptions: Locator;
  readonly finishButton: Locator;

  // Bank Transfer sub-form.
  readonly bankNameInput: Locator;
  readonly accountNameInput: Locator;
  readonly accountNumberInput: Locator;
  readonly bankNameError: Locator;
  readonly accountNameError: Locator;
  readonly accountNumberError: Locator;

  // Credit Card sub-form.
  readonly creditCardNumberInput: Locator;
  readonly expirationDateInput: Locator;
  readonly cvvInput: Locator;
  readonly cardHolderNameInput: Locator;
  readonly creditCardNumberError: Locator;
  readonly expirationFormatError: Locator;
  readonly expirationPastError: Locator;
  readonly cvvError: Locator;

  // Gift Card sub-form.
  readonly giftCardNumberInput: Locator;
  readonly validationCodeInput: Locator;
  readonly giftCardNumberError: Locator;
  readonly validationCodeError: Locator;

  // Buy Now Pay Later sub-form.
  readonly monthlyInstallmentsSelect: Locator;
  readonly monthlyInstallmentsOptions: Locator;

  // Order placement (test_plan.md §18): the first "Confirm" click runs the payment
  // check and reveals the success message; the second places the order and renders
  // the confirmation with the invoice number.
  readonly paymentSuccessMessage: Locator;
  readonly orderConfirmation: Locator;

  constructor(page: Page) {
    super(page);
    this.bookmarks = new NavbarComponent(this.page);
    this.heading = this.page.getByRole('heading', { name: 'Payment' });
    this.paymentMethodSelect = this.page.locator(
      '[data-test="payment-method"]',
    );
    this.paymentMethodOptions = this.paymentMethodSelect.locator('option');
    this.finishButton = this.page.locator('[data-test="finish"]');

    this.bankNameInput = this.page.locator('[data-test="bank_name"]');
    this.accountNameInput = this.page.locator('[data-test="account_name"]');
    this.accountNumberInput = this.page.locator('[data-test="account_number"]');
    this.bankNameError = this.page.getByText(
      'Bank name can only contain letters and spaces.',
    );
    this.accountNameError = this.page.getByText(
      'Account name can contain letters, numbers, spaces, periods, apostrophes, and hyphens.',
    );
    this.accountNumberError = this.page.getByText(
      'Account number must be numeric.',
    );

    this.creditCardNumberInput = this.page.locator(
      '[data-test="credit_card_number"]',
    );
    this.expirationDateInput = this.page.locator(
      '[data-test="expiration_date"]',
    );
    this.cvvInput = this.page.locator('[data-test="cvv"]');
    this.cardHolderNameInput = this.page.locator(
      '[data-test="card_holder_name"]',
    );
    this.creditCardNumberError = this.page.getByText(
      'Invalid card number format.',
    );
    this.expirationFormatError = this.page.getByText(
      'Invalid date format. Use MM/YYYY.',
    );
    this.expirationPastError = this.page.getByText(
      'Expiration date must be in the future.',
    );
    this.cvvError = this.page.getByText('CVV must be 3 or 4 digits.');
    // NOTE: the card-holder field has no error message on production — a pattern
    // violation renders an empty `.alert-danger` box (the template only prints text
    // for a `required` error, but the field is pattern-only). So its invalidity is
    // asserted via the input's `ng-invalid` class + the disabled Confirm button,
    // not visible text (test_plan.md §17).

    this.giftCardNumberInput = this.page.locator(
      '[data-test="gift_card_number"]',
    );
    this.validationCodeInput = this.page.locator(
      '[data-test="validation_code"]',
    );
    // Production has diverged from the pinned v5.0 source (test_plan.md §17): the
    // gift card number must be exactly 16 letters/digits and the validation code
    // exactly 4 (the code input also carries maxlength=4), each with its own newer
    // message — not the source's "must be alphanumeric." copy.
    this.giftCardNumberError = this.page.getByText(
      'Please enter a valid gift card number: exactly 16 letters and/or digits.',
    );
    this.validationCodeError = this.page.getByText(
      'Please enter a valid validation code: exactly 4 letters and/or digits.',
    );

    this.monthlyInstallmentsSelect = this.page.locator(
      '[data-test="monthly_installments"]',
    );
    this.monthlyInstallmentsOptions =
      this.monthlyInstallmentsSelect.locator('option');

    this.paymentSuccessMessage = this.page.locator(
      '[data-test="payment-success-message"]',
    );
    // The confirmation banner has no data-test, only an id.
    this.orderConfirmation = this.page.locator('#order-confirmation');
  }

  async selectPaymentMethod(value: string): Promise<void> {
    await this.paymentMethodSelect.selectOption(value);
  }

  // Errors surface only once a control is dirty/touched, so each fill is followed
  // by a blur to mark the field touched (fill alone leaves untouched-but-invalid
  // required fields showing no error).
  private async fillAndBlur(field: Locator, value: string): Promise<void> {
    await field.fill(value);
    await field.blur();
  }

  async fillBankTransfer(
    bankName: string,
    accountName: string,
    accountNumber: string,
  ): Promise<void> {
    await this.fillAndBlur(this.bankNameInput, bankName);
    await this.fillAndBlur(this.accountNameInput, accountName);
    await this.fillAndBlur(this.accountNumberInput, accountNumber);
  }

  async fillCreditCard(
    cardNumber: string,
    expiration: string,
    cvv: string,
    holderName: string,
  ): Promise<void> {
    await this.fillAndBlur(this.creditCardNumberInput, cardNumber);
    await this.fillAndBlur(this.expirationDateInput, expiration);
    await this.fillAndBlur(this.cvvInput, cvv);
    await this.fillAndBlur(this.cardHolderNameInput, holderName);
  }

  async fillGiftCard(
    cardNumber: string,
    validationCode: string,
  ): Promise<void> {
    await this.fillAndBlur(this.giftCardNumberInput, cardNumber);
    await this.fillAndBlur(this.validationCodeInput, validationCode);
  }

  async selectMonthlyInstallments(value: string): Promise<void> {
    await this.monthlyInstallmentsSelect.selectOption(value);
  }

  /**
   * Place the order via the two-step Confirm: the first click runs the payment
   * check (waits for the success message), the second submits the order (waits for
   * the confirmation banner). Assertions on the invoice number / cart stay in the
   * spec — this only synchronizes on each step landing (test_plan.md §18).
   */
  async confirmOrder(): Promise<void> {
    await this.finishButton.click();
    await this.paymentSuccessMessage.waitFor();
    await this.finishButton.click();
    await this.orderConfirmation.waitFor();
  }
}
