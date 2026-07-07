"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock, Shield } from "lucide-react";
import { loadLockSettings, verifyPin } from "@/lib/app-lock";

type AppLockOverlayProps = {
  locked: boolean;
  onUnlock: () => void;
};

export function AppLockOverlay({ locked, onUnlock }: AppLockOverlayProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!locked) {
      setPin("");
      setError(false);
      return;
    }
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [locked]);

  const tryUnlock = useCallback(async () => {
    const settings = loadLockSettings();
    const ok = await verifyPin(pin, settings.pinHash);
    if (ok) {
      setPin("");
      setError(false);
      onUnlock();
      return;
    }
    setError(true);
    setPin("");
  }, [pin, onUnlock]);

  useEffect(() => {
    if (!locked || pin.length < 4) return;
    void tryUnlock();
  }, [locked, pin, tryUnlock]);

  if (!locked) return null;

  const time = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="app-lock-overlay" role="dialog" aria-modal="true" aria-label="Экран блокировки">
      <div className="app-lock-backdrop" />
      <div className="app-lock-card">
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
        <div className={`app-lock-pin ${error ? "error" : ""}`}>
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
                    return;
                  }
                  if (pin.length < 6) setPin((current) => current + key);
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
          Как в Telegram: приложение блокируется при сворачивании и по таймауту
        </p>
      </div>
    </div>
  );
}

export function useAppLock() {
  const [locked, setLocked] = useState(false);
  const [lastActive, setLastActive] = useState(Date.now());

  const touch = useCallback(() => setLastActive(Date.now()), []);

  const lock = useCallback(() => {
    const settings = loadLockSettings();
    if (settings.enabled && settings.pinHash) setLocked(true);
  }, []);

  const unlock = useCallback(() => setLocked(false), []);

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
      if (Date.now() - lastActive >= timeout) lock();
    }, 5000);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", lock);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", lock);
      window.clearInterval(idleTimer);
    };
  }, [lastActive, lock]);

  return { locked, lock, unlock, touch };
}

