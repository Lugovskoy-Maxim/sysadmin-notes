"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, History, Minus, Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import {
  defaultInventoryColumns,
  type InventoryItem,
  type InventoryWriteOff,
  type TableColumnDef,
} from "@/lib/facility-types";
import { debounceByKey, formatDate } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import { DynamicDataTable } from "@/components/ui/DynamicDataTable";
import { ColumnEditorModal } from "@/components/ColumnEditorModal";

type InventoryPanelProps = {
  token: string;
  projectId: string;
};

export function InventoryPanel({ token, projectId }: InventoryPanelProps) {
  const toast = useToast((s) => s.push);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [writeOffs, setWriteOffs] = useState<InventoryWriteOff[]>([]);
  const [columns, setColumns] = useState<TableColumnDef[]>(defaultInventoryColumns);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [writeOffItemId, setWriteOffItemId] = useState<string | null>(null);
  const [writeOffQty, setWriteOffQty] = useState(1);
  const [writeOffReason, setWriteOffReason] = useState("");
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inventory, history, defs] = await Promise.all([
        api.facility.listInventory(token, projectId),
        api.facility.listWriteOffs(token, projectId),
        api.facility.getColumnDefs(token, projectId),
      ]);
      setItems(inventory);
      setWriteOffs(history);
      setColumns(defs.inventoryColumnDefs.length ? defs.inventoryColumnDefs : defaultInventoryColumns);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось загрузить склад", "error");
    } finally {
      setLoading(false);
    }
  }, [token, projectId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.name, item.sku, item.category, item.location].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [items, query]);

  const lowStockCount = items.filter((item) => item.quantity <= item.minStock).length;

  async function addItem() {
    try {
      const created = await api.facility.createInventory(token, {
        projectId,
        name: "Новая позиция",
        quantity: 0,
        minStock: 0,
      });
      setItems((current) => [created, ...current]);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось создать позицию", "error");
    }
  }

  function updateItem(item: InventoryItem, columnId: string, value: string | number | boolean) {
    const patch: Partial<InventoryItem> = {};
    if (columnId === "name") patch.name = String(value);
    else if (columnId === "sku") patch.sku = String(value);
    else if (columnId === "category") patch.category = String(value);
    else if (columnId === "unit") patch.unit = String(value);
    else if (columnId === "location") patch.location = String(value);
    else if (columnId === "quantity") patch.quantity = Number(value);
    else if (columnId === "minStock") patch.minStock = Number(value);
    else patch.extra = { ...item.extra, [columnId]: value };

    setItems((current) =>
      current.map((row) => (row.id === item.id ? { ...row, ...patch, extra: patch.extra ?? row.extra } : row)),
    );

    debounceByKey(saveTimers.current, `${item.id}:${columnId}`, () => {
      void (async () => {
        try {
          const updated = await api.facility.updateInventory(token, item.id, patch);
          setItems((current) => current.map((row) => (row.id === item.id ? updated : row)));
        } catch (error) {
          toast(error instanceof Error ? error.message : "Ошибка сохранения", "error");
        }
      })();
    });
  }

  async function deleteItem(item: InventoryItem) {
    if (!confirm(`Удалить «${item.name}»?`)) return;
    try {
      await api.facility.removeInventory(token, item.id);
      setItems((current) => current.filter((row) => row.id !== item.id));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось удалить", "error");
    }
  }

  async function submitWriteOff() {
    if (!writeOffItemId) return;
    try {
      const entry = await api.facility.createWriteOff(token, {
        projectId,
        itemId: writeOffItemId,
        quantity: writeOffQty,
        reason: writeOffReason || undefined,
      });
      setWriteOffs((current) => [entry, ...current]);
      setItems((current) =>
        current.map((item) =>
          item.id === writeOffItemId ? { ...item, quantity: Math.max(0, item.quantity - writeOffQty) } : item,
        ),
      );
      setWriteOffItemId(null);
      setWriteOffQty(1);
      setWriteOffReason("");
      toast("Списание выполнено", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось списать", "error");
    }
  }

  async function saveColumns(next: TableColumnDef[]) {
    try {
      const saved = await api.facility.updateColumnDefs(token, projectId, { inventoryColumnDefs: next });
      setColumns(saved.inventoryColumnDefs);
      setShowColumns(false);
      toast("Столбцы сохранены", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось сохранить столбцы", "error");
    }
  }

  function getCellValue(item: InventoryItem, column: TableColumnDef) {
    if (column.id in item && column.id !== "extra") {
      const value = item[column.id as keyof InventoryItem];
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
    }
    const extra = item.extra[column.id];
    if (typeof extra === "string" || typeof extra === "number" || typeof extra === "boolean") return extra;
    return "";
  }

  if (loading) return <div className="facility-loading">Загрузка склада…</div>;

  return (
    <div className="facility-panel inventory-panel">
      <div className="facility-toolbar">
        <div className="search-box list-search">
          <Search size={17} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по складу" />
        </div>
        <div className="facility-toolbar-actions">
          {lowStockCount ? (
            <span className="facility-badge warning">
              <AlertTriangle size={14} />
              {lowStockCount} ниже неснижаемого
            </span>
          ) : null}
          <button type="button" className={`ghost-button compact ${showHistory ? "active" : ""}`} onClick={() => setShowHistory((v) => !v)}>
            <History size={14} />
            История списаний
          </button>
          <button type="button" className="primary-button compact" onClick={() => void addItem()}>
            <Plus size={14} />
            Позиция
          </button>
        </div>
      </div>

      <DynamicDataTable
        columns={columns}
        rows={filtered}
        getCellValue={getCellValue}
        onCellChange={(row, columnId, value) => void updateItem(row, columnId, value)}
        onRowDelete={(row) => void deleteItem(row)}
        onAddRow={() => void addItem()}
        onEditColumns={() => setShowColumns(true)}
        onColumnResize={(columnId, width) =>
          setColumns((current) => current.map((col) => (col.id === columnId ? { ...col, width } : col)))
        }
        rowActions={(row) => (
          <button
            type="button"
            className="table-action-btn"
            title="Списать"
            onClick={() => {
              setWriteOffItemId(row.id);
              setWriteOffQty(1);
            }}
          >
            <Minus size={14} />
          </button>
        )}
        emptyLabel="Склад пуст. Добавьте первую позицию."
      />

      {showHistory ? (
        <section className="writeoff-history">
          <header>
            <h3>История списаний</h3>
            <span>{writeOffs.length} записей</span>
          </header>
          {writeOffs.length ? (
            <table className="writeoff-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Позиция</th>
                  <th>Кол-во</th>
                  <th>Причина</th>
                </tr>
              </thead>
              <tbody>
                {writeOffs.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.createdAt)}</td>
                    <td>{entry.item?.name ?? "—"}</td>
                    <td>
                      {entry.quantity}
                      {entry.item?.unit ? ` ${entry.item.unit}` : ""}
                    </td>
                    <td>{entry.reason || entry.comment || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="writeoff-empty">Списаний пока нет</p>
          )}
        </section>
      ) : null}

      {writeOffItemId ? (
        <div className="modal-overlay" onClick={() => setWriteOffItemId(null)}>
          <div className="modal-card writeoff-modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <div>
                <p className="overline">Склад</p>
                <h3>Списание</h3>
              </div>
            </header>
            <div className="modal-body">
              <label className="field-label">Количество</label>
              <input
                className="text-field"
                type="number"
                min={1}
                value={writeOffQty}
                onChange={(e) => setWriteOffQty(Math.max(1, Number(e.target.value) || 1))}
              />
              <label className="field-label">Причина</label>
              <input
                className="text-field"
                value={writeOffReason}
                onChange={(e) => setWriteOffReason(e.target.value)}
                placeholder="Расход, брак, передача…"
              />
              <div className="modal-actions">
                <button type="button" className="ghost-button" onClick={() => setWriteOffItemId(null)}>
                  Отмена
                </button>
                <button type="button" className="primary-button" onClick={() => void submitWriteOff()}>
                  Списать
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showColumns ? (
        <ColumnEditorModal
          title="Столбцы склада"
          columns={columns}
          onSave={(next) => void saveColumns(next)}
          onClose={() => setShowColumns(false)}
        />
      ) : null}
    </div>
  );
}