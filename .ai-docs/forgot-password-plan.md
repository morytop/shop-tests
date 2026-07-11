# Forgot password (§5.12) — action plan

**Status:** ✅ completed / ready for review (2026-07-09)
**Scope confirmed:** 2026-07-09 — all four ACs of `TEST_PLAN.md` §5.12, in `tests/ui/forgot-password.spec.ts`.

## Goal

Implement `tests/ui/forgot-password.spec.ts` covering §5.12:

- **AC1** — Form accessible from login page with an email field.
- **AC2** — Invalid/non-RFC email format is rejected client-side.
- **AC3** — Valid registered email → success/confirmation message, which fades out after ~3s.
- **AC4** — Unregistered email → error message shown.

## Assumptions (to confirm/reject during exploration — Step 2)

1. A forgot-password route exists and is reachable by a link/button on `/auth/login`. Route path unknown
   (`/auth/forgot-password`? `/forgot-password`?) — must be read live, not guessed. `PAGE_URLS` has no entry yet.
2. The form has a single email field plus a submit button, with `data-test` ids consistent with the rest of the
   app (`data-test="email"`, `data-test="forgot-password-submit"`?).
3. Following `register.spec.ts` (§19), validation is likely **submit-gated** (`updateOn: 'blur'`, inline
   `*-error` blocks only rendered after `submitted`). AC2 therefore probably needs a submit click, not just a
   blur, and the error copy is probably "Email format is invalid" (matching registration).
4. AC3's "fades out after ~3s" implies an ngx-toastr toast or a timed `@if` — mechanism unknown. Whether the
   fade is 3s exactly is a timing assertion that risks flake; prefer asserting appear-then-disappear with a
   generous `toBeHidden()` timeout over pinning the exact duration.
5. AC4 assumes the app distinguishes registered vs unregistered emails. **This may be false** — many apps
   return a generic success for unknown emails to prevent account enumeration. If so, AC4 as documented is a
   doc/behavior discrepancy and must be pinned to actual behavior + recorded in `TEST_PLAN.md` §9-style notes.

## Source-of-truth read (pinned v5.0) — 2026-07-09, pre-live

Read `sprint5/UI/src/app/auth/forgot-password/*`, `shared/customer-account.service.ts`,
`assets/i18n/en.json`, `API/app/Http/Controllers/UserController.php`, `API/app/Services/UserService.php`.
**All of this is a first draft only — prod has drifted ahead of the pinned source before (§17, §19). Verify live.**

- **Route:** `/auth/forgot-password` (`auth.module.ts`), title "Forgot Password". Login page links it as
  "Forgot your Password?" (`en.json` → `header/buttons.forgot-password`).
- **Locators:** `data-test="forgot-password-form"`, `data-test="email"`, `data-test="email-error"`,
  `data-test="forgot-password-submit"` (submit value = "Set New Password").
- **Validation is submit-gated**, not blur-gated: `onSubmit()` sets `submitted = true` and the error block is
  `@if (email.invalid && submitted)`. So AC2 needs a submit click. (Different from register's `updateOn:'blur'`.)
- **⚠ AC2 likely renders an EMPTY error box (suspected prod bug).** The control uses
  `Validators.pattern(...)`, which populates `errors.pattern` — but the template only prints text for
  `errors.required` and `errors['email']` (the key `Validators.email` would set). A malformed-but-non-empty
  email therefore makes the outer `data-test="email-error"` alert visible with **no inner text**. Same shape
  as the §17 card-holder-name finding. **Verify live.**
- **⚠ AC3 success copy may render a raw i18n key (suspected prod bug).** Template reads
  `t('page.forgot-password.confirm')` (singular `page.`) but `en.json` only defines
  `pages.forgot-password.confirm` = "Your password is <strong>successfully</strong> updated!". There is no
  top-level `page` key, so transloco should fall back to echoing the key string. **Verify live.**
- **AC3 fade:** `fadeOutMessage()` sets `hideAlert = true` via a 3000 ms `setTimeout`, and the alert is
  `@if (isUpdated && !hideAlert)` — so the element is **removed from the DOM** after ~3s (it returns no class,
  so there is no CSS fade transition). Assert appear → `toBeHidden()`, not an opacity/class.
- **AC4:** API validates `['email' => 'exists:users,email']` → **422** for an unknown address, body
  `{message: "The selected email is invalid.", ...}`. `errorHandler` rethrows the body, component sets
  `error = err.message` → rendered in an `.alert-danger[role=alert]`. So AC4 is real: **no anti-enumeration
  generic success**, rejecting plan assumption 5. The error alert is fade-gated by the same `hideAlert`.

## 🚨 Destructive-endpoint finding (supersedes the §3 risk note)

`UserService::resetPassword()` does **not** send a reset link. It sets the account's password to a hardcoded
**`welcome02`** immediately, then (only in `local` env) mails it. There is no token, no confirmation step.

Consequences, load-bearing for this task:

- Submitting **any** registered email through this form **permanently changes that account's password**.
- AC3 must therefore use a **disposable, freshly API-registered** user. Using `testUser1` (the env-backed
  `USER_EMAIL`) would reset it to `welcome02` and break `login.spec.ts` + `tests/setup/login.setup.ts` for
  every subsequent run and every other engineer. Using `customer@`/`admin@` is forbidden outright (§3).
- This also means the app's own success copy ("Your password is successfully updated!") is accurate, and §5.12
  AC3's framing as a "confirmation message" (implying an email was sent) understates what happened.

## Live verification results (2026-07-09, playwright-cli + curl against prod, build `v2.3 | Built 2026-07-06`)

Every pre-live assumption above was checked. Outcome: **both suspected bugs are real and live**, the
destructive reset is real, and one piece of error copy has drifted from the pinned source.

| #   | Assumption                                       | Verdict                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Route `/auth/forgot-password`, linked from login | ✅ Confirmed. Link has `data-test="forgot-password-link"` (not in pinned source), `aria-label="Forgot your Password?"`. Page `<h1>` = "Forgot Password"; document title = "Forgot Password - …".                                                                                                                                             |
| 2   | `data-test` ids                                  | ✅ Confirmed exactly: `forgot-password-form`, `email`, `email-error`, `forgot-password-submit` (submit `value="Set New Password"`).                                                                                                                                                                                                          |
| 3   | Submit-gated validation                          | ✅ Confirmed — errors appear only after clicking submit. Not blur-gated.                                                                                                                                                                                                                                                                     |
| 4   | AC2 renders an **empty** error box               | ✅ **BUG CONFIRMED.** Malformed email → `[data-test="email-error"]` visible, `innerHTML` = `<!----><!---->`, `textContent` = `""`. Empty email → the box _does_ render "Email is required". Input gets `ng-invalid is-invalid` both ways. **No network request fires** in either case (checked `requests`), so "rejected client-side" holds. |
| 5   | AC3 success renders a raw i18n key               | ✅ **BUG CONFIRMED.** POST returns `200 {"success":true}` and the alert renders literally `page.forgot-password.confirm` — not "Your password is successfully updated!". Template reads `t('page.…')`, i18n defines `pages.…`.                                                                                                               |
| 6   | AC3 message removed after ~3s                    | ✅ Confirmed. Shown at 507 ms, hidden at 3917 ms (~3.4 s visible). Element is **detached**, not faded — `fadeOutMessage()` returns no class.                                                                                                                                                                                                 |
| 7   | AC4 real error, no anti-enumeration              | ✅ Confirmed. Unknown email → **422** `{"message":"The selected email is invalid.",…}`; alert `.alert-danger[role=alert]` shows "The selected email is invalid." **5/5 runs deterministic.** It also auto-hides after ~3 s (same `hideAlert` timer).                                                                                         |
| 8   | Password reset is destructive                    | ✅ **CONFIRMED ON PROD.** Registered a disposable user → login with its password = 200. Submitted its email to the forgot-password form → login with the original password now **401**, login with `welcome02` = **200**. The account's password really is silently overwritten.                                                             |

**Anomaly worth recording:** one early run rendered `"Something went wrong "` instead of the 422 copy, at a
moment the API was slow (~2.5 s). That string exists **nowhere** in the pinned source, so prod's build carries
a generic fallback for non-422 responses. It did not reproduce in 5 consecutive runs. Mitigation: the spec
awaits the `POST /users/forgot-password` response before asserting (the `LoginPage.loginAndAwaitResponse`
pattern from §20) rather than racing a slow API, so a transient 5xx surfaces as a clear failure rather than a
copy mismatch.

## Design decisions

- **New `ForgotPasswordPage`** (`src/ui/pages/forgot-password.page.ts`), extends `BasePage`,
  `PAGE_URL = PAGE_URLS.FORGOT_PASSWORD` (new constant `/auth/forgot-password`). Registered in the `Pages`
  type + `pageObjectTest`.
- **`LoginPage` gains `forgotPasswordLink` + `openForgotPassword()`** — a single-page action, so it belongs on
  that page object rather than a fixture (`CODING_STANDARDS.md` Page Object rule 3).
- **Two submit methods**: `submit(email)` (fire-and-forget — AC2 never reaches the network, so awaiting a
  response there would hang) and `submitAndAwaitResponse(email)` for AC3/AC4.
- **Alert locators** compose role + class (`getByRole('alert').and(locator('.alert-success'))`) rather than a
  bare CSS string, per the locator-composition standard. Neither alert has a `data-test`.
- **AC2 pins the bug**: assert the error box is visible _and_ has empty text for malformed input, and assert no
  server-side alert appears (proving client-side gating). The empty-email required case is asserted separately
  with its real copy, so the spec documents both halves.
- **AC3 uses `registerUserWithApi(usersRequest)`** — a disposable user, per the destructive finding above.
  The spec deliberately does **not** re-login afterwards (that would be a §5.15-ish assertion and needs no
  coverage here); the reset is documented in `TEST_PLAN.md` instead.
- Tags: `@auth`, `@forgot-password`, `@regression` (AC1 also `@smoke`? — no: keep the smoke suite as defined in
  §4, which doesn't list forgot-password).

## Risks & constraints

- **Data safety (§3):** AC3 needs a _registered_ email. Must register a disposable user via
  `registerUserWithApi(usersRequest)` (the §20 lockout pattern) — **never** `testUser1` or the shared seeded
  `customer@` / `admin@` accounts. A password-reset request against a shared account could invalidate its
  password for every other engineer/CI run. This is the single biggest hazard in this section.
- **No real email verification (§2):** assert only on UI confirmation copy.
- **Prod drift (§17, §19):** the pinned v5.0 source is a good first draft but production has drifted ahead of
  it before (gift-card rules, duplicate-email copy). Verify all copy live before asserting it verbatim.
- **No hash routing (§20):** any manual URL must use path routes (`/auth/...`), not `/#/...`.
- **Lint (`CODING_STANDARDS.md`):** no `if`/ternary/`?.`/`??` in test bodies; no `expect()` in page objects;
  locators are `readonly` constructor properties, never method-built.
- Timing-based assertion (AC3 fade) is the most likely source of flake — keep it tolerant.

## Planned steps

1. ~~Confirm scope with the user.~~ Done — all four ACs.
2. ~~Write this plan file.~~ Done.
3. ~~Survey existing code~~ — `login.page.ts`, `register.page.ts` (submit-gated error pattern), `page-urls.ts`,
   `page-object.fixture.ts`, `user-register.api.factory.ts`. Done.
4. ~~Explore live (playwright-cli + curl).~~ Done — results in the table above; all assumptions resolved.
5. ~~Implement `src/ui/pages/forgot-password.page.ts`~~ + `PAGE_URLS.FORGOT_PASSWORD` + fixture registration +
   `LoginPage.openForgotPassword()`. Done.
6. ~~Implement `tests/ui/forgot-password.spec.ts`~~ — 5 test blocks / 7 cases (AC2 parametrized over 3
   malformed addresses). Done.
7. ~~Update `TEST_PLAN.md`~~ — §5.12 marked implemented + destructive warning; new §21 findings section.
   `CLAUDE.md`'s spec inventory updated too. Done.
8. ~~Validate.~~ `npm run lint` ✅, `npm run format:check` ✅, `npm run tsc:check` ✅,
   `forgot-password.spec.ts` 7/7 ✅, `login.spec.ts` 3/3 ✅ (proves `testUser1`'s password was not reset),
   `--grep @smoke` 18/18 ✅.
9. ~~Report; mark this file completed.~~ Done.

## Outcome

All four ACs implemented and green; no regressions. Two production bugs found and **pinned** (empty AC2 error
box; raw i18n key in the AC3 success banner) rather than asserted as the docs describe them — same convention
as §17/§19. The headline discovery is the **destructive, token-less password reset** (§21), which is a
data-safety hazard for the whole suite and arguably a security finding to raise with the team, alongside the
fact that the form **distinguishes registered from unregistered emails** (no anti-enumeration).

### Follow-ups to raise (outside this scope — not silently expanded)

- The reset-to-`welcome02` behavior and the account-enumeration oracle both deserve a report to the app team.
- A test asserting the password _actually_ becomes `welcome02` would strengthen AC3, but that is really a
  §5.15 (change-password) concern and was left out deliberately.
- §5.12 has no `@smoke` case, matching the §4 suite definition. If forgot-password is considered critical
  path, AC1 is the natural candidate.

## Design decisions (filled in during implementation — Step 5)

_TBD_

## Outcome

_TBD_
