# Messages locator refactor — action plan

## Goal

Move `src/ui/pages/messages.page.ts` and `src/ui/pages/message-detail.page.ts` from
CSS-heavy locators (`tbody`, `div.card.bg-secondary`, `span.badge`, `p.card-text`) and the
DOM-order-coupled `openDetails(index)` / `.nth()` pattern to user-facing Playwright
locators (`getByRole`, `getByText`, filter-by-visible-content), per
https://playwright.dev/docs/locators. Where a locator needs a runtime value, use a
constructor-assigned parametrized locator property
(`readonly messageRow: (subject: string) => Locator`).

Two suite-wide rules ride along in `CODING_STANDARDS.md`:

1. **No locator construction in spec files** — specs never call
   `getByRole`/`getByText`/`getByTestId`/`locator()`, not on `page` and not chained off a
   page-object property (bad: `row.getByRole('cell').nth(2)`); every locator lives on a
   page object and specs only compose exposed properties.
2. **Value-parametrized locator properties are the sanctioned form** for locators needing
   a runtime value (still `readonly`, still assigned in the constructor).

## Findings (verified against the app source + `en.json`, 2026-07-22)

Templates: `sprint5/UI/src/app/account/messages/*` in
testsmith-io/practice-software-testing.

- **List** (`messages.component.html`): the table has full ARIA roles
  (`table`/`row`/`cell`/`columnheader`) but no `data-test` on rows/cells. Header cells are
  `<th>` → role `columnheader`, so body rows are exactly "rows containing a `cell`" — the
  `tbody` CSS hop is unnecessary. Details link text: "Details". A thread's Subject cell is
  unique per fresh-user list, and body cells are ≥50 chars truncated to 53, so an exact
  Subject match can never collide with another cell.
- **Detail** (`message-detail.component.html`): cards are plain
  `<div class="card bg-…">` — no roles, no test-ids, so a minimal `.card` anchor is
  unavoidable; but the _distinctions_ can key on user-visible content: the original
  message card is the one containing "Subject:", the Add-Reply card is the one containing
  the reply textbox. Card bodies are `<p>` → role `paragraph`. The reply button's visible
  text is "Reply" (`en.json` `reply-btn`). The reply `<textarea data-test="message">` has
  **no `<label>`** → `getByLabel` is impossible; `getByTestId` stays (Playwright's
  sanctioned fallback). A11y smell worth recording: unlabeled form control.
- Sibling precedent: `InvoicesPage.openDetails(invoiceNumber)` already filters its row by
  text — messages' `.nth(index)` was the outlier. `invoices.page.ts` still has the
  identical `tbody` row locator (follow-up, out of scope here).
- The date regex `/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/` appeared 4× across
  messages/invoices specs with no name saying what it asserts.
- `messages.spec.ts` carried a leftover `test.only` on AC3, silently disabling AC1/AC2.

## Changes

1. **`src/ui/pages/messages.page.ts`**
   - `messageRows` = `messageTable.getByRole('row').filter({ has: page.getByRole('cell') })`
     (header row self-excludes — its cells are `columnheader`s).
   - New `messageRow(subject)` — row filtered by exact Subject cell; new
     `messageRowCell(subject, text)` — cell in that row by visible text (`exact` pins
     string matches, ignored for RegExp).
   - `openDetails(subject)` clicks the row's "Details" link — no more `.nth(index)`.
2. **`src/ui/pages/message-detail.page.ts`**
   - `messageCard`: `.card` filtered by `hasText: 'Subject:'` (content, not `bg-secondary`).
   - `messageHeader`: `messageCard.getByText('Subject:')` (the text engine resolves to the
     `card-header` div — the text node's direct parent).
   - `statusBadge`: `messageHeader.getByText(/^(NEW|IN_PROGRESS|RESOLVED)$/)`.
   - `messageBody`/`replyBodies`: `getByRole('paragraph')`.
   - `replyCards`: `.card` + `hasNotText: 'Subject:'` + `hasNot: page.getByRole('textbox')`
     ("neither the original message nor the Add-Reply form").
   - `replySubmitButton`: `getByRole('button', { name: 'Reply' })`.
   - Kept: `detailRoot` (`app-message-detail` scoping root), `messageDate`
     (`.card-footer` — no role/label; locating by the date regex would make the spec's
     `toHaveText(DATE_TIME_REGEX)` tautological), `replyHeaders` (`.card-header`),
     `replyInput` (test-id; no label exists).
   - Pitfall respected: inner locators passed to `filter({ has/hasNot })` must be
     **page-rooted** — one chained off `detailRoot` would be re-evaluated inside each card
     and never match.
3. **`src/ui/utils/date.util.ts`** (new): documented `DATE_TIME_REGEX` constant for the
   app's `YYYY-MM-DD HH:mm:ss` timestamps; all four literals in
   `messages.spec.ts`/`invoices.spec.ts` swapped for the import (invoices gets only this
   substitution, not the locator cleanup).
4. **`tests/ui/messages.spec.ts`**: `test.only` removed; `openDetails(subject)` call
   sites; AC1's column-indexed `getByRole('cell').nth(0..3)` asserts replaced with
   order-independent, page-object-only assertions
   (`messageRow(subject)` visible + `messageRowCell(subject, …)` for body/status/date).
5. **`CODING_STANDARDS.md`**: the two rules above, with
   `await expect(row.getByRole('cell').nth(2)).toHaveText('NEW')` vs
   `await expect(messagesPage.messageRowCell(subject, 'NEW')).toBeVisible()` as the
   Bad/Good example.

## Out of scope (follow-ups)

- `invoices.page.ts` `tbody` row locator — same cleanup applies later.
- Retrofitting the no-locators-in-specs rule onto other existing specs.
- `PRODUCT_EXPLORATION.md` note for the unlabeled reply textarea, if not already there.

## Verification

1. `npm run lint`, `npm run format:check`, `npm run tsc:check`.
2. `npx playwright test tests/ui/messages.spec.ts tests/ui/invoices.spec.ts` — all three
   messages tests run (proves the `test.only` removal) and pass; invoices stays green
   after the regex-constant swap.
3. Grep: no spec outside `messages.spec.ts` references the changed members; zero
   `getBy`/`.locator(` hits inside `messages.spec.ts`.

## Status

Completed 2026-07-22. Lint/format/tsc green; all 6 tests in
`messages.spec.ts` + `invoices.spec.ts` pass (the three messages tests all ran again
after the `test.only` removal); zero `getBy`/`.locator(` hits remain in
`messages.spec.ts`.
