import { useState, useRef, useEffect, useCallback } from "react";
import { type ParsedAddress } from "@/lib/googlePlaces";

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
  showAttribution = true,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  const enabled = Boolean(apiKey);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!enabled || input.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const body: any = {
        input,
        includedPrimaryTypes: ["street_address", "subpremise", "premise", "route"],
      };
      if (restrictCountry) {
        body.includedRegionCodes = [restrictCountry.toUpperCase()];
      }

      const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        console.warn("[AddressAutocomplete] API error:", res.status, await res.text());
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      const data = await res.json();
      const items: Suggestion[] = (data.suggestions || [])
        .filter((s: any) => s.placePrediction)
        .slice(0, 5)
        .map((s: any) => ({
          placeId: s.placePrediction.placeId,
          mainText: s.placePrediction.structuredFormat?.mainText?.text || "",
          secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text || "",
          fullText: s.placePrediction.text?.text || "",
        }));

      setSuggestions(items);
      setShowDropdown(items.length > 0);
    } catch (err) {
      console.warn("[AddressAutocomplete] fetch error:", err);
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  }, [enabled, apiKey, restrictCountry]);

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
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${suggestion.placeId}`,
        {
          headers: {
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "addressComponents,formattedAddress,location",
          },
        }
      );

      if (!res.ok) return;
      const place = await res.json();

      const get = (type: string, short = false) => {
        const comp = (place.addressComponents || []).find((c: any) =>
          c.types?.includes(type)
        );
        return comp ? (short ? comp.shortText : comp.longText) : "";
      };

      const streetNumber = get("street_number");
      const route = get("route");

      const parsed: ParsedAddress = {
        street: [streetNumber, route].filter(Boolean).join(" "),
        city: get("locality") || get("sublocality_level_1") || get("administrative_area_level_2"),
        state: get("administrative_area_level_1"),
        zip: get("postal_code"),
        country: get("country"),
        countryCode: get("country", true),
        lat: place.location?.latitude ?? 0,
        lng: place.location?.longitude ?? 0,
        formatted: place.formattedAddress ?? "",
      };

      onChange?.(parsed.street || parsed.formatted);
      onAddressSelect?.(parsed);
    } catch (err) {
      console.warn("[AddressAutocomplete] details error:", err);
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
          {showAttribution && (
            <div className="maa-dropdown-attr">Powered by Google</div>
          )}
        </div>
      )}
    </div>
  );
}

export default AddressAutocomplete;