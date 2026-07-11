import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../projects/project-access.service';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dto/calendar.dto';

type Recurrence = 'none' | 'monthly' | 'yearly';

type CalendarEventRecord = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  dueDate: Date;
  amount: number | null;
  currency: string | null;
  recurrence: string;
  category: string;
  remindDays: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CalendarOccurrence = {
  eventId: string;
  title: string;
  description: string | null;
  dueDate: string;
  amount: number | null;
  currency: string | null;
  recurrence: Recurrence;
  category: string;
  remindDays: number[];
  isRecurringInstance: boolean;
};

@Injectable()
export class CalendarService {
  constructor(
    private prisma: PrismaService,
    private access: ProjectAccessService,
  ) {}

  private parseRemindDays(value: string): number[] {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) return [1, 7];
      return parsed.filter((item): item is number => typeof item === 'number' && item >= 0);
    } catch {
      return [1, 7];
    }
  }

  private formatEvent<T extends CalendarEventRecord>(event: T) {
    return {
      ...event,
      dueDate: event.dueDate.toISOString(),
      remindDays: this.parseRemindDays(event.remindDays),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }

  private addMonths(date: Date, months: number) {
    const next = new Date(date);
    const day = next.getDate();
    next.setMonth(next.getMonth() + months);
    if (next.getDate() < day) next.setDate(0);
    return next;
  }

  private addYears(date: Date, years: number) {
    const next = new Date(date);
    next.setFullYear(next.getFullYear() + years);
    return next;
  }

  private expandOccurrences(event: CalendarEventRecord, from: Date, to: Date): CalendarOccurrence[] {
    const recurrence = (event.recurrence as Recurrence) || 'none';
    const remindDays = this.parseRemindDays(event.remindDays);
    const base = {
      eventId: event.id,
      title: event.title,
      description: event.description,
      amount: event.amount,
      currency: event.currency,
      recurrence,
      category: event.category,
      remindDays,
    };

    if (recurrence === 'none') {
      if (event.dueDate < from || event.dueDate > to) return [];
      return [
        {
          ...base,
          dueDate: event.dueDate.toISOString(),
          isRecurringInstance: false,
        },
      ];
    }

    const occurrences: CalendarOccurrence[] = [];
    let cursor = new Date(event.dueDate);
    const guard = 240;
    let steps = 0;

    while (cursor < from && steps < guard) {
      cursor = recurrence === 'monthly' ? this.addMonths(cursor, 1) : this.addYears(cursor, 1);
      steps += 1;
    }

    while (cursor <= to && steps < guard) {
      if (cursor >= from) {
        occurrences.push({
          ...base,
          dueDate: cursor.toISOString(),
          isRecurringInstance: cursor.getTime() !== event.dueDate.getTime(),
        });
      }
      cursor = recurrence === 'monthly' ? this.addMonths(cursor, 1) : this.addYears(cursor, 1);
      steps += 1;
    }

    return occurrences;
  }

  async list(userId: string, projectId: string, from?: string, to?: string) {
    await this.access.assertAccess(userId, projectId, 'viewer');
    const events = await this.prisma.calendarEvent.findMany({
      where: { projectId },
      orderBy: [{ dueDate: 'asc' }, { title: 'asc' }],
    });
    if (!from || !to) {
      return events.map((event) => this.formatEvent(event));
    }
    const rangeFrom = new Date(from);
    const rangeTo = new Date(to);
    return events
      .flatMap((event) => this.expandOccurrences(event, rangeFrom, rangeTo))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  async upcoming(userId: string, projectId: string, days = 30) {
    await this.access.assertAccess(userId, projectId, 'viewer');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setDate(to.getDate() + days);
    const events = await this.prisma.calendarEvent.findMany({ where: { projectId } });
    return events
      .flatMap((event) => this.expandOccurrences(event, now, to))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  async create(userId: string, dto: CreateCalendarEventDto) {
    await this.access.assertAccess(userId, dto.projectId, 'editor');
    const event = await this.prisma.calendarEvent.create({
      data: {
        projectId: dto.projectId,
        title: dto.title.trim() || 'Новое событие',
        description: dto.description,
        dueDate: new Date(dto.dueDate),
        amount: dto.amount,
        currency: dto.currency ?? 'RUB',
        recurrence: dto.recurrence ?? 'none',
        category: dto.category ?? 'payment',
        remindDays: JSON.stringify(dto.remindDays ?? [1, 7]),
      },
    });
    return this.formatEvent(event);
  }

  async update(userId: string, id: string, dto: UpdateCalendarEventDto) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Событие не найдено');
    await this.access.assertAccess(userId, event.projectId, 'editor');
    const updated = await this.prisma.calendarEvent.update({
      where: { id },
      data: {
        title: dto.title?.trim() || undefined,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        amount: dto.amount,
        currency: dto.currency,
        recurrence: dto.recurrence,
        category: dto.category,
        remindDays: dto.remindDays ? JSON.stringify(dto.remindDays) : undefined,
      },
    });
    return this.formatEvent(updated);
  }

  async remove(userId: string, id: string) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Событие не найдено');
    await this.access.assertAccess(userId, event.projectId, 'editor');
    await this.prisma.calendarEvent.delete({ where: { id } });
    return { ok: true };
  }
}