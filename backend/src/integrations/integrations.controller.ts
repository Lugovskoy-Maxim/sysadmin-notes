import { Body, Controller, Delete, Get, Headers, Post, Query, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { sessionCookieOptions } from '../auth/session-cookie';
import { EmailService } from './email.service';
import { SendEmailDto, SendTelegramDto, TelegramWebhookDto } from './dto/integrations.dto';
import { TelegramService } from './telegram.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private email: EmailService,
    private telegram: TelegramService,
    private config: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('status')
  async status(@Req() req: { user: { id: string; email: string } }) {
    return {
      email: this.email.status(),
      telegram: await this.telegram.getLink(req.user.id),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('email/send')
  sendEmail(@Req() req: { user: { email: string } }, @Body() dto: SendEmailDto) {
    return this.email.send(dto.to ?? req.user.email, dto.subject, dto.text);
  }

  @UseGuards(JwtAuthGuard)
  @Post('telegram/link')
  createTelegramLink(@Req() req: { user: { id: string } }) {
    return this.telegram.createLinkToken(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('telegram/link')
  unlinkTelegram(@Req() req: { user: { id: string } }) {
    return this.telegram.unlink(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('telegram/send')
  sendTelegram(@Req() req: { user: { id: string } }, @Body() dto: SendTelegramDto) {
    return this.telegram.sendToUser(req.user.id, dto.text);
  }

  @Post('telegram/webhook')
  telegramWebhook(
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Body() update: TelegramWebhookDto,
  ) {
    const expected = this.config.get<string>('TELEGRAM_WEBHOOK_SECRET');
    if (!expected || secret !== expected) throw new UnauthorizedException();
    return this.telegram.handleUpdate(update);
  }

  @Get('telegram/login')
  async telegramLogin(@Query('token') token: string, @Res() response: Response) {
    try {
      const session = await this.telegram.exchangeLoginToken(token ?? '');
      response.cookie('sysadmin_session', session.token, {
        ...sessionCookieOptions(this.config),
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      const frontend = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
      return response.redirect(`${frontend}/?oauth=success`);
    } catch (error) {
      const frontend = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
      const message = error instanceof Error ? error.message : 'Ошибка входа';
      return response.redirect(`${frontend}/?oauth_error=${encodeURIComponent(message)}`);
    }
  }
}
