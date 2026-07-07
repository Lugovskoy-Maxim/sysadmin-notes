"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, Clock, Play, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import type { ProjectMember, Task, TaskPriority, TaskStatus, TimeEntry } from "@/lib/types";
import { taskPriorityLabels, taskStatusLabels } from "@/lib/types";
import { formatDuration } from "@/lib/task-utils";
import { formatDate } from "@/lib/utils";

type TaskEditorProps = {
  task: Task;
  onDeleted: () => void;
  onUpdated: (task: Task) => void;
};

export function TaskEditor({ task, onDeleted, onUpdated }: TaskEditorProps) {
  const token = useAppStore((s) => s.token);
  const projects = useAppStore((s) => s.projects);
  const activeTimer = useAppStore((s) => s.activeTimer);
  const setActiveTimer = useAppStore((s) => s.setActiveTimer);
  const toast = useToast((s) => s.push);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate?.slice(0, 10) ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(task.estimatedMinutes?.toString() ?? "");
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? "");
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(task.timeEntries ?? []);
  const project = projects.find((item) => item.id === task.projectId);
  const canAssign = project?.capabilities?.assignees ?? false;
  const [saving, setSaving] = useState(false);
  const skipInitialSave = useRef(true);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setStatus(task.status);
    setPriority(task.priority);
    setDueDate(task.dueDate?.slice(0, 10) ?? "");
    setEstimatedMinutes(task.estimatedMinutes?.toString() ?? "");
    setAssigneeId(task.assigneeId ?? "");
    setTimeEntries(task.timeEntries ?? []);
  }, [task.id, task.updatedAt]);

  useEffect(() => {
    if (!token || !canAssign) return;
    void api.projects.listMembers(token, task.projectId).then(setMembers).catch(() => setMembers([]));
  }, [token, task.projectId, canAssign]);

  useEffect(() => {
    if (!token) return;
    void api.tasks.get(token, task.id).then((full) => {
      setTimeEntries(full.timeEntries ?? []);
    });
  }, [task.id, token]);

  const save = useCallback(async () => {
    if (!token) return;
    setSaving(true);
    try {
      const updated = await api.tasks.update(token, task.id, {
        title: title.trim() || task.title,
        description: description.trim() || null,
        status,
        priority,
        dueDate: dueDate || null,
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
        assigneeId: canAssign ? assigneeId || null : undefined,
      });
      onUpdated(updated);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка сохранения", "error");
    } finally {
      setSaving(false);
    }
  }, [token, task.id, task.title, title, description, status, priority, dueDate, estimatedMinutes, assigneeId, canAssign, onUpdated, toast]);

  useEffect(() => {
    if (skipInitialSave.current) {
      skipInitialSave.current = false;
      return;
    }
    const timer = setTimeout(() => void save(), 600);
    return () => clearTimeout(timer);
  }, [title, description, status, priority, dueDate, estimatedMinutes, assigneeId, save]);

  useEffect(() => {
    skipInitialSave.current = true;
  }, [task.id]);

  async function startTimerForTask() {
    if (!token) return;
    try {
      const entry = await api.timeEntries.start(token, { projectId: task.projectId, taskId: task.id });
      setActiveTimer(entry);
      if (status !== "in_progress") {
        const updated = await api.tasks.update(token, task.id, { status: "in_progress" });
        setStatus("in_progress");
        onUpdated(updated);
      }
      toast("Таймер запущен", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Не удалось запустить", "error");
    }
  }

  async function deleteTask() {
    if (!token || !confirm("Удалить задачу?")) return;
    await api.tasks.remove(token, task.id);
    toast("Задача удалена", "info");
    onDeleted();
  }

  async function deleteEntry(id: string) {
    if (!token) return;
    await api.timeEntries.remove(token, id);
    setTimeEntries((list) => list.filter((e) => e.id !== id));
    const refreshed = await api.tasks.get(token, task.id);
    onUpdated(refreshed);
    toast("Запись удалена", "info");
  }

  const isTimerOnThisTask = activeTimer?.taskId === task.id && !activeTimer.endedAt;

  return (
    <section className="task-editor editor">
      <header className="editor-header">
        <div className="editor-header-main">
          <p className="overline">Задача</p>
          <input
            className="editor-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название задачи"
          />
          <span className="editor-meta">
            {saving ? "Сохранение…" : "Сохранено"} · {formatDate(task.updatedAt)}
          </span>
        </div>
        <div className="header-action-group">
          <button
            type="button"
            className="primary-button compact"
            onClick={() => void startTimerForTask()}
            disabled={!!isTimerOnThisTask}
          >
            <Play size={14} />
            {isTimerOnThisTask ? "Таймер идёт" : "Старт"}
          </button>
          <button type="button" className="danger-button compact" onClick={() => void deleteTask()}>
            <Trash2 size={14} />
          </button>
        </div>
      </header>

      <div className="task-editor-grid">
        <label className="form-control">
          <span>Статус</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {(Object.keys(taskStatusLabels) as TaskStatus[]).map((s) => (
              <option key={s} value={s}>
                {taskStatusLabels[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control">
          <span>Приоритет</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
            {(Object.keys(taskPriorityLabels) as TaskPriority[]).map((p) => (
              <option key={p} value={p}>
                {taskPriorityLabels[p]}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control">
          <span>
            <Calendar size={12} /> Срок
          </span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>

        <label className="form-control">
          <span>Оценка (мин)</span>
          <input
            type="number"
            min={0}
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(e.target.value)}
            placeholder="60"
          />
        </label>

        {canAssign ? (
          <label className="form-control">
            <span>Исполнитель</span>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Не назначен</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.user.name} ({member.role === "owner" ? "владелец" : member.role})
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="form-control wide">
          <span>Описание</span>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Детали, чеклист, ссылки…"
          />
        </label>
      </div>

      <section className="task-time-section">
        <header className="section-head">
          <p className="overline">
            <Clock size={12} /> Учёт времени
          </p>
          <strong>{formatDuration(task.trackedSeconds ?? 0)}</strong>
        </header>

        {timeEntries.length ? (
          <ul className="time-log-list">
            {timeEntries.map((entry) => (
              <li key={entry.id} className="time-log-item">
                <div>
                  <strong>{formatDuration(entry.duration ?? 0)}</strong>
                  <span>
                    {new Date(entry.startedAt).toLocaleString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {entry.memo ? ` · ${entry.memo}` : ""}
                  </span>
                </div>
                <button type="button" className="icon-button small-btn" onClick={() => void deleteEntry(entry.id)}>
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="task-time-empty">Пока нет записей. Запустите таймер из карточки или боковой панели.</p>
        )}
      </section>
    </section>
  );
}