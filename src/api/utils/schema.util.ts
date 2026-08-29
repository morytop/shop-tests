import { APIResponse } from '@playwright/test';
import { expect } from '@src/fixtures/merge.fixture';
import { ZodError, ZodType } from 'zod';

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
