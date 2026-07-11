"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  calendarCategoryLabels,
  calendarRecurrenceLabels,
  type CalendarCategory,
  type CalendarEvent,
  type CalendarOccurrence,
  type CalendarRecurrence,
} from "@/lib/calendar-types";
import {
  addMonths,
  daysInMonthGrid,
  formatAmount,
  formatMonthTitle,
  occurrencesForDay,
  sameDay,
  toDateInputValue,
} from "@/lib/calendar-utils";
import { useToast } from "@/lib/toast";

type CalendarPanelProps = {
  token: string;
  projectId: string;
};

const weekdayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function CalendarPanel({ token, projectId }: CalendarPanelProps) {
  const toast = useToast((s) => s.push);
  const [month, setMonth] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [occurrences, setOccurrences] = useState<CalendarOccurrence[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from, to };
  }, [month]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stored, expanded] = await Promise.all([
        api.calendar.listEvents(token, projectId),
        api.calendar.listOccurrences(token, projectId, range.from.toISOString(), range.to.toISOString()),
      ]);
      setEvents(stored);
      setOccurrences(expanded);
      setSelectedEventId((current) => (current && stored.some((item) => item.id === current) ? current : stored[0]?.id ?? null));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось загрузить календарь", "error");
    } finally {
      setLoading(false);
    }
  }, [token, projectId, range.from, range.to, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const gridDays = useMemo(() => daysInMonthGrid(month), [month]);
  const today = new Date();

  async function addEvent(day?: Date) {
    const due = day ?? new Date();
    try {
      const created = await api.calendar.createEvent(token, {
        projectId,
        title: "Новая оплата",
        dueDate: toDateInputValue(due),
        recurrence: "monthly",
        category: "payment",
        remindDays: [1, 7],
      });
      setEvents((current) => [...current, created].sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
      setSelectedEventId(created.id);
      setSelectedDay(due);
      await load();
      toast("Событие добавлено", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось создать событие", "error");
    }
  }

  async function updateEvent(id: string, patch: Partial<CalendarEvent>) {
    try {
      const updated = await api.calendar.updateEvent(token, id, patch);
      setEvents((current) => current.map((item) => (item.id === id ? updated : item)));
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось сохранить", "error");
    }
  }

  async function removeEvent(id: string) {
    if (!window.confirm("Удалить событие?")) return;
    try {
      await api.calendar.removeEvent(token, id);
      setEvents((current) => current.filter((item) => item.id !== id));
      setSelectedEventId((current) => (current === id ? null : current));
      await load();
      toast("Событие удалено", "info");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось удалить", "error");
    }
  }

  return (
    <div className="calendar-panel facility-panel">
      <header className="calendar-panel-head">
        <div>
          <h2>
            <CalendarDays size={20} />
            Календарь оплат
          </h2>
          <p>Ежемесячные и ежегодные даты услуг, доменов, хостинга и подписок</p>
        </div>
        <div className="calendar-panel-actions">
          <button type="button" className="ghost-button compact" onClick={() => setMonth((current) => addMonths(current, -1))}>
            <ChevronLeft size={16} />
          </button>
          <strong className="calendar-month-label">{formatMonthTitle(month)}</strong>
          <button type="button" className="ghost-button compact" onClick={() => setMonth((current) => addMonths(current, 1))}>
            <ChevronRight size={16} />
          </button>
          <button type="button" className="primary-button compact" onClick={() => void addEvent(selectedDay ?? undefined)}>
            <Plus size={14} />
            Добавить
          </button>
        </div>
      </header>

      <div className="calendar-layout">
        <section className="calendar-grid-wrap">
          <div className="calendar-weekdays">
            {weekdayLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {gridDays.map((day) => {
              const inMonth = day.getMonth() === month.getMonth();
              const dayEvents = occurrencesForDay(occurrences, day);
              const isSelected = selectedDay ? sameDay(day, selectedDay) : false;
              const isToday = sameDay(day, today);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={`calendar-day ${inMonth ? "" : "outside"} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
                  onClick={() => setSelectedDay(day)}
                  onDoubleClick={() => void addEvent(day)}
                >
                  <span className="calendar-day-num">{day.getDate()}</span>
                  <div className="calendar-day-events">
                    {dayEvents.slice(0, 3).map((item) => (
                      <span
                        key={`${item.eventId}-${item.dueDate}`}
                        className={`calendar-chip category-${item.category}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEventId(item.eventId);
                          setSelectedDay(day);
                        }}
                      >
                        {item.title}
                      </span>
                    ))}
                    {dayEvents.length > 3 ? <em>+{dayEvents.length - 3}</em> : null}
                  </div>
                </button>
              );
            })}
          </div>
          {loading ? <p className="fine-print calendar-loading">Загрузка…</p> : null}
        </section>

        <aside className="calendar-editor">
          {selectedEvent ? (
            <>
              <div className="calendar-editor-head">
                <h3>Редактирование</h3>
                <button type="button" className="icon-button danger" onClick={() => void removeEvent(selectedEvent.id)}>
                  <Trash2 size={16} />
                </button>
              </div>

              <label className="field-label">Название</label>
              <input
                className="text-field"
                value={selectedEvent.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setEvents((current) => current.map((item) => (item.id === selectedEvent.id ? { ...item, title } : item)));
                }}
                onBlur={(e) => void updateEvent(selectedEvent.id, { title: e.target.value })}
              />

              <label className="field-label">Дата</label>
              <input
                className="text-field"
                type="date"
                value={toDateInputValue(new Date(selectedEvent.dueDate))}
                onChange={(e) => void updateEvent(selectedEvent.id, { dueDate: e.target.value })}
              />

              <label className="field-label">Повтор</label>
              <select
                className="text-field network-select"
                value={selectedEvent.recurrence}
                onChange={(e) => void updateEvent(selectedEvent.id, { recurrence: e.target.value as CalendarRecurrence })}
              >
                {(Object.keys(calendarRecurrenceLabels) as CalendarRecurrence[]).map((key) => (
                  <option key={key} value={key}>
                    {calendarRecurrenceLabels[key]}
                  </option>
                ))}
              </select>

              <label className="field-label">Категория</label>
              <select
                className="text-field network-select"
                value={selectedEvent.category}
                onChange={(e) => void updateEvent(selectedEvent.id, { category: e.target.value as CalendarCategory })}
              >
                {(Object.keys(calendarCategoryLabels) as CalendarCategory[]).map((key) => (
                  <option key={key} value={key}>
                    {calendarCategoryLabels[key]}
                  </option>
                ))}
              </select>

              <label className="field-label">Сумма</label>
              <input
                className="text-field"
                type="number"
                min={0}
                value={selectedEvent.amount ?? ""}
                onChange={(e) => {
                  const amount = e.target.value === "" ? null : Number(e.target.value);
                  setEvents((current) =>
                    current.map((item) => (item.id === selectedEvent.id ? { ...item, amount } : item)),
                  );
                }}
                onBlur={(e) =>
                  void updateEvent(selectedEvent.id, {
                    amount: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />

              <label className="field-label">Валюта</label>
              <input
                className="text-field"
                value={selectedEvent.currency ?? "RUB"}
                onChange={(e) => setEvents((current) =>
                  current.map((item) => (item.id === selectedEvent.id ? { ...item, currency: e.target.value } : item)),
                )}
                onBlur={(e) => void updateEvent(selectedEvent.id, { currency: e.target.value })}
              />

              <label className="field-label">Напоминать за (дней)</label>
              <input
                className="text-field"
                placeholder="1, 7, 14"
                value={selectedEvent.remindDays.join(", ")}
                onBlur={(e) => {
                  const remindDays = e.target.value
                    .split(",")
                    .map((part) => Number(part.trim()))
                    .filter((num) => Number.isFinite(num) && num >= 0);
                  void updateEvent(selectedEvent.id, { remindDays: remindDays.length ? remindDays : [1, 7] });
                }}
              />

              <label className="field-label">Комментарий</label>
              <textarea
                className="text-field"
                rows={3}
                value={selectedEvent.description ?? ""}
                onChange={(e) =>
                  setEvents((current) =>
                    current.map((item) => (item.id === selectedEvent.id ? { ...item, description: e.target.value } : item)),
                  )
                }
                onBlur={(e) => void updateEvent(selectedEvent.id, { description: e.target.value })}
              />

              {selectedEvent.amount != null ? (
                <p className="calendar-amount-preview">
                  {formatAmount(selectedEvent.amount, selectedEvent.currency)}
                </p>
              ) : null}
            </>
          ) : (
            <div className="calendar-editor-empty">
              <p>Выберите день или создайте событие оплаты.</p>
              <button type="button" className="primary-button" onClick={() => void addEvent()}>
                <Plus size={16} />
                Добавить оплату
              </button>
            </div>
          )}

          {selectedDay ? (
            <section className="calendar-day-list">
              <h4>
                {selectedDay.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
              </h4>
              <ul>
                {occurrencesForDay(occurrences, selectedDay).map((item) => (
                  <li key={`${item.eventId}-${item.dueDate}`}>
                    <button type="button" onClick={() => setSelectedEventId(item.eventId)}>
                      <strong>{item.title}</strong>
                      <span>
                        {calendarRecurrenceLabels[item.recurrence]}
                        {item.amount != null ? ` · ${formatAmount(item.amount, item.currency)}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}