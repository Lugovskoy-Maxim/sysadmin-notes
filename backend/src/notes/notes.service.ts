import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { safeJsonParse } from '../common/json.util';
import { EncryptionService } from '../crypto/encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService, ProjectRole } from '../projects/project-access.service';
import { CreateNoteDto, MoveNoteDto, UpdateNoteDto } from './dto/note.dto';

@Injectable()
export class NotesService {
  constructor(
    private prisma: PrismaService,
    private crypto: EncryptionService,
    private access: ProjectAccessService,
  ) {}

  private async assertProject(userId: string, projectId: string, minRole: ProjectRole = 'viewer') {
    const { project } = await this.access.assertAccess(userId, projectId, minRole);
    return project;
  }

  private async assertNoteAccess(userId: string, noteId: string, minRole: ProjectRole = 'viewer') {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: { attachments: true, project: true },
    });
    if (!note) throw new NotFoundException('Заметка не найдена');
    await this.access.assertAccess(userId, note.projectId, minRole);
    return note;
  }

  private formatNote<
    T extends {
      tags: string;
      content: string;
      attachments?: { id: string; filename: string; path: string; mimeType: string; size: number; createdAt: Date }[];
    },
  >(note: T, vaultUserId: string) {
    const decrypted = this.crypto.decryptNote(note, vaultUserId);
    return {
      ...decrypted,
      tags: safeJsonParse<string[]>(note.tags, []),
      content: safeJsonParse(note.content, { type: 'doc', content: [] }),
      encrypted: ['password', 'totpSecret', 'sshKey'].some((f) =>
        this.crypto.isEncrypted(note[f as keyof T] as string | null | undefined),
      ),
    };
  }

  private noteData(dto: CreateNoteDto | UpdateNoteDto, vaultUserId: string) {
    const raw = {
      title: dto.title,
      type: dto.type,
      category: dto.category,
      url: dto.url,
      host: dto.host,
      port: dto.port,
      login: dto.login,
      password: dto.password,
      totpSecret: dto.totpSecret,
      sshKey: dto.sshKey,
      memo: dto.memo,
      tags: dto.tags ? JSON.stringify(dto.tags) : undefined,
      content: dto.content,
      favorite: 'favorite' in dto ? dto.favorite : undefined,
      pinned: 'pinned' in dto ? dto.pinned : undefined,
      archived: 'archived' in dto ? dto.archived : undefined,
    };
    return this.crypto.encryptNoteData(raw, vaultUserId);
  }

  async findByProject(userId: string, projectId: string) {
    const project = await this.assertProject(userId, projectId, 'viewer');
    const notes = await this.prisma.note.findMany({
      where: { projectId },
      include: { attachments: true },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    });
    return notes.map((note) => this.formatNote(note, project.userId));
  }

  async search(userId: string, query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const notes = await this.prisma.note.findMany({
      where: {
        project: this.access.projectIdsForUser(userId),
        OR: [
          { title: { contains: q } },
          { category: { contains: q } },
          { url: { contains: q } },
          { host: { contains: q } },
          { login: { contains: q } },
          { tags: { contains: q } },
          { memo: { contains: q } },
        ],
      },
      include: { attachments: true, project: { select: { id: true, name: true, color: true, userId: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    return notes.map((note) => ({
      ...this.formatNote(note, note.project.userId),
      project: { id: note.project.id, name: note.project.name, color: note.project.color },
    }));
  }

  async findOne(userId: string, id: string) {
    const note = await this.assertNoteAccess(userId, id, 'viewer');
    return this.formatNote(note, note.project.userId);
  }

  async create(userId: string, dto: CreateNoteDto) {
    const project = await this.assertProject(userId, dto.projectId, 'editor');
    const encrypted = this.crypto.encryptNoteData(
      {
        password: dto.password,
        totpSecret: dto.totpSecret,
        sshKey: dto.sshKey,
      },
      project.userId,
    );
    const note = await this.prisma.note.create({
      data: {
        title: dto.title,
        projectId: dto.projectId,
        type: dto.type ?? 'instruction',
        category: dto.category ?? 'Общее',
        url: dto.url,
        host: dto.host,
        port: dto.port,
        login: dto.login,
        password: encrypted.password,
        totpSecret: encrypted.totpSecret,
        sshKey: encrypted.sshKey,
        memo: dto.memo,
        tags: JSON.stringify(dto.tags ?? []),
        content: dto.content ?? JSON.stringify({ type: 'doc', content: [] }),
      },
      include: { attachments: true, project: true },
    });
    await this.prisma.project.update({
      where: { id: dto.projectId },
      data: { updatedAt: new Date() },
    });
    return this.formatNote(note, project.userId);
  }

  async update(userId: string, id: string, dto: UpdateNoteDto) {
    const existing = await this.assertNoteAccess(userId, id, 'editor');
    const data = this.noteData(dto, existing.project.userId);
    const note = await this.prisma.note.update({
      where: { id },
      data: Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
      include: { attachments: true, project: true },
    });
    await this.prisma.project.update({
      where: { id: existing.projectId },
      data: { updatedAt: new Date() },
    });
    return this.formatNote(note, existing.project.userId);
  }

  async move(userId: string, id: string, dto: MoveNoteDto) {
    const note = await this.assertNoteAccess(userId, id, 'editor');
    const target = await this.assertProject(userId, dto.projectId, 'editor');
    if (target.userId !== note.project.userId) {
      throw new ForbiddenException('Перенос между проектами разных владельцев пока не поддерживается');
    }
    const updated = await this.prisma.note.update({
      where: { id },
      data: { projectId: dto.projectId },
      include: { attachments: true, project: true },
    });
    await this.prisma.project.update({
      where: { id: note.projectId },
      data: { updatedAt: new Date() },
    });
    await this.prisma.project.update({
      where: { id: dto.projectId },
      data: { updatedAt: new Date() },
    });
    return this.formatNote(updated, target.userId);
  }

  async remove(userId: string, id: string) {
    const note = await this.assertNoteAccess(userId, id, 'editor');
    await this.prisma.note.delete({ where: { id } });
    await this.prisma.project.update({
      where: { id: note.projectId },
      data: { updatedAt: new Date() },
    });
    return { ok: true };
  }

  async duplicate(userId: string, id: string) {
    const original = await this.assertNoteAccess(userId, id, 'editor');
    const vaultUserId = original.project.userId;
    const note = await this.prisma.note.create({
      data: {
        title: `${original.title} (копия)`,
        projectId: original.projectId,
        type: original.type,
        category: original.category,
        url: original.url,
        host: original.host,
        port: original.port,
        login: original.login,
        password: original.password,
        totpSecret: original.totpSecret,
        sshKey: original.sshKey,
        memo: original.memo,
        tags: original.tags,
        content: original.content,
        favorite: false,
        pinned: false,
        archived: false,
      },
      include: { attachments: true, project: true },
    });
    return this.formatNote(note, vaultUserId);
  }
}