import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MatchStatus = "exact" | "fuzzy" | "not_found" | "none";

export type ResolvedCountry = {
  id: string | null;
  name: string;
  iso: string;
  flag: string;
  match: MatchStatus;
} | null;

export type ParsedOfferPayload = {
  brand: { name: string | null; id: string | null; match: MatchStatus; suggested?: string };
  origin: { country: ResolvedCountry; portName: string | null };
  destinations: Array<{
    country: ResolvedCountry;
    portNames: string[];
    freightUsd: number | null;
    insuranceUsd: number | null;
  }>;
  sameFreightGlobal: boolean;
  globalFreight: number | null;
  globalInsurance: number | null;
  incoterms: string[];
  containerSize: "20ft" | "40ft" | null;
  fclCount: number | null;
  temperature: "Frozen" | "Chilled" | null;
  shipmentReady: string | null;
  paymentTerms: { label: string | null; match: MatchStatus; suggested?: string };
  items: Array<{
    cutName: string;
    protein: "Beef" | "Pork" | "Poultry" | "Ovine" | null;
    spec: "Bone-In" | "Boneless" | "Offals" | null;
    packing: string | null;
    qtyKg: number | null;
    askPricePerKg: number | null;
    notes: string | null;
    plant: { plantNumber: string | null; plantId: string | null; match: MatchStatus };
    cut: {
      id: string | null;
      name: string | null;
      match: MatchStatus;
      candidates: Array<{ id: string; name: string; score: number }>;
    };
  }>;
  model: string;
};

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      // Strip "data:<mime>;base64," prefix
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    r.onerror = () => reject(r.error ?? new Error("Failed to read file"));
    r.readAsDataURL(file);
  });
}

export type ParseOfferInput = {
  supplierId: string | null;
  text?: string;
  audioTranscript?: string;
  file?: File;
};

export function useAiParseOffer() {
  return useMutation({
    mutationFn: async (vars: ParseOfferInput): Promise<ParsedOfferPayload> => {
      const payload: Record<string, unknown> = { supplierId: vars.supplierId };
      if (vars.file) {
        if (vars.file.size > 5 * 1024 * 1024) {
          throw new Error("File exceeds 5MB limit.");
        }
        payload.file = {
          name: vars.file.name,
          type: vars.file.type,
          base64: await fileToBase64(vars.file),
        };
      } else if (vars.audioTranscript) {
        payload.audioTranscript = vars.audioTranscript;
      } else if (vars.text) {
        payload.text = vars.text;
      } else {
        throw new Error("Provide text, audioTranscript, or file.");
      }
      const { data, error } = await supabase.functions.invoke("ai-parse-offer", { body: payload });
      if (error) throw error;
      if (data && (data as any).error) {
        throw new Error((data as any).message || (data as any).error);
      }
      return data as ParsedOfferPayload;
    },
  });
}