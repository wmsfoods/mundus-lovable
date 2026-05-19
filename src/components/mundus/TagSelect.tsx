import { useState, useRef, useEffect } from "react";
import { XIcon, ChevronDownIcon } from "@/components/icons";

type TagSelectProps = {
  label?: string;
  value?: string[];
  onChange: (value: string[]) => void;
  options: string[];
  minHint?: string;
  placeholder?: string;
};

export function TagSelect({
  label,
  value = [],
  onChange,
  options,
  minHint,
  placeholder,
}: TagSelectProps) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const available = options.filter((o) => !value.includes(o));
  const remove = (v: string) => onChange(value.filter((x) => x !== v));
  const add = (v: string) => onChange([...value, v]);
  const clear = () => onChange([]);

  return (
    <div className="field">
      {label && (
        <label className="field-label">
          {label}
          {minHint && (
            <span style={{ color: "var(--fg-muted)", fontWeight: 400 }}> {minHint}</span>
          )}
        </label>
      )}
      <div
        ref={wrapRef}
        className={`tag-select ${focused || open ? "focused" : ""}`.trim()}
        onClick={() => {
          setOpen(true);
          setFocused(true);
        }}
      >
        {value.map((v) => (
          <span key={v} className="tag">
            {v}
            <button
              type="button"
              className="tag-x"
              onClick={(e) => {
                e.stopPropagation();
                remove(v);
              }}
              aria-label={`Remove ${v}`}
            >
              <XIcon size={12} />
            </button>
          </span>
        ))}
        {value.length === 0 && (
          <span style={{ color: "var(--g400)", padding: "0 4px" }}>
            {placeholder || ""}
          </span>
        )}
        {value.length > 0 && (
          <button
            type="button"
            className="tag-select-clear"
            onClick={(e) => {
              e.stopPropagation();
              clear();
            }}
            aria-label="Clear all"
          >
            <XIcon size={14} />
          </button>
        )}
        <span className="tag-select-chevron">
          <ChevronDownIcon size={16} />
        </span>
        {open && available.length > 0 && (
          <div className="tag-options" onClick={(e) => e.stopPropagation()}>
            {available.map((o) => (
              <div
                key={o}
                className="tag-option"
                onClick={() => {
                  add(o);
                }}
              >
                {o}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
