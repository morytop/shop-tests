import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { ORDER_CONFIRMATION_REGEX } from '@src/ui/constants/formats';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { PaymentMethod } from '@src/ui/models/payment.model';

/**
 * The "Payment" step of the checkout wizard (`/checkout`), reached by advancing
 * past the billing address step
 */
export class CheckoutPaymentPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.CHECKOUT;
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

  // Order placement
  readonly paymentSuccessMessage: Locator;
  readonly orderConfirmation: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.page.getByRole('heading', { name: 'Payment' });
    this.paymentMethodSelect = this.page.getByTestId('payment-method');
    this.paymentMethodOptions = this.paymentMethodSelect.getByRole('option');
    this.finishButton = this.page.getByTestId('finish');

    this.bankNameInput = this.page.getByTestId('bank_name');
    this.accountNameInput = this.page.getByTestId('account_name');
    this.accountNumberInput = this.page.getByTestId('account_number');
    this.bankNameError = this.page.getByText(
      'Bank name can only contain letters and spaces.',
    );
    this.accountNameError = this.page.getByText(
      'Account name can contain letters, numbers, spaces, periods, apostrophes, and hyphens.',
    );
    this.accountNumberError = this.page.getByText(
      'Account number must be numeric.',
    );

    this.creditCardNumberInput = this.page.getByTestId('credit_card_number');
    this.expirationDateInput = this.page.getByTestId('expiration_date');
    this.cvvInput = this.page.getByTestId('cvv');
    this.cardHolderNameInput = this.page.getByTestId('card_holder_name');
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
    this.giftCardNumberInput = this.page.getByTestId('gift_card_number');
    this.validationCodeInput = this.page.getByTestId('validation_code');
    this.giftCardNumberError = this.page.getByText(
      'Please enter a valid gift card number: exactly 16 letters and/or digits.',
    );
    this.validationCodeError = this.page.getByText(
      'Please enter a valid validation code: exactly 4 letters and/or digits.',
    );

    this.monthlyInstallmentsSelect = this.page.getByTestId(
      'monthly_installments',
    );
    this.monthlyInstallmentsOptions =
      this.monthlyInstallmentsSelect.getByRole('option');

    this.paymentSuccessMessage = this.page.getByTestId(
      'payment-success-message',
    );
    this.orderConfirmation = this.page.getByText(ORDER_CONFIRMATION_REGEX);
  }

  async selectPaymentMethod(value: PaymentMethod): Promise<void> {
    await this.paymentMethodSelect.selectOption(value);
  }

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

  async confirmOrder(): Promise<void> {
    await this.finishButton.click();
    await this.paymentSuccessMessage.waitFor();
    await this.finishButton.click();
    await this.orderConfirmation.waitFor();
  }

  async readInvoiceNumber(): Promise<string> {
    const text = await this.orderConfirmation.innerText();
    const match = text.match(/INV-\d+/);
    return match ? match[0] : '';
  }
}
