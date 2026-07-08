# Coding Standards

## Code Comments

### General Principles

- **Remove obvious comments**: Don't state what the code clearly shows
- **Keep meaningful documentation**: Add JSDoc for architectural intent, context, or non-obvious design decisions
- **Focus on "why", not "what"**: Explain reasoning, not mechanics

### Guidelines

**✅ DO:**

- Add JSDoc for classes/modules explaining architectural purpose
- Document complex business logic or non-obvious behavior
- Explain workarounds or technical constraints

**❌ DON'T:**

- Add comments that repeat what code says (e.g., `// Create user` above `createUser()`)
- Use redundant section markers in simple code
- Over-document self-explanatory code

### Examples

**Bad:**

```typescript
// Navigate to the page using the PAGE_URL constant
async goto() {
  await this.page.goto(this.PAGE_URL);
}
```

**Good:**

```typescript
/**
 * Base class for Page Object pattern implementation.
 * Provides navigation and shared functionality; child classes define specific PAGE_URL.
 */
export abstract class BasePage {
  async goto() {
    await this.page.goto(this.PAGE_URL);
  }
}
```

## Test Structure: Arrange-Act-Assert (AAA)

All tests should follow the **Arrange-Act-Assert (AAA)** pattern:

- **Arrange**: Set up test data, create page objects, prepare the environment
- **Act**: Perform the action being tested
- **Assert**: Verify the expected outcome

### Guidelines

- Structure code to clearly show the three phases through blank lines and logical grouping
- No AAA comment markers needed - the structure should be self-evident
- Keep each section focused and clear

### No conditionals in test bodies

The `playwright/no-conditional-in-test` lint rule (enforced, `--max-warnings=0`) flags `if`/ternary **and** the `?.` / `??` operators inside a `test()` body. When reading text back from a locator, prefer `locator.innerText()` (returns `string`) over `locator.textContent()` (returns `string | null`) so you don't need `?? ''` / `?.` to handle the null:

**Bad (nullish handling trips the lint rule):**

```typescript
const title = (await cartPage.productTitles.nth(1).textContent())?.trim() ?? '';
```

**Good (`innerText()` is non-null, no conditional needed):**

```typescript
const title = (await cartPage.productTitles.nth(1).innerText()).trim();
```

Push any genuinely nullable handling into a module-level helper or a Page Object method, where the rule doesn't apply, rather than into the test body.

### Example

```typescript
test('should register new user', async ({ page }) => {
  const registerPage = new RegisterPage(page);
  const email = 'user@example.com';
  const password = 'password123';

  await registerPage.register(email, password);

  await expect(registerPage.successMessage).toBeVisible();
});
```

## Page Object Pattern

### Essential Rules

**1. No assertions in Page Objects**

- Page Objects should NEVER contain `expect()` statements
- All verifications belong in test files (`*.spec.ts`) only

**2. Page Objects provide interface, tests verify behavior**

- Page Objects: Define locators and action methods
- Test files: Use Page Objects and add assertions

**3. No helper functions in spec files**

- Spec files contain `test()` blocks only — never module-level helper functions.
- Any reusable interaction, multi-step flow, or synchronization step belongs in a **method on the relevant Page Object**, not a local function in the spec.
- If a flow spans pages, express it in the test as a short sequence of existing Page Object method calls (this is the established Arrange pattern — see the repeated `homePage.goto()` → `clickProductCard()` setup across specs), and add a new Page Object method only for the part that isn't already one.
- The one exception is a **pure, page-agnostic data transform** (e.g. a `parsePrice(text)` string→number utility that touches no locator/page) — it may live at the top of the spec, or move to a shared test-util if reused.

**Bad (helper function drives the page from inside the spec):**

```typescript
// cart.spec.ts
async function addProductToCart(homePage, productDetailPage, index, badge) {
  await homePage.goto();
  await homePage.clickProductCard(index);
  await productDetailPage.addToCart();
  await expect(productDetailPage.bookmarks.cartQuantity).toHaveText(badge);
}
```

**Good (the reusable step is a Page Object method; the test composes methods):**

```typescript
// product-detail.page.ts — the async add + badge sync lives here
async addToCartAndAwaitBadge(count: string): Promise<void> {
  await this.addToCart();
  await this.bookmarks.cartQuantity
    .filter({ hasText: new RegExp(`^${count}$`) })
    .waitFor();
}

// cart.spec.ts — Arrange composes existing methods, no local function
await homePage.goto();
await homePage.clickProductCard(0);
await productDetailPage.addToCartAndAwaitBadge('1');
```

**Synchronizing without `expect()`:** a Page Object often needs to wait for state (an async write to land, an element to reach a value) before returning — but it must not use `expect()`. Wait with `locator.waitFor()`, narrowing to the target state with `.filter()` / `.and()` (as above) instead of an `expect(...).toHaveText(...)` poll. Assertions on that same state still belong in the spec.

### Basic Structure

```typescript
export class PageName {
  readonly page: Page;
  readonly elementName: Locator;

  constructor(page: Page) {
    this.page = page;
    this.elementName = page.getByTestId('element-id');
  }

  async goto() {
    await this.page.goto('/page-path');
  }

  async performAction(param: string) {
    await this.elementName.fill(param);
  }
}
```

### Quick Reference

**✅ DO:**

- Use `readonly` for properties
- Prefer `getByRole()` or similar strategies if possible when testing accessibility or user-facing roles
- Create methods for user actions
- Keep methods focused on single actions

**❌ DON'T:**

- Include `expect()` in Page Objects
- Add test logic or validations in Page Objects
- Never mix locator definition styles: locators are always `readonly` properties assigned in the constructor, never returned from a method or a getter
- Define standalone helper functions in spec files — encapsulate interactions, flows, and waits as Page Object methods instead (see rule 3 above)

### Locator Definition Strategy

Every locator — including ones scoped under a repeated collection (e.g. one card in a product grid) — is a `readonly` property assigned in the constructor. When a locator needs to be scoped under another collection, chain it off that collection's property in the constructor rather than writing a method/getter that builds the locator on demand.

**Bad (locator built dynamically via a method/getter):**

```typescript
getCardName(card: Locator): Locator {
  return card.locator('[data-test="product-name"]');
}

get outOfStockLabel(): Locator {
  return this.outOfStockLabels.first();
}
```

**Good (locator chained from a property, defined once in the constructor):**

```typescript
constructor(page: Page) {
  super(page);
  this.productCards = this.page.locator('a.card[data-test^="product-"]');
  this.productCardNames = this.productCards.locator('[data-test="product-name"]');
}
```

Spec files then compose these properties (e.g. `homePage.productCardNames.first()`) instead of writing raw `data-test` selector strings inline.

### Locator Selection Strategy

Prefer `getByRole()` / `getByLabel()` / `getByText()` over CSS selectors, and never write one long compound CSS selector spanning multiple DOM levels (`'#a > b > c > d[data-test^="x"]'`). Chain short steps off a semantically-obtained parent locator instead.

A raw CSS combinator is only acceptable when it encodes something a role/label locator genuinely can't express — e.g. distinguishing depth in a recursively-rendered tree where every level shares the same accessible name. Even then, scope it off a role-based parent and keep each chained step to one DOM level, rather than spelling out the whole path in one string.

Compose conditions with locator methods (`.filter()`, `.and()`) instead of concatenating pseudo-classes or attributes into a selector string — each condition stays legible and independently reusable.

**Bad (compound CSS selectors spanning multiple levels, `:checked` baked into a string):**

```typescript
this.topLevelCategoryCheckboxes = this.page.locator(
  '#filters > fieldset > div.checkbox > label > input[data-test^="category-"]',
);
this.checkedChildCategoryCheckboxes = this.page.locator(
  '#filters ul input[data-test^="category-"]:checked',
);
```

**Good (role-based parent, short chained steps, composed conditions):**

```typescript
this.categoriesGroup = this.page
  .getByRole('group', { name: 'Categories', exact: true })
  .first();
this.topLevelCategoryCheckboxes = this.categoriesGroup
  .locator('> div.checkbox > label')
  .getByRole('checkbox');
this.childCategoryCheckboxes = this.categoriesGroup
  .locator('ul')
  .getByRole('checkbox');
this.checkedChildCategoryCheckboxes = this.childCategoryCheckboxes.and(
  this.page.locator(':checked'),
);
```

### Example

**Page Object (no `expect()`):**

```typescript
async register(email: string, password: string) {
  await this.emailInput.fill(email);
  await this.passwordInput.fill(password);
  await this.registerSubmitBtn.click();
}
```

**Test File (all `expect()` here):**

```typescript
test('should register new user', async ({ page }) => {
  // Arrange
  const registerPage = new RegisterPage(page);

  // Act
  await registerPage.register('user@example.com', 'password123');

  // Assert
  await expect(registerPage.successMessage).toBeVisible();
});
```

## Fixtures

Fixtures inject ready-to-use objects into a test's arguments, so specs never write `new SomePage(page)` boilerplate or repeat setup. Specs import `{ expect, test }` from `@src/merge.fixture` (never `@playwright/test`) and destructure what they need.

### How the fixtures are layered

The project composes three fixture files into one `test` (`src/merge.fixture.ts` → `mergeTests(cartActionTest, requestObjectTest)`):

- **Page-object fixtures** (`src/ui/fixtures/page-object.fixture.ts`) — one instance of each `*.page.ts` per test (`homePage`, `cartPage`, …). This is the default home for a new page object.
- **Action fixtures** (`src/ui/fixtures/cart-action.fixture.ts`) — `cartActionTest` extends the page-object fixtures and adds a reusable cross-page _flow_ as a callable: `addProductToCart(index?, expectedBadgeCount?)`. Because it extends `pageObjectTest`, it re-exports every page object too.
- **Request-object fixtures** (`src/api/fixtures/request-object.fixture.ts`) — one instance of each API request object (`usersRequest`, `loginRequest`).

```typescript
// cart-action.fixture.ts — a flow used by several specs, injected as a callable
export const cartActionTest = pageObjectTest.extend<CartActions>({
  addProductToCart: async ({ homePage, productDetailPage }, use) => {
    await use(async (index = 0, expectedBadgeCount = '1'): Promise<void> => {
      await homePage.goto();
      await homePage.clickProductCard(index);
      await productDetailPage.addToCartAndAwaitBadge(expectedBadgeCount);
    });
  },
});
```

### When to create a new fixture

Reach for a fixture only after the cheaper options don't fit — most reuse belongs on a Page Object, not in a fixture. Create one when:

- **A new page object or API request object exists** — register it in `page-object.fixture.ts` / `request-object.fixture.ts` so specs get it injected. This is the common case and needs no new fixture _file_, just a new entry.
- **A multi-page arrange flow is repeated across specs** and can't live on a single Page Object because it composes several of them (e.g. `addProductToCart` spans `homePage` + `productDetailPage`). Add it to an action fixture like `cartActionTest`. A flow that lives entirely on one page belongs to that Page Object as a method instead — see Page Object rule 3.
- **A shared authenticated/seeded state is needed.** Prefer the existing `storageState`/`@logged` project wiring (see `CLAUDE.md`) for "start logged in"; add a fixture only for a state that wiring can't express.

Do **not** add a fixture for:

- A one-off setup used by a single spec — keep it inline in that spec's Arrange.
- A pure, page-agnostic data transform — that's a util (`src/ui/utils/`) or a factory (`src/ui/factories/`), not a fixture.
- Anything that would put an assertion in the fixture — fixtures follow the same no-`expect()` rule as Page Objects (API factories are the one sanctioned exception).

After adding a fixture, expose it through the merge in `src/merge.fixture.ts` if it isn't already reachable, and give it a precise type on the `extend<...>()` generic so specs get autocomplete.
