import { faker } from '@faker-js/faker';
import { sendMessageWithApi } from '@src/api/factories/message.api.factory';
import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import { expect, test } from '@src/merge.fixture';
import { prepareRandomMessage } from '@src/ui/factories/contact.factory';
import { CONTACT_SUBJECTS } from '@src/ui/test-data/contact.data';
import { truncate } from '@src/ui/utils/text.util';

// User Stories v5 — Messages (TEST_PLAN.md §5.18). All three ACs: the submitted contact
// message appears in the list (AC1), the detail page shows the full original message and
// its replies in chronological order (AC2), and a reply is appended to the thread (AC3).
//
// Data safety (§3): submitting a contact message permanently mutates the account's
// message list (there is no customer-side delete), so each test registers its own
// throwaway user via the API and logs in inline — never `testUser1` (it IS the shared
// seeded `customer@`) and never the `@logged` storageState session, which is shared
// across every `@logged` spec in a run. A fresh user also guarantees a single-message
// list, which is what makes the row assertions deterministic.
//
// Message bodies come from `prepareRandomMessage()`, which respects the app's 50–250
// character window (the 250 ceiling is undocumented — §30); the messages list is entered
// via `gotoAndAwaitLoaded()`, since like invoices and favorites the table renders before
// `GET /messages` lands (§29/§26). See TEST_PLAN.md §30 and .ai-docs/messages-plan.md.

test.describe('Verify messages', () => {
  // AC1 — the submitted message shows up in the list with its subject, the body truncated
  // at 50 chars by the app's `TruncatePipe`, a NEW status badge, and a date. The Subject
  // column renders the select's *value* (`warranty`), not its label ("Warranty") — §30.
  // The NEW badge only holds until someone replies (a reply flips it to IN_PROGRESS), so
  // this test must not post one.
  test(
    'submitted contact message appears in the message list',
    { tag: ['@auth', '@messages', '@regression'] },
    async ({
      accountPage,
      contactPage,
      loginPage,
      messagesPage,
      usersRequest,
    }) => {
      const user = await registerUserWithApi(usersRequest);
      const subject = faker.helpers.arrayElement(CONTACT_SUBJECTS);
      const message = prepareRandomMessage();

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.pageTitle.waitFor();

      await contactPage.goto();
      await contactPage.sendMessage(subject, message);
      await expect(contactPage.confirmationMessage).toHaveText(
        'Thanks for your message! We will contact you shortly.',
      );

      await messagesPage.gotoAndAwaitLoaded();

      await expect(messagesPage.pageTitle).toHaveText('Messages');
      await expect(messagesPage.messageRows).toHaveCount(1);

      const row = messagesPage.messageRows.first();
      await expect(row.getByRole('cell').nth(0)).toHaveText(subject);
      await expect(row.getByRole('cell').nth(1)).toHaveText(
        truncate(message, 50),
      );
      await expect(row.getByRole('cell').nth(2)).toHaveText('NEW');
      await expect(row.getByRole('cell').nth(3)).toHaveText(
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
      );
    },
  );

  // AC2 — the detail page shows the original message in full (untruncated, unlike the
  // list) plus its replies oldest-first. Two replies are posted so the ordering is
  // actually observable; a customer can reply to their own thread with no admin
  // involvement (§30). The original message is asserted *before* replying: the reply form
  // renders while `GET /messages/{id}` is still in flight, and a reply posted then does
  // not land (§30).
  //
  // The message is filed over the API (Phase G): submitting the contact form is AC1's
  // subject, and this AC is about the detail view — so the arrange skips the form and
  // the UI drives only the list → detail → reply flow.
  test(
    'message detail shows the full message and replies in chronological order',
    { tag: ['@auth', '@messages', '@regression'] },
    async ({
      accountPage,
      loginPage,
      messageDetailPage,
      messagesPage,
      request,
      usersRequest,
    }) => {
      const user = await registerUserWithApi(usersRequest);
      const subject = faker.helpers.arrayElement(CONTACT_SUBJECTS);
      const message = prepareRandomMessage();
      const firstReply = prepareRandomMessage(100);
      const secondReply = prepareRandomMessage(100);
      await sendMessageWithApi(request, user, { subject, message });

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.pageTitle.waitFor();

      await messagesPage.gotoAndAwaitLoaded();
      await messagesPage.openDetails();

      await expect(messageDetailPage.messageHeader).toContainText(
        `Subject: ${subject}`,
      );
      await expect(messageDetailPage.messageBody).toHaveText(message);
      await expect(messageDetailPage.messageDate).toHaveText(
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
      );

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

  // AC3 — a reply is appended to a thread that had none. The thread's status flips from
  // NEW to IN_PROGRESS on the first reply (§30), which is asserted here as the
  // server-side effect of the reply landing. Asserting the NEW badge first also gates on
  // the thread having loaded, without which the reply is dropped (§30).
  //
  // Like AC2, the thread being replied to is arranged over the API (Phase G) — the reply
  // itself, the thing under test, still goes through the UI.
  test(
    'submitting a reply appends it to the thread',
    { tag: ['@auth', '@messages', '@regression'] },
    async ({
      accountPage,
      loginPage,
      messageDetailPage,
      messagesPage,
      request,
      usersRequest,
    }) => {
      const user = await registerUserWithApi(usersRequest);
      const subject = faker.helpers.arrayElement(CONTACT_SUBJECTS);
      const message = prepareRandomMessage();
      const reply = prepareRandomMessage(100);
      await sendMessageWithApi(request, user, { subject, message });

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.pageTitle.waitFor();

      await messagesPage.gotoAndAwaitLoaded();
      await messagesPage.openDetails();
      await expect(messageDetailPage.statusBadge).toHaveText('NEW');
      await expect(messageDetailPage.replyCards).toHaveCount(0);

      await messageDetailPage.sendReply(reply);

      await expect(messageDetailPage.replyCards).toHaveCount(1);
      await expect(messageDetailPage.replyBodies.first()).toHaveText(reply);
      await expect(messageDetailPage.statusBadge).toHaveText('IN_PROGRESS');
    },
  );
});
