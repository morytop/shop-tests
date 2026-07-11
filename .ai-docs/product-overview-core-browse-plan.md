# Plan: Product Overview / Home — Core Browse (TEST_PLAN.md §5.1, subset)

## Goal

Implement the "core browse" subset of §5.1 Product Overview / Home, confirmed with user:

- Product grid renders with image, name, price for each card.
- Clicking a product card navigates to its detail page.
- Pagination: page 2 shows different products than page 1; last page's "next" is disabled/absent.
- Discounted product card shows strikethrough original price + discounted price.
- Out-of-stock product card shows "Out of stock" label.

Deferred to a follow-up pass (not in scope now): search, category filter, brand filter, combined filters, all 4 sort orders, price range slider.

New spec file: `tests/product-overview.spec.ts`. New/extended page object: `src/pages/home.page.ts` (currently a near-empty stub — only `PAGE_URL`, no grid/pagination locators yet).

## Assumptions and open questions — confirmed via live exploration (2026-07-05)

- Home page (`/`) is confirmed as the product overview grid page.
- Confirmed selectors (all via `data-test` attributes, stable):
  - Card: `a.card[data-test^="product-"]`, containing `img` (name as alt text), `h5[data-test="product-name"]`, and inside `.card-footer` a `span[data-test="product-price"]`.
  - Click-through: card `href` resolves to `/product/{id}` — assert via URL regex after click, not a hard-coded ID.
  - Pagination: `ul.pagination`; prev/next links are `[data-test="pagination-prev"]` / `[data-test="pagination-next"]`; disabled state is expressed on the **parent `li.page-item`** (`class="page-item disabled"`), not the link itself; numbered pages via `getByLabel('Page-N')`. Confirmed on page 1 (prev disabled) and last page 5 (next disabled).
  - Out-of-stock: `span[data-test="out-of-stock"]` with text "Out of stock", class `text-danger`, inside `.card-footer`. Confirmed live (e.g. "Long Nose Pliers" was out of stock at exploration time) — must be located dynamically (search across grid pages), not hard-coded to a name/position, since stock status is live catalog data.
- **Discount sub-case — cannot be reliably automated, recommend skip:**
  - The products API (`api.practicesoftwaretesting.com/products`) has no generic sale/discount field. The only price-related flag is `is_location_offer` (boolean per product) — this is the same mechanism as the already-documented §5.22 geo-location discount, not a separate "sale" feature.
  - Tested directly: mocked Playwright browser geolocation to London (a supported discount city per §9) for a product with `is_location_offer: true` — no strikethrough/discounted price rendered on reload. This is consistent with (and now empirically corroborates) the §9/§5.22 hypothesis that eligibility is determined server-side by request IP, not the browser Geolocation API, so it cannot be forced from an automated test running from a non-UK CI/dev IP.
  - No discounted card was found live on any of the 5 home grid pages either, so there's no way to assert the visual (strikethrough + discounted price) even opportunistically.
  - **Decision:** treat this the same as the existing §5.22 geo-discount item — write it as `test.skip` with a comment explaining why (IP-based eligibility, unautomatable against prod), rather than a flaky/impossible-to-trigger positive assertion. Will note this in `TEST_PLAN.md` §5.1 and cross-reference §5.22/§9 findings.

## Risks and constraints

- No hard-coded product IDs/names/prices — assert on structural properties only (TEST_PLAN.md §3).
- Catalog is shared/mutable production data — a product ID/card position captured once may not be stable a moment later (§9 finding); fetch card references immediately before use within a step, don't cache across long gaps.
- No destructive actions needed for this subset (read-only browse), so no shared-account risk here.
- Category/brand trees are known to contain leftover test-data pollution (§9) — not directly relevant to this subset (no filter tests here) but worth remembering if grid content assertions inadvertently rely on category cleanliness.

## Planned steps

1. Explore the live home/product-overview page via `playwright-cli` to confirm: grid card structure (image/name/price locators), pagination controls (next/prev, disabled state, page indicator), discount badge markup, out-of-stock label markup/text.
2. Update this plan with confirmed/rejected assumptions.
3. For non-trivial scope (multiple ACs, new page object) — walk through test case list, tags, and files to touch with the user via plan mode before implementing.
4. Implement:
   - Extend `src/pages/home.page.ts` with grid/pagination/card locators and action methods (no `expect()`).
   - Register page object (already registered in `src/fixtures/pages.ts` as `homePage` — confirm no changes needed there since it already exists).
   - Create `tests/product-overview.spec.ts` with AAA-structured tests, tagged per TEST_PLAN.md §3 taxonomy (`@regression`, `@smoke` if applicable, plus a feature tag e.g. `@product-overview` or `@home` — confirm naming during plan step).
   - Reference TEST_PLAN.md §5.1 / relevant AC in a describe-block comment per §7 traceability convention.
5. Update `TEST_PLAN.md` if any doc/behavior discrepancies are found during exploration.
6. Validate: `npm run lint`, `npm run format:check`, run the new spec file, run `@smoke` tag suite.
7. Report: what was added, files touched, tests run + results, tags applied, open questions/risks. Mark this plan completed.

## Status

- [x] Step 0: scope confirmed (core browse subset)
- [x] Step 1: this plan file created
- [x] Step 2: live exploration
- [x] Step 3: plan-mode sign-off
- [x] Step 4: implementation
- [x] Step 5: TEST_PLAN.md updates (§5.1 bullet + new §10 findings section)
- [x] Step 6: validation (lint, format, new spec, @smoke suite, login/register regression check all pass)
- [x] Step 7: report delivered to user

## Status: completed
