import { BookOpen, FlaskConical, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
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

      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#9B2251", letterSpacing: 0.6, marginBottom: 8 }}>
          TOOLS
        </div>
        <Link
          to="/admin/auto-engine-sandbox"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 18px",
            background: "#fdf2f7",
            border: "1px solid #f5d4e0",
            borderRadius: 12,
            textDecoration: "none",
            color: "inherit",
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#fbe2e8";
            e.currentTarget.style.borderColor = "#9B2251";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#fdf2f7";
            e.currentTarget.style.borderColor = "#f5d4e0";
          }}
        >
          <div
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: "#9B2251", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FlaskConical size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>
              Auto-Negotiation Sandbox
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              Simular cenários do motor V3.2 — mesma matemática que roda em produção. Asking, floor, bids → counters por dial.
            </div>
          </div>
          <ArrowRight size={18} color="#9B2251" style={{ flexShrink: 0 }} />
        </Link>
      </div>

      <DocsTab />
    </div>
  );
}