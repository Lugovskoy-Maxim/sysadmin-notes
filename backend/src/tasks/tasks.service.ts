import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private async assertProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Проект не найден');
    if (project.userId !== userId) throw new ForbiddenException();
    return project;
  }

  private formatTask<
    T extends {
      dueDate: Date | null;
      createdAt: Date;
      updatedAt: Date;
      timeEntries?: { duration: number | null }[];
    },
  >(task: T) {
    const trackedSeconds = (task.timeEntries ?? []).reduce((sum, entry) => sum + (entry.duration ?? 0), 0);
    return {
      ...task,
      dueDate: task.dueDate?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      trackedSeconds,
    };
  }

  async findByProject(userId: string, projectId: string) {
    await this.assertProject(userId, projectId);
    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      include: { timeEntries: { select: { duration: true } } },
      orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
    return tasks.map((task) => this.formatTask(task));
  }

  async findOne(userId: string, id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        timeEntries: { orderBy: { startedAt: 'desc' } },
        project: { select: { id: true, name: true, color: true, userId: true } },
      },
    });
    if (!task) throw new NotFoundException('Задача не найдена');
    if (task.project.userId !== userId) throw new ForbiddenException();
    const trackedSeconds = task.timeEntries.reduce((sum, entry) => sum + (entry.duration ?? 0), 0);
    return {
      ...task,
      dueDate: task.dueDate?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      trackedSeconds,
      timeEntries: task.timeEntries.map((entry) => ({
        ...entry,
        startedAt: entry.startedAt.toISOString(),
        endedAt: entry.endedAt?.toISOString() ?? null,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  }

  async create(userId: string, dto: CreateTaskDto) {
    await this.assertProject(userId, dto.projectId);
    const maxOrder = await this.prisma.task.aggregate({
      where: { projectId: dto.projectId, status: dto.status ?? 'todo' },
      _max: { sortOrder: true },
    });
    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        projectId: dto.projectId,
        description: dto.description,
        status: dto.status ?? 'todo',
        priority: dto.priority ?? 'medium',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        estimatedMinutes: dto.estimatedMinutes,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      include: { timeEntries: { select: { duration: true } } },
    });
    return this.formatTask(task);
  }

  async update(userId: string, id: string, dto: UpdateTaskDto) {
    const existing = await this.findOne(userId, id);
    const task = await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        dueDate: dto.dueDate === null ? null : dto.dueDate ? new Date(dto.dueDate) : undefined,
        estimatedMinutes: dto.estimatedMinutes === null ? null : dto.estimatedMinutes,
        sortOrder: dto.sortOrder,
        updatedAt: dto.status && dto.status !== existing.status ? new Date() : undefined,
      },
      include: { timeEntries: { select: { duration: true } } },
    });
    return this.formatTask(task);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.task.delete({ where: { id } });
    return { ok: true };
  }
}