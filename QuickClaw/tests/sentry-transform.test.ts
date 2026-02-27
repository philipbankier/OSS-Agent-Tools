import { describe, expect, it } from 'vitest';
import { transformSentryPayload } from '../src/core/ops/sentry.js';

describe('sentry transform', () => {
  it('transforms payload into actionable agent message', () => {
    const transformed = transformSentryPayload({
      data: {
        id: '123',
        title: 'NullPointerException',
        culprit: 'UserService.ts:88',
        level: 'error',
      },
    });

    expect(transformed.name).toBe('Sentry');
    expect(transformed.channel).toBe('slack');
    expect(transformed.message).toContain('NullPointerException');
    expect(transformed.message).toContain('Issue ID: 123');
    expect(transformed.message).toContain('Mode: slack-first');
  });

  it('embeds webhook-direct mode when requested', () => {
    const transformed = transformSentryPayload(
      {
        data: {
          id: 'w1',
          title: 'Webhook issue',
        },
      },
      'webhook-direct',
    );

    expect(transformed.message).toContain('Mode: webhook-direct');
  });
});
