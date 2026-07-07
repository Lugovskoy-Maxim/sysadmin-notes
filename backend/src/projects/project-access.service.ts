import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ProjectRole = 'owner' | 'editor' | 'viewer';

const roleRank: Record<ProjectRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

@Injectable()
export class ProjectAccessService {
  constructor(private prisma: PrismaService) {}

  async getAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!project) throw new NotFoundException('Проект не найден');

    if (project.userId === userId) {
      return { project, role: 'owner' as ProjectRole };
    }

    const member = project.members.find((item) => item.userId === userId);
    if (!member) throw new ForbiddenException('Нет доступа к проекту');

    return { project, role: member.role as ProjectRole };
  }

  async assertAccess(userId: string, projectId: string, minRole: ProjectRole = 'viewer') {
    const access = await this.getAccess(userId, projectId);
    if (roleRank[access.role] < roleRank[minRole]) {
      throw new ForbiddenException('Недостаточно прав для этого действия');
    }
    return access;
  }

  async assertOwner(userId: string, projectId: string) {
    return this.assertAccess(userId, projectId, 'owner');
  }

  projectIdsForUser(userId: string) {
    return {
      OR: [{ userId }, { members: { some: { userId } } }],
    };
  }
}