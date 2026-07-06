"use client";

import { useState } from "react";
import {
  X,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  ArrowRight,
  Star,
  Pin,
  Globe,
  Server,
  User,
  Lock,
} from "lucide-react";
import { useToast } from "@/lib/toast";
import { credentialsBlock, extractTextPreview, formatDate, normalizeExternalUrl } from "@/lib/utils";
import type { Note, VaultSection } from "@/lib/types";
import { typeLabels } from "@/lib/types";
import { ReadOnlyContent } from "./ReadOnlyContent";

type NoteQuickViewProps = {
  note: Note;
  vaultSection: VaultSection;
  onClose: () => void;
  onOpen: () => void;
};

export function NoteQuickView({ note, vaultSection, onClose, onOpen }: NoteQuickViewProps) {
  const toast = useToast((s) => s.push);
  const [showSecrets, setShowSecrets] = useState(false);

  async function copy(value: string, label = "Скопировано") {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast(label, "success");
  }

  const preview = extractTextPreview(note.content, 120);
  const isCredential = note.type === "credential" || vaultSection === "passwords";

  return (
    <aside className="note-quick-view" aria-label="Быстрый просмотр">
      <header className="note-quick-head">
        <div>
          <p className="overline">{typeLabels[note.type]}</p>
          <h3 className="note-quick-title">
            <span className="note-quick-title-icons">
              {note.pinned ? <Pin size={14} className="pin-icon" /> : null}
              {note.favorite ? <Star size={14} className="star-icon" fill="currentColor" /> : null}
            </span>
            <span className="note-quick-title-text">{note.title}</span>
          </h3>
          <span className="note-quick-meta">
            {note.category} · {formatDate(note.updatedAt)}
          </span>
        </div>
        <div className="note-quick-actions">
          <button className="primary-button compact" onClick={onOpen}>
            <ArrowRight size={14} />
            Открыть
          </button>
          <button className="icon-button small-btn" onClick={onClose} aria-label="Закрыть">
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="note-quick-body">
        {isCredential ? (
          <div className="note-quick-grid">
            <QuickField icon={Server} label="Хост" value={note.host} onCopy={() => void copy(note.host ?? "")} />
            <QuickField icon={Globe} label="Порт" value={note.port} onCopy={() => void copy(note.port ?? "")} />
            <QuickField
              icon={Globe}
              label="URL"
              value={note.url}
              link={note.url ?? undefined}
              onCopy={() => void copy(note.url ?? "")}
              wide
            />
            <QuickField icon={User} label="Логин" value={note.login} onCopy={() => void copy(note.login ?? "")} />
            <QuickField
              icon={Lock}
              label="Пароль"
              value={note.password}
              secret
              visible={showSecrets}
              onCopy={() => void copy(note.password ?? "")}
            />
            {note.totpSecret ? (
              <QuickField
                icon={Lock}
                label="TOTP"
                value={note.totpSecret}
                secret
                visible={showSecrets}
                onCopy={() => void copy(note.totpSecret ?? "")}
              />
            ) : null}
            {note.password || note.totpSecret ? (
              <button
                type="button"
                className="ghost-button compact reveal-secrets-btn"
                onClick={() => setShowSecrets((v) => !v)}
              >
                {showSecrets ? <EyeOff size={14} /> : <Eye size={14} />}
                {showSecrets ? "Скрыть секреты" : "Показать секреты"}
              </button>
            ) : null}
            {note.memo ? <QuickField label="Заметка" value={note.memo} wide /> : null}
          </div>
        ) : (
          <div className="note-quick-grid">
            {note.url ? (
              <QuickField icon={Globe} label="URL" value={note.url} link={note.url} wide />
            ) : null}
            {note.host ? <QuickField icon={Server} label="Хост" value={note.host} /> : null}
            {note.memo ? <QuickField label="Кратко" value={note.memo} wide /> : null}
            {preview ? (
              <div className="note-quick-preview wide">
                <span className="meta-label">Содержимое</span>
                <p>{preview}</p>
              </div>
            ) : null}
          </div>
        )}

        {note.tags.length ? (
          <div className="note-quick-tags">
            {note.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        ) : null}

        {!isCredential && preview ? (
          <div className="note-quick-content">
            <ReadOnlyContent content={note.content} />
          </div>
        ) : null}
      </div>

      {isCredential ? (
        <footer className="note-quick-foot">
          <button className="ghost-button compact" onClick={() => void copy(note.login ?? "", "Логин скопирован")}>
            <Copy size={14} />
            Логин
          </button>
          <button
            className="ghost-button compact"
            onClick={() => void copy(credentialsBlock(note), "Все данные скопированы")}
          >
            <Copy size={14} />
            Все доступы
          </button>
        </footer>
      ) : null}
    </aside>
  );
}

function QuickField({
  label,
  value,
  icon: Icon,
  link,
  secret,
  visible,
  wide,
  onCopy,
}: {
  label: string;
  value?: string | null;
  icon?: typeof Server;
  link?: string;
  secret?: boolean;
  visible?: boolean;
  wide?: boolean;
  onCopy?: () => void;
}) {
  if (!value) return null;
  const display = secret && !visible ? "••••••••" : value;
  const safeLink = normalizeExternalUrl(link);

  return (
    <div className={`note-quick-field ${wide ? "wide" : ""}`}>
      <span className="meta-label">
        {Icon ? <Icon size={12} /> : null}
        {label}
      </span>
      <div className="note-quick-value">
        {safeLink && !secret ? (
          <>
            <code>{display}</code>
            <a href={safeLink} target="_blank" rel="noopener noreferrer" className="quick-open-link">
            <ExternalLink size={12} />
              Открыть
            </a>
          </>
        ) : (
          <code>{display}</code>
        )}
        {onCopy ? (
          <button type="button" className="ui-icon-btn" onClick={onCopy} aria-label={`Копировать ${label}`}>
            <Copy size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
