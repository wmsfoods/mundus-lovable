type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
};

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      className={`toggle-wrap ${checked ? "on" : ""}`.trim()}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span className="toggle" />
      {label && <span className="toggle-label">{label}</span>}
    </button>
  );
}
