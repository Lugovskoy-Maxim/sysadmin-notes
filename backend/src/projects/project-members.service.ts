import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from './project-access.service';

@Injectable()
export class ProjectMembersService {
  constructor(
    private prisma: PrismaService,
    private access: ProjectAccessService,
  ) {}

  async list(userId: string, projectId: string) {
    const { project } = await this.access.assertAccess(userId, projectId, 'viewer');
    return [
      {
        id: `owner-${project.user.id}`,
        userId: project.user.id,
        role: 'owner',
        user: project.user,
        createdAt: project.createdAt.toISOString(),
      },
      ...project.members.map((member) => ({
        id: member.id,
        userId: member.userId,
        role: member.role,
        user: member.user,
        createdAt: member.createdAt.toISOString(),
      })),
    ];
  }

  async invite(userId: string, projectId: string, email: string, role: 'editor' | 'viewer' = 'editor') {
    await this.access.assertOwner(userId, projectId);
    const normalized = email.trim().toLowerCase();
    if (!normalized) throw new BadRequestException('Укажите email');

    const invited = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (!invited) throw new NotFoundException('Пользователь с таким email не зарегистрирован');
    if (invited.id === userId) throw new BadRequestException('Нельзя пригласить себя');

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Проект не найден');
    if (project.userId === invited.id) throw new BadRequestException('Владелец уже в проекте');

    const member = await this.prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: invited.id } },
      create: { projectId, userId: invited.id, role },
      update: { role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return {
      id: member.id,
      userId: member.userId,
      role: member.role,
      user: member.user,
      createdAt: member.createdAt.toISOString(),
    };
  }

  async updateRole(userId: string, projectId: string, memberUserId: string, role: 'editor' | 'viewer') {
    await this.access.assertOwner(userId, projectId);
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberUserId } },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!member) throw new NotFoundException('Участник не найден');

    const updated = await this.prisma.projectMember.update({
      where: { id: member.id },
      data: { role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      role: updated.role,
      user: updated.user,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async remove(userId: string, projectId: string, memberUserId: string) {
    await this.access.assertOwner(userId, projectId);
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberUserId } },
    });
    if (!member) throw new NotFoundException('Участник не найден');
    await this.prisma.projectMember.delete({ where: { id: member.id } });
    return { ok: true };
  }
}