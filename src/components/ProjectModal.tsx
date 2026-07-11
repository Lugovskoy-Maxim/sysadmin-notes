"use client";

import { useState } from "react";
import { Cloud, Database, Download, Network, Server, Shield, Terminal, Trash2, X } from "lucide-react";
import type { Project } from "@/lib/types";
import { projectColors, projectIcons } from "@/lib/types";

const iconMap = {
  server: Server,
  cloud: Cloud,
  database: Database,
  shield: Shield,
  network: Network,
  terminal: Terminal,
};

type ProjectModalProps = {
  project?: Project | null;
  onClose: () => void;
  onSave: (data: { name: string; description?: string; color: string; icon: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onExport?: () => void;
};

export function ProjectModal({ project, onClose, onSave, onDelete, onExport }: ProjectModalProps) {
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [color, setColor] = useState(project?.color ?? projectColors[0]);
  const [icon, setIcon] = useState(project?.icon ?? projectIcons[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onSave({ name: name.trim(), description: description.trim() || undefined, color, icon });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить проект");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!onDelete || !confirm(`Удалить проект «${project?.name}» и все заметки?`)) return;
    setLoading(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card project-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="overline">Проект</p>
            <h3>{project ? "Редактировать" : "Новый проект"}</h3>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="modal-body">
          <label className="field-label">Название</label>
          <input className="text-field" value={name} onChange={(e) => setName(e.target.value)} autoFocus />

          <label className="field-label">Описание</label>
          <input
            className="text-field"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Краткое описание"
          />

          <label className="field-label">Цвет</label>
          <div className="color-picker">
            {projectColors.map((c) => (
              <button
                key={c}
                type="button"
                className={color === c ? "active" : ""}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`Цвет ${c}`}
              />
            ))}
          </div>

          <label className="field-label">Иконка</label>
          <div className="icon-picker">
            {projectIcons.map((key) => {
              const Icon = iconMap[key];
              return (
                <button key={key} type="button" className={icon === key ? "active" : ""} onClick={() => setIcon(key)}>
                  <Icon size={16} />
                </button>
              );
            })}
          </div>

          <button className="primary-button full" onClick={() => void handleSubmit()} disabled={loading || !name.trim()}>
            {loading ? "Сохранение..." : project ? "Сохранить" : "Создать проект"}
          </button>
          {error ? <p className="form-error project-form-error">{error}</p> : null}

          {project ? (
            <div className="project-modal-actions">
              {onExport ? (
                <button className="ghost-button" onClick={onExport}>
                  <Download size={16} />
                  Экспорт JSON
                </button>
              ) : null}
              {onDelete ? (
                <button className="danger-button" onClick={() => void handleDelete()} disabled={loading}>
                  <Trash2 size={16} />
                  Удалить проект
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
