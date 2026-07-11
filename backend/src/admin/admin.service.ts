import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { BillingService } from '../billing/billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserAdminDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private billing: BillingService,
    private config: ConfigService,
  ) {}

  async assignFirstAdminIfNeeded(userId: string) {
    const adminCount = await this.prisma.user.count({ where: { role: 'admin' } });
    if (adminCount > 0) return;
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'admin' },
    });
  }

  async assertActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (!user || user.status !== 'active') {
      throw new ForbiddenException('Аккаунт заблокирован администратором');
    }
  }

  async claimAdmin(userId: string, secret: string) {
    const expected = this.config.get<string>('ADMIN_PROMOTION_SECRET');
    if (!expected?.trim()) {
      throw new BadRequestException('Получение прав администратора не настроено на сервере');
    }
    if (!this.secretsMatch(secret.trim(), expected.trim())) {
      throw new ForbiddenException('Неверный пароль администратора');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'admin' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return { ...user, createdAt: user.createdAt.toISOString() };
  }

  private secretsMatch(input: string, expected: string) {
    const a = Buffer.from(input);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            currentPeriodEnd: true,
          },
        },
        _count: { select: { projects: true, projectMembers: true } },
      },
    });
    return users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      subscription: user.subscription
        ? {
            plan: user.subscription.plan,
            status: user.subscription.status,
            currentPeriodEnd: user.subscription.currentPeriodEnd?.toISOString() ?? null,
          }
        : { plan: 'free', status: 'active', currentPeriodEnd: null },
    }));
  }

  async updateUser(actorId: string, targetId: string, dto: UpdateUserAdminDto) {
    const target = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException('Пользователь не найден');

    if (dto.role === 'user' && target.role === 'admin') {
      const admins = await this.prisma.user.count({ where: { role: 'admin', status: 'active' } });
      if (admins <= 1) {
        throw new BadRequestException('Нельзя снять права у последнего администратора');
      }
    }

    if (dto.status === 'suspended' && targetId === actorId) {
      throw new BadRequestException('Нельзя заблокировать свой аккаунт');
    }

    if (dto.status === 'suspended' && target.role === 'admin') {
      const activeAdmins = await this.prisma.user.count({
        where: { role: 'admin', status: 'active', NOT: { id: targetId } },
      });
      if (activeAdmins < 1) {
        throw new BadRequestException('Нельзя заблокировать последнего активного администратора');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: {
        role: dto.role,
        status: dto.status,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            currentPeriodEnd: true,
          },
        },
        _count: { select: { projects: true, projectMembers: true } },
      },
    });

    if (dto.plan || dto.subscriptionStatus || dto.currentPeriodEnd !== undefined) {
      await this.billing.setSubscriptionForUser(targetId, {
        plan: dto.plan ?? (updated.subscription?.plan as 'free' | 'pro' | 'team') ?? 'free',
        status: dto.subscriptionStatus,
        currentPeriodEnd: dto.currentPeriodEnd,
      });
    }

    const fresh = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            currentPeriodEnd: true,
          },
        },
        _count: { select: { projects: true, projectMembers: true } },
      },
    });

    if (!fresh) throw new NotFoundException('Пользователь не найден');

    return {
      ...fresh,
      createdAt: fresh.createdAt.toISOString(),
      subscription: fresh.subscription
        ? {
            plan: fresh.subscription.plan,
            status: fresh.subscription.status,
            currentPeriodEnd: fresh.subscription.currentPeriodEnd?.toISOString() ?? null,
          }
        : { plan: 'free', status: 'active', currentPeriodEnd: null },
    };
  }
}