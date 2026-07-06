import type { Note, NoteType } from "./types";

export type ImportFormat =
  | "bitwarden"
  | "keepass-xml"
  | "keepass-csv"
  | "onepassword-csv"
  | "lastpass-csv"
  | "firefox-csv"
  | "chrome-csv"
  | "generic-csv"
  | "project-json"
  | "unknown";

export type ParsedCredential = {
  title: string;
  login?: string;
  password?: string;
  url?: string;
  host?: string;
  port?: string;
  totpSecret?: string;
  memo?: string;
  tags: string[];
  category: string;
  type: NoteType;
  source: ImportFormat;
  folder?: string;
};

const emptyDoc = {
  type: "doc" as const,
  content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }],
};

function noteFromCredential(c: ParsedCredential): Partial<Note> {
  return {
    title: c.title,
    type: c.type,
    category: c.category,
    url: c.url,
    host: c.host,
    port: c.port,
    login: c.login,
    password: c.password,
    totpSecret: c.totpSecret,
    memo: c.memo,
    tags: c.tags,
    content: c.type === "credential" ? emptyDoc : memoToContent(c.memo),
    favorite: false,
    pinned: false,
    archived: false,
  };
}

function memoToContent(memo?: string) {
  if (!memo?.trim()) return emptyDoc;
  return {
    type: "doc",
    content: memo.split(/\n{2,}/).map((block) => ({
      type: "paragraph",
      content: [{ type: "text", text: block.trim() }],
    })),
  };
}

function parseUrlParts(uri?: string) {
  if (!uri?.trim()) return {};
  try {
    const url = new URL(uri.includes("://") ? uri : `https://${uri}`);
    return {
      url: url.href,
      host: url.hostname,
      port: url.port || undefined,
    };
  } catch {
    return { url: uri };
  }
}

function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"') {
      if (inQuotes && source[index + 1] === '"') {
        cell += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && source[index + 1] === "\n") index++;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function headerIndex(headers: string[], ...names: string[]) {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const name of names) {
    const idx = lower.indexOf(name.toLowerCase());
    if (idx >= 0) return idx;
  }
  return -1;
}

export function detectImportFormat(text: string, filename: string): ImportFormat {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const trimmed = text.trim();

  if (ext === "json" || trimmed.startsWith("{")) {
    try {
      const data = JSON.parse(trimmed) as Record<string, unknown>;
      if (Array.isArray(data.items) && ("encrypted" in data || data.items[0]?.login)) {
        return "bitwarden";
      }
      if (Array.isArray(data.notes) || data.title) return "project-json";
    } catch {
      /* fall through */
    }
  }

  if (ext === "xml" || trimmed.startsWith("<?xml") || trimmed.includes("<KeePassFile")) {
    return "keepass-xml";
  }

  if (ext === "csv" || trimmed.includes(",")) {
    const rows = parseCsv(trimmed);
    if (!rows.length) return "unknown";
    const h = rows[0].map((c) => c.toLowerCase());
    if (h.includes("url") && h.includes("username") && h.includes("password") && h.includes("grouping")) {
      return "lastpass-csv";
    }
    if (h.includes("url") && h.includes("username") && h.includes("password") && h.includes("httprealm")) {
      return "firefox-csv";
    }
    if (h.includes("title") && h.includes("username") && h.includes("password") && (h.includes("vault") || h.includes("type"))) {
      return "onepassword-csv";
    }
    if (h.includes("title") && h.includes("username") && h.includes("password") && (h.includes("category") || h.includes("tags"))) {
      return "generic-csv";
    }
    if (h.includes("title") && h.includes("username") && h.includes("password")) return "keepass-csv";
    if (h.includes("account") && h.includes("login name")) return "keepass-csv";
    if (h.includes("name") && h.includes("url") && h.includes("username")) return "chrome-csv";
    if (h.some((c) => c.includes("login") || c.includes("password"))) return "generic-csv";
  }

  return "unknown";
}

export function parseBitwarden(text: string): ParsedCredential[] {
  const data = JSON.parse(text) as {
    encrypted?: boolean;
    folders?: { id: string; name: string }[];
    items?: {
      type: number;
      name: string;
      notes?: string;
      favorite?: boolean;
      folderId?: string | null;
      login?: {
        username?: string;
        password?: string;
        totp?: string;
        uris?: { uri?: string }[];
      };
      fields?: { name: string; value: string; type: number }[];
    }[];
  };

  if (data.encrypted) {
    throw new Error("Зашифрованный экспорт Bitwarden не поддерживается. Экспортируйте в незашифрованном JSON.");
  }

  const folderMap = new Map((data.folders ?? []).map((f) => [f.id, f.name]));
  const results: ParsedCredential[] = [];

  for (const item of data.items ?? []) {
    const folder = item.folderId ? folderMap.get(item.folderId) : undefined;
    const tags = ["bitwarden", ...(folder ? [folder.toLowerCase()] : [])];
    const customFields = (item.fields ?? [])
      .filter((f) => f.value)
      .map((f) => `${f.name}: ${f.value}`)
      .join("\n");
    const notes = [item.notes, customFields].filter(Boolean).join("\n\n");

    if (item.type === 1 && item.login) {
      const uri = item.login.uris?.[0]?.uri;
      const urlParts = parseUrlParts(uri);
      results.push({
        title: item.name || "Без названия",
        login: item.login.username,
        password: item.login.password,
        totpSecret: item.login.totp,
        memo: notes || undefined,
        tags,
        category: folder ?? "Bitwarden",
        type: "credential",
        source: "bitwarden",
        folder,
        ...urlParts,
      });
    } else if (item.type === 2) {
      results.push({
        title: item.name || "Заметка",
        memo: notes || undefined,
        tags,
        category: folder ?? "Bitwarden",
        type: "schema",
        source: "bitwarden",
        folder,
      });
    } else if (item.type === 3) {
      const card = item as { card?: { number?: string; code?: string; cardholderName?: string; brand?: string } };
      results.push({
        title: item.name || "Карта",
        login: card.card?.cardholderName,
        password: card.card?.code,
        memo: [notes, card.card?.number ? `Номер: ${card.card.number}` : "", card.card?.brand].filter(Boolean).join("\n"),
        tags: [...tags, "card"],
        category: folder ?? "Bitwarden",
        type: "credential",
        source: "bitwarden",
        folder,
      });
    }
  }

  return results;
}

export function parseKeePassXml(text: string): ParsedCredential[] {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Некорректный XML-файл KeePass");
  }

  const results: ParsedCredential[] = [];

  function getGroupPath(group: Element): string {
    const names: string[] = [];
    let current: Element | null = group;
    while (current?.tagName === "Group") {
      const name = current.querySelector(":scope > Name")?.textContent?.trim();
      if (name) names.unshift(name);
      current = current.parentElement;
    }
    return names.join(" / ");
  }

  function readEntry(entry: Element, groupPath: string) {
    const strings = entry.querySelectorAll("String");
    const map = new Map<string, string>();
    strings.forEach((s) => {
      const key = s.querySelector("Key")?.textContent?.trim();
      const value = s.querySelector("Value")?.textContent ?? "";
      if (key) map.set(key, value);
    });

    const title = map.get("Title")?.trim() || "Без названия";
    const urlParts = parseUrlParts(map.get("URL"));
    const group = groupPath || "KeePass";

    results.push({
      title,
      login: map.get("UserName") || undefined,
      password: map.get("Password") || undefined,
      memo: map.get("Notes") || undefined,
      tags: ["keepass", group.toLowerCase()],
      category: group,
      type: "credential",
      source: "keepass-xml",
      folder: groupPath || undefined,
      ...urlParts,
    });
  }

  doc.querySelectorAll("Group").forEach((group) => {
    const path = getGroupPath(group);
    group.querySelectorAll(":scope > Entry").forEach((entry) => readEntry(entry, path));
  });

  return results;
}

export function parseKeePassCsv(text: string): ParsedCredential[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const titleIdx = headerIndex(headers, "Title", "Account");
  const loginIdx = headerIndex(headers, "UserName", "Login Name", "Username");
  const passIdx = headerIndex(headers, "Password");
  const urlIdx = headerIndex(headers, "URL", "Web Site", "Website");
  const notesIdx = headerIndex(headers, "Notes", "Comments");
  const groupIdx = headerIndex(headers, "Group", "Category");

  return rows.slice(1).map((row) => {
    const group = groupIdx >= 0 ? row[groupIdx]?.trim() : "";
    const urlParts = parseUrlParts(urlIdx >= 0 ? row[urlIdx] : undefined);
    return {
      title: (titleIdx >= 0 ? row[titleIdx] : "")?.trim() || "Без названия",
      login: loginIdx >= 0 ? row[loginIdx]?.trim() : undefined,
      password: passIdx >= 0 ? row[passIdx] : undefined,
      memo: notesIdx >= 0 ? row[notesIdx]?.trim() : undefined,
      tags: ["keepass", ...(group ? [group.toLowerCase()] : [])],
      category: group || "KeePass",
      type: "credential" as NoteType,
      source: "keepass-csv" as ImportFormat,
      folder: group || undefined,
      ...urlParts,
    };
  });
}

export function parseChromeCsv(text: string): ParsedCredential[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const titleIdx = headerIndex(headers, "name", "title");
  const urlIdx = headerIndex(headers, "url");
  const loginIdx = headerIndex(headers, "username");
  const passIdx = headerIndex(headers, "password");

  return rows.slice(1).map((row) => {
    const urlParts = parseUrlParts(urlIdx >= 0 ? row[urlIdx] : undefined);
    return {
      title: (titleIdx >= 0 ? row[titleIdx] : urlParts.host)?.trim() || "Без названия",
      login: loginIdx >= 0 ? row[loginIdx]?.trim() : undefined,
      password: passIdx >= 0 ? row[passIdx] : undefined,
      tags: ["chrome"],
      category: "Chrome",
      type: "credential" as NoteType,
      source: "chrome-csv" as ImportFormat,
      ...urlParts,
    };
  });
}

function parseNamedPasswordCsv(
  text: string,
  config: {
    source: "onepassword-csv" | "lastpass-csv" | "firefox-csv";
    label: string;
    title: string[];
    login: string[];
    password: string[];
    url: string[];
    notes: string[];
    group: string[];
  },
): ParsedCredential[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const titleIdx = headerIndex(headers, ...config.title);
  const loginIdx = headerIndex(headers, ...config.login);
  const passIdx = headerIndex(headers, ...config.password);
  const urlIdx = headerIndex(headers, ...config.url);
  const notesIdx = headerIndex(headers, ...config.notes);
  const groupIdx = headerIndex(headers, ...config.group);

  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => {
      const group = groupIdx >= 0 ? row[groupIdx]?.trim() : "";
      const urlParts = parseUrlParts(urlIdx >= 0 ? row[urlIdx] : undefined);
      return {
        title: (titleIdx >= 0 ? row[titleIdx] : urlParts.host)?.trim() || "Без названия",
        login: loginIdx >= 0 ? row[loginIdx]?.trim() : undefined,
        password: passIdx >= 0 ? row[passIdx] : undefined,
        memo: notesIdx >= 0 ? row[notesIdx]?.trim() : undefined,
        tags: [config.label.toLowerCase(), ...(group ? [group.toLowerCase()] : [])],
        category: group || config.label,
        type: "credential" as NoteType,
        source: config.source,
        folder: group || undefined,
        ...urlParts,
      };
    });
}

export function parseOnePasswordCsv(text: string): ParsedCredential[] {
  return parseNamedPasswordCsv(text, {
    source: "onepassword-csv",
    label: "1Password",
    title: ["Title", "Name"],
    login: ["Username", "Login"],
    password: ["Password"],
    url: ["URL", "Website"],
    notes: ["Notes", "Description"],
    group: ["Vault", "Category", "Type"],
  });
}

export function parseLastPassCsv(text: string): ParsedCredential[] {
  return parseNamedPasswordCsv(text, {
    source: "lastpass-csv",
    label: "LastPass",
    title: ["name", "title"],
    login: ["username"],
    password: ["password"],
    url: ["url"],
    notes: ["extra", "notes"],
    group: ["grouping", "folder"],
  });
}

export function parseFirefoxCsv(text: string): ParsedCredential[] {
  return parseNamedPasswordCsv(text, {
    source: "firefox-csv",
    label: "Firefox",
    title: ["name", "title"],
    login: ["username"],
    password: ["password"],
    url: ["url", "formActionOrigin"],
    notes: ["httpRealm"],
    group: [],
  });
}

export function parseGenericCsv(text: string): ParsedCredential[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const titleIdx = headerIndex(headers, "title", "name", "account", "site");
  const loginIdx = headerIndex(headers, "username", "login", "user", "email");
  const passIdx = headerIndex(headers, "password", "pass");
  const urlIdx = headerIndex(headers, "url", "website", "uri");
  const notesIdx = headerIndex(headers, "notes", "comment", "comments");

  return rows
    .slice(1)
    .filter((row) => row.some((c) => c.trim()))
    .map((row) => {
      const urlParts = parseUrlParts(urlIdx >= 0 ? row[urlIdx] : undefined);
      return {
        title: (titleIdx >= 0 ? row[titleIdx] : "")?.trim() || "Без названия",
        login: loginIdx >= 0 ? row[loginIdx]?.trim() : undefined,
        password: passIdx >= 0 ? row[passIdx] : undefined,
        memo: notesIdx >= 0 ? row[notesIdx]?.trim() : undefined,
        tags: ["import"],
        category: "Импорт",
        type: "credential" as NoteType,
        source: "generic-csv" as ImportFormat,
        ...urlParts,
      };
    });
}

export function parsePasswordFile(text: string, filename: string): {
  format: ImportFormat;
  credentials: ParsedCredential[];
  notes: Partial<Note>[];
} {
  const format = detectImportFormat(text, filename);

  let credentials: ParsedCredential[] = [];
  switch (format) {
    case "bitwarden":
      credentials = parseBitwarden(text);
      break;
    case "keepass-xml":
      credentials = parseKeePassXml(text);
      break;
    case "keepass-csv":
      credentials = parseKeePassCsv(text);
      break;
    case "onepassword-csv":
      credentials = parseOnePasswordCsv(text);
      break;
    case "lastpass-csv":
      credentials = parseLastPassCsv(text);
      break;
    case "firefox-csv":
      credentials = parseFirefoxCsv(text);
      break;
    case "chrome-csv":
      credentials = parseChromeCsv(text);
      break;
    case "generic-csv":
      credentials = parseGenericCsv(text);
      break;
    default:
      throw new Error("Неизвестный формат. Поддерживаются Bitwarden, KeePass, 1Password, LastPass, Chrome и Firefox.");
  }

  return {
    format,
    credentials,
    notes: credentials.map(noteFromCredential),
  };
}

export const formatLabels: Record<ImportFormat, string> = {
  bitwarden: "Bitwarden JSON",
  "keepass-xml": "KeePass XML",
  "keepass-csv": "KeePass CSV",
  "onepassword-csv": "1Password CSV",
  "lastpass-csv": "LastPass CSV",
  "firefox-csv": "Firefox CSV",
  "chrome-csv": "Chrome CSV",
  "generic-csv": "CSV",
  "project-json": "Экспорт проекта",
  unknown: "Неизвестный",
};
