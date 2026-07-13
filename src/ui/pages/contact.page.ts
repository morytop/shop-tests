import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { NavbarComponent } from '@src/ui/components/navbar.component';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { ContactSubject } from '@src/ui/test-data/contact.data';

/**
 * Contact form (`/contact`). For a logged-in user the name/email fields are replaced by
 * a "Hello {name}, …" greeting, so `sendMessage()` only needs subject + body; the body
 * must be at least 50 characters or the form refuses to submit (TEST_PLAN.md §5.19).
 *
 * The subject `<select>` is submitted (and later listed) by its option *value*
 * (`warranty`), not its visible label ("Warranty") — see `ContactSubject`.
 */
export class ContactPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.CONTACT;
  readonly heading: Locator;
  readonly subjectSelect: Locator;
  readonly messageInput: Locator;
  readonly attachmentInput: Locator;
  readonly submitButton: Locator;
  readonly confirmationMessage: Locator;
  bookmarks = new NavbarComponent(this.page);

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
