const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const BASE_URL = API_URL.replace("/api", "");

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.token && options.token !== "cookie") {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Ошибка запроса" }));
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  auth: {
    register: (data: { email: string; name: string; password: string }) =>
      request<{ user: { id: string; email: string; name: string } }>("/auth/register", {
        method: "POST",
        body: data,
      }),
    login: (data: { email: string; password: string }) =>
      request<{ user: { id: string; email: string; name: string } }>("/auth/login", {
        method: "POST",
        body: data,
      }),
    me: (token: string) =>
      request<{ id: string; email: string; name: string; createdAt?: string }>("/auth/me", { token }),
    updateProfile: (token: string, data: { name?: string; password?: string }) =>
      request<{ id: string; email: string; name: string; createdAt?: string }>("/auth/profile", {
        method: "PATCH",
        body: data,
        token,
      }),
    logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
    oauthProviders: () =>
      request<{ providers: ("github" | "google" | "yandex")[] }>("/auth/oauth/providers"),
    oauthUrl: (provider: "github" | "google" | "yandex") => `${API_URL}/auth/oauth/${provider}/start`,
    oauthLinkUrl: (provider: "github" | "google" | "yandex") => `${API_URL}/auth/oauth/${provider}/link`,
    identities: (token: string) =>
      request<{
        hasPassword: boolean;
        identities: {
          id: string;
          provider: string;
          email?: string;
          displayName?: string;
          avatarUrl?: string;
          createdAt: string;
          lastLoginAt: string;
        }[];
      }>("/auth/identities", { token }),
    unlinkIdentity: (token: string, id: string) =>
      request<{ ok: true }>(`/auth/identities/${id}/unlink`, { method: "POST", token }),
  },
  integrations: {
    status: (token: string) =>
      request<{
        email: { enabled: boolean; from: string | null };
        telegram: {
          enabled: boolean;
          linked: boolean;
          linkedByBot: string | null;
          mode: string;
          account: {
            username?: string | null;
            firstName?: string | null;
            lastName?: string | null;
            linkedAt: string;
            lastActiveAt: string;
          } | null;
        };
      }>("/integrations/status", { token }),
    sendEmail: (token: string, data: { to?: string; subject: string; text: string }) =>
      request<{ ok: true; messageId: string }>("/integrations/email/send", {
        method: "POST",
        body: data,
        token,
      }),
    createTelegramLink: (token: string) =>
      request<{ url: string; expiresAt: string }>("/integrations/telegram/link", {
        method: "POST",
        token,
      }),
    unlinkTelegram: (token: string) =>
      request<{ ok: true }>("/integrations/telegram/link", { method: "DELETE", token }),
    sendTelegram: (token: string, text: string) =>
      request<{ ok: true }>("/integrations/telegram/send", {
        method: "POST",
        body: { text },
        token,
      }),
  },
  projects: {
    list: (token: string) => request<import("./types").Project[]>("/projects", { token }),
    create: (token: string, data: { name: string; description?: string; color?: string; icon?: string }) =>
      request<import("./types").Project>("/projects", { method: "POST", body: data, token }),
    update: (token: string, id: string, data: Partial<{ name: string; description: string; color: string; icon: string }>) =>
      request<import("./types").Project>(`/projects/${id}`, { method: "PATCH", body: data, token }),
    remove: (token: string, id: string) =>
      request<{ ok: boolean }>(`/projects/${id}`, { method: "DELETE", token }),
    export: (token: string, id: string) =>
      request<{ version: number; exportedAt: string; project: Record<string, string>; notes: Partial<import("./types").Note>[] }>(
        `/projects/${id}/export`,
        { token },
      ),
    import: (token: string, id: string, notes: Partial<import("./types").Note>[]) =>
      request<{ imported: number }>(`/projects/${id}/import`, { method: "POST", body: { notes }, token }),
  },
  notes: {
    list: (token: string, projectId: string) =>
      request<import("./types").Note[]>(`/notes?projectId=${projectId}`, { token }),
    search: (token: string, q: string) =>
      request<import("./types").Note[]>(`/notes/search/all?q=${encodeURIComponent(q)}`, { token }),
    create: (token: string, data: Partial<import("./types").Note> & { title: string; projectId: string }) =>
      request<import("./types").Note>("/notes", {
        method: "POST",
        body: {
          ...data,
          content: data.content ? JSON.stringify(data.content) : undefined,
        },
        token,
      }),
    update: (token: string, id: string, data: Partial<import("./types").Note>) =>
      request<import("./types").Note>(`/notes/${id}`, {
        method: "PATCH",
        body: {
          ...data,
          content: data.content ? JSON.stringify(data.content) : undefined,
        },
        token,
      }),
    move: (token: string, id: string, projectId: string) =>
      request<import("./types").Note>(`/notes/${id}/move`, { method: "PATCH", body: { projectId }, token }),
    duplicate: (token: string, id: string) =>
      request<import("./types").Note>(`/notes/${id}/duplicate`, { method: "POST", token }),
    remove: (token: string, id: string) =>
      request<{ ok: boolean }>(`/notes/${id}`, { method: "DELETE", token }),
  },
  shares: {
    create: (
      token: string,
      data: {
        noteId?: string;
        projectId?: string;
        title?: string;
        expiresAt?: string;
        viewOnly?: boolean;
        shareMode?: import("./types").ShareMode;
        sharePassword?: string;
      },
    ) => request<import("./types").ShareLink>("/shares", { method: "POST", body: data, token }),
    list: (token: string) => request<import("./types").ShareLink[]>("/shares", { token }),
    remove: (token: string, id: string) =>
      request<{ ok: boolean }>(`/shares/${id}`, { method: "DELETE", token }),
    getPublic: (shareToken: string) =>
      request<{ requiresPassword: true } | import("./types").SharePublicPayload>(`/shares/public/${shareToken}`),
    accessPublic: (shareToken: string, password?: string) =>
      request<import("./types").SharePublicPayload>(`/shares/public/${shareToken}`, {
        method: "POST",
        body: { password },
      }),
  },
  upload: async (token: string, noteId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${API_URL}/uploads/${noteId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!response.ok) throw new Error("Ошибка загрузки");
    return response.json() as Promise<import("./types").Attachment>;
  },
  deleteAttachment: (token: string, id: string) =>
    request<{ ok: boolean }>(`/uploads/attachment/${id}`, { method: "DELETE", token }),
  attachmentUrl: (id: string) => `${API_URL}/uploads/attachment/${id}/file`,
  fileUrl: (path: string) => `${API_URL}/uploads/file/${encodeURIComponent(path)}`,
  tasks: {
    list: (token: string, projectId: string) =>
      request<import("./types").Task[]>(`/tasks?projectId=${projectId}`, { token }),
    get: (token: string, id: string) => request<import("./types").Task>(`/tasks/${id}`, { token }),
    create: (
      token: string,
      data: {
        title: string;
        projectId: string;
        description?: string;
        status?: import("./types").TaskStatus;
        priority?: import("./types").TaskPriority;
        dueDate?: string;
        estimatedMinutes?: number;
      },
    ) => request<import("./types").Task>("/tasks", { method: "POST", body: data, token }),
    update: (token: string, id: string, data: Partial<import("./types").Task>) =>
      request<import("./types").Task>(`/tasks/${id}`, { method: "PATCH", body: data, token }),
    remove: (token: string, id: string) =>
      request<{ ok: boolean }>(`/tasks/${id}`, { method: "DELETE", token }),
  },
  timeEntries: {
    list: (token: string, projectId: string, from?: string, to?: string) => {
      const params = new URLSearchParams({ projectId });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      return request<import("./types").TimeEntry[]>(`/time-entries?${params}`, { token });
    },
    active: (token: string) =>
      request<import("./types").TimeEntry | null>("/time-entries/active", { token }),
    summary: (token: string, projectId?: string, period: "today" | "week" = "today") => {
      const params = new URLSearchParams({ period });
      if (projectId) params.set("projectId", projectId);
      return request<import("./types").TimeSummary>(`/time-entries/summary?${params}`, { token });
    },
    start: (token: string, data: { projectId: string; taskId?: string; memo?: string }) =>
      request<import("./types").TimeEntry>("/time-entries/start", { method: "POST", body: data, token }),
    stop: (token: string, id: string) =>
      request<import("./types").TimeEntry>(`/time-entries/${id}/stop`, { method: "PATCH", token }),
    create: (
      token: string,
      data: { projectId: string; taskId?: string; startedAt: string; endedAt: string; memo?: string },
    ) => request<import("./types").TimeEntry>("/time-entries", { method: "POST", body: data, token }),
    update: (token: string, id: string, data: Partial<import("./types").TimeEntry>) =>
      request<import("./types").TimeEntry>(`/time-entries/${id}`, { method: "PATCH", body: data, token }),
    remove: (token: string, id: string) =>
      request<{ ok: boolean }>(`/time-entries/${id}`, { method: "DELETE", token }),
  },
  facility: {
    listInventory: (token: string, projectId: string) =>
      request<import("./facility-types").InventoryItem[]>(`/facility/inventory?projectId=${projectId}`, { token }),
    createInventory: (
      token: string,
      data: Partial<import("./facility-types").InventoryItem> & { projectId: string; name: string },
    ) => request<import("./facility-types").InventoryItem>("/facility/inventory", { method: "POST", body: data, token }),
    updateInventory: (token: string, id: string, data: Partial<import("./facility-types").InventoryItem>) =>
      request<import("./facility-types").InventoryItem>(`/facility/inventory/${id}`, { method: "PATCH", body: data, token }),
    removeInventory: (token: string, id: string) =>
      request<{ ok: boolean }>(`/facility/inventory/${id}`, { method: "DELETE", token }),
    listWriteOffs: (token: string, projectId: string) =>
      request<import("./facility-types").InventoryWriteOff[]>(`/facility/write-offs?projectId=${projectId}`, { token }),
    createWriteOff: (
      token: string,
      data: { projectId: string; itemId: string; quantity: number; reason?: string; comment?: string },
    ) =>
      request<import("./facility-types").InventoryWriteOff>("/facility/write-offs", { method: "POST", body: data, token }),
    listRooms: (token: string, projectId: string) =>
      request<import("./facility-types").OfficeRoom[]>(`/facility/rooms?projectId=${projectId}`, { token }),
    createRoom: (
      token: string,
      data: { projectId: string; name: string; building?: string; floor?: string },
    ) => request<import("./facility-types").OfficeRoom>("/facility/rooms", { method: "POST", body: data, token }),
    updateRoom: (token: string, id: string, data: Partial<import("./facility-types").OfficeRoom>) =>
      request<import("./facility-types").OfficeRoom>(`/facility/rooms/${id}`, { method: "PATCH", body: data, token }),
    removeRoom: (token: string, id: string) =>
      request<{ ok: boolean }>(`/facility/rooms/${id}`, { method: "DELETE", token }),
    createEquipmentRow: (
      token: string,
      data: { roomId: string; label?: string; cells?: Record<string, string | boolean | number | null> },
    ) =>
      request<import("./facility-types").OfficeEquipmentRow>("/facility/equipment-rows", {
        method: "POST",
        body: data,
        token,
      }),
    updateEquipmentRow: (
      token: string,
      id: string,
      data: Partial<import("./facility-types").OfficeEquipmentRow>,
    ) =>
      request<import("./facility-types").OfficeEquipmentRow>(`/facility/equipment-rows/${id}`, {
        method: "PATCH",
        body: data,
        token,
      }),
    removeEquipmentRow: (token: string, id: string) =>
      request<{ ok: boolean }>(`/facility/equipment-rows/${id}`, { method: "DELETE", token }),
    getColumnDefs: (token: string, projectId: string) =>
      request<{ inventoryColumnDefs: import("./facility-types").TableColumnDef[]; equipmentColumnDefs: import("./facility-types").TableColumnDef[] }>(
        `/facility/column-defs?projectId=${projectId}`,
        { token },
      ),
    updateColumnDefs: (
      token: string,
      projectId: string,
      data: { inventoryColumnDefs?: import("./facility-types").TableColumnDef[]; equipmentColumnDefs?: import("./facility-types").TableColumnDef[] },
    ) =>
      request<{ inventoryColumnDefs: import("./facility-types").TableColumnDef[]; equipmentColumnDefs: import("./facility-types").TableColumnDef[] }>(
        `/facility/column-defs?projectId=${projectId}`,
        { method: "PATCH", body: data, token },
      ),
    listNetworkMaps: (token: string, projectId: string) =>
      request<import("./facility-types").NetworkMap[]>(`/facility/network-maps?projectId=${projectId}`, { token }),
    getNetworkMap: (token: string, id: string) =>
      request<import("./facility-types").NetworkMap>(`/facility/network-maps/${id}`, { token }),
    createNetworkMap: (token: string, data: { projectId: string; name?: string }) =>
      request<import("./facility-types").NetworkMap>("/facility/network-maps", { method: "POST", body: data, token }),
    updateNetworkMap: (token: string, id: string, data: Partial<import("./facility-types").NetworkMap>) =>
      request<import("./facility-types").NetworkMap>(`/facility/network-maps/${id}`, { method: "PATCH", body: data, token }),
    removeNetworkMap: (token: string, id: string) =>
      request<{ ok: boolean }>(`/facility/network-maps/${id}`, { method: "DELETE", token }),
  },
};
