import { useState, useRef, useEffect, useCallback } from "react";
import { type ParsedAddress } from "@/lib/googlePlaces";
import { supabase } from "@/integrations/supabase/client";

export interface AddressAutocompleteProps {
  value?: string;
  onChange?: (value: string) => void;
  onAddressSelect?: (address: ParsedAddress) => void;
  restrictCountry?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  showAttribution?: boolean;
}

interface Suggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  restrictCountry,
  placeholder,
  className,
  disabled,
  id,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("places-autocomplete", {
        body: { action: "autocomplete", input, restrictCountry },
      });

      if (error) {
        console.warn("[AddressAC] Edge function error:", error);
        return;
      }

      const items: Suggestion[] = data?.suggestions || [];
      setSuggestions(items);
      setShowDropdown(items.length > 0);
    } catch (err) {
      console.warn("[AddressAC] fetch error:", err);
    }
  }, [restrictCountry]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange?.(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = async (suggestion: Suggestion) => {
    setShowDropdown(false);
    setSuggestions([]);
    onChange?.(suggestion.fullText);

    try {
      const { data, error } = await supabase.functions.invoke("places-autocomplete", {
        body: { action: "details", placeId: suggestion.placeId },
      });

      if (error || !data?.address) return;

      const parsed: ParsedAddress = data.address;
      onChange?.(parsed.street || parsed.formatted);
      onAddressSelect?.(parsed);
    } catch (err) {
      console.warn("[AddressAC] details error:", err);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        className={className}
        value={value ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        onChange={handleChange}
        onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
      />
      {showDropdown && suggestions.length > 0 && (
        <div ref={dropdownRef} className="maa-dropdown">
          {suggestions.map((s) => (
            <div
              key={s.placeId}
              className="maa-dropdown-item"
              onClick={() => handleSelect(s)}
              onMouseDown={(e) => e.preventDefault()}
            >
              <span className="maa-dropdown-icon">📍</span>
              <div className="maa-dropdown-text">
                <span className="maa-dropdown-main">{s.mainText}</span>
                <span className="maa-dropdown-secondary">{s.secondaryText}</span>
              </div>
            </div>
          ))}
          <div className="maa-dropdown-attr">Powered by Google</div>
        </div>
      )}
    </div>
  );
}

export default AddressAutocomplete;