let loadPromise: Promise<void> | null = null;

export function hasGooglePlacesKey(): boolean {
  return Boolean(import.meta.env.VITE_GOOGLE_PLACES_API_KEY);
}

export function loadGooglePlaces(): Promise<void> {
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  if (!apiKey) return Promise.reject(new Error("No Google Places API key"));

  if (typeof window !== "undefined" && (window as any).google?.maps?.places) {
    return Promise.resolve();
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=__gmapsLoaded`;
    script.async = true;
    script.defer = true;
    (window as any).__gmapsLoaded = () => {
      resolve();
      try { delete (window as any).__gmapsLoaded; } catch { /* noop */ }
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  formatted: string;
}

export function parseGooglePlace(
  place: google.maps.places.PlaceResult,
): ParsedAddress {
  const get = (type: string, short = false) => {
    const comp = place.address_components?.find((c) => c.types.includes(type));
    return comp ? (short ? comp.short_name : comp.long_name) : "";
  };

  const streetNumber = get("street_number");
  const route = get("route");

  return {
    street: [streetNumber, route].filter(Boolean).join(" "),
    city:
      get("locality") ||
      get("sublocality_level_1") ||
      get("administrative_area_level_2"),
    state: get("administrative_area_level_1"),
    zip: get("postal_code"),
    country: get("country"),
    countryCode: get("country", true),
    lat: place.geometry?.location?.lat() ?? 0,
    lng: place.geometry?.location?.lng() ?? 0,
    formatted: place.formatted_address ?? "",
  };
}