"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import type { CalendarOccurrence } from "@/lib/calendar-types";
import { daysUntil, formatAmount } from "@/lib/calendar-utils";
import {
  requestBrowserNotificationPermission,
  showBrowserNotification,
  useNotifications,
} from "@/lib/notifications";
import { useToast } from "@/lib/toast";

type NotificationProviderProps = {
  token: string | null;
  projectId: string | null;
};

function reminderKey(eventId: string, dueDate: string, offset: number) {
  return `calendar:${eventId}:${dueDate}:${offset}`;
}

function scanOccurrences(occurrences: CalendarOccurrence[]) {
  const push = useNotifications.getState().push;
  const toast = useToast.getState().push;

  for (const item of occurrences) {
    const left = daysUntil(item.dueDate);
    for (const offset of item.remindDays) {
      if (left !== offset) continue;
      const amount = formatAmount(item.amount, item.currency);
      const body = amount
        ? `${amount} · через ${offset} ${offset === 1 ? "день" : offset < 5 ? "дня" : "дней"}`
        : `Напоминание за ${offset} ${offset === 1 ? "день" : offset < 5 ? "дня" : "дней"}`;
      const key = reminderKey(item.eventId, item.dueDate, offset);
      const created = push({
        sourceKey: key,
        title: item.title,
        body,
        kind: left <= 1 ? "warning" : "reminder",
        href: "/?mode=calendar",
      });
      if (created) {
        toast(`${item.title}: ${body}`, left <= 1 ? "error" : "info");
        showBrowserNotification(item.title, body);
      }
    }
  }
}

export function NotificationProvider({ token, projectId }: NotificationProviderProps) {
  useEffect(() => {
    if (!token) return;
    void requestBrowserNotificationPermission();
  }, [token]);

  useEffect(() => {
    if (!token || !projectId) return;

    async function poll() {
      try {
        const occurrences = await api.calendar.upcoming(token!, projectId!, 45);
        scanOccurrences(occurrences);
      } catch {
        // silent when API unavailable
      }
    }

    void poll();
    const timer = window.setInterval(() => void poll(), 5 * 60_000);
    return () => window.clearInterval(timer);
  }, [token, projectId]);

  return null;
}