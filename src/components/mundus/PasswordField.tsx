import { useState } from "react";
import { TextField } from "./TextField";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

type PasswordFieldProps = {
  label?: string;
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  id?: string;
};

export function PasswordField({
  label,
  required,
  value,
  onChange,
  placeholder,
  id,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <TextField
      id={id}
      label={label}
      required={required}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={show ? "text" : "password"}
      rightIcon={
        <button
          type="button"
          className="input-icon"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeIcon size={20} /> : <EyeOffIcon size={20} />}
        </button>
      }
    />
  );
}
