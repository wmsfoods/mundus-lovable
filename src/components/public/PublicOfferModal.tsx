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
import { formatIncotermWithPlace } from "@/lib/incotermPricing";
import type { PublicOffer } from "@/hooks/usePublicOffers";
import { formatShipmentReadyDisplay } from "@/lib/shipmentReady";
import { formatCutMetaFromOfferItem } from "@/lib/cutMetaDisplay";

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

  const shipment = formatShipmentReadyDisplay({ raw: (offer as any).shipment_ready_raw, month: offer.shipment_month, year: offer.shipment_year });

  return (
    <Dialog open={!!offer} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 gap-0 max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:border-0 max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-w-full max-sm:w-full max-sm:h-[92vh] max-sm:max-h-[92vh] max-sm:flex max-sm:flex-col sm:max-w-2xl sm:max-h-[90vh] sm:flex sm:flex-col"
      >
        {/* Header */}
        <DialogHeader className="border-b px-5 py-4 shrink-0 max-sm:pt-5">
          <div className="sm:hidden mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300" />
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

        <div className="px-5 py-4 space-y-5 overflow-y-auto flex-1 overscroll-contain">
          {/* Cuts table */}
          <div className="overflow-hidden rounded-lg border border-gray-200 max-sm:hidden">
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
                      {(() => {
                        const meta = formatCutMetaFromOfferItem(it, t);
                        return meta.length > 0 ? (
                          <div className="text-[11px] text-muted-foreground mt-0.5">{meta.join(" · ")}</div>
                        ) : null;
                      })()}
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

          {/* Mobile cuts list */}
          <div className="sm:hidden space-y-2">
            {items.map((it) => (
              <div key={it.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#1A1A2E] text-sm">{it.product_name || it.category_name || "—"}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{it.category_name || it.category_code || "—"}</div>
                    {(() => {
                      const meta = formatCutMetaFromOfferItem(it, t);
                      return meta.length > 0 ? (
                        <div className="text-[11px] text-muted-foreground mt-0.5">{meta.join(" · ")}</div>
                      ) : null;
                    })()}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold tabular-nums text-[#1A1A2E]">{fmtPrice(Number(it.price ?? 0))}</div>
                    <div className="text-xs text-gray-500 tabular-nums mt-0.5">{fmtKg(Number(it.amount ?? 0))} kg</div>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {t("public.home.totalWeight", "Total weight")}
              </span>
              <span className="text-sm font-bold tabular-nums text-[#1A1A2E]">
                {fmtKg(totalKg)} kg
                {totalMT >= 1 && (
                  <span className="ml-1 text-xs font-normal text-gray-500">
                    ({totalMT >= 100 ? Math.round(totalMT) : totalMT.toFixed(1)} MT)
                  </span>
                )}
              </span>
            </div>
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
                return list
                  .map((ic) =>
                    formatIncotermWithPlace(ic, {
                      originPort: offer.origin_port,
                      destinationNames: markets,
                    }),
                  )
                  .join(", ");
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

        <DialogFooter
          className="border-t bg-white px-5 py-3 shrink-0"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
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