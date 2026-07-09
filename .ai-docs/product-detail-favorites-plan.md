# Product detail — favorites ACs (§5.3) — action plan

## Goal

Cover the two favorites ACs of `test_plan.md` §5.3 in the existing `tests/ui/product-detail.spec.ts` — the ones
deliberately deferred by the §5.16 pass (see §26 / `.ai-docs/favorites-plan.md`):

1. **Favorites (logged in)** — add succeeds with a success message; adding the same product again shows an
   "already in favorites" message.
2. **Favorites (logged out)** — clicking "Add to favourites" shows an "Unauthorized..." message and **does not
   persist anything**.

Scope confirmed by the user: these §5.3 favorites ACs only. Nothing else in §5.3 changes.

## Assumptions and open questions

- **A1.** The exact toast copy for AC1 is already known from the §5.16 exploration (recorded in `test_plan.md` §26):
  add → `Product added to your favorites list.`; second add → `Product already in your favorites list.` Both are
  ngx-toastr `.toast-message` toasts. (Re-verify live; §26 was observed, not asserted.)
- **A2.** The logged-out copy is documented only as `"Unauthorized..."` in §5.3, which reads like a placeholder
  rather than real copy. **Must be read off the live app / the `sprint5/UI` source, never guessed.**
- **A3.** AC2's "does not persist anything" needs an observable. Candidates, in order of preference:
  (a) the `POST /favorites` is never fired at all (client-side guard), or
  (b) it fires and returns 401. Which one holds decides the assertion — a network-level check either way. Resolve
  from the component source (`product/detail`) plus a live network capture.
- **A4.** The toast locator on `ProductDetailPage` is currently named `cartToast` (`.toast-message`), which is the
  generic ngx-toastr body, not a cart-specific element. Reusing it for favorites assertions under that name is
  misleading. Proposal: rename to `toast` and update its single existing usage
  (`product-detail.spec.ts:76`). Needs sign-off — it touches an existing assertion.
- **A5.** `ProductDetailPage.addToFavoritesAndAwaitSaved()` (added in the §5.16 pass) awaits a `POST /favorites`
  response, so it is **wrong for both of the negative paths here**: the logged-out path may fire no POST at all, and
  the duplicate-add path's response status is unknown. Likely needs a plain `addToFavorites()` click action
  alongside it, with the spec asserting on the toast.

## Risks and constraints

- **Data safety (`test_plan.md` §3).** AC1 mutates the account's favorites ⇒ it must register its own throwaway user
  via `registerUserWithApi(usersRequest)` and log in inline. Never `testUser1` (it **is** the seeded `customer@`
  account) and never the `@logged` `storageState` session user (shared across every `@logged` spec in a run).
  AC2 is logged out, so it needs no account at all — and must not create one.
- **`product-detail.spec.ts` currently fails 3 pre-existing tests on `main`** (quantity stepper, manual quantity
  clamp, add-to-cart confirmation) because the first home-grid card is an API-mutated, out-of-stock product
  (`test_plan.md` §26). These are **not** mine to fix in this pass, but they are in the file I'm editing — I must not
  mistake them for regressions, and I must confirm my additions pass independently of them.
- Favorites work fine on an out-of-stock product, so the first card remains a valid target (verified in §26).
- No hard-coded catalog data (§3/§9) — the product is the first live card, reached by clicking, not by URL.
- `playwright/no-conditional-in-test` is enforced (`--max-warnings=0`): no `if` / ternary / `?.` / `??` in tests.
- No `expect()` in page objects; sync via `waitFor()`.
- ngx-toastr toasts auto-dismiss — a second toast may coexist with, or replace, the first. The duplicate-add test
  must not race two toasts (assert on the _last_ toast, or wait for the first to clear).

## Planned steps

1. Write this plan file. ✅
2. Survey `tests/ui/product-detail.spec.ts`, `src/ui/pages/product-detail.page.ts`, and the §5.16 additions.
3. **Explore**: read the `sprint5/UI` product-detail component source for the logged-out guard (resolves A2/A3),
   then confirm live with `playwright-cli` — the logged-out copy, whether `POST /favorites` fires, and the
   duplicate-add toast behavior (resolves A1/A5). Fold findings back into this file.
4. Design sign-off via plan mode (3 tests + a rename touching an existing assertion is beyond a trivial addition).
5. Implement page-object additions + the three tests in `product-detail.spec.ts`, tagged per §3.
6. Update `test_plan.md`: mark the §5.3 favorites ACs implemented, correct the "Unauthorized..." copy if it differs,
   and note that §26's "still deferred" line is now closed.
7. Validate: `lint`, `format:check`, `tsc:check`; run the new tests; run the whole `product-detail.spec.ts` and
   confirm the only failures are the 3 known pre-existing ones; re-run `favorites.spec.ts` and `rentals.spec.ts`
   (they share `ProductDetailPage`).
8. New branch → conventional commit → PR.

## Live exploration findings (2026-07-09) — resolves A1–A5

Read `sprint5/UI/src/app/products/detail/detail.component.ts` + `assets/i18n/en.json`, then confirmed live with
`playwright-cli` (logged out, and with a throwaway API-registered user `fav2.1783631975@example.com`).

`DetailComponent.addToFavorites()` always fires `POST /favorites` and branches purely on the **server's** error
message — there is no client-side auth guard:

```ts
next: () => toastr.success('toasts.product-added-to-favorites');
error: (r) =>
  r.error.message === 'Duplicate Entry'
    ? toastr.error('toasts.product-already-in-favorites')
    : r.error.message === 'Unauthorized'
      ? toastr.error('toasts.unauthorized-favorite')
      : nothing;
```

Measured, end to end:

| Case              | `POST /favorites`    | toast class     | copy                                                       |
| ----------------- | -------------------- | --------------- | ---------------------------------------------------------- |
| logged in, first  | **201** Created      | `toast-success` | `Product added to your favorites list.`                    |
| logged in, repeat | **409** Conflict     | `toast-error`   | `Product already in your favorites list.`                  |
| logged out        | **401** Unauthorized | `toast-error`   | `Unauthorized, can not add product to your favorite list.` |

- **A1 CONFIRMED** — §26's recorded copy is exact.
- **A2 RESOLVED.** §5.3's `"Unauthorized..."` is an abbreviation, not the copy. Real string is
  `Unauthorized, can not add product to your favorite list.` ⇒ `test_plan.md` needs the full text.
- **A3 RESOLVED — option (b).** The `POST` **is** fired while logged out and is rejected **server-side with 401**;
  nothing is written. So "does not persist anything" is observable as _the response status is 401 and no success
  toast appears_, not as "no request is made".
- **A4 — rename justified.** The toasts are distinguished by container class (`.ngx-toastr.toast-success` /
  `.toast-error`), which the generic `.toast-message` (`cartToast`) cannot express: in the duplicate-add test the
  success toast from the first add can still be on screen when the error toast for the second arrives, so a generic
  `.toast-message` assertion would race the two. ⇒ replace `cartToast` with typed `successToast` / `errorToast`
  locators and update its single usage (`product-detail.spec.ts:76`). `CartPage.updateToast` is untouched.
- **A5 CONFIRMED.** `addToFavoritesAndAwaitSaved()` is misnamed for the negative paths — `waitForResponse` matches
  any status, so the method already works for 401/409, but "Saved" is a lie. Rename to
  `addToFavoritesAndAwaitResponse()` and have it **return the HTTP status**, giving the specs the exact observable
  AC2 needs. Its three call sites in `favorites.spec.ts` ignore the return value and are otherwise unchanged.
- Toast auto-dismiss took ~16s in the wild; typed locators sidestep the timing entirely.

## Design (for sign-off)

**`src/ui/pages/product-detail.page.ts`**

- Replace `cartToast` with `successToast` (`.ngx-toastr.toast-success`) and `errorToast` (`.ngx-toastr.toast-error`).
- Rename `addToFavoritesAndAwaitSaved()` → `addToFavoritesAndAwaitResponse(): Promise<number>`, returning
  `response.status()`.

**`tests/ui/favorites.spec.ts`** — update the three call sites to the new method name (behavior unchanged).

**`tests/ui/product-detail.spec.ts`** — update `cartToast` → `successToast` at line 76, and append three tests inside
the existing `describe`:

1. `add a product to favorites shows a success message` — `@auth @favorites @regression`. Throwaway user, login
   inline, click card 0, add → status **201**, `successToast` has the add copy.
2. `adding the same product to favorites twice reports it is already there` — `@auth @favorites @regression`.
   Throwaway user, add twice → second status **409**, `errorToast` has the duplicate copy.
3. `add to favorites while logged out is rejected as unauthorized` — `@favorites @regression`. No login (the default
   `chromium` project is unauthenticated), add → status **401**, `errorToast` has the unauthorized copy, and
   `successToast` has count 0 — i.e. nothing was persisted.

Tests 1–2 mutate an account's favorites ⇒ each registers its own throwaway user via `registerUserWithApi` (§3).
Test 3 creates no account at all. Product is always the first live card, never a hard-coded id (§3/§9).

## Status

**COMPLETED 2026-07-09 — ready for review.** A1–A5 resolved, design signed off, both §5.3 favorites ACs implemented
(3 tests) and passing.

Files touched: `src/ui/pages/product-detail.page.ts` (typed toast locators + method rename),
`tests/ui/product-detail.spec.ts` (3 new tests + `cartToast` → `successToast`), `tests/ui/favorites.spec.ts`
(3 call sites renamed), `test_plan.md` (§5.3 + amended §26 + new §27).

Validation: `lint` / `format:check` / `tsc:check` clean; the 3 new tests 3/3; **all 9** of `product-detail.spec.ts`
passing; `favorites.spec.ts` + `rentals.spec.ts` (share `ProductDetailPage`) 6/6.

**The 3 pre-existing failures recorded in §26 are gone.** They were catalog-driven, not code: the mutated
out-of-stock first product (`UpdatedProduct-test_products`) reverted to `Combination Pliers` (in stock) between the
two passes. §26 has been amended with the durable takeaway — position-based product selection is unsafe for
cart-driving ACs on a shared, mutable catalog — and a follow-up is flagged there, outside this scope.

**Remaining §5.3 gaps (unchanged):** discounted-product badge (unautomatable, §10) and the rental duration slider +
price recalculation.
