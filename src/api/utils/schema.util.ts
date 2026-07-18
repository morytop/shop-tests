import { APIResponse } from '@playwright/test';
import { expect } from '@src/fixtures/merge.fixture';
import { ZodError, ZodType } from 'zod';

/**
 * Asserts a response body against a generated contract schema
 * (`src/api/schemas/toolshop.zod.ts`). This *is* the assertion — the same
 * sanctioned exception to "expect() only in specs" as the API factories. On
 * mismatch the failure message lists each drifted field (path + zod issue)
 * instead of a bare `success: false`.
 */
export async function expectToMatchSchema(
  response: APIResponse,
  schema: ZodType,
): Promise<void> {
  const body: unknown = await response.json();
  const result = schema.safeParse(body);
  const details = result.success
    ? 'body matches the schema'
    : formatZodIssues(result.error);
  expect(result.success, details).toBe(true);
}

function formatZodIssues(error: ZodError): string {
  return error.issues
    .map(
      (issue) =>
        `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`,
    )
    .join('\n');
}
