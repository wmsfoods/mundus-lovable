import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  addProspect,
  type ProspectRole, type ProspectSource,
} from "@/hooks/useAdminProspects";
import { useMundusTeam } from "@/hooks/useMundusTeam";
import { ScanCardButton } from "./ScanCardButton";

const COUNTRIES = [
  "BR","AR","UY","PY","CL","PE","CO","MX","EC","US","CA",
  "CN","HK","JP","KR","VN","PH","MY","TH","ID","SG","IN",
  "SA","AE","EG","MA","ZA","GH","CI","DE","FR","ES","IT","UK","NL","PL",
];

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  brazil: "BR", argentina: "AR", uruguay: "UY", paraguay: "PY", chile: "CL", peru: "PE",
  colombia: "CO", mexico: "MX", ecuador: "EC", "united states": "US", usa: "US", "u.s.a.": "US",
  "united states of america": "US", canada: "CA", china: "CN", "hong kong": "HK", japan: "JP",
  "south korea": "KR", korea: "KR", vietnam: "VN", philippines: "PH", malaysia: "MY",
  thailand: "TH", indonesia: "ID", singapore: "SG", india: "IN", "saudi arabia": "SA",
  "united arab emirates": "AE", uae: "AE", egypt: "EG", morocco: "MA", "south africa": "ZA",
  ghana: "GH", "ivory coast": "CI", germany: "DE", france: "FR", spain: "ES", italy: "IT",
  "united kingdom": "UK", uk: "UK", "great britain": "UK", netherlands: "NL", poland: "PL",
};

const SOURCES: ProspectSource[] = ["linkedin", "trade_show", "referral", "web_scrape", "apollo", "manual", "inbound", "wms_import"];

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export function AddProspectModal({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { team: mundusTeam } = useMundusTeam();
  const [form, setForm] = useState({
    companyName: "", country: "BR", role: "potential_supplier" as ProspectRole,
    source: "wms_import" as ProspectSource, contactName: "", contactEmail: "",
    contactPhone: "", estGmv: "", owner: "", notes: "",
  });
  const [err, setErr] = useState<string | null>(null);

  const update = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim() || !form.contactName.trim() || !form.contactEmail.trim()) {
      setErr("Please fill all required fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
      setErr("Invalid email format.");
      return;
    }
    const p = addProspect({
      companyName: form.companyName.trim(),
      country: form.country,
      role: form.role,
      source: form.source,
      contactName: form.contactName.trim(),
      contactEmail: form.contactEmail.trim(),
      contactPhone: form.contactPhone.trim() || undefined,
      estGmv: form.estGmv ? Number(form.estGmv) : undefined,
      owner: form.owner,
      notes: form.notes.trim() || undefined,
    });
    toast.success(t("admin.crm.toast.added", { company: p.companyName }));
    onOpenChange(false);
    nav(`/admin/crm/prospects/${p.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="crm-dialog">
        <DialogHeader>
          <DialogTitle>{t("admin.crm.add.title")}</DialogTitle>
        </DialogHeader>
        <form className="crm-form" onSubmit={onSubmit}>
          <ScanCardButton
            onScanned={(d) => {
              setForm((f) => {
                const next = { ...f };
                if (d.company) next.companyName = d.company;
                if (d.fullName) next.contactName = d.fullName;
                if (d.email) next.contactEmail = d.email;
                if (d.phone || d.mobile) next.contactPhone = d.phone || d.mobile || "";
                if (d.country) {
                  const code = COUNTRY_NAME_TO_CODE[d.country.toLowerCase().trim()];
                  if (code) next.country = code;
                }
                const noteBits: string[] = [];
                if (d.jobTitle) noteBits.push(`Job title: ${d.jobTitle}`);
                if (d.linkedin) noteBits.push(`LinkedIn: ${d.linkedin}`);
                if (d.website) noteBits.push(`Website: ${d.website}`);
                if (d.address) noteBits.push(`Address: ${d.address}`);
                if (noteBits.length) {
                  next.notes = [f.notes, noteBits.join(" · ")].filter(Boolean).join("\n");
                }
                return next;
              });
            }}
          />
          <label className="crm-field">
            <span>{t("admin.crm.add.companyName")} *</span>
            <input value={form.companyName} onChange={(e) => update("companyName", e.target.value)} required />
          </label>
          <div className="crm-form-row">
            <label className="crm-field">
              <span>{t("admin.crm.add.country")} *</span>
              <select value={form.country} onChange={(e) => update("country", e.target.value)}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="crm-field">
              <span>{t("admin.crm.add.owner")} *</span>
              <select value={form.owner} onChange={(e) => update("owner", e.target.value)}>
                <option value="" disabled>{t("admin.crm.add.owner")}</option>
                {mundusTeam.map((o) => <option key={o.id} value={o.initials}>{o.initials} — {o.name}</option>)}
              </select>
            </label>
          </div>
          <div className="crm-form-row">
            <label className="crm-field">
              <span>{t("admin.crm.add.role")} *</span>
              <select value={form.role} onChange={(e) => update("role", e.target.value as ProspectRole)}>
                <option value="potential_supplier">{t("admin.crm.roles.potential_supplier")}</option>
                <option value="potential_buyer">{t("admin.crm.roles.potential_buyer")}</option>
              </select>
            </label>
            <label className="crm-field">
              <span>{t("admin.crm.add.source")} *</span>
              <select value={form.source} onChange={(e) => update("source", e.target.value as ProspectSource)}>
                {SOURCES.map((s) => <option key={s} value={s}>{t(`admin.crm.sources.${s}`)}</option>)}
              </select>
            </label>
          </div>
          <div className="crm-form-row">
            <label className="crm-field">
              <span>{t("admin.crm.add.contactName")} *</span>
              <input value={form.contactName} onChange={(e) => update("contactName", e.target.value)} required />
            </label>
            <label className="crm-field">
              <span>{t("admin.crm.add.contactEmail")} *</span>
              <input type="email" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} required />
            </label>
          </div>
          <div className="crm-form-row">
            <label className="crm-field">
              <span>{t("admin.crm.add.contactPhone")}</span>
              <input value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} />
            </label>
            <label className="crm-field">
              <span>{t("admin.crm.add.estGmv")}</span>
              <input type="number" min="0" value={form.estGmv} onChange={(e) => update("estGmv", e.target.value)} />
            </label>
          </div>
          <label className="crm-field">
            <span>{t("admin.crm.add.notes")}</span>
            <textarea rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </label>
          {err && <div className="crm-err">{err}</div>}
          <DialogFooter>
            <button type="button" className="crm-btn-outline" onClick={() => onOpenChange(false)}>
              {t("admin.crm.add.cancel")}
            </button>
            <button type="submit" className="crm-btn-primary">{t("admin.crm.add.submit")}</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}