export const CERT_TYPES = ["SIF", "Halal", "Kosher", "BRC/BRCGS", "HACCP", "ISO 22000", "Other"] as const;
export type CertType = (typeof CERT_TYPES)[number];

export const PRODUCT_CATEGORIES = ["Beef", "Pork", "Poultry", "Lamb"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

// Maps the UI label → the cuts.category value in DB
export const PRODUCT_CATEGORY_TO_CUTS: Record<ProductCategory, string> = {
  Beef: "Beef",
  Pork: "Pork",
  Poultry: "Poultry",
  Lamb: "Ovine",
};

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function fileTypeLabel(ft: string | null | undefined): string {
  if (!ft) return "FILE";
  if (ft.includes("pdf")) return "PDF";
  if (ft.includes("png")) return "PNG";
  if (ft.includes("jpeg") || ft.includes("jpg")) return "JPG";
  return ft.split("/").pop()?.toUpperCase() || "FILE";
}

export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}