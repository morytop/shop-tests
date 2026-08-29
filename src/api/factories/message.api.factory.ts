import { APIRequestContext } from '@playwright/test';
import { getAuthorizationHeader } from '@src/api/factories/authorization-header.api.factory';
import { LoginData } from '@src/api/models/login.api.model';
import { ContactPayload } from '@src/api/models/message.api.model';
import { MessagesRequest } from '@src/api/requests/messages.request';
import { expect } from '@src/fixtures/merge.fixture';

export async function sendMessageWithApi(
  request: APIRequestContext,
  credentials: LoginData,
  payload: ContactPayload,
): Promise<void> {
  const headers = await getAuthorizationHeader(request, credentials);
  const response = await new MessagesRequest(request, headers).post(payload);
  // 200, not the 201 every other create on this API answers with (§API-E).
  expect(
    response.status(),
    `message send expected 200, got ${response.status()}`,
  ).toBe(200);
}
