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

Here are the key use cases where you should use custom fixtures, along with practical examples.

1. Initializing Page Object Models (POM)Instead of manually instantiating your page classes inside every single test or beforeEach block, let fixtures inject them directly.Example: Injecting loginPage or dashboardPage straight into the test arguments.Why use it: It eliminates boilerplates like const loginPage = new LoginPage(page) from your test files, keeping them readable.2. Handling Multi-Role AuthenticationWhen your application has different user roles (e.g., Admin, Customer, Guest) and tests require specific authorization states.Example: Creating an adminPage fixture that automatically applies the Admin browser context/session state, and a customerPage for standard users.Why use it: It allows you to run parallel tests with different logged-in users seamlessly without auth steps leaking into each other. 3. Automated Setup and Teardown (Data Seeding)When a test depends on specific backend data or assets that must exist before the test runs and should be cleaned up afterward.Example: An issue fixture that calls an API to create a GitHub issue, passes the issue ID to the test, and deletes the issue using code written after the yield statement.Why use it: The teardown code after yield runs even if the test fails, preventing data pollution in your test environments. 4. Encapsulating External ServicesIf your end-to-end tests interact with databases, mock servers, email testing tools (like Mailosaur), or third-party APIs.Example: A dbClient fixture that establishes a database connection, performs quick queries for assertions, and closes the connection.Why use it: It abstracts complex connection logic away from your actual test assertions.5. Overriding Default Playwright FixturesWhen you want to globally modify how built-in fixtures (like page or context) behave across your entire test suite.Example: Overriding page to automatically listen for and throw errors on console exceptions, or to block specific network analytics scripts.Why use it: Centralized control over the browser behavior without changing individual test files.
