import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  addProspectsBulk, type AddProspectInput,
  type ProspectRole, type ProspectSource,
} from "@/hooks/useAdminProspects";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

const TEMPLATE = `companyName,country,role,source,contactName,contactEmail,contactPhone,estGmv,notes
Example Co,BR,potential_supplier,linkedin,John Doe,john@example.com,+5511999999999,1500000,Met at trade show
`;

// tiny CSV parser — handles quoted fields with commas/quotes
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0, cur = "", row: string[] = [], inQ = false;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i += 2; continue; }
      if (c === '"') { inQ = false; i++; continue; }
      cur += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ",") { row.push(cur); cur = ""; i++; continue; }
    if (c === "\n" || c === "\r") {
      if (cur !== "" || row.length) { row.push(cur); rows.push(row); row = []; cur = ""; }
      if (c === "\r" && text[i + 1] === "\n") i++;
      i++; continue;
    }
    cur += c; i++;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function validateRow(headers: string[], row: string[]): AddProspectInput | null {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => { obj[h.trim()] = (row[i] ?? "").trim(); });
  if (!obj.companyName || !obj.country || !obj.role || !obj.source || !obj.contactName || !obj.contactEmail) return null;
  return {
    companyName: obj.companyName,
    country: obj.country,
    role: (obj.role as ProspectRole),
    source: (obj.source as ProspectSource),
    contactName: obj.contactName,
    contactEmail: obj.contactEmail,
    contactPhone: obj.contactPhone || undefined,
    estGmv: obj.estGmv ? Number(obj.estGmv) : undefined,
    owner: "FN",
    notes: obj.notes || undefined,
  };
}

export function ImportProspectsModal({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<AddProspectInput[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const reset = () => { setParsed(null); setErr(null); if (inputRef.current) inputRef.current.value = ""; };
  const close = () => { reset(); onOpenChange(false); };

  const handleFile = async (file: File) => {
    setErr(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text).filter((r) => r.length > 1 || (r.length === 1 && r[0].trim() !== ""));
      if (rows.length < 2) throw new Error("Empty");
      const headers = rows[0].map((h) => h.trim());
      const dataRows = rows.slice(1);
      const valid: AddProspectInput[] = [];
      for (let i = 0; i < dataRows.length; i++) {
        const r = validateRow(headers, dataRows[i]);
        if (!r) throw new Error(`Row ${i + 2}: missing required field`);
        valid.push(r);
      }
      setParsed(valid);
    } catch (e) {
      setErr(`${t("admin.crm.import.invalidFormat")}${e instanceof Error && e.message !== "Empty" ? ` — ${e.message}` : ""}`);
      setParsed(null);
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  const onImport = () => {
    if (!parsed) return;
    const n = addProspectsBulk(parsed);
    toast.success(t("admin.crm.toast.imported", { n }));
    close();
  };

  const tplUrl = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv" }));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="crm-dialog">
        <DialogHeader>
          <DialogTitle>{t("admin.crm.import.title")}</DialogTitle>
        </DialogHeader>
        <div className="crm-form">
          {!parsed && (
            <>
              <div
                className={`crm-drop ${drag ? "is-drag" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <Upload size={24} />
                <span>{t("admin.crm.import.dropzone")}</span>
                <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={onFileChange} />
              </div>
              <a href={tplUrl} download="prospects-template.csv" className="adm-link">
                {t("admin.crm.import.template")}
              </a>
              {err && <div className="crm-err">{err}</div>}
            </>
          )}
          {parsed && (
            <>
              <div className="adm-page-subtle" style={{ marginLeft: 0 }}>
                {t("admin.crm.import.preview", { n: Math.min(3, parsed.length), total: parsed.length })}
              </div>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead><tr><th>Company</th><th>Country</th><th>Role</th><th>Contact</th></tr></thead>
                  <tbody>
                    {parsed.slice(0, 3).map((r, i) => (
                      <tr key={i}>
                        <td>{r.companyName}</td>
                        <td>{r.country}</td>
                        <td>{r.role}</td>
                        <td>{r.contactName} · {r.contactEmail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <DialogFooter>
            <button type="button" className="crm-btn-outline" onClick={close}>
              {t("admin.crm.add.cancel")}
            </button>
            {parsed && (
              <button type="button" className="crm-btn-primary" onClick={onImport}>
                {t("admin.crm.import.submit", { n: parsed.length })}
              </button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}