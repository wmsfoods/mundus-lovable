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
}

interface Suggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
}

export function AddressAutocomplete({
  value, onChange, onAddressSelect, restrictCountry,
  placeholder, className, disabled, id,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!API_KEY || input.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    console.log("[ADDR] fetching:", input);
    try {
      const body: Record<string, any> = {
        input,
        includedPrimaryTypes: ["street_address", "subpremise", "premise", "route", "locality"],
      };
      if (restrictCountry) body.includedRegionCodes = [restrictCountry.toUpperCase()];

      const resp = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": API_KEY },
        body: JSON.stringify(body),
      });
      console.log("[ADDR] response status:", resp.status);
      const data = await resp.json();
      console.log("[ADDR] response data:", data);

      if (!resp.ok) { setSuggestions([]); setShowDropdown(false); return; }

      const items = (data.suggestions || [])
        .filter((s: any) => s.placePrediction)
        .slice(0, 5)
        .map((s: any) => ({
          placeId: s.placePrediction.placeId,
          mainText: s.placePrediction.structuredFormat?.mainText?.text || "",
          secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text || "",
          fullText: s.placePrediction.text?.text || "",
        }));
      console.log("[ADDR] suggestions:", items.length);
      setSuggestions(items);
      setShowDropdown(items.length > 0);
    } catch (err) {
      console.error("[ADDR] ERROR:", err);
    }
  }, [API_KEY, restrictCountry]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange?.(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = async (s: Suggestion) => {
    setShowDropdown(false); setSuggestions([]);
    onChange?.(s.fullText);
    try {
      const resp = await fetch(
        `https://places.googleapis.com/v1/places/${s.placeId}`,
        { headers: { "X-Goog-Api-Key": API_KEY, "X-Goog-FieldMask": "addressComponents,formattedAddress,location" } }
      );
      if (!resp.ok) return;
      const place = await resp.json();
      const get = (type: string, short = false) => {
        const c = (place.addressComponents || []).find((x: any) => x.types?.includes(type));
        return c ? (short ? c.shortText : c.longText) : "";
      };
      const parsed: ParsedAddress = {
        street: [get("street_number"), get("route")].filter(Boolean).join(" "),
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
    } catch (err) { console.error("[ADDR] detail error:", err); }
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input ref={inputRef} id={id} type="text" className={className}
        value={value ?? ""} placeholder={placeholder} disabled={disabled}
        autoComplete="off" onChange={handleChange}
        onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }} />
      {showDropdown && suggestions.length > 0 && (
        <div ref={dropdownRef} className="maa-dropdown">
          {suggestions.map((s) => (
            <div key={s.placeId} className="maa-dropdown-item"
              onClick={() => handleSelect(s)} onMouseDown={(e) => e.preventDefault()}>
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