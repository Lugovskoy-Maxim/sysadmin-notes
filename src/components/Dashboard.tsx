"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Cloud,
  Database,
  FolderPlus,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Server,
  Settings,
  Share2,
  Shield,
  Network,
  Terminal,
  Upload,
  Download,
  KeyRound,
  BookOpen,
  Link2,
  LayoutGrid,
  Star,
  Pin,
  LayoutList,
  Table2,
  CheckSquare,
  ListTodo,
  BarChart3,
  Columns3,
  FolderOpen,
  ArrowLeft,
  Lock,
  Users,
  Crown,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { downloadFile, extractTextPreview, formatDate } from "@/lib/utils";
import type { AppMode, NoteType, Project, TaskStatus, VaultSection } from "@/lib/types";
import { noteTemplates, projectColors, typeLabels, vaultSections } from "@/lib/types";
import { VaultNav } from "./ui/VaultNav";
import { ThemeToggle } from "./ui/ThemeToggle";
import { CommandPalette, type CommandAction, commandIcons } from "./CommandPalette";
import { NoteEditor } from "./NoteEditor";
import { ProjectModal } from "./ProjectModal";
import { SettingsModal } from "./SettingsModal";
import { ImportModal } from "./ImportModal";
import { ShareLinksPanel } from "./ShareLinksPanel";
import { ShareModal } from "./ShareModal";
import { ShortcutsHelp } from "./ShortcutsHelp";
import { NotesTable } from "./NotesTable";
import { NoteQuickView } from "./NoteQuickView";
import { TasksBoard } from "./tasks/TasksBoard";
import { TaskEditor } from "./tasks/TaskEditor";
import { TimeTracker } from "./tasks/TimeTracker";
import { TaskInsights } from "./tasks/TaskInsights";
import { ExportPasswordsModal } from "./ExportPasswordsModal";
import { AppModeNav } from "./ui/AppModeNav";
import { InventoryPanel } from "./facility/InventoryPanel";
import { EquipmentPanel } from "./facility/EquipmentPanel";
import { NetworkMapPanel } from "./facility/NetworkMapPanel";
import { AppLockOverlay, useAppLock } from "./AppLockOverlay";
import { PaneResizer } from "./PaneResizer";
import { MobileMenuSheet, MobileModulesSheet } from "./MobileSheets";
import { ProjectMembersModal } from "./ProjectMembersModal";
import { PricingModal } from "./PricingModal";
import { AdminUsersModal } from "./AdminUsersModal";

const iconMap = {
  server: Server,
  cloud: Cloud,
  database: Database,
  shield: Shield,
  network: Network,
  terminal: Terminal,
} as const;

const noteTypeIcons = {
  credential: KeyRound,
  instruction: BookOpen,
  schema: LayoutGrid,
  link: Link2,
} as const;

const noteTypeColors: Record<NoteType, string> = {
  credential: "var(--type-credential)",
  instruction: "var(--type-instruction)",
  schema: "var(--type-schema)",
  link: "var(--type-link)",
};

export function Dashboard() {
  const token = useAppStore((s) => s.token);
  const user = useAppStore((s) => s.user);
  const projects = useAppStore((s) => s.projects);
  const notes = useAppStore((s) => s.notes);
  const allNotes = useAppStore((s) => s.allNotes);
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const selectedNoteId = useAppStore((s) => s.selectedNoteId);
  const theme = useAppStore((s) => s.theme);
  const notesView = useAppStore((s) => s.notesView);
  const setNotesView = useAppStore((s) => s.setNotesView);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const appMode = useAppStore((s) => s.appMode);
  const setAppMode = useAppStore((s) => s.setAppMode);
  const billing = useAppStore((s) => s.billing);
  const setBilling = useAppStore((s) => s.setBilling);
  const tasks = useAppStore((s) => s.tasks);
  const selectedTaskId = useAppStore((s) => s.selectedTaskId);
  const setTasks = useAppStore((s) => s.setTasks);
  const setSelectedTask = useAppStore((s) => s.setSelectedTask);
  const upsertTask = useAppStore((s) => s.upsertTask);
  const removeTask = useAppStore((s) => s.removeTask);
  const setProjects = useAppStore((s) => s.setProjects);
  const setNotes = useAppStore((s) => s.setNotes);
  const setAllNotes = useAppStore((s) => s.setAllNotes);
  const setActiveProject = useAppStore((s) => s.setActiveProject);
  const setSelectedNote = useAppStore((s) => s.setSelectedNote);
  const upsertNote = useAppStore((s) => s.upsertNote);
  const upsertProject = useAppStore((s) => s.upsertProject);
  const removeProject = useAppStore((s) => s.removeProject);
  const setUser = useAppStore((s) => s.setUser);
  const setTheme = useAppStore((s) => s.setTheme);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const clearAuth = useAppStore((s) => s.clearAuth);
  const toast = useToast((s) => s.push);
  const shellRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLElement>(null);
  const { locked, lock, unlock, touch } = useAppLock();
  const isFacilityMode = appMode === "inventory" || appMode === "equipment" || appMode === "network";

  async function logout() {
    try {
      await api.auth.logout();
    } finally {
      clearAuth();
    }
  }

  const [activeVault, setActiveVault] = useState<VaultSection>("passwords");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Все");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"updated" | "title" | "type">("updated");
  const [loading, setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState(false);
  const [globalResults, setGlobalResults] = useState<typeof notes>([]);

  const [showProjectShare, setShowProjectShare] = useState(false);
  const [showProjectMembers, setShowProjectMembers] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showAdminUsers, setShowAdminUsers] = useState(false);
  const isAdmin = user?.role === "admin";
  const [showProjectModal, setShowProjectModal] = useState<Project | null | "new">(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showPasswordExport, setShowPasswordExport] = useState(false);
  const [showShareLinks, setShowShareLinks] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [previewNoteId, setPreviewNoteId] = useState<string | null>(null);
  const [taskQuery, setTaskQuery] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState<"all" | TaskStatus>("all");
  const [taskView, setTaskView] = useState<"board" | "overview">("board");
  const [mobilePane, setMobilePane] = useState<"list" | "detail">("list");
  const [showMobileModules, setShowMobileModules] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const loadTasks = useCallback(async (projectId?: string | null) => {
    if (!token) return;
    const pid = projectId ?? activeProjectId;
    if (!pid) {
      setTasks([]);
      return;
    }
    const taskList = await api.tasks.list(token, pid);
    setTasks(taskList);
    if (!selectedTaskId && taskList[0]) setSelectedTask(taskList[0].id);
  }, [token, activeProjectId, selectedTaskId, setTasks, setSelectedTask]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [projectList, billingStatus] = await Promise.all([
        api.projects.list(token),
        api.billing.status(token).catch(() => null),
      ]);
      setProjects(projectList);
      if (billingStatus) setBilling(billingStatus);
      const projectId = projectList.some((project) => project.id === activeProjectId)
        ? activeProjectId
        : projectList[0]?.id;
      if (projectId) {
        if (projectId !== activeProjectId) setActiveProject(projectId);
        const noteList = await api.notes.list(token, projectId);
        setNotes(noteList);
        if (!selectedNoteId && noteList[0]) setSelectedNote(noteList[0].id);
        const all = await Promise.all(projectList.map((p) => api.notes.list(token, p.id)));
        setAllNotes(all.flat());
        await loadTasks(projectId);
      }
    } finally {
      setLoading(false);
    }
  }, [token, activeProjectId, selectedNoteId, setProjects, setNotes, setAllNotes, setActiveProject, setSelectedNote, setBilling, loadTasks]);

  const activeVaultMeta = vaultSections.find((s) => s.id === activeVault)!;

  useEffect(() => {
    void loadData();
  }, [token]);

  useEffect(() => {
    if (appMode !== "vault" || globalSearch) return;
    const inVault = notes.filter((n) => activeVaultMeta.types.includes(n.type));
    if (selectedNoteId && inVault.some((n) => n.id === selectedNoteId)) return;
    setSelectedNote(inVault[0]?.id ?? null);
  }, [activeVault, notes, selectedNoteId, globalSearch, activeVaultMeta, setSelectedNote, appMode]);

  useEffect(() => {
    if (appMode !== "tasks") return;
    if (selectedTaskId && tasks.some((t) => t.id === selectedTaskId)) return;
    setSelectedTask(tasks[0]?.id ?? null);
  }, [appMode, tasks, selectedTaskId, setSelectedTask]);

  useEffect(() => {
    setPreviewNoteId(null);
  }, [activeVault, activeProjectId]);

  useEffect(() => {
    if (!token || !globalSearch || !query.trim()) {
      setGlobalResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await api.notes.search(token, query);
      setGlobalResults(results);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, globalSearch, token]);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const facilityEnabled = activeProject?.capabilities?.facility ?? billing?.limits.facilityModules ?? false;
  const lockedFacilityModes: AppMode[] = facilityEnabled ? [] : ["inventory", "equipment", "network"];

  useEffect(() => {
    if (lockedFacilityModes.includes(appMode)) setAppMode("vault");
  }, [lockedFacilityModes, appMode, setAppMode]);

  const createNote = useCallback(
    async (type?: NoteType, template?: (typeof noteTemplates)[number]) => {
      if (!token) return;
      const projectId = projects.some((project) => project.id === activeProjectId)
        ? activeProjectId
        : projects[0]?.id;
      if (!projectId) {
        toast("Сначала создайте проект", "error");
        return;
      }
      try {
        if (projectId !== activeProjectId) setActiveProject(projectId);
        const noteType = template?.type ?? type ?? activeVaultMeta.createType;
        const note = await api.notes.create(token, {
          title: template?.title ?? (noteType === "credential" ? "Новый пароль" : noteType === "instruction" ? "Новая инструкция" : "Новая заметка"),
          projectId,
          type: noteType,
          category: template?.category ?? activeVaultMeta.category,
          content: template?.content ?? {
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }],
          },
        });
        upsertNote(note);
        setSelectedNote(note.id);
        setMobilePane("detail");
        toast("Заметка создана", "success");
      } catch (error) {
        toast(error instanceof Error ? error.message : "Не удалось создать заметку", "error");
      }
    },
    [token, projects, activeProjectId, activeVaultMeta, upsertNote, setSelectedNote, setActiveProject, toast],
  );

  const createTask = useCallback(
    async (status: TaskStatus = "todo") => {
      if (!token) return;
      const projectId = projects.some((project) => project.id === activeProjectId)
        ? activeProjectId
        : projects[0]?.id;
      if (!projectId) {
        toast("Сначала создайте проект", "error");
        return;
      }
      try {
        if (projectId !== activeProjectId) setActiveProject(projectId);
        const task = await api.tasks.create(token, {
          title: "Новая задача",
          projectId,
          status,
        });
        upsertTask(task);
        setSelectedTask(task.id);
        setMobilePane("detail");
        toast("Задача создана", "success");
      } catch (error) {
        toast(error instanceof Error ? error.message : "Не удалось создать задачу", "error");
      }
    },
    [token, projects, activeProjectId, upsertTask, setSelectedTask, setActiveProject, toast],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if (mod && e.key === "n") {
        e.preventDefault();
        if (appMode === "tasks") void createTask();
        else if (!isFacilityMode) void createNote();
      }
      if (mod && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
      }
      if (mod && e.key === "l") {
        e.preventDefault();
        lock();
      }
      if (mod && e.key === ",") {
        e.preventDefault();
        setShowSettings(true);
      }
    }
    function onActivity() {
      touch();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onActivity);
    window.addEventListener("touchstart", onActivity);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onActivity);
      window.removeEventListener("touchstart", onActivity);
    };
  }, [createNote, createTask, appMode, toggleSidebar, isFacilityMode, lock, touch]);

  async function switchProject(id: string) {
    if (!token) return;
    setActiveProject(id);
    const noteList = await api.notes.list(token, id);
    setNotes(noteList);
    setSelectedNote(noteList[0]?.id ?? null);
    setActiveCategory("Все");
    setActiveTag(null);
    setQuery("");
    setGlobalSearch(false);
    await loadTasks(id);
  }

  async function saveProject(data: { name: string; description?: string; color: string; icon: string }) {
    if (!token) return;
    try {
      if (showProjectModal && showProjectModal !== "new") {
        const updated = await api.projects.update(token, showProjectModal.id, data);
        upsertProject(updated);
        toast("Проект обновлён", "success");
      } else {
        const created = await api.projects.create(token, data);
        const list = await api.projects.list(token);
        setProjects(list);
        await switchProject(created.id);
        setMobilePane("list");
        toast("Проект создан", "success");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось сохранить проект";
      toast(message, "error");
      throw error;
    }
  }

  async function deleteProject() {
    if (!token || !showProjectModal || showProjectModal === "new") return;
    await api.projects.remove(token, showProjectModal.id);
    removeProject(showProjectModal.id);
    const list = await api.projects.list(token);
    setProjects(list);
    if (list[0]) await switchProject(list[0].id);
    toast("Проект удалён", "info");
  }

  async function exportProject() {
    if (!token || !showProjectModal || showProjectModal === "new") return;
    const data = await api.projects.export(token, showProjectModal.id);
    const name = showProjectModal.name.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-");
    downloadFile(`${name}-export.json`, JSON.stringify(data, null, 2));
    toast("Проект экспортирован", "success");
  }

  const vaultNotes = useMemo(
    () => notes.filter((n) => activeVaultMeta.types.includes(n.type)),
    [notes, activeVaultMeta],
  );

  const vaultCounts = useMemo(
    () =>
      Object.fromEntries(
        vaultSections.map((s) => [s.id, notes.filter((n) => s.types.includes(n.type) && !n.archived).length]),
      ) as Record<VaultSection, number>,
    [notes],
  );

  const allTags = useMemo(
    () => Array.from(new Set(vaultNotes.flatMap((n) => n.tags))).sort((a, b) => a.localeCompare(b)),
    [vaultNotes],
  );

  const displayNotes = globalSearch && query.trim() ? globalResults : vaultNotes;

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return displayNotes
      .filter((note) => {
        if (!globalSearch && !activeVaultMeta.types.includes(note.type)) return false;
        const catMatch =
          activeCategory === "Все" ||
          (activeCategory === "Избранное" && note.favorite) ||
          (activeCategory === "Архив" && note.archived) ||
          note.category === activeCategory;
        const archiveMatch = activeCategory === "Архив" ? note.archived : !note.archived;
        const tagMatch = !activeTag || note.tags.includes(activeTag);
        const queryMatch =
          globalSearch ||
          !q ||
          [note.title, note.category, note.url, note.host, note.login, note.tags.join(" ")]
            .join(" ")
            .toLowerCase()
            .includes(q);
        return catMatch && archiveMatch && tagMatch && queryMatch;
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        if (sortMode === "title") return a.title.localeCompare(b.title, "ru");
        if (sortMode === "type") return typeLabels[a.type].localeCompare(typeLabels[b.type], "ru");
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [displayNotes, query, activeCategory, activeTag, sortMode, globalSearch, activeVaultMeta]);

  const selectedNote = [...notes, ...allNotes].find((n) => n.id === selectedNoteId);
  const previewNote = filteredNotes.find((n) => n.id === previewNoteId) ?? null;
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  const filteredTasks = useMemo(() => {
    const q = taskQuery.trim().toLowerCase();
    return tasks
      .filter((task) => {
        const statusMatch = taskStatusFilter === "all" || task.status === taskStatusFilter;
        const queryMatch =
          !q ||
          [task.title, task.description ?? ""].join(" ").toLowerCase().includes(q);
        return statusMatch && queryMatch;
      })
      .sort((a, b) => {
        const statusOrder = { todo: 0, in_progress: 1, done: 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [tasks, taskQuery, taskStatusFilter]);

  async function updateTaskStatus(taskId: string, status: TaskStatus) {
    if (!token) return;
    const updated = await api.tasks.update(token, taskId, { status });
    upsertTask(updated);
    if (selectedTaskId === taskId) {
      const full = await api.tasks.get(token, taskId);
      upsertTask(full);
    }
  }

  function openNote(noteId: string, projectId?: string) {
    if (projectId && projectId !== activeProjectId) void switchProject(projectId);
    setSelectedNote(noteId);
    setPreviewNoteId(null);
    setMobilePane("detail");
  }

  const categories = useMemo(() => {
    const cats = Array.from(new Set(vaultNotes.map((n) => n.category).filter(Boolean)));
    return ["Все", "Избранное", "Архив", ...cats];
  }, [vaultNotes]);

  const sectionTemplates = useMemo(
    () => noteTemplates.filter((t) => activeVaultMeta.types.includes(t.type)),
    [activeVaultMeta],
  );

  const commandActions: CommandAction[] = [
    { id: "new-note", label: "Новая запись", icon: commandIcons.Plus, action: () => void createNote() },
    { id: "new-project", label: "Новый проект", icon: commandIcons.FolderPlus, action: () => setShowProjectModal("new") },
    { id: "settings", label: "Настройки", icon: commandIcons.Settings, action: () => setShowSettings(true) },
    {
      id: "theme",
      label: theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему",
      icon: theme === "dark" ? commandIcons.Sun : commandIcons.Moon,
      action: () => setTheme(theme === "dark" ? "light" : "dark"),
    },
    { id: "search", label: "Глобальный поиск", icon: commandIcons.Search, action: () => setGlobalSearch(true) },
    { id: "import", label: "Импорт данных", icon: commandIcons.Upload, action: () => setShowImport(true) },
    ...(activeVault === "passwords" && activeProject
      ? [{ id: "export-passwords", label: "Экспорт паролей", icon: commandIcons.Download, action: () => setShowPasswordExport(true) }]
      : []),
  ];

  if (loading) {
    return (
      <main className="app-shell">
        <div className="skeleton-sidebar" />
        <div className="skeleton-list" />
        <div className="skeleton-editor" />
      </main>
    );
  }

  function switchAppMode(mode: typeof appMode) {
    if (lockedFacilityModes.includes(mode)) {
      toast("Склад, оснащение и карта сети доступны на тарифах Pro и Team", "error");
      return;
    }
    setAppMode(mode);
    setPreviewNoteId(null);
    setMobilePane("list");
    if (mode === "tasks") void loadTasks();
  }

  function handleLockedMode(mode: AppMode) {
    toast("Этот раздел доступен на тарифах Pro и Team", "error");
    setShowPricing(true);
  }

  function openPricing() {
    setShowPricing(true);
  }

  return (
    <main
      ref={shellRef}
      className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${appMode === "tasks" ? "tasks-mode" : ""} ${isFacilityMode ? "facility-mode" : ""} ${notesView === "table" && appMode === "vault" ? "table-view" : ""} ${previewNote ? "has-quick-view" : ""} mobile-${mobilePane}`}
      onMouseDown={touch}
    >
      <AppLockOverlay locked={locked} onUnlock={unlock} />
      <div className="mobile-top-bar">
        <button type="button" className="mobile-top-project" onClick={() => setShowMobileMenu(true)}>
          <FolderOpen size={16} />
          <span>{activeProject?.name ?? "Выберите проект"}</span>
        </button>
        <button type="button" className="mobile-top-modules" onClick={() => setShowMobileModules(true)} aria-label="Разделы">
          <LayoutGrid size={18} />
        </button>
      </div>

      <aside className={`sidebar ${sidebarCollapsed ? "is-collapsed" : ""}`} aria-label="Проекты">
        <div className="sidebar-top">
          <div className="app-title">
            <div className="brand-mark small">
              <Server size={18} />
            </div>
            {!sidebarCollapsed ? (
              <div>
                <h1>Sysadmin Notes</h1>
                <p>{user?.name ?? user?.email}</p>
              </div>
            ) : null}
          </div>
          <button className="icon-button small-btn" onClick={toggleSidebar} title="Свернуть панель">
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {sidebarCollapsed ? (
          <div className="sidebar-rail">
            <AppModeNav
              value={appMode}
              onChange={switchAppMode}
              compact
              lockedModes={lockedFacilityModes}
              onLockedMode={handleLockedMode}
            />
            {appMode === "vault" ? (
              <>
                <div className="sidebar-rail-divider" />
                <VaultNav
                  value={activeVault}
                  counts={vaultCounts}
                  compact
                  onChange={(section) => {
                    setActiveVault(section);
                    setActiveCategory("Все");
                    setActiveTag(null);
                    setPreviewNoteId(null);
                  }}
                />
              </>
            ) : null}
            <div className="sidebar-rail-divider" />
            <nav className="sidebar-rail-projects" aria-label="Проекты">
              {projects.map((project) => {
                const Icon = iconMap[project.icon as keyof typeof iconMap] ?? Server;
                return (
                  <button
                    key={project.id}
                    type="button"
                    className={`sidebar-rail-btn sidebar-rail-project ${project.id === activeProjectId ? "active" : ""}`}
                    style={{ "--project-color": project.color } as React.CSSProperties}
                    title={project.name}
                    aria-label={project.name}
                    onClick={() => void switchProject(project.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setShowProjectModal(project);
                    }}
                  >
                    <span className="project-icon">
                      <Icon size={14} />
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                className="sidebar-rail-btn"
                title="Новый проект"
                aria-label="Новый проект"
                onClick={() => setShowProjectModal("new")}
              >
                <FolderPlus size={18} />
              </button>
            </nav>
            <div className="sidebar-rail-spacer" />
            {(appMode === "vault" || appMode === "tasks") && (
              <button
                type="button"
                className="sidebar-rail-btn sidebar-rail-create"
                title={appMode === "tasks" ? "Новая задача" : "Новая запись"}
                onClick={() => (appMode === "tasks" ? void createTask() : void createNote())}
              >
                <Plus size={20} />
              </button>
            )}
            <div className="sidebar-rail-footer">
              <ThemeToggle theme={theme} onChange={setTheme} compact />
              <button type="button" className="sidebar-rail-btn" onClick={lock} title="Заблокировать">
                <Lock size={16} />
              </button>
              <button type="button" className="sidebar-rail-btn" onClick={openPricing} title="Тарифы">
                <Crown size={16} />
              </button>
              <button type="button" className="sidebar-rail-btn" onClick={() => setShowSettings(true)} title="Настройки">
                <Settings size={16} />
              </button>
              <button type="button" className="sidebar-rail-btn" onClick={() => void logout()} title="Выйти">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="sidebar-scroll">
            <AppModeNav
              value={appMode}
              onChange={switchAppMode}
              lockedModes={lockedFacilityModes}
              onLockedMode={handleLockedMode}
            />

            {appMode === "vault" ? (
              <VaultNav
                value={activeVault}
                counts={vaultCounts}
                onChange={(section) => {
                  setActiveVault(section);
                  setActiveCategory("Все");
                  setActiveTag(null);
                  setPreviewNoteId(null);
                }}
              />
            ) : null}

            {appMode === "vault" || appMode === "tasks" ? (
              <button
                className="primary-button"
                onClick={() => (appMode === "tasks" ? void createTask() : void createNote())}
              >
                <Plus size={18} />
                {appMode === "tasks"
                  ? "Новая задача"
                  : activeVault === "passwords"
                    ? "Новый пароль"
                    : activeVault === "instructions"
                      ? "Новая инструкция"
                      : "Новая заметка"}
              </button>
            ) : null}

            {appMode === "vault" && sectionTemplates.length ? (
              <div className="template-strip">
                {sectionTemplates.map((t) => (
                  <button key={t.label} onClick={() => void createNote(t.type, t)} title={t.label}>
                    {t.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="project-section">
              <div className="section-head">
                <p className="overline">Проекты</p>
                <button className="icon-button small-btn" onClick={() => setShowProjectModal("new")} title="Новый проект">
                  <FolderPlus size={16} />
                </button>
              </div>
              <nav className="project-list">
                {projects.map((project) => {
                  const Icon = iconMap[project.icon as keyof typeof iconMap] ?? Server;
                  return (
                    <button
                      key={project.id}
                      className={project.id === activeProjectId ? "active" : ""}
                      onClick={() => void switchProject(project.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setShowProjectModal(project);
                      }}
                      style={{ "--project-color": project.color } as React.CSSProperties}
                    >
                      <span className="project-icon">
                        <Icon size={14} />
                      </span>
                      <span className="project-name">
                        {project.name}
                        {project.role && project.role !== "owner" ? (
                          <small className="project-shared-badge">общий</small>
                        ) : null}
                      </span>
                      <strong>{project._count?.notes ?? 0}</strong>
                    </button>
                  );
                })}
              </nav>
            </div>

            {activeProject && appMode === "vault" ? (
              <div className="sidebar-actions">
                {activeProject.role === "owner" ? (
                  <button
                    className="ghost-button compact"
                    onClick={() =>
                      billing?.limits.teamCollaboration ? setShowProjectMembers(true) : openPricing()
                    }
                  >
                    <Users size={14} />
                    {billing?.limits.teamCollaboration ? "Команда" : "Команда (Pro)"}
                  </button>
                ) : null}
                <button className="ghost-button compact" onClick={() => setShowProjectShare(true)}>
                  <Share2 size={14} />
                  Поделиться
                </button>
                <button className="ghost-button compact" onClick={() => setShowImport(true)}>
                  <Upload size={14} />
                  Импорт
                </button>
                {activeVault === "passwords" ? (
                  <button className="ghost-button compact" onClick={() => setShowPasswordExport(true)}>
                    <Download size={14} />
                    Экспорт
                  </button>
                ) : null}
              </div>
            ) : null}

            {appMode === "tasks" && activeProjectId ? (
              <TimeTracker projectId={activeProjectId} tasks={tasks} selectedTaskId={selectedTaskId} />
            ) : null}

            {appMode === "vault" ? (
              <nav className="category-list">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={category === activeCategory ? "active" : ""}
                    onClick={() => setActiveCategory(category)}
                  >
                    <span>{category}</span>
                    <strong>
                      {category === "Все"
                        ? vaultNotes.filter((n) => !n.archived).length
                        : category === "Избранное"
                          ? vaultNotes.filter((n) => n.favorite && !n.archived).length
                          : category === "Архив"
                            ? vaultNotes.filter((n) => n.archived).length
                            : vaultNotes.filter((n) => n.category === category && !n.archived).length}
                    </strong>
                  </button>
                ))}
              </nav>
            ) : (
              <nav className="category-list task-filters">
                {(["all", "todo", "in_progress", "done"] as const).map((status) => (
                  <button
                    key={status}
                    className={taskStatusFilter === status ? "active" : ""}
                    onClick={() => setTaskStatusFilter(status)}
                  >
                    <span>
                      {status === "all"
                        ? "Все задачи"
                        : status === "todo"
                          ? "К выполнению"
                          : status === "in_progress"
                            ? "В работе"
                            : "Готово"}
                    </span>
                    <strong>
                      {status === "all"
                        ? tasks.length
                        : tasks.filter((t) => t.status === status).length}
                    </strong>
                  </button>
                ))}
              </nav>
            )}

            {appMode === "vault" && allTags.length ? (
              <div className="tag-cloud">
                {allTags.slice(0, 14).map((tag) => (
                  <button
                    key={tag}
                    className={activeTag === tag ? "active" : ""}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            ) : null}
            </div>

            <button type="button" className="sidebar-pricing-link" onClick={openPricing}>
              <Crown size={14} />
              Тарифы и подписка
              {!billing?.isPremium ? <span className="sidebar-pricing-cta">Pro</span> : null}
            </button>
            {isAdmin ? (
              <button type="button" className="sidebar-pricing-link admin-link" onClick={() => setShowAdminUsers(true)}>
                <Shield size={14} />
                Пользователи
              </button>
            ) : null}

            <div className="sidebar-footer">
              <div className="user-chip">
                <span className="user-chip-avatar">{(user?.name ?? user?.email ?? "?")[0]?.toUpperCase()}</span>
                <div className="user-chip-text">
                  <strong>
                    {user?.name ?? "Пользователь"}
                    {billing?.isPremium ? (
                      <span className="plan-badge premium">
                        <Crown size={10} />
                        {billing.planName}
                      </span>
                    ) : (
                      <button type="button" className="plan-badge free" onClick={openPricing}>Free</button>
                    )}
                  </strong>
                  <span>{user?.email}</span>
                </div>
              </div>
              <div className="sidebar-footer-actions">
                <ThemeToggle theme={theme} onChange={setTheme} />
                <button className="ghost-button compact" onClick={lock} title="Заблокировать (⌘L)">
                  <Lock size={14} />
                </button>
                <button className="ghost-button compact" onClick={() => setShowSettings(true)} title="Настройки">
                  <Settings size={14} />
                </button>
                <button className="ghost-button compact logout-btn" onClick={() => void logout()} title="Выйти">
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </aside>

      {isFacilityMode ? (
        <section className="facility-full-panel mobile-content-pane" aria-label="Учёт и инфраструктура">
          {activeProjectId && token ? (
            appMode === "inventory" ? (
              <InventoryPanel token={token} projectId={activeProjectId} />
            ) : appMode === "equipment" ? (
              <EquipmentPanel token={token} projectId={activeProjectId} />
            ) : (
              <NetworkMapPanel token={token} projectId={activeProjectId} />
            )
          ) : (
            <div className="empty-editor">
              <strong>Выберите проект</strong>
              <span>Склад, оснащение и карта сети привязаны к проекту</span>
            </div>
          )}
        </section>
      ) : null}

      <section
        ref={listRef}
        className={`note-list ${appMode === "tasks" ? "tasks-list-mode" : notesView === "table" ? "table-mode" : ""} ${isFacilityMode ? "hidden-pane" : ""}`}
        aria-label={appMode === "tasks" ? "Задачи" : "Заметки"}
      >
        {!isFacilityMode ? <PaneResizer listRef={listRef} /> : null}
        <div className={`search-box list-search ${globalSearch && appMode === "vault" ? "global-active" : ""}`}>
          <Search size={17} />
          <input
            value={appMode === "tasks" ? taskQuery : query}
            onChange={(e) => (appMode === "tasks" ? setTaskQuery(e.target.value) : setQuery(e.target.value))}
            onFocus={() => {
              if (appMode === "tasks") setGlobalSearch(false);
            }}
            placeholder={appMode === "tasks" ? "Поиск по задачам" : globalSearch ? "Поиск по всем проектам…" : "Поиск по заметкам"}
          />
          {appMode === "vault" ? (
            <button
              className={`search-global-toggle ${globalSearch ? "active" : ""}`}
              onClick={() => setGlobalSearch((v) => !v)}
              title="Поиск по всем проектам"
            >
              ALL
            </button>
          ) : null}
        </div>

        <div className="list-header">
          <div>
            <p className="overline">
              {appMode === "tasks"
                ? `${activeProject?.name ?? "Проект"} · Задачи`
                : globalSearch
                  ? "Глобальный поиск"
                  : `${activeProject?.name ?? "Проект"} · ${activeVaultMeta.label}`}
            </p>
            <h2>
              {appMode === "tasks"
                ? `${filteredTasks.length} задач`
                : `${filteredNotes.length} ${activeVault === "passwords" ? "паролей" : activeVault === "instructions" ? "инструкций" : "записей"}`}
            </h2>
          </div>
          <div className="list-tools">
            <button
              className="icon-button mobile-project-create"
              type="button"
              title="Новый проект"
              aria-label="Новый проект"
              onClick={() => setShowProjectModal("new")}
            >
              <FolderPlus size={16} />
            </button>
            {appMode === "vault" && activeVault === "passwords" ? (
              <button
                className="icon-button mobile-password-export"
                type="button"
                title="Экспорт паролей"
                aria-label="Экспорт паролей"
                onClick={() => setShowPasswordExport(true)}
              >
                <Download size={16} />
              </button>
            ) : null}
            {appMode === "tasks" ? (
              <div className="task-view-toggle segmented-control" aria-label="Вид задач">
                <button className={taskView === "board" ? "active" : ""} onClick={() => setTaskView("board")} title="Доска">
                  <Columns3 size={14} />
                  <span>Доска</span>
                </button>
                <button className={taskView === "overview" ? "active" : ""} onClick={() => setTaskView("overview")} title="Обзор">
                  <BarChart3 size={14} />
                  <span>Обзор</span>
                </button>
              </div>
            ) : null}
            {appMode === "vault" ? (
              <div className="view-toggle segmented-control">
                <button
                  type="button"
                  className={notesView === "table" ? "active" : ""}
                  onClick={() => setNotesView("table")}
                  title="Таблица"
                >
                  <Table2 size={14} />
                </button>
                <button
                  type="button"
                  className={notesView === "cards" ? "active" : ""}
                  onClick={() => {
                    setNotesView("cards");
                    setPreviewNoteId(null);
                  }}
                  title="Список"
                >
                  <LayoutList size={14} />
                </button>
              </div>
            ) : null}
            <button className="icon-button small-btn" onClick={() => setShowCommandPalette(true)} title="⌘K">
              <Search size={14} />
            </button>
            {appMode === "vault" ? (
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value as typeof sortMode)}>
                <option value="updated">Сначала новые</option>
                <option value="title">По названию</option>
                <option value="type">По типу</option>
              </select>
            ) : null}
          </div>
        </div>

        {appMode === "tasks" ? (
          <div className="tasks-board-container">
            {filteredTasks.length ? (
              taskView === "overview" ? (
                <TaskInsights tasks={filteredTasks} />
              ) : (
                <TasksBoard
                  tasks={filteredTasks}
                  selectedId={selectedTaskId}
                  onSelect={(task) => {
                    setSelectedTask(task.id);
                    setMobilePane("detail");
                    if (token) {
                      void api.tasks.get(token, task.id).then(upsertTask);
                    }
                  }}
                  onCreate={(status) => void createTask(status)}
                  onStatusChange={(task, status) => void updateTaskStatus(task.id, status)}
                />
              )
            ) : (
              <div className="empty-list">
                <ListTodo size={32} strokeWidth={1.2} />
                <strong>Нет задач</strong>
                <span>Создайте задачу и отслеживайте время по проекту.</span>
                <button className="primary-button" onClick={() => void createTask()}>
                  <Plus size={16} />
                  Создать задачу
                </button>
              </div>
            )}
          </div>
        ) : (
        <div className={notesView === "table" ? "notes-table-container" : "notes-stack"}>
          {filteredNotes.length ? (
            notesView === "table" ? (
              <NotesTable
                notes={filteredNotes}
                vaultSection={activeVault}
                selectedId={selectedNoteId}
                previewId={previewNoteId}
                globalSearch={globalSearch}
                activeProjectId={activeProjectId}
                onPreview={(note) => setPreviewNoteId(note.id)}
                onOpen={(note) => openNote(note.id, note.projectId)}
                onSwitchProject={(id) => void switchProject(id)}
              />
            ) : (
            filteredNotes.map((note) => {
              const TypeIcon = noteTypeIcons[note.type];
              return (
                <button
                  key={note.id}
                  className={`note-row-v2 ${note.id === selectedNoteId ? "selected" : ""}`}
                  style={{ "--note-type-color": noteTypeColors[note.type] } as React.CSSProperties}
                  onClick={() => openNote(note.id, note.projectId)}
                >
                  <span className="note-type-icon">
                    <TypeIcon size={16} />
                  </span>
                  <span className="note-row-body">
                    <span className="note-row-title">
                      {note.pinned ? <Pin size={12} className="pin-icon" /> : null}
                      {note.favorite ? <Star size={12} className="star-icon" fill="currentColor" /> : null}
                      <span className="note-row-title-text">{note.title}</span>
                      <span className={`note-row-badge badge-${note.type}`}>{typeLabels[note.type]}</span>
                    </span>
                    <span className="note-preview-text">
                      {note.type === "credential"
                        ? [note.login, note.url || note.host].filter(Boolean).join(" · ") || note.category
                        : extractTextPreview(note.content) || note.url || note.host || note.category}
                    </span>
                    <span className="note-meta">
                      {note.archived ? "Архив · " : ""}
                      {note.category}
                      {note.attachments.length ? ` · ${note.attachments.length} файл.` : ""}
                      {globalSearch && note.projectId !== activeProjectId ? " · другой проект" : ""}
                    </span>
                    {note.tags.length ? (
                      <span className="note-tags">
                        {note.tags.slice(0, 3).map((tag) => (
                          <em key={tag}>{tag}</em>
                        ))}
                      </span>
                    ) : null}
                  </span>
                  <span className="note-row-time">{formatDate(note.updatedAt)}</span>
                </button>
              );
            })
            )
          ) : (
            <div className="empty-list">
              <strong>Ничего не найдено</strong>
              <span>
                {activeVault === "passwords"
                  ? "Создайте пароль или импортируйте из Bitwarden / KeePass."
                  : "Создайте запись или измените фильтр."}
              </span>
              <div className="empty-list-actions">
                <button className="primary-button" onClick={() => void createNote()}>
                  <Plus size={16} />
                  Создать
                </button>
                {activeVault === "passwords" ? (
                  <>
                    <button className="ghost-button" onClick={() => setShowImport(true)}>
                      <Upload size={16} />
                      Импорт паролей
                    </button>
                    <button className="ghost-button" onClick={() => setShowPasswordExport(true)}>
                      <Download size={16} />
                      Экспорт
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>
        )}

        {appMode === "vault" && previewNote ? (
          <NoteQuickView
            note={previewNote}
            vaultSection={activeVault}
            onClose={() => setPreviewNoteId(null)}
            onOpen={() => openNote(previewNote.id, previewNote.projectId)}
          />
        ) : null}
      </section>

      <button className="mobile-detail-back" type="button" onClick={() => setMobilePane("list")}>
        <ArrowLeft size={18} />
        Назад
      </button>

      {isFacilityMode ? null : appMode === "tasks" ? (
        selectedTask ? (
          <TaskEditor
            key={selectedTask.id}
            task={selectedTask}
            onDeleted={() => {
              removeTask(selectedTask.id);
              setSelectedTask(tasks.find((t) => t.id !== selectedTask.id)?.id ?? null);
            }}
            onUpdated={upsertTask}
          />
        ) : (
          <section className="empty-editor">
            <ListTodo size={48} strokeWidth={1.2} />
            <strong>Выберите или создайте задачу</strong>
            <span>Запускайте таймер из боковой панели или карточки задачи</span>
          </section>
        )
      ) : selectedNote ? (
        <NoteEditor
          key={selectedNote.id}
          note={selectedNote}
          projects={projects}
          vaultSection={activeVault}
          onMoved={loadData}
        />
      ) : (
        <section className="empty-editor">
          <Server size={48} strokeWidth={1.2} />
          <strong>Выберите или создайте заметку</strong>
          <span>⌘N — новая заметка · ⌘K — командная палитра</span>
        </section>
      )}

      <nav className="mobile-bottom-nav" aria-label="Основная навигация">
        <button
          type="button"
          className={appMode === "vault" ? "active" : ""}
          onClick={() => switchAppMode("vault")}
        >
          <FolderOpen size={21} />
          <span>Хранилище</span>
        </button>
        <button
          type="button"
          className={appMode === "tasks" ? "active" : ""}
          onClick={() => switchAppMode("tasks")}
        >
          <CheckSquare size={21} />
          <span>Задачи</span>
        </button>
        <button
          type="button"
          className="mobile-create"
          aria-label={
            appMode === "tasks"
              ? "Новая задача"
              : isFacilityMode
                ? "Действие в разделе"
                : "Новая заметка"
          }
          onClick={() => {
            if (appMode === "tasks") {
              void createTask();
              setMobilePane("detail");
            } else if (appMode === "vault") {
              void createNote();
              setMobilePane("detail");
            } else {
              setShowMobileModules(true);
            }
          }}
        >
          <Plus size={25} />
        </button>
        <button
          type="button"
          className={isFacilityMode ? "active" : ""}
          onClick={() => setShowMobileModules(true)}
        >
          <LayoutGrid size={21} />
          <span>Разделы</span>
        </button>
        <button type="button" onClick={() => setShowMobileMenu(true)}>
          <Settings size={21} />
          <span>Меню</span>
        </button>
      </nav>

      {showMobileModules ? (
        <MobileModulesSheet
          appMode={appMode}
          onSelect={switchAppMode}
          onClose={() => setShowMobileModules(false)}
        />
      ) : null}

      {showMobileMenu ? (
        <MobileMenuSheet
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={(id) => void switchProject(id)}
          onNewProject={() => setShowProjectModal("new")}
          onSearch={() => setShowCommandPalette(true)}
          onSettings={() => setShowSettings(true)}
          onClose={() => setShowMobileMenu(false)}
        />
      ) : null}

      {showProjectShare && activeProjectId && token ? (
        <ShareModal
          token={token}
          projectId={activeProjectId}
          vaultSection={activeVault}
          onClose={() => setShowProjectShare(false)}
        />
      ) : null}

      {showProjectMembers && activeProjectId && activeProject && token ? (
        <ProjectMembersModal
          token={token}
          projectId={activeProjectId}
          projectName={activeProject.name}
          billing={billing}
          onClose={() => setShowProjectMembers(false)}
          onChanged={() => void loadData()}
        />
      ) : null}

      {showPricing && token ? (
        <PricingModal
          token={token}
          onClose={() => setShowPricing(false)}
          onSubscribed={(status) => {
            setBilling(status);
            void loadData();
          }}
        />
      ) : null}

      {showAdminUsers && token && user ? (
        <AdminUsersModal token={token} currentUserId={user.id} onClose={() => setShowAdminUsers(false)} />
      ) : null}

      {showProjectModal ? (
        <ProjectModal
          project={showProjectModal === "new" ? null : showProjectModal}
          onClose={() => setShowProjectModal(null)}
          onSave={saveProject}
          onDelete={showProjectModal !== "new" ? deleteProject : undefined}
          onExport={showProjectModal !== "new" ? () => void exportProject() : undefined}
        />
      ) : null}

      {showImport && activeProjectId && token ? (
        <ImportModal
          token={token}
          projectId={activeProjectId}
          vaultSection={activeVault}
          onClose={() => setShowImport(false)}
          onImported={() => void loadData()}
        />
      ) : null}

      {showPasswordExport && activeProjectId && activeProject && token ? (
        <ExportPasswordsModal
          token={token}
          projectId={activeProjectId}
          projectName={activeProject.name}
          onClose={() => setShowPasswordExport(false)}
        />
      ) : null}

      {showShareLinks && token ? (
        <ShareLinksPanel token={token} onClose={() => setShowShareLinks(false)} />
      ) : null}

      {showSettings && token ? (
        <SettingsModal
          token={token}
          theme={theme}
          onThemeChange={setTheme}
          userName={user?.name}
          userEmail={user?.email}
          onProfileUpdate={(name) => user && setUser({ ...user, name })}
          onShowShortcuts={() => {
            setShowSettings(false);
            setShowShortcuts(true);
          }}
          onShowShares={() => {
            setShowSettings(false);
            setShowShareLinks(true);
          }}
          billing={billing}
          onBillingChange={setBilling}
          onOpenPricing={() => setShowPricing(true)}
          onClose={() => setShowSettings(false)}
        />
      ) : null}

      {showShortcuts ? <ShortcutsHelp onClose={() => setShowShortcuts(false)} /> : null}

      <CommandPalette
        open={showCommandPalette}
        onClose={() => {
          setShowCommandPalette(false);
          setCommandQuery("");
        }}
        query={commandQuery}
        onQueryChange={setCommandQuery}
        notes={allNotes}
        onSelectNote={(id) => {
          const note = allNotes.find((n) => n.id === id);
          if (note && note.projectId !== activeProjectId) void switchProject(note.projectId);
          setSelectedNote(id);
        }}
        actions={commandActions}
      />
    </main>
  );
}
