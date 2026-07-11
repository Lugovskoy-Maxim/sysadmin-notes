export type TableColumnType = "text" | "number" | "checkbox";

export type TableColumnDef = {
  id: string;
  label: string;
  type: TableColumnType;
  width?: number;
  visible?: boolean;
  system?: boolean;
};

export type InventoryItem = {
  id: string;
  projectId: string;
  name: string;
  sku?: string | null;
  category?: string | null;
  unit?: string | null;
  location?: string | null;
  quantity: number;
  minStock: number;
  extra: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type InventoryWriteOff = {
  id: string;
  projectId: string;
  itemId: string;
  quantity: number;
  reason?: string | null;
  comment?: string | null;
  createdAt: string;
  item?: { name: string; sku?: string | null; unit?: string | null };
};

export type OfficeRoom = {
  id: string;
  projectId: string;
  name: string;
  building?: string | null;
  floor?: string | null;
  columnDefs: TableColumnDef[];
  rows?: OfficeEquipmentRow[];
  createdAt: string;
  updatedAt: string;
};

export type OfficeEquipmentRow = {
  id: string;
  roomId: string;
  label: string;
  cells: Record<string, string | boolean | number | null>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type NetworkNodeType =
  | "server"
  | "switch"
  | "router"
  | "pc"
  | "printer"
  | "ap"
  | "cloud"
  | "firewall"
  | "nas"
  | "ups"
  | "phone"
  | "other";

export type NetworkNodeStatus = "online" | "offline" | "unknown";

export type Contact = {
  id: string;
  projectId: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  position?: string | null;
  department?: string | null;
  extra?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NetworkNode = {
  id: string;
  label: string;
  type: NetworkNodeType;
  ip?: string;
  hostname?: string;
  mac?: string;
  vlan?: string;
  status?: NetworkNodeStatus;
  x: number;
  y: number;
  notes?: string;
};

export type NetworkEdgeKind = "ethernet" | "wireless" | "fiber" | "vpn";

export type NetworkEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
  kind?: NetworkEdgeKind;
};

export type NetworkMap = {
  id: string;
  projectId: string;
  name: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  createdAt: string;
  updatedAt: string;
};

export const defaultInventoryColumns: TableColumnDef[] = [
  { id: "name", label: "Наименование", type: "text", system: true, visible: true, width: 200 },
  { id: "sku", label: "Артикул", type: "text", system: true, visible: true, width: 110 },
  { id: "category", label: "Категория", type: "text", system: true, visible: true, width: 120 },
  { id: "quantity", label: "Факт. наличие", type: "number", system: true, visible: true, width: 110 },
  { id: "minStock", label: "Неснижаемый остаток", type: "number", system: true, visible: true, width: 140 },
  { id: "unit", label: "Ед. изм.", type: "text", system: true, visible: true, width: 80 },
  { id: "location", label: "Место хранения", type: "text", system: true, visible: true, width: 140 },
];

export const defaultEquipmentColumns: TableColumnDef[] = [
  { id: "label", label: "Сотрудник / место", type: "text", system: true, visible: true, width: 180 },
  { id: "monitor", label: "Монитор", type: "checkbox", visible: true, width: 90 },
  { id: "keyboard", label: "Клавиатура", type: "checkbox", visible: true, width: 100 },
  { id: "mouse", label: "Мышь", type: "checkbox", visible: true, width: 80 },
  { id: "headset", label: "Гарнитура", type: "checkbox", visible: true, width: 90 },
  { id: "phone", label: "Телефон", type: "checkbox", visible: true, width: 90 },
  { id: "chair", label: "Кресло", type: "checkbox", visible: true, width: 90 },
  { id: "notes", label: "Комментарий", type: "text", visible: true, width: 200 },
];

export const networkNodeTypes: { id: NetworkNodeType; label: string }[] = [
  { id: "server", label: "Сервер" },
  { id: "switch", label: "Коммутатор" },
  { id: "router", label: "Маршрутизатор" },
  { id: "firewall", label: "Файрвол" },
  { id: "pc", label: "ПК" },
  { id: "printer", label: "Принтер" },
  { id: "ap", label: "Точка доступа" },
  { id: "nas", label: "NAS" },
  { id: "ups", label: "ИБП" },
  { id: "phone", label: "Телефония" },
  { id: "cloud", label: "Облако" },
  { id: "other", label: "Другое" },
];

export const networkEdgeKinds: { id: NetworkEdgeKind; label: string }[] = [
  { id: "ethernet", label: "Ethernet" },
  { id: "wireless", label: "Wi‑Fi" },
  { id: "fiber", label: "Оптика" },
  { id: "vpn", label: "VPN" },
];

export const networkNodeStatuses: { id: NetworkNodeStatus; label: string }[] = [
  { id: "online", label: "В сети" },
  { id: "offline", label: "Не в сети" },
  { id: "unknown", label: "Неизвестно" },
];