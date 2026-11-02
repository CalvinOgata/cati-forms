import { randomBytes } from 'node:crypto';

/**
 * Primary key for a new row. Short, URL-safe and unguessable, since a form's
 * id ends up in its public link (RF08).
 */
export function newId(): string {
  return randomBytes(8).toString('base64url');
}
