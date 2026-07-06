import { Allow, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendEmailDto {
  @IsOptional()
  @IsEmail()
  to?: string;

  @IsString()
  @MaxLength(200)
  subject: string;

  @IsString()
  @MaxLength(20_000)
  text: string;
}

export class SendTelegramDto {
  @IsString()
  @MaxLength(4000)
  text: string;
}

export class TelegramWebhookDto {
  @Allow()
  update_id?: number;

  @Allow()
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number; type: string };
    from?: { id: number; username?: string; first_name?: string; last_name?: string };
  };
}
