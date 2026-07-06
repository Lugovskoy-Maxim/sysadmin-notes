import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CryptoModule } from '../crypto/crypto.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from './email.service';
import { IntegrationsController } from './integrations.controller';
import { TelegramService } from './telegram.service';

@Module({
  imports: [AuthModule, CryptoModule, PrismaModule],
  controllers: [IntegrationsController],
  providers: [EmailService, TelegramService],
})
export class IntegrationsModule {}
