"use client";

import { useState, type ReactNode } from "react";
import { Copy, Eye, EyeOff, ExternalLink, type LucideIcon } from "lucide-react";
import { normalizeExternalUrl } from "@/lib/utils";

type FieldProps = {
  label: string;
  hint?: string;
  icon?: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  secret?: boolean;
  mono?: boolean;
  multiline?: boolean;
  wide?: boolean;
  onCopy?: () => void;
  link?: string;
  trailing?: ReactNode;
};

export function Field({
  label,
  hint,
  icon: Icon,
  value,
  onChange,
  placeholder,
  secret,
  mono,
  multiline,
  wide,
  onCopy,
  link,
  trailing,
}: FieldProps) {
  const [visible, setVisible] = useState(false);
  const inputType = secret && !visible ? "password" : "text";
  const safeLink = normalizeExternalUrl(link);

  return (
    <div className={`ui-field ${wide ? "wide" : ""}`}>
      <div className="ui-field-head">
        <div className="ui-field-label">
          {Icon ? <Icon size={14} /> : null}
          <span>{label}</span>
        </div>
        {hint ? <p className="ui-field-hint">{hint}</p> : null}
      </div>
      <div className="ui-field-control">
        {multiline ? (
          <textarea
            className={`ui-input ${mono ? "mono" : ""}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={4}
          />
        ) : (
          <input
            className={`ui-input ${mono ? "mono" : ""}`}
            type={inputType}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        )}
        <div className="ui-field-actions">
          {secret ? (
            <button type="button" className="ui-icon-btn" onClick={() => setVisible((v) => !v)} aria-label="Показать">
              {visible ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          ) : null}
          {onCopy ? (
            <button type="button" className="ui-icon-btn" onClick={onCopy} aria-label="Копировать">
              <Copy size={15} />
            </button>
          ) : null}
          {safeLink ? (
            <a href={safeLink} target="_blank" rel="noopener noreferrer" className="ui-open-link" aria-label={`Открыть ${label}`}>
              <ExternalLink size={15} />
              <span>Открыть</span>
            </a>
          ) : null}
          {trailing}
        </div>
      </div>
    </div>
  );
}
