"use client";

import { X } from "lucide-react";

const shortcuts = [
  { keys: ["⌘", "K"], desc: "Командная палитра" },
  { keys: ["⌘", "N"], desc: "Новая заметка" },
  { keys: ["⌘", "B"], desc: "Свернуть боковую панель" },
  { keys: ["⌘", ","], desc: "Настройки" },
  { keys: ["Esc"], desc: "Закрыть модальное окно" },
  { keys: ["↑", "↓"], desc: "Навигация в палитре" },
  { keys: ["Enter"], desc: "Выбрать в палитре" },
];

type ShortcutsHelpProps = {
  onClose: () => void;
};

export function ShortcutsHelp({ onClose }: ShortcutsHelpProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="overline">Справка</p>
            <h3>Горячие клавиши</h3>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="modal-body shortcuts-list">
          {shortcuts.map((s) => (
            <div key={s.desc} className="shortcut-row">
              <div className="shortcut-keys">
                {s.keys.map((k) => (
                  <kbd key={k}>{k}</kbd>
                ))}
              </div>
              <span>{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}