import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

export const OAUTH_PROVIDERS = ['github', 'google', 'yandex'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

type ProviderConfig = {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  userUrl: string;
  scope: string;
};

type OAuthProfile = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
};

@Injectable()
export class OAuthService {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private auth: AuthService,
  ) {}

  isProvider(value: string): value is OAuthProvider {
    return OAUTH_PROVIDERS.includes(value as OAuthProvider);
  }

  enabledProviders() {
    return OAUTH_PROVIDERS.filter((provider) => {
      const prefix = `${provider.toUpperCase()}_OAUTH`;
      return Boolean(
        this.config.get<string>(`${prefix}_CLIENT_ID`) &&
        this.config.get<string>(`${prefix}_CLIENT_SECRET`),
      );
    });
  }

  createFlow(provider: OAuthProvider) {
    const cfg = this.providerConfig(provider);
    const state = randomBytes(24).toString('base64url');
    const verifier = randomBytes(48).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const callback = this.callbackUrl(provider);
    const url = new URL(cfg.authorizeUrl);
    url.searchParams.set('client_id', cfg.clientId);
    url.searchParams.set('redirect_uri', callback);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', cfg.scope);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    if (provider === 'google') {
      url.searchParams.set('access_type', 'online');
      url.searchParams.set('prompt', 'select_account');
    }
    return { url: url.toString(), state, verifier };
  }

  async complete(provider: OAuthProvider, code: string, verifier: string, linkUserId?: string) {
    const cfg = this.providerConfig(provider);
    const token = await this.exchangeCode(provider, cfg, code, verifier);
    const profile = await this.loadProfile(provider, cfg, token);
    const identity = await this.prisma.authIdentity.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId: profile.id } },
      include: { user: true },
    });

    if (identity && linkUserId && identity.userId !== linkUserId) {
      throw new BadRequestException('Этот OAuth-аккаунт уже связан с другим пользователем');
    }

    let user = linkUserId
      ? await this.prisma.user.findUnique({ where: { id: linkUserId } })
      : identity?.user ?? null;
    if (!user) {
      user = await this.prisma.user.findUnique({ where: { email: profile.email } });
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            subscription: { create: { plan: 'free', status: 'active' } },
            projects: {
              create: {
                name: 'Мой проект',
                description: 'Основной проект для заметок',
                color: '#087f72',
                icon: 'server',
              },
            },
          },
        });
      }
      await this.prisma.authIdentity.create({
        data: {
          provider,
          providerAccountId: profile.id,
          email: profile.email,
          displayName: profile.name,
          avatarUrl: profile.avatarUrl,
          userId: user.id,
        },
      });
    } else if (identity) {
      await this.prisma.authIdentity.update({
        where: { id: identity!.id },
        data: {
          email: profile.email,
          displayName: profile.name,
          avatarUrl: profile.avatarUrl,
          lastLoginAt: new Date(),
        },
      });
    } else {
      await this.prisma.authIdentity.create({
        data: {
          provider,
          providerAccountId: profile.id,
          email: profile.email,
          displayName: profile.name,
          avatarUrl: profile.avatarUrl,
          userId: user.id,
        },
      });
    }

    return {
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      token: this.auth.createToken(user.id, user.email),
    };
  }

  private providerConfig(provider: OAuthProvider): ProviderConfig {
    const prefix = `${provider.toUpperCase()}_OAUTH`;
    const clientId = this.config.get<string>(`${prefix}_CLIENT_ID`);
    const clientSecret = this.config.get<string>(`${prefix}_CLIENT_SECRET`);
    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException(`OAuth ${provider} не настроен`);
    }

    const providers: Record<OAuthProvider, Omit<ProviderConfig, 'clientId' | 'clientSecret'>> = {
      github: {
        authorizeUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userUrl: 'https://api.github.com/user',
        scope: 'read:user user:email',
      },
      google: {
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
        scope: 'openid email profile',
      },
      yandex: {
        authorizeUrl: 'https://oauth.yandex.com/authorize',
        tokenUrl: 'https://oauth.yandex.com/token',
        userUrl: 'https://login.yandex.ru/info?format=json',
        scope: 'login:email login:info',
      },
    };
    return { clientId, clientSecret, ...providers[provider] };
  }

  private callbackUrl(provider: OAuthProvider) {
    const base = this.config.get<string>('BACKEND_PUBLIC_URL') ?? 'http://localhost:4000';
    return `${base.replace(/\/$/, '')}/api/auth/oauth/${provider}/callback`;
  }

  private async exchangeCode(
    provider: OAuthProvider,
    cfg: ProviderConfig,
    code: string,
    verifier: string,
  ): Promise<string> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      code,
      redirect_uri: this.callbackUrl(provider),
      code_verifier: verifier,
    });
    const response = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const data = (await response.json()) as { access_token?: string; error?: string };
    if (!response.ok || !data.access_token) {
      throw new BadRequestException(data.error ?? 'Не удалось получить OAuth-токен');
    }
    return data.access_token;
  }

  private async loadProfile(provider: OAuthProvider, cfg: ProviderConfig, token: string): Promise<OAuthProfile> {
    const response = await fetch(cfg.userUrl, {
      headers: {
        Accept: 'application/json',
        Authorization: provider === 'yandex' ? `OAuth ${token}` : `Bearer ${token}`,
        'User-Agent': 'Sysadmin-Notes',
      },
    });
    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok) throw new BadRequestException('Не удалось получить профиль OAuth');

    let email = String(data.email ?? data.default_email ?? '');
    if (provider === 'github') {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      });
      const emails = (await emailsResponse.json()) as { email: string; primary: boolean; verified: boolean }[];
      email =
        emails.find((item) => item.primary && item.verified)?.email ??
        emails.find((item) => item.verified)?.email ??
        '';
    }
    if (provider === 'google' && data.email_verified !== true) {
      throw new BadRequestException('Google не подтвердил email');
    }
    if (!email) throw new BadRequestException('Провайдер не вернул подтверждённый email');

    return {
      id: String(data.id ?? data.sub ?? data.uid),
      email: email.toLowerCase(),
      name: String(data.name ?? data.login ?? data.display_name ?? email.split('@')[0]),
      avatarUrl: String(data.avatar_url ?? data.picture ?? data.default_avatar_id ?? '') || undefined,
    };
  }
}
