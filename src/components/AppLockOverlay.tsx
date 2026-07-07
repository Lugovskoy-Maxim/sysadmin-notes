"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, Shield } from "lucide-react";
import { loadLockSettings, verifyPin } from "@/lib/app-lock";

type AppLockOverlayProps = {
  locked: boolean;
  onUnlock: () => void;
};

function appendDigit(current: string, digit: string) {
  return current.length < 6 ? current + digit : current;
}

export function AppLockOverlay({ locked, onUnlock }: AppLockOverlayProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const inputRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef("");

  useEffect(() => {
    pinRef.current = pin;
  }, [pin]);

  useEffect(() => {
    if (!locked) {
      setPin("");
      setError(false);
      return;
    }
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(focusTimer);
    };
  }, [locked]);

  const tryUnlock = useCallback(
    async (value?: string) => {
      const attempt = value ?? pinRef.current;
      if (attempt.length < 4) return;
      const settings = loadLockSettings();
      const ok = await verifyPin(attempt, settings.pinHash);
      if (ok) {
        setPin("");
        setError(false);
        onUnlock();
        return;
      }
      setError(true);
      setPin("");
    },
    [onUnlock],
  );

  const applyPin = useCallback((next: string) => {
    const sanitized = next.replace(/\D/g, "").slice(0, 6);
    setPin(sanitized);
    setError(false);
    if (sanitized.length === 4 || sanitized.length === 6) void tryUnlock(sanitized);
  }, [tryUnlock]);

  useEffect(() => {
    if (!locked) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        applyPin(appendDigit(pinRef.current, event.key));
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        setPin((current) => current.slice(0, -1));
        setError(false);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        void tryUnlock();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [locked, applyPin, tryUnlock]);

  if (!locked) return null;

  const time = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="app-lock-overlay" role="dialog" aria-modal="true" aria-label="Экран блокировки">
      <div className="app-lock-backdrop" />
      <div className="app-lock-card" onClick={() => inputRef.current?.focus()}>
        <div className="app-lock-clock">
          <strong>{time}</strong>
          <span>{date}</span>
        </div>
        <div className="app-lock-brand">
          <Shield size={28} />
          <div>
            <h2>Sysadmin Notes</h2>
            <p>Введите PIN-код для разблокировки</p>
          </div>
        </div>
        <label className="app-lock-input-wrap">
          <span className="sr-only">PIN-код</span>
          <input
            ref={inputRef}
            className="app-lock-input"
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={6}
            value={pin}
            placeholder="••••"
            aria-label="PIN-код"
            onChange={(event) => applyPin(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void tryUnlock();
              }
            }}
          />
        </label>
        <div className={`app-lock-pin ${error ? "error" : ""}`} aria-hidden>
          {Array.from({ length: 6 }).map((_, index) => (
            <span key={index} className={pin.length > index ? "filled" : ""} />
          ))}
        </div>
        <div className="app-lock-keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((key) =>
            key ? (
              <button
                key={key}
                type="button"
                className="app-lock-key"
                onClick={() => {
                  if (key === "⌫") {
                    setPin((current) => current.slice(0, -1));
                    setError(false);
                    inputRef.current?.focus();
                    return;
                  }
                  applyPin(appendDigit(pin, key));
                  inputRef.current?.focus();
                }}
              >
                {key}
              </button>
            ) : (
              <span key="spacer" />
            ),
          )}
        </div>
        <p className="app-lock-hint">
          <Lock size={14} />
          Вводите цифры с клавиатуры · Backspace — стереть · Enter — разблокировать
        </p>
      </div>
    </div>
  );
}

export function useAppLock() {
  const [locked, setLocked] = useState(false);
  const lastActiveRef = useRef(Date.now());
  const unlockedAtRef = useRef(0);

  const touch = useCallback(() => {
    lastActiveRef.current = Date.now();
  }, []);

  const lock = useCallback(() => {
    const settings = loadLockSettings();
    if (!settings.enabled || !settings.pinHash) return;
    // Ignore focus churn right after unlock (overlay unmount, refocus).
    if (Date.now() - unlockedAtRef.current < 800) return;
    setLocked(true);
  }, []);

  const unlock = useCallback(() => {
    const now = Date.now();
    unlockedAtRef.current = now;
    lastActiveRef.current = now;
    setLocked(false);
  }, []);

  useEffect(() => {
    const settings = loadLockSettings();
    if (!settings.enabled || !settings.pinHash) return;

    function onVisibility() {
      if (document.hidden) lock();
    }

    const idleTimer = window.setInterval(() => {
      const current = loadLockSettings();
      if (!current.enabled || !current.pinHash) return;
      const timeout = current.autoLockMinutes * 60 * 1000;
      if (Date.now() - lastActiveRef.current >= timeout) lock();
    }, 5000);

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(idleTimer);
    };
  }, [lock]);

  return { locked, lock, unlock, touch };
}

