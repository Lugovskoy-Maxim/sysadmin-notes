"use client";

import { Bell, CheckCheck, Trash2, X } from "lucide-react";
import { useNotifications, type AppNotification } from "@/lib/notifications";

type NotificationsPanelProps = {
  onClose: () => void;
  onNavigate?: (href: string) => void;
};

const kindClass: Record<AppNotification["kind"], string> = {
  reminder: "notification-reminder",
  info: "notification-info",
  success: "notification-success",
  warning: "notification-warning",
};

export function NotificationsPanel({ onClose, onNavigate }: NotificationsPanelProps) {
  const items = useNotifications((s) => s.items);
  const markRead = useNotifications((s) => s.markRead);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const dismiss = useNotifications((s) => s.dismiss);
  const clear = useNotifications((s) => s.clear);

  return (
    <div className="notifications-panel" onClick={(e) => e.stopPropagation()}>
      <header className="notifications-head">
        <div>
          <Bell size={16} />
          <h3>Уведомления</h3>
        </div>
        <div className="notifications-head-actions">
          {items.length ? (
            <>
              <button type="button" className="icon-button" onClick={markAllRead} title="Прочитать все">
                <CheckCheck size={16} />
              </button>
              <button type="button" className="icon-button" onClick={clear} title="Очистить">
                <Trash2 size={16} />
              </button>
            </>
          ) : null}
          <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть">
            <X size={16} />
          </button>
        </div>
      </header>

      {items.length ? (
        <ul className="notifications-list">
          {items.map((item) => (
            <li key={item.id} className={`${kindClass[item.kind]} ${item.read ? "read" : ""}`}>
              <button
                type="button"
                className="notification-item"
                onClick={() => {
                  markRead(item.id);
                  if (item.href) onNavigate?.(item.href);
                }}
              >
                <strong>{item.title}</strong>
                <span>{item.body}</span>
                <time>{new Date(item.createdAt).toLocaleString("ru-RU")}</time>
              </button>
              <button type="button" className="icon-button small-btn" onClick={() => dismiss(item.id)} aria-label="Удалить">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="notifications-empty">Нет уведомлений. Напоминания появятся за несколько дней до оплаты.</p>
      )}
    </div>
  );
}