# §5.10 Registration — extend `tests/ui/register.spec.ts`

Status: **completed / ready-for-review** (created & completed 2026-07-08)

Outcome: `register.spec.ts` extended with AC1/AC2/AC4/AC6 (AC3 pinned as a documented
production bug; AC5 already covered). All 10 register specs green; lint/format/tsc clean.
Findings written up in `TEST_PLAN.md` §19. Two production discrepancies documented there:
the broken strength meter (AC3) and the actual duplicate-email banner copy.

## Goal (scope confirmed with user)

Extend the existing register spec (currently only the happy-path register+login)
with the remaining §5.10 acceptance criteria the user selected:

1. **AC1 — Required-field validation**: each required field enforced; leaving a
   required field empty invalidates it / blocks submission.
2. **AC4 — Duplicate email**: registering an already-in-use email shows
   "Email is already in use."
3. **AC6 — Invalid email format**: RFC-format boundary cases (missing `@`,
   missing domain, valid edge cases) rejected client-side.
4. **AC2 + AC3 — Password UI feedback**: requirements list highlighting on
   focus / while typing, and the strength indicator label + bar %
   (Weak 20% → Excellent 100%).

AC5 ("successful registration redirects to login + new user can log in") is
already covered by the existing happy-path test — no change needed.

## Assumptions & open questions (to confirm during live exploration)

- Unlike the checkout billing form (§16: no visible error text, ng-invalid
  only), the register form is expected to render visible, per-field error text
  with stable `data-test` hooks. **Verify** the exact error copy and locators.
- Duplicate-email error copy assumed "Email is already in use." — **verify**
  exact string and whether it appears inline or as a banner/toast, and whether
  it is client-side or requires a submit round-trip (409).
- Email-format rejection assumed client-side (Angular email validator) surfaced
  on blur/submit — **verify** trigger (blur vs submit) and error copy.
- Password requirements list + strength indicator: §9 confirms the
  change-password strength labels are Weak/Moderate/Strong/Very Strong/Excellent.
  **Verify** the register page uses the same widget, its `data-test` hooks, the
  bar width/% mechanism, and how the per-rule requirements list highlights.
- Need to confirm how errors are revealed: some Angular forms only show errors
  after the field is touched (blur) or after a submit attempt.

## Risks & constraints

- **Data safety (§3)**: register tests create fresh disposable users via
  `prepareRandomUser()` / faker — never touch the shared seeded accounts. The
  duplicate-email test needs a _known already-used_ email: use a seeded account
  email (read-only — registration will be rejected, so no mutation) OR register
  a fresh user first and reuse its email. Prefer registering a fresh user first
  to avoid any dependency on shared-account state. **Decide during exploration.**
- Prod-vs-docs drift (§9): confirm all copy/locators live; do not copy selectors
  from the (stale) user-stories docs.
- Keep everything within §5.10 scope; report any adjacent gaps rather than
  expanding.

## Planned steps

1. [x] Confirm scope with user (done — all four sub-cases selected).
2. [x] Read source-of-truth docs + survey existing register/checkout specs and
       page objects for conventions.
3. [x] Explore the live register page + read sprint5 source to capture required-field
       error locators/copy, duplicate-email behavior/copy, email-format trigger/copy,
       and the requirements-list + strength-indicator behavior. Findings folded in below.
4. [x] Extend `register.page.ts` with locators + `enterPassword()` helper (no `expect()`).
5. [x] Write the new specs in `register.spec.ts` (AAA, `tag` option, AC traceability).
6. [x] Update `TEST_PLAN.md` — added §19 findings + discrepancies.
7. [x] Validate: lint / format:check / tsc:check clean; `register.spec.ts` 10/10 green.
       `@smoke` re-run green (initial 3 failures were environmental teardown timeouts on
       cart/checkout/setup, unrelated to this additive change — confirmed on re-run).
8. [x] Reported; plan marked completed.

## Exploration findings (confirmed via live app + sprint5 source)

Source read at user's request: `../practice-software-testing/sprint5/UI/src/app/auth/register/`
(`register.component.{ts,html}`), `shared/password-input/`, `_helpers/password.validators.ts`,
`assets/i18n/en.json`. Production footer is `v2.3 | Built 2026-07-06 | Angular 20.0.5`;
observed behavior matches this sprint5 source exactly.

- **Whole form is `updateOn: 'blur'`** (register.component.ts:69). Validators/errors and
  the requirements-list highlighting only recompute on blur, NOT per keystroke. Playwright
  `.fill()` alone leaves the control pristine/0 — must `.fill()` **then `.blur()`**.
- **Required-field errors are submit-gated**: every error block is
  `@if (f['x'].invalid && submitted)` and `submitted` is only set in `onSubmit()`. So there
  is NO live per-field validation before the first submit. AC1 test = click submit on empty
  form → assert each `data-test="<field>-error"` visible with the required message.
  Exact required strings (en.json): First name is required / Last name is required /
  Date of Birth is required / Country is required / Postcode is required /
  House number is required / Street is required / City is required / State is required /
  Phone is required. / Email is required / Password is required. (dob-error also carries the
  hardcoded "Please enter a valid date in YYYY-MM-DD format.")
- **AC2 requirements list works.** 4 `<li>` bound to
  `[class.text-success]="!f['password'].hasError('<rule>')"` for rules minLength(8),
  mixedCase (BOTH upper+lower), hasNumber, hasSymbol. Live-verified counts on fill+blur:
  aaaaaaaa→1(len), Aaaaaaaa→2, Aaaaaaa1→3, Aaaaaaa1!→4; aB→1, aB1→2, aB1!→3.
- **AC3 strength meter is BROKEN in production (confirmed bug).** Template line 355:
  `(input)="passwordStrengthIndicator = passwordStrength(f['password'].value)"` updates on
  the _input_ event but reads `f['password'].value`, which is stale because the form is
  `updateOn:'blur'`. So the indicator always reads the pre-blur (empty) value →
  `passwordStrength('')` → `'Invalid'` → `getStrengthWidth` returns `'0%'` and no
  `.strength-labels span` gets `active`. Live-verified: bar width stays `0%` and no active
  label for EVERY input, even a fully valid password, after fill+blur. `passwordStrength()`
  itself (register.component.ts:125) implements the intended 5-criteria → Weak 20% /
  Moderate 40% / Strong 60% / Very Strong 80% / Excellent 100% mapping — but it's never fed
  a current value. **Decision:** cannot assert AC3's intended mapping; write a test that
  PINS the actual broken behavior (bar 0% / no active label for a valid password) per repo
  convention (§17 pattern), and document the bug in TEST_PLAN.md.
- **AC4 duplicate**: `register-error` banner (`data-test="register-error"`) shows
  "Email is already in use." when the API returns `Duplicate Entry` (register.component.ts:177).
  Plan: pre-create a user via `registerUserWithApi(usersRequest)` (API factory), then UI-register
  the same email → assert the banner. No shared-account mutation; the pre-created user is a
  disposable faker account.
- **AC6 email format**: pattern validator (register.component.ts:58); error text
  "Email format is invalid" (en.json fields.email.errors.format), submit-gated. Invalid
  boundary cases (missing @, missing domain) → email-error visible after submit; valid
  edge cases (e.g. a@b.co) → email-error NOT rendered. Submitting with other fields empty
  guarantees the form stays invalid so NO account is created for the format cases.

## Design changes during implementation

- Add locators to `register.page.ts`: per-field error map, `registerError` banner,
  password requirements `<li>` list, strength-bar `.fill`, active strength label, and a
  `submit()` helper (click submit without filling). No `expect()` in the page object.
- Reuse `prepareRandomUser()` (UI factory) and `registerUserWithApi()` (API factory).
