import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../projects/project-access.service';
import { CreateTaskDto, ReorderTasksDto, UpdateTaskDto } from './dto/task.dto';

const userSelect = { id: true, name: true, email: true } as const;

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private access: ProjectAccessService,
  ) {}

  private formatTask<
    T extends {
      dueDate: Date | null;
      createdAt: Date;
      updatedAt: Date;
      timeEntries?: { duration: number | null }[];
      assignee?: { id: string; name: string; email: string } | null;
      createdBy?: { id: string; name: string; email: string } | null;
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
    await this.access.assertAccess(userId, projectId, 'viewer');
    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      include: {
        timeEntries: { select: { duration: true } },
        assignee: { select: userSelect },
        createdBy: { select: userSelect },
      },
      orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
    return tasks.map((task) => this.formatTask(task));
  }

  async findOne(userId: string, id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        timeEntries: { orderBy: { startedAt: 'desc' } },
        assignee: { select: userSelect },
        createdBy: { select: userSelect },
        project: { select: { id: true, name: true, color: true, userId: true } },
      },
    });
    if (!task) throw new NotFoundException('Задача не найдена');
    await this.access.assertAccess(userId, task.projectId, 'viewer');
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
    await this.access.assertAccess(userId, dto.projectId, 'editor');
    const maxOrder = await this.prisma.task.aggregate({
      where: { projectId: dto.projectId, status: dto.status ?? 'todo' },
      _max: { sortOrder: true },
    });

    if (dto.assigneeId) {
      await this.assertAssignee(dto.projectId, dto.assigneeId);
    }

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        projectId: dto.projectId,
        description: dto.description,
        status: dto.status ?? 'todo',
        priority: dto.priority ?? 'medium',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        estimatedMinutes: dto.estimatedMinutes,
        assigneeId: dto.assigneeId,
        createdById: userId,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      include: {
        timeEntries: { select: { duration: true } },
        assignee: { select: userSelect },
        createdBy: { select: userSelect },
      },
    });
    return this.formatTask(task);
  }

  async update(userId: string, id: string, dto: UpdateTaskDto) {
    const existing = await this.findOne(userId, id);
    await this.access.assertAccess(userId, existing.projectId, 'editor');

    if (dto.assigneeId) {
      await this.assertAssignee(existing.projectId, dto.assigneeId);
    }

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
        assigneeId: dto.assigneeId === null ? null : dto.assigneeId,
        updatedAt: dto.status && dto.status !== existing.status ? new Date() : undefined,
      },
      include: {
        timeEntries: { select: { duration: true } },
        assignee: { select: userSelect },
        createdBy: { select: userSelect },
      },
    });
    return this.formatTask(task);
  }

  async reorder(userId: string, dto: ReorderTasksDto) {
    await this.access.assertAccess(userId, dto.projectId, 'editor');
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.task.update({
          where: { id: item.id },
          data: { status: item.status, sortOrder: item.sortOrder },
        }),
      ),
    );
    return this.findByProject(userId, dto.projectId);
  }

  async remove(userId: string, id: string) {
    const existing = await this.findOne(userId, id);
    await this.access.assertAccess(userId, existing.projectId, 'editor');
    await this.prisma.task.delete({ where: { id } });
    return { ok: true };
  }

  private async assertAssignee(projectId: string, assigneeId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });
    if (!project) throw new NotFoundException('Проект не найден');
    const allowed =
      project.userId === assigneeId || project.members.some((member) => member.userId === assigneeId);
    if (!allowed) throw new NotFoundException('Исполнитель не является участником проекта');
  }
}