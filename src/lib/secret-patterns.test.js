import { expect, it } from 'vitest';
import { containsSecret } from '../../scripts/secret-patterns.mjs';

it('detects privileged tokens without returning their value', () => {
  const key = ['sb', 'secret', 'a'.repeat(30)].join('_');
  expect(containsSecret(key)).toBe(true);
  const jwt = (role) => ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role })).toString('base64url'), 'signature'].join('.');
  expect(containsSecret(jwt('service_role'))).toBe(true);
  expect(containsSecret(jwt('anon'))).toBe(false);
  expect(containsSecret(['postgresql://user', 'password@db.test/database'].join(':'))).toBe(true);
  expect(containsSecret('SUPABASE_SERVICE_ROLE_KEY=')).toBe(false);
});
