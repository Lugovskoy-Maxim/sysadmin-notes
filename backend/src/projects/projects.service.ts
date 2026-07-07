import { Injectable, NotFoundException } from '@nestjs/common';
import { safeJsonParse } from '../common/json.util';
import { BillingService } from '../billing/billing.service';
import { EncryptionService } from '../crypto/encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectAccessService } from './project-access.service';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private crypto: EncryptionService,
    private access: ProjectAccessService,
    private billing: BillingService,
  ) {}

  async findAll(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: this.access.projectIdsForUser(userId),
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { notes: true, tasks: true, members: true } },
        user: { select: { id: true, name: true, email: true } },
        members: { where: { userId }, select: { role: true } },
      },
    });

    return Promise.all(
      projects.map(async (project) => {
        const role = project.userId === userId ? 'owner' : (project.members[0]?.role as 'editor' | 'viewer');
        const ownerPlan = await this.billing.getProjectOwnerPlan(project.id);
        const { members: _members, ...rest } = project;
        return {
          ...rest,
          role,
          capabilities: this.billing.projectCapabilities(ownerPlan, role ?? 'viewer'),
        };
      }),
    );
  }

  async findOne(userId: string, id: string) {
    const { project, role } = await this.access.assertAccess(userId, id, 'viewer');
    const counts = await this.prisma.project.findUnique({
      where: { id },
      include: { _count: { select: { notes: true, tasks: true, members: true } } },
    });
    const ownerPlan = await this.billing.getProjectOwnerPlan(id);
    return {
      ...project,
      _count: counts?._count,
      role,
      capabilities: this.billing.projectCapabilities(ownerPlan, role),
    };
  }

  async create(userId: string, dto: CreateProjectDto) {
    await this.billing.assertCanCreateProject(userId);
    return this.prisma.project.create({
      data: { ...dto, userId },
      include: { _count: { select: { notes: true } } },
    });
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    await this.access.assertAccess(userId, id, 'editor');
    return this.prisma.project.update({
      where: { id },
      data: dto,
      include: { _count: { select: { notes: true } } },
    });
  }

  async remove(userId: string, id: string) {
    await this.access.assertOwner(userId, id);
    await this.prisma.project.delete({ where: { id } });
    return { ok: true };
  }

  async exportProject(userId: string, id: string) {
    await this.access.assertAccess(userId, id, 'editor');
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        notes: { include: { attachments: true }, orderBy: { updatedAt: 'desc' } },
      },
    });
    if (!project) throw new NotFoundException();
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      project: {
        name: project.name,
        description: project.description,
        color: project.color,
        icon: project.icon,
      },
      notes: project.notes.map((note) => {
        const decrypted = this.crypto.decryptNote(note, project.userId);
        return {
          title: note.title,
          type: note.type,
          category: note.category,
          url: note.url,
          host: note.host,
          port: note.port,
          login: note.login,
          password: decrypted.password,
          totpSecret: decrypted.totpSecret,
          sshKey: decrypted.sshKey,
          memo: note.memo,
          tags: safeJsonParse<string[]>(note.tags, []),
          content: safeJsonParse(note.content, { type: 'doc', content: [] }),
          favorite: note.favorite,
          pinned: note.pinned,
          archived: note.archived,
        };
      }),
    };
  }

  async importNotes(userId: string, projectId: string, notes: {
    title: string;
    type?: string;
    category?: string;
    url?: string;
    host?: string;
    port?: string;
    login?: string;
    password?: string;
    totpSecret?: string;
    sshKey?: string;
    memo?: string;
    tags?: string[];
    content?: Record<string, unknown>;
    favorite?: boolean;
    pinned?: boolean;
    archived?: boolean;
  }[]) {
    await this.access.assertAccess(userId, projectId, 'editor');
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
    if (!project) throw new NotFoundException();
    const created = await this.prisma.$transaction(
      notes.map((note) => {
        const secrets = this.crypto.encryptNoteData(
          { password: note.password, totpSecret: note.totpSecret, sshKey: note.sshKey },
          project.userId,
        );
        return this.prisma.note.create({
          data: {
            title: note.title || 'Импортированная заметка',
            projectId,
            type: note.type ?? 'instruction',
            category: note.category ?? 'Импорт',
            url: note.url,
            host: note.host,
            port: note.port,
            login: note.login,
            password: secrets.password,
            totpSecret: secrets.totpSecret,
            sshKey: secrets.sshKey,
            memo: note.memo,
            tags: JSON.stringify(note.tags ?? []),
            content: JSON.stringify(note.content ?? { type: 'doc', content: [] }),
            favorite: note.favorite ?? false,
            pinned: note.pinned ?? false,
            archived: note.archived ?? false,
          },
        });
      }),
    );
    await this.prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
    return { imported: created.length };
  }
}