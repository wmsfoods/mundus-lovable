import { ChevronDownIcon } from "@/components/icons";

type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  id?: string;
};

export function SelectField({
  label,
  required,
  value,
  onChange,
  options,
  id,
}: SelectFieldProps) {
  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={id}>
          {label}
          {required && <span className="req">*</span>}
        </label>
      )}
      <div className="select-wrap">
        <select
          id={id}
          className="select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--g400)", pointerEvents: "none" }} />
      </div>
    </div>
  );
}
