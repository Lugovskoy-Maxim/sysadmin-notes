import type { NoteType } from "./types";

export type FieldKey =
  | "host"
  | "port"
  | "url"
  | "login"
  | "password"
  | "totpSecret"
  | "sshKey"
  | "memo"
  | "content"
  | "attachments";

export type FieldMeta = {
  key: FieldKey;
  label: string;
  hint: string;
  placeholder?: string;
  wide?: boolean;
  mono?: boolean;
  secret?: boolean;
  multiline?: boolean;
};

export type SectionDef = {
  id: string;
  title: string;
  fields: FieldKey[];
};

export const typeMeta: Record<
  NoteType,
  { label: string; description: string; accent: string; icon: string; sections: SectionDef[] }
> = {
  credential: {
    label: "Пароль",
    description: "Логины, пароли, TOTP и SSH-ключи",
    accent: "var(--type-credential)",
    icon: "key",
    sections: [
      { id: "conn", title: "Подключение", fields: ["host", "port", "url"] },
      { id: "auth", title: "Аутентификация", fields: ["login", "password", "totpSecret"] },
      { id: "keys", title: "Ключи и заметки", fields: ["sshKey", "memo"] },
    ],
  },
  instruction: {
    label: "Инструкция",
    description: "Пошаговые руководства, runbook и процедуры",
    accent: "var(--type-instruction)",
    icon: "book",
    sections: [
      { id: "brief", title: "Кратко", fields: ["memo"] },
      { id: "procedure", title: "Процедура", fields: ["content"] },
      { id: "ref", title: "Справочно", fields: ["host", "url", "login"] },
      { id: "files", title: "Материалы", fields: ["attachments"] },
    ],
  },
  schema: {
    label: "Схема / заметка",
    description: "Диаграммы, таблицы, документация и черновики",
    accent: "var(--type-schema)",
    icon: "schema",
    sections: [
      { id: "brief", title: "Кратко", fields: ["memo"] },
      { id: "body", title: "Содержимое", fields: ["content"] },
      { id: "links", title: "Ссылки", fields: ["url", "host"] },
      { id: "files", title: "Материалы", fields: ["attachments"] },
    ],
  },
  link: {
    label: "Ссылка",
    description: "URL, панели, дашборды и внешние ресурсы",
    accent: "var(--type-link)",
    icon: "link",
    sections: [
      { id: "resource", title: "Ресурс", fields: ["url", "host", "port"] },
      { id: "access", title: "Доступ", fields: ["login", "password"] },
      { id: "desc", title: "Описание", fields: ["memo", "content"] },
      { id: "shots", title: "Скриншоты", fields: ["attachments"] },
    ],
  },
};

export const fieldMeta: Record<FieldKey, FieldMeta> = {
  host: { key: "host", label: "Хост / IP", hint: "Адрес сервера или устройства", placeholder: "192.168.1.10 или server.local" },
  port: { key: "port", label: "Порт", hint: "SSH, RDP, HTTP и т.д.", placeholder: "22" },
  url: { key: "url", label: "URL", hint: "Полная ссылка на панель или сервис", placeholder: "https://panel.example.com", wide: true },
  login: { key: "login", label: "Логин", hint: "Имя пользователя или email", placeholder: "admin", wide: true },
  password: { key: "password", label: "Пароль", hint: "Основной пароль доступа", secret: true, wide: true },
  totpSecret: { key: "totpSecret", label: "TOTP / 2FA", hint: "Секрет для аутентификатора", secret: true, placeholder: "BASE32SECRET", wide: true },
  sshKey: { key: "sshKey", label: "SSH-ключ", hint: "Приватный ключ или путь к нему", multiline: true, mono: true, wide: true },
  memo: { key: "memo", label: "Заметка", hint: "Контекст, срок действия, кому выдан доступ", placeholder: "Краткое описание…", wide: true },
  content: { key: "content", label: "Контент", hint: "Основное содержимое", wide: true },
  attachments: { key: "attachments", label: "Вложения", hint: "Скриншоты и изображения", wide: true },
};

const SECRET_KEYS: FieldKey[] = ["password", "totpSecret"];

export function sectionHasData(
  section: SectionDef,
  note: {
    content: Record<string, unknown>;
    attachments: { length: number };
    host?: string | null;
    port?: string | null;
    url?: string | null;
    login?: string | null;
    password?: string | null;
    totpSecret?: string | null;
    sshKey?: string | null;
    memo?: string | null;
  },
  hasRichContent: (content: Record<string, unknown>) => boolean,
): boolean {
  return section.fields.some((key) => {
    if (key === "content") return hasRichContent(note.content);
    if (key === "attachments") return note.attachments.length > 0;
    const value = note[key as keyof typeof note];
    return typeof value === "string" && value.trim().length > 0;
  });
}

export function sectionSummary(
  section: SectionDef,
  note: Parameters<typeof sectionHasData>[1],
  preview: (content: Record<string, unknown>, max?: number) => string,
): string {
  const parts: string[] = [];
  for (const key of section.fields) {
    if (key === "content") {
      const text = preview(note.content, 48);
      if (text) parts.push(text);
      continue;
    }
    if (key === "attachments") {
      if (note.attachments.length) parts.push(`${note.attachments.length} файл.`);
      continue;
    }
    const raw = note[key as keyof typeof note];
    if (typeof raw !== "string" || !raw.trim()) continue;
    parts.push(SECRET_KEYS.includes(key) ? "••••••" : raw.length > 28 ? `${raw.slice(0, 28)}…` : raw);
  }
  return parts.slice(0, 3).join(" · ");
}

export const categorySuggestions: Record<NoteType, string[]> = {
  credential: ["Доступы", "Сеть", "Серверы", "Базы данных", "Панели", "Bitwarden", "KeePass"],
  instruction: ["Инструкции", "Деплой", "Инциденты", "Runbook", "Восстановление"],
  schema: ["Заметки", "Схемы", "Документация", "Архитектура", "Сеть"],
  link: ["Сайты", "Мониторинг", "Документация", "API", "Панели"],
};