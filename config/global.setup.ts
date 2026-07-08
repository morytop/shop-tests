import { BASE_URL } from './env.config';
import { request } from '@playwright/test';

// Fail the whole run fast (with a clear message) if the app under test is not
// reachable, rather than letting every spec time out individually.
async function globalSetup(): Promise<void> {
  const context = await request.newContext();
  try {
    await context.get(BASE_URL);
  } catch (error) {
    throw new Error(
      `Failed to reach ${BASE_URL}. Is the app under test online?\n${String(error)}`,
    );
  } finally {
    await context.dispose();
  }
}

export default globalSetup;
