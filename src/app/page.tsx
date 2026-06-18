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
  updatedAt: string;
  favorite: boolean;
};

type VaultPayload = {
  version: 1;
  notes: Note[];
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
    updatedAt: new Date().toISOString(),
    favorite: true,
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
    updatedAt: new Date().toISOString(),
    favorite: false,
  },
];

const categories = ["Все", "Доступы", "Инструкции", "Сеть", "Серверы", "Сайты"];

const typeLabels: Record<NoteType, string> = {
  credential: "Доступ",
  instruction: "Инструкция",
  link: "Ссылка",
};

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
  return JSON.parse(decoder.decode(decrypted));
}

function Icon({ name }: { name: "lock" | "plus" | "search" | "copy" | "eye" | "image" | "link" }) {
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
  return (
    <svg {...common}>
      <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1" />
    </svg>
  );
}

export default function Home() {
  const [hasVault, setHasVault] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [notes, setNotes] = useState<Note[]>(seedNotes);
  const [selectedId, setSelectedId] = useState(seedNotes[0].id);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Все");
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [saveState, setSaveState] = useState("Локально, не сохранено");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setHasVault(Boolean(localStorage.getItem(STORAGE_KEY)));
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!isUnlocked || !masterPassword) return;

    const timeout = window.setTimeout(async () => {
      try {
        const serialized = await encryptVault({ version: 1, notes }, masterPassword);
        localStorage.setItem(STORAGE_KEY, serialized);
        setHasVault(true);
        setSaveState(`Сохранено ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`);
      } catch {
        setSaveState("Ошибка сохранения");
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [isUnlocked, masterPassword, notes]);

  const selectedNote = notes.find((note) => note.id === selectedId) ?? notes[0];

  const allTags = useMemo(() => {
    return Array.from(new Set(notes.flatMap((note) => note.tags))).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return notes.filter((note) => {
      const categoryMatch = activeCategory === "Все" || note.category === activeCategory;
      const queryMatch =
        !normalizedQuery ||
        [note.title, note.category, note.url, note.login, note.body, note.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return categoryMatch && queryMatch;
    });
  }, [activeCategory, notes, query]);

  async function unlock() {
    setUnlockError("");

    if (!masterPassword.trim()) {
      setUnlockError("Введите мастер-пароль.");
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setNotes(seedNotes);
      setSelectedId(seedNotes[0].id);
      setIsUnlocked(true);
      setSaveState("Создан новый зашифрованный сейф");
      return;
    }

    try {
      const payload = await decryptVault(stored, masterPassword);
      setNotes(payload.notes);
      setSelectedId(payload.notes[0]?.id ?? "");
      setIsUnlocked(true);
      setSaveState("Сейф разблокирован");
    } catch {
      setUnlockError("Не удалось открыть сейф. Проверьте мастер-пароль.");
    }
  }

  function updateSelected(patch: Partial<Note>) {
    setNotes((current) =>
      current.map((note) =>
        note.id === selectedNote.id ? { ...note, ...patch, updatedAt: new Date().toISOString() } : note,
      ),
    );
    setSaveState("Сохраняю...");
  }

  function createNote(type: NoteType = "credential") {
    const nextNote: Note = {
      id: makeId(),
      title: type === "instruction" ? "Новая инструкция" : "Новый доступ",
      category: type === "instruction" ? "Инструкции" : "Доступы",
      type,
      url: "",
      login: "",
      password: "",
      tags: [],
      body: "",
      attachments: [],
      updatedAt: new Date().toISOString(),
      favorite: false,
    };
    setNotes((current) => [nextNote, ...current]);
    setSelectedId(nextNote.id);
    setVisiblePassword(false);
    setSaveState("Сохраняю...");
  }

  function deleteSelected() {
    if (!selectedNote) return;
    const nextNotes = notes.filter((note) => note.id !== selectedNote.id);
    setNotes(nextNotes);
    setSelectedId(nextNotes[0]?.id ?? "");
    setSaveState("Сохраняю...");
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
    await navigator.clipboard.writeText(value);
    setSaveState("Скопировано");
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

  if (!isUnlocked) {
    return (
      <main className="vault-gate">
        <section className="unlock-card" aria-labelledby="unlock-title">
          <div className="brand-mark">
            <Icon name="lock" />
          </div>
          <p className="overline">{hasVault ? "Зашифрованный сейф найден" : "Первый запуск"}</p>
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
            placeholder={hasVault ? "Введите пароль сейфа" : "Придумайте пароль"}
          />
          {unlockError ? <p className="error-text">{unlockError}</p> : null}
          <button className="primary-button full" onClick={() => void unlock()}>
            <Icon name="lock" />
            {hasVault ? "Разблокировать" : "Создать сейф"}
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

        <div className="search-box">
          <Icon name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по заметкам"
            aria-label="Поиск по заметкам"
          />
        </div>

        <nav className="category-list">
          {categories.map((category) => (
            <button
              className={category === activeCategory ? "active" : ""}
              key={category}
              onClick={() => setActiveCategory(category)}
            >
              <span>{category}</span>
              <strong>
                {category === "Все" ? notes.length : notes.filter((note) => note.category === category).length}
              </strong>
            </button>
          ))}
        </nav>

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
          <button className="ghost-button" onClick={() => createNote("instruction")}>
            Инструкция
          </button>
        </div>

        <div className="notes-stack">
          {filteredNotes.map((note) => (
            <button
              className={`note-row ${note.id === selectedNote?.id ? "selected" : ""}`}
              key={note.id}
              onClick={() => {
                setSelectedId(note.id);
                setVisiblePassword(false);
              }}
            >
              <span className="note-row-top">
                <strong>{note.title}</strong>
                <small>{typeLabels[note.type]}</small>
              </span>
              <span className="note-url">{note.url || note.category}</span>
              <span className="note-tags">
                {note.tags.slice(0, 3).map((tag) => (
                  <em key={tag}>{tag}</em>
                ))}
              </span>
            </button>
          ))}
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
            <label className="form-control wide">
              <span>Ссылка</span>
              <div className="input-with-action">
                <Icon name="link" />
                <input value={selectedNote.url} onChange={(event) => updateSelected({ url: event.target.value })} />
                <button onClick={() => void copyText(selectedNote.url)} aria-label="Скопировать ссылку">
                  <Icon name="copy" />
                </button>
              </div>
            </label>
            <label className="form-control">
              <span>Логин</span>
              <div className="input-with-action">
                <input value={selectedNote.login} onChange={(event) => updateSelected({ login: event.target.value })} />
                <button onClick={() => void copyText(selectedNote.login)} aria-label="Скопировать логин">
                  <Icon name="copy" />
                </button>
              </div>
            </label>
            <label className="form-control">
              <span>Пароль</span>
              <div className="input-with-action">
                <input
                  type={visiblePassword ? "text" : "password"}
                  value={selectedNote.password}
                  onChange={(event) => updateSelected({ password: event.target.value })}
                />
                <button onClick={() => setVisiblePassword((current) => !current)} aria-label="Показать пароль">
                  <Icon name="eye" />
                </button>
                <button onClick={() => void copyText(selectedNote.password)} aria-label="Скопировать пароль">
                  <Icon name="copy" />
                </button>
              </div>
            </label>
            <label className="form-control wide">
              <span>Теги через запятую</span>
              <input value={selectedNote.tags.join(", ")} onChange={(event) => updateTags(event.target.value)} />
            </label>
          </div>

          <label className="form-control body-control">
            <span>Инструкция / заметка</span>
            <textarea
              value={selectedNote.body}
              onChange={(event) => updateSelected({ body: event.target.value })}
              placeholder="Опишите шаги настройки, команды, нюансы восстановления или проверки."
            />
          </label>

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
                  <figcaption>{attachment.name}</figcaption>
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
