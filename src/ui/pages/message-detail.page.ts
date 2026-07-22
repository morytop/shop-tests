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
 * card is always present. None of the cards carry a role or `data-test`, so they are
 * told apart by user-visible content: the original message is the card containing
 * "Subject:", and a reply card is one that is neither the original nor the "Add Reply"
 * form (it contains no textbox) — TEST_PLAN.md §30. Posting a reply also flips the
 * thread's status from NEW to IN_PROGRESS.
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
    this.messageCard = detailRoot
      .locator('.card')
      .filter({ hasText: 'Subject:' });
    // The header's text node lives directly in the `card-header` div, so the text
    // engine resolves to it — no structural selector needed.
    this.messageHeader = this.messageCard.getByText('Subject:');
    this.statusBadge = this.messageHeader.getByText(
      /^(NEW|IN_PROGRESS|RESOLVED)$/,
    );
    this.messageBody = this.messageCard.getByRole('paragraph');
    // No role/label exists for the footer, and locating it by the date text it holds
    // would make the spec's date-format assertion tautological.
    this.messageDate = this.messageCard.locator('.card-footer');
    // Inner `filter()` locators must be page-rooted — one chained off `detailRoot`
    // would be re-evaluated inside each card and never match.
    this.replyCards = detailRoot
      .locator('.card')
      .filter({ hasNotText: 'Subject:' })
      .filter({ hasNot: this.page.getByRole('textbox') });
    this.replyHeaders = this.replyCards.locator('.card-header');
    this.replyBodies = this.replyCards.getByRole('paragraph');
    // The textarea has no <label>, so `getByLabel` can't reach it — test-id fallback.
    this.replyInput = detailRoot.getByTestId('message');
    this.replySubmitButton = detailRoot.getByRole('button', { name: 'Reply' });
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
