"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { GripVertical, Plus, Settings2, Trash2 } from "lucide-react";
import type { TableColumnDef } from "@/lib/facility-types";

type DynamicDataTableProps<TRow extends { id: string }> = {
  columns: TableColumnDef[];
  rows: TRow[];
  getCellValue: (row: TRow, column: TableColumnDef) => string | number | boolean | null | undefined;
  onCellChange?: (row: TRow, columnId: string, value: string | number | boolean) => void;
  onRowDelete?: (row: TRow) => void;
  onAddRow?: () => void;
  onEditColumns?: () => void;
  onColumnResize?: (columnId: string, width: number) => void;
  rowActions?: (row: TRow) => ReactNode;
  emptyLabel?: string;
};

export function DynamicDataTable<TRow extends { id: string }>({
  columns,
  rows,
  getCellValue,
  onCellChange,
  onRowDelete,
  onAddRow,
  onEditColumns,
  onColumnResize,
  rowActions,
  emptyLabel = "Нет данных",
}: DynamicDataTableProps<TRow>) {
  const visibleColumns = columns.filter((col) => col.visible !== false);
  const resizeRef = useRef<{ colId: string; startX: number; startWidth: number } | null>(null);
  const [resizingCol, setResizingCol] = useState<string | null>(null);

  const handleResizeStart = useCallback(
    (colId: string, startX: number, width: number) => {
      resizeRef.current = { colId, startX, startWidth: width };
      setResizingCol(colId);

      function onMove(e: MouseEvent) {
        if (!resizeRef.current) return;
        const delta = e.clientX - resizeRef.current.startX;
        const next = Math.max(60, resizeRef.current.startWidth + delta);
        onColumnResize?.(resizeRef.current.colId, next);
      }

      function onUp() {
        resizeRef.current = null;
        setResizingCol(null);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [onColumnResize],
  );

  return (
    <div className={`dynamic-table-wrap ${resizingCol ? "is-resizing" : ""}`}>
      <div className="dynamic-table-toolbar">
        {onAddRow ? (
          <button type="button" className="ghost-button compact" onClick={onAddRow}>
            <Plus size={14} />
            Добавить строку
          </button>
        ) : null}
        {onEditColumns ? (
          <button type="button" className="ghost-button compact" onClick={onEditColumns}>
            <Settings2 size={14} />
            Столбцы
          </button>
        ) : null}
      </div>

      {rows.length ? (
        <div className="dynamic-table-scroll">
          <table className="dynamic-table">
            <thead>
              <tr>
                {visibleColumns.map((col) => (
                  <th
                    key={col.id}
                    style={{ width: col.width, minWidth: col.width }}
                    className={`dynamic-col-${col.id}`}
                  >
                    <span>{col.label}</span>
                    {onColumnResize ? (
                      <button
                        type="button"
                        className="col-resize-handle"
                        aria-label={`Изменить ширину: ${col.label}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleResizeStart(col.id, e.clientX, col.width ?? 120);
                        }}
                      >
                        <GripVertical size={12} />
                      </button>
                    ) : null}
                  </th>
                ))}
                <th className="dynamic-col-actions" aria-label="Действия" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {visibleColumns.map((col) => {
                    const value = getCellValue(row, col);
                    return (
                      <td key={col.id} style={{ width: col.width, minWidth: col.width }}>
                        {col.type === "checkbox" ? (
                          <label className="dynamic-checkbox">
                            <input
                              type="checkbox"
                              checked={Boolean(value)}
                              onChange={(e) => onCellChange?.(row, col.id, e.target.checked)}
                            />
                            <span />
                          </label>
                        ) : col.type === "number" ? (
                          <input
                            className="dynamic-cell-input"
                            type="number"
                            min={0}
                            value={value === null || value === undefined ? "" : String(value)}
                            onChange={(e) =>
                              onCellChange?.(row, col.id, e.target.value === "" ? 0 : Number(e.target.value))
                            }
                          />
                        ) : (
                          <input
                            className="dynamic-cell-input"
                            type="text"
                            value={value === null || value === undefined ? "" : String(value)}
                            onChange={(e) => onCellChange?.(row, col.id, e.target.value)}
                          />
                        )}
                      </td>
                    );
                  })}
                  <td className="dynamic-col-actions">
                    <div className="dynamic-row-actions">
                      {rowActions?.(row)}
                      {onRowDelete ? (
                        <button
                          type="button"
                          className="table-action-btn danger"
                          title="Удалить"
                          onClick={() => onRowDelete(row)}
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="dynamic-table-empty">{emptyLabel}</div>
      )}
    </div>
  );
}