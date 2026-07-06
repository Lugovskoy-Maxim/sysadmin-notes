"use client";

import { useMemo, useState } from "react";
import { Copy, Link2, X, Clock, Lock, KeyRound, FolderOpen } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { NoteType, ShareLink, ShareMode, VaultSection } from "@/lib/types";

type ShareModalProps = {
  token: string;
  noteId?: string;
  projectId?: string;
  noteType?: NoteType;
  vaultSection?: VaultSection;
  onClose: () => void;
};

const expiryOptions = [
  { label: "Без срока", days: 0 },
  { label: "1 день", days: 1 },
  { label: "7 дней", days: 7 },
  { label: "30 дней", days: 30 },
  { label: "90 дней", days: 90 },
];

export function ShareModal({ token, noteId, projectId, noteType, vaultSection, onClose }: ShareModalProps) {
  const toast = useToast((s) => s.push);
  const [share, setShare] = useState<ShareLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expiryDays, setExpiryDays] = useState(7);
  const [shareMode, setShareMode] = useState<ShareMode>(
    !noteId && vaultSection === "passwords" ? "passwords" : "masked",
  );
  const [linkPassword, setLinkPassword] = useState("");
  const [title, setTitle] = useState("");

  const modeOptions = useMemo(() => {
    if (noteId) {
      const isCredential = noteType === "credential";
      return [
        {
          id: "masked" as ShareMode,
          label: isCredential ? "Без паролей" : "Без секретов",
          hint: "Скрыть пароли, TOTP и ключи",
          icon: Lock,
        },
        {
          id: "full" as ShareMode,
          label: isCredential ? "С паролями" : "Полный доступ",
          hint: "Показать все поля записи",
          icon: KeyRound,
        },
      ];
    }
    return [
      {
        id: "masked" as ShareMode,
        label: "Весь проект",
        hint: "Все записи, секреты скрыты",
        icon: FolderOpen,
      },
      {
        id: "full" as ShareMode,
        label: "Проект с секретами",
        hint: "Все записи с паролями",
        icon: KeyRound,
      },
      {
        id: "passwords" as ShareMode,
        label: "Только пароли",
        hint: "Только записи типа «Пароль»",
        icon: Lock,
      },
    ];
  }, [noteId, noteType]);

  async function createShare() {
    setLoading(true);
    setError("");
    try {
      const expiresAt =
        expiryDays > 0
          ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
          : undefined;
      const result = await api.shares.create(token, {
        noteId,
        projectId,
        title: title.trim() || undefined,
        expiresAt,
        shareMode,
        sharePassword: linkPassword.trim() || undefined,
      });
      setShare(result);
      toast("Ссылка создана", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать ссылку");
    } finally {
      setLoading(false);
    }
  }

  const shareUrl = share
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${share.token}`
    : "";

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast("Ссылка скопирована", "success");
  }

  const subjectLabel = noteId ? "записью" : "проектом";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card share-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="overline">Поделиться</p>
            <h3>Публичная ссылка</h3>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </header>

        <p className="modal-copy">
          Создайте ссылку для доступа к {subjectLabel} без аккаунта. Секреты шифруются на сервере и расшифровываются только при просмотре по ссылке.
        </p>

        {!share ? (
          <>
            <label className="field-label">Название ссылки (необязательно)</label>
            <input
              className="text-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Для себя: «Доступы staging»"
            />

            <label className="field-label">Что открыть</label>
            <div className="share-mode-grid">
              {modeOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`share-mode-card ${shareMode === opt.id ? "active" : ""}`}
                    onClick={() => setShareMode(opt.id)}
                  >
                    <Icon size={16} />
                    <strong>{opt.label}</strong>
                    <small>{opt.hint}</small>
                  </button>
                );
              })}
            </div>

            <label className="field-label">
              <Clock size={14} />
              Срок действия
            </label>
            <div className="expiry-picker">
              {expiryOptions.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  className={expiryDays === opt.days ? "active" : ""}
                  onClick={() => setExpiryDays(opt.days)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <label className="field-label">
              <Lock size={14} />
              Пароль на ссылку (необязательно)
            </label>
            <input
              className="text-field"
              type="password"
              value={linkPassword}
              onChange={(e) => setLinkPassword(e.target.value)}
              placeholder="Минимум 4 символа"
              minLength={4}
            />
          </>
        ) : null}

        {error ? <p className="error-text">{error}</p> : null}

        {share ? (
          <div className="share-result">
            <div className="share-url-box">
              <Link2 size={16} />
              <input readOnly value={shareUrl} aria-label="Ссылка для шаринга" />
              <button className="ghost-button compact" onClick={() => void copyLink()}>
                <Copy size={14} />
                Копировать
              </button>
            </div>
            <p className="share-expiry">
              Режим: {share.shareMode === "passwords" ? "только пароли" : share.shareMode === "full" ? "с секретами" : "без секретов"}
              {share.expiresAt
                ? ` · истекает ${new Date(share.expiresAt).toLocaleDateString("ru-RU")}`
                : " · без срока"}
              {linkPassword ? " · защищена паролем" : ""}
            </p>
          </div>
        ) : (
          <button className="primary-button full" onClick={() => void createShare()} disabled={loading}>
            {loading ? "Создание..." : "Создать ссылку"}
          </button>
        )}
      </div>
    </div>
  );
}