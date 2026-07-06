import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { safeJsonParse } from '../common/json.util';
import { EncryptionService } from '../crypto/encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShareDto, ShareMode } from './dto/share.dto';

@Injectable()
export class SharesService {
  constructor(
    private prisma: PrismaService,
    private crypto: EncryptionService,
  ) {}

  private token() {
    return randomBytes(24).toString('hex');
  }

  private resolveMode(dto: CreateShareDto): ShareMode {
    if (dto.shareMode) return dto.shareMode;
    return dto.viewOnly === false ? 'full' : 'masked';
  }

  private maskSecrets<T extends {
    password?: string | null;
    totpSecret?: string | null;
    sshKey?: string | null;
  }>(note: T, mask: boolean) {
    if (!mask) return note;
    return {
      ...note,
      password: note.password ? '••••••••' : note.password,
      totpSecret: note.totpSecret ? '••••••••' : note.totpSecret,
      sshKey: note.sshKey ? '[скрыто]' : note.sshKey,
    };
  }

  private formatSharedNote(
    note: {
      tags: string;
      content: string;
      password?: string | null;
      totpSecret?: string | null;
      sshKey?: string | null;
      type: string;
      [key: string]: unknown;
    },
    ownerId: string,
    mask: boolean,
  ) {
    const decrypted = this.crypto.decryptNote(note, ownerId);
    const attachments = Array.isArray(note.attachments)
      ? note.attachments.map((att: { id: string; filename: string; mimeType: string; size: number; createdAt: Date }) => ({
          id: att.id,
          filename: att.filename,
          mimeType: att.mimeType,
          size: att.size,
          createdAt: att.createdAt,
        }))
      : undefined;

    const parsed = {
      ...decrypted,
      tags: safeJsonParse<string[]>(note.tags, []),
      content: safeJsonParse(note.content, { type: 'doc', content: [] }),
      ...(attachments ? { attachments } : {}),
    };
    return this.maskSecrets(parsed, mask);
  }

  async create(userId: string, dto: CreateShareDto) {
    if (!dto.noteId && !dto.projectId) {
      throw new NotFoundException('Укажите noteId или projectId');
    }

    const shareMode = this.resolveMode(dto);

    if (shareMode === 'passwords' && !dto.projectId) {
      throw new ForbiddenException('Режим «только пароли» доступен для проекта');
    }

    if (dto.noteId) {
      const note = await this.prisma.note.findUnique({
        where: { id: dto.noteId },
        include: { project: true },
      });
      if (!note) throw new NotFoundException('Заметка не найдена');
      if (note.project.userId !== userId) throw new ForbiddenException();
    }

    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
      if (!project) throw new NotFoundException('Проект не найден');
      if (project.userId !== userId) throw new ForbiddenException();
    }

    const passwordHash = dto.sharePassword
      ? await bcrypt.hash(dto.sharePassword, 12)
      : null;

    return this.prisma.shareLink.create({
      data: {
        token: this.token(),
        title: dto.title,
        noteId: dto.noteId,
        projectId: dto.projectId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        viewOnly: shareMode === 'masked',
        shareMode,
        passwordHash,
        userId,
      },
    });
  }

  findMine(userId: string) {
    return this.prisma.shareLink.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: string, id: string) {
    const share = await this.prisma.shareLink.findUnique({ where: { id } });
    if (!share) throw new NotFoundException();
    if (share.userId !== userId) throw new ForbiddenException();
    await this.prisma.shareLink.delete({ where: { id } });
    return { ok: true };
  }

  async checkAccess(share: { passwordHash: string | null }, password?: string) {
    if (!share.passwordHash) return;
    if (!password) {
      throw new UnauthorizedException({ requiresPassword: true, message: 'Требуется пароль ссылки' });
    }
    const ok = await bcrypt.compare(password, share.passwordHash);
    if (!ok) throw new UnauthorizedException('Неверный пароль ссылки');
  }

  async getPublic(token: string, password?: string) {
    const share = await this.prisma.shareLink.findUnique({ where: { token } });
    if (!share) throw new NotFoundException('Ссылка не найдена');
    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new NotFoundException('Ссылка истекла');
    }

    await this.checkAccess(share, password);

    const mask = share.shareMode === 'masked';
    const meta = {
      viewOnly: mask,
      shareMode: share.shareMode as ShareMode,
      title: share.title,
      createdAt: share.createdAt,
      passwordProtected: Boolean(share.passwordHash),
    };

    if (share.noteId) {
      const note = await this.prisma.note.findUnique({
        where: { id: share.noteId },
        include: { attachments: true, project: { select: { name: true, color: true } } },
      });
      if (!note) throw new NotFoundException();
      return {
        type: 'note' as const,
        share: meta,
        note: this.formatSharedNote(note, share.userId, mask),
      };
    }

    if (share.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: share.projectId },
        include: {
          notes: {
            where: { archived: false },
            orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
          },
        },
      });
      if (!project) throw new NotFoundException();

      let notes = project.notes;
      if (share.shareMode === 'passwords') {
        notes = notes.filter((n) => n.type === 'credential');
      }

      return {
        type: 'project' as const,
        share: meta,
        project: {
          ...project,
          notes: notes.map((note) => this.formatSharedNote(note, share.userId, mask)),
        },
      };
    }

    throw new NotFoundException();
  }
}