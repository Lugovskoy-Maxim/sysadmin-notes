"use client";

import {
  Building2,
  CalendarDays,
  CheckSquare,
  FolderOpen,
  KeyRound,
  Map,
  Package,
  Search,
  Users,
  Settings,
  X,
} from "lucide-react";
import type { AppMode, Project } from "@/lib/types";

type MobileModulesSheetProps = {
  appMode: AppMode;
  onSelect: (mode: AppMode) => void;
  onClose: () => void;
};

const modules: { id: AppMode; label: string; icon: typeof KeyRound }[] = [
  { id: "vault", label: "Хранилище", icon: KeyRound },
  { id: "tasks", label: "Задачи", icon: CheckSquare },
  { id: "calendar", label: "Календарь", icon: CalendarDays },
  { id: "inventory", label: "Склад", icon: Package },
  { id: "equipment", label: "Оснащение", icon: Building2 },
  { id: "network", label: "Карта сети", icon: Map },
  { id: "contacts", label: "Контакты", icon: Users },
];

export function MobileModulesSheet({ appMode, onSelect, onClose }: MobileModulesSheetProps) {
  return (
    <div className="mobile-sheet-overlay" onClick={onClose}>
      <div className="mobile-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="mobile-sheet-head">
          <h3>Разделы</h3>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </header>
        <div className="mobile-sheet-grid">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                type="button"
                className={`mobile-sheet-tile ${appMode === module.id ? "active" : ""}`}
                onClick={() => {
                  onSelect(module.id);
                  onClose();
                }}
              >
                <Icon size={22} />
                <span>{module.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type MobileMenuSheetProps = {
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onSearch: () => void;
  onSettings: () => void;
  onClose: () => void;
};

export function MobileMenuSheet({
  projects,
  activeProjectId,
  onSelectProject,
  onNewProject,
  onSearch,
  onSettings,
  onClose,
}: MobileMenuSheetProps) {
  return (
    <div className="mobile-sheet-overlay" onClick={onClose}>
      <div className="mobile-sheet mobile-sheet-tall" onClick={(e) => e.stopPropagation()}>
        <header className="mobile-sheet-head">
          <h3>Меню</h3>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </header>

        <button type="button" className="mobile-sheet-action" onClick={() => { onSearch(); onClose(); }}>
          <Search size={18} />
          Поиск и команды
        </button>
        <button type="button" className="mobile-sheet-action" onClick={() => { onSettings(); onClose(); }}>
          <Settings size={18} />
          Настройки
        </button>

        <p className="mobile-sheet-label">Проекты</p>
        <div className="mobile-project-list">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className={project.id === activeProjectId ? "active" : ""}
              style={{ "--project-color": project.color } as React.CSSProperties}
              onClick={() => {
                onSelectProject(project.id);
                onClose();
              }}
            >
              <FolderOpen size={16} />
              <span>{project.name}</span>
              <em>{project._count?.notes ?? 0}</em>
            </button>
          ))}
          <button type="button" className="mobile-project-new" onClick={() => { onNewProject(); onClose(); }}>
            <FolderOpen size={16} />
            Новый проект
          </button>
        </div>
      </div>
    </div>
  );
}