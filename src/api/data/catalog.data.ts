/**
 * A well-formed ULID that matches no row in the catalog.
 *
 * Every catalog write test targets this id rather than a live one, and that is a
 * safety requirement, not a stylistic choice: the API checks existence *before*
 * auth on `PUT`/`PATCH` (an unknown id 404s where a real id would reach the
 * handler), so pointing a "does this reject anonymous writes?" probe at a real
 * brand or product risks mutating shared production data to answer the question.
 * With no row behind the id, the rejection is observable and nothing is reachable
 * to damage.
 */
export const UNKNOWN_ID = '01JZZZZZZZZZZZZZZZZZZZZZZZ';
