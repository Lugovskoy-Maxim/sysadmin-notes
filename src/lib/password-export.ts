import type { Note } from "./types";
import type { ImportFormat } from "./password-import";

export type PasswordExportFormat = Exclude<ImportFormat, "project-json" | "unknown">;

export const passwordExportFormats: { id: PasswordExportFormat; label: string; extension: string }[] = [
  { id: "bitwarden", label: "Bitwarden JSON", extension: "json" },
  { id: "keepass-xml", label: "KeePass XML", extension: "xml" },
  { id: "keepass-csv", label: "KeePass CSV", extension: "csv" },
  { id: "onepassword-csv", label: "1Password CSV", extension: "csv" },
  { id: "lastpass-csv", label: "LastPass CSV", extension: "csv" },
  { id: "chrome-csv", label: "Chrome CSV", extension: "csv" },
  { id: "firefox-csv", label: "Firefox CSV", extension: "csv" },
  { id: "generic-csv", label: "Универсальный CSV", extension: "csv" },
];

export function exportPasswords(notes: Partial<Note>[], format: PasswordExportFormat) {
  const credentials = notes.filter((note) => note.type === "credential" && !note.archived);
  switch (format) {
    case "bitwarden":
      return { content: bitwarden(credentials), mime: "application/json" };
    case "keepass-xml":
      return { content: keepassXml(credentials), mime: "application/xml" };
    case "keepass-csv":
      return { content: csv(credentials, ["Group", "Title", "Username", "Password", "URL", "Notes"], (n) => [
        n.category, n.title, n.login, n.password, address(n), n.memo,
      ]), mime: "text/csv;charset=utf-8" };
    case "onepassword-csv":
      return { content: csv(credentials, ["Title", "Username", "Password", "URL", "Notes", "Vault", "Type"], (n) => [
        n.title, n.login, n.password, address(n), n.memo, n.category, "Login",
      ]), mime: "text/csv;charset=utf-8" };
    case "lastpass-csv":
      return { content: csv(credentials, ["url", "username", "password", "extra", "name", "grouping", "fav"], (n) => [
        address(n), n.login, n.password, n.memo, n.title, n.category, n.favorite ? "1" : "0",
      ]), mime: "text/csv;charset=utf-8" };
    case "chrome-csv":
      return { content: csv(credentials, ["name", "url", "username", "password", "note"], (n) => [
        n.title, address(n), n.login, n.password, n.memo,
      ]), mime: "text/csv;charset=utf-8" };
    case "firefox-csv":
      return { content: csv(credentials, ["url", "username", "password", "httpRealm", "formActionOrigin", "guid", "timeCreated", "timeLastUsed", "timePasswordChanged"], (n) => [
        address(n), n.login, n.password, n.memo, address(n), `{${n.id ?? ""}}`, timestamp(n.createdAt), timestamp(n.updatedAt), timestamp(n.updatedAt),
      ]), mime: "text/csv;charset=utf-8" };
    case "generic-csv":
      return { content: csv(credentials, ["title", "username", "password", "url", "notes", "category", "tags"], (n) => [
        n.title, n.login, n.password, address(n), n.memo, n.category, (n.tags ?? []).join(" "),
      ]), mime: "text/csv;charset=utf-8" };
  }
}

function bitwarden(notes: Partial<Note>[]) {
  const categories = Array.from(new Set(notes.map((note) => note.category || "Sysadmin Notes")));
  const folders = categories.map((name, index) => ({ id: `folder-${index + 1}`, name }));
  const folderIds = new Map(folders.map((folder) => [folder.name, folder.id]));
  return JSON.stringify({
    encrypted: false,
    folders,
    items: notes.map((note) => ({
      id: note.id,
      type: 1,
      name: note.title || "Без названия",
      notes: note.memo || "",
      favorite: Boolean(note.favorite),
      folderId: folderIds.get(note.category || "Sysadmin Notes"),
      login: {
        username: note.login || "",
        password: note.password || "",
        totp: note.totpSecret || null,
        uris: address(note) ? [{ match: null, uri: address(note) }] : [],
      },
      fields: [
        ...(note.host ? [{ name: "Host", value: note.host, type: 0 }] : []),
        ...(note.port ? [{ name: "Port", value: note.port, type: 0 }] : []),
      ],
    })),
  }, null, 2);
}

function keepassXml(notes: Partial<Note>[]) {
  const groups = new Map<string, Partial<Note>[]>();
  for (const note of notes) {
    const category = note.category || "Sysadmin Notes";
    groups.set(category, [...(groups.get(category) ?? []), note]);
  }
  const body = Array.from(groups.entries()).map(([name, entries]) => `
      <Group>
        <Name>${xml(name)}</Name>
        ${entries.map((note) => `<Entry>
          ${xmlField("Title", note.title)}
          ${xmlField("UserName", note.login)}
          ${xmlField("Password", note.password)}
          ${xmlField("URL", address(note))}
          ${xmlField("Notes", note.memo)}
        </Entry>`).join("\n        ")}
      </Group>`).join("");
  return `<?xml version="1.0" encoding="utf-8"?>
<KeePassFile>
  <Meta><Generator>Sysadmin Notes</Generator></Meta>
  <Root>
    <Group>
      <Name>Sysadmin Notes</Name>${body}
    </Group>
  </Root>
</KeePassFile>`;
}

function csv(
  notes: Partial<Note>[],
  headers: string[],
  row: (note: Partial<Note>) => unknown[],
) {
  return `\uFEFF${[headers, ...notes.map(row)].map((values) => values.map(csvCell).join(",")).join("\r\n")}`;
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function xmlField(key: string, value: unknown) {
  return `<String><Key>${key}</Key><Value>${xml(String(value ?? ""))}</Value></String>`;
}

function xml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function address(note: Partial<Note>) {
  if (note.url) return note.url;
  if (!note.host) return "";
  return note.port ? `${note.host}:${note.port}` : note.host;
}

function timestamp(value?: string) {
  const time = value ? new Date(value).getTime() : Date.now();
  return Number.isFinite(time) ? time : Date.now();
}
