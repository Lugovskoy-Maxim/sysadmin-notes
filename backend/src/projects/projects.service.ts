import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { safeJsonParse } from '../common/json.util';
import { EncryptionService } from '../crypto/encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private crypto: EncryptionService,
  ) {}

  findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { notes: true } } },
    });
  }

  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { _count: { select: { notes: true } } },
    });
    if (!project) throw new NotFoundException('Проект не найден');
    if (project.userId !== userId) throw new ForbiddenException();
    return project;
  }

  create(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: { ...dto, userId },
      include: { _count: { select: { notes: true } } },
    });
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    await this.findOne(userId, id);
    return this.prisma.project.update({
      where: { id },
      data: dto,
      include: { _count: { select: { notes: true } } },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.project.delete({ where: { id } });
    return { ok: true };
  }

  async exportProject(userId: string, id: string) {
    await this.findOne(userId, id);
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
        const decrypted = this.crypto.decryptNote(note, userId);
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
    await this.findOne(userId, projectId);
    const created = await this.prisma.$transaction(
      notes.map((note) => {
        const secrets = this.crypto.encryptNoteData(
          { password: note.password, totpSecret: note.totpSecret, sshKey: note.sshKey },
          userId,
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