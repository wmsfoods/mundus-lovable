import { SampleDownloads } from "./SampleDownloads";

export function AiQuickfillSamplesDocument() {
  return (
    <div style={{ maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", marginBottom: 6 }}>
        AI Quick-fill — Sample Files
      </h1>
      <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.55, marginBottom: 20, maxWidth: 720 }}>
        Use these sample files to test the AI Quick-fill parser. The same offer data is
        provided in 3 formats (Markdown, Excel, PDF) so you can compare how the parser
        handles plain text, spreadsheets and branded PDFs.
      </p>
      <SampleDownloads />
      <p style={{ marginTop: 24, fontSize: 11.5, color: "#9ca3af" }}>
        All three files contain identical data. Open the AI Quick-fill modal in Create
        Offer V2 and paste/upload to test parsing.
      </p>
    </div>
  );
}