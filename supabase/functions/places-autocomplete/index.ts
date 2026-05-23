import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");

const FALLBACK_REFERRER = "https://mundus-lovable.lovable.app/";
const ALLOWED_REFERRER_HOSTS = new Set([
  "170ae70f-e543-40da-9f55-de7221b2701a.lovableproject.com",
  "id-preview--170ae70f-e543-40da-9f55-de7221b2701a.lovable.app",
  "mundus-lovable.lovable.app",
  "localhost",
]);

const getGoogleHeaders = (req: Request, extraHeaders: Record<string, string> = {}) => {
  const rawReferrer = req.headers.get("origin") || req.headers.get("referer");
  let referrer = FALLBACK_REFERRER;

  if (rawReferrer) {
    try {
      const url = new URL(rawReferrer);
      if (ALLOWED_REFERRER_HOSTS.has(url.hostname)) {
        referrer = `${url.origin}/`;
      }
    } catch {
      referrer = FALLBACK_REFERRER;
    }
  }

  return {
    "X-Goog-Api-Key": GOOGLE_API_KEY,
    Referer: referrer,
    ...extraHeaders,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GOOGLE_API_KEY) {
      return new Response(JSON.stringify({ error: "GOOGLE_PLACES_API_KEY is not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, input, restrictCountry, placeId } = await req.json();

    if (action === "autocomplete") {
      const body: any = {
        input,
        includedPrimaryTypes: ["street_address", "subpremise", "premise", "route", "locality"],
      };
      if (restrictCountry) {
        body.includedRegionCodes = [restrictCountry.toUpperCase()];
      }

      const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: getGoogleHeaders(req, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Google Places error:", data);
        return new Response(JSON.stringify({ error: data }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const suggestions = (data.suggestions || [])
        .filter((s: any) => s.placePrediction)
        .slice(0, 5)
        .map((s: any) => ({
          placeId: s.placePrediction.placeId,
          mainText: s.placePrediction.structuredFormat?.mainText?.text || "",
          secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text || "",
          fullText: s.placePrediction.text?.text || "",
        }));

      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "details") {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          headers: getGoogleHeaders(req, {
            "X-Goog-FieldMask": "addressComponents,formattedAddress,location",
          }),
        }
      );

      const place = await res.json();

      if (!res.ok) {
        return new Response(JSON.stringify({ error: place }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const get = (type: string, short = false) => {
        const comp = (place.addressComponents || []).find((c: any) =>
          c.types?.includes(type)
        );
        return comp ? (short ? comp.shortText : comp.longText) : "";
      };

      const streetNumber = get("street_number");
      const route = get("route");

      const address = {
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

      return new Response(JSON.stringify({ address }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});