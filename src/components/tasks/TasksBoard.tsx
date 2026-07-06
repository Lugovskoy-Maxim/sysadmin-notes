"use client";

import { Calendar, Clock, GripVertical, Plus } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/types";
import { taskPriorityLabels, taskStatusLabels } from "@/lib/types";
import { dueDateLabel, formatDuration, isOverdue, statusOrder } from "@/lib/task-utils";

type TasksBoardProps = {
  tasks: Task[];
  selectedId: string | null;
  onSelect: (task: Task) => void;
  onCreate: (status?: TaskStatus) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
};

export function TasksBoard({ tasks, selectedId, onSelect, onCreate, onStatusChange }: TasksBoardProps) {
  const grouped = statusOrder.map((status) => ({
    status,
    label: taskStatusLabels[status],
    items: tasks.filter((t) => t.status === status),
  }));

  return (
    <div className="tasks-board">
      {grouped.map((column) => (
        <section key={column.status} className={`tasks-column tasks-column-${column.status}`}>
          <header className="tasks-column-head">
            <strong>{column.label}</strong>
            <span className="tasks-column-count">{column.items.length}</span>
            <button
              type="button"
              className="icon-button small-btn"
              title="Новая задача"
              onClick={() => onCreate(column.status)}
            >
              <Plus size={14} />
            </button>
          </header>

          <div className="tasks-column-list">
            {column.items.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                selected={selectedId === task.id}
                onSelect={() => onSelect(task)}
                onStatusChange={(status) => onStatusChange(task, status)}
              />
            ))}
            {!column.items.length ? (
              <button type="button" className="tasks-column-empty" onClick={() => onCreate(column.status)}>
                Добавить задачу
              </button>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}

function TaskCard({
  task,
  selected,
  onSelect,
  onStatusChange,
}: {
  task: Task;
  selected: boolean;
  onSelect: () => void;
  onStatusChange: (status: TaskStatus) => void;
}) {
  const overdue = isOverdue(task.dueDate, task.status);
  const due = dueDateLabel(task.dueDate);

  return (
    <article
      className={`task-card priority-${task.priority} ${selected ? "selected" : ""} ${overdue ? "overdue" : ""}`}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      role="button"
      tabIndex={0}
    >
      <div className="task-card-top">
        <GripVertical size={12} className="task-card-grip" aria-hidden />
        <strong>{task.title}</strong>
      </div>

      {task.description ? <p className="task-card-desc">{task.description}</p> : null}

      <div className="task-card-meta">
        <span className={`task-priority priority-${task.priority}`}>{taskPriorityLabels[task.priority]}</span>
        {due ? (
          <span className={`task-due ${overdue ? "overdue" : ""}`}>
            <Calendar size={11} />
            {due}
          </span>
        ) : null}
        {(task.trackedSeconds ?? 0) > 0 ? (
          <span className="task-tracked">
            <Clock size={11} />
            {formatDuration(task.trackedSeconds ?? 0)}
          </span>
        ) : null}
      </div>

      <div className="task-card-actions" onClick={(e) => e.stopPropagation()}>
        {task.status !== "todo" ? (
          <button type="button" className="ghost-button compact" onClick={() => onStatusChange("todo")}>
            ← К выполнению
          </button>
        ) : null}
        {task.status !== "in_progress" ? (
          <button type="button" className="ghost-button compact" onClick={() => onStatusChange("in_progress")}>
            В работу
          </button>
        ) : null}
        {task.status !== "done" ? (
          <button type="button" className="ghost-button compact" onClick={() => onStatusChange("done")}>
            Готово
          </button>
        ) : null}
      </div>
    </article>
  );
}