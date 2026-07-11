# Login account lockout — plan

**Status:** completed / ready for review (2026-07-09) — all 5 assumptions confirmed live; findings recorded in `TEST_PLAN.md` §20.
**Scope (confirmed with user):** `TEST_PLAN.md` §5.11, the single bullet:

> Account locking: 3 consecutive failed attempts → 4th attempt shows "Account locked, too many failed attempts..." (use a disposable freshly-registered account, never the shared seeded ones, since lockout is destructive to that account for the remainder of the run).

Everything else in §5.11 (admin redirect, admin lockout exemption, disabled account, TOTP, Google popup) is explicitly **out of scope for this pass**.

## Goal

Extend `tests/ui/login.spec.ts` with one test proving that repeated failed logins lock an account, using a throwaway user registered per-test.

## Assumptions (to confirm in exploration)

1. The exact lockout message text and its container. The plan quotes `"Account locked, too many failed attempts..."` from the app docs, which §9 has already shown to be stale in several places. **Must read the real string from production.**
2. The message renders in the same `[data-test="login-error"]` element the "Invalid email or password" error uses — so no new locator is needed.
3. The threshold is exactly 3 failed attempts, with the lock surfacing on attempt 4.
4. After lockout, even the _correct_ password is rejected (i.e. the lock is on the account, not just a wrong-password counter). Worth checking, but only asserted if confirmed.
5. Lockout is per-account (keyed on email), not per-IP or per-browser-session — otherwise a locked account in one parallel worker could poison other login tests sharing the CI IP. **This is the main risk; verify before committing.**

## Risks and constraints

- **Destructive by nature.** The account under test is permanently locked afterwards. Mitigation: register a fresh faker user per test run via `registerUserWithApi(usersRequest)` (the existing API factory) — never `testUser1`, never the seeded `customer@`/`admin@` accounts (`TEST_PLAN.md` §3).
- **Parallel-safety.** `fullyParallel: true`. If lockout turns out to be IP-scoped rather than account-scoped, this test would break every other concurrently-running login test. Assumption 5 gates whether this test is safe to add at all.
- **Docs are unreliable.** §9 records multiple docs-vs-production copy mismatches (checkout copy, "Add to favourites", chat labels). Assert on the string production actually renders, and record any mismatch back into §9.
- Test is a spec-level state mutation with no cleanup path — that is inherent to lockout and accepted, since the account is disposable.

## Steps

1. Survey existing login spec, `LoginPage`, and the API user factory. _(done — `LoginPage` already exposes `emailInput`/`passwordInput`/`loginButton`/`loginError`; `registerUserWithApi()` exists.)_
2. Explore live with the `playwright-cli` skill: register a throwaway user, fail login N times, capture the exact error text at each attempt, and confirm the threshold, the message, the container, and whether the correct password is also rejected afterwards.
3. Probe assumption 5 (account- vs IP-scoped) by attempting a _valid_ login as a different, unlocked user from the same browser/IP immediately after locking the first one.
4. Fold confirmed/rejected findings back into this file.
5. Implement: add the test to `tests/ui/login.spec.ts` (AAA, tagged per §3 taxonomy). Add a `loginRepeatedly`-style action method to `LoginPage` only if the loop is not cleanly expressible in the spec — prefer no new page-object surface.
6. Update `TEST_PLAN.md` §5.11 status note and, if exploration finds a copy/behavior mismatch, §9.
7. Validate: `npm run lint`, `npm run format:check`, `npm run tsc:check`, run `tests/ui/login.spec.ts`, then run `--grep @smoke` for regressions.

## Exploration results (2026-07-09)

All five assumptions **confirmed** against production using two throwaway API-registered users:

1. Message is `"Account locked, too many failed attempts. Please contact the administrator."` — the docs' trailing `...` was a truncation, not a mismatch.
2. Confirmed — renders in the existing `[data-test="login-error"]`; no new locator added.
3. Confirmed — attempts 1-3 give `"Invalid email or password"`, attempt 4+ gives the lockout message.
4. Confirmed — the correct password is also rejected once locked, and the user stays on `/auth/login`. The spec spends its 4th attempt on the _valid_ password to assert exactly this.
5. Confirmed — **account-scoped, not IP-scoped.** A second unlocked user logged in fine from the same browser/IP right after. The test is therefore safe under `fullyParallel: true`.

**Extra discrepancy found (recorded in §20):** production no longer uses hash routing. `/#/auth/login` silently lands on home; the real route is `/auth/login`. `PAGE_URLS` was already correct, so no code change — but the header of `TEST_PLAN.md` and `CLAUDE.md` still advertise the `#/` form.

## Open questions

- Does lockout expire on a timer? Not observed within the exploration session. The spec does not depend on the lock persisting past its own test, so a future expiry window would not break it.
- Unlocking requires an administrator, so locked throwaway accounts accumulate in production. Acceptable (they are disposable and inert), but worth raising with the team alongside §8 Q2.
- Is there a distinct `data-test` hook for the lockout message vs. the generic login error?
