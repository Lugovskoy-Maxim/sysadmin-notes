"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, DoorOpen, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import {
  defaultEquipmentColumns,
  type OfficeEquipmentRow,
  type OfficeRoom,
  type TableColumnDef,
} from "@/lib/facility-types";
import { useToast } from "@/lib/toast";
import { debounceByKey } from "@/lib/utils";
import { DynamicDataTable } from "@/components/ui/DynamicDataTable";
import { ColumnEditorModal } from "@/components/ColumnEditorModal";

type EquipmentPanelProps = {
  token: string;
  projectId: string;
};

export function EquipmentPanel({ token, projectId }: EquipmentPanelProps) {
  const toast = useToast((s) => s.push);
  const [rooms, setRooms] = useState<OfficeRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [columns, setColumns] = useState<TableColumnDef[]>(defaultEquipmentColumns);
  const [loading, setLoading] = useState(true);
  const [showColumns, setShowColumns] = useState(false);
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? rooms[0] ?? null;
  const rows = selectedRoom?.rows ?? [];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [roomList, defs] = await Promise.all([
        api.facility.listRooms(token, projectId),
        api.facility.getColumnDefs(token, projectId),
      ]);
      setRooms(roomList);
      setColumns(defs.equipmentColumnDefs.length ? defs.equipmentColumnDefs : defaultEquipmentColumns);
      setSelectedRoomId((current) => current ?? roomList[0]?.id ?? null);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось загрузить оснащение", "error");
    } finally {
      setLoading(false);
    }
  }, [token, projectId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addRoom() {
    try {
      const created = await api.facility.createRoom(token, {
        projectId,
        name: "Новый кабинет",
      });
      setRooms((current) => [...current, created]);
      setSelectedRoomId(created.id);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось создать кабинет", "error");
    }
  }

  async function updateRoomField(room: OfficeRoom, field: "name" | "building" | "floor", value: string) {
    try {
      const updated = await api.facility.updateRoom(token, room.id, { [field]: value });
      setRooms((current) =>
        current.map((item) => (item.id === room.id ? { ...updated, rows: item.rows } : item)),
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : "Ошибка сохранения", "error");
    }
  }

  async function deleteRoom(room: OfficeRoom) {
    if (!confirm(`Удалить кабинет «${room.name}»?`)) return;
    try {
      await api.facility.removeRoom(token, room.id);
      setRooms((current) => {
        const next = current.filter((item) => item.id !== room.id);
        setSelectedRoomId(next[0]?.id ?? null);
        return next;
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось удалить", "error");
    }
  }

  async function addRow() {
    if (!selectedRoom) return;
    try {
      const created = await api.facility.createEquipmentRow(token, { roomId: selectedRoom.id, label: "Новая строка" });
      setRooms((current) =>
        current.map((room) =>
          room.id === selectedRoom.id ? { ...room, rows: [...(room.rows ?? []), created] } : room,
        ),
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось добавить строку", "error");
    }
  }

  function updateRow(row: OfficeEquipmentRow, columnId: string, value: string | number | boolean) {
    if (!selectedRoom) return;
    const patch =
      columnId === "label"
        ? { label: String(value) }
        : { cells: { ...row.cells, [columnId]: value } };

    setRooms((current) =>
      current.map((room) =>
        room.id === selectedRoom.id
          ? {
              ...room,
              rows: (room.rows ?? []).map((item) =>
                item.id === row.id
                  ? columnId === "label"
                    ? { ...item, label: String(value) }
                    : { ...item, cells: { ...item.cells, [columnId]: value } }
                  : item,
              ),
            }
          : room,
      ),
    );

    debounceByKey(saveTimers.current, `${row.id}:${columnId}`, () => {
      void (async () => {
        try {
          const updated = await api.facility.updateEquipmentRow(token, row.id, patch);
          setRooms((current) =>
            current.map((room) =>
              room.id === selectedRoom.id
                ? { ...room, rows: (room.rows ?? []).map((item) => (item.id === row.id ? updated : item)) }
                : room,
            ),
          );
        } catch (error) {
          toast(error instanceof Error ? error.message : "Ошибка сохранения", "error");
        }
      })();
    });
  }

  async function deleteRow(row: OfficeEquipmentRow) {
    if (!selectedRoom) return;
    try {
      await api.facility.removeEquipmentRow(token, row.id);
      setRooms((current) =>
        current.map((room) =>
          room.id === selectedRoom.id
            ? { ...room, rows: (room.rows ?? []).filter((item) => item.id !== row.id) }
            : room,
        ),
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось удалить строку", "error");
    }
  }

  async function saveColumns(next: TableColumnDef[]) {
    try {
      const saved = await api.facility.updateColumnDefs(token, projectId, { equipmentColumnDefs: next });
      setColumns(saved.equipmentColumnDefs);
      setShowColumns(false);
      toast("Столбцы сохранены", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось сохранить столбцы", "error");
    }
  }

  function getCellValue(row: OfficeEquipmentRow, column: TableColumnDef) {
    if (column.id === "label") return row.label;
    const value = row.cells[column.id];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
    return column.type === "checkbox" ? false : "";
  }

  if (loading) return <div className="facility-loading">Загрузка оснащения…</div>;

  return (
    <div className="facility-panel equipment-panel">
      <div className="equipment-layout">
        <aside className="equipment-rooms">
          <div className="equipment-rooms-head">
            <h3>Кабинеты</h3>
            <button type="button" className="icon-button small-btn" onClick={() => void addRoom()} title="Добавить кабинет">
              <Plus size={16} />
            </button>
          </div>
          {rooms.length ? (
            <nav>
              {rooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  className={selectedRoom?.id === room.id ? "active" : ""}
                  onClick={() => setSelectedRoomId(room.id)}
                >
                  <DoorOpen size={14} />
                  <span>
                    <strong>{room.name}</strong>
                    <small>
                      {[room.building, room.floor].filter(Boolean).join(" · ") || "Без адреса"}
                    </small>
                  </span>
                  <em>{room.rows?.length ?? 0}</em>
                </button>
              ))}
            </nav>
          ) : (
            <p className="equipment-empty">Добавьте первый кабинет</p>
          )}
        </aside>

        <section className="equipment-main">
          {selectedRoom ? (
            <>
              <header className="equipment-room-head">
                <div className="equipment-room-fields">
                  <label>
                    <Building2 size={14} />
                    <input
                      className="text-field"
                      value={selectedRoom.name}
                      onChange={(e) => void updateRoomField(selectedRoom, "name", e.target.value)}
                    />
                  </label>
                  <input
                    className="text-field"
                    placeholder="Здание"
                    value={selectedRoom.building ?? ""}
                    onChange={(e) => void updateRoomField(selectedRoom, "building", e.target.value)}
                  />
                  <input
                    className="text-field"
                    placeholder="Этаж"
                    value={selectedRoom.floor ?? ""}
                    onChange={(e) => void updateRoomField(selectedRoom, "floor", e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="ghost-button compact danger"
                  onClick={() => void deleteRoom(selectedRoom)}
                >
                  <Trash2 size={14} />
                  Удалить кабинет
                </button>
              </header>

              <DynamicDataTable
                columns={columns}
                rows={rows}
                getCellValue={getCellValue}
                onCellChange={(row, columnId, value) => void updateRow(row, columnId, value)}
                onRowDelete={(row) => void deleteRow(row)}
                onAddRow={() => void addRow()}
                onEditColumns={() => setShowColumns(true)}
                onColumnResize={(columnId, width) =>
                  setColumns((current) => current.map((col) => (col.id === columnId ? { ...col, width } : col)))
                }
                emptyLabel="Добавьте строки оснащения для этого кабинета."
              />
            </>
          ) : (
            <div className="equipment-placeholder">
              <DoorOpen size={40} strokeWidth={1.2} />
              <strong>Выберите или создайте кабинет</strong>
            </div>
          )}
        </section>
      </div>

      {showColumns ? (
        <ColumnEditorModal
          title="Столбцы оснащения"
          columns={columns}
          onSave={(next) => void saveColumns(next)}
          onClose={() => setShowColumns(false)}
        />
      ) : null}
    </div>
  );
}