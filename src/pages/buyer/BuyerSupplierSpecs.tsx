import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyDocuments, type CompanyDocument } from "@/hooks/useCompanyDocuments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExpiryBadge } from "@/components/companyDocuments/ExpiryBadge";
import { DocumentPreviewDialog } from "@/components/companyDocuments/DocumentPreviewDialog";
import { formatBytes, fileTypeLabel, daysUntil } from "@/components/companyDocuments/types";
import { getSignedDocumentUrl } from "@/hooks/useCompanyDocuments";
import { ArrowLeft, Download, Eye, FileText, Image as ImageIcon, Lock, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function BuyerSupplierSpecs() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const { data: company } = useQuery({
    queryKey: ["buyer-supplier-spec-header", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, country, city, logo_url, rating, is_verified")
        .eq("id", companyId!).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: dealsCount = 0 } = useQuery({
    queryKey: ["buyer-supplier-deals-count", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      // Count orders linked via offers.supplier_id
      const { data: offerIds } = await (supabase as any)
        .from("offers").select("id").eq("supplier_id", companyId);
      const ids = (offerIds || []).map((o: any) => o.id);
      if (!ids.length) return 0;
      const { count } = await (supabase as any)
        .from("orders").select("id", { count: "exact", head: true }).in("offer_id", ids);
      return count ?? 0;
    },
  });

  const { data: docs = [], isLoading } = useCompanyDocuments(companyId, { onlyPublished: true });
  const [preview, setPreview] = useState<CompanyDocument | null>(null);

  const validCertChips = useMemo(() => {
    const valid = docs.filter((d) => d.category === "certification" && (() => {
      const dd = daysUntil(d.expires_at);
      return dd === null || dd >= 0;
    })());
    const set = new Set<string>();
    for (const c of valid) if (c.cert_type) set.add(c.cert_type);
    return Array.from(set);
  }, [docs]);

  const sections: { key: CompanyDocument["category"]; tKey: string; fallback: string }[] = [
    { key: "company_doc", tKey: "companyDocuments.tabs.company_doc", fallback: "Company Documents" },
    { key: "certification", tKey: "companyDocuments.tabs.certification", fallback: "Certifications" },
    { key: "product_spec", tKey: "companyDocuments.tabs.product_spec", fallback: "Product Specs" },
  ];

  const handleDownload = async (d: CompanyDocument) => {
    try { const u = await getSignedDocumentUrl(d.id, { download: true }); window.open(u, "_blank"); }
    catch (e: any) { toast.error(e?.message || "Download failed"); }
  };

  const isImage = (ft?: string | null) => !!ft && ft.startsWith("image/");

  return (
    <div className="min-h-screen bg-[#F5EFE9]">
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
        <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> {t("common.back", "Back")}
        </button>

        <div className="rounded-2xl border bg-card p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-sm">
          <div className="h-16 w-16 rounded-xl bg-[#B64769] text-white flex items-center justify-center font-semibold text-xl shrink-0 overflow-hidden">
            {company?.logo_url ? <img src={company.logo_url} alt={company?.name || ""} className="w-full h-full object-cover" /> : initials(company?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold truncate">{company?.name || "—"}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-muted-foreground">
              <span>{[company?.city, company?.country].filter(Boolean).join(", ") || "—"}</span>
              {company?.rating != null && <><span className="text-muted-foreground/60">·</span><span>★ {Number(company.rating).toFixed(1)}</span></>}
              {dealsCount > 0 && <><span className="text-muted-foreground/60">·</span><span>{dealsCount} {t("companyDocuments.buyer.deals", "deals")}</span></>}
              {company?.is_verified && (
                <Badge className="ml-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 font-normal">
                  <ShieldCheck className="h-3 w-3 mr-1" /> {t("companyDocuments.buyer.verified", "Verified")}
                </Badge>
              )}
              {validCertChips.map((c) => (
                <Badge key={c} className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-transparent font-normal">{c}</Badge>
              ))}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-semibold leading-none">{docs.length}</div>
            <div className="text-xs text-muted-foreground mt-1">{t("companyDocuments.buyer.publishedCount", "published documents")}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>{t("companyDocuments.buyer.info", "Documents shared by the supplier. Downloads use secure, time-limited links.")}</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : sections.map((s) => {
          const list = docs.filter((d) => d.category === s.key);
          return (
            <section key={s.key} className="space-y-2.5">
              <h2 className="text-base font-semibold flex items-baseline gap-2 px-1">
                {t(s.tKey, s.fallback)}
                <span className="text-sm font-normal text-muted-foreground">{list.length}</span>
              </h2>
              {list.length === 0 ? (
                <div className="text-xs text-muted-foreground border border-dashed rounded-xl p-4 bg-card">
                  {t("companyDocuments.buyer.emptySection", "No documents in this section yet.")}
                </div>
              ) : (
                <div className="rounded-2xl border bg-card divide-y overflow-hidden">
                  {list.map((d) => {
                    const dateStr = new Date(d.created_at).toLocaleDateString(i18n.language || undefined, { year: "numeric", month: "short", day: "2-digit" });
                    const metaText = [fileTypeLabel(d.file_type), formatBytes(d.file_size_bytes), dateStr].filter(Boolean).join(" · ");
                    return (
                      <div key={d.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                        <div className="h-11 w-11 rounded-lg bg-[#B64769]/10 text-[#B64769] flex items-center justify-center shrink-0">
                          {isImage(d.file_type) ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{d.title}</div>
                          {d.description && <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{d.description}</div>}
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {d.category === "certification" && d.cert_type && (
                              <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-transparent font-normal">{d.cert_type}</Badge>
                            )}
                            {d.category === "certification" && <ExpiryBadge expiresAt={d.expires_at} />}
                            {d.category === "product_spec" && d.product_category && (
                              <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-transparent font-normal">{d.product_category}</Badge>
                            )}
                            {d.category === "product_spec" && d.meat_cut && (
                              <Badge variant="secondary" className="font-normal">{d.meat_cut}</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">{metaText}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => setPreview(d)} className="h-9 text-muted-foreground hover:text-foreground">
                            <Eye className="h-4 w-4 mr-1.5" /> {t("companyDocuments.actions.preview", "Preview")}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDownload(d)} className="h-9 text-muted-foreground hover:text-foreground">
                            <Download className="h-4 w-4 mr-1.5" /> {t("companyDocuments.actions.download", "Download")}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        <DocumentPreviewDialog doc={preview} onClose={() => setPreview(null)} />
      </div>
    </div>
  );
}