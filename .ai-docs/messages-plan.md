# Messages (§5.18) — action plan

## Goal

Implement `tests/ui/messages.spec.ts` covering the three ACs of `TEST_PLAN.md` §5.18:

1. **AC1** — after submitting the contact form while logged in, the message appears in the paginated Messages
   list (subject, truncated body, NEW status badge, date).
2. **AC2** — message detail shows the full original message + chronological replies.
3. **AC3** — submitting a reply appends it to the thread.

Scope is §5.18 only. §5.19 (contact-form validation) and §5.20 (admin messages management) stay out of scope,
even though this pass necessarily grows `contact.page.ts` (today a stub with only a heading locator) into a real
form page object, since submitting a contact message is the precondition for every §5.18 AC.

## Assumptions and open questions (to confirm live before implementing)

- A1. Messages list lives at `/account/messages`, detail at `/account/messages/<id>`; both are linked from the
  `/account` dashboard tile (§26 finding confirms an "Messages" tile exists).
- A2. The list, like invoices/favorites, renders before its `GET /messages` response lands → will need a
  `gotoAndAwaitLoaded()` gate rather than a bare `goto()`.
- A3. The contact form, when logged in, hides name/email and shows "Known user, {name}"; subject is a `<select>`,
  message needs ≥50 chars (§5.19). Submitting yields a confirmation message.
- A4. **Open:** can a _customer_ reply to their own thread with no admin reply present, or is the reply box only
  shown after staff replies? If the latter, AC3 is not automatable without admin credentials and must be deferred
  (report back, don't silently widen scope into §5.20).
- A5. **Open:** is the list body truncated by the app's `TruncatePipe` (as favorites' descriptions are, §26) or by
  CSS? If a pipe, reuse `truncate()` from `src/ui/utils/text.util.ts` with the live length.
- A6. **Open:** exact status-badge copy ("NEW") and date format.

## Risks and constraints

- **Data safety (§3):** submitting a contact message mutates the account's message list, and it also lands in the
  shared admin inbox. Each test must register its own throwaway user via `registerUserWithApi` and log in inline —
  never `testUser1` (it _is_ the shared seeded `customer@`) and never the `@logged` session user (shared across
  specs). A fresh user also guarantees a single-message list, so assertions stay deterministic.
- No hard-coded catalog/product data is involved; message subject/body are faker-generated per test (body must
  clear the 50-char minimum).
- Contact submissions are irreversible (no customer-side delete) — keep the number of submissions minimal (one
  per test).

## Steps

1. Write this plan. ✅
2. Explore live (`playwright-cli`): contact form as a logged-in user, the `/account` dashboard tile, the messages
   list, and the message detail page (incl. whether a customer reply box exists). Resolve A1–A6 and fold the
   answers back in here.
3. Extend `src/ui/pages/contact.page.ts` with the form locators + a `sendMessage()` action; add
   `src/ui/pages/messages.page.ts` and `src/ui/pages/message-detail.page.ts`; add `PAGE_URLS.MESSAGES`; register
   the new page objects in `src/ui/fixtures/page-object.fixture.ts`.
4. Write `tests/ui/messages.spec.ts` — AAA, tags `@auth @messages @regression` (`@messages` is a new feature tag),
   one AC per test, each with its own throwaway user.
5. Update `TEST_PLAN.md` (§5.18 status + a new findings section + tag taxonomy if `@messages` is new).
6. Validate: `npm run lint`, `npm run format:check`, `npm run tsc:check`, run `messages.spec.ts` and `@smoke`.
7. Report; mark this plan completed.

## Findings (live exploration, 2026-07-11)

- A1 ✅ List `/account/messages` (`<app-messages>`, `GET /messages?page=1`), detail `/account/messages/<ulid>`
  (`<app-message-detail>`). Both linked from the `/account` dashboard.
- A2 ✅ The list is a `table.table-hover` with **no `data-test` on rows/cells** (same shape as invoices) —
  columns `Subject | Message | Status | Date | (Details link)`. It renders before `GET /messages` lands, so
  `gotoAndAwaitLoaded()` is required, exactly as on `InvoicesPage`.
- A3 ✅ Contact form (logged in): name/email hidden, `select[data-test="subject"]` (6 option **values**:
  `customer-service`, `webmaster`, `return`, `payments`, `warranty`, `status-of-order`),
  `textarea[data-test="message"]`, `input[data-test="attachment"]`, `input[data-test="contact-submit"]`.
  Success renders `div[role="alert"].alert-success` — **"Thanks for your message! We will contact you shortly."**
- A4 ✅ **A customer CAN reply to their own thread with no admin involvement** — the detail page always renders an
  "Add Reply" card (`textarea[data-test="message"]` + `button[data-test="reply-submit"]`). AC3 is automatable
  without admin credentials.
- A5 ✅ The list's Message column is the app's `TruncatePipe` at **50** chars (not CSS): a 197-char body rendered
  as 53 chars = 50 + `...`. Reuse `truncate(body, 50)` from `src/ui/utils/text.util.ts`.
- A6 ✅ Status badge is `span.badge` reading **`NEW`** (`bg-info`); date is `YYYY-MM-DD HH:mm:ss`.

**New findings to fold into `TEST_PLAN.md` §9:**

- The list's Subject column shows the raw select **value** (`warranty`), not the human label (`Warranty`).
- Posting a customer reply flips the message status **`NEW` → `IN_PROGRESS`** (visible in both the detail header
  badge and the list) — so AC1 must assert `NEW` _before_ any reply is posted.
- Replies render oldest-first as `div.card.bg-light` cards (header `"{name} | {date}"`, body `p.card-text`); the
  "Add Reply" form card shares that exact class, so reply cards must be filtered by `hasNot: form`.
- The logged-in contact form greets **"Hello {name}, please fill out this form to submit your message."**, not
  "Known user, {name}" as §5.19 claims.
- The `/account` dashboard now shows a **Favorites** tile (Profile, Invoices, Messages, Favorites) — §26's
  "favorites is not linked from the account dashboard" finding is stale as of app build 2026-07-06.

## Status

Steps 1–7 complete. Ready for review.
