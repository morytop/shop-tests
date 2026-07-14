import { STORAGE_STATE } from '../../playwright.config';
import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import { test as setup } from '@src/merge.fixture';

// Auth setup: register a fresh user via the API (fast, no UI), then establish a
// real session by logging in through the UI so the app's own auth state
// (localStorage token) is captured, and persist it for the @logged project.
// Assertions belong in specs, not setup — waiting for the account page to render
// (it only appears once authenticated) is the readiness gate before saving state.
setup(
  'register a fresh user and save its logged-in session',
  async ({ usersRequest, loginPage, accountPage, page }) => {
    const user = await registerUserWithApi(usersRequest);

    await loginPage.goto();
    await loginPage.login(user.email, user.password);
    await accountPage.pageTitle.waitFor();

    await page.context().storageState({ path: STORAGE_STATE });
  },
);
