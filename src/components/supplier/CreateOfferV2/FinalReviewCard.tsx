import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CutRow } from "@/lib/cutRowTypes";

type LogisticsSummary = {
  originLabel: string;
  destCountries: number;
  destPorts: number;
  freightTotal: number;
  incoterms: string[];
  insuranceTotal: number;
  exwPickup: string;
};

type DistributionSummary = {
  marketplace: boolean;
  allCustomers: boolean;
  specificCount: number;
};

type Props = {
  completion: number;
  logistics: LogisticsSummary;
  cuts: CutRow[];
  capacityPct: number;
  paymentTerms: string;
  distribution: DistributionSummary;
  onEditLogistics: () => void;
  onEditCuts: () => void;
  onEditPayment: () => void;
  onEditDistribution: () => void;
};

export function FinalReviewCard({
  completion,
  logistics,
  cuts,
  capacityPct,
  paymentTerms,
  distribution,
  onEditLogistics,
  onEditCuts,
  onEditPayment,
  onEditDistribution,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const tk = (k: string, fb: string, opts?: Record<string, unknown>) =>
    t(`supplier.createOfferV2.review.${k}`, { defaultValue: fb, ...(opts ?? {}) }) as string;

  const totalQty = cuts.reduce((a, c) => a + (c.qty || 0), 0);
  const totalValue = cuts.reduce((a, c) => a + (c.qty || 0) * (c.askPrice || 0), 0);

  const distLabels: string[] = [];
  if (distribution.marketplace) distLabels.push(tk("distMarketplace", "Marketplace"));
  if (distribution.allCustomers) distLabels.push(tk("distAll", "All customers"));
  if (distribution.specificCount > 0)
    distLabels.push(tk("distSpecific", "{{n}} specific", { n: distribution.specificCount }));

  return (
    <section className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">
            {tk("title", "Review before publish")}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              completion >= 100 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800",
            )}
          >
            {completion}%
          </span>
        </div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
          <ReviewBlock
            title={tk("logisticsTitle", "Logistics")}
            onEdit={onEditLogistics}
            editLabel={tk("edit", "Edit")}
            rows={[
              [tk("from", "From"), logistics.originLabel || "—"],
              [
                tk("to", "To"),
                logistics.destCountries > 0
                  ? tk("toValue", "{{c}} countries · {{p}} ports", {
                      c: logistics.destCountries,
                      p: logistics.destPorts,
                    })
                  : "—",
              ],
              [tk("incoterm", "Incoterm"), logistics.incoterms.join(" · ") || "—"],
              [
                tk("freight", "Freight"),
                logistics.freightTotal > 0
                  ? `US$ ${logistics.freightTotal.toLocaleString()}`
                  : "—",
              ],
              ...(logistics.incoterms.includes("CIF")
                ? ([
                    [
                      tk("totalInsurance", "Total insurance"),
                      logistics.insuranceTotal > 0
                        ? `US$ ${logistics.insuranceTotal.toLocaleString()}`
                        : "—",
                    ],
                  ] as [string, string][])
                : []),
              ...(logistics.incoterms.includes("EXW")
                ? ([[tk("pickup", "Pickup"), logistics.exwPickup || "—"]] as [string, string][])
                : []),
            ]}
          />
          <ReviewBlock
            title={tk("cutsTitle", "Cuts")}
            onEdit={onEditCuts}
            editLabel={tk("edit", "Edit")}
            rows={[
              [tk("count", "Items"), String(cuts.length)],
              [tk("totalQty", "Total quantity"), totalQty > 0 ? `${totalQty.toLocaleString()} kg` : "—"],
              [
                tk("grossValue", "Gross value"),
                totalValue > 0 ? `US$ ${Math.round(totalValue).toLocaleString()}` : "—",
              ],
              [tk("capacity", "Capacity"), `${capacityPct.toFixed(0)}%`],
            ]}
          />
          <ReviewBlock
            title={tk("paymentTitle", "Payment terms")}
            onEdit={onEditPayment}
            editLabel={tk("edit", "Edit")}
            rows={[[tk("term", "Term"), paymentTerms || "—"]]}
          />
          <ReviewBlock
            title={tk("distributionTitle", "Distribution")}
            onEdit={onEditDistribution}
            editLabel={tk("edit", "Edit")}
            rows={[[tk("channels", "Channels"), distLabels.join(" · ") || "—"]]}
          />
        </div>
      )}
    </section>
  );
}

function ReviewBlock({
  title,
  rows,
  onEdit,
  editLabel,
}: {
  title: string;
  rows: [string, string][];
  onEdit: () => void;
  editLabel: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 rounded text-[11px] font-medium text-primary hover:underline"
        >
          <Pencil size={10} /> {editLabel}
        </button>
      </div>
      <dl className="flex flex-col gap-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-xs">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}