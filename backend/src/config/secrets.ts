import { ConfigService } from '@nestjs/config';

const DEV_JWT_SECRET = 'dev-only-jwt-secret-not-for-production';
const DEV_VAULT_SECRET = 'dev-vault-secret-change-in-production-32b';

export function getJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  const isProd = config.get<string>('NODE_ENV') === 'production';

  if (isProd) {
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET must be set and at least 32 characters in production');
    }
    return secret;
  }

  if (!secret) {
    console.warn('[security] JWT_SECRET is not set — using development fallback');
    return DEV_JWT_SECRET;
  }
  return secret;
}

export function getVaultEncryptionSecret(config: ConfigService): string {
  const secret = config.get<string>('VAULT_ENCRYPTION_SECRET');
  const isProd = config.get<string>('NODE_ENV') === 'production';

  if (isProd) {
    if (!secret || secret.length < 32) {
      throw new Error('VAULT_ENCRYPTION_SECRET must be set and at least 32 characters in production');
    }
    return secret;
  }

  if (!secret) {
    console.warn('[security] VAULT_ENCRYPTION_SECRET is not set — using development fallback');
    return DEV_VAULT_SECRET;
  }
  return secret;
}

export function validateProductionConfig(config: ConfigService) {
  getJwtSecret(config);
  getVaultEncryptionSecret(config);

  const isProd = config.get<string>('NODE_ENV') === 'production';
  if (isProd && !config.get<string>('FRONTEND_URL')) {
    throw new Error('FRONTEND_URL must be set in production');
  }
}