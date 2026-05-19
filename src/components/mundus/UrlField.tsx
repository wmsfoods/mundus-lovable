type UrlFieldProps = {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function UrlField({ label, value, onChange, placeholder }: UrlFieldProps) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      <div className="url-wrap">
        <span className="url-prefix">https://</span>
        <input
          className="url-input"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
