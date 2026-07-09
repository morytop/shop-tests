# Change password (§5.15) — action plan

## Goal

Implement `tests/ui/change-password.spec.ts` covering all six ACs of `test_plan.md` §5.15:

1. Form shows current / new / confirm fields.
2. Password strength indicator mirrors registration behavior for the new password field.
3. Mismatched new/confirm → `Passwords do not match.`
4. Wrong current password → `Your current password does not matches with the password.`
5. New password identical to current → `New Password cannot be same as your current password.`
6. Valid change → success message, then automatic logout after ~5s (assert redirected/unauthenticated).

Scope confirmed by the user: §5.15 only, all ACs. Finish with a new branch, a commit, and a PR.

## Assumptions and open questions

- **A1.** The change-password form lives on `/account/profile`, below the profile form, under an `<h2>Password</h2>`
  heading — confirmed by §24's live page contract. So this extends `src/ui/pages/profile.page.ts`; **no new page
  object, no fixture change.** (To verify.)
- **A2.** AC2 "mirrors registration behavior" is ambiguous. Registration's strength meter is **broken in production**
  (§19/§9: `(input)` handler reads the pre-update value, bar stays `0%`, no active label — pinned as a bug by
  `register.spec.ts`). But §9's 2026-07-04 sweep lists "Change-password strength indicator
  (Weak/Moderate/Strong/Very Strong/Excellent)" under **"Confirmed live, matches docs"**. These two can't both be
  true of the same code path. Must resolve live before writing AC2: either the meter works here (assert real
  labels/widths) or it is equally broken (pin the bug, mirror `register.spec.ts`'s approach).
- **A3.** AC3/AC5 error copy reads like client-side validation; AC4 reads like a server 4xx. Which banner element
  each lands in (and whether the submit button ever disables) is unverified. §24 warns the change-password form
  renders its **own** `.alert-*` banners as siblings of the profile form's — so any new alert locator must be scoped
  to the password form, exactly as `profileSuccess`/`profileError` are scoped to the profile form.
- **A4.** AC6's "automatic logout after ~5s" — unverified whether it redirects to `/auth/login` or just clears the
  session. §24 measured the profile form's analogous "~5s" fade at **5.4s**, so real timeouts need headroom.
- **Open question:** does the register form's `updateOn: 'blur'` quirk apply here too? If so, the new-password
  field needs an `enterPassword()`-style fill+blur helper.

## Risks and constraints

- **Destructive by definition (test_plan.md §3).** Every AC drives a form that changes the account password.
  - Never `testUser1` — it reads straight from `USER_EMAIL` and **is** the shared seeded
    `customer@practicesoftwaretesting.com` account (CLAUDE.md).
  - Never the `@logged` storageState session user — `tests/setup/login.setup.ts` shares one user across every
    `@logged` spec in a run, and `checkout-address.spec.ts` asserts on that user's stored address.
  - ⇒ **Every test registers its own throwaway user** via `registerUserWithApi(usersRequest)` and logs in inline,
    exactly as `tests/ui/profile.spec.ts` does. This applies even to the non-mutating ACs (1, 2), for consistency
    and to remove any chance of a stray submit hitting a shared account.
- Even the "negative" ACs (3, 4, 5) submit the form; a prod bug could still change the password. Throwaway users
  make that harmless, but assertions must not assume the old password still works unless verified.
- AC6 logs the user out mid-test — later steps must not assume an authenticated session.
- `playwright/no-conditional-in-test` is enforced (`--max-warnings=0`): no `if`/ternary/`?.`/`??` in test bodies.
- No `expect()` in page objects; sync via `waitFor()` / `waitForFunction`.
- `waitForProfileLoaded()` gate (§24) applies after every `goto()` of `/account/profile`.

## Planned steps

1. Write this plan file. ✅
2. Survey existing code: `profile.page.ts`, `profile.spec.ts`, `register.page.ts`/`register.spec.ts` (strength-meter
   precedent), `user.data.ts`, `user.factory.ts`, `login.page.ts`, `account.page.ts`.
3. **Explore live** with the `playwright-cli` skill on a freshly-registered throwaway user:
   - the password form's DOM contract (`data-test` ids, submit button, alert containers);
   - AC2 — whether the strength meter actually works here (resolve A2);
   - AC3/AC4/AC5 — exact error copy and which container renders it; whether submit ever disables;
   - AC6 — success copy, logout timing, and where the user lands.
     Fold every confirmed/rejected assumption back into this file.
4. Get design sign-off via plan mode (six tests + any page-object/test-data additions is beyond a trivial change).
5. Implement:
   - extend `ProfilePage` with password-form locators + action methods (no `expect()`);
   - add any error-copy constants to `src/ui/test-data/user.data.ts`;
   - `tests/ui/change-password.spec.ts`, AAA structure, `test.describe('Verify change password')`, per-test AC
     comments per §7 traceability, tagged `@auth @profile @regression` (reusing the `@profile` tag added in §24 —
     the form is part of the profile page).
6. Update `test_plan.md`: mark §5.15 implemented, add a §25 findings section, record any new doc/behavior mismatch
   (especially the A2 strength-meter contradiction in §9).
7. Validate: `npm run lint`, `npm run format:check`, `npm run tsc:check`; run the new spec; run `@smoke`; re-run
   `tests/ui/profile.spec.ts` and `tests/ui/totp-setup.spec.ts` since they share `ProfilePage`.
8. New branch → conventional commit → PR.

## Live exploration findings (2026-07-09) — resolves A1–A4

Explored with `playwright-cli` against a throwaway API-registered user (`cpw.1783624762@example.com`).

- **A1 CONFIRMED.** `/account/profile` renders three `<form>`s and three headings: `<h1>Profile</h1>`,
  `<h2>Password</h2>`, `<h2>Set up Two-Factor Authentication</h2>`. The password form (form #2) contains
  `[data-test="current-password"]`, `[data-test="new-password"]`, `[data-test="new-password-confirm"]` (all
  `input[type=password]`), two unnamed show/hide toggle buttons, and `[data-test="change-password-submit"]`.
  ⇒ Extend `ProfilePage`; no new page object, no fixture change.
- **A2 RESOLVED — and it contradicts §5.15's wording.** The change-password strength meter **works**, while
  registration's is broken (§19). Same markup (`.strength-bar .fill`, `.strength-labels span.active`,
  `#passwordHelp`), both scoped inside the password form; `fill()` alone updates it (no blur needed). Measured
  scale — one criterion per step, cumulative:

  | new-password value | bar width | active label |
  | ------------------ | --------- | ------------ |
  | `a`                | 20%       | Weak         |
  | `abcdefgh`         | 40%       | Moderate     |
  | `Abcdefgh`         | 60%       | Strong       |
  | `Abcdefg1`         | 80%       | Very Strong  |
  | `Abcdefg1!`        | 100%      | Excellent    |

  So AC2 must assert the **intended** behavior, not registration's broken 0%/no-label behavior. "Mirrors
  registration behavior" is false as written — the two components diverge. This confirms §9's 2026-07-04 note and
  contradicts §5.15; `test_plan.md` needs correcting.

- **A3 RESOLVED.** All three error paths are **server-side** — the submit button never disables, the
  `POST /users/change-password` always fires, and the message renders in a single `.alert.alert-danger.mt-3`
  **inside the password form**. There are no field-level `[data-test="*-error"]` elements at all on this page.
  - Mismatched confirm → **`The new password field confirmation does not match.`** (HTTP **422**) — **not** the
    documented "Passwords do not match." **New discrepancy.**
  - Wrong current password → `Your current password does not matches with the password.` (HTTP **400**) — matches docs.
  - New identical to current → `New Password cannot be same as your current password.` (HTTP **400**) — matches docs.
  - ⇒ `passwordSuccess`/`passwordError` must be scoped to the password form, since the sibling profile form owns
    its own `.alert-success`/`.alert-danger` (§24).
- **A4 RESOLVED.** Valid change → `.alert-success` reading **`Your password is successfully updated!`** (docs give
  no exact copy), then an automatic redirect to **`/auth/login`**. Timing measured between 5s and ~9.3s at 1s poll
  granularity, so the documented "~5s" holds but assertions need generous headroom (**15s**). Logout is real, not
  cosmetic: `localStorage` is emptied (`auth-token` gone) and a subsequent `goto('/account')` bounces to
  `/auth/login`. Verified via API that the password genuinely changed — old password → **401**, new → **200**.
- **Open question closed:** the register form's `updateOn: 'blur'` quirk does **not** apply here; a plain `fill()`
  drives the meter. No `enterPassword()`-style blur helper needed.
- The three negative submits left the password unchanged (the subsequent AC6 run authenticated with the original
  password), so AC3/AC4/AC5 are safe to assert "no success banner" without re-verifying credentials.

## Design (for sign-off)

**`src/ui/pages/profile.page.ts`** — add, in the constructor, alongside the profile-form block:
`currentPasswordInput`, `newPasswordInput`, `confirmPasswordInput`, `changePasswordButton`,
`passwordForm` (= `form` filtered by `has: changePasswordButton`), `passwordSuccess`, `passwordError`,
`strengthFill`, `activeStrengthLabel` (last two scoped to `passwordForm`). Methods (no `expect()`):
`enterNewPassword(value)`, `changePassword(current, newPassword, confirmPassword)`.

**`src/ui/models/user.model.ts`** — add `PasswordStrengthLevel { password; label; width }`.

**`src/ui/test-data/user.data.ts`** — add `CHANGE_PASSWORD_ERRORS` (the three exact strings above) and
`PASSWORD_STRENGTH_LEVELS` (the five-row table above).

**`src/ui/factories/user.factory.ts`** — add `prepareRandomPassword()` so a test can mint a new password that
satisfies the policy, reusing the same faker pattern as `prepareRandomUser()`.

**`tests/ui/change-password.spec.ts`** — `test.describe('Verify change password')`, six tests, each registering its
own throwaway user via `registerUserWithApi` and logging in inline, all tagged `@auth @profile @regression`:

1. AC1 — the three password fields render, are empty and are `type=password`.
2. AC2 — one test iterating `PASSWORD_STRENGTH_LEVELS`, asserting bar width + active label per step. (One test, not
   five: the meter needs only a logged-in page, and five registrations for one typed field is waste.)
3. AC3 — mismatched confirm → `passwordError` shows the real copy; no success banner.
4. AC4 — wrong current password → error copy; no success banner.
5. AC5 — new identical to current → error copy; no success banner.
6. AC6 — valid change → success banner, redirect to `/auth/login` within 15s, and the **new** password authenticates.

## Status

**COMPLETED 2026-07-09 — ready for review.** All 8 steps done; A1–A4 resolved, design signed off, all six ACs
implemented and passing.

Files touched: `src/ui/pages/profile.page.ts`, `src/ui/models/user.model.ts`, `src/ui/test-data/user.data.ts`,
`src/ui/factories/user.factory.ts`, `tests/ui/change-password.spec.ts` (new), `test_plan.md` (§5.15 + new §25).

Validation: `lint` / `format:check` / `tsc:check` clean; `change-password.spec.ts` 6/6; AC6 3/3 under
`--repeat-each=3`; `profile.spec.ts` + `totp-setup.spec.ts` (shared `ProfilePage`) 12/12; `@smoke` 18/18.

One flake observed and ruled out: `checkout-e2e.spec.ts` "logged-in user completes checkout from a pre-filled
address" failed once in a loaded parallel `@smoke` run, then passed on two subsequent full `@smoke` runs and in
isolation. Unrelated to this change — nothing here touches checkout, and the sole shared file
(`user.factory.ts`) only had its password generation extracted verbatim into `prepareRandomPassword()`.
