import { createHash, randomBytes } from 'crypto';

/**
 * Inline tests for the API key hashing / validation logic.
 * Tests the exact same algorithm used in ApiKeysService — no DB required.
 */

const KEY_BYTES = 32;
const KEY_PREFIX_LENGTH = 8;

function generateApiKey(): { rawKey: string; prefix: string; hash: string } {
  const rawRandom = randomBytes(KEY_BYTES).toString('hex');
  const prefix = rawRandom.slice(0, KEY_PREFIX_LENGTH);
  const rawKey = `af_${prefix}_${rawRandom}`;
  const hash = createHash('sha256').update(rawKey).digest('hex');
  return { rawKey, prefix, hash };
}

function parsePrefix(rawKey: string): string | null {
  const parts = rawKey.split('_');
  if (parts.length < 3 || parts[0] !== 'af') return null;
  return parts[1];
}

function validateKey(rawKey: string, storedHash: string): boolean {
  const candidate = createHash('sha256').update(rawKey).digest('hex');
  return candidate === storedHash;
}

describe('API Key Hashing Logic', () => {
  it('should generate a key with the af_ prefix format', () => {
    const { rawKey } = generateApiKey();
    expect(rawKey).toMatch(/^af_[a-f0-9]{8}_[a-f0-9]{64}$/);
  });

  it('should extract the prefix correctly', () => {
    const { rawKey, prefix } = generateApiKey();
    expect(parsePrefix(rawKey)).toBe(prefix);
  });

  it('should produce a valid SHA-256 hash', () => {
    const { hash } = generateApiKey();
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should validate a correct raw key against its hash', () => {
    const { rawKey, hash } = generateApiKey();
    expect(validateKey(rawKey, hash)).toBe(true);
  });

  it('should reject a tampered key', () => {
    const { rawKey, hash } = generateApiKey();
    const tampered = rawKey.slice(0, -1) + 'x';
    expect(validateKey(tampered, hash)).toBe(false);
  });

  it('should reject a completely different key', () => {
    const { hash } = generateApiKey();
    const { rawKey: otherKey } = generateApiKey();
    expect(validateKey(otherKey, hash)).toBe(false);
  });

  it('should produce different hashes for different keys', () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.hash).not.toBe(b.hash);
    expect(a.rawKey).not.toBe(b.rawKey);
  });

  it('should reject keys without the af_ prefix', () => {
    expect(parsePrefix('sk_liveXXXXXX')).toBeNull();
    expect(parsePrefix('Bearer token')).toBeNull();
    expect(parsePrefix('')).toBeNull();
  });
});
