import { useEffect, useRef, useState } from "react";
import {
  hasGooglePlacesKey,
  loadGooglePlaces,
  parseGooglePlace,
  type GooglePlaceResult,
  type ParsedAddress,
} from "@/lib/googlePlaces";

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
  const acRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const enabled = hasGooglePlacesKey();

  useEffect(() => {
    if (!enabled || !inputRef.current) return;
    let cancelled = false;
    loadGooglePlaces()
      .then(() => {
        if (cancelled || !inputRef.current) return;
        const g = (window as any).google;
        if (!g?.maps?.places?.Autocomplete) return;
        const ac = new g.maps.places.Autocomplete(inputRef.current, {
          types: ["address"],
          fields: ["address_components", "formatted_address", "geometry"],
          componentRestrictions: restrictCountry
            ? { country: restrictCountry.toLowerCase() }
            : undefined,
        });
        ac.addListener("place_changed", () => {
          const place: GooglePlaceResult = ac.getPlace();
          if (!place?.address_components) return;
          const parsed = parseGooglePlace(place);
          onChange?.(parsed.street || parsed.formatted);
          onAddressSelect?.(parsed);
        });
        acRef.current = ac;
        setReady(true);
      })
      .catch(() => {
        /* graceful degradation */
      });
    return () => {
      cancelled = true;
      const g = (window as any).google;
      if (acRef.current && g?.maps?.event) {
        g.maps.event.clearInstanceListeners(acRef.current);
      }
      acRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, restrictCountry]);

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        type="text"
        className={className}
        value={value ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => onChange?.(e.target.value)}
      />
      {enabled && showAttribution && ready && (
        <span className="maa-attr">📍 Powered by Google</span>
      )}
    </>
  );
}

export default AddressAutocomplete;