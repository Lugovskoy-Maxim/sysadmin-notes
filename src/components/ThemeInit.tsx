"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { applyTheme, normalizeTheme } from "@/lib/utils";

export function ThemeInit() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  useEffect(() => {
    const resolved = normalizeTheme(theme);
    if (resolved !== theme) setTheme(resolved);
    applyTheme(resolved);
  }, [theme, setTheme]);

  return null;
}