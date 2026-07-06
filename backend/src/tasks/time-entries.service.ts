import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeEntryDto, StartTimerDto, UpdateTimeEntryDto } from './dto/time-entry.dto';

@Injectable()
export class TimeEntriesService {
  constructor(private prisma: PrismaService) {}

  private async assertProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Проект не найден');
    if (project.userId !== userId) throw new ForbiddenException();
    return project;
  }

  private formatEntry<
    T extends {
      startedAt: Date;
      endedAt: Date | null;
      createdAt: Date;
      task?: { id: string; title: string } | null;
    },
  >(entry: T) {
    return {
      ...entry,
      startedAt: entry.startedAt.toISOString(),
      endedAt: entry.endedAt?.toISOString() ?? null,
      createdAt: entry.createdAt.toISOString(),
    };
  }

  async findByProject(userId: string, projectId: string, from?: string, to?: string) {
    await this.assertProject(userId, projectId);
    const startedAt: { gte?: Date; lte?: Date } = {};
    if (from) startedAt.gte = new Date(from);
    if (to) startedAt.lte = new Date(to);

    const entries = await this.prisma.timeEntry.findMany({
      where: {
        projectId,
        userId,
        ...(from || to ? { startedAt } : {}),
      },
      include: { task: { select: { id: true, title: true } } },
      orderBy: { startedAt: 'desc' },
      take: 200,
    });
    return entries.map((entry) => this.formatEntry(entry));
  }

  async getActive(userId: string) {
    const entry = await this.prisma.timeEntry.findFirst({
      where: { userId, endedAt: null },
      include: {
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: { startedAt: 'desc' },
    });
    return entry ? this.formatEntry(entry) : null;
  }

  async getSummary(userId: string, projectId?: string, period: 'today' | 'week' = 'today') {
    const now = new Date();
    const start = new Date(now);
    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    }

    const entries = await this.prisma.timeEntry.findMany({
      where: {
        userId,
        endedAt: { not: null },
        startedAt: { gte: start },
        ...(projectId ? { projectId } : {}),
      },
      select: { duration: true, projectId: true },
    });

    const totalSeconds = entries.reduce((sum, e) => sum + (e.duration ?? 0), 0);
    const byProject: Record<string, number> = {};
    for (const entry of entries) {
      byProject[entry.projectId] = (byProject[entry.projectId] ?? 0) + (entry.duration ?? 0);
    }

    return { period, totalSeconds, byProject, entriesCount: entries.length };
  }

  async start(userId: string, dto: StartTimerDto) {
    await this.assertProject(userId, dto.projectId);

    if (dto.taskId) {
      const task = await this.prisma.task.findUnique({ where: { id: dto.taskId } });
      if (!task || task.projectId !== dto.projectId) throw new NotFoundException('Задача не найдена');
    }

    const entry = await this.prisma.$transaction(async (tx) => {
      const active = await tx.timeEntry.findFirst({
        where: { userId, endedAt: null },
      });
      if (active) throw new BadRequestException('Уже запущен таймер. Остановите его перед запуском нового.');

      const created = await tx.timeEntry.create({
        data: {
          userId,
          projectId: dto.projectId,
          taskId: dto.taskId,
          memo: dto.memo,
          startedAt: new Date(),
        },
        include: {
          task: { select: { id: true, title: true } },
          project: { select: { id: true, name: true, color: true } },
        },
      });

      if (dto.taskId) {
        await tx.task.update({
          where: { id: dto.taskId },
          data: { status: 'in_progress' },
        });
      }

      return created;
    });

    return this.formatEntry(entry);
  }

  async stop(userId: string, id: string) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Запись не найдена');
    if (entry.userId !== userId) throw new ForbiddenException();
    if (entry.endedAt) throw new BadRequestException('Таймер уже остановлен');

    const endedAt = new Date();
    const duration = Math.max(1, Math.round((endedAt.getTime() - entry.startedAt.getTime()) / 1000));

    const updated = await this.prisma.timeEntry.update({
      where: { id },
      data: { endedAt, duration },
      include: {
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    });
    return this.formatEntry(updated);
  }

  async createManual(userId: string, dto: CreateTimeEntryDto) {
    await this.assertProject(userId, dto.projectId);

    if (dto.taskId) {
      const task = await this.prisma.task.findUnique({ where: { id: dto.taskId } });
      if (!task || task.projectId !== dto.projectId) throw new NotFoundException('Задача не найдена');
    }

    const startedAt = new Date(dto.startedAt);
    const endedAt = new Date(dto.endedAt);
    if (endedAt <= startedAt) throw new BadRequestException('Время окончания должно быть позже начала');

    const entry = await this.prisma.timeEntry.create({
      data: {
        userId,
        projectId: dto.projectId,
        taskId: dto.taskId,
        memo: dto.memo,
        startedAt,
        endedAt,
        duration: Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
      },
      include: { task: { select: { id: true, title: true } } },
    });
    return this.formatEntry(entry);
  }

  async update(userId: string, id: string, dto: UpdateTimeEntryDto) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Запись не найдена');
    if (entry.userId !== userId) throw new ForbiddenException();

    const startedAt = dto.startedAt ? new Date(dto.startedAt) : entry.startedAt;
    const endedAt = dto.endedAt ? new Date(dto.endedAt) : entry.endedAt;
    let duration = dto.duration ?? entry.duration;
    if (endedAt && startedAt) {
      duration = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);
    }

    const updated = await this.prisma.timeEntry.update({
      where: { id },
      data: { memo: dto.memo, startedAt, endedAt, duration },
      include: { task: { select: { id: true, title: true } } },
    });
    return this.formatEntry(updated);
  }

  async remove(userId: string, id: string) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Запись не найдена');
    if (entry.userId !== userId) throw new ForbiddenException();
    await this.prisma.timeEntry.delete({ where: { id } });
    return { ok: true };
  }
}