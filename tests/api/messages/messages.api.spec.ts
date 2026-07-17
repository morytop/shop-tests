import { faker } from '@faker-js/faker';
import { ContactPayload } from '@src/api/models/message.api.model';
import { expect, test } from '@src/merge.fixture';

/**
 * The contact form is anonymous by design, so nothing here needs a token — and
 * pulling one would register a throwaway user for no reason. Every message is a
 * permanent row an admin sees, so the bodies are faker text rather than anything
 * a human reader would mistake for a real enquiry.
 */
test.describe('API messages — contact form', () => {
  const buildMessage = (): Required<ContactPayload> => ({
    name: faker.person.fullName(),
    email: faker.internet.email(),
    subject: 'Customer service',
    message: faker.lorem.sentences(4),
  });

  test(
    'accepts an anonymous contact message and files it as new',
    { tag: ['@api', '@smoke', '@messages'] },
    async ({ messagesRequest }) => {
      const payload = buildMessage();

      const response = await messagesRequest.post(payload);

      // 200, not the 201 every other create on this API answers with, and the
      // body is the stored message rather than a `{success: true}` ack (§API-E).
      expect(response.status()).toBe(200);
      const message = await response.json();
      expect.soft(message.id).toBeTruthy();
      expect.soft(message.subject).toBe(payload.subject);
      expect.soft(message.message).toBe(payload.message);
      expect.soft(message.status).toBe('NEW');
    },
  );

  test(
    'attaches an empty file to a message',
    { tag: ['@api', '@messages'] },
    async ({ messagesRequest }) => {
      const message = await (await messagesRequest.post(buildMessage())).json();

      const response = await messagesRequest.attachFile(message.id, {
        name: 'attachment.txt',
        mimeType: 'text/plain',
        buffer: Buffer.alloc(0),
      });

      expect(response.status()).toBe(200);
      // The one place in this API where `{success: true}` is the real shape.
      expect.soft(await response.json()).toEqual({ success: true });
    },
  );

  test(
    'rejects an attachment that has any content in it',
    { tag: ['@api', '@messages'] },
    async ({ messagesRequest }) => {
      const message = await (await messagesRequest.post(buildMessage())).json();

      const response = await messagesRequest.attachFile(message.id, {
        name: 'attachment.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('anything at all'),
      });

      // The demo app deliberately accepts uploads but stores nothing, so the
      // 0-byte rule the UI advertises is genuinely enforced server-side rather
      // than being client-only like the message length below. Unlike every
      // other rejection in this API, the body is `{errors: [...]}` — a bare
      // array, not keyed by field (§API-E).
      expect(response.status()).toBe(400);
      expect
        .soft((await response.json()).errors.join(' '))
        .toContain('Currently we only allow empty files');
    },
  );

  test(
    'rejects an attach-file call with no file',
    { tag: ['@api', '@messages'] },
    async ({ messagesRequest }) => {
      const message = await (await messagesRequest.post(buildMessage())).json();

      const response = await messagesRequest.attachFileless(message.id);

      expect(response.status()).toBe(400);
      expect
        .soft((await response.json()).errors.join(' '))
        .toContain('No file attached');
    },
  );

  /**
   * Pins a real gap, not a requirement: only `subject` and `message` are
   * actually required. `name`/`email` are both optional — a message posts
   * happily with either omitted — though `email`, when present, is genuinely
   * format-validated (unlike register's, §API-C). The 422 body is also a bare
   * field map here, without the `{message, errors}` wrapper the catalog and
   * invoice endpoints use (§API-E).
   */
  test(
    'rejects an empty contact message, naming the required fields',
    { tag: ['@api', '@messages'] },
    async ({ messagesRequest }) => {
      const response = await messagesRequest.post({} as ContactPayload);

      expect(response.status()).toBe(422);
      expect
        .soft(Object.keys(await response.json()))
        .toEqual(expect.arrayContaining(['subject', 'message']));
    },
  );

  test(
    'rejects a message body longer than 250 characters',
    { tag: ['@api', '@messages'] },
    async ({ messagesRequest }) => {
      const response = await messagesRequest.post({
        ...buildMessage(),
        message: 'a'.repeat(251),
      });

      expect(response.status()).toBe(422);
      expect
        .soft((await response.json()).message.join(' '))
        .toContain('must not be greater than 250');
    },
  );

  test(
    'accepts a message shorter than the 50 characters the form demands',
    { tag: ['@api', '@messages'] },
    async ({ messagesRequest }) => {
      const response = await messagesRequest.post({
        ...buildMessage(),
        message: 'too short',
      });

      // Pins a gap, not a requirement: the contact form blocks anything under 50
      // characters, but that minimum lives only in the client — the API stores a
      // 9-character message happily (§API-E). Its upper bound above is enforced
      // both sides.
      expect(response.status()).toBe(200);
    },
  );

  test(
    'accepts a subject outside the values the form offers',
    { tag: ['@api', '@messages'] },
    async ({ messagesRequest }) => {
      const response = await messagesRequest.post({
        ...buildMessage(),
        subject: faker.lorem.word(),
      });

      // Another client-only rule: the form's subject is a fixed `<select>`, but
      // the API takes free text and files it verbatim (§API-E).
      expect(response.status()).toBe(200);
      expect.soft((await response.json()).status).toBe('NEW');
    },
  );
});
