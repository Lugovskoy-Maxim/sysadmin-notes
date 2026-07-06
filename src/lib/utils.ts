import type { Note } from "./types";

export function isSafeHttpUrl(url: string) {
  const value = url.trim();
  if (!value) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeExternalUrl(url?: string | null) {
  const value = url?.trim();
  if (!value || /\s/.test(value)) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    try {
      const protocol = /^(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(value) ? "http://" : "https://";
      const parsed = new URL(`${protocol}${value}`);
      return parsed.href;
    } catch {
      return null;
    }
  }
}

export function formatDate(value: string, withYear = false) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    ...(withYear ? { year: "numeric" } : {}),
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function makePassword(length = 20) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_=+?";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function passwordScore(password: string) {
  let score = 0;
  if (password.length >= 12) score += 1;
  if (password.length >= 18) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 5);
}

export function extractTextPreview(content: Record<string, unknown>, max = 80): string {
  const texts: string[] = [];
  function walk(node: unknown) {
    if (!node || typeof node !== "object") return;
    const n = node as { type?: string; text?: string; content?: unknown[] };
    if (n.text) texts.push(n.text);
    n.content?.forEach(walk);
  }
  walk(content);
  const joined = texts.join(" ").replace(/\s+/g, " ").trim();
  return joined.length > max ? `${joined.slice(0, max)}…` : joined;
}

export function credentialsBlock(note: Note) {
  const lines = [
    note.title && `Название: ${note.title}`,
    note.host && `Хост: ${note.host}`,
    note.port && `Порт: ${note.port}`,
    note.url && `URL: ${note.url}`,
    note.login && `Логин: ${note.login}`,
    note.password && `Пароль: ${note.password}`,
    note.totpSecret && `TOTP: ${note.totpSecret}`,
    note.sshKey && `SSH: ${note.sshKey}`,
    note.memo && `Заметка: ${note.memo}`,
  ].filter(Boolean);
  return lines.join("\n");
}

export function noteToMarkdown(note: Note) {
  const preview = extractTextPreview(note.content, 2000);
  return [
    `# ${note.title}`,
    "",
    `> Тип: ${note.type} · Категория: ${note.category}`,
    note.tags.length ? `> Теги: ${note.tags.map((t) => `#${t}`).join(" ")}` : "",
    "",
    note.host ? `**Хост:** ${note.host}` : "",
    note.port ? `**Порт:** ${note.port}` : "",
    note.url ? `**URL:** ${note.url}` : "",
    note.login ? `**Логин:** ${note.login}` : "",
    note.password ? `**Пароль:** ${note.password}` : "",
    note.totpSecret ? `**TOTP:** ${note.totpSecret}` : "",
    note.sshKey ? `\n\`\`\`\n${note.sshKey}\n\`\`\`` : "",
    note.memo ? `**Заметка:** ${note.memo}` : "",
    "",
    "## Контент",
    preview || "_пусто_",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function downloadFile(filename: string, content: string, mime = "application/json") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function normalizeTheme(value: unknown): "light" | "dark" {
  if (value === "dark" || value === "light") return value;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function applyTheme(theme: "light" | "dark") {
  const resolved = normalizeTheme(theme);
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
}
