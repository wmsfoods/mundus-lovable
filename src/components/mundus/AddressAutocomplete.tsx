import { useEffect, useRef, useState, useCallback } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<any>(null);
  const sessionTokenRef = useRef<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [ready, setReady] = useState(false);
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  const enabled = Boolean(apiKey);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function load() {
      if ((window as any).google?.maps?.places) {
        console.log('[AddressAutocomplete] Google Maps loaded, places available:', !!(window as any).google?.maps?.places?.AutocompleteService);
        if (!cancelled) initService();
        return;
      }

      const existing = document.querySelector('script[src*="maps.googleapis.com"]');
      if (!existing) {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
        script.async = true;
        document.head.appendChild(script);
      }

      const check = setInterval(() => {
        if ((window as any).google?.maps?.places) {
          clearInterval(check);
          if (!cancelled) initService();
        }
      }, 200);
      setTimeout(() => clearInterval(check), 15000);
    }

    function initService() {
      const g = (window as any).google;
      serviceRef.current = new g.maps.places.AutocompleteService();
      sessionTokenRef.current = new g.maps.places.AutocompleteSessionToken();
      console.log('[AddressAutocomplete] Service initialized:', !!serviceRef.current);
      setReady(true);
    }

    load();
    return () => { cancelled = true; };
  }, [enabled, apiKey]);

  const fetchSuggestions = useCallback((input: string) => {
    if (!serviceRef.current || input.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    console.log('[AddressAutocomplete] Fetching for:', input);
    serviceRef.current.getPlacePredictions(
      {
        input,
        types: ["address"],
        sessionToken: sessionTokenRef.current,
        componentRestrictions: restrictCountry ? { country: restrictCountry } : undefined,
      },
      (predictions: any[] | null, status: string) => {
        console.log('[AddressAutocomplete] Response:', status, predictions?.length, predictions);
        if (status === "OK" && predictions) {
          setSuggestions(predictions.slice(0, 5));
          setShowDropdown(true);
        } else {
          setSuggestions([]);
          setShowDropdown(false);
        }
      }
    );
  }, [restrictCountry]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange?.(val);
    fetchSuggestions(val);
  };

  const handleSelect = async (prediction: any) => {
    setShowDropdown(false);
    setSuggestions([]);

    const g = (window as any).google;
    const placesService = new g.maps.places.PlacesService(document.createElement("div"));

    placesService.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["address_components", "formatted_address", "geometry"],
        sessionToken: sessionTokenRef.current,
      },
      (place: any, status: string) => {
        if (status !== "OK" || !place) return;

        sessionTokenRef.current = new g.maps.places.AutocompleteSessionToken();

        const get = (type: string, short = false) => {
          const comp = place.address_components?.find((c: any) => c.types.includes(type));
          return comp ? (short ? comp.short_name : comp.long_name) : "";
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
          lat: place.geometry?.location?.lat() ?? 0,
          lng: place.geometry?.location?.lng() ?? 0,
          formatted: place.formatted_address ?? "",
        };

        onChange?.(parsed.street || parsed.formatted);
        onAddressSelect?.(parsed);
      }
    );
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
          {suggestions.map((s, i) => (
            <div
              key={s.place_id || i}
              className="maa-dropdown-item"
              onClick={() => handleSelect(s)}
              onMouseDown={(e) => e.preventDefault()}
            >
              <span className="maa-dropdown-icon">📍</span>
              <div className="maa-dropdown-text">
                <span className="maa-dropdown-main">{s.structured_formatting?.main_text}</span>
                <span className="maa-dropdown-secondary">{s.structured_formatting?.secondary_text}</span>
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
