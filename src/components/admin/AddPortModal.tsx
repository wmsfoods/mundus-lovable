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

export default function AddPortModal({
  open,
  onOpenChange,
  countries,
  onCreate,
  isCreating,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  countries: CountryOpt[];
  onCreate: (input: { name: string; code: string | null; countryId: string }) => Promise<void>;
  isCreating?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [countryId, setCountryId] = useState("");

  const sortedCountries = useMemo(
    () => [...countries].sort((a, b) => pickName(a, locale).localeCompare(pickName(b, locale))),
    [countries, locale],
  );

  const reset = () => { setName(""); setCode(""); setCountryId(""); };

  const submit = async () => {
    if (!name.trim() || !countryId) return;
    try {
      await onCreate({ name: name.trim(), code: code.trim() || null, countryId });
      toast.success(t("admin.marketplace.ports.create.success", { defaultValue: "Port created" }));
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create port");
    }
  };

  const inputStyle: React.CSSProperties = {
    height: 36, padding: "0 10px", border: "1px solid var(--border, #e5e7eb)",
    borderRadius: 8, fontSize: 13, width: "100%",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("admin.marketplace.ports.create.title", { defaultValue: "Add port" })}</DialogTitle>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            <span>{t("admin.marketplace.ports.create.country", { defaultValue: "Country" })}</span>
            <select
              className="crm-select"
              value={countryId}
              onChange={(e) => setCountryId(e.target.value)}
              style={inputStyle}
            >
              <option value="">—</option>
              {sortedCountries.map((c) => (
                <option key={c.id} value={c.id}>
                  {(c.flag_emoji ?? "🏳️") + " " + pickName(c, locale) + (c.iso_code ? ` (${c.iso_code})` : "")}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            <span>{t("admin.marketplace.ports.create.name", { defaultValue: "Port name" })}</span>
            <input
              type="text"
              placeholder={t("admin.marketplace.ports.create.namePlaceholder", { defaultValue: "e.g. Santos" })}
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            <span>{t("admin.marketplace.ports.create.code", { defaultValue: "UN/LOCODE (optional)" })}</span>
            <input
              type="text"
              placeholder="BRSSZ"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={10}
              style={inputStyle}
            />
          </label>
        </div>
        <DialogFooter>
          <button type="button" className="crm-btn-outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", { defaultValue: "Cancel" })}
          </button>
          <button
            type="button"
            className="crm-btn-primary"
            disabled={!name.trim() || !countryId || !!isCreating}
            onClick={submit}
          >
            {isCreating ? "…" : t("admin.marketplace.ports.create.submit", { defaultValue: "Create" })}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}