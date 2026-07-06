"use client";

type CategoryInputProps = {
  value: string;
  suggestions: string[];
  onChange: (value: string) => void;
};

export function CategoryInput({ value, suggestions, onChange }: CategoryInputProps) {
  const filtered = suggestions.filter((s) => s.toLowerCase() !== value.toLowerCase());

  return (
    <div className="category-input">
      <input
        className="ui-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Категория…"
        list="category-suggestions"
      />
      {filtered.length ? (
        <div className="category-suggestions">
          {filtered.slice(0, 5).map((s) => (
            <button key={s} type="button" onClick={() => onChange(s)}>
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}