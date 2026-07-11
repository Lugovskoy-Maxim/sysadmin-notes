export type CalendarRecurrence = "none" | "monthly" | "yearly";
export type CalendarCategory = "payment" | "service" | "renewal" | "other";

export type CalendarEvent = {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  dueDate: string;
  amount?: number | null;
  currency?: string | null;
  recurrence: CalendarRecurrence;
  category: CalendarCategory;
  remindDays: number[];
  createdAt: string;
  updatedAt: string;
};

export type CalendarOccurrence = {
  eventId: string;
  title: string;
  description?: string | null;
  dueDate: string;
  amount?: number | null;
  currency?: string | null;
  recurrence: CalendarRecurrence;
  category: CalendarCategory;
  remindDays: number[];
  isRecurringInstance: boolean;
};

export const calendarCategoryLabels: Record<CalendarCategory, string> = {
  payment: "Оплата",
  service: "Услуга",
  renewal: "Продление",
  other: "Другое",
};

export const calendarRecurrenceLabels: Record<CalendarRecurrence, string> = {
  none: "Разово",
  monthly: "Ежемесячно",
  yearly: "Ежегодно",
};