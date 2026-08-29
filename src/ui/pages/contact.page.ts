import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { ContactSubject } from '@src/ui/test-data/contact.data';
import { PAGE_URLS } from '@src/ui/utils/page-urls.util';

export class ContactPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.CONTACT;
  readonly heading: Locator;
  readonly subjectSelect: Locator;
  readonly messageInput: Locator;
  readonly attachmentInput: Locator;
  readonly submitButton: Locator;
  readonly confirmationMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Contact' });
    this.subjectSelect = page.getByTestId('subject');
    this.messageInput = page.getByTestId('message');
    this.attachmentInput = page.getByTestId('attachment');
    this.submitButton = page.getByTestId('contact-submit');
    this.confirmationMessage = page.getByRole('alert');
  }

  async sendMessage(subject: ContactSubject, message: string): Promise<void> {
    await this.subjectSelect.selectOption(subject);
    await this.messageInput.fill(message);
    await this.submitButton.click();
  }
}
