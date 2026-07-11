"use client";

import {
  Building2,
  CheckSquare,
  Crown,
  KeyRound,
  Map,
  Package,
  Users,
} from "lucide-react";
import type { AppMode } from "@/lib/types";

const modes: { id: AppMode; label: string; icon: typeof KeyRound; premium?: boolean }[] = [
  { id: "vault", label: "Хранилище", icon: KeyRound },
  { id: "tasks", label: "Задачи", icon: CheckSquare },
  { id: "inventory", label: "Склад", icon: Package, premium: true },
  { id: "equipment", label: "Оснащение", icon: Building2, premium: true },
  { id: "network", label: "Сеть", icon: Map, premium: true },
  { id: "contacts", label: "Контакты", icon: Users },
];

type AppModeNavProps = {
  value: AppMode;
  onChange: (mode: AppMode) => void;
  compact?: boolean;
  lockedModes?: AppMode[];
  onLockedMode?: (mode: AppMode) => void;
};

export function AppModeNav({ value, onChange, compact, lockedModes = [], onLockedMode }: AppModeNavProps) {
  return (
    <nav className={`app-mode-nav ${compact ? "compact" : ""}`} aria-label="Разделы приложения">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const locked = lockedModes.includes(mode.id);
        return (
          <button
            key={mode.id}
            type="button"
            className={`${value === mode.id ? "active" : ""} ${compact ? "sidebar-rail-btn" : ""} ${locked ? "locked" : ""}`}
            onClick={() => (locked ? onLockedMode?.(mode.id) : onChange(mode.id))}
            title={locked ? `${mode.label} — Pro / Team` : mode.label}
            aria-label={mode.label}
          >
            <Icon size={compact ? 18 : 14} />
            {!compact ? <span>{mode.label}</span> : null}
            {locked && mode.premium ? <Crown size={10} className="mode-premium-icon" /> : null}
          </button>
        );
      })}
    </nav>
  );
}