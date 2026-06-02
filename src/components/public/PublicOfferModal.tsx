import { useTranslation } from "react-i18next";
import { Lock, Factory } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FlagSVG } from "@/components/icons";
import { countryToCode } from "@/lib/countryCodes";
import { formatOfferNumber } from "@/lib/offerNumber";
import type { PublicOffer } from "@/hooks/usePublicOffers";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmtKg(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

function fmtPrice(p: number) {
  return `US$ ${Number(p).toFixed(2)} /kg`;
}

export default function PublicOfferModal({
  offer,
  onClose,
  onReveal,
}: {
  offer: PublicOffer | null;
  onClose: () => void;
  onReveal: () => void;
}) {
  const { t } = useTranslation();
  if (!offer) return null;

  const items = offer.items ?? [];
  const mixed = items.length > 1;
  const firstItem = items[0];
  const title = mixed
    ? `${t("public.home.mixedFcl", "Mixed FCL")} · ${items.length}`
    : firstItem?.product_name ?? "Offer";

  const condition = firstItem?.condition ?? "—";
  const totalKg = items.reduce((s, it) => s + Number(it.amount ?? 0), 0);
  const totalMT = totalKg / 1000;
  const minPrice = items.length
    ? Math.min(...items.map((it) => Number(it.price ?? 0)).filter((n) => n > 0))
    : 0;

  const markets = (offer.markets ?? [])
    .map((m) => m.country)
    .filter((c): c is string => !!c);
  const originCode = countryToCode(offer.origin_country);

  const shipment = `${MONTH_NAMES[(offer.shipment_month - 1) % 12] ?? ""} ${offer.shipment_year}`;

  return (
    <Dialog open={!!offer} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <DialogHeader className="border-b px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-lg font-bold text-[#1A1A2E] truncate">
                {title}
              </DialogTitle>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  }}
                >
                  {formatOfferNumber(offer.offer_number, offer.created_at)}
                </span>
                <span className="text-gray-300">·</span>
                <span>{condition}</span>
                {offer.is_halal && (
                  <span className="rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-bold text-[#047857]">
                    HALAL
                  </span>
                )}
                {offer.is_kosher && (
                  <span className="rounded-full bg-[#eff6ff] px-2 py-0.5 text-[10px] font-bold text-[#1d4ed8]">
                    KOSHER
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 py-4 space-y-5">
          {/* Cuts table */}
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">
                    {t("public.home.cut", "Cut")}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">
                    {t("public.home.category", "Category")}
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    {t("public.home.quantity", "Quantity")}
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    {t("public.home.price", "Price")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((it) => (
                  <tr key={it.id} className="text-[#1A1A2E]">
                    <td className="px-3 py-2 font-medium">
                      {it.product_name || it.category_name || "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {it.category_name || it.category_code || "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {fmtKg(Number(it.amount ?? 0))} kg
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">
                      {fmtPrice(Number(it.price ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr className="text-[#1A1A2E]">
                  <td className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500" colSpan={2}>
                    {t("public.home.totalWeight", "Total weight")}
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-bold tabular-nums">
                    {fmtKg(totalKg)} kg
                    {totalMT >= 1 && (
                      <span className="ml-1 text-xs font-normal text-gray-500">
                        ({totalMT >= 100 ? Math.round(totalMT) : totalMT.toFixed(1)} MT)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-bold tabular-nums">
                    {/* price column intentionally empty in totals row */}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Logistics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Info label={t("public.home.origin", "Origin")}>
              <span className="inline-flex items-center gap-1.5">
                {originCode && <FlagSVG code={originCode} size={14} />}
                {offer.origin_country || "—"}
                {offer.origin_port ? ` · ${offer.origin_port}` : ""}
              </span>
            </Info>
            <Info label={t("public.home.destinations", "Destinations")}>
              {markets.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {markets.map((m, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                      <FlagSVG code={countryToCode(m)} size={11} /> {m}
                    </span>
                  ))}
                </div>
              ) : (
                "—"
              )}
            </Info>
            <Info label={t("public.home.shipment", "Shipment")}>{shipment}</Info>
            <Info label={t("public.home.incoterm", "Incoterm")}>
              {(() => {
                const list = offer.incoterms ?? [];
                if (!list.length) return "—";
                const place = (ic: string): string => {
                  const up = ic.toUpperCase();
                  if (up === "FOB" || up === "EXW") {
                    return offer.origin_port ? ` ${offer.origin_port}` : "";
                  }
                  if (up === "CFR" || up === "CIF" || up === "CNF" || up === "C&F") {
                    if (!markets.length) return "";
                    return markets.length === 1
                      ? ` ${markets[0]}`
                      : ` ${markets[0]} +${markets.length - 1}`;
                  }
                  return "";
                };
                return list.map((ic) => `${ic}${place(ic)}`).join(", ");
              })()}
            </Info>
            <Info label={t("public.home.containerSize", "Container size")}>
              {offer.container_size || "—"}
            </Info>
            <Info label={t("public.home.fclAvailable", "FCL available")}>
              {offer.remaining_fcl != null && offer.total_fcl != null
                ? `${offer.remaining_fcl} / ${offer.total_fcl}`
                : "—"}
            </Info>
          </div>

          {/* Masked supplier */}
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <Factory size={14} strokeWidth={1.75} aria-hidden />
            <span className="font-semibold">{t("public.home.supplier", "Supplier")}:</span>
            <span className="flex-1 italic">
              {t("public.home.hiddenSupplier", "Hidden — reveal to see")}
            </span>
            <Lock size={13} />
          </div>
        </div>

        <DialogFooter className="border-t bg-white px-5 py-3">
          <button
            type="button"
            onClick={onReveal}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#B64769] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
          >
            🔓 {t("public.home.reveal", "Reveal supplier")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </div>
      <div className="mt-1 text-sm text-[#1A1A2E]">{children}</div>
    </div>
  );
}