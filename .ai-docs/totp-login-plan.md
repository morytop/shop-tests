# TOTP-enabled login (§5.11) — action plan

**Status:** ✅ completed / ready for review (2026-07-09)
**Scope confirmed:** 2026-07-09 — the single §5.11 bullet:
_"TOTP-enabled account → 6-digit code prompt after valid email/password; valid code authenticates; invalid code
shows 'Invalid TOTP'."_ Implemented in `tests/ui/login.spec.ts` (extend existing), per §5.11's file mapping.

This was explicitly **deferred in §20** ("needs a new `otplib` dependency + a full 2FA-setup flow that belongs
to the not-yet-implemented §5.13"). Both blockers are now gone: §22 shipped `otplib` +
`src/ui/utils/totp.util.ts` (`generateTotpCode()`) and proved the enable flow end to end.

## Goal

Three assertions, all against a **TOTP-enabled disposable account**:

- **AC-a** — valid email/password on a TOTP-enabled account shows a 6-digit code prompt (not `/account`).
- **AC-b** — a valid generated code completes authentication.
- **AC-c** — an invalid code shows "Invalid TOTP".

## What is already known (from §22, verified live)

- `POST /totp/setup` (authenticated) → `{ secret, qrCodeUrl }`; mints a **new** secret on every call.
- `POST /totp/verify` `{ totp }` (authenticated) → `200 {"message":"TOTP enabled successfully"}` and flips
  `totp_enabled`.
- `generateTotpCode(secret)` (`src/ui/utils/totp.util.ts`) produces a code the server accepts (otplib v13 with
  `MIN_SECRET_BYTES: 10` relaxed; SHA1/6/30 defaults match the `otpauth://` URI).
- The API's `verifyKey()` uses window = 1 → ±1 time step (±30 s) of clock-skew tolerance.
- `TotpAuthService.verifyTotp(totp, token)` POSTs to **`/users/login`** with `{ totp, access_token }` — i.e. the
  second leg of login reuses the login endpoint, it is not `/totp/verify`.

## Assumptions (to confirm/reject during exploration)

1. The prompt renders **on `/auth/login`** after submitting valid credentials (same route, swapped form), not a
   separate route. `test_plan.md` §5.6 AC2 describes the analogous checkout-wizard prompt, so the login page
   likely has a `totp`-ish `data-test` input + submit. **Read `auth/login/login.component.html`, then verify.**
2. The invalid-code copy is literally **"Invalid TOTP"** (per §5.11). §21/§22 both showed the plan's copy can be
   stale or template-prefixed (`Error: …`). **Verify live; assert the real string.**
3. The existing `[data-test="login-error"]` element may be reused for the TOTP error (as lockout does, §20), or
   there may be a dedicated one. **Verify.**
4. A first login on a TOTP-enabled account returns a token that is only provisional until the code is supplied.
   Whether the app lands on `/account` prematurely is worth checking (a security-relevant observation).

## Open questions

- Can a TOTP-enabled user be created **entirely via the API** (register → login → `/totp/setup` →
  `/totp/verify`)? That would keep this spec's arrange step fast and UI-independent. If yes, it belongs in the
  API layer as a factory, reusing `registerUserWithApi`.
- Does supplying a wrong code repeatedly count toward the §20 lockout threshold (3 attempts)? If so, AC-c must
  use its **own** disposable user and not reuse AC-b's, and must not loop.

## Risks & constraints

- **🚨 Never enable TOTP on a shared account.** `testUser1` **is** the seeded
  `customer@practicesoftwaretesting.com` (§22), and the API refuses TOTP setup for it anyway (403). Every test
  here registers its own throwaway user.
- **Do not touch the `@logged` storageState user** — shared across all `@logged` specs in a run (§22).
- **Lockout (§20):** 3 failed _password_ attempts lock an account permanently. Unclear whether failed _TOTP_
  attempts share that counter — confirm before writing AC-c, and give AC-c a fresh user regardless.
- **Time sensitivity:** codes rotate every 30 s. Generate immediately before submitting (§22).
- **Prod drift (§17, §19, §21, §22):** pinned v5.0 source is a first draft only. Verify every string live.
- **Lint (`CODING_STANDARDS.md`):** no `if`/ternary/`?.`/`??` in test bodies; no `expect()` in page objects
  (API factories are the sanctioned exception); locators are `readonly` constructor properties.

## Planned steps

1. ~~Confirm scope.~~ Done — the one §5.11 TOTP-login bullet, 3 assertions.
2. Write this plan file. ← _you are here_
3. Survey: `login.page.ts`, `login.spec.ts`, `totp.util.ts`, `src/api/` (requests/factories/`api.util.ts`),
   `user-register.api.factory.ts`.
4. Read `auth/login/login.component.{ts,html}` in the pinned source for the prompt markup + copy, then
   **verify live** with `playwright-cli` against a throwaway TOTP-enabled user.
5. Build the arrange path: preferably an API factory (`registerUserWithTotpEnabled()`) that registers, logs in,
   calls `/totp/setup`, verifies a generated code, and returns `{ email, password, secret }`. Needs a
   `TotpRequest` request object + `apiUrls` entries.
6. Extend `LoginPage` with the TOTP prompt locators/actions (no new page object if the prompt lives on
   `/auth/login`).
7. Add the three tests to `tests/ui/login.spec.ts`, tags `@auth`/`@login`/`@totp`/`@regression`, AC comment
   per §7.
8. Update `test_plan.md`: strike the §5.11 bullet, add a numbered findings section (§23).
9. Validate: `lint`, `format:check`, `tsc:check`, `login.spec.ts`, `totp-setup.spec.ts` (shares `totp.util`),
   plus `@smoke`.
10. Report; mark this file completed.

## Live verification results (2026-07-09, curl + playwright-cli, build `v2.3 | Built 2026-07-06`)

| #   | Assumption                               | Verdict                                                                                                                               |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Prompt renders on `/auth/login`          | ✅ Confirmed. URL never changes. `data-test="totp-code"` + `data-test="verify-totp"` ("Verify TOTP"), label "TOTP Code".              |
| 2   | Invalid copy is literally "Invalid TOTP" | ✅ Confirmed, **bare** — no `Error:` prefix (unlike §22's profile banners).                                                           |
| 3   | Reuses `[data-test="login-error"]`       | ✅ Confirmed — the same element as invalid-credentials and lockout (§20). It sits outside both `@if` branches. No new locator needed. |
| 4   | Premature `/account` landing?            | ✅ **No.** Login returns `{message:"TOTP required", requires_totp:true, access_token}` and the app stays put.                         |

**Additional confirmed behaviour:**

- **The email/password form is removed from the DOM once prompted** (`@if (!showTotpInput)` wraps it), so
  `[data-test="email"]` and `[data-test="login-submit"]` both drop to count 0. That is the cleanest AC-a signal.
- **The second leg reuses `POST /users/login`**, not `/totp/verify`: body `{ totp, access_token }`. Valid →
  `200 { access_token }` → `/account`. Invalid → `401 { "error": "Invalid TOTP" }`.
- **The provisional token is correctly scoped.** `GET /users/me` with the pre-TOTP `access_token` returns
  **401 "Unauthorized token usage"** — so issuing a token alongside `requires_totp` is not an auth bypass.
  Worth recording as a _negative_ security finding (checked, and clean).
- **Failed TOTP attempts do NOT feed the §20 lockout counter.** Four consecutive `000000` submissions → the
  account still logs in normally afterwards. So AC-c is safe and needs no special handling. (It still gets its
  own disposable user, since every test here does.)
- **The prompt survives an invalid code** — it stays on screen and is retryable, unlike the profile page's TOTP
  section, which the §22 bug tears down on first error. Different components, different behaviour.

## Design decisions

- **Arrange entirely via the API.** New `TotpRequest` (`/totp/setup`, `/totp/verify`) + factory
  `registerUserWithTotpEnabled()` that registers → logs in → sets up → verifies a generated code, returning
  `{ email, password, secret }`. No UI is driven to reach the precondition, so these tests fail only on the
  behaviour they assert. `expect()` in the factory is the sanctioned API-layer exception (`CLAUDE.md`).
- **`TotpRequest` is NOT registered in `request-object.fixture.ts`.** Every one of its calls needs a
  per-user `Authorization` header, so a header-less injected instance would be useless. It is constructed
  inside the factory — exactly the precedent `getAuthorizationHeader()` sets with `LoginRequest`.
- **`LoginPage` gains `totpCodeInput` / `verifyTotpButton` + `submitTotpCode()`.** The prompt lives on
  `/auth/login`, so no new page object. The ids collide with `ProfilePage`'s by name only — different pages.
- **Tests live in `tests/ui/login.spec.ts`**, per §5.11's file mapping, tagged `@auth @login @totp @regression`.
- **AC-b generates its code immediately before submitting** (30 s rotation, ±1 step tolerance).

## Outcome

All three assertions implemented as three tests in a `with a TOTP-enabled account` describe block inside
`tests/ui/login.spec.ts`. **6/6 green** for that file (3 new + 3 pre-existing), and the time-sensitive
valid-code test passed **3/3** under `--repeat-each=3`. No regressions: `totp-setup.spec.ts` 4/4 and
`users.smoke.spec.ts` 2/2 (both share `totp.util` / `api.util`), and `--grep @smoke` 18/18. `lint` /
`format:check` / `tsc:check` clean.

Both open questions resolved:

- **Yes**, a TOTP-enabled user can be built entirely over the API — that is now `registerUserWithTotpEnabled()`.
- **No**, failed TOTP attempts do not count toward the §20 lockout threshold (verified: 4 consecutive bad codes,
  account still logs in). Each test still gets its own disposable user.

Two security-relevant checks came back **clean** and are recorded in `test_plan.md` §23: the provisional
`access_token` issued alongside `requires_totp: true` is properly scoped (`GET /users/me` → 401 "Unauthorized
token usage"), and the lockout counter is not reachable via the TOTP leg. Unlike §21's forgot-password work,
nothing alarming turned up here.

One behavioural contrast worth remembering: the **login** TOTP prompt survives an invalid code and is
retryable, whereas the **profile** setup form tears itself down on the first error (the §22 bug). Same feature,
two components, opposite error handling.

### Follow-ups (outside this scope — not silently expanded)

- §5.6 AC2 (checkout-wizard TOTP prompt) is the last TOTP gap; `CheckoutSigninPage` is the extension point and
  the arrange factory now exists.
- Remaining §5.11 bullets still open: admin redirect to `/admin/dashboard`, admin lockout exemption, disabled
  account, and the Google sign-in popup.
