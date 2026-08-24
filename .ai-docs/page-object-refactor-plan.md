# Page Object cleanup: shared helpers, toast/confirmation locators — action plan

## Goal

Four small review findings on `src/ui/pages`, each confirmed against the code and,
where the finding concerned live app behavior, against the running app at
practicesoftwaretesting.com via `playwright-cli` (not assumed from docs alone):

1. `gotoAndAwaitLoaded()` is duplicated verbatim (only the API path differs) across
   `messages.page.ts`, `invoices.page.ts`, `favorites.page.ts`, `admin-dashboard.page.ts`.
2. `AccountPage` is a 1-locator class (`pageTitle`); that same
   `this.pageTitle = this.page.getByTestId('page-title')` line is duplicated across
   `profile.page.ts`, `messages.page.ts`, `invoices.page.ts`, `favorites.page.ts`,
   `account.page.ts` (6 including `admin.page.ts`, which already solves this correctly
   for the admin section).
3. `cart.page.ts`'s `updateToast` uses a raw `.toast-message` CSS locator + `toHaveText()`.
4. `checkout-payment.page.ts`'s `orderConfirmation` is a raw `#order-confirmation` ID
   selector with a comment noting there's "no data-test, only an id".
5. `fillAndBlur` in `checkout-payment.page.ts` is `private` — investigated, no change
   needed (see below).

## Live findings

- **Toast**: adding a product to cart then updating its quantity on `/checkout`, the
  `.toast-message` element itself carries `role="alert"` (verified via DOM inspection —
  `getAttribute('role')` on the toast node itself, not just an ancestor). Only one toast
  type (success) appears in the cart quantity-update flow — unlike product-detail's
  add-to-favorites flow, which needs typed `.toast-success`/`.toast-error` locators
  because a success and an error toast can legitimately follow the same action there.
  No stacking risk for `cart.page.ts`.
- **Order confirmation**: completing a guest Cash-on-Delivery checkout, `#order-confirmation`
  has no ARIA role and no `aria-live`; its only stable content is the text
  `"Thanks for your order! Your invoice number is INV-<n>."`. A Playwright
  `page.getByText(/Thanks for your order! Your invoice number is INV-\d+/)` resolved to
  exactly 1 element live.

**Decision on the toast (user call):** use the exact form proposed —
`getByRole('alert', { name: 'Product quantity updated.' })` + `toBeVisible()` — accepting
that this bakes the toast copy into the Page Object. That departs from the documented
convention in `.ai-docs/product-detail-core-plan.md` ("toast locator kept generic; the
expected string lives in the spec assertion, no hardcoded text in the POM"), but it's a
deliberate, confirmed exception for this one locator, not a suite-wide convention change —
`product-detail.page.ts`'s `successToast`/`errorToast` and their spec assertions are
untouched.

## Changes

### 1. Extract `gotoAndAwaitLoaded` boilerplate into `BasePage`

`src/ui/pages/base.page.ts` gains a `protected` helper:

```ts
protected async gotoAndAwaitApi(
  apiPath: string,
  options?: WaitForApiOptions,
): Promise<void> {
  await Promise.all([waitForApi(this.page, apiPath, options), this.goto()]);
}
```

`messages.page.ts`, `invoices.page.ts`, `favorites.page.ts`, `admin-dashboard.page.ts`
each reduce their `gotoAndAwaitLoaded()` body to one call, e.g.:

```ts
async gotoAndAwaitLoaded(): Promise<void> {
  await this.gotoAndAwaitApi(API_PATHS.MESSAGES, { method: 'GET' });
}
```

Public method name/behavior is unchanged — no spec changes needed.

### 2. `pageTitle` hoisted onto `BasePage`

Initial plan was an intermediate `AccountAreaPage` shell (mirroring the existing
`AdminPage` pattern). User call (mid-implementation): hoist `pageTitle` directly onto
`BasePage` instead, accepting that every page object now carries a `pageTitle` locator
even though only account/admin pages actually render that element — simpler than adding
another intermediate class for one locator.

```ts
// base.page.ts
export abstract class BasePage {
  readonly page: Page;
  abstract readonly PAGE_URL: string;
  readonly pageTitle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = this.page.getByTestId('page-title');
  }
  ...
}
```

`account.page.ts`, `profile.page.ts`, `messages.page.ts`, `invoices.page.ts`,
`favorites.page.ts` drop their own duplicated `pageTitle` line and extend `BasePage`
directly (unchanged from before). `AccountPage` shrinks to just its `PAGE_URL`:

```ts
export class AccountPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.ACCOUNT;
}
```

**`admin.page.ts` removed too**, for consistency: once `pageTitle` lives on `BasePage`,
`AdminPage`'s own `pageTitle` assignment was pure duplication and the class had no other
content, so it would otherwise be an empty shell doing nothing. `AdminDashboardPage`,
`AdminListPage`, `AdminSalesReportPage`, `AdminSettingsPage`, `AdminStatisticsPage` now
extend `BasePage` directly.

`AccountPage` is **not** removed — `PAGE_URLS.ACCOUNT` still needs a page object for the
`accountPage` fixture, and this thin-URL-holder shape is the same one already accepted
for `HandToolsPage`/`OtherPage`/`PowerToolsPage`/`SpecialToolsPage` (thin subclasses of
`ProductListPage`, unchanged — that abstract base holds real shared grid/filter logic
beyond a single locator, so it stays).

### 3. `cart.page.ts` — role + name toast locator

```ts
this.updateToast = this.page.getByRole('alert', {
  name: 'Product quantity updated.',
});
```

`tests/ui/cart.spec.ts`: `toHaveText('Product quantity updated.')` → `toBeVisible()`.

### 4. `checkout-payment.page.ts` — text-based order confirmation locator

Named regex constant in `src/ui/constants/formats.ts`:

```ts
export const ORDER_CONFIRMATION_REGEX =
  /Thanks for your order! Your invoice number is INV-\d+\./;
```

```ts
this.orderConfirmation = this.page.getByText(ORDER_CONFIRMATION_REGEX);
```

`confirmOrder()`/`readInvoiceNumber()` keep working unchanged (same property, same text,
only the selector strategy changes). `tests/ui/checkout-e2e.spec.ts` (both assertions):
`toContainText(/Your invoice number is INV-\d+/)` → `toBeVisible()`.

### 5. `fillAndBlur` — no change

`private`, called only by `fillBankTransfer`/`fillCreditCard`/`fillGiftCard` on the same
class, never by a spec. Encapsulates an app-specific quirk (these forms validate on
blur, not on keystroke) as an implementation detail of the composite fill methods.

## Verification

- `npm run tsc:check`, `npm run lint`.
- `npx playwright test tests/ui/cart.spec.ts tests/ui/checkout-e2e.spec.ts tests/ui/messages.spec.ts tests/ui/invoices.spec.ts tests/ui/favorites.spec.ts tests/ui/profile.spec.ts tests/ui/login.spec.ts tests/ui/register.spec.ts tests/ui/change-password.spec.ts tests/admin/dashboard.spec.ts`
