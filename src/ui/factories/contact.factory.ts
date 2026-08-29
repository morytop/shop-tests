import { faker } from '@faker-js/faker';

/**
 * A random contact-form / reply body of an exact character length. The app validates the
 * body at BOTH ends — at least 50 characters (documented) and at most 250 ("The message
 * field must not be greater than 250 characters."
 */
export function prepareRandomMessage(length = 200): string {
  let text = '';

  while (text.length < length) {
    text += `${faker.lorem.sentence()} `;
  }

  return text.slice(0, length).trim();
}
