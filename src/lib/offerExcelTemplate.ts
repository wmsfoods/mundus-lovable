import * as XLSX from "xlsx";

export const OFFER_TEMPLATE_HEADERS = [
  "Protein",
  "Cut Name",
  "Spec",
  "Qty (kg)",
  "Ask Price (USD/kg)",
  "Floor Price (USD/kg)",
  "Brand (optional)",
  "Plant# (optional)",
  "Aging (wet/dry, optional)",
  "Notes",
] as const;

const EXAMPLE_ROW = [
  "Beef",
  "Beef Brisket Point End",
  "Boneless",
  14000,
  4.2,
  4.1,
  "World Best Brand",
  "1234",
  "wet",
  "Marbling high",
];

/** Build an Offer template workbook (sheet "Offer") and return as Blob. */
export function generateOfferTemplate(): Blob {
  const ws = XLSX.utils.aoa_to_sheet([
    OFFER_TEMPLATE_HEADERS as unknown as string[],
    EXAMPLE_ROW,
  ]);
  ws["!cols"] = OFFER_TEMPLATE_HEADERS.map(() => ({ wch: 22 }));
  // Freeze the header row
  (ws as any)["!freeze"] = { ySplit: 1 };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Offer");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** Trigger browser download of the template. */
export function downloadOfferTemplate(filename = "mundus-offer-template.xlsx") {
  const blob = generateOfferTemplate();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}