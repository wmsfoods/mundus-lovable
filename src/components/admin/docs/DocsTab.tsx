import { useState } from "react";
import { BuyerGuideDocument } from "./BuyerGuideDocument";
import { SupplierGuideDocument } from "./SupplierGuideDocument";
import { BrandbookDocument } from "./BrandbookDocument";
import { DiscoveryScriptDocument } from "./DiscoveryScriptDocument";

type SubTab = "admin" | "buyers" | "suppliers";

const TABS: Array<{ k: SubTab; l: string }> = [
  { k: "admin", l: "Admin Docs" },
  { k: "buyers", l: "Buyers" },
  { k: "suppliers", l: "Suppliers" },
];

export function DocsTab() {
  const [sub, setSub] = useState<SubTab>("buyers");
  const [adminDoc, setAdminDoc] = useState<"brandbook" | "discovery">("brandbook");
  return (
    <div>
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
            ].map((d) => (
              <button
                key={d.k}
                type="button"
                onClick={() => setAdminDoc(d.k as "brandbook" | "discovery")}
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
        </div>
      )}
      {sub === "buyers" && <BuyerGuideDocument />}
      {sub === "suppliers" && <SupplierGuideDocument />}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{
      border: "1px dashed #e5e7eb",
      borderRadius: 12,
      padding: "60px 24px",
      textAlign: "center",
      color: "#9ca3af",
      background: "#fafafa",
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>
        No {label.toLowerCase()} yet
      </div>
      <div style={{ fontSize: 12 }}>
        Documents added here will be visible to the Mundus admin team.
      </div>
    </div>
  );
}