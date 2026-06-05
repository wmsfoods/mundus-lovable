import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Send, Store, Users, Target, Search } from "lucide-react";
import { useMyCustomers } from "@/hooks/useMyCustomers";
import { countryFlag } from "@/lib/countryFlags";
import { cn } from "@/lib/utils";

export type DistributionValue = {
  marketplace: boolean;
  allCustomers: boolean;
  specificCustomerIds: string[];
};

type Props = {
  value: DistributionValue;
  onChange: (v: DistributionValue) => void;
};

export function DistributionCard({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { customers, loading } = useMyCustomers({ status: "accepted" });
  const [search, setSearch] = useState("");
  const [showSpecific, setShowSpecific] = useState(value.specificCustomerIds.length > 0);

  const tk = (k: string, fb: string, opts?: Record<string, unknown>) =>
    t(`supplier.createOfferV2.distribution.${k}`, { defaultValue: fb, ...(opts ?? {}) }) as string;

  const eligible = useMemo(
    () => customers.filter((c) => !!c.buyer_company_id),
    [customers],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter((c) =>
      `${c.company_name} ${c.country ?? ""} ${c.contact_name ?? ""}`.toLowerCase().includes(q),
    );
  }, [eligible, search]);

  const setMarketplace = (b: boolean) => onChange({ ...value, marketplace: b });
  const setAll = (b: boolean) => onChange({ ...value, allCustomers: b });
  const setSpecific = (b: boolean) => {
    setShowSpecific(b);
    if (!b) onChange({ ...value, specificCustomerIds: [] });
  };

  const toggleCustomer = (id: string) => {
    const has = value.specificCustomerIds.includes(id);
    onChange({
      ...value,
      specificCustomerIds: has
        ? value.specificCustomerIds.filter((x) => x !== id)
        : [...value.specificCustomerIds, id],
    });
  };

  const selectAll = () =>
    onChange({ ...value, specificCustomerIds: filtered.map((c) => c.buyer_company_id as string) });
  const clearAll = () => onChange({ ...value, specificCustomerIds: [] });

  const specificOk = !showSpecific || value.specificCustomerIds.length > 0;
  const anySelected =
    value.marketplace || value.allCustomers || value.specificCustomerIds.length > 0;

  const hint = !anySelected
    ? tk("hintNone", "Select at least one distribution option to publish.")
    : showSpecific && value.specificCustomerIds.length === 0
      ? tk("hintPickCustomers", "Pick at least one customer or turn Specific off.")
      : buildSummary(value, eligible.length, tk);

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <header className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Send size={14} />
        </span>
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-foreground">
            {tk("title", "Distribution")}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {tk("subtitle", "Where this offer will be shown — combine freely")}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-2">
        <OptionRow
          icon={<Store size={14} />}
          checked={value.marketplace}
          onToggle={setMarketplace}
          title={tk("marketplaceLabel", "Marketplace")}
          desc={tk("marketplaceDesc", "Visible to all buyers on the platform.")}
        />
        <OptionRow
          icon={<Users size={14} />}
          checked={value.allCustomers}
          onToggle={setAll}
          title={tk("allLabel", "All my customers")}
          desc={tk("allDesc", "Notify every connected customer (accepted SCL links).")}
        />
        <OptionRow
          icon={<Target size={14} />}
          checked={showSpecific}
          onToggle={setSpecific}
          title={tk("specificLabel", "Specific customers")}
          desc={tk("specificDesc", "Send only to the customers you pick.")}
        />

        {showSpecific && (
          <div className="mt-1 rounded-lg border border-border bg-muted/20 p-3">
            {loading ? (
              <p className="text-xs text-muted-foreground">{tk("loading", "Loading customers…")}</p>
            ) : eligible.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {tk(
                  "emptyCustomers",
                  "You don't have any connected customers yet. Connect via My Customers → Invite Customer.",
                )}
              </p>
            ) : (
              <>
                <div className="mb-2 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={tk("searchPlaceholder", "Search customers…")}
                      className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-xs"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {tk("countSummary", "{{n}} selected of {{t}}", {
                      n: value.specificCustomerIds.length,
                      t: eligible.length,
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="rounded border border-border bg-card px-2 py-1 text-[11px] hover:bg-muted/60"
                  >
                    {tk("selectAll", "Select all")}
                  </button>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="rounded border border-border bg-card px-2 py-1 text-[11px] hover:bg-muted/60"
                  >
                    {tk("clear", "Clear")}
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto pr-1">
                  {filtered.length === 0 && (
                    <p className="px-1 py-2 text-xs text-muted-foreground">
                      {tk("noMatch", "No customers match your search.")}
                    </p>
                  )}
                  {filtered.map((c) => {
                    const id = c.buyer_company_id as string;
                    const on = value.specificCustomerIds.includes(id);
                    return (
                      <label
                        key={id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs",
                          on ? "bg-primary/10" : "hover:bg-muted/50",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleCustomer(id)}
                          className="h-3.5 w-3.5"
                        />
                        <span className="text-base leading-none">{countryFlag(c.country)}</span>
                        <span className="flex-1 truncate font-medium text-foreground">
                          {c.company_name}
                        </span>
                        {c.contact_name && (
                          <span className="truncate text-[10px] text-muted-foreground">
                            {c.contact_name}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <p
        className={cn(
          "mt-3 text-[11px]",
          !anySelected || !specificOk
            ? "text-amber-600 dark:text-amber-400"
            : "text-muted-foreground",
        )}
      >
        {hint}
      </p>
    </section>
  );
}

function OptionRow({
  icon,
  checked,
  onToggle,
  title,
  desc,
}: {
  icon: React.ReactNode;
  checked: boolean;
  onToggle: (b: boolean) => void;
  title: string;
  desc: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
        checked ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
        className="mt-1 h-4 w-4"
      />
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-[11px] text-muted-foreground">{desc}</span>
      </span>
    </label>
  );
}

function buildSummary(
  v: DistributionValue,
  totalCustomers: number,
  tk: (k: string, fb: string, opts?: Record<string, unknown>) => string,
): string {
  const bits: string[] = [];
  if (v.marketplace) bits.push(tk("sumMarketplace", "Marketplace"));
  if (v.allCustomers)
    bits.push(tk("sumAll", "All customers ({{n}})", { n: totalCustomers }));
  if (v.specificCustomerIds.length > 0)
    bits.push(tk("sumSpecific", "{{n}} specific", { n: v.specificCustomerIds.length }));
  return tk("sumPrefix", "Publishing to: ") + bits.join(" · ");
}