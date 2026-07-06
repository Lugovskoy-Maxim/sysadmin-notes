import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter?: Transporter;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const password = this.config.get<string>('SMTP_PASSWORD');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.config.get<string>('SMTP_PORT') ?? 587),
        secure: this.config.get<string>('SMTP_SECURE') === 'true',
        auth: user ? { user, pass: password } : undefined,
      });
    }
  }

  status() {
    return {
      enabled: Boolean(this.transporter),
      from: this.config.get<string>('SMTP_FROM') ?? this.config.get<string>('SMTP_USER') ?? null,
    };
  }

  async send(to: string, subject: string, text: string) {
    if (!this.transporter) throw new BadRequestException('SMTP не настроен');
    const from = this.config.get<string>('SMTP_FROM') ?? this.config.get<string>('SMTP_USER');
    if (!from) throw new BadRequestException('SMTP_FROM или SMTP_USER не настроен');
    const result = await this.transporter.sendMail({ from, to, subject, text });
    return { ok: true, messageId: result.messageId };
  }
}
