import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { getVaultEncryptionSecret } from '../config/secrets';

const PREFIX = 'enc:v1:';
const ALGO = 'aes-256-gcm';
const SENSITIVE_FIELDS = ['password', 'totpSecret', 'sshKey'] as const;

type SensitiveField = (typeof SENSITIVE_FIELDS)[number];

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);

  constructor(private config: ConfigService) {}

  private deriveKey(userId: string): Buffer {
    const secret = getVaultEncryptionSecret(this.config);
    return scryptSync(secret, `vault:${userId}`, 32);
  }

  isEncrypted(value: string | null | undefined): boolean {
    return Boolean(value?.startsWith(PREFIX));
  }

  encrypt(value: string | null | undefined, userId: string): string | null | undefined {
    if (value == null || value === '') return value;
    if (this.isEncrypted(value)) return value;

    const key = this.deriveKey(userId);
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGO, key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const payload = Buffer.concat([iv, tag, encrypted]).toString('base64url');
    return `${PREFIX}${payload}`;
  }

  decrypt(value: string | null | undefined, userId: string): string | null | undefined {
    if (value == null || value === '') return value;
    if (!this.isEncrypted(value)) return value;

    try {
      const key = this.deriveKey(userId);
      const raw = Buffer.from(value.slice(PREFIX.length), 'base64url');
      const iv = raw.subarray(0, 12);
      const tag = raw.subarray(12, 28);
      const data = raw.subarray(28);
      const decipher = createDecipheriv(ALGO, key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    } catch (err) {
      this.logger.warn(`Failed to decrypt field for user ${userId}: ${err instanceof Error ? err.message : 'unknown'}`);
      return null;
    }
  }

  encryptNoteData<T extends Record<string, unknown>>(data: T, userId: string): T {
    const next: Record<string, unknown> = { ...data };
    for (const field of SENSITIVE_FIELDS) {
      if (typeof next[field] === 'string') {
        next[field] = this.encrypt(next[field] as string, userId);
      }
    }
    return next as T;
  }

  decryptNote<T extends Record<string, unknown>>(note: T, userId: string): T {
    const next: Record<string, unknown> = { ...note };
    for (const field of SENSITIVE_FIELDS) {
      if (typeof next[field] === 'string') {
        next[field] = this.decrypt(next[field] as string, userId);
      }
    }
    return next as T;
  }
}