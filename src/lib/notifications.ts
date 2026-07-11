"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotificationKind = "reminder" | "info" | "success" | "warning";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  kind: NotificationKind;
  createdAt: string;
  read: boolean;
  href?: string;
  sourceKey?: string;
};

type NotificationState = {
  items: AppNotification[];
  push: (item: Omit<AppNotification, "id" | "createdAt" | "read"> & { id?: string; read?: boolean }) => string | null;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clear: () => void;
  unreadCount: () => number;
};

export const useNotifications = create<NotificationState>()(
  persist(
    (set, get) => ({
      items: [],
      push: (item) => {
        const id = item.id ?? crypto.randomUUID();
        const sourceKey = item.sourceKey;
        if (sourceKey && get().items.some((entry) => entry.sourceKey === sourceKey)) {
          return null;
        }
        const next: AppNotification = {
          id,
          title: item.title,
          body: item.body,
          kind: item.kind,
          href: item.href,
          sourceKey,
          createdAt: new Date().toISOString(),
          read: item.read ?? false,
        };
        set((state) => ({ items: [next, ...state.items].slice(0, 80) }));
        return id;
      },
      markRead: (id) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, read: true } : item)),
        })),
      markAllRead: () => set((state) => ({ items: state.items.map((item) => ({ ...item, read: true })) })),
      dismiss: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
      clear: () => set({ items: [] }),
      unreadCount: () => get().items.filter((item) => !item.read).length,
    }),
    { name: "sysadmin-notes-notifications" },
  ),
);

export async function requestBrowserNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const notification = new Notification(title, { body, icon: "/icons/icon-192.png", tag: title });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // ignore unsupported contexts
  }
}