import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { BuyerGuideDocument } from "./BuyerGuideDocument";
import { SupplierGuideDocument } from "./SupplierGuideDocument";
import { BrandbookDocument } from "./BrandbookDocument";
import { DiscoveryScriptDocument } from "./DiscoveryScriptDocument";
import { BuyerTrainingDocument } from "./BuyerTrainingDocument";
import { SupplierTrainingDocument } from "./SupplierTrainingDocument";
import { PlatformDocDocument, CONTENT as PLATFORM_CONTENT } from "./PlatformDocDocument";
import { GapReportDocument, CONTENT as GAP_CONTENT } from "./GapReportDocument";
import { MultiOfficeDocument, CONTENT as MULTIOFFICE_CONTENT } from "./MultiOfficeDocument";
import { searchDocs, type DocRegistryEntry } from "./docSearch";

type SubTab = "admin" | "buyers" | "suppliers" | "platform";
type PlatformDoc = "platform" | "gaps" | "multioffice";

const TABS: Array<{ k: SubTab; l: string }> = [
  { k: "admin", l: "Admin Docs" },
  { k: "buyers", l: "Buyers" },
  { k: "suppliers", l: "Suppliers" },
  { k: "platform", l: "Plataforma" },
];

export function DocsTab() {
  const [sub, setSub] = useState<SubTab>("buyers");
  const [adminDoc, setAdminDoc] = useState<"brandbook" | "discovery" | "buyer-training" | "supplier-training">("brandbook");
  const [platformDoc, setPlatformDoc] = useState<PlatformDoc>("platform");
  const [query, setQuery] = useState("");
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);

  const registry = useMemo<DocRegistryEntry[]>(() => [
    { key: "platform", label: "Plataforma · Documentação", content: PLATFORM_CONTENT.pt },
    { key: "gaps", label: "Plataforma · Relatório de Gaps", content: GAP_CONTENT.pt },
    { key: "multioffice", label: "Plataforma · Multi-Office Model", content: MULTIOFFICE_CONTENT.pt },
  ], []);

  const results = useMemo(() => searchDocs(query, registry), [query, registry]);

  function goToResult(docKey: string, sectionId: string) {
    setSub("platform");
    setPlatformDoc(docKey as PlatformDoc);
    setScrollTarget(null);
    // force re-trigger of effect even if same id
    setTimeout(() => setScrollTarget(sectionId), 30);
    setQuery("");
  }

  return (
    <div>
      <div
        style={{
          position: "relative",
          marginBottom: 14,
          maxWidth: 520,
        }}
      >
        <Search
          size={14}
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar seções, rotas, regras… (ex: negociação, /admin/orders, FCL)"
          style={{
            width: "100%",
            padding: "9px 32px 9px 34px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            fontSize: 13,
            outline: "none",
            background: "#fff",
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "transparent", border: "none", cursor: "pointer", color: "#6b7280",
              padding: 4, display: "flex",
            }}
            aria-label="Limpar busca"
          >
            <X size={14} />
          </button>
        )}
        {query.trim().length >= 2 && (
          <div
            style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
              background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
              boxShadow: "0 12px 28px rgba(0,0,0,0.10)", maxHeight: 360, overflow: "auto", zIndex: 30,
            }}
          >
            {results.length === 0 ? (
              <div style={{ padding: 14, fontSize: 12.5, color: "#6b7280" }}>
                Nenhum resultado em “{query}”. A busca cobre a Documentação da Plataforma e o Relatório de Gaps.
              </div>
            ) : (
              results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goToResult(r.docKey, r.sectionId)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "10px 14px", border: "none", borderBottom: "1px solid #f3f4f6",
                    background: "#fff", cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                >
                  <div style={{ fontSize: 10.5, color: "#9B2251", fontWeight: 700, letterSpacing: 0.4 }}>
                    {r.docLabel} · {r.kicker}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginTop: 2 }}>{r.title}</div>
                  <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 3, lineHeight: 1.45 }}>{r.snippet}</div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {TABS.map((tt) => (
          <button
            key={tt.k}
            type="button"
            onClick={() => setSub(tt.k)}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              border: "1px solid",
              borderColor: sub === tt.k ? "#9B2251" : "#e5e7eb",
              background: sub === tt.k ? "#9B2251" : "#fff",
              color: sub === tt.k ? "#fff" : "#374151",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {tt.l}
          </button>
        ))}
      </div>

      {sub === "admin" && (
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { k: "brandbook", l: "📘 Brandbook Mundus" },
              { k: "discovery", l: "🎯 Discovery Call Script" },
              { k: "buyer-training", l: "🛒 Treinamento Buyer" },
            { k: "supplier-training", l: "🥩 Treinamento Supplier" },
            ].map((d) => (
              <button
                key={d.k}
                type="button"
                onClick={() => setAdminDoc(d.k as "brandbook" | "discovery" | "buyer-training" | "supplier-training")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor: adminDoc === d.k ? "#9B2251" : "#e5e7eb",
                  background: adminDoc === d.k ? "#fdf2f7" : "#fff",
                  color: adminDoc === d.k ? "#9B2251" : "#374151",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {d.l}
              </button>
            ))}
          </div>
          {adminDoc === "brandbook" && <BrandbookDocument />}
          {adminDoc === "discovery" && <DiscoveryScriptDocument />}
          {adminDoc === "buyer-training" && <BuyerTrainingDocument />}
          {adminDoc === "supplier-training" && <SupplierTrainingDocument />}
        </div>
      )}
      {sub === "buyers" && <BuyerGuideDocument />}
      {sub === "suppliers" && <SupplierGuideDocument />}
      {sub === "platform" && (
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { k: "platform", l: "📐 Documentação da Plataforma" },
              { k: "gaps", l: "🧩 Relatório de Gaps" },
              { k: "multioffice", l: "🏢 Multi-Office Model" },
            ].map((d) => (
              <button
                key={d.k}
                type="button"
                onClick={() => { setPlatformDoc(d.k as PlatformDoc); setScrollTarget(null); }}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor: platformDoc === d.k ? "#9B2251" : "#e5e7eb",
                  background: platformDoc === d.k ? "#fdf2f7" : "#fff",
                  color: platformDoc === d.k ? "#9B2251" : "#374151",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {d.l}
              </button>
            ))}
          </div>
          {platformDoc === "platform" && <PlatformDocDocument scrollTarget={scrollTarget} />}
          {platformDoc === "gaps" && <GapReportDocument scrollTarget={scrollTarget} />}
          {platformDoc === "multioffice" && <MultiOfficeDocument scrollTarget={scrollTarget} />}
        </div>
      )}
    </div>
  );
}