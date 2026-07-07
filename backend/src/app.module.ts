import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { NotesModule } from './notes/notes.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { SharesModule } from './shares/shares.module';
import { UploadsModule } from './uploads/uploads.module';
import { CryptoModule } from './crypto/crypto.module';
import { TasksModule } from './tasks/tasks.module';
import { HealthController } from './health.controller';
import { IntegrationsModule } from './integrations/integrations.module';
import { FacilityModule } from './facility/facility.module';
import { BillingModule } from './billing/billing.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 1000),
      },
      { name: 'auth', ttl: 60_000, limit: 15 },
      { name: 'share', ttl: 60_000, limit: 20 },
    ]),
    CryptoModule,
    PrismaModule,
    AuthModule,
    ProjectsModule,
    NotesModule,
    TasksModule,
    SharesModule,
    UploadsModule,
    IntegrationsModule,
    FacilityModule,
    BillingModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
