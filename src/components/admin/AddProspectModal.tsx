import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  addProspect, OWNERS,
  type ProspectRole, type ProspectSource,
} from "@/hooks/useAdminProspects";

const COUNTRIES = [
  "BR","AR","UY","PY","CL","PE","CO","MX","EC","US","CA",
  "CN","HK","JP","KR","VN","PH","MY","TH","ID","SG","IN",
  "SA","AE","EG","MA","ZA","GH","CI","DE","FR","ES","IT","UK","NL","PL",
];

const SOURCES: ProspectSource[] = ["linkedin", "trade_show", "referral", "web_scrape", "apollo", "manual", "inbound"];

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export function AddProspectModal({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [form, setForm] = useState({
    companyName: "", country: "BR", role: "potential_supplier" as ProspectRole,
    source: "linkedin" as ProspectSource, contactName: "", contactEmail: "",
    contactPhone: "", estGmv: "", owner: "FN", notes: "",
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
                {OWNERS.map((o) => <option key={o.initials} value={o.initials}>{o.initials} — {o.name}</option>)}
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