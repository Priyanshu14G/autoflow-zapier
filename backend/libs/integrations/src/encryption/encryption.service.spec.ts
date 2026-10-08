import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService({
      ENCRYPTION_KEY: 'test-secret-key-32-bytes-long-super-secure!',
    });
    service = new EncryptionService(configService);
  });

  it('should encrypt and decrypt strings successfully', () => {
    const secret = 'my-secret-api-token-xyz-123';
    const encrypted = service.encrypt(secret);

    expect(encrypted.ciphertext).toBeInstanceOf(Buffer);
    expect(encrypted.iv).toHaveLength(24); // 12 bytes = 24 hex characters
    expect(encrypted.authTag).toHaveLength(32); // 16 bytes = 32 hex characters

    const decrypted = service.decrypt<string>(encrypted, false);
    expect(decrypted).toBe(secret);
  });

  it('should encrypt and decrypt objects as JSON', () => {
    const credentials = {
      apiKey: 'sk_live_1234567890',
      apiSecret: 'secret_abcdef',
      endpoint: 'https://api.example.com',
      metadata: { port: 8080, ssl: true },
    };

    const encrypted = service.encrypt(credentials);
    const decrypted = service.decrypt<typeof credentials>(encrypted, true);

    expect(decrypted).toEqual(credentials);
  });

  it('should produce different ciphertexts and IVs for identical plaintext (probabilistic)', () => {
    const text = 'identical-secret';
    const enc1 = service.encrypt(text);
    const enc2 = service.encrypt(text);

    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext.toString('hex')).not.toBe(enc2.ciphertext.toString('hex'));

    expect(service.decrypt<string>(enc1, false)).toBe(text);
    expect(service.decrypt<string>(enc2, false)).toBe(text);
  });

  it('should fail decryption if authTag is tampered with', () => {
    const secret = 'tamper-test';
    const encrypted = service.encrypt(secret);

    // Tamper with auth tag
    const tamperedTag = encrypted.authTag.slice(0, -2) + (encrypted.authTag.endsWith('0') ? '1' : '0');

    expect(() => {
      service.decrypt({ ...encrypted, authTag: tamperedTag });
    }).toThrow('Failed to decrypt credentials');
  });

  it('should fail decryption if ciphertext is tampered with', () => {
    const secret = 'tamper-ciphertext-test';
    const encrypted = service.encrypt(secret);

    // Tamper with ciphertext buffer
    const tamperedBuffer = Buffer.from(encrypted.ciphertext);
    tamperedBuffer[0] = tamperedBuffer[0] ^ 0xff;

    expect(() => {
      service.decrypt({ ...encrypted, ciphertext: tamperedBuffer });
    }).toThrow('Failed to decrypt credentials');
  });

  it('should fail decryption if decrypted with wrong key', () => {
    const otherService = new EncryptionService(
      new ConfigService({ ENCRYPTION_KEY: 'completely-different-key' }),
    );

    const encrypted = service.encrypt('secret-for-key-1');
    expect(() => {
      otherService.decrypt(encrypted);
    }).toThrow('Failed to decrypt credentials');
  });
});
