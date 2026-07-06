"use client";

import { useState } from "react";
import { X } from "lucide-react";

type TagInputProps = {
  tags: string[];
  suggestions?: string[];
  onChange: (tags: string[]) => void;
};

export function TagInput({ tags, suggestions = [], onChange }: TagInputProps) {
  const [input, setInput] = useState("");

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div className="tag-input">
      <div className="tag-input-chips">
        {tags.map((tag) => (
          <span key={tag} className="tag-chip">
            #{tag}
            <button type="button" onClick={() => removeTag(tag)} aria-label={`Удалить ${tag}`}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          className="tag-input-field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(input);
            }
            if (e.key === "Backspace" && !input && tags.length) {
              removeTag(tags[tags.length - 1]);
            }
          }}
          placeholder={tags.length ? "" : "Добавить тег…"}
        />
      </div>
      {suggestions.length ? (
        <div className="tag-suggestions">
          {suggestions
            .filter((s) => !tags.includes(s.toLowerCase()))
            .slice(0, 6)
            .map((s) => (
              <button key={s} type="button" onClick={() => addTag(s)}>
                {s}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}