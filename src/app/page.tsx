"use client";

import { useEffect, useState } from "react";
import { AuthForm } from "@/components/AuthForm";
import { Dashboard } from "@/components/Dashboard";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";

export default function Home() {
  const token = useAppStore((s) => s.token);
  const setAuth = useAppStore((s) => s.setAuth);
  const clearAuth = useAppStore((s) => s.clearAuth);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "tasks") {
      useAppStore.getState().setAppMode("tasks");
    }
  }, []);

  useEffect(() => {
    async function verify() {
      const params = new URLSearchParams(window.location.search);
      const oauthSuccess = params.get("oauth") === "success";
      const storedToken = useAppStore.getState().token ?? (oauthSuccess ? "cookie" : null);
      if (!storedToken) {
        setChecking(false);
        return;
      }
      try {
        const user = await api.auth.me(storedToken);
        setAuth(storedToken, { ...user, createdAt: new Date().toISOString() });
        if (oauthSuccess) window.history.replaceState({}, "", window.location.pathname);
      } catch {
        clearAuth();
      } finally {
        setChecking(false);
      }
    }
    void verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return <main className="loading-screen">Проверка сессии...</main>;
  }

  if (!token) return <AuthForm />;
  return <Dashboard />;
}
