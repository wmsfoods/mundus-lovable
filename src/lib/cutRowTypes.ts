/**
 * Per-cut row used by the V2 Cuts Table (in-memory only during R3-R4).
 * Persistence comes in R5.
 *
 * Numbers (qty/askPrice/floorPrice) are always stored in kg / $-per-kg.
 * The UI converts to lbs at display time via src/lib/units.ts.
 */
export type CutRow = {
  tempId: string;
  cutId: string | null;
  protein: string | null;
  cutName: string;
  brandId: string | null;
  brandName: string;
  spec: string;
  packing: string;
  plantId: string | null;
  plantNumber: string;
  notes: string;
  qty: number;              // kg
  askPrice: number;         // $/kg
  floorPrice: number;       // $/kg
  photoFile: File | null;   // R3: in-memory; R5 uploads on submit
  photoPreviewUrl: string | null;
  files: { file: File; previewUrl: string }[];
};

export const PROTEINS = ["Beef", "Pork", "Poultry", "Ovine"] as const;
export type Protein = (typeof PROTEINS)[number];

export const PACKING_OPTIONS = ["Carton Box", "Vacuum Pack", "Bulk", "Tray"] as const;
export const SPEC_OPTIONS = ["Bone-In", "Boneless", "Offals"] as const;

export function emptyCutRow(): CutRow {
  return {
    tempId: `cut-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    cutId: null,
    protein: null,
    cutName: "",
    brandId: null,
    brandName: "",
    spec: "",
    packing: "",
    plantId: null,
    plantNumber: "",
    notes: "",
    qty: 0,
    askPrice: 0,
    floorPrice: 0,
    photoFile: null,
    photoPreviewUrl: null,
    files: [],
  };
}