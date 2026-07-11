import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

/**
 * A single message thread (`/account/messages/<id>`), reached from the list's "Details"
 * link (`MessagesPage.openDetails`). The original message is a `bg-secondary` card
 * (header `"{name} | Subject: {subject} | {status badge}"`, body, footer date); replies
 * render below it, oldest first.
 *
 * A customer can reply to their own thread with no admin involvement — the "Add Reply"
 * card is always present. It is a `bg-light` card just like a reply, so reply cards are
 * distinguished by *not* containing the form (TEST_PLAN.md §30). Posting a reply also
 * flips the thread's status from NEW to IN_PROGRESS.
 */
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
    this.messageCard = detailRoot.locator('div.card.bg-secondary');
    this.messageHeader = this.messageCard.locator('div.card-header');
    this.statusBadge = this.messageHeader.locator('span.badge');
    this.messageBody = this.messageCard.locator('p.card-text');
    this.messageDate = this.messageCard.locator('div.card-footer');
    this.replyCards = detailRoot
      .locator('div.card.bg-light')
      .filter({ hasNot: this.page.locator('form') });
    this.replyHeaders = this.replyCards.locator('div.card-header');
    this.replyBodies = this.replyCards.locator('p.card-text');
    this.replyInput = detailRoot.locator('[data-test="message"]');
    this.replySubmitButton = detailRoot.locator('[data-test="reply-submit"]');
  }

  /**
   * Posting a reply re-renders the thread from the server response rather than splicing
   * optimistically, so the click is the whole action — callers prove the reply landed
   * with an auto-retrying assertion on `replyCards`/`replyBodies`.
   */
  async sendReply(message: string): Promise<void> {
    await this.replyInput.fill(message);
    await this.replySubmitButton.click();
  }
}
