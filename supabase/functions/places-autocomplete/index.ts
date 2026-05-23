import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") || "AIzaSyAlx04KCzO-8AKnn515qcirGH7BFNdBzt0";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_API_KEY,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Google Places error:", data);
        return new Response(JSON.stringify({ error: data }), {
          status: res.status,
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
          headers: {
            "X-Goog-Api-Key": GOOGLE_API_KEY,
            "X-Goog-FieldMask": "addressComponents,formattedAddress,location",
          },
        }
      );

      const place = await res.json();

      if (!res.ok) {
        return new Response(JSON.stringify({ error: place }), {
          status: res.status,
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