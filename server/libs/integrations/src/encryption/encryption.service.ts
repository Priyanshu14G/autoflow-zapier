import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface EncryptedPayload {
  ciphertext: Buffer | Uint8Array;
  iv: string;
  authTag: string;
}

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 12; // 96 bits is recommended standard for AES-GCM
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const rawKey = this.configService.get<string>('ENCRYPTION_KEY') || 'default-secret-encryption-key-for-autoflow-dev-only-32b';
    // Ensure 32 bytes (256 bits) key using SHA-256 hash of the configured key
    this.key = crypto.createHash('sha256').update(rawKey).digest();
  }

  /**
   * Encrypts plain text or an object using AES-256-GCM.
   * Returns ciphertext Buffer, hex IV, and hex authentication tag.
   */
  encrypt(data: unknown): EncryptedPayload {
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    const iv = crypto.randomBytes(this.ivLength);

    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Decrypts ciphertext buffer using AES-256-GCM with the provided IV and auth tag.
   * If parseJson is true, parses the decrypted utf-8 string as JSON.
   */
  decrypt<T = unknown>(payload: EncryptedPayload, parseJson = true): T {
    try {
      const iv = Buffer.from(payload.iv, 'hex');
      const authTag = Buffer.from(payload.authTag, 'hex');
      const ciphertext = Buffer.isBuffer(payload.ciphertext)
        ? payload.ciphertext
        : Buffer.from(payload.ciphertext);

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv, { authTagLength: 16 });
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      const text = decrypted.toString('utf8');

      if (parseJson) {
        try {
          return JSON.parse(text) as T;
        } catch {
          return text as unknown as T;
        }
      }

      return text as unknown as T;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Decryption failed: ${message}`);
      throw new Error(`Failed to decrypt credentials: authentication verification failed or data corrupted`);
    }
  }
}
