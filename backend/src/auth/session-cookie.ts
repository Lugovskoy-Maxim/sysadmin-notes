import type { CookieOptions } from 'express';
import { ConfigService } from '@nestjs/config';

export function sessionCookieOptions(config: ConfigService): CookieOptions {
  const override = config.get<string>('COOKIE_SECURE');
  const frontendUrl = config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
  const secure = override === 'true' || (override !== 'false' && frontendUrl.startsWith('https://'));

  return {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
  };
}
