# Toolshop Test Suite

This project tests the **Toolshop** demo shop. It uses Playwright and TypeScript.

- Shop UI: https://practicesoftwaretesting.com/
- Shop source code: https://github.com/testsmith-io/practice-software-testing
- REST API: https://api.practicesoftwaretesting.com

The tests run against the public production site as a black box. The tests have no
database access.

Read these documents before you make changes:

- `TEST_PLAN.md` — the scope, the data strategy, the tag list, and the coverage map.
- `PRODUCT_EXPLORATION.md` — the record of the real behavior of the live app.
- `CLAUDE.md` — the architecture of the suite.
- `CODING_STANDARDS.md` — the rules for page objects, tests, locators, and fixtures.

## Requirements

- Node.js 20 or later
- Git

## Installation

Do these steps one time:

```
npm install
npx playwright install --with-deps chromium
npx husky
cp .env-template .env
```

## Configuration

Set these variables in the `.env` file:

| Variable                         | Purpose                                                   |
| -------------------------------- | --------------------------------------------------------- |
| `BASE_URL`                       | The address of the shop UI.                               |
| `API_URL`                        | The address of the REST API.                              |
| `USER_EMAIL` / `USER_PASSWORD`   | A real seeded customer account.                           |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | The seeded admin account. Only the `@admin` tests use it. |

Do not use the shared seeded accounts in a test that changes data. Such a test
registers its own throwaway user with faker data. See `CLAUDE.md` for the reason.

## Run the tests

```
npx playwright test                          # run all tests
npm run test:headed                          # run in a visible browser
npm run test:ui                              # open the Playwright UI
npx playwright test tests/ui/login.spec.ts   # run one file
npx playwright test -g "reject login"        # run one test by name
npx playwright test --grep @smoke            # run tests by tag
npx playwright test --project=api            # run only the API tests
npm run show-report                          # open the last HTML report
```

Playwright runs the tests in parallel. On a failure it keeps a trace, a video, and
a screenshot. It retries a failed test one time.

## Project layout

| Path                  | Contents                                                            |
| --------------------- | ------------------------------------------------------------------- |
| `tests/ui/`           | UI end-to-end specs.                                                |
| `tests/admin/`        | Read-only admin smoke specs.                                        |
| `tests/api/`          | REST API specs. They run in the `api` project.                      |
| `tests/api/contract/` | Schema (contract) specs.                                            |
| `tests/setup/`        | The login setup that makes the shared `@logged` session.            |
| `src/ui/`             | Page objects, components, fixtures, factories, models, data, utils. |
| `src/api/`            | Request objects, fixtures, factories, models, data, schemas.        |
| `src/fixtures/`       | The merged `test` object.                                           |
| `config/`             | The environment config and the global setup.                        |
| `scripts/`            | The API schema generator.                                           |
| `.ai-docs/`           | Per-spec implementation notes.                                      |

Rules for imports:

- Import `test` and `expect` from `@src/fixtures/merge.fixture`. Do not import them
  from `@playwright/test`.
- Use the path aliases `@src/*` and `@config/*`. Do not use long relative paths.

## Checks

```
npm run lint            # ESLint. It permits no warnings.
npm run format:check    # Prettier check.
npm run format          # Prettier write.
npm run tsc:check       # TypeScript type check.
```

The Husky pre-commit hook runs `lint` and `format:check`. Both checks must pass
before a commit.

## API contract schemas

The files in `src/api/schemas/` are generated. Do not edit them by hand. To make
them again, run:

```
npm run generate:api-schemas
```

The command reads the live OpenAPI documents, normalizes them, applies the known
deviations, and writes the Zod schemas.

## Commit messages

Use the Conventional Commits format: `<type>: <description>`. The types are `feat`,
`fix`, `docs`, `test`, and `chore`. Write the description in lower case and in the
imperative mood. Keep it below 50 characters.
