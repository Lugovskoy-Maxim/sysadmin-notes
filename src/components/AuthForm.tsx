"use client";

import { FormEvent, useEffect, useState } from "react";
import { Lock, UserPlus, LogIn, Server, Shield, KeyRound, FileText, GitBranch, Globe, CircleUserRound } from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/lib/toast";

const features = [
  { icon: KeyRound, text: "Логины, пароли, TOTP, SSH-ключи" },
  { icon: FileText, text: "Rich-text: таблицы, код, картинки" },
  { icon: Shield, text: "Проекты и публичные ссылки" },
];

export function AuthForm() {
  const setAuth = useAppStore((s) => s.setAuth);
  const toast = useToast((s) => s.push);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthProviders, setOauthProviders] = useState<("github" | "google" | "yandex")[]>([]);

  useEffect(() => {
    void api.auth.oauthProviders()
      .then((result) => setOauthProviders(result.providers))
      .catch(() => setOauthProviders([]));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result =
        mode === "login"
          ? await api.auth.login({ email, password })
          : await api.auth.register({ email, name, password });
      setAuth("cookie", { ...result.user, createdAt: new Date().toISOString() });
      toast(mode === "login" ? "Добро пожаловать!" : "Аккаунт создан", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="vault-gate">
      <section className="auth-layout">
        <div className="auth-hero">
          <div className="brand-mark">
            <Server size={22} />
          </div>
          <h1>Sysadmin Notes</h1>
          <p className="auth-tagline">
            Профессиональный блокнот для инфраструктуры: доступы, инструкции, инциденты и документация в одном месте.
          </p>
          <ul className="auth-features">
            {features.map((f) => (
              <li key={f.text}>
                <f.icon size={16} />
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <section className="unlock-card auth-card" aria-labelledby="auth-title">
          <div className="auth-card-head">
            <div className="brand-mark small">
              <Lock size={18} />
            </div>
            <div>
              <p className="overline">Облачный блокнот</p>
              <h2 id="auth-title">{mode === "login" ? "Вход" : "Регистрация"}</h2>
            </div>
          </div>

          <div className="segmented-control full">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
              Вход
            </button>
            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
              Регистрация
            </button>
          </div>

          <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
            {mode === "register" ? (
              <>
                <label className="field-label" htmlFor="name">Имя</label>
                <input
                  id="name"
                  className="text-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Алексей"
                  required
                />
              </>
            ) : null}

            <label className="field-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="text-field"
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.local"
              required
            />

            <label className="field-label" htmlFor="password">Пароль</label>
            <input
              id="password"
              className="text-field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              minLength={6}
              required
            />

            {error ? <p className="error-text">{error}</p> : null}

            <button className="primary-button full" type="submit" disabled={loading}>
              {mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
              {loading ? "Загрузка..." : mode === "login" ? "Войти" : "Создать аккаунт"}
            </button>
          </form>

          {oauthProviders.length ? (
            <>
              <div className="oauth-divider"><span>или войти через</span></div>
              <div className="oauth-providers">
                {oauthProviders.includes("github") ? (
                  <a className="oauth-button" href={api.auth.oauthUrl("github")}>
                    <GitBranch size={17} />
                    GitHub
                  </a>
                ) : null}
                {oauthProviders.includes("google") ? (
                  <a className="oauth-button" href={api.auth.oauthUrl("google")}>
                    <Globe size={17} />
                    Google
                  </a>
                ) : null}
                {oauthProviders.includes("yandex") ? (
                  <a className="oauth-button" href={api.auth.oauthUrl("yandex")}>
                    <CircleUserRound size={17} />
                    Яндекс
                  </a>
                ) : null}
              </div>
              <p className="fine-print auth-security-note">
                Провайдер передаёт только подтверждённый профиль. Его токен не сохраняется.
              </p>
            </>
          ) : null}
        </section>
      </section>
    </main>
  );
}
