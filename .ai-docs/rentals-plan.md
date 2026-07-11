# Plan: Rentals (TEST_PLAN.md §5.4, `tests/rentals.spec.ts`)

## Goal

Implement §5.4 "Rentals" acceptance criteria confirmed with the user (2026-07-07).
In scope this pass:

1. **AC1** — Rentals listing page shows rental products with image, name, description.
2. **AC2** — Rental product detail page shows a **duration slider** instead of the qty stepper.
3. **AC3** — Rental item added to cart is labeled **"This is a rental item"** in checkout.

**Excluded / deferred (user decision, not gaps):**

- AC4 — Location-based rental discount: confirmed unautomatable per §10 (server-side/IP-determined
  `is_location_offer`, not overridable via the browser Geolocation API). Not implemented this pass.

## Context / what already exists (surveyed 2026-07-07)

- `src/pages/rentals.page.ts` is a **stub** (`RentalsPage extends BasePage`, `PAGE_URL = /rentals`, a
  `bookmarks` navbar only, no locators/methods). Already registered in `src/fixtures/pages.ts` (type + export)
  and navbar has `rentalsNavLink`.
- `ProductDetailPage` (`src/pages/product-detail.page.ts`) already models the non-rental detail page:
  name, price (`unit-price`), description, category/brand badges, quantity stepper, add-to-cart,
  `cartToast` (`.toast-message`), related products. Rental detail is the **same component** with the qty
  stepper swapped for a duration slider — extend this page object rather than create a new one.
- `ProductListPage` models the overview/category grid (`a.card[data-test^="product-"]`, `product-name`,
  `product-price`, `clickProductCard`). The rentals listing may or may not reuse the same card markup — to
  confirm live.
- No cart page object exists yet (§5.5 not implemented). AC3 needs the checkout/cart view where the rental
  label renders — to confirm live where "This is a rental item" appears (cart page vs. checkout wizard step).
- Navbar (`src/components/navbar.ts`): `rentalsNavLink`, `cartLink` (`nav-cart`), `cartQuantity`.
- Auth: AC3 checkout may require login. Prefer guest cart if the label shows pre-login; register via faker
  (`register.spec.ts`) + `LoginPage.login` only if the label only appears past the sign-in step.

## Assumptions — confirmed via live exploration (2026-07-07)

- [x] **Rentals listing (`/rentals`)** renders a different layout from the overview grid. Each rental is a
      `div.card.mb-3` wrapping a **`div.row.no-gutters[data-test^="product-"]` with `tabindex=0`** (the
      clickable/focusable element — **not** an `<a>`, so no `href`; clicking it routes to `/product/<id>`,
      confirmed). Inside: `img.img-fluid` (`title`/`alt` = product name), `h5.card-title` (name), and
      `p.card-text` (**full description** — overview cards show price, not description, so this genuinely
      differs). No price on the listing card, no `product-name`/`product-price` `data-test`. Page title
      "Rentals Overview - …". 3 rental products live now (Excavator, Bulldozer, Crane).
- [x] **Rental detail page** is the same `/product/<id>` component with the qty stepper **replaced** by a
      duration slider. `[data-test="quantity"]`/`increase-quantity`/`decrease-quantity` are **absent**
      (verified). The slider is `getByRole('slider', { name: 'ngx-slider' })` (min 1, max 10), with a
      `<label>` reading "Duration (1 hour(s))". Price block shows `$X.XX per hour / (Total $X.XX)`;
      `[data-test="unit-price"]` still present as a bare number. `add-to-cart` present.
- [x] **AC3 label wording differs from the plan.** The rental line in the cart shows
      **"Item for rent, price per hour"**, NOT the documented "This is a rental item". It renders on the
      **Cart step** of `/checkout` (reachable as a **guest — no login required**), as a `<small>` sibling of
      the `[data-test="product-title"]` span inside the item's `<td>` (`<small>` has no `data-test`) → locate
      via `getByText('Item for rent, price per hour')`. Record as a doc/behavior discrepancy (§9-style).
- [x] Rental products exist on prod (3 today). Still select the first card dynamically (no hard-coded id/name).

## Design decisions (confirmed after exploration)

- **`RentalsPage`** (extend the existing stub, keep it `extends BasePage` — the listing markup does _not_
  match `ProductListPage`, so no refactor): add `rentalCards` (`[data-test^="product-"]`),
  `rentalCardImages`, `rentalCardNames` (`h5.card-title`), `rentalCardDescriptions` (`p.card-text`), a
  `pageHeading` (`getByRole('heading', { name: 'Rentals' })`), and `clickRentalCard(index)`.
- **`ProductDetailPage`**: add `durationSlider` (`getByRole('slider', { name: 'ngx-slider' })`) and reuse the
  existing `quantityInput` for the stepper-absence assertion. AC2 only needs "slider shown, stepper absent" —
  no price-recalc helper (that belongs to the deferred §5.3 rental-slider AC).
- **New minimal `CartPage`** (`extends BasePage`, `PAGE_URL = /checkout`, new `PAGE_URLS.CHECKOUT`): the cart
  step lives at `/checkout` and no cart page object exists yet (§5.5 deferred). Add `productTitles`
  (`[data-test="product-title"]`) and `rentalItemLabel` (`getByText('Item for rent, price per hour')`).
  Register in `src/fixtures/pages.ts` (type + export). Keep minimal so §5.5 can extend it later.
- AC3 flow: `rentalsPage.goto()` → `clickRentalCard(0)` → `productDetailPage.addToCart()` →
  `cartPage.goto()` → assert `rentalItemLabel` visible. Guest session, no login. First rental selected
  dynamically, no cached id.

## Risks and constraints

- Shared/mutable production catalog (§3, §9): no hard-coded rental product name/price/id — select the first
  rental card dynamically, fetch its link immediately before use.
- Add-to-cart mutates a **cart/session**, not shared account data — safe for guest. If AC3 requires login,
  register a disposable faker user; never touch shared seeded accounts destructively (§3).
- Cart/session counts are session-local — assert the label's presence, not absolute cart totals (§3).
- AC1 "description on card" and AC3 label are display assertions — low destructive risk.

## Planned steps

1. [x] Step 0 scope confirmed (AC1, AC2, AC3; defer AC4 location discount).
2. [x] Step 1 this plan file.
3. [x] Step 2: live-explored `/rentals` listing, rental detail (slider vs. stepper), and the cart label.
4. [x] Step 3: assumptions confirmed above; plan-mode sign-off obtained.
5. [x] Step 5: implemented `RentalsPage`, `ProductDetailPage.durationSlider`, new `CartPage`
       (`PAGE_URLS.CHECKOUT`, fixtures registration), `tests/rentals.spec.ts`.
6. [x] Step 6: `TEST_PLAN.md` §13 added (findings + both discrepancies).
7. [x] Step 7: validated — lint + format clean; `rentals.spec.ts` 3/3; `@smoke` 11/11.
8. [x] Step 8: reported.

## Status: complete (2026-07-07)

### Final test set (3 tests, all green)

- `rentals listing shows each rental with an image, name and description` (@regression).
- `rental detail page shows a duration slider instead of the quantity stepper` (@regression).
- `rental item added to cart is labelled as a rental` (@smoke @regression) — asserts the real
  "Item for rent, price per hour" copy, not the documented "This is a rental item".

### Implementation note

The AC3 test waits on the navbar cart badge (`cartQuantity` = "1") after `addToCart()` before
navigating to `/checkout` — the add is an async cart write, and navigating immediately aborted it and
landed on an empty cart (caught on first run). Waiting on the badge both confirms the add and
serialises the navigation.

### Validation results

- `npm run lint` + `npm run format:check`: clean.
- `tests/rentals.spec.ts`: 3/3 pass.
- `@smoke` (incl. the new AC3 smoke test; `ProductDetailPage`/`NavbarComponent` touched): 11/11 pass.
