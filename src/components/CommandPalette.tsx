"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, FolderPlus, Moon, Plus, Search, Settings, Sun, Star, Upload } from "lucide-react";
import type { Note } from "@/lib/types";

export type CommandAction = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ size?: number }>;
  action: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  notes: Note[];
  onSelectNote: (id: string) => void;
  actions: CommandAction[];
};

export function CommandPalette({
  open,
  onClose,
  query,
  onQueryChange,
  notes,
  onSelectNote,
  actions,
}: CommandPaletteProps) {
  const [index, setIndex] = useState(0);

  const noteResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes.slice(0, 8);
    return notes
      .filter((n) =>
        [n.title, n.category, n.url, n.host, n.login, n.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 8);
  }, [notes, query]);

  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) => a.label.toLowerCase().includes(q));
  }, [actions, query]);

  const items = useMemo(
    () => [
      ...filteredActions.map((a) => ({ type: "action" as const, ...a })),
      ...noteResults.map((n) => ({
        type: "note" as const,
        id: n.id,
        label: n.title,
        hint: n.category,
        icon: n.favorite ? Star : FileText,
        action: () => onSelectNote(n.id),
      })),
    ],
    [filteredActions, noteResults, onSelectNote],
  );

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, items.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && items[index]) {
        e.preventDefault();
        items[index].action();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, index, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-input-wrap">
          <Search size={18} />
          <input
            autoFocus
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Поиск заметок и команд…"
            aria-label="Командная палитра"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="command-results">
          {items.length ? (
            items.map((item, i) => (
              <button
                key={`${item.type}-${item.id}`}
                className={i === index ? "active" : ""}
                onMouseEnter={() => setIndex(i)}
                onClick={() => {
                  item.action();
                  onClose();
                }}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
                {item.hint ? <small>{item.hint}</small> : null}
              </button>
            ))
          ) : (
            <p className="command-empty">Ничего не найдено</p>
          )}
        </div>
      </div>
    </div>
  );
}

export const commandIcons = { Plus, FolderPlus, Settings, Moon, Sun, Search, Upload, Download };
