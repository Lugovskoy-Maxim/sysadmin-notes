"use client";

import { useCallback, useEffect, useState } from "react";
import { Crown, Shield, ShieldOff, UserCog, X } from "lucide-react";
import { api } from "@/lib/api";
import { PLAN_CARDS } from "@/lib/plans";
import { useToast } from "@/lib/toast";
import type { AdminUser, PlanId } from "@/lib/types";

type AdminUsersModalProps = {
  token: string;
  currentUserId: string;
  onClose: () => void;
};

export function AdminUsersModal({ token, currentUserId, onClose }: AdminUsersModalProps) {
  const toast = useToast((s) => s.push);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await api.admin.listUsers(token));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось загрузить пользователей", "error");
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchUser(
    user: AdminUser,
    patch: Partial<Pick<AdminUser, "role" | "status">> & {
      plan?: PlanId;
      subscriptionStatus?: "active" | "canceled";
      currentPeriodEnd?: string | null;
    },
  ) {
    try {
      const updated = await api.admin.updateUser(token, user.id, patch);
      setUsers((list) => list.map((item) => (item.id === updated.id ? updated : item)));
      toast("Пользователь обновлён", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось обновить", "error");
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card admin-users-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="overline">Администрирование</p>
            <h3>Пользователи и подписки</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body admin-users-body">
          <p className="fine-print">
            Управляйте ролями, блокировками и тарифами всех зарегистрированных пользователей.
          </p>
          {loading ? (
            <p>Загрузка…</p>
          ) : (
            <ul className="admin-user-list">
              {users.map((user) => (
                <li key={user.id}>
                  <div className="admin-user-main">
                    <strong>
                      {user.name}
                      {user.role === "admin" ? <Shield size={12} className="admin-badge-icon" /> : null}
                    </strong>
                    <span>{user.email}</span>
                    <small>
                      Проектов: {user._count.projects} · Участий: {user._count.projectMembers}
                      {user.id === currentUserId ? " · это вы" : ""}
                    </small>
                    <span className="admin-user-plan">
                      <Crown size={12} />
                      {PLAN_CARDS.find((plan) => plan.id === user.subscription.plan)?.name ?? user.subscription.plan}
                      {user.subscription.currentPeriodEnd
                        ? ` до ${new Date(user.subscription.currentPeriodEnd).toLocaleDateString("ru-RU")}`
                        : ""}
                    </span>
                  </div>
                  <div className="admin-user-actions">
                    <select
                      className="text-field network-select"
                      value={user.role}
                      disabled={user.id === currentUserId && user.role === "admin"}
                      onChange={(e) => void patchUser(user, { role: e.target.value as AdminUser["role"] })}
                    >
                      <option value="user">Пользователь</option>
                      <option value="admin">Администратор</option>
                    </select>
                    <select
                      className="text-field network-select"
                      value={user.subscription.plan}
                      onChange={(e) => void patchUser(user, { plan: e.target.value as PlanId })}
                    >
                      {PLAN_CARDS.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="text-field network-select"
                      value={user.subscription.status}
                      onChange={(e) =>
                        void patchUser(user, {
                          subscriptionStatus: e.target.value as "active" | "canceled",
                        })
                      }
                    >
                      <option value="active">Подписка активна</option>
                      <option value="canceled">Подписка отменена</option>
                    </select>
                    <button
                      type="button"
                      className={`ghost-button compact ${user.status === "suspended" ? "" : "danger"}`}
                      disabled={user.id === currentUserId}
                      onClick={() =>
                        void patchUser(user, { status: user.status === "active" ? "suspended" : "active" })
                      }
                      title={user.status === "active" ? "Заблокировать" : "Разблокировать"}
                    >
                      {user.status === "active" ? <ShieldOff size={14} /> : <UserCog size={14} />}
                      {user.status === "active" ? "Блок" : "Разблок"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}