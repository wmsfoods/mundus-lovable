import { useTranslation } from "react-i18next";
import type { RealNegotiationRow } from "@/hooks/useRealNegotiation";
import {
  MAX_DISPLAY_ROUNDS,
  getAgreedItems,
  getMaxRaw,
  getDisplayRound,
} from "@/lib/negotiationEngine";

/** Compact summary card: items agreed + rounds used. */
export function NegotiationProgressCard({ negotiation }: { negotiation: RealNegotiationRow }) {
  const { t } = useTranslation();
  const items = negotiation.offer?.items ?? [];
  const agreedList = getAgreedItems(negotiation);
  const agreedIds = new Set(agreedList.map((a) => a.offer_item_id));
  const agreedCount = items.filter((it) => agreedIds.has(it.id)).length;
  const totalItems = items.length;

  const usedDisplay = Math.min(MAX_DISPLAY_ROUNDS, getDisplayRound(getMaxRaw(negotiation)));
  const roundPct = (usedDisplay / MAX_DISPLAY_ROUNDS) * 100;

  return (
    <div className="rounded-xl border border-border bg-card p-4 mb-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-1">
            <span>{t("engine.progress.itemsAgreed", "Items Agreed")}</span>
            <span className="tabular-nums">
              {agreedCount} {t("engine.progress.of", "of")} {totalItems}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {items.map((it) => {
              const ok = agreedIds.has(it.id);
              return (
                <span
                  key={it.id}
                  title={it.customer_product?.name ?? ""}
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: ok ? "#15803d" : "#cbd5e1" }}
                />
              );
            })}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-1">
            <span>{t("engine.progress.round", "Round")}</span>
            <span className="tabular-nums">
              {usedDisplay} {t("engine.progress.of", "of")} {MAX_DISPLAY_ROUNDS}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full transition-all"
              style={{ width: `${roundPct}%`, background: "#8B2252" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default NegotiationProgressCard;