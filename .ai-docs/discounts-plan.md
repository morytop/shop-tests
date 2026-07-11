# Discounts (§5.22) — action plan

Status: **completed / ready for review** (2026-07-11). Implemented as scoped: 3 executable tests + 1 documented
skip in `tests/ui/discounts.spec.ts`; findings written up in `test_plan.md` §33; lint/format/tsc clean; the spec
and every spec sharing the code it touches re-run green. Two items need a human decision — see "Open questions"
at the bottom.

## Goal

Implement `tests/ui/discounts.spec.ts` covering test_plan.md **§5.22 Discounts**, as confirmed with the user:

1. **Cart-level combination discount** — a cart holding both a rental and a non-rental item gets the additional
   15% combined-product discount and renders a subtotal / discount / total breakdown. (Also closes §5.5 **AC7**.)
2. **Discount removal** — removing all items of one type (all rentals or all non-rentals) drops the 15% discount
   and reverts the total to the plain sum of the remaining lines. (Also closes §5.5 **AC8**.)
3. **Invoice cross-check** — place a Cash-on-Delivery order from a discounted cart (rental + non-rental) as a
   throwaway registered user, and assert the invoice reflects subtotal / discount % / discount amount / total.
   (Also closes §5.17 **AC4**.)
4. **Location-based discount** — represented as a documented `test.skip`, not an executable test (see below).

Out of scope for this pass: everything else in §5.5 / §5.17, and the per-item `is_location_offer` discount badge.

## Assumptions and open questions — resolved by live exploration (2026-07-11)

Explored production with playwright-cli: added a non-rental (Combination Pliers, $14.15) + a rental (Excavator,
$136.50/h) to a guest cart, then placed a real COD order as a throwaway API-registered user and inspected the
resulting invoice, plus a second **non-discounted** control order.

- **A1 — CONFIRMED.** The 15% combination discount is applied client-side and visible on the `/checkout` cart step:
  `Subtotal $150.65` / `Discount (15%) - $22.60` / `Total $128.05`. No order needs to be placed to see it.
- **A2 — CONFIRMED, locators are clean.** `[data-test="cart-subtotal"]` and `[data-test="cart-discount"]` (both
  `<td>`), alongside the already-modelled `[data-test="cart-total"]`. The subtotal/discount rows are **conditional**
  — they do not exist at all on an undiscounted cart (count 0), which is exactly what AC8 asserts.
- **A3 — CONFIRMED (15%), rounding is ambiguous.** `150.65 × 0.15 = 22.5975`, displayed as `- $22.60`; total
  `$128.05`. Both "subtotal − rounded discount" and "round(subtotal × 0.85)" produce 128.05, so the app's rounding
  direction can't be pinned from one sample. Tests therefore read subtotal/discount/total back from the DOM and
  assert the _relationships_ with `toBeCloseTo(…, 2)` (discount ≈ 15% of subtotal; total ≈ subtotal − discount)
  rather than gambling on a reconstructed literal.
- **A4 — CONFIRMED.** The rental detail page has `[data-test="add-to-cart"]` and **no** `[data-test="quantity"]`,
  and adding it increments the navbar cart badge — so `RentalsPage.clickRentalCard()` →
  `ProductDetailPage.addToCartAndAwaitBadge()` composes cleanly into a new `addRentalToCart` action fixture.
- **A5 — CONFIRMED.** A discounted cart (rental + non-rental) orders end-to-end via COD; the invoice API accepts
  rental line items. Billing still must go through the postcode lookup (§18).
- **Q1 — ANSWERED.** The invoice shows the discount as an **amount** (`$ 22.60`); the **15% is only in the label
  text** (`Discount (15%)`). So the "discount %" half of §5.17 AC4 is asserted on the label, not a value.

### New discrepancies found (for test_plan.md §9-style findings)

- **The invoice detail page reuses `data-test="total"` on three different inputs** (subtotal, discount, total) —
  distinguished only by their `id`s (`#subtotal`, `#additional_discount_percentage`, `#total`). On a **discounted**
  invoice the existing `InvoiceDetailPage.total` locator (`[data-test="total"]`) therefore matches 3 elements and
  would blow up on Playwright strict mode. It must be retargeted to `#total` (verified: a non-discounted invoice
  renders exactly one such input, and its id is still `total`, so `invoices.spec.ts` AC1–AC3 stay green).
- **All three totals' `<label for>` attributes point at `"total"`**, so `getByLabel('Subtotal')` /
  `getByLabel('Discount (15%)')` resolve to the _grand total_ input, not their own field. `getByLabel` is unusable
  here and the subtotal/discount inputs effectively have no accessible name (an a11y defect worth reporting).
  The `id` selectors are the only reliable hook.
- **`#additional_discount_percentage` holds an amount, not a percentage** (`$ 22.60`) — the id is misleading.
- **The combination discount is order-level, not per-line.** The invoice's line items show full undiscounted
  prices ($14.15 / $136.50); there is no strikethrough or discounted line price. The "discounted line items show
  strikethrough" half of §5.17 AC4 belongs to the unautomatable per-item `is_location_offer` mechanism (§10), not
  to this discount.
- Price formats differ per surface: cart `$150.65` / `- $22.60`, invoice detail `$ 150.65` (space after `$`),
  invoice list `$128.05`. The cart's discount carries a leading `- `, so `parsePrice()` must tolerate it.

## Risks and constraints

- **Shared production data (§3, §9).** No hard-coded product/rental ids, names, or prices. The rental and the
  non-rental product are picked dynamically (first card) and every expected amount is derived from prices read
  back from the DOM immediately before use. The Special Tools category is empty and products can vanish
  mid-session, so nothing may be cached across steps.
- **Never mutate shared seeded accounts (§3).** Test 3 needs a logged-in user for the invoice; it must register a
  throwaway faker user via the API factory, exactly as `checkout-e2e.spec.ts` does — not `testUser1` /
  `customer@practicesoftwaretesting.com`, and not the shared `@logged` storageState session user.
- **Guest cart is safe.** Tests 1–2 mutate only the per-context localStorage cart (§12/§14), so they need no
  account at all.
- **Location discount is unautomatable (§9, §10).** Already empirically disproven: overriding Playwright's
  browser `geolocation` to London for a product with `is_location_offer: true` produced no discounted price,
  because eligibility is determined server-side from the request IP. It will ship as a `test.skip` carrying that
  explanation, mirroring the pattern §10 established for the discounted-product card.
- **Lint.** `playwright/no-conditional-in-test` forbids `if`/ternary/`?.`/`??` in test bodies — read text with
  `innerText()`, and push any nullable/branching logic into a Page Object method or util.

## Planned steps

1. Confirm scope with the user. **(done — cart + invoice cross-check, and a `test.skip` for the location AC)**
2. Write this plan file. **(done)**
3. Survey existing code: `cart.page.ts`, `cart.spec.ts`, `rentals.page.ts`, `product-detail.page.ts`,
   `checkout-payment.page.ts`, `checkout-e2e.spec.ts`, `cart-action.fixture.ts`, `price.util.ts`.
4. Explore live (playwright-cli): add a rental + a non-rental to a guest cart on `/checkout`; capture the real
   discount/subtotal/total locators and copy; verify the 15% arithmetic and rounding; verify the discount
   disappears when one item type is removed. Then place a COD order from a discounted cart and capture the
   invoice's discount fields. Record confirmed/rejected assumptions back into this file.
5. Implement:
   - Extend `CartPage` with the discount breakdown locators (subtotal / discount / total) — locators + actions
     only, no `expect()`.
   - Add a rental-to-cart arrange flow. It spans `rentalsPage` + `productDetailPage`, so per
     `CODING_STANDARDS.md` it belongs in the `cartActionTest` action fixture (`addRentalToCart`), not a spec-local
     helper. Extend `placeCodOrderAsLoggedInUser` (or add a discounted variant) to seed both item types.
   - Write `tests/ui/discounts.spec.ts`: 3 executable tests + 1 `test.skip`, AAA, tagged per the §3 taxonomy
     (`@regression`, `@checkout`; `@smoke` only if the combination-discount case earns it), with a traceability
     comment referencing §5.22 / §5.5 AC7-AC8 / §5.17 AC4.
6. Update `test_plan.md`: mark §5.22, §5.5 AC7/AC8 and §5.17 AC4 as implemented, add a findings section for any
   doc/behavior discrepancy found in step 4.
7. Validate: `npm run lint`, `npm run format:check`, `npm run tsc:check`, run `discounts.spec.ts`, plus
   `cart.spec.ts` / `rentals.spec.ts` / `checkout-e2e.spec.ts` (they share `CartPage` and the cart action fixture)
   and the `@smoke` tag. **(done — all green; see §33 "Validation")**
8. Report; mark this file completed/ready-for-review. **(done)**

## Open questions for review

1. **The skipped location-discount test needs an `eslint-disable`.** The repo lints at `--max-warnings=0` with
   `playwright/no-skipped-test` + `playwright/expect-expect` on, so a permanently-skipped AC marker is not
   expressible without a scoped disable (there is no existing precedent in the suite — despite §10's claim that
   the discounted-product-card test was "written as `test.skip`", no such test exists). The disable is applied to
   that one line and commented. **If the team would rather not carry skipped tests at all, delete the test and
   rely on the §5.22 / §33 plan entries instead** — the coverage decision is unchanged either way.
2. **Pre-existing parallel-run flakiness** on the checkout-touching specs against shared production (reproduced on
   a clean tree — see §33). Not caused by this change and not fixed by it; flagged rather than silently absorbed.
