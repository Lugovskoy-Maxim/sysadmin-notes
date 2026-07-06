"use client";

import { BookOpen, KeyRound, Link2, LayoutGrid } from "lucide-react";
import type { NoteType, VaultSection } from "@/lib/types";
import { vaultSections } from "@/lib/types";
import { typeMeta } from "@/lib/note-fields";

const icons = {
  credential: KeyRound,
  instruction: BookOpen,
  schema: LayoutGrid,
  link: Link2,
} as const;

type TypeTabsProps = {
  value: NoteType;
  onChange: (type: NoteType) => void;
  vaultSection?: VaultSection;
};

export function TypeTabs({ value, onChange, vaultSection }: TypeTabsProps) {
  const section = vaultSection ? vaultSections.find((s) => s.id === vaultSection) : null;
  const types: NoteType[] = section
    ? section.types.length > 1
      ? section.types
      : [section.createType]
    : ["credential", "instruction", "schema"];

  return (
    <div className={`type-tabs ${types.length === 2 ? "cols-2" : types.length === 1 ? "cols-1" : ""}`} role="tablist" aria-label="Тип записи">
      {types.map((type) => {
        const meta = typeMeta[type];
        const Icon = icons[type];
        return (
          <button
            key={type}
            role="tab"
            aria-selected={value === type}
            className={`type-tab type-tab-${type} ${value === type ? "active" : ""}`}
            onClick={() => onChange(type)}
          >
            <span className="type-tab-icon">
              <Icon size={16} />
            </span>
            <span className="type-tab-text">
              <strong>{meta.label}</strong>
              <small>{meta.description}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}