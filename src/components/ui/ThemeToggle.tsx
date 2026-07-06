"use client";

import { Moon, Sun } from "lucide-react";
import type { Theme } from "@/lib/types";

type ThemeToggleProps = {
  theme: Theme;
  onChange: (theme: Theme) => void;
  compact?: boolean;
};

export function ThemeToggle({ theme, onChange, compact }: ThemeToggleProps) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={`theme-toggle ${compact ? "compact" : ""}`}
      onClick={() => onChange(isDark ? "light" : "dark")}
      aria-label={isDark ? "Светлая тема" : "Тёмная тема"}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
    >
      <span className={`theme-toggle-track ${isDark ? "dark" : "light"}`}>
        <span className="theme-toggle-thumb">
          {isDark ? <Moon size={compact ? 12 : 14} /> : <Sun size={compact ? 12 : 14} />}
        </span>
      </span>
      {!compact ? <span className="theme-toggle-label">{isDark ? "Тёмная" : "Светлая"}</span> : null}
    </button>
  );
}