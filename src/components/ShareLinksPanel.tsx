"use client";

import { useEffect, useState } from "react";
import { Copy, Link2, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { ShareLink } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type ShareLinksPanelProps = {
  token: string;
  onClose: () => void;
};

function modeLabel(mode: string) {
  if (mode === "passwords") return "Только пароли";
  if (mode === "full") return "С секретами";
  return "Без секретов";
}

export function ShareLinksPanel({ token, onClose }: ShareLinksPanelProps) {
  const toast = useToast((s) => s.push);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLinks(await api.shares.list(token));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token]);

  async function remove(id: string) {
    await api.shares.remove(token, id);
    setLinks((current) => current.filter((l) => l.id !== id));
    toast("Ссылка удалена", "info");
  }

  async function copy(tokenValue: string) {
    const url = `${window.location.origin}/share/${tokenValue}`;
    await navigator.clipboard.writeText(url);
    toast("Ссылка скопирована", "success");
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card share-links-panel" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="overline">Шаринг</p>
            <h3>Активные ссылки</h3>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        {loading ? (
          <p className="modal-copy">Загрузка...</p>
        ) : links.length ? (
          <div className="share-links-list">
            {links.map((link) => (
              <div key={link.id} className="share-link-row">
                <Link2 size={16} />
                <div className="share-link-info">
                  <strong>{link.title || (link.noteId ? "Запись" : "Проект")}</strong>
                  <span>
                    {modeLabel(link.shareMode)}
                    {link.passwordHash ? " · 🔒" : ""}
                    {" · "}
                    {formatDate(link.createdAt)}
                    {link.expiresAt ? ` · до ${new Date(link.expiresAt).toLocaleDateString("ru-RU")}` : " · без срока"}
                  </span>
                  <code>/share/{link.token.slice(0, 12)}…</code>
                </div>
                <button className="icon-button small-btn" onClick={() => void copy(link.token)} title="Копировать">
                  <Copy size={14} />
                </button>
                <button className="icon-button small-btn danger-icon" onClick={() => void remove(link.id)} title="Удалить">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="modal-copy">Нет активных ссылок. Создайте через «Поделиться».</p>
        )}
      </div>
    </div>
  );
}