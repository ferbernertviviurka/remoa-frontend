import { describe, expect, it } from 'vitest';
import { httpErrorBodySchema } from '@remoa/contracts';
import { readErrorBody } from './error-body';

// P-507: the light guard must agree with the contract's zod schema.
const cases: unknown[] = [
  { error: { code: 'not_found', message: 'x' } },
  { error: { code: 'quota_exceeded', message: '', extra: 1 } },
  { error: { code: 'nope', message: 'x' } },
  { error: { code: 'toString', message: 'x' } },
  { error: { code: 'internal' } },
  { error: null },
  { error: 'internal' },
  null,
  'text',
  {},
];

describe('readErrorBody', () => {
  it.each(cases)('matches httpErrorBodySchema for %j', (body) => {
    const parsed = httpErrorBodySchema.safeParse(body);
    expect(readErrorBody(body)).toEqual(parsed.success ? parsed.data.error : null);
  });
});
