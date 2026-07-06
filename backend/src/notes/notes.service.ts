import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { safeJsonParse } from '../common/json.util';
import { EncryptionService } from '../crypto/encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto, MoveNoteDto, UpdateNoteDto } from './dto/note.dto';

@Injectable()
export class NotesService {
  constructor(
    private prisma: PrismaService,
    private crypto: EncryptionService,
  ) {}

  private async assertProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Проект не найден');
    if (project.userId !== userId) throw new ForbiddenException();
    return project;
  }

  private formatNote<
    T extends {
      tags: string;
      content: string;
      attachments?: { id: string; filename: string; path: string; mimeType: string; size: number; createdAt: Date }[];
    },
  >(note: T, userId: string) {
    const decrypted = this.crypto.decryptNote(note, userId);
    return {
      ...decrypted,
      tags: safeJsonParse<string[]>(note.tags, []),
      content: safeJsonParse(note.content, { type: 'doc', content: [] }),
      encrypted: ['password', 'totpSecret', 'sshKey'].some((f) =>
        this.crypto.isEncrypted(note[f as keyof T] as string | null | undefined),
      ),
    };
  }

  private noteData(dto: CreateNoteDto | UpdateNoteDto, userId: string) {
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
    return this.crypto.encryptNoteData(raw, userId);
  }

  async findByProject(userId: string, projectId: string) {
    await this.assertProject(userId, projectId);
    const notes = await this.prisma.note.findMany({
      where: { projectId },
      include: { attachments: true },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    });
    return notes.map((note) => this.formatNote(note, userId));
  }

  async search(userId: string, query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const notes = await this.prisma.note.findMany({
      where: {
        project: { userId },
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
      include: { attachments: true, project: { select: { id: true, name: true, color: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    return notes.map((note) => this.formatNote(note, userId));
  }

  async findOne(userId: string, id: string) {
    const note = await this.prisma.note.findUnique({
      where: { id },
      include: { attachments: true, project: true },
    });
    if (!note) throw new NotFoundException('Заметка не найдена');
    if (note.project.userId !== userId) throw new ForbiddenException();
    return this.formatNote(note, userId);
  }

  async create(userId: string, dto: CreateNoteDto) {
    await this.assertProject(userId, dto.projectId);
    const encrypted = this.crypto.encryptNoteData(
      {
        password: dto.password,
        totpSecret: dto.totpSecret,
        sshKey: dto.sshKey,
      },
      userId,
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
      include: { attachments: true },
    });
    await this.prisma.project.update({
      where: { id: dto.projectId },
      data: { updatedAt: new Date() },
    });
    return this.formatNote(note, userId);
  }

  async update(userId: string, id: string, dto: UpdateNoteDto) {
    const existing = await this.findOne(userId, id);
    const data = this.noteData(dto, userId);
    const note = await this.prisma.note.update({
      where: { id },
      data: Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
      include: { attachments: true },
    });
    await this.prisma.project.update({
      where: { id: existing.projectId as string },
      data: { updatedAt: new Date() },
    });
    return this.formatNote(note, userId);
  }

  async move(userId: string, id: string, dto: MoveNoteDto) {
    const note = await this.findOne(userId, id);
    await this.assertProject(userId, dto.projectId);
    const updated = await this.prisma.note.update({
      where: { id },
      data: { projectId: dto.projectId },
      include: { attachments: true },
    });
    await this.prisma.project.update({
      where: { id: note.projectId as string },
      data: { updatedAt: new Date() },
    });
    await this.prisma.project.update({
      where: { id: dto.projectId },
      data: { updatedAt: new Date() },
    });
    return this.formatNote(updated, userId);
  }

  async remove(userId: string, id: string) {
    const note = await this.findOne(userId, id);
    await this.prisma.note.delete({ where: { id } });
    await this.prisma.project.update({
      where: { id: note.projectId as string },
      data: { updatedAt: new Date() },
    });
    return { ok: true };
  }

  async duplicate(userId: string, id: string) {
    const original = await this.findOne(userId, id);
    const note = await this.prisma.note.create({
      data: {
        title: `${original.title} (копия)`,
        projectId: original.projectId as string,
        type: original.type as string,
        category: original.category as string,
        url: original.url as string | null,
        host: original.host as string | null,
        port: original.port as string | null,
        login: original.login as string | null,
        password: this.crypto.encrypt(original.password as string | null, userId),
        totpSecret: this.crypto.encrypt(original.totpSecret as string | null, userId),
        sshKey: this.crypto.encrypt(original.sshKey as string | null, userId),
        memo: original.memo as string | null,
        tags: JSON.stringify(original.tags),
        content: JSON.stringify(original.content),
        favorite: false,
        pinned: false,
        archived: false,
      },
      include: { attachments: true },
    });
    return this.formatNote(note, userId);
  }
}