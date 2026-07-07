"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Crown, Mail, Shield, Trash2, UserPlus, Users, X } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { BillingStatus, ProjectMember, ProjectRole } from "@/lib/types";

type ProjectMembersModalProps = {
  token: string;
  projectId: string;
  projectName: string;
  billing: BillingStatus | null;
  onClose: () => void;
  onChanged?: () => void;
};

export function ProjectMembersModal({
  token,
  projectId,
  projectName,
  billing,
  onClose,
  onChanged,
}: ProjectMembersModalProps) {
  const toast = useToast((s) => s.push);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.projects.listMembers(token, projectId);
      setMembers(list);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось загрузить участников", "error");
    } finally {
      setLoading(false);
    }
  }, [token, projectId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    if (!billing?.limits.teamCollaboration) {
      toast("Приглашение участников доступно на тарифах Pro и Team", "error");
      return;
    }
    setInviting(true);
    try {
      await api.projects.inviteMember(token, projectId, { email, role });
      setEmail("");
      toast("Участник добавлен", "success");
      await load();
      onChanged?.();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось пригласить", "error");
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(member: ProjectMember, nextRole: "editor" | "viewer") {
    if (member.role === "owner") return;
    try {
      await api.projects.updateMember(token, projectId, member.userId, nextRole);
      await load();
      onChanged?.();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось изменить роль", "error");
    }
  }

  async function removeMember(member: ProjectMember) {
    if (member.role === "owner") return;
    if (!window.confirm(`Удалить ${member.user.name} из проекта?`)) return;
    try {
      await api.projects.removeMember(token, projectId, member.userId);
      toast("Участник удалён", "success");
      await load();
      onChanged?.();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось удалить участника", "error");
    }
  }

  const canInvite = billing?.limits.teamCollaboration;
  const memberLimit = billing?.limits.maxMembersPerProject ?? 0;
  const invitedCount = members.filter((m) => m.role !== "owner").length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card project-members-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2>
              <Users size={18} />
              Команда проекта
            </h2>
            <p>{projectName}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </header>

        <div className="modal-body">
          {!canInvite ? (
            <div className="premium-upsell">
              <Crown size={20} />
              <div>
                <strong>Совместная работа — Pro и Team</strong>
                <p>Приглашайте коллег по email, назначайте роли editor и viewer.</p>
              </div>
              <a className="primary-button compact" href="/pricing">
                Тарифы
              </a>
            </div>
          ) : (
            <form className="member-invite-form" onSubmit={(e) => void handleInvite(e)}>
              <label className="field-label">Пригласить по email</label>
              <div className="member-invite-row">
                <div className="member-invite-email">
                  <Mail size={14} />
                  <input
                    className="text-field"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@company.ru"
                    required
                  />
                </div>
                <select value={role} onChange={(e) => setRole(e.target.value as "editor" | "viewer")}>
                  <option value="editor">Редактор</option>
                  <option value="viewer">Только чтение</option>
                </select>
                <button className="primary-button compact" type="submit" disabled={inviting}>
                  <UserPlus size={14} />
                  Добавить
                </button>
              </div>
              <p className="fine-print">
                Участник должен быть зарегистрирован · {invitedCount}/{memberLimit} мест
              </p>
            </form>
          )}

          <section className="member-list-section">
            <h3>Участники</h3>
            {loading ? (
              <p className="fine-print">Загрузка…</p>
            ) : (
              <ul className="member-list">
                {members.map((member) => (
                  <li key={member.id}>
                    <div className="member-main">
                      <strong>{member.user.name}</strong>
                      <span>{member.user.email}</span>
                    </div>
                    {member.role === "owner" ? (
                      <span className="member-role owner">
                        <Shield size={12} />
                        Владелец
                      </span>
                    ) : (
                      <div className="member-actions">
                        <select
                          value={member.role}
                          onChange={(e) => void changeRole(member, e.target.value as "editor" | "viewer")}
                        >
                          <option value="editor">Редактор</option>
                          <option value="viewer">Чтение</option>
                        </select>
                        <button type="button" className="icon-button danger" onClick={() => void removeMember(member)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="member-roles-help">
            <h4>Роли</h4>
            <p><strong>Редактор</strong> — заметки, задачи, модули проекта.</p>
            <p><strong>Чтение</strong> — просмотр без изменений.</p>
          </section>
        </div>
      </div>
    </div>
  );
}