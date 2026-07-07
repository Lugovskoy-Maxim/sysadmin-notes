import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminService } from '../admin/admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private admin: AdminService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email уже зарегистрирован');

    const hash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hash,
        projects: {
          create: {
            name: 'Мой проект',
            description: 'Основной проект для заметок',
            color: '#087f72',
            icon: 'server',
            notes: {
              create: {
                title: 'Добро пожаловать',
                type: 'instruction',
                category: 'Старт',
                tags: JSON.stringify(['welcome', 'start']),
                content: JSON.stringify({
                  type: 'doc',
                  content: [
                    {
                      type: 'heading',
                      attrs: { level: 2 },
                      content: [{ type: 'text', text: 'Добро пожаловать в Sysadmin Notes' }],
                    },
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: 'Здесь можно хранить доступы, инструкции, ссылки и таблицы для инфраструктуры.',
                        },
                      ],
                    },
                  ],
                }),
              },
            },
          },
        },
      },
      select: publicUserSelect,
    });

    await this.prisma.subscription.create({
      data: { userId: user.id, plan: 'free', status: 'active' },
    });
    await this.admin.assignFirstAdminIfNeeded(user.id);
    const fresh = await this.prisma.user.findUnique({ where: { id: user.id }, select: publicUserSelect });

    return { user: fresh!, token: this.createToken(user.id, user.email) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.password) throw new UnauthorizedException('Неверный email или пароль');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Неверный email или пароль');
    if (user.status !== 'active') throw new ForbiddenException('Аккаунт заблокирован администратором');

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
      token: this.createToken(user.id, user.email),
    };
  }

  async me(userId: string) {
    await this.admin.assertActiveUser(userId);
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: { name?: string; password?: string } = {};
    if (dto.name) data.name = dto.name;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: publicUserSelect,
    });
  }

  createToken(id: string, email: string) {
    return this.jwt.sign({ sub: id, email });
  }

  verifyToken(token: string) {
    return this.jwt.verify<{ sub: string; email: string }>(token);
  }

  async identities(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        password: true,
        identities: {
          orderBy: { lastLoginAt: 'desc' },
          select: {
            id: true,
            provider: true,
            email: true,
            displayName: true,
            avatarUrl: true,
            createdAt: true,
            lastLoginAt: true,
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException();
    return { hasPassword: Boolean(user.password), identities: user.identities };
  }

  async unlinkIdentity(userId: string, identityId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, identities: { select: { id: true } } },
    });
    const identity = user?.identities.find((item) => item.id === identityId);
    if (!user || !identity) throw new BadRequestException('Способ входа не найден');
    if (!user.password && user.identities.length <= 1) {
      throw new BadRequestException('Сначала задайте пароль или подключите другой способ входа');
    }
    await this.prisma.authIdentity.delete({ where: { id: identityId } });
    return { ok: true };
  }
}
