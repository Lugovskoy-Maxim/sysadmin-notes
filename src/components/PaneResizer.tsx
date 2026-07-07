"use client";

import { useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store";

type PaneResizerProps = {
  listRef: React.RefObject<HTMLElement | null>;
};

export function PaneResizer({ listRef }: PaneResizerProps) {
  const shellListWidth = useAppStore((s) => s.shellListWidth);
  const setShellListWidth = useAppStore((s) => s.setShellListWidth);

  useEffect(() => {
    const shell = listRef.current?.closest(".app-shell") as HTMLElement | null;
    if (!shell) return;
    if (shellListWidth) {
      shell.style.setProperty("--shell-list-width", `${shellListWidth}px`);
    } else {
      shell.style.removeProperty("--shell-list-width");
    }
  }, [listRef, shellListWidth]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (window.matchMedia("(max-width: 900px)").matches) return;
      const list = listRef.current;
      const shell = list?.closest(".app-shell") as HTMLElement | null;
      if (!list || !shell) return;

      event.preventDefault();
      const startX = event.clientX;
      const startWidth = list.getBoundingClientRect().width;
      const sidebarWidth = shell.querySelector(".sidebar")?.getBoundingClientRect().width ?? 72;
      const shellWidth = shell.getBoundingClientRect().width;
      const minList = 280;
      const maxList = Math.max(minList, shellWidth - sidebarWidth - 360);

      function onMove(e: PointerEvent) {
        const next = Math.round(Math.min(maxList, Math.max(minList, startWidth + (e.clientX - startX))));
        setShellListWidth(next);
      }

      function onUp() {
        document.body.classList.remove("shell-resizing");
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }

      document.body.classList.add("shell-resizing");
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [listRef, setShellListWidth],
  );

  return (
    <div
      className="pane-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label="Изменить ширину списка"
      onPointerDown={onPointerDown}
    />
  );
}