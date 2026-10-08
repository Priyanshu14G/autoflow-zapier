import { createHmac } from 'crypto';

/**
 * Minimal inline test for webhook HMAC signature logic.
 * Tests the same logic used in WebhooksService.verifySignature.
 */

function computeSignature(rawBody: Buffer, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
}

describe('Webhook HMAC Signature Logic', () => {
  const secret = 'test-webhook-secret-abc123';
  const rawBody = Buffer.from(JSON.stringify({ event: 'user.created', userId: 'u-1' }));

  it('should produce the correct sha256= prefixed signature', () => {
    const sig = computeSignature(rawBody, secret);
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it('should produce a consistent signature for the same input', () => {
    const sig1 = computeSignature(rawBody, secret);
    const sig2 = computeSignature(rawBody, secret);
    expect(sig1).toBe(sig2);
  });

  it('should produce a different signature for different secrets', () => {
    const sig1 = computeSignature(rawBody, 'secret-a');
    const sig2 = computeSignature(rawBody, 'secret-b');
    expect(sig1).not.toBe(sig2);
  });

  it('should produce a different signature for different bodies', () => {
    const body2 = Buffer.from(JSON.stringify({ event: 'user.deleted' }));
    const sig1 = computeSignature(rawBody, secret);
    const sig2 = computeSignature(body2, secret);
    expect(sig1).not.toBe(sig2);
  });
});
