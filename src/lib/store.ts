"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppMode, BillingStatus, Note, Project, Task, Theme, TimeEntry, User } from "./types";
import { applyTheme, normalizeTheme } from "./utils";

export type NotesView = "cards" | "table";

type AppState = {
  token: string | null;
  user: User | null;
  projects: Project[];
  notes: Note[];
  allNotes: Note[];
  activeProjectId: string | null;
  selectedNoteId: string | null;
  theme: Theme;
  notesView: NotesView;
  sidebarCollapsed: boolean;
  shellListWidth: number | null;
  shellEditorWidth: number | null;
  tasks: Task[];
  selectedTaskId: string | null;
  activeTimer: TimeEntry | null;
  appMode: AppMode;
  billing: BillingStatus | null;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  setBilling: (billing: BillingStatus | null) => void;
  clearAuth: () => void;
  setProjects: (projects: Project[]) => void;
  setNotes: (notes: Note[]) => void;
  setAllNotes: (notes: Note[]) => void;
  setActiveProject: (id: string) => void;
  setSelectedNote: (id: string | null) => void;
  setTheme: (theme: Theme) => void;
  setNotesView: (view: NotesView) => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  setShellListWidth: (v: number | null) => void;
  setShellEditorWidth: (v: number | null) => void;
  setTasks: (tasks: Task[]) => void;
  setSelectedTask: (id: string | null) => void;
  setActiveTimer: (entry: TimeEntry | null) => void;
  setAppMode: (mode: AppMode) => void;
  upsertTask: (task: Task) => void;
  removeTask: (id: string) => void;
  upsertNote: (note: Note) => void;
  removeNote: (id: string) => void;
  upsertProject: (project: Project) => void;
  removeProject: (id: string) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      projects: [],
      notes: [],
      allNotes: [],
      activeProjectId: null,
      selectedNoteId: null,
      theme: "dark",
      notesView: "cards",
      sidebarCollapsed: false,
      shellListWidth: null,
      shellEditorWidth: null,
      tasks: [],
      selectedTaskId: null,
      activeTimer: null,
      appMode: "vault",
      billing: null,
      setAuth: (token, user) =>
        set((state) => {
          const accountChanged = Boolean(state.user?.id && state.user.id !== user.id);
          return {
            token,
            user,
            ...(accountChanged
              ? {
                  projects: [],
                  notes: [],
                  allNotes: [],
                  activeProjectId: null,
                  selectedNoteId: null,
                  tasks: [],
                  selectedTaskId: null,
                  activeTimer: null,
                  appMode: "vault" as const,
                  billing: null,
                }
              : {}),
          };
        }),
      setUser: (user) => set({ user }),
      setBilling: (billing) => set({ billing }),
      clearAuth: () =>
        set({
          token: null,
          user: null,
          billing: null,
          projects: [],
          notes: [],
          allNotes: [],
          activeProjectId: null,
          selectedNoteId: null,
          tasks: [],
          selectedTaskId: null,
          activeTimer: null,
          appMode: "vault",
        }),
      setProjects: (projects) => set({ projects }),
      setNotes: (notes) => set({ notes }),
      setAllNotes: (notes) => set({ allNotes: notes }),
      setActiveProject: (id) => set({ activeProjectId: id, selectedNoteId: null, selectedTaskId: null }),
      setSelectedNote: (id) => set({ selectedNoteId: id }),
      setTheme: (theme) => set({ theme }),
      setNotesView: (notesView) => set({ notesView }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setShellListWidth: (shellListWidth) => set({ shellListWidth }),
      setShellEditorWidth: (shellEditorWidth) => set({ shellEditorWidth }),
      setTasks: (tasks) => set({ tasks }),
      setSelectedTask: (id) => set({ selectedTaskId: id }),
      setActiveTimer: (entry) => set({ activeTimer: entry }),
      setAppMode: (appMode) => set({ appMode }),
      upsertTask: (task) =>
        set((state) => {
          const inProject = task.projectId === state.activeProjectId;
          const updateList = (list: Task[]) => {
            const exists = list.some((item) => item.id === task.id);
            if (!exists) return [task, ...list];
            return list.map((item) => (item.id === task.id ? task : item));
          };
          return {
            tasks: inProject ? updateList(state.tasks) : state.tasks.filter((t) => t.id !== task.id),
          };
        }),
      removeTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
          selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
        })),
      upsertNote: (note) =>
        set((state) => {
          const inProject = note.projectId === state.activeProjectId;
          const updateList = (list: Note[]) => {
            const exists = list.some((item) => item.id === note.id);
            if (!exists) return [note, ...list];
            return list.map((item) => (item.id === note.id ? note : item));
          };
          return {
            notes: inProject ? updateList(state.notes) : state.notes.filter((n) => n.id !== note.id),
            allNotes: updateList(state.allNotes),
          };
        }),
      removeNote: (id) =>
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id),
          allNotes: state.allNotes.filter((note) => note.id !== id),
          selectedNoteId: state.selectedNoteId === id ? null : state.selectedNoteId,
        })),
      upsertProject: (project) =>
        set((state) => {
          const exists = state.projects.some((item) => item.id === project.id);
          return {
            projects: exists
              ? state.projects.map((item) => (item.id === project.id ? project : item))
              : [project, ...state.projects],
          };
        }),
      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== id),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        })),
    }),
    {
      name: "sysadmin-notes-store",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        activeProjectId: state.activeProjectId,
        theme: state.theme,
        notesView: state.notesView,
        sidebarCollapsed: state.sidebarCollapsed,
        shellListWidth: state.shellListWidth,
        shellEditorWidth: state.shellEditorWidth,
        appMode: state.appMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const theme = normalizeTheme(state.theme);
        if (theme !== state.theme) state.setTheme(theme);
        applyTheme(theme);
      },
    },
  ),
);
