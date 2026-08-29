import { faker } from '@faker-js/faker';
import { sendMessageWithApi } from '@src/api/factories/message.api.factory';
import { expect, test } from '@src/fixtures/merge.fixture';
import { prepareRandomMessage } from '@src/ui/factories/contact.factory';
import { CONTACT_SUBJECTS } from '@src/ui/test-data/contact.data';
import { DATE_TIME_REGEX, truncate } from '@src/ui/utils/formats.util';

test.describe('Verify messages', () => {
  test(
    'submitted contact message appears in the message list',
    { tag: ['@auth', '@messages', '@regression'] },
    async ({ contactPage, loginAsFreshUser, messagesPage }) => {
      await loginAsFreshUser();
      const subject = faker.helpers.arrayElement(CONTACT_SUBJECTS);
      const message = prepareRandomMessage();

      await contactPage.goto();
      await contactPage.sendMessage(subject, message);
      await expect(contactPage.confirmationMessage).toHaveText(
        'Thanks for your message! We will contact you shortly.',
      );

      await messagesPage.gotoAndAwaitLoaded();

      await expect(messagesPage.pageTitle).toHaveText('Messages');
      await expect(messagesPage.messageRows).toHaveCount(1);

      await expect(messagesPage.messageRow(subject)).toBeVisible();
      await expect(
        messagesPage.messageRowCell(subject, truncate(message, 50)),
      ).toBeVisible();
      await expect(messagesPage.messageRowCell(subject, 'NEW')).toBeVisible();
      await expect(
        messagesPage.messageRowCell(subject, DATE_TIME_REGEX),
      ).toBeVisible();
    },
  );

  test(
    'message detail shows the full message and replies in chronological order',
    { tag: ['@auth', '@messages', '@regression'] },
    async ({ loginAsFreshUser, messageDetailPage, messagesPage, request }) => {
      const user = await loginAsFreshUser();
      const subject = faker.helpers.arrayElement(CONTACT_SUBJECTS);
      const message = prepareRandomMessage();
      const firstReply = prepareRandomMessage(100);
      const secondReply = prepareRandomMessage(100);
      await sendMessageWithApi(request, user, { subject, message });

      await messagesPage.gotoAndAwaitLoaded();
      await messagesPage.openDetails(subject);

      await expect(messageDetailPage.messageHeader).toContainText(
        `Subject: ${subject}`,
      );
      await expect(messageDetailPage.messageBody).toHaveText(message);
      await expect(messageDetailPage.messageDate).toHaveText(DATE_TIME_REGEX);

      await messageDetailPage.sendReply(firstReply);
      await expect(messageDetailPage.replyCards).toHaveCount(1);
      await messageDetailPage.sendReply(secondReply);
      await expect(messageDetailPage.replyCards).toHaveCount(2);

      await expect(messageDetailPage.replyBodies).toHaveText([
        firstReply,
        secondReply,
      ]);
      await expect(messageDetailPage.replyHeaders.first()).toContainText(
        user.first_name,
      );
    },
  );

  test(
    'submitting a reply appends it to the thread',
    { tag: ['@auth', '@messages', '@regression'] },
    async ({ loginAsFreshUser, messageDetailPage, messagesPage, request }) => {
      const user = await loginAsFreshUser();
      const subject = faker.helpers.arrayElement(CONTACT_SUBJECTS);
      const message = prepareRandomMessage();
      const reply = prepareRandomMessage(100);
      await sendMessageWithApi(request, user, { subject, message });

      await messagesPage.gotoAndAwaitLoaded();
      await messagesPage.openDetails(subject);
      await expect(messageDetailPage.statusBadge).toHaveText('NEW');
      await expect(messageDetailPage.replyCards).toHaveCount(0);

      await messageDetailPage.sendReply(reply);

      await expect(messageDetailPage.replyCards).toHaveCount(1);
      await expect(messageDetailPage.replyBodies.first()).toHaveText(reply);
      await expect(messageDetailPage.statusBadge).toHaveText('IN_PROGRESS');
    },
  );
});
