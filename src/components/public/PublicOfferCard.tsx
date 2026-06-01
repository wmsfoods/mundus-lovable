import { useTranslation } from "react-i18next";
import type { PublicOffer } from "@/hooks/usePublicOffers";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function PublicOfferCard({
  offer,
  onReveal,
}: {
  offer: PublicOffer;
  onReveal: () => void;
}) {
  const { t } = useTranslation();
  const firstItem = offer.items[0];
  const minPrice = offer.items.reduce(
    (m, it) => (it.price && (m === 0 || it.price < m) ? it.price : m),
    0,
  );

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wider text-[#A74764]">
          M-{String(offer.offer_number).padStart(5, "0")}
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] uppercase text-gray-600">
          {offer.remaining_fcl}/{offer.total_fcl} FCL
        </span>
      </div>

      <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">
        {firstItem?.category_name || firstItem?.category_code || t("public.home.product", "Product")}
      </div>
      <div className="mb-3 line-clamp-2 text-base font-semibold text-[#1A1A2E]">
        {firstItem?.product_name || "—"}
        {offer.items.length > 1 ? (
          <span className="ml-1 text-xs font-normal text-gray-500">+{offer.items.length - 1}</span>
        ) : null}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-gray-700">
        <div>
          <div className="text-gray-400">{t("public.home.origin", "Origin")}</div>
          <div className="font-medium">{offer.origin_country || "—"}</div>
        </div>
        <div>
          <div className="text-gray-400">{t("public.home.destinations", "Destinations")}</div>
          <div className="line-clamp-1 font-medium">
            {offer.markets.map((m) => m.country).filter(Boolean).join(", ") || "—"}
          </div>
        </div>
        <div>
          <div className="text-gray-400">{t("public.home.shipment", "Shipment")}</div>
          <div className="font-medium">
            {MONTHS[(offer.shipment_month || 1) - 1]} {offer.shipment_year}
          </div>
        </div>
        <div>
          <div className="text-gray-400">{t("public.home.incoterm", "Incoterm")}</div>
          <div className="font-medium">{offer.incoterms.join("/") || "—"}</div>
        </div>
      </div>

      <div className="mb-3 flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray-400">
            {t("public.home.from", "From")}
          </div>
          <div className="text-xl font-bold text-[#8B2252]">
            US$ {minPrice.toFixed(2)}
            <span className="text-xs font-medium text-gray-500"> /kg</span>
          </div>
        </div>
        <div className="flex gap-1">
          {offer.is_halal && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">HALAL</span>}
          {offer.is_kosher && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">KOSHER</span>}
        </div>
      </div>

      <div className="mb-3 rounded-md bg-gray-50 px-3 py-2 text-[11px] text-gray-600">
        <span>
          <span className="text-gray-400">{t("public.home.supplier", "Supplier")}:</span>{" "}
          <span className="italic">{t("public.home.hiddenSupplier", "Hidden — reveal to see")}</span>
        </span>
      </div>

      <button
        onClick={onReveal}
        className="mt-auto w-full rounded-md bg-[#B64769] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
      >
        {t("public.home.reveal", "Reveal supplier")}
      </button>
    </div>
  );
}