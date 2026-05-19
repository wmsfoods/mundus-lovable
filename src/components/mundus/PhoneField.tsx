import { USFlag, ChevronDownIcon } from "@/components/icons";

type PhoneFieldProps = {
  label?: string;
  required?: boolean;
  value?: string;
  onChange: (value: string) => void;
};

export function PhoneField({ label, required, value, onChange }: PhoneFieldProps) {
  return (
    <div className="field">
      {label && (
        <label className="field-label">
          {label}
          {required && <span className="req">*</span>}
        </label>
      )}
      <div className="phone-wrap">
        <button type="button" className="phone-cc">
          <span className="phone-flag">
            <USFlag />
          </span>
          <ChevronDownIcon size={14} />
        </button>
        <input
          className="phone-input"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="+1 (___) ___-____"
        />
      </div>
    </div>
  );
}
