type RadioOption = {
  value: string;
  label: string;
};

type RadioGroupProps = {
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  name: string;
};

export function RadioGroup({ value, onChange, options, name }: RadioGroupProps) {
  return (
    <div className="radio-row">
      {options.map((opt) => (
        <label key={opt.value} className="radio">
          <input
            type="radio"
            name={name}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
