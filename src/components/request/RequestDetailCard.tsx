import { useEffect, useMemo, useState } from "react";
import { FileIcon } from "@/components/icons";
import { countryFlag } from "@/lib/countryFlags";
import { formatRequestNumber } from "@/lib/requestNumber";
import { supabase } from "@/integrations/supabase/client";
import type { BuyerRequestRow } from "@/hooks/useBuyerRequests";

type CutLine = {
  cut: string;
  marbling: string;
  qtyKg: number | null;
  targetPerKg: number | null;
};

function parseCuts(additional: string | null | undefined): CutLine[] {
  if (!additional) return [];
  const block = additional.split(/\n\s*\n/).find((b) => /^cuts:/i.test(b.trim()));
  if (!block) return [];
  const lines = block.split("\n").slice(1).map((l) => l.trim()).filter(Boolean);
  return lines.map((line) => {
    // "{cut} ({spec}) — {marbling} — {qty}kg @ ${target}/kg"
    const parts = line.split("—").map((s) => s.trim());
    const cut = parts[0].replace(/\s*\([^)]*\)\s*$/, "").trim();
    let marbling = "Not specified";
    let qtyKg: number | null = null;
    let targetPerKg: number | null = null;
    for (let i = 1; i < parts.length; i++) {
      const p = parts[i];
      const qm = p.match(/([\d,.]+)\s*kg/i);
      if (qm) qtyKg = parseFloat(qm[1].replace(/,/g, ""));
      const pm = p.match(/\$\s*([\d.]+)\s*\/\s*kg/i);
      if (pm) targetPerKg = parseFloat(pm[1]);
      if (!qm && !pm && !/\$/.test(p)) marbling = p;
    }
    return { cut, marbling, qtyKg, targetPerKg };
  });
}

function stripCutsBlock(additional: string | null | undefined): string {
  if (!additional) return "";
  return additional
    .split(/\n\s*\n/)
    .filter((b) => !/^cuts:/i.test(b.trim()))
    .join("\n\n")
    .trim();
}

const fmtUsd = (n: number) =>
  `US$ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function RequestDetailCard({ r }: { r: BuyerRequestRow }) {
  const reqNo = formatRequestNumber(r.request_number, r.created_at);
  const cuts = useMemo(() => parseCuts(r.additional_info), [r.additional_info]);
  const extraNotes = useMemo(() => stripCutsBlock(r.additional_info), [r.additional_info]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [cutImages, setCutImages] = useState<Record<string, string>>({});

  useEffect(() => {
    const names = cuts.map((c) => c.cut).filter(Boolean);
    if (names.length === 0) return;
    supabase
      .from("cuts")
      .select("name, image_url")
      .in("name", names)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, string> = {};
        for (const row of data as Array<{ name: string; image_url: string | null }>) {
          if (row.image_url) map[row.name] = row.image_url;
        }
        setCutImages(map);
      });
  }, [cuts]);

  const totalKg = Number(r.quantity_kg) || 0;
  const target = r.target_price_usd != null ? Number(r.target_price_usd) : null;
  const totalValue = target != null ? target * totalKg : null;

  const incoterms = (r.incoterm ?? "")
    .split(/[,/|]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const origins = r.origin_countries ?? [];
  const anyOrigin = r.any_origin ?? (origins.length === 0);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 20,
      }}
    >
      {/* Title */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1c1917" }}>
          🏷️ {r.product_name}
        </h2>
        {r.cut_region === "us" && (
          <span style={{
            background: "#DBEAFE",
            color: "#1E40AF",
            padding: "2px 8px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
          }}>
            🇺🇸 IMPS
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: "var(--fg-muted)", marginBottom: 16 }}>
        <span style={{ fontFamily: "ui-monospace, monospace", color: "#8B2252", fontWeight: 600 }}>{reqNo}</span>
        {cuts.length > 0 && <span> · Specifications ({cuts.length})</span>}
      </div>

      {/* Target price hero */}
      {totalValue != null && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#8B2252", lineHeight: 1.1 }}>{fmtUsd(totalValue)}</div>
          <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>
            Target Value per FCL
          </div>
        </div>
      )}

      {/* Cuts table */}
      {cuts.length > 0 ? (
        <div style={{ overflowX: "auto", marginBottom: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--fg-muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <th style={{ padding: "8px 6px", borderBottom: "1px solid var(--border)" }}>PRODUCT / CUT</th>
                <th style={{ padding: "8px 6px", borderBottom: "1px solid var(--border)" }}>{"\n"}</th>
                <th style={{ padding: "8px 6px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>Qty per cut</th>
                <th style={{ padding: "8px 6px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>Target $/kg</th>
              </tr>
            </thead>
            <tbody>
              {cuts.map((c, i) => (
                <tr key={i}>
                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f5f4f3", fontWeight: 600 }}>
                    <span style={{ display: "inline-flex", alignItems: "center" }}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        overflow: "hidden",
                        background: "#F3F4F6",
                        flexShrink: 0,
                        marginRight: 8,
                      }}>
                        {cutImages[c.cut] ? (
                          <img src={cutImages[c.cut]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: 10, color: "#9CA3AF" }}>🥩</span>
                        )}
                      </span>
                      {c.cut}
                    </span>
                  </td>
                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f5f4f3", color: "var(--fg-muted)" }}>—</td>
                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f5f4f3", textAlign: "right" }}>
                    {c.qtyKg != null ? `${c.qtyKg.toLocaleString()} kg` : "—"}
                  </td>
                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f5f4f3", textAlign: "right", color: "#8B2252", fontWeight: 600 }}>
                    {c.targetPerKg != null ? `US$ ${c.targetPerKg.toFixed(2)}/kg` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div style={{ fontSize: 13, color: "var(--fg-muted)", marginBottom: 16 }}>
        <strong style={{ color: "#1c1917" }}>{totalKg.toLocaleString()} kg</strong> total weight
      </div>

      {/* Key/value grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          paddingTop: 16,
          borderTop: "1px solid #f5f4f3",
        }}
      >
        <KV label="Origin">
          {anyOrigin ? (
            <span style={{ color: "var(--fg-muted)", fontStyle: "italic" }}>Any origin accepted</span>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {origins.map((o) => (
                <span key={o}>{countryFlag(o)} {o}</span>
              ))}
            </div>
          )}
        </KV>
        <KV label="Destination">
          {countryFlag(r.destination_country)} {r.destination_country}
          {r.destination_port ? ` · ${r.destination_port}` : ""}
        </KV>
        <KV label="Condition">{r.temperature ?? "—"}</KV>
        <KV label="Container">
          {r.container_count ?? 1} FCL(s) · {r.container_size ?? "—"}
        </KV>
        <KV label="Incoterms">
          {incoterms.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {incoterms.map((i) => (
                <span
                  key={i}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: "#FBEAF0",
                    color: "#8B2252",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {i}
                </span>
              ))}
            </div>
          ) : (
            "—"
          )}
        </KV>
        <KV label="Shipment">{r.shipment_date ?? "—"}</KV>
        <KV label="Distribution">
          {r.target_supplier_id ? (
            <span>🎯 Sent to specific supplier</span>
          ) : (
            <span>🌐 Marketplace (all suppliers)</span>
          )}
        </KV>
      </div>

      {/* Attachments */}
      {r.attachments && r.attachments.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f5f4f3" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            📎 Attachments
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {r.attachments.map((a, i) => (
              <a
                key={i}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 10px", borderRadius: 999,
                  background: "#FBEAF0", color: "#8B2252",
                  fontSize: 12, fontWeight: 500, textDecoration: "none",
                  maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                <FileIcon size={12} /> {a.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* More information */}
      {extraNotes && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f5f4f3" }}>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, color: "#8B2252", padding: 0,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            More information {moreOpen ? "˄" : "˅"}
          </button>
          {moreOpen && (
            <p style={{ marginTop: 10, marginBottom: 0, whiteSpace: "pre-wrap", color: "var(--fg-muted)", fontSize: 13 }}>
              {extraNotes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: "#1c1917" }}>{children}</div>
    </div>
  );
}