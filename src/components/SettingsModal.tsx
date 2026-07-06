"use client";

import { useEffect, useState } from "react";
import { Bot, CircleUserRound, GitBranch, Globe, Keyboard, Link2, Mail, Moon, RefreshCw, Send, ShieldCheck, Sun, Unlink, X } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";
import type { Theme } from "@/lib/types";

type SettingsModalProps = {
  token: string;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  userName?: string;
  userEmail?: string;
  onProfileUpdate: (name: string) => void;
  onShowShortcuts: () => void;
  onShowShares: () => void;
  onClose: () => void;
};

const themes: { id: Theme; label: string; hint: string; icon: typeof Sun }[] = [
  { id: "light", label: "Светлая", hint: "Чистый минимализм", icon: Sun },
  { id: "dark", label: "Тёмная", hint: "Комфорт для глаз", icon: Moon },
];

type OAuthProvider = "github" | "google" | "yandex";

const providerMeta: Record<OAuthProvider, { label: string; icon: typeof GitBranch }> = {
  github: { label: "GitHub", icon: GitBranch },
  google: { label: "Google", icon: Globe },
  yandex: { label: "Яндекс", icon: CircleUserRound },
};

export function SettingsModal({
  token,
  theme,
  onThemeChange,
  userName,
  userEmail,
  onProfileUpdate,
  onShowShortcuts,
  onShowShares,
  onClose,
}: SettingsModalProps) {
  const toast = useToast((s) => s.push);
  const [name, setName] = useState(userName ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(true);
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [identities, setIdentities] = useState<Awaited<ReturnType<typeof api.auth.identities>>["identities"]>([]);
  const [hasPassword, setHasPassword] = useState(true);
  const [integrations, setIntegrations] = useState<Awaited<ReturnType<typeof api.integrations.status>> | null>(null);
  const [integrationLoading, setIntegrationLoading] = useState(true);
  const [emailSending, setEmailSending] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([api.auth.oauthProviders(), api.auth.identities(token), api.integrations.status(token)])
      .then(([available, security, integrationStatus]) => {
        if (!active) return;
        setProviders(available.providers);
        setIdentities(security.identities);
        setHasPassword(security.hasPassword);
        setIntegrations(integrationStatus);
      })
      .catch((error) => {
        if (active) toast(error instanceof Error ? error.message : "Не удалось загрузить способы входа", "error");
      })
      .finally(() => {
        if (active) {
          setSecurityLoading(false);
          setIntegrationLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [token, toast]);

  async function refreshIntegrations() {
    setIntegrationLoading(true);
    try {
      setIntegrations(await api.integrations.status(token));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось обновить интеграции", "error");
    } finally {
      setIntegrationLoading(false);
    }
  }

  async function connectTelegram() {
    try {
      const link = await api.integrations.createTelegramLink(token);
      window.open(link.url, "_blank", "noopener,noreferrer");
      toast("Откройте Telegram и нажмите Start. Ссылка действует 10 минут.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось создать ссылку Telegram", "error");
    }
  }

  async function disconnectTelegram() {
    if (!confirm("Отключить Telegram от аккаунта?")) return;
    try {
      await api.integrations.unlinkTelegram(token);
      await refreshIntegrations();
      toast("Telegram отключён", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось отключить Telegram", "error");
    }
  }

  async function sendTestEmail() {
    setEmailSending(true);
    try {
      await api.integrations.sendEmail(token, {
        subject: "Sysadmin Notes: почта подключена",
        text: "Тестовое письмо отправлено из Sysadmin Notes. SMTP-модуль работает.",
      });
      toast("Тестовое письмо отправлено", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось отправить письмо", "error");
    } finally {
      setEmailSending(false);
    }
  }

  async function unlinkIdentity(id: string) {
    if (!confirm("Отключить этот способ входа?")) return;
    try {
      await api.auth.unlinkIdentity(token, id);
      setIdentities((current) => current.filter((identity) => identity.id !== id));
      toast("Способ входа отключён", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Не удалось отключить способ входа", "error");
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const updated = await api.auth.updateProfile(token, {
        name: name.trim() || undefined,
        password: password.trim() || undefined,
      });
      onProfileUpdate(updated.name);
      setPassword("");
      toast("Профиль обновлён", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Ошибка", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card settings-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="overline">Настройки</p>
            <h3>Профиль и интерфейс</h3>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="settings-profile">
          <strong>{userName}</strong>
          <span>{userEmail}</span>
        </div>

        <label className="field-label">Имя</label>
        <input className="text-field" value={name} onChange={(e) => setName(e.target.value)} />

        <label className="field-label">Новый пароль</label>
        <input
          className="text-field"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Оставьте пустым, чтобы не менять"
        />

        <button className="ghost-button full" onClick={() => void saveProfile()} disabled={saving}>
          {saving ? "Сохранение..." : "Сохранить профиль"}
        </button>

        <section className="settings-security">
          <div className="settings-section-head">
            <div>
              <span className="field-label">Способы входа</span>
              <p>Подключённые аккаунты и восстановление доступа</p>
            </div>
            <ShieldCheck size={18} />
          </div>

          {securityLoading ? (
            <p className="settings-security-empty">Загрузка…</p>
          ) : (
            <>
              <div className="identity-list">
                <div className="identity-row">
                  <span className="identity-icon"><ShieldCheck size={16} /></span>
                  <div>
                    <strong>Пароль</strong>
                    <small>{hasPassword ? "Настроен" : "Не задан"}</small>
                  </div>
                  <span className={`identity-status ${hasPassword ? "active" : ""}`}>
                    {hasPassword ? "Активен" : "Добавьте"}
                  </span>
                </div>
                {identities.map((identity) => {
                  const provider = identity.provider as OAuthProvider;
                  const meta = providerMeta[provider];
                  const Icon = meta?.icon ?? CircleUserRound;
                  const canUnlink = hasPassword || identities.length > 1;
                  return (
                    <div className="identity-row" key={identity.id}>
                      <span className="identity-icon"><Icon size={16} /></span>
                      <div>
                        <strong>{meta?.label ?? identity.provider}</strong>
                        <small>{identity.email ?? identity.displayName ?? "Подключён"}</small>
                      </div>
                      <button
                        className="identity-unlink"
                        type="button"
                        disabled={!canUnlink}
                        onClick={() => void unlinkIdentity(identity.id)}
                        title={canUnlink ? "Отключить" : "Сначала задайте другой способ входа"}
                      >
                        <Unlink size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="identity-connectors">
                {providers
                  .filter((provider) => !identities.some((identity) => identity.provider === provider))
                  .map((provider) => {
                    const meta = providerMeta[provider];
                    const Icon = meta.icon;
                    return (
                      <a className="oauth-button" href={api.auth.oauthLinkUrl(provider)} key={provider}>
                        <Icon size={16} />
                        Подключить {meta.label}
                      </a>
                    );
                  })}
              </div>
            </>
          )}
        </section>

        <section className="settings-security integration-settings">
          <div className="settings-section-head">
            <div>
              <span className="field-label">Интеграции</span>
              <p>Почтовые уведомления и управление через Telegram</p>
            </div>
            <button
              className="identity-unlink"
              type="button"
              onClick={() => void refreshIntegrations()}
              title="Обновить состояние"
              disabled={integrationLoading}
            >
              <RefreshCw size={15} className={integrationLoading ? "spin" : ""} />
            </button>
          </div>

          <div className="identity-list">
            <div className="identity-row integration-row">
              <span className="identity-icon"><Mail size={16} /></span>
              <div>
                <strong>Почта</strong>
                <small>{integrations?.email.enabled ? integrations.email.from ?? "SMTP подключён" : "Укажите SMTP в Docker"}</small>
              </div>
              {integrations?.email.enabled ? (
                <button className="identity-unlink integration-action" type="button" onClick={() => void sendTestEmail()} disabled={emailSending}>
                  <Send size={14} />
                  <span>{emailSending ? "Отправка" : "Тест"}</span>
                </button>
              ) : (
                <span className="identity-status">Не настроена</span>
              )}
            </div>

            <div className="identity-row integration-row">
              <span className="identity-icon telegram-icon"><Bot size={16} /></span>
              <div>
                <strong>Telegram Bot</strong>
                <small>
                  {integrations?.telegram.linked
                    ? `@${integrations.telegram.account?.username ?? integrations.telegram.account?.firstName ?? "привязан"}`
                    : integrations?.telegram.enabled
                      ? integrations.telegram.linkedByBot
                      : "Добавьте токен бота в Docker"}
                </small>
              </div>
              {integrations?.telegram.linked ? (
                <button className="identity-unlink integration-action" type="button" onClick={() => void disconnectTelegram()}>
                  <Unlink size={14} />
                  <span>Отключить</span>
                </button>
              ) : integrations?.telegram.enabled ? (
                <button className="identity-unlink integration-action primary-link" type="button" onClick={() => void connectTelegram()}>
                  <Link2 size={14} />
                  <span>Привязать</span>
                </button>
              ) : (
                <span className="identity-status">Не настроен</span>
              )}
            </div>
          </div>

          <p className="integration-help">
            После привязки бот умеет создавать и редактировать заметки, пароли и задачи. Команда <code>/login</code> создаёт одноразовую ссылку входа.
          </p>
        </section>

        <label className="field-label">Тема</label>
        <div className="theme-cards">
          {themes.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                className={`theme-card theme-card-${t.id} ${theme === t.id ? "active" : ""}`}
                onClick={() => onThemeChange(t.id)}
              >
                <span className="theme-card-preview" aria-hidden />
                <span className="theme-card-body">
                  <Icon size={16} />
                  <strong>{t.label}</strong>
                  <small>{t.hint}</small>
                </span>
              </button>
            );
          })}
        </div>

        <button className="ghost-button full" onClick={onShowShares}>
          <Link2 size={16} />
          Управление ссылками
        </button>

        <button className="ghost-button full" onClick={onShowShortcuts}>
          <Keyboard size={16} />
          Горячие клавиши
        </button>
      </div>
    </div>
  );
}
