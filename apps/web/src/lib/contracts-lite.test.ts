import { describe, expect, it } from 'vitest';
import * as contracts from '@remoa/contracts';
import * as lite from './contracts-lite';

// P-507: the zod-free mirror must stay equal to the contract (the source of truth).
describe('contracts-lite', () => {
  it.each(['PLAN_LIMITS', 'notificationTypes', 'notificationCategories', 'CALENDAR_LIMITS', 'CALENDAR_REMINDER_RULES', 'calendarColors', 'CALENDAR_PALETTE', 'REVIEW_SESSION_MAX'] as const)('%s equals @remoa/contracts', (name) => {
    expect(lite[name]).toEqual(contracts[name]);
  });

  it('isNotificationType agrees with notificationTypeSchema', () => {
    for (const x of [...contracts.notificationTypes, 'nope', 1, null, undefined]) expect(lite.isNotificationType(x)).toBe(contracts.notificationTypeSchema.safeParse(x).success);
  });
});
