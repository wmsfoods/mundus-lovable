import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Copy, Check, FileText, FileSpreadsheet, FileType2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildSampleMarkdown,
  SAMPLE_BRAND,
  SAMPLE_CERTIFICATIONS,
  SAMPLE_CONTAINER,
  SAMPLE_DESTINATIONS,
  SAMPLE_DISTRIBUTION,
  SAMPLE_INCOTERMS,
  SAMPLE_ITEMS,
  SAMPLE_NOTES,
  SAMPLE_ORIGIN_COUNTRY,
  SAMPLE_ORIGIN_PORT,
  SAMPLE_PAYMENT,
  SAMPLE_PRIMARY_PRICING,
  SAMPLE_SHIPMENT,
  SAMPLE_SUPPLIER,
  SAMPLE_TEMPERATURE,
} from "./aiQuickfillSampleData";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadXlsx() {
  const XLSX = await import("xlsx");

  const detailsRows: (string | number)[][] = [
    ["Field", "Value"],
    ["Supplier", SAMPLE_SUPPLIER],
    ["Brand", SAMPLE_BRAND],
    ["Container", SAMPLE_CONTAINER],
    ["Temperature", SAMPLE_TEMPERATURE],
    ["Certifications", SAMPLE_CERTIFICATIONS],
    ["Origin Country", SAMPLE_ORIGIN_COUNTRY],
    ["Origin Port", SAMPLE_ORIGIN_PORT],
    ["Shipment", SAMPLE_SHIPMENT],
    ["Payment", SAMPLE_PAYMENT],
    ["Incoterms", SAMPLE_INCOTERMS],
    ["Primary Pricing", SAMPLE_PRIMARY_PRICING],
    ["Distribution", SAMPLE_DISTRIBUTION],
    ["Notes", SAMPLE_NOTES],
  ];
  const sheetDetails = XLSX.utils.aoa_to_sheet(detailsRows);
  sheetDetails["!cols"] = [{ wch: 20 }, { wch: 60 }];

  const itemRows: (string | number)[][] = [
    ["Product", "Plant", "Spec", "Marbling", "Qty (kg)", "Min Qty", "Max Qty", "Price USD/mt", "Floor USD/mt"],
    ...SAMPLE_ITEMS.map((it) => [
      it.product, it.plant, it.spec, it.marbling,
      it.qtyKg, it.minQtyKg, it.maxQtyKg, it.priceUsdPerMt, it.floorUsdPerMt,
    ]),
  ];
  const sheetItems = XLSX.utils.aoa_to_sheet(itemRows);
  sheetItems["!cols"] = [
    { wch: 18 }, { wch: 8 }, { wch: 12 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
  ];

  const destRows: (string | number)[][] = [
    ["Port", "Country", "Freight USD", "Insurance USD"],
    ...SAMPLE_DESTINATIONS.map((d) => [d.port, d.country, d.freightUsd, d.insuranceUsd]),
  ];
  const sheetDest = XLSX.utils.aoa_to_sheet(destRows);
  sheetDest["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheetDetails, "Offer Details");
  XLSX.utils.book_append_sheet(wb, sheetItems, "Items");
  XLSX.utils.book_append_sheet(wb, sheetDest, "Logistics");

  const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([arrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    "ai-quickfill-sample.xlsx",
  );
}

async function downloadPdf() {
  const { default: jsPDF } = await import("jspdf");
  const autoTableMod = await import("jspdf-autotable");
  const autoTable = (autoTableMod as any).default ?? (autoTableMod as any).autoTable;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const primary: [number, number, number] = [182, 71, 105];

  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, pageWidth, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Offer Quote", 32, 28);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(SAMPLE_SUPPLIER, 32, 48);

  doc.setTextColor(20, 20, 20);
  let y = 88;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Container & Origin", 32, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 16;
  doc.text(`${SAMPLE_CONTAINER} (${SAMPLE_TEMPERATURE}, ${SAMPLE_CERTIFICATIONS} certified)`, 32, y);
  y += 14;
  doc.text(`Origin: ${SAMPLE_ORIGIN_COUNTRY} / ${SAMPLE_ORIGIN_PORT}`, 32, y);
  y += 14;
  doc.text(`Brand: ${SAMPLE_BRAND}`, 32, y);
  y += 20;

  autoTable(doc, {
    startY: y,
    head: [["Product", "Plant", "Spec", "Marbling", "Qty (kg)", "Price USD/mt", "Floor USD/mt"]],
    body: SAMPLE_ITEMS.map((it) => [
      it.product, it.plant, it.spec, it.marbling,
      it.qtyKg.toLocaleString("en-US"),
      it.priceUsdPerMt.toLocaleString("en-US"),
      it.floorUsdPerMt.toLocaleString("en-US"),
    ]),
    headStyles: { fillColor: primary, textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: 32, right: 32 },
  });

  y = (doc as any).lastAutoTable.finalY + 18;

  autoTable(doc, {
    startY: y,
    head: [["Port", "Country", "Freight USD", "Insurance USD"]],
    body: SAMPLE_DESTINATIONS.map((d) => [
      d.port, d.country,
      d.freightUsd.toLocaleString("en-US"),
      d.insuranceUsd.toLocaleString("en-US"),
    ]),
    headStyles: { fillColor: primary, textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: 32, right: 32 },
  });

  y = (doc as any).lastAutoTable.finalY + 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Terms", 32, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const lines = [
    `Incoterms accepted: ${SAMPLE_INCOTERMS}`,
    `Primary pricing: ${SAMPLE_PRIMARY_PRICING}`,
    `Payment: ${SAMPLE_PAYMENT}`,
    `Shipment: ${SAMPLE_SHIPMENT}`,
    `Distribution: ${SAMPLE_DISTRIBUTION}`,
    `Notes: ${SAMPLE_NOTES}`,
  ];
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, pageWidth - 64) as string[];
    doc.text(wrapped, 32, y);
    y += wrapped.length * 13;
  }

  doc.save("ai-quickfill-sample.pdf");
}

export function SampleDownloads() {
  const [copied, setCopied] = useState(false);
  const markdown = useMemo(() => buildSampleMarkdown(), []);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      toast.success("Markdown copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed — select & copy manually");
    }
  };

  const onDownloadMd = () => {
    downloadBlob(
      new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
      "ai-quickfill-sample.md",
    );
  };

  return (
    <div className="grid gap-5 md:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <FileText size={18} className="text-primary" />
          <h3 className="text-base font-semibold">Plain Text (.md)</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Markdown-formatted email/quote. Best baseline format for the parser.
        </p>
        <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-muted/50 p-3 text-[10px] leading-relaxed text-foreground">
{markdown}
        </pre>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={onCopy}>
            {copied ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button size="sm" onClick={onDownloadMd}>
            <Download size={14} className="mr-1" />
            Download .md
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-primary" />
          <h3 className="text-base font-semibold">Excel (.xlsx)</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Spreadsheet format common in Asian trade quotes. Three sheets: Offer Details, Items, Logistics.
        </p>
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          <li>• Sheet 1 — Offer Details</li>
          <li>• Sheet 2 — Items ({SAMPLE_ITEMS.length} rows)</li>
          <li>• Sheet 3 — Logistics ({SAMPLE_DESTINATIONS.length} ports)</li>
        </ul>
        <div className="mt-4">
          <Button size="sm" onClick={() => { downloadXlsx().catch((e) => toast.error(`Excel export failed: ${e?.message ?? e}`)); }}>
            <Download size={14} className="mr-1" />
            Download .xlsx
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <FileType2 size={18} className="text-primary" />
          <h3 className="text-base font-semibold">PDF</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Formal quotation format. Single page with branded header, item & logistics tables.
        </p>
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          <li>• Branded header (primary color)</li>
          <li>• Items table</li>
          <li>• Logistics table</li>
          <li>• Terms footer</li>
        </ul>
        <div className="mt-4">
          <Button size="sm" onClick={() => { downloadPdf().catch((e) => toast.error(`PDF export failed: ${e?.message ?? e}`)); }}>
            <Download size={14} className="mr-1" />
            Download .pdf
          </Button>
        </div>
      </div>
    </div>
  );
}