# Privacy policy (§5.24) — action plan

**Status:** completed / ready for review (2026-07-11) — see `test_plan.md` §35 for the written-up findings.
**Scope (confirmed from the request):** `test_plan.md` §5.24 — the single bullet:

> `/privacy` loads and contains expected sections (Google Sign-In, data collection, automatic removal,
> third-party services, data security, contact info) — assert on presence of key headings/text.

Target file: `tests/ui/privacy.spec.ts`.

## Goal

Cover the static privacy-policy page: the route loads, and the key content sections listed in the AC are
present. Nothing else — no form submission, no auth, no catalog data.

## Assumptions and open questions

- A1: The route is `/privacy` (non-hash), consistent with the other canonical routes (§11: always drive the
  non-hash route, never `/#/...`).
- A2: The page is fully static — no XHR-driven content, so no first-paint race like the product grid (§10).
- A3: The AC's six "sections" map to real headings on the page. **The section names in §5.24 come from the
  plan, not from a doc that mentions privacy at all** (`grep -i privacy` over the repo hits only `test_plan.md`),
  so the real heading text must be read from the live page, not guessed.
- Q1: Is the page reachable from the UI (footer/nav link), or URL-only? If there is a link, worth asserting
  navigation from it; if not, the spec drives `goto()` only.
- Q2: Is the content translated by the language selector (§34)? Out of scope either way, but if the page is
  English-only that's a §9-worthy discrepancy note.

## Risks and constraints

- No shared-data risk: read-only, no account, no catalog, no cart — none of the §3 mutation rules bite here.
- Asserting on long prose is brittle. Assert on **headings** (role-based) and short distinctive phrases, not
  paragraph bodies, so wording tweaks upstream don't fail the suite spuriously.
- Static-page specs must be cheap: anchor on `/privacy` itself, never load the home page as a backdrop (§34's
  lesson about the heavy product grid eating the test budget).
- Not `@logged` — the page needs no session, so it stays out of the shared `storageState` user's blast radius.

## Planned steps

1. Read `test_plan.md` §5.24 / §3 tags / §7 traceability, `CODING_STANDARDS.md`, existing static-ish page
   objects (`ContactPage`) as the template. — done
2. Explore the live `/privacy` page with the `playwright-cli` skill: capture the real headings, the page
   title, whether a footer/nav link exists, and whether the AC's six sections are actually present under
   those names. Fold the answers back into A1–A3 / Q1–Q2 below.
3. Add `PRIVACY: '/privacy'` to `src/ui/constants/page-urls.ts`.
4. Add `src/ui/pages/privacy.page.ts` (`PrivacyPage extends BasePage`) — locators only, no `expect()`.
5. Register it in both the `Pages` type and `pageObjectTest` in `src/ui/fixtures/page-object.fixture.ts`.
6. Write `tests/ui/privacy.spec.ts`: page loads (URL + main heading), and the AC's content sections are
   present. Tags: `@regression`, `@privacy` (per the §3 taxonomy's "feature tags" convention).
7. Update `test_plan.md` §5.24 status + a new numbered findings section, plus §9 if the live page contradicts
   the AC.
8. Validate: `npm run lint`, `npm run format:check`, `npm run tsc:check`, run `privacy.spec.ts` and `@smoke`.

## Exploration findings (step 2, live via playwright-cli)

- A1 **confirmed** — `/privacy` (non-hash) loads, title `Privacy Policy - Practice Software Testing - Toolshop - v5.0`.
- A2 **confirmed** — fully static `app-privacy` component, no XHR, no first-paint race.
- A3 **rejected** — the page has **no headings at all** (`h1`–`h6` count: 0) and **no `data-test` attributes**.
  Section titles are `<strong>` elements. Production renders **8** sections, not the AC's 6: the two extras are
  "Information Sharing" and "Changes to the Privacy Policy". Assertions are therefore on exact `<strong>` text,
  located structurally via `app-privacy → strong`.
- Q1 **answered** — reachable in-app only from the global footer's "Privacy Policy" link (`routerLink="privacy"`);
  no nav entry. Covered by its own test, driven from the contact page.
- Q2 **answered** — the policy body is **not** translated: switching to German flips the nav and `<html lang>`
  while every `<strong>`/`<p>` stays English. Recorded as a §9 discrepancy; no language guard needed in the spec.

## Outcome

Files: `tests/ui/privacy.spec.ts` (new, 4 tests), `src/ui/pages/privacy.page.ts` (new),
`src/ui/test-data/privacy.data.ts` (new), `src/ui/constants/page-urls.ts` (+`PRIVACY`),
`src/ui/fixtures/page-object.fixture.ts` (+`privacyPage`), `test_plan.md` (§5.24 status, §9 discrepancy, §35).
Validation: lint / format:check / tsc:check clean; `privacy.spec.ts` 4/4; `@smoke` 19/19.
