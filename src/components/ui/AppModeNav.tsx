"use client";

import {
  Building2,
  CheckSquare,
  KeyRound,
  Map,
  Package,
} from "lucide-react";
import type { AppMode } from "@/lib/types";

const modes: { id: AppMode; label: string; icon: typeof KeyRound }[] = [
  { id: "vault", label: "Хранилище", icon: KeyRound },
  { id: "tasks", label: "Задачи", icon: CheckSquare },
  { id: "inventory", label: "Склад", icon: Package },
  { id: "equipment", label: "Оснащение", icon: Building2 },
  { id: "network", label: "Сеть", icon: Map },
];

type AppModeNavProps = {
  value: AppMode;
  onChange: (mode: AppMode) => void;
  compact?: boolean;
};

export function AppModeNav({ value, onChange, compact }: AppModeNavProps) {
  return (
    <nav className={`app-mode-nav ${compact ? "compact" : ""}`} aria-label="Разделы приложения">
      {modes.map((mode) => {
        const Icon = mode.icon;
        return (
          <button
            key={mode.id}
            type="button"
            className={`${value === mode.id ? "active" : ""} ${compact ? "sidebar-rail-btn" : ""}`}
            onClick={() => onChange(mode.id)}
            title={mode.label}
            aria-label={mode.label}
          >
            <Icon size={compact ? 18 : 14} />
            {!compact ? <span>{mode.label}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}