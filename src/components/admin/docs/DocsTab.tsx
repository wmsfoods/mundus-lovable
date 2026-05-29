import { useState } from "react";
import { BuyerGuideDocument } from "./BuyerGuideDocument";
import { SupplierGuideDocument } from "./SupplierGuideDocument";
import { BrandbookDocument } from "./BrandbookDocument";
import { DiscoveryScriptDocument } from "./DiscoveryScriptDocument";
import { BuyerTrainingDocument } from "./BuyerTrainingDocument";
import { SupplierTrainingDocument } from "./SupplierTrainingDocument";
import { PlatformDocDocument } from "./PlatformDocDocument";

type SubTab = "admin" | "buyers" | "suppliers" | "platform";

const TABS: Array<{ k: SubTab; l: string }> = [
  { k: "admin", l: "Admin Docs" },
  { k: "buyers", l: "Buyers" },
  { k: "suppliers", l: "Suppliers" },
  { k: "platform", l: "Plataforma" },
];

export function DocsTab() {
  const [sub, setSub] = useState<SubTab>("buyers");
  const [adminDoc, setAdminDoc] = useState<"brandbook" | "discovery" | "buyer-training" | "supplier-training">("brandbook");
  const [platformDoc, setPlatformDoc] = useState<"platform">("platform");
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
            ].map((d) => (
              <button
                key={d.k}
                type="button"
                onClick={() => setPlatformDoc(d.k as "platform")}
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
          {platformDoc === "platform" && <PlatformDocDocument />}
        </div>
      )}
    </div>
  );
}