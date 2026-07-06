"use client";

import { useEffect, useState } from "react";
import { Clock, Play, Square } from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import type { Task, TimeSummary } from "@/lib/types";
import { elapsedSeconds, formatDuration, formatDurationClock } from "@/lib/task-utils";

type TimeTrackerProps = {
  projectId: string | null;
  tasks: Task[];
  selectedTaskId: string | null;
};

export function TimeTracker({ projectId, tasks, selectedTaskId }: TimeTrackerProps) {
  const token = useAppStore((s) => s.token);
  const activeTimer = useAppStore((s) => s.activeTimer);
  const setActiveTimer = useAppStore((s) => s.setActiveTimer);
  const upsertTask = useAppStore((s) => s.upsertTask);
  const toast = useToast((s) => s.push);

  const [summary, setSummary] = useState<TimeSummary | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!token) return;
    void api.timeEntries.active(token).then(setActiveTimer).catch(() => setActiveTimer(null));
  }, [token, setActiveTimer]);

  useEffect(() => {
    if (!token || !projectId) {
      setSummary(null);
      return;
    }
    void api.timeEntries.summary(token, projectId, "today").then(setSummary).catch(() => setSummary(null));
  }, [token, projectId, activeTimer?.endedAt]);

  useEffect(() => {
    if (!activeTimer || activeTimer.endedAt) return;
    const timer = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [activeTimer]);

  const runningSeconds = activeTimer && !activeTimer.endedAt
    ? elapsedSeconds(activeTimer.startedAt)
    : 0;

  async function startTimer() {
    if (!token || !projectId) return;
    try {
      const entry = await api.timeEntries.start(token, {
        projectId,
        taskId: selectedTaskId ?? undefined,
      });
      setActiveTimer(entry);
      if (selectedTaskId) {
        const task = tasks.find((t) => t.id === selectedTaskId);
        if (task) upsertTask({ ...task, status: "in_progress" });
      }
      toast("Таймер запущен", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Не удалось запустить таймер", "error");
    }
  }

  async function stopTimer() {
    if (!token || !activeTimer) return;
    try {
      const entry = await api.timeEntries.stop(token, activeTimer.id);
      setActiveTimer(null);
      if (entry.taskId) {
        const updated = await api.tasks.get(token, entry.taskId);
        upsertTask(updated);
      }
      if (projectId) {
        void api.timeEntries.summary(token, projectId, "today").then(setSummary).catch(() => setSummary(null));
      }
      toast(`Записано ${formatDuration(entry.duration ?? 0)}`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Не удалось остановить таймер", "error");
    }
  }

  if (!projectId) return null;

  const activeTask = activeTimer?.task ?? (activeTimer?.taskId ? tasks.find((t) => t.id === activeTimer.taskId) : null);

  return (
    <div className="time-tracker">
      <div className="time-tracker-head">
        <Clock size={14} />
        <strong>Учёт времени</strong>
      </div>

      {activeTimer && !activeTimer.endedAt ? (
        <div className="time-tracker-active">
          <span className="time-tracker-clock" aria-live="polite">
            {formatDurationClock(runningSeconds)}
          </span>
          <span className="time-tracker-label">
            {activeTask ? (typeof activeTask === "object" && "title" in activeTask ? activeTask.title : "") : "Без задачи"}
          </span>
          <button type="button" className="danger-button compact" onClick={() => void stopTimer()}>
            <Square size={14} />
            Стоп
          </button>
        </div>
      ) : (
        <div className="time-tracker-idle">
          <button type="button" className="primary-button compact full" onClick={() => void startTimer()}>
            <Play size={14} />
            {selectedTaskId ? "Старт по задаче" : "Старт таймера"}
          </button>
        </div>
      )}

      {summary ? (
        <div className="time-tracker-stats">
          <span>Сегодня</span>
          <strong>{formatDuration(summary.totalSeconds)}</strong>
          <small>{summary.entriesCount} записей</small>
        </div>
      ) : null}

      {/* tick keeps clock live */}
      <span className="sr-only" aria-hidden>{tick}</span>
    </div>
  );
}