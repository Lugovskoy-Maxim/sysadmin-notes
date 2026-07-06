"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type CollapsibleSectionProps = {
  id: string;
  title: string;
  summary?: string;
  filled?: boolean;
  open: boolean;
  onToggle: () => void;
  accent?: string;
  children: ReactNode;
};

export function CollapsibleSection({
  id,
  title,
  summary,
  filled,
  open,
  onToggle,
  accent,
  children,
}: CollapsibleSectionProps) {
  return (
    <section
      className={`note-section collapsible ${open ? "open" : "collapsed"} ${filled ? "has-data" : ""}`}
      style={{ "--section-accent": accent } as React.CSSProperties}
      data-section={id}
    >
      <button type="button" className="note-section-toggle" onClick={onToggle} aria-expanded={open}>
        <span className="note-section-toggle-left">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="note-section-toggle-text">
            <strong>{title}</strong>
            {!open && summary ? <small>{summary}</small> : null}
          </span>
        </span>
        <span className="note-section-toggle-right">
          {filled ? <em className="section-badge">заполнено</em> : null}
          <span className="section-state">{open ? "Свернуть" : "Открыть"}</span>
        </span>
      </button>
      {open ? <div className="note-section-body">{children}</div> : null}
    </section>
  );
}