import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type CountryOpt = {
  id: string;
  english_name: string;
  portuguese_name: string;
  spanish_name: string;
  iso_code: string | null;
  flag_emoji: string | null;
};

function pickName(c: CountryOpt, locale: string) {
  const lang = (locale || "en").slice(0, 2);
  if (lang === "pt") return c.portuguese_name;
  if (lang === "es") return c.spanish_name;
  return c.english_name;
}

export default function AddMarketModal({
  open,
  onOpenChange,
  countries,
  onCreate,
  isCreating,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Countries that do NOT yet have a market */
  countries: CountryOpt[];
  onCreate: (countryId: string) => Promise<void>;
  isCreating?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const [countryId, setCountryId] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...countries].sort((a, b) => pickName(a, locale).localeCompare(pickName(b, locale)));
    if (!q) return sorted;
    return sorted.filter(
      (c) =>
        pickName(c, locale).toLowerCase().includes(q) ||
        c.english_name.toLowerCase().includes(q) ||
        (c.iso_code ?? "").toLowerCase().includes(q),
    );
  }, [countries, search, locale]);

  const submit = async () => {
    if (!countryId) return;
    try {
      await onCreate(countryId);
      toast.success(t("admin.marketplace.markets.create.success", { defaultValue: "Market created" }));
      setCountryId("");
      setSearch("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create market");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setCountryId(""); setSearch(""); } onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("admin.marketplace.markets.create.title", { defaultValue: "Add market" })}</DialogTitle>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="text"
            placeholder={t("admin.marketplace.markets.create.searchPlaceholder", { defaultValue: "Search country…" })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ height: 36, padding: "0 10px", border: "1px solid var(--border, #e5e7eb)", borderRadius: 8, fontSize: 13 }}
          />
          {countries.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--fg-muted, #6b7280)", margin: 0 }}>
              {t("admin.marketplace.markets.create.noneAvailable", { defaultValue: "All countries already have a market." })}
            </p>
          ) : (
            <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid var(--border, #e5e7eb)", borderRadius: 8 }}>
              {filtered.map((c) => {
                const sel = countryId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCountryId(c.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%",
                      padding: "8px 12px", background: sel ? "#FEF3C7" : "transparent",
                      border: 0, borderBottom: "1px solid #f3f4f6", textAlign: "left", cursor: "pointer", fontSize: 13,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{c.flag_emoji ?? "🏳️"}</span>
                    <span style={{ flex: 1 }}>{pickName(c, locale)}</span>
                    <span style={{ fontSize: 11, color: "var(--fg-muted, #6b7280)" }}>{c.iso_code ?? ""}</span>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ padding: 12, fontSize: 12, color: "var(--fg-muted, #6b7280)" }}>—</div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <button type="button" className="crm-btn-outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", { defaultValue: "Cancel" })}
          </button>
          <button
            type="button"
            className="crm-btn-primary"
            disabled={!countryId || !!isCreating}
            onClick={submit}
          >
            {isCreating ? "…" : t("admin.marketplace.markets.create.submit", { defaultValue: "Create" })}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}