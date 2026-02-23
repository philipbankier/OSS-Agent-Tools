import { describe, expect, it } from 'vitest';
import { scheduleIntentToCron } from '../src/core/ops/cron.js';

describe('cron schedule intent conversion', () => {
  it('converts intent to cron expression', () => {
    expect(scheduleIntentToCron({ type: 'nightly', hour: 23, minute: 0 })).toBe('0 23 * * *');
    expect(scheduleIntentToCron({ type: 'daily-checkin', hour: 9, minute: 30 })).toBe('30 9 * * *');
  });

  it('clamps out-of-range values', () => {
    expect(scheduleIntentToCron({ type: 'nightly', hour: 99, minute: -4 })).toBe('0 23 * * *');
  });
});
