# Two-Factor Authentication setup (§5.13) — action plan

**Status:** ✅ completed / ready for review (2026-07-09)
**Scope confirmed:** 2026-07-09 — all four ACs of `test_plan.md` §5.13, in `tests/ui/totp-setup.spec.ts`.
**Dependency decision:** add `otplib` as a **devDependency** (user-approved). Installed `otplib@^13.4.1`.

## Goal

Implement `tests/ui/totp-setup.spec.ts` covering §5.13:

- **AC1** — Freshly-registered, logged-in user sees a "Setup two factor authentication" section with a QR code
  and manual secret key text.
- **AC2** — Valid 6-digit code (generated via `otplib` from the displayed secret) → "TOTP verified and enabled
  successfully."
- **AC3** — Invalid code → error message, TOTP not enabled.
- **AC4** — Seeded `customer@` / `admin@` accounts are denied TOTP setup with the specific "Access denied…"
  message (safe: read/negative check, no mutation).

## Assumptions (to confirm/reject during exploration)

1. The TOTP setup section lives on the profile/account page. `test_plan.md` §9 says "TOTP setup section on
   profile page" and quotes the exact denial copy for `customer@`: _"Access denied: If you want to configure
   TOTP, please create your own account."_ — that string is from a 2026-07-04 pass and must be re-verified.
2. Route is likely `/account/profile` (or the TOTP section is on `/account`). `PAGE_URLS` has no entry;
   `AccountPage` exists — check what it already models before adding anything.
3. The manual secret is rendered as readable text (needed by `otplib` to derive a code). If the secret is
   **only** encoded in the QR image, AC2 becomes much harder — would need QR decoding, or reading the secret
   from the `otpauth://` URI behind the image, or from the API response that provisions it. **Verify.**
4. `otplib.authenticator.generate(secret)` produces the code the server expects (SHA1, 6 digits, 30s step —
   the RFC 6238 defaults). If the app uses non-default params, the generated code will be rejected. **Verify.**
5. AC2/AC3 mutate the account (enabling TOTP), so they need a disposable user.
6. `testUser1` (env `USER_EMAIL`) may _be_ one of the shared seeded accounts — `CLAUDE.md` says it "must be a
   real seeded account". If so, it must **not** be used for AC1–AC3. **Check `user.data.ts` / `.env` first.**

## Survey results (2026-07-09)

- **🚨 `testUser1` IS the shared seeded `customer@practicesoftwaretesting.com`** (`.env` `USER_EMAIL`).
  Assumption 6 **confirmed**. It must therefore never appear in AC1–AC3 (which enable TOTP = mutation), but it
  is exactly the right fixture for AC4's customer half (read-only denial, sanctioned by §3).
- **No admin credentials exist** anywhere in `.env`, `.env-template`, `config/`, or the test data. AC4's
  `admin@` half is therefore **not automatable** without a password, and guessing one risks locking a shared
  admin account (§20: lockout at 3 failed attempts, permanent). See the decision below.
- `AccountPage` models only `[data-test="page-title"]`; there is no profile page object yet.

## Source-of-truth read (pinned v5.0) — pre-live, first draft only

`account/profile/profile.component.{ts,html}`, `_services/totp-auth.service.ts`, `assets/i18n/en.json`,
`API/app/Services/TOTPService.php`, `API/app/Http/Controllers/TOTPController.php`.

- **The section lives on the profile page** and calls `POST /totp/setup` **on page load**, storing
  `{qrCodeUrl, secret}`. Verification is `POST /totp/verify`.
- **`data-test` ids:** `totp-secret` (the manual key, inside `<strong>`), `totp-code` (input),
  `verify-totp` (submit), `totp-error`, `totp-success`. The QR itself is an Angular `<qrcode>` component with
  **no `data-test`**.
- **Copy (en.json):** heading `Set up Two-Factor Authentication` — note §5.13's "Setup two factor
  authentication" is **not** the real string. Manual-key lead-in: "Or manually enter this key in your app:".
  Already-enabled state: "Two-Factor Authentication already enabled."
- **Messages are prefixed in the template**: `<strong>Error:</strong> {{errorMessage}}` and
  `<strong>Success:</strong> {{successMessage}}` — so the rendered text is `Error: …` / `Success: …`, not the
  bare message. Use `toContainText`, or assert the full prefixed string.
- **AC2 success:** "TOTP verified and enabled successfully." **AC3 invalid:** "Invalid TOTP code. Please try
  again." (client-side copy for any non-2xx from `/totp/verify`).
- **AC4's 403 is a hardcoded email allowlist** in `TOTPService::setupTOTP()`:
  `['customer@practicesoftwaretesting.com', 'admin@practicesoftwaretesting.com']` → `403`, which the component
  maps to _"Access denied: If you want to configure TOTP, please create your own account."_ Both seeded
  accounts hit the **identical branch** — so covering `customer@` exercises the whole rule.
- **`setup` regenerates and persists a NEW secret on every profile load** for an eligible user. The displayed
  secret must be read from the DOM at use time, never cached across navigations.
- **Params:** the API uses `pragmarx/google2fa` defaults — SHA1, 6 digits, 30 s step, and `verifyKey()`'s
  default **window = 1** (±1 step tolerance). These are `otplib.authenticator`'s defaults too, so assumption 4
  should hold and there is ±30 s of clock-skew slack. Verify live anyway.
- The `!profile?.totp_enabled && !errorMessage` guard means a 403 hides the QR/secret/form entirely — the
  denial state shows only the error banner.

## Decisions taken from the survey

- **AC4 is implemented for `customer@` only** (via `testUser1`), asserting the denial banner and that no
  QR/secret/form renders. The `admin@` half is **reported as blocked on credentials**, not silently skipped or
  guessed — following §5.11's precedent ("if this can't be verified without touching the shared admin, mark as
  manual/skip with a comment explaining why"). Source evidence that both emails share one `in_array` branch is
  recorded in `test_plan.md` so the gap is understood rather than merely noted.
- **AC1–AC3 each register their own disposable user.** They must not ride the `@logged` storageState session:
  `login.setup.ts` shares one user across every `@logged` spec in a run, and enabling TOTP on it could change
  behaviour for `checkout-e2e` AC2. They log in inline instead.
- **Generate the TOTP code immediately before submitting** (30 s rotation).

## Risks & constraints

- **🚨 Lockout interaction (§20).** Three consecutive failed logins lock an account permanently. AC4 logs into
  shared seeded accounts. Any password mistake there is destructive to a shared account and unrecoverable
  without an admin. Use only credentials that already exist in config; never guess.
- **Do not enable TOTP on a shared account.** AC4 must stop at the denial message — no code submission.
- **Do not enable TOTP on the `@logged` storageState user.** `tests/setup/login.setup.ts` registers one user
  per run and shares that session across every `@logged` spec (e.g. `checkout-e2e` AC2). Enabling TOTP on it
  could alter behaviour for those specs. AC1–AC3 should register their own user and log in inline, **not**
  ride the `@logged` project. Confirm during design.
- **Time sensitivity.** TOTP codes rotate every 30s. A code generated at the top of a test can expire before
  submission on a slow public server. Generate the code **immediately before** submitting (same spirit as
  §9's "fetch live product IDs immediately before use").
- **Clock skew.** The runner's clock vs. the server's determines validity. If prod tolerates ±1 step this is
  fine; if AC2 proves flaky, that's the first suspect. Record findings.
- **New dependency:** `otplib` devDependency only — it must never end up in the app's runtime path. Verify it
  typechecks under `strict` and passes lint.
- **Prod drift (§17, §19, §21):** the pinned v5.0 source is a first draft only. Verify all copy live.
- **Lint (`CODING_STANDARDS.md`):** no `if`/ternary/`?.`/`??` in test bodies; no `expect()` in page objects;
  locators are `readonly` constructor properties, never method-built.

## Planned steps

1. ~~Confirm scope + dependency with the user.~~ Done — all four ACs, `otplib` devDependency.
2. Write this plan file. ← _you are here_
3. Survey: `user.data.ts` (is `testUser1` a seeded account?), `.env-template`, `account.page.ts`,
   `page-urls.ts`, `login.setup.ts`, `user-register.api.factory.ts`.
4. Read the pinned v5.0 source for the TOTP component (route, `data-test` ids, exact copy, validator params),
   then **verify every one live** with `playwright-cli` against a disposable user. Never drive the seeded
   accounts beyond the read-only denial check.
5. Install `otplib` as a devDependency; confirm its generated code is accepted by prod (spike against a
   disposable user before writing assertions).
6. Implement the page object (extend `AccountPage`, or add a `ProfilePage`/`TotpPage` — decide after step 4),
   register it in the `Pages` type + `pageObjectTest`.
7. Implement `tests/ui/totp-setup.spec.ts` — AAA, tags `@auth`/`@totp`/`@regression` per the §3 taxonomy,
   one `// 2FA Setup ACn` traceability comment per §7.
8. Update `test_plan.md`: mark §5.13 implemented, add a numbered findings section (§22) for discrepancies.
9. Validate: `npm run lint`, `format:check`, `tsc:check`, the new spec, then `@smoke`; plus any spec importing
   code I touched.
10. Report; mark this file completed.

## Live verification results (2026-07-09, playwright-cli + curl, build `v2.3 | Built 2026-07-06`)

| #   | Assumption                                  | Verdict                                                                                                                                                           |
| --- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1/2 | Section on profile page, `/account/profile` | ✅ Confirmed. Title "Profile - …", `h2` = "Set up Two-Factor Authentication".                                                                                     |
| 3   | Secret readable as text                     | ✅ Confirmed: `[data-test="totp-secret"]`, 16 base32 chars. QR is `qrcode > div.qrcode > canvas` (no `data-test`).                                                |
| 4   | otplib defaults match server                | ⚠️ **Partly.** SHA1/6/30 match, but otplib **v13 rejects the secret** (see below). Once the guardrail is relaxed, generated code → `POST /totp/verify` → **200**. |
| 5   | AC2/AC3 mutate → need disposable users      | ✅ Confirmed; each test registers its own.                                                                                                                        |
| 6   | `testUser1` is a shared seeded account      | ✅ **Confirmed — it is `customer@practicesoftwaretesting.com`.**                                                                                                  |

Copy confirmed verbatim: `Success: TOTP verified and enabled successfully.` /
`Error: Invalid TOTP code. Please try again.` /
`Error: Access denied: If you want to configure TOTP, please create your own account.` (all template-prefixed).

## Design decisions

- **`otplib` v13 is a rewrite.** No `authenticator` singleton — the API is `generateSync({ secret })`. It also
  enforces a **128-bit minimum secret**, while google2fa mints 16 base32 chars = 80 bits (10 bytes), so
  generation throws `SecretTooShortError`. `src/ui/utils/totp.util.ts` relaxes **only** that bound with
  `createGuardrails({ MIN_SECRET_BYTES: 10 })`. It lives in `utils/` because it is a pure, page-agnostic
  transform — the sanctioned category for spec-callable helpers.
- **New `ProfilePage`** rather than extending `AccountPage` (different route, different concern).
- **`readTotpSecret()` waits on a `.filter({hasText: /^[A-Z2-7]{16}$/})` narrowing** of the same locator before
  reading. Discovered the hard way: the `<p data-test="totp-secret">` is in the DOM before `/totp/setup`
  resolves, so a naive `innerText()` returned `""` and AC2 failed with `SecretMissingError`. Synchronizing with
  `waitFor()` (not `expect()`) keeps the page object assertion-free per `CODING_STANDARDS.md`.
- **Post-login readiness gate.** `profilePage.goto()` immediately after `loginPage.login()` races the auth
  round-trip and the guard bounces to the login page (all 4 tests failed this way first). Fixed by awaiting
  `accountPage.title.waitFor()` after login — the same gate `tests/setup/login.setup.ts` already uses.
- **AC3 proves "not enabled" by reloading** and asserting the setup section returns, rather than trusting the
  absence of a success banner.
- **AC4 covers `customer@` only.** No admin password exists anywhere in config; guessing risks locking a shared
  admin (§20). Both seeded emails hit one hardcoded `in_array` → 403 branch, so `customer@` exercises the whole
  rule and an `admin@` test would add no behavioural coverage. Reported rather than faked or silently skipped.

## Outcome

All four ACs implemented; 4/4 green, and AC2 (time-sensitive) passed 3/3 under `--repeat-each=3`. No
regressions: `login.spec.ts` 3/3 (its happy path proves the seeded `customer@` password is untouched) and
`--grep @smoke` 18/18. `lint` / `format:check` / `tsc:check` all clean.

Two further production bugs found and recorded in `test_plan.md` §22 (one pinned by AC3, one merely noted):

1. An invalid code **tears down the QR/secret/form** — the template hides them behind `!errorMessage` — so a
   single typo forces a page reload before retrying.
2. After enabling, a profile reload renders **"already enabled" and "Error: Failed to load TOTP setup details."
   simultaneously**, because the re-POSTed `/totp/setup` returns 400 and the component only special-cases 403.

`CLAUDE.md` gained an explicit warning that `testUser1` _is_ the seeded `customer@` account — the setup docs
previously implied it was a generic logged-in user, which is the trap this task nearly fell into.

### Follow-ups (outside this scope — not silently expanded)

- §5.11's TOTP-login bullet and §5.6 AC2's checkout TOTP prompt are now **unblocked**: `generateTotpCode()` plus
  a user enabled through this flow is all they need.
- The two UI bugs above are worth reporting to the app team.
- Admin credentials in `.env` would let AC4's `admin@` half be automated (cf. §8 open question 2).
