import { InputHTMLAttributes, ReactNode } from "react";

type TextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> & {
  label?: string;
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  icon?: ReactNode;
  rightIcon?: ReactNode;
};

export function TextField({
  label,
  required,
  type = "text",
  value,
  onChange,
  placeholder,
  icon,
  rightIcon,
  readOnly,
  id,
  ...rest
}: TextFieldProps) {
  const hasIcon = Boolean(icon || rightIcon);
  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={id}>
          {label}
          {required && <span className="req">*</span>}
        </label>
      )}
      <div className="input-wrap">
        <input
          id={id}
          type={type}
          className={`input ${hasIcon ? "has-icon" : ""} ${readOnly ? "input-readonly" : ""}`.trim()}
          value={value ?? ""}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          {...rest}
        />
        {icon && <span className="input-icon static">{icon}</span>}
        {rightIcon}
      </div>
    </div>
  );
}
