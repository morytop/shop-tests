# Customer profile (§5.14) — action plan

**Status:** completed (2026-07-09) — ready for review. Findings folded into `test_plan.md` §24.
**Scope confirmed with user:** all four ACs of `test_plan.md` §5.14 → `tests/ui/profile.spec.ts`

## Goal

Implement §5.14 "Customer profile":

- **AC1** — profile page shows current data for a freshly-registered logged-in user.
- **AC2** — all editable fields (first/last name, phone, street, postal code, city, state, country) can be
  updated and persist after save; success message fades after ~5s.
- **AC3** — email field is present but not editable (readonly/disabled).
- **AC4** — required-field validation prevents saving with a field blanked out.

## Assumptions and open questions (to confirm by live exploration)

1. `/account/profile` renders a profile form above/below the existing TOTP setup section (the current
   `ProfilePage` models only TOTP — §22/§5.13).
2. Field `data-test` ids are assumed to mirror registration (`first-name`, `last-name`, `dob`, `street`,
   `postal_code`, `city`, `state`, `country`, `phone`, `email`) — **must be verified live, not guessed.**
3. Unknown whether the "editable fields" list in §5.14 is accurate: registration also has `dob` and
   `house_number`; §16 confirmed `house_number` exists on billing though undocumented. Country may be a
   `<select>` (§9) rather than free text.
4. Unknown whether the success message is a toast (ngx-toastr, as elsewhere) or an inline alert, and whether
   it truly auto-dismisses at ~5s.
5. Unknown how required-field validation surfaces: §16 found billing uses `ng-invalid` + a disabled submit
   with **no** visible error text; profile may instead render `.alert-danger` text like the payment step (§17).
6. Whether saving requires re-entering anything (e.g. a password confirmation).

## Risks and constraints

- **Data safety (§3):** AC2 and AC4 mutate the account. They must register their own throwaway user
  (`registerUserWithApi`) and log in inline. They must **not** use `testUser1` (which is the shared seeded
  `customer@` account, per `CLAUDE.md`) and must **not** ride the `@logged` `storageState` session, since
  `tests/setup/login.setup.ts` shares one user across every `@logged` spec in a run and `checkout-address.spec.ts`
  §5.7 AC5 asserts on that user's stored address.
- AC1 and AC3 are read-only, but they still need a _freshly-registered_ user (AC1 asserts the form shows that
  user's own data), so they register their own user too. This keeps all four tests uniform and independent.
- Each test registering + logging in via the UI is slow; acceptable and consistent with `totp-setup.spec.ts`.
- **Docs may be stale (§9, §12, §14, §16, §17):** verify all copy/locators live before asserting. Record any
  mismatch in `test_plan.md`.
- Faker data only; no hard-coded catalog data is involved here.

## Planned steps

1. ✅ Read `test_plan.md` (§3, §5.14, §7, §9–§17), `CLAUDE.md`, `CODING_STANDARDS.md`, existing `ProfilePage`,
   `totp-setup.spec.ts`, user model/factories.
2. ✅ Confirm scope with the user (all four ACs).
3. Explore `/account/profile` live with the `playwright-cli` skill, using a freshly-registered account:
   capture the real field set, `data-test` ids, country control type, email field's readonly/disabled
   mechanism, save-button `data-test`, success-message element + copy + fade timing, and the required-field
   validation surface.
4. Update this plan with confirmed/rejected assumptions.
5. Extend `src/ui/pages/profile.page.ts` with the profile-form locators + action methods
   (`updateProfile(user)`, `getProfileValues()`-style readers as locators, `save()`). No `expect()`.
   Reuse `RegisterUser` (or a narrower `ProfileUser` model) rather than a new ad hoc shape.
   No fixture change needed — `profilePage` is already registered.
6. Write `tests/ui/profile.spec.ts` with the four ACs, tagged `['@auth', '@profile', '@regression']`
   (`@profile` is a new feature tag in the §3 taxonomy's "plus feature tags" spirit; add it to `test_plan.md`).
   Traceability comments per §7.
7. Update `test_plan.md`: new findings section for §5.14, plus any doc/behavior discrepancies found.
8. Validate: `npm run lint`, `npm run format:check`, `npm run tsc:check`, run `tests/ui/profile.spec.ts`,
   plus `--grep @smoke` and `totp-setup.spec.ts` (shares `ProfilePage`).
9. Report; mark this plan completed.

## Exploration findings (2026-07-09, live via `playwright-cli`, fresh API-registered probe user)

Assumptions 1 and 2 **confirmed**; 3, 4, 5 **rejected as written** — details below.

**Confirmed page contract.** `/account/profile` (`<title>` "Profile - …") stacks three sections:
`<h1 data-test="page-title">Profile</h1>` + profile form, `<h2>Password</h2>` + change-password form (§5.15),
`<h2>Set up Two-Factor Authentication</h2>` (§5.13, already modelled). Three `<form>`s on the page.

- Profile form fields, all `input[type=text]` with `data-test`: `first-name`, `last-name`, `email`, `phone`,
  `street`, `postal_code`, `city`, `state`, `country`. Submit is `[data-test="update-profile-submit"]`.
- **`dob` and `house_number` are NOT on the profile form** even though registration collects them
  (assumption 3, first half: the §5.14 field list is accurate as written).
- **`country` is a free-text `<input>` here, not the `<select>` the billing step uses** (assumption 3,
  second half: rejected). So no ISO-code matching problem — any string saves.
- **`email` is `readonly` (attribute present), not `disabled`** — it is in the tab order and its value posts.
- No `required` and no `maxlength` attributes anywhere on the form.

**Save + success message (assumption 4: rejected — it's an inline alert, not a toast).** `PUT /users/{id}`.
Success renders `<div class="alert alert-success mt-3">Your profile is successfully updated!</div>` **inside the
profile `<form>`**, and is **removed from the DOM** (detached, not merely hidden) after a measured **5444 ms** —
so the documented "~5s fade" holds. Values persist across a reload.

**Required-field validation (assumption 5: rejected — errors ARE rendered as text, and the submit is never
disabled).** Unlike the billing step (§16), the profile form:

- keeps `[data-test="update-profile-submit"]` **enabled** even with blanked fields, and **does fire the `PUT`**;
- surfaces the **server's** 422 messages in a single `.alert.alert-danger` inside the form (one alert element,
  messages newline-joined when several fields are blank);
- marks the offending input `ng-invalid` (`ng-dirty ng-invalid ng-touched`).

Only **5 of the 8 editable fields are required**, and their message copy uses the API's dotted payload path:

| Blanked field | Error copy                               |
| ------------- | ---------------------------------------- |
| `first-name`  | `The first name field is required.`      |
| `last-name`   | `The last name field is required.`       |
| `street`      | `The address.street field is required.`  |
| `city`        | `The address.city field is required.`    |
| `country`     | `The address.country field is required.` |

`phone`, `postal_code` and `state` are **optional** — blanking them saves successfully. §5.14's blanket
"required-field validation" is therefore only true for those five fields.

**Assumption 6 rejected:** saving the profile needs no password confirmation (password lives in its own form).

**Async load = a real synchronization hazard.** The form is populated by `GET /users/me` after navigation, and
Angular sets the input **`value` property only — `getAttribute('value')` stays `null`**. A `fill()` issued before
that response lands is silently overwritten (observed). `ProfilePage` therefore needs a `waitForProfileLoaded()`
gate; it cannot be expressed as a `.filter({ hasText })` (inputs have no text), so it uses
`page.waitForFunction` on the input's `value` property — a wait, not an assertion, so the no-`expect()` rule holds.

## Design decisions

- New `ProfileDetails` model + `RequiredProfileField` union (`src/ui/models/user.model.ts`) and a
  `prepareRandomProfileDetails()` faker factory (`src/ui/factories/user.factory.ts`).
- `ProfilePage` gains the form locators, a `profileFields: Record<keyof ProfileDetails, Locator>` map (mirroring
  `CheckoutAddressPage.textFields`, so AC4 can be parameterized per required field), `waitForProfileLoaded()`,
  `fillProfile()`, `submitProfile()`, `updateProfile()`, and form-scoped `profileSuccess` / `profileError` alerts.
- Alerts are scoped to the profile `<form>` (`page.locator('form').filter({ has: updateProfileButton })`) so the
  sibling change-password form's own `.alert-*` can never satisfy them.
- All four ACs register their own user via `registerUserWithApi` and log in inline (never `testUser1`, never the
  `@logged` storageState session) — AC1/AC3 because they assert on that user's own data, AC2/AC4 because they mutate.
- Tags: `['@auth', '@profile', '@regression']`.
