# Chat widget — shell + "Find a product" (TEST_PLAN.md §5.21)

**Status:** completed / ready for review (2026-07-11) — see `TEST_PLAN.md` §32 for the findings write-up.
Delivered: `src/ui/components/chat-widget.component.ts`, `tests/ui/chat-widget.spec.ts` (5 tests, all green),
`chatWidget` registered in `page-object.fixture.ts`.
**Scope confirmed with user (2026-07-11):** the first two bullets of §5.21 only.

## Goal

Implement `tests/ui/chat-widget.spec.ts` covering:

1. **Widget shell** — the toggle button is visible (bottom-right) on any page; opening it shows the
   4-option menu.
2. **Find a product** — searching returns ≤5 product cards; "View Product" navigates to that product's
   detail page.

Explicitly **out of scope for this pass** (deferred, per user scope decision — not gaps): order-a-product
via chat, checkout via chat (both the happy path and the empty-cart case), and the support-ticket flow.

## Assumptions and open questions

- **A1.** The chat widget is a global component (rendered on every page), so it belongs in
  `src/ui/components/` alongside `navbar.component.ts`, not as a `*.page.ts`. _To confirm during
  exploration._
- **A2.** §9 (2026-07-04) already pins the menu button labels as **"Find a product" / "Order a product" /
  "Checkout" / "Create support ticket"** (lowercase, reworded vs. the docs). Use these, but re-verify live —
  §9 is 7 days old and prod is shared/mutable.
- **A3.** The "≤5 product cards" cap is a server/widget-side limit. A query matching fewer than 5 products
  returns fewer cards, so the assertion must be `count <= 5` (plus `>= 1` for a query that does match),
  never `=== 5`.
- **A4.** "View Product" navigates to `/product/<id>`. The id is not knowable up-front, so the test asserts
  the URL shape + that the detail page's `product-name` matches the chat card's name, rather than a pinned id.
- **Q1.** Does the widget search box hit a dedicated endpoint or reuse `QUERY /products`? Matters for
  awaiting the async result render (the repeated pre-load-race findings: §10, §26, §29, §30, §31). Resolve by
  watching the network during exploration.
- **Q2.** Is the widget's state (open/closed, conversation) persisted across navigation? Only matters if a
  test opens it twice; likely not needed for this slice.
- **Q3.** Does the widget require login? §9 observed it while signed in as `customer@`. If it is guest-usable,
  keep these tests guest-only (no `@logged`, no session mutation).

## Exploration results (2026-07-11, playwright-cli, guest)

- **A1 confirmed.** `<app-chat-widget>` renders inside `<app-root>` on every page (checked `/` and `/contact`),
  outside the router outlet → it is a **component**, not a page. It is `position: fixed`, bottom-right.
- **A2 confirmed.** Menu labels are exactly `Find a product` / `Order a product` / `Checkout` /
  `Create support ticket`, as §9 recorded.
- **A3 confirmed.** The cap is real: a broad query (`"e"`) returned exactly 5 cards; `"Pliers"` returned 4.
- **A4 rejected — there is no "View Product" button.** The chat result card (`[data-test="chat-product"]`) is
  itself clickable and routes to `/product/<id>`. New §9-style discrepancy to record.
- **Q1 answered.** The chat search fires `QUERY https://api.practicesoftwaretesting.com/products/search`
  (distinct from the grid's `/products`) — that response is the synchronisation point.
- **Q2 answered.** The conversation is **not** persisted across navigation: after routing to a product the
  window is closed and the toggle is back. Within one page, though, the transcript **accumulates** — an earlier
  search's cards stay in the DOM, so a page-wide `chat-product` count is only safe for one search per page load.
- **Q3 answered.** Fully usable as a guest. This slice touches no account, cart or order state.

**`data-test` ids (all stable):** `chat-toggle` (aria-label "Open chat"), `chat-window`, `chat-close`,
`chat-action-find-product`, `chat-action-order-product`, `chat-action-start-checkout`,
`chat-action-support-ticket`, `chat-action-back-to-menu`, `chat-input`, `chat-send`, `chat-product`,
`chat-file-input`. Message bubbles have **no `data-test`** — `.chat-message.bot-message` /
`.user-message` with an inner `.message-content`; result cards' name/price are `.product-name` / `.product-price`
(plain classes, distinct from the grid's `[data-test="product-name"]`).

**Flow shape:** greeting "Hi! How can I help you today?" + 4 buttons → "Find a product" → prompt "What product
are you looking for?" + text input → submit → results ("Here are some products I found:") **or** "No products
found. Try a different search." Once the reply renders, the **input form is removed from the DOM** — one search
per flow; "Back to menu" restarts it (appending a fresh greeting to the transcript).

## Risks and constraints

- **Shared production data (§3, §9).** The catalog is mutable and polluted by other users' test runs. So:
  - **No hard-coded product name, id or price.** Derive the search term from a live product — read a name
    from the home grid immediately before searching (the "fetch live, don't cache across steps" rule from §9,
    which recorded a product 404'ing moments after its id was captured).
  - **No assertion on an exact result count** — only the `<= 5` cap and structural behavior.
- **Never mutate shared seeded accounts (§3).** This slice is read-only (search + navigate), so no account,
  cart or order state is touched at all. No faker user needed.
- **Async render races.** Four prior findings (§10, §26, §29, §30, §31) are all the same bug shape: asserting
  against a loading state that hasn't resolved. Any wait for chat results must be a real synchronization
  (`waitFor()` on the resolved state, or awaiting the response) inside the component, not a bare assertion.
- **`expect()` must not appear in the component/page object** (CODING_STANDARDS) — synchronize with
  `locator.waitFor()` / `.filter()`.

## Planned steps

1. Confirm scope with the user. **Done** — shell + Find a product.
2. Write this plan file. **Done.**
3. Survey existing code: `navbar.component.ts` (the only existing shared component, for shape),
   `page-object.fixture.ts` (registration), `product-detail.page.ts` (the navigation target's locators),
   `home.page.ts`/`product-list.page.ts` (sourcing a live product name), and a recent spec
   (`messages.spec.ts` / `favorites.spec.ts`) for the current spec idiom.
4. Explore the live widget with the `playwright-cli` skill: toggle locator, the open panel, the 4 menu
   buttons' real labels/roles, the search input + submit, the result-card markup, the "View Product"
   control, and the network call behind the search (resolves Q1). Record any `data-test` ids.
5. Fold confirmed/rejected assumptions back into this file.
6. Implement:
   - `src/ui/components/chat-widget.component.ts` (assuming A1 holds) — locators + actions
     (`open()`, `chooseFindAProduct()`, `searchForProduct(name)`, `viewProduct(index)`), no `expect()`.
   - Register it wherever the navbar component is reached from (component, not fixture — confirm in step 3).
   - `tests/ui/chat-widget.spec.ts` — AAA, `test` from `@src/merge.fixture`, tagged via the `tag` option
     with `@regression` + a `@chat` feature tag (new tag → must be added to the §3 taxonomy), and a
     `// Chat Widget ACn` traceability comment per §7.
7. Update `TEST_PLAN.md`: mark the two implemented §5.21 bullets, add the new findings section, add `@chat`
   to the §3 tag taxonomy, and record any fresh doc/behavior discrepancy.
8. Validate: `npm run lint`, `npm run format:check`, `npm run tsc:check`, run the new spec file, and re-run
   `@smoke` (the widget component is shared code if it lands in `src/ui/components/`).
9. Report; mark this plan completed.
