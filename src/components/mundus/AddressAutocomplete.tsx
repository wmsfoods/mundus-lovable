import { useEffect, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  const enabled = Boolean(apiKey);

  useEffect(() => {
    if (!enabled || !containerRef.current) {
      setFallback(true);
      return;
    }

    let cancelled = false;

    async function init() {
      try {
        if (!(window as any).google?.maps?.places) {
          await new Promise<void>((resolve, reject) => {
            if ((window as any).google?.maps?.places) { resolve(); return; }
            const existing = document.querySelector('script[src*="maps.googleapis.com"]');
            if (existing) {
              existing.addEventListener('load', () => resolve());
              return;
            }
            const script = document.createElement("script");
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
            script.async = true;
            script.onload = () => {
              const check = setInterval(() => {
                if ((window as any).google?.maps?.places) {
                  clearInterval(check);
                  resolve();
                }
              }, 100);
              setTimeout(() => { clearInterval(check); reject(new Error("timeout")); }, 10000);
            };
            script.onerror = () => reject(new Error("script load failed"));
            document.head.appendChild(script);
          });
        }

        if (cancelled || !containerRef.current) return;

        const g = (window as any).google;

        if (g.maps.places.PlaceAutocompleteElement) {
          const el = new g.maps.places.PlaceAutocompleteElement({
            types: ["address"],
            componentRestrictions: restrictCountry ? { country: restrictCountry.toLowerCase() } : undefined,
          });

          el.style.width = "100%";
          el.style.display = "block";

          el.addEventListener("gmp-placeselect", async (event: any) => {
            const place = event.place;
            if (!place) return;

            await place.fetchFields({ fields: ["addressComponents", "formattedAddress", "location"] });

            const get = (type: string, short = false) => {
              const comp = place.addressComponents?.find((c: any) => c.types?.includes(type));
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
              lat: place.location?.lat() ?? 0,
              lng: place.location?.lng() ?? 0,
              formatted: place.formattedAddress ?? "",
            };

            onChange?.(parsed.street || parsed.formatted);
            onAddressSelect?.(parsed);
          });

          if (containerRef.current) {
            containerRef.current.innerHTML = "";
            containerRef.current.appendChild(el);
            setReady(true);
          }
        } else {
          setFallback(true);
        }
      } catch (err) {
        console.warn("[AddressAutocomplete] Failed to init:", err);
        if (!cancelled) setFallback(true);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [enabled, restrictCountry, apiKey]);

  if (!enabled || fallback) {
    return (
      <input
        id={id}
        type="text"
        className={className}
        value={value ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => onChange?.(e.target.value)}
      />
    );
  }

  return (
    <div>
      <div ref={containerRef} className="mundus-address-container" />
      {ready && showAttribution && (
        <span className="maa-attr">📍 Powered by Google</span>
      )}
    </div>
  );
}

export default AddressAutocomplete;