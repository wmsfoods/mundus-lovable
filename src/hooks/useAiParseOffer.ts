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

export function useAiParseOffer() {
  return useMutation({
    mutationFn: async (vars: { text: string; supplierId: string | null }): Promise<ParsedOfferPayload> => {
      const { data, error } = await supabase.functions.invoke("ai-parse-offer", {
        body: { text: vars.text, supplierId: vars.supplierId },
      });
      if (error) throw error;
      if (data && (data as any).error) {
        throw new Error((data as any).message || (data as any).error);
      }
      return data as ParsedOfferPayload;
    },
  });
}