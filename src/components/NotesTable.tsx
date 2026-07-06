"use client";

import type { ReactNode } from "react";
import {
  ArrowRight,
  Copy,
  Eye,
  ExternalLink,
  KeyRound,
  Pin,
  Star,
} from "lucide-react";
import { useToast } from "@/lib/toast";
import { extractTextPreview, formatDate, normalizeExternalUrl } from "@/lib/utils";
import type { Note, VaultSection } from "@/lib/types";
import { typeLabels } from "@/lib/types";

type NotesTableProps = {
  notes: Note[];
  vaultSection: VaultSection;
  selectedId: string | null;
  previewId: string | null;
  onPreview: (note: Note) => void;
  onOpen: (note: Note) => void;
  onSwitchProject?: (projectId: string) => void;
  globalSearch?: boolean;
  activeProjectId?: string | null;
};

type Column = {
  id: string;
  label: string;
  className?: string;
  render: (note: Note) => ReactNode;
};

export function NotesTable({
  notes,
  vaultSection,
  selectedId,
  previewId,
  onPreview,
  onOpen,
  onSwitchProject,
  globalSearch,
  activeProjectId,
}: NotesTableProps) {
  const toast = useToast((s) => s.push);

  async function copyText(value: string, label = "Скопировано") {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast(label, "success");
  }

  function openNote(note: Note) {
    if (globalSearch && note.projectId !== activeProjectId) {
      onSwitchProject?.(note.projectId);
    }
    onOpen(note);
  }

  const passwordColumns: Column[] = [
    {
      id: "title",
      label: "Название",
      className: "col-title",
      render: (note) => (
        <TableCell title={note.title}>
          <span className="table-cell-title">
            <span className="table-cell-title-icons">
              {note.pinned ? <Pin size={11} className="pin-icon" /> : null}
              {note.favorite ? <Star size={11} className="star-icon" fill="currentColor" /> : null}
            </span>
            <span className="table-cell-title-text">{note.title}</span>
          </span>
        </TableCell>
      ),
    },
    {
      id: "login",
      label: "Логин",
      className: "col-login",
      render: (note) => (
        <TableCell title={note.login ?? undefined}>
          <span className="table-mono">{note.login || "—"}</span>
        </TableCell>
      ),
    },
    {
      id: "host",
      label: "Хост",
      className: "col-host",
      render: (note) => (
        <TableCell title={note.host ?? undefined}>
          <span className="table-muted">{note.host || "—"}</span>
        </TableCell>
      ),
    },
    {
      id: "url",
      label: "URL",
      className: "col-url",
      render: (note) => (
        <TableCell title={note.url ?? undefined}>
          {normalizeExternalUrl(note.url) ? (
            <a
              href={normalizeExternalUrl(note.url)!}
              target="_blank"
              rel="noopener noreferrer"
              className="table-link"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="table-link-text">{note.url}</span>
              <ExternalLink size={11} className="table-link-icon" />
              <span className="table-link-action">Открыть</span>
            </a>
          ) : (
            <span className="table-muted">—</span>
          )}
        </TableCell>
      ),
    },
    {
      id: "category",
      label: "Категория",
      className: "col-category",
      render: (note) => (
        <TableCell title={note.category}>
          <span className="table-tag">{note.category}</span>
        </TableCell>
      ),
    },
    {
      id: "updated",
      label: "Изменено",
      className: "col-date",
      render: (note) => (
        <TableCell>
          <span className="table-date">{formatDate(note.updatedAt)}</span>
        </TableCell>
      ),
    },
  ];

  const instructionColumns: Column[] = [
    {
      id: "title",
      label: "Название",
      className: "col-title",
      render: (note) => (
        <TableCell title={note.title}>
          <span className="table-cell-title">
            {note.pinned ? <Pin size={11} className="pin-icon" /> : null}
            <span className="table-cell-title-text">{note.title}</span>
          </span>
        </TableCell>
      ),
    },
    {
      id: "preview",
      label: "Содержание",
      className: "col-preview",
      render: (note) => {
        const preview = note.memo || extractTextPreview(note.content, 120) || "—";
        return (
          <TableCell title={preview !== "—" ? preview : undefined}>
            <span className="table-preview">{preview}</span>
          </TableCell>
        );
      },
    },
    {
      id: "category",
      label: "Категория",
      className: "col-category",
      render: (note) => (
        <TableCell title={note.category}>
          <span className="table-tag">{note.category}</span>
        </TableCell>
      ),
    },
    {
      id: "tags",
      label: "Теги",
      className: "col-tags",
      render: (note) => (
        <TableCell title={note.tags.join(", ") || undefined}>
          <span className="table-tags">
            {note.tags.length ? note.tags.slice(0, 2).map((t) => <em key={t}>{t}</em>) : "—"}
          </span>
        </TableCell>
      ),
    },
    {
      id: "updated",
      label: "Изменено",
      className: "col-date",
      render: (note) => (
        <TableCell>
          <span className="table-date">{formatDate(note.updatedAt)}</span>
        </TableCell>
      ),
    },
  ];

  const schemaColumns: Column[] = [
    {
      id: "title",
      label: "Название",
      className: "col-title",
      render: (note) => (
        <TableCell title={note.title}>
          <span className="table-cell-title">
            <span className="table-cell-title-text">{note.title}</span>
          </span>
        </TableCell>
      ),
    },
    {
      id: "type",
      label: "Тип",
      className: "col-type",
      render: (note) => (
        <TableCell>
          <span className={`note-row-badge badge-${note.type}`}>{typeLabels[note.type]}</span>
        </TableCell>
      ),
    },
    {
      id: "preview",
      label: "Описание",
      className: "col-preview",
      render: (note) => {
        const preview = note.memo || extractTextPreview(note.content, 120) || note.url || "—";
        return (
          <TableCell title={preview !== "—" ? preview : undefined}>
            <span className="table-preview">{preview}</span>
          </TableCell>
        );
      },
    },
    {
      id: "category",
      label: "Категория",
      className: "col-category",
      render: (note) => (
        <TableCell title={note.category}>
          <span className="table-tag">{note.category}</span>
        </TableCell>
      ),
    },
    {
      id: "updated",
      label: "Изменено",
      className: "col-date",
      render: (note) => (
        <TableCell>
          <span className="table-date">{formatDate(note.updatedAt)}</span>
        </TableCell>
      ),
    },
  ];

  const columns =
    vaultSection === "passwords"
      ? passwordColumns
      : vaultSection === "instructions"
        ? instructionColumns
        : schemaColumns;

  return (
    <div className="notes-table-wrap">
      <table className="notes-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.id} className={col.className}>
                {col.label}
              </th>
            ))}
            <th className="col-actions" aria-label="Действия" />
          </tr>
        </thead>
        <tbody>
          {notes.map((note) => {
            const rowClass = [
              selectedId === note.id ? "selected" : "",
              previewId === note.id ? "previewing" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <tr
                key={note.id}
                className={rowClass}
                onClick={() => onPreview(note)}
                onDoubleClick={() => openNote(note)}
              >
                {columns.map((col) => (
                  <td key={col.id} className={col.className}>
                    {col.render(note)}
                  </td>
                ))}
                <td className="col-actions">
                  <div className="table-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="table-action-btn"
                      title="Подробнее"
                      onClick={() => onPreview(note)}
                    >
                      <Eye size={14} />
                    </button>
                    {vaultSection === "passwords" && note.login ? (
                      <button
                        type="button"
                        className="table-action-btn"
                        title="Копировать логин"
                        onClick={() => void copyText(note.login!, "Логин скопирован")}
                      >
                        <Copy size={14} />
                      </button>
                    ) : null}
                    {vaultSection === "passwords" && note.password ? (
                      <button
                        type="button"
                        className="table-action-btn"
                        title="Копировать пароль"
                        onClick={() => void copyText(note.password!, "Пароль скопирован")}
                      >
                        <KeyRound size={14} />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="table-action-btn primary"
                      title="Открыть запись"
                      onClick={() => openNote(note)}
                    >
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TableCell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="table-cell-content" title={title}>
      {children}
    </div>
  );
}
