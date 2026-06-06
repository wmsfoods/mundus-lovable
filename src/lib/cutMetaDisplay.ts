/**
 * Cut metadata tags (aging method, USDA grade, etc) — display-only,
 * rendered as a small muted line below the cut name in both the
 * supplier wizard (desktop CutsTable + mobile cut cards) and the
 * buyer-side cut display.
 */

import type { CutRow } from "@/lib/cutRowTypes";

type TFn = (key: string, opts?: any) => string;

/** Form-state shape (supplier wizard CutRow). */
export function formatCutMeta(
  cut: Partial<Pick<CutRow, "agingMethod" | "usGrade">>,
  t?: TFn,
): string[] {
  const tags: string[] = [];
  const tt = (k: string, fb: string) => (t ? t(k, { defaultValue: fb }) : fb);
  if (cut.agingMethod === "wet") tags.push(tt("cut.meta.wetAged", "Wet aged"));
  if (cut.agingMethod === "dry") tags.push(tt("cut.meta.dryAged", "Dry aged"));
  if (cut.usGrade) tags.push(cut.usGrade);
  return tags;
}

/** DB shape (offer_items: aging_method, us_grade). */
export function formatCutMetaFromOfferItem(
  item: { aging_method?: string | null; us_grade?: string | null } | null | undefined,
  t?: TFn,
): string[] {
  if (!item) return [];
  return formatCutMeta(
    {
      agingMethod:
        item.aging_method === "wet" || item.aging_method === "dry" ? item.aging_method : null,
      usGrade: (item.us_grade as CutRow["usGrade"]) ?? null,
    },
    t,
  );
}