"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, ShieldAlert, X } from "lucide-react";
import { api } from "@/lib/api";
import { exportPasswords, passwordExportFormats, type PasswordExportFormat } from "@/lib/password-export";
import { useToast } from "@/lib/toast";
import { downloadFile } from "@/lib/utils";

type Props = {
  token: string;
  projectId: string;
  projectName: string;
  onClose: () => void;
};

export function ExportPasswordsModal({ token, projectId, projectName, onClose }: Props) {
  const toast = useToast((state) => state.push);
  const [format, setFormat] = useState<PasswordExportFormat>("bitwarden");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleExport() {
    setLoading(true);
    setError("");
    try {
      const project = await api.projects.export(token, projectId);
      const credentialCount = project.notes.filter((note) => note.type === "credential" && !note.archived).length;
      if (!credentialCount) throw new Error("В проекте нет паролей для экспорта");
      const selected = passwordExportFormats.find((item) => item.id === format)!;
      const result = exportPasswords(project.notes, format);
      const safeName = projectName.trim().replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-|-$/g, "") || "passwords";
      downloadFile(`${safeName}-passwords-${format}.${selected.extension}`, result.content, result.mime);
      toast(`Экспортировано ${credentialCount} паролей`, "success");
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось экспортировать пароли");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card password-export-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="overline">Экспорт</p>
            <h3>Экспортировать пароли</h3>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </header>

        <p className="modal-copy">Выберите формат, совместимый с нужным менеджером паролей.</p>
        <div className="password-export-formats" role="radiogroup" aria-label="Формат экспорта">
          {passwordExportFormats.map((item) => {
            const Icon = item.extension === "json" ? FileJson : FileSpreadsheet;
            return (
              <button
                type="button"
                role="radio"
                aria-checked={format === item.id}
                className={format === item.id ? "active" : ""}
                key={item.id}
                onClick={() => setFormat(item.id)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="export-security-warning">
          <ShieldAlert size={17} />
          <p>Файл содержит пароли без шифрования. Храните его временно и удалите после переноса.</p>
        </div>
        {error ? <p className="error-text">{error}</p> : null}

        <div className="dialog-actions">
          <button className="ghost-button" onClick={onClose}>Отмена</button>
          <button className="primary-button" onClick={() => void handleExport()} disabled={loading}>
            <Download size={16} />
            {loading ? "Подготовка…" : "Скачать"}
          </button>
        </div>
      </div>
    </div>
  );
}
