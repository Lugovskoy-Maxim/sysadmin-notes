"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type NoteType = "credential" | "instruction" | "link";

type Attachment = {
  id: string;
  name: string;
  dataUrl: string;
};

type Note = {
  id: string;
  title: string;
  category: string;
  type: NoteType;
  url: string;
  login: string;
  password: string;
  tags: string[];
  body: string;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
  favorite: boolean;
  pinned: boolean;
  archived: boolean;
};

type AuditEvent = {
  id: string;
  action: string;
  noteTitle?: string;
  at: string;
};

type VaultPayload = {
  version: 1;
  notes: Note[];
  audit?: AuditEvent[];
};

const STORAGE_KEY = "sysadmin-notes-vault";
const ITERATIONS = 180_000;

const seedNotes: Note[] = [
  {
    id: "note-router",
    title: "Роутер офиса",
    category: "Сеть",
    type: "credential",
    url: "https://192.168.1.1",
    login: "admin",
    password: "change-me",
    tags: ["router", "wifi", "office"],
    body: "Проверить WAN, DHCP lease и резервный DNS. Картинки с настройками можно добавить справа через загрузку файлов.",
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    favorite: true,
    pinned: true,
    archived: false,
  },
  {
    id: "note-deploy",
    title: "Инструкция по деплою панели",
    category: "Инструкции",
    type: "instruction",
    url: "https://example.local",
    login: "",
    password: "",
    tags: ["deploy", "docker", "nginx"],
    body: "1. Обновить репозиторий.\n2. Проверить .env.\n3. Выполнить docker compose up -d.\n4. Открыть журнал и проверить healthcheck.",
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    favorite: false,
    pinned: false,
    archived: false,
  },
];

const categories = ["Все", "Доступы", "Инструкции", "Сеть", "Серверы", "Сайты", "Архив"];

const sortLabels = {
  updated: "Сначала новые",
  title: "По названию",
  type: "По типу",
} as const;

const typeLabels: Record<NoteType, string> = {
  credential: "Доступ",
  instruction: "Инструкция",
  link: "Ссылка",
};

const noteTemplates = [
  {
    label: "Доступ",
    type: "credential" as NoteType,
    title: "Новый доступ",
    category: "Доступы",
    body: "Назначение:\n\nПроверка доступа:\n\nГде используется:\n\nЧто делать при сбое:",
  },
  {
    label: "Инструкция",
    type: "instruction" as NoteType,
    title: "Новая инструкция",
    category: "Инструкции",
    body: "Цель:\n\nШаги:\n1. \n2. \n3. \n\nПроверка результата:\n\nОткат:",
  },
  {
    label: "Инцидент",
    type: "instruction" as NoteType,
    title: "Инцидент",
    category: "Серверы",
    body: "Симптомы:\n\nДиагностика:\n\nКоманды:\n\nПричина:\n\nРешение:",
  },
];

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function makeId(prefix = "note") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function makePassword(length = 20) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_=+?";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function passwordScore(password: string) {
  let score = 0;
  if (password.length >= 12) score += 1;
  if (password.length >= 18) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 5);
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function normalizeNote(note: Partial<Note>): Note {
  const now = new Date().toISOString();

  return {
    id: note.id ?? makeId(),
    title: note.title ?? "Без названия",
    category: note.category ?? "Доступы",
    type: note.type ?? "credential",
    url: note.url ?? "",
    login: note.login ?? "",
    password: note.password ?? "",
    tags: note.tags ?? [],
    body: note.body ?? "",
    attachments: note.attachments ?? [],
    createdAt: note.createdAt ?? note.updatedAt ?? now,
    updatedAt: note.updatedAt ?? now,
    favorite: Boolean(note.favorite),
    pinned: Boolean(note.pinned),
    archived: Boolean(note.archived),
  };
}

function normalizeVault(payload: Partial<VaultPayload>): VaultPayload {
  return {
    version: 1,
    notes: (payload.notes ?? []).map(normalizeNote),
    audit: (payload.audit ?? []).slice(0, 60),
  };
}

function renderPreview(body: string) {
  if (!body.trim()) {
    return <p className="preview-muted">Нет текста для предпросмотра.</p>;
  }

  return body.split("\n").map((line, index) => {
    const key = `${index}-${line}`;
    const trimmed = line.trim();

    if (!trimmed) return <br key={key} />;
    if (/^\d+\.\s/.test(trimmed) || /^[-*]\s/.test(trimmed)) {
      return (
        <p className="preview-step" key={key}>
          {trimmed}
        </p>
      );
    }
    if (trimmed.endsWith(":")) {
      return (
        <h4 key={key}>
          {trimmed}
        </h4>
      );
    }
    return <p key={key}>{line}</p>;
  });
}

async function deriveKey(masterPassword: string, salt: Uint8Array) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(encoder.encode(masterPassword)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptVault(payload: VaultPayload, masterPassword: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(masterPassword, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(encoder.encode(JSON.stringify(payload))),
  );

  return JSON.stringify({
    version: 1,
    kdf: "PBKDF2-SHA256",
    iterations: ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted)),
  });
}

async function decryptVault(stored: string, masterPassword: string): Promise<VaultPayload> {
  const parsed = JSON.parse(stored);
  const salt = base64ToBytes(parsed.salt);
  const iv = base64ToBytes(parsed.iv);
  const encrypted = base64ToBytes(parsed.data);
  const key = await deriveKey(masterPassword, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(encrypted),
  );
  return normalizeVault(JSON.parse(decoder.decode(decrypted)));
}

function Icon({
  name,
}: {
  name: "lock" | "plus" | "search" | "copy" | "eye" | "image" | "link" | "download" | "upload" | "refresh" | "trash";
}) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "lock") {
    return (
      <svg {...common}>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }
  if (name === "plus") {
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }
  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    );
  }
  if (name === "copy") {
    return (
      <svg {...common}>
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <rect x="4" y="4" width="11" height="11" rx="2" />
      </svg>
    );
  }
  if (name === "eye") {
    return (
      <svg {...common}>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  if (name === "image") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8" cy="10" r="1.5" />
        <path d="m21 15-4.5-4.5L7 20" />
      </svg>
    );
  }
  if (name === "download") {
    return (
      <svg {...common}>
        <path d="M12 4v11" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 20h14" />
      </svg>
    );
  }
  if (name === "upload") {
    return (
      <svg {...common}>
        <path d="M12 20V9" />
        <path d="m7 14 5-5 5 5" />
        <path d="M5 4h14" />
      </svg>
    );
  }
  if (name === "refresh") {
    return (
      <svg {...common}>
        <path d="M20 12a8 8 0 0 1-14.9 4" />
        <path d="M4 12A8 8 0 0 1 18.9 8" />
        <path d="M18 4v4h-4" />
        <path d="M6 20v-4h4" />
      </svg>
    );
  }
  if (name === "trash") {
    return (
      <svg {...common}>
        <path d="M4 7h16" />
        <path d="M10 11v6M14 11v6" />
        <path d="M6 7l1 14h10l1-14" />
        <path d="M9 7V4h6v3" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1" />
    </svg>
  );
}

export default function Home() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [notes, setNotes] = useState<Note[]>(seedNotes);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [selectedId, setSelectedId] = useState(seedNotes[0].id);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Все");
  const [sortMode, setSortMode] = useState<keyof typeof sortLabels>("updated");
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [saveState, setSaveState] = useState("Локально, не сохранено");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isUnlocked || !masterPassword) return;

    const timeout = window.setTimeout(async () => {
      try {
        const serialized = await encryptVault({ version: 1, notes, audit }, masterPassword);
        localStorage.setItem(STORAGE_KEY, serialized);
        setSaveState(`Сохранено ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`);
      } catch {
        setSaveState("Ошибка сохранения");
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [audit, isUnlocked, masterPassword, notes]);

  const selectedNote = notes.find((note) => note.id === selectedId) ?? notes[0];
  const currentCategories = useMemo(() => {
    return Array.from(new Set([...categories, ...notes.map((note) => note.category).filter(Boolean), "Избранное"]));
  }, [notes]);

  const allTags = useMemo(() => {
    return Array.from(new Set(notes.flatMap((note) => note.tags))).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const matches = notes.filter((note) => {
      const categoryMatch =
        activeCategory === "Все" ||
        (activeCategory === "Избранное" && note.favorite) ||
        (activeCategory === "Архив" && note.archived) ||
        note.category === activeCategory;
      const archiveMatch = activeCategory === "Архив" ? note.archived : !note.archived;
      const queryMatch =
        !normalizedQuery ||
        [note.title, note.category, note.url, note.login, note.body, note.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return archiveMatch && categoryMatch && queryMatch;
    });

    return [...matches].sort((left, right) => {
      if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
      if (sortMode === "title") return left.title.localeCompare(right.title, "ru");
      if (sortMode === "type") return typeLabels[left.type].localeCompare(typeLabels[right.type], "ru");
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  }, [activeCategory, notes, query, sortMode]);

  const stats = useMemo(() => {
    return {
      credentials: notes.filter((note) => note.type === "credential").length,
      instructions: notes.filter((note) => note.type === "instruction").length,
      attachments: notes.reduce((sum, note) => sum + note.attachments.length, 0),
      archived: notes.filter((note) => note.archived).length,
    };
  }, [notes]);

  const selectedPasswordScore = passwordScore(selectedNote?.password ?? "");

  async function unlock() {
    setUnlockError("");

    if (!masterPassword.trim()) {
      setUnlockError("Введите мастер-пароль.");
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setNotes(seedNotes);
      setAudit([
        {
          id: makeId("audit"),
          action: "Создан сейф",
          at: new Date().toISOString(),
        },
      ]);
      setSelectedId(seedNotes[0].id);
      setIsUnlocked(true);
      setSaveState("Создан новый зашифрованный сейф");
      return;
    }

    try {
      const payload = await decryptVault(stored, masterPassword);
      setNotes(payload.notes);
      setAudit(payload.audit ?? []);
      setSelectedId(payload.notes[0]?.id ?? "");
      setIsUnlocked(true);
      setSaveState("Сейф разблокирован");
    } catch {
      setUnlockError("Не удалось открыть сейф. Проверьте мастер-пароль.");
    }
  }

  function updateSelected(patch: Partial<Note>) {
    if (!selectedNote) return;

    setNotes((current) =>
      current.map((note) =>
        note.id === selectedNote.id ? { ...note, ...patch, updatedAt: new Date().toISOString() } : note,
      ),
    );
    setSaveState("Сохраняю...");
  }

  function pushAudit(action: string, noteTitle?: string) {
    setAudit((current) =>
      [
        {
          id: makeId("audit"),
          action,
          noteTitle,
          at: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 60),
    );
  }

  function createNote(type: NoteType = "credential", template = noteTemplates.find((item) => item.type === type)) {
    const nextNote: Note = {
      id: makeId(),
      title: template?.title ?? (type === "instruction" ? "Новая инструкция" : "Новый доступ"),
      category: template?.category ?? (type === "instruction" ? "Инструкции" : "Доступы"),
      type,
      url: "",
      login: "",
      password: "",
      tags: [],
      body: template?.body ?? "",
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      favorite: false,
      pinned: false,
      archived: false,
    };
    setNotes((current) => [nextNote, ...current]);
    setSelectedId(nextNote.id);
    setVisiblePassword(false);
    setPreviewMode(false);
    pushAudit("Создана заметка", nextNote.title);
    setSaveState("Сохраняю...");
  }

  function createFromTemplate(template: (typeof noteTemplates)[number]) {
    createNote(template.type, template);
  }

  function duplicateSelected() {
    if (!selectedNote) return;
    const copy: Note = {
      ...selectedNote,
      id: makeId(),
      title: `${selectedNote.title} копия`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false,
    };
    setNotes((current) => [copy, ...current]);
    setSelectedId(copy.id);
    pushAudit("Сделана копия", selectedNote.title);
    setSaveState("Сохраняю...");
  }

  function deleteSelected() {
    if (!selectedNote) return;
    const nextNotes = notes.filter((note) => note.id !== selectedNote.id);
    setNotes(nextNotes);
    setSelectedId(nextNotes[0]?.id ?? "");
    pushAudit("Удалена заметка", selectedNote.title);
    setSaveState("Сохраняю...");
  }

  function toggleArchiveSelected() {
    if (!selectedNote) return;
    updateSelected({ archived: !selectedNote.archived, pinned: selectedNote.archived ? selectedNote.pinned : false });
    pushAudit(selectedNote.archived ? "Возвращена из архива" : "Перемещена в архив", selectedNote.title);
  }

  function lockVault() {
    setIsUnlocked(false);
    setMasterPassword("");
    setVisiblePassword(false);
    setUnlockError("");
    setNotes(seedNotes);
    setAudit([]);
    setSelectedId(seedNotes[0].id);
    setSaveState("Сейф заблокирован");
  }

  async function exportVault() {
    if (!masterPassword) return;

    const serialized = await encryptVault({ version: 1, notes, audit }, masterPassword);
    localStorage.setItem(STORAGE_KEY, serialized);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadText(`sysadmin-notes-vault-${stamp}.json`, serialized);
    pushAudit("Экспорт сейфа");
    setSaveState("Экспорт готов");
  }

  function exportSelectedNote() {
    if (!selectedNote) return;

    downloadText(
      `${selectedNote.title.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-").replace(/^-|-$/g, "") || "note"}.json`,
      JSON.stringify(selectedNote, null, 2),
    );
    pushAudit("Экспорт заметки", selectedNote.title);
    setSaveState("Заметка экспортирована");
  }

  async function importVault(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const payload = await decryptVault(text, masterPassword);
      if (!Array.isArray(payload.notes)) throw new Error("Invalid vault");
      localStorage.setItem(STORAGE_KEY, text);
      setNotes(payload.notes);
      setAudit(payload.audit ?? []);
      setSelectedId(payload.notes[0]?.id ?? "");
      setActiveCategory("Все");
      setQuery("");
      setSaveState("Импортировано");
      pushAudit("Импорт сейфа");
    } catch {
      setSaveState("Импорт не удался");
    } finally {
      event.target.value = "";
    }
  }

  function updateTags(raw: string) {
    updateSelected({
      tags: raw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
  }

  async function copyText(value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setSaveState("Скопировано");
    } catch {
      setSaveState("Буфер обмена недоступен");
    }
  }

  function generatePassword() {
    const password = makePassword();
    updateSelected({ password });
    setVisiblePassword(true);
    void copyText(password);
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length || !selectedNote) return;

    const attachments = await Promise.all(
      files.map(
        (file) =>
          new Promise<Attachment>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                id: makeId("image"),
                name: file.name,
                dataUrl: String(reader.result),
              });
            };
            reader.readAsDataURL(file);
          }),
      ),
    );

    updateSelected({ attachments: [...selectedNote.attachments, ...attachments] });
    event.target.value = "";
  }

  function removeAttachment(attachmentId: string) {
    if (!selectedNote) return;
    updateSelected({
      attachments: selectedNote.attachments.filter((attachment) => attachment.id !== attachmentId),
    });
  }

  if (!isUnlocked) {
    return (
      <main className="vault-gate">
        <section className="unlock-card" aria-labelledby="unlock-title">
          <div className="brand-mark">
            <Icon name="lock" />
          </div>
          <p className="overline">Локальный сейф</p>
          <h1 id="unlock-title">Sysadmin Notes</h1>
          <p className="unlock-copy">
            Локальная база заметок для доступов, ссылок и инструкций. Данные остаются в браузере и
            шифруются мастер-паролем.
          </p>
          <label className="field-label" htmlFor="master-password">
            Мастер-пароль
          </label>
          <input
            id="master-password"
            className="text-field"
            type="password"
            autoFocus
            value={masterPassword}
            onChange={(event) => setMasterPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void unlock();
            }}
            placeholder="Введите мастер-пароль"
          />
          {unlockError ? <p className="error-text">{unlockError}</p> : null}
          <button className="primary-button full" onClick={() => void unlock()}>
            <Icon name="lock" />
            Открыть сейф
          </button>
          <p className="fine-print">
            Восстановления мастер-пароля нет. Для важных данных храните резервную копию браузерного профиля.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Разделы">
        <div className="app-title">
          <div className="brand-mark small">
            <Icon name="lock" />
          </div>
          <div>
            <h1>Sysadmin Notes</h1>
            <p>{saveState}</p>
          </div>
        </div>

        <button className="primary-button" onClick={() => createNote("credential")}>
          <Icon name="plus" />
          Новая заметка
        </button>

        <div className="template-strip" aria-label="Шаблоны заметок">
          {noteTemplates.map((template) => (
            <button key={template.label} onClick={() => createFromTemplate(template)}>
              {template.label}
            </button>
          ))}
        </div>

        <div className="vault-actions" aria-label="Действия с сейфом">
          <button className="ghost-button compact" onClick={() => void exportVault()}>
            <Icon name="download" />
            Экспорт
          </button>
          <button className="ghost-button compact" onClick={() => importInputRef.current?.click()}>
            <Icon name="upload" />
            Импорт
          </button>
          <button className="ghost-button compact" onClick={lockVault}>
            <Icon name="lock" />
            Блок
          </button>
          <input
            ref={importInputRef}
            hidden
            type="file"
            accept="application/json,.json"
            onChange={(event) => void importVault(event)}
          />
        </div>

        <div className="search-box">
          <Icon name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по заметкам"
            aria-label="Поиск по заметкам"
          />
        </div>

        <div className="mini-stats" aria-label="Статистика">
          <span>
            <strong>{stats.credentials}</strong>
            доступов
          </span>
          <span>
            <strong>{stats.instructions}</strong>
            инструкций
          </span>
          <span>
            <strong>{stats.attachments}</strong>
            файлов
          </span>
          <span>
            <strong>{stats.archived}</strong>
            архив
          </span>
        </div>

        <nav className="category-list">
          {currentCategories.map((category) => (
            <button
              className={category === activeCategory ? "active" : ""}
              key={category}
              onClick={() => setActiveCategory(category)}
            >
              <span>{category}</span>
              <strong>
                {category === "Все"
                  ? notes.filter((note) => !note.archived).length
                  : category === "Избранное"
                    ? notes.filter((note) => note.favorite && !note.archived).length
                    : category === "Архив"
                      ? notes.filter((note) => note.archived).length
                    : notes.filter((note) => note.category === category && !note.archived).length}
              </strong>
            </button>
          ))}
        </nav>

        <section className="audit-log" aria-label="Журнал">
          <div>
            <p className="overline">Журнал</p>
            <strong>{audit.length ? "Последние действия" : "Пока пусто"}</strong>
          </div>
          {audit.slice(0, 4).map((item) => (
            <span key={item.id}>
              {item.action}
              {item.noteTitle ? ` · ${item.noteTitle}` : ""}
            </span>
          ))}
        </section>

        <div className="tag-cloud" aria-label="Теги">
          {allTags.slice(0, 12).map((tag) => (
            <button key={tag} onClick={() => setQuery(tag)}>
              #{tag}
            </button>
          ))}
        </div>
      </aside>

      <section className="note-list" aria-label="Заметки">
        <div className="list-header">
          <div>
            <p className="overline">База</p>
            <h2>{filteredNotes.length} заметок</h2>
          </div>
          <div className="list-tools">
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as keyof typeof sortLabels)}
              aria-label="Сортировка"
            >
              {Object.entries(sortLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
            <button className="ghost-button" onClick={() => createNote("instruction")}>
              Инструкция
            </button>
          </div>
        </div>

        <div className="notes-stack">
          {filteredNotes.length ? (
            filteredNotes.map((note) => (
            <button
              className={`note-row ${note.id === selectedNote?.id ? "selected" : ""}`}
              key={note.id}
              onClick={() => {
                setSelectedId(note.id);
                setVisiblePassword(false);
              }}
            >
              <span className="note-row-top">
                <strong>
                  {note.pinned ? "▲ " : ""}
                  {note.title}
                </strong>
                <small>{typeLabels[note.type]}</small>
              </span>
              <span className="note-url">{note.url || note.category}</span>
              <span className="note-meta">
                {note.favorite ? "★ " : ""}
                {note.archived ? "Архив · " : ""}
                {formatDate(note.updatedAt)}
                {note.attachments.length ? ` · ${note.attachments.length} фото` : ""}
              </span>
              <span className="note-tags">
                {note.tags.slice(0, 3).map((tag) => (
                  <em key={tag}>{tag}</em>
                ))}
              </span>
            </button>
            ))
          ) : (
            <div className="empty-list">
              <strong>Ничего не найдено</strong>
              <span>Очистите поиск или выберите другую категорию.</span>
            </div>
          )}
        </div>
      </section>

      {selectedNote ? (
        <section className="editor" aria-label="Редактор заметки">
          <header className="editor-header">
            <div>
              <p className="overline">Редактор</p>
              <input
                className="title-input"
                value={selectedNote.title}
                onChange={(event) => updateSelected({ title: event.target.value })}
                aria-label="Название заметки"
              />
              <span className="editor-meta">Изменено {formatDate(selectedNote.updatedAt)}</span>
            </div>
            <div className="header-actions">
              <button
                className={`icon-button ${selectedNote.favorite ? "active" : ""}`}
                onClick={() => updateSelected({ favorite: !selectedNote.favorite })}
                title="Избранное"
                aria-label="Избранное"
              >
                ★
              </button>
              <button
                className={`icon-button ${selectedNote.pinned ? "active" : ""}`}
                onClick={() => updateSelected({ pinned: !selectedNote.pinned })}
                title="Закрепить"
                aria-label="Закрепить"
              >
                ▲
              </button>
              <button className="ghost-button" onClick={duplicateSelected}>
                Копия
              </button>
              <button className="ghost-button" onClick={exportSelectedNote}>
                <Icon name="download" />
                Заметка
              </button>
              <button className="ghost-button" onClick={toggleArchiveSelected}>
                {selectedNote.archived ? "Вернуть" : "Архив"}
              </button>
              <button className="danger-button" onClick={deleteSelected}>
                Удалить
              </button>
            </div>
          </header>

          <div className="editor-grid">
            <label className="form-control">
              <span>Тип</span>
              <select value={selectedNote.type} onChange={(event) => updateSelected({ type: event.target.value as NoteType })}>
                <option value="credential">Доступ</option>
                <option value="instruction">Инструкция</option>
                <option value="link">Ссылка</option>
              </select>
            </label>
            <label className="form-control">
              <span>Категория</span>
              <input value={selectedNote.category} onChange={(event) => updateSelected({ category: event.target.value })} />
            </label>
            <div className="form-control wide">
              <span>Ссылка</span>
              <div className="input-with-action">
                <Icon name="link" />
                <input
                  aria-label="URL"
                  value={selectedNote.url}
                  onChange={(event) => updateSelected({ url: event.target.value })}
                />
                <button type="button" onClick={() => void copyText(selectedNote.url)} aria-label="Скопировать ссылку">
                  <Icon name="copy" />
                </button>
              </div>
            </div>
            <div className="form-control">
              <span>Логин</span>
              <div className="input-with-action">
                <input
                  aria-label="Логин доступа"
                  value={selectedNote.login}
                  onChange={(event) => updateSelected({ login: event.target.value })}
                />
                <button type="button" onClick={() => void copyText(selectedNote.login)} aria-label="Скопировать логин">
                  <Icon name="copy" />
                </button>
              </div>
            </div>
            <div className="form-control">
              <span>Пароль</span>
              <div className="input-with-action">
                <input
                  aria-label="Пароль доступа"
                  type={visiblePassword ? "text" : "password"}
                  value={selectedNote.password}
                  onChange={(event) => updateSelected({ password: event.target.value })}
                />
                <button type="button" onClick={() => setVisiblePassword((current) => !current)} aria-label="Показать пароль">
                  <Icon name="eye" />
                </button>
                <button type="button" onClick={() => void copyText(selectedNote.password)} aria-label="Скопировать пароль">
                  <Icon name="copy" />
                </button>
              </div>
              <div className="password-tools">
                <span className={`strength strength-${selectedPasswordScore}`}>
                  <i />
                  {selectedPasswordScore >= 4 ? "Сильный" : selectedPasswordScore >= 2 ? "Средний" : "Слабый"}
                </span>
                <button type="button" onClick={generatePassword}>
                  <Icon name="refresh" />
                  Сгенерировать
                </button>
              </div>
            </div>
            <label className="form-control wide">
              <span>Теги через запятую</span>
              <input value={selectedNote.tags.join(", ")} onChange={(event) => updateTags(event.target.value)} />
            </label>
          </div>

          <section className="body-control">
            <div className="body-toolbar">
              <span>Инструкция / заметка · {selectedNote.body.length} символов</span>
              <div className="segmented-control" aria-label="Режим заметки">
                <button className={!previewMode ? "active" : ""} onClick={() => setPreviewMode(false)}>
                  Текст
                </button>
                <button className={previewMode ? "active" : ""} onClick={() => setPreviewMode(true)}>
                  Просмотр
                </button>
              </div>
            </div>
            {previewMode ? (
              <div className="note-preview">{renderPreview(selectedNote.body)}</div>
            ) : (
              <textarea
                value={selectedNote.body}
                onChange={(event) => updateSelected({ body: event.target.value })}
                placeholder="Опишите шаги настройки, команды, нюансы восстановления или проверки."
              />
            )}
          </section>

          <section className="attachments">
            <div className="attachments-header">
              <div>
                <p className="overline">Картинки</p>
                <h3>{selectedNote.attachments.length ? "Вложения" : "Пока нет вложений"}</h3>
              </div>
              <button className="ghost-button" onClick={() => fileInputRef.current?.click()}>
                <Icon name="image" />
                Добавить
              </button>
              <input ref={fileInputRef} hidden type="file" accept="image/*" multiple onChange={(event) => void handleFiles(event)} />
            </div>

            <div className="attachment-grid">
              {selectedNote.attachments.map((attachment) => (
                <figure key={attachment.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={attachment.dataUrl} alt={attachment.name} />
                  <figcaption>
                    <span>{attachment.name}</span>
                    <button onClick={() => removeAttachment(attachment.id)} aria-label={`Удалить ${attachment.name}`}>
                      <Icon name="trash" />
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        </section>
      ) : (
        <section className="empty-editor">Создайте первую заметку</section>
      )}
    </main>
  );
}
