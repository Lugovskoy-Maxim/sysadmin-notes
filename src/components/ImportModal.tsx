"use client";

import { ChangeEvent, useState } from "react";
import { Upload, X, KeyRound, FileJson, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { Note, VaultSection } from "@/lib/types";
import {
  detectImportFormat,
  formatLabels,
  parsePasswordFile,
  type ParsedCredential,
} from "@/lib/password-import";

type ImportModalProps = {
  token: string;
  projectId: string;
  vaultSection?: VaultSection;
  onClose: () => void;
  onImported: () => void;
};

type ImportPayload = {
  notes?: Partial<Note>[];
  title?: string;
  projectId?: string;
};

type ImportTab = "passwords" | "notes";

export function ImportModal({ token, projectId, vaultSection, onClose, onImported }: ImportModalProps) {
  const toast = useToast((s) => s.push);
  const [tab, setTab] = useState<ImportTab>(vaultSection === "passwords" ? "passwords" : "notes");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{
    format: string;
    credentials: ParsedCredential[];
    notes: Partial<Note>[];
    filename: string;
  } | null>(null);

  async function handlePasswordFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setPreview(null);

    try {
      const text = await file.text();
      const format = detectImportFormat(text, file.name);

      if (format === "project-json") {
        throw new Error("Это экспорт проекта. Переключитесь на вкладку «Заметки».");
      }

      const result = parsePasswordFile(text, file.name);
      if (!result.credentials.length) {
        throw new Error("В файле не найдено записей для импорта");
      }

      setPreview({ ...result, format: formatLabels[result.format], filename: file.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка чтения файла");
    } finally {
      event.target.value = "";
    }
  }

  async function handleNotesFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    setPreview(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text) as ImportPayload | Partial<Note>;

      let notes: Partial<Note>[] = [];
      if (Array.isArray((data as ImportPayload).notes)) {
        notes = (data as ImportPayload).notes!;
      } else if ((data as Note).title) {
        notes = [data as Partial<Note>];
      } else {
        throw new Error("Неверный формат файла");
      }

      const result = await api.projects.import(token, projectId, notes);
      toast(`Импортировано ${result.imported} заметок`, "success");
      onImported();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка импорта");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  async function confirmPasswordImport() {
    if (!preview?.notes.length) return;
    setLoading(true);
    setError("");
    try {
      const result = await api.projects.import(token, projectId, preview.notes);
      toast(`Импортировано ${result.imported} паролей`, "success");
      onImported();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка импорта");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card import-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="overline">Импорт</p>
            <h3>Загрузить данные</h3>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="modal-body">
        <div className="import-tabs segmented-control full">
          <button type="button" className={tab === "passwords" ? "active" : ""} onClick={() => { setTab("passwords"); setPreview(null); setError(""); }}>
            <KeyRound size={14} />
            Пароли
          </button>
          <button type="button" className={tab === "notes" ? "active" : ""} onClick={() => { setTab("notes"); setPreview(null); setError(""); }}>
            <FileJson size={14} />
            Заметки
          </button>
        </div>

        {tab === "passwords" ? (
          <>
            <p className="modal-copy">
              Импорт в раздел <strong>Пароли</strong>. Поддерживаются незашифрованные экспорты:
            </p>
            <ul className="import-formats">
              <li><strong>Bitwarden</strong> — JSON (без шифрования)</li>
              <li><strong>KeePass</strong> — XML или CSV</li>
              <li><strong>1Password / LastPass</strong> — CSV</li>
              <li><strong>Chrome / Firefox</strong> — CSV</li>
            </ul>
            <p className="fine-print">
              Файл разбирается локально в браузере и отправляется на сервер только после подтверждения.
              После импорта удалите незашифрованный экспорт.
            </p>

            {error ? <p className="error-text">{error}</p> : null}

            {preview ? (
              <div className="import-preview">
                <div className="import-preview-head">
                  <Check size={16} />
                  <div>
                    <strong>{preview.credentials.length} записей</strong>
                    <span>{preview.format} · {preview.filename}</span>
                  </div>
                </div>
                <ul className="import-preview-list">
                  {preview.credentials.slice(0, 8).map((c, i) => (
                    <li key={i}>
                      <strong>{c.title}</strong>
                      <span>{c.login || c.url || c.category}</span>
                    </li>
                  ))}
                  {preview.credentials.length > 8 ? (
                    <li className="import-preview-more">…и ещё {preview.credentials.length - 8}</li>
                  ) : null}
                </ul>
                <div className="dialog-actions">
                  <button className="ghost-button" onClick={() => setPreview(null)}>Отмена</button>
                  <button className="primary-button" onClick={() => void confirmPasswordImport()} disabled={loading}>
                    {loading ? "Импорт…" : `Импортировать ${preview.credentials.length}`}
                  </button>
                </div>
              </div>
            ) : (
              <label className="primary-button full upload-label">
                <Upload size={18} />
                Выбрать файл
                <input
                  hidden
                  type="file"
                  accept=".json,.xml,.csv,application/json,text/xml,text/csv"
                  onChange={(e) => void handlePasswordFile(e)}
                />
              </label>
            )}
          </>
        ) : (
          <>
            <p className="modal-copy">
              JSON одной заметки или экспорта проекта. Записи добавятся в текущий проект.
            </p>
            {error ? <p className="error-text">{error}</p> : null}
            <label className="primary-button full upload-label">
              <Upload size={18} />
              {loading ? "Импорт…" : "Выбрать JSON"}
              <input hidden type="file" accept="application/json,.json" onChange={(e) => void handleNotesFile(e)} />
            </label>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
