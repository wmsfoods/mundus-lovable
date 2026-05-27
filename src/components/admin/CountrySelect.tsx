import { useMemo } from "react";
import { useCountriesList } from "@/hooks/useCountriesList";
import { matchCountry } from "@/lib/countryMatch";

type Props = {
  value: string;
  onChange: (canonicalName: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
  required?: boolean;
};

/** Standardized country dropdown backed by the `countries` table. */
export function CountrySelect({ value, onChange, placeholder, style, className, required }: Props) {
  const { countries, loading } = useCountriesList();
  // If the stored value isn't an exact canonical match, try to map it.
  const resolved = useMemo(() => {
    if (!value) return "";
    const exact = countries.find((c) => c.english_name === value);
    if (exact) return exact.english_name;
    return matchCountry(value, countries) ?? "";
  }, [value, countries]);
  return (
    <select
      className={className}
      style={style}
      value={resolved}
      required={required}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{loading ? "Loading…" : placeholder ?? "Select a country"}</option>
      {countries.map((c) => (
        <option key={c.id} value={c.english_name}>
          {(c.flag_emoji ?? "🌍") + " " + c.english_name}
        </option>
      ))}
    </select>
  );
}