import type { TaskPriority, TaskStatus } from "./types";

export function formatDuration(seconds: number) {
  if (!seconds || seconds < 0) return "0м";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}ч ${m.toString().padStart(2, "0")}м`;
  if (m > 0) return s > 0 ? `${m}м ${s}с` : `${m}м`;
  return `${s}с`;
}

export function formatDurationClock(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
}

export function elapsedSeconds(startedAt: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
}

export function isOverdue(dueDate?: string | null, status?: TaskStatus) {
  if (!dueDate || status === "done") return false;
  return new Date(dueDate).getTime() < Date.now();
}

export function dueDateLabel(dueDate?: string | null) {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Завтра";
  if (diff === -1) return "Вчера";
  if (diff < -1) return `Просрочено ${Math.abs(diff)} дн.`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export const statusOrder: TaskStatus[] = ["todo", "in_progress", "done"];

export const priorityColors: Record<TaskPriority, string> = {
  low: "var(--muted)",
  medium: "var(--teal)",
  high: "var(--danger)",
};