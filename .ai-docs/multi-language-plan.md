# Multi-language (§5.23) — action plan

**Status:** completed / ready for review (2026-07-11) — see `TEST_PLAN.md` §34 for the findings.
All planned steps done; `language.spec.ts` 8/8 green (16/16 under `--repeat-each=2`), `@smoke` 19/19.
One design change during implementation: the tests are anchored on the contact/login pages, not the
home page, because home's product grid was slow enough on prod to blow the 60s test timeout under
parallel workers (§34).
**Scope confirmed with user (2026-07-11):** first three bullets of `TEST_PLAN.md` §5.23 only.
The optional fourth bullet (first-visit browser-language auto-detection / fallback to English via
Playwright's `locale` option in a fresh context) is **out of scope for this pass**.

## Goal

Add `tests/ui/language.spec.ts` covering:

1. The language selector in the nav exposes every supported language option.
2. Switching language updates visible UI text (spot-check nav labels).
3. The selected language persists across a reload / new navigation in the same context.

## Exploration findings (2026-07-11, playwright-cli — all assumptions resolved)

- **A1 confirmed.** The selector is in the nav: `<button data-test="language-select" aria-label="Select
language">` showing the active code (`EN`), opening a bootstrap `<ul role="menu">` labelled by that
  button. Each option is `<li role="menuitem"><a data-test="lang-{de|el|en|es|fr|nl|tr}">DE</a></li>`.
  → lives on `navbar.component.ts`. The menu's accessible name is "Select language" (via
  `aria-labelledby`), which cleanly scopes `getByRole('menuitem')` away from the main menubar's own
  menuitems.
- **A2 confirmed.** Exactly **7 options, in this order: DE, EL, EN, ES, FR, NL, TR** — §9 stands, the
  v5 docs' 6-language list is still wrong.
- **A3 confirmed.** Persists as `localStorage["language"] = "de"`; survives `reload()` and a fresh
  in-context navigation (checked home → `#/contact`). Assert the observable translated text, not the
  storage key.
- **A4 confirmed.** Switching is instant client-side i18n; `<html lang>` also flips. The `data-test`
  attributes do **not** change with language, so all existing navbar locators stay valid.
- **Q1 resolved** — assert concrete translated copy. Verified nav labels (Home / Categories / Contact /
  Sign in):
  - DE: Start / Kategorien / Kontakt / Einloggen
  - EL: Αρχική / Κατηγορίες / Επικοινωνία / Σύνδεση
  - ES: Inicio / Categorías / Contacto / Iniciar sesión
  - FR: Accueil / Catégories / Contact / Se connecter
  - NL: Home / Categorieën / Contact / Inloggen ← "Home"/"Contact" are identical to English, so a
    spot-check must not rely on those two alone
  - TR: Anasayfa / Kategoriler / İletişim / Giriş Yap

## Risks and constraints

- **Shared prod data (§3):** no account mutation needed here — these tests are read-only and can run
  logged out. No faker user required.
- **Catalog volatility (§3/§9):** do not assert on product names/prices; assert only on nav/chrome
  strings, which are static app copy.
- **Docs vs. prod (§9):** the v5 docs' 6-language list is wrong; trust exploration over docs.
- **Language is a sticky, context-wide setting.** Tests run `fullyParallel`, but each Playwright test
  gets its own browser context, so a language change in one test cannot leak into another. Must not
  be added to the `@logged` `storageState` session in a way that would persist the language for other
  specs — keep these tests in the default (non-`@logged`) project.

## Planned steps

1. Survey existing code: `navbar.component.ts`, `base.page.ts`, `page-object.fixture.ts`, and any
   existing nav/smoke specs (`tests/ui/smoke/menu.spec.ts`) for existing selector coverage.
2. Explore live behavior with the `playwright-cli` skill: the selector's DOM/role, the option list and
   their `data-test` ids, what a switch does to nav text, and how the choice is persisted.
3. Fold confirmed/rejected assumptions back into this file.
4. Implement: extend `navbar.component.ts` with the language selector locators + a `selectLanguage()`
   action (no `expect()`); add `tests/ui/language.spec.ts` with the three tests, tagged per §3
   taxonomy (`@regression`, `@language`), AAA structure, traceability comment per §7.
5. Update `TEST_PLAN.md`: mark §5.23 implemented and add an implementation-findings section.
6. Validate: `npm run lint`, `npm run format:check`, `npm run tsc:check`, run the new spec, and run
   `@smoke` (navbar is shared code — also re-run every spec that touches the navbar component).
7. Report.
