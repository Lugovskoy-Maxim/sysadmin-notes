"use client";

import { Bell } from "lucide-react";
import { useNotifications } from "@/lib/notifications";
import { NotificationsPanel } from "./NotificationsPanel";

type NotificationsBellProps = {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onNavigate?: (href: string) => void;
};

export function NotificationsBell({ open, onToggle, onClose, onNavigate }: NotificationsBellProps) {
  const unread = useNotifications((s) => s.unreadCount());

  return (
    <div className="notifications-bell-wrap">
      <button
        type="button"
        className={`icon-button notifications-bell ${open ? "active" : ""}`}
        onClick={onToggle}
        aria-label="Уведомления"
        title="Уведомления"
      >
        <Bell size={18} />
        {unread > 0 ? <span className="notifications-badge">{unread > 9 ? "9+" : unread}</span> : null}
      </button>
      {open ? (
        <>
          <div className="notifications-backdrop" onClick={onClose} />
          <NotificationsPanel
            onClose={onClose}
            onNavigate={(href) => {
              onNavigate?.(href);
              onClose();
            }}
          />
        </>
      ) : null}
    </div>
  );
}