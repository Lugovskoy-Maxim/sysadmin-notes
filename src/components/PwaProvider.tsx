"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function PwaProvider() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const dismissedKey = "sysadmin-notes-pwa-dismissed";
    setDismissed(sessionStorage.getItem(dismissedKey) === "1");

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", () => {
      setInstallEvent(null);
      setDismissed(true);
    });

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        setRegistration(reg);
        if (reg.waiting) setUpdateReady(true);

        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          });
        });
      })
      .catch(() => undefined);

    const onControllerChange = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  async function installApp() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstallEvent(null);
  }

  function dismissInstall() {
    setDismissed(true);
    sessionStorage.setItem("sysadmin-notes-pwa-dismissed", "1");
  }

  function applyUpdate() {
    registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
    setUpdateReady(false);
  }

  const showInstall = installEvent && !dismissed && !isStandalone();

  if (!showInstall && !updateReady) return null;

  return (
    <div className="pwa-banners" aria-live="polite">
      {updateReady ? (
        <div className="pwa-banner pwa-banner-update">
          <RefreshCw size={16} />
          <div>
            <strong>Доступно обновление</strong>
            <span>Перезагрузите приложение, чтобы получить новую версию.</span>
          </div>
          <button type="button" className="primary-button compact" onClick={applyUpdate}>
            Обновить
          </button>
        </div>
      ) : null}

      {showInstall ? (
        <div className="pwa-banner pwa-banner-install">
          <Download size={16} />
          <div>
            <strong>Установить приложение</strong>
            <span>Добавьте Sysadmin Notes на рабочий стол для быстрого доступа.</span>
          </div>
          <div className="pwa-banner-actions">
            <button type="button" className="primary-button compact" onClick={() => void installApp()}>
              Установить
            </button>
            <button type="button" className="icon-button small-btn" onClick={dismissInstall} aria-label="Скрыть">
              <X size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}