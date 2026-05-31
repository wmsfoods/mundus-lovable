import { BookOpen } from "lucide-react";
import { DocsTab } from "@/components/admin/docs/DocsTab";

export default function AdminDocs() {
  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: "#fbe2e8", color: "#9B2251",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <BookOpen size={18} />
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>Documentação</div>
          <div style={{ fontSize: 12.5, color: "#6b7280" }}>
            Materiais internos, guias de buyer/supplier e documentação técnica da plataforma.
          </div>
        </div>
      </div>
      <DocsTab />
    </div>
  );
}