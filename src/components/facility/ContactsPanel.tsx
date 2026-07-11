"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mail, Phone, Plus, Search, Trash2, User } from "lucide-react";
import { api } from "@/lib/api";
import type { Contact } from "@/lib/facility-types";
import { debounceByKey } from "@/lib/utils";
import { useToast } from "@/lib/toast";

type ContactsPanelProps = {
  token: string;
  projectId: string;
};

export function ContactsPanel({ token, projectId }: ContactsPanelProps) {
  const toast = useToast((s) => s.push);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.facility.listContacts(token, projectId);
      setContacts(list);
      setSelectedId((current) => (current && list.some((item) => item.id === current) ? current : list[0]?.id ?? null));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось загрузить контакты", "error");
    } finally {
      setLoading(false);
    }
  }, [token, projectId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((contact) =>
      [contact.fullName, contact.phone, contact.email, contact.position, contact.department, contact.extra]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [contacts, query]);

  const selected = contacts.find((contact) => contact.id === selectedId) ?? null;

  async function addContact() {
    try {
      const created = await api.facility.createContact(token, {
        projectId,
        fullName: "Новый контакт",
      });
      setContacts((current) => [created, ...current]);
      setSelectedId(created.id);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось создать контакт", "error");
    }
  }

  function updateContactLocal(id: string, patch: Partial<Contact>) {
    setContacts((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    debounceByKey(saveTimers.current, id, () => {
      void (async () => {
        try {
          const updated = await api.facility.updateContact(token, id, patch);
          setContacts((current) => current.map((item) => (item.id === id ? updated : item)));
        } catch (error) {
          toast(error instanceof Error ? error.message : "Не удалось сохранить контакт", "error");
        }
      })();
    });
  }

  async function removeContact(id: string) {
    if (!window.confirm("Удалить контакт?")) return;
    try {
      await api.facility.removeContact(token, id);
      const rest = contacts.filter((item) => item.id !== id);
      setContacts(rest);
      setSelectedId(rest[0]?.id ?? null);
      toast("Контакт удалён", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось удалить контакт", "error");
    }
  }

  if (loading) return <div className="facility-loading">Загрузка контактов…</div>;

  return (
    <div className="facility-panel contacts-panel">
      <div className="contacts-toolbar">
        <div className="contacts-search">
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по ФИО, телефону, email…"
            aria-label="Поиск контактов"
          />
        </div>
        <button type="button" className="primary-button compact" onClick={() => void addContact()}>
          <Plus size={14} />
          Контакт
        </button>
      </div>

      <div className="contacts-layout">
        <aside className="contacts-list-pane">
          <h3>Контакты ({filtered.length})</h3>
          <ul className="contacts-list">
            {filtered.map((contact) => (
              <li key={contact.id}>
                <button
                  type="button"
                  className={selectedId === contact.id ? "active" : ""}
                  onClick={() => setSelectedId(contact.id)}
                >
                  <strong>{contact.fullName}</strong>
                  <span>
                    {[contact.phone, contact.email].filter(Boolean).join(" · ") ||
                      contact.position ||
                      contact.department ||
                      "Без данных"}
                  </span>
                </button>
              </li>
            ))}
            {!filtered.length ? <li className="empty">Нет контактов</li> : null}
          </ul>
        </aside>

        <section className="contacts-editor-pane">
          {selected ? (
            <>
              <header className="contacts-editor-head">
                <div>
                  <p className="overline">Карточка контакта</p>
                  <h3>{selected.fullName}</h3>
                </div>
                <button type="button" className="ghost-button compact danger" onClick={() => void removeContact(selected.id)}>
                  <Trash2 size={14} />
                  Удалить
                </button>
              </header>

              <label className="field-label">ФИО</label>
              <input
                className="text-field"
                value={selected.fullName}
                onChange={(e) => updateContactLocal(selected.id, { fullName: e.target.value })}
                placeholder="Иванов Иван Иванович"
              />

              <label className="field-label">Телефон</label>
              <div className="contacts-field-with-icon">
                <Phone size={14} />
                <input
                  className="text-field"
                  type="tel"
                  value={selected.phone ?? ""}
                  onChange={(e) => updateContactLocal(selected.id, { phone: e.target.value })}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>

              <label className="field-label">Email</label>
              <div className="contacts-field-with-icon">
                <Mail size={14} />
                <input
                  className="text-field"
                  type="email"
                  value={selected.email ?? ""}
                  onChange={(e) => updateContactLocal(selected.id, { email: e.target.value })}
                  placeholder="user@company.ru"
                />
              </div>

              <label className="field-label">Должность</label>
              <input
                className="text-field"
                value={selected.position ?? ""}
                onChange={(e) => updateContactLocal(selected.id, { position: e.target.value })}
                placeholder="Системный администратор"
              />

              <label className="field-label">Отдел</label>
              <input
                className="text-field"
                value={selected.department ?? ""}
                onChange={(e) => updateContactLocal(selected.id, { department: e.target.value })}
                placeholder="ИТ-отдел"
              />

              <label className="field-label">Дополнительно</label>
              <textarea
                className="text-field"
                rows={4}
                value={selected.extra ?? ""}
                onChange={(e) => updateContactLocal(selected.id, { extra: e.target.value })}
                placeholder="Внутренний номер, Telegram, график работы, заметки…"
              />
            </>
          ) : (
            <div className="contacts-empty">
              <User size={40} strokeWidth={1.2} />
              <strong>Контакты проекта</strong>
              <p>Добавьте сотрудников, подрядчиков и ответственных лиц — отдельно от карты сети.</p>
              <button type="button" className="primary-button" onClick={() => void addContact()}>
                <Plus size={16} />
                Добавить контакт
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}