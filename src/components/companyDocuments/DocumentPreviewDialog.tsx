import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getSignedDocumentUrl, type CompanyDocument } from "@/hooks/useCompanyDocuments";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";

export function DocumentPreviewDialog({
  doc, onClose,
}: { doc: CompanyDocument | null; onClose: () => void }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!doc) { setUrl(null); return; }
    setLoading(true);
    getSignedDocumentUrl(doc.id)
      .then(setUrl)
      .catch((e) => toast.error(e?.message || "Failed to load preview"))
      .finally(() => setLoading(false));
  }, [doc]);

  const handleDownload = async () => {
    if (!doc) return;
    try {
      const u = await getSignedDocumentUrl(doc.id, { download: true });
      window.open(u, "_blank");
    } catch (e: any) {
      toast.error(e?.message || "Download failed");
    }
  };

  const isImage = doc?.file_type?.startsWith("image/");
  const isPdf = doc?.file_type?.includes("pdf");

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-8">
            <DialogTitle className="truncate">{doc?.title}</DialogTitle>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4" /> {t("companyDocuments.actions.download", "Download")}
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 bg-muted/30 rounded-md overflow-hidden flex items-center justify-center">
          {loading || !url ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : isImage ? (
            <img src={url} alt={doc?.title || ""} className="max-h-full max-w-full object-contain" />
          ) : isPdf ? (
            <iframe src={url} className="w-full h-full" title={doc?.title || "preview"} />
          ) : (
            <a href={url} target="_blank" rel="noreferrer" className="text-sm underline">{t("companyDocuments.actions.openFile", "Open file")}</a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}