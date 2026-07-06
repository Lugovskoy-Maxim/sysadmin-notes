"use client";

import type { Task, TaskStatus } from "@/lib/types";

const statusMeta: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: "К выполнению", color: "#8e8e93" },
  in_progress: { label: "В работе", color: "#ff9f0a" },
  done: { label: "Готово", color: "#34c759" },
};

export function TaskInsights({ tasks }: { tasks: Task[] }) {
  const counts = {
    todo: tasks.filter((task) => task.status === "todo").length,
    in_progress: tasks.filter((task) => task.status === "in_progress").length,
    done: tasks.filter((task) => task.status === "done").length,
  };
  const total = Math.max(tasks.length, 1);
  const donePercent = Math.round((counts.done / total) * 100);
  const inProgressPercent = Math.round((counts.in_progress / total) * 100);
  const donut = `conic-gradient(#34c759 0 ${donePercent}%, #ff9f0a ${donePercent}% ${donePercent + inProgressPercent}%, #8e8e93 ${donePercent + inProgressPercent}% 100%)`;
  const timeTasks = [...tasks].sort((a, b) => (b.trackedSeconds ?? 0) - (a.trackedSeconds ?? 0)).slice(0, 6);
  const maxSeconds = Math.max(...timeTasks.map((task) => task.trackedSeconds ?? 0), 1);
  const ganttTasks = tasks.slice(0, 8);
  const today = new Date();
  const rangeStart = new Date(today);
  rangeStart.setDate(today.getDate() - 2);
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(rangeStart);
    date.setDate(rangeStart.getDate() + index);
    return date;
  });

  return (
    <div className="task-insights">
      <section className="task-summary" aria-label="Сводка задач">
        <Summary label="Всего задач" value={tasks.length} />
        <Summary label="В работе" value={counts.in_progress} tone="orange" />
        <Summary label="Выполнено" value={counts.done} tone="green" />
      </section>

      <div className="task-chart-grid">
        <section className="insight-panel status-chart">
          <h3>Статус задач</h3>
          <div className="donut-layout">
            <div className="task-donut" style={{ background: donut }}>
              <span><strong>{tasks.length}</strong>всего</span>
            </div>
            <ul>
              {(Object.keys(statusMeta) as TaskStatus[]).map((status) => (
                <li key={status}>
                  <i style={{ background: statusMeta[status].color }} />
                  <span>{statusMeta[status].label}</span>
                  <strong>{counts[status]}</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="insight-panel time-chart">
          <h3>Учтённое время</h3>
          <div className="bar-chart" aria-label="Время по задачам">
            {timeTasks.length ? timeTasks.map((task) => {
              const hours = (task.trackedSeconds ?? 0) / 3600;
              const height = Math.max(8, ((task.trackedSeconds ?? 0) / maxSeconds) * 100);
              return (
                <div className="bar-column" key={task.id} title={`${task.title}: ${hours.toFixed(1)} ч`}>
                  <span>{hours ? hours.toFixed(1) : "0"}</span>
                  <i style={{ height: `${height}%` }} />
                  <small>{task.title.slice(0, 7)}</small>
                </div>
              );
            }) : <p className="chart-empty">Запустите таймер — здесь появится статистика.</p>}
          </div>
        </section>
      </div>

      <section className="insight-panel gantt-panel">
        <header>
          <div>
            <h3>Диаграмма Ганта</h3>
            <p>{formatRange(days[0], days[days.length - 1])}</p>
          </div>
          <span>{ganttTasks.length} задач</span>
        </header>
        <div className="gantt-scroll">
          <div className="gantt-grid" style={{ "--gantt-days": days.length } as React.CSSProperties}>
            <div className="gantt-corner">Задача</div>
            <div className="gantt-days">
              {days.map((date) => (
                <span className={isSameDay(date, today) ? "today" : ""} key={date.toISOString()}>
                  <strong>{date.getDate()}</strong>
                  <small>{date.toLocaleDateString("ru-RU", { weekday: "short" }).slice(0, 2)}</small>
                </span>
              ))}
            </div>
            {ganttTasks.length ? ganttTasks.map((task, index) => {
              const start = Math.min(index % 6, 10);
              const dueOffset = task.dueDate
                ? Math.ceil((new Date(task.dueDate).getTime() - rangeStart.getTime()) / 86_400_000)
                : start + Math.max(2, Math.min(6, Math.ceil((task.estimatedMinutes ?? 180) / 240)));
              const end = Math.max(start + 1, Math.min(14, dueOffset + 1));
              return (
                <div className="gantt-row" key={task.id}>
                  <div className="gantt-task-name">
                    <strong>{task.title}</strong>
                    <small>{statusMeta[task.status].label}</small>
                  </div>
                  <div className="gantt-track">
                    <span
                      className={`gantt-bar gantt-${task.status}`}
                      style={{ gridColumn: `${start + 1} / ${end + 1}` }}
                      title={task.title}
                    />
                  </div>
                </div>
              );
            }) : <p className="gantt-empty">Создайте задачи, чтобы построить план.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone?: "green" | "orange" }) {
  return (
    <div>
      <span>{label}</span>
      <strong className={tone ? `tone-${tone}` : ""}>{value}</strong>
    </div>
  );
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function formatRange(from: Date, to: Date) {
  return `${from.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} — ${to.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`;
}
