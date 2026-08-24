import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

export class MessageDetailPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.MESSAGES;
  readonly messageCard: Locator;
  readonly messageHeader: Locator;
  readonly statusBadge: Locator;
  readonly messageBody: Locator;
  readonly messageDate: Locator;
  readonly replyCards: Locator;
  readonly replyHeaders: Locator;
  readonly replyBodies: Locator;
  readonly replyInput: Locator;
  readonly replySubmitButton: Locator;

  constructor(page: Page) {
    super(page);
    const detailRoot = this.page.locator('app-message-detail');
    this.messageCard = detailRoot
      .locator('.card')
      .filter({ hasText: 'Subject:' });
    this.messageHeader = this.messageCard.getByText('Subject:');
    this.statusBadge = this.messageHeader.getByText(
      /^(NEW|IN_PROGRESS|RESOLVED)$/,
    );
    this.messageBody = this.messageCard.getByRole('paragraph');
    // No role/label exists for the footer
    this.messageDate = this.messageCard.locator('.card-footer');
    this.replyCards = detailRoot
      .locator('.card')
      .filter({ hasNotText: 'Subject:' })
      .filter({ hasNot: this.page.getByRole('textbox') });
    this.replyHeaders = this.replyCards.locator('.card-header');
    this.replyBodies = this.replyCards.getByRole('paragraph');
    this.replyInput = detailRoot.getByTestId('message');
    this.replySubmitButton = detailRoot.getByRole('button', { name: 'Reply' });
  }

  async sendReply(message: string): Promise<void> {
    await this.replyInput.fill(message);
    await this.replySubmitButton.click();
  }
}
