"use client";

import { useState } from "react";
import { Eye, EyeOff, Plus, Trash2, X } from "lucide-react";
import type { TableColumnDef, TableColumnType } from "@/lib/facility-types";

type ColumnEditorModalProps = {
  title: string;
  columns: TableColumnDef[];
  onSave: (columns: TableColumnDef[]) => void;
  onClose: () => void;
};

const columnTypes: { id: TableColumnType; label: string }[] = [
  { id: "text", label: "Текст" },
  { id: "number", label: "Число" },
  { id: "checkbox", label: "Чекбокс" },
];

export function ColumnEditorModal({ title, columns, onSave, onClose }: ColumnEditorModalProps) {
  const [draft, setDraft] = useState<TableColumnDef[]>(columns.map((col) => ({ ...col })));

  function updateColumn(id: string, patch: Partial<TableColumnDef>) {
    setDraft((current) => current.map((col) => (col.id === id ? { ...col, ...patch } : col)));
  }

  function addColumn() {
    const id = `col_${Date.now()}`;
    setDraft((current) => [
      ...current,
      { id, label: "Новый столбец", type: "text", visible: true, width: 120 },
    ]);
  }

  function removeColumn(id: string) {
    setDraft((current) => current.filter((col) => col.id !== id || col.system));
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card column-editor-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="overline">Таблица</p>
            <h3>{title}</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="column-editor-list">
          {draft.map((col) => (
            <div key={col.id} className="column-editor-row">
              <button
                type="button"
                className="icon-button small-btn"
                title={col.visible === false ? "Показать" : "Скрыть"}
                onClick={() => updateColumn(col.id, { visible: col.visible === false })}
              >
                {col.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <input
                className="text-field"
                value={col.label}
                disabled={col.system}
                onChange={(e) => updateColumn(col.id, { label: e.target.value })}
              />
              <select
                value={col.type}
                disabled={col.system}
                onChange={(e) => updateColumn(col.id, { type: e.target.value as TableColumnType })}
              >
                {columnTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
              <input
                className="text-field column-width-input"
                type="number"
                min={60}
                value={col.width ?? 120}
                onChange={(e) => updateColumn(col.id, { width: Number(e.target.value) || 120 })}
              />
              {!col.system ? (
                <button type="button" className="icon-button small-btn danger" onClick={() => removeColumn(col.id)}>
                  <Trash2 size={14} />
                </button>
              ) : (
                <span className="column-system-badge">системный</span>
              )}
            </div>
          ))}
        </div>

        <button type="button" className="ghost-button full" onClick={addColumn}>
          <Plus size={16} />
          Добавить столбец
        </button>

        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="primary-button" onClick={() => onSave(draft)}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}