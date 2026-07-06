"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ExternalLink, Lock, Server, Shield } from "lucide-react";
import { api } from "@/lib/api";
import { ReadOnlyContent } from "@/components/ReadOnlyContent";
import type { Note, SharePublicPayload } from "@/lib/types";
import { typeLabels } from "@/lib/types";

function ShareField({ label, value, link }: { label: string; value?: string | null; link?: boolean }) {
  if (!value) return null;
  const masked = value === "••••••••" || value === "[скрыто]";
  return (
    <p className="share-field">
      <strong>{label}:</strong>{" "}
      {link && !masked ? (
        <a href={value} target="_blank" rel="noopener noreferrer">
          {value} <ExternalLink size={12} />
        </a>
      ) : (
        <code>{value}</code>
      )}
    </p>
  );
}

function NoteContent({ note }: { note: Note }) {
  return (
    <article className="share-note">
      <header>
        <p className="overline">{typeLabels[note.type]}</p>
        <h2>{note.title}</h2>
        <p className="share-meta">{note.category}</p>
      </header>
      <ShareField label="Хост" value={note.host} />
      <ShareField label="Порт" value={note.port} />
      <ShareField label="URL" value={note.url} link />
      <ShareField label="Логин" value={note.login} />
      <ShareField label="Пароль" value={note.password} />
      <ShareField label="TOTP" value={note.totpSecret} />
      {note.sshKey ? (
        <pre className="share-ssh">{note.sshKey}</pre>
      ) : null}
      <ShareField label="Заметка" value={note.memo} />
      {note.tags.length ? (
        <div className="share-tags">
          {note.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      ) : null}
      <div className="share-content">
        <ReadOnlyContent content={note.content} />
      </div>
    </article>
  );
}

function shareModeLabel(mode: string) {
  if (mode === "passwords") return "только пароли";
  if (mode === "full") return "с секретами";
  return "без секретов";
}

export default function SharePage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<SharePublicPayload | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(accessPassword?: string) {
    setLoading(true);
    setError("");
    try {
      if (accessPassword) {
        const result = await api.shares.accessPublic(params.token, accessPassword);
        setData(result);
        setNeedsPassword(false);
        return;
      }
      const preview = await api.shares.getPublic(params.token);
      if ("requiresPassword" in preview && preview.requiresPassword) {
        setNeedsPassword(true);
        setData(null);
        return;
      }
      setData(preview as SharePublicPayload);
      setNeedsPassword(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ссылка недоступна");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [params.token]);

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    await load(password);
  }

  if (loading) return <main className="loading-screen">Загрузка...</main>;

  if (needsPassword) {
    return (
      <main className="vault-gate">
        <section className="unlock-card auth-card">
          <div className="brand-mark">
            <Shield size={20} />
          </div>
          <h2>Защищённая ссылка</h2>
          <p className="modal-copy">Введите пароль, который вам передали вместе со ссылкой.</p>
          <form className="auth-form" onSubmit={(e) => void handlePasswordSubmit(e)}>
            <input
              className="text-field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль ссылки"
              autoFocus
              required
            />
            {error ? <p className="error-text">{error}</p> : null}
            <button className="primary-button full" type="submit">
              Открыть
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="vault-gate">
        <section className="unlock-card">
          <div className="brand-mark">
            <Lock size={20} />
          </div>
          <h1>Ссылка недоступна</h1>
          <p className="unlock-copy">{error || "Данные не найдены"}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="share-page">
      <header className="share-header">
        <div className="brand-mark small">
          <Server size={18} />
        </div>
        <div>
          <h1>{data.share.title || "Sysadmin Notes"}</h1>
          <p>
            Публичный просмотр · {shareModeLabel(data.share.shareMode)}
            {data.share.passwordProtected ? " · защищено паролем" : ""}
          </p>
        </div>
      </header>

      {data.type === "note" ? (
        <NoteContent note={data.note} />
      ) : (
        <section className="share-project">
          <h2>{data.project.name}</h2>
          {data.project.description ? <p>{data.project.description}</p> : null}
          {data.share.shareMode === "passwords" ? (
            <p className="share-meta">{data.project.notes.length} паролей в ссылке</p>
          ) : null}
          <div className="share-notes-grid">
            {data.project.notes.map((note) => (
              <NoteContent key={note.id} note={note} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}