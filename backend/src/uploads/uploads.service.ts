import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { basename, isAbsolute, relative, resolve } from 'path';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

@Injectable()
export class UploadsService {
  private uploadDir: string;
  private resolvedUploadDir: string;

  constructor(
    private prisma: PrismaService,
    config: ConfigService,
  ) {
    this.uploadDir = config.get<string>('UPLOAD_DIR') ?? './uploads';
    this.resolvedUploadDir = resolve(this.uploadDir);
    if (!existsSync(this.resolvedUploadDir)) mkdirSync(this.resolvedUploadDir, { recursive: true });
  }

  static isAllowedImage(filename: string, mimetype: string) {
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    return (
      ALLOWED_EXTENSIONS.has(ext) &&
      mimetype.startsWith('image/') &&
      mimetype !== 'image/svg+xml'
    );
  }

  getSafeFilePath(filename: string) {
    const safe = basename(filename);
    if (!safe || safe !== filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new ForbiddenException('Invalid file path');
    }
    const full = resolve(this.resolvedUploadDir, safe);
    const rel = relative(this.resolvedUploadDir, full);
    if (isAbsolute(rel) || rel.startsWith('..')) {
      throw new ForbiddenException('Invalid file path');
    }
    return full;
  }

  async serveByAttachmentId(userId: string, attachmentId: string, res: Response) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { note: { include: { project: true } } },
    });
    if (!attachment) throw new NotFoundException('Вложение не найдено');
    if (attachment.note.project.userId !== userId) throw new ForbiddenException();

    const path = this.getSafeFilePath(attachment.path);
    if (!existsSync(path)) throw new NotFoundException('File not found');
    return res.sendFile(path);
  }

  async saveForNote(
    userId: string,
    noteId: string,
    file: { originalname: string; mimetype: string; size: number; filename: string },
  ) {
    if (!UploadsService.isAllowedImage(file.originalname, file.mimetype)) {
      throw new ForbiddenException('Разрешены только PNG, JPEG, WebP и GIF');
    }

    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: { project: true },
    });
    if (!note) throw new NotFoundException('Заметка не найдена');
    if (note.project.userId !== userId) throw new ForbiddenException();

    return this.prisma.attachment.create({
      data: {
        filename: file.originalname,
        path: basename(file.filename),
        mimeType: file.mimetype,
        size: file.size,
        noteId,
      },
    });
  }

  async serveFile(userId: string, filename: string, res: Response) {
    const path = this.getSafeFilePath(filename);
    if (!existsSync(path)) throw new NotFoundException('File not found');

    const attachment = await this.prisma.attachment.findFirst({
      where: { path: basename(filename) },
      include: { note: { include: { project: true } } },
    });
    if (!attachment || attachment.note.project.userId !== userId) {
      throw new ForbiddenException();
    }

    return res.sendFile(path);
  }

  async remove(userId: string, attachmentId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { note: { include: { project: true } } },
    });
    if (!attachment) throw new NotFoundException('Вложение не найдено');
    if (attachment.note.project.userId !== userId) throw new ForbiddenException();

    await this.prisma.attachment.delete({ where: { id: attachmentId } });

    try {
      unlinkSync(this.getSafeFilePath(attachment.path));
    } catch {
      // file may already be missing
    }

    return { ok: true };
  }
}