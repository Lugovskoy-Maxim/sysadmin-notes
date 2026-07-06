export type NoteType = "credential" | "instruction" | "schema" | "link";
export type VaultSection = "passwords" | "instructions" | "schemas";
export type AppMode = "vault" | "tasks";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  sortOrder: number;
  projectId: string;
  trackedSeconds?: number;
  timeEntries?: TimeEntry[];
  createdAt: string;
  updatedAt: string;
};

export type TimeEntry = {
  id: string;
  taskId?: string | null;
  projectId: string;
  userId: string;
  startedAt: string;
  endedAt?: string | null;
  duration?: number | null;
  memo?: string | null;
  createdAt: string;
  task?: { id: string; title: string } | null;
  project?: { id: string; name: string; color: string };
};

export type TimeSummary = {
  period: "today" | "week";
  totalSeconds: number;
  byProject: Record<string, number>;
  entriesCount: number;
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  done: "Готово",
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

export const vaultSections: {
  id: VaultSection;
  label: string;
  description: string;
  types: NoteType[];
  createType: NoteType;
  category: string;
}[] = [
  {
    id: "passwords",
    label: "Пароли",
    description: "Доступы из Bitwarden, KeePass и др.",
    types: ["credential"],
    createType: "credential",
    category: "Доступы",
  },
  {
    id: "instructions",
    label: "Инструкции",
    description: "Runbook, процедуры, инциденты",
    types: ["instruction"],
    createType: "instruction",
    category: "Инструкции",
  },
  {
    id: "schemas",
    label: "Схемы и заметки",
    description: "Диаграммы, таблицы, документация",
    types: ["schema", "link"],
    createType: "schema",
    category: "Заметки",
  },
];
export type Theme = "light" | "dark";

export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
  _count?: { notes: number };
};

export type Attachment = {
  id: string;
  filename: string;
  path: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type Note = {
  id: string;
  title: string;
  type: NoteType;
  category: string;
  url?: string | null;
  host?: string | null;
  port?: string | null;
  login?: string | null;
  password?: string | null;
  totpSecret?: string | null;
  sshKey?: string | null;
  memo?: string | null;
  tags: string[];
  content: Record<string, unknown>;
  favorite: boolean;
  pinned: boolean;
  archived: boolean;
  projectId: string;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string; color: string };
  encrypted?: boolean;
};

export type ShareMode = "masked" | "full" | "passwords";

export type ShareLink = {
  id: string;
  token: string;
  title?: string | null;
  noteId?: string | null;
  projectId?: string | null;
  expiresAt?: string | null;
  viewOnly: boolean;
  shareMode: ShareMode;
  passwordHash?: string | null;
  createdAt: string;
};

export type SharePublicPayload =
  | { type: "note"; note: Note; share: ShareMeta }
  | { type: "project"; project: Project & { notes: Note[] }; share: ShareMeta };

export type ShareMeta = {
  viewOnly: boolean;
  shareMode: ShareMode;
  title?: string | null;
  createdAt: string;
  passwordProtected: boolean;
};

export const typeLabels: Record<NoteType, string> = {
  credential: "Пароль",
  instruction: "Инструкция",
  schema: "Схема",
  link: "Ссылка",
};

export const typeColors: Record<NoteType, string> = {
  credential: "#b45309",
  instruction: "#087f72",
  schema: "#7c3aed",
  link: "#2563eb",
};

export const projectIcons = ["server", "cloud", "database", "shield", "network", "terminal"] as const;

export const projectColors = [
  "#087f72",
  "#2563eb",
  "#7c3aed",
  "#b45309",
  "#be123c",
  "#0f766e",
] as const;

export const noteTemplates: {
  label: string;
  type: NoteType;
  title: string;
  category: string;
  content?: Record<string, unknown>;
}[] = [
  {
    label: "Доступ",
    type: "credential",
    title: "Новый доступ",
    category: "Доступы",
    content: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Назначение" }] },
        { type: "paragraph", content: [{ type: "text", text: "Опишите для чего этот доступ." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Проверка" }] },
        { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Проверить ping" }] }] }] },
      ],
    },
  },
  {
    label: "Инструкция",
    type: "instruction",
    title: "Новая инструкция",
    category: "Инструкции",
    content: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Шаги" }] },
        { type: "orderedList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Шаг 1" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Шаг 2" }] }] },
        ]},
      ],
    },
  },
  {
    label: "Инцидент",
    type: "instruction",
    title: "Инцидент",
    category: "Серверы",
    content: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Симптомы" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Диагностика" }] },
        { type: "codeBlock", attrs: { language: "bash" }, content: [{ type: "text", text: "# команды" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Решение" }] },
      ],
    },
  },
  {
    label: "Схема",
    type: "schema",
    title: "Новая схема",
    category: "Заметки",
    content: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Описание" }] },
        { type: "paragraph", content: [{ type: "text", text: "Схема, диаграмма или заметка." }] },
      ],
    },
  },
  {
    label: "Сервер",
    type: "credential",
    title: "Новый сервер",
    category: "Серверы",
    content: {
      type: "doc",
      content: [
        { type: "table", content: [
          { type: "tableRow", content: [
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Сервис" }] }] },
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Порт" }] }] },
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Статус" }] }] },
          ]},
          { type: "tableRow", content: [
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "SSH" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "22" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "OK" }] }] },
          ]},
        ]},
      ],
    },
  },
];

export const categories = ["Все", "Доступы", "Инструкции", "Сеть", "Серверы", "Сайты", "Архив", "Избранное"] as const;