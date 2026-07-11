import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ClaimAdminDto, LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';
import { AdminService } from '../admin/admin.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OAuthService } from './oauth.service';
import { sessionCookieOptions } from './session-cookie';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private oauth: OAuthService,
    private config: ConfigService,
    private admin: AdminService,
  ) {}

  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.register(dto);
    this.setSessionCookie(response, result.token);
    return { user: result.user };
  }

  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto);
    this.setSessionCookie(response, result.token);
    return { user: result.user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('sysadmin_session', this.cookieOptions());
    return { ok: true };
  }

  @Get('oauth/providers')
  oauthProviders() {
    return { providers: this.oauth.enabledProviders() };
  }

  @Get('oauth/:provider/start')
  startOAuth(@Param('provider') providerValue: string, @Res() response: Response) {
    if (!this.oauth.isProvider(providerValue)) throw new BadRequestException('Неизвестный OAuth-провайдер');
    const flow = this.oauth.createFlow(providerValue);
    const options = { ...this.cookieOptions(), maxAge: 10 * 60 * 1000 };
    response.cookie('oauth_state', flow.state, options);
    response.cookie('oauth_verifier', flow.verifier, options);
    response.cookie('oauth_provider', providerValue, options);
    response.cookie('oauth_mode', 'login', options);
    return response.redirect(flow.url);
  }

  @UseGuards(JwtAuthGuard)
  @Get('oauth/:provider/link')
  linkOAuth(@Param('provider') providerValue: string, @Res() response: Response) {
    if (!this.oauth.isProvider(providerValue)) throw new BadRequestException('Неизвестный OAuth-провайдер');
    const flow = this.oauth.createFlow(providerValue);
    const options = { ...this.cookieOptions(), maxAge: 10 * 60 * 1000 };
    response.cookie('oauth_state', flow.state, options);
    response.cookie('oauth_verifier', flow.verifier, options);
    response.cookie('oauth_provider', providerValue, options);
    response.cookie('oauth_mode', 'link', options);
    return response.redirect(flow.url);
  }

  @Get('oauth/:provider/callback')
  async finishOAuth(
    @Param('provider') providerValue: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const frontend = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    try {
      if (!this.oauth.isProvider(providerValue)) throw new BadRequestException('Неизвестный OAuth-провайдер');
      const cookies = this.parseCookies(request.headers.cookie);
      if (!code || !state || state !== cookies.oauth_state || providerValue !== cookies.oauth_provider) {
        throw new BadRequestException('OAuth state не совпадает');
      }
      let linkUserId: string | undefined;
      if (cookies.oauth_mode === 'link') {
        const session = cookies.sysadmin_session;
        if (!session) throw new BadRequestException('Сессия для привязки не найдена');
        linkUserId = this.auth.verifyToken(session).sub;
      }
      const result = await this.oauth.complete(providerValue, code, cookies.oauth_verifier ?? '', linkUserId);
      this.setSessionCookie(response, result.token);
      this.clearOAuthCookies(response);
      return response.redirect(`${frontend}/?oauth=success`);
    } catch (error) {
      this.clearOAuthCookies(response);
      const message = error instanceof Error ? error.message : 'OAuth error';
      return response.redirect(`${frontend}/?oauth_error=${encodeURIComponent(message)}`);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: { id: string } }) {
    return this.auth.me(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('identities')
  identities(@Req() req: { user: { id: string } }) {
    return this.auth.identities(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('identities/:id/unlink')
  unlinkIdentity(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.auth.unlinkIdentity(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@Req() req: { user: { id: string } }, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('claim-admin')
  claimAdmin(@Req() req: { user: { id: string } }, @Body() dto: ClaimAdminDto) {
    return this.admin.claimAdmin(req.user.id, dto.secret);
  }

  private setSessionCookie(response: Response, token: string) {
    response.cookie('sysadmin_session', token, {
      ...this.cookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private cookieOptions() {
    return sessionCookieOptions(this.config);
  }

  private parseCookies(header?: string) {
    return Object.fromEntries(
      (header ?? '')
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const index = part.indexOf('=');
          return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
        }),
    );
  }

  private clearOAuthCookies(response: Response) {
    response.clearCookie('oauth_state', this.cookieOptions());
    response.clearCookie('oauth_verifier', this.cookieOptions());
    response.clearCookie('oauth_provider', this.cookieOptions());
    response.clearCookie('oauth_mode', this.cookieOptions());
  }
}
