"use client";

import { BookOpen, KeyRound, LayoutGrid } from "lucide-react";
import type { VaultSection } from "@/lib/types";
import { vaultSections } from "@/lib/types";

const icons = {
  passwords: KeyRound,
  instructions: BookOpen,
  schemas: LayoutGrid,
} as const;

type VaultNavProps = {
  value: VaultSection;
  counts: Record<VaultSection, number>;
  onChange: (section: VaultSection) => void;
  compact?: boolean;
};

export function VaultNav({ value, counts, onChange, compact }: VaultNavProps) {
  if (compact) {
    return (
      <nav className="vault-nav vault-nav-compact" aria-label="Разделы хранилища">
        {vaultSections.map((section) => {
          const Icon = icons[section.id];
          return (
            <button
              key={section.id}
              type="button"
              className={`sidebar-rail-btn vault-rail-btn vault-${section.id} ${value === section.id ? "active" : ""}`}
              onClick={() => onChange(section.id)}
              title={`${section.label} (${counts[section.id]})`}
              aria-label={section.label}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="vault-nav" aria-label="Разделы хранилища">
      {vaultSections.map((section) => {
        const Icon = icons[section.id];
        return (
          <button
            key={section.id}
            type="button"
            className={`vault-nav-item vault-${section.id} ${value === section.id ? "active" : ""}`}
            onClick={() => onChange(section.id)}
            title={section.description}
          >
            <span className="vault-nav-icon">
              <Icon size={16} />
            </span>
            <span className="vault-nav-text">
              <strong>{section.label}</strong>
              <small>{section.description}</small>
            </span>
            <span className="vault-nav-count">{counts[section.id]}</span>
          </button>
        );
      })}
    </nav>
  );
}