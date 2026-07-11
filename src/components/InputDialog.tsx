"use client";

import { useState } from "react";
import { X } from "lucide-react";

type InputDialogProps = {
  title: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
};

export function InputDialog({ title, label, placeholder, defaultValue = "", onConfirm, onClose }: InputDialogProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="modal-overlay input-dialog-overlay" onClick={onClose}>
      <div className="modal-card input-dialog" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="overline">Ввод</p>
            <h3>{title}</h3>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">
          <label className="field-label">{label}</label>
          <input
            className="text-field"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter" && value.trim()) {
                onConfirm(value.trim());
                onClose();
              }
            }}
          />
          <div className="dialog-actions">
            <button className="ghost-button" onClick={onClose}>
              Отмена
            </button>
            <button
              className="primary-button"
              disabled={!value.trim()}
              onClick={() => {
                onConfirm(value.trim());
                onClose();
              }}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}